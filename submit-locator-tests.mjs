import fs from 'node:fs/promises';import vm from 'node:vm';import assert from 'node:assert/strict';
let focus=0,scroll=0,clicks=0;const timeouts=[];
const button={id:'submitButton',disabled:false,style:{outline:'original'},getClientRects:()=>[{}],scrollIntoView(){scroll++;},focus(){focus++;},click(){clicks++;},getAttribute:()=>null,textContent:'Submit'};
const c={location:{origin:'https://ircc-services.canada.ca',pathname:'/2/ast-search'},document:{querySelectorAll:()=>[button],getElementById:()=>button},setTimeout:fn=>timeouts.push(fn)};
vm.createContext(c);vm.runInContext(await fs.readFile(new URL('form.js',import.meta.url),'utf8'),c);
assert.equal(c.locateTrackerSubmit().ok,true);assert.equal(focus,1);assert.equal(scroll,1);assert.equal(clicks,0);assert.equal(button.style.outline,'3px solid #3671d8');timeouts[0]();assert.equal(button.style.outline,'original');
c.location.origin='http://127.0.0.1';assert.equal(c.locateTrackerSubmit().ok,false);assert.equal(focus,1);
c.location.origin='https://ircc-services.canada.ca';c.location.pathname='/2/ast-otp-verification';assert.equal(c.locateTrackerSubmit().ok,false);
console.log('PASS: official search-only locator highlights/focuses without clicking; other origins/routes remain blocked.');
