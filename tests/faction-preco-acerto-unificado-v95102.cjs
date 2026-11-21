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
