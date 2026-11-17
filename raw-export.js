// Shared latest-query export service for Settings and the applicant-list header.
var RawExport=(()=>{
  const t=I18n.t;
  const errors={'backup.password':'导出密码至少需要 10 个字符。','backup.repeat':'两次密码不一致。','backup.size':'文件过大，最多 30 MB。','transfer.profile':'请先选择申请。','transfer.empty':'最新一次查询尚无原始响应，请先查询。','export.changed':'查询或申请已变化，请重新打开导出。','export.cancelled':'导出已取消。'};
  const errorText=error=>t(errors[error?.message]||'原始数据导出失败，请重试。');
  function save(text,name){const url=URL.createObjectURL(new Blob([text],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);}
  async function read(profileId){const [local,session]=await Promise.all([chrome.storage.local.get('applications'),chrome.storage.session.get(null)]);const data=DataTransferCore.latestRaw(local,session,profileId);return {data,label:local.applications.find(p=>p.id===profileId).label};}
  const queryKey=data=>JSON.stringify([data.profileId,data.query.startedAt,data.query.finishedAt||null,data.query.active]);
  async function write(profileId,{encrypted=false,password='',repeat='',expected,accept=()=>true}={}){
    if(!accept())throw Error('export.cancelled');
    const {data}=await read(profileId);if(expected&&queryKey(data)!==expected)throw Error('export.changed');
    if(encrypted&&password!==repeat)throw Error('backup.repeat');
    const text=encrypted?await DataTransferCore.encryptRaw(data,password):JSON.stringify(data,null,2);
    if(new TextEncoder().encode(text).length>30*1024*1024)throw Error('backup.size');
    if(!accept())throw Error('export.cancelled');
    const latest=await read(profileId);if(queryKey(latest.data)!==queryKey(data))throw Error('export.changed');
    if(!accept())throw Error('export.cancelled');
    save(text,'ircc-raw-'+new Date().toISOString().replace(/[:.]/g,'-')+(encrypted?'.irccraw':'.json'));return data;
  }
  let dialog,fields={},current=null,generation=0,busy=false,dialogSource='',noticeSource='';
  const menu=document.getElementById('resultExportMenu'),message=document.getElementById('resultExportStatus');
  function notice(source){noticeSource=source;if(message)message.textContent=t(source);}
  function close(source=''){
    generation++;current=null;busy=false;dialogSource='';
    if(dialog){fields.password.value='';fields.repeat.value='';if(dialog.open)dialog.close();}
    if(menu){menu.open=false;menu.querySelector('summary')?.focus();}if(source)notice(source);
  }
  function node(tag,text,attrs={}){const item=document.createElement(tag);if(text)item.textContent=text;for(const [key,value] of Object.entries(attrs))item.setAttribute(key,value);return item;}
  function build(){
    dialog=node('dialog',null,{id:'rawExportDialog',class:'raw-export-dialog','aria-labelledby':'rawExportTitle'});
    const form=node('form',null,{novalidate:''}),title=node('h2',null,{id:'rawExportTitle'}),target=node('p',null,{class:'help'}),meta=node('p',null,{class:'help'}),formatLabel=node('label'),formatText=node('span'),format=node('select',null,{id:'resultRawFormat'});
    format.append(node('option','JSON',{value:'plain'}),node('option','Encrypted',{value:'encrypted'}));formatLabel.append(formatText,format);
    const passwords=node('div',null,{class:'field-grid'});
    for(const key of ['password','repeat']){const label=node('label'),text=node('span'),input=node('input',null,{type:'password',autocomplete:'new-password',maxlength:'1024',id:'resultRaw'+key});label.append(text,input);passwords.append(label);fields[key]=input;fields[key+'Text']=text;}
    const help=node('p',null,{class:'help'}),warning=node('p',null,{class:'help'}),status=node('p',null,{class:'notice',role:'status'}),actions=node('div',null,{class:'action-row'}),submit=node('button',null,{type:'submit',class:'primary'}),cancel=node('button',null,{type:'button'});
    actions.append(submit,cancel);form.append(title,target,meta,formatLabel,passwords,help,warning,status,actions);dialog.append(form);document.body.append(dialog);
    Object.assign(fields,{form,title,target,meta,formatText,format,passwords,help,warning,status,submit,cancel});
    format.onchange=()=>{if(format.value==='plain'){fields.password.value='';fields.repeat.value='';}dialogSource='';paint();};cancel.onclick=()=>close();
    dialog.addEventListener('cancel',event=>{event.preventDefault();close();});dialog.addEventListener('close',()=>{if(current)close();});
    form.onsubmit=async event=>{
      event.preventDefault();if(busy||!current)return;
      const run=++generation,profileId=current.profileId;busy=true;dialogSource='';paint();
      try{await write(profileId,{encrypted:format.value==='encrypted',password:fields.password.value,repeat:fields.repeat.value,expected:current.key,accept:()=>generation===run&&dialog.open&&document.getElementById('application')?.value===profileId});if(generation===run)close('原始数据已生成，请在浏览器下载中确认。');}
      catch(error){if(generation===run){dialogSource=errors[error.message]||'原始数据导出失败，请重试。';fields.password.value='';fields.repeat.value='';}}
      finally{if(generation===run){busy=false;paint();}}
    };
  }
  function paint(){
    if(!current||!dialog)return;const encrypted=fields.format.value==='encrypted';
    fields.title.textContent=t('导出原始查询数据');fields.target.textContent=t('目标申请：')+current.label;
    fields.meta.textContent=t('响应数量：')+current.count+' · '+t(current.active?'查询正在进行，将导出点击时已捕获的响应。':current.status==='completed'?'已找到最新查询的原始响应。':'最新查询未完成，仅导出已捕获的原始响应。');
    fields.formatText.textContent=t('文件格式');fields.format.options[0].textContent=t('原始 JSON（不加密）');fields.format.options[1].textContent=t('密码加密文件');
    fields.passwordText.textContent=t('文件密码');fields.repeatText.textContent=t('再次输入密码');fields.passwords.hidden=!encrypted;fields.help.hidden=!encrypted;fields.help.textContent=t('导出时至少 10 个字符；密码不会保存。');
    fields.warning.textContent=t('原始响应仍可能包含姓名和申请编号。取消加密会生成明文 JSON，分享前请自行脱敏。已知认证字段会遮盖，Security 原始状态保留。');
    fields.status.textContent=t(dialogSource);fields.submit.textContent=t(busy?'处理中…':encrypted?'导出加密原始数据':'导出原始 JSON');fields.cancel.textContent=t('取消');
    for(const item of [fields.format,fields.password,fields.repeat,fields.submit])item.disabled=busy;
  }
  async function open(profileId,encrypted){
    const run=++generation;notice('');if(menu)menu.open=false;
    try{const {data,label}=await read(profileId);if(generation!==run||document.getElementById('application')?.value!==profileId)return;
      if(!dialog)build();current={profileId,label,count:data.responses.length,active:data.query.active,status:data.query.status,key:queryKey(data)};busy=false;dialogSource='';fields.password.value='';fields.repeat.value='';fields.format.value=encrypted?'encrypted':'plain';paint();dialog.showModal();fields.format.focus();
    }catch(error){if(generation===run)notice(errors[error.message]||'原始数据导出失败，请重试。');}
  }
  if(menu){
    for(const button of menu.querySelectorAll('[data-raw-export]'))button.onclick=()=>void open(document.getElementById('application').value,button.dataset.rawExport==='encrypted');
    document.addEventListener('click',event=>{if(menu.open&&!menu.contains(event.target))menu.open=false;});
    document.addEventListener('keydown',event=>{if(event.key==='Escape'&&menu.open){menu.open=false;menu.querySelector('summary').focus();}});
    chrome.storage.onChanged.addListener((changes,area)=>{if(area==='local'&&(changes.selectedApplicationId||changes.applications))close(current?'查询或申请已变化，请重新打开导出。':'');});
    chrome.storage.onChanged.addListener((changes,area)=>{if(area==='session'&&current&&Object.keys(changes).some(key=>key.startsWith('capture:'))){const saved=current;void read(saved.profileId).then(({data})=>{if(current===saved&&queryKey(data)!==saved.key)close('查询或申请已变化，请重新打开导出。');},()=>{if(current===saved)close('查询或申请已变化，请重新打开导出。');});}});
    window.addEventListener('message',event=>{if(event.source===window.parent&&event.origin===location.origin&&event.data?.type==='ircc-workspace-visibility'&&!event.data.visible)close();});
    document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')close();});
    I18n.onChange(()=>{notice(noticeSource);paint();});
  }
  return {read,write,save,errorText,open,close};
})();
