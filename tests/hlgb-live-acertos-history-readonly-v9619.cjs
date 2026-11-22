'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {summarize}=require('../hlgb-modules/financeiro/acertos-history-readonly-v9619.cjs');
const source=[
 {kind:'faccao',ownerId:'A',entryId:'1',date:'2026-11-20',totalCents:10000,paidCents:4000,creditCents:1000,status:'parcial'},
 {kind:'faccao',ownerId:'A',entryId:'2',date:'2026-11-20',totalCents:2000,paidCents:2000,creditCents:0,status:'pago'},
 {kind:'faccao',ownerId:'B',entryId:'3',date:'2026-11-20',totalCents:4000,paidCents:0,creditCents:0,status:'pendente'},
 {kind:'cliente',ownerId:'A',entryId:'4',date:'2026-11-21',totalCents:6000,paidCents:0,creditCents:1000,status:'aberto'},
 {kind:'funcionario',ownerId:'C',entryId:'5',date:'2026-11-22',totalCents:9000,paidCents:9000,creditCents:0,status:'pago'}
];
test('resumo e detalhes conciliam em centavos sem misturar tipos/IDs',()=>{
 const result=summarize(source);
 assert.equal(result.complete,true);
 assert.equal(result.details.length,5);
 assert.equal(result.groups.length,4);
 const a=result.groups.find(g=>g.kind==='faccao'&&g.ownerId==='A');
 assert.deepEqual([a.count,a.totalCents,a.paidCents,a.creditCents,a.balanceCents],
  [2,12000,6000,1000,5000]);
 assert.equal(result.groups.find(g=>g.kind==='cliente').balanceCents,5000);
});
test('filtra por período, tipo e ID imutável',()=>{
 const result=summarize(source,{kind:'faccao',ownerId:'B',from:'2026-11-19',to:'2026-11-20'});
 assert.equal(result.details.length,1);
 assert.equal(result.details[0].entryId,'3');
});
test('duplicidade e valores incoerentes não entram no total',()=>{
 const result=summarize([...source,source[0],{...source[0],entryId:'bad',paidCents:999999}]);
 assert.equal(result.details.length,5);
 assert.deepEqual(result.errors.map(x=>x.reason),['id-duplicado','valores-inconsistentes']);
 assert.equal(result.complete,false);
});
test('não modifica as entradas originais',()=>{
 const frozen=source.map(x=>Object.freeze({...x}));
 const before=JSON.stringify(frozen);
 summarize(Object.freeze(frozen));
 assert.equal(JSON.stringify(frozen),before);
});
test('rejeita identidade sem ID mesmo com nome igual',()=>{
 const result=summarize([{...source[0],ownerId:''}]);
 assert.equal(result.details.length,0);
 assert.equal(result.complete,false);
});
test('não produz efeito colateral nem depende do browser',()=>{
 assert.equal(typeof global.window,'undefined');
 assert.equal(typeof global.indexedDB,'undefined');
 assert.equal(typeof global.localStorage,'undefined');
 assert.equal(summarize([]).groups.length,0);
});
