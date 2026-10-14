/* HLGB v92.66 — trava final contra tela branca ao suspender/retomar aba */
(function(){
'use strict';
const V='92.66';
let generation=0,resumeUntil=0,guardTimer=null,observer=null;
function overlayOff(){const o=document.getElementById('hlgbPageSettleOverlay');if(o)o.hidden=true}
function clearSettling(reason){
 generation++;
 document.querySelectorAll('.hlgb-page-settling').forEach(el=>el.classList.remove('hlgb-page-settling'));
 overlayOff();
 try{document.documentElement.classList.remove('hlgb-tab-suspended-9266','hlgb-tab-resuming-9266')}catch(e){}
 window.HLGB_SAFARI_RESUME_LAST={at:new Date().toISOString(),reason,generation};
}
function ensureStyle(){
 if(document.getElementById('hlgbSafariResume9266Style'))return;
 const s=document.createElement('style');s.id='hlgbSafariResume9266Style';
 s.textContent='html.hlgb-tab-suspended-9266 .page.hlgb-page-settling,html.hlgb-tab-resuming-9266 .page.hlgb-page-settling{visibility:visible!important}html.hlgb-tab-suspended-9266 #hlgbPageSettleOverlay,html.hlgb-tab-resuming-9266 #hlgbPageSettleOverlay{display:none!important}';
 document.head.appendChild(s);
}
function hidden(){
 ensureStyle();generation++;resumeUntil=0;
 try{document.documentElement.classList.add('hlgb-tab-suspended-9266');document.documentElement.classList.remove('hlgb-tab-resuming-9266')}catch(e){}
 document.querySelectorAll('.hlgb-page-settling').forEach(el=>el.classList.remove('hlgb-page-settling'));overlayOff();
 window.HLGB_SAFARI_RESUME_LAST={at:new Date().toISOString(),reason:'hidden',generation};
}
function resumed(reason){
 ensureStyle();const g=++generation;resumeUntil=Date.now()+2200;
 try{document.documentElement.classList.remove('hlgb-tab-suspended-9266');document.documentElement.classList.add('hlgb-tab-resuming-9266')}catch(e){}
 clearSettling('resume-'+reason+'-initial');
 requestAnimationFrame(()=>requestAnimationFrame(()=>{
   if(g+1<generation)return;
   clearSettling('resume-'+reason+'-raf');
   try{window.hlgbTabResume9262?.recover?.('v9266-'+reason)}catch(e){}
   setTimeout(()=>{
     clearSettling('resume-'+reason+'-final');
     try{document.documentElement.classList.remove('hlgb-tab-resuming-9266')}catch(e){}
   },850);
 }));
}
function armStaleGuard(el){
 if(!el?.classList?.contains('hlgb-page-settling'))return;
 const born=Date.now(),g=generation;
 setTimeout(()=>{
   if(!el.isConnected||!el.classList.contains('hlgb-page-settling'))return;
   if(document.visibilityState==='hidden'||Date.now()-born>=850||Date.now()<resumeUntil){
     el.classList.remove('hlgb-page-settling');overlayOff();
     window.HLGB_SAFARI_RESUME_LAST={at:new Date().toISOString(),reason:'stale-settle-cleared',generation:g};
   }
 },900);
}
function watch(){
 if(observer)return;observer=new MutationObserver(records=>{
   for(const r of records){
     const el=r.target;if(el?.classList?.contains?.('hlgb-page-settling')){
       if(document.visibilityState==='hidden'||Date.now()<resumeUntil){el.classList.remove('hlgb-page-settling');overlayOff()}
       else armStaleGuard(el);
     }
     for(const n of r.addedNodes||[])if(n?.nodeType===1){if(n.classList?.contains('hlgb-page-settling'))armStaleGuard(n);n.querySelectorAll?.('.hlgb-page-settling')?.forEach(armStaleGuard)}
   }
 });
 try{observer.observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['class']})}catch(e){}
}
function watchdog(){
 if(document.visibilityState!=='visible')return;
 const stuck=[...document.querySelectorAll('.hlgb-page-settling')];
 if(stuck.length&&Date.now()<resumeUntil){stuck.forEach(x=>x.classList.remove('hlgb-page-settling'));overlayOff()}
 const shell=document.getElementById('appShell'),active=document.querySelector('#appShell .page.active');
 if(shell&&active){
   try{const cs=getComputedStyle(active),r=active.getBoundingClientRect();if(cs.visibility==='hidden'||r.width<20||r.height<20){clearSettling('blank-watchdog');window.hlgbTabResume9262?.recover?.('v9266-watchdog')}}catch(e){}
 }
}
function ensureWalAuthorityUpgrade9348(){
 try{
  const cur=parseFloat(String(window.hlgbWalSingleAuthority9339?.version||window.HLGB_WAL_SINGLE_AUTHORITY_9339||'0'))||0;
  if(cur>=93.48)return true;
  window.HLGB_WAL_SINGLE_AUTHORITY_9339='';
  const old=document.querySelector('script[data-hlgb-wal-authority-upgrade="9348"]');if(old)old.remove();
  const s=document.createElement('script');s.dataset.hlgbWalAuthorityUpgrade='9348';s.src='./release-wal-single-authority-v9339.js?fresh='+Date.now();
  s.onerror=()=>console.warn('[HLGB] não foi possível carregar autoridade WAL v93.48');
  (document.head||document.documentElement).appendChild(s);return true;
 }catch(e){console.warn('[HLGB] upgrade WAL v93.48 indisponível',e);return false}
}
ensureStyle();watch();
document.addEventListener('visibilitychange',()=>document.visibilityState==='hidden'?hidden():resumed('visibility'),true);
window.addEventListener('pagehide',hidden,true);
window.addEventListener('pageshow',e=>{resumed(e.persisted?'bfcache':'pageshow');ensureWalAuthorityUpgrade9348()},true);
window.addEventListener('focus',()=>{if(document.visibilityState==='visible')resumed('focus');ensureWalAuthorityUpgrade9348()},true);
guardTimer=setInterval(watchdog,1800);
setTimeout(ensureWalAuthorityUpgrade9348,120);
setTimeout(ensureWalAuthorityUpgrade9348,1200);
window.hlgbSafariResume9266={version:V,clearSettling,resumed,hidden,watchdog,generation:()=>generation,ensureWalAuthorityUpgrade9348};
window.HLGB_SAFARI_WHITE_SCREEN_GUARD_9266=true;
console.info('[HLGB] guarda Safari v92.66 ativo — settle preso não pode deixar a tela branca');
})();
