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
   orders:[],purchaseOrders:[],settlements:[],finance:[],stockLedger:[],errors:[],
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
  }
  if(s.materials.some(m=>m.stockGrams<0))problems.push('Estoque de material negativo');
  if(s.finance.some(e=>e.amountCents<=0))problems.push('Lançamento financeiro não positivo');
  if(new Set(s.log.map(e=>e.commandId)).size!==s.log.length)problems.push('Identificador de comando duplicado');
  const allIds=[...s.orders,...s.purchaseOrders,...s.settlements,...s.finance,...s.clients,...s.suppliers,
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
  const num=(field,min=0,max=1000000)=>int(p[field],field,min,max);
  let result;
  switch(kind){
  case 'client.add':{const obj={id:next(s,'CLI'),name:name(p.name,'Nome do cliente')};s.clients.push(obj);result=obj.id;break}
  case 'supplier.add':{const obj={id:next(s,'FOR'),name:name(p.name,'Nome do fornecedor')};s.suppliers.push(obj);result=obj.id;break}
  case 'faction.add':{
   const obj={id:next(s,'FAC'),name:name(p.name,'Facção'),unitCents:num('unitCents',1,100000),traveta:p.traveta===true};
   s.factions.push(obj);result=obj.id;break}
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
  case 'cut.record':{
   const o=get(s,'orders',p.orderId,'Pedido'),sz=p.size,q=num('qty',1,10000);
   if(!sizes.includes(sz))throw Error('Tamanho inválido.');
   if(o.cut[sz]+q>o.grade[sz])throw Error('Corte excede a grade encomendada.');
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
   const fac=get(s,'factions',o.factionId);
   const unit=fac.unitCents-(fac.traveta?0:Math.min(fac.unitCents,50));
   const settlement={id:next(s,'ACE'),orderId:o.id,factionId:fac.id,qty,unitCents:unit,
    adjustmentCents:0,amountCents:qty*unit,description:'Retorno fictício',status:'aberto'};
   s.settlements.push(settlement);
   s.finance.push({id:next(s,'FIN'),kind:'pagar',sourceId:settlement.id,
    description:'Acerto fictício '+settlement.id,amountCents:settlement.amountCents,status:'aberto'});
   result=settlement.id;break}
  case 'order.separate':{
   const o=get(s,'orders',p.orderId,'Pedido'),qty=num('qty',1,10000);
   if(o.separated+qty>o.returned)throw Error('Separação excede o retorno da facção.');
   o.separated+=qty;result=o.id;break}
  case 'order.ship':{
   const o=get(s,'orders',p.orderId,'Pedido'),qty=num('qty',1,10000);
   if(o.shipped+qty>o.separated)throw Error('Expedição excede a quantidade separada.');
   o.shipped+=qty;result=o.id;break}
  case 'settlement.adjust':{
   const x=get(s,'settlements',p.id,'Acerto');
   if(x.status!=='aberto')throw Error('Acerto pago não pode ser alterado nesta prévia.');
   const delta=int(p.adjustmentCents,'Ajuste',-1000000,1000000);
   const amount=x.qty*x.unitCents+delta;
   if(amount<=0)throw Error('Acerto não pode ter valor zerado ou negativo.');
   x.adjustmentCents=delta;x.amountCents=amount;
   get(s,'finance',s.finance.find(f=>f.sourceId===x.id)?.id,'Conta vinculada').amountCents=amount;
   result=x.id;break}
  case 'finance.pay':{
   const entry=get(s,'finance',p.id,'Lançamento');
   if(entry.status!=='aberto')throw Error('Lançamento já conferido, evitar pagamento repetido.');
   entry.status='pago';entry.paidDate='2026-11-16';result=entry.id;break}
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
