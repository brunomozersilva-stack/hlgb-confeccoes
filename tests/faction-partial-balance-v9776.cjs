'use strict';
const assert=require('node:assert/strict');
const api=require('../release-faction-acerto-consolidated-v95102.js');
const make=(id,extra={})=>({id,factionName:'Facção A',factionMasterId:'a',value:100,paidAmount:0,discountAmount:0,status:'Pendente',...extra});
const rows=[make('normal',{discountAmount:5}),make('partial',{status:'Parcial',value:200,paidAmount:50,discountAmount:10,paymentHistory:[{id:'p1',paid:50,discount:10}]}),make('bad',{status:'Parcial',paidAmount:40}),make('over',{status:'Parcial',paidAmount:90,discountAmount:20}),make('mismatch',{status:'Parcial',paidAmount:20,paymentHistory:[{id:'p',paid:30}]}),make('duplicate'),make('duplicate'),make('paid',{status:'Pago',paidAmount:100})];
const input={payments:rows,masters:[{id:'a',name:'Facção A'}],manualGroups:[]},before=JSON.stringify(input);
const v=api.consolidate(input);assert.equal(v.groups.length,1);const g=v.groups[0];assert.equal(g.totalCents,23500);assert.equal(g.regularCents,23500);assert.equal(g.entries.length,2);assert.equal(g.entries.find(e=>e.paymentId==='partial').amountCents,14000);assert.equal(g.entries.find(e=>e.paymentId==='partial').paidCents,5000);assert.equal(g.entries.find(e=>e.paymentId==='partial').discountCents,1000);assert.equal(v.warnings.length,5);assert.equal(v.productionPayment,false);assert.equal(JSON.stringify(input),before);
console.log('PASS faction partial balances, discount, duplicate protection and no mutation');


const html=api.printablePending(v,g.key,true);
assert.match(html,/Conferência de acerto/);assert.match(html,/Não é recibo/);assert.match(html,/140,00/);assert.match(html,/95,00/);assert.match(html,/235,00/);assert.match(html,/5 alerta/);
assert.throws(()=>api.printablePending(v,g.key,false));
assert.throws(()=>api.printablePending({...v,groups:[{...g,identityAmbiguous:true}]},g.key,true));
assert.throws(()=>api.printablePending({...v,groups:[{...g,totalCents:1}]},g.key,true));
const escaped=api.printablePending({...v,groups:[{...g,factionName:'<script>danger</script>'}]},g.key,true);assert.match(escaped,/&lt;script&gt;/);assert.doesNotMatch(escaped,/<script>/);
console.log('PASS compact pending settlement print, amounts, permission and escaping');
