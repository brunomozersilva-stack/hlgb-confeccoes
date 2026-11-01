const fs=require('fs'),vm=require('vm'),assert=require('assert');
const src=fs.readFileSync('release-production-residual-v9448.js','utf8');
let reconcileCalls=0;
let current=[
 {id:'a',normalized:[{id:'a',opId:'a1',data:{value:1}}],walLocal:[],walIdb:[]},
 {id:'b',normalized:[{id:'b',opId:'b1',data:{value:2}}],walLocal:[{id:'b',opId:'b2',data:{value:99}}],walIdb:[]},
 {id:'c',normalized:[{id:'c',opId:'c1',data:{value:88}}],walLocal:[],walIdb:[]},
 {id:'d',normalized:[{id:'d',opId:'d1',data:{value:4}}],walLocal:[],walIdb:[]}
];
const servers={a:{module:'production',entity_id:'a',data:{value:1},revision:1,updated_at:'2026-11-01T20:00:00Z'},b:{module:'production',entity_id:'b',data:{value:2},revision:1,updated_at:'2026-11-01T20:00:00Z'},c:{module:'production',entity_id:'c',data:{value:3},revision:1,updated_at:'2026-11-01T20:00:00Z'}};
const window={
 cloudRequest:async q=>{const m=q.match(/entity_id=eq\.([^&]+)/);const id=decodeURIComponent(m?.[1]||'');return servers[id]?[servers[id]]:[]},
 hlgbProductionReconcile9439:{
  patch:'94.42-safe-proof',
  candidates:async()=>current,
  reconcile:async()=>{reconcileCalls++;current=[
   {id:'b',normalized:[],walLocal:[{id:'b',opId:'b2',data:{value:99}}],walIdb:[]},
   {id:'c',normalized:[{id:'c',opId:'c1',data:{value:88}}],walLocal:[],walIdb:[]},
   {id:'d',normalized:[{id:'d',opId:'d1',data:{value:4}}],walLocal:[],walIdb:[]}
  ];return {results:[{id:'a',ok:true},{id:'b',ok:true}]};},
  staleOperationSatisfied:(server,desired)=>{if(!server)return {ok:false,reason:'no-server-proof'};return JSON.stringify(server.data)===JSON.stringify(desired)?{ok:true,reason:'server-semantic-match'}:{ok:false,reason:'business-difference'}}
 }
};
const ctx={window,console,setTimeout,clearTimeout,structuredClone};ctx.globalThis=ctx;vm.createContext(ctx);vm.runInContext(src,ctx);
(async()=>{
 const api=window.hlgbProductionResidual9448;assert(api&&api.version==='94.48');
 const before=await api.inspect('unit-before');
 assert.equal(before.safeCopies,2);assert.equal(before.businessCopies,2);assert.equal(before.incompleteCopies,1);
 assert.equal(before.items.find(x=>x.id==='a').classification,'technical-stale-copy');
 assert.equal(before.items.find(x=>x.id==='b').classification,'mixed-residual');
 assert.equal(before.items.find(x=>x.id==='c').classification,'business-blocked');
 assert.equal(before.items.find(x=>x.id==='d').classification,'needs-code');
 const out=await api.reconcileAndInspect('unit');
 assert.equal(reconcileCalls,1);assert.equal(out.technicalCopiesCleared,2);assert.equal(out.after.safeCopies,0);
 assert.equal(out.after.items.find(x=>x.id==='b').classification,'business-blocked');
 assert.equal(out.after.items.find(x=>x.id==='c').classification,'business-blocked');
 assert.equal(out.after.items.find(x=>x.id==='d').classification,'needs-code');
 console.log('PRODUCTION_V9448_RESIDUAL_OK',JSON.stringify({before:{safe:before.safeCopies,business:before.businessCopies,incomplete:before.incompleteCopies},after:{safe:out.after.safeCopies,business:out.after.businessCopies,incomplete:out.after.incompleteCopies},cleared:out.technicalCopiesCleared}));
})().catch(e=>{console.error(e);process.exit(1)});