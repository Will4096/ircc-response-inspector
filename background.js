importScripts('form.js');
importScripts('model.js');
importScripts('domain.js');
importScripts('profiles.js');
importScripts('comparison.js');
importScripts('scanner.js');
importScripts('privacy-data.js');
importScripts('backup-core.js');
importScripts('mail-core.js');
importScripts('mail-assist.js');
const sessions = new Map();
const verificationLocks = new Set();
const searchSubmissions=new Map(),fillLocks=new Set();
const searchSubmitMeta=p=>({id:p.id,profileId:p.application.id,phase:p.phase,deadline:p.deadline,createdAt:p.createdAt,viewId:p.viewId});
async function writeSearchSubmit(p){await mailWrite(async()=>{if(searchSubmissions.get(p.tabId)===p)await chrome.storage.session.set({['autoSubmit:'+p.tabId]:searchSubmitMeta(p)});});}
async function cancelSearchSubmit(id,expected){
  const p=searchSubmissions.get(id);if(!p||(expected&&p.id!==expected))return {cancelled:false};
  searchSubmissions.delete(id);clearTimeout(p.timeout);
  await mailWrite(()=>chrome.storage.session.remove('autoSubmit:'+id));
  if(sessions.get(id)===p.state&&['countdown','submitting'].includes(p.state.status))await finish(id,'ready','自动提交已取消，请手动点击官网 Submit。');
  return {cancelled:true};
}
async function scheduleSearchSubmit(id,application){
  await cancelSearchSubmit(id);
  const p={id:crypto.randomUUID(),tabId:id,application,createdAt:Date.now(),deadline:null,phase:'awaiting',state:sessions.get(id)};
  searchSubmissions.set(id,p);p.state.status='countdown';await publish(id,p.state);await writeSearchSubmit(p);
  p.timeout=setTimeout(()=>void cancelSearchSubmit(id,p.id),8000);return searchSubmitMeta(p);
}
const trackerRelevant=url=>{try{const u=new URL(url);return u.protocol==='https:'&&['ircc-services.canada.ca','gc.auth.canada.ca','clegc-gckey.gc.ca'].includes(u.hostname);}catch{return false;}};
async function trackerAuthAccess(){try{return await chrome.permissions.contains({origins:TrackerAuthOrigins});}catch{return false;}}
async function rememberTrackerTab(tab){
  if(tab?.id===undefined||tab.windowId===undefined||!trackerRelevant(tab.url))return;
  const key='tracker:window:'+tab.windowId,saved=(await chrome.storage.session.get(key))[key];
  if(saved?.tabId!==tab.id)await chrome.storage.session.set({[key]:{tabId:tab.id}});
}
async function findTrackerTab(windowId,tabId){
  const key='tracker:window:'+windowId,saved=(await chrome.storage.session.get(key))[key];
  const accept=tab=>tab?.windowId===windowId&&(trackerRelevant(tab.url)||(!tab.url&&saved?.tabId===tab.id));
  for(const id of [...new Set([tabId,saved?.tabId].filter(id=>id!==undefined))]){
    try{const tab=await chrome.tabs.get(id);if(accept(tab))return tab;}catch{}
  }
  const active=await chrome.tabs.query({active:true,windowId});
  if(accept(active[0])){await rememberTrackerTab(active[0]);return active[0];}
  const origins=['https://ircc-services.canada.ca/*'];
  for(const origin of TrackerAuthOrigins)try{if(await chrome.permissions.contains({origins:[origin]}))origins.push(origin);}catch{}
  const tabs=await chrome.tabs.query({windowId,url:origins}),found=tabs.find(accept);
  if(found)await rememberTrackerTab(found);return found;
}
let backupRestoring=false;
// Use Chrome's persistent host from the very first toolbar click. A transient
// action popup can disappear before handing control over to a side panel.
function configureQueryPanel(){
  return chrome.sidePanel?.setPanelBehavior?.({openPanelOnActionClick:true})?.catch(()=>{});
}
configureQueryPanel();
chrome.runtime.onInstalled?.addListener(configureQueryPanel);
chrome.runtime.onStartup?.addListener(configureQueryPanel);
// Remove the mailbox listener and metadata left by 3.1.0–3.1.2 on upgrade.
async function removeLegacyMailAssist(){
  if(chrome.scripting?.getRegisteredContentScripts){
    const scripts=await chrome.scripting.getRegisteredContentScripts();
    const ids=scripts.filter(script=>script.id==='ircc-mail-otp').map(script=>script.id);
    if(ids.length)await chrome.scripting.unregisterContentScripts({ids});
  }
  await chrome.storage.local.remove?.('autoDetectOtp');
  const data=await chrome.storage.session.get(null);
  const keys=Object.keys(data).filter(key=>key==='otp:epoch' || key.startsWith('otp:binding:'));
  if(keys.length)await chrome.storage.session.remove(keys);
  if(chrome.permissions?.remove)await chrome.permissions.remove({origins:['https://mail.163.com/*','https://*.mail.163.com/*']}).catch(()=>{});
}
void removeLegacyMailAssist().catch(()=>{});
const allowed = url => { try { const u = new URL(url); return u.protocol === 'https:' && u.hostname === 'ircc-services.canada.ca'; } catch { return false; } };
const relevant = /security|criminality|background|admissibility|eligibility|biometric|medical|application.?status/i;
async function publish(id,state){
  const snapshot=captureSnapshot(state);
  await chrome.storage.session.set({['capture:'+id]:snapshot});
  if(state.profileId && state.profileVerified)await chrome.storage.session.set({['capture:profile:'+state.profileId]:snapshot});
  const labels={capturing:'REC',completed:'OK',failed:'ERR',filling:'FILL',stopped:'STOP'};
  await chrome.action.setBadgeText({tabId:id,text:labels[state.status] || ''});
  await chrome.action.setBadgeBackgroundColor({tabId:id,color:state.status==='failed'?'#b42318':state.active?'#175cd3':'#166b49'});
}
async function finish(id,status,reason){
  const state=sessions.get(id);
  if(!state)return;
  const attached=state.active;
  state.active=false;state.status=status;state.reason=reason;state.finishedAt=new Date().toISOString();
  if(status==='failed'){const person=state.applicants?.find(person=>person.id===state.current);if(person)person.status='failed';}
  clearTimeout(state.timeout);clearTimeout(state.settle);clearTimeout(state.verificationTimer);state.pending.clear();
  if(attached){try{await chrome.debugger.detach({tabId:id});}catch(error){state.errors.push(error.message);}}
  if(status==='completed' && !state.comparisonRecorded){
    state.comparisonRecorded=true;
    try{await recordComparison(state);}catch{state.comparison={...(state.comparison || {status:'unavailable',changes:[],people:{}}),saveError:true};}
  }
  await publish(id,state);
}
async function begin(id,status='capturing',profileId){
  if(sessions.get(id)?.active)await finish(id,'stopped','已开始新的操作');
  const saved=sessions.get(id) || (await chrome.storage.session.get('capture:'+id))['capture:'+id];
  const configured=await chrome.storage.local.get(['applications','selectedApplicationId']);
  if(saved?.application?.number){
    const owner=(configured.applications || []).find(profile=>ownsProfile(saved,profile,configured.applications));
    if(owner)await chrome.storage.session.set({['capture:profile:'+owner.id]:saved.profileId?saved:{...saved,profileId:owner.id}});
  }
  const profile=(configured.applications || []).find(item=>item.id===(profileId || configured.selectedApplicationId));
  const state={profileId:profile?.id,profileNumber:profile?.applicationNumber,profileVerified:false,previous:saved?{application:saved.application,applicants:saved.applicants}:null,domain:{},pageScopes:new Map(),active:false,status,startedAt:new Date().toISOString(),responses:[],pending:new Map(),reading:0,requestScopes:new Map(),applicants:[],application:{},phase:'overview',errors:[]};
  if(profile && saved?.status==='completed' && ownsProfile(saved,profile,configured.applications))state.comparisonBaseline=comparisonSnapshot(saved);
  sessions.set(id,state);
  try{
    await chrome.debugger.attach({tabId:id},'1.3');state.active=true;
    await chrome.debugger.sendCommand({tabId:id},'Network.enable');
    state.timeout=setTimeout(async()=>{if(state.active && !(await completeIfReady(id,state)))await finish(id,'failed','查询超时，已保留获取的结果。');},120000);
    await publish(id,state);
  }catch(error){await finish(id,'failed','无法启动：'+error.message);throw error;}
}

function normalizeName(value){return String(value || '').toLowerCase().replace(/\s+/g,' ').trim();}
function syncDomain(state){
  for(const person of state.applicants){
    if(!person.relationId){
      const candidates=Object.values(state.domain).filter(record=>record.name && normalizeName(record.name)===normalizeName(person.name));
      if(candidates.length===1)person.relationId=candidates[0].relationId;
    }
    const record=person.relationId && state.domain[person.relationId];
    if(record){
      person.checks={...person.checks,...record.checks};
      if(record.hasHistory){person.history=record.history;person.historyLoaded=true;person.historySource='response';}
      if(record.pendingActions!==undefined)person.pendingActions=record.pendingActions;
    }
    if(personReady(person)){person.status='completed';person.readAt=person.readAt || new Date().toISOString();}
  }
}
async function completeIfReady(id,state){
  if(!state.applicants.length || !state.applicants.every(personReady))return false;
  state.phase='completed';state.current=null;await finish(id,'completed','');return true;
}
async function advanceCapture(id,state){
  syncDomain(state);if(await completeIfReady(id,state))return;
  const next=state.applicants.find(person=>!personReady(person));state.current=next.id;next.status='capturing';
  if(next.relationId){state.phase='applicant';await publish(id,state);await chrome.tabs.update(id,{url:'https://ircc-services.canada.ca/2/ast-view-application?relation_id='+encodeURIComponent(next.relationId)});}
  else{state.current=null;state.phase='overview';await publish(id,state);await chrome.tabs.update(id,{url:'https://ircc-services.canada.ca/2/ast-details'});}
}

function findFields(value, path = '$', found = []) {
  if (!value || typeof value !== 'object') return found;
  for (const [key, child] of Object.entries(value)) {
    const next = `${path}[${JSON.stringify(key)}]`;
    if (relevant.test(key)) found.push({path: next, value: child});
    findFields(child, next, found);
  }
  return found;
}
chrome.runtime.onMessage.addListener((message, sender, reply) => {
  (async () => {
    const id = mailExtensionSender(sender)?message.tabId:sender.tab?.id ?? message.tabId;
    if(['armSearchSubmit','commitSearchSubmit','cancelSearchSubmit'].includes(message.action)){
      if(!mailExtensionSender(sender))throw Error('请从扩展页面操作。');
      const p=searchSubmissions.get(id);if(!p||p.id!==message.submissionId)return {cancelled:true};
      if(message.action==='cancelSearchSubmit')return p.phase==='committing'?{cancelled:false}:cancelSearchSubmit(id,p.id);
      if(message.action==='armSearchSubmit'){
        if(typeof message.viewId!=='string'||message.viewId.length>100)throw Error('自动提交未开始，请手动提交。');
        if(p.phase==='awaiting'){p.viewId=message.viewId;p.phase='armed';p.deadline=Date.now()+5000;clearTimeout(p.timeout);p.timeout=setTimeout(()=>void cancelSearchSubmit(id,p.id),15000);await writeSearchSubmit(p);}
        return {pending:searchSubmitMeta(p)};
      }
      if(p.viewId!==message.viewId){await cancelSearchSubmit(id,p.id);return {cancelled:true};}
      if(p.phase!=='armed'||(message.immediate!==true&&Date.now()<p.deadline))return {pending:searchSubmitMeta(p)};
      p.phase='committing';clearTimeout(p.timeout);await writeSearchSubmit(p);
      let request;
      try{
        const selected=await chrome.storage.local.get(['applications','selectedApplicationId']),tab=await chrome.tabs.get(id);
        const profile=selected.applications?.find(a=>a.id===p.application.id);
        if(selected.selectedApplicationId!==p.application.id||JSON.stringify(profile)!==JSON.stringify(p.application)||!allowed(tab.url)||new URL(tab.url).pathname!=='/2/ast-search'||tab.active===false||searchSubmissions.get(id)!==p)throw Error('页面或申请已变化，自动提交已取消。');
        const ready=await chrome.scripting.executeScript({target:{tabId:id},func:submitTrackerSearch,args:[profile,false]});
        if(!ready[0]?.result?.ok)throw Error(ready[0]?.result?.message||'表单尚未就绪，请手动提交。');
        await mailTrack(id,profile.applicationNumber);request=mailRequests.get(id);
        const current=await chrome.storage.local.get('selectedApplicationId');
        if(current.selectedApplicationId!==profile.id||searchSubmissions.get(id)!==p)throw Error('页面或申请已变化，自动提交已取消。');
        await finish(id,'submitting','正在提交查询…');
        p.clickAttempted=true;
        const clicked=await chrome.scripting.executeScript({target:{tabId:id},func:submitTrackerSearch,args:[profile,true]});
        if(!clicked[0]?.result?.ok){p.clickAttempted=false;throw Error(clicked[0]?.result?.message||'表单尚未就绪，请手动提交。');}
        searchSubmissions.delete(id);await chrome.storage.session.remove('autoSubmit:'+id);
        await finish(id,'submitted','查询已提交，正在等待验证码页面。');return {submitted:true,message:'查询已提交，正在等待验证码页面。'};
      }catch(error){
        if(p.clickAttempted){try{const tab=await chrome.tabs.get(id);if(allowed(tab.pendingUrl||tab.url)&&new URL(tab.pendingUrl||tab.url).pathname==='/2/ast-otp-verification'){searchSubmissions.delete(id);await chrome.storage.session.remove('autoSubmit:'+id);await finish(id,'submitted','查询已提交，正在等待验证码页面。');return {submitted:true,message:'查询已提交，正在等待验证码页面。'};}}catch{}}
        if(request&&!p.clickAttempted)await mailCancel(id,request);await cancelSearchSubmit(id,p.id);
        return {cancelled:true,message:/[\u3400-\u9fff]/.test(error.message)?error.message:'自动提交结果尚未确认，请查看官网提示，不会自动重复提交。'};
      }
    }
    if(backupRestoring&&['restoreBackup','start','verify','fill','openTrackerPage','mailConfirm'].includes(message.action))throw Error('backup.busy');
    if(message.action==='restoreBackup'){
      if(!mailExtensionSender(sender))throw Error('backup.permission');
      const data=Backup.clean(message.data);
      if([...sessions.values()].some(s=>s.active)||verificationLocks.size||[...searchSubmissions.values()].some(p=>p.phase==='committing'))throw Error('backup.busy');
      backupRestoring=true;
      try{
        for(const [tabId,p] of [...searchSubmissions])await cancelSearchSubmit(tabId,p.id);
        const [local,session]=await Promise.all([chrome.storage.local.get(null),chrome.storage.session.get(null)]);
        const nextLocal={applications:data.applications,selectedApplicationId:data.selectedApplicationId,uiLanguage:data.uiLanguage,autoFill:data.autoFill},nextSession={};
        for(const key of Object.keys(local))if(key.startsWith('comparison:profile:'))nextLocal[key]=null;
        for(const key of Object.keys(session))if(key.startsWith('capture:')||key.startsWith('fillIntent:')||key.startsWith('pageNotice:')||key.startsWith('autoSubmit:'))nextSession[key]=null;
        for(const [id,value] of Object.entries(data.comparisons))nextLocal['comparison:profile:'+id]=value;
        for(const [id,value] of Object.entries(data.captures))nextSession['capture:profile:'+id]=value;
        await mailCancelAll();
        try{
          await chrome.storage.session.set(nextSession);await chrome.storage.local.set(nextLocal);sessions.clear();
        }catch(error){
          await chrome.storage.session.set(Object.fromEntries(Object.keys(nextSession).map(k=>[k,session[k]??null])));
          await chrome.storage.local.set(Object.fromEntries(Object.keys(nextLocal).map(k=>[k,local[k]??null])));
          throw Error('backup.write');
        }
        return {ok:true};
      }finally{backupRestoring=false;}
    }
    if(message.action==='resolveTrackerTab'){
      if(!mailExtensionSender(sender))throw Error('请从扩展页面操作。');
      const tab=await findTrackerTab(message.windowId,message.tabId);return {tabId:tab?.id};
    }
    if(message.action==='openTrackerPage'){
      if(!mailExtensionSender(sender))throw new Error('请从扩展页面操作。');
      const win=await chrome.windows.get(message.windowId);
      let target=await findTrackerTab(win.id,id);
      if(!target&&!message.forceNew&&!await trackerAuthAccess())return {needsAccess:true};
      if(target){
        if(!message.resume){await mailCancel(target.id);await chrome.storage.session.remove('pageNotice:'+target.id);if(sessions.get(target.id)?.active)await finish(target.id,'stopped','已停止');}
        const previous=target;target={...previous,...await chrome.tabs.update(target.id,{active:true,...(message.resume?{}:{url:'https://ircc-services.canada.ca/2/ast'})})};
      }else target=await chrome.tabs.create({windowId:win.id,url:'https://ircc-services.canada.ca/2/ast'});
      await rememberTrackerTab(target);
      return {ok:true,tabId:target.id};
    }
    if(message.action==='mailConfirm'){
      if(!mailExtensionSender(sender) && !mailTrackerSender(sender))throw new Error('mail.permission');
      message={...message,action:'verify',code:await mailTake(id,message)};
    }else if(message.action==='mailTrackRequest'&&mailTrackerSender(sender)&&new URL(sender.url).pathname==='/2/ast-search'){
      const cancellation=cancelSearchSubmit(id),tracking=mailHandle(message,sender);await cancellation;return tracking;
    }else if(String(message.action).startsWith('mail'))return mailHandle(message,sender);
    if(message.action==='clearLocalData' || message.action==='removeProfile'){
      if(sender.tab && !String(sender.url || '').startsWith(chrome.runtime.getURL('')))throw new Error('请从扩展设置操作。');
      if(message.action==='clearLocalData'){
        for(const [tabId,p] of [...searchSubmissions])await cancelSearchSubmit(tabId,p.id);
        for(const [tabId,state] of sessions)if(state.active)await finish(tabId,'stopped','已停止');
        const helperCleared=await mailForget();sessions.clear();await chrome.storage.local.clear();await chrome.storage.session.clear();return {ok:true,helperCleared};
      }
      await mailCancelAll();
      const config=await chrome.storage.local.get(['applications','selectedApplicationId']);
      const applications=(config.applications || []).filter(item=>item.id!==message.profileId);
      await removeProfileData(message.profileId);
      await chrome.storage.local.set({applications,selectedApplicationId:config.selectedApplicationId===message.profileId?(applications[0]?.id || ''):config.selectedApplicationId || ''});
      return {ok:true,applications};
    }
    if(message.action==='getContext'){
      let tab;try{tab=await chrome.tabs.get(id);}catch{return {stage:'closed'};}
      await rememberTrackerTab(tab);
      if(!tab.url&&tab.windowId!==undefined){const saved=(await chrome.storage.session.get('tracker:window:'+tab.windowId))['tracker:window:'+tab.windowId];if(saved?.tabId===id){if(mailRequests.has(id))await mailCancel(id);if(sessions.get(id)?.active)await finish(id,'failed','Tracker 登录已超时，请重新登录。');return {stage:'login',tabId:id};}}
      if(!tab.url||(!trackerRelevant(tab.url)&&!await trackerAuthAccess()))return {stage:'access',tabId:id};
      let url;try{url=new URL(tab.url);}catch{return {stage:'closed'};}
      if(['gc.auth.canada.ca','clegc-gckey.gc.ca'].includes(url.hostname)){
        if(mailRequests.has(id))await mailCancel(id);
        if(sessions.get(id)?.active)await finish(id,'failed','Tracker 登录已超时，请重新登录。');
        return {stage:'login',tabId:id};
      }
      const stages={'/2/ast':'role','/2/ast-search':'form','/2/ast-otp-verification':'verification','/2/ast-details':'results','/2/ast-view-application':'results','/2/ast-history':'results'};
      let expired=false;
      if(allowed(tab.url)&&tab.status!=='loading'&&chrome.scripting?.executeScript){
        try{const result=await chrome.scripting.executeScript({target:{tabId:id},func:readTrackerSessionState});expired=result[0]?.result?.expired===true;}catch{}
      }
      if(expired){await cancelSearchSubmit(id);await mailCancel(id);if(sessions.get(id)?.active)await finish(id,'failed','Tracker 登录已超时，请重新登录。');return {stage:'expired',tabId:id};}
      let observerReady;
      if(tab.status!=='loading'&&allowed(tab.url)&&['/2/ast-search','/2/ast-otp-verification'].includes(url.pathname)){
        try{const health=await chrome.tabs.sendMessage(id,{action:'mailObserverHealth'});observerReady=health?.requestTracking===true&&health.version===chrome.runtime.getManifest().version;}catch{observerReady=false;}
      }
      const notice=(await chrome.storage.session.get('pageNotice:'+id))['pageNotice:'+id],selection=await chrome.storage.local.get('selectedApplicationId');
      const pageNotice=notice?.path===url.pathname&&notice.profileId===selection.selectedApplicationId&&Date.now()-notice.createdAt<300000?notice:null;
      const pending=searchSubmissions.get(id);
      return {stage:url.hostname==='ircc-services.canada.ca'?(stages[url.pathname] || (url.searchParams.has('relation_id')?'results':'login')):/^(gc.auth.canada.ca|clegc-gckey.gc.ca)$/.test(url.hostname)?'login':'closed',tabId:id,...(observerReady===undefined?{}:{observerReady}),...(pageNotice?{pageNotice}: {}),...(pending?{autoSubmit:searchSubmitMeta(pending)}:{})};
    }
    if(message.action==='trackerPageNotice'){
      if(!mailTrackerSender(sender))throw Error('请从扩展页面操作。');
      const {selectedApplicationId}=await chrome.storage.local.get('selectedApplicationId');
      const kind=['filled','refreshRequired','pageError'].includes(message.kind)?message.kind:'pageError';
      await chrome.storage.session.set({['pageNotice:'+id]:{kind,text:kind==='filled'?String(message.text||'').slice(0,500):'',profileId:selectedApplicationId||'',path:new URL(sender.url).pathname,createdAt:Date.now()}});return {ok:true};
    }
    if(message.action==='locateSubmit'){
      if(!mailExtensionSender(sender))throw Error('请从扩展页面操作。');
      const tab=await chrome.tabs.get(id);if(!allowed(tab.url)||new URL(tab.url).pathname!=='/2/ast-search')return {ok:false};
      await chrome.tabs.update(id,{active:true});
      const result=await chrome.scripting.executeScript({target:{tabId:id},func:locateTrackerSubmit});return result[0]?.result||{ok:false};
    }
    if(message.action==='captureContext'){
      const state=sessions.get(id);
      return state?{active:state.active,status:state.status,phase:state.phase,current:state.current,startedAt:state.startedAt,verificationBaseline:state.verificationBaseline,verificationSubmittedAt:state.verificationSubmittedAt,verificationSubmitting:state.verificationSubmitting}: {active:false};
    }
    if(message.action==='fillIntent')return {applicationId:(await chrome.storage.session.get('fillIntent:'+id))['fillIntent:'+id] || null};
    if(message.action==='verificationFailed'){
      const state=sessions.get(id);
      const tab=await chrome.tabs.get(id);
      if(!state?.active || !allowed(tab.url) || new URL(tab.url).pathname!=='/2/ast-otp-verification')return {ok:false};
      const results=await chrome.scripting.executeScript({target:{tabId:id},func:readVerificationState});
      if(results[0]?.result?.error){await finish(id,'failed','验证码不正确或已过期，请输入有效验证码。');return {ok:true};}
      return {ok:false};
    }
    if(message.action==='overview'){
      const state=sessions.get(id);
      if(!state?.active || state.status!=='capturing')return {ok:false};
      const tab=await chrome.tabs.get(id);
      if(!allowed(tab.url) || new URL(tab.url).pathname!=='/2/ast-details')return {ok:false};
      if(state.phase==='applicant' && state.current)return {ok:true,buttonId:state.current};
      if(!state.applicants.length){
        if(state.profileNumber && normalizeApplicationNumber(state.profileNumber)!==normalizeApplicationNumber(message.application?.number)){
          await finish(id,'failed','Tracker 当前申请与所选申请不一致，请打开 Tracker 重新查询。');return {ok:false};
        }
        state.profileVerified=!!state.profileId;
        state.application=message.application;
        const old=state.previous?.application?.number===state.application.number?state.previous.applicants || []:[];
        state.applicants=message.applicants.map(person=>{
          const previous=old.filter(item=>normalizeName(item.name)===normalizeName(person.name) && item.role===person.role);
          return {...person,relationId:previous.length===1?previous[0].relationId:null,status:'waiting',checks:{},history:[],historyLoaded:false};
        });
      }
      syncDomain(state);
      if(await completeIfReady(id,state))return {ok:true};
      const next=state.applicants.find(person=>!personReady(person));
      state.current=next.id;state.phase='applicant';next.status='capturing';state.reason='';
      await publish(id,state);
      return {ok:true,buttonId:next.id};
    }
    if(message.action==='applicant'){
      const state=sessions.get(id);
      if(!state?.active || state.status!=='capturing' || state.phase!=='applicant')return {ok:false};
      const tab=await chrome.tabs.get(id);const page=new URL(tab.url || 'https://invalid/');
      if(page.origin!=='https://ircc-services.canada.ca' || page.pathname!=='/2/ast-view-application')return {ok:false};
      const person=state.applicants.find(person=>person.id===state.current);if(!person)return {ok:false};
      if(!person.name.startsWith('申请人 ') && normalizeName(person.name)!==normalizeName(message.name || '')){
        await finish(id,'failed','当前详情页与申请人不匹配，请重新查询。');return {ok:false};
      }
      person.relationId=page.searchParams.get('relation_id');person.name=message.name || person.name;person.checks={...person.checks,...message.checks};person.pendingActions=message.pendingActions;person.readAt=new Date().toISOString();
      syncDomain(state);
      if(await completeIfReady(id,state))return {ok:true};
      if(!person.historyLoaded){
        state.phase='history';person.status='history';await publish(id,state);
        await chrome.tabs.update(id,{url:'https://ircc-services.canada.ca/2/ast-history?relation_id='+encodeURIComponent(person.relationId)});
      }else await advanceCapture(id,state);
      return {ok:true};
    }
    if(message.action==='history'){
      const state=sessions.get(id);if(!state?.active || state.phase!=='history')return {ok:false};
      const tab=await chrome.tabs.get(id);const page=new URL(tab.url || 'https://invalid/');
      const person=state.applicants.find(person=>person.id===state.current);
      if(!allowed(tab.url) || page.pathname!=='/2/ast-history' || !person || page.searchParams.get('relation_id')!==person.relationId)return {ok:false};
      if(!person.historyLoaded){person.history=message.items;person.historyLoaded=true;person.historySource='page';}
      person.readAt=new Date().toISOString();syncDomain(state);
      await advanceCapture(id,state);return {ok:true};
    }
    if(message.action==='fill'){
      if(fillLocks.has(id)||searchSubmissions.has(id))return {ok:true,message:'正在填写或等待自动提交。'};
      fillLocks.add(id);try{
      const tab=await chrome.tabs.get(id);
      const {applications=[]}=await chrome.storage.local.get('applications');
      const application=applications.find(item=>item.id===message.applicationId);
      if(!application)throw new Error('请先添加并选择申请资料。');
      const selection=await chrome.storage.local.get('selectedApplicationId');
      if(selection.selectedApplicationId!==application.id)throw Error('所选申请已变化，请重新填写。');
      if(!allowed(tab.url))throw new Error('请先打开 Tracker。');
      if(new URL(tab.url).pathname==='/2/ast'){
        await chrome.storage.session.set({['fillIntent:'+id]:application.id});
        const chosen=await chrome.scripting.executeScript({target:{tabId:id},func:chooseRole,args:[application.role || 'principalApplicantId']});
        if(!chosen[0]?.result)throw new Error('身份选择页尚未加载完成。');return {ok:true,message:'正在填写申请资料。'};
      }
      if(new URL(tab.url).pathname!=='/2/ast-search')throw new Error('当前页面无需填写申请资料。');
      let prepared;
      for(let attempt=0;attempt<40;attempt++){
        const preparation=await chrome.scripting.executeScript({target:{tabId:id},func:fillApplication,args:[application,'prepare']});
        prepared=preparation[0]?.result;
        if(prepared?.ok || !prepared?.retryable)break;
        await new Promise(resolve=>setTimeout(resolve,250));
      }
      if(!prepared?.ok)throw new Error(prepared?.message || '申请表尚未加载完成，请刷新页面后重试。');
      if(!sessions.get(id)?.active){
        await begin(id,'filling',application.id);
      }
      for(const field of prepared.fields){
        const focused=await chrome.scripting.executeScript({target:{tabId:id},func:focusFormField,args:[field.id]});
        if(!focused[0]?.result)throw new Error('填写中断，请刷新页面后重试。');
        await chrome.debugger.sendCommand({tabId:id},'Input.dispatchKeyEvent',{type:'keyDown',key:'a',code:'KeyA',windowsVirtualKeyCode:65,modifiers:2});
        await chrome.debugger.sendCommand({tabId:id},'Input.dispatchKeyEvent',{type:'keyUp',key:'a',code:'KeyA',windowsVirtualKeyCode:65,modifiers:2});
        await chrome.debugger.sendCommand({tabId:id},'Input.insertText',{text:field.value});
        await chrome.debugger.sendCommand({tabId:id},'Input.dispatchKeyEvent',{type:'keyDown',key:'Tab',code:'Tab',windowsVirtualKeyCode:9});
        await chrome.debugger.sendCommand({tabId:id},'Input.dispatchKeyEvent',{type:'keyUp',key:'Tab',code:'Tab',windowsVirtualKeyCode:9});
      }
      const results=await chrome.scripting.executeScript({target:{tabId:id},func:fillApplication,args:[application,'dropdowns']});
      const result=results[0]?.result;
      if(!result?.ok)throw new Error(result?.message || '填写失败。');
      await chrome.storage.session.remove('fillIntent:'+id);
      let canSubmit=false;
      if(!result.manualRequired){
        let ready;
        for(let attempt=0;attempt<5;attempt++){ready=await chrome.scripting.executeScript({target:{tabId:id},func:submitTrackerSearch,args:[application,false]});if(ready[0]?.result?.ok||ready[0]?.result?.alreadySubmitted)break;if(attempt<4)await new Promise(resolve=>setTimeout(resolve,100));}
        canSubmit=ready[0]?.result?.ok===true;if(!canSubmit)result.message=ready[0]?.result?.message||'表单尚未就绪，请手动提交。';
      }
      await finish(id,'ready',result.message);
      if(canSubmit){await scheduleSearchSubmit(id,application);return {...result,message:'资料已填写，倒计时后自动提交。'};}
      try{await chrome.tabs.sendMessage(id,{action:'showFilled',message:result.message});}catch{}
      return result;
      }finally{fillLocks.delete(id);}
    }
    if (message.action === 'verify' || message.action === 'start') {
      if(message.action==='verify' && !message.candidateId)await mailCancel(id);
      if(message.action==='verify'){
        if(verificationLocks.has(id) || sessions.get(id)?.verificationSubmitting)throw new Error('正在验证，请稍候。');
        if(verificationLocks.has(id))throw new Error('正在验证，请稍候。');
        verificationLocks.add(id);
      }
      try {
      const tab = await chrome.tabs.get(id);
      if (!allowed(tab.url)) throw new Error('请先打开 Tracker。');
      if(message.action==='start' && !['/2/ast-details','/2/ast-view-application','/2/ast-history'].includes(new URL(tab.url).pathname) && !new URL(tab.url).searchParams.has('relation_id'))throw new Error('请先完成登录和邮箱验证。');
      if (message.action === 'verify') {
        if(new URL(tab.url).pathname !== '/2/ast-otp-verification') throw new Error('请先打开 Tracker 邮箱验证码页面。');
        if(!/^\d{6}$/.test(message.code)) throw new Error('请输入六位数字验证码。');
      }
      await begin(id,'capturing',message.profileId);
      if(message.action==='verify')sessions.get(id).verificationSubmitting=true;
      await chrome.tabs.update(id,{active:true});
      if(tab.windowId!==undefined)await chrome.windows.update(tab.windowId,{focused:true});
      if(message.action === 'verify') {
        const baseline=await chrome.scripting.executeScript({target:{tabId:id},func:readVerificationState});
        const preparation=await chrome.scripting.executeScript({target:{tabId:id},func:submitVerification,args:[null,'prepare']});
        if(!preparation[0]?.result?.ok)throw new Error(preparation[0]?.result?.message || '验证码输入框尚未加载完成。');
        const focused=await chrome.scripting.executeScript({target:{tabId:id},func:focusFormField,args:['__irccOtp']});
        if(!focused[0]?.result)throw new Error('验证码输入框尚未加载完成。');
        await chrome.debugger.sendCommand({tabId:id},'Input.insertText',{text:message.code});
        await chrome.debugger.sendCommand({tabId:id},'Input.dispatchKeyEvent',{type:'keyDown',key:'Tab',code:'Tab',windowsVirtualKeyCode:9});
        await chrome.debugger.sendCommand({tabId:id},'Input.dispatchKeyEvent',{type:'keyUp',key:'Tab',code:'Tab',windowsVirtualKeyCode:9});
        const state=sessions.get(id);state.verificationBaseline=baseline[0]?.result?.signature;state.verificationSubmittedAt=Date.now();
        const results=await chrome.scripting.executeScript({
          target:{tabId:id},
          func: submitVerification,
          args:[null,'click']
        });
        const result=results[0]?.result;
        if(!result?.ok) throw new Error(result?.message || '未提交验证码，请检查页面。');
        state.verificationSubmitting=false;
        state.verificationTimer=setTimeout(async()=>{
          if(!state.active)return;
          const current=await chrome.tabs.get(id);
          if(new URL(current.url).pathname==='/2/ast-otp-verification')await finish(id,'failed','验证未完成，请检查验证码后重试。');
        },15000);
        return {ok:true,message:'验证已提交，正在查询申请进度。'};
      }
      if(new URL(tab.url).pathname==='/2/ast-details')await chrome.tabs.reload(id);
      else if(['/2/ast-view-application','/2/ast-history'].includes(new URL(tab.url).pathname)){
        await chrome.tabs.update(id,{url:'https://ircc-services.canada.ca/2/ast-details'});
      }else await chrome.tabs.update(id,{url:'https://ircc-services.canada.ca/2/ast-details'});
      return {ok:true};
      } catch(error) {
        if(message.action==='verify' && sessions.get(id)?.active)await finish(id,'failed','验证未完成，请检查页面后重试。');
        throw error;
      } finally {verificationLocks.delete(id);}
    }
    if (message.action === 'stop') {
      await cancelSearchSubmit(id);
      await mailCancel(id);
      if(sessions.get(id)?.active)await finish(id,'stopped','已停止');
      return {ok:true};
    }
    if (message.action === 'read') {
      if(message.profileId){
        const configured=await chrome.storage.local.get('applications');const profiles=configured.applications || [];
        const profile=profiles.find(item=>item.id===message.profileId);
        if(!profile)return emptyProfileCapture(message.profileId);
        const live=sessions.get(id);const tabSaved=(await chrome.storage.session.get('capture:'+id))['capture:'+id];
        if(live?.profileId===profile.id && !live.profileVerified)return {...emptyProfileCapture(profile.id),active:live.active,status:live.status,reason:live.reason,startedAt:live.startedAt};
        let result=live?captureSnapshot(live):tabSaved;
        if(!ownsProfile(result,profile,profiles))result=(await chrome.storage.session.get('capture:profile:'+profile.id))['capture:profile:'+profile.id];
        if(!ownsProfile(result,profile,profiles))return emptyProfileCapture(profile.id);
        result={...result,profileId:profile.id};
        if(!live || live.profileId!==profile.id){if(result.schemaVersion!==3 || result.active)result=analyzeStoredCapture(result);}
        if(result.application?.number)await chrome.storage.session.set({['capture:profile:'+profile.id]:result});
        return result;
      }
      const state = sessions.get(id);
      if(state)return captureSnapshot(state);
      const saved=(await chrome.storage.session.get('capture:'+id))['capture:'+id];
      if(saved && (saved.schemaVersion!==3 || saved.active)){
        const restored=analyzeStoredCapture(saved);await chrome.storage.session.set({['capture:'+id]:restored});return restored;
      }
      if(saved?.active)return {...saved,active:false,status:'failed',reason:'查询已中断，请重新查询。'};
      return saved || {active:false,status:'idle',responses:[],errors:[]};
    }
    if (message.action === 'clear') { await finish(id,'idle','结果已清空');sessions.delete(id);await chrome.storage.session.remove('capture:'+id);return {ok:true}; }
    throw new Error('Unknown action');
  })().then(reply, async error => {
    const id=mailExtensionSender(sender)?message.tabId:sender.tab?.id ?? message.tabId;
    if(['fill','verify','start'].includes(message.action) && sessions.get(id)?.active)await finish(id,'failed',error.message);
    reply({error:error.message});
  });
  return true;
});
function chooseRole(role){
  const input=document.getElementById(role),next=document.getElementById('continue');
  if(!input || !next || next.disabled)return false;
  if(!input.checked)input.click();next.click();return true;
}
function focusFormField(id){
  if(location.origin!=='https://ircc-services.canada.ca' || !['/2/ast-search','/2/ast-otp-verification'].includes(location.pathname))return false;
  const field=id==='__irccOtp'?document.querySelector('[data-ircc-otp-target]'):document.getElementById(id);
  if(!(field instanceof HTMLInputElement) || field.disabled || field.readOnly)return false;
  field.focus();field.select();
  return document.activeElement===field;
}
function submitVerification(code,mode='fill') {
  if(location.origin!=='https://ircc-services.canada.ca' || location.pathname!=='/2/ast-otp-verification') return {ok:false,message:'当前页面已变更，验证码未提交。'};
  const visible=element=>element.getClientRects().length>0;
  const inputs=Array.from(document.querySelectorAll('input')).filter(element=>visible(element) && !element.disabled && !element.readOnly && ['text','number','tel','password'].includes(element.type));
  const candidates=inputs.filter(element=> /verification\s*code/i.test([element.getAttribute('aria-label'), ...(Array.from(element.labels || []).map(label=>label.textContent))].join(' ')));
  const input=candidates.length===1 ? candidates[0] : inputs.length===1 ? inputs[0] : null;
  const buttons=Array.from(document.querySelectorAll('button')).filter(element=>visible(element) && /verify code/i.test(element.getAttribute('aria-label') || element.textContent));
  if(!input || buttons.length!==1) return {ok:false,message:'验证页面尚未加载完成，请刷新页面后重试。'};
  if(mode==='prepare'){input.setAttribute('data-ircc-otp-target','true');return {ok:true};}
  if(buttons[0].disabled) return {ok:false,message:'暂时无法提交验证码，请稍后重试。'};
  if(mode!=='click'){
    const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set;
    setter.call(input,code);
    input.dispatchEvent(new Event('input',{bubbles:true,composed:true}));
    input.dispatchEvent(new Event('change',{bubbles:true,composed:true}));
  }
  if(!input.checkValidity() || buttons[0].disabled) return {ok:false,message:'验证页面尚未就绪，请稍后重试。'};
  buttons[0].click();
  return {ok:true};
}
chrome.debugger.onEvent.addListener(async (source, method, params) => {
  const state = sessions.get(source.tabId);
  if (!state?.active) return;
  if(method==='Network.requestWillBeSent'){
    state.requestScopes.set(params.requestId,requestRelation(params.request));
    try{const page=new URL(params.documentURL || '');state.pageScopes.set(params.requestId,page.origin===new URL(params.request.url).origin?page.pathname+page.search:'');}catch{}
  }
  if (method === 'Network.responseReceived') {
    const r = params.response;
    if (/ast-otp-verification/.test(state.pageScopes.get(params.requestId) || ''))return;
    if (allowed(r.url) && !/otp|verification|verify|authenticate|token/i.test(new URL(r.url).pathname) && (['XHR','Fetch'].includes(params.type) || /json/i.test(r.mimeType))) {
      state.pending.set(params.requestId, {url:r.url.split('?')[0], status:r.status,requestRelationId:state.requestScopes.get(params.requestId) || null,page:state.pageScopes.get(params.requestId) || ''});
    }
  }
  if (method === 'Network.loadingFailed'){
    if(state.pending.has(params.requestId))state.errors.push('请求未完成：'+(params.errorText || '网络错误'));
    state.pending.delete(params.requestId);
  }
  if (method !== 'Network.loadingFinished') return;
  const metadata = state.pending.get(params.requestId);
  if (!metadata) return;
  state.reading++;
  state.pending.delete(params.requestId);
  try {
    const body = await chrome.debugger.sendCommand(source, 'Network.getResponseBody', {requestId:params.requestId});
    const raw = body.base64Encoded ? new TextDecoder().decode(Uint8Array.from(atob(body.body), c=>c.charCodeAt(0))) : body.body;
    if(!state.active)return;
    if(metadata.status===401 || metadata.status===403){await finish(source.tabId,'failed','登录或授权已失效（HTTP '+metadata.status+'），已自动停止。请回到 Tracker 检查。');return;}
    let json;
    try { json=JSON.parse(raw); } catch { return; }
    if (raw.length > 5000000) { state.errors.push('Skipped response larger than 5 MB'); return; }
    json=redactPrivateFields(json);
    const matches=findFields(json);
    const records=applicantPayloads(json);
    state.responses.push({...metadata,relationId:responseOwner(metadata.requestRelationId,json),capturedAt:new Date().toISOString(),matches,json});
    for(const record of records)state.domain[record.relationId]=mergePayload(state.domain[record.relationId],record);
    syncDomain(state);
    state.requestScopes.delete(params.requestId);
    if(state.responses.length>100) state.responses.shift();
    await publish(source.tabId,state);
    if(state.status==='capturing')await completeIfReady(source.tabId,state);
  } catch(e) { state.errors.push(`${metadata.url}: ${e.message}`); if(state.errors.length>50)state.errors.shift();await publish(source.tabId,state); }
  finally{state.reading--;}
});
chrome.debugger.onDetach.addListener(source => { const state=sessions.get(source.tabId); if(state?.active)void finish(source.tabId,'failed','查询连接已断开，请重新查询。'); });
chrome.tabs.onRemoved.addListener(id => {verificationLocks.delete(id);const state=sessions.get(id);if(state){clearTimeout(state.timeout);clearTimeout(state.settle);}sessions.delete(id);void chrome.storage.session.remove('capture:'+id);});

chrome.tabs.onUpdated?.addListener((id,change)=>{
  if(change.url && sessions.get(id)?.active && !allowed(change.url))void finish(id,'failed','查询页面已离开 Tracker，已停止。');
});
// Remember only Tracker pages we can identify; keep the same tab identity through authentication redirects.
chrome.tabs.onUpdated?.addListener((id,change,tab)=>{if(change.url&&allowed(change.url)&&tab?.windowId!==undefined)void rememberTrackerTab({...tab,id,url:change.url}).catch(()=>{});});
chrome.tabs.onRemoved.addListener((id,info)=>{if(info?.windowId!==undefined)void(async()=>{const key='tracker:window:'+info.windowId,saved=(await chrome.storage.session.get(key))[key];if(saved?.tabId===id)await chrome.storage.session.remove(key);})().catch(()=>{});});
chrome.storage.onChanged.addListener((changes,area)=>{if(area==='local'&&(changes.selectedApplicationId||changes.applications||(changes.autoFill&&changes.autoFill.newValue===false)))for(const [id,p] of [...searchSubmissions])void cancelSearchSubmit(id,p.id).catch(()=>{});});
chrome.tabs.onUpdated?.addListener((id,change)=>{if(change.url){try{if(!allowed(change.url)||new URL(change.url).pathname!=='/2/ast-search')void cancelSearchSubmit(id).catch(()=>{});}catch{}}});
chrome.tabs.onRemoved.addListener(id=>void cancelSearchSubmit(id).catch(()=>{}));
