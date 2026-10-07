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

/* HLGB v93.12 — integridade de salvamento + separação confirmada + Hub estável */
(function(){
'use strict';
const V='93.12';
if(window.hlgbSaveIntegrity9312?.version===V)return;
const sid=v=>String(v??'');
let confirmTimer=null,confirmBusy=false,confirmAgain=false,lastConfirm='',lastConfirmReason='',lastConfirmError='',confirmRuns=0;
let sepBusy=false,sepRefreshTimer=null;
let hubRenderTimer=null,hubRenderBusy=false,hubRenderQueued=false,hubRenderRuns=0,hubRenderSkipped=0,lastHubRender=0;
let masterRenderTimer=null,masterRenderBusy=false,masterRenderQueued=false,masterRenderRuns=0,lastMasterRender=0;

function isOnline(){return typeof navigator==='undefined'||navigator.onLine!==false}
function loggedIn(){try{const login=document.getElementById('loginScreen'),app=document.getElementById('appShell');if(!app)return false;if(login&&getComputedStyle(login).display!=='none')return false;return true}catch(e){return true}}
function userEditing(){try{if(document.querySelector('#modal.show'))return true;const a=document.activeElement;return !!(a&&/^(INPUT|TEXTAREA|SELECT)$/i.test(a.tagName)&&a.closest?.('#appShell'))}catch(e){return false}}
function token(){try{return sid(typeof cloudAccessToken!=='undefined'?cloudAccessToken:window.cloudAccessToken)}catch(e){return sid(window.cloudAccessToken)}}
function recordReady(){try{return !!(typeof hlgbRecordReady!=='undefined'?hlgbRecordReady:window.hlgbRecordReady)}catch(e){return !!window.hlgbRecordReady}}
function setStatus(text,type=''){try{const f=typeof setCloudStatus==='function'?setCloudStatus:window.setCloudStatus;if(typeof f==='function')f(text,type)}catch(e){}}
function recovery(){return window.hlgbSyncRecovery9301||null}
function pending(){try{return recovery()?.pending?.()||{records:0,wal:0}}catch(e){return {records:0,wal:0}}}
function totalPending(){const p=pending();return (+p.records||0)+(+p.wal||0)}
async function ensureCloudReady(){
 if(!isOnline())throw new Error('Sem internet para confirmar a alteração.');
 try{const f=typeof cloudEnsureFreshSession==='function'?cloudEnsureFreshSession:window.cloudEnsureFreshSession;if(typeof f==='function')await f(false)}catch(e){throw new Error('Sessão da nuvem indisponível. '+sid(e?.message||e))}
 if(!token())throw new Error('Sessão da nuvem indisponível.');
 if(!recordReady()){
  const f=window.hlgbEnsureRecordsOnlineAfterLogin;
  if(typeof f!=='function'||!(await f()))throw new Error('A camada multiusuário ainda não está pronta.');
 }
 if(typeof window.hlgbRecordSaveWithRetry!=='function')throw new Error('Gravação por registro indisponível.');
 return true;
}
async function flushConfirmed(reason='save'){
 if(confirmBusy){confirmAgain=true;return false}
 if(!isOnline()||!loggedIn())return false;
 if(userEditing()){scheduleConfirmation(reason+'-after-edit',650);return false}
 confirmBusy=true;confirmRuns++;lastConfirmReason=reason;lastConfirmError='';
 try{
  try{const f=window.hlgbRecordPendingStore;if(typeof f==='function')f()}catch(e){}
  if(!recordReady()){
   try{const f=window.hlgbEnsureRecordsOnlineAfterLogin;if(typeof f==='function')await f()}catch(e){}
  }
  if(recordReady()&&token()&&typeof window.hlgbNormalizedSyncNow==='function'){
   try{await window.hlgbNormalizedSyncNow(false)}catch(e){lastConfirmError=sid(e?.message||e)}
  }
  const rec=recovery();
  if(rec?.flushOutgoing){
   try{const out=await rec.flushOutgoing('v9312-'+reason);if(out?.lastError)lastConfirmError=sid(out.lastError)}catch(e){lastConfirmError=sid(e?.message||e)}
  }else if(typeof window.hlgb955FlushSilent==='function'){
   try{await window.hlgb955FlushSilent()}catch(e){lastConfirmError=sid(e?.message||e)}
  }
  lastConfirm=new Date().toISOString();
  const n=totalPending();
  if(n>0)setStatus('⚠️ '+n+' alteração(ões) protegida(s), aguardando confirmação','warn');
  else if(lastConfirmError)setStatus('☁️ Alterações protegidas · tentando confirmar novamente','warn');
  else setStatus('✅ Online · alterações confirmadas na nuvem','ok');
  return n===0&&!lastConfirmError;
 }finally{
  confirmBusy=false;
  if(confirmAgain){confirmAgain=false;scheduleConfirmation(reason+'-queued',180)}
 }
}
function scheduleConfirmation(reason='save',delay=320){
 clearTimeout(confirmTimer);
 confirmTimer=setTimeout(()=>{confirmTimer=null;flushConfirmed(reason).catch(e=>{lastConfirmError=sid(e?.message||e);setStatus('☁️ Alteração protegida · confirmação pendente','warn')})},Math.max(80,+delay||320));
 return true;
}
function installPersistGuard(){
 const f=window.persistDb;
 if(typeof f!=='function'||f.__hlgb9312)return false;
 const w=function(){const out=f.apply(this,arguments);scheduleConfirmation('persistDb',300);return out};
 w.__hlgb9312=true;w.__hlgb9312Original=f;window.persistDb=w;return true;
}
function installPermissionGuard(){
 const f=window.hlgbRecordCanWrite;
 if(typeof f!=='function'||f.__hlgb9312)return false;
 const w=function(module){
  const base=!!f.apply(this,arguments);if(base)return true;
  if(module==='separations'){try{if(typeof window.hasAccess==='function'&&window.hasAccess('pedidos'))return true}catch(e){}}
  return false;
 };
 w.__hlgb9312=true;w.__hlgb9312Original=f;window.hlgbRecordCanWrite=w;return true;
}
function refreshSeparationSoon(reason='incoming'){
 clearTimeout(sepRefreshTimer);
 sepRefreshTimer=setTimeout(()=>{
  sepRefreshTimer=null;
  try{
   const page=document.getElementById('pedidos');if(!page?.classList?.contains('active'))return;
   const sel=document.getElementById('separationOrder'),keep=sel?.value||'';
   if(typeof window.fillSeparationOrders==='function')window.fillSeparationOrders();
   const next=document.getElementById('separationOrder');if(next&&keep)next.value=keep;
   if(keep&&typeof window.renderSeparation==='function')window.renderSeparation();
  }catch(e){console.warn('[HLGB '+V+'] refresh separação',reason,e)}
 },80);
}
function installIncomingGuard(){
 const f=window.hlgbRenderIncomingRecord;
 if(typeof f!=='function'||f.__hlgb9312)return false;
 const w=function(module){const out=f.apply(this,arguments);if(module==='separations'||module==='orders')refreshSeparationSoon(module);return out};
 w.__hlgb9312=true;w.__hlgb9312Original=f;window.hlgbRenderIncomingRecord=w;return true;
}
function installSeparationGuard(){
 const f=window.applySeparationProgress938;
 if(typeof f!=='function'||f.__hlgb9312)return false;
 const w=async function(orderId,pid,finish=false){
  if(sepBusy){setStatus('☁️ Separação já está sendo salva…','warn');return false}
  sepBusy=true;
  try{
   await ensureCloudReady();
   setStatus('☁️ Salvando separação na nuvem…');
   const out=await f.apply(this,arguments);
   await flushConfirmed('separation');
   refreshSeparationSoon('save');
   const n=totalPending();if(n>0)setStatus('⚠️ Separação protegida · '+n+' alteração(ões) aguardando confirmação','warn');
   return out;
  }catch(e){
   console.error('[HLGB '+V+'] separação não confirmada',e);
   setStatus('☁️ Separação não confirmada · nada novo foi liberado','bad');
   alert('Não foi possível confirmar a separação na nuvem. Tente novamente.\n\n'+sid(e?.message||e));
   return false;
  }finally{sepBusy=false}
 };
 w.__hlgb9312=true;w.__hlgb9312Original=f;window.applySeparationProgress938=w;return true;
}
function installHubRendererGuard(){
 const f=window.renderHubFinance;
 if(typeof f!=='function'||f.__hlgb9312)return false;
 const w=function(){
  const args=arguments,ctx=this,now=Date.now();
  if(hubRenderBusy){hubRenderQueued=true;hubRenderSkipped++;return false}
  if(now-lastHubRender<90){hubRenderQueued=true;hubRenderSkipped++;if(!hubRenderTimer)hubRenderTimer=setTimeout(()=>{hubRenderTimer=null;hubRenderQueued=false;w.apply(ctx,args)},95);return false}
  hubRenderBusy=true;hubRenderRuns++;
  try{return f.apply(ctx,args)}finally{hubRenderBusy=false;lastHubRender=Date.now();if(hubRenderQueued&&!hubRenderTimer){hubRenderQueued=false;hubRenderTimer=setTimeout(()=>{hubRenderTimer=null;w.apply(ctx,args)},95)}}
 };
 w.__hlgb9312=true;w.__hlgb9312Original=f;window.renderHubFinance=w;return true;
}
function installHubMasterGuard(){
 const master=window.hlgbHubMaster9258,f=master?.renderAll;
 if(typeof f!=='function'||f.__hlgb9312)return false;
 const w=function(){
  const args=arguments,ctx=this,now=Date.now();
  if(masterRenderBusy){masterRenderQueued=true;return false}
  if(now-lastMasterRender<90){masterRenderQueued=true;if(!masterRenderTimer)masterRenderTimer=setTimeout(()=>{masterRenderTimer=null;masterRenderQueued=false;w.apply(ctx,args)},95);return false}
  masterRenderBusy=true;masterRenderRuns++;
  try{return f.apply(ctx,args)}finally{masterRenderBusy=false;lastMasterRender=Date.now();if(masterRenderQueued&&!masterRenderTimer){masterRenderQueued=false;masterRenderTimer=setTimeout(()=>{masterRenderTimer=null;w.apply(ctx,args)},95)}}
 };
 w.__hlgb9312=true;w.__hlgb9312Original=f;master.renderAll=w;return true;
}
function stamp(){try{const cur=Number(window.HLGB_RELEASE_VERSION)||0;if(cur<93.12){window.HLGB_RELEASE_VERSION=V;const l=document.querySelector('#appShell .logo small');if(l)l.textContent='v'+V}}catch(e){}}
function status(){return {version:V,persistGuard:!!window.persistDb?.__hlgb9312,separationGuard:!!window.applySeparationProgress938?.__hlgb9312,incomingGuard:!!window.hlgbRenderIncomingRecord?.__hlgb9312,permissionGuard:!!window.hlgbRecordCanWrite?.__hlgb9312,hubRendererGuard:!!window.renderHubFinance?.__hlgb9312,hubMasterGuard:!!window.hlgbHubMaster9258?.renderAll?.__hlgb9312,pending:pending(),confirmBusy,confirmRuns,lastConfirm,lastConfirmReason,lastConfirmError,hubRenderRuns,hubRenderSkipped,masterRenderRuns}}
function install(){installPersistGuard();installPermissionGuard();installIncomingGuard();installSeparationGuard();installHubMasterGuard();installHubRendererGuard();stamp();return status()}
function boot(){install();setTimeout(install,350);setTimeout(install,1400);window.addEventListener('online',()=>scheduleConfirmation('online',150));window.addEventListener('focus',()=>{install();if(totalPending()>0)scheduleConfirmation('focus',180)});window.hlgbSaveIntegrity9312={version:V,status,install,flush:()=>flushConfirmed('manual'),refreshSeparation:refreshSeparationSoon};console.info('[HLGB] v'+V+' integridade de salvamento ativa — separação exige confirmação e Hub coalescido')}
if(typeof window.hlgbAfterLogin==='function')window.hlgbAfterLogin(()=>setTimeout(boot,250),0);else setTimeout(boot,700);
})();
