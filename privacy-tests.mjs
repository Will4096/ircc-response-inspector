import fs from 'node:fs/promises';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const root=new URL('./',import.meta.url);
const removedLocal=[],removedSession=[],states=new Map([[7,{profileId:'A',active:true}],[8,{profileId:'B',active:false}]]);
const records={'capture:7':{profileId:'A'},'capture:8':{profileId:'B'},'capture:profile:A':{profileId:'A'},'fillIntent:7':'A','fillIntent:8':'B'};
const c={sessions:states,finish:async id=>{states.get(id).active=false;},chrome:{storage:{session:{get:async()=>records,remove:async keys=>{removedSession.push(...keys);}},local:{remove:async key=>removedLocal.push(key)}}}};
vm.createContext(c);vm.runInContext(await fs.readFile(new URL('privacy-data.js',root),'utf8'),c);
const input={access_token:'synthetic-access-secret',password:'synthetic-password',otp:'synthetic-otp',milestones:{medical:'Completed'},history:[{key:'Security',actStatus:'17',actType:'01'}],actions:[{returnValue:JSON.stringify({refreshToken:'synthetic-refresh-secret',applicants:[{relationId:'1',checks:{background:'In Progress'}}]})}]};
const before=JSON.stringify(input),safe=c.redactPrivateFields(input),text=JSON.stringify(safe);
for(const secret of ['synthetic-access-secret','synthetic-password','synthetic-otp','synthetic-refresh-secret'])assert.equal(text.includes(secret),false);
assert.equal(safe.history[0].actStatus,'17');assert.equal(safe.history[0].actType,'01');assert.equal(safe.milestones.medical,'Completed');assert.equal(JSON.stringify(input),before);
assert.equal(JSON.parse(safe.actions[0].returnValue).applicants[0].checks.background,'In Progress');
await c.removeProfileData('A');assert.equal(states.has(7),false);assert.equal(states.has(8),true);assert.ok(removedSession.includes('capture:7'));assert.ok(removedSession.includes('fillIntent:7'));assert.ok(!removedSession.includes('capture:8'));assert.equal(removedLocal[0],'comparison:profile:A');
const manifest=JSON.parse(await fs.readFile(new URL('manifest.json',root),'utf8'));
assert.equal(manifest.default_locale,'zh_CN');assert.ok(!JSON.stringify(manifest).includes('mail.163.com'));assert.deepEqual(manifest.optional_host_permissions,['https://gmail.googleapis.com/*','https://gc.auth.canada.ca/*','https://clegc-gckey.gc.ca/*']);assert.ok(!manifest.permissions.includes('nativeMessaging'));assert.ok(!manifest.permissions.includes('identity'));
for(const locale of ['en','zh_CN']){const messages=JSON.parse(await fs.readFile(new URL('_locales/'+locale+'/messages.json',root),'utf8'));assert.ok(messages.extensionName.message);assert.ok(messages.extensionDescription.message.length<=132);}
for(const file of ['PRIVACY.md','privacy.html','SECURITY.md','PUBLISHING.md'])assert.ok((await fs.readFile(new URL(file,root),'utf8')).length>100);
console.log('PASS: nested/encoded authentication redaction, intact Security codes, isolated profile-data deletion, optional mailbox permissions, localized manifest and publish documents.');
