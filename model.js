// Keep transport records separate from people unless a relation ID is explicit.
function relationIds(value,found=new Set()){
  if(!value || typeof value!=='object')return found;
  for(const [key,child] of Object.entries(value)){
    if(/^relation_?id$/i.test(key) && ['string','number'].includes(typeof child))found.add(String(child));
    else if(child && typeof child==='object')relationIds(child,found);
  }
  return found;
}
function requestRelation(request){
  try{
    const url=new URL(request.url);
    const values=[...url.searchParams].filter(([key])=>/^relation_?id$/i.test(key)).map(([,value])=>value);
    if(request.postData){try{values.push(...relationIds(JSON.parse(request.postData)));}catch{}}
    const unique=[...new Set(values)];return unique.length===1?unique[0]:null;
  }catch{return null;}
}
function responseOwner(requestId,json){
  const ids=[...relationIds(json)];
  if(ids.length>1)return null;
  if(ids.length===1)return requestId && requestId!==ids[0]?null:ids[0];
  return requestId || null;
}
function captureSnapshot(state){
  return {schemaVersion:3,profileId:state.profileId,active:state.active,status:state.status,reason:state.reason || '',startedAt:state.startedAt,finishedAt:state.finishedAt,application:state.application || {},applicants:state.applicants || [],responses:state.responses,analysis:responseAnalysis(state.responses,(state.applicants || []).map(person=>person.relationId)),errors:state.errors,...(state.comparison?{comparison:state.comparison}:{})};
}
