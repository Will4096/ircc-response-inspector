/* Worker-only mailbox transports. Secrets and candidates stay in worker memory. */
const mailRequests=new Map(),mailSecrets=new Map(),mailGmailTokens=new Map(),mailPollLocks=new Set();
const mailTrackingTabs=new Map();
const MAIL_NATIVE='com.will4096.ircc_mail';
const MAIL_GMAIL_ORIGIN='https://gmail.googleapis.com/*';
let mailNativeStatus=null;
let mailNativeObserved=null;
const MAIL_WINDOW=600000; // Observation window, NOT a claim about IRCC code validity.
const mailEnded=new Map();
let mailWrites=Promise.resolve();
function mailWrite(work){const next=mailWrites.then(work);mailWrites=next.catch(()=>{});return next;}
function mailDiagnostic(stage,count){
  if(!['request_linked','fetch_start','fetch_complete','matched','mail.auth','mail.account','mail.credentials','mail.helper','mail.permission','mail.windows','mail.network'].includes(stage))return;
  return mailWrite(async()=>{const key='mail:diagnostics';const previous=(await chrome.storage.session.get(key))[key]||[];const event={at:Date.now(),stage};if(Number.isInteger(count)&&count>=0)event.count=count;await chrome.storage.session.set({[key]:[...previous,event].slice(-80)});}).catch(()=>{});
}
async function mailNative(payload){
  if((await chrome.runtime.getPlatformInfo()).os!=='win')throw new Error('mail.windows');
  if(!await chrome.permissions.contains({permissions:['nativeMessaging']}))throw new Error('mail.permission');
  try{const result=await chrome.runtime.sendNativeMessage(MAIL_NATIVE,payload);if(result?.error)throw new Error(result.error);
    const version=result?.helperVersion??result?.version;
    mailNativeObserved={version:typeof version==='string'&&/^\d+\.\d+(?:\.\d+)?$/.test(version)?version:null,protocol:Number.isInteger(result?.protocol)?result.protocol:null};
    if(payload.action!=='clear'&&(result?.protocol!==1||!/^1\.(\d+)$/.test(result.helperVersion||'')||Number(result.helperVersion.split('.')[1])<2))throw new Error('mail.version');
    mailNativeStatus={helperReady:true,configured:payload.action==='status'?!!result.configured:payload.action==='clear'?false:true};
    if(payload.action!=='clear'){const saved=(await chrome.storage.local.get('mailConnection')).mailConnection;if(saved?.lastError==='mail.version')await chrome.storage.local.set({mailConnection:{...saved,lastError:null}});}
    return result;}
  catch(error){if(error.message==='mail.version')mailNativeStatus={helperReady:false,error:'mail.version'};else if(error.message==='mail.helper'||!/^mail\./.test(error.message)){
    const text=String(error.message||'');const reason=/not found|not registered/i.test(text)?'not-found':/forbidden|denied|blocked/i.test(text)?'forbidden':/exited|failed to start|launch/i.test(text)?'exited':/invalid|communicat|length|json/i.test(text)?'protocol':'unknown';
    mailNativeStatus={helperReady:false,reason};
  }if(/^mail\./.test(error.message))throw error;throw new Error('mail.helper');}
}
async function mailConfig(){return (await chrome.storage.local.get('mailAssist')).mailAssist || {enabled:false};}
async function mailCancel(tabId,expected){
  if(expected&&mailRequests.get(tabId)?.id!==expected.id)return;
  mailRequests.delete(tabId);mailSecrets.delete(tabId);
  await mailWrite(async()=>{const key='mail:request:'+tabId,saved=(await chrome.storage.session.get(key))[key];if(!expected||saved?.id===expected.id)await chrome.storage.session.remove(key);});
}
async function mailCancelAll(){
  for(const id of [...mailRequests.keys()])await mailCancel(id);mailSecrets.clear();
  await mailWrite(async()=>{const data=await chrome.storage.session.get(null);
    const keys=Object.keys(data).filter(k=>k.startsWith('mail:request:'));
    if(keys.length)await chrome.storage.session.remove(keys);
  });
}
async function mailForget(){
  await mailCancelAll();mailGmailTokens.clear();
  let helperCleared=true;
  if(await chrome.permissions.contains({permissions:['nativeMessaging']}))try{await mailNative({action:'clear'});}catch{helperCleared=false;}
  await chrome.storage.local.remove(['mailAssist','mailConnection']);return helperCleared;
}
function mailExtensionSender(sender){return !!sender.url?.startsWith(chrome.runtime.getURL(''));}
function mailTrackerSender(sender){try{return new URL(sender.url).origin==='https://ircc-services.canada.ca';}catch{return false;}}
function mailPage(url){try{const parsed=new URL(url);return parsed.origin==='https://ircc-services.canada.ca'?parsed.pathname:'';}catch{return '';}}
async function mailAuthorize(config){
  if(!await chrome.permissions.contains({permissions:['identity'],origins:[MAIL_GMAIL_ORIGIN]}))throw new Error('mail.permission');
  const redirect=chrome.identity.getRedirectURL('gmail'),state=crypto.randomUUID();
  const url=new URL('https://accounts.google.com/o/oauth2/v2/auth');
  url.search=new URLSearchParams({client_id:config.clientId,redirect_uri:redirect,response_type:'token',scope:'https://www.googleapis.com/auth/gmail.readonly',state,login_hint:config.email,prompt:'select_account'});
  let response;try{response=await chrome.identity.launchWebAuthFlow({url:url.href,interactive:true});}catch{throw new Error('mail.auth');}
  const returned=new URL(response),params=new URLSearchParams(returned.hash.slice(1));
  if(returned.origin!==new URL(redirect).origin || returned.pathname!==new URL(redirect).pathname || params.get('state')!==state || !params.get('access_token'))throw new Error('mail.auth');
  const token=params.get('access_token');
  const profile=await mailGmailFetch('profile',token);
  if(MailCore.address(profile.emailAddress)!==config.email)throw new Error('mail.account');
  mailGmailTokens.set(config.email,{token,expires:Date.now()+Math.min(Number(params.get('expires_in')) || 3600,3600)*1000-60000});
  await chrome.storage.local.set({mailConnection:{provider:'gmail',email:config.email,verifiedAt:Date.now()}});
}
async function mailGmailFetch(path,token){
  const response=await fetch('https://gmail.googleapis.com/gmail/v1/users/me/'+path,{headers:{Authorization:'Bearer '+token},cache:'no-store',signal:AbortSignal.timeout(15000),redirect:'error'});
  if(!response.ok)throw new Error(response.status===401?'mail.auth':'mail.network');
  return response.json();
}
function mailDecode(data){try{return new TextDecoder().decode(Uint8Array.from(atob(data.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0)));}catch{return '';}}
function mailPlain(part){
  if(part.filename)return '';
  if(part.mimeType==='text/plain')return mailDecode(part.body?.data || '');
  if(part.mimeType==='text/html')return MailCore.htmlText(mailDecode(part.body?.data || ''));
  const parts=part.parts || [],plain=parts.filter(p=>p.mimeType==='text/plain').map(mailPlain).filter(Boolean);
  return (plain.length?plain:parts.map(mailPlain).filter(Boolean)).join('\n').slice(0,64000);
}
async function mailMessages(config,request){
  if(config.provider==='163')return (await mailNative({action:'poll',email:config.email,since:Math.floor(request.startedAt/1000)*1000})).messages || [];
  const auth=mailGmailTokens.get(config.email);
  if(!auth || auth.expires<Date.now())throw new Error('mail.auth');
  const q='after:'+Math.floor(request.startedAt/1000)+' {from:(cic.gc.ca) from:(canada.ca)}';
  const list=await mailGmailFetch('messages?maxResults=10&q='+encodeURIComponent(q),auth.token);
  const messages=[];
  for(const item of list.messages || []){
    const data=await mailGmailFetch('messages/'+encodeURIComponent(item.id)+'?format=full',auth.token);
    const header=name=>(data.payload?.headers || []).filter(h=>h.name.toLowerCase()===name).map(h=>h.value).join(',');
    messages.push({id:item.id,receivedAt:Number(data.internalDate),subject:header('subject'),from:header('from'),to:(header('to')+' '+header('delivered-to')).match(/[A-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Z0-9.-]+/ig) || [],text:mailPlain(data.payload || {}).slice(0,64000)});
  }
  return messages;
}
async function mailBinding(request){
  const config=await mailConfig(),selected=await chrome.storage.local.get(['selectedApplicationId','applications']);
  if(!config.enabled || !request || request.deadline<Date.now() || selected.selectedApplicationId!==request.profileId || config.email!==request.email || config.provider!==request.provider || !selected.applications?.some(p=>p.id===request.profileId))return null;
  const profile=selected.applications.find(p=>p.id===request.profileId);
  if(request.applicationNumber&&normalizeApplicationNumber(profile.applicationNumber)!==request.applicationNumber)return null;
  return config;
}
async function mailContext(tabId,request){
  const config=await mailBinding(request);if(!config)return null;
  let tab;try{tab=await chrome.tabs.get(tabId);}catch{return null;}
  if(mailPage(tab.url)!=='/2/ast-otp-verification')return null;
  return config;
}
let mailTrackQueue=Promise.resolve();
function mailTrack(tabId,number){
  const observedAt=Date.now();
  mailTrackingTabs.set(tabId,(mailTrackingTabs.get(tabId)||0)+1);
  const next=mailTrackQueue.then(()=>mailTrackNow(tabId,number,observedAt)).finally(()=>{const count=mailTrackingTabs.get(tabId)-1;if(count)mailTrackingTabs.set(tabId,count);else mailTrackingTabs.delete(tabId);});
  mailTrackQueue=next.catch(()=>{});return next;
}
async function mailTrackNow(tabId,number,observedAt){
  const config=await mailConfig();if(!config.enabled)return {ok:false};
  const {selectedApplicationId,applications=[]}=await chrome.storage.local.get(['selectedApplicationId','applications']);
  const profile=applications.find(p=>p.id===selectedApplicationId);
  if(!profile || normalizeApplicationNumber(profile.applicationNumber)!==normalizeApplicationNumber(number) || !number)return {ok:false};
  // Only one outstanding request per mailbox: no speculative cross-profile matching.
  await mailCancelAll();
  const request={id:crypto.randomUUID(),profileId:profile.id,applicationNumber:normalizeApplicationNumber(number),email:config.email,provider:config.provider,startedAt:observedAt,deadline:observedAt+MAIL_WINDOW};
  mailRequests.set(tabId,request);mailSecrets.set(tabId,{excluded:new Set(),candidates:[]});
  mailEnded.delete(tabId);
  await mailDiagnostic('request_linked');
  await mailWrite(async()=>{if(mailRequests.get(tabId)===request)await chrome.storage.session.set({['mail:request:'+tabId]:request});});return {ok:true};
}
async function mailPoll(tabId){
  if(mailTrackingTabs.has(tabId))return {status:'requesting'};
  if(mailPollLocks.has(tabId))return {status:'waiting'};
  let request=mailRequests.get(tabId);
  if(!request){
    const saved=(await chrome.storage.session.get('mail:request:'+tabId))['mail:request:'+tabId];
    if(mailTrackingTabs.has(tabId))return {status:'requesting'};
    request=mailRequests.get(tabId)||saved;
    if(request&&!mailRequests.has(tabId)){mailRequests.set(tabId,request);mailSecrets.set(tabId,{excluded:new Set(),candidates:[]});}
  }
  const config=await mailBinding(request);
  if(mailTrackingTabs.has(tabId)||mailRequests.get(tabId)!==request)return {status:'requesting'};
  if(!config){const expired=request&&request.deadline<Date.now();await mailCancel(tabId,request);if(expired)mailEnded.set(tabId,request.profileId);const settings=await mailConfig(),selected=await chrome.storage.local.get('selectedApplicationId');return {status:!settings.enabled?'off':mailEnded.get(tabId)===selected.selectedApplicationId?'expired':'unbound'};}
  let tab;try{tab=await chrome.tabs.get(tabId);}catch{await mailCancel(tabId,request);return {status:'unbound'};}
  // A submit click precedes navigation. A stale UI poll must not erase that new binding.
  if(mailPage(tab.url)==='/2/ast-search')return {status:'requesting',profileId:request.profileId};
  if(mailPage(tab.url)!=='/2/ast-otp-verification'){await mailCancel(tabId,request);return {status:'unbound'};}
  const secrets=mailSecrets.get(tabId);
  const display=()=>({status:secrets.candidates.length?'candidates':secrets.error || 'waiting',checkedAt:secrets.checkedAt||null,helper:secrets.error==='mail.version'?mailNativeObserved:secrets.error==='mail.helper'?{reason:mailNativeStatus?.reason}:undefined,diagnostic:secrets.diagnostic,requestId:request.id,profileId:request.profileId,candidates:secrets.candidates.map(({id,code,receivedAt,purpose})=>({id,code,receivedAt,purpose}))});
  if(secrets.candidates.length)return display(); // Waiting for confirmation is not a new fetch demand.
  if(secrets.lastPoll && Date.now()-secrets.lastPoll<10000)return display();
  mailPollLocks.add(tabId);secrets.lastPoll=Date.now();
  try{
    await mailDiagnostic('fetch_start');
    const messages=await mailMessages(config,request);
    await mailDiagnostic('fetch_complete',messages.length);
    secrets.checkedAt=Date.now();
    if(mailRequests.get(tabId)!==request || !await mailContext(tabId,request))return {status:'off'};
    const inspection=MailCore.inspect(messages,request,secrets.excluded);secrets.diagnostic=inspection.diagnostic;
    const candidates=inspection.candidates;
    const filtered=[];for(const c of candidates)if(!(request.consumed || []).includes(await mailDigest(request,c.code)))filtered.push(c);
    secrets.candidates=filtered;delete secrets.error;
    await mailDiagnostic('matched',filtered.length);
    const saved=(await chrome.storage.local.get('mailConnection')).mailConnection;
    if(saved?.email===config.email && saved.lastError)await chrome.storage.local.set({mailConnection:{...saved,lastError:null}});
  }catch(error){
    if(mailRequests.get(tabId)!==request)return {status:'off'};
    secrets.error=['mail.auth','mail.account','mail.credentials','mail.helper','mail.version','mail.permission','mail.windows','mail.network'].includes(error.message)?error.message:'mail.network';
    await mailDiagnostic(secrets.error);
    const saved=(await chrome.storage.local.get('mailConnection')).mailConnection;
    if(mailRequests.get(tabId)===request && saved?.email===config.email && saved.lastError!==secrets.error)await chrome.storage.local.set({mailConnection:{...saved,lastError:secrets.error}});
  }
  finally{mailPollLocks.delete(tabId);}
  if(mailRequests.get(tabId)!==request || !await mailContext(tabId,request))return {status:'off'};
  return display();
}
async function mailDigest(request,code){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(request.id+':'+code)))).map(n=>n.toString(16).padStart(2,'0')).join('');}
async function mailExclude(tabId,request,candidates){
  request.consumed=[...new Set([...(request.consumed || []),...await Promise.all(candidates.map(c=>mailDigest(request,c.code)))])].slice(-30);
  await mailWrite(async()=>{if(mailRequests.get(tabId)!==request)throw new Error('mail.stale');await chrome.storage.session.set({['mail:request:'+tabId]:request});});
}
async function mailTake(tabId,message){
  const request=mailRequests.get(tabId),secrets=mailSecrets.get(tabId);
  if(!await mailContext(tabId,request) || request.id!==message.requestId || request.profileId!==message.profileId)throw new Error('mail.stale');
  const candidate=secrets?.candidates.find(c=>c.id===message.candidateId);
  if(!candidate)throw new Error('mail.stale');
  // Mark consumed BEFORE submission, including preparation errors. Never repeat automatically.
  secrets.excluded.add(candidate.code);secrets.candidates=[];
  await mailExclude(tabId,request,[candidate]);return candidate.code;
}
async function mailHandle(message,sender){
  if(!String(message.action).startsWith('mail'))return undefined;
  const extension=mailExtensionSender(sender),tracker=mailTrackerSender(sender),tabId=extension?message.tabId:sender.tab?.id ?? message.tabId;
  if(['mailSave','mailAuthorize','mailSetup163','mailTest163','mailDisconnect','mailSettings','mailHelperStatus'].includes(message.action)){
    if(!extension)throw new Error('mail.permission');
    if(message.action==='mailSettings'){
      const config=await mailConfig(),saved=(await chrome.storage.local.get('mailConnection')).mailConnection;
      const token=mailGmailTokens.get(config.email);const connection={authReady:!!token && token.expires>Date.now(),expiresAt:token?.expires || null,verifiedAt:saved?.email===config.email && saved?.provider===config.provider?saved.verifiedAt:null,error:saved?.email===config.email?saved.lastError:null};
      if(config.provider==='163'){
        // Rendering settings must not launch a native process. Show last verified configuration.
        connection.helperReady=mailNativeStatus?.helperReady??(connection.error==='mail.helper'?false:connection.verifiedAt?true:undefined);
        if(mailNativeStatus?.error)connection.error=mailNativeStatus.error;
        connection.helperVersion=mailNativeObserved?.version;connection.helperProtocol=mailNativeObserved?.protocol;
        connection.helperFailure=mailNativeStatus?.reason;
        connection.configured=mailNativeStatus?.configured??!!connection.verifiedAt;connection.onDemand=true;
      }
      return {config,connection,extensionId:chrome.runtime.id,redirect:'https://'+chrome.runtime.id+'.chromiumapp.org/gmail'};
    }
    if(message.action==='mailHelperStatus')return mailNative({action:'status'});
    if(message.action==='mailDisconnect')return {ok:true,helperCleared:await mailForget()};
    const config=MailCore.normalizeConfig(message.config);
    if(message.action==='mailAuthorize'){await mailAuthorize(config);return {ok:true};}
    if(message.action==='mailSetup163'){
      if(config.provider!=='163')throw new Error('mail.config');
      await mailNative({action:'configure',email:config.email,password:message.password});
      await chrome.storage.local.set({mailConnection:{provider:'163',email:config.email,verifiedAt:Date.now()}});return {ok:true};
    }
    if(message.action==='mailTest163'){
      if(config.provider!=='163')throw new Error('mail.config');
      await mailNative({action:'test',email:config.email});
      await chrome.storage.local.set({mailConnection:{provider:'163',email:config.email,verifiedAt:Date.now()}});return {ok:true};
    }
    if(message.action==='mailSave'){
      if(config.enabled && config.provider==='163' && (await chrome.storage.local.get('mailConnection')).mailConnection?.lastError)throw new Error('mail.credentials');
      if(config.enabled && config.provider==='gmail'){const token=mailGmailTokens.get(config.email);if(!token || token.expires<Date.now())throw new Error('mail.auth');}
      if(config.enabled && config.provider==='163'){
        const saved=(await chrome.storage.local.get('mailConnection')).mailConnection;
        if(saved?.email!==config.email || saved?.provider!=='163' || !(await mailNative({action:'status'})).configured)throw new Error('mail.credentials');
      }
      await mailCancelAll();if(!config.enabled)mailGmailTokens.clear();await chrome.storage.local.set({mailAssist:config});return {ok:true};
    }
  }
  if(!tracker && !extension)throw new Error('mail.permission');
  if(message.action==='mailTrackRequest'){
    if(!tracker || new URL(sender.url).pathname!=='/2/ast-search')throw new Error('mail.permission');
    return mailTrack(tabId,message.applicationNumber);
  }
  if(message.action==='mailResend'){
    if(!tracker || !await mailContext(tabId,mailRequests.get(tabId)))return {ok:false};
    const {applications=[]}=await chrome.storage.local.get('applications');const profile=applications.find(p=>p.id===mailRequests.get(tabId).profileId);
    return mailTrack(tabId,profile.applicationNumber);
  }
  if(message.action==='mailPoll')return mailPoll(tabId);
  if(message.action==='mailIgnore'){
    const req=mailRequests.get(tabId);if(!await mailContext(tabId,req) || req.id!==message.requestId)throw new Error('mail.stale');
    const s=mailSecrets.get(tabId);const candidates=s?.candidates || [];for(const c of candidates)s.excluded.add(c.code);if(s)s.candidates=[];
    await mailExclude(tabId,req,candidates);return {ok:true};
  }
  if(message.action==='mailCancel'){await mailCancel(tabId);return {ok:true};}
  throw new Error('mail.permission');
}
chrome.storage.onChanged.addListener((changes,area)=>{
  if(area==='local'&&(changes.selectedApplicationId||changes.mailAssist||changes.applications)){
    const observed=[...mailRequests.entries()];
    void (async()=>{for(const [id,request] of observed)if(!await mailBinding(request)||(changes.applications&&!request.applicationNumber))await mailCancel(id,request);})();
  }
});
chrome.tabs.onRemoved.addListener(id=>void mailCancel(id));
chrome.tabs.onUpdated.addListener((id,change)=>{
  if(change.url && !['/2/ast-search','/2/ast-otp-verification'].includes(mailPage(change.url)))void mailCancel(id);
});
