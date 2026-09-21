/* HLGB audit — integridade da capacidade criada automaticamente pelo corte */
(function(){
'use strict';
const V='v2';
const sid=v=>String(v??'');
const clone=v=>{try{return JSON.parse(JSON.stringify(v))}catch(e){return v}};
function arr(){try{return Array.isArray(db?.capacityAssignments)?db.capacityAssignments:[]}catch(e){return []}}
function q(v){return Number(v)||0}
function isAuto(a){return String(a?.source||'')==='cut_assignment'}
function key(a){return [sid(a?.orderId),sid(a?.itemKey),sid(a?.locationId),sid(a?.factionId),sid(a?.date),String(q(a?.qty))].join('::')}
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
 db.capacityAssignments=next;try{localSaveOnly?.()}catch(e){}return true;
}
function snapshotTwin(id,data){
 try{
  const m=hlgbRecordSnapshots?.capacityAssignments;if(!m||typeof m[Symbol.iterator]!=='function')return null;
  const k=key(data);
  for(const [rid,s] of m){
   if(sid(rid)===sid(id)||!s||s.deleted_at||!isAuto(s.data))continue;
   if(key(s.data)===k)return {id:sid(rid),data:s.data,snapshot:s};
  }
 }catch(e){}
 return null;
}
function localTwin(id,data){
 const k=key(data);
 return arr().find(x=>sid(x?.id)!==sid(id)&&isAuto(x)&&key(x)===k)||null;
}
function removeLocal(id){
 const i=arr().findIndex(x=>sid(x?.id)===sid(id));if(i>=0){db.capacityAssignments.splice(i,1);try{localSaveOnly?.()}catch(e){}}
}
const oldSave=window.save;
if(typeof oldSave==='function'&&!oldSave.__hlgbCapacityIntegrityV2){
 const wrapped=function(){normalizeLocal();return oldSave.apply(this,arguments)};
 wrapped.__hlgbCapacityIntegrityV1=true;wrapped.__hlgbCapacityIntegrityV2=true;wrapped.__original=oldSave;window.save=wrapped;
}
const oldPersist=window.persistDb;
if(typeof oldPersist==='function'&&!oldPersist.__hlgbCapacityIntegrityV2){
 const wrapped=function(){normalizeLocal();return oldPersist.apply(this,arguments)};
 wrapped.__hlgbCapacityIntegrityV1=true;wrapped.__hlgbCapacityIntegrityV2=true;wrapped.__original=oldPersist;window.persistDb=wrapped;
}
const oldRender=window.renderCapacityPlanning;
if(typeof oldRender==='function'&&!oldRender.__hlgbCapacityIntegrityV2){
 const wrapped=function(){normalizeLocal();return oldRender.apply(this,arguments)};
 wrapped.__hlgbCapacityIntegrityV1=true;wrapped.__hlgbCapacityIntegrityV2=true;wrapped.__original=oldRender;window.renderCapacityPlanning=wrapped;
}
const oldIncoming=window.hlgbRenderIncomingRecord;
if(typeof oldIncoming==='function'&&!oldIncoming.__hlgbCapacityIntegrityV2){
 const wrapped=function(module){const r=oldIncoming.apply(this,arguments);if(module==='capacityAssignments')normalizeLocal();return r};
 wrapped.__hlgbCapacityIntegrityV1=true;wrapped.__hlgbCapacityIntegrityV2=true;wrapped.__original=oldIncoming;window.hlgbRenderIncomingRecord=wrapped;
}
const oldRecordSave=window.hlgbRecordSaveWithRetry;
if(typeof oldRecordSave==='function'&&!oldRecordSave.__hlgbCapacityIntegrityV2){
 const wrapped=async function(module,id,data,deleted=false){
  if(module==='capacityAssignments'&&!deleted&&isAuto(data)){
   const twin=localTwin(id,data)||snapshotTwin(id,data);
   if(twin){
    removeLocal(id);
    console.warn('[HLGB capacity '+V+'] cut_assignment duplicado bloqueado',id,'→',twin.id||twin.id);
    const s=twin.snapshot||{};
    return {applied:true,data:clone(twin.data||data),deleted_at:null,revision:+s.revision||1,updated_at:s.updated_at||new Date().toISOString(),updated_by:s.updated_by||null,hlgbCapacityDuplicate:true,hlgbTwinId:sid(twin.id||twin.id)};
   }
  }
  return oldRecordSave.apply(this,arguments);
 };
 wrapped.__hlgbCapacityIntegrityV2=true;wrapped.__original=oldRecordSave;window.hlgbRecordSaveWithRetry=wrapped;
}
try{normalizeLocal()}catch(e){}
try{if(typeof hlgbAfterLogin==='function')hlgbAfterLogin(()=>setTimeout(()=>{normalizeLocal();try{window.renderCapacityPlanning?.()}catch(e){}},900),0)}catch(e){}
window.hlgbCapacityAssignmentKey=key;
window.hlgbCanonicalCapacityAssignments=canonical;
window.hlgbNormalizeCapacityAssignments=normalizeLocal;
window.HLGB_CAPACITY_INTEGRITY_GUARD=V;
console.info('[HLGB] capacidade '+V+': duplicidade exata cut_assignment bloqueada localmente e antes da gravação; divisões manuais preservadas');
})();