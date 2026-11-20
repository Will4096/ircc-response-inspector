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
