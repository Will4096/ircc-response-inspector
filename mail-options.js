(()=>{
  const $=id=>document.getElementById(id),say=(zh,en)=>I18n.language==='en'?en:zh;
  const status=$('mailStatus');let busy=false;
  const errors={
    'mail.config':['请选择邮箱类型并填写匹配的邮箱地址。','Choose a provider and enter a matching email address.'],
    'mail.client':['请填写有效的 Google OAuth Client ID。','Enter a valid Google OAuth Client ID.'],
    'mail.auth':['请重新授权 Gmail。','Authorize Gmail again.'],
    'mail.account':['授权的 Gmail 账号与配置不一致。','The authorized Gmail account does not match.'],
    'mail.permission':['请授予所需权限。','Grant the required optional permissions.'],
    'mail.helper':['未连接本机程序，请先运行 Windows 安装脚本。','Local helper unavailable. Run the Windows installer first.'],
    'mail.windows':['本机程序仅支持 Windows。','The local helper supports Windows only.'],
    'mail.network':['邮箱连接失败，请稍后重试。','Mailbox connection failed. Try again later.'],
    'mail.credentials':['邮箱授权码无效，或未开启 IMAP。','Invalid app password, or IMAP is disabled.'],
    'mail.secret':['请填写客户端授权码。','Enter the mailbox app password.']
    ,'mail.cleanup':['已断开。程序不可用，请运行 Windows 卸载脚本清除残留授权。','Disconnected. Run the Windows uninstaller to clear credentials left by the unavailable helper.']
  };
  const send=async message=>{const r=await chrome.runtime.sendMessage(message);if(r?.error)throw new Error(r.error);return r;};
  const config=()=>({enabled:$('mailEnabled').checked,provider:$('mailProvider').value,email:$('mailEmail').value,clientId:$('mailClientId').value});
  async function run(work){if(busy)return;busy=true;for(const b of document.querySelectorAll('[data-mail-button]'))b.disabled=true;status.textContent='';try{await work();status.textContent=say('已完成。','Done.');}catch(error){const pair=errors[error.message] || errors['mail.network'];status.textContent=pair[I18n.language==='en'?1:0];}finally{busy=false;for(const b of document.querySelectorAll('[data-mail-button]'))b.disabled=false;$('mailPassword').value='';}}
  function render(){const enabled=$('mailEnabled').checked;const gmail=$('mailProvider').value==='gmail';$('gmailSettings').hidden=!enabled || !gmail;$('neteaseSettings').hidden=!enabled || gmail;$('mailEmailRow').hidden=!enabled;}
  $('mailProvider').onchange=render;$('mailEnabled').onchange=()=>{render();if(!$('mailEnabled').checked)void run(()=>send({action:'mailSave',config:{enabled:false}}));};
  $('mailSave').onclick=()=>run(()=>send({action:'mailSave',config:config()}));
  $('mailAuthorize').onclick=()=>{
    // Permission requests occur synchronously in a deliberate user gesture.
    const permission=chrome.permissions.request({permissions:['identity'],origins:['https://gmail.googleapis.com/*']});
    void run(async()=>{if(!await permission)throw new Error('mail.permission');await send({action:'mailAuthorize',config:config()});await send({action:'mailSave',config:config()});});
  };
  $('mailSetup163').onclick=()=>{
    const permission=chrome.permissions.request({permissions:['nativeMessaging']});
    void run(async()=>{if(!await permission)throw new Error('mail.permission');await send({action:'mailSetup163',config:config(),password:$('mailPassword').value});await send({action:'mailSave',config:config()});});
  };
  $('mailHelperStatus').onclick=()=>{
    const permission=chrome.permissions.request({permissions:['nativeMessaging']});
    void run(async()=>{if(!await permission)throw new Error('mail.permission');await send({action:'mailHelperStatus'});});
  };
  $('mailDisconnect').onclick=()=>run(async()=>{const result=await send({action:'mailDisconnect'});$('mailEnabled').checked=false;render();if(!result.helperCleared)throw new Error('mail.cleanup');});
  async function load(){const info=await send({action:'mailSettings'});const c=info.config;$('mailEnabled').checked=!!c.enabled;$('mailProvider').value=c.provider || 'gmail';$('mailEmail').value=c.email || '';$('mailClientId').value=c.clientId || '';$('mailExtensionId').textContent=info.extensionId;$('mailRedirect').textContent=info.redirect;render();}
  void load().catch(()=>{});I18n.onChange(render);
  chrome.storage.onChanged.addListener((changes,area)=>{if(area==='local' && changes.mailAssist)void load().catch(()=>{});});
})();
