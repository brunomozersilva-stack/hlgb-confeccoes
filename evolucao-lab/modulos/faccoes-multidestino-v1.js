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
 function transfer(s,p,ctx){
  // Transferência física apenas do saldo AINDA NÃO RETORNADO.
  // Histórico de acertos/baixas anteriores nunca é transferido ao novo destino.
  ensure(s,ctx.next);
  if(!Array.isArray(s.factionPartialTransfers))s.factionPartialTransfers=[];
  const from=byId(s.factionAssignments,p.fromAssignmentId);
  if(!from)throw Error('Envio de origem não encontrado. Confira o pedido e a facção.');
  const order=byId(s.orders,from.orderId);
  const target=byId(s.factions,p.toFactionId);
  if(!order||!target)throw Error('Pedido ou facção de destino não localizado.');
  if(from.factionId===target.id)throw Error('Selecione uma facção de destino diferente da origem.');
  const qty=ctx.int(p.qty,'Quantidade transferida',1,10000);
  const available=from.qtySent-from.qtyReturned;
  if(qty>available)throw Error('Transferência excede o saldo não retornado da facção de origem.');
  if(from.qtySent-qty<1)
   throw Error('Transferência integral deste envio não disponível neste fluxo parcial; mantenha pelo menos uma peça atribuída ou use a troca simples antes de retornos.');
  const reason=String(p.reason??'').trim();
  if(!reason||reason.length>95)throw Error('Justificativa de transferência obrigatória (até 95 caracteres).');
  let to=s.factionAssignments.find(a=>a.orderId===order.id&&a.factionId===target.id);
  if(!to){
   to={id:ctx.next(s,'ALO'),orderId:order.id,factionId:target.id,
    qtySent:0,qtyReturned:0,origin:'transferencia-parcial',
    createdCommandId:ctx.uid};
   s.factionAssignments.push(to);
  }
  const fromBefore=from.qtySent,toBefore=to.qtySent;
  from.qtySent-=qty;
  to.qtySent+=qty;
  // Não modificar order.allocated, order.returned, acertos ou títulos.
  const move={id:ctx.next(s,'TRP'),orderId:order.id,
   fromAssignmentId:from.id,toAssignmentId:to.id,
   fromFactionId:from.factionId,toFactionId:to.factionId,
   qty,reason,commandId:ctx.uid,
   fromBefore,fromAfter:from.qtySent,toBefore,toAfter:to.qtySent,
   kind:'transferencia_parcial_pendente'};
  s.factionPartialTransfers.push(move);
  return move.id+' · '+order.id+' · '+qty+' peças · '+from.factionId+
   ' → '+to.factionId+' (sem alterar acertos anteriores)';
 }
 // A tarifa negociada pertence ao envio ALO, não ao cadastro geral.
 function resolveRate(row,fac,product){
  const agreement=row?.rateAgreementHistory?.at(-1);
  if(agreement?.mode==='negociado'){
   if(agreement.factionId!==fac.id||agreement.productId!==product.id||
      !Number.isSafeInteger(agreement.gross)||!Number.isSafeInteger(agreement.discount)||
      agreement.gross<=agreement.discount||agreement.discount<0)
    throw Error('Tarifa do envio divergente da facção/modelo. Conferir antes do retorno.');
   return {gross:agreement.gross,traveta:agreement.discount,
    unit:agreement.gross-agreement.discount,agreementCommandId:agreement.commandId};
  }
  const gross=fac.productRates?.[product.id]??fac.unitCents,
   traveta=fac.traveta?0:Math.min(gross,50);
  return {gross,traveta,unit:gross-traveta,agreementCommandId:null};
 }
 function setAssignmentRate(s,p,ctx){
  const row=byId(ensure(s,ctx.next),p.assignmentId),
   order=row&&byId(s.orders,row.orderId),
   fac=row&&byId(s.factions,row.factionId),
   product=order&&byId(s.products,order.productId);
  if(!row||!fac||!product||row.qtySent<=row.qtyReturned)
   throw Error('Escolha um envio com peças pendentes de retorno.');
  const gross=ctx.int(p.unitCents,'Valor bruto por peça',1,100000),
   discount=ctx.int(p.travetaCents,'Desconto por peça',0,100000);
  if(discount>=gross)throw Error('Preço líquido por peça precisa ser positivo.');
  const reason=String(p.reason??'').trim();
  if(!reason||reason.length>95)throw Error('Justificativa obrigatória (até 95 caracteres).');
  const before=resolveRate(row,fac,product);
  if(!Array.isArray(row.rateAgreementHistory))row.rateAgreementHistory=[];
  row.rateAgreementHistory.push({mode:'negociado',commandId:ctx.uid,
   factionId:fac.id,productId:product.id,gross,discount,reason,
   pendingQty:row.qtySent-row.qtyReturned,beforeGross:before.gross,beforeDiscount:before.traveta});
  return row.id+' · '+fac.name+' · '+before.gross+' → '+gross+
   ' centavos brutos · apenas próximos retornos';
 }
 function inspectAssignmentRates(s){
  const problems=[],seen=new Set(),entries=new Map();
  for(const row of (s.factionAssignments||[])){
   const history=Array.isArray(row.rateAgreementHistory)?row.rateAgreementHistory:[];
   for(const h of history){
    const event=s.log.find(e=>e.commandId===h.commandId);
    if(!h.commandId||seen.has(h.commandId)||!event||
       !['negociado','reset'].includes(h.mode)||!h.reason||
       h.mode==='negociado'&&(event.type!=='faction.assignment.rate.set'||
       !byId(s.factions,h.factionId)||!byId(s.products,h.productId)||
       !Number.isSafeInteger(h.gross)||!Number.isSafeInteger(h.discount)||
       h.gross<=h.discount||h.discount<0||!Number.isSafeInteger(h.pendingQty)||h.pendingQty<1)||
       h.mode==='reset'&&(event.type!=='faction.reassign'||!byId(s.factions,h.factionId)))
     problems.push(row.id+': histórico da tarifa do envio inconsistente');
    seen.add(h.commandId);
    if(h.mode==='negociado')entries.set(h.commandId,{h,row});
   }
   const last=history.at(-1);
   if(last&&last.factionId!==row.factionId)
    problems.push(row.id+': tarifa ativa pertence a outra facção');
  }
  for(const x of s.settlements.filter(x=>x.rateAgreementCommandId)){
   const ref=entries.get(x.rateAgreementCommandId);
   const original=x.rateHistory?.[0]?.before||x;
   if(!ref||ref.row.id!==x.assignmentId||ref.h.factionId!==x.factionId||
      ref.h.productId!==x.productId||ref.h.gross!==(original.listUnitCents??original.unitCents)||
      ref.h.discount!==(original.travetaCents||0))
    problems.push(x.id+': tarifa aplicada no retorno não confere com acordo histórico');
  }
  for(const event of s.log.filter(e=>e.type==='faction.assignment.rate.set'))
   if(!seen.has(event.commandId))problems.push(event.commandId+': acordo de tarifa sem histórico');
  return problems;
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
  const {gross,traveta,unit,agreementCommandId}=resolveRate(a,fac,product);
  if(!Number.isSafeInteger(unit)||unit<=0)
   throw Error('Preço líquido por peça não pode ser nulo ou negativo.');
  const amount=qty*unit;
  if(!Number.isSafeInteger(amount)||amount<=0)
   throw Error('Total do retorno inválido.');
  const id=ctx.next(s,'ACE');
  s.settlements.push({id,orderId:order.id,assignmentId:a.id,
   factionId:fac.id,productId:product.id,kind:'retorno',serviceType:'costura',
   qty,listUnitCents:gross,travetaCents:traveta,unitCents:unit,
   adjustmentCents:0,amountCents:amount,description:'Retorno por facção fictício',status:'aberto',
   ...(agreementCommandId?{rateAgreementCommandId:agreementCommandId}:{})});
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
 function reassignLegacy(s,order,newFactionId,ctx){
  const rows=forOrder(s,order.id);
  if(rows.length!==1)throw Error('Transferência simples bloqueada: pedido já dividido entre facções.');
  if(rows[0].qtyReturned!==0)
   throw Error('Troca de facção bloqueada após qualquer retorno.');
  const row=rows[0];
  if(Array.isArray(row.rateAgreementHistory)&&row.rateAgreementHistory.length){
   if(!ctx?.uid)throw Error('Troca com tarifa negociada requer prova de comando.');
   row.rateAgreementHistory.push({mode:'reset',commandId:ctx.uid,factionId:newFactionId,
    reason:ctx.reason||'Troca de facção — usar tarifa do novo destino'});
  }
  row.factionId=newFactionId;
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
 // Corrige um acerto em aberto sem recriar seu título nem mover peças.
 function reviseSettlement(s,p,ctx){
  const x=byId(s.settlements,p.id);
  if(!x||x.status!=='aberto')throw Error('Somente acerto em aberto pode ser corrigido.');
  const titles=s.finance.filter(t=>t.sourceId===x.id);
  const bill=titles[0];
  if(titles.length!==1||bill.kind!=='pagar'||bill.status!=='aberto'||
     bill.amountCents!==x.amountCents||
     (s.paymentBatches||[]).some(b=>b.items?.some(i=>i.financeId===bill.id))||
     (s.settlementCompensations||[]).some(c=>c.settlementId===x.id))
   throw Error('Título divergente ou pagamento anterior encontrado. Não corrigir diretamente.');
  const oldFaction=byId(s.factions,x.factionId);
  const target=byId(s.factions,p.factionId||x.factionId);
  if(!target||!oldFaction)throw Error('Facção ou embaladeira não localizada.');
  if(target.id!==x.factionId&&(x.kind!=='avulso'||x.orderId||x.assignmentId||x.gradeTracked))
   throw Error('Acerto vinculado a retorno físico: use a rotina de transferência, não troque a facção do acerto.');
  const gross=ctx.int(p.unitCents,'Valor bruto por peça',1,100000),
   discount=ctx.int(p.travetaCents,'Desconto por peça',0,100000);
  if(discount>=gross)throw Error('A travetada não pode zerar ou superar a mão de obra.');
  const reason=String(p.reason??'').trim();
  if(!reason||reason.length>95)throw Error('Justificativa obrigatória (até 95 caracteres).');
  const snapshot=()=>({factionId:x.factionId,listUnitCents:x.listUnitCents??x.unitCents,
   travetaCents:x.travetaCents||0,unitCents:x.unitCents,qty:x.qty,
   adjustmentCents:x.adjustmentCents||0,amountCents:x.amountCents});
  const before=snapshot(),after={...before,factionId:target.id,listUnitCents:gross,
   travetaCents:discount,unitCents:gross-discount,
   amountCents:x.qty*(gross-discount)+(x.adjustmentCents||0)};
  if(!Number.isSafeInteger(after.amountCents)||after.amountCents<=0)
   throw Error('O novo total precisa ser positivo e válido.');
  if(before.factionId===after.factionId&&before.listUnitCents===gross&&
     before.travetaCents===discount)throw Error('Nenhuma alteração informada.');
  if(!validRateSnapshot(before))throw Error('Acerto original sem cálculo conciliado; conferir antes de corrigir.');
  x.factionId=after.factionId;x.listUnitCents=gross;x.travetaCents=discount;
  x.unitCents=after.unitCents;x.amountCents=after.amountCents;
  bill.amountCents=after.amountCents;
  if(!Array.isArray(x.rateHistory))x.rateHistory=[];
  x.rateHistory.push({commandId:ctx.uid,financeId:bill.id,reason,
   before,after,fromFactionName:oldFaction.name,toFactionName:target.name});
  return x.id+' · '+oldFaction.name+' → '+target.name+' · '+before.amountCents+
   ' → '+after.amountCents+' centavos · título '+bill.id;
 }
 function validRateSnapshot(x){
  return !!x&&typeof x.factionId==='string'&&
   Number.isSafeInteger(x.qty)&&x.qty>0&&
   Number.isSafeInteger(x.listUnitCents)&&x.listUnitCents>0&&
   Number.isSafeInteger(x.travetaCents)&&x.travetaCents>=0&&
   x.listUnitCents-x.travetaCents===x.unitCents&&x.unitCents>0&&
   Number.isSafeInteger(x.unitCents)&&Number.isSafeInteger(x.adjustmentCents)&&
   Number.isSafeInteger(x.amountCents)&&x.amountCents>0&&
   x.qty*x.unitCents+x.adjustmentCents===x.amountCents;
 }
 function inspectRateHistory(s){
  const problems=[],seen=new Set();
  for(const x of s.settlements){
   const history=Array.isArray(x.rateHistory)?x.rateHistory:[];
   const bill=s.finance.find(t=>t.sourceId===x.id&&t.kind==='pagar');
   let prior=null;
   for(const h of history){
    const b=h.before,a=h.after;
    const event=s.log.find(e=>e.commandId===h.commandId&&e.type==='settlement.revise');
    if(!event||seen.has(h.commandId)||!h.reason||!h.fromFactionName||!h.toFactionName||
       h.financeId!==bill?.id||!validRateSnapshot(b)||!validRateSnapshot(a)||
       !byId(s.factions,b?.factionId)||!byId(s.factions,a?.factionId)||
       b.qty!==a.qty||b.adjustmentCents!==a.adjustmentCents||
       (b.factionId!==a.factionId&&(x.kind!=='avulso'||x.orderId||x.assignmentId))||
       (prior&&(prior.factionId!==b.factionId||prior.listUnitCents!==b.listUnitCents||
         prior.travetaCents!==b.travetaCents)))
     problems.push(x.id+': histórico de correção de facção/mão de obra divergente');
    seen.add(h.commandId);prior=a;
   }
   if(prior&&(prior.factionId!==x.factionId||prior.listUnitCents!==x.listUnitCents||
      prior.travetaCents!==x.travetaCents||prior.unitCents!==x.unitCents||
      x.amountCents!==x.qty*x.unitCents+(x.adjustmentCents||0)))
    problems.push(x.id+': valores atuais sem correspondência com última correção');
  }
  for(const e of s.log.filter(x=>x.type==='settlement.revise'))
   if(!seen.has(e.commandId))problems.push('Correção '+e.commandId+': evento sem histórico de acerto');
  return problems;
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
  const transferIds=new Set();
  for(const move of (s.factionPartialTransfers||[])){
   const from=byId(assignments,move.fromAssignmentId);
   const to=byId(assignments,move.toAssignmentId);
   if(!move.id||transferIds.has(move.id)||!from||!to||
      from.id===to.id||from.orderId!==move.orderId||to.orderId!==move.orderId||
      from.factionId!==move.fromFactionId||to.factionId!==move.toFactionId||
      from.factionId===to.factionId||
      !Number.isSafeInteger(move.qty)||move.qty<1||
      !Number.isSafeInteger(move.fromBefore)||!Number.isSafeInteger(move.fromAfter)||
      !Number.isSafeInteger(move.toBefore)||!Number.isSafeInteger(move.toAfter)||
      move.fromBefore-move.fromAfter!==move.qty||
      move.toAfter-move.toBefore!==move.qty||
      move.fromAfter<1||move.toBefore<0||
      !move.reason||!move.commandId||
      !s.log.some(e=>e.commandId===move.commandId&&['faction.multi.transfer','faction.grade.transfer'].includes(e.type)))
    issues.push(String(move.id)+': histórico de transferência parcial sem origem/destino ou saldo válido');
   transferIds.add(move.id);
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
 return Object.freeze({version:'1.1.0',ensure,forOrder,allocation,transfer,ret,
  canLegacyReturn,recordLegacyAllocation,recordLegacyReturn,
  reassignLegacy,reverseReturn,inspect,reviseSettlement,inspectRateHistory,resolveRate,setAssignmentRate,inspectAssignmentRates});
});
