import fs from 'node:fs/promises';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const root=new URL('./',import.meta.url);
const read=file=>fs.readFile(new URL(file,root),'utf8');
const stored={},listeners=[];
const privacy='申请资料、查询结果及对比记录仅保存在本机。本扩展不向开发者或第三方上传数据；查询所需信息仅提交至 IRCC 官方网站。';
async function surface(){
  const label={textContent:'',getAttribute:()=> '管理申请'};
  const controls=[{value:''},{value:''}];
  const input={value:'用户填写的 Given name'};
  const document={documentElement:{},querySelectorAll:selector=>selector==='[data-i18n]'?[label]:selector==='[data-language]'?controls:[],getElementById:()=>null};
  const c={document,Date,chrome:{storage:{local:{get:async()=>({...stored}),set:async values=>{Object.assign(stored,values);for(const listener of listeners)listener(Object.fromEntries(Object.entries(values).map(([key,newValue])=>[key,{newValue}])),'local');}},onChanged:{addListener:fn=>listeners.push(fn)}}}};
  vm.createContext(c);vm.runInContext(await read('i18n.js'),c);await c.I18n.init();return {c,label,controls,input};
}
const popup=await surface(),options=await surface();
assert.equal(popup.c.I18n.language,'zh','Default is Chinese, regardless of browser locale');
assert.equal(popup.label.textContent,'管理申请');assert.equal(popup.controls[0].value,'zh');
popup.controls[0].value='en';await popup.controls[0].onchange();
assert.equal(stored.uiLanguage,'en');assert.equal(options.label.textContent,'Manage applications');assert.equal(options.controls[1].value,'en');
assert.equal(options.input.value,'用户填写的 Given name','Switching does not clear typed fields');
assert.equal(popup.c.I18n.message('正在编辑：张三 PR'),'Editing: 张三 PR');
assert.equal(popup.c.I18n.message('张三：History 来源变化，本次未比较历史条目。'),'张三: History source changed; history entries were not compared.');
assert.equal(popup.c.I18n.message('验证码不正确或已过期，请输入有效验证码。'),'The verification code is incorrect or expired. Enter a valid code.');
assert.equal(popup.c.I18n.message('Security raw 17 / 18'),'Security raw 17 / 18');
assert.equal(popup.c.I18n.message('张三 — Completed'),'张三 — Completed','Original mixed-language data stays intact');
assert.ok(popup.c.I18n.t(privacy).includes('stored only on this device'));
const reopened=await surface();assert.equal(reopened.c.I18n.language,'en','Preference persists on reopen');
// Every static label and explicitly translated UI fragment must have an English value.
for(const file of ['popup.html','options.html','settings.html']){
  const html=await read(file);
  for(const match of html.matchAll(/data-i18n(?:-title|-placeholder|-label)?="([^"]+)"/g))if(/[\u3400-\u9fff]/.test(match[1]))assert.notEqual(popup.c.I18n.t(match[1]),match[1],file+': '+match[1]);
  assert.equal((html.match(/data-language/g) || []).length,file==='settings.html'?2:1,'Header switches remain available; settings owns the preference control');
  if(file==='popup.html'){assert.ok(!html.includes('settings-panel'));assert.ok(!html.includes('languageSettings'));}
  assert.ok(html.indexOf('src="i18n.js"')<html.indexOf('src="'+(file==='popup.html'?'popup.js':file==='options.html'?'options.js':'settings.js')+'"'));
}
for(const file of ['popup.js','options.js','settings.js','ui-model.js','mail-options.js','backup-ui.js'])for(const match of (await read(file)).matchAll(/t\('((?:\\.|[^'])*)'\)/g)){
  const key=vm.runInNewContext("'"+match[1]+"'");
  if(/[\u3400-\u9fff]/.test(key))assert.notEqual(popup.c.I18n.t(key),key,file+': '+key);
}
options.controls[1].value='zh';await options.controls[1].onchange();assert.equal(popup.controls[0].value,'zh');
assert.ok(popup.c.I18n.t('生物识别').includes('Biometrics'));
assert.ok((await read('options.html')).includes('Surname / Last name'));
assert.ok((await read('options.html')).includes('Given name / First name'));
console.log('PASS: Chinese default, English/Chinese switching, header/settings and cross-page synchronization, preference persistence, intact typed/user data, bilingual field names, translated errors and static/UI translation coverage.');

assert.ok(!(await read('options.html')).includes('mailEnabled'));assert.ok(!(await read('options.html')).includes('clearData'));assert.ok((await read('settings.html')).includes('mailEnabled'));assert.equal(JSON.parse(await read('manifest.json')).options_page,'workspace.html?view=settings');
