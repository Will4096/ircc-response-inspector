// One UI-level probe per visible workspace; embedded views share the host notice.
(()=>{
  if(new URLSearchParams(location.search).get('embedded')==='1')return;
  const header=document.querySelector('.app-header');if(!header)return;
  const box=document.createElement('aside');box.id='helperHealthNotice';box.className='helper-health-notice';box.hidden=true;box.setAttribute('role','status');box.setAttribute('aria-live','polite');header.after(box);
  let current=null,busy=false,sequence=0,eligible=false;
  const say=(zh,en)=>I18n.language==='en'?en:zh;
  function openSettings(){
    if(document.getElementById('workspaceViews'))window.dispatchEvent(new CustomEvent('ircc-open-helper-settings'));
    else if(typeof navigateApp==='function')navigateApp('settings.html#mailHelperDetails');
  }
  function render(){
    box.replaceChildren();
    const messages={upgrade:[say('本机程序需要升级','Local helper update required'),say('当前版本：','Current version: ')+(current?.version||'—')+say('，需要兼容版本 ','; requires compatible version ')+(current?.required||'1.6'),say('前往升级','Update in settings')],missing:[say('未找到本机程序','Local helper not found'),say('邮箱自动取码暂不可用，仍可手动输入验证码。','Email retrieval is unavailable; manual code entry remains available.'),say('前往安装','Install in settings')],unavailable:[say('暂时无法连接本机程序','Cannot reach the local helper'),say('无法确认程序是否可用，请重试或检查设置。','Availability could not be confirmed. Retry or check settings.'),say('查看设置','View settings')],permission:[say('本机程序需要完成设置','Local helper setup required'),say('需要你授权本机通信后才能检查。','Allow native communication in settings before checking.'),say('前往设置','Open settings')],unsupported:[say('163 本机程序仅支持 Windows','The 163 helper requires Windows'),say('仍可手动输入验证码。','Manual code entry remains available.'),say('查看设置','View settings')]};
    const content=messages[current?.status];box.hidden=!content;if(!content)return;
    box.dataset.state=current.status;
    const text=document.createElement('div'),title=document.createElement('strong'),detail=document.createElement('p');title.textContent=content[0];detail.textContent=content[1];detail.className='help';text.append(title,detail);
    const actions=document.createElement('div');actions.className='action-row';const settings=document.createElement('button');settings.type='button';settings.textContent=content[2];settings.onclick=openSettings;actions.append(settings);
    if(current.status==='unavailable'){const retry=document.createElement('button');retry.type='button';retry.textContent=say('重试','Retry');retry.disabled=busy;retry.onclick=()=>void refresh(true);actions.prepend(retry);}
    box.append(text,actions);
  }
  async function refresh(force=false){
    if(busy||document.visibilityState==='hidden')return;busy=true;const run=++sequence;render();
    try{const config=(await chrome.storage.local.get('mailAssist')).mailAssist;if(run!==sequence)return;eligible=!!config?.enabled&&config.provider==='163';if(!eligible){current={status:'off'};return;}const result=await chrome.runtime.sendMessage({action:'mailHealth',force});if(run===sequence)current=result?.error?{status:'unavailable'}:result;}
    catch{if(run===sequence)current={status:'unavailable'};}
    finally{if(run===sequence){busy=false;render();}}
  }
  function eligibilityChanged(){sequence++;busy=false;eligible=false;current=null;render();void refresh();}
  chrome.storage.onChanged.addListener((changes,area)=>{
    if(area==='local'&&changes.mailAssist)eligibilityChanged();
    if(eligible&&area==='session'&&changes['mail:health']?.newValue){current=changes['mail:health'].newValue;render();}
  });
  window.addEventListener('focus',()=>void refresh());
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState!=='hidden')void refresh();});
  window.addEventListener('message',event=>{
    if(event.origin===location.origin&&event.data?.type==='ircc-helper-health-refresh'&&[...document.querySelectorAll('iframe')].some(frame=>frame.contentWindow===event.source))void refresh();
  });
  window.addEventListener('helperHealthRefresh',()=>void refresh());
  I18n.onChange(render);void refresh();
  setInterval(()=>void refresh(),300000);
})();
