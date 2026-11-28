'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),
fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.join(__dirname,'..');
const manualSource=fs.readFileSync(path.join(root,'release-faction-manual-payment-v9566.js'),'utf8');
const acertoSource=fs.readFileSync(path.join(root,'release-faction-acerto-consolidated-v95102.js'),'utf8');
const acerto=require('../release-faction-acerto-consolidated-v95102.js');
function sandbox(){
 const db={factionMasters:[{id:17,name:'Roseli',active:true,factionRoleV9577:'faccao'}],
  factions:[],factionPayments:[],hubFinanceEntries:[],products:[],projectionInvoices:[]};
 const saved=[];
 const window={db,renderFactionPayments(){return true},addEventListener(){},
  hlgbWalIdbGuard9536:{probe:async()=>true,ids:()=>[],status:()=>({readFailed:false})},
  hlgbRecordSaveWithRetry:async(module,id,data)=>{
   saved.push({module,id:String(id),data:structuredClone(data)});
   return {applied:true,data:structuredClone(data)};
  }};
 const document={addEventListener(){},getElementById(){return null}};
 const context={window,document,db,console,Date,Math,Intl,JSON,Number,Error,
  setTimeout(){return 1},btoa,atob,Uint8Array,Blob};
 vm.createContext(context);
 vm.runInContext(manualSource,context,{filename:'release-faction-manual-payment-v9566.js'});
 return {api:window.hlgbFactionManual9566,db,saved,window};
}
const basic=(fields={})=>({
 factionName:'Roseli',date:'2026-11-17',status:'Pendente',method:'',note:'Pagamento de produção',
 lines:[{id:'avulso-modelo-v95102',kind:'product',productId:'',
  unregistered:true,manualProductName:'Camisola nova sem preço de venda',
  quantity:40,unitPrice:2.5,priceOrigin:'manual-avulso'}],...fields
});
test('costura com modelo avulso não exige preço de venda ou produto cadastrado',async()=>{
 const {api,db,saved}=sandbox(),input=basic(),snapshot=JSON.stringify(db.products);
 const data=api.validate(input);
 assert.equal(data.serviceMode,'faccao');
 assert.equal(data.total,100);
 assert.equal(data.lines[0].productId,null);
 assert.equal(data.lines[0].productName,'Camisola nova sem preço de venda');
 assert.equal(data.lines[0].description,'Camisola nova sem preço de venda');
 assert.equal(data.lines[0].priceOrigin,'manual-avulso');
 const result=await api.persistDraft(input,null);
 assert.equal(result.total,100);
 assert.equal(db.factionPayments.length,1);
 assert.equal(db.factionPayments[0].manual,true);
 assert.equal(db.factionPayments[0].manualKindV9566,'product');
 assert.equal(db.factionPayments[0].manualProductNameV9589,'Camisola nova sem preço de venda');
 assert.equal(db.factionPayments[0].productId,null);
 assert.equal(db.factionPayments[0].unitPrice,2.5);
 assert.equal(db.factionPayments[0].status,'Pendente');
 assert.equal(db.hubFinanceEntries.length,0,'salvamento pendente não inventa pagamento ao fornecedor');
 assert.equal(db.projectionInvoices.length,0,'pagamento avulso não emite nota sem preço');
 assert.equal(JSON.stringify(db.products),snapshot,'não inventar produto nem venda');
 assert.deepEqual(saved.map(x=>x.module),['factionPayments']);
});
test('nome vazio ou valor unitário zero continuam bloqueados',()=>{
 const {api}=sandbox();
 for(const input of [
  basic({lines:[{id:'a',kind:'product',productId:'',quantity:1,unitPrice:1}]}),
  basic({lines:[{id:'b',kind:'product',productId:'',unregistered:true,
   manualProductName:'',quantity:1,unitPrice:2}]}),
  basic({lines:[{id:'c',kind:'product',productId:'',unregistered:true,
   manualProductName:'Camisola',quantity:1,unitPrice:0}]}),
  basic({lines:[{id:'d',kind:'product',productId:'',unregistered:true,
   manualProductName:'Camisola',quantity:0,unitPrice:3}]})
 ])assert.throws(()=>api.validate(input),/produto cadastrado|modelo|valor unitário|Quantidade inválida/i);
});
test('produto cadastrado sem preço de venda aceita mão de obra informada',()=>{
 const {api,db}=sandbox();
 db.products.push({id:21,name:'Conjunto bordado',factionCost:0});
 const data=api.validate(basic({lines:[{id:'a',kind:'product',productId:21,
  quantity:100,unitPrice:1.85}]}));
 assert.equal(data.total,185);
 assert.equal(data.lines[0].productId,21);
 assert.equal(data.lines[0].unitPrice,1.85);
 assert.equal(db.products[0].price,undefined);
});
test('dois pagamentos normais e um avulso para a mesma pessoa viram uma visão consolidada',()=>{
 const manualRows=[{id:'a',manual:true,manualGroupId:'mg1',factionName:'Roseli',
  factionMasterId:'17',status:'Pendente',value:20},
  {id:'b',manual:true,manualGroupId:'mg1',factionName:'Roseli',
   factionMasterId:'17',status:'Pendente',value:25}];
 const data={masters:[{id:'17',name:'Roseli',active:true}],
  payments:[...manualRows,
   {id:'n1',factionName:'ROSELI',factionMasterId:'17',status:'Pendente',value:60,
    scheduledPaymentDate:'2026-11-10'},
   {id:'n2',factionName:'Roséli',factionMasterId:'17',status:'Pendente',value:15,
    scheduledPaymentDate:'2026-11-17'},
   {id:'paid',factionName:'Roseli',status:'Pago',value:200,paidAmount:200}],
  manualGroups:[{id:'mg1',status:'Pendente',factionName:'Roseli',date:'2026-11-17',
   total:45,rows:manualRows}]};
 const snapshot=JSON.stringify(data),out=acerto.consolidate(data);
 assert.equal(out.groups.length,1);
 assert.equal(out.groups[0].sourceCount,3,'um acerto proposto, 3 origens preservadas');
 assert.equal(out.groups[0].totalCents,12000);
 assert.equal(out.groups[0].manualCents,4500,'grupo avulso conta uma vez');
 assert.equal(out.groups[0].regularCents,7500);
 assert.deepEqual(out.groups[0].uniqueDates,['2026-11-10','2026-11-17']);
 assert.equal(out.scope,'apenas_visual_sem_baixa');
 assert.equal(out.productionPayment,false);
 assert.equal(out.warnings.length,0);
 assert.equal(JSON.stringify(data),snapshot,'somente leitura');
});
test('pagamentos pagos, cancelados ou parcialmente recebidos não entram no acerto pendente',()=>{
 const data={masters:[],manualGroups:[],payments:[
  {id:'a',status:'Pago',factionName:'Roseli',value:40,paidAmount:40},
  {id:'b',status:'Cancelado',factionName:'Roseli',value:50},
  {id:'c',status:'Pendente',factionName:'Roseli',value:100,paidAmount:20},
  {id:'d',status:'Pendente',factionName:'Roseli',value:12.34,paidAmount:0}
 ]};
 const out=acerto.consolidate(data);
 assert.equal(out.groups.length,1);
 assert.equal(out.groups[0].totalCents,1234);
 assert.equal(out.groups[0].sourceCount,1);
 assert.deepEqual(out.groups[0].paymentIds,['d']);
 assert.ok(out.warnings.some(x=>x.includes('pagamento-parcial')));
});
test('saldo parcial conciliado preserva o alerta legado para situação divergente',()=>{
 const result=acerto.consolidate({masters:[{id:'m',name:'Facção A'}],manualGroups:[],payments:[
  {id:'a',factionMasterId:'m',factionName:'Facção A',status:'Parcial',value:100,paidAmount:20,discountAmount:5,paymentHistory:[{id:'ev',paid:20,discount:5}]},
  {id:'b',factionMasterId:'m',factionName:'Facção A',status:'Pendente',value:100,paidAmount:20}
 ]});
 assert.equal(result.groups[0].totalCents,7500);
 assert.ok(result.warnings.includes('pagamento-parcial-requer-conferencia:b'));
 assert.match(acerto.printablePending(result,'master:m',true),/75,00/);
});
test('facções homônimas com IDs diferentes nunca são misturadas',()=>{
 const data={masters:[{id:'100',name:'Maria',active:true},
  {id:'101',name:'Mária',active:true}],
  manualGroups:[],payments:[
  {id:'a',factionName:'Maria',factionMasterId:'100',status:'Pendente',value:80},
  {id:'b',factionName:'Mária',factionMasterId:'101',status:'Pendente',value:90},
  {id:'c',factionName:'Maria',status:'Pendente',value:20}
 ]};
 const out=acerto.consolidate(data);
 assert.equal(out.groups.length,3,'ambiguidade não vira baixa única');
 assert.equal(out.groups.reduce((n,g)=>n+g.totalCents,0),19000);
 assert.ok(out.groups.every(x=>x.identityAmbiguous));
});
test('grupo avulso misto ou sem referência não pode contaminar valor da pessoa',()=>{
 const manual=[{id:'m1',manual:true,manualGroupId:'mg1',factionName:'Ge',
  status:'Pendente',value:10},
  {id:'m2',manual:true,manualGroupId:'mg1',factionName:'Ge',
   status:'Pago',value:20}];
 const out=acerto.consolidate({masters:[],payments:manual,
  manualGroups:[{id:'mg1',status:'Pendente',total:30,rows:manual}]});
 assert.equal(out.groups.length,0);
 assert.ok(out.warnings.some(x=>x.includes('grupo-avulso-misto')));
});
test('carregamento segue após plugin avulso e não acessa APIs externas',()=>{
 const boot=fs.readFileSync(path.join(root,'app-stable3.html'),'utf8');
 const old=boot.indexOf("'release-faction-manual-payment-v9566.js'");
 const next=boot.indexOf("'release-faction-acerto-consolidated-v95102.js'");
 assert.ok(old>=0&&next>old,'novo acerto somente depois da dependência');
 assert.ok(manualSource.includes("kind==='product'||kind==='embalagem'||kind==='travetada'"));
 assert.ok(manualSource.includes("window.hlgbFactionAcertoUnified95102?.render?.()"));
 for(const re of [/\bfetch\s*\(/,/\bXMLHttpRequest\b/,/\bWebSocket\b/,
  /\bsupabase\b/i,/https?:\/\//,/localStorage|indexedDB/])
  assert.equal(re.test(acertoSource),false,'consolidação não deve escrever ou enviar dados '+re);
});

test('identidade repetida exclui ambas as cópias do total normal',()=>{
 const data={masters:[],manualGroups:[],payments:[
  {id:'dup',status:'Pendente',factionName:'Roseli',value:80},
  {id:'dup',status:'Pendente',factionName:'Roseli',value:90},
  {id:'safe',status:'Pendente',factionName:'Roseli',value:20},
  {id:'removed',status:'Pendente',factionName:'Roseli',value:500,deleted_at:'2026-11-20'}
 ]},before=JSON.stringify(data),out=acerto.consolidate(data);
 assert.equal(out.groups[0].totalCents,2000);assert.deepEqual(out.groups[0].paymentIds,['safe']);
 assert.ok(out.warnings.some(x=>x.includes('duplicado')));assert.equal(JSON.stringify(data),before);
});
test('grupo duplicado, linhas desatualizadas ou pessoas diferentes não entram no total',()=>{
 const a={id:'a',manual:true,manualGroupId:'mg',factionName:'Roseli',status:'Pendente',value:20};
 const b={...a,id:'b',value:25};
 const group={id:'mg',status:'Pendente',total:45,rows:[a,b]};
 for(const data of [
  {payments:[a,b],manualGroups:[group,group]},
  {payments:[a,{...b,value:30}],manualGroups:[group]},
  {payments:[a,{...b,factionName:'Vanessa'}],manualGroups:[{...group,rows:[a,{...b,factionName:'Vanessa'}]}]}
 ]){const before=JSON.stringify(data),out=acerto.consolidate(data);assert.equal(out.groups.length,0);assert.ok(out.warnings.length);assert.equal(JSON.stringify(data),before)}
 const valid=acerto.consolidate({payments:[a,b],manualGroups:[group]});assert.equal(valid.groups[0].totalCents,4500);
});

test('resumo por data preserva saldos normais, avulsos e data desconhecida',()=>{
 const g={totalCents:10000,entries:[{kind:'normal',paymentId:'1',amountCents:4000,date:'2026-11-25'},{kind:'avulso',groupId:'g',amountCents:2000,date:'2026-11-25'},{kind:'normal',paymentId:'2',amountCents:3000,date:'2026-11-26'},{kind:'normal',paymentId:'3',amountCents:1000,date:'2026-02-30'}]};const before=JSON.stringify(g);const x=acerto.dateBreakdown(g,true);assert.equal(x.state,'local-date-summary');assert.deepEqual(x.rows,[{date:'2026-11-25',normalCents:4000,manualCents:2000,totalCents:6000,count:2},{date:'2026-11-26',normalCents:3000,manualCents:0,totalCents:3000,count:1},{date:null,normalCents:1000,manualCents:0,totalCents:1000,count:1}]);assert.equal(x.canWrite,false);assert.equal(acerto.dateBreakdown({...g,totalCents:9999},true).state,'review');assert.equal(acerto.dateBreakdown({...g,entries:[g.entries[0],g.entries[0]],totalCents:8000},true).state,'review');assert.equal(acerto.dateBreakdown(g,false).state,'review');assert.equal(JSON.stringify(g),before);
});

test('demonstrativo consolidado preserva produtos, travetadas, ajustes, semanas e saldo',()=>{const a={id:'internal-id-1',manual:true,manualGroupId:'mg',factionName:'Diego',factionMasterId:'m',status:'Pendente',description:'Travetada — Body Monara',manualKindV9566:'travetada',quantity:130,travetaPointsPerPieceV9592:10,unitPrice:.05,value:65,scheduledPaymentDate:'2026-11-20'},b={...a,id:'internal-id-2',description:'Camisola Plus Cyrlene',quantity:65,travetaPointsPerPieceV9592:6,value:19.5};const data={masters:[{id:'m',name:'Diego'}],payments:[a,b,{id:'normal',factionName:'Diego',factionMasterId:'m',status:'Pendente',description:'Costura Body',quantity:10,unitPrice:2,value:20,serviceFinishedAt:'2026-11-27'}],manualGroups:[{id:'mg',status:'Pendente',date:'2026-11-20',total:79.5,rows:[a,b],directAdjustments:[{kind:'abater',amount:5,reason:'Adiantamento'}]}]};const before=JSON.stringify(data),r=acerto.consolidate(data),g=r.groups[0],e=g.entries.find(e=>e.kind==='avulso');assert.equal(g.totalCents,9950);assert.equal(e.nominalCents,8450);assert.equal(e.details[0].displayQty,1300);assert.equal(e.detailVerified,true);assert.equal(acerto.groupWeeks(g).length,2);const html=acerto.printablePending(r,'master:m',true);for(const s of ['Body Monara','Camisola Plus Cyrlene','1.300','0,05','65,00','19,50','Adiantamento','99,50','Avulso original','Entrega não comprovada','SALDO GERAL DE CONSULTA'])assert.ok(html.includes(s),s);assert.ok(!html.includes('internal-id-'));assert.equal(JSON.stringify(data),before);assert.equal(acerto.weekSummary({...e,details:[{referenceDate:'2026-11-20'},{referenceDate:'2026-11-27'}]}).key,null);assert.equal(acerto.weekSummary({details:[{referenceDate:'2026-11-20'},{}]}).basis,null);});

test('Cirlene: duas notas enviadas em semanas diferentes, entregues juntas, somente registros comprovados',()=>{
 const make=(id,more)=>({id,factionMasterId:'f',factionName:'Cirlene',status:'Pendente',quantity:20,unitPrice:2,value:40,...more});
 const payments=[make('p1',{description:'Camisola Juliana',noteNumber:'1873',factionServiceId:'s1',deliveryId:'d1',serviceFinishedAt:'2026-11-19',scheduledPaymentDate:'2026-11-30'}),make('p2',{description:'Camisola Mariana',projectionInvoiceId:'n2',factionServiceId:'s2',deliveryId:'d2',scheduledPaymentDate:'2026-11-27'}),make('p3',{description:'Ainda não entregue',factionServiceId:'s3',scheduledPaymentDate:'2026-11-27'}),make('p4',{description:'Entrega da semana anterior',factionServiceId:'s4',deliveryId:'d4',scheduledPaymentDate:'2026-11-27'}),make('paid',{status:'Pago',paidAmount:40,description:'NÃO REPETIR',factionServiceId:'s5',deliveryId:'d5'})];
 const data={payments,masters:[{id:'f',name:'Cirlene'}],manualGroups:[],factions:[{id:'s1',sentAt:'2026-11-16',deliveryHistory:[{id:'d1',date:'2026-11-23',qty:20}]},{id:'s2',sentAt:'2026-11-23',orderId:'o2',deliveryHistory:[{id:'d2',date:'2026-11-27',qty:20}]},{id:'s3',deliveryHistory:[]},{id:'s4',deliveryHistory:[{id:'d4',date:'2026-11-20',qty:20}]},{id:'s5',deliveryHistory:[{id:'d5',date:'2026-11-27',qty:20}]}],orders:[{id:'o2',orderNumber:'99'}],projectionInvoices:[{id:'n2',noteNumber:'1875',orderId:'o2'}]};
 const before=JSON.stringify(data),r=acerto.consolidate(data),g=r.groups[0],groups=acerto.groupWeeks(g),w=groups.find(w=>w.key==='delivery:2026-11-23');assert.equal(groups.length,3);assert.equal(w.totalCents,8000);assert.equal(w.entries.length,2);
 const html=acerto.printablePending(r,g.key,true,w.scopeKey);assert.equal((html.match(/class="week-products"/g)||[]).length,1);for(const s of ['Nota 1873','Nota 1875','Pedido 99','Camisola Juliana','Camisola Mariana','80,00','Entregas registradas','TOTAL LÍQUIDO A CONFERIR'])assert.ok(html.toLowerCase().includes(s.toLowerCase()),s);for(const s of ['Ainda não entregue','Entrega da semana anterior','NÃO REPETIR','160,00'])assert.ok(!html.includes(s),s);
 const general=acerto.printablePending(r,g.key,true);assert.ok(general.includes('SALDO GERAL DE CONSULTA'));assert.ok(!general.includes('TOTAL LÍQUIDO A CONFERIR'));assert.equal(JSON.stringify(data),before);
 const dup=acerto.consolidate({...data,payments:[...payments,make('dup',{factionServiceId:'s1',deliveryId:'d1'})]});assert.equal(acerto.groupWeeks(dup.groups[0]).find(w=>w.key==='delivery:2026-11-23').totalCents,4000);assert.equal(dup.groups[0].totalCents,12000);assert.equal(dup.warnings.filter(x=>x.includes('entrega-com-pagamento-duplicado')).length,2);
 const wrongQty=acerto.consolidate({...data,factions:data.factions.map(f=>f.id==='s2'?{...f,deliveryHistory:[{id:'d2',date:'2026-11-27',qty:19}]}:f)});assert.equal(acerto.groupWeeks(wrongQty.groups[0]).find(w=>w.key==='delivery:2026-11-23').totalCents,4000);
});

test('avulso com entrega expressamente registrada entra na semana sem usar previsão',()=>{const n={id:'n',factionMasterId:'m',factionName:'Pessoa',status:'Pendente',quantity:10,unitPrice:2,value:20,factionServiceId:'s',deliveryId:'d'},a={id:'a',manual:true,manualGroupId:'g',factionMasterId:'m',factionName:'Pessoa',status:'Pendente',description:'Extra entregue',quantity:5,unitPrice:2,value:10,scheduledPaymentDate:'2026-11-30',manualDeliveryDateV9875:'2026-11-27',manualDeliveryOwnerV9875:'m'},mk=x=>({masters:[{id:'m',name:'Pessoa'}],payments:[n,x],manualGroups:[{id:'g',status:'Pendente',total:10,rows:[x]}],factions:[{id:'s',deliveryHistory:[{id:'d',date:'2026-11-25',qty:10}]}]});const r=acerto.consolidate(mk(a)),g=r.groups[0],w=acerto.groupWeeks(g);assert.equal(w.length,1);assert.equal(w[0].totalCents,3000);assert.ok(acerto.printablePending(r,g.key,true,w[0].scopeKey).includes('Entrega avulsa informada'));for(const bad of [{...a,manualDeliveryDateV9875:undefined},{...a,manualDeliveryOwnerV9875:'other'},{...a,manualDeliveryDateV9875:'2026-11-30'}])assert.equal(acerto.groupWeeks(acerto.consolidate(mk(bad)).groups[0]).length,2);});

test('normal: financial adjustment preview preserves physical delivery and other balances',()=>{const a={id:'n',factionMasterId:'m',factionName:'Pessoa',status:'Pendente',quantity:100,unitPrice:2,value:200,paidAmount:0,discountAmount:0,factionServiceId:'s',deliveryId:'d'},b={...a,id:'n2',factionServiceId:'s2',deliveryId:'d2',quantity:50,value:100};const data={masters:[{id:'m',name:'Pessoa'}],payments:[a,b],manualGroups:[],factions:[{id:'s',deliveryHistory:[{id:'d',date:'2026-11-25',qty:100}]},{id:'s2',deliveryHistory:[{id:'d2',date:'2026-11-26',qty:50}]}]};const input={payableQuantity:90,unitPrice:2.5,reason:'Conferência manual da remuneração'},before=JSON.stringify(data),p=acerto.normalAdjustmentPreview(data,'master:m','n',input,true);assert.equal(p.state,'preview-only');assert.equal(p.deliveredQuantity,100);assert.equal(p.payableQuantity,90);assert.equal(p.proposedCents,22500);assert.equal(p.previousWeekCents,30000);assert.equal(p.proposedWeekCents,32500);assert.equal(p.canWrite,false);assert.equal(JSON.stringify(data),before);assert.equal(acerto.normalAdjustmentPreview(data,'master:m','n',{...input,payableQuantity:101},true).reason,'quantity-range');assert.equal(acerto.normalAdjustmentPreview(data,'master:m','n',input,false).reason,'permission');assert.equal(acerto.normalAdjustmentPreview({...data,factions:[]},'master:m','n',input,true).reason,'delivery-or-value-proof');assert.equal(acerto.normalAdjustmentPreview({...data,payments:[{...a,paidAmount:10,status:'Parcial'},b]},'master:m','n',input,true).reason,'not-wholly-pending');assert.equal(acerto.normalAdjustmentPreview({...data,factions:[{...data.factions[0],travetaPricingVersion:'v1'},data.factions[1]]},'master:m','n',input,true).reason,'special-pricing');});

test('adjusted normal receipt separates physical and payable quantity, preserves original source and permits new preview',()=>{const a={id:'p',factionMasterId:'m',factionName:'Cirlene',status:'Pendente',quantity:100,unitPrice:2.5,value:225,paidAmount:0,discountAmount:0,factionServiceId:'s',deliveryId:'d',noteNumber:'1873',settlementAdjustmentV9879:{reference:'ok',actor:'fixture',deliveredQuantity:100,payableQuantity:90,deliveryDate:'2026-11-25',previousPayableQuantity:100,previousUnitCents:200,unitCents:250,previousCents:20000,totalCents:22500,reason:'Conferência manual'}},mk=x=>({masters:[{id:'m',name:'Cirlene'}],payments:[x],manualGroups:[],factions:[{id:'s',deliveryHistory:[{id:'d',date:'2026-11-25',qty:100}]}]});const data=mk(a),before=JSON.stringify(data),r=acerto.consolidate(data),e=r.groups[0].entries[0],d=e.details[0];assert.equal(d.quantity,100);assert.equal(d.displayQty,90);assert.equal(e.amountCents,22500);const html=acerto.printablePending(r,'master:m',true);for(const word of ['Entregues: 100','Remuneradas: 90','Nota 1873','225,00','Conferência manual'])assert.ok(html.includes(word),word);const next=acerto.normalAdjustmentPreview(data,'master:m','p',{payableQuantity:80,unitPrice:2.5,reason:'Segunda conferência'},true);assert.equal(next.previousPayableQuantity,90);assert.equal(next.proposedCents,20000);assert.equal(JSON.stringify(data),before);for(const bad of [{...a.settlementAdjustmentV9879,payableQuantity:110},{...a.settlementAdjustmentV9879,totalCents:20000},{...a.settlementAdjustmentV9879,deliveryDate:'2026-11-24'},null]){const x=acerto.consolidate(mk({...a,settlementAdjustmentV9879:bad}));assert.equal(x.groups.length,0);assert.ok(x.warnings.some(w=>w.includes('ajuste-de-remuneracao-sem-evidencia')));}});

test('weekly conference uses real delivery membership, exact full amount, no writes, and blocks local Hub links',()=>{const a={id:'p1',factionMasterId:'m',factionName:'Cirlene',status:'Pendente',quantity:100,unitPrice:2.5,value:225,paidAmount:0,discountAmount:0,factionServiceId:'s',deliveryId:'d',settlementAdjustmentV9879:{reference:'ok',actor:'fixture',deliveredQuantity:100,payableQuantity:90,deliveryDate:'2026-11-25',previousPayableQuantity:100,previousUnitCents:200,unitCents:250,previousCents:20000,totalCents:22500,reason:'Conferência manual'}},b={...a,id:'p2',quantity:50,unitPrice:2,value:100,factionServiceId:'s2',deliveryId:'d2'},m={id:'a1',manual:true,manualGroupId:'av',manualDeliveryDateV9875:'2026-11-27',manualDeliveryOwnerV9875:'m',factionMasterId:'m',factionName:'Cirlene',status:'Pendente',quantity:15,unitPrice:2,value:30},other={id:'other',factionMasterId:'m',factionName:'Cirlene',status:'Pendente',quantity:10,unitPrice:2,value:20,scheduledPaymentDate:'2026-11-27'};delete b.settlementAdjustmentV9879;const data={masters:[{id:'m',name:'Cirlene'}],payments:[a,b,m,other],manualGroups:[{id:'av',status:'Pendente',total:30,rows:[m]}],factions:[{id:'s',deliveryHistory:[{id:'d',date:'2026-11-25',qty:100}]},{id:'s2',deliveryHistory:[{id:'d2',date:'2026-11-26',qty:50}]}],hub:[]},before=JSON.stringify(data);const run=d=>acerto.weeklyPaymentPreview(d,'master:m','delivery:2026-11-23',true);const x=run(data);assert.equal(x.state,'local-conference-only');assert.equal(x.totalCents,35500);assert.equal(x.items.length,3);assert.equal(x.items.find(i=>i.id==='p1').payableQuantity,90);assert.equal(x.expectedHubEntries,1);assert.equal(x.canWrite,false);assert.equal(JSON.stringify(data),before);assert.equal(run({...data,hub:[{sourceId:'av',status:'Realizado'}]}).reason,'linked-hub');assert.equal(run({...data,hub:[{paymentIds:['p1'],status:'Realizado'}]}).reason,'linked-hub');assert.equal(run({...data,payments:[a,b,m,other,{...a,id:'dup'}]}).reason,'warnings');assert.equal(acerto.weeklyPaymentPreview(data,'master:m','delivery:2026-11-23',false).reason,'permission');});
