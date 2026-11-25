/* HLGB v93.44 — evita WAL infinito da linha mensal consolidada da folha.
   Escopo estrito: hubFinanceEntries com sourceType=payroll_month.
   Trata como redundante apenas quando todos os campos, exceto updatedAt, são idênticos.
   Patch 2026-10-24: este módulo não envolve mais hlgbRecordSaveWithRetry.
   A interceptação de save técnico da folha fica centralizada na autoridade v93.56;
   v93.44 delega a conciliação ao verificador remoto e conserva o carregamento de emergência.
   Patch v94.39: app-stable3 é a única autoridade de carregamento do v9339. */
(function(){
'use strict';
const V='93.44',WAL_KEY='hlgb_durable_wal_v1',ARC_KEY='hlgb_durable_wal_archive_v1',DB_NAME='hlgb_durable_wal',STORE='entries',MAX_ARCH=250;
if(window.HLGB_PAYROLL_MONTH_WAL_9334===V)return;
window.HLGB_PAYROLL_MONTH_WAL_9334=V;
const sid=v=>String(v??'');
const clone=v=>{try{return structuredClone(v)}catch(e){try{return JSON.parse(JSON.stringify(v))}catch(_){return v}}};
function payrollMonth(v){return !!(v&&v.sourceType==='payroll_month'&&sid(v.sourceId||'').trim())}
function canonical(v){
 if(!v||typeof v!=='object'||Array.isArray(v))return v;
 const out={};for(const k of Object.keys(v).sort()){if(k==='updatedAt')continue;const x=v[k];out[k]=x&&typeof x==='object'&&!Array.isArray(x)?canonical(x):Array.isArray(x)?x.map(y=>y&&typeof y==='object'?canonical(y):y):x}return out;
}
function sameMeaning(a,b){try{return JSON.stringify(canonical(a))===JSON.stringify(canonical(b))}catch(e){return false}}
function nextOriginal(f){return f?.__original||f?.__hlgb9306Original||f?.__originalGradeLink||f?.__hlgb9313Original||f?.__hlgb9312Original||f?.__hlgb9320Original||f?.__hlgbRecordIntegrityOriginal||f?.__hlgb955Original||f?.__hlgb9339Original||null}
function chainHasMarker(fn,marker){let f=fn,n=0,seen=new Set();while(typeof f==='function'&&n++<64&&!seen.has(f)){seen.add(f);if(f?.[marker])return true;f=nextOriginal(f)}return false}
function snapshot(id){try{return window.hlgbRecordSnapshots?.hubFinanceEntries?.get?.(sid(id))||null}catch(e){return null}}
function localRows(){try{if(typeof db!=='undefined'&&db){db.hubFinanceEntries=Array.isArray(db.hubFinanceEntries)?db.hubFinanceEntries:[];return db.hubFinanceEntries}}catch(e){}try{window.db.hubFinanceEntries=Array.isArray(window.db?.hubFinanceEntries)?window.db.hubFinanceEntries:[];return window.db.hubFinanceEntries}catch(e){return []}}
function normalizeLocalTimestamp(id,canonicalRow){
 try{if(!canonicalRow)return false;const row=localRows().find(x=>sid(x?.id??x?.__hlgbId)===sid(id));if(!row||!sameMeaning(row,canonicalRow))return false;const wanted=canonicalRow.updatedAt||'';if(sid(row.updatedAt)===sid(wanted))return false;row.updatedAt=wanted;try{window.localSaveOnly?.()}catch(e){try{localSaveOnly?.()}catch(_){}}return true}catch(e){return false}
}
/* Compatibilidade: chamadas antigas a install() continuam válidas, mas não criam wrapper.
   Retorna true somente quando a autoridade final v93.56 já está presente na cadeia. */
function install(){return chainHasMarker(window.hlgbRecordSaveWithRetry,'__hlgbPayrollWalRace9346')}
// A locally identical base does not prove the server accepted this operation.
 // Keep the legacy API but route all removal decisions through the verified
 // finance reconciler. No direct queue/archive writes from this module.
let lastProofAt=0,proofBusy=false;
async function pruneRedundantPayrollMonthWal(){
 if(window.__HLGB_AUTH_READY!==true)return {removed:0,reason:'not-authenticated'};
 const api=window.hlgbHubFinanceWal9451;
 if(typeof api?.reconcile!=='function')return {removed:0,reason:'verified-reconciler-unavailable'};
 const now=Date.now();if(proofBusy||api.status?.()?.reconcileBusy)return {removed:0,reason:'busy'};
 if(lastProofAt&&now-lastProofAt<30000)return {removed:0,reason:'cooldown'};
 proofBusy=true;lastProofAt=now;
 try{
  const out=await api.reconcile('legacy-payroll-month-prune');
  if(out?.busy||out?.error)return {removed:0,reason:out?.error?'reconcile-failed':'busy'};
  const results=Array.isArray(out?.results)?out.results:[];
  const removed=results.reduce((n,x)=>n+(x.ok===true&&!x.removed?.blocked&&Number.isInteger(x.removed?.total)?Math.max(0,x.removed.total):0),0);
  return {removed,keys:results.filter(x=>x.ok===true&&x.removed?.total>0).map(x=>'hubFinanceEntries|'+sid(x.id)),reason:'verified-reconciliation'};
 }catch(_){return {removed:0,reason:'reconcile-failed'}}finally{proofBusy=false}
}
function stamp(){try{const cur=parseFloat(String(window.HLGB_RELEASE_VERSION||'0'))||0;if(cur<93.44){window.HLGB_RELEASE_VERSION=V;const el=document.querySelector('#appShell .logo small');if(el)el.textContent='v'+V}}catch(e){}}
/* v94.39: não injeta mais release-wal-single-authority-v9339.js.
   O arquivo oficial é carregado apenas por app-stable3. Quando estiver disponível,
   este módulo apenas reutiliza sua API e solicita manutenção. */
function loadWalSingleAuthority(){
 try{
  const api=window.hlgbWalSingleAuthority9339,cur=parseFloat(String(api?.version||window.HLGB_WAL_SINGLE_AUTHORITY_9339||'0'))||0;
  if(cur>=93.48){try{api?.maintain?.()}catch(e){};return true}
  return false;
 }catch(e){console.warn('[HLGB v93.44] autoridade WAL ainda não disponível',e);return false}
}
let guardScheduled=false,guardFallbackState='';
function loadReliableGuard(){
 try{
  if(window.HLGB_PAYROLL_RELIABLE_SAVE_GUARD_9344)return true;
  // The parser loads the canonical guard immediately after this module.
  // A zero-delay timer can fire while it is still waiting on the network.
  if(document.readyState==='loading'){
   if(!guardScheduled){guardScheduled=true;document.addEventListener('DOMContentLoaded',()=>loadReliableGuard(),{once:true})}
   return false;
  }
  if(guardFallbackState||document.querySelector('script[data-hlgb-payroll-reliable-guard="9344"]'))return false;
  guardFallbackState='loading';
  const s=document.createElement('script');s.dataset.hlgbPayrollReliableGuard='9344';s.src='./release-payroll-reliable-save-guard-v9344.js?fresh='+Date.now();
  s.onload=()=>{guardFallbackState=window.HLGB_PAYROLL_RELIABLE_SAVE_GUARD_9344?'ready':'unavailable'};
  s.onerror=()=>{guardFallbackState='failed';console.warn('[HLGB v93.44] guard hlgb955ReliableSave não carregou')};
  (document.head||document.documentElement).appendChild(s);return true;
 }catch(e){guardFallbackState='failed';console.warn('[HLGB v93.44] guard hlgb955ReliableSave indisponível',e);return false}
}
function loadReliableGuardAfterParser(){loadReliableGuard()}
async function boot(){stamp();loadWalSingleAuthority();loadReliableGuard();const out=await pruneRedundantPayrollMonthWal();if(out.removed)console.info('[HLGB] v'+V+' removeu WAL mensal redundante da folha',out.keys);setTimeout(()=>{stamp();loadWalSingleAuthority();loadReliableGuard();if(window.__HLGB_AUTH_READY===true&&!window.hlgbWalReplayBridge9332)window.hlgbWalConfirmedReplay9333?.run?.('v9344-after-prune',true)},350)}
stamp();loadWalSingleAuthority();loadReliableGuardAfterParser();setTimeout(()=>boot().catch(e=>console.warn('[HLGB v93.44] folha mensal',e)),500);setTimeout(()=>{stamp();loadWalSingleAuthority();loadReliableGuard()},1800);setTimeout(()=>{stamp();loadWalSingleAuthority();loadReliableGuard()},4500);
window.hlgbPayrollMonthWal9334={version:V,install,prune:pruneRedundantPayrollMonthWal,sameMeaning,loadWalSingleAuthority,loadReliableGuard,status:()=>({version:V,recordSaveDelegated:true,pruneAuthority:'verified-hub-reconciler',guardFallbackState,walAuthorityLoaded:loadWalSingleAuthority(),finalRecordGuardInstalled:chainHasMarker(window.hlgbRecordSaveWithRetry,'__hlgbPayrollWalRace9346')})};
console.info('[HLGB] v'+V+' conciliação WAL mensal delegada · save delegado para v93.56');
})();
