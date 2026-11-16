/* HLGB Evolução · Distribuição de pedidos em múltiplas facções, apenas LAB fictício.
 * Sem rede ou armazenamento próprio; opera somente no clone validado pelo núcleo.
 * Não substitui comandos legados de facção, seus IDs ou acertos históricos.
 */
(function(root,factory){
 'use strict';
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.HLGBLabFactionRoutingV1=api;
})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 const sum=x=>Object.values(x).reduce((a,b)=>a+b,0);
 const byId=(a,id)=>a.find(x=>x.id===id);
 function ensure(s,next){
  if(!Array.isArray(s.factionAssignments))s.factionAssignments=[];
  for(const order of s.orders){
   if(order.allocated<=0||s.factionAssignments.some(a=>a.orderId===order.id))continue;
   if(!order.factionId||!s.factions.some(x=>x.id===order.factionId)||
      order.returned>order.allocated)
    throw Error('Histórico anterior da facção inconsistente. Não migrar automaticamente.');
   s.factionAssignments.push({
    id:next(s,'ALO'),orderId:order.id,factionId:order.factionId,
    qtySent:order.allocated,qtyReturned:order.returned,
    origin:'legado-local',createdCommandId:'migracao-legado-local'
   });
  }
  return s.factionAssignments;
 }
 function forOrder(s,id){return (s.factionAssignments||[]).filter(a=>a.orderId===id)}
 function allocation(s,p,ctx){
  const assignments=ensure(s,ctx.next);
  const order=byId(s.orders,p.orderId),fac=byId(s.factions,p.factionId);
  if(!order)throw Error('Pedido não localizado.');
  if(!fac)throw Error('Facção não localizada.');
  const qty=ctx.int(p.qty,'Peças a enviar',1,10000);
  if(order.allocated+qty>sum(order.cut))
   throw Error('Envio excede peças cortadas; não distribuir o mesmo corte duas vezes.');
  let row=assignments.find(a=>a.orderId===order.id&&a.factionId===fac.id);
  if(!row){
   row={id:ctx.next(s,'ALO'),orderId:order.id,factionId:fac.id,
    qtySent:0,qtyReturned:0,origin:'distribuicao',createdCommandId:ctx.uid};
   assignments.push(row);
  }
  row.qtySent+=qty;
  order.allocated+=qty;
  if(!order.factionId)order.factionId=fac.id; // facção principal preservada para UI/rotina antiga.
  return row.id+' · '+order.id+' → '+fac.name+' · +'+qty+' peças';
 }
 function ret(s,p,ctx){
  ensure(s,ctx.next);
  const a=byId(s.factionAssignments,p.assignmentId);
  if(!a)throw Error('Envio a facção não localizado.');
  const order=byId(s.orders,a.orderId),fac=byId(s.factions,a.factionId);
  if(!order||!fac)throw Error('Pedido/facção desse envio não encontrado.');
  const qty=ctx.int(p.qty,'Peças retornadas',1,10000);
  if(qty>a.qtySent-a.qtyReturned)
   throw Error('Retorno excede o saldo dessa facção, mesmo que outra facção ainda tenha peças.');
  if(order.returned+qty>order.allocated)
   throw Error('Retorno excede o total enviado para o pedido.');
  const product=byId(s.products,order.productId);
  if(!product)throw Error('Produto do pedido não encontrado.');
  const gross=fac.productRates?.[product.id]??fac.unitCents;
  const traveta=fac.traveta?0:Math.min(gross,50);
  const unit=gross-traveta;
  if(!Number.isSafeInteger(unit)||unit<=0)
   throw Error('Preço líquido por peça não pode ser nulo ou negativo.');
  const amount=qty*unit;
  if(!Number.isSafeInteger(amount)||amount<=0)
   throw Error('Total do retorno inválido.');
  const id=ctx.next(s,'ACE');
  s.settlements.push({id,orderId:order.id,assignmentId:a.id,
   factionId:fac.id,productId:product.id,kind:'retorno',serviceType:'costura',
   qty,listUnitCents:gross,travetaCents:traveta,unitCents:unit,
   adjustmentCents:0,amountCents:amount,description:'Retorno por facção fictício',status:'aberto'});
  s.finance.push({id:ctx.next(s,'FIN'),kind:'pagar',sourceId:id,
   description:'Acerto fictício '+id,amountCents:amount,status:'aberto'});
  a.qtyReturned+=qty;
  order.returned+=qty;
  return id;
 }
 function canLegacyReturn(s,order){
  const rows=forOrder(s,order.id);
  if(rows.length>1)throw Error('Pedido com várias facções: selecione o envio correto em Retorno por facção.');
  return rows[0]||null;
 }
 function recordLegacyAllocation(s,order,fac,qty,ctx){
  const rows=forOrder(s,order.id);
  let row=rows.find(a=>a.factionId===fac.id);
  if(!row){
   if(rows.length)throw Error('Rotina simples não aceita várias facções; use Distribuir por facção.');
   row={id:ctx.next(s,'ALO'),orderId:order.id,factionId:fac.id,
    qtySent:0,qtyReturned:0,origin:'legado-local',createdCommandId:ctx.uid};
   s.factionAssignments.push(row);
  }
  row.qtySent+=qty;
 }
 function recordLegacyReturn(s,order,qty){
  const row=canLegacyReturn(s,order);
  if(!row||qty>row.qtySent-row.qtyReturned)
   throw Error('Saldo dessa facção insuficiente.');
  row.qtyReturned+=qty;
  return row.id;
 }
 function reassignLegacy(s,order,newFactionId){
  const rows=forOrder(s,order.id);
  if(rows.length!==1)throw Error('Transferência simples bloqueada: pedido já dividido entre facções.');
  if(rows[0].qtyReturned!==0)
   throw Error('Troca de facção bloqueada após qualquer retorno.');
  rows[0].factionId=newFactionId;
 }
 function reverseReturn(s,settlement,qty){
  if(!settlement.orderId)return;
  const rows=forOrder(s,settlement.orderId);
  const match=settlement.assignmentId?
   byId(rows,settlement.assignmentId):rows.find(a=>a.factionId===settlement.factionId);
  if(!match||match.qtyReturned<qty)
   throw Error('Devolução não confere com o retorno da facção original.');
  match.qtyReturned-=qty;
 }
 function inspect(s){
  const issues=[],assignments=Array.isArray(s.factionAssignments)?s.factionAssignments:null;
  if(!assignments)return issues; // versão anterior do laboratório é válida sem reset.
  const ids=new Set(),pairs=new Set();
  for(const a of assignments){
   const pair=a.orderId+'|'+a.factionId,order=byId(s.orders,a.orderId);
   if(!a.id||ids.has(a.id)||pairs.has(pair)||!order||!byId(s.factions,a.factionId)||
      !Number.isSafeInteger(a.qtySent)||a.qtySent<1||
      !Number.isSafeInteger(a.qtyReturned)||a.qtyReturned<0||
      a.qtyReturned>a.qtySent)
    issues.push(String(a.id)+': envio por facção duplicado ou inválido');
   ids.add(a.id);pairs.add(pair);
  }
  for(const order of s.orders){
   const rows=forOrder(s,order.id);
   if(rows.reduce((n,a)=>n+a.qtySent,0)!==order.allocated||
      rows.reduce((n,a)=>n+a.qtyReturned,0)!==order.returned)
    issues.push(order.id+': saldos de facções divergentes do pedido');
   if(rows.length&&!rows.some(a=>a.factionId===order.factionId))
    issues.push(order.id+': facção principal do pedido não existe nos envios');
   for(const settlement of s.settlements.filter(x=>x.orderId===order.id)){
    const assignment=settlement.assignmentId?byId(rows,settlement.assignmentId):
     rows.find(x=>x.factionId===settlement.factionId);
    if(!assignment||assignment.factionId!==settlement.factionId)
     issues.push(settlement.id+': acerto sem envio correspondente à facção');
   }
   for(const row of rows){
    const returned=s.settlements.filter(x=>x.orderId===order.id&&
     x.factionId===row.factionId).reduce((n,x)=>n+x.qty,0);
    if(row.qtyReturned!==returned)
     issues.push(row.id+': retorno não corresponde aos acertos dessa facção');
   }
  }
  return issues;
 }
 return Object.freeze({version:'1.0.0',ensure,forOrder,allocation,ret,
  canLegacyReturn,recordLegacyAllocation,recordLegacyReturn,
  reassignLegacy,reverseReturn,inspect});
});
