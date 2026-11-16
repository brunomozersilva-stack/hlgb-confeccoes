/* HLGB Evolução · Pagamento em lote V1 — SOMENTE LAB FICTÍCIO.
 * O núcleo é o único escritor: este componente valida e muta exclusivamente
 * o clone transacional recebido por core.apply(). Nenhuma API, WAL ou banco externo.
 * Operações financeiras antigas continuam separadas e intactas.
 */
(function(root,factory){
 'use strict';
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.HLGBLabPaymentBatchV1=api;
})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 const normalize=x=>String(x??'').trim().toLocaleUpperCase('pt-BR');
 const find=(a,id)=>a.find(x=>x.id===id);
 function validate(s,p){
  if(!s||!Array.isArray(s.finance)||!Array.isArray(s.settlements))
   throw Error('Estado financeiro fictício incompatível.');
  if(!p||!Array.isArray(p.financeIds)||p.financeIds.length<2||p.financeIds.length>50)
   throw Error('Selecione entre 2 e 50 títulos a pagar para o lote.');
  const ids=p.financeIds;
  if(ids.some(id=>typeof id!=='string'||!/^FIN-\d+$/.test(id))||
    new Set(ids).size!==ids.length)throw Error('Títulos repetidos ou IDs inválidos no lote.');
  const reference=normalize(p.reference);
  if(!reference||reference.length>95)throw Error('Referência única do lote obrigatória (até 95 caracteres).');
  const reason=String(p.reason??'').trim();
  if(!reason||reason.length>95)throw Error('Motivo obrigatório do lote (até 95 caracteres).');
  if((s.paymentBatches||[]).some(batch=>normalize(batch.reference)===reference))
   throw Error('Referência de lote já utilizada. Confira o histórico antes de repetir.');
  const comps=Array.isArray(s.settlementCompensations)?s.settlementCompensations:[];
  const items=ids.map(id=>{
   const bill=find(s.finance,id);
   if(!bill)throw Error('Título '+id+' não localizado. Recarregue antes de confirmar.');
   if(bill.kind!=='pagar'||bill.status!=='aberto')
    throw Error('Título '+id+' não está aberto e a pagar. Não repetir quitação.');
   if(!Number.isSafeInteger(bill.amountCents)||bill.amountCents<=0)
    throw Error('Título '+id+' com valor inválido; conferência obrigatória.');
   const settlement=find(s.settlements,bill.sourceId),comp=find(comps,bill.sourceId);
   if(!settlement&&!comp)throw Error('Somente títulos de acertos e compensações a pagar entram neste lote.');
   const source=settlement||comp,sourceType=settlement?'acerto':'compensacao';
   if(source.status!=='aberto')throw Error('Origem de '+id+' já quitada ou divergente.');
   if(settlement&&settlement.amountCents!==bill.amountCents)
    throw Error('Acerto '+settlement.id+' diverge do título '+id+'.');
   if(comp&&(comp.deltaCents<=0||comp.deltaCents!==bill.amountCents))
    throw Error('Compensação '+comp.id+' diverge do título '+id+'.');
   const previous=(s.paymentBatches||[]).some(batch=>
    batch.items?.some(item=>item.financeId===id));
   if(previous)throw Error('Título '+id+' já consta em um lote anterior.');
   return {financeId:id,sourceId:source.id,sourceType,
    factionId:source.factionId||null,amountCents:bill.amountCents};
  });
  const total=items.reduce((v,x)=>v+x.amountCents,0);
  if(!Number.isSafeInteger(total)||total<=0)
   throw Error('Valor total do lote inválido.');
  return {reference,reason,items,totalCents:total};
 }
 function preview(s,p){
  // Rejeitar previamente tudo que a confirmação rejeitaria.
  const r=validate(s,p);
  return {reference:r.reference,reason:r.reason,count:r.items.length,
   totalCents:r.totalCents,items:r.items.map(x=>({...x})),
   scope:'laboratorio-ficticio',realPayment:false};
 }
 function execute(s,p,context){
  if(!context||typeof context.next!=='function'||!context.uid)
   throw Error('Autoridade transacional do núcleo ausente.');
  // Chamado apenas pelo core.apply sobre snapshot isolado, após validação de
  // revisão, comando único e antes da aprovação de integridade.
  const r=validate(s,p);
  if(!Array.isArray(s.paymentBatches))s.paymentBatches=[];
  const id=context.next(s,'PAG');
  const batch={id,reference:r.reference,reason:r.reason,commandId:context.uid,
   paidDate:'2026-11-16',status:'pago',kind:'pagamento_ficticio_lote',
   count:r.items.length,totalCents:r.totalCents,
   items:r.items.map(x=>({...x}))};
  for(const item of r.items){
   const bill=find(s.finance,item.financeId);
   bill.status='pago';bill.paidDate=batch.paidDate;
   const source=item.sourceType==='acerto'?find(s.settlements,item.sourceId):
    find(s.settlementCompensations,item.sourceId);
   source.status='pago';
  }
  s.paymentBatches.push(batch);
  return id+' · '+r.items.length+' títulos · '+r.totalCents+
   ' centavos · '+r.reference+' (quitação apenas fictícia)';
 }
 return Object.freeze({version:'1.0.0',validate,preview,execute});
});
