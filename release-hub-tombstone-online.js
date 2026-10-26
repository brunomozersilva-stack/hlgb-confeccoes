/* ByHagatha v94.10 — reconcilia tombstones confirmados do Hub sem alterar a autoridade de salvamento */
(function(){
'use strict';
const V='94.10';
const MODULE='hubFinanceEntries';
const LOCAL_TOMBSTONE_KEY='hlgb_hub_tombstone_ids_v9410';
const sid=v=>String(v??'');
const clone=v=>{try{return JSON.parse(JSON.stringify(v))}catch(e){return v}};
const truthy=v=>v===true||v===1||v==='1'||v==='true'||(typeof v==='string'&&v.trim()!==''&&v!=='0'&&v!=='false');
function snapshot(module,id){try{return hlgbRecordSnapshots?.[module]?.get?.(sid(id))||null}catch(e){return null}}
function rowId(row,index){
 try{if(typeof hlgbRecordId==='function')return sid(hlgbRecordId(MODULE,row,index))}catch(_){}
 return sid(row?.id??row?.__hlgbId);
}
function tombstoneField(row){
 if(!row||typeof row!=='object')return false;
 return truthy(row._deleted)||truthy(row.deleted)||truthy(row.isDeleted)||truthy(row.tombstone)||truthy(row.deletedAt)||truthy(row.deleted_at);
}
function readKnownIds(){
 try{const raw=localStorage.getItem(LOCAL_TOMBSTONE_KEY);const a=raw?JSON.parse(raw):[];return new Set(Array.isArray(a)?a.map(sid).filter(Boolean):[])}catch(e){return new Set()}
}
function writeKnownIds(set){try{localStorage.setItem(LOCAL_TOMBSTONE_KEY,JSON.stringify([...set].filter(Boolean).slice(-5000)))}catch(e){}}
function rememberDeletedId(id){const x=sid(id);if(!x)return;const set=readKnownIds();set.add(x);writeKnownIds(set)}
function isTombstoned(row,index){const id=rowId(row,index);return tombstoneField(row)||(!!id&&readKnownIds().has(id))}
function localIndex(module,id){
 try{
  const arr=Array.isArray(db?.[module])?db[module]:[];
  return arr.findIndex((x,i)=>{
   try{if(typeof hlgbRecordId==='function')return sid(hlgbRecordId(module,x,i))===sid(id)}catch(_){}
   return sid(x?.id??x?.__hlgbId)===sid(id);
  });
 }catch(e){return -1}
}
function persistLocal(){try{if(typeof localSaveOnly==='function')localSaveOnly()}catch(e){console.warn('[ByHagatha Hub '+V+'] persistência local',e)}}
function refreshHub(){
 try{window.renderHubFinance?.()}catch(_){}
 try{window.renderHubWeekly?.()}catch(_){}
 try{window.renderHubDue9185?.()}catch(_){}
 try{window.hlgbHubPeriodSummary?.render?.()}catch(_){}
}
function removeLocal(module,id,remember=true){
 try{
  if(module!==MODULE||typeof db==='undefined'||!Array.isArray(db?.[module]))return false;
  const target=sid(id);if(!target)return false;
  if(remember)rememberDeletedId(target);
  const before=db[module].length;
  db[module]=db[module].filter((row,i)=>rowId(row,i)!==target&&!isTombstoned(row,i));
  const changed=db[module].length!==before;
  if(changed)persistLocal();
  return changed;
 }catch(e){console.warn('[ByHagatha Hub '+V+'] limpeza local',e);return false}
}
function pruneLocal(){
 try{
  if(typeof db==='undefined'||!Array.isArray(db?.[MODULE]))return 0;
  const before=db[MODULE].length;
  db[MODULE]=db[MODULE].filter((row,i)=>!isTombstoned(row,i));
  const removed=before-db[MODULE].length;if(removed)persistLocal();return removed;
 }catch(e){return 0}
}
function rememberSnapshotTombstones(){
 let n=0;
 try{
  const map=hlgbRecordSnapshots?.[MODULE];
  if(!map?.forEach)return 0;
  map.forEach((snap,id)=>{
   const row=snap?.data||snap;
   if(truthy(snap?.deleted_at)||truthy(snap?.deletedAt)||tombstoneField(row)){rememberDeletedId(id);n++}
  });
 }catch(e){}
 return n;
}
function reconcile(){const remembered=rememberSnapshotTombstones();const removed=pruneLocal();if(removed)refreshHub();return {remembered,removed}}
function prunePending(module,id){
 try{
  const key='hlgb_records_pending_v91',raw=localStorage.getItem(key);if(!raw)return false;
  const p=JSON.parse(raw);if(!p?.modules||typeof p.modules!=='object')return false;
  const ops=Array.isArray(p.modules[module])?p.modules[module]:[];
  const keep=ops.filter(op=>!op||sid(op.id)!==sid(id));
  if(keep.length===ops.length)return false;
  if(keep.length)p.modules[module]=keep;else delete p.modules[module];
  const hasAny=Object.values(p.modules).some(v=>Array.isArray(v)&&v.length);
  if(hasAny)localStorage.setItem(key,JSON.stringify(p));else localStorage.removeItem(key);
  return true;
 }catch(e){console.warn('[ByHagatha Hub '+V+'] limpeza da fila',e);return false}
}
function deleteIntent(module,data,deleted){return module===MODULE&&(deleted===true||tombstoneField(data))}
function confirmed(res){return !!(res&&(res.applied===true||res.ok===true||truthy(res.deleted_at)||truthy(res.deletedAt)))}
const original=window.hlgbRecordSaveWithRetry;
if(typeof original==='function'&&!original.__hlgbHubTombstoneOnlineV9410){
 const wrapped=async function(module,id,data,deleted=false){
  const deleting=deleteIntent(module,data,deleted);
  try{
   const out=await original.apply(this,arguments);
   if(deleting&&confirmed(out)){
    removeLocal(module,id,true);prunePending(module,id);
    try{window.hlgbPrunePendingTombstones?.()}catch(_){}
    refreshHub();
   }
   return out;
  }catch(err){
   if(module===MODULE&&!deleted&&err?.code==='HLGB_TOMBSTONE_BLOCK'){
    const snap=snapshot(module,id);
    if(!snap?.deleted_at&&!snap?.deletedAt)throw err;
    removeLocal(module,id,true);prunePending(module,id);
    try{window.hlgbPrunePendingTombstones?.()}catch(_){}
    refreshHub();
    return {applied:true,data:clone(snap.data),deleted_at:snap.deleted_at||snap.deletedAt,revision:+snap.revision||1,updated_at:snap.updated_at||'',updated_by:snap.updated_by||null,hlgbTombstonePruned:true,hlgbOnlineCacheCompat:true};
   }
   throw err;
  }
 };
 wrapped.__hlgbHubTombstoneOnlineV9410=true;wrapped.__original=original;
 window.hlgbRecordSaveWithRetry=wrapped;
}
window.hlgbHubIsTombstoned9410=isTombstoned;
window.hlgbHubReconcileTombstones9410=reconcile;
window.HLGB_HUB_TOMBSTONE_ONLINE_GUARD=V;
setTimeout(reconcile,0);setTimeout(reconcile,600);setTimeout(reconcile,2000);
try{if(typeof hlgbAfterLogin==='function')hlgbAfterLogin(()=>setTimeout(reconcile,120),0)}catch(e){}
window.addEventListener('pageshow',()=>setTimeout(reconcile,80));
window.addEventListener('focus',()=>setTimeout(reconcile,80));
console.info('[ByHagatha] Hub '+V+' — exclusões confirmadas reconciliadas sem remover histórico da nuvem');
})();