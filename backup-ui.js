(()=>{
  const $=id=>document.getElementById(id),t=I18n.t;
  let pending=null,busy=false,source='',tone='info',profiles=[],rawAvailable=false,rawBusy=false,rawSource='',rawTone='info',infoSource='',infoDetails=null,refreshId=0;
  const errors={'backup.password':'导出密码至少需要 10 个字符。','backup.repeat':'两次密码不一致。','backup.format':'不支持或已损坏的加密文件。','backup.size':'文件过大，最多 30 MB。','backup.decrypt':'无法解密，请检查密码及文件是否完整。','backup.busy':'请先停止正在进行的查询或验证，再导入申请资料。','backup.write':'导入失败，已尝试还原原有数据。','backup.file':'请先选择加密文件。','transfer.profile':'请先选择申请。','transfer.empty':'最新一次查询尚无原始响应，请先查询。','transfer.profiles':'尚无申请资料可导出。'};
  function download(text,name){const url=URL.createObjectURL(new Blob([text],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);}
  function status(key,value='info'){source=key;tone=value;render();}
  function rawStatus(key,value='info'){rawSource=key;rawTone=value;renderRaw();}
  function render(){
    const importing=$('backupMode').value==='import';$('backupRepeatArea').hidden=importing;$('backupFileArea').hidden=!importing;$('backupPreview').hidden=!pending;$('backupAction').hidden=!!pending;
    $('backupAction').textContent=t(busy?'处理中…':importing?'解密并预览':'导出加密申请资料');
    for(const id of ['backupMode','backupPassword','backupRepeat','backupFile','backupAction','backupConfirm','backupCancel'])$(id).disabled=busy;
    if(!importing&&!profiles.length)$('backupAction').disabled=true;
    $('backupStatus').textContent=t(source||(!profiles.length&&!importing?'尚无申请资料可导出。':''));$('backupStatus').dataset.tone=tone;
    if(pending){
      const ids=new Set(profiles.map(p=>p.id)),updates=pending.applications.filter(p=>ids.has(p.id)).length;
      $('backupSummary').textContent=t('新增：')+(pending.applications.length-updates)+' · '+t('同 ID 更新：')+updates;
      $('backupProfileList').replaceChildren();for(const p of pending.applications){const li=document.createElement('li');li.textContent=p.label;$('backupProfileList').append(li);}
    }
  }
  function renderRaw(){
    const encrypted=$('rawEncrypted').checked;$('rawPasswordArea').hidden=!encrypted||!rawAvailable;
    $('rawAction').textContent=t(rawBusy?'处理中…':encrypted?'导出加密原始数据':'导出原始 JSON');
    for(const id of ['rawProfile','rawEncrypted','rawPassword','rawRepeat','rawAction','rawDecryptAction','rawDecryptFile','rawDecryptPassword'])$(id).disabled=rawBusy;
    $('rawAction').disabled=rawBusy||!rawAvailable;$('rawInfo').textContent=t(infoSource)+(infoDetails?' '+t('响应数量：')+infoDetails.count+(infoDetails.at?' · '+t('查询时间：')+I18n.date(infoDetails.at):''):'');$('rawStatus').textContent=t(rawSource);$('rawStatus').dataset.tone=rawTone;
  }
  async function refresh(){
    const revision=++refreshId,previous=$('rawProfile').value;
    const local=await chrome.storage.local.get(['applications','selectedApplicationId']);if(revision!==refreshId)return;
    profiles=local.applications||[];const select=$('rawProfile');select.replaceChildren();
    for(const p of profiles){const option=document.createElement('option');option.value=p.id;option.textContent=p.label;select.append(option);}
    if(profiles.some(p=>p.id===previous))select.value=previous;else if(profiles.some(p=>p.id===local.selectedApplicationId))select.value=local.selectedApplicationId;
    await refreshRaw();render();
  }
  async function refreshRaw(){
    const profileId=$('rawProfile').value;
    try{const [local,session]=await Promise.all([chrome.storage.local.get('applications'),chrome.storage.session.get(null)]);if(profileId!==$('rawProfile').value)return;const data=DataTransferCore.latestRaw(local,session,profileId);rawAvailable=true;infoDetails={count:data.responses.length,at:data.query.startedAt||data.responses[0]?.capturedAt};infoSource=data.query.active?'查询正在进行，将导出点击时已捕获的响应。':data.query.status==='completed'?'已找到最新查询的原始响应。':'最新查询未完成，仅导出已捕获的原始响应。';}
    catch(error){rawAvailable=false;infoDetails=null;infoSource=errors[error.message]||'原始数据读取失败，请重试。';}renderRaw();
  }
  function reset(){pending=null;source='';render();}
  for(const id of ['backupMode','backupPassword','backupRepeat','backupFile'])$(id).addEventListener(id==='backupPassword'||id==='backupRepeat'?'input':'change',reset);
  $('backupAction').onclick=async()=>{
    if(busy)return;busy=true;pending=null;status('正在处理申请资料…','busy');
    try{
      const password=$('backupPassword').value;
      if($('backupMode').value==='export'){
        if(password!==$('backupRepeat').value)throw Error('backup.repeat');
        const local=await chrome.storage.local.get('applications');if(!local.applications?.length)throw Error('transfer.profiles');
        const encrypted=await DataTransferCore.encryptProfiles({format:'ircc-profiles',version:1,applications:local.applications},password);
        download(encrypted,'ircc-profiles-'+new Date().toISOString().slice(0,10)+'.irccprofiles');$('backupPassword').value='';$('backupRepeat').value='';status('加密申请资料已生成，请在浏览器下载中确认。','success');
      }else{
        const file=$('backupFile').files[0];if(!file)throw Error('backup.file');if(file.size>30*1024*1024)throw Error('backup.size');
        pending=await DataTransferCore.decryptProfiles(await file.text(),password);$('backupPassword').value='';status('解密成功，请核对后确认导入。','success');
      }
    }catch(error){status(errors[error.message]||'申请资料操作失败，请重试。','error');}
    finally{busy=false;render();}
  };
  $('backupCancel').onclick=()=>{pending=null;$('backupPassword').value='';status('已取消，现有数据未改变。');};
  $('backupConfirm').onclick=async()=>{
    if(busy||!pending)return;busy=true;render();
    try{const result=await chrome.runtime.sendMessage({action:'importProfiles',data:pending});if(result?.error)throw Error(result.error);pending=null;$('backupFile').value='';status('申请资料已导入，其他申请和设置保持不变。','success');await refresh();}
    catch(error){status(errors[error.message]||'申请资料操作失败，请重试。','error');}finally{busy=false;render();}
  };
  $('rawProfile').onchange=()=>{rawSource='';void refreshRaw();};
  $('rawEncrypted').onchange=()=>{if(!$('rawEncrypted').checked){$('rawPassword').value='';$('rawRepeat').value='';}rawSource='';renderRaw();};
  $('rawAction').onclick=async()=>{
    if(rawBusy)return;rawBusy=true;rawStatus('正在导出原始数据…','busy');
    try{
      const profileId=$('rawProfile').value;
      await RawExport.write(profileId,{encrypted:$('rawEncrypted').checked,password:$('rawPassword').value,repeat:$('rawRepeat').value,accept:()=>$('rawProfile').value===profileId});$('rawPassword').value='';$('rawRepeat').value='';rawStatus('原始数据已生成，请在浏览器下载中确认。','success');
    }catch(error){rawStatus(errors[error.message]||(String(error.message||'').startsWith('export.')?'查询或申请已变化，请重新打开导出。':'原始数据导出失败，请重试。'),'error');}finally{rawBusy=false;renderRaw();}
  };
  $('rawDecryptAction').onclick=async()=>{
    if(rawBusy)return;rawBusy=true;renderRaw();
    try{const file=$('rawDecryptFile').files[0];if(!file)throw Error('backup.file');if(file.size>30*1024*1024)throw Error('backup.size');const data=await DataTransferCore.decryptRaw(await file.text(),$('rawDecryptPassword').value);download(JSON.stringify(data,null,2),'ircc-raw-decrypted.json');$('rawDecryptPassword').value='';rawStatus('已在本机解密为 JSON，插件数据未改变。','success');}
    catch(error){rawStatus(errors[error.message]||'原始数据导出失败，请重试。','error');}finally{rawBusy=false;renderRaw();}
  };
  chrome.storage.onChanged.addListener((changes,area)=>{if(area==='local'&&(changes.applications||changes.selectedApplicationId)){pending=null;void refresh().catch(()=>status('申请资料读取失败，请重试。','error'));}if(area==='session'&&Object.keys(changes).some(k=>k.startsWith('capture:')))void refreshRaw();});
  I18n.onChange(()=>{render();renderRaw();});render();renderRaw();void refresh().catch(()=>status('申请资料读取失败，请重试。','error'));
})();
