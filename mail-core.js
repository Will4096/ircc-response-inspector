// Pure matching rules. Never persist a message body or a verification code.
var MailCore=(()=>{
  const address=value=>String(value || '').trim().toLowerCase();
  function htmlText(value){
    return String(value||'').slice(0,131072).replace(/<!--[\s\S]*?-->/g,' ').replace(/<(script|style|head|noscript|svg)\b[^>]*>[\s\S]*?<\/\1\s*>/gi,' ').replace(/<[^>]*>/g,' ').replace(/&(?:nbsp|amp|lt|gt|quot|apos);/gi,m=>({'&nbsp;':' ','&amp;':'&','&lt;':'<','&gt;':'>','&quot;':'"','&apos;':"'"})[m.toLowerCase()]).replace(/&#(x[0-9a-f]+|[0-9]+);/gi,(_,n)=>{const code=n[0].toLowerCase()==='x'?parseInt(n.slice(1),16):Number(n);return code>0&&code<=0x10ffff?String.fromCodePoint(code):' ';}).replace(/\s+/g,' ').trim().slice(0,64000);
  }
  function senderAllowed(from){
    const raw=String(from || '').trim();
    const value=raw.includes('<')?raw.match(/^[^<>]*<([^<>]+)>$/)?.[1]:raw;
    const email=String(value || '').match(/^([A-Z0-9.!#$%&'*+/=?^_`{|}~-]+@([A-Z0-9.-]+))$/i);
    return !!email && /(?:^|\.)(?:cic\.gc\.ca|canada\.ca)$/.test(email[2].toLowerCase());
  }
  function inspect(messages,request,excluded=new Set(),now=Date.now()){
    const found=[],rejected={};
    const skip=reason=>{rejected[reason]=(rejected[reason]||0)+1;};
    // IMAP INTERNALDATE has second precision. Preserve exact Gmail timestamps.
    const earliest=request.provider==='163'?Math.floor(request.startedAt/1000)*1000:request.startedAt;
    for(const mail of messages || []){
      const date=Number(mail.receivedAt),text=String(mail.subject || '')+'\n'+String(mail.text || '');
      if(!senderAllowed(mail.from)){skip('sender');continue;}
      if(!Number.isFinite(date) || date<earliest || date>now+60000){skip('time');continue;}
      if(!Array.isArray(mail.to) || !mail.to.some(to=>address(to)===address(request.email))){skip('recipient');continue;}
      // Tracker also uses this shared template. Require its exact sender and title.
      const sender=String(mail.from||'').trim();
      const senderAddress=sender.includes('<')?sender.match(/^[^<>]*<([^<>]+)>$/)?.[1]:sender;
      const sharedTemplate=/^do-not-reply-ircc-cxp-ne-pas-repondre-ircc-pxc@notification\.canada\.ca$/i.test(senderAddress||'')&&/^IRCC Portal\s*[-–—]\s*New version account\s*[-–—]\s*Confirm your account(?:\s*\/|\s*$)/i.test(String(mail.subject||'').trim());
      // Positive Tracker context AND a verification purpose; IRCC + six digits is insufficient.
      if(!sharedTemplate&&!/(?:application\s+status\s+tracker|IRCC\s+tracker|suivi\s+(?:de\s+)?(?:l[’']état|des demandes))/i.test(text)){skip('purpose');continue;}
      if(!/(?:verification|one[ -]time|security|confirmation)\s*(?:code|password)|code\s+de\s+v[ée]rification/i.test(text)){skip('purpose');continue;}
      if(/(?:create|creating|register|registration|new)\s+(?:an?\s+)?(?:IRCC\s+)?(?:portal\s+)?account|permanent\s+residen(?:ce|t)\s+portal|account\s+creation/i.test(text)){skip('purpose');continue;}
      const digits=[...new Set(text.match(/(?<!\d)\d{6}(?!\d)/g) || [])];
      if(digits.length!==1){skip('digits');continue;}
      if(excluded.has(digits[0])){skip('excluded');continue;}
      found.push({id:String(mail.id),code:digits[0],receivedAt:date,purpose:sharedTemplate?'TrackerAccountConfirmation':'Tracker',sender:String(mail.from).slice(0,200)});
    }
    return {candidates:found.filter((item,index)=>found.findIndex(other=>other.code===item.code)===index),diagnostic:{checked:(messages||[]).length,rejected}};
  }
  function candidates(...args){return inspect(...args).candidates;}
  function normalizeConfig(value){
    if(!value?.enabled){
      if(!['gmail','163'].includes(value?.provider))return {enabled:false};
      return {enabled:false,provider:value.provider,email:address(value.email),clientId:value.provider==='gmail'?String(value.clientId || '').trim():''};
    }
    const email=address(value.email),provider=value.provider;
    if(!['gmail','163'].includes(provider) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw new Error('mail.config');
    if(provider==='163' && !/^[^@]+@163\.com$/.test(email))throw new Error('mail.config');
    const clientId=String(value.clientId || '').trim();
    if(provider==='gmail' && !/^[a-zA-Z0-9-]+\.apps\.googleusercontent\.com$/.test(clientId))throw new Error('mail.client');
    return {enabled:true,provider,email,clientId:provider==='gmail'?clientId:''};
  }
  return {candidates,inspect,normalizeConfig,address,htmlText};
})();
