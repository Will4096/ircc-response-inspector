const t=I18n.t, msg=I18n.message;
const form=document.getElementById('form');
const message=document.getElementById('message');
let messageSource='';
function setMessage(source){messageSource=source || '';message.textContent=msg(messageSource);}
const automatic=document.getElementById('autoFill');
chrome.storage.local.get('autoFill').then(data=>{automatic.checked=!!data.autoFill;}).catch(error=>{setMessage(error.message);});
automatic.onchange=async()=>{
  try{await chrome.storage.local.set({autoFill:automatic.checked});setMessage('已保存');}
  catch(error){setMessage(error.message);}
};
let editingId=null;
let applications=[];
const names=['label','surname','givenName','uci','applicationNumber','birthDate','country','role'];
function reset(){editingId=null;form.reset();document.getElementById('delete').disabled=true;setMessage('请填写申请资料。');}
function render(){
  const list=document.getElementById('list');list.replaceChildren();
  for(const application of applications){
    const li=document.createElement('li');const button=document.createElement('button');button.type='button';button.textContent=application.label;
    button.onclick=()=>{editingId=application.id;for(const name of names)form.elements.namedItem(name).value=application[name] || (name==='role'?'principalApplicantId':'');form.elements.noGivenName.checked=!!application.noGivenName;document.getElementById('delete').disabled=false;setMessage('正在编辑：'+application.label);};
    li.append(button);list.append(li);
  }
}
document.getElementById('new').onclick=reset;
form.onsubmit=async(event)=>{
  event.preventDefault();
  try{
    const application={id:editingId || crypto.randomUUID()};
    for(const name of names)application[name]=form.elements.namedItem(name).value.trim();
    application.noGivenName=form.elements.noGivenName.checked;
    if(!application.givenName && !application.noGivenName)throw new Error('请填写名字，或勾选“无 Given name”。');
    if(application.noGivenName && application.givenName)throw new Error('勾选“无 Given name”时，请清空名字栏。');
    if(application.birthDate>new Date().toLocaleDateString('en-CA'))throw new Error('出生日期不能在未来。');
    const next=applications.filter(item=>item.id!==application.id);next.push(application);
    await chrome.storage.local.set({applications:next});applications=next;editingId=application.id;render();document.getElementById('delete').disabled=false;setMessage('申请资料已保存。');
  }catch(error){setMessage(error.message);}
};
document.getElementById('delete').onclick=async()=>{
  if(!editingId || !confirm(t('确定删除此申请资料？')))return;
  try{const result=await chrome.runtime.sendMessage({action:'removeProfile',profileId:editingId});if(result?.error)throw new Error(result.error);applications=result.applications || [];reset();render();setMessage('申请资料已删除。');}catch(error){setMessage(error.message);}
};
chrome.storage.local.get('applications').then(data=>{applications=data.applications || [];render();}).catch(error=>{setMessage(error.message);});

void I18n.init().catch(error=>setMessage(error.message));
I18n.onChange(()=>setMessage(messageSource));

document.getElementById('clearData').onclick=async()=>{
  if(!confirm(t('清除所有本地申请资料、查询缓存及对比记录？已导出的文件不会删除。')))return;
  try{const result=await chrome.runtime.sendMessage({action:'clearLocalData'});if(result?.error)throw new Error(result.error);applications=[];editingId=null;form.reset();automatic.checked=false;render();document.getElementById('delete').disabled=true;setMessage(result.helperCleared===false?'本地数据已清除。请运行 Windows 卸载脚本清除残留邮箱授权。':'本地数据已清除。');}catch(error){setMessage(error.message);}
};
