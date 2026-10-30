// One persistent host. Views are retained in memory, not reopened as browser tabs.
(()=>{
  const views=new Map(),allowed=new Set(['popup.html','options.html','settings.html','privacy.html']);
  function show(page,hash=''){
    if(!allowed.has(page))return;
    let frame=views.get(page);
    if(!frame){frame=document.createElement('iframe');frame.title=page;frame.dataset.view=page;const url=new URL(page,location.href);url.searchParams.set('surface',document.documentElement.dataset.surface==='panel'?'panel':'page');url.searchParams.set('embedded','1');url.hash=hash;frame.src=url.href;views.set(page,frame);document.getElementById('workspaceViews').append(frame);}
    for(const [key,value] of views)value.hidden=key!==page;
    if(hash)requestAnimationFrame(()=>{try{frame.contentWindow.location.hash=hash;frame.contentDocument?.getElementById(hash.slice(1))?.scrollIntoView();}catch{}});
    for(const button of document.querySelectorAll('[data-view]')){if(button.dataset.view===page)button.setAttribute('aria-current','page');else button.removeAttribute('aria-current');}
  }
  for(const button of document.querySelectorAll('[data-view]'))button.onclick=()=>show(button.dataset.view);
  window.addEventListener('message',event=>{
    if(event.origin!==location.origin||event.data?.type!=='ircc-workspace-navigate'||![...views.values()].some(frame=>frame.contentWindow===event.source))return;
    show(event.data.page,event.data.hash || '');
  });
  document.getElementById('workspaceVersion').textContent='v'+chrome.runtime.getManifest().version;
  const view=new URLSearchParams(location.search).get('view');
  void I18n.init();show(['settings','options','privacy'].includes(view)?view+'.html':'popup.html',location.hash);
})();
