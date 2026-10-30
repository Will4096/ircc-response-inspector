const t=I18n.t, msg=I18n.message;
let displayedCapture=null;
const $=id=>document.getElementById(id);
const output=$('output');
let outputSource='';
function setOutput(source){outputSource=source || '';output.textContent=msg(outputSource);output.dataset.tone=/无法|失败|错误|不正确|过期|未完成|请输入|请先/.test(outputSource)?'error':'info';}
let targetTabId;
let queryWindowId;
let entryBusy=false;
const inWorkspace=typeof location!=='undefined'&&new URLSearchParams(location.search).get('embedded')==='1';
let workspaceVisible=!inWorkspace,workspaceVisibilityKnown=!inWorkspace,countdownBusy=false;
const searchViewId=globalThis.crypto?.randomUUID?.()||'view-'+Date.now()+'-'+Math.random();
const isSidePanel=typeof location!=='undefined'&&new URLSearchParams(location.search).get('surface')==='panel';
let lastSnapshot='';
let verificationBusy=false;
let profileRevision=0;
const el=(tag,text,className)=>{const node=document.createElement(tag);if(text!==undefined)node.textContent=text;if(className)node.className=className;return node;};
const knownStatuses={'completed':'已完成','in progress':'进行中','not started':'未开始','not applicable':'不适用'};
function pill(value){
  const raw=value===null || value===undefined || value===''?t('未返回'):String(value);
  const normalized=raw.toLowerCase().trim();
  const kind=normalized==='completed'?'done':normalized==='in progress'?'progress':'';
  const node=el('span',t(knownStatuses[normalized] || raw),'pill '+kind);node.title=raw;return node;
}
function rawSection(title,records){
  const details=el('details');details.append(el('summary',title+' · '+records.length+t(' 条响应')));
  for(const record of records){const item=el('details');item.append(el('summary',record.url),el('pre',JSON.stringify(record.json,null,2)));details.append(item);}
  return details;
}
const expandedPeople=new Set();
let currentContext={stage:'closed'};
function renderComparison(data){
  const box=$('updates');box.replaceChildren();box.hidden=false;
  const comparison=data.comparison;
  if(data.active){box.append(el('span',t('查询完成后，将与上次成功查询对比。'),'muted'));return;}
  if(data.status!=='completed'){box.hidden=!['failed','partial','stopped'].includes(data.status);if(!box.hidden)box.append(el('span',t('本次查询未完成，未更新比较基准。'),'muted'));return;}
  const titles={first:t('首次记录，已建立下次对比基准'),changed:t('较上次查询有新变化'),unchanged:t('较上次查询无变化'),uncertain:t('部分数据无法比较'),unavailable:t('暂时无法比较')};
  box.append(el('strong',titles[comparison?.status] || t('尚无对比记录，下次完整查询后可比较')));
  if(comparison?.previousAt)box.append(el('div',t('对比上次成功查询：')+I18n.date(comparison.previousAt),'muted'));
  if(comparison?.changes?.length){
    const list=el('ul',undefined,'change-list');
    const value=v=>v===null || v===undefined?t('未返回'):t(knownStatuses[String(v).toLowerCase()] || String(v));
    for(const change of comparison.changes){const detail=change.type==='field'?msg(change.label)+(I18n.language==='en'?': ':'：')+value(change.before)+' → '+value(change.after):change.type==='history'?t('History 新增 ')+change.added+t(' 条')+(change.removed?t('，移除或改写 ')+change.removed+t(' 条'):''):msg(change.label);list.append(el('li',(change.person==='申请'?t('申请'):change.person)+' · '+detail));}
    box.append(list);
  }
  for(const note of comparison?.notes || [])box.append(el('p',msg(note),'muted'));
  if(comparison?.saveError)box.append(el('p',t('比较基准未能保存，下次查询可能仍与较早结果比较。'),'muted'));
}
function historyDetails(person,responses,changes=[]){
  const container=el('div');const header=el('div',undefined,'detail-toolbar');
  header.append(el('strong',t('历史记录')),el('span',person.historyLoaded?(person.history || []).length+t(' 条'):t('未读取'),'history-count'));container.append(header);
  const list=el('ol',undefined,'history-list');
  const fields={actStatus:t('状态代码'),actType:t('类型代码'),dateCreated:t('创建时间'),dateLoaded:t('载入时间'),date:t('时间'),key:t('类别'),title:t('标题'),text:t('内容')};
  const newIndices=new Set(changes.filter(c=>c.type==='history').flatMap(c=>c.newIndices || []));
  for(const [index,entry] of (person.history || []).entries()){
    const item=entry && typeof entry==='object'?entry:{text:String(entry)};
    const li=el('li');if(newIndices.has(index)){li.className='history-new';li.append(el('span',t('新增'),'change-badge'));}li.append(el('div',item.key || item.title || t('记录'),'history-title'));
    const headingKey=item.key?'key':item.title?'title':null;
    const values=el('dl',undefined,'history-fields');
    for(const [key,value] of Object.entries(item)){
      if(key===headingKey)continue;
      values.append(el('dt',fields[key] || key),el('dd',value===null?'—':typeof value==='object'?JSON.stringify(value):String(value)));
    }
    li.append(values);list.append(li);
  }
  if(!(person.history || []).length)container.append(el('p',person.historyLoaded?t('无历史记录'):t('历史记录尚未读取'),'muted'));
  else container.append(list);
  const records=responses.filter(record=>person.relationId && record.relationId===person.relationId);
  if(records.length)container.append(rawSection(t('原始响应'),records));
  return container;
}
function renderContext(context,data={}){
  if(currentContext?.stage==='access'&&context?.stage!=='access'&&['未允许识别认证页，现有标签页保持不变。','未找到 Tracker 或官方登录页，请切回原页面，或选择新建 Tracker 页。'].includes(outputSource))setOutput('');
  currentContext=context || {stage:'closed'};
  const complete=data.status==='completed'&&currentContext.stage==='results';
  const state=UIModel.query(currentContext.stage,{...data,...(currentContext.autoSubmit?{autoSubmit:currentContext.autoSubmit}:{})},!!$('application').value);
  $('entryTitle').textContent=t(state.title);$('entryState').textContent=t(state.help);
  $('stageLabel').hidden=complete;$('stageLabel').textContent=t(state.label);$('stageLabel').dataset.state=state.label==='已完成'?'connected':['等待验证码','登录超时','需要登录'].includes(state.label)?'setup':'';
  $('addFirstProfile').hidden=!state.add;$('openTracker').hidden=!state.open;$('openTracker').textContent=t(state.openText);
  $('reloginTracker').hidden=!state.relogin;
  $('newTracker').hidden=!state.newTab;
  $('fill').hidden=!state.fill;$('fill').disabled=!!data.active || !$('application').value;
  $('verifyForm').hidden=!state.verify;$('resultActions').hidden=!state.capture;$('stopCapture').hidden=!state.stop;
  $('autoSubmitNotice').hidden=!currentContext.autoSubmit;
  if(currentContext.autoSubmit)paintSearchCountdown(currentContext.autoSubmit);
  $('fill').textContent=t(currentContext.stage==='role'?'填写申请资料':'填入 Tracker');
  $('code').disabled=!!data.active || verificationBusy;$('verify').disabled=!!data.active || verificationBusy;$('capture').disabled=!!data.active || verificationBusy;
  $('querySteps').hidden=state.add || complete;$('entryTitle').closest?.('.task-area')?.setAttribute('data-complete',String(complete));
  for(const node of document.querySelectorAll?.('#querySteps li') || []){const step=Number(node.dataset.step);node.dataset.current=String(step===state.step);node.dataset.complete=String(step<state.step || complete);}
  if(!currentContext.autoSubmit&&currentContext.pageNotice?.kind==='filled'&&/手动|未完整|未就绪|未选择|校验|取消|已变化|无法|失败/.test(currentContext.pageNotice.text||''))$('entryState').textContent=msg(currentContext.pageNotice.text);
  if(currentContext.pageNotice?.kind==='pageError')$('entryState').textContent=t('Tracker 页面暂未就绪，请检查官网提示，必要时刷新。');
  if(currentContext.observerReady===false){$('entryState').textContent=t('Tracker 页面仍在使用旧版脚本。重新加载查询表单后，请核对并点击官网 Submit。');$('openTracker').hidden=false;$('openTracker').textContent=t('重新加载查询表单');$('fill').hidden=true;$('verifyForm').hidden=true;}
}

function renderCapture(data){
  displayedCapture=data;
  renderComparison(data);
  const status=data.status || 'idle';const people=data.applicants || [];const responses=data.responses || [];
  const completed=people.filter(person=>person.status==='completed').length;
  const current=people.find(person=>['capturing','history'].includes(person.status));
  const labels={idle:'',ready:t('资料已填写'),filling:t('正在填写'),capturing:current?t('读取 ')+current.name+(current.status==='history'?t(' · 历史记录'):''):t('读取中'),completed:t('查询完成'),partial:t('部分结果'),failed:t('查询未完成'),stopped:t('已停止')};
  $('capturePanel').hidden=!data.active && !['failed','partial','stopped'].includes(status);$('capturePanel').dataset.state=status;
  $('captureState').textContent=labels[status] || '';
  $('captureReason').textContent=['failed','partial'].includes(status)?msg(data.reason || ''):'';
  $('progress').textContent=people.length?completed+' / '+people.length+t(' 人'):'';
  $('applicationTitle').textContent=data.application?.title || t('申请进度');
  $('applicationNumber').textContent=[data.application?.number,data.application?.status].filter(Boolean).join(' · ');
  $('captureTime').textContent=data.finishedAt?t('查询时间 ')+I18n.date(data.finishedAt):'';
  $('capture').textContent=people.length || responses.length?t('刷新进度'):t('查询进度');
$('application').disabled=!!data.active || verificationBusy;$('queryFooter').hidden=!people.length && !responses.length;
  renderContext(currentContext,data);
  $('resultsPanel').hidden=!people.length && !responses.length;
  const results=$('results');results.replaceChildren();
  if(!people.length)results.append(el('div',data.active?t('读取申请人…'):t('暂无结果'),'empty'));
  else{
    const table=el('table');const head=el('thead');const row=el('tr');
    for(const label of [t('申请人'),t('生物识别'),t('体检'),t('资格审核'),t('背景调查'),'Security',t('待办'),t('详情')])row.append(el('th',label));
    head.append(row);table.append(head);const body=el('tbody');
    for(const person of people){
      const changes=data.comparison?.people?.[person.id] || [];
      const tr=el('tr');const name=el('td');name.append(el('div',person.name,'person-name'),el('div',person.role==='PA'?t('主申请人'):person.role==='DEP'?t('家属申请人'):person.role || t('申请人'),'role'));
      if(changes.length)name.append(el('span',t('有更新'),'change-badge'));
      if(person.status!=='completed')name.append(el('div',person.status==='capturing'?t('读取中'):person.status==='history'?t('读取历史记录'):person.status==='failed'?t('查询未完成'):t('等待查询'),'muted'));
      tr.append(name);
      for(const key of ['biometrics','medical','eligibility','background']){const td=el('td');td.append(pill(person.checks?.[key] ?? '—'));tr.append(td);}
      const security=securitySummary(person.history || []);const securityCell=el('td');
      securityCell.append(pill(security.value ?? (security.events.length?t('有记录'):person.historyLoaded?t('无记录'):'—')));
      securityCell.title=security.events.length?t('History · Security · 原始状态代码'):t('无记录不代表未进入安调。');tr.append(securityCell);
      tr.append(el('td',person.pendingActions===null || person.pendingActions===undefined?'—':String(person.pendingActions)));
      const control=el('td');const button=el('button',expandedPeople.has(person.id)?'⌄':'›','details-toggle');button.type='button';button.title=t('详情');button.setAttribute('aria-label',person.name+t(' 的详情'));button.setAttribute('aria-expanded',String(expandedPeople.has(person.id)));control.append(button);tr.append(control);body.append(tr);
      const detailRow=el('tr',undefined,'person-details');detailRow.id='details-'+person.id;button.setAttribute('aria-controls',detailRow.id);detailRow.hidden=!expandedPeople.has(person.id);const cell=el('td');cell.colSpan=8;cell.append(historyDetails(person,responses,changes));detailRow.append(cell);body.append(detailRow);
      button.onclick=()=>{if(expandedPeople.has(person.id))expandedPeople.delete(person.id);else expandedPeople.add(person.id);detailRow.hidden=!expandedPeople.has(person.id);button.textContent=detailRow.hidden?'›':'⌄';button.setAttribute('aria-expanded',String(!detailRow.hidden));};
    }
    table.append(body);results.append(table);
  }
  const raw=$('rawResults');raw.replaceChildren();
  if(responses.length){
    const analysis=data.analysis || responseAnalysis(responses);const section=el('details');section.append(el('summary',t('查询诊断 · ')+analysis.total+t(' 条响应')));
    section.append(el('p',t('申请数据 ')+analysis.applicantDataResponses+t(' 条 · 重复 ')+analysis.duplicates+t(' 条'),'muted'));
    if(analysis.completeAtResponse)section.append(el('p',t('前 ')+analysis.completeAtResponse+t(' 条响应已覆盖 ')+analysis.coveredApplicants+t(' 人资料'),'muted'));
    for(const endpoint of analysis.endpoints)section.append(el('div',endpoint.count+' × '+endpoint.url+(endpoint.applicantData?t(' · 含申请数据'):''),'source-row'));
    if(data.errors?.length)section.append(el('pre',data.errors.map(msg).join('\n')));
    raw.append(section);
  }
}
async function send(action,extra={}){
  if(!targetTabId){const [tab]=await chrome.tabs.query({active:true,...(queryWindowId!==undefined?{windowId:queryWindowId}:{currentWindow:true})});targetTabId=tab?.id;}
  const result=await chrome.runtime.sendMessage({action,tabId:targetTabId,profileId:$('application').value || undefined,...extra});
  if(result?.error)throw new Error(result.error);return result;
}
async function refreshCapture(){
  const revision=profileRevision;
  const [data,context]=await Promise.all([send('read'),send('getContext')]);
  if(revision!==profileRevision)return;
  currentContext=context;const signature=JSON.stringify([data,context]);
  if(signature!==lastSnapshot){renderCapture(data);lastSnapshot=signature;}
}
$('version').textContent='v'+chrome.runtime.getManifest().version;
function paintSearchCountdown(p){
  const seconds=p.deadline?Math.max(0,Math.ceil((p.deadline-Date.now())/1000)):5;
  $('autoSubmitText').textContent=t(p.phase==='committing'?'正在提交查询…':'将在 {seconds} 秒后自动提交').replace('{seconds}',seconds);
  $('cancelAutoSubmit').disabled=p.phase==='committing';
}
async function cancelCountdown(){
  const p=currentContext.autoSubmit;if(!p)return;delete currentContext.autoSubmit;$('autoSubmitNotice').hidden=true;
  const result=await send('cancelSearchSubmit',{submissionId:p.id});
  setOutput(result?.cancelled?'自动提交已取消，请手动点击官网 Submit。':'已开始提交，请等待官网响应。');
  lastSnapshot='';await refreshCapture();
}
$('cancelAutoSubmit').onclick=()=>void cancelCountdown().catch(error=>setOutput(error.message));
async function tickSearchCountdown(){
  const p=currentContext.autoSubmit;if(!p||countdownBusy)return;
  if(!workspaceVisibilityKnown)return;
  if(!workspaceVisible||document.visibilityState==='hidden'||currentContext.observerReady===false||p.profileId!==$('application').value){await cancelCountdown();return;}
  if(p.viewId&&p.viewId!==searchViewId){await cancelCountdown();return;}
  paintSearchCountdown(p);countdownBusy=true;
  try{
    if(p.phase==='awaiting'){
      const result=await send('armSearchSubmit',{submissionId:p.id,viewId:searchViewId});
      if(currentContext.autoSubmit?.id===p.id&&result?.pending){currentContext.autoSubmit=result.pending;paintSearchCountdown(result.pending);}
    }else if(p.phase==='armed'&&p.deadline<=Date.now()){
      p.phase='committing';paintSearchCountdown(p);
      const result=await send('commitSearchSubmit',{submissionId:p.id,viewId:searchViewId});
      if(result?.pending)currentContext.autoSubmit=result.pending;else delete currentContext.autoSubmit;
      if(result?.message)setOutput(result.message);lastSnapshot='';await refreshCapture();
    }
  }finally{countdownBusy=false;}
}
setInterval(()=>void tickSearchCountdown().catch(error=>setOutput(error.message)),200);
if(typeof window!=='undefined'){
  window.addEventListener('message',event=>{if(inWorkspace&&event.source===window.parent&&event.origin===location.origin&&event.data?.type==='ircc-workspace-visibility'){workspaceVisibilityKnown=true;workspaceVisible=!!event.data.visible;if(!workspaceVisible&&currentContext.autoSubmit)void cancelCountdown().catch(()=>{});}});
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden'&&currentContext.autoSubmit)void cancelCountdown().catch(()=>{});});
}
$('openSettings').onclick=()=>navigateApp('settings.html');
$('configure').onclick=()=>navigateApp('options.html');
async function loadApplications(){
  const {applications=[],selectedApplicationId}=await chrome.storage.local.get(['applications','selectedApplicationId']);
  const select=$('application');select.replaceChildren();
  if(!applications.length){const option=el('option',t('选择申请'));option.value='';select.append(option);}
  for(const application of applications){const option=el('option',application.label);option.value=application.id;select.append(option);}
  if(applications.some(item=>item.id===selectedApplicationId))select.value=selectedApplicationId;
  else if(select.value)await chrome.storage.local.set({selectedApplicationId:select.value});
}
async function saveSelection(){await chrome.storage.local.set({selectedApplicationId:$('application').value});}
$('application').onchange=async()=>{
  const revision=++profileRevision;expandedPeople.clear();lastSnapshot='';setOutput('');$('code').value='';
  renderCapture({active:false,status:'idle',application:{},applicants:[],responses:[]});
  try{
    await saveSelection();const data=await send('read');if(revision!==profileRevision)return;
    renderCapture(data);

    if(revision===profileRevision)await refreshCapture();
  }catch(error){if(revision===profileRevision)setOutput(error.message);}
};
$('fill').onclick=async()=>{
  $('fill').disabled=true;$('fill').textContent=t('填写中…');setOutput('');
  try{const result=await send('fill',{applicationId:$('application').value});setOutput(result.message);}
  catch(error){setOutput(error.message);}
  finally{$('fill').textContent=t('填入 Tracker');$('fill').disabled=false;lastSnapshot='';await refreshCapture().catch(error=>setOutput(error.message));}
};
async function requestTrackerEntry(resume=false,forceNew=false){
  if(entryBusy)return;entryBusy=true;$('openTracker').disabled=true;$('reloginTracker').disabled=true;$('newTracker').disabled=true;
  try{
  let windowId=queryWindowId;
  if(windowId===undefined&&targetTabId!==undefined)try{windowId=(await chrome.tabs.get(targetTabId)).windowId;}catch{}
  if(windowId===undefined)windowId=(await chrome.windows.getCurrent()).id;
  const result=await chrome.runtime.sendMessage({action:'openTrackerPage',windowId,tabId:targetTabId,resume,forceNew});
  if(result?.error)throw Error(result.error);
  if(result?.needsAccess){renderContext({stage:'access'},displayedCapture||{});return;}
  targetTabId=result.tabId;lastSnapshot='';await refreshCapture();
  }finally{entryBusy=false;$('openTracker').disabled=false;$('reloginTracker').disabled=false;$('newTracker').disabled=false;}
}
async function openTracker(){await requestTrackerEntry(false);}
$('openTracker').onclick=async()=>{try{
  if(currentContext.stage==='access'){
    const permission=chrome.permissions.request({origins:TrackerAuthOrigins});
    $('openTracker').disabled=true;$('newTracker').disabled=true;
    try{if(!await permission){setOutput('未允许识别认证页，现有标签页保持不变。');return;}
      const windowId=queryWindowId??(await chrome.windows.getCurrent()).id;
      const resolved=await chrome.runtime.sendMessage({action:'resolveTrackerTab',windowId});
      if(resolved?.tabId===undefined){setOutput('未找到 Tracker 或官方登录页，请切回原页面，或选择新建 Tracker 页。');return;}
      targetTabId=resolved.tabId;lastSnapshot='';await refreshCapture();
    }finally{$('openTracker').disabled=false;$('newTracker').disabled=false;}
    return;
  }
  if(currentContext.stage==='expired'){await requestTrackerEntry(false);return;}
  if(currentContext.observerReady===false){if(currentContext.stage==='verification')await chrome.tabs.update(targetTabId,{active:true,url:'https://ircc-services.canada.ca/2/ast-search'});else await chrome.tabs.reload(targetTabId);return;}
  if(currentContext.stage==='form'&&displayedCapture?.status==='ready'){
    const result=await send('locateSubmit');setOutput(result?.ok?'请在 Tracker 官网核对资料，再点击高亮的 Submit。':'未找到官网 Submit，请检查左侧表单是否完整。');return;
  }
  if(!isSidePanel&&!inWorkspace&&chrome.sidePanel?.open&&queryWindowId!==undefined){
    // Both calls start inside the click gesture; the worker owns navigation if the popup closes.
    const navigation=chrome.runtime.sendMessage({action:'openTrackerPage',windowId:queryWindowId,tabId:targetTabId,resume:!!targetTabId&&['login','form','role'].includes(currentContext.stage)});
    const panel=chrome.sidePanel.open({windowId:queryWindowId}).then(()=>true,()=>false);
    const [result,opened]=await Promise.all([navigation,panel]);
    if(result?.error)throw new Error(result.error);
    targetTabId=result.tabId;
    if(!opened)setOutput('侧栏未能打开，可继续使用当前页面，或从扩展菜单打开侧栏。');
    lastSnapshot='';await refreshCapture();return;
  }
  if(targetTabId && ['login','form','role'].includes(currentContext.stage)){
    await requestTrackerEntry(true);
  }else await openTracker();
  lastSnapshot='';await refreshCapture();
}catch(error){setOutput(error.message);}};
$('reloginTracker').onclick=async()=>{try{await requestTrackerEntry(false);}catch(error){setOutput(error.message);}};
$('newTracker').onclick=async()=>{try{await requestTrackerEntry(false,true);}catch(error){setOutput(error.message);}};
$('stopCapture').onclick=async()=>{try{await send('stop');lastSnapshot='';await refreshCapture();}catch(error){setOutput(error.message);}};
$('verifyForm').onsubmit=async event=>{
  event.preventDefault();const code=$('code').value.trim();
  if(!/^\d{6}$/.test(code)){setOutput('请输入六位数字验证码。');return;}
  verificationBusy=true;$('verify').disabled=true;$('capture').disabled=true;$('code').value='';setOutput('');
  try{await send('verify',{code});}catch(error){setOutput(error.message);}
  finally{verificationBusy=false;lastSnapshot='';await refreshCapture().catch(error=>setOutput(error.message));}
};
$('capture').onclick=async()=>{
  $('capture').disabled=true;setOutput('');
  try{await send('start');}catch(error){setOutput(error.message);}
  finally{lastSnapshot='';await refreshCapture().catch(error=>setOutput(error.message));}
};
(async()=>{
  await I18n.init();
  await loadApplications();
  queryWindowId=(await chrome.windows?.getCurrent?.())?.id;
  const [current]=await chrome.tabs.query({active:true,...(queryWindowId!==undefined?{windowId:queryWindowId}:{currentWindow:true})});
  if(current?.url && /^https:\/\/(ircc-services\.canada\.ca|gc\.auth\.canada\.ca|clegc-gckey\.gc\.ca)\//.test(current.url))targetTabId=current.id;
  else{const tabs=await chrome.tabs.query({url:'https://ircc-services.canada.ca/*',...(queryWindowId!==undefined?{windowId:queryWindowId}:{currentWindow:true})});const verificationTabs=tabs.filter(tab=>{try{return new URL(tab.url).pathname==='/2/ast-otp-verification';}catch{return false;}});targetTabId=(verificationTabs.length===1?verificationTabs[0]:tabs.find(tab=>tab.active) || tabs[0])?.id;}
  if(queryWindowId!==undefined){const resolved=await chrome.runtime.sendMessage({action:'resolveTrackerTab',windowId:queryWindowId,tabId:targetTabId});if(resolved?.tabId!==undefined)targetTabId=resolved.tabId;}
  await refreshCapture();
})().catch(error=>setOutput(error.message));
setInterval(()=>{void (async()=>{
  if(isSidePanel){
    const [active]=await chrome.tabs.query({active:true,...(queryWindowId!==undefined?{windowId:queryWindowId}:{currentWindow:true})});
    if(active&&/^https:\/\/(ircc-services\.canada\.ca|gc\.auth\.canada\.ca|clegc-gckey\.gc\.ca)\//.test(active.url || '')&&targetTabId!==active.id){targetTabId=active.id;$('code').value='';lastSnapshot='';}
  }
  if(targetTabId)await refreshCapture();
})().catch(error=>setOutput(error.message));},1000);

I18n.onChange(()=>{for(const option of $('application').options || [])if(option.value==='')option.textContent=t('选择申请');lastSnapshot='';if(displayedCapture)renderCapture(displayedCapture);setOutput(outputSource);});

// Keep the selected profile and labels current when another extension page saves or clears data.
let profileReloading=false;
chrome.storage.onChanged?.addListener(async(changes,area)=>{
  if(area!=='local' || profileReloading || !(changes.applications || changes.selectedApplicationId))return;
  profileReloading=true;profileRevision++;expandedPeople.clear();$('code').value='';
  try{await loadApplications();lastSnapshot='';await refreshCapture();}catch(error){setOutput(error.message);}
  finally{profileReloading=false;}
});
