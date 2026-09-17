/* HLGB audit — integridade de checklist de material */
(function(){
'use strict';
const clone=v=>{try{return JSON.parse(JSON.stringify(v))}catch(e){return v}};
const stable=v=>{try{return JSON.stringify(v)}catch(e){return String(v)}};
function comparable(row){
 const x=clone(row||{});delete x.id;delete x.createdAt;return x;
}
function exactEquivalent(a,b){return stable(comparable(a))===stable(comparable(b))}
function canonicalRows(rows){
 const out=[];
 for(const row of Array.isArray(rows)?rows:[]){
  const dup=out.find(x=>exactEquivalent(x,row));
  if(!dup)out.push(row);
 }
 return out;
}
const oldCreate=window.hlgb916CreateMaterialChecklist;
if(typeof oldCreate==='function'&&!oldCreate.__hlgbChecklistGuard){
 const guarded=function(){
  const before=Array.isArray(db?.materialChecklists)?db.materialChecklists.slice():[];
  const rec=oldCreate.apply(this,arguments);
  if(!rec)return rec;
  const same=before.find(x=>exactEquivalent(x,rec));
  if(same){
   db.materialChecklists=(db.materialChecklists||[]).filter(x=>String(x?.id)!==String(rec.id));
   return same;
  }
  return rec;
 };
 guarded.__hlgbChecklistGuard=true;guarded.__original=oldCreate;window.hlgb916CreateMaterialChecklist=guarded;
}
const oldRender=window.renderDestinationChecklists;
if(typeof oldRender==='function'&&!oldRender.__hlgbChecklistGuard){
 const guardedRender=function(){
  const full=Array.isArray(db?.materialChecklists)?db.materialChecklists:[];
  const canonical=canonicalRows(full);
  if(canonical.length===full.length)return oldRender.apply(this,arguments);
  db.materialChecklists=canonical;
  try{return oldRender.apply(this,arguments)}finally{db.materialChecklists=full}
 };
 guardedRender.__hlgbChecklistGuard=true;guardedRender.__original=oldRender;window.renderDestinationChecklists=guardedRender;
}
window.hlgbCanonicalMaterialChecklists=canonicalRows;
window.HLGB_CHECKLIST_INTEGRITY_GUARD='v1';
console.info('[HLGB] checklist de material: duplicidade exata bloqueada e histórico equivalente consolidado na tela');
})();