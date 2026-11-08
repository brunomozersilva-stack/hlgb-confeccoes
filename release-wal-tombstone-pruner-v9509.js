/* HLGB v95.09 — comprovacao de tombstones WAL isolada e conservadora.
 * Somente exclusoes ja confirmadas em servidor, no modulo hubFinanceEntries.
 * Nenhum replay, upsert, delete remoto, limpeza de cache ou alteracao de negocio.
 */
(function(){
'use strict';
const VERSION='95.09', DB='hlgb_durable_wal', STORE='entries',
  WAL_KEY='hlgb_durable_wal_v1', MODULE='hubFinanceEntries';
if(window.hlgbWalTombstonePruner9509?.version===VERSION)return;
const sid=v=>String(v??''),state={busy:false,runs:0,removed:0,lastResult:null,lastError:''};
function authenticated(){return window.__HLGB_AUTH_READY===true&&navigator.onLine!==false&&typeof window.cloudRequest==='function'}
function canonical(v){
 if(Array.isArray(v))return v.map(canonical);
 if(v&&typeof v==='object'){const o={};for(const k of Object.keys(v).sort())o[k]=canonical(v[k]);return o}
 return v;
}
function sameOperation(current,expected,key){
 if(!current||!expected||!key)return false;
 if(current.deleted!==true||expected.deleted!==true)return false;
 if(sid(current.key)!==key||sid(expected.key)!==key)return false;
 if(sid(current.module)!==MODULE||sid(expected.module)!==MODULE)return false;
 if(sid(current.id)!==sid(expected.id)||!sid(current.id))return false;
 if(sid(current.opId)!==sid(expected.opId)||!sid(expected.opId))return false;
 // Operation identity alone is not enough: compare payload and optimistic base.
 return JSON.stringify(canonical(current.data))===JSON.stringify(canonical(expected.data))&&
  JSON.stringify(canonical(current.baseData))===JSON.stringify(canonical(expected.baseData))&&
  sid(current.baseUpdatedAt)===sid(expected.baseUpdatedAt);
}
function readWal(){
 let w;
 try{w=JSON.parse(localStorage.getItem(WAL_KEY)||'null')}catch(e){throw new Error('WAL localStorage ilegivel')}
 if(w!==null&&(!w||typeof w!=='object'||Array.isArray(w)||!w.entries||typeof w.entries!=='object'))
  throw new Error('Estrutura WAL localStorage invalida');
 return w;
}
async function openWal(readwrite=false){
 if(typeof indexedDB==='undefined')throw new Error('IndexedDB indisponivel');
 return new Promise((resolve,reject)=>{
  let req,upgraded=false;
  try{req=indexedDB.open(DB)}catch(e){reject(e);return}
  req.onupgradeneeded=()=>{upgraded=true;try{req.transaction.abort()}catch(_){}};
  req.onerror=()=>reject(new Error(upgraded?'WAL IndexedDB ainda nao existe':'Falha abrindo WAL IndexedDB'));
  req.onsuccess=()=>{
   const db=req.result;
   if(!db.objectStoreNames.contains(STORE)){db.close();reject(new Error('WAL sem store entries'));return}
   resolve(db)
  }
 });
}
async function idbRows(){
 const db=await openWal();
 try{return await new Promise((resolve,reject)=>{
  const tx=db.transaction(STORE,'readonly'),get=tx.objectStore(STORE).getAll();
  get.onsuccess=()=>resolve(Array.isArray(get.result)?get.result:[]);
  get.onerror=()=>reject(get.error||new Error('Falha lendo WAL'));
  tx.onabort=()=>reject(tx.error||new Error('Leitura WAL abortada'));
 })}finally{db.close()}
}
function cloudRow(id){
 const q='hlgb_records?select=module,entity_id,deleted_at,revision,updated_at&module=eq.'+
  encodeURIComponent(MODULE)+'&entity_id=eq.'+encodeURIComponent(sid(id))+'&limit=1';
 return Promise.race([
  Promise.resolve(window.cloudRequest(q,{method:'GET'})),
  new Promise((_,reject)=>setTimeout(()=>reject(new Error('Timeout da prova remota de tombstone')),12000))
 ]);
}
function verifiedTombstone(rows,id){
 if(!Array.isArray(rows))return false;
 const row=rows.find(r=>sid(r?.module)===MODULE&&sid(r?.entity_id)===sid(id));
 return !!row&&!!row.deleted_at&&Number(row.revision)>0&&
  !Number.isNaN(Date.parse(sid(row.deleted_at)));
}
async function idbDeleteExact(key,expected){
 const db=await openWal();
 try{return await new Promise((resolve,reject)=>{
  let removed=false;
  const tx=db.transaction(STORE,'readwrite'),store=tx.objectStore(STORE),get=store.get(key);
  get.onsuccess=()=>{
   if(sameOperation(get.result,expected,key)){store.delete(key);removed=true}
  };
  get.onerror=()=>{try{tx.abort()}catch(_){}};
  tx.oncomplete=()=>resolve(removed);
  tx.onerror=tx.onabort=()=>reject(tx.error||new Error('Baixa WAL abortada'));
 })}finally{db.close()}
}
function removeLocalExact(key,expected){
 const fresh=readWal();
 const current=fresh?.entries?.[key];
 if(!current)return false;
 if(!sameOperation(current,expected,key))return false;
 delete fresh.entries[key];
 if(Object.keys(fresh.entries).length)localStorage.setItem(WAL_KEY,JSON.stringify(fresh));
 else localStorage.removeItem(WAL_KEY);
 return true;
}
async function pruneOne(op){
 const key=sid(op?.key),row={module:sid(op?.module),id:sid(op?.id),opId:sid(op?.opId),status:'kept'};
 if(row.module!==MODULE||op?.deleted!==true){row.status='outside-scope';return row}
 if(!key||key!==MODULE+'|'+row.id||!row.id||!row.opId){row.status='identity-missing';return row}
 // A second local copy with a divergent intent blocks both removals.
 const before=readWal(),second=before?.entries?.[key]||null;
 if(second&&!sameOperation(second,op,key)){row.status='local-copy-diverged';return row}
 const remote=await cloudRow(row.id);
 if(!verifiedTombstone(remote,row.id)){row.status='remote-not-proven';return row}
 // Never remove another opId or a later rewrite; identity is re-read inside TX.
 const removedIdb=await idbDeleteExact(key,op);
 let removedLocal=false;
 if(removedIdb){
  try{removedLocal=removeLocalExact(key,op)}catch(e){row.localCopyError=sid(e?.message||e).slice(0,120)}
 }
 row.status=removedIdb?'confirmed-removed':'identity-changed-during-readback';
 row.removedIdb=removedIdb;row.removedLocal=removedLocal;
 return row
}
async function prune({max=8}={}){
 if(state.busy)return {version:VERSION,attempted:false,removed:0,reason:'already-running'};
 if(!authenticated())return {version:VERSION,attempted:false,removed:0,reason:'not-authenticated-or-offline'};
 state.busy=true;state.runs++;state.lastError='';
 const result={version:VERSION,at:new Date().toISOString(),attempted:true,checked:0,removed:0,
  removedLocal:0,skipped:0,rows:[],errors:[],scope:'confirmed-remote-tombstones-only'};
 try{
  const rows=await idbRows();
  const limit=Math.max(1,Math.min(32,Math.floor(Number(max)||8)));
  for(const op of rows.slice(0,limit)){
   try{
    const proof=await pruneOne(op);result.rows.push(proof);
    if(proof.status==='outside-scope'){result.skipped++;continue}
    result.checked++;
    if(proof.removedIdb)result.removed++;
    if(proof.removedLocal)result.removedLocal++;
   }catch(e){result.errors.push({module:sid(op?.module),id:sid(op?.id),error:sid(e?.message||e).slice(0,180)})}
  }
  state.removed+=result.removed;
 }catch(e){state.lastError=sid(e?.message||e);result.errors.push({error:state.lastError.slice(0,180)})}
 finally{state.busy=false;state.lastResult=result}
 return result;
}
window.hlgbWalTombstonePruner9509={version:VERSION,prune,
 status:()=>({version:VERSION,busy:state.busy,runs:state.runs,removed:state.removed,lastResult:state.lastResult,lastError:state.lastError}),
 // Exposed strictly for tests, not needed for business logic.
 _test:{sameOperation,verifiedTombstone}};
console.info('[HLGB] v'+VERSION+' limpeza WAL de tombstones comprovados pronta; sem execucao automatica');
})();