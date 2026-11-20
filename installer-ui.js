// Bundled, hash-verified helper installation; downloading never executes it.
(()=>{
  const hash='bfe2d5932d0831df7a5a639f4bef6d36fb7c2498c42bfd51d1b8b4ce1680ffe6';
  const filename='IRCCMailSetup-1.6.ps1';
  const command=document.getElementById('installerCommand'),copy=document.getElementById('installerCopy'),feedback=document.getElementById('installerFeedback');
  if(!command||!copy)return;
  const card=document.getElementById('mailHelperDetails'),guide=document.getElementById('mailInstallHelp'),toggle=document.getElementById('mailSetupGuide');
  const entry=document.getElementById('installerDownload');
  const download=document.getElementById('installerFileDownload')||document.createElement('button');
  if(!download.id){download.id='installerFileDownload';download.type='button';copy.before(download);}
  let progress='',downloadRequested=false;
  const english=()=>globalThis.I18n?I18n.language==='en':document.documentElement.lang==='en';
  function paint(){
    const valid=/^[a-p]{32}$/.test(globalThis.chrome?.runtime?.id||'');
    const expanded=!!guide&&!guide.hidden,ready=card?.dataset.ready==='true';
    download.textContent=english()?'Download installer script':'下载安装脚本';
    if(entry)entry.classList.toggle('primary',!expanded&&!ready);
    download.classList.toggle('primary',!downloadRequested&&(!guide||expanded));
    copy.classList.toggle('primary',downloadRequested&&(!guide||expanded));
    copy.disabled=!valid||card?.dataset.busy==='true';
    download.disabled=!valid||card?.dataset.busy==='true';
    if(toggle){toggle.textContent=english()?(expanded?'Hide steps':'View steps'):(expanded?'收起操作步骤':'查看操作步骤');toggle.setAttribute('aria-expanded',String(expanded));}
    const messages={download:english()?'Download requested. Save the file, then copy and run the command in PowerShell.':'已请求下载。保存文件后，复制命令并在 PowerShell 中运行。',copied:english()?'Copied. Run in PowerShell, select the saved installer, then return to check the helper.':'已复制。请在 PowerShell 中运行，选择已保存的安装脚本，完成后回来检查。',error:english()?'Copy failed. Expand the command below and copy it manually.':'复制失败。请展开下方命令并手动复制。'};
    feedback.textContent=messages[progress]||'';
  }
  function render(){
    const id=globalThis.chrome?.runtime?.id;
    if(!/^[a-p]{32}$/.test(id||'')){command.textContent=english()?'Open from the installed extension to generate the command.':'请从已安装的扩展打开以生成安装命令。';paint();return;}
    command.textContent=HelperInstaller.command(hash,id);
    paint();
  }
  function showSteps(event){event.preventDefault();event.stopPropagation();progress='';if(guide)guide.hidden=false;paint();}
  if(entry)entry.onclick=showSteps;
  if(toggle)toggle.onclick=event=>{event.preventDefault();event.stopPropagation();progress='';guide.hidden=!guide.hidden;paint();};
  download.onclick=event=>{
    event.preventDefault();event.stopPropagation();
    if(event.currentTarget!==download||download.disabled)return;
    const link=document.createElement('a');link.href=chrome.runtime.getURL('windows/install-one-click.ps1');link.download=filename;link.click();
    downloadRequested=true;progress='download';if(guide)guide.hidden=false;paint();
  };
  copy.onclick=async()=>{
    try{await navigator.clipboard.writeText(command.textContent);progress='copied';}
    catch{progress='error';const details=command.closest('details');if(details)details.open=true;}
    paint();
  };
  window.addEventListener('helperStateChanged',paint);globalThis.I18n?.onChange(render);render();
})();
