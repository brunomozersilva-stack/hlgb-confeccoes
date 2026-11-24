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
 return {discover,combine,candidates,weights,preview:(source,input,products,catalog)=>{const valid=fabrics(catalog);if(input?.eligible?.some(x=>!valid.has(id(x.materialId))))throw Error('fabric-not-confirmed');return remnant.preview(source,input,products)}};
});
