'use strict';
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory(require('./joint-cut-discovery-v9629.js'),require('./fabric-remnant-policy-v9630.js'));else root.HLGBProductionPlanning9661=factory(root.HLGBJointCutDiscovery9629,root.HLGBFabricRemnant9630)})(typeof globalThis==='object'?globalThis:this,function planningFactory(joint,remnant){
 const id=x=>typeof x==='string'||Number.isSafeInteger(x)?String(x).trim():'',live=x=>x&&!x.deletedAt&&!x.deleted_at&&x.deleted!==true&&!x._deleted;
 const norm=x=>id(x).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
 const pair=(o,p)=>JSON.stringify([id(o),id(p)]);
 const eligibleStatus=o=>/separacao|aguardando material|aguardando corte|pedido criado|pedido para corte|^corte$|^planejado$|^aberto$/.test(norm(o.status))&&!/finalizad|cancelad|entregue|mercadoria pronta|nota emitida|em producao/.test(norm(o.status))&&!o.invoiceReady&&!o.noteReady&&!o.workflowSourceOrderId&&!norm(o.cutStatus).includes('finalizado');
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
  const rows=cuts.filter(x=>live(x)&&id(x.productId)===id(productId)&&!x.hiddenByModelSplitV1&&x.cutWeightV9579),counts=new Map();for(const x of rows)counts.set(id(x.id),(counts.get(id(x.id))||0)+1);
  return rows.filter(x=>id(x.id)&&counts.get(id(x.id))===1).map(x=>({cutId:id(x.id),orderId:id(x.orderId),...remnant.inspectWeight(x.cutWeightV9579)}));
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
   const pid=id(c.productId),p=products.get(pid);if(!p||p.active===false||c.hiddenByModelSplitV1||c.modelSplitParentV1||!c.cutWeightV9579)continue;
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
   const pid=id(c.productId),p=products.get(pid);if(!p||p.active===false||c.hiddenByModelSplitV1||c.modelSplitParentV1||!Array.isArray(c.materialUsage))continue;
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
  const rowsFor=m=>plans.flatMap(p=>[...p.spreads.flatMap((s,i)=>s.rows.filter(r=>!m||r.key===m.key).map(r=>[r.orderNumber,r.productName,p.color,r.size,i+1,s.layers,r.perLayer,r.planned,''])),...p.remaining.filter(r=>!m||r.key===m.key).map(r=>[r.orderNumber,r.productName,p.color,r.size,'Complementar','—','—',r.remainder,''])]);
  const columns=['Pedido','Modelo','Cor','Tam.','Enfesto','Folhas','Pç/folha','Previsto','Realizado'];
  const combined='<section class="sheet" data-joint-sheet="combined">'+head('FOLHA CONJUNTA DE CORTE')+'<p>Matéria-prima candidata: <b>'+material+'</b> · '+group.models.length+' pedido(s)/modelo(s) · '+plans.reduce((n,p)=>n+p.total,0)+' peças previstas · opções: '+esc(plans.map(p=>p.color+' — '+p.name).join('; '))+'</p><p>☐ Interno &nbsp; ☐ Externo &nbsp; Lote: __________ Largura útil: ________</p><h2>Grade por modelo e enfesto</h2>'+table(columns,rowsFor(null))+'<h2>Conferência e pesagem coletiva</h2>'+table(['Material','Cor / lote','Total kg','Usado kg','Refugo kg','Sobra kg','Aprov. %'],[[group.materialName||group.materialId,'','','','','',''],['Outro:','','','','','','']])+'<p>☐ Material conferido &nbsp; ☐ Grade conferida &nbsp; ☐ Encaixe físico conferido &nbsp; ☐ Separação conferida</p><p>Peças extras / aproveitamento de sobras: ____________________________</p><p>Observações / divergências: _________________________________________</p>'+signatures+'</section>';
  const individuals=group.models.map(m=>'<section class="sheet" data-joint-sheet="individual">'+head('FICHA INDIVIDUAL — APÓS SEPARAÇÃO (RAScunho)'.toUpperCase())+'<p>Pedido #'+esc(m.orderNumber)+' · <b>'+esc(m.productName)+'</b> · '+esc(m.pieces)+' peças previstas</p><p>Material candidato: '+material+' · Destino / facção: ________________________</p>'+table(columns,rowsFor(m))+'<p>Conferência da quantidade realmente separada: _________ pç</p><p>☐ Grade conferida &nbsp; ☐ Materiais conferidos &nbsp; ☐ Destino conferido</p><p>Observações / divergências: _________________________________________</p><p>Pesagem coletiva consta na ficha conjunta; não repetir como consumo individual.</p>'+signatures+'</section>').join('');
  const pages=mode==='combined'?combined:mode==='individual'?individuals:combined+individuals;
  return '<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>HLGB — rascunho de corte conjunto</title><style>@page{size:A4 portrait;margin:9mm}*{box-sizing:border-box}body{font:11px/1.3 Arial,sans-serif;color:#111;margin:0}h1{font-size:17px;margin:0 0 8px}h2{font-size:13px;margin:10px 0 4px}p{margin:5px 0}.warning{font-weight:bold;border:1px solid #555;padding:5px}table{width:100%;border-collapse:collapse;table-layout:auto}th,td{border:1px solid #777;padding:4px;overflow-wrap:anywhere}th{background:#eee}thead{display:table-header-group}tr{break-inside:avoid;page-break-inside:avoid}.sign{margin-top:20px;break-inside:avoid}.sheet+.sheet{break-before:page;page-break-before:always}@media screen{body{max-width:190mm;margin:12px auto}.sheet+.sheet{border-top:2px dashed #888;margin-top:20px;padding-top:15px}}</style></head><body>'+pages+'</body></html>';
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
 return {selectedGradePlan,scenarioSummary,unpairedModels,compareGradeOptions,jointPrintDraft,discover,combine,workspaceOverview9714,gradeSuggestions,gradeMatches9726,catalogGroups,candidates,weights,cutEvidence,groupEvidence,remnantCoverage9727,materialHistory,materialEstimate,forecastDraft,materialBacktest,materialCostEstimate,prepareRemnantChange,modelSignature,planSelection,materialDemand,preview:(source,input,products,catalog)=>{const valid=fabrics(catalog);if(input?.eligible?.some(x=>!valid.has(id(x.materialId))))throw Error('fabric-not-confirmed');return remnant.preview(source,input,products)}};
});
