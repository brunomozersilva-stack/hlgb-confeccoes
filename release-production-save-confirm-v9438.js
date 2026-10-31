/* HLGB v94.38 — confirmação forte de salvamento da Produção.
   Pós-login. Não participa do boot. Não apaga WAL/IndexedDB diretamente.
   Quando um ACK HTTP se perde, comprova o estado no Supabase antes de considerar
   a operação confirmada e delega a limpeza das filas às autoridades já existentes. */
(function(){
'use strict';
const V='94.38';
const PROOF_KEY='hlgb_production_save_proofs_v9438';
const PENDING_KEY='hlgb_records_pending_v91';
const WAL_KEY='hlgb_durable_wal_v1';
const MAX_PROOFS=120;
const VERIFY_TIMEOUT_MS=12000;
if(window.HLGB_PRODUCTION_SAVE_CONFIRM_9438===V){try{window.hlgbProductionSaveConfirm9438?.activate?.('reload')}catch(e){}return}
window.HLGB_PRODUCTION_SAVE_CONFIRM_9438=V;
const state={version:V,activated:false,activationReason:'',installs:0,calls:0,verified:0,recoveredLostAck:0,reconciledQueues:0,skippedNewerLocal:0,failedVerify:0,lastAt:'',lastId:'',lastError:'',lastEvidence:null};
const sid=v=>String(v??'');
const clone=v=>{try{return structuredClone(v)}catch(e){try{return JSON.parse(JSON.stringify(v))}catch(_){return v}}};
const META=new Set(['updatedAt','updated_at','revision','__hlgb_pending_at','recoveredAt','recoveredBy','recoverySource','lastSeenAt','firstSeenAt']);
function canonical(v){
 if(Array.isArray(v))return v.map(canonical);
 if(!v||typeof v!=='object')return v;
 const o={};for(const k of Object.keys(v).sort()){
  if(META.has(k)||/^__hlgb/i.test(k)||/^__storage/i.test(k))continue;
  o[k]=canonical(v[k]);
 }return o;
}
function sameBusiness(a,b){try{return JSON.stringify(canonical(a))===JSON.stringify(canonical(b))}catch(e){return false}}
function deltaSatisfied(base,desired,server){
 if(!base||!desired||!server||typeof base!=='object'||typeof desired!=='object'||typeof server!=='object')return sameBusiness(desired,server);
 const cb=canonical(base),cd=canonical(desired),cs=canonical(server);
 const keys=new Set([...Object.keys(cb||{}),...Object.keys(cd||{})]);
 for(const k of keys){
  let b,d,s;try{b=JSON.stringify(cb?.[k]);d=JSON.stringify(cd?.[k]);s=JSON.stringify(cs?.[k])}catch(e){return false}
  if(b!==d&&d!==s)return false;
 }
 return true;
}
function authReady(){return window.__HLGB_AUTH_READY===true}
function dbRef(){try{if(typeof db!=='undefined'&&db)return db}catch(e){}return window.db||null}
function snapshots(){try{if(typeof hlgbRecordSnapshots!=='undefined'&&hlgbRecordSnapshots)return hlgbRecordSnapshots}catch(e){}return window.hlgbRecordSnapshots||null}
function recordId(row,index){try{if(typeof hlgbRecordId==='function')return sid(hlgbRecordId('production',row,index))}catch(e){}return sid(row?.id??index)}
function localRow(id){const d=dbRef(),a=Array.isArray(d?.production)?d.production:[];const target=sid(id),i=a.findIndex((x,n)=>recordId(x,n)===target);return {array:a,index:i,row:i>=0?a[i]:null}}
function snapshotRow(id){try{return snapshots()?.production?.get?.(sid(id))||null}catch(e){return null}}
function proofRows(){try{const x=JSON.parse(localStorage.getItem(PROOF_KEY)||'[]');return Array.isArray(x)?x:[]}catch(e){return []}}
function writeProof(row){
 try{let a=proofRows();a.push(row);a=a.slice(-MAX_PROOFS);localStorage.setItem(PROOF_KEY,JSON.stringify(a));return true}catch(e){return false}
}
function pendingMeta(id){
 const target=sid(id),out={normalizedCopies:0,walCopies:0,attempts:0,createdAt:'',lastAttemptAt:'',lastError:''};
 try{const p=JSON.parse(localStorage.getItem(PENDING_KEY)||'null');for(const op of (p?.modules?.production||[])){if(sid(op?.id)!==target)continue;out.normalizedCopies++;const c=op?.createdAt||op?.__hlgb_pending_at||op?.at||'';if(c&&(!out.createdAt||Date.parse(c)<Date.parse(out.createdAt)))out.createdAt=c}}
 catch(e){}
 try{const w=JSON.parse(localStorage.getItem(WAL_KEY)||'null');for(const e of Object.values(w?.entries||{})){if(sid(e?.module)!=='production'||sid(e?.id)!==target)continue;out.walCopies++;out.attempts=Math.max(out.attempts,+e?.attempts||0);if(e?.createdAt&&(!out.createdAt||Date.parse(e.createdAt)<Date.parse(out.createdAt)))out.createdAt=e.createdAt;if(e?.lastAttemptAt&&(!out.lastAttemptAt||Date.parse(e.lastAttemptAt)>Date.parse(out.lastAttemptAt)))out.lastAttemptAt=e.lastAttemptAt;if(e?.lastError)out.lastError=sid(e.lastError)}}catch(e){}
 const t=Date.parse(out.createdAt||'');out.ageMs=Number.isFinite(t)?Math.max(0,Date.now()-t):null;out.retryLoop=out.attempts>=3;return out;
}
async function timed(promise,ms,label){let timer;try{return await Promise.race([Promise.resolve(promise),new Promise((_,rej)=>{timer=setTimeout(()=>rej(new Error(label)),ms)})])}finally{clearTimeout(timer)}}
async function fetchServer(id){
 if(typeof window.cloudRequest!=='function')throw new Error('cloudRequest indisponível para confirmar Produção');
 const path='hlgb_records?select=module,entity_id,data,deleted_at,revision,updated_at,updated_by&module=eq.production&entity_id=eq.'+encodeURIComponent(sid(id))+'&limit=1';
 const rows=await timed(window.cloudRequest(path,{method:'GET'}),VERIFY_TIMEOUT_MS,'Tempo esgotado ao confirmar Produção no Supabase');
 return Array.isArray(rows)&&rows.length?rows[0]:null;
}
function serverSatisfies(server,desired,deleted,base){
 if(!server)return false;if(deleted===true)return !!server.deleted_at;if(server.deleted_at)return false;
 return sameBusiness(server.data,desired)||deltaSatisfied(base,desired,server.data);
}
function updateSnapshot(server){
 if(!server)return false;try{const all=snapshots();if(!all)return false;let m=all.production;if(!(m instanceof Map)){m=new Map();all.production=m}m.set(sid(server.entity_id),{data:clone(server.data),deleted_at:server.deleted_at||null,revision:+server.revision||0,updated_at:server.updated_at||'',updated_by:server.updated_by||null});return true}catch(e){return false}
}
function normalizeLocalIfSafe(id,desired,server,deleted){
 const slot=localRow(id);if(deleted===true)return true;if(slot.index<0)return true;
 if(!sameBusiness(slot.row,desired)&&!sameBusiness(slot.row,server?.data)){state.skippedNewerLocal++;return false}
 if(server?.data&&!sameBusiness(slot.row,server.data))slot.array[slot.index]=clone(server.data);
 return true;
}
function recomputeNormalized(){try{if(typeof hlgbRecordPendingStore==='function')hlgbRecordPendingStore();else window.hlgbRecordPendingStore?.()}catch(e){}}
function saveLocal(){try{if(typeof localSaveOnly==='function')localSaveOnly();else window.localSaveOnly?.()}catch(e){}}
function delegateWalReconcile(reason){
 setTimeout(()=>{try{const fn=window.hlgb955ReconcileServer;if(typeof fn==='function')Promise.resolve(fn()).catch(()=>{})}catch(e){}},0);
 setTimeout(()=>{try{const fn=window.hlgb955ReconcileServer;if(typeof fn==='function')Promise.resolve(fn()).catch(()=>{})}catch(e){}},350);
 state.lastAt=new Date().toISOString();
}
function evidence(id,desired,deleted,server,source,error=''){
 const q=pendingMeta(id),row={kind:'production-save-proof',version:V,at:new Date().toISOString(),module:'production',id:sid(id),source,confirmed:!!server&&serverSatisfies(server,desired,deleted,snapshotRow(id)?.data),deleted:deleted===true,serverRevision:+server?.revision||0,serverUpdatedAt:sid(server?.updated_at||''),serverDeletedAt:sid(server?.deleted_at||''),attempts:q.attempts,retryLoop:q.retryLoop,ageMs:q.ageMs,lastAttemptAt:q.lastAttemptAt,lastError:q.lastError||sid(error),normalizedCopies:q.normalizedCopies,walCopies:q.walCopies};writeProof(row);state.lastEvidence=row;return row;
}
async function verifyAndReconcile(id,desired,deleted=false,source='verify',base=null,error=''){
 const server=await fetchServer(id);const ok=serverSatisfies(server,desired,deleted,base);
 const ev=evidence(id,desired,deleted,server,source,error);ev.confirmed=ok;writeProof({...ev,at:new Date().toISOString()});
 if(!ok){state.failedVerify++;return null}
 updateSnapshot(server);const localSafe=normalizeLocalIfSafe(id,desired,server,deleted);if(localSafe)saveLocal();recomputeNormalized();delegateWalReconcile(source);state.verified++;state.lastId=sid(id);state.lastAt=new Date().toISOString();return {applied:true,module:'production',entity_id:sid(id),data:clone(server.data),deleted_at:server.deleted_at||null,revision:+server.revision||0,updated_at:server.updated_at||'',updated_by:server.updated_by||null,verifiedBy:'v94.38',alreadyApplied:true};
}
const POINTERS=['__original','__hlgb955Original','__hlgb9307Original','__hlgb9320Original','__hlgbReliableOriginal','__hlgb9313Original','__hlgb9339Original'];
function chainHas(fn){const seen=new Set();let cur=fn,n=0;while(typeof cur==='function'&&!seen.has(cur)&&n++<80){if(cur.__hlgbProductionConfirm9438)return true;seen.add(cur);let next=null;for(const p of POINTERS){try{if(typeof cur[p]==='function'){next=cur[p];break}}catch(e){}}cur=next}return false}
function install(){
 if(!authReady())return false;let fn=window.hlgbRecordSaveWithRetry;try{if(typeof hlgbRecordSaveWithRetry==='function')fn=hlgbRecordSaveWithRetry}catch(e){}if(typeof fn!=='function')return false;if(chainHas(fn))return true;
 const wrapped=async function(module,id,data,deleted=false){
  if(sid(module)!=='production')return fn.apply(this,arguments);
  state.calls++;const desired=clone(data),base=clone(snapshotRow(id)?.data??null);let out;
  try{out=await fn.apply(this,arguments)}catch(err){
   try{const recovered=await verifyAndReconcile(id,desired,deleted===true,'recovered-after-error',base,err);if(recovered){state.recoveredLostAck++;return recovered}}catch(vErr){state.lastError=sid(vErr?.message||vErr)}
   throw err;
  }
  if(out?.applied===true){
   try{const confirmed=await verifyAndReconcile(id,desired,deleted===true,'rpc-applied-verified',base);if(confirmed)return {...out,...confirmed,data:clone(confirmed.data??out.data)}}catch(err){state.lastError=sid(err?.message||err)}
   return out;
  }
  try{const recovered=await verifyAndReconcile(id,desired,deleted===true,'recovered-after-unconfirmed',base,out?.reason||'applied=false');if(recovered){state.recoveredLostAck++;return recovered}}catch(err){state.lastError=sid(err?.message||err)}
  return out;
 };
 wrapped.__hlgbProductionConfirm9438=true;wrapped.__original=fn;try{window.hlgbRecordSaveWithRetry=wrapped}catch(e){}try{hlgbRecordSaveWithRetry=wrapped}catch(e){}state.installs++;return true;
}
function queueCandidates(){
 const map=new Map(),add=(id,data,deleted,source,base)=>{id=sid(id);if(!id)return;const key=id+'|'+(deleted?'1':'0');const cur=map.get(key);const row={id,data:clone(data),deleted:deleted===true,source,base:clone(base??null)};if(!cur||source==='wal')map.set(key,row)};
 try{const p=JSON.parse(localStorage.getItem(PENDING_KEY)||'null');for(const op of (p?.modules?.production||[]))add(op?.id,op?.data,op?.deleted,'normalized',null)}catch(e){}
 try{const w=JSON.parse(localStorage.getItem(WAL_KEY)||'null');for(const e of Object.values(w?.entries||{}))if(sid(e?.module)==='production')add(e?.id,e?.data,e?.deleted,'wal',e?.baseData)}catch(e){}
 return [...map.values()].slice(0,30);
}
let reconcileBusy=false;
async function reconcilePending(reason='manual'){
 if(reconcileBusy||!authReady()||navigator.onLine===false)return false;reconcileBusy=true;let confirmed=0;
 try{for(const c of queueCandidates()){try{const out=await verifyAndReconcile(c.id,c.data,c.deleted,'queue-reconcile:'+reason,c.base);if(out)confirmed++}catch(e){state.lastError=sid(e?.message||e)}}state.reconciledQueues+=confirmed;return confirmed}
 finally{reconcileBusy=false}
}
function activate(reason='authenticated'){
 if(!authReady())return false;state.activated=true;state.activationReason=reason;[0,120,500,1400].forEach(ms=>setTimeout(install,ms));[300,1800].forEach(ms=>setTimeout(()=>reconcilePending(reason).catch(()=>{}),ms));return true;
}
window.hlgbProductionSaveConfirm9438={version:V,state,activate,install,verifyAndReconcile,reconcilePending,proofs:proofRows,status:()=>({...state,authReady:authReady(),pendingProduction:queueCandidates().length})};
window.addEventListener('hlgb:authenticated',()=>activate('authenticated-event'));
window.addEventListener('online',()=>{if(authReady())setTimeout(()=>reconcilePending('online').catch(()=>{}),200)});
window.addEventListener('focus',()=>{if(authReady())setTimeout(()=>reconcilePending('focus').catch(()=>{}),300)});
if(authReady())activate('loaded-after-auth');
console.info('[HLGB] v'+V+' confirmação forte de Produção pronta; sem limpeza direta de WAL');
})();
