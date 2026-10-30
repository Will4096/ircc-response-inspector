const t=I18n.t,msg=I18n.message;
const message=document.getElementById('message'),automatic=document.getElementById('autoFill');
let messageSource='',generalSource='',busy=false;
function setMessage(source,tone='info'){messageSource=source || '';message.textContent=msg(messageSource);message.dataset.tone=tone;}
function general(source){generalSource=source;document.getElementById('generalStatus').textContent=t(source);}
document.getElementById('settingsVersion').textContent='v'+chrome.runtime.getManifest().version+' · '+t('开发预览');
chrome.storage.local.get('autoFill').then(data=>{automatic.checked=!!data.autoFill;}).catch(error=>setMessage(error.message,'error'));
automatic.onchange=async()=>{
  automatic.disabled=true;try{await chrome.storage.local.set({autoFill:automatic.checked});general('已保存');}catch(error){automatic.checked=!automatic.checked;setMessage(error.message,'error');}finally{automatic.disabled=false;}
};
document.getElementById('clearData').onclick=async()=>{
  if(busy || !confirm(t('清除所有本地申请资料、查询缓存及对比记录？已导出的文件不会删除。')))return;
  busy=true;const button=document.getElementById('clearData');button.disabled=true;
  try{const result=await chrome.runtime.sendMessage({action:'clearLocalData'});if(result?.error)throw new Error(result.error);automatic.checked=false;setMessage(result.helperCleared===false?'本地数据已清除。请运行 Windows 卸载脚本清除残留邮箱授权。':'本地数据已清除。','success');}
  catch(error){setMessage(error.message,'error');}finally{busy=false;button.disabled=false;}
};
chrome.storage.onChanged.addListener((changes,area)=>{if(area!=='local')return;if(changes.autoFill)automatic.checked=!!changes.autoFill.newValue;if(changes.uiLanguage)general('已保存');});
void I18n.init().catch(error=>setMessage(error.message,'error'));
I18n.onChange(()=>{general(generalSource);message.textContent=msg(messageSource);document.getElementById('settingsVersion').textContent='v'+chrome.runtime.getManifest().version+' · '+t('开发预览');for(const id of ['aboutHelp','mailSetupGuide'])document.getElementById(id).href=I18n.language==='en'?'MAIL-SETUP.en.md':'MAIL-SETUP.md';});
