/* HLGB audit guard v1: registro excluído não pode ressuscitar sem restauração explícita */
(function(){
'use strict';
const sid=v=>String(v??'');
function explicitRestore(data){return !!(data&&['true','1','yes'].includes(String(data.__hlgb_explicit_restore??'').toLowerCase()))}
function snapshot(module,id){try{return hlgbRecordSnapshots?.[module]?.get?.(sid(id))||null}catch(e){return null}}
function removeLocal(module,id){
 try{
  if(!window.db||!Array.isArray(db?.[module]))return;
  const before=db[module].length;db[module]=db[module].filter(x=>sid(x?.id)!==sid(id));
  if(db[module].length!==before&&typeof localSaveOnly==='function')localSaveOnly();
 }catch(e){console.warn('[HLGB record integrity] limpeza local',e)}
}
const original=window.hlgbRecordSaveWithRetry;
if(typeof original==='function'&&!original.__hlgbRecordIntegrityV1){
 const wrapped=async function(module,id,data,deleted=false){
  const restore=explicitRestore(data),snap=snapshot(module,id);
  if(!deleted&&!restore&&snap?.deleted_at){
   removeLocal(module,id);
   const err=new Error('Registro já excluído na nuvem. Uma sessão antiga tentou restaurá-lo automaticamente. Atualize a tela antes de continuar.');
   err.code='HLGB_TOMBSTONE_BLOCK';throw err;
  }
  const out=await original.apply(this,arguments);
  if(!deleted&&!restore&&out?.deleted_at){
   removeLocal(module,id);
   const err=new Error('Registro já excluído na nuvem. A restauração automática foi bloqueada.');
   err.code='HLGB_TOMBSTONE_BLOCK';throw err;
  }
  return out;
 };
 wrapped.__hlgbRecordIntegrityV1=true;wrapped.__original=original;window.hlgbRecordSaveWithRetry=wrapped;
}
window.HLGB_RECORD_INTEGRITY_GUARD='v1';
console.info('[HLGB] integridade de registros: tombstones protegidos contra ressurreição local');
})();