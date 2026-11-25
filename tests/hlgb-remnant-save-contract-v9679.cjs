'use strict';
const assert=require('node:assert/strict'),{request,createSession}=require('../hlgb-modules/producao/remnant-save-contract-v9679.cjs');
module.exports=async function(){
 const source={id:10,name:'Modelo',price:25,materials:[{materialId:1,qty:5}],fabricRemnantPolicyV9630:{state:'yes',notes:'',eligible:[]}},prepared={state:'prepared-only',changed:true,canWrite:false,expectedRevision:4,next:source};
 const expected={module:'products',entity_id:'10',deleted_at:null,revision:5,data:source};let writes=0,reads=0,mode='ok',ready=true;
 const adapter={atomicGraphValidation:true,ready:async()=>ready,commit:async req=>{writes++;assert.deepEqual(Object.keys(req).sort(),['expectedRevision','policy','productId']);assert.equal(req.expectedRevision,4);if(mode==='timeout')throw Error('timeout');if(mode==='conflict')return {applied:false,definitive:true};if(mode==='bad-ack')return {applied:true,...expected,revision:4};return {applied:true,...expected}},read:async()=>{reads++;if(mode==='bad-read')return {...expected,data:{...source,price:99}};return expected}};
 assert.equal(request({...prepared,changed:false},10),null);assert.equal(request(prepared,11),null);
 const blocked=createSession({...adapter,atomicGraphValidation:false});assert.equal((await blocked.save(prepared,10)).status,'blocked');assert.equal(writes,0);
 const s=createSession(adapter),before=JSON.stringify(prepared);ready=false;assert.equal((await s.save(prepared,10)).status,'blocked');assert.equal(writes,0);ready=true;
 assert.equal((await s.save(prepared,10)).status,'confirmed');assert.equal(writes,1);assert.equal(reads,1);
 mode='conflict';assert.equal((await s.save(prepared,10)).status,'conflict');assert.equal(s.pending(),false);
 mode='timeout';assert.equal((await s.save(prepared,10)).status,'uncertain');assert.equal(s.pending(),true);const n=writes;assert.equal((await s.save(prepared,10)).status,'reconcile-first');assert.equal(writes,n);mode='ok';assert.equal((await s.reconcile()).status,'confirmed');assert.equal(writes,n);
 mode='bad-ack';assert.equal((await s.save(prepared,10)).status,'uncertain');mode='ok';await s.reconcile();
 mode='bad-read';assert.equal((await s.save(prepared,10)).status,'uncertain');assert.equal((await s.reconcile()).status,'uncertain');mode='ok';assert.equal((await s.reconcile()).status,'confirmed');
 const mutated=createSession({...adapter,ready:async req=>{req.expectedRevision=99;req.productId='wrong';req.policy.notes='wrong';return true},commit:async req=>{assert.equal(req.productId,'10');assert.equal(req.expectedRevision,4);assert.equal(req.policy.notes,'');return {applied:true,...expected}}});
 assert.equal((await mutated.save(prepared,10)).status,'confirmed','adapter preflight cannot change the attempted request');
 assert.equal(JSON.stringify(prepared),before);assert.equal(s.pending(),false);
 console.log('PASS remnant strict write contract (simulated server only)');
};
