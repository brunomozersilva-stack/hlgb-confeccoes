const fs=require('fs'),vm=require('vm'),assert=require('assert');

const src=fs.readFileSync('release-production-cut-reconcile-v9307.js','utf8');

(async()=>{
  const repairs=[],refreshes=[],timeouts=[];
  let originalCalls=0;
  const guard={
    repair:async reason=>{repairs.push(String(reason));return true},
    refreshAuthority:async reason=>{refreshes.push(String(reason));return true},
    status:()=>({ok:true})
  };
  const window={
    HLGB_RELEASE_VERSION:'93.06',
    hlgbSyncGuard9306:guard,
    syncFinalizedCutsToProduction(){originalCalls++;return 'legacy-result'},
    hlgbAfterLogin(fn){fn()}
  };
  const context={
    window,
    Promise,
    Date,
    console:{info(){},warn(){}},
    document:{querySelector(){return null}},
    setInterval(){return 1},
    setTimeout(fn,ms){timeouts.push(Number(ms)||0);fn();return 1},
    clearTimeout(){}
  };

  vm.runInNewContext(src,context,{filename:'release-production-cut-reconcile-v9307.js'});

  assert.strictEqual(window.HLGB_PRODUCTION_CUT_RECONCILE_9307,'93.07','v93.07 guard must load');
  assert.strictEqual(window.HLGB_RELEASE_VERSION,'93.07','release stamp must advance to 93.07');
  assert(window.syncFinalizedCutsToProduction.__hlgb9307,'cut→production sync must be wrapped');
  assert(window.hlgbProductionCutReconcile9307,'diagnostic API must be exposed');

  const beforeRepairs=repairs.length;
  const result=window.syncFinalizedCutsToProduction();
  assert.strictEqual(result,'legacy-result','wrapper must preserve legacy sync return value');
  assert.strictEqual(originalCalls,1,'legacy reconciliation must still execute exactly once');
  assert(timeouts.includes(0)&&timeouts.includes(60)&&timeouts.includes(250)&&timeouts.includes(900)&&timeouts.includes(1800),'post-sync convergence must schedule all settle passes');

  for(let i=0;i<8;i++)await Promise.resolve();

  assert(repairs.length>beforeRepairs,'post-sync convergence must invoke repair');
  assert(repairs.some(x=>x.startsWith('post-cut-sync-')),'repair reason must identify post-cut sync');
  assert(refreshes.some(x=>x.startsWith('post-cut-sync-')&&x.endsWith('-cloud')),'cloud authority must be refreshed after cut sync');

  const st=window.hlgbProductionCutReconcile9307.status();
  assert.strictEqual(st.version,'93.07');
  assert.strictEqual(st.wrapped,true);
  assert(st.runs>0,'diagnostic status must record reconciliation runs');

  console.log('PASS v93.07 production cut reconciliation: legacy sync preserved; immediate local/cloud/local convergence runs after cut sync.');
})().catch(err=>{console.error(err);process.exit(1)});
