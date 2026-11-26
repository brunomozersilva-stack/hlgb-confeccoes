'use strict';
// Isolated server-adapter contract; does not expose, upload or persist real data.
const id=v=>typeof v==='string'&&/^[A-Za-z0-9_-]{1,160}$/.test(v);
const text=(v,max,min=0)=>typeof v==='string'&&v.trim().length>=min&&v.length<=max&&!/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/.test(v);
const day=v=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&Number.isFinite(Date.parse(v))&&new Date(v).toISOString().slice(0,10)===v;
const hash=v=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v);
const mime=new Set(['application/pdf','image/jpeg','image/png','image/webp','image/heic','image/heif']);
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const copy=v=>JSON.parse(JSON.stringify(v));
function prepare(x,limits){
 if(!limits||!Number.isSafeInteger(limits.maxFileBytes)||limits.maxFileBytes<=0||!Number.isSafeInteger(limits.maxBatchBytes)||limits.maxBatchBytes<limits.maxFileBytes)throw Error('server-quota-unavailable');
 if(!x||!['route','employee-occurrence'].includes(x.scope)||!id(x.parentId)||!id(x.entryId)||!id(x.operationId)||!day(x.date)||!['create','amend','archive'].includes(x.action)||!Number.isSafeInteger(x.expectedRevision)||x.expectedRevision<0||!Array.isArray(x.attachments))throw Error('invalid-entry');
 if((x.action==='create')!==(x.expectedRevision===0))throw Error('invalid-revision');
 if(!text(x.title,160,1)||!text(x.note,10000)||!text(x.category||'',120))throw Error('invalid-text');
 if(x.action!=='create'&&!text(x.reason,500,1))throw Error('reason-required');
 if(x.action==='archive'&&x.attachments.length)throw Error('archive-cannot-add-files');
 const hashes=new Set(),ids=new Set();let total=0;
 const attachments=x.attachments.map(a=>{
  if(!id(a?.fileId)||ids.has(a.fileId)||!hash(a.sha256)||hashes.has(a.sha256)||!text(a.name,200,1)||/[\\/\x00-\x1f\x7f]/.test(a.name)||!mime.has(a.mime)||!Number.isSafeInteger(a.size)||a.size<12||a.size>limits.maxFileBytes)throw Error('invalid-attachment');
  hashes.add(a.sha256);ids.add(a.fileId);total+=a.size;if(!Number.isSafeInteger(total)||total>limits.maxBatchBytes)throw Error('batch-quota');
  return {fileId:a.fileId,sha256:a.sha256,name:a.name,mime:a.mime,size:a.size};
 });
 // A route attachment entry can have zero or more files; repeated batches append
 // rather than replace previous entries. No artificial photo count limit.
 return {version:1,scope:x.scope,parentId:x.parentId,entryId:x.entryId,operationId:x.operationId,action:x.action,expectedRevision:x.expectedRevision,date:x.date,title:x.title.trim(),category:(x.category||'').trim(),note:x.note,reason:x.action==='create'?'':x.reason.trim(),attachments};
}
function receiptMatches(r,m){
 return r?.state==='committed'&&r.revision===m.expectedRevision+1&&text(r.serverActor,200,1)&&typeof r.committedAt==='string'&&Number.isFinite(Date.parse(r.committedAt))&&same(r.manifest,m)&&r.private===true&&r.appendOnlyHistory===true&&Array.isArray(r.objects)&&r.objects.length===m.attachments.length&&m.attachments.every(a=>r.objects.filter(o=>o.fileId===a.fileId&&o.sha256===a.sha256&&o.size===a.size&&o.mime===a.mime&&o.scope===m.scope&&o.parentId===m.parentId&&o.entryId===m.entryId&&o.private===true&&o.contentVerified===true&&o.safeTypeVerified===true&&!Object.hasOwn(o,'publicUrl')).length===1);
}
function createSession(adapter){
 let busy=false,pending=null;
 const result=(state,reason)=>({state,reason,confirmed:state==='confirmed',payrollChanged:false,routeChanged:false,localDataChanged:false});
 const auth=async m=>await adapter.authorize({scope:m.scope,parentId:m.parentId,entryId:m.entryId,operationId:m.operationId,action:m.action})===true;
 const ready=()=>adapter?.privateEvidenceAuthority===true&&['authorize','read','reserve','put','commit'].every(k=>typeof adapter[k]==='function');
 async function submit(input,files,limits){
  if(busy)return result('blocked','busy');if(!ready())return result('blocked','authority-unavailable');
  let m;try{m=prepare(input,limits)}catch(e){return result('blocked',e.message)}
  if(pending&&!same(pending,m))return result('uncertain','reconcile-same-operation');
  if(!Array.isArray(files)||files.length!==m.attachments.length||m.attachments.some(a=>files.filter(f=>f.fileId===a.fileId&&f.bytes?.byteLength===a.size).length!==1))return result('blocked','missing-file-bytes');
  busy=true;
  try{
   if(!await auth(m))return result('blocked','permission');
   const old=await adapter.read(copy(m));
   if(!await auth(m))return result('blocked','permission');
   if(old?.state==='committed'){if(!receiptMatches(old,m))return result('uncertain','operation-conflict');pending=null;return result('confirmed','readback')}
   if(old&&old.state!=='reserved')return result('uncertain','operation-conflict');
   pending=copy(m);
   const reserve=await adapter.reserve(copy(m));
   if(!await auth(m))return result('uncertain','permission');
   if(reserve?.state==='conflict'&&reserve.definitive===true){pending=null;return result('blocked','revision-conflict')}
   if(reserve?.state!=='reserved'||!same(reserve.manifest,m))return result('uncertain','reservation');
   for(const a of m.attachments){
    if(!await auth(m))return result('uncertain','permission');
    const f=files.find(f=>f.fileId===a.fileId),ack=await adapter.put(copy(m),copy(a),f.bytes);
    if(!await auth(m))return result('uncertain','permission');
    if(ack?.fileId!==a.fileId||ack.sha256!==a.sha256||ack.size!==a.size||ack.mime!==a.mime||ack.scope!==m.scope||ack.parentId!==m.parentId||ack.entryId!==m.entryId||ack.private!==true||ack.contentVerified!==true||ack.safeTypeVerified!==true||Object.hasOwn(ack,'publicUrl'))return result('uncertain','file-proof');
   }
   if(!await auth(m))return result('uncertain','permission');
   const ack=await adapter.commit(copy(m));if(!await auth(m))return result('uncertain','permission');
   if(ack?.applied!==true)return result('uncertain','commit');
   const row=await adapter.read(copy(m));if(!await auth(m))return result('uncertain','permission');
   if(!receiptMatches(row,m))return result('uncertain','readback');
   pending=null;return result('confirmed','readback');
  }catch(_){return result('uncertain','transport')}finally{busy=false}
 }
 // Reconciliation needs only metadata and permission, never another upload.
 async function reconcile(){
  if(busy)return result('blocked','busy');if(!pending||!ready())return result('blocked','nothing-pending');
  busy=true;const m=pending;
  try{if(!await auth(m))return result('blocked','permission');const row=await adapter.read(copy(m));if(!await auth(m))return result('blocked','permission');if(!receiptMatches(row,m))return result('uncertain','readback');pending=null;return result('confirmed','readback')}catch(_){return result('uncertain','transport')}finally{busy=false}
 }
 return {submit,reconcile,pending:()=>!!pending};
}
// Project already-authorized private metadata, never infer permission from the UI.
function history(entries,scope,parentId,allowed,{from='',to='',category='',search=''}={}){
 if(allowed!==true||!['route','employee-occurrence'].includes(scope)||!id(parentId)||!Array.isArray(entries))return {state:'unavailable',rows:[]};
 if((from&&!day(from))||(to&&!day(to))||(from&&to&&from>to))return {state:'invalid-filter',rows:[]};
 const fold=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
 const seen=new Set(),rows=[];
 for(const e of entries){
  if(e?.scope!==scope||e.parentId!==parentId)continue;
  if(!id(e.entryId)||seen.has(e.entryId)||!day(e.date)||!Number.isSafeInteger(e.revision)||e.revision<1||!text(e.title,160,1)||!text(e.note,10000)||!text(e.category||'',120)||!text(e.serverActor,200,1)||typeof e.archived!=='boolean'||!Array.isArray(e.attachments))return {state:'review',rows:[]};
  seen.add(e.entryId);
  if(e.attachments.some(a=>!id(a?.fileId)||!text(a.name,200,1)||!mime.has(a.mime)||!Number.isSafeInteger(a.size)||a.size<12||a.private!==true||Object.hasOwn(a,'publicUrl'))||new Set(e.attachments.map(a=>a.fileId)).size!==e.attachments.length)return {state:'review',rows:[]};
  if(from&&e.date<from||to&&e.date>to||category&&fold(e.category)!==fold(category)||search&&!fold([e.title,e.category,e.note].join(' ')).includes(fold(search)))continue;
  rows.push({entryId:e.entryId,date:e.date,title:e.title,category:e.category||'',note:e.note,serverActor:e.serverActor,revision:e.revision,archived:e.archived,attachments:e.attachments.map(a=>({fileId:a.fileId,name:a.name,mime:a.mime,size:a.size}))});
 }
 rows.sort((a,b)=>b.date.localeCompare(a.date)||a.entryId.localeCompare(b.entryId));
 return {state:'authorized-metadata-only',rows};
}
module.exports={prepare,receiptMatches,createSession,history};
