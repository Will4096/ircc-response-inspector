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
