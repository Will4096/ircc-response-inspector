// PRIVACY.md is the bilingual policy source; keep the in-app copy identical.
import fs from 'node:fs/promises';
const root=new URL('../',import.meta.url),source=(await fs.readFile(new URL('PRIVACY.md',root),'utf8')).replace(/\r\n/g,'\n');
const escape=s=>s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const inline=s=>escape(s).replace(/https:\/\/[A-Za-z0-9./_?=&%-]+[A-Za-z0-9/]/g,url=>'<a href="'+url+'" target="_blank" rel="noopener noreferrer">'+url+'</a>');
const blocks=[],paragraph=[];
function flush(){if(paragraph.length){blocks.push('<p>'+inline(paragraph.join(' '))+'</p>');paragraph.length=0;}}
for(const line of source.trim().split('\n')){
 const heading=line.match(/^(#{1,3}) (.*)$/);
 if(heading){flush();blocks.push('<h'+heading[1].length+'>'+escape(heading[2])+'</h'+heading[1].length+'>');}
 else if(!line.trim())flush();else paragraph.push(line);
}
flush();const body=blocks.join('\n');
const html='<!doctype html>\n<html lang="en"><head><script src="layout.js"></script><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Privacy policy / 隐私政策</title><link rel="stylesheet" href="privacy.css"></head><body><main><p><a href="settings.html">← 返回设置 / Back to settings</a></p>\n'+body+'\n</main><script src="navigation.js"></script></body></html>\n';
if(process.argv.includes('--check')){if(await fs.readFile(new URL('privacy.html',root),'utf8')!==html)throw Error('Regenerate privacy.html: node scripts/build-privacy.mjs');}else await fs.writeFile(new URL('privacy.html',root),html);
