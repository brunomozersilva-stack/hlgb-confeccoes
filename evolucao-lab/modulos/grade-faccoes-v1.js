/* HLGB Evolução — Grade por cor e tamanho nas facções (LAB FICTÍCIO).
 * Transações apenas no clone core.apply; sem rede, IndexedDB próprio ou banco de produção.
 * Grade antiga sem cor continua funcionando; classificação exige opt-in antes do primeiro envio.
 */
(function(root,factory){
 'use strict';
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.HLGBLabFactionGradeV1=api;
})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 const sizes=['P','M','G','GG'],byId=(rows,id)=>rows.find(x=>x.id===id);
 const sum=o=>Object.values(o).reduce((n,v)=>n+v,0);
 const normalize=x=>String(x||'').trim().toLocaleLowerCase('pt-BR');
 const colorName=raw=>{
  const color=String(raw||'').trim().replace(/\s+/g,' ');
  if(color.length<2||color.length>40||!/^[\p{L}\p{N} .-]+$/u.test(color))
   throw Error('Cor inválida: use nome de 2 a 40 caracteres, sem símbolos.');
  return color;
 };
 const validQty=(n,max=10000)=>Number.isSafeInteger(n)&&n>=0&&n<=max;
 const hasGrade=o=>Array.isArray(o.colorGrades)&&o.colorGrades.length>0;
 function colorRow(order,raw){
  return (order.colorGrades||[]).find(x=>normalize(x.color)===normalize(raw));
 }
 function makeSummary(order){
  const remaining=Object.fromEntries(sizes.map(sz=>[sz,order.grade[sz]]));
  for(const row of order.colorGrades||[])for(const sz of sizes)
   remaining[sz]-=row.grade[sz];
  return {configured:hasGrade(order),complete:hasGrade(order)&&
   sizes.every(sz=>remaining[sz]===0),remaining};
 }
 function setColor(s,p,ctx){
  const order=byId(s.orders,p.orderId);
  if(!order)throw Error('Pedido não localizado para cadastrar as cores.');
  if(order.allocated>0||s.settlements.some(x=>x.orderId===order.id))
   throw Error('Grade por cor deve ser cadastrada antes do primeiro envio; saldos antigos protegidos.');
  const color=colorName(p.color);
  const grade={};
  for(const size of sizes){
   const q=Number(p.grade?.[size]);
   if(!validQty(q))throw Error('Quantidade inválida para '+size+'.');
   grade[size]=q;
  }
  if(!Array.isArray(order.colorGrades))order.colorGrades=[];
  const existing=colorRow(order,color);
  const others=order.colorGrades.filter(x=>x!==existing);
  for(const size of sizes){
   const used=others.reduce((n,x)=>n+x.grade[size],0);
   if(used+grade[size]>order.grade[size])
    throw Error('Cores ultrapassam a grade do pedido no tamanho '+size+'.');
  }
  if(existing){
   if(sum(grade)===0)order.colorGrades=others;
   else {existing.color=color;existing.grade=grade}
  }else{
   if(sum(grade)===0)throw Error('Nova cor precisa ter pelo menos uma peça.');
   order.colorGrades.push({color,grade});
  }
  return order.id+' · '+color+' · '+sum(grade)+' peças classificadas';
 }
 function requireReady(order){
  if(!makeSummary(order).complete)
   throw Error('Complete a grade de todas as cores e tamanhos do pedido antes de enviar.');
 }
 function key(row,color,size){return row.color===color&&row.size===size}
 function gradeLine(row,color,size){
  return (row.gradeLines||[]).find(x=>key(x,color,size));
 }
 function need(s,p,ctx,assignment){
  const order=byId(s.orders,assignment.orderId);
  if(!order)throw Error('Pedido do envio não encontrado.');
  requireReady(order);
  const color=colorName(p.color),colorDef=colorRow(order,color),size=String(p.size||'');
  if(!sizes.includes(size)||!colorDef)throw Error('Cor ou tamanho não cadastrado na grade deste pedido.');
  const qty=ctx.int(p.qty,'Quantidade de cor/tamanho',1,10000);
  return {order,color:colorDef.color,size,qty};
 }
 function allocate(s,p,ctx,routing){
  const order=byId(s.orders,p.orderId),fac=byId(s.factions,p.factionId);
  if(!order||!fac)throw Error('Pedido ou facção inválidos.');
  requireReady(order);
  const size=String(p.size||''),def=colorRow(order,colorName(p.color));
  if(!sizes.includes(size)||!def)throw Error('Cor ou tamanho não cadastrado.');
  const qty=ctx.int(p.qty,'Peças do envio por cor/tamanho',1,10000);
  const assignments=(s.factionAssignments||[]).filter(x=>x.orderId===order.id);
  const already=assignments.flatMap(x=>x.gradeLines||[])
   .filter(x=>x.color===def.color&&x.size===size)
   .reduce((n,x)=>n+x.sent,0);
  if(already+qty>def.grade[size])
   throw Error('Envio excede a quantidade prevista desta cor e tamanho.');
  const sentSize=assignments.flatMap(x=>x.gradeLines||[]).filter(x=>x.size===size)
   .reduce((n,x)=>n+x.sent,0);
  if(sentSize+qty>order.cut[size])
   throw Error('Envio por tamanho excede o corte registrado de '+size+'.');
  routing.allocation(s,{orderId:order.id,factionId:fac.id,qty},ctx);
  const row=s.factionAssignments.find(x=>x.orderId===order.id&&x.factionId===fac.id);
  if(!row.gradeLines)row.gradeLines=[];
  let line=gradeLine(row,def.color,size);
  if(!line){line={color:def.color,size,sent:0,returned:0};row.gradeLines.push(line)}
  line.sent+=qty;
  return row.id+' · '+def.color+' '+size+' · '+qty+' peças → '+fac.name;
 }
 function ret(s,p,ctx,routing){
  const row=byId(s.factionAssignments||[],p.assignmentId);
  if(!row)throw Error('Envio específico não localizado.');
  const d=need(s,p,ctx,row),line=gradeLine(row,d.color,d.size);
  if(!line||d.qty>line.sent-line.returned)
   throw Error('Retorno excede o saldo pendente desta cor e tamanho na facção.');
  const id=routing.ret(s,{assignmentId:row.id,qty:d.qty},ctx);
  line.returned+=d.qty;
  const settlement=byId(s.settlements,id);
  settlement.color=d.color;settlement.size=d.size;settlement.gradeTracked=true;
  return id+' · '+d.color+' '+d.size+' · '+d.qty+' peças';
 }
 function transfer(s,p,ctx,routing){
  const from=byId(s.factionAssignments||[],p.fromAssignmentId);
  if(!from)throw Error('Envio de origem não localizado.');
  const d=need(s,p,ctx,from),line=gradeLine(from,d.color,d.size);
  if(!line||d.qty>line.sent-line.returned)
   throw Error('Transferência excede saldo pendente desta cor e tamanho.');
  const moveRef=routing.transfer(s,{fromAssignmentId:from.id,toFactionId:p.toFactionId,
   qty:d.qty,reason:p.reason},ctx);
  const move=s.factionPartialTransfers.at(-1);
  const to=byId(s.factionAssignments,move.toAssignmentId);
  line.sent-=d.qty;
  if(line.sent===0&&line.returned===0)
   from.gradeLines=from.gradeLines.filter(x=>x!==line);
  if(!to.gradeLines)to.gradeLines=[];
  let target=gradeLine(to,d.color,d.size);
  if(!target){target={color:d.color,size:d.size,sent:0,returned:0};to.gradeLines.push(target)}
  target.sent+=d.qty;
  move.color=d.color;move.size=d.size;move.gradeTracked=true;
  return moveRef+' · '+d.color+' '+d.size;
 }
 function reverse(s,p,ctx,routing){
  const settlement=byId(s.settlements,p.id);
  if(!settlement||!settlement.gradeTracked)
   throw Error('Acerto de grade por cor/tamanho não localizado.');
  const order=byId(s.orders,settlement.orderId);
  const row=byId(s.factionAssignments||[],settlement.assignmentId);
  if(!order||!row)throw Error('Pedido ou envio do acerto não localizado.');
  if(settlement.status!=='aberto')throw Error('Não é permitido devolver peças após pagamento.');
  const bill=s.finance.find(x=>x.sourceId===settlement.id&&x.kind==='pagar');
  if(!bill||bill.status!=='aberto')throw Error('Título quitado impede devolução direta.');
  const qty=ctx.int(p.qty,'Peças devolvidas',1,10000);
  if(qty>=settlement.qty)throw Error('Devolução integral exige correção formal.');
  if(order.returned-qty<order.separated)
   throw Error('Devolução ultrapassa peças ainda não separadas.');
  const line=gradeLine(row,settlement.color,settlement.size);
  if(!line||line.returned<qty)throw Error('Grade do retorno não conciliada com a facção.');
  const newQty=settlement.qty-qty,
   newAmount=newQty*settlement.unitCents+settlement.adjustmentCents;
  if(newAmount<=0)throw Error('Devolução deixaria valor inválido.');
  const reason=String(p.reason||'').trim();
  if(!reason||reason.length>95)throw Error('Justificativa da devolução obrigatória.');
  routing.reverseReturn(s,settlement,qty);
  order.returned-=qty;line.returned-=qty;
  const before=settlement.amountCents,old=settlement.qty;
  settlement.qty=newQty;settlement.amountCents=newAmount;
  if(!Array.isArray(settlement.returns))settlement.returns=[];
  settlement.returns.push({commandId:ctx.uid,qty,reason,beforeQty:old,afterQty:newQty,
   beforeCents:before,afterCents:newAmount,color:settlement.color,size:settlement.size});
  bill.amountCents=newAmount;
  return settlement.id+' · '+old+' → '+newQty+' · '+settlement.color+' '+settlement.size;
 }
 function inspect(s){
  const problems=[];
  for(const order of s.orders){
   if(!hasGrade(order))continue;
   const names=new Set(),counts=Object.fromEntries(sizes.map(sz=>[sz,0]));
   for(const row of order.colorGrades){
    if(typeof row.color!=='string'||!row.color.trim()||names.has(normalize(row.color))||
       !row.grade||sizes.some(sz=>!validQty(row.grade[sz])))
     problems.push(order.id+': cor duplicada ou grade inválida');
    names.add(normalize(row.color));
    for(const sz of sizes)counts[sz]+=Number(row.grade?.[sz]||0);
   }
   if(sizes.some(sz=>counts[sz]>order.grade[sz]))
    problems.push(order.id+': quantidade de cores ultrapassa pedido');
   const assignments=(s.factionAssignments||[]).filter(x=>x.orderId===order.id);
   if(order.allocated>0&&sizes.some(sz=>counts[sz]!==order.grade[sz]))
    problems.push(order.id+': grade por cor incompleta com peças enviadas');
   for(const assignment of assignments){
    const lines=assignment.gradeLines;
    if(!Array.isArray(lines)){
     problems.push(assignment.id+': envio sem classificação de cor/tamanho');continue;
    }
    const keys=new Set();
    for(const l of lines){
     const k=normalize(l.color)+'|'+l.size,def=colorRow(order,l.color);
     if(keys.has(k)||!def||!sizes.includes(l.size)||
       !validQty(l.sent)||!validQty(l.returned)||l.sent<l.returned||
       !l.sent||normalize(l.color)!==normalize(def.color))
      problems.push(assignment.id+': linha cor/tamanho duplicada ou inválida');
     keys.add(k);
    }
    if(lines.reduce((n,l)=>n+l.sent,0)!==assignment.qtySent||
       lines.reduce((n,l)=>n+l.returned,0)!==assignment.qtyReturned)
     problems.push(assignment.id+': totais cor/tamanho não conferem com envio/retorno');
   }
   for(const sz of sizes){
    const sent=assignments.flatMap(a=>a.gradeLines||[]).filter(l=>l.size===sz)
     .reduce((n,l)=>n+l.sent,0);
    if(sent>order.cut[sz])problems.push(order.id+': peças alocadas excedem corte do tamanho '+sz);
   }
   for(const row of order.colorGrades)for(const sz of sizes){
    const sent=assignments.flatMap(a=>a.gradeLines||[])
     .filter(l=>l.color===row.color&&l.size===sz).reduce((n,l)=>n+l.sent,0);
    if(sent>row.grade[sz])problems.push(order.id+': enviados excedem '+row.color+' '+sz);
   }
   for(const settlement of s.settlements.filter(x=>x.orderId===order.id)){
    if(!settlement.gradeTracked||!colorRow(order,settlement.color)||
       !sizes.includes(settlement.size))
     problems.push(settlement.id+': acerto sem cor/tamanho rastreável');
   }
   for(const assignment of assignments)for(const line of assignment.gradeLines||[]){
    const count=s.settlements.filter(x=>x.assignmentId===assignment.id&&
     x.color===line.color&&x.size===line.size).reduce((n,x)=>n+x.qty,0);
    if(count!==line.returned)
     problems.push(assignment.id+': retorno por cor/tamanho diverge dos acertos '+line.color+' '+line.size);
   }
   for(const m of (s.factionPartialTransfers||[]).filter(x=>x.orderId===order.id)){
    if(!m.gradeTracked||!colorRow(order,m.color)||!sizes.includes(m.size))
     problems.push(m.id+': transferência sem cor/tamanho identificável');
   }
  }
  return problems;
 }
 return Object.freeze({version:'1.0.0',sizes,hasGrade,makeSummary,setColor,allocate,ret,transfer,reverse,inspect});
});
