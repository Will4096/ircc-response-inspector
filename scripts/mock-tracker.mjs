// Development only. No proxy, external resources, real accounts or mailbox connections.
import http from 'node:http';
import fs from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
const root=new URL('../',import.meta.url);
const assets=new Set(['scanner.js','app.css','popup.css','layout.js','popup.html','options.html','settings.html','i18n.js','domain.js','ui-model.js','popup.js','options.js','settings.js','installer-ui.js','profiles.js','privacy-data.js','backup-core.js','backup-ui.js','mail-help.html','mail-help.en.html','mail-options.js','mail-popup.js','scripts/ui-fixtures.js','scripts/mock-checks.js']);
const wrap=body=>`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Local Tracker simulator</title><style>body{font:16px/1.6 system-ui;max-width:900px;margin:30px auto;padding:20px}label{display:block;margin:12px 0}input,select,button,a{padding:8px}aside{background:#fff3cd;padding:12px}li{margin:12px 0}</style><aside>本地模拟 · 虚构数据 · 非 IRCC 网站。请勿填写真实资料。测试码：123456</aside>${body}<script src="/scanner.js"></script></html>`;
export function createMockTracker(){return http.createServer(async(req,res)=>{
  const url=new URL(req.url,'http://localhost'),p=url.pathname;
  res.setHeader('Cache-Control','no-store');
  res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; connect-src 'self'; form-action 'self'; frame-src 'self'; object-src 'none'; base-uri 'none'");
  if(assets.has(p.slice(1))){
    const file=p.slice(1);let body=await fs.readFile(new URL(file,root),'utf8');
    if(file.endsWith('.html'))body=body.replace('<head>','<head><script src="/scripts/ui-fixtures.js"></script>');
    res.setHeader('Content-Type',file.endsWith('.css')?'text/css':file.endsWith('.html')?'text/html; charset=utf-8':'text/javascript; charset=utf-8');res.end(body);return;
  }
  res.setHeader('Content-Type','text/html; charset=utf-8');
  let body;
  if(p==='/')body='<h1>Tracker 本地测试台</h1><p>不访问 IRCC，不收集资料。刷新即可重置。</p><ul><li><a href="/2/ast">完整模拟流程</a></li><li><a href="/checks">自动化浏览器检查</a></li><li><a href="/popup.html?stage=verification">中文弹窗</a> · <a href="/popup.html?stage=verification&lang=en">English popup</a></li><li><a href="/2/ast-otp-verification?expired=1">会话过期</a></li></ul>';
  else if(p==='/2/ast')body='<h1>Sign in (simulation)</h1><p>No credentials required.</p><a href="/2/ast-search">Continue with synthetic account</a>';
  else if(p==='/2/ast-search')body='<h1>Find your application</h1><form action="/2/ast-otp-verification">'+[['surname','Surname / Last name'],['givenName','Given name'],['uci','Unique client identifier (UCI)'],['applicationNumber','Application number'],['dateOfBirthYear','Year'],['dateOfBirthDay','Day']].map(([id,label])=>`<label>${label}<input id="${id}" required></label>`).join('')+'<label>Month<select id="dateOfBirthMonth"><option>January</option></select></label><label>Country of birth<select id="countryOfBirth"><option>China</option></select></label><button>Submit</button></form>';
  else if(p==='/2/ast-otp-verification')body=url.searchParams.has('expired')?'<h1>Session expired</h1><a href="/2/ast">Sign in again</a>':'<h1>Email verification</h1><form id="otp"><label>Verification code<input id="verificationCode" inputmode="numeric" maxlength="6" required></label><button>Verify</button><p id="error" role="alert"></p></form><script>document.querySelector("form").onsubmit=e=>{e.preventDefault();if(document.querySelector("input").value==="123456")location.href="/2/ast-details";else document.querySelector("#error").textContent="The verification code you entered does not match the code we sent you. You have 4 attempts."}</script>';
  else if(p==='/2/ast-details')body='<h1>Example application</h1><p>Application number: DEMO0001</p><h2>Application status: In Progress</h2>'+['A','B'].map((n,i)=>`<section>Applicant ${n} ${i?'DEP':'PA'} <button id="viewApplicant${i+1}" onclick="location.href='/2/ast-view-application?relation_id=${i+1}'">View</button></section>`).join('');
  else if(p==='/2/ast-view-application')body=`<h1>Applicant ${url.searchParams.get('relation_id')==='2'?'B':'A'}</h1>`+['Biometrics: Completed','Medical exam: Completed','Eligibility: Completed','Background check: In Progress'].map((v,i)=>`<p><button id="help_accordion${i}">${v}</button></p>`).join('')+'<h2>Pending actions to complete 0</h2><a href="/2/ast-history?relation_id='+ (url.searchParams.get('relation_id')==='2'?'2':'1')+'">History</a>';
  else if(p==='/2/ast-history')body='<h1>History</h1><ul><li><h3>Application received</h3>January 1, 2026</li></ul><button id="more" onclick="this.previousElementSibling.insertAdjacentHTML(\'beforeend\',\'<li><h3>Eligibility completed</h3>February 1, 2026</li>\');this.remove()">View more</button>';
  else if(p==='/checks')body='<h1>Automated local checks</h1><pre id="report" style="max-height:180px;overflow:auto">RUNNING</pre><script src="/scripts/mock-checks.js"></script>';
  else {res.writeHead(404);res.end('Not found');return;}
  res.end(wrap(body));
});}
if(process.argv[1]===fileURLToPath(import.meta.url))createMockTracker().listen(8788,'127.0.0.1',()=>console.log('Local simulator: http://127.0.0.1:8788 — synthetic data only; Ctrl+C to stop'));
