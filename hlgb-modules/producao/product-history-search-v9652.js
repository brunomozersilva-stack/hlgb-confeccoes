'use strict';
(function(root,api){if(typeof module==='object'&&module.exports)module.exports=api;else root.HLGBProductHistory9652=api;})(typeof globalThis==='object'?globalThis:this,(function historyCore(){
 const sid=v=>typeof v==='string'||typeof v==='number'?String(v).trim():'';
 const norm=v=>sid(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
 const live=x=>x&&x.deleted!==true&&x._deleted!==true&&!x.deletedAt&&!x.deleted_at;
 const date=v=>{const s=sid(v).slice(0,10),n=Date.parse(s+'T00:00:00Z');return /^\d{4}-\d{2}-\d{2}$/.test(s)&&Number.isFinite(n)&&new Date(n).toISOString().slice(0,10)===s?s:''};
 const list=x=>Array.isArray(x)?x:[];
 const unique=a=>[...new Set(a.filter(Boolean))];
 const orderGrade=o=>list(o?.grade).length?list(o.grade):list(o?.items);
 const cutGrade=c=>[c?.actualCutGrade,c?.cutGrade,c?.originalGrade].find(a=>Array.isArray(a)&&a.length)||[];
 const gradeIds=c=>unique([sid(c?.productId||c?.product_id),...cutGrade(c).map(g=>sid(g?.productId||g?.product_id))]);
 const uniqueRecords=rows=>{const counts=new Map();for(const r of list(rows).filter(live)){const id=sid(r.id);counts.set(id,(counts.get(id)||0)+1)}return list(rows).filter(r=>live(r)&&sid(r.id)&&counts.get(sid(r.id))===1)};
 function search(db,query,opts={}){
  if(opts.allowed!==true)return {state:'forbidden',rows:[],total:0};
  if(!Array.isArray(db?.products))return {state:'unavailable',rows:[],total:0};
  const counts=new Map(),extra=new Map();for(const p of db.products.filter(live)){const k=sid(p.id);counts.set(k,(counts.get(k)||0)+1)}
  const add=(id,terms)=>{if(!id||counts.get(id)!==1)return;const a=extra.get(id)||[];a.push(...terms.map(sid).filter(Boolean));extra.set(id,a)};
  if(opts.ordersAllowed===true)for(const o of uniqueRecords(db.orders))for(const g of orderGrade(o))add(sid(g.productId),[o.id,o.orderNumber,o.client,g.color,g.size]);
  if(opts.factionsAllowed===true)for(const f of uniqueRecords(db.factions))add(sid(f.productId),[f.name,f.factionName,f.id]);
  if(opts.modules?.includes('cuts'))for(const c of uniqueRecords(db.cuts)){if(c.hiddenByModelSplitV1||c.modelSplitParentV1)continue;const id=sid(c.productId||c.product_id);if(!id)continue;add(id,[c.id,c.cutNumber,c.status,c.cutterName,c.cutter2Name,...cutGrade(c).filter(g=>sid(g.productId||g.product_id)===id||gradeIds(c).length===1&&!sid(g.productId||g.product_id)).flatMap(g=>[g.color,g.size])]);}
  if(opts.modules?.includes('production'))for(const r of uniqueRecords(db.production))add(sid(r.productId||r.product_id),[r.id,r.productionLocationName,r.factionName,r.stage,r.color,r.size]);
  if(opts.materialsAllowed===true){const mats=new Map(uniqueRecords(db.materials).map(m=>[sid(m.id),m]));for(const p of uniqueRecords(db.products))for(const m of list(p.materials))add(sid(p.id),[m.name,m.materialName,mats.get(sid(m.materialId||m.id))?.name]);}
  const terms=norm(query).replace(/#/g,'').split(/\s+/).filter(Boolean),rows=[];
  for(const p of db.products.filter(live)){
   const id=sid(p.id);if(!id||counts.get(id)!==1)continue;
   const attributes=[...list(p.variants),...list(p.grade),...list(p.sizes),...list(p.colors)];
   const tokens=[id,p.name,p.code,p.sku,p.reference,p.description,...list(p.aliases).map(x=>typeof x==='object'?x.name:x),...attributes.flatMap(x=>typeof x==='object'?[x.color,x.size,x.name,x.sku,x.code]:[x]),...(extra.get(id)||[])];
   const hay=norm(tokens.map(sid).join(' '));if(!terms.every(t=>hay.includes(t)))continue;
   rows.push({id,name:sid(p.name||p.code||id),code:sid(p.code||p.sku||p.reference),active:p.active!==false});
  }
  rows.sort((a,b)=>a.name.localeCompare(b.name,'pt-BR')||a.id.localeCompare(b.id));
  const offset=Number.isSafeInteger(opts.offset)&&opts.offset>=0?opts.offset:0,limit=Number.isSafeInteger(opts.limit)?Math.max(1,Math.min(200,opts.limit)):50;
  return {state:'local-observation',rows:rows.slice(offset,offset+limit),total:rows.length,offset,limit,duplicateIds:[...counts].filter(([k,n])=>k&&n>1).length,completeCloud:false};
 }
 function timelineInternal(db,productId,opts={},all=false){
  if(opts.allowed!==true)return {state:'forbidden',rows:[],total:0,issues:[]};
  const pid=sid(productId),products=list(db?.products).filter(x=>live(x)&&sid(x.id)===pid);
  if(!pid||products.length!==1)return {state:'product-review',rows:[],total:0,issues:['product-id-missing-or-duplicate']};
  const rows=[],issues=[],sources=['orders','cuts','production','factions','materialChecklists','factionPayments'],counts=new Map();
  const selected=new Set(['orders','cuts','production','factions','materialChecklists','factionPayments'].filter(k=>opts.modules?.includes(k)&&(k!=='factionPayments'||opts.financialAllowed!==false)));
  const orders=new Map();if(selected.has('orders'))for(const o of list(db.orders).filter(live)){const id=sid(o.id);orders.set(id,orders.has(id)?null:o)}
  for(const source of sources){if(!selected.has(source))continue;if(!Array.isArray(db[source])){issues.push('source-unavailable:'+source);continue}for(const r of db[source].filter(live)){const id=sid(r.id),key=source+':'+id;counts.set(key,(counts.get(key)||0)+1)}}
  const q=v=>typeof v==='number'&&Number.isFinite(v)&&v>=0?v:typeof v==='string'&&/^\d+(?:\.\d+)?$/.test(v)&&Number.isFinite(Number(v))?Number(v):null;
  for(const source of sources){
   if(!selected.has(source))continue;let unknown=0;
   for(const r of list(db[source]).filter(live)){
    const id=sid(r.id),key=source+':'+id,oid=source==='orders'?id:sid(r.orderId);
    if(source==='cuts'&&(r.hiddenByModelSplitV1||r.modelSplitParentV1))continue;
    const mixed=source==='cuts'&&gradeIds(r).length>1;
    const grade=source==='orders'?orderGrade(r):source==='cuts'?cutGrade(r).filter(g=>!mixed||sid(g.productId||g.product_id)===pid):source==='materialChecklists'?list(r.gradeV9198):list(r.actualCutGrade);
    const relevant=source==='orders'?grade.filter(g=>sid(g.productId)===pid):[];
    if(source==='orders'&&!relevant.length)continue;
    if(source!=='orders'&&sid(r.productId||r.product_id)!==pid){if(!sid(r.productId||r.product_id)&&oid&&orders.get(oid)&&orderGrade(orders.get(oid)).some(g=>sid(g.productId)===pid))unknown++;continue}
    if(!id||counts.get(key)!==1){issues.push('missing-or-duplicate-id:'+source);continue}
    const amount=source==='orders'?relevant.map(g=>q(g.qty??g.quantity??g.pieces)):null;
    const qty=mixed?null:source==='orders'?(amount.every(v=>v!==null)?amount.reduce((s,v)=>s+v,0):null):q(source==='cuts'?r.pieces??r.done:source==='production'?r.done:source==='factions'?r.sent??r.quantity:r.qty??r.quantity??r.pieces);
    const day=date(source==='cuts'?r.finishedAt||r.date||r.createdAt:source==='factionPayments'?r.paymentDate||r.date||r.createdAt:r.date||r.assignedAt||r.sentAt||r.receivedAt||r.createdAt);
    const row={eventId:key,source,sourceId:id,orderId:oid||null,date:day||null,status:sid(r.status),quantity:qty,grade:source==='orders'?relevant.map(g=>({color:sid(g.color),size:sid(g.size),qty:q(g.qty??g.quantity??g.pieces)})):grade.map(g=>({color:sid(g.color),size:sid(g.size),qty:q(g.qty??g.quantity)})),destination:source==='factions'?sid(r.name||r.factionName):source==='production'?sid(r.productionLocationName):source==='orders'?sid(r.client):source==='materialChecklists'?sid(r.destinationName):'',actor:source==='cuts'?unique([r.cutterName,r.cutter2Name,r.infestadorName].map(sid)).join(' · '):source==='materialChecklists'?sid(r.receivedBy):'',paidAmount:source==='factionPayments'?q(r.paidAmount):null,estimatedAmount:source==='factionPayments'?q(r.value):null,document:source==='factionPayments'&&!!r.receiptPdfV9566,quality:'local-record'};
    if(!day)issues.push('date-unavailable:'+source);
    rows.push(row);
   }
   if(unknown)issues.push('unlinked-product:'+source+':'+unknown);
  }
  const filtered=rows.filter(r=>(!opts.orderId||r.orderId===sid(opts.orderId))&&(!opts.from||r.date&&r.date>=opts.from)&&(!opts.to||r.date&&r.date<=opts.to)&&(!opts.source||r.source===opts.source)).sort((a,b)=>(b.date||'').localeCompare(a.date||'')||a.eventId.localeCompare(b.eventId));
  const offset=Number.isSafeInteger(opts.offset)&&opts.offset>=0?opts.offset:0,limit=Number.isSafeInteger(opts.limit)?Math.max(1,Math.min(200,opts.limit)):50;
  return {state:'local-observation',rows:all?filtered:filtered.slice(offset,offset+limit),total:filtered.length,offset,limit,issues:unique(issues),completeCloud:false};
 }

 // A remessa is a cut with explicit identity. Never match by name/date or order alone.
 function remittances(db,pid,opts={}){
  const modules=list(opts.modules).filter(k=>k!=='factionPayments'||opts.financialAllowed===true);
  const t=timelineInternal(db,pid,{...opts,modules,source:undefined},true);
  if(t.state!=='local-observation')return {...t,unlinked:0};
  const q=v=>typeof v==='number'&&Number.isFinite(v)&&v>=0?v:typeof v==='string'&&/^\d+(?:\.\d+)?$/.test(v)&&Number.isFinite(Number(v))?Number(v):null;
  const maps=new Map();
  for(const k of ['cuts','production','factions','materialChecklists','factionPayments','cutters','orders']){
   const m=new Map();for(const x of list(db?.[k]).filter(live)){const id=sid(x.id);if(id)m.set(id,m.has(id)?null:x)}maps.set(k,m);
  }
  const lookup=(k,id)=>maps.get(k)?.get(sid(id));
  const groups=new Map(),productionLinks=new Map(),factionLinks=new Map();
  for(const e of t.rows.filter(e=>e.source==='cuts')){
   const c=lookup('cuts',e.sourceId);if(!c)continue;
   // A mixed-model grade proves that the cut's aggregate measures cannot
   // be presented as the selected product's individual consumption.
   const gradeProductIds=unique([sid(c.productId),...['actualCutGrade','cutGrade','originalGrade'].flatMap(k=>list(c[k]).map(g=>sid(g?.productId||g?.product_id)))]);
   const sharedMeasurement=gradeProductIds.length>1;
   const w=c.cutWeightV9579,weights=!sharedMeasurement&&w&&typeof w==='object'?{totalKg:q(w.totalKg),usedKg:q(w.usedKg),wasteKg:q(w.wasteKg),note:sid(w.note)}:null;
   const materials=sharedMeasurement?[]:list(c.materialUsage).map(m=>({name:sid(m?.name||m?.materialId),weight:q(m?.weight),unit:sid(m?.unit)}));
   const o=modules.includes('orders')?lookup('orders',c.orderId):null;
   const cutGrade=[c.actualCutGrade,c.cutGrade,c.originalGrade].find(a=>Array.isArray(a)&&a.length)||[];
   const people=unique([sid(c.cutterName),sid(lookup('cutters',c.cutterId)?.name),sid(c.cutter2Name),sid(lookup('cutters',c.cutter2Id||c.secondCutterId)?.name),sid(c.infesterName||c.infestadorName||c.infestador)]);
   const finished=norm(c.status)==='finalizado';
   groups.set(e.sourceId,{cutId:e.sourceId,orderId:e.orderId,date:e.date,status:e.status,client:sid(o?.client),orderNumber:sid(o?.orderNumber||o?.number||o?.id),planned:sharedMeasurement?null:q(c.plannedPieces??c.originalPieces),cutQuantity:sharedMeasurement?null:finished?q(c.pieces):q(c.done),people,grade:cutGrade.filter(g=>!sharedMeasurement||sid(g?.productId||g?.product_id)===sid(pid)).map(g=>({color:sid(g?.color||g?.colorName),size:sid(g?.size||g?.sizeName||g?.tam),qty:q(g?.qty??g?.quantity??g?.pieces)})),weights,materials,sharedMeasurement,events:[]});
  }
  const matching=(g,e)=>g&&(!g.orderId||!e.orderId||g.orderId===e.orderId);
  let unlinked=0;
  for(const e of t.rows.filter(e=>e.source==='production')){
   const p=lookup('production',e.sourceId),g=groups.get(sid(p?.cutId));
   if(matching(g,e)){g.events.push({...e,planned:q(p.planned),status:sid(p.stage||p.status),destination:e.destination||sid(p.factionName||p.productionLocationName)});productionLinks.set(e.sourceId,g)}else unlinked++;
  }
  for(const e of t.rows.filter(e=>e.source==='factions')){
   const f=lookup('factions',e.sourceId),g=productionLinks.get(sid(f?.productionId));
   if(matching(g,e)){g.events.push({...e,done:q(f.done),returned:q(f.returned)});factionLinks.set(e.sourceId,g)}else unlinked++;
  }
  // Never attach a checklist or a payment by date/name or order alone.
  for(const e of t.rows.filter(e=>['materialChecklists','factionPayments'].includes(e.source))){
   const r=lookup(e.source,e.sourceId),refs=[];
   for(const [id,map] of [[sid(r?.cutId),groups],[sid(r?.productionId),productionLinks],[sid(r?.factionId),factionLinks]]){if(id)refs.push(map.get(id)||null)}
   const g=refs[0];if(refs.length&&g&&refs.every(v=>v===g)&&matching(g,e))g.events.push(e);else unlinked++;
  }
  const rows=[...groups.values()],offset=Number.isSafeInteger(opts.offset)&&opts.offset>=0?opts.offset:0,limit=Number.isSafeInteger(opts.limit)?Math.max(1,Math.min(200,opts.limit)):20;
  return {state:t.state,rows:rows.slice(offset,offset+limit),total:rows.length,offset,limit,issues:t.issues,unlinked,completeCloud:false};
 }

 function scopeLegacy(events,permissions){
 if(permissions?.allowed!==true||!Array.isArray(events))return [];
 const sources=new Set(Array.isArray(permissions.modules)?permissions.modules:[]);
 const cost=new Set(['pricePerPiece','grossPricePerPiece','estimatedCost','amountIsEstimate','travetaDiscountUnit','amountBilled','amountPaid','unitPrice','travetaDiscount','paymentDate','receiptPdfAttached']);
 return events.filter(e=>e&&(e.source==='products'||sources.has(e.source))&&(e.source!=='factionPayments'||permissions.financialAllowed===true)).map(e=>{
  if(permissions.financialAllowed===true)return {...e,details:{...e.details}};
  const details=Object.fromEntries(Object.entries(e.details||{}).filter(([k])=>!cost.has(k)));
  return {...e,details};
 });
}
 return {search,timeline:(db,pid,opts)=>timelineInternal(db,pid,opts),remittances,scopeLegacy};
})());
