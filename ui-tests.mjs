import fs from 'node:fs/promises';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const read=file=>fs.readFile(new URL(file,import.meta.url),'utf8');
const context={};vm.createContext(context);vm.runInContext(await read('ui-model.js'),context);const ui=context.UIModel;
assert.equal(ui.query('closed',{},false).add,true);
assert.equal(ui.query('closed',{},true).open,true);
assert.equal(ui.query('login',{},true).openText,'继续登录');
assert.equal(ui.query('login',{active:true},true).relogin,true);
assert.equal(ui.query('expired',{status:'completed'},true).openText,'重新登录 Tracker');
assert.equal(ui.query('form',{},true).fill,true);
assert.equal(ui.query('form',{status:'ready'},true).fill,false);
assert.equal(ui.query('form',{status:'ready'},true).openText,'定位官网 Submit');
assert.equal(ui.query('verification',{status:'failed'},true).verify,true);
assert.equal(ui.query('results',{active:true},true).stop,true);
assert.equal(ui.query('results',{status:'stopped'},true).capture,true);
assert.equal(ui.query('results',{status:'completed'},true).label,'已完成');
const config={enabled:true,provider:'163',email:'demo@163.com',clientId:''},connection={helperReady:true,configured:true,verifiedAt:123};
assert.equal(ui.mail(config,connection,{...config,enabled:false}).state,'off');
assert.equal(ui.mail({enabled:false},connection,config).state,'setup');
assert.equal(ui.mail(config,{helperReady:false},config).state,'error');
assert.equal(ui.mail(config,connection,config).state,'connected');
assert.equal(ui.mail(config,{...connection,error:'mail.credentials'},config).state,'error');
assert.equal(ui.mail(config,connection,{...config,hasPassword:true}).state,'setup');
assert.equal(ui.mail(config,connection,{...config,email:'other@163.com'}).state,'setup');
assert.equal(ui.mail({...config,provider:'gmail'},{authReady:false},{...config,provider:'gmail'}).state,'reauth');
// All three surfaces share navigation and styles; destructive controls cannot leak into profile/query pages.
for(const file of ['popup.html','options.html','settings.html']){
  const html=await read(file);assert.ok(html.includes('app.css'));assert.ok(html.includes('aria-current="page"'));
  const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);assert.equal(ids.length,new Set(ids).size);
  for(const m of html.matchAll(/(?:src|href)="([^"#?]+)"/g))if(!/^https?:/.test(m[1]))await fs.access(new URL(m[1],import.meta.url));
}
assert.ok(!(await read('options.html')).includes('mailEnabled'));
assert.ok(!(await read('popup.html')).includes('clearData'));
const settings=await read('settings.html');for(const id of ['generalHeading','mailHeading','privacyHeading','aboutHeading'])assert.ok(settings.includes(id));
assert.ok(settings.indexOf('generalHeading')<settings.indexOf('mailHeading'));
assert.ok((await read('options.js')).includes('beforeunload'));
assert.ok((await read('popup.js')).includes("if(targetTabId && ['login','form','role'].includes(currentContext.stage))"));
// New user-facing strings in state models have English translations.
const c={chrome:{storage:{onChanged:{addListener(){}}}}};vm.createContext(c);vm.runInContext(await read('i18n.js'),c);
// Force English through the same public initialization API.
c.chrome.storage.local={get:async()=>({uiLanguage:'en'})};await c.I18n.init();
for(const file of ['ui-model.js','mail-options.js','backup-ui.js','options.js','settings.js'])for(const match of (await read(file)).matchAll(/'([^'\n]*[\u3400-\u9fff][^'\n]*)'/g))assert.notEqual(c.I18n.t(match[1]),match[1],file+': '+match[1]);
console.log('PASS: query action model, connection/setup/expired states, shared navigation and styling, progressive settings, isolated destructive actions, asset links, and complete state-copy translation.');
