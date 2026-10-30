import {createMockTracker} from './mock-tracker.mjs';
import {spawn} from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
const chrome=process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const server=createMockTracker();await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const base='http://127.0.0.1:'+server.address().port;
await fs.mkdir(new URL('../dist/',import.meta.url),{recursive:true});
const profile=await fs.mkdtemp(new URL('../dist/mock-chrome-',import.meta.url));
try{
  // Fresh isolated profile; never attach to an existing Chrome/work/personal window.
  const args=['--headless=new','--no-first-run','--disable-background-networking','--disable-component-update','--disable-sync','--no-proxy-server','--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE 127.0.0.1','--user-data-dir='+profile,'--window-size=1000,900','--virtual-time-budget=15000','--screenshot='+path.resolve('dist/mock-checks.png'),'--dump-dom',base+'/checks'];
  const output=await new Promise((resolve,reject)=>{let text='',errors='';const child=spawn(chrome,args,{windowsHide:true});const timer=setTimeout(()=>{child.kill();reject(Error('Browser checks timed out'));},45000);child.stdout.on('data',chunk=>text+=chunk);child.stderr.on('data',chunk=>errors+=chunk);child.on('error',reject);child.on('close',()=>{clearTimeout(timer);resolve(text||('Browser did not return DOM: '+errors.slice(-1800)));});});
  const report=output.match(/<pre id="report"[^>]*>([\s\S]*?)<\/pre>/)?.[1] || output.slice(-1800);
  await fs.writeFile(new URL('../dist/mock-check-results.txt',import.meta.url),report+'\n');
  console.log(report);if(!report.startsWith('ALL PASSED'))process.exitCode=1;
}finally{await new Promise(resolve=>server.close(resolve));/* Chrome's temporary profile remains in ignored dist/ for diagnosis. */}
