'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const a=fs.readFileSync('release-auditor-autocorrect-v9441.js','utf8');
const b=fs.readFileSync('release-auditor-autocorrect-v9447.js','utf8');
const snippet=(text,start,end)=>{const i=text.indexOf(start),j=text.indexOf(end,i+start.length);assert(i>=0&&j>i,'missing production proof function');return text.slice(i,j)};

const check=vm.runInNewContext(snippet(a,'function repairedOperationsAbsent9507(', '\nasync function validateRepairs(')+'\nrepairedOperationsAbsent9507;', {sid:x=>String(x??''),Set,Array});
assert.equal(check([{id:'r1',walIdb:[{opId:'second-op'}]}],'r1',['old-op']),true,'a later operation with a different opId must not invalidate verified older cleanup');
assert.equal(check([{id:'r1',walIdb:[{opId:'old-op'}]}],'r1',['old-op']),false,'same operation present in IndexedDB is never considered resolved');
assert.equal(check([{id:'r1',walLocal:[{opId:'old-op'}]}],'r1',['old-op']),false,'same operation in localStorage is never considered resolved');
assert.equal(check([{id:'r1',normalized:[{opId:'old-op'}]}],'r1',['old-op']),false,'same operation in normalized queue is never considered resolved');
assert.equal(check([{id:'r1',walIdb:[{opId:''}]}],'r1',['old-op']),false,'legacy rows without opId must not be silently considered safe');
assert.equal(check([{id:'r1',walIdb:[]}],'r1',['old-op']),false,'empty candidate without verifiable copies must be marked inconclusive');
assert.equal(check([{id:'other',walIdb:[{opId:'old-op'}]}],'r1',['old-op']),true,'unrelated records do not invalidate a proof');
assert.equal(check(null,'r1',['old-op']),false,'unavailable queue cannot count as success');
assert.equal(check([],'r1',[]),false,'no opId proof means no repair credit');

const ctx={
 sid:x=>String(x??''),Set,Array,Number,JSON,
 window:{hlgbProductionResidual9448:{inspectCandidate:async()=>{
  return {classification:'business-blocked',businessCopies:1,incompleteCopies:0,safeCopies:0,serverRevision:13,
   proofs:[{opId:'new-op',diff:['productionLocationId']}]};
 }}}
};
vm.createContext(ctx);
vm.runInContext(snippet(b,'function classifyCandidate(c,event){','\nasync function triage(audit){')+'\nthis.classifyCurrent=classifyCandidateCurrent9507;',ctx);
(async()=>{
 const event={status:'unverified',detail:'Reteste da fila, operação ou prova remota incompleta'};
 const x=await ctx.classifyCurrent({id:'r1',walIdb:[{opId:'new-op'}]},event);
 assert.equal(x.classification,'business-blocked','current proof must override stale event about another opId');
 assert.equal(x.requires,'human-decision');
 assert.equal(x.diagnosticSource,'current-operation-readonly-proof');
 assert.match(x.detail,/productionLocationId/);
 assert.doesNotMatch(x.detail,/200|123456|secret/i,'only field name, never payload');
 ctx.window.hlgbProductionResidual9448.inspectCandidate=async()=>({
  classification:'business-blocked',businessCopies:1,incompleteCopies:0,safeCopies:0,
  proofs:[{opId:'race-op',diff:['productionLocationId']}]});
 const raced=await ctx.classifyCurrent({id:'r1',walIdb:[{opId:'new-op'}]},event);
 assert.equal(raced.classification,'needs-code','opId changed during proof must not be classified as safe business conflict');
 ctx.window.hlgbProductionResidual9448.inspectCandidate=async()=>({
  classification:'mixed-residual',businessCopies:1,incompleteCopies:0,safeCopies:1,
  proofs:[{opId:'new-op',diff:['productionLocationId']}]});
 const mixed=await ctx.classifyCurrent({id:'r1',walIdb:[{opId:'new-op'}]},event);
 assert.equal(mixed.classification,'needs-code','mixed safe and business copies require separate reconciliation');
 ctx.window.hlgbProductionResidual9448.inspectCandidate=async()=>{throw Error('network down')};
 const failed=await ctx.classifyCurrent({id:'r1',walIdb:[{opId:'new-op'}]},event);
 assert.equal(failed.classification,'needs-code','remote proof failure must fail closed');
 console.log('PASS v95.07: per-opId repair proof; business conflict classified safely; stale event bypass; races and errors fail closed');
})().catch(e=>{console.error(e);process.exitCode=1});
