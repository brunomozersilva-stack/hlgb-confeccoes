/* HLGB v93.07 — reconciliação imediata após sincronização corte → produção */
(function(){
'use strict';
const V='93.07';
if(window.HLGB_PRODUCTION_CUT_RECONCILE_9307)return;
window.HLGB_PRODUCTION_CUT_RECONCILE_9307=V;
let installs=0,runs=0,lastRun='',lastReason='';

function guard(){return window.hlgbSyncGuard9306||null}
async function reconcile(reason){
 const g=guard();if(!g)return false;
 runs++;lastRun=new Date().toISOString();lastReason=reason||'post-cut-sync';
 try{if(typeof g.repair==='function')await g.repair(reason||'post-cut-sync')}catch(e){console.warn('[HLGB '+V+'] reparo local',e)}
 try{if(typeof g.refreshAuthority==='function')await g.refreshAuthority((reason||'post-cut-sync')+'-cloud')}catch(e){console.warn('[HLGB '+V+'] atualização da autoridade',e)}
 try{if(typeof g.repair==='function')await g.repair((reason||'post-cut-sync')+'-confirmed')}catch(e){console.warn('[HLGB '+V+'] reparo confirmado',e)}
 return true;
}
function settle(reason){
 [0,60,250,900,1800].forEach(ms=>setTimeout(()=>reconcile(reason+'-'+ms).catch(()=>{}),ms));
}
function install(){
 const f=window.syncFinalizedCutsToProduction;
 if(typeof f!=='function'||f.__hlgb9307)return false;
 const wrapped=function(){
  let out;
  try{out=f.apply(this,arguments)}catch(e){settle('cut-sync-error');throw e}
  if(out&&typeof out.then==='function'){
   return Promise.resolve(out).then(
    value=>{settle('post-cut-sync');return value},
    err=>{settle('cut-sync-rejected');throw err}
   );
  }
  settle('post-cut-sync');
  return out;
 };
 wrapped.__hlgb9307=true;
 wrapped.__hlgb9307Original=f;
 window.syncFinalizedCutsToProduction=wrapped;
 installs++;
 console.info('[HLGB] v'+V+' proteção corte→produção instalada');
 return true;
}
function stamp(){
 try{
  const cur=Number(window.HLGB_RELEASE_VERSION)||0;
  if(cur<93.07){window.HLGB_RELEASE_VERSION=V;const l=document.querySelector('#appShell .logo small');if(l)l.textContent='v'+V}
 }catch(e){}
}
function status(){return {version:V,installs,runs,lastRun,lastReason,wrapped:!!window.syncFinalizedCutsToProduction?.__hlgb9307,guard:window.hlgbSyncGuard9306?.status?.()||null}}
function boot(){install();stamp();setInterval(install,1200);setTimeout(()=>reconcile('boot').catch(()=>{}),700);window.hlgbProductionCutReconcile9307={version:V,status,reconcile,install}}
if(typeof window.hlgbAfterLogin==='function')window.hlgbAfterLogin(()=>setTimeout(boot,400),0);else setTimeout(boot,1200);
})();
