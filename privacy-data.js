async function removeProfileData(profileId){
  for(const [id,state] of sessions)if(state.profileId===profileId){if(state.active)await finish(id,'stopped','已停止');sessions.delete(id);}
  const data=await chrome.storage.session.get(null);
  const keys=Object.entries(data).filter(([key,value])=>((key.startsWith('capture:')||key.startsWith('pageNotice:')||key.startsWith('autoSubmit:')) && value?.profileId===profileId) || (key.startsWith('fillIntent:') && value===profileId)).map(([key])=>key);
  keys.push('capture:profile:'+profileId);
  await chrome.storage.session.remove(keys);
  await chrome.storage.local.remove('comparison:profile:'+profileId);
  await chrome.storage.local.remove('mailPending:'+profileId);
}
