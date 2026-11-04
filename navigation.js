function navigateApp(destination){
  const url=new URL(destination,location.href);
  const page=url.pathname.split('/').pop();
  if(url.origin!==location.origin||!['popup.html','options.html','settings.html','privacy.html'].includes(page))return;
  if(new URLSearchParams(location.search).get('embedded')==='1')window.parent.postMessage({type:'ircc-workspace-navigate',page,hash:url.hash},location.origin);
  else {const host=new URL('workspace.html',location.href);host.searchParams.set('view',page==='popup.html'?'query':page.replace('.html',''));host.hash=url.hash;if(new URLSearchParams(location.search).get('surface')==='panel')host.searchParams.set('surface','panel');location.href=host.href;}
}
document.addEventListener('click',event=>{
  const link=event.target.closest?.('a[href]');if(!link||event.defaultPrevented||event.button!==0||event.ctrlKey||event.metaKey||event.shiftKey)return;
  const href=link.getAttribute('href');if(!href||href.startsWith('#'))return;
  const url=new URL(href,location.href);if(url.origin!==location.origin||!['popup.html','options.html','settings.html','privacy.html'].includes(url.pathname.split('/').pop()))return;
  event.preventDefault();navigateApp(url.href);
});
