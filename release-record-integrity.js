/* HLGB audit guard v7: tombstones, concorrência segura, IDs de corte e no-op técnico */
(function(){
'use strict';
const sid=v=>String(v??'');
const clone=v=>{try{return JSON.parse(JSON.stringify(v))}catch(e){return v}};
const eq=(a,b)=>{try{return JSON.stringify(a)===JSON.stringify(b)}catch(e){return a===b}};
const plain=v=>!!v&&typeof v==='object'&&!Array.isArray(v);
function explicitRestore(data){return !!(data&&['true','1','yes'].includes(String(data.__hlgb_explicit_restore??'').toLowerCase()))}
function snapshot(module,id){try{return hlgbRecordSnapshots?.[module]?.get?.(sid(id))||null}catch(e){return null}}
function snapshotHas(module,id){try{return !!hlgbRecordSnapshots?.[module]?.has?.(sid(id))}catch(e){return !!snapshot(module,id)}}
function localIndex(module,id){
 try{
  const arr=Array.isArray(db?.[module])?db[module]:[];
  return arr.findIndex((x,i)=>{
   try{if(typeof hlgbRecordId==='function')return sid(hlgbRecordId(module,x,i))===sid(id)}catch(_){}
   return sid(x?.id)===sid(id);
  });
 }catch(e){return -1}
}
function replaceLocal(module,id,data){
 try{
  if(!window.db||!Array.isArray(db?.[module]))return false;
  const i=localIndex(module,id);if(i<0)return false;
  db[module][i]=clone(data);if(typeof localSaveOnly==='function')localSaveOnly();return true;
 }catch(e){console.warn('[HLGB record integrity] restauração local',e);return false}
}
function removeLocal(module,id){
 try{
  if(!window.db||!Array.isArray(db?.[module]))return;
  const i=localIndex(module,id);if(i<0)return;
  db[module].splice(i,1);if(typeof localSaveOnly==='function')localSaveOnly();
 }catch(e){console.warn('[HLGB record integrity] limpeza local',e)}
}
function isAutoOrderCut(module,data){return module==='cuts'&&data&&String(data.autoOrderCutV9203??'').toLowerCase()==='true'}
function parentOrderTombstoned(data){
 const oid=data?.orderId;if(oid==null||sid(oid)==='')return false;
 const s=snapshot('orders',oid);
 return !!(s&&s.deleted_at);
}
function statusNorm(v){return sid(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase()}
function activeSnapshotRows(module){
 const out=[];try{
  const map=hlgbRecordSnapshots?.[module];
  if(map&&typeof map[Symbol.iterator]==='function'){
   for(const [id,s] of map)if(s&&!s.deleted_at&&s.data)out.push({id:sid(id),data:s.data,snapshot:s});
  }
 }catch(e){}
 return out;
}
function cutBlocksAuto(c){
 if(!c)return false;const st=statusNorm(c.status);
 if(st.includes('cancel'))return false;
 if(c.autoOrderCutV9203===true||c.autoOrderCutV9199===true)return true;
 return c.done===true||!!c.fulfilledAt||st.includes('finalizado')||st.includes('concluido')||st.includes('atendido por producao');
}
function logicalAutoCutTwin(id,data){
 if(!isAutoOrderCut('cuts',data)||data?.orderId==null)return null;
 const oid=sid(data.orderId),own=sid(id);
 for(const c of (Array.isArray(db?.cuts)?db.cuts:[])){
  if(!c||sid(c.id)===own||sid(c.orderId)!==oid||!cutBlocksAuto(c))continue;
  return {id:sid(c.id),data:c,source:'local'};
 }
 for(const row of activeSnapshotRows('cuts')){
  const c=row.data;if(row.id===own||sid(c?.orderId)!==oid||!cutBlocksAuto(c))continue;
  return row;
 }
 return null;
}
function freeAutoProduction(p){
 if(!p||p.assignmentSource!==true)return false;
 if(p.productionLocationId||p.factionId||p.finishedAt||(+p.done||0)>0)return false;
 const st=statusNorm(p.stage||p.status);
 return !st.includes('pronto')&&!st.includes('finalizado')&&!st.includes('consolidado')&&(+p.planned||0)>0;
}
function productionLogicalKey(p){
 if(!p)return '';
 const explicit=sid(p.cutProductKey);if(explicit)return 'K:'+explicit;
 const cut=sid(p.cutId);if(!cut)return '';
 const pid=sid(p.productId);return 'C:'+cut+(pid?':P:'+pid:'');
}
function logicalProductionTwin(id,data){
 if(!freeAutoProduction(data))return null;
 const key=productionLogicalKey(data);if(!key)return null;const own=sid(id);
 for(const p of (Array.isArray(db?.production)?db.production:[])){
  if(!p||sid(p.id)===own||!freeAutoProduction(p)||productionLogicalKey(p)!==key)continue;
  return {id:sid(p.id),data:p,source:'local'};
 }
 for(const row of activeSnapshotRows('production')){
  const p=row.data;if(row.id===own||!freeAutoProduction(p)||productionLogicalKey(p)!==key)continue;
  return row;
 }
 return null;
}
function blockedDuplicateResult(data,twin,kind){
 return {applied:true,data:clone(data),deleted_at:null,revision:+twin?.snapshot?.revision||1,updated_at:twin?.snapshot?.updated_at||new Date().toISOString(),updated_by:twin?.snapshot?.updated_by||null,hlgbLogicalDuplicate:true,hlgbDuplicateKind:kind,hlgbTwinId:sid(twin?.id)};
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
function storePendingEnvelope(p){
 try{
  const modules=p?.modules&&typeof p.modules==='object'?p.modules:{};
  let any=false;
  for(const [module,ops] of Object.entries(modules)){
   if(!Array.isArray(ops)||!ops.length){delete modules[module];continue}
   any=true;
  }
  if(any)localStorage.setItem('hlgb_records_pending_v91',JSON.stringify({...p,modules}));
  else localStorage.removeItem('hlgb_records_pending_v91');
 }catch(e){console.warn('[HLGB record integrity] limpeza da fila pendente',e)}
}
function prunePendingTombstones(){
 const p=pendingEnvelope();if(!p?.modules||typeof p.modules!=='object')return {changed:false,removed:0};
 let changed=false,removed=0;
 for(const [module,ops] of Object.entries(p.modules)){
  if(!Array.isArray(ops)){delete p.modules[module];changed=true;continue}
  const keep=[];
  for(const op of ops){
   if(!op){changed=true;continue}
   const snap=snapshot(module,op.id),restore=explicitRestore(op.data);
   if(op.deleted!==true&&snap?.deleted_at&&!restore){
    removeLocal(module,op.id);removed++;changed=true;continue;
   }
   keep.push(op);
  }
  if(keep.length)p.modules[module]=keep;
  else if(ops.length||Object.prototype.hasOwnProperty.call(p.modules,module)){delete p.modules[module];changed=true}
 }
 if(changed)storePendingEnvelope(p);
 return {changed,removed};
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
 return [path||'(registro)'];
}
function conflictError(paths){
 const err=new Error('Conflito de edição: outra sessão alterou o mesmo campo ('+paths.slice(0,3).join(', ')+'). A alteração local foi preservada como pendente e NÃO sobrescreveu a nuvem. Atualize a tela e revise antes de salvar novamente.');
 err.code='HLGB_SAME_FIELD_CONFLICT';err.paths=paths;return err;
}
function normalizedForNoop(module,v,metaKeys=[]){
 if(!plain(v))return clone(v);
 const x=clone(v);for(const k of metaKeys)delete x[k];
 if(module==='cuts'){
  const a=x.clientAllocations;
  if(a==null||(Array.isArray(a)&&a.length===0))x.clientAllocations=[];
 }
 return x;
}
function semanticNoop(module,local,remote){
 if(eq(local,remote))return {noop:true,reason:'identical'};
 if(!plain(local)||!plain(remote))return {noop:false,reason:''};
 if(eq(normalizedForNoop(module,local,['updatedAt']),normalizedForNoop(module,remote,['updatedAt'])))return {noop:true,reason:'updatedAt-only-or-empty-cut-allocation'};
 if(eq(normalizedForNoop(module,local,['updatedAt','createdAt']),normalizedForNoop(module,remote,['updatedAt','createdAt'])))return {noop:true,reason:'technical-metadata-only'};
 return {noop:false,reason:''};
}
function noopResult(snap,reason){return {applied:true,data:clone(snap.data),deleted_at:snap.deleted_at||null,revision:+snap.revision||1,updated_at:snap.updated_at||'',updated_by:snap.updated_by||null,hlgbNoop:true,hlgbNoopReason:reason}}

/* O gerador legado de cortes usa Date.now()+random e só checa a memória local.
   Se um ID tombstonado/antigo já existir apenas na nuvem, reidentifique o corte
   recém-criado ANTES de qualquer persistência. */
let cutIdSeq=0;
function freshCutId(){
 const used=new Set((Array.isArray(db?.cuts)?db.cuts:[]).map(x=>sid(x?.id)).filter(Boolean));
 for(let i=0;i<5000;i++){
  const n=Date.now()*1000+((cutIdSeq++)%1000);
  if(!Number.isSafeInteger(n))break;
  const k=sid(n);
  if(!used.has(k)&&!snapshotHas('cuts',k))return n;
 }
 throw new Error('Não foi possível gerar um identificador único para o novo corte. Atualize a tela e tente novamente.');
}
const oldSyncCuts=window.syncOrdersToCuts;
if(typeof oldSyncCuts==='function'&&!oldSyncCuts.__hlgbCutIdGuardV7){
 const safeSync=function(){
  const before=new Set((Array.isArray(db?.cuts)?db.cuts:[]).map(x=>sid(x?.id)).filter(Boolean));
  const result=oldSyncCuts.apply(this,arguments);
  let rekeyed=false;
  for(const c of (Array.isArray(db?.cuts)?db.cuts:[])){
   if(!c||c.autoOrderCutV9203!==true)continue;
   const oldId=sid(c.id);if(!oldId||before.has(oldId))continue;
   if(!snapshotHas('cuts',oldId))continue;
   const newId=freshCutId();
   console.warn('[HLGB record integrity] colisão de ID de corte automático evitada',oldId,'→',newId);
   c.id=newId;c.updatedAt=new Date().toISOString();rekeyed=true;
  }
  if(rekeyed){try{localSaveOnly?.()}catch(e){}}
  return result||rekeyed;
 };
 safeSync.__hlgbCutIdGuardV7=true;safeSync.__original=oldSyncCuts;window.syncOrdersToCuts=safeSync;
}

const oldMerge=window.cloudMergeThreeWay;
if(typeof oldMerge==='function'&&!oldMerge.__hlgbConflictGuardV7){
 const safeMerge=function(base,local,remote){const paths=conflictPaths(base,local,remote);if(paths.length)throw conflictError(paths);return oldMerge(base,local,remote)};
 safeMerge.__hlgbConflictGuardV3=true;safeMerge.__hlgbConflictGuardV4=true;safeMerge.__hlgbConflictGuardV5=true;safeMerge.__hlgbConflictGuardV6=true;safeMerge.__hlgbConflictGuardV7=true;safeMerge.__original=oldMerge;window.cloudMergeThreeWay=safeMerge;
}

const original=window.hlgbRecordSaveWithRetry;
if(typeof original==='function'&&!original.__hlgbRecordIntegrityV7){
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
  if(!deleted&&!restore&&module==='cuts'&&isAutoOrderCut(module,data)){
   const twin=logicalAutoCutTwin(id,data);
   if(twin){
    removeLocal(module,id);
    console.warn('[HLGB record integrity] corte automático lógico duplicado bloqueado',id,'→',twin.id);
    return blockedDuplicateResult(data,twin,'auto-cut-order');
   }
  }
  if(!deleted&&!restore&&module==='production'&&freeAutoProduction(data)){
   const twin=logicalProductionTwin(id,data);
   if(twin){
    removeLocal(module,id);
    console.warn('[HLGB record integrity] produção automática lógica duplicada bloqueada',id,'→',twin.id);
    return blockedDuplicateResult(data,twin,'production-cut-key');
   }
  }
  if(!deleted&&!restore&&snap&&!snap.deleted_at){
   const same=semanticNoop(module,data,snap.data);
   if(same.noop){replaceLocal(module,id,snap.data);return noopResult(snap,same.reason)}
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
 wrapped.__hlgbRecordIntegrityV1=true;wrapped.__hlgbRecordIntegrityV2=true;wrapped.__hlgbRecordIntegrityV3=true;wrapped.__hlgbRecordIntegrityV4=true;wrapped.__hlgbRecordIntegrityV5=true;wrapped.__hlgbRecordIntegrityV6=true;wrapped.__hlgbRecordIntegrityV7=true;wrapped.__original=original;
 window.hlgbRecordSaveWithRetry=wrapped;
}
const oldPendingStore=window.hlgbRecordPendingStore;
if(typeof oldPendingStore==='function'&&!oldPendingStore.__hlgbPendingTombstoneV1){
 const wrapped=function(){
  prunePendingTombstones();
  const out=oldPendingStore.apply(this,arguments);
  prunePendingTombstones();
  return out;
 };
 wrapped.__hlgbPendingTombstoneV1=true;wrapped.__original=oldPendingStore;window.hlgbRecordPendingStore=wrapped;
}
const oldLoadCore=window.hlgbLoadNormalizedCore;
if(typeof oldLoadCore==='function'&&!oldLoadCore.__hlgbPendingTombstoneV1){
 const wrapped=async function(){
  const out=await oldLoadCore.apply(this,arguments);
  prunePendingTombstones();
  return out;
 };
 wrapped.__hlgbPendingTombstoneV1=true;wrapped.__original=oldLoadCore;window.hlgbLoadNormalizedCore=wrapped;
}
const oldLoadBundle=window.hlgbRecordLoadBundle;
if(typeof oldLoadBundle==='function'&&!oldLoadBundle.__hlgbPendingTombstoneV1){
 const wrapped=async function(){
  const out=await oldLoadBundle.apply(this,arguments);
  prunePendingTombstones();
  return out;
 };
 wrapped.__hlgbPendingTombstoneV1=true;wrapped.__original=oldLoadBundle;window.hlgbRecordLoadBundle=wrapped;
}
try{prunePendingTombstones()}catch(e){}
window.HLGB_RECORD_INTEGRITY_GUARD='v7';
window.HLGB_RECORD_PENDING_TOMBSTONE_GUARD='v1';
window.HLGB_LOGICAL_DUPLICATE_GUARD='v1';
window.hlgbLogicalAutoCutTwin=logicalAutoCutTwin;
window.hlgbLogicalProductionTwin=logicalProductionTwin;
window.hlgbPrunePendingTombstones=prunePendingTombstones;
window.hlgbRecordConflictPaths=conflictPaths;
window.hlgbRecordStalePending=stalePending;
window.hlgbRecordSemanticNoop=semanticNoop;
window.hlgbFreshCutId=freshCutId;
console.info('[HLGB] integridade de registros v7 + tombstone v1 + duplicidade lógica v1 ativa');
})();