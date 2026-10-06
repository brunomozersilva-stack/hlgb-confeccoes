/* HLGB v93.05 — sincronização multiusuário autoritativa e convergente */
(function(){
'use strict';
const V='93.05';
if(window.hlgbSyncRecovery9301?.version===V)return;

const PENDING_KEY='hlgb_records_pending_v91';
const WAL_KEY='hlgb_durable_wal_v1';
const QUAR_KEY='hlgb_sync_quarantine_v9305';
const STATE_KEY='hlgb_sync_recovery_9301';
const STALE_MS=60000;
const FULL_EVERY_MS=60000;
const OVERLAP_MS=120000;
let busy=false,lastFull=0,lastIncremental=0,lastReason='',lastResult=null;
let fullTimer=null,incrementalTimer=null,retryTimer=null;

const wait=ms=>new Promise(r=>setTimeout(r,ms));
const sid=v=>String(v??'');
function clone(v){try{return structuredClone(v)}catch(e){try{return JSON.parse(JSON.stringify(v))}catch(_){return v}}}
function read(k,f=null){try{const v=JSON.parse(localStorage.getItem(k)||'null');return v??f}catch(e){return f}}
function write(k,v){try{localStorage.setItem(k,JSON.stringify(v));return true}catch(e){return false}}
function token(){try{if(typeof cloudAccessToken!=='undefined'&&cloudAccessToken)return cloudAccessToken}catch(e){}return window.cloudAccessToken||''}
function ready(){try{return !!hlgbRecordReady}catch(e){return !!window.hlgbRecordReady}}
function realtimeState(){try{return sid(hlgbRealtimeState)}catch(e){return sid(window.hlgbRealtimeState)}}
function loadBundleFn(){try{if(typeof hlgbRecordLoadBundle==='function')return hlgbRecordLoadBundle}catch(e){}return window.hlgbRecordLoadBundle}
function sessionFn(){try{if(typeof cloudEnsureFreshSession==='function')return cloudEnsureFreshSession}catch(e){}return window.cloudEnsureFreshSession}
function startRealtimeFn(){try{if(typeof hlgbStartRealtime==='function')return hlgbStartRealtime}catch(e){}return window.hlgbStartRealtime}
function localSaveFn(){try{if(typeof localSaveOnly==='function')return localSaveOnly}catch(e){}return window.localSaveOnly}
function statusFn(){try{if(typeof setCloudStatus==='function')return setCloudStatus}catch(e){}return window.setCloudStatus}
function renderIncomingFn(){try{if(typeof hlgbRenderIncomingRecord==='function')return hlgbRenderIncomingRecord}catch(e){}return window.hlgbRenderIncomingRecord}
function loggedIn(){const login=document.getElementById('loginScreen'),app=document.getElementById('appShell');if(!app)return false;if(login){try{if(getComputedStyle(login).display!=='none')return false}catch(e){}}return true}
function userEditing(){const modal=document.querySelector('#modal.show');if(modal)return true;const a=document.activeElement;return !!(a&&/^(INPUT|TEXTAREA|SELECT)$/i.test(a.tagName)&&a.closest?.('#appShell'))}
function opTime(e){for(const v of [e?.createdAt,e?.queuedAt,e?.updatedAt,e?.at,e?.__hlgb_pending_at]){const n=typeof v==='number'?v:Date.parse(String(v||''));if(Number.isFinite(n)&&n>0)return n}return 0}
function snapshotState(extra={}){const s={version:V,at:new Date().toISOString(),busy,lastFull,lastIncremental,lastReason,lastResult,realtime:realtimeState(),recordReady:ready(),online:navigator.onLine,...extra};try{localStorage.setItem(STATE_KEY,JSON.stringify(s))}catch(e){}return s}

function archive(kind,payload,reason){
 if(payload==null)return;
 const entry={at:new Date().toISOString(),kind,reason,payload:clone(payload)};
 let a=read(QUAR_KEY,[]);if(!Array.isArray(a))a=[];a.push(entry);if(a.length>12)a=a.slice(-12);
 if(!write(QUAR_KEY,a)){
   try{localStorage.setItem(QUAR_KEY,JSON.stringify([{at:entry.at,kind,reason,summary:'conteúdo grande preservado apenas até a limpeza da sessão'}]))}catch(e){}
 }
}
function quarantineStaleLocal(reason,cutoff=Date.now()-STALE_MS){
 let removedPending=0,removedWal=0;
 const p=read(PENDING_KEY,null);
 if(p){const t=Number(p.at)||0;if(!t||t<=cutoff){archive('pending',p,reason);try{localStorage.removeItem(PENDING_KEY)}catch(e){};removedPending=Object.values(p.modules||{}).reduce((n,x)=>n+(Array.isArray(x)?x.length:0),0)}}
 const w=read(WAL_KEY,null);
 if(w?.entries&&typeof w.entries==='object'){
   const stale={},fresh={};for(const [k,e] of Object.entries(w.entries)){const t=opTime(e);if(!t||t<=cutoff)stale[k]=e;else fresh[k]=e}
   const keys=Object.keys(stale);if(keys.length){archive('wal',{entries:stale},reason);removedWal=keys.length;try{if(Object.keys(fresh).length)localStorage.setItem(WAL_KEY,JSON.stringify({...w,entries:fresh}));else localStorage.removeItem(WAL_KEY)}catch(e){}}
 }
 return {removedPending,removedWal};
}
async function quarantineIndexedDb(reason,cutoff=Date.now()-STALE_MS){
 if(!('indexedDB' in window))return 0;
 return new Promise(resolve=>{
   let req;try{req=indexedDB.open('hlgb_durable_wal')}catch(e){resolve(0);return}
   req.onerror=()=>resolve(0);
   req.onsuccess=()=>{
     const dbx=req.result;if(!dbx.objectStoreNames.contains('entries')){dbx.close();resolve(0);return}
     let tx;try{tx=dbx.transaction('entries','readwrite')}catch(e){dbx.close();resolve(0);return}
     const store=tx.objectStore('entries'),stale=[];let n=0;
     const cur=store.openCursor();
     cur.onsuccess=()=>{const c=cur.result;if(!c)return;const e=c.value,t=opTime(e);if(!t||t<=cutoff){stale.push(clone(e));try{c.delete();n++}catch(_){}}c.continue()};
     tx.oncomplete=()=>{if(stale.length)archive('indexeddb-wal',stale.slice(0,100),reason);dbx.close();resolve(n)};
     tx.onerror=()=>{dbx.close();resolve(n)};
   };
   req.onupgradeneeded=()=>{};
 });
}
function resetCursorFromSnapshots(){
 try{
   let max='';const seen=(typeof hlgbRecordLastSeen!=='undefined'?hlgbRecordLastSeen:window.hlgbRecordLastSeen)||{};
   for(const v of Object.values(seen))if(String(v||'')>max)max=String(v||'');
   if(typeof hlgbRecordGlobalLastSeen!=='undefined')hlgbRecordGlobalLastSeen=max;else window.hlgbRecordGlobalLastSeen=max;
   if(typeof hlgbRecordLastPullAt!=='undefined')hlgbRecordLastPullAt=0;else window.hlgbRecordLastPullAt=0;
   return max;
 }catch(e){return ''}
}
function currentCursor(){try{return sid(typeof hlgbRecordGlobalLastSeen!=='undefined'?hlgbRecordGlobalLastSeen:window.hlgbRecordGlobalLastSeen)}catch(e){return sid(window.hlgbRecordGlobalLastSeen)}}
function markReady(){try{hlgbRecordReady=true}catch(e){window.hlgbRecordReady=true}try{hlgbNormalizedReady=true}catch(e){window.hlgbNormalizedReady=true}}
function saveLocal(){try{localSaveFn()?.()}catch(e){console.warn('[HLGB sync '+V+'] local save',e)}}
function setStatus(text,type=''){try{statusFn()?.(text,type)}catch(e){}}
function activePage(){return document.querySelector('#appShell .page.active')?.id||''}
function redrawCurrent(){
 const p=activePage();
 const map={dashboard:'renderDash',pedidos:'renderOrders',producao:'renderProduction',corte:'renderCuts',projecao:'renderProjection',capacidadeProducao:'renderCapacityPlanning',produtos:'renderProducts',hubFinanceiro:'renderHubFinance',folhaPagamento:'renderPayroll',funcionarios:'renderEmployees',clientes:'renderClients',fornecedores:'renderSuppliers',materiais:'renderMaterials',faccoes:'renderFactions',relatorios:'renderReports'};
 try{if(typeof window.hlgbManualRefreshCurrentPage==='function'){window.hlgbManualRefreshCurrentPage();return true}}catch(e){}
 const fn=window[map[p]];if(typeof fn==='function'){try{fn();return true}catch(e){console.warn('[HLGB sync '+V+'] redraw',p,e)}}
 return false;
}
async function ensureSession(){
 if(!navigator.onLine)return false;
 const f=sessionFn();if(typeof f==='function'){try{await Promise.race([Promise.resolve(f(false)),wait(10000)])}catch(e){console.warn('[HLGB sync '+V+'] sessão',e)}}
 return !!token();
}
function restartRealtimeIfNeeded(force=false){
 if(!token())return false;
 if(!force&&realtimeState()==='SUBSCRIBED')return true;
 const f=startRealtimeFn();if(typeof f!=='function')return false;
 try{f();return true}catch(e){console.warn('[HLGB sync '+V+'] realtime restart',e);return false}
}
async function fullSync(reason='manual',force=false){
 if(busy)return lastResult||false;
 if(!navigator.onLine||document.visibilityState==='hidden'||!loggedIn())return false;
 if(userEditing()&&!force){clearTimeout(retryTimer);retryTimer=setTimeout(()=>fullSync(reason+'-after-edit',false),1200);return false}
 const now=Date.now();if(!force&&now-lastFull<12000)return true;
 busy=true;lastReason=reason;snapshotState();const started=Date.now();
 try{
   setStatus('☁️ Conferindo fonte oficial da nuvem…');
   if(!await ensureSession())throw new Error('Sessão da nuvem indisponível');
   const before=quarantineStaleLocal('antes-'+reason,started-STALE_MS);
   const idbBefore=await quarantineIndexedDb('antes-'+reason,started-STALE_MS);
   const load=loadBundleFn();if(typeof load!=='function')throw new Error('Leitura por registro indisponível');
   const out=await load({preserveLocal:false,since:null});
   markReady();
   // Qualquer fila antiga que sobreviver à leitura não pode recolocar uma cópia velha sobre a nuvem.
   const after=quarantineStaleLocal('depois-'+reason,started);
   const idbAfter=await quarantineIndexedDb('depois-'+reason,started);
   try{const f=typeof hlgbRecordPendingStore==='function'?hlgbRecordPendingStore:window.hlgbRecordPendingStore;if(typeof f==='function')f()}catch(e){}
   saveLocal();const cursor=resetCursorFromSnapshots();
   restartRealtimeIfNeeded(realtimeState()!=='SUBSCRIBED');
   redrawCurrent();
   lastFull=Date.now();lastIncremental=lastFull;
   lastResult={ok:true,kind:'full',reason,at:new Date().toISOString(),cursor,rows:Array.isArray(out?.rows)?out.rows.length:null,quarantined:{pending:(before.removedPending||0)+(after.removedPending||0),wal:(before.removedWal||0)+(after.removedWal||0),idb:idbBefore+idbAfter},realtime:realtimeState()};
   setStatus('⚡ Online · dados iguais à nuvem','ok');snapshotState();return true;
 }catch(e){
   lastResult={ok:false,kind:'full',reason,at:new Date().toISOString(),error:sid(e?.message||e)};console.error('[HLGB sync '+V+'] full',reason,e);setStatus('☁️ Sincronização precisa reconectar','bad');snapshotState();return false;
 }finally{busy=false;snapshotState()}
}
async function incrementalSync(force=false){
 if(busy||!navigator.onLine||document.visibilityState==='hidden'||!loggedIn()||userEditing())return false;
 if(!ready()||!token())return fullSync('incremental-not-ready',true);
 const now=Date.now();if(!force&&now-lastIncremental<7000)return true;
 busy=true;lastReason='incremental';snapshotState();
 try{
   if(!await ensureSession())throw new Error('Sessão indisponível');
   quarantineStaleLocal('incremental',Date.now()-STALE_MS);
   let cursor=currentCursor();if(!cursor){busy=false;snapshotState();return fullSync('incremental-no-cursor',true)}
   const t=Date.parse(cursor);const since=Number.isFinite(t)?new Date(Math.max(0,t-OVERLAP_MS)).toISOString():null;
   if(!since){busy=false;snapshotState();return fullSync('incremental-bad-cursor',true)}
   const load=loadBundleFn();if(typeof load!=='function')throw new Error('Leitura por registro indisponível');
   const out=await load({preserveLocal:true,since});
   markReady();saveLocal();
   const rows=Array.isArray(out?.rows)?out.rows:[];if(rows.length)redrawCurrent();
   restartRealtimeIfNeeded(false);lastIncremental=Date.now();
   lastResult={ok:true,kind:'incremental',at:new Date().toISOString(),since,rows:rows.length,realtime:realtimeState()};snapshotState();return true;
 }catch(e){console.warn('[HLGB sync '+V+'] incremental',e);lastResult={ok:false,kind:'incremental',at:new Date().toISOString(),error:sid(e?.message||e)};snapshotState();return false}
 finally{busy=false;snapshotState()}
}
function scheduleFull(reason,delay=80,force=true){clearTimeout(retryTimer);retryTimer=setTimeout(()=>fullSync(reason,force).catch(()=>{}),delay)}
function installOverrides(){
 window.hlgb942FullCloudRefresh=(reason='manual',force=false)=>fullSync('v9305-'+reason,!!force);
 try{hlgbPullNormalizedCoreChanges=(force=false)=>incrementalSync(!!force)}catch(e){window.hlgbPullNormalizedCoreChanges=(force=false)=>incrementalSync(!!force)}
 window.hlgbSyncRecovery9301={version:V,run:()=>fullSync('manual',true),fullSync,incrementalSync,status:()=>snapshotState(),quarantine:()=>read(QUAR_KEY,[]),restartRealtime:()=>restartRealtimeIfNeeded(true)};
 window.HLGB_SYNC_RECOVERY_9301=V;window.HLGB_SYNC_AUTHORITY='cloud';
}
function boot(){
 quarantineStaleLocal('boot',Date.now()-STALE_MS);
 quarantineIndexedDb('boot',Date.now()-STALE_MS).catch(()=>{});
 installOverrides();
 if(typeof window.hlgbAfterLogin==='function')window.hlgbAfterLogin(()=>scheduleFull('login',180,true),0);else scheduleFull('boot',700,true);
 document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')scheduleFull('visible',120,true)},true);
 window.addEventListener('focus',()=>scheduleFull('focus',120,true),true);
 window.addEventListener('online',()=>scheduleFull('online',180,true),true);
 window.addEventListener('pageshow',()=>scheduleFull('pageshow',180,true),true);
 incrementalTimer=setInterval(()=>{if(document.visibilityState==='visible'&&navigator.onLine){if(realtimeState()==='SUBSCRIBED')incrementalSync(false).catch(()=>{});else incrementalSync(true).catch(()=>{})}},10000);
 fullTimer=setInterval(()=>{if(document.visibilityState==='visible'&&navigator.onLine)fullSync('periodic',false).catch(()=>{})},FULL_EVERY_MS);
 setTimeout(()=>{installOverrides();if(loggedIn())scheduleFull('late-boot',50,true)},1400);
 snapshotState({booted:true});
 console.info('[HLGB] v'+V+' sincronização autoritativa ativa — nuvem é a fonte única quando online');
}
boot();
})();
