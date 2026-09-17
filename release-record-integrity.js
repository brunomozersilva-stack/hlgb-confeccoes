/* HLGB audit guard v2: tombstones, exclusão explícita e corte automático órfão */
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
function isAutoOrderCut(module,data){return module==='cuts'&&data&&String(data.autoOrderCutV9203??'').toLowerCase()==='true'}
function parentOrderTombstoned(data){
 const oid=data?.orderId;if(oid==null||sid(oid)==='')return false;
 const s=snapshot('orders',oid);
 return !!(s&&s.deleted_at);
}
function withDeleteMarker(data){
 const base=(data&&typeof data==='object'&&!Array.isArray(data))?{...data}:{};
 base.__hlgb_explicit_delete=true;
 return base;
}
const original=window.hlgbRecordSaveWithRetry;
if(typeof original==='function'&&!original.__hlgbRecordIntegrityV2){
 const wrapped=async function(module,id,data,deleted=false){
  const restore=explicitRestore(data),snap=snapshot(module,id);
  if(!deleted&&!restore&&snap?.deleted_at){
   removeLocal(module,id);
   const err=new Error('Registro já excluído na nuvem. Uma sessão antiga tentou restaurá-lo automaticamente. Atualize a tela antes de continuar.');
   err.code='HLGB_TOMBSTONE_BLOCK';throw err;
  }
  if(!deleted&&!restore&&isAutoOrderCut(module,data)&&parentOrderTombstoned(data)){
   removeLocal(module,id);
   const err=new Error('Corte automático bloqueado porque o pedido correspondente já foi excluído na nuvem.');
   err.code='HLGB_ORPHAN_AUTO_CUT_BLOCK';throw err;
  }
  const sendData=deleted?withDeleteMarker(data):data;
  const out=await original.call(this,module,id,sendData,deleted);
  if(!deleted&&!restore&&out?.deleted_at){
   removeLocal(module,id);
   const err=new Error('Registro já excluído na nuvem. A restauração automática foi bloqueada.');
   err.code='HLGB_TOMBSTONE_BLOCK';throw err;
  }
  return out;
 };
 wrapped.__hlgbRecordIntegrityV1=true;
 wrapped.__hlgbRecordIntegrityV2=true;
 wrapped.__original=original;
 window.hlgbRecordSaveWithRetry=wrapped;
}
window.HLGB_RECORD_INTEGRITY_GUARD='v2';
console.info('[HLGB] integridade de registros v2: tombstones, exclusão explícita e corte órfão protegidos');
})();