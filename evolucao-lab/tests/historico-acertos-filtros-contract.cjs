'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const q=require('../modulos/historico-acertos-filtros-v2.js');
const s=()=>({
 clients:[{id:'C1',name:'Cliente A'},{id:'C2',name:'Cliente B'}],
 factions:[{id:'F1',name:'Facção Alfa'},{id:'F2',name:'Facção Beta'}],
 products:[{id:'P1',name:'Modelo A'}],
 orders:[{id:'O1',clientId:'C1',productId:'P1'},{id:'O2',clientId:'C2',productId:'P1'}],
 settlements:[
 {id:'A1',orderId:'O1',factionId:'F1',productId:'P1',qty:20,amountCents:2000,status:'pago'},
 {id:'A2',orderId:'O2',factionId:'F1',productId:'P1',qty:10,amountCents:1000,status:'aberto'},
 {id:'A3',orderId:null,factionId:'F2',productId:'P1',qty:5,amountCents:500,status:'aberto'}],
 finance:[
 {id:'T1',sourceId:'A1',kind:'pagar',amountCents:2000,status:'pago',paidDate:'2026-11-20',dueDate:'2026-11-19'},
 {id:'T2',sourceId:'A2',kind:'pagar',amountCents:1000,status:'aberto',dueDate:'2026-11-25'},
 {id:'T3',sourceId:'A3',kind:'pagar',amountCents:500,status:'aberto'}],
 settlementCompensations:[],paymentBatches:[]});
test('filtra cliente e faccao mantendo totais e leitura imutavel',()=>{
 const state=s(),before=JSON.stringify(state),r=q.query(state,{clientId:'C1',factionId:'F1'});
 assert.deepEqual(r.entries.map(x=>x.id),['A1']);
 assert.equal(r.totals.pieces,20);assert.equal(r.totals.totalCents,2000);
 assert.equal(JSON.stringify(state),before);assert.equal(r.readOnly,true);
});
test('data de pagamento apenas quando existe, informa excluidos sem data',()=>{
 const r=q.query(s(),{dateField:'pagamento',from:'2026-11-01',to:'2026-11-30'});
 assert.deepEqual(r.entries.map(x=>x.id),['A1']);
 assert.equal(r.excludedUndated,2);
});
test('data de vencimento nao confunde data de pagamento',()=>{
 const r=q.query(s(),{dateField:'vencimento',from:'2026-11-24',to:'2026-11-30'});
 assert.deepEqual(r.entries.map(x=>x.id),['A2']);
 assert.equal(r.excludedUndated,1);
});
test('sem data pode ser incluido explicitamente, sem datacao falsa',()=>{
 const r=q.query(s(),{dateField:'pagamento',from:'2026-11-20',to:'2026-11-20',includeUndated:true});
 assert.equal(r.entries.length,3);assert.equal(r.entries.find(x=>x.id==='A3').paidDate,null);
});
test('filtra um acerto individual e estado, sem somar duas vezes',()=>{
 const r=q.query(s(),{status:'aberto',settlementId:'A2',groupBy:'cliente',view:'separado'});
 assert.equal(r.groups[0].name,'Cliente B');assert.equal(r.totals.openCents,1000);
 assert.equal(r.totals.paidCents,0);
});
test('rejeita periodo sem base de data e datas invalidas',()=>{
 assert.throws(()=>q.query(s(),{from:'2026-11-01'}),/Escolha/);
 assert.throws(()=>q.query(s(),{dateField:'pagamento',from:'2026-11-31'}),/invalido/);
 assert.throws(()=>q.query(s(),{dateField:'vencimento',from:'2026-11-30',to:'2026-11-01'}),/invalido/);
});
