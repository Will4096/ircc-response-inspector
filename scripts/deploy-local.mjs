// Development/build/test artifacts must remain outside Chrome's unpacked extension root.
import fs from 'node:fs/promises';import path from 'node:path';import {fileURLToPath} from 'node:url';import {createHash} from 'node:crypto';
const source=fileURLToPath(new URL('../',import.meta.url));
const target=path.resolve(source,'../../ircc-response-inspector');
if(path.dirname(target)!==path.resolve(source,'../..')||path.basename(target)!=='ircc-response-inspector')throw Error('Unexpected deployment root');
const files=JSON.parse(await fs.readFile(path.join(source,'dist/runtime-files.json'),'utf8'));
for(const file of files){
  if(path.isAbsolute(file)||file.split(/[\\/]/).includes('..'))throw Error('Invalid runtime path');
  const destination=path.join(target,file);await fs.mkdir(path.dirname(destination),{recursive:true});await fs.copyFile(path.join(source,file),destination);
  const hash=bytes=>createHash('sha256').update(bytes).digest('hex');if(hash(await fs.readFile(destination))!==hash(await fs.readFile(path.join(source,file))))throw Error('Deployment mismatch');
}
console.log('Verified '+files.length+' runtime files at the original installed extension path.');
