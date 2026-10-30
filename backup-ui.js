(()=>{
  const $=id=>document.getElementById(id),t=I18n.t;let pending=null,busy=false,source='',tone='info';
  const errors={'backup.password':'导出密码至少需要 10 个字符。','backup.repeat':'两次密码不一致。','backup.format':'不支持或已损坏的备份文件。','backup.size':'备份文件过大，最多 30 MB。','backup.decrypt':'无法解密，请检查密码及文件是否完整。','backup.busy':'请先停止正在进行的查询或验证，再恢复备份。','backup.write':'恢复失败，已尝试还原原有数据。','backup.file':'请先选择备份文件。'};
  function status(key,value='info'){source=key;tone=value;render();}
  function render(){const importing=$('backupMode').value==='import';$('backupRepeatArea').hidden=importing;$('backupFileArea').hidden=!importing;$('backupPreview').hidden=!pending;$('backupAction').hidden=!!pending;$('backupAction').textContent=t(busy?'处理中…':importing?'解密并预览':'导出加密备份');for(const id of ['backupMode','backupPassword','backupRepeat','backupFile','backupAction','backupConfirm','backupCancel'])$(id).disabled=busy;$('backupStatus').textContent=t(source);$('backupStatus').dataset.tone=tone;if(pending)$('backupSummary').textContent=t('申请数量：')+pending.applications.length+' · '+t('查询记录：')+Object.keys(pending.captures).length+' · '+t('对比记录：')+Object.keys(pending.comparisons).length;}
  function reset(){pending=null;source='';render();}
  for(const id of ['backupMode','backupPassword','backupRepeat','backupFile'])$(id).addEventListener(id==='backupPassword'||id==='backupRepeat'?'input':'change',reset);
  $('backupAction').onclick=async()=>{
    if(busy)return;busy=true;pending=null;status('正在处理本地备份…','busy');
    try{
      const password=$('backupPassword').value;
      if($('backupMode').value==='export'){
        if(password!==$('backupRepeat').value)throw Error('backup.repeat');
        const [local,session]=await Promise.all([chrome.storage.local.get(null),chrome.storage.session.get(null)]);
        const encrypted=await Backup.encrypt(Backup.collect(local,session),password);
        const url=URL.createObjectURL(new Blob([encrypted],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download='ircc-backup-'+new Date().toISOString().slice(0,10)+'.irccbackup';a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);$('backupPassword').value='';$('backupRepeat').value='';status('加密备份已生成，请在浏览器下载中确认文件。','success');
      }else{
        const file=$('backupFile').files[0];if(!file)throw Error('backup.file');if(file.size>30*1024*1024)throw Error('backup.size');
        pending=await Backup.decrypt(await file.text(),password);$('backupPassword').value='';status('解密成功，请核对后确认恢复。','success');
      }
    }catch(error){status(errors[error.message]||'备份操作失败，请重试。','error');}
    finally{busy=false;render();}
  };
  $('backupCancel').onclick=()=>{pending=null;$('backupPassword').value='';status('已取消，现有数据未改变。');};
  $('backupConfirm').onclick=async()=>{
    if(busy||!pending)return;busy=true;render();
    try{const result=await chrome.runtime.sendMessage({action:'restoreBackup',data:pending});if(result?.error)throw Error(result.error);pending=null;$('backupFile').value='';status('本地数据已恢复。','success');}
    catch(error){status(errors[error.message]||'备份操作失败，请重试。','error');}finally{busy=false;render();}
  };
  I18n.onChange(render);render();
})();
