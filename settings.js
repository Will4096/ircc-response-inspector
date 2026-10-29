const t=I18n.t,msg=I18n.message;
const message=document.getElementById('message'),automatic=document.getElementById('autoFill');
let messageSource='';
function setMessage(source){messageSource=source || '';message.textContent=msg(messageSource);}
chrome.storage.local.get('autoFill').then(data=>{automatic.checked=!!data.autoFill;}).catch(error=>setMessage(error.message));
automatic.onchange=async()=>{
  try{await chrome.storage.local.set({autoFill:automatic.checked});setMessage('已保存');}catch(error){setMessage(error.message);}
};
document.getElementById('clearData').onclick=async()=>{
  if(!confirm(t('清除所有本地申请资料、查询缓存及对比记录？已导出的文件不会删除。')))return;
  try{
    const result=await chrome.runtime.sendMessage({action:'clearLocalData'});
    if(result?.error)throw new Error(result.error);
    automatic.checked=false;
    setMessage(result.helperCleared===false?'本地数据已清除。请运行 Windows 卸载脚本清除残留邮箱授权。':'本地数据已清除。');
  }catch(error){setMessage(error.message);}
};
chrome.storage.onChanged.addListener((changes,area)=>{if(area==='local' && changes.autoFill)automatic.checked=!!changes.autoFill.newValue;});
void I18n.init().catch(error=>setMessage(error.message));
I18n.onChange(()=>setMessage(messageSource));
