// Remove authentication secrets before any response is stored or exported.
// Status fields such as actStatus/actType and all History entries are retained.
function redactResponseUrl(value){
  // Queries/fragments are unnecessary for response provenance. Strip them even
  // in nested URLs or paths embedded in plain text; preserve business statuses.
  return String(value).replace(/(?:https?:\/\/|\/\/)[^\s<>"']+|(?:^|[\s"'(])\/[^\s<>"']*/gi,part=>{
    const index=part.search(/[?#]/);return (index<0?part:part.slice(0,index)).replace(/(https?:\/\/|\/\/)[^/@\s]+@/gi,'$1[REDACTED]@');
  });
}
function redactPrivateFields(value,depth=0){
  if(depth>60)return '[OMITTED: nesting limit]';
  if(typeof value==='string' && /^[\s]*[\[{]/.test(value)){
    try{return JSON.stringify(redactPrivateFields(JSON.parse(value),depth+1));}catch{return redactResponseUrl(value);}
  }
  if(Array.isArray(value))return value.map(item=>redactPrivateFields(item,depth+1));
  if(typeof value==='string')return redactResponseUrl(value);
  if(!value || typeof value!=='object')return value;
  const sensitive=/^(?:access[_-]?token|refresh[_-]?token|id[_-]?token|token|authorization|cookie|set[_-]?cookie|password|passcode|otp|one[_-]?time[_-]?password|verification[_-]?code|security[_-]?code|client[_-]?secret|session(?:[_-]?(?:id|token))?|req[_-]?id)$/i;
  return Object.fromEntries(Object.entries(value).map(([key,child])=>[key,sensitive.test(key)?'[REDACTED]':redactPrivateFields(child,depth+1)]));
}
async function removeProfileData(profileId){
  for(const [id,state] of sessions)if(state.profileId===profileId){if(state.active)await finish(id,'stopped','已停止');sessions.delete(id);}
  const data=await chrome.storage.session.get(null);
  const keys=Object.entries(data).filter(([key,value])=>((key.startsWith('capture:')||key.startsWith('pageNotice:')||key.startsWith('autoSubmit:')) && value?.profileId===profileId) || (key.startsWith('fillIntent:') && value===profileId)).map(([key])=>key);
  keys.push('capture:profile:'+profileId);
  await chrome.storage.session.remove(keys);
  await chrome.storage.local.remove('comparison:profile:'+profileId);
  await chrome.storage.local.remove('mailPending:'+profileId);
}
