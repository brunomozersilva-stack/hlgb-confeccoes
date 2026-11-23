'use strict';
module.exports=(function core(){
 const id=x=>typeof x==='string'||(typeof x==='number'&&Number.isSafeInteger(x))?String(x).trim():'';
 const deleted=x=>!!(x?.deleted===true||x?.deletedAt||x?.deleted_at||x?._deleted===true);
 const txt=(v,max)=>{if(v==null)return '';if(typeof v!=='string'||v.length>max)throw Error('invalid-text');return v.trim()};
 const mm=v=>{if(v==null||v==='')return null;if(typeof v!=='number'||!Number.isFinite(v)||v<=0||v>100000)throw Error('invalid-dimension');return v};
 function state(p){const v=p?.fabricRemnantPolicyV9630;return !v?'unknown':v.state==='yes'?'yes':v.state==='no'?'no':v.state==='unknown'?'unknown':'invalid'}
 function validate(productId,input,products){
  if(!Array.isArray(products)||!input||!['yes','no','unknown'].includes(input.state)||!Array.isArray(input.eligible))throw Error('invalid-policy');
  const index=new Map();for(const p of products){const k=id(p?.id);if(k&&!deleted(p))index.set(k,index.has(k)?null:p)}
  const source=id(productId);if(!index.get(source))throw Error('source-not-unique');
  if(input.state!=='yes'&&input.eligible.length)throw Error('inconsistent-state');
  const seen=new Set(),eligible=[];
  for(const x of input.eligible){
   const pid=id(x?.productId);if(!pid||!index.get(pid)||pid===source||seen.has(pid))throw Error('invalid-target');
   seen.add(pid);
   const materialId=id(x.materialId);if(!materialId)throw Error('missing-material');
   const a=index.get(source),b=index.get(pid),count=p=>(Array.isArray(p.materials)?p.materials:[]).filter(y=>id(y?.materialId)===materialId).length;
   if(count(a)!==1||count(b)!==1)throw Error('material-not-shared');
   eligible.push({productId:pid,materialId,minWidthMm:mm(x.minWidthMm),minLengthMm:mm(x.minLengthMm),size:txt(x.size,60),color:txt(x.color,60),notes:txt(x.notes,500)});
  }
  // A policy is a directed hint. Reject a cycle, including an existing path back to source.
  for(const x of eligible){
   const todo=[x.productId],visited=new Set();
   while(todo.length){
    const k=todo.pop();if(k===source)throw Error('cycle');if(visited.has(k))continue;visited.add(k);
    const p=index.get(k);if(state(p)!=='yes')continue;
    for(const next of Array.isArray(p.fabricRemnantPolicyV9630.eligible)?p.fabricRemnantPolicyV9630.eligible:[]){const target=id(next?.productId);if(target)todo.push(target)}
   }
  }
  return {state:input.state,notes:txt(input.notes,500),eligible,mode:'draft-only'};
 }
 function preview(productId,input,products){
  const policy=validate(productId,input,products);
  return {productId:id(productId),policy,physicalFit:null,availableRemnant:null,inventoryChange:false};
 }
 // Existing weighing measures scrap/refuse. The residual is NOT proven reusable.
 function inspectWeight(weight){
  const vals=['totalKg','usedKg','wasteKg'].map(k=>weight?.[k]);
  if(vals.some(v=>typeof v!=='number'||!Number.isFinite(v)||v<0||v>20000))return {state:'incomplete',unclassifiedKg:null,reusableKg:null};
  const g=vals.map(v=>Math.round(v*1000)),rest=g[0]-g[1]-g[2];
  if(rest<0)return {state:'inconsistent',unclassifiedKg:null,reusableKg:null};
  return {state:'arithmetic-only',unclassifiedKg:rest/1000,reusableKg:null};
 }
 return {state,preview,inspectWeight};
})();
