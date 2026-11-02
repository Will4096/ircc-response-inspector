var TrackerAuthOrigins=['https://gc.auth.canada.ca/*','https://clegc-gckey.gc.ca/*'];
function historyLastUpdate(history=[]){
  let latest=null;
  for(const entry of history||[]){
    if(!entry||typeof entry!=='object')continue;
    // dateLoaded is a transport/load marker, not the History event date.
    const value=[entry.dateCreated,entry.date,entry.createdAt,entry.activityDate,entry.eventDate].find(date=>typeof date==='string'&&date.trim()&&Number.isFinite(Date.parse(date)));
    if(!value)continue;
    const time=Date.parse(value);
    if(!latest||time>latest.time)latest={value,time,source:'History'};
  }
  return latest;
}
function applicantsHistoryLastUpdate(applicants=[]){
  let latest=null;
  for(const person of applicants||[]){const update=historyLastUpdate(person.history);if(update&&(!latest||update.time>latest.time))latest=update;}
  return latest;
}
// Application-level official update metadata only; never infer it from History or capture time.
function officialApplicationUpdate(responses,number){
  const normalize=value=>String(value||'').replace(/[^a-z0-9]/gi,'').toUpperCase();
  const target=normalize(number);if(!target)return null;
  const keys=/^(lastupdated|lastupdateddate|lastupdateddatetime|lastupdate|lastupdatedon|lastupdatedat|lastupdatedtime|lastupdatedtimestamp|lastupdatedate|lastdateupdated|lastmodified|lastmodifieddate|lastmodifiedat|applicationlastupdated|applicationupdatedat)$/i;
  const officialDate=value=>{
    if(typeof value==='number'&&Number.isFinite(value)){const time=value<1e12?value*1000:value;if(time>=946684800000&&time<=Date.now()+86400000)return new Date(time).toISOString();return null;}
    return typeof value==='string'&&value.length<=80&&/\d{4}/.test(value)&&Number.isFinite(Date.parse(value))?value:null;
  };
  function walk(input,owner=false,depth=0){
    const value=decodeJson(input);if(depth>20||!value||typeof value!=='object')return null;
    if(Array.isArray(value)){for(const child of value.slice(0,100)){const result=walk(child,owner,depth+1);if(result)return result;}return null;}
    if(Object.keys(value).some(k=>/^relation_?id$/i.test(k)))return null;
    const appNumber=value.applicationNumber??value.application_number??value.application?.number??(typeof value.number==='string'&&/[a-z]/i.test(value.number)?value.number:undefined);
    if(appNumber!==undefined){if(normalize(appNumber)!==target)return null;owner=true;}
    if(owner)for(const [key,date] of Object.entries(value)){const parsed=keys.test(key.replace(/_/g,''))?officialDate(date):null;if(parsed)return {value:parsed,source:'IRCC response',field:key};}
    for(const [key,child] of Object.entries(value)){if(/history|activities|timeline|events|applicants|people|milestones|checks|actions|documents/i.test(key))continue;const result=walk(child,owner,depth+1);if(result)return result;}
    return null;
  }
  for(const response of [...(responses||[])].reverse()){const result=walk(response.json);if(result)return result;}
  return null;
}
const CHECK_KEYS=['biometrics','medical','eligibility','background'];
function checkValue(value){
  if(value===null || value===undefined || typeof value==='object')return undefined;
  const raw=String(value);return ({completed:'Completed',complete:'Completed',inprogress:'In Progress',notstarted:'Not started',notapplicable:'Not applicable'})[raw.replace(/[\s_-]/g,'').toLowerCase()] || raw;
}
function decodeJson(value){
  if(typeof value!=='string' || !/^[\s]*[\[{]/.test(value))return value;
  try{return JSON.parse(value);}catch{return value;}
}
function applicantPayloads(payload){
  const records=[];
  function walk(value,path='$',depth=0){
    value=decodeJson(value);if(depth>35 || !value || typeof value!=='object')return;
    if(!Array.isArray(value)){
      const id=Object.keys(value).find(key=>/^relation_?id$/i.test(key));
      if(id && value[id]!==null && ['string','number'].includes(typeof value[id])){
        const milestones=decodeJson(value.milestones || value.checks);
        const historyKey=Object.keys(value).find(key=>/^(history|histories|historyItems|activities|timeline|events)$/i.test(key));
        const historyContainer=historyKey?decodeJson(value[historyKey]):undefined;
        const history=Array.isArray(historyContainer)?historyContainer:decodeJson(historyContainer?.items || historyContainer?.records);
        const more=historyContainer?.hasMore===true || value.historyHasMore===true || !!historyContainer?.nextPageToken;
        const checks={};
        if(milestones && typeof milestones==='object')for(const key of CHECK_KEYS){const found=Object.keys(milestones).find(name=>name.toLowerCase()===key);const normalized=checkValue(milestones[found]);if(normalized!==undefined)checks[key]=normalized;}
        if(Object.keys(checks).length || Array.isArray(history)){
          const given=value.givenName || value.firstName;const surname=value.surname || value.lastName;
          const name=value.fullName || value.applicantName || (given && surname?[given,surname].join(' '):null);
          records.push({relationId:String(value[id]),name:typeof name==='string'?name:null,checks,hasHistory:Array.isArray(history) && !more,history:Array.isArray(history)?history:[],pendingActions:Array.isArray(value.actions)?value.actions.length:undefined,path});
        }
      }
    }
    for(const [key,child] of Object.entries(value))walk(child,path+'['+JSON.stringify(key)+']',depth+1);
  }
  walk(payload);return records;
}
function mergePayload(previous={},incoming){
  // Each explicitly returned history array is authoritative; never drop items
  // merely because two events have identical titles or dates.
  return {...previous,...incoming,name:incoming.name || previous.name,checks:{...previous.checks,...incoming.checks},history:incoming.hasHistory?incoming.history:(previous.history || []),hasHistory:!!(incoming.hasHistory || previous.hasHistory)};
}
function checksReady(person){return CHECK_KEYS.every(key=>person.checks?.[key]!==undefined);}
function personReady(person){return checksReady(person) && person.historyLoaded===true && person.pendingActions!==undefined;}
function securityEvents(history=[]){return history.filter(item=>item && typeof item==='object' && String(item.key || '').trim().toLowerCase()==='security');}
function securitySummary(history=[]){
  const events=securityEvents(history);if(!events.length)return {value:undefined,events:[]};
  const dated=events.map(item=>({item,date:Date.parse(item.dateCreated || item.date || '')}));
  if(dated.every(record=>Number.isFinite(record.date))){dated.sort((a,b)=>b.date-a.date);return {value:dated[0].item.actStatus ?? dated[0].item.status,events};}
  return {value:[...new Set(events.map(item=>item.actStatus ?? item.status).filter(value=>value!==undefined).map(String))].join(' / ') || undefined,events};
}
function responseAnalysis(responses=[],expectedRelations=[]){
  const pages=new Map(),endpoints=new Map(),seen=new Set();let duplicates=0,useful=0;
  const coverage={};const prefixes=[];
  for(const response of responses){
    const fingerprint=response.url+'\n'+JSON.stringify(response.json);if(seen.has(fingerprint))duplicates++;else seen.add(fingerprint);
    const records=applicantPayloads(response.json);if(records.length)useful++;
    for(const record of records)coverage[record.relationId]=mergePayload(coverage[record.relationId],record);
    prefixes.push(Object.values(coverage).filter(record=>checksReady(record) && record.hasHistory && record.pendingActions!==undefined).map(record=>record.relationId));
    const endpoint=endpoints.get(response.url) || {url:response.url,count:0,applicantData:0};endpoint.count++;if(records.length)endpoint.applicantData++;endpoints.set(response.url,endpoint);
    const page=response.page || '未记录页面';const entry=pages.get(page) || {page,responses:0,relations:[]};entry.responses++;
    entry.relations=[...new Set([...entry.relations,...records.map(record=>record.relationId)])];pages.set(page,entry);
  }
  const expected=expectedRelations.length?expectedRelations.filter(Boolean).map(String):Object.keys(coverage);
  const at=expected.length?prefixes.findIndex(ids=>expected.every(id=>ids.includes(id))):-1;
  return {total:responses.length,unique:seen.size,duplicates,applicantDataResponses:useful,coveredApplicants:Object.keys(coverage).length,completeAtResponse:at<0?null:at+1,pages:[...pages.values()],endpoints:[...endpoints.values()]};
}
function analyzeStoredCapture(snapshot){
  const records={};
  for(const response of snapshot.responses || [])for(const record of applicantPayloads(response.json))records[record.relationId]=mergePayload(records[record.relationId],record);
  const applicants=(snapshot.applicants || []).map(person=>{
    const record=records[person.relationId];const result={...person,checks:{...person.checks,...record?.checks}};
    if(record?.hasHistory){result.history=record.history;result.historyLoaded=true;result.historySource='response';}
    if(record?.pendingActions!==undefined)result.pendingActions=record.pendingActions;
    result.status=personReady(result)?'completed':'waiting';return result;
  });
  const complete=applicants.length && applicants.every(personReady);
  const partial=!complete && snapshot.status==='completed';
  return {...snapshot,schemaVersion:3,active:false,applicants,analysis:responseAnalysis(snapshot.responses || [],applicants.map(person=>person.relationId)),status:complete?'completed':snapshot.active?'failed':partial?'partial':snapshot.status,reason:complete?'':snapshot.active?'上次读取已中断':partial?'历史尚未完整读取':snapshot.reason,reanalyzedAt:new Date().toISOString()};
}
