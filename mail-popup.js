// Optional verification status only; settings stay in the extension options page.
(()=>{
  const box=document.createElement('div');box.id='mailAssistStatus';box.hidden=true;
  document.getElementById('verifyForm').after(box);let signature='',busy=false;
  const say=(zh,en)=>I18n.language==='en'?en:zh;
  const labels={off:'',unbound:['未关联本次验证码请求。请在 Tracker 重新提交申请信息，或手动输入。','No request binding. Submit the application details in Tracker again, or enter the code manually.'],waiting:['正在等待本次验证邮件，仍可手动输入。','Waiting for this verification email. Manual entry remains available.'],'mail.auth':['Gmail 授权已失效，请到扩展设置重新授权；仍可手动输入。','Gmail authorization is unavailable. Reauthorize in extension options, or enter the code manually.'],'mail.helper':['本机程序未连接，仍可手动输入。','Local helper unavailable. Enter the code manually.'],'mail.credentials':['请检查邮箱授权码和 IMAP 设置。','Check the app password and IMAP settings.'],'mail.network':['邮箱连接失败，仍可手动输入。','Mailbox connection failed. Manual entry remains available.']};
  async function tick(){
    if(busy || typeof targetTabId==='undefined' || !targetTabId)return;busy=true;
    try{
      if(currentContext.stage!=='verification'){box.hidden=true;signature='';return;}
      const data=await send('mailPoll');if(data.profileId && data.profileId!==document.getElementById('application').value){box.hidden=true;signature='';return;}const next=JSON.stringify([data,I18n.language]);if(next===signature)return;signature=next;
      box.replaceChildren();box.hidden=data.status==='off';if(box.hidden)return;
      const p=document.createElement('p');p.textContent=labels[data.status]?.[I18n.language==='en'?1:0] || say('请核对候选验证码后确认。','Review the candidate code before confirming.');box.append(p);
      if(data.status!=='candidates')return;
      const target=document.createElement('strong');target.textContent=say('目标申请：','Target profile: ')+(document.getElementById('application').selectedOptions[0]?.textContent || '');box.append(target);
      if(data.candidates.length>1){const note=document.createElement('p');note.textContent=say('多个候选，请自行核对。','Multiple candidates. Choose after reviewing.');box.append(note);}
      for(const c of data.candidates){
        const row=document.createElement('p');row.textContent=c.code+' · Tracker · '+I18n.date(c.receivedAt);box.append(row);
        const button=document.createElement('button');button.type='button';button.textContent=say('验证并查询','Verify and check');box.append(button);
        button.onclick=async()=>{for(const b of box.querySelectorAll('button'))b.disabled=true;try{await send('mailConfirm',{requestId:data.requestId,candidateId:c.id});}catch{setOutput('验证未完成，请检查验证码后重试。');}finally{signature='';void tick();}};
      }
      const ignore=document.createElement('button');ignore.type='button';ignore.textContent=say('忽略','Ignore');box.append(ignore);ignore.onclick=async()=>{try{await send('mailIgnore',{requestId:data.requestId});}finally{signature='';void tick();}};
    }catch{box.hidden=true;}finally{busy=false;}
  }
  setInterval(tick,1500);I18n.onChange(()=>{signature='';void tick();});
})();
