/* HLGB Comercial: pure separation observation and checklist validation, v96.47. */
(function(root){'use strict';
const cutSeparationWorkspace9643=(function core(){
 const id=v=>(typeof v==='number'&&Number.isSafeInteger(v)&&v>0||typeof v==='string'&&v.trim()&&v.length<=120)?String(v).trim():'';
 const norm=v=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase();
 const int=v=>typeof v==='number'&&Number.isSafeInteger(v)&&v>=0?v:typeof v==='string'&&/^\d+$/.test(v)&&Number.isSafeInteger(Number(v))?Number(v):null;
 const live=x=>x&&!x.deletedAt&&!x.deleted_at&&x.deleted!==true&&x._deleted!==true;
 function inspect(db,allowed,canonicalPairs){
  if(allowed!==true)return {state:'forbidden',rows:[],issues:[]};
  if(!db||!['orders','products','separations','cuts','production','operationalWriteoffs'].every(k=>Array.isArray(db[k])))return {state:'unavailable',rows:[],issues:['missing-source']};
  if(!(canonicalPairs instanceof Set))return {state:'unavailable',rows:[],issues:['writeoff-authority-unavailable']};
  const rows=[],issues=[],orders=new Map(),products=new Map();
  for(const [arr,map] of [[db.orders,orders],[db.products,products]])for(const o of arr.filter(live)){const k=id(o.id);if(k)map.set(k,map.has(k)?null:o)}
  for(const [oid,o] of orders){
   if(!o){issues.push('duplicate-order');continue}
   const st=norm(o.status);
   if(o.workflowSourceOrderId||o.invoiceReady||o.noteReady||/finalizad|cancelad|entregue|mercadoria pronta|nota emitida|em producao|^producao$/.test(st)||norm(o.cutStatus).includes('finalizado'))continue;
   if(!/separacao|aguardando material|aguardando corte|pedido criado|pedido para corte|^corte$|^planejado$|^aberto$/.test(st)){issues.push('unmapped-order-status');continue}
   const grade=Array.isArray(o.grade)?o.grade:[],groups=new Map();let bad=false;
   for(const g of grade){const pid=id(g?.productId),q=int(g?.qty);if(!pid||!products.get(pid)||q===null||!norm(g.color)||!norm(g.size)){bad=true;continue}if(q===0)continue;const row=groups.get(pid)||{pid,qty:0,grade:[]};row.qty+=q;row.grade.push({color:String(g.color),size:String(g.size),qty:q});groups.set(pid,row)}
   if(bad||!groups.size){issues.push('grade-review');continue}
   const seps=db.separations.filter(s=>live(s)&&id(s.orderId)===oid),s=seps.length===1?seps[0]:null;
   const orderCuts=db.cuts.filter(c=>live(c)&&id(c.orderId)===oid),verifiedParents=new Set();
   for(const c of orderCuts){if(groups.size<2||!id(c.id)||orderCuts.filter(x=>id(x.id)===id(c.id)).length!==1||c.modelSplitParentV1!==true||c.hiddenByModelSplitV1!==true||norm(c.status)!=='desmembrado por modelo')continue;
    const children=orderCuts.filter(x=>x.modelSplitChildV1===true&&id(x.modelSplitFromParentCutId)===id(c.id)&&!norm(x.status).includes('cancel'));
    if(children.length===groups.size&&[...groups.keys()].every(pid=>children.filter(x=>id(x.productId)===pid&&id(x.id)&&orderCuts.filter(y=>id(y.id)===id(x.id)).length===1).length===1))verifiedParents.add(c);
   }
   for(const g of groups.values()){
    const p=products.get(g.pid),issuesFor=[],matches=orderCuts.filter(c=>!verifiedParents.has(c)&&(id(c.productId)===g.pid||!id(c.productId)));
    const production=db.production.some(c=>live(c)&&id(c.orderId)===oid&&(!id(c.productId)||id(c.productId)===g.pid));
    const writeoffs=db.operationalWriteoffs.some(w=>live(w)&&((id(w.orderId)===oid&&(!id(w.productId)||id(w.productId)===g.pid))||[...(Array.isArray(w.orderProductRefs)?w.orderProductRefs:[]),...(Array.isArray(w.sourceRefs)?w.sourceRefs:[])].some(x=>typeof x==='object'&&x&&id(x.orderId)===oid&&(!id(x.productId)||id(x.productId)===g.pid))));
    if(production||writeoffs||canonicalPairs.has(oid+'|'+g.pid)||canonicalPairs.has(oid+'|*')||matches.some(c=>norm(c.status).includes('finalizado')))continue;
    if(matches.some(c=>!id(c.productId)||c.modelSplitParentV1||c.hiddenByModelSplitV1||(groups.size>1&&(id(c.id)===oid||Number(c.pieces)>=Array.from(groups.values()).reduce((sum,x)=>sum+x.qty,0)||new Set([...(c.originalGrade||[]),...(c.actualCutGrade||[])].map(x=>id(x?.productId)).filter(Boolean)).size>1)))||matches.length>1)issuesFor.push('ambiguous-cut');
    const entries=Object.entries(s?.modelProgress||{}).filter(([k])=>k===g.pid||k.split(':').pop()===g.pid);
    let separated=null;if(seps.length>1)issuesFor.push('multiple-separations');else if(entries.length>1)issuesFor.push('ambiguous-progress');else if(entries.length===1){const q=int(entries[0][1]?.qty);if(q!==null&&q<=g.qty)separated=q;else issuesFor.push('invalid-progress')}else if(s?.done)issuesFor.push('legacy-done-without-model-proof');else if(!s||s.done===false)separated=0;
    const materials=[];for(const m of Array.isArray(p.materials)?p.materials:[]){const q=Number(m.qty),loss=Number(m.loss||0),unit=String(m.unit||'');if(!m.name||!Number.isFinite(q)||q<=0||!Number.isFinite(loss)||loss<0||!unit||!['yield','consumption'].includes(m.calcMode||'consumption')){issuesFor.push('material-review');continue}const amount=(m.calcMode==='yield'?g.qty/q:g.qty*q)*(1+loss/100);if(!Number.isFinite(amount)){issuesFor.push('material-review');continue}materials.push({name:String(m.name),unit,amount})}
    if(!materials.length)issuesFor.push('no-materials');
    rows.push({orderId:oid,productId:g.pid,productName:String(p.name||'Modelo'),orderNumber:String(o.orderNumber||o.id),ordered:g.qty,grade:g.grade,separatedObserved:separated,materials,issues:issuesFor,cutId:matches.length===1&&issuesFor.indexOf('ambiguous-cut')<0?id(matches[0].id):null,confirmation:'not-verified',canWrite:false});
   }
  }
  return {state:'local-observation',rows,issues};
 }
 return {inspect};
})();
const cutChecklist9644=(function checklistCore(){
 const MAX=5*1024*1024;
 const text=(v,max)=>typeof v==='string'?v.trim().slice(0,max):'';
 const signature=row=>JSON.stringify([row.orderId,row.productId,row.ordered,row.grade,row.materials,row.separatedObserved,row.cutId,row.issues]);
 const quantity=v=>{if(typeof v!=='string'||!/^\d{1,9}(?:[.,]\d{1,3})?$/.test(v.trim()))return null;const n=Number(v.trim().replace(',','.'));return Number.isFinite(n)&&n>=0?n:null};
 function initial(row){return {signature:signature(row),responsible:'',note:'',lines:row.materials.map(()=>({actual:'',note:''}))}}
 function review(row,draft){
  if(!row||!draft||draft.signature!==signature(row)||!Array.isArray(draft.lines)||draft.lines.length!==row.materials.length)return {state:'stale',lines:[],canConfirm:false};
  const lines=row.materials.map((m,i)=>{const actual=quantity(draft.lines[i]?.actual),required=Number(m.amount),estimated=Number.isFinite(required)&&required>0?required:null;
   const shortage=actual===null||estimated===null?null:Math.max(0,Math.round((estimated-actual)*1000000)/1000000);
   return {name:m.name,unit:m.unit,estimated,actual,shortage,note:text(draft.lines[i]?.note,250),state:actual===null||estimated===null?'unchecked':shortage>0?actual===0?'missing':'partial':'observed-sufficient'};
  });
  const responsible=text(draft.responsible,120);
  const counts={unchecked:0,missing:0,partial:0,'observed-sufficient':0};for(const l of lines)counts[l.state]++;
  const state=!responsible||!lines.length||counts.unchecked?'incomplete':counts.missing||counts.partial?'shortage-observed':'reviewed-locally';
  return {state,lines,counts,responsible,note:text(draft.note,500),canConfirm:false,canWrite:false,stockChanged:false};
 }
 function fileInfo(name,size,bytes){
  if(!Number.isSafeInteger(size)||size<12||size>MAX||!bytes||bytes.length<12)return null;
  const prefix=(a)=>a.every((b,i)=>bytes[i]===b);
  const ascii=(start,s)=>[...s].every((c,i)=>bytes[start+i]===c.charCodeAt(0));
  let mime='',ext='';
  if(prefix([37,80,68,70,45])){mime='application/pdf';ext='pdf'}
  else if(prefix([255,216,255])){mime='image/jpeg';ext='jpg'}
  else if(prefix([137,80,78,71,13,10,26,10])){mime='image/png';ext='png'}
  else if(ascii(0,'RIFF')&&ascii(8,'WEBP')){mime='image/webp';ext='webp'}
  else return null;
  const safe=text(name,120).replace(/[\\/\u0000-\u001f\u007f]/g,'_').replace(/\.[^.]*$/,'').replace(/^\.+/,'').slice(0,100)||'folha';
  return {name:safe+'.'+ext,size,mime};
 }
 return {signature,initial,review,fileInfo,maxBytes:MAX};
})();
const api=Object.freeze({workspace:cutSeparationWorkspace9643,checklist:cutChecklist9644});if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.HLGB_CUT_SEPARATION_CORE_9647=api;
})(typeof window!=='undefined'?window:null);
