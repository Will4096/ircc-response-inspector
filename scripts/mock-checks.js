(async()=>{
  const results=[],report=document.querySelector('#report');
  const assert=(condition,label)=>{if(!condition)throw Error(label);results.push('PASS '+label);};
  const frame=document.createElement('iframe');frame.style='width:800px;height:650px;border:0';document.body.append(frame);
  const load=path=>new Promise((resolve,reject)=>{const timeout=setTimeout(()=>reject(Error('Timed out: '+path)),5000);frame.onload=()=>{clearTimeout(timeout);resolve(frame.contentWindow);};frame.src=path;});
  const settle=()=>new Promise(r=>setTimeout(r,100));
  try{
    let w=await load('/2/ast-search');assert(w.document.querySelectorAll('input').length===6,'synthetic application form');
    w=await load('/2/ast-otp-verification');w.document.querySelector('input').value='000000';w.document.querySelector('form').requestSubmit();assert(w.readVerificationState().error,'wrong code detected');
    w.document.querySelector('input').value='123456';const navigated=new Promise(r=>frame.onload=()=>r(frame.contentWindow));w.document.querySelector('form').requestSubmit();w=await navigated;assert(w.readOverview().applicants.length===2,'correct code leads to two applicants');
    w=await load('/2/ast-view-application?relation_id=2');assert(w.readApplicant().name==='Applicant B','applicant isolation');assert(w.readApplicant().checks.background==='In Progress','milestone scanner');
    w=await load('/2/ast-history?relation_id=2');assert(w.readHistory().hasMore,'history pagination detected');w.document.querySelector('#more').click();assert(w.readHistory().items.length===2&&!w.readHistory().hasMore,'history pagination completed');
    w=await load('/2/ast-otp-verification?expired=1');assert(w.document.body.textContent.includes('Session expired')&&!w.document.querySelector('form'),'expired session has no verification form');
    for(const lang of ['zh','en'])for(const stage of ['verification','results']){
      // Start narrow to reproduce Chrome's intrinsic popup sizing, rather than a full browser tab.
      frame.style.width='260px';w=await load('/popup.html?surface=popup&lang='+lang+'&stage='+stage);await settle();
      assert(w.document.documentElement.scrollWidth===780,lang+' '+stage+' popup retains intrinsic width');
      frame.style.width='780px';await settle();assert(w.document.documentElement.scrollWidth===780,lang+' '+stage+' popup has no horizontal overflow');
      assert(w.document.querySelector('.app-nav').getBoundingClientRect().height<50,lang+' '+stage+' navigation fits one row');
      frame.style.width='1400px';w=await load('/popup.html?lang='+lang+'&stage='+stage);await settle();
      let box=w.document.querySelector('.app-shell').getBoundingClientRect();
      assert(Math.abs(box.left-(w.document.documentElement.clientWidth-box.width)/2)<2&&box.width===1080,lang+' '+stage+' tab uses centered shared shell');
      frame.style.width='390px';await settle();
      assert(w.document.documentElement.scrollWidth===w.document.documentElement.clientWidth,lang+' '+stage+' narrow tab has no page overflow');
      for(const width of [350,450]){
        frame.style.width=width+'px';w=await load('/popup.html?surface=panel&lang='+lang+'&stage='+stage);await settle();
        assert(w.document.documentElement.dataset.surface==='panel'&&w.document.documentElement.scrollWidth===w.document.documentElement.clientWidth,lang+' '+stage+' side panel fits '+width+'px');
      }
    }
    w=await load('/settings.html?mail=error');await settle();
    const $=id=>w.document.getElementById(id);
    $('mailPassword').value='synthetic-app-password';$('mailEmail').value='example@163.com';
    await $('mailHelperStatus').onclick();await settle();
    assert($('mailHelperState').textContent==='本机程序未连接'&&$('mailConnect').hidden,'helper failure has consistent state and no invalid connect button');
    assert($('mailPassword').value==='synthetic-app-password','helper failure preserves typed password');
    assert($('mailExtensionId').textContent==='aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'&&$('mailInstallHelp').open&&$('mailInstallHelp').closest('.notice').querySelector('#mailHelperStatus'),'installation help expands beside helper check');
    assert($('installerCommand').textContent.includes("-ExtensionId 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'")&&$('installerCommand').textContent.includes('Get-FileHash')&&!$('installerCopy').disabled,'copy command includes extension ID and pinned integrity check');
    assert(!$('mailSetupGuide').hasAttribute('href')&&!$('aboutHelp').hasAttribute('target'),'help navigation does not create new tabs');
    w=await load('/settings.html');await settle();
    $('mailEnabled').checked=true;$('mailEnabled').onchange();$('mailEmail').value='example@163.com';$('mailPassword').value='synthetic-app-password';
    $('mailHelperStatus').onclick();await settle();await settle();
    assert($('mailHelperState').textContent==='本机程序可用'&&$('mailEnabled').checked&&$('mailEmail').value==='example@163.com'&&$('mailPassword').value==='synthetic-app-password','helper success preserves unsaved setup and enables next step');
    const data=w.Backup.collect(await w.chrome.storage.local.get(null),await w.chrome.storage.session.get(null));
    // Crypto is tested with real WebCrypto in backup-tests.mjs. Isolate UI state from virtual-time scheduling.
    const encrypted='synthetic encrypted fixture';
    w.Backup.decrypt=async(text,password)=>{if(password!=='synthetic-backup-password')throw Error('backup.decrypt');return data;};
    const transfer=new w.DataTransfer();transfer.items.add(new w.File([encrypted],'demo.irccbackup',{type:'application/json'}));
    let restores=0;const send=w.chrome.runtime.sendMessage;w.chrome.runtime.sendMessage=async message=>{if(message.action==='restoreBackup')restores++;return send(message);};
    $('backupMode').value='import';$('backupMode').dispatchEvent(new w.Event('change'));$('backupFile').files=transfer.files;$('backupPassword').value='synthetic-backup-password';
    await $('backupAction').onclick();assert(!$('backupPreview').hidden&&restores===0,'encrypted import previews before any write');
    $('backupCancel').onclick();assert($('backupPreview').hidden&&restores===0,'cancel does not restore');
    $('backupPassword').value='wrong-password';await $('backupAction').onclick();assert($('backupPreview').hidden&&restores===0,'wrong password cannot restore');
    $('backupPassword').value='synthetic-backup-password';await $('backupAction').onclick();await $('backupConfirm').onclick();assert(restores===1&&$('backupPreview').hidden,'explicit confirmation restores once');
    w=await load('/mail-help.html');assert(w.document.characterSet==='UTF-8'&&w.document.body.textContent.includes('先安装，再连接'),'Chinese help renders as UTF-8 HTML');
    w=await load('/mail-help.en.html');assert(w.document.documentElement.lang==='en','English help is a separate page');
    for(const lang of ['zh','en']){
      frame.style.width='350px';w=await load('/settings.html?mail=error&lang='+lang);await settle();
      assert(w.document.documentElement.scrollWidth===w.document.documentElement.clientWidth,lang+' settings and backup fit narrow viewport');
    }
    frame.style.width='850px';w=await load('/settings.html?mail=error');await settle();w.document.getElementById('mailInstallHelp').open=true;w.document.getElementById('mailInstallHelp').scrollIntoView();
    report.textContent='ALL PASSED\n'+results.join('\n');document.title='PASS local Tracker checks';
  }catch(error){report.textContent='FAILED '+error.message+'\n'+results.join('\n');document.title='FAIL local Tracker checks';}
})();
