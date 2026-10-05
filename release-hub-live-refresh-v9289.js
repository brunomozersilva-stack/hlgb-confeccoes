/* HLGB v92.91 — atualização leve do Hub, sem polling agressivo nem render duplicado */
(function(){
'use strict';
const V='92.91';
const sid=v=>String(v??'');
let renderTimer=null, renderRunning=false, renderQueued=false, saveWatchTimer=null, saveWatchStarted=0, lastLength=-1;
function dbRef(){try{if(typeof db!=='undefined'&&db)return db}catch(e){}try{return window.db||null}catch(e){return null}}
function hub(){const d=dbRef();if(!d)return [];d.hubFinanceEntries=Array.isArray(d.hubFinanceEntries)?d.hubFinanceEntries:[];return d.hubFinanceEntries}
function hubVisible(){const p=document.getElementById('hubFinanceiro');return !!p&&(p.classList.contains('active')||p.offsetParent!==null)}
function editing(){return !!window.HLGB_HUB_EDITING||!!document.getElementById('hlgbHubEditor9270')}
function debug(type,detail){try{window.dispatchEvent(new CustomEvent('hlgb:hub-debug',{detail:{at:new Date().toISOString(),type,version:V,...(detail||{})}}))}catch(e){}}
function callMaster(source){
 if(!hubVisible()||editing())return false;
 if(renderRunning){renderQueued=true;return false}
 renderRunning=true;
 const started=performance?.now?.()||Date.now();
 try{
   if(window.hlgbHubMaster9258?.renderAll)window.hlgbHubMaster9258.renderAll();
   else if(typeof window.renderHubFinance==='function')window.renderHubFinance();
   return true;
 }catch(e){
   console.warn('[HLGB Hub Live '+V+'] render',e);
   debug('render-error',{source:source||'',message:sid(e?.message||e)});
   return false;
 }finally{
   const ended=performance?.now?.()||Date.now();
   renderRunning=false;
   debug('render',{source:source||'',durationMs:Math.round((ended-started)*10)/10,entries:hub().length});
   if(renderQueued){renderQueued=false;schedule('queued',100)}
 }
}
function schedule(source,delay=90){
 clearTimeout(renderTimer);
 renderTimer=setTimeout(()=>{
   renderTimer=null;
   if(!hubVisible()||editing())return;
   const run=()=>callMaster(source);
   if(typeof requestAnimationFrame==='function')requestAnimationFrame(run);else setTimeout(run,0);
 },Math.max(0,Number(delay)||0));
 return true;
}
function stopSaveWatch(){clearTimeout(saveWatchTimer);saveWatchTimer=null;saveWatchStarted=0}
function watchNewEntry(){
 stopSaveWatch();
 if(!hubVisible())return false;
 const before=hub().length;
 lastLength=before;saveWatchStarted=Date.now();
 debug('new-entry-watch-start',{before});
 const tick=()=>{
   if(!hubVisible()||Date.now()-saveWatchStarted>5000){stopSaveWatch();return}
   const n=hub().length;
   if(n!==before){
     const elapsed=Date.now()-saveWatchStarted;
     stopSaveWatch();lastLength=n;
     debug('new-entry-local-change',{before,after:n,elapsedMs:elapsed});
     schedule('new-entry-local-change',60);
     return;
   }
   saveWatchTimer=setTimeout(tick,250);
 };
 saveWatchTimer=setTimeout(tick,250);
 return true;
}
function installRecordHook(){
 const fn=window.hlgbRecordSaveWithRetry;
 if(typeof fn!=='function'||fn.__hlgbHubLive9291)return false;
 const wrapped=async function(module){
   const started=Date.now();
   try{
     const out=await fn.apply(this,arguments);
     if(module==='hubFinanceEntries'){
       debug('record-save-finished',{elapsedMs:Date.now()-started,applied:!!out?.applied,deleted:!!out?.deleted_at});
       schedule('record-save-finished',80);
     }
     return out;
   }catch(e){
     if(module==='hubFinanceEntries')debug('record-save-error',{elapsedMs:Date.now()-started,message:sid(e?.message||e)});
     throw e;
   }
 };
 wrapped.__hlgbHubLive9291=true;wrapped.__original=fn;
 window.hlgbRecordSaveWithRetry=wrapped;
 return true;
}
function isNewHubSaveButton(btn){
 if(!btn||!hubVisible())return false;
 const modal=btn.closest?.('#modal,.modal,.modalbox');if(!modal)return false;
 if(!modal.querySelector?.('#hlgb916HubForm'))return false;
 return btn.classList.contains('modalSave')||/salvar/i.test(sid(btn.textContent));
}
document.addEventListener('click',e=>{
 const btn=e.target?.closest?.('button');
 if(isNewHubSaveButton(btn)){
   debug('new-entry-save-click',{entries:hub().length});
   watchNewEntry();
 }
},true);
document.addEventListener('hlgb:hub-finance-changed',e=>{
 debug('hub-data-changed',{source:sid(e?.detail?.source||'')});
 schedule('hub-data-changed',80);
});
window.addEventListener('pageshow',()=>schedule('pageshow',140));
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')schedule('visible',140)});
installRecordHook();
setTimeout(installRecordHook,300);
setTimeout(installRecordHook,1400);
lastLength=hub().length;
window.hlgbHubLiveRefresh9289={version:V,sync:source=>schedule(source||'manual',0),renderNow:()=>callMaster('manual'),schedule,watchCurrentSave:watchNewEntry,watchNewEntry,installRecordHook,entries:()=>hub().length};
console.info('[HLGB] Hub Live v'+V+': refresh único, sem polling de assinatura e sem render duplicado');
})();
