'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {inspectCut,inspectPaidInvoice,inspectWal,inspectScripts}=require('../hlgb-modules/integridade/triagem-conservadora-v9621.cjs');
const freeze=o=>Object.freeze(o);
test('corte sem productId é triagem, nunca alteração automática',()=>{
 const cut=freeze({id:'1794488399889',orderId:'1794488399888'});
 const order=freeze({id:'1794488399888',grade:[{productId:'1788193589429',qty:10}]});
 const products=freeze([{id:'1788193589429'}]);
 const r=inspectCut(cut,order,products);
 assert.equal(r.state,'needs-proof');
 assert.deepEqual(r.candidateProductIds,['1788193589429']);
 assert.equal(r.autoFixAllowed,false);
 assert.equal(cut.productId,undefined);
});
test('pedido multimodelo não infere produto',()=>{
 const r=inspectCut({id:1,orderId:2},{id:2,grade:[{productId:3,qty:4},{productId:4,qty:8}]},[{id:3},{id:4}]);
 assert.equal(r.uniqueCandidate,false);
 assert.equal(r.autoFixAllowed,false);
});
test('corte com produto válido preserva identidade atual',()=>{
 const r=inspectCut({id:1,orderId:2,productId:3},{id:2,grade:[]},[{id:3}]);
 assert.equal(r.state,'linked');assert.equal(r.productId,'3');
});
test('pagamento com projeção excluída logicamente não é cobrança nova',()=>{
 const id='1788606175816',at='2026-10-24T11:44:11.688702Z';
 const r=inspectPaidInvoice({id:'1788606175817',projectionInvoiceId:id,status:'Pago'},
  {[id]:{deleted_at:at,revision:8,data:{id}}});
 assert.equal(r.state,'invoice-archived');assert.equal(r.archivedAt,at);
 assert.equal(r.autoRestoreAllowed,false);assert.equal(r.autoChargeAllowed,false);
});
test('projeção ausente no snapshot não prova exclusão',()=>{
 const r=inspectPaidInvoice({id:1,projectionInvoiceId:2},{});
 assert.equal(r.state,'invoice-not-in-snapshot');assert.equal(r.autoRestoreAllowed,false);
});
test('25 WAL (4 divergentes, 4 remotos ausentes, 17 não conferidos) nunca é zerada',()=>{
 const rows=[...Array.from({length:4},(_,i)=>({module:'orders',entityId:i,opId:'d'+i,proofStatus:'different'})),
 ...Array.from({length:4},(_,i)=>({module:'cuts',entityId:i,opId:'m'+i,proofStatus:'missing'})),
 ...Array.from({length:17},(_,i)=>({module:'finance',entityId:i,opId:'u'+i,proofStatus:'unchecked'}))];
 const before=JSON.stringify(rows),r=inspectWal(freeze(rows));
 assert.deepEqual(r.totals,{matched:0,different:4,missing:4,unchecked:17,invalid:0});
 assert.equal(r.complete,false);assert.equal(r.canClearAutomatically,false);
 assert.equal(r.canReplayAutomatically,false);assert.equal(JSON.stringify(rows),before);
});
test('duplicidade de opId é erro, não acerto remoto',()=>{
 const row={module:'cuts',entityId:'1',opId:'abc',proofStatus:'matched'};
 const r=inspectWal([row,row]);
 assert.equal(r.totals.matched,1);assert.equal(r.totals.invalid,1);assert.equal(r.complete,false);
});
test('2 elementos de script são evidência distinta de 2 downloads',()=>{
 const file='release-printer3d-persistence-v9431.js';
 const duplicate=inspectScripts([{src:'./'+file+'?fresh=1'},{src:'./'+file+'?fresh=2'}],
  [{name:file},{name:file}],file);
 assert.equal(duplicate.evidence,'duplicate-script-tags');
 assert.equal(duplicate.removeScriptAutomatically,false);
 const requests=inspectScripts([{src:'./'+file}],[{name:file},{name:file}],file);
 assert.equal(requests.evidence,'network-repeat-without-second-tag');
});
test('fontes inválidas param diagnóstico',()=>{
 assert.throws(()=>inspectWal(null),TypeError);
 assert.throws(()=>inspectScripts(null,[],'x'),TypeError);
});
