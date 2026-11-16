/* HLGB Evolução · operações integradas exclusivamente fictícias; nenhuma rede ou dado empresarial. */
(function(root,factory){
 'use strict';const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 else if(root)root.HLGBOperationalLab=api;
})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 const clone=x=>JSON.parse(JSON.stringify(x)),sizes=['P','M','G','GG'];
 const makeGrade=()=>({P:0,M:0,G:0,GG:0});
 const sum=x=>Object.values(x).reduce((a,b)=>a+b,0);
 const money=c=>(c/100).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
 const count=(s,prefix)=>(s.ids[prefix]||0)+1;
 const next=(s,prefix)=>{s.ids[prefix]=count(s,prefix);return prefix+'-'+String(s.ids[prefix]).padStart(4,'0')};
 function initial(){
  return {schema:'hlgb-evolucao-operacao-ficticia-v1',revision:1,period:'2026-11',ids:{CLI:2,FOR:2,MAT:3,PRO:3,FAC:2,FUN:2,IMP:1},
   clients:[{id:'CLI-0001',name:'Loja Exemplo Centro'},{id:'CLI-0002',name:'Cliente Simulado Online'}],
   suppliers:[{id:'FOR-0001',name:'Tecidos Fictícios'},{id:'FOR-0002',name:'Aviamentos Modelo'}],
   materials:[{id:'MAT-0001',name:'Malha (g)',stockGrams:16000,priceCentsKg:2800},
    {id:'MAT-0002',name:'Renda (g)',stockGrams:8000,priceCentsKg:4200},
    {id:'MAT-0003',name:'Tule (g)',stockGrams:12000,priceCentsKg:1800}],
   products:[{id:'PRO-0001',sku:'DEMO-MELINA',name:'Camisola Melina',materialId:'MAT-0001',gramsPerUnit:120,priceCents:3990},
    {id:'PRO-0002',sku:'DEMO-TAMMY',name:'Calcinha Tammy',materialId:'MAT-0002',gramsPerUnit:45,priceCents:1590},
    {id:'PRO-0003',sku:'DEMO-CRYSTAL',name:'Doll Crystal',materialId:'MAT-0003',gramsPerUnit:100,priceCents:4990}],
   factions:[{id:'FAC-0001',name:'Oficina Exemplo A',unitCents:550,traveta:true},
    {id:'FAC-0002',name:'Oficina Exemplo B',unitCents:600,traveta:false}],
   employees:[{id:'FUN-0001',name:'Ana Simulada',salaryCents:200000,passageCents:12000,extrasCents:0,discountCents:0},
    {id:'FUN-0002',name:'Bianca Modelo',salaryCents:180000,passageCents:8000,extrasCents:0,discountCents:3000}],
   orders:[],cutPlans:[],purchaseOrders:[],settlements:[],finance:[],stockLedger:[],factionTransfers:[],errors:[],
   prints:[{id:'IMP-0001',name:'Chaveiro articulado fictício',grams:28,priceCents:490,stock:12}],
   log:[],role:'supervisor',flags:{autoCorrections:false},revisionProof:'seed'};
 }
 const get=(s,list,id,label)=>{const result=s[list].find(x=>x.id===id);if(!result)throw Error((label||list)+': escolha um cadastro disponível.');return result};
 const int=(x,label,min=0,max=1000000)=>{if(!Number.isSafeInteger(x)||x<min||x>max)throw Error(label+' deve ser inteiro entre '+min+' e '+max+'.');return x};
 const name=(x,label)=>{if(typeof x!=='string'||!x.trim()||x.trim().length>95)throw Error(label+' deve ter entre 1 e 95 caracteres.');return x.trim()};
 const gradeValid=g=>g&&typeof g==='object'&&sizes.every(k=>Number.isSafeInteger(g[k])&&g[k]>=0)&&Object.keys(g).length===4;
 const quantities=o=>({ordered:sum(o.grade),cut:sum(o.cut),allocated:o.allocated,returned:o.returned,separated:o.separated,shipped:o.shipped});
 const totalCost=(q,price)=>Math.ceil(q*price/1000);
 function inspect(s){
  const problems=[];
  for(const o of s.orders){
   const q=quantities(o);
   if(!gradeValid(o.grade)||!gradeValid(o.cut)||sizes.some(sz=>o.cut[sz]>o.grade[sz]))
    problems.push(o.id+': grade inválida ou corte acima do pedido');
   if(!(q.ordered>=q.cut&&q.cut>=q.allocated&&q.allocated>=q.returned&&q.returned>=q.separated&&q.separated>=q.shipped))
    problems.push(o.id+': baixa operacional sem quantidade anterior');
   if(o.allocated>0&&!o.factionId)problems.push(o.id+': facção não identificada');
   const linkedReturned=s.settlements.filter(a=>a.orderId===o.id).reduce((n,a)=>n+a.qty,0);
   if(linkedReturned!==o.returned)problems.push(o.id+': soma dos acertos não corresponde ao retorno');
  }
  const plans=Array.isArray(s.cutPlans)?s.cutPlans:[];
  for(const plan of plans){
   const o=s.orders.find(x=>x.id===plan.orderId),product=o&&s.products.find(x=>x.id===o.productId);
   if(!o||!product||!gradeValid(plan.grade)||sum(plan.grade)<1)problems.push(plan.id+': folha ou grade inválida');
   if(!['aberto','concluido','cancelado'].includes(plan.status))problems.push(plan.id+': status inválido');
   if(o&&product&&plan.theoreticalGrams!==sum(plan.grade)*product.gramsPerUnit)
    problems.push(plan.id+': peso teórico incompatível com a ficha');
   if(!['interno','externo'].includes(plan.workMode)||!plan.cutterOne||!plan.cutterTwo||!plan.spreader)
    problems.push(plan.id+': equipe de corte incompleta');
   if(plan.status==='concluido'){
    const tx=s.stockLedger.filter(x=>x.cutPlanId===plan.id&&x.type==='corte-planejado');
    if(tx.length!==1||tx[0].deltaGrams!==-(plan.usefulGrams+plan.scrapGrams)||
      !plan.signatureOne||!plan.signatureTwo||plan.usefulGrams<plan.theoreticalGrams||plan.scrapGrams<0)
     problems.push(plan.id+': peso, assinatura ou movimento de estoque sem conferência');
   }else if(s.stockLedger.some(x=>x.cutPlanId===plan.id))
    problems.push(plan.id+': folha não concluída com movimento de estoque');
  }
  for(const o of s.orders){
   const open=plans.filter(x=>x.orderId===o.id&&x.status==='aberto');
   for(const sz of sizes){
    if(o.cut[sz]+open.reduce((n,x)=>n+x.grade[sz],0)>o.grade[sz])
     problems.push(o.id+': reserva de corte '+sz+' acima da grade');
   }
  }
  for(const settlement of s.settlements){
   const linked=s.finance.filter(x=>x.sourceId===settlement.id&&x.kind==='pagar');
   if(linked.length!==1||linked[0].amountCents!==settlement.amountCents||
      (linked[0].status==='pago')!==(settlement.status==='pago')||
      !Number.isSafeInteger(settlement.amountCents)||settlement.amountCents<=0)
    problems.push(settlement.id+': acerto e título financeiro divergentes');
   if(settlement.productId&&!s.products.some(x=>x.id===settlement.productId))
    problems.push(settlement.id+': produto do acerto não localizado');
  }
  for(const move of (s.factionTransfers||[])){
   if(!s.orders.some(x=>x.id===move.orderId)||!s.factions.some(x=>x.id===move.fromFactionId)||
      !s.factions.some(x=>x.id===move.toFactionId)||move.fromFactionId===move.toFactionId)
    problems.push(move.id+': troca de facção inválida');
  }
  if(s.materials.some(m=>m.stockGrams<0))problems.push('Estoque de material negativo');
  if(s.finance.some(e=>e.amountCents<=0))problems.push('Lançamento financeiro não positivo');
  if(new Set(s.log.map(e=>e.commandId)).size!==s.log.length)problems.push('Identificador de comando duplicado');
  const allIds=[...s.orders,...(s.cutPlans||[]),...(s.factionTransfers||[]),...s.purchaseOrders,...s.settlements,...s.finance,...s.clients,...s.suppliers,
   ...s.materials,...s.products,...s.factions,...s.employees,...s.prints].map(x=>x.id);
  if(new Set(allIds).size!==allIds.length)problems.push('IDs de registro duplicados');
  return {ok:!problems.length,problems,orderCount:s.orders.length,unpaid:s.finance.filter(f=>f.status==='aberto').length,
   pendingCut:s.orders.filter(o=>sum(o.cut)<sum(o.grade)).length,
   pendingReturn:s.orders.filter(o=>o.allocated>o.returned).length,
   pendingShipment:s.orders.filter(o=>o.separated>o.shipped).length,
   stockWarnings:s.materials.filter(m=>m.stockGrams<5000).map(m=>m.name)};
 }
 function totals(s){
  const pay=s.finance.filter(x=>x.kind==='pagar'),recv=s.finance.filter(x=>x.kind==='receber');
  return {orders:s.orders.length,pieces:s.orders.reduce((a,o)=>a+sum(o.grade),0),
   cut:s.orders.reduce((a,o)=>a+sum(o.cut),0),
   returned:s.orders.reduce((a,o)=>a+o.returned,0),
   shipped:s.orders.reduce((a,o)=>a+o.shipped,0),
   openPayables:pay.filter(x=>x.status==='aberto').reduce((a,x)=>a+x.amountCents,0),
   openReceivables:recv.filter(x=>x.status==='aberto').reduce((a,x)=>a+x.amountCents,0),
   passage:s.employees.reduce((a,e)=>a+e.passageCents,0),
   salaryCash:s.employees.reduce((a,e)=>a+e.salaryCents+e.extrasCents-e.discountCents+e.passageCents,0)};
 }
 function tips(s){
  const res=[];
  const h=inspect(s);
  if(h.pendingCut)res.push(h.pendingCut+' pedido(s) aguardam corte parcial ou total');
  if(h.pendingReturn)res.push(h.pendingReturn+' pedido(s) têm retorno de facção pendente');
  if(h.pendingShipment)res.push(h.pendingShipment+' pedido(s) aguardam despacho');
  if(h.unpaid)res.push(h.unpaid+' lançamento(s) financeiros em aberto');
  if(h.stockWarnings.length)res.push('Material baixo: '+h.stockWarnings.join(', '));
  if(!res.length)res.push('Nenhuma pendência nas regras deste laboratório fictício');
  return res;
 }
 function apply(previous,command){
  if(!previous||previous.schema!=='hlgb-evolucao-operacao-ficticia-v1')throw Error('Documento de laboratório inválido.');
  if(!command||typeof command!=='object'||!command.type)throw Error('Ação inválida.');
  if(previous.log.length>3000)throw Error('Histórico do exercício atingiu o limite seguro; exporte antes de prosseguir.');
  if(command.expectedRevision!==previous.revision)throw Error('CONFLITO: outra aba alterou o laboratório. Recarregue e confira antes de repetir.');
  const uid=name(command.commandId,'ID do comando');
  if(previous.log.some(x=>x.commandId===uid))throw Error('Comando já registrado. Não duplicar.');
  const s=clone(previous),p=command.payload||{},kind=command.type;
  if(!Array.isArray(s.cutPlans))s.cutPlans=[]; // migração segura apenas do documento fictício anterior
  if(!Array.isArray(s.factionTransfers))s.factionTransfers=[];
  const num=(field,min=0,max=1000000)=>int(p[field],field,min,max);
  let result;
  switch(kind){
  case 'client.add':{const obj={id:next(s,'CLI'),name:name(p.name,'Nome do cliente')};s.clients.push(obj);result=obj.id;break}
  case 'supplier.add':{const obj={id:next(s,'FOR'),name:name(p.name,'Nome do fornecedor')};s.suppliers.push(obj);result=obj.id;break}
  case 'faction.add':{
   const obj={id:next(s,'FAC'),name:name(p.name,'Facção'),unitCents:num('unitCents',1,100000),traveta:p.traveta===true};
   s.factions.push(obj);result=obj.id;break}
  case 'faction.rate.set':{
   const fac=get(s,'factions',p.factionId,'Facção'),product=get(s,'products',p.productId,'Produto');
   const price=num('unitCents',1,100000),reason=name(p.reason,'Justificativa');
   if(!fac.productRates)fac.productRates={};
   const old=fac.productRates[product.id]??fac.unitCents;
   fac.productRates[product.id]=price;
   result=fac.name+' · '+product.name+' · '+old+' → '+price+' centavos · '+reason+
    ' (somente próximos retornos)';break}
  case 'faction.traveta.set':{
   const fac=get(s,'factions',p.factionId,'Facção'),reason=name(p.reason,'Justificativa');
   if(typeof p.traveta!=='boolean')throw Error('Selecione se a facção faz travetada.');
   const previous=fac.traveta;fac.traveta=p.traveta;
   result=fac.name+' · travetada '+String(previous)+' → '+String(fac.traveta)+
    ' · '+reason+' (sem mudar acertos anteriores)';break}
  case 'faction.reassign':{
   const order=get(s,'orders',p.orderId,'Pedido'),newFac=get(s,'factions',p.factionId,'Nova facção');
   const reason=name(p.reason,'Motivo da troca');
   if(!order.factionId||order.allocated<=0)throw Error('Somente pedido já enviado pode trocar de facção.');
   if(order.factionId===newFac.id)throw Error('Escolha uma facção diferente da atual.');
   if(order.returned>0||s.settlements.some(a=>a.orderId===order.id))
    throw Error('Troca bloqueada após retorno/acerto. A operação anterior não pode ser sobrescrita.');
   const oldId=order.factionId;
   order.factionId=newFac.id;
   s.factionTransfers.push({id:next(s,'TRO'),orderId:order.id,fromFactionId:oldId,
    toFactionId:newFac.id,qty:order.allocated,reason,commandId:uid});
   result=order.id+' · '+oldId+' → '+newFac.id+' · '+order.allocated+' peças · '+reason;break}
  case 'material.add':{
   const obj={id:next(s,'MAT'),name:name(p.name,'Material'),stockGrams:0,priceCentsKg:num('priceCentsKg',1,1000000)};
   s.materials.push(obj);result=obj.id;break}
  case 'product.add':{
   const mat=get(s,'materials',p.materialId,'Material');
   const sku=name(p.sku,'SKU').toUpperCase();
   if(s.products.some(x=>x.sku===sku))throw Error('SKU já cadastrado.');
   const obj={id:next(s,'PRO'),sku,name:name(p.name,'Modelo'),materialId:mat.id,
    gramsPerUnit:num('gramsPerUnit',1,5000),priceCents:num('priceCents',100,1000000)};
   s.products.push(obj);result=obj.id;break}
  case 'order.add':{
   const client=get(s,'clients',p.clientId,'Cliente'),product=get(s,'products',p.productId,'Produto');
   const g=p.grade;if(!gradeValid(g)||sum(g)<1||sum(g)>30000)throw Error('Grade inválida, informe quantidade P/M/G/GG.');
   const o={id:next(s,'PED'),clientId:client.id,productId:product.id,grade:clone(g),cut:makeGrade(),
    allocated:0,returned:0,separated:0,shipped:0,factionId:null,priceCents:product.priceCents,issued:false};
   s.orders.push(o);
   const f={id:next(s,'FIN'),kind:'receber',sourceId:o.id,description:'Pedido fictício '+o.id,
    amountCents:sum(g)*o.priceCents,status:'aberto'};
   s.finance.push(f);result=o.id;break}
  case 'order.grade.update':{
   const o=get(s,'orders',p.orderId,'Pedido'),g=p.grade;
   if(!gradeValid(g)||sum(g)<1||sum(g)>30000)throw Error('Grade inválida.');
   const title=s.finance.find(f=>f.sourceId===o.id&&f.kind==='receber');
   if(!title||title.status!=='aberto')throw Error('Pedido com título pago ou não encontrado não pode mudar de grade.');
   for(const sz of sizes){
    const reserved=s.cutPlans.filter(x=>x.orderId===o.id&&x.status==='aberto')
      .reduce((n,x)=>n+x.grade[sz],0);
    if(g[sz]<o.cut[sz]+reserved)
     throw Error('Não pode reduzir '+sz+' abaixo do corte já feito e das folhas abertas.');
   }
   o.grade=clone(g);
   title.amountCents=sum(g)*o.priceCents;
   result=o.id+' · grade alterada com título a receber reconciliado';break}
  case 'cut.plan':{
   const o=get(s,'orders',p.orderId,'Pedido'),g=p.grade;
   if(!gradeValid(g)||sum(g)<1||sum(g)>10000)throw Error('Grade planejada inválida.');
   for(const sz of sizes){
    const reserved=s.cutPlans.filter(x=>x.orderId===o.id&&x.status==='aberto')
     .reduce((n,x)=>n+x.grade[sz],0);
    if(o.cut[sz]+reserved+g[sz]>o.grade[sz])
     throw Error('Quantidade planejada excede a grade disponível em '+sz+'.');
   }
   const product=get(s,'products',o.productId),mat=get(s,'materials',product.materialId);
   if(!['interno','externo'].includes(p.workMode))throw Error('Escolha corte interno ou externo.');
   const cutterOne=name(p.cutterOne,'Cortador 1'),cutterTwo=name(p.cutterTwo,'Cortador 2'),
     spreader=name(p.spreader,'Enfestador');
   if(cutterOne.toLocaleLowerCase('pt-BR')===cutterTwo.toLocaleLowerCase('pt-BR'))
    throw Error('Cortadores 1 e 2 precisam ser pessoas diferentes.');
   const obj={id:next(s,'COR'),orderId:o.id,grade:clone(g),workMode:p.workMode,
    cutterOne,cutterTwo,spreader,materialId:mat.id,theoreticalGrams:sum(g)*product.gramsPerUnit,
    status:'aberto',usefulGrams:null,scrapGrams:null,signatureOne:null,signatureTwo:null,
    createdCommandId:uid,completedCommandId:null};
   s.cutPlans.push(obj);result=obj.id;break}
  case 'cut.plan.update':{
   const plan=get(s,'cutPlans',p.id,'Folha de corte');
   if(plan.status!=='aberto')throw Error('Apenas folha aberta pode ser editada; histórico preservado.');
   if(!gradeValid(p.grade)||sum(p.grade)<1||sum(p.grade)>10000)throw Error('Grade da folha inválida.');
   const o=get(s,'orders',plan.orderId);
   for(const sz of sizes){
    const other=s.cutPlans.filter(x=>x.orderId===o.id&&x.id!==plan.id&&x.status==='aberto')
     .reduce((n,x)=>n+x.grade[sz],0);
    if(o.cut[sz]+other+p.grade[sz]>o.grade[sz])throw Error('Folha alterada excede saldo do tamanho '+sz+'.');
   }
   if(!['interno','externo'].includes(p.workMode))throw Error('Escolha corte interno ou externo.');
   const a=name(p.cutterOne,'Cortador 1'),b=name(p.cutterTwo,'Cortador 2');
   if(a.toLocaleLowerCase('pt-BR')===b.toLocaleLowerCase('pt-BR'))throw Error('Cortadores diferentes são obrigatórios.');
   Object.assign(plan,{grade:clone(p.grade),workMode:p.workMode,cutterOne:a,cutterTwo:b,
    spreader:name(p.spreader,'Enfestador'),
    theoreticalGrams:sum(p.grade)*get(s,'products',o.productId).gramsPerUnit});
   result=plan.id+' · planejamento alterado sem perder histórico';break}
  case 'cut.plan.cancel':{
   const plan=get(s,'cutPlans',p.id,'Folha de corte');
   if(plan.status!=='aberto')throw Error('Somente folha aberta pode ser cancelada.');
   plan.status='cancelado';plan.cancelledCommandId=uid;
   result=plan.id+' · cancelada sem baixar estoque';break}
  case 'cut.plan.complete':{
   const plan=get(s,'cutPlans',p.id,'Folha de corte');
   if(plan.status!=='aberto')throw Error('A folha já foi concluída ou cancelada. Não repetir baixa.');
   const o=get(s,'orders',plan.orderId,'Pedido'),product=get(s,'products',o.productId);
   const material=get(s,'materials',plan.materialId,'Material');
   if(product.materialId!==material.id)throw Error('Material da folha não corresponde à ficha atual.');
   const useful=num('usefulGrams',1,1000000),scrap=num('scrapGrams',0,1000000);
   if(useful<plan.theoreticalGrams)throw Error('Peso útil não pode ser inferior ao consumo teórico do lote.');
   if(useful+scrap>material.stockGrams)throw Error('Peso total (útil + desperdício) excede o estoque disponível.');
   const signOne=name(p.signatureOne,'Conferência do cortador 1'),
     signTwo=name(p.signatureTwo,'Conferência do cortador 2');
   if(signOne.toLocaleLowerCase('pt-BR')!==plan.cutterOne.toLocaleLowerCase('pt-BR')||
      signTwo.toLocaleLowerCase('pt-BR')!==plan.cutterTwo.toLocaleLowerCase('pt-BR'))
    throw Error('As duas conferências digitadas precisam corresponder aos cortadores do planejamento.');
   for(const sz of sizes)if(o.cut[sz]+plan.grade[sz]>o.grade[sz])
    throw Error('Grade mudou; corte não pode exceder o pedido '+sz+'.');
   for(const sz of sizes)o.cut[sz]+=plan.grade[sz];
   material.stockGrams-=useful+scrap;
   s.stockLedger.push({id:next(s,'MOV'),materialId:material.id,deltaGrams:-(useful+scrap),
    usefulGrams:useful,scrapGrams:scrap,cutPlanId:plan.id,sourceId:o.id,
    type:'corte-planejado',commandId:uid});
   Object.assign(plan,{status:'concluido',usefulGrams:useful,scrapGrams:scrap,
    signatureOne:signOne,signatureTwo:signTwo,completedCommandId:uid});
   result=plan.id+' · '+sum(plan.grade)+' peças · usado '+useful+'g · lixo '+scrap+'g';break}
  case 'cut.record':{
   const o=get(s,'orders',p.orderId,'Pedido'),sz=p.size,q=num('qty',1,10000);
   if(!sizes.includes(sz))throw Error('Tamanho inválido.');
   const reserved=s.cutPlans.filter(x=>x.orderId===o.id&&x.status==='aberto')
    .reduce((n,x)=>n+x.grade[sz],0);
   if(o.cut[sz]+reserved+q>o.grade[sz])
    throw Error('Corte excede a grade disponível (incluindo folhas planejadas).');
   const product=get(s,'products',o.productId),material=get(s,'materials',product.materialId);
   const cost=q*product.gramsPerUnit;
   if(cost>material.stockGrams)throw Error('Estoque insuficiente de '+material.name+'. Use Compras ou ajuste de estoque.');
   o.cut[sz]+=q;material.stockGrams-=cost;
   s.stockLedger.push({id:next(s,'MOV'),materialId:material.id,deltaGrams:-cost,sourceId:o.id,type:'corte',commandId:uid});
   result=o.id+' / '+sz+' / '+q+' peças';break}
  case 'faction.allocate':{
   const o=get(s,'orders',p.orderId,'Pedido'),fac=get(s,'factions',p.factionId,'Facção'),qty=num('qty',1,10000);
   const q=quantities(o);
   if(q.allocated+qty>q.cut)throw Error('Envio excede a quantidade cortada.');
   if(o.factionId&&o.factionId!==fac.id)throw Error('Esta simulação aceita uma facção por pedido; não sobrescrever destino.');
   o.factionId=fac.id;o.allocated+=qty;result=o.id+' → '+fac.name;break}
  case 'faction.return':{
   const o=get(s,'orders',p.orderId,'Pedido'),qty=num('qty',1,10000);
   if(!o.factionId||o.returned+qty>o.allocated)throw Error('Retorno excede o que foi enviado para a facção.');
   o.returned+=qty;
   const fac=get(s,'factions',o.factionId),product=get(s,'products',o.productId);
   const listUnit=fac.productRates?.[product.id]??fac.unitCents;
   const travetaDiscount=fac.traveta?0:Math.min(listUnit,50);
   const unit=listUnit-travetaDiscount;
   if(unit<=0)throw Error('Preço líquido da facção deve ser positivo.');
   const settlement={id:next(s,'ACE'),orderId:o.id,factionId:fac.id,productId:product.id,
    kind:'retorno',serviceType:'costura',qty,listUnitCents:listUnit,
    travetaCents:travetaDiscount,unitCents:unit,
    adjustmentCents:0,amountCents:qty*unit,description:'Retorno fictício',status:'aberto'};
   s.settlements.push(settlement);
   s.finance.push({id:next(s,'FIN'),kind:'pagar',sourceId:settlement.id,
    description:'Acerto fictício '+settlement.id,amountCents:settlement.amountCents,status:'aberto'});
   result=settlement.id;break}
  case 'settlement.add':{
   const fac=get(s,'factions',p.factionId,'Facção'),product=get(s,'products',p.productId,'Produto');
   if(!['costura','embalagem'].includes(p.serviceType))throw Error('Selecione costura ou embalagem.');
   const qty=num('qty',1,100000),listUnit=num('unitCents',1,100000),
     traveta=num('travetaCents',0,100000),reason=name(p.reason,'Descrição do serviço');
   if(traveta>=listUnit)throw Error('Desconto por travetada não pode zerar ou superar o valor por peça.');
   const netUnit=listUnit-traveta;
   const obj={id:next(s,'ACE'),orderId:null,factionId:fac.id,productId:product.id,
    kind:'avulso',serviceType:p.serviceType,qty,listUnitCents:listUnit,
    travetaCents:traveta,unitCents:netUnit,adjustmentCents:0,
    amountCents:qty*netUnit,description:reason,status:'aberto'};
   s.settlements.push(obj);
   s.finance.push({id:next(s,'FIN'),kind:'pagar',sourceId:obj.id,
    description:'Serviço '+obj.serviceType+' · '+obj.id,amountCents:obj.amountCents,status:'aberto'});
   result=obj.id;break}
  case 'order.separate':{
   const o=get(s,'orders',p.orderId,'Pedido'),qty=num('qty',1,10000);
   if(o.separated+qty>o.returned)throw Error('Separação excede o retorno da facção.');
   o.separated+=qty;result=o.id;break}
  case 'order.ship':{
   const o=get(s,'orders',p.orderId,'Pedido'),qty=num('qty',1,10000);
   if(o.shipped+qty>o.separated)throw Error('Expedição excede a quantidade separada.');
   o.shipped+=qty;result=o.id;break}
  case 'settlement.pieces.return':{
   const x=get(s,'settlements',p.id,'Acerto');
   if(x.status!=='aberto')throw Error('Não é permitido devolver peças após pagamento.');
   const bill=get(s,'finance',s.finance.find(y=>y.sourceId===x.id&&y.kind==='pagar')?.id,'Título a pagar');
   if(bill.status!=='aberto')throw Error('Título já pago impede devolução direta.');
   const qty=num('qty',1,100000),reason=name(p.reason,'Motivo da devolução');
   if(qty>=x.qty)throw Error('Devolução integral não permitida neste fluxo; registre uma correção formal.');
   const newQty=x.qty-qty,newAmount=newQty*x.unitCents+x.adjustmentCents;
   if(newAmount<=0)throw Error('Devolução deixaria acerto sem valor positivo.');
   if(x.orderId){
    const order=get(s,'orders',x.orderId,'Pedido associado');
    if(order.returned-qty<order.separated)throw Error('Devolução excede o saldo não separado deste pedido.');
    order.returned-=qty;
   }
   const before=x.amountCents,oldQty=x.qty;
   x.qty=newQty;x.amountCents=newAmount;
   if(!Array.isArray(x.returns))x.returns=[];
   x.returns.push({commandId:uid,qty,reason,beforeQty:oldQty,afterQty:newQty,
    beforeCents:before,afterCents:newAmount});
   bill.amountCents=newAmount;
   result=x.id+' · '+oldQty+' → '+newQty+' peças · '+reason;break}
  case 'settlement.adjust':{
   const x=get(s,'settlements',p.id,'Acerto');
   if(x.status!=='aberto')throw Error('Acerto pago não pode ser alterado nesta prévia.');
   const bill=get(s,'finance',s.finance.find(f=>f.sourceId===x.id)?.id,'Conta vinculada');
   if(bill.status!=='aberto')throw Error('O título está quitado: ajuste direto bloqueado.');
   const delta=int(p.adjustmentCents,'Ajuste',-1000000,1000000);
   const amount=x.qty*x.unitCents+delta;
   if(amount<=0)throw Error('Acerto não pode ter valor zerado ou negativo.');
   const before=x.amountCents;
   x.adjustmentCents=delta;x.amountCents=amount;
   if(!Array.isArray(x.history))x.history=[];
   x.history.push({commandId:uid,beforeCents:before,afterCents:amount,
    reason:typeof p.reason==='string'&&p.reason.trim()?name(p.reason,'Motivo'):'Ajuste fictício demonstrativo'});
   bill.amountCents=amount;
   result=x.id+' · '+before+' → '+amount+' centavos';break}
  case 'finance.pay':{
   const entry=get(s,'finance',p.id,'Lançamento');
   if(entry.status!=='aberto')throw Error('Lançamento já conferido, evitar pagamento repetido.');
   entry.status='pago';entry.paidDate='2026-11-16';
   const acerto=s.settlements.find(a=>a.id===entry.sourceId);
   if(acerto)acerto.status='pago';
   result=entry.id;break}
  case 'finance.add':{
   if(!['pagar','receber'].includes(p.kind))throw Error('Tipo de lançamento inválido.');
   const entry={id:next(s,'FIN'),kind:p.kind,description:name(p.description,'Descrição'),
    amountCents:num('amountCents',1,100000000),status:'aberto',sourceId:null};
   s.finance.push(entry);result=entry.id;break}
  case 'purchase.add':{
   const material=get(s,'materials',p.materialId,'Material'),supplier=get(s,'suppliers',p.supplierId,'Fornecedor');
   const obj={id:next(s,'COM'),materialId:material.id,supplierId:supplier.id,
    qtyGrams:num('qtyGrams',1,1000000),priceCentsKg:material.priceCentsKg,
    checkerOne:name(p.checkerOne,'Conferente 1'),checkerTwo:name(p.checkerTwo,'Conferente 2'),received:false};
   if(obj.checkerOne.toLowerCase()===obj.checkerTwo.toLowerCase())throw Error('Conferência exige duas pessoas diferentes.');
   s.purchaseOrders.push(obj);result=obj.id;break}
  case 'purchase.receive':{
   const obj=get(s,'purchaseOrders',p.id,'Compra');
   if(obj.received)throw Error('Compra já recebida. Estoque não será duplicado.');
   obj.received=true;
   const material=get(s,'materials',obj.materialId);
   material.stockGrams+=obj.qtyGrams;
   s.stockLedger.push({id:next(s,'MOV'),materialId:obj.materialId,deltaGrams:obj.qtyGrams,
    sourceId:obj.id,type:'compra',commandId:uid});
   s.finance.push({id:next(s,'FIN'),kind:'pagar',sourceId:obj.id,
    description:'Compra fictícia '+obj.id,amountCents:totalCost(obj.qtyGrams,obj.priceCentsKg),status:'aberto'});
   result=obj.id;break}
  case 'stock.adjust':{
   const material=get(s,'materials',p.materialId,'Material'),delta=int(p.deltaGrams,'Ajuste de estoque',-1000000,1000000);
   if(!delta)throw Error('Informe ajuste diferente de zero.');
   if(material.stockGrams+delta<0)throw Error('Não é possível deixar estoque negativo.');
   material.stockGrams+=delta;
   s.stockLedger.push({id:next(s,'MOV'),materialId:material.id,deltaGrams:delta,sourceId:'AJUSTE-DEMO',
    type:'ajuste',commandId:uid,note:name(p.note,'Justificativa')});
   result=material.id;break}
  case 'payroll.update':{
   const e=get(s,'employees',p.id,'Funcionário fictício');
   for(const k of ['salaryCents','passageCents','extrasCents','discountCents'])e[k]=num(k,0,10000000);
   if(e.salaryCents<100||e.discountCents>e.salaryCents+e.extrasCents)throw Error('Valores da folha fictícia inconsistentes.');
   result=e.id;break}
  case 'print.add':{
   const obj={id:next(s,'IMP'),name:name(p.name,'Produto 3D'),
    grams:num('grams',1,1000),priceCents:num('priceCents',100,1000000),stock:num('stock',0,100000)};
   s.prints.push(obj);result=obj.id;break}
  case 'error.add':{
   const obj={id:next(s,'ERR'),message:name(p.message,'Descrição da falha'),status:'aberto',severity:'alta'};
   s.errors.push(obj);result=obj.id;break}
  case 'error.resolve':{
   const err=get(s,'errors',p.id,'Ocorrência');
   if(err.status==='resolvido')throw Error('Ocorrência já marcada como resolvida.');
   err.status='resolvido';result=err.id;break}
  default:throw Error('Operação ainda não implementada neste laboratório: '+kind);
  }
  s.revision++;
  s.revisionProof=uid;
  s.log.push({commandId:uid,revision:s.revision,actor:name(command.actor||'Operador fictício','Operador'),
   type:kind,description:String(result)});
  const condition=inspect(s);
  if(!condition.ok)throw Error('Integridade não aprovada: '+condition.problems.join('; '));
  return {state:s,result,checks:condition};
 }
 return {initial,apply,inspect,totals,tips,quantities,makeGrade,gradeValid,sizes,money};
});
