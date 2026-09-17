/* HLGB audit — integridade da capacidade criada automaticamente pelo corte */
(function(){
'use strict';
const sid=v=>String(v??'');
function arr(){try{return Array.isArray(db?.capacityAssignments)?db.capacityAssignments:[]}catch(e){return []}}
function q(v){return Number(v)||0}
function isAuto(a){return String(a?.source||'')==='cut_assignment'}
function key(a){return [sid(a?.orderId),sid(a?.itemKey),sid(a?.locationId),sid(a?.date),String(q(a?.qty))].join('::')}
function canonical(rows){
 const out=[],seen=new Set();
 for(const row of Array.isArray(rows)?rows:[]){
  if(!isAuto(row)){out.push(row);continue}
  const k=key(row);if(seen.has(k))continue;seen.add(k);out.push(row);
 }
 return out;
}
function normalizeLocal(){
 const full=arr(),next=canonical(full);if(next.length===full.length)return false;
 db.capacityAssignments=next;return true;
}
const oldSave=window.save;
if(typeof oldSave==='function'&&!oldSave.__hlgbCapacityIntegrityV1){
 const wrapped=function(){normalizeLocal();return oldSave.apply(this,arguments)};
 wrapped.__hlgbCapacityIntegrityV1=true;wrapped.__original=oldSave;window.save=wrapped;
}
const oldPersist=window.persistDb;
if(typeof oldPersist==='function'&&!oldPersist.__hlgbCapacityIntegrityV1){
 const wrapped=function(){normalizeLocal();return oldPersist.apply(this,arguments)};
 wrapped.__hlgbCapacityIntegrityV1=true;wrapped.__original=oldPersist;window.persistDb=wrapped;
}
const oldRender=window.renderCapacityPlanning;
if(typeof oldRender==='function'&&!oldRender.__hlgbCapacityIntegrityV1){
 const wrapped=function(){normalizeLocal();return oldRender.apply(this,arguments)};
 wrapped.__hlgbCapacityIntegrityV1=true;wrapped.__original=oldRender;window.renderCapacityPlanning=wrapped;
}
const oldIncoming=window.hlgbRenderIncomingRecord;
if(typeof oldIncoming==='function'&&!oldIncoming.__hlgbCapacityIntegrityV1){
 const wrapped=function(module){const r=oldIncoming.apply(this,arguments);if(module==='capacityAssignments')normalizeLocal();return r};
 wrapped.__hlgbCapacityIntegrityV1=true;wrapped.__original=oldIncoming;window.hlgbRenderIncomingRecord=wrapped;
}
try{normalizeLocal()}catch(e){}
try{if(typeof hlgbAfterLogin==='function')hlgbAfterLogin(()=>setTimeout(()=>{normalizeLocal();try{window.renderCapacityPlanning?.()}catch(e){}},900),0)}catch(e){}
window.hlgbCanonicalCapacityAssignments=canonical;
window.hlgbNormalizeCapacityAssignments=normalizeLocal;
window.HLGB_CAPACITY_INTEGRITY_GUARD='v1';
console.info('[HLGB] capacidade: duplicidade exata de cut_assignment bloqueada; divisões manuais preservadas');
})();