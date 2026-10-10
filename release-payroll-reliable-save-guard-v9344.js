/* HLGB v93.45 — guarda a entrada direta hlgb955ReliableSave + estabilização finita da folha mensal.
   Evita WAL técnico quando a linha consolidada difere da nuvem apenas em updatedAt.
   Durante os primeiros 5 minutos após o boot, normaliza somente o timestamp local confirmado
   e pede a poda estrita do WAL mensal redundante. Não toca alterações reais nem conflitos. */
(function(){
'use strict';
const V='93.45',SETTLE_MS=300000,TICK_MS=2000;
if(window.HLGB_PAYROLL_RELIABLE_SAVE_GUARD_9344===V)return;
window.HLGB_PAYROLL_RELIABLE_SAVE_GUARD_9344=V;
const sid=v=>String(v??'');
const clone=v=>{try{return structuredClone(v)}catch(e){try{return JSON.parse(JSON.stringify(v))}catch(_){return v}}};
function payrollMonth(v){return !!(v&&v.sourceType==='payroll_month'&&sid(v.sourceId||'').trim())}
function canonical(v){if(Array.isArray(v))return v.map(canonical);if(!v||typeof v!=='object')return v;const o={};for(const k of Object.keys(v).sort()){if(k==='updatedAt')continue;o[k]=canonical(v[k])}return o}
function sameMeaning(a,b){try{return JSON.stringify(canonical(a))===JSON.stringify(canonical(b))}catch(e){return false}}
function snapshot(id){try{return window.hlgbRecordSnapshots?.hubFinanceEntries?.get?.(sid(id))||null}catch(e){return null}}
function localRows(){try{if(typeof db!=='undefined'&&db){db.hubFinanceEntries=Array.isArray(db.hubFinanceEntries)?db.hubFinanceEntries:[];return db.hubFinanceEntries}}catch(e){}try{window.db.hubFinanceEntries=Array.isArray(window.db?.hubFinanceEntries)?window.db.hubFinanceEntries:[];return window.db.hubFinanceEntries}catch(e){return []}}
function localSave(){try{window.localSaveOnly?.();return true}catch(e){try{localSaveOnly?.();return true}catch(_){return false}}}
function normalizeMonthlyTimestamps(){
 let changed=0;
 for(const row of localRows()){
  if(!payrollMonth(row))continue;
  const id=sid(row?.id??row?.__hlgbId);if(!id)continue;
  const s=snapshot(id);
  if(!s||s.deleted_at||!s.data||!sameMeaning(row,s.data))continue;
  const wanted=sid(s.data.updatedAt||'');
  if(sid(row.updatedAt||'')===wanted)continue;
  row.updatedAt=s.data.updatedAt||'';changed++;
 }
 if(changed)localSave();
 return changed;
}
function noopResult(s){return {applied:true,data:clone(s.data),deleted_at:s.deleted_at||null,revision:+s.revision||1,updated_at:s.updated_at||'',updated_by:s.updated_by||null,hlgbNoop:true,hlgbNoopReason:'payroll-month-updatedAt-only-v9345'}}
let installs=0,lastNoopAt='',lastNoopId='',settleTimer=null,settleBusy=false,settleStartedAt='',settleDeadline=0,settleTicks=0,normalizedTimestamps=0,prunedWal=0,settleDone=false,lastSettleError='';
function install(){
 const base=window.hlgb955ReliableSave;
 if(typeof base!=='function')return false;
 if(base.__hlgbPayrollReliableSave9344)return true;
 const wrapped=async function(module,id,data,deleted=false){
  if(module==='hubFinanceEntries'&&!deleted&&payrollMonth(data)){
   const s=snapshot(id);
   if(s&&!s.deleted_at&&s.data&&sameMeaning(data,s.data)){
    lastNoopAt=new Date().toISOString();lastNoopId=sid(id);
    return noopResult(s);
   }
  }
  return base.apply(this,arguments);
 };
 wrapped.__hlgbPayrollReliableSave9344=true;
 wrapped.__original=base;
 window.hlgb955ReliableSave=wrapped;installs++;return true;
}
function stamp(){try{const cur=parseFloat(String(window.HLGB_RELEASE_VERSION||'0'))||0;if(cur<93.45){window.HLGB_RELEASE_VERSION=V;const el=document.querySelector('#appShell .logo small');if(el)el.textContent='v'+V}}catch(e){}}
async function settleTick(){
 if(settleBusy||settleDone)return false;
 settleBusy=true;lastSettleError='';
 try{
  settleTicks++;install();stamp();
  normalizedTimestamps+=normalizeMonthlyTimestamps();
  try{const out=await window.hlgbPayrollMonthWal9334?.prune?.();prunedWal+=Number(out?.removed)||0}catch(e){lastSettleError=sid(e?.message||e)}
  return true;
 }catch(e){lastSettleError=sid(e?.message||e);return false}
 finally{
  settleBusy=false;
  if(settleDeadline&&Date.now()>=settleDeadline){settleDone=true;if(settleTimer){clearInterval(settleTimer);settleTimer=null}}
 }
}
function startSettlement(){
 if(settleTimer||settleDone)return false;
 settleStartedAt=new Date().toISOString();settleDeadline=Date.now()+SETTLE_MS;
 settleTick().catch(()=>{});
 settleTimer=setInterval(()=>settleTick().catch(()=>{}),TICK_MS);
 return true;
}
function loadFinalGuard(){
 try{
  if(window.hlgbPayrollWalRace9346?.install){window.hlgbPayrollWalRace9346.install();return true}
  if(document.querySelector('script[data-hlgb-payroll-wal-race="9346"]'))return true;
  const s=document.createElement('script');s.src='./release-payroll-wal-race-v9346.js?fresh='+Date.now();s.async=false;s.dataset.hlgbPayrollWalRace='9346';s.onload=()=>window.hlgbPayrollWalRace9346?.install?.();s.onerror=()=>console.warn('[HLGB] v93.46 não carregou a trava final da folha');(document.head||document.documentElement).appendChild(s);return true;
 }catch(e){return false}
}
function maintain(){install();stamp();startSettlement()}
window.hlgbPayrollReliableSaveGuard9344={version:V,install,startSettlement,settle:()=>settleTick(),loadFinalGuard,status:()=>({version:V,installs,lastNoopAt,lastNoopId,installed:!!window.hlgb955ReliableSave?.__hlgbPayrollReliableSave9344,settleStartedAt,settleDeadline:settleDeadline?new Date(settleDeadline).toISOString():'',settleTicks,normalizedTimestamps,prunedWal,settleDone,settleBusy,lastSettleError,finalGuard:window.hlgbPayrollWalRace9346?.status?.()||null})};
[0,250,800,1800,3500,6000].forEach(ms=>setTimeout(maintain,ms));
setTimeout(loadFinalGuard,8000);
window.addEventListener('focus',()=>{install();stamp();loadFinalGuard()});window.addEventListener('online',()=>{install();stamp();loadFinalGuard()});
console.info('[HLGB] v'+V+' guarda da folha mensal com estabilização finita de 5 minutos ativa');
})();