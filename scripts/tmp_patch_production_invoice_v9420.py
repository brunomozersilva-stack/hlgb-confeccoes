from pathlib import Path

p=Path('release-note-integrity.js')
s=p.read_text()
s=s.replace('/* HLGB v94.19 — integridade de notas, fila faturada e reconciliação de tombstones financeiros */','/* HLGB v94.20 — integridade de notas, fila faturada e reconciliação de produção já faturada */',1)
s=s.replace("const V='94.19';","const V='94.20';",1)
anchor="window.hlgbNoteQueueReconcile9419={version:'94.19',analyze:queueInvoiceAnalysis,reconcile:reconcileQueueInvoices9419};\n\nlet timer=null;"
if anchor not in s:
    raise SystemExit('anchor noteQueue não encontrado')
block=r'''window.hlgbNoteQueueReconcile9419={version:'94.19',analyze:queueInvoiceAnalysis,reconcile:reconcileQueueInvoices9419};

let productionInvoiceReconBusy9420=false,productionInvoiceReconAt9420=0;
function productionInvoiceAnalysis9420(productionRows=arr('production'),orders=arr('orders'),invoices=canonicalInvoices(),queueRows=arr('noteQueue')){
 const out=[],eps=.000001;
 for(const row of (Array.isArray(productionRows)?productionRows:[])){
  const orderId=sid(row?.orderId),productId=sid(row?.productId),planned=q(row?.planned),done=q(row?.done);
  if(!orderId||!productId||planned<=0||done>=planned-eps)continue;
  const order=(Array.isArray(orders)?orders:[]).find(o=>sid(o?.id)===orderId);if(!order)continue;
  const meta=order?.projectionItems?.[productId]||{};
  let invoiceQty=0;const invoiceIds=[];
  for(const inv of (Array.isArray(invoices)?invoices:[])){
   let matched=false;
   for(const item of (Array.isArray(inv?.items)?inv.items:[])){
    if(item?.noteOnly===true)continue;
    if(sid(item?.orderId)!==orderId)continue;
    const pid=sid(item?.productId||item?.itemKey);if(pid!==productId)continue;
    invoiceQty+=q(item?.qty);matched=true;
   }
   if(matched&&sid(inv?.id))invoiceIds.push(sid(inv.id));
  }
  const billed=Math.max(invoiceQty,q(meta?.invoicedQty));
  if(billed+eps<planned)continue;
  const queues=(Array.isArray(queueRows)?queueRows:[]).filter(r=>sid(r?.orderId)===orderId&&sid(r?.productId||r?.itemKey)===productId);
  const queueSettled=queues.length>0&&queues.every(r=>norm(r?.status)==='faturado'&&q(r?.remainingQty??r?.qty)<=eps);
  const orderFinal=norm(order?.status)==='pedido finalizado'||truthy(order?.deliveryFinalized)||truthy(order?.projectionInvoiced);
  if(!queueSettled&&!orderFinal)continue;
  const ids=[...new Set([...(Array.isArray(meta?.invoiceIds)?meta.invoiceIds:[]),...invoiceIds].map(sid).filter(Boolean))];
  out.push({id:sid(row?.id??row?.__hlgbId),orderId,productId,planned,done,invoicedQty:billed,invoiceIds:ids,queueSettled,orderFinal,row});
 }
 return out;
}
async function reconcileProductionInvoices9420(force=false){
 if(productionInvoiceReconBusy9420)return {busy:true,changed:0};const stamp=Date.now();if(!force&&stamp-productionInvoiceReconAt9420<2500)return {throttled:true,changed:0};productionInvoiceReconAt9420=stamp;productionInvoiceReconBusy9420=true;
 const changed=[],errors=[];try{
  for(const x of productionInvoiceAnalysis9420()){
   const at=new Date().toISOString(),next={...clone(x.row),done:x.planned,stage:'Finalizado',finishedAt:x.row?.finishedAt||today(),finishedAtTime:x.row?.finishedAtTime||at,invoicedQty:x.invoicedQty,invoiceIds:x.invoiceIds,invoiceReconciledAt:at,invoiceReconciledV9420:true,updatedAt:at};
   try{await saveConfirmed('production',next,false);changed.push(x.id)}catch(e){errors.push({id:x.id,error:sid(e?.message||e)})}
  }
  if(changed.length){try{window.renderProduction?.()}catch(e){}try{window.renderProjection?.()}catch(e){}}
  return {changed:changed.length,ids:changed,errors};
 }finally{productionInvoiceReconBusy9420=false}
}
window.hlgbProductionInvoiceReconcile9420={version:'94.20',analyze:productionInvoiceAnalysis9420,reconcile:reconcileProductionInvoices9420};

let timer=null;'''
s=s.replace(anchor,block,1)
old="if(['noteQueue','projectionInvoices','orders','finance'].includes(module)){\n   setTimeout(apply,30);\n   if(['noteQueue','projectionInvoices'].includes(module))setTimeout(()=>reconcileQueueInvoices9419(false).catch(()=>{}),420);"
new="if(['noteQueue','projectionInvoices','orders','finance','production'].includes(module)){\n   setTimeout(apply,30);\n   if(['noteQueue','projectionInvoices'].includes(module))setTimeout(()=>reconcileQueueInvoices9419(false).catch(()=>{}),420);\n   if(['noteQueue','projectionInvoices','orders','production'].includes(module))setTimeout(()=>reconcileProductionInvoices9420(false).catch(()=>{}),650);"
if old not in s:
    raise SystemExit('anchor incoming não encontrado')
s=s.replace(old,new,1)
s=s.replace("setTimeout(()=>reconcileQueueInvoices9419(false).catch(()=>{}),900);","setTimeout(()=>reconcileQueueInvoices9419(false).catch(()=>{}),900);\n setTimeout(()=>reconcileProductionInvoices9420(false).catch(()=>{}),1150);",1)
s=s.replace("setTimeout(()=>{reconcileFinanceTombstones();cleanupOrphanFinance();reconcileQueueInvoices9419(false).catch(()=>{})},1800);","setTimeout(()=>{reconcileFinanceTombstones();cleanupOrphanFinance();reconcileQueueInvoices9419(false).catch(()=>{});reconcileProductionInvoices9420(false).catch(()=>{})},1800);",1)
s=s.replace("if(ms>=700)reconcileQueueInvoices9419(false).catch(()=>{})","if(ms>=700){reconcileQueueInvoices9419(false).catch(()=>{});reconcileProductionInvoices9420(false).catch(()=>{})}",1)
p.write_text(s)

p=Path('release-production-render-fix-v9330.js')
s=p.read_text()
old="try{return !(typeof hlgbProductionDone9196==='function'&&hlgbProductionDone9196(p))&&(!f||p.stage===f)}\n    catch(e){return !f||p.stage===f}"
new="try{const doneByQty=(+p.planned||0)>0&&(+p.done||0)>=(+p.planned||0);return !doneByQty&&!(typeof hlgbProductionDone9196==='function'&&hlgbProductionDone9196(p))&&(!f||p.stage===f)}\n    catch(e){return !((+p.planned||0)>0&&(+p.done||0)>=(+p.planned||0))&&(!f||p.stage===f)}"
if old not in s:
    raise SystemExit('anchor renderProduction não encontrado')
p.write_text(s.replace(old,new,1))
