const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const src=fs.readFileSync('release-faction-payments.js','utf8');
let oldSyncCalls=0,oldPayCalls=0,oldSeparateCalls=0;const alerts=[];
const db={
 factions:[
  {id:1,name:'Cris',sent:1078,done:1078,paymentByDeliveryV9135:true,paymentSeparated:true,status:'Finalizado'},
  {id:2,name:'Legada',sent:100,done:100,paymentSeparated:true,status:'Finalizado'}
 ],
 factionPayments:[
  {id:11,factionServiceId:1,quantity:1077,status:'Pendente'},
  {id:12,factionServiceId:1,quantity:1078,status:'Pendente'},
  {id:21,factionServiceId:2,quantity:100,status:'Pendente'}
 ]
};
const window={
 syncFactionPayments(){oldSyncCalls++;for(const f of db.factions.filter(x=>x.paymentSeparated===true)){const p=db.factionPayments.find(x=>String(x.factionServiceId)===String(f.id));if(p)p.quantity=f.done}},
 separateFactionForPayment(){oldSeparateCalls++;return true},
 payFactionPayment(){oldPayCalls++;return true}
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
assert.equal(window.HLGB_FACTION_PAYMENT_GUARD,'v1');
console.log('PASS faction payment guard: per-delivery rows are not rewritten; over-accounted payment is blocked; legacy valid flow remains available.');
