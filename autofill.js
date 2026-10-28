(() => {
  let busy=false;
  let completed='';
  let previousPath='';
  let timer;
  let stopped=false;
  let formWaitStarted=0;
  let historySignature='';
  let historyClicks=0;
  let lastNotice=null;
  function notify(message, title='操作提示', withSubmit=false, refresh=false){
    lastNotice=[message,title,withSubmit,refresh];
    let banner=document.getElementById('ircc-inspector-status');
    if(!banner){banner=document.createElement('div');banner.id='ircc-inspector-status';banner.setAttribute('role','status');banner.setAttribute('aria-live','polite');Object.assign(banner.style,{position:'fixed',top:'18px',right:'18px',width:'360px',maxWidth:'calc(100vw - 36px)',boxSizing:'border-box',padding:'22px',background:'#fff',color:'#163047',border:'3px solid #166b49',boxShadow:'0 8px 32px #0004',zIndex:'2147483647',borderRadius:'12px',font:'16px/1.6 system-ui'});document.body.append(banner);}
    banner.replaceChildren();
    const heading=document.createElement('strong');heading.textContent=I18n.message(title);heading.style.cssText='display:block;font-size:22px;line-height:1.4;margin-bottom:10px';
    const body=document.createElement('p');body.textContent=I18n.message(message);body.style.margin='0 0 12px';banner.append(heading,body);
    if(refresh){
      const button=document.createElement('button');button.type='button';button.textContent=I18n.t('刷新页面');button.style.cssText='background:#166b49;color:white;border:0;border-radius:6px;padding:10px 16px;cursor:pointer';button.onclick=()=>location.reload();banner.append(button);
    }
    if(withSubmit){
      const button=document.createElement('button');button.type='button';button.textContent='Submit';button.style.cssText='background:#166b49;color:white;border:0;border-radius:6px;padding:12px 16px;font:600 16px system-ui;cursor:pointer';
      button.onclick=()=>{
        if(button.disabled)return;
        const submit=document.getElementById('submitButton');
        if(location.pathname!=='/2/ast-search' || !submit){banner.remove();return;}
        if(submit.disabled)return;
        button.disabled=true;submit.click();
        setTimeout(()=>{if(location.pathname==='/2/ast-search')button.disabled=false;},1500);
      };
      banner.append(button);

    }
    if(!withSubmit){const close=document.createElement('button');close.type='button';close.textContent=I18n.t('收起提示');close.style.cssText='display:block;margin-top:12px;background:none;border:0;text-decoration:underline;color:#52616c;cursor:pointer';close.onclick=()=>banner.remove();banner.append(close);}
  }
  function handleError(error){
    if(stopped)return;
    const message=String(error?.message || error);
    if(/Extension context invalidated/i.test(message)){
      stopped=true;clearInterval(timer);
      notify('请刷新 Tracker 页面后继续。','扩展已更新',false,true);
    }else notify(message);
  }
  function showFilled(message){
    const incomplete=/手动选择|无法|失败/.test(message);
    notify(incomplete?message:'请确认申请信息，点击 Submit 后继续。',incomplete?'补全申请信息':'确认申请信息',true);
  }
  chrome.runtime.onMessage.addListener(message=>{if(message.action==='showFilled')showFilled(message.message);});
  async function tick(){
    if(busy || stopped)return;
    const path=location.pathname;
    if(path!==previousPath){completed='';formWaitStarted=0;previousPath=path;document.getElementById('ircc-inspector-status')?.remove();}
    if(path==='/2/ast-otp-verification'){
      busy=true;
      try{
        const capture=await chrome.runtime.sendMessage({action:'captureContext'});
        const verification=readVerificationState();
        if(capture.active && capture.verificationSubmittedAt && !capture.verificationSubmitting && verification.error && verification.signature!==capture.verificationBaseline){
          await chrome.runtime.sendMessage({action:'verificationFailed'});
        }
      }catch(error){handleError(error);}
      finally{busy=false;}
      return;
    }
    if(['/2/ast-details','/2/ast-view-application','/2/ast-history'].includes(path)){
      busy=true;
      try{
        const capture=await chrome.runtime.sendMessage({action:'captureContext'});
        if(!capture.active || capture.status!=='capturing')return;
        const key=capture.startedAt+location.href;
        if(completed===key)return;
        if(path==='/2/ast-details'){
          const overview=readOverview();
          if(!overview)return;
          const next=await chrome.runtime.sendMessage({action:'overview',...overview});
          if(next.error)throw new Error(next.error);
          if(!next.ok)return;
          completed=key;
          if(next.buttonId){
            const button=document.getElementById(next.buttonId);
            if(button && !button.disabled)button.click();
            else throw new Error('未找到申请人详情，请刷新页面后重试。');
          }
        }else if(path==='/2/ast-view-application' && capture.phase==='applicant'){
          const applicant=readApplicant();
          if(!applicant)return;
          const result=await chrome.runtime.sendMessage({action:'applicant',...applicant});
          if(result.error)throw new Error(result.error);
          if(result.ok)completed=key;
        }else if(path==='/2/ast-history' && capture.phase==='history'){
          const history=readHistory();if(!history)return;
          if(history.loading)return;
          const signature=location.href+JSON.stringify(history.items);
          if(signature!==historySignature){historySignature=signature;return;}
          if(history.hasMore){
            if(historyClicks++>100)throw new Error('历史记录加载未完成，请重新查询。');
            const button=document.getElementById(history.moreButtonId);if(button)button.click();
            historySignature='';return;
          }
          const result=await chrome.runtime.sendMessage({action:'history',items:history.items});
          if(result.error)throw new Error(result.error);if(result.ok)completed=key;
        }
      }catch(error){handleError(error);}finally{busy=false;}
      return;
    }
    if(!['/2/ast','/2/ast-search'].includes(path))return;
    busy=true;
    try{
      const {applications=[],selectedApplicationId,autoFill}=await chrome.storage.local.get(['applications','selectedApplicationId','autoFill']);
      const intent=path==='/2/ast-search'?await chrome.runtime.sendMessage({action:'fillIntent'}):{};
      if(!autoFill && !intent.applicationId)return;
      const application=applications.find(item=>item.id===(intent.applicationId || selectedApplicationId));
      if(!application)return;
      const key=path+JSON.stringify(application);
      if(completed===key)return;
      if(path==='/2/ast'){
        const role=document.getElementById(application.role || 'principalApplicantId');
        const next=document.getElementById('continue');
        if(!role || !next || !role.getClientRects().length || next.disabled)return;
        completed=key;
        if(!role.checked)role.click();
        await new Promise(resolve=>setTimeout(resolve,150));
        next.click();
      }else{
        if(!document.querySelector('input') || !document.getElementById('submitButton'))return;
        const ready=await fillApplication(application,'prepare');
        if(!ready.ok){
          if(!formWaitStarted)formWaitStarted=Date.now();
          if(Date.now()-formWaitStarted>20000){completed=key;notify('申请表加载未完成，请刷新页面后重试。');}
          return;
        }
        completed=key;
        const result=await chrome.runtime.sendMessage({action:'fill',applicationId:application.id});
        if(result?.error)throw new Error(result.error);
        showFilled(result.message);
      }
    }catch(error){handleError(error);}finally{busy=false;}
  }
  I18n.onChange(()=>{if(lastNotice && document.getElementById('ircc-inspector-status'))notify(...lastNotice);});
  void I18n.init().catch(()=>{});
  timer=setInterval(tick,1000);
  chrome.storage.onChanged.addListener((changes,area)=>{
    if(area==='local' && ['applications','selectedApplicationId','autoFill'].some(key=>key in changes)){completed='';void tick();}
  });
  void tick();
})();
