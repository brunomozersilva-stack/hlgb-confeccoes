(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory(require('./joint-cut-core-v9628.js'));else root.HLGBJointCutDiscovery9629=factory(root.HLGBJointCutCore9628);})(typeof globalThis==='object'?globalThis:this,function adapterFactory(core){
 const id=v=>String(v??'').trim();
 const deleted=x=>!!(x?.deleted===true||x?.deletedAt||x?.deleted_at||x?._deleted===true);
 function discover(db,authority){
  if(!db||!['orders','products','materials','cuts','production','operationalWriteoffs'].every(k=>Array.isArray(db[k])))return {state:'unavailable',groups:[],reason:'Cadastro operacional incompleto.'};
  if(!authority||typeof authority.pairIndex!=='function')return {state:'unavailable',groups:[],reason:'Consulta de baixas indisponível.'};
  let pairs;try{pairs=authority.pairIndex();if(!(pairs instanceof Set)||[...pairs].some(p=>typeof p!=='string'||p.split('|').length!==2||p.split('|').some(x=>!x)))throw Error('bad-index')}catch(_){return {state:'unavailable',groups:[],reason:'Não foi possível conferir as baixas.'}}
  const blockedPairs=[...pairs].map(p=>{const [orderId,productId]=p.split('|');return {orderId,productId}});
  // Never infer cloud/WAL verification from a local copy. This adapter cannot emit approved suggestions.
  const plan=core.plan(db,{lines:[],blockedPairs,snapshotVerified:false,writeoffsVerified:false});
  const activity=new Set();let uncertain=false,plannedRows=0;
  const cuts=db.cuts.filter(x=>x&&!deleted(x)),orders=new Map();
  for(const o of db.orders.filter(x=>x&&!deleted(x))){const k=id(o.id);orders.set(k,orders.has(k)?null:o)}
  const norm=x=>id(x).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  const signature=rows=>Array.isArray(rows)&&rows.length&&rows.every(x=>id(x?.productId)&&id(x?.color)&&id(x?.size)&&Number.isSafeInteger(Number(x?.qty))&&Number(x.qty)>0)?JSON.stringify(rows.map(x=>[id(x.productId),id(x.color),id(x.size),Number(x.qty)]).sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b)))):null;
  // The commercial app automatically creates Planejado placeholders. A split child
  // also initializes actualCutGrade with the original grade, before any cut exists.
  // Only recognize the documented planned shapes; unknown or physical evidence blocks.
  const physical=x=>!!(x.finishedAt||x.finishedAtTime||x.finalizedAt||x.completedAt||x.cutFinishedAt||x.cutWeightV9579||x.cutAdjustmentNote||x.workflowSourceOrderId||x.productionLocationId||x.factionId||x.actualCutPieces||x.cutConfirmed===true||x.completed===true||x.finalized===true||x.cutFinalized===true||x.actualCutAt||x.actualCutDate||x.cutDateActual||x.startedAt||x.cutStartedAt);
  function planned(x){
   const o=orders.get(id(x.orderId));if(!o||norm(x.status)!=='planejado'||physical(x)||x.hiddenByModelSplitV1||x.modelSplitParentV1)return false;
   const pid=id(x.productId),grade=Array.isArray(o.grade)?o.grade:[],wanted=grade.filter(g=>!pid||id(g.productId)===pid);
   const expected=signature(wanted);if(!expected)return false;
   if(x.modelSplitChildV1===true){return !!id(x.modelSplitFromParentCutId)&&id(x.modelSplitFromOrderId)===id(o.id)&&!!pid&&signature(x.originalGrade)===expected&&signature(x.actualCutGrade)===expected&&Number(x.pieces)===wanted.reduce((n,g)=>n+Number(g.qty),0)}
   if(x.actualCutGrade?.length||x.originalGrade?.length||Number(x.layers||0)!==0||Number(x.meters||0)!==0)return false;
   return id(x.op)==='PED-'+id(o.id)&&Number(x.pieces)===grade.reduce((n,g)=>n+Number(g.qty),0);
  }
  function splitParent(x){
   if(x.modelSplitParentV1!==true||x.hiddenByModelSplitV1!==true||norm(x.status)!=='desmembrado por modelo'||physical(x))return false;
   const o=orders.get(id(x.orderId)),ids=[...new Set((Array.isArray(o?.grade)?o.grade:[]).map(g=>id(g.productId)).filter(Boolean))];
   return ids.length>=2&&ids.every(pid=>cuts.filter(c=>c.modelSplitChildV1===true&&id(c.orderId)===id(x.orderId)&&id(c.modelSplitFromParentCutId)===id(x.id)&&id(c.productId)===pid).length===1);
  }
  for(const x of cuts){if(!id(x.orderId)){uncertain=true;continue}if(planned(x)||splitParent(x)){plannedRows++;continue}activity.add(JSON.stringify([id(x.orderId),id(x.productId)||'*']));}
  for(const x of db.production){if(!x||deleted(x))continue;if(!id(x.orderId)){uncertain=true;continue}activity.add(JSON.stringify([id(x.orderId),id(x.productId)||'*']));}
  const groups=[];
  for(const g of plan.discovery){
   const seen=new Set(),lines=[];
   for(const x of g.lines){const k=JSON.stringify([x.orderId,x.productId,x.color,x.size]);if(seen.has(k))continue;seen.add(k);
    if(activity.has(JSON.stringify([x.orderId,x.productId]))||activity.has(JSON.stringify([x.orderId,'*'])))continue;
    lines.push({orderId:x.orderId,productId:x.productId,productName:x.productName,color:x.color,size:x.size,ordered:x.ordered});
   }
   if(new Set(lines.map(x=>x.productId)).size<2&&new Set(lines.map(x=>x.orderId)).size<2)continue;
   groups.push({materialId:g.materialId,materialName:g.materialName,lines,orderedPieces:lines.reduce((a,x)=>a+x.ordered,0)});
  }
  return {state:'discovery-only',groups,excludedCount:plan.excluded.length,plannedRows,blockedActivityPairs:activity.size,unlinkedActivity:uncertain,verifiedAvailable:null,reason:'Quantidades pedidas, não saldo disponível. Conferir nuvem, WAL, lotes e grade antes de cortar.'};
 }
 return {discover};
});
