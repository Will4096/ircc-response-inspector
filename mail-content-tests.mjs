import vm from 'node:vm';import fs from 'node:fs/promises';import assert from 'node:assert/strict';
const listeners={},messages=[];let time=2000;
class Clock extends Date{static now(){return time;}}
const c={Date:Clock,location:{pathname:'/2/ast-search'},I18n:{language:'en',onChange(){}},document:{addEventListener:(name,fn)=>listeners[name]=fn,getElementById:id=>id==='applicationNumber'?{value:'DEMO0001'}:null},chrome:{runtime:{sendMessage:async message=>{messages.push(message);return {ok:true};}}},setInterval(){},clearInterval(){},window:{addEventListener(){}}};
vm.createContext(c);vm.runInContext(await fs.readFile(new URL('mail-content.js',import.meta.url),'utf8'),c);
const click=(button,trusted=true)=>{listeners.click({isTrusted:trusted,target:{closest:()=>({disabled:false,id:'',type:'button',textContent:'Submit',getAttribute:()=>null,closest:()=>({checkValidity:()=>true}),...button})}});time+=1100;};
click({id:'changed-component-id'});assert.equal(messages.at(-1).action,'mailTrackRequest');assert.equal(messages.at(-1).applicationNumber,'DEMO0001');
click({textContent:'Other action'});assert.equal(messages.length,1);
click({id:'submitButton'},false);assert.equal(messages.length,1);
click({closest:()=>({checkValidity:()=>false})});assert.equal(messages.length,1);
click({type:'submit',textContent:'Continue'});assert.equal(messages.length,2);
listeners.submit({isTrusted:true});assert.equal(messages.length,3);
console.log('PASS: trusted Submit labels, component-ID changes, submit input and Enter submission; invalid/untrusted/unrelated clicks excluded.');
