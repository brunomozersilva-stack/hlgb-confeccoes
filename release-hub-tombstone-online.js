/* HLGB hotfix 2026-10-01 — absorve tombstone antigo do Hub Financeiro mesmo se Safari/CDN carregar wrapper anterior */
(function(){
'use strict';
const sid=v=>String(v??'');
const clone=v=>{try{return JSON.parse(JSON.stringify(v))}catch(e){return v}};
function snapshot(module,id){try{return hlgbRecordSnapshots?.[module]?.get?.(sid(id))||null}catch(e){return null}}
function localIndex(module,id){
 try{
  const arr=Array.isArray(db?.[module])?db[module]:[];
  return arr.findIndex((x,i)=>{
   try{if(typeof hlgbRecordId==='function')return sid(hlgbRecordId(module,x,i))===sid(id)}catch(_){}
   return sid(x?.id)===sid(id);
  });
 }catch(e){return -1}
}
function removeLocal(module,id){
 try{
  if(typeof db==='undefined'||!Array.isArray(db?.[module]))return;
  const i=localIndex(module,id);if(i<0)return;
  db[module].splice(i,1);if(typeof localSaveOnly==='function')localSaveOnly();
 }catch(e){console.warn('[HLGB tombstone online hotfix] limpeza local',e)}
}
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
 }catch(e){console.warn('[HLGB tombstone online hotfix] limpeza da fila',e);return false}
}
const original=window.hlgbRecordSaveWithRetry;
if(typeof original==='function'&&!original.__hlgbHubTombstoneOnlineV1){
 const wrapped=async function(module,id,data,deleted=false){
  try{return await original.apply(this,arguments)}
  catch(err){
   if(module==='hubFinanceEntries'&&!deleted&&err?.code==='HLGB_TOMBSTONE_BLOCK'){
    const snap=snapshot(module,id);
    if(!snap?.deleted_at)throw err;
    removeLocal(module,id);prunePending(module,id);
    try{window.hlgbPrunePendingTombstones?.()}catch(_){}
    return {applied:true,data:clone(snap.data),deleted_at:snap.deleted_at,revision:+snap.revision||1,updated_at:snap.updated_at||'',updated_by:snap.updated_by||null,hlgbTombstonePruned:true,hlgbOnlineCacheCompat:true};
   }
   throw err;
  }
 };
 wrapped.__hlgbHubTombstoneOnlineV1=true;wrapped.__original=original;
 window.hlgbRecordSaveWithRetry=wrapped;
}
window.HLGB_HUB_TOMBSTONE_ONLINE_GUARD='2026.10.01-v1';
console.info('[HLGB] compatibilidade online de tombstone do Hub Financeiro ativa');
})();