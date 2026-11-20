import fs from 'node:fs/promises';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const root=new URL('./',import.meta.url);
const removedLocal=[],removedSession=[],states=new Map([[7,{profileId:'A',active:true}],[8,{profileId:'B',active:false}]]);
const records={'capture:7':{profileId:'A'},'capture:8':{profileId:'B'},'capture:profile:A':{profileId:'A'},'fillIntent:7':'A','fillIntent:8':'B'};
const c={sessions:states,finish:async id=>{states.get(id).active=false;},chrome:{storage:{session:{get:async()=>records,remove:async keys=>{removedSession.push(...keys);}},local:{remove:async key=>removedLocal.push(key)}}}};
vm.createContext(c);vm.runInContext(await fs.readFile(new URL('privacy-data.js',root),'utf8'),c);
await c.removeProfileData('A');assert.equal(states.has(7),false);assert.equal(states.has(8),true);assert.ok(removedSession.includes('capture:7'));assert.ok(removedSession.includes('fillIntent:7'));assert.ok(!removedSession.includes('capture:8'));assert.equal(removedLocal[0],'comparison:profile:A');
const manifest=JSON.parse(await fs.readFile(new URL('manifest.json',root),'utf8'));
assert.equal(manifest.default_locale,'zh_CN');assert.ok(!JSON.stringify(manifest).includes('mail.163.com'));assert.deepEqual(manifest.optional_host_permissions,['https://gmail.googleapis.com/*','https://gc.auth.canada.ca/*','https://clegc-gckey.gc.ca/*']);assert.ok(!manifest.permissions.includes('nativeMessaging'));assert.ok(!manifest.permissions.includes('identity'));
for(const locale of ['en','zh_CN']){const messages=JSON.parse(await fs.readFile(new URL('_locales/'+locale+'/messages.json',root),'utf8'));assert.ok(messages.extensionName.message);assert.ok(messages.extensionDescription.message.length<=132);}
for(const file of ['PRIVACY.md','privacy.html','SECURITY.md','PUBLISHING.md'])assert.ok((await fs.readFile(new URL(file,root),'utf8')).length>100);
console.log('PASS: isolated profile-data deletion, optional mailbox permissions, localized manifest and publish documents.');

const installer=await fs.readFile(new URL('windows/install-one-click.ps1',root),'utf8'),installerUi=await fs.readFile(new URL('installer-ui.js',root),'utf8');
assert.equal(installerUi.match(/const hash='([^']+)'/)[1],createHash('sha256').update(installer.replace(/\r\n/g,'\n')).digest('hex'));
for(const match of installer.matchAll(/'([^']+)' = @\{ Hash = '([a-f0-9]+)'; Data = '([^']+)' \}/g)){
 const bytes=Buffer.from(match[3],'base64');assert.equal(createHash('sha256').update(bytes).digest('hex'),match[2]);
 assert.equal(bytes.toString(),(await fs.readFile(new URL('windows/'+match[1],root),'utf8')).replace(/\r\n/g,'\n'));
}
assert.equal([...installer.matchAll(/'; Data = '/g)].length,3);
assert.ok(!installerUi.includes('raw.githubusercontent.com'));assert.ok(installerUi.includes('windows/install-one-click.ps1'));
console.log('PASS: bundled installer hash and three normalized embedded sources agree; no stale remote installer pin.');

const htmlPolicy=await fs.readFile(new URL('privacy.html',root),'utf8');
for(const h of htmlPolicy.matchAll(/<h[123]>([^<]+)<\/h[123]>/g))assert.ok(h[1].length<150,'Policy paragraphs must not become headings');
assert.ok(htmlPolicy.includes('<p>Profiles, preferences'));assert.ok(htmlPolicy.includes('rel="noopener noreferrer"'));
