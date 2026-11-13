'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const src=fs.readFileSync('release-product-traceability-v9580.js','utf8');
new vm.Script(src);
const copy=x=>JSON.parse(JSON.stringify(x));
const product={id:'model1',name:'Camisola Melina',price:35,materials:[{name:'Renda',qty:1}]};
const db={products:[copy(product)],orders:[],cuts:[{id:'cut0',productId:'model1',status:'Finalizado',pieces:120}],production:[],
 factionPayments:[{id:'payment0',productId:'model1',paidAmount:90,value:90,status:'Pago'}]};
let remote=copy(product),pending=false,failSave=false,readable=true,saves=0;
const w={db,__HLGB_AUTH_READY:true,addEventListener(){},hlgbWalIdbGuard9536:{probe:async()=>true,ids:()=>pending?['products::model1']:[],status:()=>({readFailed:false})},
 cloudRequest:async(path)=>{assert(path.includes('module=eq.products')&&path.includes('entity_id=eq.model1'));
  return readable?[{entity_id:'model1',module:'products',data:copy(remote),deleted_at:null}]:[]},
 hlgbRecordSaveWithRetry:async(module,id,row)=>{
  assert.equal(module,'products');assert.equal(id,'model1');
  saves++;if(failSave)return {applied:false,reason:'Servidor recusou'};
  remote=copy(row);return {applied:true,data:copy(row)};
 }};
const ctx={window:w,document:{readyState:'loading',addEventListener(){}},console,Date,Math,Set,JSON,Promise,encodeURIComponent,setTimeout(){}};
vm.createContext(ctx);vm.runInContext(src,ctx);
const api=w.hlgbProductTraceability9580;
(async()=>{
 assert.equal(api.version,'95.80');assert(api.WORK_STAGES.length>=5);
 const round=await api.createRound('model1',{name:'Pedido 1000',actor:'Chefe do corte'});
 const id=round.event.id;
 assert.equal(api.roundsFor('model1').length,1);
 await assert.rejects(()=>api.addWorkEvent('model1',id,{stage:'corte',actor:'',quantity:100}),/responsável/);
 await assert.rejects(()=>api.addWorkEvent('model1',id,{stage:'corte',actor:'Diego',quantity:0}),/quantidade/);
 await assert.rejects(()=>api.addWorkEvent('model1',id,{stage:'corte',actor:'Diego',quantity:1.2}),/quantidade/);
 await assert.rejects(()=>api.addWorkEvent('model1',id,{stage:'cobranca',actor:'Diego',quantity:100}),/etapa válida/);
 assert.equal(api.roundsFor('model1')[0].events.length,1,'invalid work events do not mutate product');
 pending=true;
 await assert.rejects(()=>api.addWorkEvent('model1',id,{stage:'corte',actor:'Diego',quantity:100}),/pendente/);
 pending=false;
 failSave=true;
 await assert.rejects(()=>api.addWorkEvent('model1',id,{stage:'corte',actor:'Diego',quantity:100}),/Servidor recusou/);
 failSave=false;
 const before=copy(db);
 const a=await api.addWorkEvent('model1',id,{stage:'corte',actor:'Diego',quantity:100,
  grade:'Preto: P 20 / M 40 / G 40',destination:'Roseli',note:'Conferido por duas pessoas'});
 assert.equal(a.event.kind,'work');assert.equal(a.event.actor,'Diego');assert.equal(a.event.quantity,100);
 assert.equal(a.event.grade,'Preto: P 20 / M 40 / G 40');assert.equal(a.event.destination,'Roseli');
 const b=await api.addWorkEvent('model1',id,{stage:'producao',actor:'Roseli',quantity:96,grade:'P 18 / M 40 / G 38'});
 assert.equal(b.event.stage,'producao');
 const x=api.timeline('model1').filter(e=>e.kind==='execucao');
 assert.equal(x.length,2);
 assert(x.some(e=>e.details.actor==='Diego'&&e.details.quantity===100&&e.details.grade.includes('M 40')&&e.details.destination==='Roseli'));
 assert(x.some(e=>e.details.actor==='Roseli'&&e.details.quantity===96));
 assert.equal(db.products[0].price,35);
 assert.equal(db.cuts[0].status,before.cuts[0].status);
 assert.equal(db.factionPayments[0].paidAmount,90,'does not change actual financial records');
 const savedBefore=db.products[0].productChecklistsV9580[0].events.length;
 readable=false;
 await assert.rejects(()=>api.addWorkEvent('model1',id,{stage:'embalagem',actor:'Maria',quantity:96}),/não encontrado na nuvem/);
 readable=true;
 assert.equal(db.products[0].productChecklistsV9580[0].events.length,savedBefore);
 assert.match(src,/Registrar responsável e quantidade executada/);
 assert.match(src,/não lança pagamentos nem altera a grade/);
 assert(saves>=3);
 console.log('PASS v95.81: responsible worker, actual grade, quantity and destination as confirmed events; no WAL, production, grade or financial mutation');
})().catch(e=>{console.error(e);process.exitCode=1});
