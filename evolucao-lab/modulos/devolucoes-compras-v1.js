/* HLGB Evolução | laboratório de devolução integral de compra recebida.
 * Somente dados fictícios: execução no clone transacional do core.apply.
 * Não cancela o documento original, não modifica títulos anteriores e não tem rede.
 */
(function(root,factory){
 'use strict';
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.HLGBLabPurchaseReturnsV1=api;
})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 const id=(xs,x)=>xs.find(r=>r.id===x);
 const norm=x=>String(x||'').trim().toLocaleUpperCase('pt-BR');
 const text=(x,label)=>{
  const v=String(x??'').trim();
  if(!v||v.length>95)throw Error(label+' obrigatório (até 95 caracteres).');
  return v;
 };
 const amount=(qty,price)=>Math.ceil(qty*price/1000);
 function ensure(s){if(!Array.isArray(s.purchaseReturns))s.purchaseReturns=[];}
 function full(s,p,ctx){
  ensure(s);
  const po=id(s.purchaseOrders,p.id);
  if(!po||po.received!==true||po.cancelled===true)
   throw Error('Somente compra efetivamente recebida pode ser devolvida.');
  if(po.returnId||s.purchaseReturns.some(x=>x.purchaseId===po.id))
   throw Error('Esta compra já possui devolução. Não repetir movimento.');
  const source=s.purchaseRequests.find(x=>x.id===po.purchaseRequestId);
  if(!source||source.status!=='recebida'||source.purchaseId!==po.id||!source.receiptCommandId)
   throw Error('Compra sem requisição e recebimento conciliados; devolução bloqueada.');
  const moves=s.stockLedger.filter(m=>m.sourceId===po.id&&m.type==='compra');
  if(moves.length!==1||moves[0].materialId!==po.materialId||
     moves[0].deltaGrams!==po.qtyGrams||moves[0].commandId!==source.receiptCommandId)
   throw Error('Entrada original de estoque não conciliada; nenhuma devolução lançada.');
  const bills=s.finance.filter(f=>f.sourceId===po.id);
  const original=bills[0],expected=amount(po.qtyGrams,po.priceCentsKg);
  if(bills.length!==1||!original||original.kind!=='pagar'||original.amountCents!==expected||
     original.status!=='aberto')
   throw Error('Compra com título pago, duplicado ou divergente; exigir conciliação manual.');
  const material=id(s.materials,po.materialId);
  if(!material||!Number.isSafeInteger(po.qtyGrams)||po.qtyGrams<=0||
     material.stockGrams<po.qtyGrams)
   throw Error('Estoque insuficiente para devolver tudo; não baixar saldo negativo ou consumido.');
  const returnedBy=text(p.returnedBy,'Responsável pela devolução fictícia'),
   reviewedBy=text(p.reviewedBy,'Conferente independente'),
   reason=text(p.reason,'Motivo formal da devolução'),
   reference=norm(text(p.reference,'Referência única da devolução'));
  if(norm(returnedBy)===norm(reviewedBy)||norm(reviewedBy)===norm(source.requester)||
     norm(returnedBy)===norm(source.requester))
   throw Error('Devolução exige responsáveis distintos entre si e do solicitante.');
  if(s.purchaseReturns.some(x=>norm(x.reference)===reference)||
     s.purchaseRequests.some(x=>norm(x.cancelIssueReference)===reference))
   throw Error('Referência já registrada em outra devolução ou cancelamento.');
  const retId=ctx.next(s,'DEV'),movementId=ctx.next(s,'MOV'),
   financeId=ctx.next(s,'FIN');
  const doc={id:retId,purchaseId:po.id,requestId:source.id,supplierId:po.supplierId,
   materialId:po.materialId,qtyGrams:po.qtyGrams,amountCents:expected,
   reference,returnedBy,reviewedBy,reason,originalFinanceId:original.id,
   stockMovementId:movementId,creditFinanceId:financeId,commandId:ctx.uid,
   status:'credito_pendente'};
  s.purchaseReturns.push(doc);
  material.stockGrams-=po.qtyGrams;
  s.stockLedger.push({id:movementId,materialId:po.materialId,deltaGrams:-po.qtyGrams,
   sourceId:retId,originalPurchaseId:po.id,type:'devolucao_compra',commandId:ctx.uid});
  s.finance.push({id:financeId,kind:'receber',sourceId:retId,relatedPurchaseId:po.id,
   description:'Crédito fictício por devolução integral '+po.id,
   amountCents:expected,status:'aberto'});
  // A compra e a requisição originais continuam recebidas e rastreáveis.
  po.returnId=retId;source.returnId=retId;
  return retId+' · compra '+po.id+' devolvida integralmente · crédito '+financeId+
   ' (somente demonstração)';
 }
 function inspect(s){
  const problems=[],returns=s.purchaseReturns||[],ids=new Set(),references=new Set();
  for(const ret of returns){
   const po=id(s.purchaseOrders,ret.purchaseId),
    req=po&&id(s.purchaseRequests,po.purchaseRequestId),
    material=po&&id(s.materials,po.materialId),
    original=id(s.finance,ret.originalFinanceId),
    movements=s.stockLedger.filter(m=>m.sourceId===ret.id),
    linked=s.finance.filter(f=>f.sourceId===ret.id),
    expected=po?amount(po.qtyGrams,po.priceCentsKg):null,
    ref=norm(ret.reference);
   if(!ret.id||ids.has(ret.id)||!ref||references.has(ref)||
      s.purchaseRequests.some(x=>norm(x.cancelIssueReference)===ref))
    problems.push(String(ret.id)+': referência ou identificação de devolução duplicada');
   ids.add(ret.id);references.add(ref);
   if(!po||!req||!material||po.cancelled||!po.received||
      req.status!=='recebida'||req.purchaseId!==po.id||ret.requestId!==req.id||
      ret.purchaseId!==po.id||ret.materialId!==po.materialId||
      ret.supplierId!==po.supplierId||ret.qtyGrams!==po.qtyGrams||
      ret.amountCents!==expected||po.returnId!==ret.id||req.returnId!==ret.id)
    problems.push(String(ret.id)+': origem da devolução alterada ou inconsistente');
   if(!original||original.sourceId!==ret.purchaseId||
      original.kind!=='pagar'||original.amountCents!==ret.amountCents||
      movements.length!==1||movements[0].id!==ret.stockMovementId||
      movements[0].materialId!==ret.materialId||
      movements[0].deltaGrams!==-ret.qtyGrams||
      movements[0].type!=='devolucao_compra'||
      movements[0].originalPurchaseId!==ret.purchaseId||
      movements[0].commandId!==ret.commandId||
      linked.length!==1||linked[0].id!==ret.creditFinanceId||
      linked[0].kind!=='receber'||linked[0].amountCents!==ret.amountCents||
      linked[0].relatedPurchaseId!==ret.purchaseId||
      !['aberto','pago'].includes(linked[0].status))
    problems.push(String(ret.id)+': devolução sem movimento de estoque ou crédito conciliado');
   if(!ret.commandId||!s.log.some(e=>e.commandId===ret.commandId&&
      e.type==='purchase.return.full')||!ret.reason||!ret.returnedBy||
      !ret.reviewedBy||norm(ret.returnedBy)===norm(ret.reviewedBy)||
      norm(ret.returnedBy)===norm(req?.requester)||
      norm(ret.reviewedBy)===norm(req?.requester)||
      ret.status!=='credito_pendente')
    problems.push(String(ret.id)+': conferência dupla, status ou evento ausente');
  }
  for(const po of s.purchaseOrders){
   const linked=returns.filter(x=>x.purchaseId===po.id);
   if((po.returnId||linked.length)&&(linked.length!==1||linked[0].id!==po.returnId))
    problems.push(po.id+': compra com devolução órfã ou duplicada');
  }
  for(const m of s.stockLedger.filter(x=>x.type==='devolucao_compra'))
   if(!returns.some(x=>x.id===m.sourceId&&x.stockMovementId===m.id))
    problems.push(m.id+': movimento de devolução órfão');
  for(const f of s.finance.filter(x=>x.relatedPurchaseId))
   if(!returns.some(x=>x.id===f.sourceId&&x.creditFinanceId===f.id))
    problems.push(f.id+': título de devolução sem documento');
  return problems;
 }
 return Object.freeze({version:'1.0.0',ensure,full,inspect});
});
