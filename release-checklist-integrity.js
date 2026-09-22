/* HLGB audit — integridade de checklist de material e capacidade automática */
(function(){
'use strict';
const clone=v=>{try{return JSON.parse(JSON.stringify(v))}catch(e){return v}};
const stable=v=>{try{return JSON.stringify(v)}catch(e){return String(v)}};
function comparable(row,dropCreated=true){
 const x=clone(row||{});delete x.id;if(dropCreated)delete x.createdAt;return x;
}
function exactEquivalent(a,b){return stable(comparable(a))===stable(comparable(b))}
function canonicalRows(rows){
 const out=[];
 for(const row of Array.isArray(rows)?rows:[]){if(!out.some(x=>exactEquivalent(x,row)))out.push(row)}
 return out;
}
function autoCapacityKey(row){
 if(!row||String(row.source||'')!=='cut_assignment')return '';
 return [row.orderId,row.itemKey,row.locationId,row.factionId,row.qty,row.date,row.source].map(v=>String(v??'')).join('|');
}
function canonicalCapacity(rows){
 const out=[],seen=new Set();
 for(const row of Array.isArray(rows)?rows:[]){
  const k=autoCapacityKey(row);
  if(k&&seen.has(k))continue;
  if(k)seen.add(k);out.push(row);
 }
 return out;
}
function removeNewAutoCapacityDuplicates(){
 const full=Array.isArray(db?.capacityAssignments)?db.capacityAssignments:[];
 const canonical=canonicalCapacity(full);
 if(canonical.length!==full.length)db.capacityAssignments=canonical;
 return full.length-canonical.length;
}
const oldCreate=window.hlgb916CreateMaterialChecklist;
if(typeof oldCreate==='function'&&!oldCreate.__hlgbChecklistGuard){
 const guarded=function(){
  const before=Array.isArray(db?.materialChecklists)?db.materialChecklists.slice():[];
  const rec=oldCreate.apply(this,arguments);
  removeNewAutoCapacityDuplicates();
  if(!rec)return rec;
  const same=before.find(x=>exactEquivalent(x,rec));
  if(same){db.materialChecklists=(db.materialChecklists||[]).filter(x=>String(x?.id)!==String(rec.id));return same}
  return rec;
 };
 guarded.__hlgbChecklistGuard=true;guarded.__original=oldCreate;window.hlgb916CreateMaterialChecklist=guarded;
}
const oldRender=window.renderDestinationChecklists;
if(typeof oldRender==='function'&&!oldRender.__hlgbChecklistGuard){
 const guardedRender=function(){
  const full=Array.isArray(db?.materialChecklists)?db.materialChecklists:[],canonical=canonicalRows(full);
  if(canonical.length===full.length)return oldRender.apply(this,arguments);
  db.materialChecklists=canonical;try{return oldRender.apply(this,arguments)}finally{db.materialChecklists=full}
 };
 guardedRender.__hlgbChecklistGuard=true;guardedRender.__original=oldRender;window.renderDestinationChecklists=guardedRender;
}
const oldCapacityRender=window.renderCapacityPlanning;
if(typeof oldCapacityRender==='function'&&!oldCapacityRender.__hlgbCapacityGuard){
 const guardedCapacityRender=function(){
  const full=Array.isArray(db?.capacityAssignments)?db.capacityAssignments:[],canonical=canonicalCapacity(full);
  if(canonical.length===full.length)return oldCapacityRender.apply(this,arguments);
  db.capacityAssignments=canonical;try{return oldCapacityRender.apply(this,arguments)}finally{db.capacityAssignments=full}
 };
 guardedCapacityRender.__hlgbCapacityGuard=true;guardedCapacityRender.__original=oldCapacityRender;window.renderCapacityPlanning=guardedCapacityRender;
}
window.hlgbCanonicalMaterialChecklists=canonicalRows;
window.hlgbCanonicalAutoCapacity=canonicalCapacity;
window.HLGB_CHECKLIST_INTEGRITY_GUARD='v2';
console.info('[HLGB] checklist/capacidade: duplicidades automáticas exatas bloqueadas e histórico consolidado sem exclusão');
})();