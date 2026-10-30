function readTrackerSessionState(){
  if(location.origin!=='https://ircc-services.canada.ca')return {expired:false};
  const text=(document.body.innerText||'').slice(0,16000).replace(/\s+/g,' ');
  return {expired:/(?:your\s+)?session\s+(?:(?:has|is)\s+)?(?:expired|timed\s+out)|(?:votre\s+)?session\s+(?:a\s+expir[ée]|est\s+expir[ée]e)|会话已(?:过期|超时)|登录已(?:过期|超时)/i.test(text)};
}
function readVerificationState(){
  const text=(document.body.innerText || '').replace(/\s+/g,' ');
  const message=text.match(/(?:The verification code you entered does not match the code we sent you\.?|(?:The )?(?:verification )?code (?:has expired|is invalid|is incorrect)\.?|too many (?:unsuccessful )?attempts)/i)?.[0] || '';
  const attempts=text.match(/You have\s+(\d+)\s+attempts?/i)?.[1] || '';
  return {error:!!message,signature:message.toLowerCase()+'|'+attempts};
}
function readOverview(){
  const compact=text=>(text || '').replace(/\s+/g,' ').trim();
  const buttons=Array.from(document.querySelectorAll('button[id^="viewApplicant"]')).filter(button=>button.getClientRects().length);
  if(!buttons.length)return null;
  const applicants=buttons.map(button=>{
    let name='',role='';
    for(let element=button.parentElement,depth=0;element && depth<8;element=element.parentElement,depth++){
      if(element.querySelectorAll('button[id^="viewApplicant"]').length!==1)break;
      const match=compact(element.textContent).match(/^(.*?)\s*(PA|DEP)(?=\s|View|$)/);
      if(match && match[1]){name=match[1].trim();role=match[2];break;}
    }
    return {id:button.id,name:name || '申请人 '+button.id.replace('viewApplicant',''),role};
  });
  const body=compact(document.body.innerText);
  const heading=compact(document.querySelector('h1')?.textContent);
  const number=body.match(/Application number:\s*([A-Z0-9]+)/i)?.[1] || '';
  const status=Array.from(document.querySelectorAll('h2')).map(element=>compact(element.textContent)).find(text=>/^Application status:/i.test(text))?.replace(/^Application status:\s*/i,'') || '';
  return {application:{number,title:heading,status},applicants};
}
function readApplicant(){
  const compact=text=>(text || '').replace(/\s+/g,' ').trim();
  const buttons=Array.from(document.querySelectorAll('button[id^="help_accordion"]'));
  const checks={};
  for(const button of buttons){
    const match=compact(button.textContent).match(/^(Biometrics|Medical exam|Eligibility|Background check|Security)\s*:\s*(.+)$/i);
    if(match){const keys={'biometrics':'biometrics','medical exam':'medical','eligibility':'eligibility','background check':'background','security':'security'};checks[keys[match[1].toLowerCase()]]=match[2];}
  }
  if(!['biometrics','medical','eligibility','background'].every(key=>key in checks))return null;
  const name=compact(document.querySelector('h1')?.textContent);
  if(!name)return null;
  const heading=Array.from(document.querySelectorAll('h2')).map(element=>compact(element.textContent)).find(text=>/^Pending actions to complete/i.test(text));
  const count=heading?.match(/Pending actions to complete\s*(\d+)/i)?.[1];
  return {name,checks,pendingActions:count===undefined?null:Number(count)};
}
function readHistory(){
  if(!/^History$/i.test((document.querySelector('h1')?.textContent || '').trim()))return null;
  const items=Array.from(document.querySelectorAll('li')).filter(item=>item.querySelector('h3')).map(item=>{
    const title=(item.querySelector('h3')?.textContent || '').trim();
    const text=(item.textContent || '').replace(/\s+/g,' ').trim();
    return {title,text};
  });
  const more=Array.from(document.querySelectorAll('button')).find(button=>button.getClientRects().length && /^(view more|show more)$/i.test((button.getAttribute('aria-label') || button.textContent || '').trim()));
  if(!items.length && !/no (?:history|updates|records)/i.test(document.body.innerText || ''))return null;
  return {items,hasMore:!!more,loading:!!more?.disabled,moreButtonId:more?.id || null};
}
