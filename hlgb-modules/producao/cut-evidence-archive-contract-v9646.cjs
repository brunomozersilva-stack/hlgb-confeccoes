'use strict';
module.exports=(function archive(){
 const str=(v,n)=>typeof v==='string'&&v.trim()&&v.length<=n?v.trim():null;
 const id=v=>typeof v==='string'&&/^[A-Za-z0-9_-]{1,100}$/.test(v);
 const hash=v=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v);
 const eq=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
 const kinds=new Set(['application/pdf','image/jpeg','image/png','image/webp']);
 function manifest(x){
  if(!x||!id(x.operationId)||!id(x.orderId)||!id(x.productId)||!hash(x.snapshotHash)||!Number.isSafeInteger(x.expectedRevision)||x.expectedRevision<0||!str(x.responsible,120)||!Array.isArray(x.lines)||x.lines.length<1||x.lines.length>300||!Array.isArray(x.attachments)||x.attachments.length>3)throw Error('invalid-manifest');
  const refs=new Set(),lines=x.lines.map(l=>{
   if(!id(l?.ref)||refs.has(l.ref)||!str(l.name,200)||!str(l.unit,30)||!Number.isFinite(l.estimated)||l.estimated<=0||!Number.isFinite(l.actual)||l.actual<0||l.actual>1e9||typeof l.note!=='string'||l.note.length>250)throw Error('invalid-material-line');
   refs.add(l.ref);return {ref:l.ref,name:l.name,unit:l.unit,estimated:l.estimated,actual:l.actual,note:l.note};
  });
  const hashes=new Set(),attachments=x.attachments.map(a=>{
   if(!hash(a?.sha256)||hashes.has(a.sha256)||!str(a.name,120)||/[\\/\x00-\x1f\x7f]/.test(a.name)||!kinds.has(a.mime)||!Number.isSafeInteger(a.size)||a.size<12||a.size>5*1024*1024)throw Error('invalid-attachment');
   hashes.add(a.sha256);return {sha256:a.sha256,name:a.name,mime:a.mime,size:a.size};
  });
  if(typeof x.note!=='string'||x.note.length>500)throw Error('invalid-note');
  return {kind:'cut-separation-evidence-v1',operationId:x.operationId,orderId:x.orderId,productId:x.productId,snapshotHash:x.snapshotHash,expectedRevision:x.expectedRevision,responsible:x.responsible.trim(),note:x.note,lines,attachments};
 }
 const unknown=(reason,operationId)=>({state:'unconfirmed',reason,operationId,confirmed:false,separationChanged:false,stockChanged:false});
 function receiptMatches(rec,m){return rec?.state==='committed'&&rec?.revision===m.expectedRevision+1&&str(rec?.serverActor,200)&&str(rec?.committedAt,60)&&eq(rec.manifest,m)&&Array.isArray(rec.objects)&&rec.objects.length===m.attachments.length&&m.attachments.every(a=>rec.objects.filter(o=>o.sha256===a.sha256&&o.size===a.size&&o.mime===a.mime&&o.private===true&&o.contentVerified===true).length===1)}
 // transport is a future trusted server adapter; nothing in this module accesses any storage directly.
 async function submit(input,transport,files){
  const m=manifest(input);
  if(!transport||!['authorize','read','reserve','put','commit'].every(k=>typeof transport[k]==='function'))return unknown('server-adapter-unavailable',m.operationId);
  if(!Array.isArray(files)||files.length!==m.attachments.length||m.attachments.some(a=>files.filter(f=>f.sha256===a.sha256&&f.bytes?.byteLength===a.size).length!==1))return unknown('missing-file-bytes',m.operationId);
  try{
   if(await transport.authorize(m)!==true)return unknown('permission-denied',m.operationId);
   const existing=await transport.read(m.operationId);
   if(await transport.authorize(m)!==true)return unknown('permission-denied',m.operationId);
   if(existing?.state==='committed')return receiptMatches(existing,m)?{state:'confirmed',confirmed:true,operationId:m.operationId,revision:existing.revision,separationChanged:false,stockChanged:false}:unknown('operation-conflict',m.operationId);
   const reserved=await transport.reserve(m);
   if(await transport.authorize(m)!==true)return unknown('permission-denied',m.operationId);
   if(reserved?.state!=='reserved'||!eq(reserved.manifest,m))return unknown('revision-or-operation-conflict',m.operationId);
   for(const a of m.attachments){
    if(await transport.authorize(m)!==true)return unknown('permission-denied',m.operationId);
    const f=files.find(x=>x.sha256===a.sha256),ack=await transport.put(m.operationId,a,f.bytes);
    if(await transport.authorize(m)!==true)return unknown('permission-denied',m.operationId);
    if(ack?.sha256!==a.sha256||ack?.size!==a.size||ack?.mime!==a.mime||ack?.private!==true||ack?.contentVerified!==true)return unknown('attachment-unconfirmed',m.operationId);
   }
   if(await transport.authorize(m)!==true)return unknown('permission-denied',m.operationId);
   const ack=await transport.commit(m);
   if(await transport.authorize(m)!==true)return unknown('permission-denied',m.operationId);
   if(ack?.applied!==true)return unknown('commit-unconfirmed',m.operationId);
   const reread=await transport.read(m.operationId);
   if(await transport.authorize(m)!==true)return unknown('permission-denied',m.operationId);
   if(!receiptMatches(reread,m))return unknown('readback-unconfirmed',m.operationId);
   return {state:'confirmed',confirmed:true,operationId:m.operationId,revision:reread.revision,separationChanged:false,stockChanged:false};
  }catch(_){return unknown('transport-interrupted-retry-same-operation',m.operationId)}
 }
 return {manifest,submit,receiptMatches};
})();
