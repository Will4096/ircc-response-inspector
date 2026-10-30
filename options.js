const t=I18n.t,msg=I18n.message,$=id=>document.getElementById(id);
const form=$('form');let applications=[],editingId=null,snapshot='',saving=false,loading=true,messageSource='',leaving=false;
const fields=['label','surname','givenName','uci','applicationNumber','birthDate','country','role'];
function values(){const value={};for(const name of fields)value[name]=form.elements.namedItem(name).value;value.noGivenName=form.elements.noGivenName.checked;return value;}
function dirty(){return !loading && JSON.stringify(values())!==snapshot;}
function setMessage(source,tone='info'){messageSource=source || '';$('message').textContent=msg(messageSource);$('message').dataset.tone=tone;}
function consent(){return !dirty() || confirm(t('有未保存的修改，确定放弃吗？'));}
function controls(){
  for(const input of form.querySelectorAll('input,select'))input.disabled=saving || loading;$('new').disabled=saving || loading;
  $('editHeading').textContent=t(editingId?'编辑申请':'新增申请');
  $('editStatus').textContent=t(loading?'正在加载…':dirty()?'未保存':editingId?'已保存':'新增');$('editStatus').dataset.state=dirty()?'setup':editingId?'saved':'';
  $('saveProfile').disabled=saving || loading || !dirty();$('saveProfile').textContent=t(saving?'正在保存…':'保存申请');
  $('cancelEdit').disabled=saving || !dirty();$('delete').disabled=saving || !editingId;
  $('deleteArea').hidden=!editingId;$('saveHint').textContent=t(dirty()?'修改尚未保存。':'资料仅保存在本机。');
}
function load(profile){
  editingId=profile?.id || null;form.reset();
  for(const name of fields)form.elements.namedItem(name).value=profile?.[name] || (name==='role'?'principalApplicantId':'');
  form.elements.noGivenName.checked=!!profile?.noGivenName;
  snapshot=JSON.stringify(values());setMessage('');controls();renderList();
}
function renderList(){
  $('list').replaceChildren();
  if(loading){const note=document.createElement('li');note.className='profile-empty';note.textContent=t('正在读取申请资料…');$('list').append(note);return;}
  if(!applications.length){const empty=document.createElement('li');empty.className='profile-empty';empty.textContent=t('还没有保存的申请。填写右侧资料开始使用。');$('list').append(empty);}
  for(const profile of applications){
    const li=document.createElement('li'),button=document.createElement('button'),label=document.createElement('span'),detail=document.createElement('small');
    button.type='button';button.setAttribute('aria-current',String(profile.id===editingId));label.textContent=profile.label;
    detail.textContent=t('申请编号尾号：')+String(profile.applicationNumber || '').slice(-4);button.append(label,detail);
    button.onclick=()=>{if(saving || profile.id===editingId || !consent())return;load(profile);};li.append(button);$('list').append(li);
  }
}
$('new').onclick=()=>{if(!saving && consent()){load(null);form.elements.label.focus();}};
$('cancelEdit').onclick=()=>{if(!saving && consent())load(applications.find(p=>p.id===editingId) || null);};
form.addEventListener('input',()=>{setMessage('');controls();});form.addEventListener('change',controls);
form.onsubmit=async event=>{
  event.preventDefault();if(saving)return;
  try{
    const application={id:editingId || crypto.randomUUID(),...values()};for(const name of fields)application[name]=application[name].trim();
    if(!application.givenName && !application.noGivenName){form.elements.givenName.focus();throw new Error('请填写名字，或勾选“无 Given name”。');}
    if(application.noGivenName && application.givenName){form.elements.givenName.focus();throw new Error('勾选“无 Given name”时，请清空名字栏。');}
    if(application.birthDate>new Date().toLocaleDateString('en-CA')){form.elements.birthDate.focus();throw new Error('出生日期不能在未来。');}
    saving=true;controls();
    const next=applications.some(p=>p.id===application.id)?applications.map(p=>p.id===application.id?application:p):[...applications,application];
    await chrome.storage.local.set({applications:next});applications=next;load(application);setMessage('申请资料已保存。','success');
  }catch(error){setMessage(error.message,'error');}finally{saving=false;controls();}
};
$('delete').onclick=async()=>{
  if(saving || !editingId || !confirm(t('删除此申请及其查询缓存和对比记录？此操作不会影响 IRCC 官网申请。')))return;
  saving=true;controls();try{
    const result=await chrome.runtime.sendMessage({action:'removeProfile',profileId:editingId});if(result?.error)throw new Error(result.error);
    applications=result.applications || [];load(applications[0] || null);setMessage('申请资料已删除。','success');
  }catch(error){setMessage(error.message,'error');}finally{saving=false;controls();}
};
chrome.storage.onChanged.addListener((changes,area)=>{
  if(area!=='local' || !changes.applications)return;
  applications=changes.applications.newValue || [];renderList();
  if(!saving && editingId && !applications.some(p=>p.id===editingId))load(null);
});
window.addEventListener('beforeunload',event=>{if(dirty() && !leaving){event.preventDefault();event.returnValue='';}});
document.addEventListener('click',event=>{const link=event.target.closest?.('a[href]');if(link && !link.target && dirty()){if(!consent())event.preventDefault();else{leaving=true;setTimeout(()=>{leaving=false;},500);}}});
controls();renderList();
void (async()=>{await I18n.init();const saved=await chrome.storage.local.get(['applications','selectedApplicationId']);applications=saved.applications || [];loading=false;load(applications.find(p=>p.id===saved.selectedApplicationId) || applications[0] || null);})().catch(()=>setMessage('无法读取申请资料，请刷新页面后重试。','error'));
I18n.onChange(()=>{controls();renderList();$('message').textContent=msg(messageSource);});
if(location.hash==='#extensionSettings')location.replace('settings.html');
