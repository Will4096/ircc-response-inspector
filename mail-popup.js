// Verification assistance is contextual; configuration stays on the settings page.
(()=>{
  const box=document.createElement('div');box.id='mailAssistStatus';box.hidden=true;
  box.setAttribute('role','status');box.setAttribute('aria-live','polite');
  document.getElementById('verifyForm').after(box);let signature='',busy=false,sending=false;
  const say=(zh,en)=>I18n.language==='en'?en:zh;
  const labels={
    expired:['自动收码等待已结束','Automatic retrieval wait ended','已停止检查邮箱，这不代表验证码已过期。可粘贴已收到的验证码；也可返回 Tracker 重新查询。','Mailbox checks have stopped; this does not mean the code has expired. Paste the code you received, or restart the Tracker query.'],
    requesting:['已记录提交，等待 Tracker 验证页面','Submission recorded · waiting for Tracker','Tracker 正在处理本次提交，进入验证码页后再检查邮箱。','Tracker is processing this submission. Email checking starts on the verification page.'],
    unbound:['本次查询未在自动收码中','Automatic code retrieval is not active for this query','如需自动获取，请返回 Tracker 重新提交查询；已收到验证码可直接粘贴，无需重新查询。','To start automatic retrieval, return to Tracker and submit the query again. If you already have the code, paste it here without restarting.'],
    waiting:['正在等待验证邮件','Waiting for verification email','仍可直接粘贴验证码，无需等待自动获取。','You can paste the code now without waiting for assistance.'],
    'mail.auth':['Gmail 需要重新授权','Gmail authorization needed','前往设置重新连接，或继续手动输入。','Reconnect in settings, or enter the code manually.'],
    'mail.helper':['本机程序未连接','Local helper unavailable','前往设置检查本机程序，或继续手动输入。','Check the helper in settings, or enter the code manually.'],
    'mail.version':['本机程序需要更新','Local helper update required','本机程序版本不兼容，请在设置中更新。仍可手动输入验证码。','The helper version is incompatible. Update it in settings, or enter the code manually.'],
    'mail.credentials':['邮箱连接需要检查','Check mailbox connection','前往设置检查授权码和 IMAP，手动输入不受影响。','Check your app password and IMAP in settings. Manual entry is unaffected.'],
    'mail.network':['暂时无法连接邮箱','Mailbox temporarily unavailable','请稍后重试，也可直接手动输入验证码。','Try again later, or enter the code manually.']
  };
  function node(tag,text,parent=box){const e=document.createElement(tag);if(text)e.textContent=text;parent.append(e);return e;}
  async function tick(){
    if(typeof workspaceVisible!=='undefined'&&!workspaceVisible)return;
    if(busy || sending || typeof targetTabId==='undefined' || !targetTabId)return;
    if(currentContext.stage!=='verification' || currentContext.observerReady===false || displayedCapture?.active){box.hidden=true;signature='';return;}
    busy=true;
    try{
      if(!signature){box.hidden=false;box.replaceChildren();const title=node('strong',say('正在检查邮箱辅助…','Checking email assistance…'));title.className='mail-loading';}
      const data=await send('mailPoll');
      if(data.profileId && data.profileId!==document.getElementById('application').value){box.hidden=true;signature='';return;}
      const key=JSON.stringify([data,I18n.language]);if(key===signature)return;signature=key;
      box.replaceChildren();box.hidden=data.status==='off';if(box.hidden)return;
      if(data.status!=='candidates'){
        const text=labels[data.status] || labels['mail.network'];
        const heading=node('strong',text[I18n.language==='en'?1:0]);if(['waiting','requesting'].includes(data.status))heading.className='mail-loading';node('p',text[I18n.language==='en'?3:2]);
        if(data.status==='waiting'&&data.checkedAt)node('small',say('上次检查：','Last checked: ')+I18n.date(data.checkedAt));
        if(data.status==='waiting'&&data.diagnostic){
          const reasons={sender:['发件人不匹配','Sender not matched'],time:['收信时间不匹配','Receipt time not matched'],recipient:['收件人不匹配','Recipient not matched'],purpose:['未确认 Tracker 验证用途','Tracker verification purpose unconfirmed'],digits:['验证码缺失或存在多个数字','Missing code or ambiguous numbers'],excluded:['候选码已忽略或已尝试','Candidate ignored or already attempted']};
          const detail=node('details');node('summary',say('邮箱检查详情','Email check details'),detail);
          node('p',data.diagnostic.checked?say('已检查近期邮件，但尚未匹配本次验证码。','Recent messages checked; no matching code yet.'):say('邮箱服务未返回符合本次时间及发件人范围的邮件。','The mailbox service returned no messages in this request’s time and sender range.'),detail);
          for(const [reason,count] of Object.entries(data.diagnostic.rejected||{}))if(reasons[reason])node('p',say(...reasons[reason])+' · '+count,detail);
        }
        if(['unbound','expired'].includes(data.status)){const restart=node('button',say('重新开始自动收码','Restart automatic code retrieval'));restart.type='button';restart.onclick=async()=>{try{await chrome.tabs.update(targetTabId,{active:true,url:'https://ircc-services.canada.ca/2/ast-search'});}catch{setOutput('验证未完成，请检查验证码后重试。');}};}
        if(data.status.startsWith('mail.')){const link=node('button',say('前往设置','Open settings'));link.type='button';link.onclick=()=>navigateApp('settings.html#mailHeading');}
        if(data.status==='mail.version')node('small',say('浏览器收到的版本：','Version received by browser: ')+(data.helper?.version||say('未提供','not supplied'))+say('；协议：','; protocol: ')+(data.helper?.protocol??say('未提供','not supplied'))+say('。要求：1.2 或更高的 1.x，协议 1。','Required: 1.x version 1.2 or later, protocol 1.'));
        return;
      }
      node('strong',say('核对邮箱验证码','Review email verification code'));
      node('p',say('目标申请：','Target profile: ')+(document.getElementById('application').selectedOptions[0]?.textContent || ''));
      let chosen=data.candidates.length===1?data.candidates[0]:null;
      if(!chosen)node('p',say('找到多个候选，请选择与本次请求匹配的一项。','Multiple candidates found. Choose the one matching this request.'));
      const confirm=document.createElement('button');confirm.type='button';confirm.className='primary';confirm.textContent=say('验证并查询','Verify and check');confirm.disabled=!chosen;
      for(const c of data.candidates){
        const row=node('div');row.className='mail-candidate';
        if(data.candidates.length>1){const label=node('label',undefined,row),radio=document.createElement('input');radio.type='radio';radio.name='mailCandidate';radio.style.marginRight='8px';radio.onchange=()=>{chosen=c;confirm.disabled=false;};label.append(radio);node('code',c.code,label);}
        else node('code',c.code,row);
        node('small',c.purpose==='TrackerAccountConfirmation'?say('邮件类型：IRCC 账号确认（Tracker 使用的通用模板）','Message type: IRCC account confirmation (shared Tracker template)'):say('用途：Tracker 查询验证','Purpose: Tracker verification'),row);
        node('small',say('收信时间：','Received: ')+I18n.date(c.receivedAt),row);
      }
      node('p',say('请确认目标申请和邮件用途，再提交验证码。','Confirm the target profile and message purpose before submitting.'));
      box.append(confirm);
      confirm.onclick=async()=>{
        if(!chosen || sending)return;sending=true;verificationBusy=true;for(const b of box.querySelectorAll('button,input'))b.disabled=true;
        document.getElementById('code').value='';renderContext(currentContext,displayedCapture || {});
        try{await send('mailConfirm',{requestId:data.requestId,candidateId:chosen.id});}
        catch{setOutput('验证未完成，请检查验证码后重试。');}
        finally{sending=false;verificationBusy=false;signature='';lastSnapshot='';await refreshCapture().catch(()=>{});void tick();}
      };
      const ignore=node('button',say('忽略本次候选','Ignore candidates'));ignore.type='button';ignore.onclick=async()=>{if(sending)return;try{await send('mailIgnore',{requestId:data.requestId});}catch{setOutput('验证未完成，请检查验证码后重试。');}finally{signature='';void tick();}};
    }catch{signature='';box.hidden=false;box.replaceChildren();node('p',say('邮箱辅助暂不可用，仍可手动输入验证码。','Email assistance is unavailable. You can still enter the code manually.'));}
    finally{busy=false;}
  }
  setInterval(tick,1500);void tick();I18n.onChange(()=>{signature='';void tick();});
})();
