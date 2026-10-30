// Resolve the extension host before layout: a tab must never inherit popup sizing.
(()=>{
  let popup=false;
  try{popup=!!globalThis.chrome?.extension?.getViews({type:'popup'}).includes(window);}catch{}
  document.documentElement.dataset.surface=new URLSearchParams(location.search).get('surface')==='panel'?'panel':popup?'popup':'page';
  document.documentElement.dataset.embedded=new URLSearchParams(location.search).get('embedded')==='1'?'true':'false';
})();
