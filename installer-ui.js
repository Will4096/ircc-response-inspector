// Fixed version + digest: never execute a moving branch or pipe a download to Invoke-Expression.
(()=>{
  const commit='2a1bb3ca438e204d7089282bc593666a34c6b168';
  const hash='d9fd520cf4af3f341c20d4c2906fa75c1dedb7046c92622172b7c31c207cb079';
  const url='https://raw.githubusercontent.com/Will4096/ircc-response-inspector/'+commit+'/windows/install-one-click.ps1';
  const command=document.getElementById('installerCommand'),copy=document.getElementById('installerCopy'),feedback=document.getElementById('installerFeedback');
  if(!command||!copy)return;
  const english=()=>globalThis.I18n?I18n.language==='en':document.documentElement.lang==='en';
  function render(){
    const id=globalThis.chrome?.runtime?.id;
    if(!/^[a-p]{32}$/.test(id || '')){command.textContent=english()?'Open this help from the installed extension to generate your command.':'请从已安装的扩展设置打开，以生成专属安装命令。';copy.disabled=true;return;}
    command.textContent="$irccSetup=Join-Path $env:TEMP 'IRCCMailSetup-"+hash.slice(0,12)+".ps1'; [Net.ServicePointManager]::SecurityProtocol=[Net.ServicePointManager]::SecurityProtocol -bor 3072; Invoke-WebRequest -UseBasicParsing -Uri '"+url+"' -OutFile $irccSetup; if ((Get-FileHash -LiteralPath $irccSetup -Algorithm SHA256).Hash -ne '"+hash+"') { throw 'Installer verification failed' }; & $irccSetup -ExtensionId '"+id+"'";
    copy.disabled=false;feedback.textContent='';
  }
  copy.onclick=async()=>{try{await navigator.clipboard.writeText(command.textContent);feedback.textContent=english()?'Copied. Paste into PowerShell and press Enter.':'已复制。在 PowerShell 中粘贴并按回车即可。';}catch{feedback.textContent=english()?'Select and copy the command above.':'请选中上方命令并复制。';}};
  globalThis.I18n?.onChange(render);render();
})();
