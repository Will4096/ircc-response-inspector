// No mailbox page access. Runs only on the official Tracker host.
(()=>{
  let busy=false,lastSignature='',timer;
  const say=(zh,en)=>I18n.language==='en'?en:zh;
  const send=async message=>{const r=await chrome.runtime.sendMessage(message);if(r?.error)throw new Error(r.error);return r;};
  const rootId='ircc-mail-confirm';
  function remove(){document.getElementById(rootId)?.remove();lastSignature='';}
  // Capture the actual search submit, even when autofill is off. Never infer a request on popup open.
  document.addEventListener('click',event=>{
    const button=event.target.closest?.('button,input[type=submit]');if(!button || button.disabled || !event.isTrusted)return;
    if(location.pathname==='/2/ast-search' && button.id==='submitButton')track();
    if(location.pathname==='/2/ast-otp-verification' && /^(?:resend(?: a)?(?: verification)? code|send (?:a )?new code)$/i.test((button.textContent || '').trim()))void send({action:'mailResend'}).catch(()=>{});
  },true);
  document.addEventListener('submit',event=>{if(event.isTrusted && location.pathname==='/2/ast-search')track();},true);
  let trackedAt=0;
  function track(){
    if(Date.now()-trackedAt<1000)return;trackedAt=Date.now();
    const field=document.getElementById('applicationNumber');
    if(field?.value)void send({action:'mailTrackRequest',applicationNumber:field.value.trim()}).catch(()=>{});
  }
  async function tick(){
    if(busy)return;
    if(location.pathname!=='/2/ast-otp-verification'){remove();return;}
    busy=true;
    try{
      const data=await send({action:'mailPoll'});
      if(data.status!=='candidates'){remove();return;}
      const signature=JSON.stringify([data,I18n.language]);if(signature===lastSignature)return;
      remove();lastSignature=signature;
      const config=await chrome.storage.local.get(['applications','selectedApplicationId']);if(config.selectedApplicationId!==data.profileId)return;const profile=config.applications?.find(p=>p.id===data.profileId);
      if(!profile)return;
      const box=document.createElement('aside');box.id=rootId;box.setAttribute('role','region');box.setAttribute('aria-label',say('确认邮箱验证码','Confirm email code'));
      Object.assign(box.style,{position:'fixed',right:'20px',bottom:'20px',zIndex:2147483647,width:'370px',maxWidth:'calc(100vw - 40px)',maxHeight:'70vh',overflow:'auto',padding:'20px',border:'2px solid #175cd3',background:'#fff',color:'#163047',borderRadius:'12px',boxShadow:'0 6px 24px #0003',font:'16px/1.6 system-ui'});
      const text=(tag,value)=>{const e=document.createElement(tag);e.textContent=value;box.append(e);return e;};
      text('strong',say('确认邮箱验证码','Confirm email code'));
      text('p',say('目标申请：','Target profile: ')+profile.label);
      if(data.candidates.length>1)text('p',say('找到多个候选，请自行核对。','Multiple candidates found. Review before choosing.'));
      const buttons=[];
      for(const candidate of data.candidates){
        text('p',candidate.code+' · Tracker');
        text('small',say('邮件时间：','Message time: ')+I18n.date(candidate.receivedAt));
        const button=document.createElement('button');button.type='button';button.textContent=say('验证并查询','Verify and check');buttons.push(button);box.append(button);
        button.onclick=async()=>{
          for(const b of buttons)b.disabled=true;
          try{await send({action:'mailConfirm',requestId:data.requestId,profileId:data.profileId,candidateId:candidate.id});remove();}
          catch{remove();/* A consumed code is not offered again; manual input remains available. */}
        };
      }
      const ignore=document.createElement('button');ignore.type='button';ignore.textContent=say('忽略','Ignore');ignore.style.marginLeft='12px';box.append(ignore);
      ignore.onclick=()=>void send({action:'mailIgnore',requestId:data.requestId}).catch(()=>{}).finally(remove);
      document.body.append(box);
    }catch{remove();}
    finally{busy=false;}
  }
  timer=setInterval(tick,1500);void tick();
  window.addEventListener('pagehide',()=>{clearInterval(timer);remove();});
  I18n.onChange(()=>{lastSignature='';void tick();});
})();
