/*
 * HLGB Evolução — Motor de cálculo de demonstração v1.
 * Funções puras, sem banco, rede, WAL, storage ou efeitos em pagamentos.
 * Não é implementação de salvamento transacional nem homologação de paridade.
 */
(function(root, factory){
 'use strict';
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 else if(root)root.HLGBEvolucaoCalculosV1=api;
})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 const MAX=100000000;
 function fail(msg){throw new Error(msg)}
 function moneyCents(value){
  if(typeof value!=='string'&&typeof value!=='number')fail('Informe um valor monetário.');
  let s=String(value).trim().replace(/^R\$\s*/i,'');
  if(!/^\d+(?:[,.]\d{1,2})?$/.test(s))fail('Valor monetário inválido. Use até duas casas decimais.');
  const parts=s.replace(',','.').split('.');
  const c=Number(parts[0])*100+Number((parts[1]||'').padEnd(2,'0'));
  if(!Number.isSafeInteger(c)||c>MAX)fail('Valor fora do limite desta simulação.');
  return c;
 }
 function quantity(value){
  const n=Number(value);
  if(!Number.isSafeInteger(n)||n<1||n>1000000)fail('Quantidade deve ser um inteiro positivo até 1.000.000.');
  return n;
 }
 function validReason(text,minimum=5,maximum=700){
  const s=String(text||'').trim();
  if(s.length<minimum||s.length>maximum)fail('Informe motivo de '+minimum+' a '+maximum+' caracteres.');
  return s;
 }
 function positiveCents(value){
  const c=moneyCents(value);
  if(!c)fail('Informe valor maior que zero.');
  return c;
 }
 function sumCents(values){
  return values.reduce(function(a,b){const n=a+b;if(!Number.isSafeInteger(n)||n>MAX*10)fail('Soma fora do limite.');return n},0);
 }
 function previewLine(line){
  if(!line||typeof line!=='object')fail('Linha de serviço inválida.');
  const kind=String(line.kind||'product');
  if(!['product','embalagem','travetada','service'].includes(kind))fail('Tipo de serviço inválido.');
  const qty=quantity(line.quantity);
  const unit=positiveCents(line.unitPrice);
  const points=kind==='travetada'?quantity(line.pointsPerPiece):1;
  if(points>100)fail('Máximo de 100 travetadas por peça.');
  const perPiece=unit*points;
  const discount=moneyCents(line.travetaDiscountUnit??0);
  if(kind==='travetada'&&discount!==0)fail('Serviço exclusivo de travetada não aceita desconto de travetada.');
  if(discount>perPiece)fail('Desconto de travetada maior que o valor da peça.');
  const gross=qty*perPiece,discountTotal=qty*discount,net=gross-discountTotal;
  if(!Number.isSafeInteger(gross)||gross>MAX)fail('Linha excede o limite permitido.');
  return {kind,qty,points,unitCents:unit,grossCents:gross,travetaDiscountCents:discountTotal,netCents:net};
 }
 function previewGroup(input){
  if(!input||!Array.isArray(input.lines)||input.lines.length===0)fail('Inclua ao menos uma linha no acerto.');
  if(input.lines.length>1000)fail('Muitas linhas no acerto demonstrativo.');
  const lineResults=input.lines.map(previewLine),grossCents=sumCents(lineResults.map(x=>x.grossCents));
  const travetaDiscountCents=sumCents(lineResults.map(x=>x.travetaDiscountCents));
  let beforeCents=grossCents-travetaDiscountCents;
  const adjustments=Array.isArray(input.adjustments)?input.adjustments:[];
  if(adjustments.length>25)fail('No máximo 25 ajustes diretos por edição.');
  const ids=new Set();
  let directCents=0;
  adjustments.forEach(function(a){
   const id=String(a.id||'').trim(),kind=String(a.kind||'');
   if(!id||ids.has(id))fail('Identificador de ajuste ausente ou repetido.');
   ids.add(id);
   if(!['abater','acrescentar'].includes(kind))fail('Escolha Abater ou Acrescentar.');
   validReason(a.reason);
   const v=positiveCents(a.amount);
   directCents+=kind==='abater'?-v:v;
  });
  const applications=Array.isArray(input.applications)?input.applications:[];
  const appliedIds=new Set();
  let crossCents=0;
  applications.forEach(function(a){
   const id=String(a.id||'').trim();
   if(!id||appliedIds.has(id))fail('Compensação repetida ou sem identificação.');
   appliedIds.add(id);
   if(a.sourceStatus!=='Pago'||a.targetStatus!=='Pendente')fail('Compensação exige origem paga e destino pendente.');
   if(!a.sourceFactionId||!a.targetFactionId||String(a.sourceFactionId)!==String(a.targetFactionId))
    fail('Compensação apenas para a mesma facção cadastrada.');
   if(!['a_mais','a_menos'].includes(a.kind))fail('Tipo de compensação inválido.');
   const value=positiveCents(a.amount),available=moneyCents(a.available);
   if(value>available)fail('Compensação superior ao saldo da diferença de origem.');
   crossCents+=a.kind==='a_mais'?-value:value;
  });
  const netCents=beforeCents+directCents+crossCents;
  if(!Number.isSafeInteger(netCents)||netCents<=0||netCents>MAX)
   fail('Total líquido deve ser maior que zero e não ultrapassar o limite.');
  const allocations=allocateLines(lineResults.map(x=>x.netCents),netCents);
  return {lines:lineResults,grossCents,travetaDiscountCents,beforeCents,
   directCents,crossCents,netCents,allocationsCents:allocations};
 }
 function allocateLines(amounts,targetCents){
  const rows=amounts.slice(),subtotal=sumCents(rows);
  let difference=targetCents-subtotal;
  if(difference>=0){rows[0]+=difference}
  else{
   let credit=-difference;
   for(let i=0;i<rows.length&&credit;i++){
    const portion=Math.min(rows[i],credit);rows[i]-=portion;credit-=portion;
   }
   if(credit)fail('Crédito excede as linhas de serviço.');
  }
  if(sumCents(rows)!==targetCents)fail('Rateio não conciliado.');
  return rows;
 }
 function correctionRemaining(input){
  const amount=positiveCents(input.amount);
  const ids=new Set();
  const applied=sumCents((Array.isArray(input.applications)?input.applications:[]).map(function(a){
   const id=String(a.id||'');
   if(!id||ids.has(id))fail('Aplicação duplicada ou sem ID.');
   ids.add(id);
   return positiveCents(a.amount);
  }));
  if(applied>amount)fail('Compensações ultrapassam o valor original.');
  return {originalCents:amount,appliedCents:applied,remainingCents:amount-applied};
 }
 function invoiceSummary(input){
  if(!input)fail('Acerto de nota inválido.');
  const total=positiveCents(input.total),cash=moneyCents(input.received||0);
  const events=Array.isArray(input.returns)?input.returns:[];
  const eventIds=new Set();
  let credit=0;
  for(const e of events){
   if(!e.id||eventIds.has(String(e.id)))fail('Devolução duplicada ou sem ID.');
   eventIds.add(String(e.id));validReason(e.reason,1,180);
   if(e.reversedAt)continue;
   credit+=positiveCents(e.amount);
  }
  if(cash>total)fail('Recebimento acumulado ultrapassa o valor da nota.');
  if(cash+credit>total)fail('Abatimentos ultrapassam o saldo após recebimentos.');
  const next=moneyCents(input.nextPayment||0);
  if(next>total-cash-credit)fail('Recebimento parcial excede o saldo disponível.');
  const receivedCents=cash+next,remainingCents=total-receivedCents-credit;
  const status=remainingCents>1?(receivedCents>0||credit>0?'Parcial':'Pendente'):(credit>0?'Compensado por devolução':'Pago');
  return {totalCents:total,priorReceivedCents:cash,nextPaymentCents:next,receivedCents,creditCents:credit,remainingCents,status};
 }
 return Object.freeze({version:'demo-v1',moneyCents,previewLine,previewGroup,allocateLines,correctionRemaining,invoiceSummary});
});
