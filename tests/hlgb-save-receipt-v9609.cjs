'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {createReceipt,advance,status}=require('../hlgb-modules/auditor/save-receipt-v9609.cjs');
const id={operationId:'op-test-123',module:'cuts',entityId:'cut-123'};
test('não aceita recibo sem identidade técnica',()=>{
 for(const data of [{...id,operationId:''},{...id,module:''},{...id,entityId:''}])
  assert.throws(()=>createReceipt(data),TypeError);
});
test('ACK remoto sem envio e sem releitura idêntica não confirma salvamento',()=>{
 const initial=createReceipt(id);
 assert.equal(status(initial),'in_progress');
 assert.throws(()=>advance(initial,'remote_confirmed',{remoteReadback:true,sameEntity:true}),/releitura/);
 const local=advance(initial,'local_durable'),sent=advance(local,'sent');
 assert.throws(()=>advance(sent,'remote_confirmed',{remoteReadback:false,sameEntity:true}),/releitura/);
 assert.throws(()=>advance(sent,'remote_confirmed',{remoteReadback:true,sameEntity:false}),/releitura/);
 assert.equal(sent.remoteConfirmed,false);
});
test('somente readback do mesmo registro confirma',()=>{
 let x=createReceipt(id);
 x=advance(x,'local_durable');
 x=advance(x,'sent');
 x=advance(x,'remote_confirmed',{remoteReadback:true,sameEntity:true});
 assert.equal(status(x),'confirmed');
 assert.equal(x.safeToRetry,false);
 assert.deepEqual(x.steps,['received','local_durable','sent','remote_confirmed']);
 assert.strictEqual(advance(x,'remote_confirmed'),x);
});
test('queda depois de enviar vira incerto, sem replay automático',()=>{
 const x=advance(advance(createReceipt(id),'local_durable'),'sent');
 const uncertain=advance(x,'uncertain');
 assert.equal(status(uncertain),'needs_remote_check');
 assert.equal(uncertain.remoteConfirmed,false);
 assert.equal(uncertain.safeToRetry,false);
 assert.equal(uncertain.requiresReview,true);
 assert.throws(()=>advance(uncertain,'sent'),/Transição/);
 assert.throws(()=>advance(uncertain,'remote_confirmed',{remoteReadback:false,sameEntity:true}),/Confirmação/);
 assert.throws(()=>advance(uncertain,'remote_confirmed',{remoteReadback:true,sameEntity:false}),/Confirmação/);
 const recovered=advance(uncertain,'remote_confirmed',{remoteReadback:true,sameEntity:true});
 assert.equal(status(recovered),'confirmed');
 assert.equal(recovered.safeToRetry,false);
});
test('transições fora de ordem são bloqueadas',()=>{
 const x=createReceipt(id);
 assert.throws(()=>advance(x,'sent'),/Transição/);
 assert.throws(()=>advance(x,'remote_confirmed',{remoteReadback:true,sameEntity:true}),/releitura/);
});
test('recibos são imutáveis e não incluem payload comercial',()=>{
 const x=createReceipt(id);
 assert.equal(Object.isFrozen(x),true);
 assert.equal(Object.isFrozen(x.steps),true);
 assert.deepEqual(Object.keys(x).sort(),['entityId','module','operationId','remoteConfirmed','requiresReview','safeToRetry','status','steps'].sort());
});

test('falha anterior ao envio não pode ser declarada confirmada',()=>{
 const received=createReceipt(id),uncertain=advance(received,'uncertain');
 assert.equal(status(uncertain),'needs_remote_check');
 assert.throws(()=>advance(uncertain,'remote_confirmed',
  {remoteReadback:true,sameEntity:true}),/Confirmação/);
});
test('a prova remota recupera envio incerto uma única vez',()=>{
 let x=createReceipt(id);x=advance(x,'local_durable');x=advance(x,'sent');
 x=advance(x,'uncertain');
 x=advance(x,'remote_confirmed',{remoteReadback:true,sameEntity:true});
 assert.equal(status(x),'confirmed');
 assert.equal(x.steps.filter(y=>y==='remote_confirmed').length,1);
 assert.strictEqual(advance(x,'remote_confirmed',{remoteReadback:true,sameEntity:true}),x);
});
