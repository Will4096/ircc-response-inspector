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
      frame.style.width='260px';w=await load('/popup.html?lang='+lang+'&stage='+stage);await settle();
      assert(w.document.documentElement.scrollWidth===780,lang+' '+stage+' popup retains intrinsic width');
      frame.style.width='780px';await settle();assert(w.document.documentElement.scrollWidth===780,lang+' '+stage+' popup has no horizontal overflow');
      assert(w.document.querySelector('.app-nav').getBoundingClientRect().height<50,lang+' '+stage+' navigation fits one row');
    }
    report.textContent='ALL PASSED\n'+results.join('\n');document.title='PASS local Tracker checks';
  }catch(error){report.textContent='FAILED '+error.message+'\n'+results.join('\n');document.title='FAIL local Tracker checks';}
})();
