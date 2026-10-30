/* HLGB v94.35 — reconciliação segura de ACK confirmado.
   Evita que um save já confirmado volte para a fila por diferença técnica entre
   a cópia local, o snapshot e a fila normalizada. Nunca apaga alteração de negócio
   mais nova: só reconcilia quando o estado local ainda equivale ao que foi enviado. */
(function(){
'use strict';
const V='94.35',PENDING_KEY='hlgb_records_pending_v91',STATUS_KEY='hlgb_ack_reconcile_v9435_state';
if(window.HLGB_ACK_RECONCILE_9435===V){try{window.hlgbAckReconcile9435?.install?.()}catch(e){}return}
window.HLGB_ACK_RECONCILE_9435=V;
const state={version:V,installs:0,calls:0,applied:0,snapshotUpdated:0,localNormalized:0,pendingCleared:0,skippedNewer:0,errors:0,lastModule:'',lastId:'',lastAt:'',lastError:''};
const sid=v=>String(v??'');
const clone=v=>{try{return structuredClone(v)}catch(e){try{return JSON.parse(JSON.stringify(v))}catch(_){return v}}};
function canonical(v){
 if(Array.isArray(v))return v.map(canonical);
 if(!v||typeof v!=='object')return v;
 const out={};
 for(const k of Object.keys(v).sort()){
  if(k==='updatedAt'||k==='updated_at'||k==='revision'||k==='__hlgb_pending_at'||/^__hlgb/i.test(k)||/^__storage/i.test(k))continue;
  out[k]=canonical(v[k]);
 }
 return out;
}
function sameBusiness(a,b){try{return JSON.stringify(canonical(a))===JSON.stringify(canonical(b))}catch(e){return false}}
function dbRef(){try{if(typeof db!=='undefined'&&db)return db}catch(e){}return window.db||null}
function snapshotRef(){try{if(typeof hlgbRecordSnapshots!=='undefined'&&hlgbRecordSnapshots)return hlgbRecordSnapshots}catch(e){}return window.hlgbRecordSnapshots||null}
function recordId(module,row,index){try{if(typeof hlgbRecordId==='function')return sid(hlgbRecordId(module,row,index))}catch(e){}return sid(row?.id??index)}
function localSlot(module,id){
 const d=dbRef(),arr=Array.isArray(d?.[module])?d[module]:null;if(!arr)return {arr:null,index:-1,row:null};
 const target=sid(id),index=arr.findIndex((x,i)=>recordId(module,x,i)===target);return {arr,index,row:index>=0?arr[index]:null};
}
function snapshotRow(module,id){try{const s=snapshotRef()?.[module];return s instanceof Map?s.get(sid(id))||null:null}catch(e){return null}}
function finalData(module,id,sent,out){const snap=snapshotRow(module,id);return clone(snap?.data??out?.data??sent)}
function persistState(){
 try{const lock=window.hlgbInteractionLock9434?.status?.()||null;localStorage.setItem(STATUS_KEY,JSON.stringify({...state,interactionLock:lock,at:new Date().toISOString()}))}catch(e){}
}
function updateSnapshot(module,id,final,out){
 try{
  const all=snapshotRef();if(!all)return false;
  let map=all[module];if(!(map instanceof Map)){map=new Map();all[module]=map}
  const old=map.get(sid(id))||{};
  map.set(sid(id),{data:clone(final),deleted_at:out?.deleted_at||null,revision:+out?.revision||+old.revision||1,updated_at:out?.updated_at||old.updated_at||new Date().toISOString(),updated_by:out?.updated_by||old.updated_by||null});
  try{if(typeof hlgbRecordLastSeen!=='undefined'&&out?.updated_at&&sid(out.updated_at)>sid(hlgbRecordLastSeen[module]||''))hlgbRecordLastSeen[module]=sid(out.updated_at)}catch(e){}
  state.snapshotUpdated++;return true;
 }catch(e){return false}
}
function normalizeLocal(module,id,sent,final,deleted){
 const slot=localSlot(module,id);
 if(deleted===true){
  if(slot.index<0)return true;
  if(!sameBusiness(slot.row,sent)){state.skippedNewer++;return false}
  slot.arr.splice(slot.index,1);state.localNormalized++;return true;
 }
 if(slot.index<0){state.skippedNewer++;return false}
 if(!sameBusiness(slot.row,sent)&&!sameBusiness(slot.row,final)){state.skippedNewer++;return false}
 if(!sameBusiness(slot.row,final)||JSON.stringify(slot.row)!==JSON.stringify(final)){slot.arr[slot.index]=clone(final);state.localNormalized++}
 return true;
}
function clearMatchingPending(module,id,sent,final,deleted,localSafe){
 if(!localSafe)return false;
 try{
  const p=JSON.parse(localStorage.getItem(PENDING_KEY)||'null');if(!p?.modules||!Array.isArray(p.modules[module]))return false;
  const before=p.modules[module].length,target=sid(id);
  p.modules[module]=p.modules[module].filter(op=>{
   if(sid(op?.id)!==target)return true;
   if((op?.deleted===true)!==(deleted===true))return true;
   if(deleted===true)return false;
   return !(sameBusiness(op?.data,sent)||sameBusiness(op?.data,final));
  });
  const removed=before-p.modules[module].length;if(!removed)return false;
  if(!p.modules[module].length)delete p.modules[module];
  if(Object.values(p.modules).some(x=>Array.isArray(x)&&x.length))localStorage.setItem(PENDING_KEY,JSON.stringify(p));else localStorage.removeItem(PENDING_KEY);
  state.pendingCleared+=removed;return true;
 }catch(e){return false}
}
function saveLocal(){try{if(typeof localSaveOnly==='function')localSaveOnly();else if(typeof window.localSaveOnly==='function')window.localSaveOnly()}catch(e){}}
function recomputePending(){try{if(typeof hlgbRecordPendingStore==='function')hlgbRecordPendingStore();else if(typeof window.hlgbRecordPendingStore==='function')window.hlgbRecordPendingStore()}catch(e){}}
function reconcile(module,id,sent,deleted,out){
 state.applied++;state.lastModule=sid(module);state.lastId=sid(id);state.lastAt=new Date().toISOString();
 const final=finalData(module,id,sent,out);
 updateSnapshot(module,id,final,out);
 const localSafe=normalizeLocal(module,id,sent,final,deleted===true);
 clearMatchingPending(module,id,sent,final,deleted===true,localSafe);
 if(localSafe){saveLocal();recomputePending()}
 persistState();
}
const pointers=['__original','__hlgb9307Original','__hlgb9320Original','__hlgb955Original','__hlgbReliableOriginal','__hlgb9313Original','__hlgb9339Original'];
function chainHas(fn){const seen=new Set();let cur=fn,n=0;while(typeof cur==='function'&&!seen.has(cur)&&n++<60){if(cur.__hlgbAckReconcile9435)return true;seen.add(cur);let next=null;for(const p of pointers){try{if(typeof cur[p]==='function'){next=cur[p];break}}catch(e){}}cur=next}return false}
function install(){
 let fn=window.hlgbRecordSaveWithRetry;try{if(typeof hlgbRecordSaveWithRetry==='function')fn=hlgbRecordSaveWithRetry}catch(e){}
 if(typeof fn!=='function')return false;
 if(chainHas(fn)){stamp();persistState();return true}
 const wrapped=async function(module,id,data,deleted=false){
  state.calls++;const sent=clone(data);let out;
  try{out=await fn.apply(this,arguments)}catch(e){throw e}
  if(out?.applied===true){try{reconcile(sid(module),sid(id),sent,deleted===true,out)}catch(e){state.errors++;state.lastError=sid(e?.message||e);persistState()}}
  return out;
 };
 wrapped.__hlgbAckReconcile9435=true;wrapped.__original=fn;
 try{window.hlgbRecordSaveWithRetry=wrapped}catch(e){}
 try{hlgbRecordSaveWithRetry=wrapped}catch(e){}
 state.installs++;stamp();persistState();return true;
}
function stamp(){try{const cur=parseFloat(sid(window.HLGB_RELEASE_VERSION||'0'))||0;if(cur<94.35){window.HLGB_RELEASE_VERSION=V;const el=document.querySelector('#appShell .logo small');if(el)el.textContent='v'+V}}catch(e){}}
window.hlgbAckReconcile9435={version:V,state,install,status:()=>({...state,interactionLock:window.hlgbInteractionLock9434?.status?.()||null,pending:(()=>{try{return JSON.parse(localStorage.getItem(PENDING_KEY)||'null')}catch(e){return null}})()})};
[0,80,250,600,1200,2200,4000,7000,11000].forEach(ms=>setTimeout(install,ms));
window.addEventListener('pageshow',()=>setTimeout(install,0));
window.addEventListener('focus',()=>setTimeout(install,0));
console.info('[HLGB] v'+V+' reconciliação de ACK ativa — confirmação não volta para a fila sem mudança real');
})();
