const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const src=fs.readFileSync('release-faction-payments.js','utf8');
let oldSyncCalls=0,oldPayCalls=0,oldSeparateCalls=0,oldGroupCalls=0;const alerts=[];
const db={
 factions:[
  {id:1,name:'Cris',sent:1078,done:1078,paymentByDeliveryV9135:true,paymentSeparated:true,status:'Finalizado'},
  {id:2,name:'Legada',sent:100,done:100,paymentSeparated:true,status:'Finalizado'}
 ],
 factionPayments:[
  {id:11,factionServiceId:1,factionName:'Cris',quantity:1077,status:'Pendente',scheduledPaymentDate:'2026-09-11'},
  {id:12,factionServiceId:1,factionName:'Cris',quantity:1078,status:'Pendente',scheduledPaymentDate:'2026-09-07'},
  {id:21,factionServiceId:2,factionName:'Legada',quantity:100,status:'Pendente',scheduledPaymentDate:'2026-09-11'}
 ]
};
const window={
 syncFactionPayments(){oldSyncCalls++;for(const f of db.factions.filter(x=>x.paymentSeparated===true)){const p=db.factionPayments.find(x=>String(x.factionServiceId)===String(f.id));if(p)p.quantity=f.done}},
 separateFactionForPayment(){oldSeparateCalls++;return true},
 payFactionPayment(){oldPayCalls++;return true},
 hlgbPayFactionGroup9230(){oldGroupCalls++;return true}
};
const document={getElementById(){return null}};
const ctx=vm.createContext({db,window,document,alert:m=>alerts.push(String(m)),console,setTimeout(){}});
vm.runInContext(src,ctx);
window.syncFactionPayments();
assert.equal(oldSyncCalls,1);
assert.equal(db.factionPayments.find(p=>p.id===11).quantity,1077,'per-delivery payment must not be rewritten by accumulated done');
assert.equal(db.factionPayments.find(p=>p.id===21).quantity,100,'legacy valid faction remains supported');
assert.equal(db.factions[0].paymentSeparated,true,'temporary protection must restore in-memory flag');
assert.equal(window.separateFactionForPayment(1),false);
assert.equal(oldSeparateCalls,0,'per-delivery faction must not enter legacy separation');
assert.equal(window.separateFactionForPayment(2),true);
assert.equal(oldSeparateCalls,1);
assert.equal(window.payFactionPayment(11),false,'over-accounted payment must be blocked');
assert.equal(oldPayCalls,0);
assert.match(alerts.at(-1),/Pagamento bloqueado por segurança/);
assert.equal(window.payFactionPayment(21),true,'valid legacy payment must still be payable');
assert.equal(oldPayCalls,1);
const bad=window.hlgbFactionPaymentOverAccounted(db.factions[0]);
assert.equal(bad.sum,2155);assert.equal(bad.excess,1077);
const group=window.hlgbFactionPaymentBadGroup('cris||2026-W37');
assert(group&&group.issues.length===1,'Cris weekly group must be recognized as unsafe');
assert.equal(window.hlgbPayFactionGroup9230('cris||2026-W37'),false,'unsafe weekly group must be blocked before modal opens');
assert.equal(oldGroupCalls,0,'unsafe grouped payment must not reach original group-pay function');
assert.match(alerts.at(-1),/Acerto bloqueado por segurança/);
assert.equal(window.hlgbPayFactionGroup9230('legada||2026-W37'),true,'valid weekly group remains payable');
assert.equal(oldGroupCalls,1);
db.factions.push({id:3,name:'Vanessa',sent:490,done:488,paymentByDeliveryV9135:true});
db.factionPayments.push(
 {id:31,factionServiceId:3,factionName:'Vanessa',quantity:437,status:'Pendente',scheduledPaymentWeek:'2026-W37',scheduledPaymentDate:'2026-09-07'},
 {id:32,factionServiceId:3,factionName:'Vanessa',quantity:488,status:'Pendente',scheduledPaymentWeek:'2026-W38',scheduledPaymentDate:'2026-09-11'}
);
assert.equal(window.hlgbPayFactionGroup9230('vanessa||2026-W38'),false,'explicit displayed week must be blocked even when date belongs to another week');
assert.equal(oldGroupCalls,1,'Vanessa must not open the original modal');
assert.equal(window.hlgbFactionPaymentBadGroup('vanessa||2026-W38').issues[0].bad.sum,925);
assert.equal(window.HLGB_FACTION_PAYMENT_GUARD,'v3');
console.log('PASS faction payment guard v3: explicit scheduled week, individual and grouped over-accounted payments; valid legacy flow remains available.');

 // A partial delivery may have valid acerto but never above the delivered pieces.
db.factions.push({id:4,name:'Parcial',sent:100,done:80,paymentByDeliveryV9135:true});
db.factionPayments.push({id:41,factionServiceId:4,factionName:'Parcial',quantity:90,status:'Pendente',scheduledPaymentWeek:'2026-W37',deliveryId:'d41'});
assert.equal(window.hlgbFactionPaymentOverAccounted(db.factions.at(-1)).limit,80);
assert.equal(window.payFactionPayment(41),false,'one payment alone cannot exceed actual delivery');
assert.equal(window.hlgbPayFactionGroup9230('parcial||2026-W37'),false);
db.factionPayments.at(-1).quantity=80;
assert.equal(window.payFactionPayment(41),true,'80 delivered out of 100 can be settled normally');
db.factionPayments.at(-1).quantity=40;
db.factionPayments.push({id:42,factionServiceId:4,factionName:'Parcial',quantity:40,status:'Pendente',scheduledPaymentWeek:'2026-W38',deliveryId:'d41'});
assert.equal(window.hlgbFactionPaymentOverAccounted(db.factions.at(-1)).reason,'duplicate-delivery');
assert.equal(window.hlgbPayFactionGroup9230('parcial||2026-W38'),false,'duplicate even when quantity sums to 80');
db.factionPayments.at(-1).status='Cancelado';assert.equal(window.hlgbFactionPaymentOverAccounted(db.factions.at(-1)),null);
db.factionPayments.push({id:43,factionServiceId:4,quantity:400,manual:true,status:'Pendente'});
assert.equal(window.hlgbFactionPaymentOverAccounted(db.factions.at(-1)),null,'manual payment is not delivery evidence');
db.factions.push({id:5,name:'Entrega antiga',sent:100,done:30});
db.factionPayments.push({id:51,factionServiceId:5,quantity:31,source:'faction_delivery_v9223',status:'Pendente'});
assert.equal(window.payFactionPayment(51),false,'explicit delivery source protected even without legacy flag');
console.log('PASS partial delivery guard, exact duplicate and canceled history');
