import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {deflateRawSync} from 'node:zlib';
const root=fileURLToPath(new URL('../',import.meta.url));
const manifest=JSON.parse(await fs.readFile(path.join(root,'manifest.json'),'utf8'));
const files=['LICENSE','manifest.json','autofill.js','background.js','comparison.js','domain.js','form.js','i18n.js','model.js','options.html','options.js','options.css','settings.html','settings.js','popup.css','popup.html','popup.js','mail-core.js','mail-assist.js','mail-content.js','mail-options.js','mail-popup.js','MAIL-SETUP.md','MAIL-SETUP.en.md','privacy-data.js','privacy.html','privacy.css','profiles.js','scanner.js',
  '_locales/zh_CN/messages.json','_locales/en/messages.json',...['16','24','32','48','128'].map(size=>'icons/icon-'+size+'.png')];
function crc32(bytes){let crc=0xffffffff;for(const byte of bytes){crc^=byte;for(let i=0;i<8;i++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}return (crc^0xffffffff)>>>0;}
const chunks=[],directory=[];let offset=0;
for(const file of files){
  const bytes=await fs.readFile(path.join(root,file)),name=Buffer.from(file),compressed=deflateRawSync(bytes,{level:9}),crc=crc32(bytes);
  const header=Buffer.alloc(30);header.writeUInt32LE(0x04034b50);header.writeUInt16LE(20,4);header.writeUInt16LE(0x800,6);header.writeUInt16LE(8,8);header.writeUInt16LE(33,12);header.writeUInt32LE(crc,14);header.writeUInt32LE(compressed.length,18);header.writeUInt32LE(bytes.length,22);header.writeUInt16LE(name.length,26);
  const central=Buffer.alloc(46);central.writeUInt32LE(0x02014b50);central.writeUInt16LE(20,4);central.writeUInt16LE(20,6);central.writeUInt16LE(0x800,8);central.writeUInt16LE(8,10);central.writeUInt16LE(33,14);central.writeUInt32LE(crc,16);central.writeUInt32LE(compressed.length,20);central.writeUInt32LE(bytes.length,24);central.writeUInt16LE(name.length,28);central.writeUInt32LE(offset,42);
  chunks.push(header,name,compressed);directory.push(central,name);offset+=header.length+name.length+compressed.length;
}
const central=Buffer.concat(directory),end=Buffer.alloc(22);end.writeUInt32LE(0x06054b50);end.writeUInt16LE(files.length,8);end.writeUInt16LE(files.length,10);end.writeUInt32LE(central.length,12);end.writeUInt32LE(offset,16);
const zip=Buffer.concat([...chunks,central,end]);const filename='ircc-response-inspector-v'+manifest.version+'.zip';
await fs.mkdir(path.join(root,'dist'),{recursive:true});await fs.writeFile(path.join(root,'dist',filename),zip);
await fs.writeFile(path.join(root,'dist',filename+'.sha256'),createHash('sha256').update(zip).digest('hex')+'  '+filename+'\n');
await fs.writeFile(path.join(root,'dist','runtime-files.json'),JSON.stringify(files,null,2)+'\n');
if(manifest.version_name?.includes('preview')){console.log('Built development preview '+filename+' ('+zip.length+' bytes). Native helper source is distributed separately under windows/.');process.exit(0);}
// A second explicit allowlist stages only reviewable public source and docs.
const source=[...files,'.github/workflows/release.yml','release-notes/v'+manifest.version+'.md','README.md','README.en.md','PRIVACY.md','PUBLISHING.md','SECURITY.md','QA-DESIGN.md','.gitignore','tests.mjs','comparison-tests.mjs','i18n-tests.mjs','privacy-tests.mjs','mail-tests.mjs','windows/install.ps1','windows/uninstall.ps1','windows/mail_host.py','windows/test_mail_host.py','windows/test-installer.ps1','icons/icon.svg','icons/render-icons.ps1','scripts/build-release.mjs'];
for(const file of source){const target=path.join(root,'public-upload',file);await fs.mkdir(path.dirname(target),{recursive:true});await fs.copyFile(path.join(root,file),target);}
await fs.mkdir(path.join(root,'public-upload','downloads'),{recursive:true});
await fs.copyFile(path.join(root,'dist',filename),path.join(root,'public-upload','downloads',filename));
await fs.copyFile(path.join(root,'dist',filename+'.sha256'),path.join(root,'public-upload','downloads',filename+'.sha256'));
console.log('Built '+filename+' ('+zip.length+' bytes, '+files.length+' runtime files).');
console.log('Public source staged from an explicit allowlist under public-upload/.');
