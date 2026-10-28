// Compare application data, not request IDs, fetch times, or response ordering.
function comparisonStable(value){
  if(Array.isArray(value))return '['+value.map(comparisonStable).join(',')+']';
  if(value && typeof value==='object')return '{'+Object.keys(value).filter(key=>key!=='dateLoaded').sort().map(key=>JSON.stringify(key)+':'+comparisonStable(value[key])).join(',')+'}';
  return JSON.stringify(value ?? null);
}
function comparisonSnapshot(data){
  return {version:1,profileId:data.profileId,finishedAt:data.finishedAt,application:{number:normalizeApplicationNumber(data.application?.number),status:data.application?.status ?? null},applicants:(data.applicants || []).map(person=>({id:person.id,relationId:person.relationId || null,name:person.name,role:person.role,checks:Object.fromEntries(Object.entries(person.checks || {}).map(([key,value])=>[key,checkValue(value)])),pendingActions:person.pendingActions ?? null,history:person.history || [],historySource:person.historySource || null}))};
}
function compareCaptures(previous,current){
  const valid=previous?.version===1 && previous.profileId===current.profileId && previous.application.number===current.application.number;
  const result={status:valid?'unchanged':'first',previousAt:valid?previous.finishedAt:null,checkedAt:current.finishedAt,changes:[],people:{},notes:[]};
  if(!valid)return result;
  const add=(person,change)=>{const entry={person:person?.name || '申请',...change};result.changes.push(entry);if(person)(result.people[person.id] ||= []).push(entry);};
  const changed=(person,label,before,after)=>{if(comparisonStable(before)!==comparisonStable(after))add(person,{type:'field',label,before:before ?? null,after:after ?? null});};
  changed(null,'申请状态',previous.application.status,current.application.status);
  const matched=new Set();
  const labels={biometrics:'生物识别',medical:'体检',eligibility:'资格审核',background:'背景调查',security:'Security'};
  for(const person of current.applicants){
    let candidates=person.relationId?previous.applicants.filter(p=>p.relationId===person.relationId):[];
    if(candidates.length!==1)candidates=previous.applicants.filter(p=>(p.name || '').trim().toLowerCase()===(person.name || '').trim().toLowerCase() && p.role===person.role);
    if(candidates.length!==1 || matched.has(candidates[0])){add(person,{type:'person',label:'新增或无法匹配的申请人'});continue;}
    const old=candidates[0];matched.add(old);
    for(const key of new Set([...Object.keys(old.checks),...Object.keys(person.checks)]))changed(person,labels[key] || key,old.checks[key],person.checks[key]);
    changed(person,'待办数量',old.pendingActions,person.pendingActions);
    if(old.historySource && person.historySource && old.historySource!==person.historySource){result.notes.push(person.name+'：History 来源变化，本次未比较历史条目。');continue;}
    changed(person,'Security 原始状态',securitySummary(old.history).value,securitySummary(person.history).value);
    const remaining=new Map();
    for(const item of old.history){const key=comparisonStable(item);remaining.set(key,(remaining.get(key) || 0)+1);}
    const added=[];
    person.history.forEach((item,index)=>{const key=comparisonStable(item),count=remaining.get(key) || 0;if(count)remaining.set(key,count-1);else added.push(index);});
    const removed=[...remaining.values()].reduce((sum,count)=>sum+count,0);
    if(added.length || removed)add(person,{type:'history',label:'History',added:added.length,removed,newIndices:added});
  }
  for(const old of previous.applicants)if(!matched.has(old))add(null,{type:'person',label:'未再返回的申请人：'+old.name});
  result.status=result.changes.length?'changed':result.notes.length?'uncertain':'unchanged';
  return result;
}
async function recordComparison(state){
  if(state.status!=='completed' || !state.profileVerified || !state.profileId || !state.application?.number)return;
  const key='comparison:profile:'+state.profileId;
  const stored=(await chrome.storage.local.get(key))[key];
  const current=comparisonSnapshot(state);
  state.comparison=compareCaptures(stored || state.comparisonBaseline,current);
  // Baselines contain only the fields needed for comparison, never transport records.
  await chrome.storage.local.set({[key]:current});
}
