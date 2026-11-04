'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const src=fs.readFileSync('release-production-residual-v9448.js','utf8');
function makeOp(opId){return {id:'p1',key:'production|p1',module:'production',opId,deleted:false,data:{id:'p1',planned:8}}}
async function run(mode){
 let scans=0,reconciles=0,ops=[makeOp('op-A')];
 const api={
  patch:'94.42-safe-proof',
  async candidates(){scans++;if(mode==='change-before'&&scans>=2)ops=[makeOp('op-B')];
   return ops.length?[{id:'p1',normalized:[],walLocal:[],walIdb:ops.map(x=>structuredClone(x))}]:[]},
  staleOperationSatisfied:(_server,data)=>data?.planned===8?{ok:true,reason:'server-semantic-match'}:{ok:false,reason:'difference'},
  async reconcile(){reconciles++;if(mode==='stable')ops=[];if(mode==='change-during')ops=[makeOp('op-C')];
   return {results:[{id:'p1',ok:true,walRemoved:mode==='stable'?1:0}]}
  }
 };
 const w={hlgbProductionReconcile9439:api,cloudRequest:async()=>[{
  module:'production',entity_id:'p1',revision:2,updated_at:'2026-11-04T12:00:00Z',data:{id:'p1',planned:8}}]};
 const ctx={window:w,console,setTimeout,clearTimeout,structuredClone,Date,JSON,Map,Set};
 vm.createContext(ctx);vm.runInContext(src,ctx);
 const result=await w.hlgbProductionResidual9448.reconcileAndInspect('test');
 return {result,reconciles,scans};
}
(async()=>{
 const a=await run('change-before');
 assert.equal(a.reconciles,0,'never reconcile while opId changes across reads');
 assert.equal(a.result.opIdUnstable,true);
 assert.equal(a.result.technicalCopiesCleared,0);
 assert.equal(a.result.skippedReason,'opid-unstable-before-reconcile');
 assert.equal(a.result.after.items[0].classification,'needs-code');
 assert.equal(a.result.after.items[0].requires,'code');
 assert.equal(a.result.opIdChanges[0].beforeOpIds[0],'op-A');
 assert.equal(a.result.opIdChanges[0].afterOpIds[0],'op-B');
 const b=await run('stable');
 assert.equal(b.reconciles,1);
 assert.equal(b.result.opIdUnstable,false);
 assert.equal(b.result.technicalCopiesCleared,1);
 const c=await run('change-during');
 assert.equal(c.reconciles,1);
 assert.equal(c.result.opIdUnstable,true);
 assert.equal(c.result.technicalCopiesCleared,0,'changed entry is not cleared');
 assert.equal(c.result.after.items[0].classification,'needs-code');
 assert.equal(c.result.opIdChanges[0].afterOpIds[0],'op-C');
 console.log('PASS v94.84: no cleanup on opId churn; unchanged stable operations reconcile, changes during reconcile stay unresolved');
})().catch(e=>{console.error(e);process.exitCode=1});
