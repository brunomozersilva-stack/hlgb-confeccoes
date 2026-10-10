/* HLGB v93.46 — trava final da folha mensal acima dos wrappers legados.
   Impede que uma gravação tecnicamente idêntica (mudando apenas updatedAt) chegue à WAL v91.59.
   Alterações reais continuam delegadas para a cadeia canônica, com integridade e conflitos preservados. */
(function(){
'use strict';
const V='93.46';
if(window.HLGB_PAYROLL_WAL_RACE_9346===V)return;
window.HLGB_PAYROLL_WAL_RACE_9346=V;
const sid=v=>String(v??'');
const clone=v=>{try{return structuredClone(v)}catch(e){try{return JSON.parse(JSON.stringify(v))}catch(_){return v}}};
function payrollMonth(v){return !!(v&&v.sourceType==='payroll_month'&&sid(v.sourceId||'').trim())}
function canonical(v){if(Array.isArray(v))return v.map(canonical);if(!v||typeof v!=='object')return v;const o={};for(const k of Object.keys(v).sort()){if(k==='updatedAt')continue;o[k]=canonical(v[k])}return o}
function sameMeaning(a,b){try{return JSON.stringify(canonical(a))===JSON.stringify(canonical(b))}catch(e){return false}}
function snapshot(id){try{return window.hlgbRecordSnapshots?.hubFinanceEntries?.get?.(sid(id))||null}catch(e){return null}}
function noop(s,reason){return {applied:true,data:clone(s.data),deleted_at:s.deleted_at||null,revision:+s.revision||1,updated_at:s.updated_at||'',updated_by:s.updated_by||null,hlgbNoop:true,hlgbNoopReason:reason}}
function chainHas955(fn){let f=fn,n=0,seen=new Set();while(typeof f==='function'&&n++<24&&!seen.has(f)){seen.add(f);if(f.__hlgb955Wrapped)return true;f=f.__original||f.__hlgb9313Original||f.__hlgb9312Original||f.__hlgb9320Original||f.__hlgbRecordIntegrityOriginal||null}return false}
let recordInstalls=0,reliableInstalls=0,lastNoopAt='',lastNoopId='',lastPath='';
function shouldNoop(module,id,data,deleted){
 if(module!=='hubFinanceEntries'||deleted||!payrollMonth(data))return null;
 const s=snapshot(id);
 if(!s||s.deleted_at||!s.data||!sameMeaning(data,s.data))return null;
 return s;
}
function installRecordGuard(){
 const base=window.hlgbRecordSaveWithRetry;
 if(typeof base!=='function')return false;
 if(base.__hlgbPayrollWalRace9346)return true;
 const had955=chainHas955(base);
 const wrapped=async function(module,id,data,deleted=false){
  const s=shouldNoop(module,id,data,deleted);
  if(s){lastNoopAt=new Date().toISOString();lastNoopId=sid(id);lastPath='record';return noop(s,'payroll-month-updatedAt-only-v9346-record')}
  return base.apply(this,arguments);
 };
 wrapped.__hlgbPayrollWalRace9346=true;
 if(had955)wrapped.__hlgb955Wrapped=true;
 wrapped.__original=base;
 window.hlgbRecordSaveWithRetry=wrapped;recordInstalls++;return true;
}
function installReliableGuard(){
 const base=window.hlgb955ReliableSave;
 if(typeof base!=='function')return false;
 if(base.__hlgbPayrollWalRace9346)return true;
 const wrapped=async function(module,id,data,deleted=false){
  const s=shouldNoop(module,id,data,deleted);
  if(s){lastNoopAt=new Date().toISOString();lastNoopId=sid(id);lastPath='reliable';return noop(s,'payroll-month-updatedAt-only-v9346-reliable')}
  return base.apply(this,arguments);
 };
 wrapped.__hlgbPayrollWalRace9346=true;
 wrapped.__original=base;
 window.hlgb955ReliableSave=wrapped;reliableInstalls++;return true;
}
function stamp(){try{const cur=parseFloat(String(window.HLGB_RELEASE_VERSION||'0'))||0;if(cur<93.46){window.HLGB_RELEASE_VERSION=V;const el=document.querySelector('#appShell .logo small');if(el)el.textContent='v'+V}}catch(e){}}
function install(){installRecordGuard();installReliableGuard();stamp()}
window.hlgbPayrollWalRace9346={version:V,install,status:()=>({version:V,recordInstalls,reliableInstalls,lastNoopAt,lastNoopId,lastPath,recordInstalled:!!window.hlgbRecordSaveWithRetry?.__hlgbPayrollWalRace9346,reliableInstalled:!!window.hlgb955ReliableSave?.__hlgbPayrollWalRace9346,recordCarries955:!!window.hlgbRecordSaveWithRetry?.__hlgb955Wrapped})};
install();
[100,350,900,1800,3500,7000].forEach(ms=>setTimeout(install,ms));
window.addEventListener('focus',install);window.addEventListener('online',install);window.addEventListener('pageshow',install);
console.info('[HLGB] v'+V+' trava final da WAL técnica da folha mensal ativa');
})();
