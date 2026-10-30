import fs from 'node:fs/promises';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {webcrypto} from 'node:crypto';
const read=name=>fs.readFile(new URL(name,import.meta.url),'utf8');
const stored={},persistent={},events=[];let mailbox=[],polls=0,url='https://ircc-services.canada.ca/2/ast-otp-verification',time=Date.now();
class Clock extends Date{static now(){return time;}}
const get=(db,key)=>key===null?{...db}:Object.fromEntries((Array.isArray(key)?key:[key]).filter(k=>k in db).map(k=>[k,db[k]]));
const storage=db=>({get:async key=>get(db,key),set:async value=>Object.assign(db,JSON.parse(JSON.stringify(value))),remove:async keys=>{for(const k of Array.isArray(keys)?keys:[keys])delete db[k];}});
const context={URL,URLSearchParams,Date:Clock,Map,Set,crypto:webcrypto,TextEncoder,TextDecoder,Uint8Array,atob,AbortSignal,normalizeApplicationNumber:s=>String(s || '').replace(/[^a-z0-9]/gi,'').toUpperCase(),chrome:{
  storage:{session:storage(stored),local:storage(persistent),onChanged:{addListener:fn=>events.push(fn)}},
  permissions:{contains:async()=>true},runtime:{id:'test',getURL:path=>'chrome-extension://test/'+path,getPlatformInfo:async()=>({os:'win'}),sendNativeMessage:async(name,payload)=>{if(payload.action==='poll'){polls++;return {messages:mailbox};}return {ok:true};}},
  tabs:{get:async()=>({url}),onRemoved:{addListener(){}},onUpdated:{addListener(){}}}
}};
vm.createContext(context);for(const file of ['mail-core.js','mail-assist.js'])vm.runInContext(await read(file),context);
const {MailCore}=context;
assert.deepEqual(JSON.parse(JSON.stringify(MailCore.normalizeConfig({}))),{enabled:false});
assert.throws(()=>MailCore.normalizeConfig({enabled:true,provider:'163',email:'a@gmail.com'}));
const req={startedAt:time-1000,email:'test@163.com'};
const good={id:'one',receivedAt:time,from:'IRCC <notice@cic.gc.ca>',to:['test@163.com'],subject:'Application status tracker verification code',text:'Your verification code is 123456.'};
assert.equal(MailCore.candidates([good],req).length,1);
const html=MailCore.htmlText('<head><style>999999</style></head><p>Your verification code is <b>123456</b>.</p><img src="https://example.invalid/654321"><script>888888</script>');
assert.equal(MailCore.candidates([{...good,text:html}],req).length,1);
assert.equal(html.includes('999999'),false);assert.equal(html.includes('example.invalid'),false);
for(const change of [{receivedAt:time-2000},{receivedAt:undefined},{from:'notice@cic.gc.ca.attacker.example'},{from:'notice@canada.ca <notice@evil.example>'},{to:['someone@163.com']},{text:'Create an account. Your code is 123456.'},{subject:'IRCC verification code',text:'Your code is 123456.'},{text:'Your verification code is 123456. Reference: 654321.'}])assert.equal(MailCore.candidates([{...good,...change}],req).length,0,JSON.stringify(change));
assert.equal(MailCore.candidates([good,{...good,id:'duplicate'}],req).length,1);
assert.equal(MailCore.candidates([good,{...good,id:'two',text:'Your verification code is 654321.'}],req).length,2);
assert.equal(MailCore.candidates([good],req,new Set(['123456'])).length,0);
// Disabled means NO mailbox connection, even when a verification page is open.
assert.equal((await context.mailPoll(7)).status,'off');assert.equal(polls,0);
persistent.mailAssist={enabled:true,provider:'163',email:'test@163.com'};
persistent.applications=[{id:'A',applicationNumber:'TESTA'},{id:'B',applicationNumber:'TESTB'}];persistent.selectedApplicationId='A';
assert.equal((await context.mailPoll(7)).status,'unbound');assert.equal(polls,0);
assert.equal((await context.mailTrack(7,'WRONG')).ok,false);
const observedAt=time,originalGet=context.chrome.storage.session.get;
context.chrome.storage.session.get=async key=>{if(key===null)time+=1000;return originalGet(key);};
const tracking=context.mailTrack(7,'TESTA');
assert.equal((await context.mailPoll(7)).status,'requesting','Do not poll/cancel while submit binding is being written');
await tracking;context.chrome.storage.session.get=originalGet;
assert.equal(stored['mail:request:7'].startedAt,observedAt,'Storage delay must not move the observed submit time forward');
time+=100;mailbox=[{...good,receivedAt:observedAt+100}];
url='https://ircc-services.canada.ca/2/ast-search';
assert.equal((await context.mailPoll(7)).status,'requesting','Poll during submit/navigation must preserve the new request');
assert.equal(polls,0,'Do not read email before the verification page');
url='https://ircc-services.canada.ca/2/ast-otp-verification';
events[0]({applications:{newValue:persistent.applications}},'local');await Promise.resolve();await Promise.resolve();
const first=await context.mailPoll(7);assert.equal(first.status,'candidates');assert.equal(first.candidates.length,1);
const code=await context.mailTake(7,{requestId:first.requestId,profileId:'A',candidateId:'one'});assert.equal(code,'123456');
url='https://ircc-services.canada.ca/2/ast-otp-verification?lang=en#verification';
assert.equal((await context.mailPoll(7)).status,'waiting','Query parameters must not drop request binding');
url='https://ircc-services.canada.ca/2/ast-otp-verification';
assert.ok(!JSON.stringify(stored).includes(code));assert.ok(!JSON.stringify(persistent).includes(code));assert.ok(!JSON.stringify(stored).includes(good.text));
await assert.rejects(()=>context.mailTake(7,{requestId:first.requestId,profileId:'A',candidateId:'one'}));
time+=11000;assert.equal((await context.mailPoll(7)).status,'waiting','Consumed/failed code is not retried');
// Simulate worker memory loss; session metadata still blocks the consumed candidate.
vm.runInContext('mailRequests.clear();mailSecrets.clear()',context);
time+=11000;assert.equal((await context.mailPoll(7)).status,'waiting');
mailbox=[{...good,id:'new',text:'Your verification code is 654321.',receivedAt:time}];time+=11000;
const retry=await context.mailPoll(7);assert.equal(retry.candidates[0].code,'654321','Different code may be confirmed after a failure');
persistent.selectedApplicationId='B';await assert.rejects(()=>context.mailTake(7,{requestId:retry.requestId,profileId:'A',candidateId:'new'}));assert.equal((await context.mailPoll(7)).status,'unbound');
persistent.selectedApplicationId='A';await context.mailTrack(7,'TESTA');time+=100;mailbox=[{...good,receivedAt:time}];const ignored=await context.mailPoll(7);
await context.mailHandle({action:'mailIgnore',tabId:7,requestId:ignored.requestId},{url:'chrome-extension://test/popup.html'});
time+=11000;assert.equal((await context.mailPoll(7)).status,'waiting');
url='https://gc.auth.canada.ca/login';assert.equal((await context.mailPoll(7)).status,'unbound','Expired Tracker session stops mailbox access');
await assert.rejects(()=>context.mailHandle({action:'mailSave',config:{enabled:false}},{tab:{id:7},url:'https://ircc-services.canada.ca/2/ast-search'}));
url='https://ircc-services.canada.ca/2/ast-otp-verification';await context.mailTrack(7,'TESTA');time+=180001;assert.equal((await context.mailPoll(7)).status,'unbound');
await context.mailTrack(7,'TESTA');persistent.mailAssist.enabled=false;const count=polls;assert.equal((await context.mailPoll(7)).status,'off');assert.equal(polls,count);
// No accidental broad host grants, raw codes in export, or installer in runtime ZIP.
const manifest=JSON.parse(await read('manifest.json'));
assert.ok(manifest.optional_permissions.includes('nativeMessaging'));
assert.ok(!manifest.permissions.includes('nativeMessaging'));
assert.ok(!JSON.stringify(manifest).includes('mail.163.com'));
assert.ok(manifest.content_scripts[0].js.includes('mail-content.js'));
assert.ok((await read('background.js')).includes("message={...message,action:'verify',code:await mailTake(id,message)}"));
// Gmail OAuth/HTTPS transport: fake provider replies, never a real Google connection.
const gmail={enabled:true,provider:'gmail',email:'test@gmail.com',clientId:'synthetic-client.apps.googleusercontent.com'};
let authorizedEmail=gmail.email,authCancelled=false;
context.chrome.identity={getRedirectURL:()=> 'https://test.chromiumapp.org/gmail',launchWebAuthFlow:async({url})=>{
  if(authCancelled)throw new Error('cancelled');
  const request=new URL(url);assert.equal(request.searchParams.get('scope'),'https://www.googleapis.com/auth/gmail.readonly');
  return 'https://test.chromiumapp.org/gmail#'+new URLSearchParams({state:request.searchParams.get('state'),access_token:'synthetic-token-not-real',expires_in:'3600'});
}};
context.fetch=async(url,options)=>{
  assert.ok(url.startsWith('https://gmail.googleapis.com/gmail/v1/users/me/'));assert.equal(options.headers.Authorization,'Bearer synthetic-token-not-real');
  if(url.endsWith('/profile'))return {ok:true,json:async()=>({emailAddress:authorizedEmail})};
  if(url.includes('messages?'))return {ok:true,json:async()=>({messages:[{id:'gmail-message'}]})};
  return {ok:true,json:async()=>({internalDate:String(time),payload:{mimeType:'text/plain',headers:[{name:'From',value:'IRCC <notice@cic.gc.ca>'},{name:'To',value:gmail.email},{name:'Subject',value:good.subject}],body:{data:btoa(good.text)}}})};
};
authCancelled=true;await assert.rejects(()=>context.mailAuthorize(gmail),/mail.auth/);
authCancelled=false;authorizedEmail='wrong@gmail.com';await assert.rejects(()=>context.mailAuthorize(gmail),/mail.account/);
authorizedEmail=gmail.email;await context.mailAuthorize(gmail);
persistent.mailAssist=gmail;await context.mailTrack(7,'TESTA');time+=100;
const gmailResult=await context.mailPoll(7);assert.equal(gmailResult.candidates[0].code,'123456');
assert.ok(!JSON.stringify(stored).includes('synthetic-token'));assert.ok(!JSON.stringify(persistent).includes('synthetic-token'));
await context.mailForget();await assert.rejects(()=>context.mailMessages(gmail,{startedAt:time}),/mail.auth/);
console.log('PASS: opt-in, strict matching, old/wrong-purpose/ambiguous/duplicate messages, retry after failure, worker restart deduplication, ignore, profile isolation, expired sessions, timeout and no plaintext secrets in storage.');
