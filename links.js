// Public destinations never receive profile data or saved authentication URLs.
document.getElementById('linksVersion').textContent='v'+chrome.runtime.getManifest().version;
void I18n.init();
const trackerEntry=document.getElementById('trackerLoginLink'),trackerStatus=document.getElementById('trackerLinkStatus');
let trackerEntryBusy=false,trackerEntryMessage='';
function trackerFeedback(message,tone='info'){trackerEntryMessage=message;trackerStatus.hidden=!message;trackerStatus.dataset.tone=tone;trackerStatus.textContent=I18n.t(message);}
trackerEntry.onclick=async()=>{
  if(trackerEntryBusy)return;trackerEntryBusy=true;trackerEntry.disabled=true;trackerFeedback('正在打开 Tracker…');
  try{
    const windowId=(await chrome.windows.getCurrent()).id;
    const result=await chrome.runtime.sendMessage({action:'openTrackerPage',windowId,resume:true});
    if(result?.error||!result||!result.ok&&!result.needsAccess)throw Error('Tracker unavailable');
    if(result.needsAccess){trackerFeedback('请在“查询进度”中识别当前登录页后继续。');navigateApp('popup.html');return;}
    trackerFeedback('已打开 Tracker 标签页，可返回“查询进度”继续。');
  }catch{trackerFeedback('无法打开 Tracker，请稍后重试。','error');}
  finally{trackerEntryBusy=false;trackerEntry.disabled=false;}
};
I18n.onChange(()=>{trackerStatus.textContent=I18n.t(trackerEntryMessage);});
