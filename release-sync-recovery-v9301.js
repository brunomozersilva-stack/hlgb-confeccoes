/* HLGB v93.47 — sincronização confirmada com contenção de Disk I/O.
   Realtime é a via principal; polling vira contingência e nenhuma fila é descartada. */
(function(){
'use strict';
const V='93.47';
if(window.hlgbSyncRecovery9301?.version===V)return;

const PENDING_KEY='hlgb_records_pending_v91';
const WAL_KEY='hlgb_durable_wal_v1';
const QUAR_KEY='hlgb_sync_quarantine_v9305';
const STATE_KEY='hlgb_sync_recovery_9301';
const FULL_EVERY_MS=600000;
const INCREMENTAL_EVERY_MS=60000;
const MAINTENANCE_EVERY_MS=30000;
const MIN_INCREMENTAL_MS=45000;
const OVERLAP_MS=120000;
let busy=false,lastFull=0,lastIncremental=0,lastReason='',lastResult=null;
let fullTimer=null,incrementalTimer=null,retryTimer=null,maintenanceTimer=null;
let skippedRealtime=0,flushOnlyRuns=0;

const wait=ms=>new Promise(r=>setTimeout(r,ms));
const sid=v=>String(v??'');
function read(k,f=null){try{const v=JSON.parse(localStorage.getItem(k)||'null');return v??f}catch(e){return f}}
function token(){try{if(typeof cloudAccessToken!=='undefined'&&cloudAccessToken)return cloudAccessToken}catch(e){}return window.cloudAccessToken||''}
function ready(){try{return !!hlgbRecordReady}catch(e){return !!window.hlgbRecordReady}}
function realtimeState(){try{return sid(hlgbRealtimeState)}catch(e){return sid(window.hlgbRealtimeState)}}
function loadBundleFn(){try{if(typeof hlgbRecordLoadBundle==='function')return hlgbRecordLoadBundle}catch(e){}return window.hlgbRecordLoadBundle}
function sessionFn(){try{if(typeof cloudEnsureFreshSession==='function')return cloudEnsureFreshSession}catch(e){}return window.cloudEnsureFreshSession}
function startRealtimeFn(){try{if(typeof hlgbStartRealtime==='function')return hlgbStartRealtime}catch(e){}return window.hlgbStartRealtime}
function localSaveFn(){try{if(typeof localSaveOnly==='function')return localSaveOnly}catch(e){}return window.localSaveOnly}
function statusFn(){try{if(typeof setCloudStatus==='function')return setCloudStatus}catch(e){}return window.setCloudStatus}
function pendingStoreFn(){try{if(typeof hlgbRecordPendingStore==='function')return hlgbRecordPendingStore}catch(e){}return window.hlgbRecordPendingStore}
function normalizedSyncFn(){try{if(typeof hlgbNormalizedSyncNow==='function')return hlgbNormalizedSyncNow}catch(e){}return window.hlgbNormalizedSyncNow}
function loggedIn(){const login=document.getElementById('loginScreen'),app=document.getElementById('appShell');if(!app)return false;if(login){try{if(getComputedStyle(login).display!=='none')return false}catch(e){}}return true}
function userEditing(){const modal=document.querySelector('#modal.show');if(modal)return true;const a=document.activeElement;return !!(a&&/^(INPUT|TEXTAREA|SELECT)$/i.test(a.tagName)&&a.closest?.('#appShell'))}
function recordPendingCount(){const p=read(PENDING_KEY,null);return Object.values(p?.modules||{}).reduce((n,x)=>n+(Array.isArray(x)?x.length:0),0)}
function walPendingCount(){const w=read(WAL_KEY,null);return w?.entries&&typeof w.entries==='object'?Object.keys(w.entries).length:0}
function pendingCounts(){return {records:recordPendingCount(),wal:walPendingCount()}}
function totalPending(){const p=pendingCounts();return p.records+p.wal}
function snapshotState(extra={}){const s={version:V,at:new Date().toISOString(),busy,lastFull,lastIncremental,lastReason,lastResult,realtime:realtimeState(),recordReady:ready(),online:navigator.onLine,pending:pendingCounts(),ioPolicy:{fullEveryMs:FULL_EVERY_MS,incrementalEveryMs:INCREMENTAL_EVERY_MS,maintenanceEveryMs:MAINTENANCE_EVERY_MS,minIncrementalMs:MIN_INCREMENTAL_MS,skippedRealtime,flushOnlyRuns},...extra};try{localStorage.setItem(STATE_KEY,JSON.stringify(s))}catch(e){}return s}
function quarantineHistory(){const x=read(QUAR_KEY,[]);return Array.isArray(x)?x:[]}

/* Filas não confirmadas nunca são removidas por idade. */
function quarantineStaleLocal(){return {removedPending:0,removedWal:0,preservedPending:recordPendingCount(),preservedWal:walPendingCount()}}
async function quarantineIndexedDb(){return 0}

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
function saveLocal(){try{const f=localSaveFn();if(typeof f==='function')f()}catch(e){console.warn('[HLGB sync '+V+'] local save',e)}}
function setStatus(text,type=''){try{const f=statusFn();if(typeof f==='function')f(text,type)}catch(e){}}
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
async function primeRecordLayer(){
 const load=loadBundleFn();if(typeof load!=='function')throw new Error('Leitura por registro indisponível');
 const out=await load({preserveLocal:true,since:null});
 markReady();saveLocal();return out;
}
async function timed(promise,ms,label){let timer;try{return await Promise.race([Promise.resolve(promise),new Promise((_,rej)=>{timer=setTimeout(()=>rej(new Error(label||'Tempo esgotado')),ms)})])}finally{clearTimeout(timer)}}
async function flushOutgoing(reason='sync'){
 let recordSyncAttempted=false,walFlushAttempted=false,lastError='';
 try{const store=pendingStoreFn();if(typeof store==='function')store()}catch(e){lastError=sid(e?.message||e)}
 try{
  const sync=normalizedSyncFn();
  if(recordPendingCount()>0&&typeof sync==='function'){
   recordSyncAttempted=true;await timed(sync(false),20000,'Tempo esgotado ao enviar pendências por registro');
  }
 }catch(e){lastError=sid(e?.message||e);console.warn('[HLGB sync '+V+'] pending records',reason,e)}
 try{
  const flush=window.hlgb955FlushSilent;
  if(walPendingCount()>0&&typeof flush==='function'){
   walFlushAttempted=true;await timed(flush(),20000,'Tempo esgotado ao reenviar diário local');
  }
 }catch(e){lastError=sid(e?.message||e);console.warn('[HLGB sync '+V+'] WAL flush',reason,e)}
 try{const store=pendingStoreFn();if(typeof store==='function')store()}catch(e){}
 return {recordSyncAttempted,walFlushAttempted,lastError,...pendingCounts()};
}
async function fullSync(reason='manual',force=false){
 if(busy)return lastResult?.ok===true;
 if(!navigator.onLine||document.visibilityState==='hidden'||!loggedIn())return false;
 if(userEditing()&&!force){clearTimeout(retryTimer);retryTimer=setTimeout(()=>fullSync(reason+'-after-edit',false),1500);return false}
 const now=Date.now();if(!force&&now-lastFull<120000)return true;
 busy=true;lastReason=reason;snapshotState();
 try{
   setStatus('☁️ Conferindo alterações pendentes…');
   if(!await ensureSession())throw new Error('Sessão da nuvem indisponível');
   const needPrime=!ready()||!currentCursor();
   let out=null;
   if(needPrime)out=await primeRecordLayer();
   const flush=await flushOutgoing(reason);
   const remaining=totalPending();
   /* v93.47: no máximo uma carga ampla por ciclo. Se foi necessário inicializar
      a camada, o prime já trouxe a nuvem preservando o local; não lê tudo de novo. */
   if(!needPrime){
     const load=loadBundleFn();if(typeof load!=='function')throw new Error('Leitura por registro indisponível');
     out=await load({preserveLocal:remaining>0,since:null});markReady();saveLocal();
   }
   const cursor=resetCursorFromSnapshots();
   restartRealtimeIfNeeded(realtimeState()!=='SUBSCRIBED');
   redrawCurrent();
   lastFull=Date.now();lastIncremental=lastFull;
   const p=pendingCounts();
   lastResult={ok:p.records+p.wal===0,kind:'full',reason,at:new Date().toISOString(),cursor,rows:Array.isArray(out?.rows)?out.rows.length:null,flush,pending:p,realtime:realtimeState(),needPrime};
   if(p.records+p.wal)setStatus('⚠️ '+(p.records+p.wal)+' alteração(ões) aguardando confirmação','warn');else setStatus('✅ Online · tudo confirmado na nuvem','ok');
   snapshotState();return lastResult.ok;
 }catch(e){
   lastResult={ok:false,kind:'full',reason,at:new Date().toISOString(),error:sid(e?.message||e),pending:pendingCounts()};
   console.error('[HLGB sync '+V+'] full',reason,e);setStatus('☁️ Alterações protegidas · reconectando','bad');snapshotState();return false;
 }finally{busy=false;snapshotState()}
}
async function incrementalSync(force=false){
 if(busy||!navigator.onLine||document.visibilityState==='hidden'||!loggedIn()||userEditing())return false;
 if(!ready()||!token())return fullSync('incremental-not-ready',true);
 const now=Date.now();if(!force&&now-lastIncremental<MIN_INCREMENTAL_MS)return true;
 const hadPending=totalPending()>0;
 /* Com Realtime saudável e sem fila local não fazemos polling do banco. */
 if(!force&&!hadPending&&realtimeState()==='SUBSCRIBED'){
   skippedRealtime++;lastIncremental=now;lastReason='realtime-skip';snapshotState();return true;
 }
 busy=true;lastReason='incremental';snapshotState();
 try{
   if(!await ensureSession())throw new Error('Sessão indisponível');
   const flush=await flushOutgoing('incremental');
   const remaining=totalPending();
   /* Reenviar fila não precisa ser seguido por outra leitura. A resposta de save
      confirma a gravação; o Realtime/catch-up posterior traz alterações externas. */
   if(hadPending){
     flushOnlyRuns++;lastIncremental=Date.now();restartRealtimeIfNeeded(false);
     const p=pendingCounts();lastResult={ok:p.records+p.wal===0,kind:'flush-only',at:new Date().toISOString(),flush,pending:p,realtime:realtimeState()};
     if(p.records+p.wal)setStatus('⚠️ '+(p.records+p.wal)+' alteração(ões) aguardando confirmação','warn');
     snapshotState();return lastResult.ok;
   }
   let cursor=currentCursor();
   if(!cursor){busy=false;snapshotState();return fullSync('incremental-no-cursor',true)}
   const t=Date.parse(cursor);const since=Number.isFinite(t)?new Date(Math.max(0,t-OVERLAP_MS)).toISOString():null;
   if(!since){busy=false;snapshotState();return fullSync('incremental-bad-cursor',true)}
   const load=loadBundleFn();if(typeof load!=='function')throw new Error('Leitura por registro indisponível');
   const out=await load({preserveLocal:true,since});markReady();saveLocal();
   const rows=Array.isArray(out?.rows)?out.rows:[];if(rows.length)redrawCurrent();
   restartRealtimeIfNeeded(false);lastIncremental=Date.now();
   const p=pendingCounts();lastResult={ok:p.records+p.wal===0,kind:'incremental',at:new Date().toISOString(),since,rows:rows.length,flush,pending:p,realtime:realtimeState()};
   if(p.records+p.wal)setStatus('⚠️ '+(p.records+p.wal)+' alteração(ões) aguardando confirmação','warn');
   snapshotState();return lastResult.ok;
 }catch(e){console.warn('[HLGB sync '+V+'] incremental',e);lastResult={ok:false,kind:'incremental',at:new Date().toISOString(),error:sid(e?.message||e),pending:pendingCounts()};snapshotState();return false}
 finally{busy=false;snapshotState()}
}
function scheduleFull(reason,delay=80,force=true){clearTimeout(retryTimer);retryTimer=setTimeout(()=>fullSync(reason,force).catch(()=>{}),delay)}
function scheduleCatchup(reason,delay=180){clearTimeout(retryTimer);retryTimer=setTimeout(()=>{lastReason=reason;incrementalSync(true).catch(()=>{})},delay)}
function stamp(){try{const cur=Number(window.HLGB_RELEASE_VERSION)||0;if(cur<93.47){window.HLGB_RELEASE_VERSION=V;const l=document.querySelector('#appShell .logo small');if(l)l.textContent='v'+V}}catch(e){}}
function installOverrides(){
 window.hlgb942FullCloudRefresh=(reason='manual',force=false)=>fullSync('v9347-'+reason,!!force);
 try{hlgbPullNormalizedCoreChanges=(force=false)=>incrementalSync(!!force)}catch(e){window.hlgbPullNormalizedCoreChanges=(force=false)=>incrementalSync(!!force)}
 window.hlgbSyncRecovery9301={version:V,run:()=>fullSync('manual',true),fullSync,incrementalSync,flushOutgoing,status:()=>snapshotState(),quarantine:quarantineHistory,restartRealtime:()=>restartRealtimeIfNeeded(true),pending:pendingCounts};
 window.HLGB_SYNC_RECOVERY_9301=V;window.HLGB_SYNC_AUTHORITY='realtime-primary-cloud-after-confirmation';
}
function boot(){
 installOverrides();stamp();
 if(typeof window.hlgbAfterLogin==='function')window.hlgbAfterLogin(()=>scheduleFull('login',250,true),0);else scheduleFull('boot',900,true);
 document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')scheduleCatchup('visible',250)},true);
 window.addEventListener('focus',()=>scheduleCatchup('focus',250),true);
 window.addEventListener('online',()=>scheduleFull('online',250,true),true);
 window.addEventListener('pageshow',()=>scheduleCatchup('pageshow',300),true);
 incrementalTimer=setInterval(()=>{if(document.visibilityState==='visible'&&navigator.onLine)incrementalSync(false).catch(()=>{})},INCREMENTAL_EVERY_MS);
 fullTimer=setInterval(()=>{if(document.visibilityState==='visible'&&navigator.onLine)fullSync('periodic-watchdog',false).catch(()=>{})},FULL_EVERY_MS);
 maintenanceTimer=setInterval(()=>{installOverrides();stamp();if(totalPending()>0&&loggedIn()&&navigator.onLine&&!userEditing())incrementalSync(false).catch(()=>{})},MAINTENANCE_EVERY_MS);
 setTimeout(()=>{installOverrides();stamp();if(loggedIn()&&(!ready()||!currentCursor()))scheduleFull('late-boot',100,true)},1800);
 snapshotState({booted:true});
 console.info('[HLGB] v'+V+' contenção de Disk I/O ativa — Realtime principal, polling reduzido e filas preservadas');
}
boot();
})();
