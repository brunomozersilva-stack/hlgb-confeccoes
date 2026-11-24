'use strict';
// Isolated write contract; not loaded by the commercial app.
// A server adapter must atomically validate the source revision and the policy
// graph, use the official record authority and preserve WAL/ACK semantics.
const field='fabricRemnantPolicyV9630';
const stable=v=>Array.isArray(v)?v.map(stable):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,stable(v[k])])):v;
const same=(a,b)=>JSON.stringify(stable(a))===JSON.stringify(stable(b));
const clone=x=>JSON.parse(JSON.stringify(x));
function request(prepared,productId){
 if(prepared?.state!=='prepared-only'||prepared.canWrite!==false||!prepared.changed||!Number.isSafeInteger(prepared.expectedRevision)||prepared.expectedRevision<1||prepared.expectedRevision>=Number.MAX_SAFE_INTEGER||!productId||String(prepared.next?.id)!==String(productId)||!prepared.next?.[field])return null;
 // Never transmit the whole stale product. Server derives the next record
 // from the locked current record; only this field is allowed to change.
 return {productId:String(productId),expectedRevision:prepared.expectedRevision,policy:clone(prepared.next[field])};
}
function confirms(row,req,expected){
 return row?.module==='products'&&String(row.entity_id)===req.productId&&row.deleted_at===null&&row.revision===req.expectedRevision+1&&same(row.data,expected);
}
function createSession(adapter){
 let busy=false,unresolved=null;
 const state=(status,extra={})=>({status,...extra,canUpdateLocal:false});
 async function save(prepared,productId){
  if(busy)return state('busy');
  if(unresolved)return state('reconcile-first');
  const req=request(prepared,productId);
  if(!req||adapter?.atomicGraphValidation!==true||typeof adapter?.commit!=='function'||typeof adapter?.read!=='function'||typeof adapter?.ready!=='function')return state('blocked');
  const expected=clone(prepared.next);busy=true;
  try{
   if(await adapter.ready(req)!==true)return state('blocked');
   // Lock in the attempted operation before calling the transport. Never retry
   // a timed-out or ambiguous write; a readback can resolve it separately.
   unresolved={req,expected};
   let ack;
   try{ack=await adapter.commit(clone(req))}catch(_){return state('uncertain')}
   if(ack?.applied===false&&ack?.definitive===true){unresolved=null;return state('conflict')}
   if(ack?.applied!==true||!confirms(ack,req,expected))return state('uncertain');
   let row;try{row=await adapter.read(req.productId)}catch(_){return state('uncertain')}
   if(!confirms(row,req,expected))return state('uncertain');
   unresolved=null;return state('confirmed',{revision:row.revision});
  }catch(_){return state(unresolved?'uncertain':'blocked')}
  finally{busy=false}
 }
 async function reconcile(){
  if(busy)return state('busy');
  if(!unresolved)return state('nothing-pending');
  busy=true;
  try{const {req,expected}=unresolved,row=await adapter.read(req.productId);
   if(!confirms(row,req,expected))return state('uncertain');
   unresolved=null;return state('confirmed',{revision:row.revision});
  }catch(_){return state('uncertain')}finally{busy=false}
 }
 return {save,reconcile,pending:()=>!!unresolved};
}
module.exports={request,createSession};
