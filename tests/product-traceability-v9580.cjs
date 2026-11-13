'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const src=fs.readFileSync('release-product-traceability-v9580.js','utf8');
const boot=fs.readFileSync('app-stable3.html','utf8');
assert(boot.includes("'release-product-traceability-v9580.js'"),'trace module registered in loader');
new vm.Script(src);
const cp=x=>JSON.parse(JSON.stringify(x));
const p={id:'p1',name:'Camisola Melina',active:true,price:55,materials:[{name:'Renda',qty:1}]};
const o={id:'o1',orderNumber:100,client:'Dell',date:'2026-11-11',
 grade:[{productId:'p1',qty:400,color:'Preto',size:'P'},{productId:'p1',qty:600,color:'Preto',size:'M'}],
 items:[{productId:'p1',qty:1000}]};
const db={products:[p],orders:[o],
 cuts:[{id:'c1',productId:'p1',orderId:'o1',pieces:1000,status:'Finalizado',cutterId:'cutter1',
  actualCutGrade:[{color:'Preto',size:'P',qty:400},{color:'Preto',size:'M',qty:600}],date:'2026-11-11'}],
 cutters:[{id:'cutter1',name:'Arisergio'}],
 production:[{id:'pr1',productId:'p1',orderId:'o1',planned:1000,done:950,productionLocationId:'loc1',stage:'Finalizada',
  date:'2026-11-12'}],
 productionLocations:[{id:'loc1',name:'Interno'}],
 factions:[{id:'f1',productId:'p1',orderId:'o1',name:'Roseli',sent:300,done:280,returned:270,price:1.5,
  sentAt:'2026-11-11'}],
 factionPayments:[{id:'pay1',productId:'p1',factionName:'Roseli',quantity:270,unitPrice:1.5,value:405,
  paidAmount:405,paymentDate:'2026-11-12',status:'Pago'}],
 materialChecklists:[{id:'chk1',productId:'p1',orderId:'o1',destinationName:'Roseli',receivedBy:'Fran',
  qty:300,createdAt:'2026-11-11',status:'Recebido'}]};
let cloud=cp(p),writes=0,pending=false,fail=false,canRead=true;
const w={db,__HLGB_AUTH_READY:true,addEventListener(){},hlgbWalIdbGuard9536:{
 probe:async()=>true,ids:()=>pending?['products::p1']:[],status:()=>({readFailed:false})},
 cloudRequest:async(path)=>{
  assert(path.includes('module=eq.products'));assert(path.includes('entity_id=eq.p1'));
  return canRead?[{module:'products',entity_id:'p1',data:cp(cloud),deleted_at:null}]:[];
 },
 hlgbRecordSaveWithRetry:async(m,id,data)=>{
  assert.equal(m,'products');assert.equal(id,'p1');writes++;
  if(fail)return {applied:false,reason:'RPC recusou'};
  cloud=cp(data);return {applied:true,data:cp(data)};
 }};
const ctx={window:w,document:{readyState:'loading',addEventListener(){}},JSON,Date,Math,Map,Set,
 Promise,console,encodeURIComponent,setTimeout(){}};
vm.createContext(ctx);vm.runInContext(src,ctx);
const api=w.hlgbProductTraceability9580;
assert.equal(api.version,'95.80');
const events=api.timeline('p1');
assert(events.some(x=>x.kind==='pedido'));
assert(events.some(x=>x.kind==='corte'&&x.details.cutters.includes('Arisergio')&&x.details.grade.includes('400')));
assert(events.some(x=>x.kind==='producao'&&x.details.location==='Interno'));
assert(events.some(x=>x.kind==='faccao'&&x.details.person==='Roseli'&&x.details.quantitySent===300&&x.details.amountIsEstimate===true));
assert(events.some(x=>x.kind==='pagamento'&&x.details.amountPaid===405));
assert(events.some(x=>x.kind==='checklist-material'&&x.details.receivedBy==='Fran'));
assert.equal(events.find(x=>x.kind==='pedido').details.quantity,1000,'order grade and items cannot be double counted');
assert(events.filter(x=>x.kind!=='pagamento').every(x=>x.orderId==='o1'));
assert(events.some(x=>x.kind==='pagamento'&&x.orderId===''),'do not invent an order link for an unlinked payment');
assert.equal(api.timeline('p1',{orderId:'not-this'}).length,0);
(async()=>{
 const initial=JSON.stringify(db);
 pending=true;
 await assert.rejects(()=>api.createRound('p1',{name:'Lote 1',actor:'Cyrlene',orderId:'o1'}),/pendente/);
 assert.equal(JSON.stringify(db),initial);
 assert.equal(writes,0,'pending product must not write');
 pending=false;fail=true;
 await assert.rejects(()=>api.createRound('p1',{name:'Lote 1',actor:'Cyrlene'}),/RPC recusou/);
 assert.equal(JSON.stringify(db),initial);
 fail=false;canRead=false;
 await assert.rejects(()=>api.createRound('p1',{name:'Lote 1',actor:'Cyrlene'}),/não encontrado na nuvem/);
 canRead=true;
 await assert.rejects(()=>api.createRound('p1',{name:'Bad',actor:'',orderId:'o1'}),/responsável/);
 await assert.rejects(()=>api.createRound('p1',{name:'Bad',actor:'Cyrlene',orderId:'missing'}),/não contém/);
 const first=await api.createRound('p1',{name:'Corte de 1000',actor:'Cyrlene',orderId:'o1'});
 assert(first.ok);const id=first.event.id;
 assert.equal(api.roundsFor('p1').length,1);
 assert.equal(api.roundsFor('p1')[0].createdBy,'Cyrlene');
 const complete=await api.toggleStep('p1',id,'corte',true,{actor:'Arisergio',note:'400 P, 600 M conferidas'});
 assert(complete.ok);
 assert.equal(api.roundState(api.roundsFor('p1')[0]).corte,true);
 await assert.rejects(()=>api.toggleStep('p1',id,'corte',true,{actor:'Arisergio'}),/já está marcada/);
 await api.toggleStep('p1',id,'corte',false,{actor:'Arisergio',note:'Recontagem'});
 const hist=api.roundsFor('p1')[0].events;
 assert(hist.length===3,'creation, completion, and reversal recorded as distinct events');
 assert.equal(hist[1].previous,false);
 assert.equal(hist[2].previous,true);
 assert.equal(hist[2].checked,false);
 assert.equal(api.roundState(api.roundsFor('p1')[0]).corte,false);
 const second=await api.createRound('p1',{name:'Estoque interno',actor:'Quesia'});
 assert.equal(api.roundsFor('p1').length,2);
 assert.equal(api.roundsFor('p1')[1].orderId,'');
 assert.equal(api.roundState(api.roundsFor('p1')[1]).corte,false,'each lot independent');
 assert.equal(db.products[0].price,55);
 assert.deepEqual(db.products[0].materials,p.materials);
 assert.equal(db.orders[0].status,o.status);
 assert.equal(db.cuts[0].status,'Finalizado');
 assert.equal(db.factionPayments[0].paidAmount,405);
 assert.equal(api.timeline('p1').filter(x=>x.kind==='checklist-produto').length,4,'two creations and two genuine state changes; rejected duplicate is not an event');
 assert.match(src,/Checklist de produtos/);
 assert.match(src,/Rastreamento de produtos/);
 console.log('PASS v95.80: actual trace timeline, payment-vs-estimate truth, independent checklist rounds, audit events, ACK/readback, WAL guard and preservation');
})().catch(e=>{console.error(e);process.exitCode=1});
