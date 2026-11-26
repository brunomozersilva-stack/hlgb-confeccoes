'use strict';
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory(require('./joint-cut-discovery-v9629.js'),require('./fabric-remnant-policy-v9630.js'));else root.HLGBProductionPlanning9661=factory(root.HLGBJointCutDiscovery9629,root.HLGBFabricRemnant9630)})(typeof globalThis==='object'?globalThis:this,function planningFactory(joint,remnant){
 const id=x=>typeof x==='string'||Number.isSafeInteger(x)?String(x).trim():'',live=x=>x&&!x.deletedAt&&!x.deleted_at&&x.deleted!==true&&!x._deleted;
 const norm=x=>id(x).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
 const pair=(o,p)=>JSON.stringify([id(o),id(p)]);
 const eligibleStatus=o=> !/finalizad|cancelad|entregue|mercadoria pronta|nota emitida/.test(norm(o.status))&&!o.invoiceReady&&!o.noteReady&&!o.workflowSourceOrderId&&!norm(o.cutStatus).includes('finalizado')&&(/separacao|aguardando material|aguardando corte|pedido criado|pedido para corte|^corte$|^planejado$|^aberto$/.test(norm(o.status))||/^pedido em producao$|^em producao$/.test(norm(o.status)));
 function discover(db,authority,allowed){
  if(allowed!==true)return {state:'forbidden',groups:[]};
  if(!db||!Array.isArray(db.orders)||typeof joint?.discover!=='function')return {state:'unavailable',groups:[]};
  try{
   const orders=db.orders.filter(o=>live(o)&&eligibleStatus(o)),unique=new Map();
   for(const o of db.orders.filter(live)){const k=id(o.id);unique.set(k,(unique.get(k)||0)+1)}
   const safeOrders=orders.filter(o=>unique.get(id(o.id))===1);
   const x=joint.discover({...db,orders:safeOrders},authority);
   if(x.state!=='discovery-only')return x;
   return {...x,groups:x.groups.map(g=>({...g,models:[...new Set(g.lines.map(l=>pair(l.orderId,l.productId)))].map(k=>{const lines=g.lines.filter(l=>pair(l.orderId,l.productId)===k),o=safeOrders.find(z=>id(z.id)===lines[0].orderId);return {key:k,orderId:lines[0].orderId,orderNumber:id(o?.orderNumber||o?.id),productId:lines[0].productId,productName:lines[0].productName,pieces:lines.reduce((a,l)=>a+l.ordered,0),grade:lines.map(l=>({color:l.color,size:l.size,qty:l.ordered}))}})})),verifiedAvailable:null,canWrite:false};
  }catch(_){return {state:'unavailable',groups:[],reason:'Conferir fontes e baixas.'}}
 }
 // Material discovery is independent of execution eligibility. Read-only ordered demand, never a balance.
 function orderMaterialCompatibility(db,d,allowed){
  const empty=state=>({state,models:[],groups:[],review:0,canWrite:false});
  if(allowed!==true)return empty('forbidden');
  if(!['orders','products','materials'].every(k=>Array.isArray(db?.[k])))return empty('unavailable');
  const index=rows=>{const m=new Map();for(const x of rows.filter(live)){const k=id(x.id);if(k)m.set(k,m.has(k)?null:x)}return m};
  const orders=index(db.orders),products=index(db.products),materials=index(db.materials),models=[],groups=new Map();
  const safe=new Set((d?.state==='discovery-only'?d.groups:[]).flatMap(g=>g.models.map(m=>m.key)));
  const cutByPair=new Map();
  for(const c of (Array.isArray(db.cuts)?db.cuts:[]).filter(live)){if(!id(c.orderId)||!id(c.productId)||c.hiddenByModelSplitV1||c.modelSplitParentV1)continue;const k=pair(c.orderId,c.productId),rows=cutByPair.get(k)||[];rows.push(c);cutByPair.set(k,rows)}

  let review=0;
  for(const [oid,o] of orders){
   if(!o){review++;continue}
   if(/^(?:pedido )?finalizad[oa]$|cancelad|entregue|mercadoria pronta|nota emitida/.test(norm(o.status))||o.invoiceReady||o.noteReady||o.workflowSourceOrderId)continue;
   if(!Array.isArray(o.grade)||!o.grade.length){review++;continue}
   const byModel=new Map();
   for(const x of o.grade){
    const pid=id(x?.productId);if(!pid){review++;continue}
    const p=products.get(pid),m=byModel.get(pid)||{key:pair(oid,pid),orderId:oid,orderNumber:id(o.orderNumber||oid),productId:pid,productName:id(p?.name)||pid,status:id(o.status)||'Não informado',pieces:0,grade:[],materialIds:[],review:!p};
    const qty=typeof x.qty==='number'||typeof x.qty==='string'&&/^\d+$/.test(x.qty)?Number(x.qty):NaN;
    if(!Number.isSafeInteger(qty)||qty<0||!id(x.color)||!id(x.size)){m.review=true}
    else if(qty>0){if(m.grade.some(g=>g.color===id(x.color)&&g.size===id(x.size)))m.review=true;m.grade.push({color:id(x.color),size:id(x.size),qty});m.pieces+=qty}
    byModel.set(pid,m);
   }
   for(const m of byModel.values()){
    if(!m.pieces&&!m.review)continue;
    const p=products.get(m.productId);
    m.materialIds=[...new Set((Array.isArray(p?.materials)?p.materials:[]).filter(b=>{const mat=materials.get(id(b?.materialId));return mat&&['tecido','malha','renda','tule'].includes(norm(mat.cat||b.cat))}).map(b=>id(b.materialId)))];
    const observedCuts=cutByPair.get(m.key)||[];
    m.cutStatus=observedCuts.length===1?id(observedCuts[0].status)||'Não informado':observedCuts.length>1?'Múltiplos registros — conferir':'Sem corte individual identificado';
    m.planningEligible=!m.review&&safe.has(m.key);if(!m.materialIds.length||m.review)review++;
    models.push(m);
    for(const mid of m.materialIds){const g=groups.get(mid)||{materialId:mid,materialName:id(materials.get(mid).name)||mid,models:[]};g.models.push(m);groups.set(mid,g)}
   }
  }
  const sort=(a,b)=>a.productName.localeCompare(b.productName,'pt-BR')||a.orderNumber.localeCompare(b.orderNumber,'pt-BR',{numeric:true});
  models.sort(sort);for(const g of groups.values())g.models.sort(sort);
  return {state:'local-compatibility',models,groups:[...groups.values()].sort((a,b)=>a.materialName.localeCompare(b.materialName,'pt-BR')),review,canWrite:false};
 }
 // Arithmetic alternatives only. At most eight spreads, no excess and no geometry proof.
 function multiSpreadPlans(rows,maxLayers){
  if(!rows.length||rows.length>2000)return [];
  const largest=Math.max(...rows.map(r=>r.qty)),smallest=Math.min(...rows.map(r=>r.qty));
  const cap=Math.min(maxLayers??10000,largest);
  if(cap<2)return [];
  const heights=[...new Set([Math.min(cap,smallest),Math.max(1,Math.floor(cap/2)),cap])].filter(h=>h>1);
  const plans=[],seen=new Set();
  for(const first of heights){
   let remaining=rows.map(r=>r.qty),layers=first;const spreads=[];
   for(let step=0;step<8&&remaining.some(q=>q>0);step++){
    if(step===7)layers=1; // explicit final remainder spread, never overcuts
    const entries=[];
    for(let i=0;i<rows.length;i++){const perLayer=Math.floor(remaining[i]/layers);if(!perLayer)continue;const planned=perLayer*layers;remaining[i]-=planned;entries.push({...rows[i],perLayer,planned})}
    if(entries.length)spreads.push({layers,rows:entries,pieces:entries.reduce((n,r)=>n+r.planned,0),piecesPerLayer:entries.reduce((n,r)=>n+r.perLayer,0),modelCount:new Set(entries.map(r=>r.key)).size});
    layers=Math.min(cap,Math.max(...remaining));
   }
   if(spreads.length<2||remaining.some(q=>q!==0))continue;
   const signature=JSON.stringify(spreads.map(s=>[s.layers,s.rows.map(r=>[r.key,r.size,r.perLayer])]));
   if(seen.has(signature))continue;seen.add(signature);
   plans.push({spreads,total:spreads.reduce((n,s)=>n+s.pieces,0),combinedPieces:spreads.filter(s=>s.modelCount>=2).reduce((n,s)=>n+s.pieces,0),peakPiecesPerLayer:Math.max(...spreads.map(s=>s.piecesPerLayer)),remaining:0,geometryVerified:false,canWrite:false});
  }
  // Rank by arithmetic coverage in combined spreads, then grade size and spread count.
  // This is not a prediction of length, marker efficiency or actual cost.
  return plans.sort((a,b)=>b.combinedPieces-a.combinedPieces||a.peakPiecesPerLayer-b.peakPiecesPerLayer||a.spreads.length-b.spreads.length);
 }
 // Exact arithmetic proposal per order colour; never represents a physical marker.
 function gradeSuggestions(group,maxLayers=null){
  if(!group||!Array.isArray(group.models)||group.models.length>1000||maxLayers!==null&&(!Number.isSafeInteger(maxLayers)||maxLayers<1||maxLayers>10000))return [];
  const colors=new Map(),seen=new Set();
  for(const m of group.models){
   if(!m.key||seen.has(m.key)||!Array.isArray(m.grade))return [];seen.add(m.key);
   for(const x of m.grade){if(!id(x.color)||!id(x.size)||!Number.isSafeInteger(x.qty)||x.qty<=0||x.qty>10000000)return [];
    const rows=colors.get(x.color)||new Map(),k=JSON.stringify([m.key,x.size]);if(rows.has(k))return [];
    rows.set(k,{key:m.key,orderNumber:m.orderNumber,productId:m.productId,productName:m.productName,size:x.size,qty:x.qty});colors.set(x.color,rows)
   }
  }
  const gcd=(a,b)=>{while(b){const r=a%b;a=b;b=r}return a};
  return [...colors].map(([color,map])=>{const rows=[...map.values()],factor=rows.reduce((a,x)=>gcd(a,x.qty),0),upper=maxLayers===null?factor:Math.min(maxLayers,factor);
   let layers=upper;while(layers>1&&factor%layers!==0)layers--;
   const total=rows.reduce((a,x)=>a+x.qty,0);if(!Number.isSafeInteger(total))return null;
   const modelCount=new Set(rows.map(x=>x.key)).size,base=rows.map(x=>({...x,perLayer:x.qty/layers,planned:x.qty,remainder:0}));
   const alternative=maxLayers!==null&&maxLayers>layers?{layers:maxLayers,rows:rows.map(x=>({...x,perLayer:Math.floor(x.qty/maxLayers),planned:Math.floor(x.qty/maxLayers)*maxLayers,remainder:x.qty%maxLayers}))}:null;
   return {color,layers,commonFactor:factor,total,modelCount,base,alternative:alternative&&alternative.rows.some(x=>x.perLayer>0)?alternative:null,multiSpreads:factor===1||maxLayers!==null&&factor%maxLayers!==0?multiSpreadPlans(rows,maxLayers):[],geometryVerified:false,canWrite:false}
  }).filter(Boolean).sort((a,b)=>b.modelCount-a.modelCount||b.total-a.total||a.color.localeCompare(b.color,'pt-BR'));
 }
 // Compare requested grade with a chosen number of layers. No order or cut mutation.
 function gradeAdjustmentPreview(group,targetLayers,allowed){
  const empty=state=>({state,colors:[],sameRatios:[],canWrite:false,geometryVerified:false});
  if(allowed!==true)return empty('forbidden');
  if(!id(group?.materialId)||!Array.isArray(group.models)||group.models.length<2||group.models.length>1000||
     targetLayers!==null&&(!Number.isSafeInteger(targetLayers)||targetLayers<1||targetLayers>10000))return empty('unavailable');
  if(group.models.some(m=>!Number.isSafeInteger(m?.pieces)||m.pieces<=0||!Array.isArray(m.grade)||m.grade.length>2000||
      m.grade.reduce((n,r)=>n+(Number.isSafeInteger(r?.qty)?r.qty:NaN),0)!==m.pieces))return empty('unavailable');
  const plans=gradeSuggestions(group,targetLayers);
  if(!plans.length)return empty('unavailable');
  const gcd=(a,b)=>{while(b){const t=a%b;a=b;b=t}return a};
  const ratios=new Map(),colors=[];
  for(const p of plans){
   const byModel=new Map();
   for(const row of p.base){const list=byModel.get(row.key)||[];list.push(row);byModel.set(row.key,list)}
   const models=[];
   for(const [key,rows] of byModel){
    const sorted=rows.slice().sort((a,b)=>a.size.localeCompare(b.size,'pt-BR',{numeric:true})||(a.size<b.size?-1:a.size>b.size?1:0));
    const factor=sorted.reduce((n,r)=>gcd(n,r.qty),0),ratio=sorted.map(r=>({size:r.size,perBlock:r.qty/factor}));
    const sig=JSON.stringify(ratio),bucket=ratios.get(sig)||{ratio,entries:[]};
    const first=rows[0];bucket.entries.push({key,productId:first.productId,productName:first.productName,orderNumber:first.orderNumber,color:p.color,blocks:factor});ratios.set(sig,bucket);
    const changes=targetLayers===null?[]:sorted.map(r=>{
     const lower=Math.floor(r.qty/targetLayers)*targetLayers,upper=Math.ceil(r.qty/targetLayers)*targetLayers;
     return {size:r.size,ordered:r.qty,lower,upper,missing:r.qty-lower,extra:upper-r.qty,needsAdjustment:lower!==r.qty};
    });
    models.push({key,productId:first.productId,productName:first.productName,orderNumber:first.orderNumber,pieces:rows.reduce((n,r)=>n+r.qty,0),ratio,blocks:factor,changes,requiresAdjustment:changes.some(r=>r.needsAdjustment),missing:changes.reduce((n,r)=>n+r.missing,0),extra:changes.reduce((n,r)=>n+r.extra,0)});
   }
   colors.push({color:p.color,exactLayers:p.layers,commonFactor:p.commonFactor,total:p.total,models,requiresAdjustment:models.some(m=>m.requiresAdjustment),complementary:models.reduce((n,m)=>n+m.missing,0),extra:models.reduce((n,m)=>n+m.extra,0)});
  }
  const sameRatios=[...ratios.values()].filter(r=>new Set(r.entries.map(e=>e.key)).size>=2).map(r=>({...r,crossColor:new Set(r.entries.map(e=>e.color)).size>1}));
  return {...empty('local-preview'),targetLayers,colors,sameRatios};
 }
 // Equal proportional grades by exact colour and size labels. Only arithmetic, not a marker.
 function gradeMatches9726(group,allowed){
  const empty=state=>({state,matches:[],geometryVerified:false,canWrite:false});
  if(allowed!==true)return empty('forbidden');
  if(!id(group?.materialId)||!Array.isArray(group.models)||group.models.length>1000)return empty('unavailable');
  const seen=new Set(),buckets=new Map(),gcd=(a,b)=>{while(b){const r=a%b;a=b;b=r}return a};
  for(const m of group.models){
   if(!m?.key||m.key!==pair(m.orderId,m.productId)||seen.has(m.key)||!Array.isArray(m.grade)||!m.grade.length||m.grade.length>2000||!Number.isSafeInteger(m.pieces)||m.pieces<=0)return empty('unavailable');
   seen.add(m.key);const colors=new Map();let total=0;
   for(const row of m.grade){
    if(!id(row.color)||!id(row.size)||!Number.isSafeInteger(row.qty)||row.qty<=0||row.qty>10000000)return empty('unavailable');
    const bySize=colors.get(row.color)||new Map();if(bySize.has(row.size))return empty('unavailable');bySize.set(row.size,row.qty);colors.set(row.color,bySize);total+=row.qty;
   }
   if(!Number.isSafeInteger(total)||total!==m.pieces)return empty('unavailable');
   for(const [color,sizes] of colors){
    const rows=[...sizes].sort(([a],[b])=>a.localeCompare(b,'pt-BR')|| (a<b?-1:a>b?1:0)),factor=rows.reduce((a,[,q])=>gcd(a,q),0);
    const ratio=rows.map(([size,q])=>({size,perBlock:q/factor})),key=JSON.stringify([color,ratio]),bucket=buckets.get(key)||{color,ratio,models:[]};
    bucket.models.push({key:m.key,orderNumber:m.orderNumber,productName:m.productName,productId:m.productId,blocks:factor,colorPieces:rows.reduce((n,[,q])=>n+q,0)});buckets.set(key,bucket);
   }
  }
  const matches=[...buckets.values()].filter(x=>x.models.length>=2).map(x=>{
   const colorPieces=x.models.reduce((n,m)=>n+m.colorPieces,0),commonFactor=x.models.reduce((a,m)=>gcd(a,m.blocks),0);
   return {...x,colorPieces,commonFactor,distinctProducts:new Set(x.models.map(m=>m.productId)).size};
  });
  if(matches.some(x=>!Number.isSafeInteger(x.colorPieces)))return empty('unavailable');
  matches.sort((a,b)=>b.distinctProducts-a.distinctProducts||b.models.length-a.models.length||b.commonFactor-a.commonFactor||b.colorPieces-a.colorPieces||a.color.localeCompare(b.color,'pt-BR'));
  return {...empty('local-observation'),matches};
 }
 // Unique demand across materials; per-group counts are not additive.
 function workspaceOverview9714(discovery,allowed){
  const empty=state=>({state,groups:[],materials:0,pairs:null,products:null,orders:null,pieces:null,ambiguous:0,canWrite:false,geometryVerified:false});
  if(allowed!==true)return empty('forbidden');
  if(discovery?.state!=='discovery-only'||!Array.isArray(discovery.groups))return empty('unavailable');
  const pairs=new Map(),ambiguous=new Set(),materialIds=new Set(),groups=[];
  for(const g of discovery.groups){
   if(!id(g.materialId)||materialIds.has(id(g.materialId))||!Array.isArray(g.models))return empty('unavailable');
   materialIds.add(id(g.materialId));const colors=new Map(),orders=new Set(),products=new Set(),keys=new Set();let pieces=0;
   for(const m of g.models){
    const key=m?.key;
    if(!key||keys.has(key)||!id(m.orderId)||!id(m.productId)||!Number.isSafeInteger(m.pieces)||m.pieces<=0||!Array.isArray(m.grade)||!m.grade.length||m.grade.some(r=>!id(r.color)||!id(r.size)||!Number.isSafeInteger(r.qty)||r.qty<=0)||m.grade.reduce((n,r)=>n+r.qty,0)!==m.pieces)return empty('unavailable');
    keys.add(key);orders.add(m.orderId);products.add(m.productId);pieces+=m.pieces;
    const signature=modelSignature(m),prior=pairs.get(key);
    if(prior&&prior.signature!==signature)ambiguous.add(key);else if(!prior)pairs.set(key,{m,signature});
    for(const color of new Set(m.grade.map(r=>r.color))){if(!colors.has(color))colors.set(color,new Set());colors.get(color).add(key)}
   }
   if(!Number.isSafeInteger(pieces))return empty('unavailable');
   groups.push({materialId:id(g.materialId),pairs:keys.size,products:products.size,orders:orders.size,pieces,sharedColors:[...colors].filter(([,v])=>v.size>=2).map(([k])=>k).sort((a,b)=>a.localeCompare(b,'pt-BR'))});
  }
  const valid=[...pairs].filter(([k])=>!ambiguous.has(k)).map(([,v])=>v.m),pieces=valid.reduce((n,m)=>n+m.pieces,0);
  if(!Number.isSafeInteger(pieces))return empty('unavailable');
  return {...empty(ambiguous.size?'partial':'local-observation'),groups,materials:groups.length,pairs:valid.length,products:new Set(valid.map(m=>m.productId)).size,orders:new Set(valid.map(m=>m.orderId)).size,pieces,ambiguous:ambiguous.size};
 }
 function catalogGroups(db,allowed){
  if(allowed!==true||!Array.isArray(db?.products)||!Array.isArray(db?.materials))return [];
  const index=rows=>{const m=new Map();for(const x of rows.filter(live)){const k=id(x.id);if(k)m.set(k,m.has(k)?null:x)}return m},materials=index(db.materials),products=index(db.products),valid=fabrics(db.materials),groups=new Map();
  for(const [pid,p] of products){if(!p||p.active===false||!Array.isArray(p.materials))continue;for(const mid of new Set(p.materials.map(x=>id(x.materialId)).filter(x=>valid.has(x)))){const mat=materials.get(mid),g=groups.get(mid)||{materialId:mid,materialName:id(mat.name),products:[]};g.products.push({productId:pid,productName:id(p.name)||pid});groups.set(mid,g)}}
  return [...groups.values()].filter(g=>g.products.length>=2).sort((a,b)=>b.products.length-a.products.length||a.materialName.localeCompare(b.materialName,'pt-BR'));
 }
 function combine(group,keys){
  if(!group||!Array.isArray(group.models)||!Array.isArray(keys)||new Set(keys).size!==keys.length||keys.some(k=>!group.models.some(m=>m.key===k)))throw Error('selection-invalid');
  const models=group.models.filter(m=>keys.includes(m.key)),grades=new Map();
  for(const m of models)for(const g of m.grade){const k=JSON.stringify([g.color,g.size]),v=grades.get(k)||{color:g.color,size:g.size,qty:0};v.qty+=g.qty;grades.set(k,v)}
  return {materialId:group.materialId,models,orderedPieces:models.reduce((n,m)=>n+m.pieces,0),combinedGrade:[...grades.values()].sort((a,b)=>a.color.localeCompare(b.color)||a.size.localeCompare(b.size)),isCombined:models.length>=2,verifiedAvailable:null,optimizedNeed:null,savings:null,canWrite:false};
 }
 function fabrics(materials){const map=new Map();for(const m of (Array.isArray(materials)?materials:[]).filter(live)){const k=id(m.id);if(k)map.set(k,map.has(k)?null:m)}return new Set([...map].filter(([k,m])=>m&&['tecido','malha','renda','tule'].includes(norm(m.cat))).map(([k])=>k))}
 function candidates(products,sourceId,query='',offset=0,catalog){
  if(!Array.isArray(products)||!Number.isSafeInteger(offset)||offset<0)return {state:'unavailable',rows:[],total:0};
  const map=new Map();for(const p of products.filter(live)){const k=id(p.id);if(k)map.set(k,map.has(k)?null:p)}
  const s=map.get(id(sourceId));if(!s)return {state:'source-review',rows:[],total:0};
  const count=(p,m)=>(Array.isArray(p.materials)?p.materials:[]).filter(b=>id(b.materialId)===m).length;
  const materials=[...new Set((Array.isArray(s.materials)?s.materials:[]).map(x=>id(x.materialId)).filter(Boolean))].filter(m=>count(s,m)===1&&fabrics(catalog).has(m));
  const rows=[];for(const [k,p] of map){if(!p||k===id(sourceId)||p.active===false||!norm([id(p.name),id(p.code),id(p.sku),k].join(' ')).includes(norm(query)))continue;for(const m of materials.filter(m=>count(p,m)===1))rows.push({productId:k,productName:id(p.name),materialId:m,materialName:id(s.materials.find(x=>id(x.materialId)===m)?.name)||m})}
  rows.sort((a,b)=>a.productName.localeCompare(b.productName)||a.productId.localeCompare(b.productId)||a.materialId.localeCompare(b.materialId));
  return {state:'local-observation',rows:rows.slice(offset,offset+30),total:rows.length,policyState:remnant.state(s),canWrite:false};
 }
 function weights(cuts,productId){
  if(!Array.isArray(cuts))return [];
  const rows=cuts.filter(x=>live(x)&&id(x.productId)===id(productId)&&cutProductIds9757(x).length<=1&&!x.modelSplitParentV1&&!x.hiddenByModelSplitV1&&x.cutWeightV9579),counts=new Map();for(const x of rows)counts.set(id(x.id),(counts.get(id(x.id))||0)+1);
  return rows.filter(x=>id(x.id)&&counts.get(id(x.id))===1).map(x=>({cutId:id(x.id),orderId:id(x.orderId),...remnant.inspectWeight(x.cutWeightV9579)}));
 }

 // Shared physical records are not individual material-consumption samples.
 function cutProductIds9757(c){
  return [...new Set([id(c?.productId),...['actualCutGrade','cutGrade','originalGrade'].flatMap(k=>(Array.isArray(c?.[k])?c[k]:[]).map(g=>id(g?.productId||g?.product_id)))].filter(Boolean))];
 }
 function jointHistory9757(db,allowed){
  const empty=state=>({state,rows:[],review:0,canWrite:false,completeCloud:false});
  if(allowed!==true)return empty('forbidden');
  if(!['cuts','products','orders','cutters'].every(k=>Array.isArray(db?.[k])))return empty('unavailable');
  const index=rows=>{const m=new Map();for(const x of rows.filter(live)){const k=id(x.id);if(k)m.set(k,m.has(k)?null:x)}return m};
  const cuts=index(db.cuts),products=index(db.products),orders=index(db.orders),people=index(db.cutters),out=empty('local-observation');
  for(const c of db.cuts.filter(live)){
   if(c.modelSplitParentV1||c.hiddenByModelSplitV1||!['finalizado','cortado','concluido'].includes(norm(c.status))||cutProductIds9757(c).length<2)continue;
   const cid=id(c.id),grade=Array.isArray(c.actualCutGrade)&&c.actualCutGrade.length?c.actualCutGrade:null;
   if(!cid||cuts.get(cid)!==c||!grade){out.review++;continue}
   const models=new Map(),cells=new Set();let valid=true,total=0;
   for(const g of grade){
    const pid=id(g?.productId||g?.product_id),color=id(g?.color),size=id(g?.size),qty=g?.qty,oid=id(g?.orderId||c.orderId),key=pair(oid,pid),cell=JSON.stringify([key,color,size]);
    if(!pid||!products.get(pid)||!oid||!orders.get(oid)||!color||!size||!Number.isSafeInteger(qty)||qty<0||cells.has(cell)){valid=false;break}
    cells.add(cell);if(qty===0)continue;const m=models.get(key)||{productId:pid,productName:id(products.get(pid).name)||pid,orderId:oid,orderNumber:id(orders.get(oid).orderNumber||orders.get(oid).number||oid),client:id(orders.get(oid).client),pieces:0,grade:[]};m.pieces+=qty;total+=qty;m.grade.push({color,size,qty});models.set(key,m);
   }
   if(!valid||!Number.isSafeInteger(total)||new Set([...models.values()].map(m=>m.productId)).size<2||!Number.isSafeInteger(c.pieces)||c.pieces!==total){out.review++;continue}
   const w=c.cutWeightV9579,measurement=remnant.inspectWeight(w),weights=measurement.state==='arithmetic-only'&&w.totalKg>0?{totalKg:w.totalKg,usedKg:w.usedKg,wasteKg:w.wasteKg,unclassifiedKg:measurement.unclassifiedKg,usedPct:100*w.usedKg/w.totalKg,note:id(w.note)}:null;
   const materials=(Array.isArray(c.materialUsage)?c.materialUsage:[]).map(m=>({materialId:id(m?.materialId),name:id(m?.name||m?.materialId),weight:typeof m?.weight==='number'&&Number.isFinite(m.weight)&&m.weight>=0?m.weight:null,unit:id(m?.unit)}));
   out.rows.push({cutId:cid,date:id(c.finishedAt||c.date),models:[...models.values()],pieces:total,weights,materials,people:[...new Set([id(c.cutterName||people.get(id(c.cutterId))?.name),id(c.cutter2Name||people.get(id(c.cutter2Id||c.secondCutterId))?.name),id(c.infesterName||c.infestadorName||c.infestador)].filter(Boolean))],source:'actual-multi-model-grade',geometryVerified:false});
  }
  out.rows.sort((a,b)=>b.date.localeCompare(a.date)||a.cutId.localeCompare(b.cutId,'pt-BR',{numeric:true}));
  return out;
 }
 // Historical observations are whole-cut weight records, NOT material-level marker efficiency.
 function cutEvidence(db,allowed){
  const empty=state=>({state,byProduct:new Map(),canWrite:false});
  if(allowed!==true)return empty('forbidden');
  if(!Array.isArray(db?.cuts)||!Array.isArray(db?.products))return empty('unavailable');
  const counts=new Map(),products=new Map(),byProduct=new Map();
  for(const p of db.products.filter(live)){const k=id(p.id);if(k)products.set(k,products.has(k)?null:p)}
  for(const c of db.cuts.filter(live)){const k=id(c.id);if(k)counts.set(k,(counts.get(k)||0)+1)}
  for(const c of db.cuts.filter(live)){
   const pid=id(c.productId),p=products.get(pid);if(!p||p.active===false||c.hiddenByModelSplitV1||c.modelSplitParentV1||cutProductIds9757(c).length>1||!c.cutWeightV9579)continue;
   const h=byProduct.get(pid)||{productId:pid,valid:0,review:0,totalG:0,usedG:0,wasteG:0,unclassifiedG:0};byProduct.set(pid,h);
   const w=c.cutWeightV9579,inspection=remnant.inspectWeight(w);
   if(!id(c.id)||counts.get(id(c.id))!==1||!['finalizado','cortado','concluido'].includes(norm(c.status))||inspection.state!=='arithmetic-only'||w.totalKg<=0||Math.round(w.totalKg*1000)<=0){h.review++;continue}
   h.valid++;h.totalG+=Math.round(w.totalKg*1000);h.usedG+=Math.round(w.usedKg*1000);h.wasteG+=Math.round(w.wasteKg*1000);h.unclassifiedG+=Math.round(inspection.unclassifiedKg*1000);
  }
  for(const [pid,h] of byProduct){if(![h.totalG,h.usedG,h.wasteG,h.unclassifiedG].every(Number.isSafeInteger)){byProduct.delete(pid);continue}
   h.totalKg=h.totalG/1000;h.usedKg=h.usedG/1000;h.wasteKg=h.wasteG/1000;h.unclassifiedKg=h.unclassifiedG/1000;h.wastePct=h.totalG>0?100*h.wasteG/h.totalG:null;h.reusableKg=null;h.savings=null}
  return {state:'local-observation',byProduct,canWrite:false};
 }
 // Coverage is a local configuration review, not a confirmation of usable scraps.
 function remnantCoverage9727(products,materials,allowed){
  const empty=state=>({state,rows:[],counts:null,canWrite:false});
  if(allowed!==true)return empty('forbidden');
  if(!Array.isArray(products)||!Array.isArray(materials))return empty('unavailable');
  const valid=fabrics(materials),index=new Map(),rows=[],counts={unknown:0,yes:0,no:0,review:0};
  for(const p of products.filter(live)){const k=id(p.id);if(!k)continue;index.set(k,index.has(k)?null:p)}
  for(const [pid,p] of index){
   if(p?.active===false)continue;
   if(!p){counts.review++;rows.push({productId:pid,productName:pid,status:'review',destinations:0});continue}
   const raw=p.fabricRemnantPolicyV9630,configured=remnant.state(p);let status=configured,destinations=0;
   if(raw!=null){
    try{
     if(!Array.isArray(raw.eligible)||raw.eligible.length>50||raw.eligible.some(e=>!valid.has(id(e?.materialId))||!index.get(id(e?.productId))||index.get(id(e?.productId)).active===false))throw Error('policy');
     const parsed=remnant.preview(pid,raw,products).policy;
     if(parsed.state==='yes'&&!parsed.eligible.length)throw Error('no-target');
     destinations=parsed.eligible.length;
    }catch(_){status='review'}
   }
   if(!Object.hasOwn(counts,status))status='review';
   counts[status]++;rows.push({productId:pid,productName:id(p.name)||pid,status,destinations});
  }
  return {...empty('local-observation'),rows,counts};
 }
 function groupEvidence(group,db,history,allowed){
  const empty=state=>({state,models:[],hints:[],canWrite:false,geometryVerified:false,savings:null});
  if(allowed!==true)return empty('forbidden');
  if(!Array.isArray(group?.models)||!Array.isArray(db?.products)||!Array.isArray(db?.materials)||history?.state!=='local-observation'||!(history.byProduct instanceof Map)||!fabrics(db.materials).has(id(group.materialId)))return empty('unavailable');
  const products=new Map();for(const p of db.products.filter(live)){const k=id(p.id);if(k)products.set(k,products.has(k)?null:p)}
  const ids=[...new Set(group.models.map(m=>id(m.productId)))],hints=[],models=[];
  for(const pid of ids){const p=products.get(pid);if(!p||p.active===false)continue;const h=history.byProduct.get(pid);
   models.push({productId:pid,productName:id(p.name)||pid,valid:h?.valid||0,review:h?.review||0,totalKg:h?.totalKg??null,wasteKg:h?.valid?h.wasteKg:null,wastePct:h?.wastePct??null,unclassifiedKg:h?.valid?h.unclassifiedKg:null});
   if(remnant.state(p)!=='yes')continue;
   let policy;try{policy=remnant.preview(pid,p.fabricRemnantPolicyV9630,db.products).policy}catch(_){continue}
   for(const x of policy.eligible){const target=products.get(x.productId);if(x.materialId!==id(group.materialId)||!target||target.active===false)continue;
    const candidates=group.models.filter(m=>id(m.productId)===x.productId),demand=[],seen=new Set();let validDemand=true;
    for(const m of candidates){
     if(!m.key||m.key!==pair(m.orderId,m.productId)||seen.has(m.key)||!Array.isArray(m.grade)||!m.grade.length){validDemand=false;break}seen.add(m.key);
     const cells=new Set();let sum=0;
     for(const g of m.grade){const k=JSON.stringify([g.color,g.size]);if(!id(g.color)||!id(g.size)||cells.has(k)||!Number.isSafeInteger(g.qty)||g.qty<=0){validDemand=false;break}cells.add(k);sum+=g.qty;
      if((!x.color||norm(g.color)===norm(x.color))&&(!x.size||norm(g.size)===norm(x.size)))demand.push({orderId:m.orderId,orderNumber:m.orderNumber,color:g.color,size:g.size,qty:g.qty});
     }
     if(sum!==m.pieces){validDemand=false;break}
    }
    const total=demand.reduce((n,g)=>n+g.qty,0),requested=validDemand&&Number.isSafeInteger(total)?total:null;
    hints.push({sourceId:pid,sourceName:id(p.name)||pid,targetId:x.productId,targetName:id(target.name)||x.productId,requested,demand:requested===null?[]:demand,minWidthMm:x.minWidthMm,minLengthMm:x.minLengthMm,color:x.color,size:x.size,physicalFit:null,reusableKg:null});
   }
  }
  return {...empty('local-observation'),models:models.sort((a,b)=>b.valid-a.valid||a.productName.localeCompare(b.productName,'pt-BR')),hints:hints.sort((a,b)=>Number(b.requested>0)-Number(a.requested>0)||b.requested-a.requested||a.targetName.localeCompare(b.targetName,'pt-BR'))};
 }

 // Historical measured material consumption, never marker efficiency or confirmed stock.
 function materialHistory(db,allowed){
  const empty=state=>({state,byPair:new Map(),canWrite:false});
  if(allowed!==true)return empty('forbidden');
  if(!Array.isArray(db?.cuts)||!Array.isArray(db?.products)||!Array.isArray(db?.materials))return empty('unavailable');
  const valid=fabrics(db.materials),products=new Map(),counts=new Map(),byPair=new Map();
  for(const p of db.products.filter(live)){const k=id(p.id);if(k)products.set(k,products.has(k)?null:p)}
  for(const c of db.cuts.filter(live)){const k=id(c.id);if(k)counts.set(k,(counts.get(k)||0)+1)}
  for(const c of db.cuts.filter(live)){
   const pid=id(c.productId),p=products.get(pid);if(!p||p.active===false||c.hiddenByModelSplitV1||c.modelSplitParentV1||cutProductIds9757(c).length>1||!Array.isArray(c.materialUsage))continue;
   const mids=new Map();for(const u of c.materialUsage){const mid=id(u?.materialId);if(valid.has(mid)){if(!mids.has(mid))mids.set(mid,[]);mids.get(mid).push(u)}}
   for(const [mid,rows] of mids){
    const k=pair(pid,mid),h=byPair.get(k)||{productId:pid,materialId:mid,cuts:0,review:0,totalGrams:0,pieces:0};byPair.set(k,h);
    const u=rows[0],unit=norm(u.unit),weight=u.weight,grams=typeof weight==='number'&&Number.isFinite(weight)&&weight>0?weight*(unit==='kg'?1000:['g','grama','gramas'].includes(unit)?1:0):0;
    if(!id(c.id)||counts.get(id(c.id))!==1||!['finalizado','cortado','concluido'].includes(norm(c.status))||rows.length!==1||!Number.isSafeInteger(c.pieces)||c.pieces<=0||!Number.isSafeInteger(Math.round(grams*1000))||grams<=0||grams>20000000){h.review++;continue}
    const nextGrams=h.totalGrams+grams,nextPieces=h.pieces+c.pieces;
    if(!Number.isFinite(nextGrams)||!Number.isSafeInteger(nextPieces)){h.review++;continue}
    h.cuts++;h.totalGrams=nextGrams;h.pieces=nextPieces;
    // Only explicit, offset-aware timestamps of measured records support chronology.
    const timestamp=c.materialUsageRecordedAt,ms=typeof timestamp==='string'&&/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(timestamp)?Date.parse(timestamp):NaN;
    if(Number.isFinite(ms)){(h.samples||(h.samples=[])).push({cutId:id(c.id),ms,grams,pieces:c.pieces})}
   }
  }
  return {state:'local-observation',byPair,canWrite:false};
 }
 function materialEstimate(group,history,allowed){
  const empty=state=>({state,rows:[],coveredPieces:0,uncoveredPieces:0,estimatedKg:null,canWrite:false,savings:null});
  if(allowed!==true)return empty('forbidden');
  if(!Array.isArray(group?.models)||history?.state!=='local-observation'||!(history.byPair instanceof Map))return empty('unavailable');
  const ids=new Map(),seen=new Set();
  for(const m of group.models){if(!m.key||seen.has(m.key)||!id(m.productId)||!Number.isSafeInteger(m.pieces)||m.pieces<=0)return empty('unavailable');seen.add(m.key);const pid=id(m.productId),v=ids.get(pid)||{productId:pid,productName:m.productName,pieces:0};v.pieces+=m.pieces;if(!Number.isSafeInteger(v.pieces))return empty('unavailable');ids.set(pid,v)}
  const rows=[...ids.values()].map(m=>{const h=history.byPair.get(pair(m.productId,group.materialId)),gramsPerPiece=h?.cuts>0&&h.pieces>0?h.totalGrams/h.pieces:null;return {...m,cuts:h?.cuts||0,review:h?.review||0,gramsPerPiece,estimatedKg:gramsPerPiece===null?null:gramsPerPiece*m.pieces/1000}});
  const coveredPieces=rows.reduce((n,r)=>n+(r.estimatedKg===null?0:r.pieces),0),uncoveredPieces=rows.reduce((n,r)=>n+(r.estimatedKg===null?r.pieces:0),0),estimatedKg=coveredPieces?rows.reduce((n,r)=>n+(r.estimatedKg??0),0):null;
  if(!Number.isSafeInteger(coveredPieces)||!Number.isSafeInteger(uncoveredPieces)||estimatedKg!==null&&!Number.isFinite(estimatedKg))return empty('unavailable');
  return {...empty('local-estimate'),rows,coveredPieces,uncoveredPieces,estimatedKg};
 }

 // Portable planning snapshot. Local clock and file do not establish a trusted audit timestamp.
 function forecastDraft(group,db,history,createdAt,allowed){
  const fail=reason=>({state:'blocked',reason,canWrite:false});
  if(allowed!==true)return fail('permission');
  if(typeof createdAt!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(createdAt)||!Number.isFinite(Date.parse(createdAt))||new Date(createdAt).toISOString()!==createdAt)return fail('date');
  if(!Array.isArray(group?.models)||!group.models.length||group.models.length>1000||!id(group.materialId)||!Array.isArray(db?.materials)||!fabrics(db.materials).has(id(group.materialId)))return fail('group');
  const selection=planSelection({state:'discovery-only',groups:[group]},group.models.map(m=>({key:m.key,signature:modelSignature(m)})));
  if(selection.state!=='local-preview'||selection.rows.length!==group.models.length)return fail('selection');
  const estimate=materialEstimate(group,history,true);if(estimate.state!=='local-estimate'||estimate.estimatedKg===null)return fail('history');
  const entries=selection.rows.map(m=>{const h=estimate.rows.find(x=>x.productId===m.productId);return {orderId:m.orderId,orderNumber:m.orderNumber,productId:m.productId,productName:m.productName,pieces:m.pieces,grade:m.grade.map(g=>({color:g.color,size:g.size,qty:g.qty})),sampleCuts:h?.cuts||0,gramsPerPiece:h?.gramsPerPiece??null,estimatedKg:h?.gramsPerPiece==null?null:h.gramsPerPiece*m.pieces/1000}});
  if(entries.some(e=>e.estimatedKg!==null&&(!Number.isFinite(e.estimatedKg)||e.estimatedKg<=0)))return fail('estimate');
  return {state:'local-draft',format:'hlgb-cut-forecast-v1',createdAt,materialId:id(group.materialId),materialName:id(group.materialName),entries,coveredPieces:estimate.coveredPieces,uncoveredPieces:estimate.uncoveredPieces,estimatedKg:estimate.estimatedKg,clockVerified:false,remoteSaved:false,geometryVerified:false,canWrite:false,savings:null};
 }

 // Retrospective holdout: estimate the newest uniquely dated measurement using
 // ONLY earlier recorded measurements. Not a saved prediction or proof of savings.
 function materialBacktest(group,history,allowed){
  if(allowed!==true)return {state:'forbidden',rows:[],canWrite:false};
  if(!Array.isArray(group?.models)||history?.state!=='local-observation'||!(history.byPair instanceof Map))return {state:'unavailable',rows:[],canWrite:false};
  const rows=[],seen=new Set();
  for(const m of group.models){
   const pid=id(m.productId);if(!pid||seen.has(pid))continue;seen.add(pid);
   const h=history.byPair.get(pair(pid,group.materialId)),samples=Array.isArray(h?.samples)?h.samples.slice().sort((a,b)=>b.ms-a.ms):[],base={productId:pid,productName:m.productName,datedSamples:samples.length,undatedSamples:(h?.cuts||0)-samples.length};
   if(samples.length<4||samples[0].ms===samples[1].ms){rows.push({...base,state:'insufficient'});continue}
   const latest=samples[0],prior=samples.slice(1).filter(x=>x.ms<latest.ms),grams=prior.reduce((n,x)=>n+x.grams,0),pieces=prior.reduce((n,x)=>n+x.pieces,0);
   if(prior.length<3||!Number.isSafeInteger(pieces)||pieces<=0||!Number.isFinite(grams)||grams<=0){rows.push({...base,state:'insufficient'});continue}
   const expectedKg=grams/pieces*latest.pieces/1000,actualKg=latest.grams/1000,deltaKg=actualKg-expectedKg,deltaPct=100*deltaKg/expectedKg;
   if(![expectedKg,actualKg,deltaKg,deltaPct].every(Number.isFinite)){rows.push({...base,state:'insufficient'});continue}
   rows.push({...base,state:'retrospective',cutId:latest.cutId,recordedAt:new Date(latest.ms).toISOString(),priorCuts:prior.length,pieces:latest.pieces,expectedKg,actualKg,deltaKg,deltaPct,savings:null});
  }
  return {state:'local-observation',rows,canWrite:false};
 }

 // Current local catalogue reference price, not paid cost or purchasing requirement.
 function materialCostEstimate(group,estimate,materials,allowed){
  const empty=(state,reason)=>({state,reason,rows:[],referencePricePerKg:null,estimatedCents:null,coveredPieces:0,uncoveredPieces:null,canWrite:false,savings:null});
  if(allowed!==true)return empty('forbidden','permission');
  if(estimate?.state!=='local-estimate'||!Array.isArray(estimate.rows)||!Array.isArray(materials)||!group||!id(group.materialId))return empty('unavailable','input');
  const mid=id(group.materialId),matches=materials.filter(m=>live(m)&&id(m.id)===mid);
  if(matches.length!==1||!fabrics(materials).has(mid))return empty('unavailable','material');
  const m=matches[0],unit=norm(m.unit),price=typeof m.price==='number'?m.price:typeof m.price==='string'&&/^\d+(?:\.\d+)?$/.test(m.price)?Number(m.price):NaN;
  if(!Number.isFinite(price)||price<=0||!['kg','g','grama','gramas'].includes(unit))return empty('unavailable','price-or-unit');
  const referencePricePerKg=unit==='kg'?price:price*1000;
  if(!Number.isFinite(referencePricePerKg))return empty('unavailable','price');
  const rows=estimate.rows.map(r=>({...r,estimatedCents:r.estimatedKg===null?null:Math.round(r.estimatedKg*referencePricePerKg*100)}));
  if(rows.some(r=>r.estimatedCents!==null&&(!Number.isSafeInteger(r.estimatedCents)||r.estimatedCents<0)))return empty('unavailable','amount');
  const coveredPieces=rows.reduce((n,r)=>n+(r.estimatedCents===null?0:r.pieces),0),uncoveredPieces=rows.reduce((n,r)=>n+(r.estimatedCents===null?r.pieces:0),0),estimatedCents=coveredPieces?rows.reduce((n,r)=>n+(r.estimatedCents??0),0):null;
  if(!Number.isSafeInteger(coveredPieces)||!Number.isSafeInteger(uncoveredPieces)||estimatedCents!==null&&!Number.isSafeInteger(estimatedCents))return empty('unavailable','amount');
  return {...empty('local-estimate',null),rows,referencePricePerKg,estimatedCents,coveredPieces,uncoveredPieces};
 }

 // Read-only preparation for eventual official product editor integration.
 // Exact snapshot match is intentionally conservative; no retry, mutation or RPC here.
 function prepareRemnantChange({productId,input,products,materials,remote,snapshot,pending,allowed}={}){
  const fail=reason=>({state:'blocked',reason,canWrite:false});
  if(allowed!==true)return fail('permission');
  if(pending!==false)return fail('pending-or-unverified');
  const pid=id(productId);
  if(!pid||!Array.isArray(products)||!Array.isArray(materials))return fail('missing-source');
  const found=products.filter(p=>live(p)&&id(p.id)===pid);
  if(found.length!==1||found[0].active===false)return fail('missing-source');
  if(remote?.module!=='products'||id(remote.entity_id)!==pid||remote.deleted_at||!live(remote.data)||id(remote.data.id)!==pid||remote.data.active===false)return fail('remote-missing');
  if(!Number.isSafeInteger(remote.revision)||remote.revision<1||snapshot?.revision!==remote.revision||snapshot.deleted_at||!live(snapshot.data))return fail('revision-changed');
  // Stable comparison of JSON records; key order is not a business change.
  const stable=v=>Array.isArray(v)?v.map(stable):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,stable(v[k])])):v;
  const same=(a,b)=>JSON.stringify(stable(a))===JSON.stringify(stable(b));
  if(!same(snapshot.data,remote.data)||!same(found[0],remote.data))return fail('record-changed');
  if(!Array.isArray(input?.eligible)||input.eligible.length>50||(Array.isArray(remote.data.fabricRemnantPolicyV9630?.eligible)&&remote.data.fabricRemnantPolicyV9630.eligible.length>50))return fail('policy-limit');
  try{
   const valid=fabrics(materials);
   if(input.eligible.some(x=>!valid.has(id(x?.materialId))||!products.some(p=>live(p)&&p.active!==false&&id(p.id)===id(x?.productId))))return fail('material-or-target');
   const policy=remnant.preview(pid,input,products).policy;
   const next=JSON.parse(JSON.stringify(remote.data));
   // The draft-only marker must not become a persisted approval marker.
   const {mode,...fields}=policy;next.fabricRemnantPolicyV9630=fields;
   return {state:'prepared-only',expectedRevision:remote.revision,changed:!same(remote.data.fabricRemnantPolicyV9630,fields),next,canWrite:false,remoteTargetsVerified:false};
  }catch(_){return fail('invalid-policy')}
 }

 // A model/order may appear under several materials. Build one selection by canonical pair.
 function modelSignature(m){return JSON.stringify([m.key,m.orderId,m.orderNumber,m.productId,m.productName,m.pieces,[...m.grade].map(x=>[x.color,x.size,x.qty]).sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b)))])}
 function planSelection(discovery,selected){
  const empty=(state,issues=[])=>({state,issues,rows:[],byProduct:[],orderedPieces:null,canWrite:false});
  if(discovery?.state!=='discovery-only'||!Array.isArray(discovery.groups)||!Array.isArray(selected)||selected.length>1000)return empty('unavailable');
  try{
   const index=new Map(),seen=new Set();
   for(const g of discovery.groups)for(const m of g.models){const k=m.key;if(!k||!m.productId||!m.orderId||!Number.isSafeInteger(m.pieces)||m.pieces<=0||!Array.isArray(m.grade)||m.grade.some(x=>!x.color||!x.size||!Number.isSafeInteger(x.qty)||x.qty<=0)||m.grade.reduce((a,x)=>a+x.qty,0)!==m.pieces)continue;
    const sig=modelSignature(m),old=index.get(k);if(!index.has(k))index.set(k,{m,sig});else if(!old||old.sig!==sig)index.set(k,null);
   }
   const rows=[],issues=[];
   for(const x of selected){if(!x?.key||seen.has(x.key))return empty('invalid-selection',['duplicate-or-invalid-pair']);seen.add(x.key);const found=index.get(x.key);if(!found||found.sig!==x.signature){issues.push('changed-or-ambiguous-model');continue}rows.push(found.m)}
   if(issues.length)return empty('stale',issues);
   const products=new Map();let orderedPieces=0;
   for(const m of rows){orderedPieces+=m.pieces;const x=products.get(m.productId)||{productId:m.productId,productName:m.productName,pieces:0,orderCount:0};x.pieces+=m.pieces;x.orderCount++;products.set(m.productId,x)}
   if(!Number.isSafeInteger(orderedPieces)||[...products.values()].some(x=>!Number.isSafeInteger(x.pieces)||x.pieces>10000000))return empty('invalid-selection',['quantity-limit']);
   return {state:'local-preview',rows,byProduct:[...products.values()].sort((a,b)=>a.productName.localeCompare(b.productName,'pt-BR')),orderedPieces,issues:[],canWrite:false};
  }catch(_){return empty('unavailable')}
 }
 function materialDemand(selection,data,allowed){
  const empty=state=>({state,rows:[],models:[],issues:[],canWrite:false});
  if(allowed!==true)return empty('forbidden');
  if(selection?.state!=='local-preview'||!Array.isArray(selection.byProduct)||!Array.isArray(data?.products)||!Array.isArray(data?.materials))return empty('unavailable');
  const index=rows=>{const m=new Map();for(const x of rows.filter(live)){const k=id(x.id);if(k)m.set(k,m.has(k)?null:x)}return m};
  const products=index(data.products),materials=index(data.materials),totals=new Map(),issues=[],models=[];
  const number=v=>typeof v==='number'||typeof v==='string'&&/^\d+(?:\.\d+)?$/.test(v)?Number(v):NaN;
  for(const item of selection.byProduct){
   const p=products.get(id(item.productId)),model={productId:item.productId,productName:item.productName,pieces:item.pieces,materials:[],issues:[]};
   if(!p||p.active===false||!Array.isArray(p.materials)||!p.materials.length){model.issues.push('missing-or-ambiguous-bom');issues.push(...model.issues);models.push(model);continue}
   const components=new Map(),counts=new Map();
   for(const b of p.materials){const mid=id(b?.materialId),m=materials.get(mid),unit=id(b?.unit||m?.unit),color=id(b?.color),key=JSON.stringify([mid,norm(unit),norm(color)]);counts.set(key,(counts.get(key)||0)+1);if(!components.has(key))components.set(key,{b,m,mid,unit,color,key})}
   for(const x of components.values()){
    const {b,m,mid,unit,color,key}=x,rate=number(b?.qty),loss=number(b?.loss??0),mode=b?.calcMode||'consumption';
    if(counts.get(key)!==1||!m||!mid||!unit||!id(m.name)||m.unit&&norm(m.unit)!==norm(unit)||!Number.isFinite(rate)||rate<=0||!Number.isFinite(loss)||loss<0||!['yield','consumption'].includes(mode)){model.issues.push('material-review:'+mid);continue}
    const need=(mode==='yield'?item.pieces/rate:item.pieces*rate)*(1+loss/100);if(!Number.isFinite(need)||need<=0){model.issues.push('quantity-review:'+mid);continue}
    const row={materialId:mid,materialName:id(m.name),unit,color,needed:need,mode,rate,loss};model.materials.push(row);
    const g=totals.get(key)||{materialId:mid,materialName:id(m.name),unit,color,needed:0,models:[]};g.needed+=need;g.models.push({productId:item.productId,productName:item.productName,needed:need,pieces:item.pieces});totals.set(key,g)
   }
   issues.push(...model.issues);models.push(model);
  }
  const rows=[...totals.values()].sort((a,b)=>a.materialName.localeCompare(b.materialName,'pt-BR')||a.unit.localeCompare(b.unit)||a.color.localeCompare(b.color));
  if(rows.some(x=>!Number.isFinite(x.needed)))return empty('unavailable');
  return {state:'local-estimate',rows,models,issues,partial:issues.length>0,stockVerified:false,canWrite:false};
 }
 // A printable DRAFT only. One arithmetic option, no history/write or confirmed execution.
 // Select one existing mathematical option per colour; no arbitrary quantities.
 function selectedGradePlan(group,cap,choices={},allowed){
  if(allowed!==true||!choices||typeof choices!=='object'||Array.isArray(choices))throw Error('invalid-scenario');
  const plans=gradeSuggestions(group,cap);if(!plans.length)throw Error('invalid-grade');
  if(Object.keys(choices).some(c=>!plans.some(p=>p.color===c)))throw Error('unknown-color');
  return plans.map(p=>{
   const options=[{id:'exact',name:'Grade exata',spreads:[{layers:p.layers,rows:p.base}]}];
   if(p.alternative)options.push({id:'limit',name:'Limite de folhas',spreads:[{layers:p.alternative.layers,rows:p.alternative.rows.filter(r=>r.planned>0)}]});
   for(const [i,v] of p.multiSpreads.entries())options.push({id:'multi-'+i,name:'Múltiplos enfestos '+(i+1),spreads:v.spreads});
   const selected=options.find(o=>o.id===(Object.prototype.hasOwnProperty.call(choices,p.color)?choices[p.color]:'exact'));if(!selected)throw Error('unknown-option');
   const count=new Map(),key=r=>JSON.stringify([r.key,r.size]);
   for(const spread of selected.spreads)for(const r of spread.rows){if(r.planned!==spread.layers*r.perLayer||r.planned<0)throw Error('invalid-plan');count.set(key(r),(count.get(key(r))||0)+r.planned)}
   const remaining=p.base.map(r=>({...r,remainder:r.qty-(count.get(key(r))||0)}));if(remaining.some(r=>r.remainder<0))throw Error('overcut');
   return {color:p.color,total:p.total,options:options.map(({id,name})=>({id,name})),selected:selected.id,name:selected.name,spreads:selected.spreads,remaining:remaining.filter(r=>r.remainder>0),geometryVerified:false};
  });
 }
 function scenarioSummary(group,cap,choices,allowed){
  const plans=selectedGradePlan(group,cap,choices,allowed);
  const total=plans.reduce((n,p)=>n+p.total,0),remaining=plans.reduce((n,p)=>n+p.remaining.reduce((v,r)=>v+r.remainder,0),0);
  const combinedPieces=plans.reduce((n,p)=>n+p.spreads.filter(s=>new Set(s.rows.map(r=>r.key)).size>=2).reduce((v,s)=>v+s.rows.reduce((w,r)=>w+r.planned,0),0),0);
  return {total,remaining,combinedPieces,spreads:plans.reduce((n,p)=>n+p.spreads.length,0),plans,geometryVerified:false,canWrite:false};
 }
 function jointPrintDraft(group,maxLayers,mode,allowed,choices={}){
  if(allowed!==true||!['combined','individual','packet'].includes(mode)||!id(group?.materialId)||!Array.isArray(group?.models)||group.models.length<2||group.models.length>1000)throw Error('invalid-print-selection');
  const plans=selectedGradePlan(group,maxLayers,choices,allowed);
  if(!plans.length||plans.reduce((n,p)=>n+p.total,0)!==group.models.reduce((n,m)=>n+m.pieces,0))throw Error('invalid-print-grade');
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const ref='Identificação do lote: __________________';
  const table=(headers,rows)=>'<table><thead><tr>'+headers.map(v=>'<th>'+esc(v)+'</th>').join('')+'</tr></thead><tbody>'+rows.map(r=>'<tr>'+r.map(v=>'<td>'+esc(v)+'</td>').join('')+'</tr>').join('')+'</tbody></table>';
  const head=title=>'<h1>HLGB · '+title+'</h1><p class="warning">RASCUNHO DE SIMULAÇÃO — não autoriza corte, não comprova saldo nem encaixe físico.</p><p>'+ref+' · Data: ____/____/______</p>';
  const signatures='<div class="sign">Cortador 1: ____________________ &nbsp; Cortador 2: ____________________ &nbsp; Infestador / conferência: ____________________</div>';
  const material=esc(group.materialName||group.materialId);
  // One row per order/model/colour/spread, keeping quantities per size explicit.
  const rowsFor=m=>{
   const rows=[];
   for(const p of plans){
    const append=(entries,label,layers,complementary)=>{
     const groups=new Map();
     for(const x of entries){if(m&&x.key!==m.key)continue;const list=groups.get(x.key)||[];list.push(x);groups.set(x.key,list)}
     for(const list of groups.values()){
      const first=list[0],sizes=list.slice().sort((a,b)=>{const order=['PP','P','M','G','GG','XG','XGG','G1','G2','G3'];const rank=x=>{const i=order.indexOf(x.size);return i<0?order.length:i};return rank(a)-rank(b)||a.size.localeCompare(b.size,'pt-BR',{numeric:true})});
      const grade=sizes.map(x=>x.size+': '+(complementary?x.remainder:x.planned)).join(' / ');
      const perLeaf=complementary?'—':sizes.map(x=>x.size+': '+x.perLayer).join(' / ');
      const actual=sizes.map(x=>x.size+': ___').join(' / ');
      const total=sizes.reduce((n,x)=>n+(complementary?x.remainder:x.planned),0);
      const common=[p.color,label,layers,perLeaf,grade,total,actual];
      rows.push(m?common:[first.orderNumber,first.productName,...common]);
     }
    };
    p.spreads.forEach((s,i)=>append(s.rows,String(i+1),s.layers,false));
    append(p.remaining,'Complementar','—',true);
   }
   return rows;
  };
  const commonColumns=['Cor','Enfesto','Folhas','Grade por folha','Grade prevista','Total pç','Realizado por tam.'];
  const columns=['Pedido','Modelo',...commonColumns];
  const combined='<section class="sheet" data-joint-sheet="combined">'+head('FOLHA CONJUNTA DE CORTE')+'<p>Matéria-prima candidata: <b>'+material+'</b> · '+group.models.length+' pedido(s)/modelo(s) · '+plans.reduce((n,p)=>n+p.total,0)+' peças previstas · opções: '+esc(plans.map(p=>p.color+' — '+p.name).join('; '))+'</p><p>☐ Interno &nbsp; ☐ Externo &nbsp; Lote: __________ Largura útil: ________</p><h2>Grade por modelo e enfesto</h2>'+table(columns,rowsFor(null))+'<h2>Conferência e pesagem coletiva</h2>'+table(['Material','Cor / lote','Total kg','Usado kg','Refugo kg','Sobra kg','Aprov. %'],[[group.materialName||group.materialId,'','','','','',''],['Outro:','','','','','','']])+'<p>☐ Material conferido &nbsp; ☐ Grade conferida &nbsp; ☐ Encaixe físico conferido &nbsp; ☐ Separação conferida</p><p>Peças extras / aproveitamento de sobras: ____________________________</p><p>Observações / divergências: _________________________________________</p>'+signatures+'</section>';
  const individuals=group.models.map(m=>'<section class="sheet" data-joint-sheet="individual">'+head('FICHA INDIVIDUAL — APÓS SEPARAÇÃO (RAScunho)'.toUpperCase())+'<p>Pedido #'+esc(m.orderNumber)+' · <b>'+esc(m.productName)+'</b> · '+esc(m.pieces)+' peças previstas</p><p>Material candidato: '+material+' · Destino / facção: ________________________</p>'+table(commonColumns,rowsFor(m))+'<p>Conferência da quantidade realmente separada: _________ pç</p><p>☐ Grade conferida &nbsp; ☐ Materiais conferidos &nbsp; ☐ Destino conferido</p><p>Observações / divergências: _________________________________________</p><p>Pesagem coletiva consta na ficha conjunta; não repetir como consumo individual.</p>'+signatures+'</section>').join('');
  const pages=mode==='combined'?combined:mode==='individual'?individuals:combined+individuals;
  return '<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>HLGB — rascunho de corte conjunto</title><style>@page{size:A4 portrait;margin:9mm}*{box-sizing:border-box}body{font:10px/1.2 Arial,sans-serif;color:#111;margin:0}h1{font-size:17px;margin:0 0 8px}h2{font-size:12px;margin:7px 0 3px}p{margin:4px 0}.warning{font-weight:bold;border:1px solid #555;padding:5px}table{width:100%;border-collapse:collapse;table-layout:auto}th,td{border:1px solid #777;padding:3px;vertical-align:top;overflow-wrap:anywhere}th{background:#eee}thead{display:table-header-group}tr{break-inside:avoid;page-break-inside:avoid}.sign{margin-top:12px;break-inside:avoid}.sheet+.sheet{break-before:page;page-break-before:always}@media screen{body{max-width:190mm;margin:12px auto}.sheet+.sheet{border-top:2px dashed #888;margin-top:20px;padding-top:15px}}</style></head><body>'+pages+'</body></html>';
 }
 function unpairedModels(d,allowed){
  if(allowed!==true||d?.state!=='discovery-only')return [];
  const paired=new Set(d.groups.flatMap(g=>g.models.map(m=>m.key))),out=new Map();
  for(const g of d.singleMaterialGroups||[])for(const l of g.lines||[]){
   const key=pair(l.orderId,l.productId);if(paired.has(key))continue;
   const m=out.get(key)||{key,orderId:l.orderId,productId:l.productId,productName:l.productName,materials:[],reason:'no-observed-partner'};
   if(!m.materials.some(x=>x.id===g.materialId))m.materials.push({id:g.materialId,name:g.materialName});out.set(key,m);
  }
  for(const l of d.reviewLines||[]){
   if(!l.orderId)continue;const key=pair(l.orderId,l.productId);if(paired.has(key))continue;
   const m=out.get(key)||{key,orderId:l.orderId,productId:l.productId,productName:'',materials:[],reason:'review'};
   m.reason='review';m.reviewReason=l.reason;out.set(key,m);
  }
  return [...out.values()].sort((a,b)=>a.productName.localeCompare(b.productName,'pt-BR')||a.orderId.localeCompare(b.orderId,'pt-BR',{numeric:true}));
 }
 function compareGradeOptions(group,cap,allowed){
  if(allowed!==true)return [];
  return gradeSuggestions(group,cap).map(p=>{
   const summarize=(name,spreads,remaining)=>({name,spreads:spreads.length,combinedPieces:spreads.filter(s=>new Set(s.rows.filter(r=>r.planned>0).map(r=>r.key)).size>=2).reduce((n,s)=>n+s.rows.reduce((v,r)=>v+r.planned,0),0),remaining,peak:Math.max(0,...spreads.map(s=>s.rows.reduce((n,r)=>n+r.perLayer,0))),geometryVerified:false});
   const options=[summarize('Grade exata',[{rows:p.base}],0)];
   if(p.alternative){const rows=p.alternative.rows;options.push(summarize('Limite de folhas',[{rows}],rows.reduce((n,r)=>n+r.remainder,0)))}
   for(const [i,v] of p.multiSpreads.entries())options.push(summarize('Múltiplos enfestos '+(i+1),v.spreads,v.remaining));
   return {color:p.color,total:p.total,options};
  });
 }

 // Delivery throughput is an observed proxy, not verified manufacturing capacity.
 function deliveryCapacityPlan(input,allowed){
  const empty=(state,issues=[])=>({state,issues,weeks:[],orders:[],daily:[],canWrite:false,canPromise:false,cashVerified:false});
  if(allowed!==true)return empty('forbidden');
  const D=86400000,dt=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&Number.isFinite(Date.parse(s+'T00:00:00Z'))&&new Date(s+'T00:00:00Z').toISOString().slice(0,10)===s?Date.parse(s+'T00:00:00Z'):null,iso=n=>new Date(n).toISOString().slice(0,10);
  const monday=n=>n-((new Date(n).getUTCDay()+6)%7)*D,qty=n=>Number.isSafeInteger(n)&&n>=0&&n<=10000000;
  const start=dt(input?.start),horizon=input?.weeks,manual=input?.weeklyGoal,buffer=input?.bufferPercent;
  if(start===null||!Number.isSafeInteger(horizon)||horizon<1||horizon>13||manual!==null&&!qty(manual)||!Number.isSafeInteger(buffer)||buffer<0||buffer>90||
   !Array.isArray(input?.history)||input.history.length>52||!Array.isArray(input?.orders)||input.orders.length>5000||!Array.isArray(input?.closedDates)||input.closedDates.length>366)return empty('invalid-input');
  const issues=[],hist=new Map(),curWeek=monday(start);
  for(const x of input.history){const t=dt(x?.week);if(t===null||monday(t)!==t||t+6*D>=curWeek||!qty(x?.pieces)||hist.has(t))return empty('invalid-history');if(x.confirmed!==true)continue;hist.set(t,x.pieces)}
  const samples=[...hist].sort((a,b)=>b[0]-a[0]).slice(0,12).map(x=>x[1]),sorted=samples.slice().sort((a,b)=>a-b);
  const average=samples.length?Math.round(samples.reduce((a,b)=>a+b,0)/samples.length):null;
  const conservative=samples.length>=4?sorted[Math.floor((sorted.length-1)*.25)]:null;
  const basis=manual===null?conservative:conservative===null?manual:Math.min(manual,conservative);
  const weeklyTarget=basis===null?null:Math.floor(basis*(100-buffer)/100);
  if(conservative===null)issues.push('historico-insuficiente');
  if(input.coverageConfirmed!==true)issues.push('carteira-nao-conferida');
  const closed=new Set();for(const x of input.closedDates){const t=dt(x);if(t===null)return empty('invalid-calendar');closed.add(t)}
  const end=curWeek+horizon*7*D-D,orders=[],keys=new Set();
  for(const x of input.orders){const key=id(x?.key),due=dt(x?.dueDate);
   if(!key||keys.has(key)||!qty(x?.pieces)||!x.pieces||due===null||!id(x.client)){issues.push('pedido-invalido-ou-duplicado');continue}keys.add(key);
   const term=x.paymentMode,days=x.paymentDays,amount=Number.isSafeInteger(x.amountCents)&&x.amountCents>=0?x.amountCents:null;
   const paymentMode=term==='cash'?'cash':term==='term'&&Number.isSafeInteger(days)&&days>0&&days<=365?'term':'unknown';
   const receipt=paymentMode==='cash'?due:paymentMode==='term'?due+days*D:null;
   orders.push({key,client:id(x.client),model:id(x.model),dueDate:iso(due),due,pieces:x.pieces,remaining:x.pieces,paymentMode,paymentDays:paymentMode==='term'?days:null,amountCents:amount,receiptDate:receipt===null?null:iso(receipt),allocations:[],lastWorkDate:null,latePieces:0});
  }
  orders.sort((a,b)=>a.due-b.due||a.key.localeCompare(b.key));
  const daily=[],weeks=[],dailyBase=weeklyTarget===null?null:Math.floor(weeklyTarget/5),extra=weeklyTarget===null?0:weeklyTarget%5;
  for(let w=0;w<horizon;w++){
   const t=curWeek+w*7*D,days=[];
   for(let i=0;i<7;i++){const d=t+i*D,capacity=d<start||i>=5||closed.has(d)?0:dailyBase===null?null:dailyBase+(i<extra?1:0);
    const row={date:iso(d),capacity,allocated:0,free:capacity,assignments:[]};
    if(capacity!==null){let left=capacity;for(const o of orders){if(!left)break;if(o.remaining===0)continue;const take=Math.min(left,o.remaining);o.remaining-=take;left-=take;row.allocated+=take;o.lastWorkDate=row.date;if(d>o.due)o.latePieces+=take;o.allocations.push({date:row.date,pieces:take});row.assignments.push({key:o.key,client:o.client,model:o.model,pieces:take})}row.free=left}
    daily.push(row);days.push(row);
   }
   const due=orders.filter(o=>o.due>=t&&o.due<t+7*D),receipts=orders.filter(o=>o.receiptDate&&dt(o.receiptDate)>=t&&dt(o.receiptDate)<t+7*D);
   const amount=(rows,mode)=>rows.filter(o=>o.paymentMode===mode&&o.amountCents!==null).reduce((s,o)=>s+o.amountCents,0);
   weeks.push({start:iso(t),end:iso(t+6*D),capacity:weeklyTarget===null?null:days.reduce((s,d)=>s+d.capacity,0),committed:due.reduce((s,o)=>s+o.pieces,0),allocated:days.reduce((s,d)=>s+d.allocated,0),free:weeklyTarget===null?null:days.reduce((s,d)=>s+d.free,0),due:due.map(o=>o.key),cashAtDeliveryCents:amount(receipts,'cash'),termReceiptsCents:amount(receipts,'term'),unknownPaymentPieces:due.filter(o=>o.paymentMode==='unknown'||o.amountCents===null).reduce((s,o)=>s+o.pieces,0)});
  }
  const overdue=orders.filter(o=>o.due<start).reduce((s,o)=>s+o.pieces,0),unallocated=orders.reduce((s,o)=>s+o.remaining,0);
  const late=orders.reduce((s,o)=>s+o.latePieces+(o.due<=end?o.remaining:0),0);
  const proposed=input?.newPieces??0;if(!qty(proposed))return empty('invalid-proposal');
  // Earliest hypothetical capacity after preserving the entire existing queue.
  let firstAvailable=null,needed=proposed;if(weeklyTarget!==null&&proposed>0)for(const d of daily){needed-=Math.min(needed,d.free);if(needed===0){firstAvailable=d.date;break}}
  return {...empty('local-capacity-simulation',issues),sampleCount:samples.length,average,conservative,weeklyGoal:manual,weeklyTarget,overdue,unallocated,late,orders:orders.map(({due,...o})=>o),weeks,daily,firstAvailable,newPieces:proposed,unplacedNewPieces:needed,model:'entregas-observadas-como-referencia',cashVerified:false};
 }

 // Explicit scenario inputs only: never combine unverified order values with live receivables.
 function deliveryCashScenario(plan,input,allowed){
  const empty=(state,issues=[])=>({state,issues,weeks:[],opportunities:[],canWrite:false,canPromise:false,cashVerified:false});
  if(allowed!==true)return empty('forbidden');
  const D=86400000,dt=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&Number.isFinite(Date.parse(s+'T00:00:00Z'))&&new Date(s+'T00:00:00Z').toISOString().slice(0,10)===s?Date.parse(s+'T00:00:00Z'):null,iso=n=>new Date(n).toISOString().slice(0,10);
  const money=n=>Number.isSafeInteger(n)&&Math.abs(n)<=100000000000;
  const start=dt(input?.start),opening=input?.openingCents,reserve=input?.reserveCents,delay=input?.delayDays;
  if(plan?.state!=='local-capacity-simulation'||!Array.isArray(plan.orders)||start===null||!money(opening)||!money(reserve)||reserve<0||!Number.isSafeInteger(delay)||delay<0||delay>91||
    !Array.isArray(input?.entries)||input.entries.length>5000||!Array.isArray(input?.additional)||input.additional.length>5000)return empty('invalid-input');
  const issues=[],entries=[],refs=new Set(),selected=new Set(),opportunities=[];
  if(input.coverageConfirmed!==true)issues.push('saldo-e-compromissos-nao-conferidos');
  if(plan.issues?.length)issues.push('carteira-ou-capacidade-com-lacunas');
  if(plan.weeklyTarget===null)issues.push('capacidade-desconhecida');
  for(const e of input.entries){const key=id(e?.reference),date=dt(e?.date);if(!key||refs.has(key)||date===null||date<start||!money(e.amountCents)||e.amountCents<=0||!['in','out'].includes(e.direction))return empty('invalid-commitment');refs.add(key);entries.push({date,direction:e.direction,amountCents:e.amountCents,reference:key,source:'manual'})}
  const indexed=new Map();for(const o of plan.orders){if(indexed.has(o.key))return empty('invalid-plan');indexed.set(o.key,o)}
  const candidates=[];
  for(const a of input.additional){
   const key=id(a?.key),o=indexed.get(key),ref=id(a?.reference);
   if(!o||selected.has(key)||!ref||refs.has(ref)||a.notAlreadyIncluded!==true||!money(a.amountCents)||a.amountCents<=0||!money(o.amountCents)||a.amountCents>o.amountCents)return empty('invalid-additional-receipt');
   selected.add(key);refs.add(ref);
   const done=dt(o.lastWorkDate),due=dt(o.dueDate);
   if(o.remaining!==0||done===null||due===null||!['cash','term'].includes(o.paymentMode)){issues.push('pedido-sem-conclusao-ou-condicao:'+key);continue}
   const term=o.paymentMode==='cash'?0:o.paymentDays;
   if(!Number.isSafeInteger(term)||term<0||term>365)return empty('invalid-plan');
   const normal=Math.max(start,done,due)+term*D,early=Math.max(start,done)+term*D;
   const canAdvance=a.earlyAccepted===true&&early<normal;
   candidates.push({date:normal,earlyDate:canAdvance?early:normal,direction:'in',amountCents:a.amountCents,reference:ref,source:'additional'});
   if(early<normal)opportunities.push({key,client:o.client,model:o.model,amountCents:a.amountCents,normalReceipt:iso(normal),earlyReceipt:iso(early),requiresCustomerAcceptance:!canAdvance});
  }
  function simulate(mode){
   const days=Array.from({length:91},(_,i)=>({date:iso(start+i*D),incomingCents:0,outgoingCents:0}));
   const all=mode==='baseline'?entries:[...entries,...candidates];
   let outside=0;
   for(const e of all){const date=(mode==='early'&&e.source==='additional'?e.earlyDate:e.date)+(mode==='stress'&&e.direction==='in'?delay*D:0),i=(date-start)/D;
    if(i>=91){outside++;continue}const d=days[i];d[e.direction==='in'?'incomingCents':'outgoingCents']+=e.amountCents;}
   let balance=opening,minimum=opening,firstGap=null,maximumGap=0;
   for(const d of days){d.beforeReceiptsCents=balance-d.outgoingCents;balance=d.beforeReceiptsCents+d.incomingCents;d.closingCents=balance;const low=Math.min(d.beforeReceiptsCents,balance);minimum=Math.min(minimum,low);maximumGap=Math.max(maximumGap,reserve-low);if(low<reserve&&!firstGap)firstGap=d.date}
   const weeks=Array.from({length:13},(_,i)=>{const w=days.slice(i*7,i*7+7);return {start:w[0].date,end:w[6].date,incomingCents:w.reduce((s,d)=>s+d.incomingCents,0),outgoingCents:w.reduce((s,d)=>s+d.outgoingCents,0),closingCents:w[6].closingCents,minimumCents:Math.min(...w.map(d=>Math.min(d.beforeReceiptsCents,d.closingCents)))}});
   return {mode,weeks,firstGap,maximumGapCents:maximumGap,minimumCents:minimum,outside};
  }
  return {...empty('local-cash-scenario',issues),openingCents:opening,reserveCents:reserve,baseline:simulate('baseline'),planned:simulate('planned'),early:simulate('early'),stress:simulate('stress'),opportunities,additionalCount:candidates.length,partial:issues.length>0};
 }

 // Capacity per sequential stage, with explicitly reviewed history and initial WIP.
 function productionStageGoals(input,allowed){
  const empty=(state,issues=[])=>({state,issues,stages:[],days:[],canWrite:false,canPromise:false});
  if(allowed!==true)return empty('forbidden');
  const day=86400000,dt=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&Number.isFinite(Date.parse(s+'T00:00:00Z'))&&new Date(s+'T00:00:00Z').toISOString().slice(0,10)===s?Date.parse(s+'T00:00:00Z'):null,iso=n=>new Date(n).toISOString().slice(0,10),qty=n=>Number.isSafeInteger(n)&&n>=0&&n<=10000000;
  const start=dt(input?.start),goal=input?.goal,buffer=input?.bufferPercent,stages=input?.stages;
  if(start===null||!qty(goal)||!Number.isSafeInteger(buffer)||buffer<0||buffer>90||!Array.isArray(stages)||stages.length<2||stages.length>10||!Array.isArray(input.closedDates)||input.closedDates.length>31)return empty('invalid-input');
  const closed=new Set();for(const v of input.closedDates){const n=dt(v);if(n===null)return empty('invalid-calendar');closed.add(n)}
  const keys=new Set(),issues=[],result=[];
  for(const [i,s] of stages.entries()){
   const key=id(s?.key),name=id(s?.name);
   if(!key||!name||keys.has(key)||s.manualCapacity!==null&&!qty(s.manualCapacity)||!qty(s.initialWip)||!Array.isArray(s.history)||s.history.length>12||!Array.isArray(s.teams)||s.teams.length>100)return empty('invalid-stage');
   if(i===0&&s.initialWip!==0)return empty('invalid-initial-wip');keys.add(key);
   const dates=new Set(),samples=[];
   for(const h of s.history){const t=dt(h?.week);if(t===null||new Date(t).getUTCDay()!==1||t+6*day>=start||dates.has(t)||!qty(h.pieces))return empty('invalid-history');dates.add(t);if(h.confirmed===true)samples.push(h.pieces)}
   samples.sort((a,b)=>a-b);const average=samples.length?Math.round(samples.reduce((a,b)=>a+b,0)/samples.length):null,conservative=samples.length>=4?samples[Math.floor((samples.length-1)*.25)]:null;
   const basis=s.manualCapacity===null?conservative:conservative===null?s.manualCapacity:Math.min(s.manualCapacity,conservative);
   const teamKeys=new Set(),teams=[];
   for(const t of s.teams){const k=id(t?.key),n=id(t?.name);if(!k||!n||teamKeys.has(k)||!qty(t.capacity))return empty('invalid-team');teamKeys.add(k);teams.push({key:k,name:n,capacity:t.capacity})}
   const teamTotal=teams.reduce((a,t)=>a+t.capacity,0),bounded=teams.length&&basis!==null?Math.min(basis,teamTotal):basis;
   const capacity=bounded===null?null:Math.floor(bounded*(100-buffer)/100);
   if(capacity===null)issues.push('capacidade-desconhecida:'+key);
   if(samples.length<4)issues.push('historico-insuficiente:'+key);
   if(s.initialWip>0&&s.wipConfirmed!==true)issues.push('estoque-em-processo-nao-conferido:'+key);
   result.push({key,name,average,conservative,sampleCount:samples.length,capacity,initialWip:s.wipConfirmed===true?s.initialWip:0,teams,done:0,teamAssigned:0,teamAllocations:[]});
  }
  const workDates=Array.from({length:7},(_,i)=>start+i*day).filter(n=>{const d=new Date(n).getUTCDay();return d!==0&&d!==6&&!closed.has(n)});
  const days=[],unknown=result.some(s=>s.capacity===null);
  // Same-day hand-off is not assumed: upstream work becomes available next working day.
  const wip=result.map(s=>s.initialWip),limits=result.map(s=>s.capacity===null?null:Math.floor(s.capacity*workDates.length/5));
  if(!unknown)for(const [j,date] of workDates.entries()){
   const completed=result.map((s,i)=>{const limit=Math.floor(limits[i]/workDates.length)+(j<limits[i]%workDates.length?1:0),remaining=Math.max(0,goal-s.done);
    return Math.min(limit,remaining,i===0?remaining:wip[i])});
   for(let i=0;i<result.length;i++){const s=result[i];s.done+=completed[i];if(i>0)wip[i]-=completed[i];if(i+1<result.length)wip[i+1]+=completed[i]}
   days.push({date:iso(date),stages:result.map((s,i)=>({key:s.key,pieces:completed[i],wipAfter:wip[i]}))});
  }
  // Largest-remainder proportional division, never over individual stated capacity.
  for(const [i,s] of result.entries()){
   if(unknown||!s.teams.length)continue;
   const limits=s.teams.map(t=>Math.floor(t.capacity*(100-buffer)*workDates.length/500)),sum=limits.reduce((a,b)=>a+b,0);
   const take=Math.min(s.done,sum),shares=s.teams.map((t,i)=>({key:t.key,name:t.name,capacity:limits[i],pieces:sum?Math.floor(take*limits[i]/sum):0,fraction:sum?take*limits[i]%sum:0}));
   let left=take-shares.reduce((a,t)=>a+t.pieces,0);for(const t of shares.slice().sort((a,b)=>b.fraction-a.fraction||a.key.localeCompare(b.key))){if(left&&t.pieces<t.capacity){t.pieces++;left--}}
   s.teamAllocations=shares.map(({fraction,...t})=>t);s.teamAssigned=take-left;
   if(s.teamAssigned<s.done)issues.push('divisao-equipe-incompleta:'+s.key);
  }
  const capacities=result.map((s,i)=>({key:s.key,name:s.name,capacity:limits[i]})),known=capacities.filter(s=>s.capacity!==null);
  const bottleneck=known.length?Math.min(...known.map(s=>s.capacity)):null,final=unknown?null:result.at(-1).done;
  return {...empty('local-stage-goals',issues),goal,workdays:workDates.length,stages:result.map((s,i)=>({...s,periodCapacity:limits[i],simulatedPieces:unknown?null:s.done,remainingGoal:unknown?null:Math.max(0,goal-s.done),endingWip:unknown?null:wip[i]})),days,bottlenecks:unknown?[]:known.filter(s=>s.capacity===bottleneck),simulatedDeliveries:final,goalGap:final===null?null:Math.max(0,goal-final),partial:issues.length>0||unknown};
 }

 // Observe actual events, separately for cuts, external returns and internal completions.
 // Never equate a return date with hours worked, or absence of records with zero capacity.
 function observedThroughput(db,start,allowed){
  const empty=state=>({state,rows:[],weeks:[],issues:[],canWrite:false,capacityVerified:false});
  if(allowed!==true)return empty('forbidden');
  if(!['cuts','factions','production','products','productionLocations'].every(k=>Array.isArray(db?.[k])))return empty('unavailable');
  const D=86400000,dt=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&Number.isFinite(Date.parse(s+'T00:00:00Z'))&&new Date(s+'T00:00:00Z').toISOString().slice(0,10)===s?Date.parse(s+'T00:00:00Z'):null;
  const asOf=dt(start);if(asOf===null)return empty('invalid-date');const monday=n=>n-((new Date(n).getUTCDay()+6)%7)*D,first=monday(asOf)-12*7*D,end=monday(asOf),iso=n=>new Date(n).toISOString().slice(0,10);
  const index=rows=>{const m=new Map();for(const r of rows.filter(live)){const k=id(r.id);if(k)m.set(k,m.has(k)?null:r)}return m};
  const products=index(db.products),locations=index(db.productionLocations),cuts=index(db.cuts),factions=index(db.factions),production=index(db.production),events=[],issues=[];
  const validQty=n=>Number.isSafeInteger(n)&&n>0&&n<=10000000;
  const issue=(source,recordId,reason)=>issues.push({source,recordId,reason});
  function add(source,recordId,productId,teamId,date,pieces){
   const t=dt(date);if(t===null||!products.get(productId)||!validQty(pieces)){issue(source,recordId,'invalid-event');return}
   if(t<first||t>=end)return;
   events.push({source,productId,productName:id(products.get(productId).name)||productId,teamId,teamName:teamId?id(locations.get(teamId)?.name)||teamId:'Sem equipe identificada',week:iso(monday(t)),pieces});
  }
  for(const c of db.cuts.filter(live)){
   if(c.modelSplitParentV1||c.hiddenByModelSplitV1||!['finalizado','cortado','concluido'].includes(norm(c.status)))continue;
   const k=id(c.id),grade=c.actualCutGrade,models=new Map(),cells=new Set();let total=0,valid=!!k&&cuts.get(k)===c&&Array.isArray(grade)&&grade.length>0;
   if(valid)for(const g of grade){const pid=id(g?.productId||g?.product_id||c.productId),color=id(g?.color),size=id(g?.size),q=g?.qty,cell=JSON.stringify([pid,id(g?.orderId||c.orderId),color,size]);
    if(!products.get(pid)||!color||!size||cells.has(cell)||!Number.isSafeInteger(q)||q<0){valid=false;break}cells.add(cell);total+=q;if(q)models.set(pid,(models.get(pid)||0)+q)}
   if(!valid||!validQty(total)||total!==c.pieces){issue('cut',k,'grade-or-identity');continue}
   for(const [pid,q] of models)add('cut',k,pid,'',c.finishedAt,q);
  }
  // All linked external production rows are excluded from the internal series, including transfers.
  const externalProduction=new Set(db.factions.filter(live).map(f=>id(f.productionId)).filter(Boolean));
  const eventCounts=new Map();for(const f of db.factions.filter(live))for(const h of Array.isArray(f.deliveryHistory)?f.deliveryHistory:[]){const k=id(h?.id);if(k)eventCounts.set(k,(eventCounts.get(k)||0)+1)}
  for(const f of db.factions.filter(live)){
   const k=id(f.id),pid=id(f.productId),team=id(f.productionLocationId||f.factionId),history=f.deliveryHistory;
   if(!Array.isArray(history)||!history.length){if(Number(f.returned)>0)issue('external',k,'return-history-missing');continue}
   if(!k||factions.get(k)!==f||!products.get(pid)||!team||!locations.get(team)||f.transferHistory?.length||!Number.isSafeInteger(f.returned)||!Number.isSafeInteger(f.sent)){issue('external',k,'identity-or-transfer-review');continue}
   const total=history.reduce((n,h)=>n+(validQty(h?.qty)?h.qty:NaN),0);
   if(!Number.isSafeInteger(total)||total!==f.returned||total>f.sent||history.some(h=>!id(h.id)||eventCounts.get(id(h.id))!==1||dt(h.date)===null)){issue('external',k,'return-history-conflict');continue}
   for(const h of history)add('external',k,pid,team,h.date,h.qty);
  }
  for(const p of db.production.filter(live)){
   if(!['finalizado','pronto'].includes(norm(p.stage))||id(p.factionId)||externalProduction.has(id(p.id))||p.sentToFactionAt||p.transferHistory?.length)continue;
   const k=id(p.id),team=id(p.productionLocationId),pid=id(p.productId);
   if(!k||production.get(k)!==p||!team||!locations.get(team)||!validQty(p.done)||!validQty(p.planned)||p.done>p.planned){issue('internal',k,'identity-or-quantity');continue}
   add('internal',k,pid,team,p.finishedAt,p.done);
  }
  const weeks=new Map(),groups=new Map();
  for(const e of events){
   const wk=JSON.stringify([e.source,e.week]),w=weeks.get(wk)||{source:e.source,week:e.week,pieces:0,confirmed:false};w.pieces+=e.pieces;weeks.set(wk,w);
   const k=JSON.stringify([e.source,e.productId,e.teamId]),g=groups.get(k)||{source:e.source,productId:e.productId,productName:e.productName,teamId:e.teamId,teamName:e.teamName,byWeek:new Map()};
   g.byWeek.set(e.week,(g.byWeek.get(e.week)||0)+e.pieces);groups.set(k,g);
  }
  const rows=[...groups.values()].map(({byWeek,...g})=>{const samples=[...byWeek].sort((a,b)=>a[0].localeCompare(b[0])).map(([week,pieces])=>({week,pieces})),total=samples.reduce((n,s)=>n+s.pieces,0);return {...g,samples,total,observedWeeks:samples.length,averageActiveWeek:Math.round(total/samples.length),capacityVerified:false}});
  return {...empty('local-observation'),rows:rows.sort((a,b)=>a.source.localeCompare(b.source)||b.total-a.total),weeks:[...weeks.values()].sort((a,b)=>a.week.localeCompare(b.week)||a.source.localeCompare(b.source)),issues,eventCount:events.length};
 }

 // Lead time is elapsed calendar time for completed, reconciled lots, not labour time.
 function factionLeadTimes(db,asOf,allowed){
  const empty=state=>({state,rows:[],open:[],issues:[],canWrite:false,canPromise:false});
  if(allowed!==true)return empty('forbidden');
  if(!['factions','products','productionLocations'].every(k=>Array.isArray(db?.[k])))return empty('unavailable');
  const D=86400000,dt=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&Number.isFinite(Date.parse(s+'T00:00:00Z'))&&new Date(s+'T00:00:00Z').toISOString().slice(0,10)===s?Date.parse(s+'T00:00:00Z'):null,iso=n=>new Date(n).toISOString().slice(0,10);
  const end=dt(asOf);if(end===null)return empty('invalid-date');
  const index=rows=>{const m=new Map();for(const r of rows.filter(live)){const k=id(r.id);if(k)m.set(k,m.has(k)?null:r)}return m};
  const factions=index(db.factions),products=index(db.products),locations=index(db.productionLocations),events=new Map(),groups=new Map(),open=[],issues=[];
  const good=n=>Number.isSafeInteger(n)&&n>=0&&n<=10000000,band=n=>n<=100?'1–100':n<=300?'101–300':n<=600?'301–600':n<=1000?'601–1.000':'Mais de 1.000';
  const report=(key,reason)=>issues.push({recordId:key,reason});
  for(const f of db.factions.filter(live))for(const h of Array.isArray(f.deliveryHistory)?f.deliveryHistory:[]){const k=id(h?.id);if(k)events.set(k,(events.get(k)||0)+1)}
  for(const f of db.factions.filter(live)){
   const key=id(f.id),pid=id(f.productId),team=id(f.productionLocationId||f.factionId),sent=dt(f.sentAt),status=norm(f.status),history=f.deliveryHistory??[];
   if(!['finalizado','em producao'].includes(status))continue;
   if(!key||factions.get(key)!==f||!products.get(pid)||!locations.get(team)||sent===null||sent>end||!good(f.sent)||!f.sent||!good(f.returned)||f.returned>f.sent||f.transferHistory?.length||!Array.isArray(history)){report(key,'identity-date-or-transfer');continue}
   const valid=history.every(h=>id(h?.id)&&events.get(id(h.id))===1&&dt(h.date)!==null&&dt(h.date)>=sent&&dt(h.date)<=end&&good(h.qty)&&h.qty>0);
   const total=history.reduce((n,h)=>n+(good(h?.qty)?h.qty:NaN),0);
   if(!valid||total!==f.returned){report(key,'return-history-conflict');continue}
   const common={productId:pid,productName:id(products.get(pid).name)||pid,teamId:team,teamName:id(locations.get(team).name)||team,band:band(f.sent)},gkey=JSON.stringify([pid,team,common.band]);
   if(status==='finalizado'){
    const finished=dt(f.finishedAt);
    if(!history.length||total!==f.sent||finished===null||finished<sent||finished>end||Math.max(...history.map(h=>dt(h.date)))!==finished){report(key,'completion-not-reconciled');continue}
    if(finished<end-84*D)continue;
    const first=Math.min(...history.map(h=>dt(h.date))),g=groups.get(gkey)||{...common,samples:[]};g.samples.push({recordId:key,pieces:f.sent,sentAt:iso(sent),finishedAt:iso(finished),firstReturnDays:(first-sent)/D,elapsedDays:(finished-sent)/D});groups.set(gkey,g);
   }else if(total<f.sent){open.push({...common,recordId:key,sentAt:iso(sent),sentPieces:f.sent,returnedPieces:total,remaining:f.sent-total,elapsedDays:(end-sent)/D,dueDate:dt(f.dueDate)!==null?f.dueDate:null,groupKey:gkey})}
  }
  const rows=[...groups].map(([key,g])=>{const days=g.samples.map(s=>s.elapsedDays).sort((a,b)=>a-b),count=days.length,median=count%2?days[(count-1)/2]:(days[count/2-1]+days[count/2])/2;
   return {key,...g,count,averageDays:Math.round(days.reduce((a,b)=>a+b,0)/count*10)/10,medianDays:median,conservativeDays:count>=4?days[Math.ceil(count*.75)-1]:null,maxDays:days.at(-1),confidence:count>=8?'more-observations':count>=4?'limited':'insufficient'};
  }).sort((a,b)=>b.count-a.count||a.productName.localeCompare(b.productName,'pt-BR'));
  const byKey=new Map(rows.map(r=>[r.key,r]));
  return {...empty('local-leadtime-observation'),rows,issues,open:open.map(({groupKey,...o})=>{const h=byKey.get(groupKey),days=h?.conservativeDays??null,reference=days===null?null:dt(o.sentAt)+days*D;return {...o,sampleCount:h?.count??0,referenceDays:days,referenceDate:reference===null?null:iso(reference),pastReference:reference===null?null:reference<end,lateAgainstDue:o.dueDate===null?null:dt(o.dueDate)<end,remainingForecast:null}}).sort((a,b)=>b.elapsedDays-a.elapsedDays)};
 }
 function factionLeadTimePreview(history,input,allowed){
  const empty=state=>({state,referenceDays:null,referenceDate:null,canWrite:false,canPromise:false});
  if(allowed!==true)return empty('forbidden');
  const q=input?.pieces,day=input?.sentAt;
  if(history?.state!=='local-leadtime-observation'||!Number.isSafeInteger(q)||q<1||q>10000000||typeof day!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(day)||!Number.isFinite(Date.parse(day+'T00:00:00Z'))||new Date(day+'T00:00:00Z').toISOString().slice(0,10)!==day)return empty('invalid-input');
  const band=q<=100?'1–100':q<=300?'101–300':q<=600?'301–600':q<=1000?'601–1.000':'Mais de 1.000';
  const h=history.rows.find(r=>r.productId===id(input.productId)&&r.teamId===id(input.teamId)&&r.band===band);
  if(!h||h.conservativeDays===null)return {...empty('insufficient-history'),band,sampleCount:h?.count??0};
  const t=Date.parse(day+'T00:00:00Z')+h.conservativeDays*86400000;
  return {...empty('historical-reference'),band,sampleCount:h.count,referenceDays:h.conservativeDays,referenceDate:new Date(t).toISOString().slice(0,10),confidence:h.confidence,queueVerified:false};
 }

 // Current workload and hypothetical free capacity; no reassignment or delivery promise.
 function factionQueueScenario(db,input,allowed){
  const empty=(state,issues=[])=>({state,issues,lots:[],weeks:[],canWrite:false,canPromise:false,capacityVerified:false});
  if(allowed!==true)return empty('forbidden');
  if(!['factions','production','productionLocations','products'].every(k=>Array.isArray(db?.[k])))return empty('unavailable');
  const D=86400000,dt=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&Number.isFinite(Date.parse(s+'T00:00:00Z'))&&new Date(s+'T00:00:00Z').toISOString().slice(0,10)===s?Date.parse(s+'T00:00:00Z'):null,iso=n=>new Date(n).toISOString().slice(0,10);
  const start=dt(input?.start),team=id(input?.teamId),goal=input?.weeklyCapacity,buffer=input?.bufferPercent,horizon=input?.weeks,newPieces=input?.newPieces,extra=input?.additionalCommitted;
  const qty=n=>Number.isSafeInteger(n)&&n>=0&&n<=10000000;
  if(start===null||!team||!qty(goal)||!qty(extra)||!qty(newPieces)||!Number.isSafeInteger(buffer)||buffer<0||buffer>90||!Number.isSafeInteger(horizon)||horizon<1||horizon>13||!Array.isArray(input.closedDates)||input.closedDates.length>366)return empty('invalid-input');
  const index=rows=>{const m=new Map();for(const r of rows.filter(live)){const k=id(r.id);if(k)m.set(k,m.has(k)?null:r)}return m};
  const loc=index(db.productionLocations),products=index(db.products),factions=index(db.factions),production=index(db.production);
  if(!loc.get(team))return empty('invalid-location');
  const matches=r=>[id(r.productionLocationId),id(r.factionId)].includes(team),issues=[],lots=[],linked=new Map(),eventCounts=new Map(),closed=new Set();
  for(const d of input.closedDates){const t=dt(d);if(t===null)return empty('invalid-calendar');closed.add(t)}
  const warn=(key,reason)=>issues.push({recordId:key,reason});
  for(const f of db.factions.filter(live)){
   const pid=id(f.productionId);if(pid){const list=linked.get(pid)||[];list.push(f);linked.set(pid,list)}
   for(const h of Array.isArray(f.deliveryHistory)?f.deliveryHistory:[]){const k=id(h?.id);if(k)eventCounts.set(k,(eventCounts.get(k)||0)+1)}
  }
  function add(source,key,pid,remaining,dueDate){
   if(!remaining)return;
   const date=dt(dueDate);
   if(date===null)warn(key,'prazo-nao-confirmado');
   lots.push({source,key,productId:pid,productName:id(products.get(pid)?.name)||pid||'Não identificado',remaining,dueDate:date===null?null:iso(date),due:date,unallocated:remaining,latePieces:0,lastWorkDate:null});
  }
  for(const f of db.factions.filter(live)){
   if(!matches(f))continue;const key=id(f.id),status=norm(f.status),pid=id(f.productId);
   if(status==='finalizado')continue;
   if(status!=='em producao'||f.transferHistory?.length||!key||factions.get(key)!==f||!products.get(pid)||!qty(f.sent)||!qty(f.returned)||f.returned>f.sent){warn(key,'lote-externo-a-conferir');continue}
   const hist=f.deliveryHistory??[],sent=dt(f.sentAt);
   if(sent===null||sent>start||!Array.isArray(hist)||hist.some(h=>!id(h?.id)||eventCounts.get(id(h.id))!==1||!qty(h.qty)||!h.qty||dt(h.date)===null||dt(h.date)<sent||dt(h.date)>start)||hist.reduce((s,h)=>s+h.qty,0)!==f.returned){warn(key,'retorno-nao-conciliado');continue}
   add('external',key,pid,f.sent-f.returned,f.dueDate);
  }
  const pendingCandidates=[];
  for(const p of db.production.filter(live)){
   if(!matches(p))continue;const key=id(p.id),pid=id(p.productId),stage=norm(p.stage),links=linked.get(key)||[];
   if(['finalizado','pronto'].includes(stage))continue;
   if(!key||production.get(key)!==p||!products.get(pid)||!qty(p.planned)||!qty(p.done)||p.done>p.planned||p.transferHistory?.length||!['em producao','aguardando atribuicao'].includes(stage)){warn(key,'atribuicao-a-conferir');continue}
   if(links.length){
    const f=links.length===1?links[0]:null;
    if(!f||!matches(f)||norm(f.status)!=='em producao'||!qty(f.sent)||!qty(f.returned)||f.sent-f.returned!==p.planned-p.done)warn(key,'vinculo-externo-divergente');
    continue; // never add a production shadow of an external lot
   }
   if(p.sentToFactionAt){warn(key,'envio-sem-lote-vinculado');continue}
   pendingCandidates.push({key,pid,remaining:p.planned-p.done,dueDate:p.factionDueDate||null});
  }
  // Multiple unmatched assignments may represent the same future workload; user reviews separately.
  const pendingPieces=pendingCandidates.reduce((s,p)=>s+p.remaining,0);
  if(pendingPieces>0)warn(team,'atribuicoes-sem-lote-exigem-conciliacao');
  if(input.coverageConfirmed!==true)warn(team,'carteira-nao-conferida');
  if(input.capacityConfirmed!==true)warn(team,'capacidade-nao-conferida');
  const observedPieces=lots.reduce((s,l)=>s+l.remaining,0);
  if(extra)lots.push({source:'manual',key:'additional-reviewed',productId:'',productName:'Outros compromissos informados',remaining:extra,dueDate:null,due:null,unallocated:extra,latePieces:0,lastWorkDate:null});
  // Due-date order; undated commitments still precede the hypothetical new lot.
  lots.sort((a,b)=>(a.due??Infinity)-(b.due??Infinity)||a.key.localeCompare(b.key));
  const weeklyTarget=Math.floor(goal*(100-buffer)/100),dailyBase=Math.floor(weeklyTarget/5),rem=weeklyTarget%5,weeks=[];
  let needed=newPieces,firstFree=null,newCompletion=null;
  for(let w=0;w<horizon;w++){
   const from=start+w*7*D,row={start:iso(from),end:iso(from+6*D),capacity:0,existing:0,newPieces:0,free:0};
   for(let i=0;i<7;i++){const t=from+i*D,weekday=new Date(t).getUTCDay();if(weekday===0||weekday===6||closed.has(t))continue;
    let left=dailyBase+(weekday<=rem?1:0);row.capacity+=left;
    for(const l of lots){if(!left)break;const take=Math.min(left,l.unallocated);if(!take)continue;l.unallocated-=take;left-=take;row.existing+=take;l.lastWorkDate=iso(t);if(l.due!==null&&t>l.due)l.latePieces+=take}
    if(left&&firstFree===null)firstFree=iso(t);
    const take=Math.min(left,needed);if(take){needed-=take;left-=take;row.newPieces+=take;if(!needed)newCompletion=iso(t)}
    row.free+=left;
   }
   weeks.push(row);
  }
  const existingRemaining=lots.reduce((s,l)=>s+l.unallocated,0),latePieces=lots.reduce((s,l)=>s+l.latePieces+(l.due!==null&&l.due<start+horizon*7*D?l.unallocated:0),0);
  return {...empty('local-queue-scenario',issues),teamId:team,teamName:id(loc.get(team).name)||team,observedPieces,pendingPieces,pendingCandidates,additionalCommitted:extra,weeklyTarget,existingRemaining,latePieces,firstFree,newCompletion,newPieces,newUnallocated:needed,weeks,lots:lots.map(({due,...l})=>l),partial:issues.length>0};
 }
 return {factionQueueScenario,factionLeadTimes,factionLeadTimePreview,observedThroughput,productionStageGoals,deliveryCashScenario,deliveryCapacityPlan,gradeAdjustmentPreview,orderMaterialCompatibility,jointHistory9757,selectedGradePlan,scenarioSummary,unpairedModels,compareGradeOptions,jointPrintDraft,discover,combine,workspaceOverview9714,gradeSuggestions,gradeMatches9726,catalogGroups,candidates,weights,cutEvidence,groupEvidence,remnantCoverage9727,materialHistory,materialEstimate,forecastDraft,materialBacktest,materialCostEstimate,prepareRemnantChange,modelSignature,planSelection,materialDemand,preview:(source,input,products,catalog)=>{const valid=fabrics(catalog);if(input?.eligible?.some(x=>!valid.has(id(x.materialId))))throw Error('fabric-not-confirmed');return remnant.preview(source,input,products)}};
});
