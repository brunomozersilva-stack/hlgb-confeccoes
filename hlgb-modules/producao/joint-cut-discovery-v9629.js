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
  const activity=new Set();let uncertain=false;
  for(const x of [...db.cuts,...db.production]){if(!x||deleted(x))continue;if(!id(x.orderId)){uncertain=true;continue}activity.add(JSON.stringify([id(x.orderId),id(x.productId)||'*']));}
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
  return {state:'discovery-only',groups,excludedCount:plan.excluded.length,unlinkedActivity:uncertain,verifiedAvailable:null,reason:'Quantidades pedidas, não saldo disponível. Conferir nuvem, WAL, lotes e grade antes de cortar.'};
 }
 return {discover};
});
