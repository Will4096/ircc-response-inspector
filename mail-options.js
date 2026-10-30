(()=>{
  const $=id=>document.getElementById(id),t=I18n.t;
  let stored={enabled:false},connection={},initializing=true,busy=false,editingConnection=false,editingPassword=false,noticeKey='',noticeTone='info',revision=0,helperKey='尚未检查';
  const errors={'mail.config':'请选择邮箱类型并填写匹配的邮箱地址。','mail.client':'请先完成 Gmail 开发配置。','mail.auth':'Gmail 授权未完成或已失效，请重新连接。','mail.account':'授权的 Gmail 账号与配置不一致。','mail.permission':'未授予所需权限，仍可手动输入验证码。','mail.helper':'本机程序未连接，请查看安装帮助。','mail.windows':'本机程序仅支持 Windows。','mail.network':'邮箱连接失败，请检查网络后重试。','mail.credentials':'连接未通过，请检查客户端授权码和 IMAP 设置。','mail.secret':'请填写 163 客户端授权码。'};
  const send=async message=>{const result=await chrome.runtime.sendMessage(message);if(result?.error)throw new Error(result.error);return result;};
  const draft=()=>({enabled:$('mailEnabled').checked,provider:$('mailProvider').value,email:$('mailEmail').value.trim().toLowerCase(),clientId:$('mailProvider').value==='gmail'?$('mailClientId').value.trim():''});
  const clientValid=()=>/^[a-zA-Z0-9-]+\.apps\.googleusercontent\.com$/.test($('mailClientId').value.trim());
  const hasSaved=()=>!!connection.verifiedAt&&!!stored.email;
  const credentialSaved=()=>hasSaved()&&connection.configured===true&&stored.provider==='163'&&draft().provider==='163'&&draft().email===stored.email;
  function notice(key,tone='info'){noticeKey=key;noticeTone=tone;$('mailStatus').textContent=t(key);$('mailStatus').dataset.tone=tone;}
  function render(){
    const value=draft(),gmail=value.provider==='gmail',state=UIModel.mail(stored,connection,{...value,hasPassword:!!$('mailPassword').value});
    $('mailState').textContent=t(initializing?'正在加载…':state.label);$('mailState').dataset.state=state.state;$('mailStateHelp').textContent=t(state.help);
    $('mailConfig').hidden=!value.enabled&&!hasSaved();$('gmailSettings').hidden=!gmail;$('neteaseSettings').hidden=gmail;
    const saved=credentialSaved(),locked=hasSaved()&&!editingConnection;
    $('mailPassword').placeholder=saved&&!editingPassword?'••••••••':'';
    $('mailPassword').readOnly=!value.enabled||(saved&&!editingPassword);
    $('mailCredentialState').hidden=!saved||editingPassword;
    $('mailPasswordHelp').textContent=t(saved&&!editingPassword?'授权码已加密保存在本机，不读取或显示原文。':'请输入 163 客户端授权码，不是网页登录密码。');
    $('mailEditPassword').hidden=!saved||editingPassword||!value.enabled;
    $('mailEditConnection').hidden=!hasSaved()||editingConnection||!value.enabled;
    $('mailCancelEdit').hidden=!editingConnection&&!editingPassword;
    $('mailEmail').readOnly=locked||!value.enabled;$('mailClientId').readOnly=locked||!value.enabled;
    $('mailVerifiedAt').hidden=!hasSaved();if(hasSaved())$('mailVerifiedAt').textContent=t('上次验证：')+I18n.date(connection.verifiedAt);
    if(!value.enabled&&hasSaved())$('mailStateHelp').textContent=t('邮箱辅助已关闭，连接信息仍保留。');
    $('gmailSetupHint').hidden=clientValid();$('mailHelperState').textContent=t(helperKey);
    $('mailConnect').hidden=!value.enabled||(state.state==='connected'&&!editingPassword&&!editingConnection&&!$('mailPassword').value);
    $('mailConnect').textContent=t(busy?'正在连接…':gmail?clientValid()?(state.state==='reauth'?'重新授权 Gmail':'连接 Gmail 并启用'):'配置 Gmail 连接':state.state==='error'?'重新验证连接':connection.verifiedAt && stored.email===value.email && stored.provider==='163' && !$('mailPassword').value?'启用邮箱辅助':'验证连接并启用');
    $('mailDisconnectArea').hidden=!connection.verifiedAt && !stored.enabled;
    if(!busy&&(editingConnection||editingPassword))$('mailConnect').textContent=t('验证并保存更改');
    for(const id of ['mailEnabled','mailProvider','mailEmail','mailClientId','mailPassword','mailConnect','mailHelperStatus','mailDisconnect','mailEditConnection','mailEditPassword','mailCancelEdit'])$(id).disabled=busy||initializing;
    $('mailProvider').disabled=busy||initializing||locked||!value.enabled;
    if(!gmail&&connection.helperReady!==true)$('mailConnect').hidden=true;
    $('mailStatus').textContent=t(noticeKey);$('mailStatus').dataset.tone=noticeTone;
  }
  async function load(keepDraft=false){
    const current=++revision,info=await send({action:'mailSettings'});if(current!==revision)return;
    stored=info.config;connection={helperReady:connection.helperReady,...(info.connection || {})};
    initializing=false;
    if(!keepDraft){$('mailEnabled').checked=!!stored.enabled;$('mailProvider').value=stored.provider || '163';$('mailEmail').value=stored.email || '';$('mailClientId').value=stored.clientId || '';$('mailPassword').value='';editingConnection=false;editingPassword=false;$('mailHelperDetails').open=$('mailEnabled').checked&&connection.helperReady!==true;}
    $('mailExtensionId').textContent=info.extensionId;$('mailRedirect').textContent=info.redirect;
    helperKey=connection.helperReady===true?(hasSaved()?'按需启动':'本机程序可用'):connection.helperReady===false?'本机程序未连接':'尚未检查';render();
  }
  async function run(work,progress,success,rollback=false,keepDraft=false){
    if(busy)return;busy=true;notice(progress,'busy');render();
    try{await work();await load(keepDraft);notice(success,'success');}
    catch(error){if(error.message==='mail.helper'){connection.helperReady=false;document.getElementById('mailInstallHelp').open=true;}helperKey=connection.helperReady===true?'本机程序可用':connection.helperReady===false?'本机程序未连接':'尚未检查';if(rollback)try{await load();}catch{}notice(errors[error.message] || errors['mail.network'],'error');}
    finally{busy=false;render();}
  }
  function validate(value){
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.email) || (value.provider==='163' && !/^[^@]+@163\.com$/.test(value.email))){$('mailEmail').focus();throw new Error('mail.config');}
  }
  $('mailEnabled').onchange=()=>{
    if($('mailEnabled').checked){$('mailHelperDetails').open=connection.helperReady!==true;notice('');render();return;}
    const value={...stored,enabled:false};
    return run(async()=>{await send({action:'mailSave',config:value});$('mailPassword').value='';},'正在关闭邮箱辅助…','邮箱辅助已关闭。',true);
  };
  for(const id of ['mailProvider','mailEmail','mailClientId','mailPassword'])$(id).addEventListener(id==='mailProvider'?'change':'input',()=>{if(id==='mailProvider'){$('mailPassword').value='';editingPassword=false;}notice('');render();});
  $('mailEditConnection').onclick=()=>{editingConnection=true;notice('');render();$('mailEmail').focus();};
  $('mailEditPassword').onclick=()=>{editingPassword=true;notice('');render();$('mailPassword').focus();};
  $('mailCancelEdit').onclick=()=>{editingConnection=false;editingPassword=false;$('mailPassword').value='';$('mailProvider').value=stored.provider||'163';$('mailEmail').value=stored.email||'';$('mailClientId').value=stored.clientId||'';notice('');render();};
  $('mailConnect').onclick=()=>{
    if(busy)return;const value=draft();
    if(value.provider==='gmail' && !clientValid()){$('mailAdvanced').open=true;$('mailClientId').focus();notice('请先完成 Gmail 开发配置。');return;}
    try{validate(value);if(value.provider==='163' && !$('mailPassword').value && (!credentialSaved()||editingPassword)){$('mailPassword').focus();throw new Error('mail.secret');}}
    catch(error){notice(errors[error.message],'error');return;}
    const permission=chrome.permissions.request(value.provider==='gmail'?{permissions:['identity'],origins:['https://gmail.googleapis.com/*']}:{permissions:['nativeMessaging']});
    return run(async()=>{
      if(!await permission)throw new Error('mail.permission');
      if(value.provider==='gmail')await send({action:'mailAuthorize',config:value});
      else if($('mailPassword').value)await send({action:'mailSetup163',config:value,password:$('mailPassword').value});
      else await send({action:'mailTest163',config:value});
      await send({action:'mailSave',config:value});$('mailPassword').value='';
    },value.provider==='gmail'?'等待 Gmail 授权…':'正在验证 163 连接…','邮箱已连接，辅助取码已开启。');
  };
  $('mailHelperStatus').onclick=()=>{
    if(busy)return;const permission=chrome.permissions.request({permissions:['nativeMessaging']});
    helperKey='正在检查本机程序…';
    return run(async()=>{if(!await permission)throw new Error('mail.permission');const result=await send({action:'mailHelperStatus'});connection.helperReady=true;connection.configured=!!result.configured;helperKey='本机程序可用';},'正在检查本机程序…','本机程序可用，可以继续连接邮箱。',false,true);
  };
  $('mailDisconnect').onclick=()=>void run(async()=>{
    const result=await send({action:'mailDisconnect'});$('mailPassword').value='';
    if(!result.helperCleared){await load();throw new Error('mail.helper');}
  },'正在移除本地连接…','本地邮箱连接已移除。');
  chrome.storage.onChanged.addListener((changes,area)=>{
    if(area==='local' && (changes.mailAssist || changes.mailConnection) && !busy){noticeKey='';noticeTone='info';void load(!changes.mailAssist||!!changes.mailAssist.newValue&&(editingConnection||editingPassword||!!$('mailPassword').value)).catch(()=>notice('无法读取邮箱设置，请刷新后重试。','error'));}
  });
  $('mailExtensionId').textContent=chrome.runtime.id || '';
  I18n.onChange(render);render();void load().catch(()=>notice('无法读取邮箱设置，请刷新后重试。','error'));
})();
