'use strict';
(function(root,api){if(typeof module==='object'&&module.exports)module.exports=api;else root.HLGBProductHistory9652=api;})(typeof globalThis==='object'?globalThis:this,(function historyCore(){
 const sid=v=>typeof v==='string'||typeof v==='number'?String(v).trim():'';
 const norm=v=>sid(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
 const live=x=>x&&x.deleted!==true&&x._deleted!==true&&!x.deletedAt&&!x.deleted_at;
 const date=v=>{const s=sid(v).slice(0,10),n=Date.parse(s+'T00:00:00Z');return /^\d{4}-\d{2}-\d{2}$/.test(s)&&Number.isFinite(n)&&new Date(n).toISOString().slice(0,10)===s?s:''};
 const list=x=>Array.isArray(x)?x:[];
 const unique=a=>[...new Set(a.filter(Boolean))];
 function search(db,query,opts={}){
  if(opts.allowed!==true)return {state:'forbidden',rows:[],total:0};
  if(!Array.isArray(db?.products))return {state:'unavailable',rows:[],total:0};
  const counts=new Map(),extra=new Map();for(const p of db.products.filter(live)){const k=sid(p.id);counts.set(k,(counts.get(k)||0)+1)}
  const add=(id,terms)=>{if(!id||counts.get(id)!==1)return;const a=extra.get(id)||[];a.push(...terms.map(sid).filter(Boolean));extra.set(id,a)};
  if(opts.ordersAllowed===true)for(const o of list(db.orders).filter(live))for(const g of [...list(o.grade),...list(o.items)])add(sid(g.productId),[o.id,o.orderNumber,o.client,g.color,g.size]);
  if(opts.factionsAllowed===true)for(const f of list(db.factions).filter(live))add(sid(f.productId),[f.name,f.factionName]);
  const terms=norm(query).split(/\s+/).filter(Boolean),rows=[];
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
 function timeline(db,productId,opts={}){
  if(opts.allowed!==true)return {state:'forbidden',rows:[],total:0,issues:[]};
  const pid=sid(productId),products=list(db?.products).filter(x=>live(x)&&sid(x.id)===pid);
  if(!pid||products.length!==1)return {state:'product-review',rows:[],total:0,issues:['product-id-missing-or-duplicate']};
  const rows=[],issues=[],sources=['orders','cuts','production','factions','materialChecklists','factionPayments'],counts=new Map();
  const selected=new Set(['orders','cuts','production','factions','materialChecklists','factionPayments'].filter(k=>opts.modules?.includes(k)));
  const orders=new Map();if(selected.has('orders'))for(const o of list(db.orders).filter(live)){const id=sid(o.id);orders.set(id,orders.has(id)?null:o)}
  for(const source of sources){if(!selected.has(source))continue;if(!Array.isArray(db[source])){issues.push('source-unavailable:'+source);continue}for(const r of db[source].filter(live)){const id=sid(r.id),key=source+':'+id;counts.set(key,(counts.get(key)||0)+1)}}
  const q=v=>typeof v==='number'&&Number.isFinite(v)&&v>=0?v:typeof v==='string'&&/^\d+(?:\.\d+)?$/.test(v)&&Number.isFinite(Number(v))?Number(v):null;
  for(const source of sources){
   if(!selected.has(source))continue;let unknown=0;
   for(const r of list(db[source]).filter(live)){
    const id=sid(r.id),key=source+':'+id,oid=source==='orders'?id:sid(r.orderId);
    if(source==='cuts'&&r.hiddenByModelSplitV1)continue;
    const grade=source==='orders'?(Array.isArray(r.grade)?r.grade:list(r.items)):list(r.actualCutGrade);
    const relevant=source==='orders'?grade.filter(g=>sid(g.productId)===pid):[];
    if(source==='orders'&&!relevant.length)continue;
    if(source!=='orders'&&sid(r.productId||r.product_id)!==pid){if(!sid(r.productId||r.product_id)&&oid&&orders.get(oid)&&list(orders.get(oid).grade).some(g=>sid(g.productId)===pid))unknown++;continue}
    if(!id||counts.get(key)!==1){issues.push('missing-or-duplicate-id:'+source);continue}
    const amount=source==='orders'?relevant.map(g=>q(g.qty??g.quantity??g.pieces)):null;
    const qty=source==='orders'?(amount.every(v=>v!==null)?amount.reduce((s,v)=>s+v,0):null):q(source==='cuts'?r.pieces??r.done:source==='production'?r.done:source==='factions'?r.sent??r.quantity:r.qty??r.quantity??r.pieces);
    const day=date(source==='cuts'?r.finishedAt||r.date||r.createdAt:source==='factionPayments'?r.paymentDate||r.date||r.createdAt:r.date||r.assignedAt||r.sentAt||r.receivedAt||r.createdAt);
    const row={eventId:key,source,sourceId:id,orderId:oid||null,date:day||null,status:sid(r.status),quantity:qty,grade:source==='orders'?relevant.map(g=>({color:sid(g.color),size:sid(g.size),qty:q(g.qty??g.quantity??g.pieces)})):grade.map(g=>({color:sid(g.color),size:sid(g.size),qty:q(g.qty??g.quantity)})),destination:source==='factions'?sid(r.name||r.factionName):source==='production'?sid(r.productionLocationName):source==='orders'?sid(r.client):source==='materialChecklists'?sid(r.destinationName):'',actor:source==='cuts'?unique([r.cutterName,r.cutter2Name,r.infestadorName].map(sid)).join(' · '):source==='materialChecklists'?sid(r.receivedBy):'',paidAmount:source==='factionPayments'?q(r.paidAmount):null,estimatedAmount:source==='factionPayments'?q(r.value):null,document:source==='factionPayments'&&!!r.receiptPdfV9566,quality:'local-record'};
    if(!day)issues.push('date-unavailable:'+source);
    rows.push(row);
   }
   if(unknown)issues.push('unlinked-product:'+source+':'+unknown);
  }
  const filtered=rows.filter(r=>(!opts.orderId||r.orderId===sid(opts.orderId))&&(!opts.from||r.date&&r.date>=opts.from)&&(!opts.to||r.date&&r.date<=opts.to)&&(!opts.source||r.source===opts.source)).sort((a,b)=>(b.date||'').localeCompare(a.date||'')||a.eventId.localeCompare(b.eventId));
  const offset=Number.isSafeInteger(opts.offset)&&opts.offset>=0?opts.offset:0,limit=Number.isSafeInteger(opts.limit)?Math.max(1,Math.min(200,opts.limit)):50;
  return {state:'local-observation',rows:filtered.slice(offset,offset+limit),total:filtered.length,offset,limit,issues:unique(issues),completeCloud:false};
 }
 return {search,timeline};
})());
