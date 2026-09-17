/* HLGB audit guard v3: tombstones, cortes órfãos e concorrência segura */
(function(){
'use strict';
const sid=v=>String(v??'');
const clone=v=>{try{return JSON.parse(JSON.stringify(v))}catch(e){return v}};
const eq=(a,b)=>{try{return JSON.stringify(a)===JSON.stringify(b)}catch(e){return a===b}};
const plain=v=>!!v&&typeof v==='object'&&!Array.isArray(v);
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
function pendingEnvelope(){
 try{return JSON.parse(localStorage.getItem('hlgb_records_pending_v91')||'null')}catch(e){return null}
}
function matchingPending(module,id,data){
 const p=pendingEnvelope(),ops=Array.isArray(p?.modules?.[module])?p.modules[module]:[];
 const op=ops.find(x=>x&&sid(x.id)===sid(id)&&x.deleted!==true&&eq(x.data,data));
 return op?{pending:p,op}:null;
}
function stalePending(module,id,data,snap){
 const hit=matchingPending(module,id,data);if(!hit||!snap?.updated_at)return null;
 const pendingAt=Number(hit.pending?.at)||0,remoteAt=Date.parse(String(snap.updated_at||''));
 if(!pendingAt||!Number.isFinite(remoteAt))return null;
 return remoteAt>pendingAt+1000?{pendingAt,remoteAt,op:hit.op}:null;
}
function conflictPaths(base,local,remote,path=''){
 if(eq(local,base)||eq(remote,base)||eq(local,remote))return [];
 if(plain(local)&&plain(remote)){
  const b=plain(base)?base:{},keys=new Set([...Object.keys(b),...Object.keys(local),...Object.keys(remote)]),out=[];
  for(const k of keys){
   const hb=Object.prototype.hasOwnProperty.call(b,k),hl=Object.prototype.hasOwnProperty.call(local,k),hr=Object.prototype.hasOwnProperty.call(remote,k),p=path?path+'.'+k:k;
   const bv=hb?b[k]:undefined,lv=hl?local[k]:undefined,rv=hr?remote[k]:undefined;
   if(!hl||!hr){
    const lChanged=hl?(!hb||!eq(lv,bv)):hb;
    const rChanged=hr?(!hb||!eq(rv,bv)):hb;
    if(lChanged&&rChanged)out.push(p);
    continue;
   }
   out.push(...conflictPaths(bv,lv,rv,p));
  }
  return out;
 }
 // Arrays alterados dos dois lados são tratados como conflito por segurança.
 // É preferível pedir atualização a misturar silenciosamente grade, histórico ou pagamentos.
 return [path||'(registro)'];
}
function conflictError(paths){
 const err=new Error('Conflito de edição: outra sessão alterou o mesmo campo ('+paths.slice(0,3).join(', ')+'). A alteração local foi preservada como pendente e NÃO sobrescreveu a nuvem. Atualize a tela e revise antes de salvar novamente.');
 err.code='HLGB_SAME_FIELD_CONFLICT';err.paths=paths;return err;
}

/* Endurece a mescla central: alterações independentes continuam mesclando; o mesmo campo nunca escolhe automaticamente a sessão local. */
const oldMerge=window.cloudMergeThreeWay;
if(typeof oldMerge==='function'&&!oldMerge.__hlgbConflictGuardV3){
 const safeMerge=function(base,local,remote){const paths=conflictPaths(base,local,remote);if(paths.length)throw conflictError(paths);return oldMerge(base,local,remote)};
 safeMerge.__hlgbConflictGuardV3=true;safeMerge.__original=oldMerge;window.cloudMergeThreeWay=safeMerge;
}

const original=window.hlgbRecordSaveWithRetry;
if(typeof original==='function'&&!original.__hlgbRecordIntegrityV3){
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
  if(!deleted&&!restore){
   const stale=stalePending(module,id,data,snap);
   if(stale){
    const err=new Error('Alteração pendente bloqueada: ela foi criada antes da versão mais recente que já está na nuvem. O sistema não vai regravar dado antigo por cima do novo. Atualize e revise este registro.');
    err.code='HLGB_STALE_PENDING_BLOCK';err.pendingAt=stale.pendingAt;err.remoteAt=stale.remoteAt;throw err;
   }
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
 wrapped.__hlgbRecordIntegrityV1=true;wrapped.__hlgbRecordIntegrityV2=true;wrapped.__hlgbRecordIntegrityV3=true;wrapped.__original=original;
 window.hlgbRecordSaveWithRetry=wrapped;
}
window.HLGB_RECORD_INTEGRITY_GUARD='v3';
window.hlgbRecordConflictPaths=conflictPaths;
window.hlgbRecordStalePending=stalePending;
console.info('[HLGB] integridade de registros v3: tombstones, corte órfão, pendência obsoleta e conflito no mesmo campo protegidos');
})();