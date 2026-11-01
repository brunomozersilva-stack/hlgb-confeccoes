const vm=require('vm'),fs=require('fs'),assert=require('assert/strict');
const src=fs.readFileSync('release-production-reconcile-v9443.js','utf8');
(async()=>{
 let baseCalls=0;
 const old=new Date(Date.now()-60000).toISOString();
 const state={busy:true,runs:1,lastAt:new Date().toISOString(),lastResult:{at:old,reason:'old',results:[]}};
 const api={
  patch:'94.42-safe-proof',
  candidates:async()=>[],
  status:()=>({...state}),
  reconcile:async reason=>{
   baseCalls++;state.busy=true;state.runs++;state.lastAt=new Date().toISOString();
   await new Promise(r=>setTimeout(r,45));
   const out={at:new Date().toISOString(),reason,results:[{id:'p1',ok:true}]};state.lastResult=out;state.busy=false;return out;
  }
 };
 const ctx={window:{__HLGB_AUTH_READY:true,HLGB_RELEASE_VERSION:'94.42',hlgbProductionReconcile9439:api,addEventListener(){}},document:{querySelector(){return null}},console,structuredClone:global.structuredClone,setTimeout,clearTimeout,Date,Promise,JSON,Math};Object.assign(ctx.window,ctx);ctx.globalThis=ctx;vm.createContext(ctx);vm.runInContext(src,ctx);
 assert.equal(api.concurrencyPatch,'94.43-await-busy');
 assert.equal(ctx.window.hlgbProductionReconcileCoordinator9443.status().apiPatched,true);
 setTimeout(()=>{state.lastResult={at:new Date().toISOString(),reason:'automatic-existing',results:[{id:'auto',ok:true}]};state.busy=false},50);
 const joined=await api.reconcile('auditor-during-auto');
 assert.equal(baseCalls,0,'Auditor não deve abrir uma segunda reconciliação durante execução automática');
 assert.equal(joined.reason,'automatic-existing');
 assert.equal(joined.results[0].ok,true);
 state.busy=false;
 const p1=api.reconcile('manual-a');
 const p2=api.reconcile('manual-b');
 assert.equal(p1,p2,'duas chamadas concorrentes pela API precisam compartilhar a mesma Promise');
 const [r1,r2]=await Promise.all([p1,p2]);
 assert.equal(baseCalls,1,'apenas uma reconciliação base deve iniciar');
 assert.deepEqual(r1,r2);
 assert.equal(r1.reason,'manual-a');
 const coordinator=ctx.window.hlgbProductionReconcileCoordinator9443.status();
 assert.ok(coordinator.joinedExisting>=1);
 assert.ok(coordinator.shared>=1);
 assert.equal(coordinator.timeouts,0);
 console.log('PRODUCTION_V9443_CONCURRENCY_OK',JSON.stringify({baseCalls,joinedExisting:coordinator.joinedExisting,shared:coordinator.shared}));
})().catch(e=>{console.error(e);process.exit(1)});
