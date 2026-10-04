/* HLGB v92.62 — recuperação segura ao voltar para a aba no Safari */
(function(){
'use strict';
const V='92.62';
const KEY='hlgb_last_active_page_9262';
let hiddenAt=0,lastActive='';let recovering=false;
function visible(el){if(!el)return false;try{const s=getComputedStyle(el);return !el.hidden&&s.display!=='none'&&s.visibility!=='hidden'&&Number(s.opacity||1)!==0}catch(e){return !el.hidden}}
function loggedIn(){const login=document.getElementById('loginScreen');if(login&&visible(login))return false;return !!document.getElementById('appShell')}
function activePage(){return document.querySelector('#appShell .page.active')?.id||''}
function remember(){const id=activePage();if(id){lastActive=id;try{localStorage.setItem(KEY,id)}catch(e){}}}
function remembered(){if(lastActive)return lastActive;try{return localStorage.getItem(KEY)||''}catch(e){return ''}}
function logEvent(type,extra){try{const row={at:new Date().toISOString(),type,hiddenMs:hiddenAt?Date.now()-hiddenAt:0,page:activePage()||remembered(),extra:extra||''};const a=JSON.parse(localStorage.getItem('hlgb_tab_resume_log_9262')||'[]');a.push(row);while(a.length>20)a.shift();localStorage.setItem('hlgb_tab_resume_log_9262',JSON.stringify(a));window.HLGB_TAB_RECOVERY_EVENTS=a}catch(e){}}
function clearStuckSettle(){
 document.querySelectorAll('.hlgb-page-settling').forEach(el=>el.classList.remove('hlgb-page-settling'));
 const ov=document.getElementById('hlgbPageSettleOverlay');if(ov)ov.hidden=true;
}
function restorePage(){
 let id=activePage();if(id)return id;
 id=remembered();let target=id&&document.getElementById(id);
 if(!target){id='dashboard';target=document.getElementById(id)}
 if(!target)return '';
 document.querySelectorAll('#appShell .page').forEach(x=>x.classList.remove('active'));
 target.classList.add('active');
 return id;
}
function shellLooksBlank(){
 const shell=document.getElementById('appShell');if(!shell||!loggedIn())return false;
 const p=document.querySelector('#appShell .page.active');
 if(!p)return true;
 try{const r=p.getBoundingClientRect();return r.width<20||r.height<20||!visible(p)}catch(e){return false}
}
function gentleRefresh(){
 try{if(typeof window.hlgbManualRefreshCurrentPage==='function'){window.hlgbManualRefreshCurrentPage();return true}}catch(e){}
 const pg=activePage(),map={dashboard:'renderDash',pedidos:'renderOrders',producao:'renderProduction',corte:'renderCuts',projecao:'renderProjection',capacidadeProducao:'renderCapacityPlanning',produtos:'renderProducts',hubFinanceiro:'renderHubFinance',relatorios:'renderReports'};
 const name=map[pg],fn=name&&window[name];if(typeof fn==='function'){try{fn();return true}catch(e){console.warn('[HLGB 9262 refresh]',e)}}return false;
}
function recover(reason){
 if(recovering||document.visibilityState==='hidden'||!loggedIn())return false;recovering=true;
 try{
  clearStuckSettle();
  const before=activePage();const id=restorePage();
  const shell=document.getElementById('appShell');if(shell){shell.style.removeProperty('visibility');shell.style.removeProperty('opacity');if(shell.style.display==='none')shell.style.removeProperty('display')}
  document.body?.style?.removeProperty('visibility');document.documentElement?.style?.removeProperty('visibility');
  requestAnimationFrame(()=>requestAnimationFrame(()=>{
    clearStuckSettle();
    if(shellLooksBlank())gentleRefresh();
    logEvent('resume-'+reason,'before='+before+' restored='+id+' blank='+shellLooksBlank());
  }));
  return true;
 }finally{setTimeout(()=>{recovering=false},250)}
}
document.addEventListener('visibilitychange',()=>{
 if(document.visibilityState==='hidden'){hiddenAt=Date.now();remember();logEvent('hidden');return}
 setTimeout(()=>recover('visibility'),60);
});
window.addEventListener('pagehide',()=>{hiddenAt=Date.now();remember();logEvent('pagehide')});
window.addEventListener('pageshow',e=>{setTimeout(()=>recover(e.persisted?'pageshow-bfcache':'pageshow'),60)});
window.addEventListener('focus',()=>{setTimeout(()=>recover('focus'),100)});
// Guarda a última página válida sem forçar redraws.
document.addEventListener('click',()=>setTimeout(remember,0),true);
setInterval(()=>{if(document.visibilityState==='visible'&&loggedIn()){remember();if(shellLooksBlank())recover('watchdog')}},5000);
window.hlgbTabResume9262={recover,remember,activePage,shellLooksBlank,log:()=>{try{return JSON.parse(localStorage.getItem('hlgb_tab_resume_log_9262')||'[]')}catch(e){return []}}};
try{const cur=Number(window.HLGB_RELEASE_VERSION)||0;if(cur<=92.62){window.HLGB_RELEASE_VERSION=V;const l=document.querySelector('#appShell .logo small');if(l)l.textContent='v'+V}}catch(e){}
console.info('[HLGB] recuperação de aba Safari v'+V+' ativa');
})();