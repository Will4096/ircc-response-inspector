// Isolated visual QA. Uses synthetic profiles and a mock Chrome API, never a user's extension data.
import http from 'node:http';
import fs from 'node:fs/promises';
const root=new URL('../',import.meta.url);
const allowed=new Set(['layout.js','navigation.js','workspace.html','workspace.js','popup.html','options.html','settings.html','app.css','popup.css','i18n.js','domain.js','ui-model.js','popup.js','options.js','settings.js','installer-ui.js','profiles.js','privacy-data.js','privacy.html','privacy.css','backup-core.js','backup-ui.js','mail-help.html','mail-help.en.html','mail-options.js','mail-popup.js','scripts/ui-fixtures.js','scripts/responsive-preview.html']);
http.createServer(async(request,response)=>{
  const file=new URL(request.url,'http://127.0.0.1').pathname.slice(1) || 'settings.html';
  if(!allowed.has(file)){response.writeHead(404);response.end('Not found');return;}
  try{let body=await fs.readFile(new URL(file,root),'utf8');
    if(file.endsWith('.html'))body=body.replace('<head>','<head><script src="/scripts/ui-fixtures.js"></script>');
    response.setHeader('Content-Type',file.endsWith('.html')?'text/html; charset=utf-8':file.endsWith('.css')?'text/css; charset=utf-8':'text/javascript; charset=utf-8');response.setHeader('Cache-Control','no-store');response.end(body);
  }catch{response.writeHead(500);response.end('Preview error');}
}).listen(8787,'127.0.0.1',()=>console.log('Synthetic UI preview: http://127.0.0.1:8787/settings.html (lang=en, empty=1, stage=verification, mail=connected|reauth|error)'));
