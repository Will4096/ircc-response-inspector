import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
const root=new URL('../',import.meta.url),run=(file,args)=>execFileSync(process.execPath,[file,...args],{stdio:'pipe'});
const build=new URL('scripts/build-release.mjs',root);
run(fileURLToPath(build),['--runtime-only']);
const manifest=JSON.parse(await fs.readFile(new URL('manifest.json',root),'utf8')),filename='ircc-response-inspector-v'+manifest.version+'.zip';
const original=await fs.readFile(new URL('dist/'+filename,root));
const temp=await fs.mkdtemp(new URL('dist/build-normalization-',root));
const files=JSON.parse(await fs.readFile(new URL('dist/runtime-files.json',root),'utf8'));
for(const file of [...files,'scripts/build-release.mjs']){
 const target=path.join(temp,file);await fs.mkdir(path.dirname(target),{recursive:true});
 const bytes=await fs.readFile(new URL(file,root));
 await fs.writeFile(target,/\.(?:js|mjs|json|html|css|md|ps1)$/.test(file)||file==='LICENSE'?bytes.toString().replace(/\r\n/g,'\n').replace(/\n/g,'\r\n'):bytes);
}
run(path.join(temp,'scripts/build-release.mjs'),['--runtime-only']);
assert.ok(original.equals(await fs.readFile(path.join(temp,'dist',filename))),'LF and CRLF source checkouts must produce the same ZIP');
const corrupted=Buffer.from(original);corrupted[corrupted.length-1]^=1;await fs.writeFile(path.join(temp,'tampered.zip'),corrupted);
assert.throws(()=>run(path.join(temp,'scripts/build-release.mjs'),['--verify','--archive=tampered.zip']));
console.log('PASS: LF/CRLF checkouts produce identical runtime archives; source verification rejects a changed archive.');
// Inject synthetic contamination into the disposable checkout only, never user files.
const candidate=path.join(temp,'layout.js'),clean=await fs.readFile(candidate,'utf8');
for(const contamination of ['C:'+String.raw`\Users\SyntheticDeveloper\project`,'http://localhost:4567/mock','github_pat_'+'x'.repeat(30)]){
 await fs.writeFile(candidate,clean+'\n// '+contamination+'\n');
 assert.throws(()=>run(path.join(temp,'scripts/build-release.mjs'),['--runtime-only']),/Personal path, development endpoint or secret/);
}
await fs.writeFile(candidate,clean);
for(const name of files)assert.ok(!/(?:tests?|fixtures?|audits?|exports?|captures?|screenshots?|node_modules|\.git)(?:\/|$)/i.test(name));
console.log('PASS: runtime packaging rejects synthetic personal paths, development endpoints and secret signatures; no local data is read.');

const manifestPath=path.join(temp,'manifest.json'),manifestText=await fs.readFile(manifestPath,'utf8');
await fs.writeFile(manifestPath,JSON.stringify({...JSON.parse(manifestText),version_name:'0.0.0'}));
assert.throws(()=>run(path.join(temp,'scripts/build-release.mjs'),['--runtime-only']),/Manifest display version differs/);
await fs.writeFile(manifestPath,manifestText);
console.log('PASS: runtime packaging rejects a stale manifest display version.');
