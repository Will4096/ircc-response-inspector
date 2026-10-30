import fs from 'node:fs/promises';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const root=new URL('./',import.meta.url);
const read=name=>fs.readFile(new URL(name,root),'utf8');
const names=['privacy-data.js','i18n.js','comparison.js','domain.js','model.js','profiles.js','scanner.js','form.js','background.js','autofill.js','popup.js','options.js'];
for(const file of names)new vm.Script(await read(file),{filename:file});
const manifest=JSON.parse(await read('manifest.json'));
for(const file of [...manifest.content_scripts[0].js,'popup.html','popup.css','options.html'])await fs.access(new URL(file,root));
const domain={URL,Date};vm.createContext(domain);vm.runInContext(await read('domain.js'),domain);vm.runInContext(await read('model.js'),domain);
const people=['Person A','Person B','Person C','Person D'];
const roster=people.map((name,index)=>({id:'viewApplicant'+(index+1),name,role:index?'DEP':'PA'}));
const milestones={biometrics:'completed',medical:'completed',eligibility:'completed',background:'inProgress'};
const event=(code,date)=>({key:'Security',actStatus:code,actType:'01',dateCreated:date,dateLoaded:date,extra:'retain'});
const payload=(index,withName=true)=>({relationId:index+1,...(withName?{fullName:people[index]}:{}),milestones,history:[event('17','2026-09-01'),event('18','2026-10-01')],actions:[]});
const wrapped={actions:[{returnValue:JSON.stringify({applicants:people.map((_,index)=>payload(index))})}]};
const records=domain.applicantPayloads(wrapped);assert.equal(records.length,4);assert.equal(records[2].relationId,'3');assert.equal(records[0].history[0].extra,'retain');
assert.equal(domain.securitySummary(records[0].history).value,'18');assert.equal(domain.securitySummary([event('17',null),event('18',null)]).value,'17 / 18');
const duplicateEvents=payload(0);duplicateEvents.history=[event('17','2026-09-01'),event('17','2026-09-01')];assert.equal(domain.applicantPayloads(duplicateEvents)[0].history.length,2);
const paginated=payload(0);paginated.history={items:paginated.history,hasMore:true};assert.equal(domain.applicantPayloads(paginated)[0].hasHistory,false);
assert.equal(domain.personReady({checks:{biometrics:'Completed',medical:'Completed',eligibility:'Completed',background:'In Progress'},historyLoaded:false}),false);
assert.equal(domain.responseOwner(null,{people:[{relationId:1},{relationId:2}]}),null);
const responses=Array.from({length:68},(_,index)=>({url:index===0?'api/application':'api/config',page:'/2/ast-details',json:index===0?wrapped:{configuration:true}}));
const analysis=domain.responseAnalysis(responses);assert.equal(analysis.total,68);assert.equal(analysis.duplicates,66);assert.equal(analysis.applicantDataResponses,1);assert.equal(analysis.pages.length,1);
assert.equal(analysis.completeAtResponse,1);
const legacy={schemaVersion:2,active:true,status:'failed',reason:'读取超时',application:{number:'TEST'},applicants:roster.map((person,index)=>({...person,relationId:String(index+1),checks:{},status:'completed'})),responses};
const recovered=domain.analyzeStoredCapture(legacy);assert.equal(recovered.status,'completed');assert.equal(recovered.active,false);assert.equal(recovered.applicants[2].history[0].key,'Security');assert.equal(recovered.analysis.total,68);
async function harness(saved){
  let handler,network;let url='https://ircc-services.canada.ca/2/ast-details';let detached=0;let reloads=0;const moves=[];const timers=[];const stored=saved?{'capture:7':saved}:{};const bodies=new Map();
  const context={URL,Date,TextDecoder,Uint8Array,atob,importScripts(){},setTimeout:(fn,delay)=>{const timer={fn,delay};timers.push(timer);return timer;},clearTimeout:timer=>{if(timer)timer.cancelled=true;},chrome:{runtime:{getURL:path=>'chrome-extension://test/'+path,onMessage:{addListener:fn=>handler=fn}},storage:{onChanged:{addListener(){}},local:{get:async()=>({applications:[{id:'profile',role:'principalApplicantId'}]})},session:{set:async values=>Object.assign(stored,values),get:async key=>({[key]:stored[key]}),remove:async key=>delete stored[key]}},action:{setBadgeText:async()=>{},setBadgeBackgroundColor:async()=>{}},tabs:{get:async()=>({url}),update:async(id,change)=>{if(change.url){url=change.url;moves.push(change.url);}},reload:async()=>reloads++,sendMessage:async()=>{},onRemoved:{addListener(){}},onUpdated:{addListener(){}}},debugger:{attach:async()=>{},detach:async()=>detached++,sendCommand:async(source,method,args)=>method==='Network.getResponseBody'?{body:JSON.stringify(bodies.get(args.requestId))}:{},onEvent:{addListener:fn=>network=fn},onDetach:{addListener(){}}}}};
  vm.createContext(context);for(const name of ['domain.js','model.js','profiles.js','scanner.js','comparison.js','privacy-data.js','mail-core.js','mail-assist.js','background.js'])vm.runInContext(await read(name),context);
  return {context,timers,moves,get detached(){return detached;},get reloads(){return reloads;},get url(){return url;},set url(value){url=value;},async sendExtension(message,sender={}){return new Promise(resolve=>handler(message,sender,resolve));},async send(action,data={}){return new Promise(resolve=>handler({action,...data},{tab:{id:7},url},resolve));},async respond(json,key='r'){
    bodies.set(key,json);await network({tabId:7},'Network.requestWillBeSent',{requestId:key,documentURL:url,request:{url:'https://ircc-services.canada.ca/api'}});
    await network({tabId:7},'Network.responseReceived',{requestId:key,type:'Fetch',response:{url:'https://ircc-services.canada.ca/api',status:200,mimeType:'application/json'}});
    await network({tabId:7},'Network.loadingFinished',{requestId:key});
  },async hang(){await network({tabId:7},'Network.responseReceived',{requestId:'forever',type:'Fetch',response:{url:'https://ircc-services.canada.ca/irrelevant',status:200,mimeType:'application/json'}});}};
}
// Side-panel handoff runs in the worker and never reuses a tab in a different window.
{
  const h=await harness(),api=h.context.chrome,updates=[],created=[];
  api.windows={get:async id=>({id})};
  api.tabs.get=async id=>({id,windowId:99,url:'https://ircc-services.canada.ca/2/ast-search'});
  api.tabs.query=async options=>{assert.equal(options.windowId,1);return [];};
  api.tabs.create=async options=>{created.push(options);return {id:8,...options};};
  api.tabs.update=async(id,options)=>{updates.push(options);return {id,windowId:1,...options};};
  const sender={url:'chrome-extension://test/popup.html'};
  assert.ok((await h.sendExtension({action:'openTrackerPage',windowId:1,tabId:7},sender)).ok);
  assert.equal(created[0].windowId,1);assert.equal(updates.length,0);
  api.tabs.get=async id=>({id,windowId:1,url:'https://ircc-services.canada.ca/2/ast-search'});
  await h.sendExtension({action:'openTrackerPage',windowId:1,tabId:7,resume:true},sender);
  assert.equal(updates.length,1);assert.equal(updates[0].url,undefined,'Continue preserves form/session');
  await h.sendExtension({action:'openTrackerPage',windowId:1,tabId:7,resume:false},sender);
  assert.equal(updates[1].url,'https://ircc-services.canada.ca/2/ast');
  assert.ok((await h.send('openTrackerPage',{windowId:1})).error,'Web pages cannot use extension navigation command');
}
// All four records in one response: no detail/history traversal, no waiting for an unrelated request.
let app=await harness();assert.equal((await app.send('start')).ok,true);assert.equal(app.reloads,1);await app.hang();await app.respond(wrapped);await app.send('overview',{application:{number:'TEST'},applicants:roster});
let result=await app.send('read');assert.equal(result.status,'completed');assert.equal(result.active,false);assert.equal(app.detached,1);assert.equal(result.applicants.length,4);assert.equal(app.moves.length,0);assert.equal(result.applicants[0].history.length,2);
// A completed batch cannot later be turned into a timeout failure.
for(const timer of app.timers.filter(timer=>timer.delay===120000))await timer.fn();assert.equal((await app.send('read')).status,'completed');
// Unnamed aggregate payload: first capture confirms names on individual pages, without visiting history.
app=await harness();await app.send('start');await app.respond({people:people.map((_,index)=>payload(index,false))});
for(let index=0;index<4;index++){
  app.url='https://ircc-services.canada.ca/2/ast-details';const next=await app.send('overview',{application:{number:'TEST'},applicants:roster});assert.equal(next.buttonId,roster[index].id);
  const repeat=await app.send('overview',{application:{number:'TEST'},applicants:roster});assert.equal(repeat.buttonId,next.buttonId);
  app.url='https://ircc-services.canada.ca/2/ast-view-application?relation_id='+(index+1);
  await app.send('applicant',{name:people[index],checks:{biometrics:'Completed',medical:'Completed',eligibility:'Completed',background:'In Progress'},pendingActions:0});
}
result=await app.send('read');assert.equal(result.status,'completed');assert.ok(!app.moves.some(url=>url.includes('ast-history')));
// Reuse only same-application confirmed identities; old history is NOT copied into the new capture.
const previous=result;app=await harness(previous);await app.send('start');await app.respond({people:people.map((_,index)=>payload(index,false))});await app.send('overview',{application:{number:'TEST'},applicants:roster});assert.equal((await app.send('read')).status,'completed');assert.equal(app.moves.length,0);
// Missing history triggers just the missing history page; all history items survive, including duplicate titles.
app=await harness();await app.send('start');await app.send('overview',{application:{number:'ONE'},applicants:[roster[0]]});app.url='https://ircc-services.canada.ca/2/ast-view-application?relation_id=1';await app.send('applicant',{name:people[0],checks:{biometrics:'Completed',medical:'Completed',eligibility:'Completed',background:'In Progress'},pendingActions:0});
assert.ok(app.url.includes('ast-history'));assert.equal((await app.send('read')).active,true);
const history=Array.from({length:25},(_,index)=>({title:'Update',text:'item '+index}));await app.send('history',{items:history});result=await app.send('read');assert.equal(result.status,'completed');assert.equal(result.applicants[0].history.length,25);
// Entry points: result/detail/history capture converges on overview; earlier stages do not start a meaningless capture.
for(const path of ['/2/ast-view-application?relation_id=2','/2/ast-history?relation_id=2']){app=await harness();app.url='https://ircc-services.canada.ca'+path;assert.equal((await app.send('getContext')).stage,'results');await app.send('start');assert.equal(app.url,'https://ircc-services.canada.ca/2/ast-details');}
for(const [path,stage] of [['/2/ast','role'],['/2/ast-search','form'],['/2/ast-otp-verification','verification']]){app=await harness();app.url='https://ircc-services.canada.ca'+path;assert.equal((await app.send('getContext')).stage,stage);assert.ok((await app.send('start')).error);}
app=await harness();app.url='https://clegc-gckey.gc.ca/j/eng/l';assert.equal((await app.send('getContext')).stage,'login');
// Verification failure stops capture, then allows a fresh code to start another attempt.
app=await harness();app.url='https://ircc-services.canada.ca/2/ast-otp-verification';
app.context.chrome.scripting={executeScript:async request=>[{result:request.func.name==='readVerificationState'?{error:true,signature:'mismatch|2'}:request.func.name==='focusFormField'?true:{ok:true}}]};
assert.equal((await app.send('verify',{code:'123456'})).ok,true);await app.send('verificationFailed');assert.equal((await app.send('read')).active,false);assert.equal((await app.send('verify',{code:'654321'})).ok,true);await app.send('stop');
// Table/details UI: Security comes from history, not checks; every item expands in-place, without a request.
class Element{constructor(tag){this.tag=tag;this.children=[];this.dataset={};this.style={};this.value='profile';this.attributes={};}append(...items){this.children.push(...items);}replaceChildren(){this.children=[];}setAttribute(key,value){this.attributes[key]=value;}}
const html=await read('popup.html');const ids=[...html.matchAll(/id="([^"]+)"/g)].map(match=>match[1]);assert.equal(ids.length,new Set(ids).size);assert.ok(!ids.includes('settings'));
const nodes=new Map(ids.map(id=>[id,new Element(id)]));const intervals=[];
const popup={URL,Date,document:{getElementById:id=>nodes.get(id),createElement:tag=>new Element(tag)},chrome:{runtime:{getManifest:()=>manifest},storage:{local:{get:async()=>({applications:[]})}},tabs:{query:async()=>[]}},setInterval:fn=>intervals.push(fn)};
vm.createContext(popup);vm.runInContext(await read('i18n.js'),popup);vm.runInContext(await read('domain.js'),popup);vm.runInContext(await read('ui-model.js'),popup);vm.runInContext(await read('popup.js'),popup);
const sample={active:false,status:'completed',application:{number:'TEST'},applicants:roster.map((person,index)=>({...person,relationId:String(index+1),status:'completed',checks:{biometrics:'Completed',medical:'Completed',eligibility:'Completed',background:'In Progress',security:'DO NOT USE CHECKS'},historyLoaded:true,history:index?[]:[...payload(0).history,...history],pendingActions:0})),responses:[],errors:[]};
popup.renderCapture(sample);let rows=nodes.get('results').children[0].children[1].children;assert.equal(rows.length,8);assert.equal(rows[0].children[5].children[0].textContent,'18');assert.equal(rows[2].children[5].children[0].textContent,'无记录');
assert.equal(rows[1].hidden,true);const icon=rows[0].children[7].children[0];icon.onclick();assert.equal(rows[1].hidden,false);assert.equal(icon.attributes['aria-expanded'],'true');assert.equal(rows[1].children[0].children[0].children[1].children.length,27);
popup.renderCapture(sample);rows=nodes.get('results').children[0].children[1].children;assert.equal(rows[1].hidden,false,'Expanded details persist across updates');
popup.renderContext({stage:'verification'},sample);assert.equal(nodes.get('verifyForm').hidden,false);assert.equal(nodes.get('resultActions').hidden,true);assert.equal(nodes.get('fill').hidden,true);
popup.renderContext({stage:'form'},sample);assert.equal(nodes.get('verifyForm').hidden,true);assert.equal(nodes.get('fill').hidden,false);
popup.renderContext({stage:'results'},sample);assert.equal(nodes.get('resultActions').hidden,false);
// Delayed form hydration: stable IDs succeed without labels; partial forms are retried without HTML in the message.
const inputIds=['surname','givenName','uci','applicationNumber','dateOfBirthYear','dateOfBirthDay','dateOfBirthMonth','countryOfBirth'];let available=inputIds.map(id=>({id,type:'text',labels:[],getClientRects:()=>[1],getAttribute:()=>null}));
const formContext={location:{origin:'https://ircc-services.canada.ca',pathname:'/2/ast-search'},document:{getElementById:id=>available.find(input=>input.id===id),querySelectorAll:selector=>selector==='input'?available:[]}};vm.createContext(formContext);vm.runInContext(await read('form.js'),formContext);
const profile={surname:'Test',givenName:'Person',uci:'12345678',applicationNumber:'TEST',birthDate:'1987-12-19',country:'China'};assert.equal((await formContext.fillApplication(profile,'prepare')).ok,true);available=available.slice(0,1);const preparing=await formContext.fillApplication(profile,'prepare');assert.equal(preparing.retryable,true);assert.equal(preparing.message,'表单尚未就绪。');
console.log('PASS: encoded multi-person payloads; history Security and raw codes; full/duplicate/paginated histories; 68-response analysis; domain-based early completion despite hanging traffic; conditional page visits; same-application mapping; all entry stages; OTP retry; per-person expandable details; delayed form readiness.');
// Profiles are independent of the browser tab. Wrong application data cannot be written into another profile.
const profileA={id:'A',applicationNumber:'APP-A'},profileB={id:'B',applicationNumber:'APP-B'};
app=await harness();app.context.chrome.storage.local.get=async()=>({applications:[profileA,profileB],selectedApplicationId:'A'});
await app.send('start',{profileId:'A'});await app.respond(wrapped);await app.send('overview',{application:{number:'APP-A'},applicants:roster});
assert.equal((await app.send('read',{profileId:'A'})).applicants.length,4);
assert.equal((await app.send('read',{profileId:'B'})).applicants.length,0);
await app.send('start',{profileId:'B'});await app.respond(wrapped);await app.send('overview',{application:{number:'APP-A'},applicants:roster});
assert.equal((await app.send('read',{profileId:'B'})).applicants.length,0);
assert.equal((await app.send('read',{profileId:'B'})).responses.length,0);
assert.equal((await app.send('read',{profileId:'A'})).application.number,'APP-A');
// Switching to an unqueried profile immediately clears results and opens the query entry.
let navigations=0,releaseStale;
const cachedA={...sample,profileId:'A',application:{number:'APP-A',title:'Result A'}};
const cachedB={...sample,profileId:'B',application:{number:'APP-B',title:'Result B'}};
let cachedBAvailable=false,holdA=false;
popup.chrome.runtime.sendMessage=async message=>{
  if(message.action==='getContext')return {stage:'results'};
  if(message.action==='read'){
    if(message.profileId==='A' && holdA){holdA=false;return new Promise(resolve=>releaseStale=resolve);}
    return message.profileId==='A'?cachedA:cachedBAvailable?cachedB:{active:false,status:'idle',applicants:[],responses:[]};
  }
};
popup.chrome.storage.local.set=async()=>{};
popup.chrome.tabs.query=async()=>[{id:7,url:'https://ircc-services.canada.ca/2/ast-details'}];popup.chrome.tabs.get=async()=>({id:7,windowId:1,url:'https://ircc-services.canada.ca/2/ast-details'});
popup.chrome.tabs.update=async(id,change)=>{if(change.url){assert.equal(change.url,'https://ircc-services.canada.ca/2/ast');navigations++;}};popup.chrome.windows={update:async()=>{}};
nodes.get('application').value='A';popup.renderCapture(cachedA);nodes.get('application').value='B';await nodes.get('application').onchange();assert.equal(nodes.get('results').children[0].textContent,'暂无结果');assert.equal(nodes.get('export').disabled,true);assert.equal(navigations,0);
cachedBAvailable=true;nodes.get('application').value='A';await nodes.get('application').onchange();assert.equal(nodes.get('applicationTitle').textContent,'Result A');
holdA=true;const staleRead=popup.refreshCapture();nodes.get('application').value='B';await nodes.get('application').onchange();releaseStale(cachedA);await staleRead;assert.equal(nodes.get('applicationTitle').textContent,'Result B');assert.equal(navigations,0);
await nodes.get('openTracker').onclick();assert.equal(navigations,1,'Explicit Open Tracker navigates; selecting profiles does not navigate');
console.log('PASS: per-profile cache, wrong-application isolation, empty-profile reopening, rapid-switch stale response suppression, and Open Tracker navigation.');

// Worker completion persists comparison once; opening or polling never acknowledges it.
app=await harness();const comparisonStorage={};
app.context.chrome.storage.local.get=async key=>typeof key==='string' && key.startsWith('comparison:')?{[key]:comparisonStorage[key]}:{applications:[profileA,profileB],selectedApplicationId:'A'};
app.context.chrome.storage.local.set=async values=>Object.assign(comparisonStorage,structuredClone(values));
await app.send('start',{profileId:'A'});await app.respond(wrapped);await app.send('overview',{application:{number:'APP-A'},applicants:roster});
assert.equal((await app.send('read',{profileId:'A'})).comparison.status,'first');
const altered={people:people.map((_,index)=>payload(index))};altered.people[0].milestones={...milestones,background:'completed'};altered.people[0].history.push(event('19','2026-10-28'));
await app.send('start',{profileId:'A'});await app.respond(altered);await app.send('overview',{application:{number:'APP-A'},applicants:roster});
const changedResult=await app.send('read',{profileId:'A'});assert.equal(changedResult.comparison.status,'changed');
assert.ok(changedResult.comparison.changes.some(change=>change.label==='背景调查'));
assert.equal((await app.send('read',{profileId:'A'})).comparison.status,'changed','Polling does not clear the update summary');
const successfulBaseline=JSON.stringify(comparisonStorage['comparison:profile:A']);
await app.send('start',{profileId:'B'});await app.respond(wrapped);await app.send('overview',{application:{number:'APP-A'},applicants:roster});assert.equal(JSON.stringify(comparisonStorage['comparison:profile:A']),successfulBaseline);
const displayChange={type:'history',person:sample.applicants[0].name,label:'History',added:1,removed:0,newIndices:[0]};
popup.renderCapture({...sample,comparison:{status:'changed',previousAt:'2026-10-27T12:00:00Z',changes:[displayChange],people:{[sample.applicants[0].id]:[displayChange]}}});
assert.equal(nodes.get('updates').hidden,false);assert.equal(nodes.get('updates').children[0].textContent,'较上次查询有新变化');
rows=nodes.get('results').children[0].children[1].children;assert.ok(rows[0].children[0].children.some(child=>child.textContent==='有更新'));
assert.equal(rows[1].children[0].children[0].children[1].children[0].className,'history-new');
popup.renderCapture({status:'failed',applicants:[],responses:[]});assert.match(nodes.get('updates').children[0].textContent,/未更新比较基准/);
console.log('PASS: worker comparison integration, persistence, stable polling, failed profile isolation, visible update summary, per-person badges and new History highlighting.');

// Language switches rerender result/status UI without changing data or typed OTP.
await popup.I18n.init();nodes.get('code').value='482791';
const originalPayload=JSON.stringify(sample);popup.renderCapture(sample);
await popup.I18n.setLanguage('en');
assert.equal(nodes.get('capture').textContent,'Refresh progress');
rows=nodes.get('results').children[0].children[1].children;
assert.equal(nodes.get('results').children[0].children[0].children[0].children[1].textContent,'Biometrics');
assert.equal(rows[2].children[5].children[0].textContent,'No records');
assert.equal(nodes.get('code').value,'482791');assert.equal(JSON.stringify(sample),originalPayload);
popup.setOutput('请输入六位数字验证码。');assert.equal(nodes.get('output').textContent,'Enter the six-digit verification code.');
await popup.I18n.setLanguage('zh');assert.equal(nodes.get('output').textContent,'请输入六位数字验证码。');
assert.equal(nodes.get('code').value,'482791');
assert.ok(nodes.get('results').children[0].children[0].children[0].children[1].textContent.includes('Biometrics'));
console.log('PASS: live bilingual result/status rendering, language-switch error updates, intact manual OTP and untouched IRCC payloads.');
{
  const original=popup.chrome.runtime.sendMessage;let clicking=false,opens=0,handoffs=0;
  vm.runInContext('queryWindowId=1',popup);
  popup.chrome.runtime.sendMessage=async message=>{
    if(message.action==='openTrackerPage'){assert.ok(clicking);assert.equal(message.windowId,1);handoffs++;return {ok:true,tabId:7};}
    return original(message);
  };
  popup.chrome.sidePanel={open:async options=>{assert.ok(clicking,'Side panel starts inside click, before any await');assert.equal(options.windowId,1);opens++;}};
  clicking=true;let pending=nodes.get('openTracker').onclick();clicking=false;await pending;
  assert.equal(opens,1);assert.equal(handoffs,1);
  popup.chrome.sidePanel.open=async()=>{throw Error('Gesture rejected');};
  clicking=true;pending=nodes.get('openTracker').onclick();clicking=false;await pending;
  assert.equal(handoffs,2);assert.match(nodes.get('output').textContent,/侧栏未能打开/);
  popup.chrome.runtime.sendMessage=original;delete popup.chrome.sidePanel;
  console.log('PASS: synchronous side-panel gesture, worker navigation handoff, current-window isolation and manual fallback.');
}
