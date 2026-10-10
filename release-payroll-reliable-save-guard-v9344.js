/* HLGB v93.44 — guarda a entrada direta hlgb955ReliableSave da folha mensal.
   Evita criar WAL técnico quando a linha consolidada mensal difere da nuvem apenas em updatedAt.
   Não toca alterações reais, não limpa pendências reais e não ignora conflitos. */
(function(){
'use strict';
const V='93.44';
if(window.HLGB_PAYROLL_RELIABLE_SAVE_GUARD_9344===V)return;
window.HLGB_PAYROLL_RELIABLE_SAVE_GUARD_9344=V;
const sid=v=>String(v??'');
const clone=v=>{try{return structuredClone(v)}catch(e){try{return JSON.parse(JSON.stringify(v))}catch(_){return v}}};
function payrollMonth(v){return !!(v&&v.sourceType==='payroll_month'&&sid(v.sourceId||'').trim())}
function canonical(v){if(Array.isArray(v))return v.map(canonical);if(!v||typeof v!=='object')return v;const o={};for(const k of Object.keys(v).sort()){if(k==='updatedAt')continue;o[k]=canonical(v[k])}return o}
function sameMeaning(a,b){try{return JSON.stringify(canonical(a))===JSON.stringify(canonical(b))}catch(e){return false}}
function snapshot(id){try{return window.hlgbRecordSnapshots?.hubFinanceEntries?.get?.(sid(id))||null}catch(e){return null}}
function noopResult(s){return {applied:true,data:clone(s.data),deleted_at:s.deleted_at||null,revision:+s.revision||1,updated_at:s.updated_at||'',updated_by:s.updated_by||null,hlgbNoop:true,hlgbNoopReason:'payroll-month-updatedAt-only-v9344'}}
let installs=0,lastNoopAt='',lastNoopId='';
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
function stamp(){try{const cur=parseFloat(String(window.HLGB_RELEASE_VERSION||'0'))||0;if(cur<93.44){window.HLGB_RELEASE_VERSION=V;const el=document.querySelector('#appShell .logo small');if(el)el.textContent='v'+V}}catch(e){}}
function maintain(){install();stamp()}
window.hlgbPayrollReliableSaveGuard9344={version:V,install,status:()=>({installs,lastNoopAt,lastNoopId,installed:!!window.hlgb955ReliableSave?.__hlgbPayrollReliableSave9344})};
[0,250,800,1800,3500,6000].forEach(ms=>setTimeout(maintain,ms));
window.addEventListener('focus',maintain);window.addEventListener('online',maintain);
console.info('[HLGB] v'+V+' guarda da gravação direta da folha mensal ativa');
})();