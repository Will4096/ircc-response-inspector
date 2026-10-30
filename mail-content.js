// No mailbox page access. Runs only on the official Tracker host.
(()=>{
  chrome.runtime.onMessage?.addListener((message,sender,reply)=>{if(message.action==='mailObserverHealth'){reply({version:chrome.runtime.getManifest().version,requestTracking:true});}});
  const send=async message=>{const r=await chrome.runtime.sendMessage(message);if(r?.error)throw new Error(r.error);return r;};
  // Capture the actual search submit, even when autofill is off. Never infer a request on popup open.
  document.addEventListener('click',event=>{
    const button=event.target.closest?.('button,input[type=submit],[role=button]');if(!button || button.disabled || !event.isTrusted)return;
    const label=(button.getAttribute('aria-label')||button.textContent||button.value||'').replace(/\s+/g,' ').trim();
    if(location.pathname==='/2/ast-search' && (button.id==='submitButton'||button.type==='submit'||/^(submit|soumettre)$/i.test(label))){
      if(!button.closest('form')||button.closest('form').checkValidity())track();
    }
    if(location.pathname==='/2/ast-otp-verification' && /^(?:resend(?: a)?(?: verification)? code|send (?:a )?new code)$/i.test((button.textContent || '').trim()))void send({action:'mailResend'}).catch(()=>{});
  },true);
  document.addEventListener('submit',event=>{if(event.isTrusted && location.pathname==='/2/ast-search')track();},true);
  let trackedAt=0;
  function track(){
    if(Date.now()-trackedAt<1000)return;trackedAt=Date.now();
    const field=document.getElementById('applicationNumber');
    if(field?.value)void send({action:'mailTrackRequest',applicationNumber:field.value.trim()}).catch(()=>{});
  }
})();
