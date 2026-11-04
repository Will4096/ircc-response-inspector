function locateTrackerSubmit(){
  if(location.origin!=='https://ircc-services.canada.ca'||location.pathname!=='/2/ast-search')return {ok:false};
  const candidates=Array.from(document.querySelectorAll('button,input[type=submit],[role=button]')).filter(b=>b.getClientRects().length&&!b.disabled&&(b.id==='submitButton'||/^(submit|soumettre)$/i.test((b.getAttribute('aria-label')||b.textContent||b.value||'').trim())));
  const button=document.getElementById('submitButton')|| (candidates.length===1?candidates[0]:null);
  if(!button||!button.getClientRects().length||button.disabled)return {ok:false};
  button.scrollIntoView({block:'center',behavior:'smooth'});button.focus({preventScroll:true});
  const previous=button.style.outline;button.style.outline='3px solid #3671d8';setTimeout(()=>{button.style.outline=previous;},2500);
  return {ok:true};
}
async function fillApplication(application, mode='fill'){
  if(location.origin!=='https://ircc-services.canada.ca' || location.pathname!=='/2/ast-search')return {ok:false,message:'页面已变化，未填写。'};
  const visible=element=>element.getClientRects().length>0;
  const text=element=>{
    const labels=[element.getAttribute('aria-label'),...(element.getAttribute('aria-labelledby') || '').split(/\s+/).map(id=>document.getElementById(id)?.textContent || ''),...Array.from(element.labels || []).map(label=>label.textContent)].filter(Boolean);
    // Some component libraries expose their label only on the wrapper.
    if(!labels.length){
      for(let parent=element.parentElement,depth=0;parent && depth<3;parent=parent.parentElement,depth++){
        if(parent.querySelectorAll('input,select,[role="combobox"]').length>1)break;
        const label=parent.querySelector('label');
        if(label){labels.push(label.textContent);break;}
      }
    }
    return [...new Set(labels.map(label=>label.replace(/\*/g,'').replace(/\s+/g,' ').trim()))].join(' ');
  };
  const inputs=Array.from(document.querySelectorAll('input')).filter(element=>visible(element) && element.type!=='checkbox' && element.type!=='radio');
  const selectOne=pattern=>{const found=inputs.filter(element=>pattern.test(text(element)));return found.length===1?found[0]:null;};
  const fields=[['surname',/Surname|last name/i,application.surname],['uci',/Unique client identifier|\bUCI\b/i,application.uci],['applicationNumber',/Application number/i,application.applicationNumber],['dateOfBirthYear',/\bYear\b/i,application.birthDate.slice(0,4)],['dateOfBirthDay',/\bDay\b/i,String(Number(application.birthDate.slice(8,10)))]];
  if(!application.noGivenName)fields.push(['givenName',/Given Name/i,application.givenName]);
  const resolved=fields.map(([id,pattern,value])=>{
    const exact=document.getElementById(id);
    return {element:exact && inputs.includes(exact)?exact:selectOne(pattern),value,id};
  });
  const missing=resolved.filter(field=>!field.element);
  if(!missing.length && mode==='prepare'){
    if(resolved.some(field=>field.element.disabled || field.element.readOnly))return {ok:false,retryable:true,message:'表单尚未就绪。'};
    if(resolved.some(field=>!field.element.id))return {ok:false,retryable:true,message:'表单尚未就绪。'};
    const dropdowns=['dateOfBirthMonth','countryOfBirth'].map(id=>document.getElementById(id));
    if(dropdowns.some(element=>!element || !visible(element)))return {ok:false,retryable:true,message:'表单尚未就绪。'};
    return {ok:true,fields:resolved.map(field=>({id:field.element.id,value:field.value}))};
  }
  if(missing.length)return {ok:false,retryable:true,message:'表单尚未就绪。'};
  const checkboxes=Array.from(document.querySelectorAll('input[type="checkbox"]')).filter(element=>visible(element) && /already entered my full name/i.test(text(element)));
  const checkbox=document.getElementById('noGivenNameCheckbox-1') || (checkboxes.length===1?checkboxes[0]:null);
  if(application.noGivenName && (!checkbox || checkbox.type!=='checkbox'))return {ok:false,message:'无法识别无 Given name 选项，未填写。'};
  if(checkbox && checkbox.checked!==!!application.noGivenName)checkbox.click();
  const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set;
  if(mode!=='dropdowns')for(const {element,value} of resolved){setter.call(element,value);element.dispatchEvent(new Event('input',{bubbles:true,composed:true}));element.dispatchEvent(new Event('change',{bubbles:true,composed:true}));element.blur();}
  const selects=Array.from(document.querySelectorAll('select')).filter(visible);
  const month=Number(application.birthDate.slice(5,7));
  const monthName=['January','February','March','April','May','June','July','August','September','October','November','December'][month-1];
  const manual=[];
  for(const [pattern,wanted] of [[/Month/i,monthName],[/Country of birth/i,application.country]]){
    const matches=selects.filter(element=>pattern.test(text(element)));
    const select=matches.length===1?matches[0]:null;
    const option=select && Array.from(select.options).find(option=>option.textContent.trim().toLowerCase()===wanted.toLowerCase());
    if(select && option){select.value=option.value;select.dispatchEvent(new Event('change',{bubbles:true}));}
    else {
      const combos=Array.from(document.querySelectorAll('[role="combobox"]')).filter(element=>visible(element) && pattern.test(text(element)));
      if(combos.length!==1){manual.push(wanted);continue;}
      const combo=combos[0];
      combo.focus();
      combo.click();
      // Tracker uses editable autocomplete inputs: filter, then select the
      // actual option so the application's model receives the country/month.
      if(combo instanceof HTMLInputElement){
        setter.call(combo,wanted);
        combo.dispatchEvent(new Event('input',{bubbles:true,composed:true}));
      }
      let options=[];
      for(let attempt=0;attempt<15;attempt++){
        options=Array.from(document.querySelectorAll('[role="option"]')).filter(element=>visible(element) && element.textContent.trim().toLowerCase()===wanted.toLowerCase());
        if(options.length===1)break;
        await new Promise(resolve=>setTimeout(resolve,100));
      }
      if(options.length===1){
        options[0].dispatchEvent(new MouseEvent('mousedown',{bubbles:true,cancelable:true}));
        options[0].click();
        await new Promise(resolve=>setTimeout(resolve,100));
        if(combo instanceof HTMLInputElement && combo.value.trim().toLowerCase()!==wanted.toLowerCase())manual.push(wanted);
        combo.blur();
      }
      else {combo.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));combo.blur();manual.push(wanted);}
    }
  }
  return {ok:true,manualRequired:manual.length>0,message:manual.length?`请手动选择：${manual.join('、')}。确认申请信息后点击 Submit 继续。`:'请确认申请信息，点击 Submit 后继续。'};
}
function submitTrackerSearch(application,submit=false){
  if(location.origin!=='https://ircc-services.canada.ca'||location.pathname!=='/2/ast-search')return {ok:false,message:'页面已变化，自动提交已取消。'};
  const norm=value=>String(value??'').trim().replace(/\s+/g,' ').toLowerCase();
  const values={surname:application.surname,uci:application.uci,applicationNumber:application.applicationNumber,dateOfBirthYear:application.birthDate?.slice(0,4),dateOfBirthDay:String(Number(application.birthDate?.slice(8,10)))};
  if(!application.noGivenName)values.givenName=application.givenName;
  if(!application.id||Object.entries(values).some(([id,value])=>!norm(value)||norm(document.getElementById(id)?.value)!==norm(value)))return {ok:false,message:'表单资料未完整匹配当前申请，请检查后手动提交。'};
  const noGiven=document.getElementById('noGivenNameCheckbox-1');if((application.noGivenName&&!noGiven)||(noGiven&&noGiven.checked!==!!application.noGivenName))return {ok:false,message:'表单资料未完整匹配当前申请，请检查后手动提交。'};
  const selected=id=>{const el=document.getElementById(id);if(!el)return '';if(el.selectedOptions?.length)return norm(el.selectedOptions[0].textContent);const target=el.value!==undefined?el:el.querySelector?.('input,[role="combobox"],button');return norm(target?.value||target?.getAttribute?.('aria-valuetext')||target?.textContent);};
  const month=Number(application.birthDate?.slice(5,7)),monthName=['January','February','March','April','May','June','July','August','September','October','November','December'][month-1];
  if(![norm(monthName),String(month),String(month).padStart(2,'0')].includes(selected('dateOfBirthMonth'))||selected('countryOfBirth')!==norm(application.country))return {ok:false,message:'月份或出生国家未选择完整，请检查后手动提交。'};
  const buttons=Array.from(document.querySelectorAll('button,input[type=submit],[role=button]')).filter(b=>b.getClientRects().length&&!b.disabled&&(b.id==='submitButton'||/^(submit|soumettre)$/i.test((b.getAttribute('aria-label')||b.textContent||b.value||'').trim())));
  if(buttons.length!==1)return {ok:false,message:'官网提交按钮尚未就绪，请检查后手动提交。'};
  const button=buttons[0],form=button.closest('form');
  if((form&&!form.checkValidity())||Array.from(document.querySelectorAll('[aria-invalid="true"]')).some(el=>el.getClientRects().length))return {ok:false,message:'官网表单校验未通过，请检查必填项后手动提交。'};
  const marker=document.documentElement.dataset;if(marker.irccSearchSubmitted===application.id)return {ok:false,alreadySubmitted:true,message:'本次查询已提交，不会自动重复提交。'};
  if(!submit)return {ok:true};
  marker.irccSearchSubmitted=application.id;marker.irccSearchAuto='1';
  try{button.click();return {ok:true};}finally{delete marker.irccSearchAuto;}
}
