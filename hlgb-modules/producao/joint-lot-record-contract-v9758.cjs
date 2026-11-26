'use strict';
// Isolated contract for recording an actually executed joint cut.
// Not a browser writer, not a database authority, not a reservation.
const id=v=>typeof v==='string'||Number.isSafeInteger(v)?String(v).trim():'';
const norm=v=>id(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const live=x=>x&&!x.deletedAt&&!x.deleted_at&&!x.deleted&&!x._deleted;
const fail=reason=>({state:'blocked',reason,canWrite:false});
const unique=rows=>{const m=new Map();for(const x of rows.filter(live)){const k=id(x.id);if(k)m.set(k,m.has(k)?null:x)}return m};
const validId=v=>!!id(v)&&id(v).length<=160;
const validDate=v=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&Number.isFinite(Date.parse(v))&&new Date(v).toISOString().slice(0,10)===v;
const grams=v=>typeof v==='number'&&Number.isFinite(v)&&v>=0&&v<=20000&&Math.abs(v*1000-Math.round(v*1000))<1e-6?Math.round(v*1000):null;
function prepare(input,snapshot,allowed){
 if(allowed!==true)return fail('permission');
 if(!input||!snapshot||!['cuts','orders','products','materials','lots'].every(k=>Array.isArray(snapshot[k])))return fail('source-incomplete');
 const ids=input.cutIds;
 if(!validId(input.lotId)||!validId(input.operationId)||!validDate(input.date)||!Array.isArray(ids)||ids.length<2||ids.length>100||!ids.every(validId)||new Set(ids.map(id)).size!==ids.length)return fail('identity');
 if(input.physicalJointConfirmed!==true)return fail('physical-confirmation');
 const cuts=unique(snapshot.cuts),orders=unique(snapshot.orders),products=unique(snapshot.products),materials=unique(snapshot.materials);
 // Input snapshot may be local or stale. A server must lock the records and repeat ALL checks.
 if(snapshot.lots.some(l=>!l||!validId(l.id)||!Array.isArray(l.cutRefs)||!l.cutRefs.length||l.cutRefs.some(x=>!validId(x?.cutId))))return fail('lot-source-invalid');
 if(snapshot.lots.some(l=>id(l.id)===id(input.lotId)||id(l.operationId)===id(input.operationId)))return fail('lot-or-operation-exists');
 const occupied=new Set(snapshot.lots.flatMap(l=>l.cutRefs.map(x=>id(x.cutId))));
 if(ids.some(x=>occupied.has(id(x))))return fail('cut-already-linked');
 const materialId=id(input.materialId),material=materials.get(materialId);
 if(!material||!['tecido','malha','renda','tule'].includes(norm(material.cat)))return fail('material');
 const physical=input.physical||{},lot=id(physical.lot),color=id(physical.color),widthMm=physical.widthMm;
 if(!lot||lot.length>160||!color||color.length>100||!Number.isSafeInteger(widthMm)||widthMm<1||widthMm>10000)return fail('physical-material');
 const w=input.weight||{},totalG=grams(w.totalKg),usedG=grams(w.usedKg),wasteG=grams(w.wasteKg);
 if(totalG===null||usedG===null||wasteG===null||totalG<=0||usedG+wasteG>totalG)return fail('weight');
 const people=input.people||{},cutter1=id(people.cutter1),cutter2=id(people.cutter2),infester=id(people.infester);
 if(!cutter1||!infester||[cutter1,cutter2,infester].some(x=>x.length>160))return fail('responsible');
 const refs=[],seenPairs=new Set(),distinctProducts=new Set();let pieces=0;
 for(const raw of ids){
  const cutId=id(raw),c=cuts.get(cutId),oid=id(c?.orderId),pid=id(c?.productId),o=orders.get(oid),p=products.get(pid),pair=JSON.stringify([oid,pid]);
  if(!c||!o||!p||!oid||!pid||c.modelSplitParentV1||c.hiddenByModelSplitV1||!['finalizado','cortado','concluido'].includes(norm(c.status)))return fail('cut-not-proven');
  if(seenPairs.has(pair))return fail('duplicate-order-model');
  seenPairs.add(pair);distinctProducts.add(pid);
  // Revisions come from the adapter's verified record envelopes, not timestamps.
  if(!Number.isSafeInteger(c.revision)||c.revision<1||!Number.isSafeInteger(o.revision)||o.revision<1||!Number.isSafeInteger(p.revision)||p.revision<1)return fail('revision');
  if(!Array.isArray(p.materials)||!p.materials.some(m=>id(m?.materialId)===materialId))return fail('material-not-shared');
  if(!Array.isArray(c.actualCutGrade)||!c.actualCutGrade.length||!Number.isSafeInteger(c.pieces)||c.pieces<=0)return fail('actual-grade');
  const cells=new Set(),grade=[];let sum=0;
  for(const g of c.actualCutGrade){
   const gp=id(g?.productId||g?.product_id),gc=id(g?.color),size=id(g?.size),qty=g?.qty,k=JSON.stringify([gc,size]);
   if(gp!==pid||!gc||!size||gc.length>100||size.length>100||!Number.isSafeInteger(qty)||qty<0||cells.has(k)||norm(gc)!==norm(color))return fail('grade-identity');
   cells.add(k);sum+=qty;if(qty)grade.push({color:gc,size,qty});
  }
  if(!Number.isSafeInteger(sum)||sum!==c.pieces)return fail('grade-total');
  pieces+=sum;if(!Number.isSafeInteger(pieces))return fail('quantity-limit');
  refs.push({cutId,orderId:oid,productId:pid,cutRevision:c.revision,orderRevision:o.revision,productRevision:p.revision,orderNumber:id(o.orderNumber||o.number||oid),productName:id(c.product||p.name||pid),client:id(o.client),pieces:sum,grade});
 }
 if(distinctProducts.size<2)return fail('distinct-models');
 if(!Number.isSafeInteger(material.revision)||material.revision<1)return fail('revision');
 const record={version:1,id:id(input.lotId),operationId:id(input.operationId),date:input.date,state:'executed-reference-only',materialId,materialRevision:material.revision,physical:{lot,color,widthMm},pieces,cutRefs:refs.sort((a,b)=>a.cutId.localeCompare(b.cutId)),weightG:{total:totalG,used:usedG,waste:wasteG,unclassified:totalG-usedG-wasteG},people:{cutter1,cutter2,infester},note:id(input.note).slice(0,1000)};
 return {state:'prepared-only',record,canWrite:false,geometryVerified:false,stockChanged:false};
}
const stable=v=>Array.isArray(v)?v.map(stable):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,stable(v[k])])):v;
const same=(a,b)=>JSON.stringify(stable(a))===JSON.stringify(stable(b));
const copy=v=>JSON.parse(JSON.stringify(v));
// Adapter contract: server authorizes and locks all referenced rows, validates current
// grade/revisions and unique cut references in ONE transaction; persists only a history
// record, not a second operational cut. A mere successful response does not prove it.
function createSession(adapter){
 let busy=false,pending=null;
 const result=(state,extra={})=>({state,...extra,canUpdateLocal:false});
 const confirms=(row,record)=>row?.module==='jointCutLots'&&id(row.entity_id)===record.id&&row.deleted_at===null&&row.revision===1&&same(row.data,record);
 async function save(prepared){
  if(busy)return result('busy');if(pending)return result('reconcile-first');
  if(prepared?.state!=='prepared-only'||prepared.canWrite!==false||!prepared.record||adapter?.atomicLotValidation!==true||typeof adapter?.ready!=='function'||typeof adapter?.commit!=='function'||typeof adapter?.read!=='function')return result('blocked');
  busy=true;const expected=copy(prepared.record);
  try{
   if(await adapter.ready(copy(expected))!==true)return result('blocked');
   pending=expected;
   let ack;try{ack=await adapter.commit(copy(expected))}catch(_){return result('uncertain')}
   if(ack?.applied===false&&ack?.definitive===true){pending=null;return result('conflict')}
   if(ack?.applied!==true||!confirms(ack,expected))return result('uncertain');
   const row=await adapter.read(expected.id);if(!confirms(row,expected))return result('uncertain');
   pending=null;return result('confirmed',{lotId:expected.id});
  }catch(_){return result(pending?'uncertain':'blocked')}finally{busy=false}
 }
 async function reconcile(){
  if(busy)return result('busy');if(!pending)return result('nothing-pending');busy=true;
  try{const row=await adapter.read(pending.id);if(!confirms(row,pending))return result('uncertain');const lotId=pending.id;pending=null;return result('confirmed',{lotId})}catch(_){return result('uncertain')}finally{busy=false}
 }
 return {save,reconcile,pending:()=>!!pending};
}
module.exports={prepare,createSession};
