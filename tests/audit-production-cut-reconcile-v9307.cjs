const fs=require('fs'),vm=require('vm'),assert=require('assert');

const src=fs.readFileSync('release-production-cut-reconcile-v9307.js','utf8');

(async()=>{
  const repairs=[],refreshes=[],timeouts=[],statuses=[];
  let originalCalls=0,persistCalls=0,normalizedCalls=0,flushCalls=0,separationCalls=0,incomingCalls=0,fillCalls=0,renderSepCalls=0;
  const guard={
    repair:async reason=>{repairs.push(String(reason));return true},
    refreshAuthority:async reason=>{refreshes.push(String(reason));return true},
    status:()=>({ok:true})
  };
  const separationSelect={value:'123'};
  const pedidosPage={classList:{contains:v=>v==='active'}};
  const window={
    HLGB_RELEASE_VERSION:'93.06',
    hlgbSyncGuard9306:guard,
    syncFinalizedCutsToProduction(){originalCalls++;return 'legacy-result'},
    hlgbAfterLogin(fn){fn()},
    addEventListener(){},
    persistDb(){persistCalls++;return true},
    hlgbRecordCanWrite(){return false},
    hasAccess(area){return area==='pedidos'},
    hlgbRenderIncomingRecord(){incomingCalls++;return true},
    async applySeparationProgress938(){separationCalls++;return 'separation-ok'},
    async hlgbEnsureRecordsOnlineAfterLogin(){return true},
    async hlgbRecordSaveWithRetry(){return {applied:true}},
    hlgbRecordPendingStore(){},
    async hlgbNormalizedSyncNow(){normalizedCalls++;return true},
    hlgbSyncRecovery9301:{
      pending:()=>({records:0,wal:0}),
      status:()=>({busy:false}),
      async flushOutgoing(){flushCalls++;return {records:0,wal:0,lastError:''}}
    },
    fillSeparationOrders(){fillCalls++},
    renderSeparation(){renderSepCalls++},
    renderHubFinance(){return true},
    hlgbHubMaster9258:{renderAll(){return true}},
    cloudAccessToken:'token',
    cloudEnsureFreshSession:async()=>true,
    setCloudStatus:(text,type)=>statuses.push([text,type])
  };
  const document={
    activeElement:null,
    querySelector(sel){if(sel==='#appShell .logo small')return null;if(sel==='#modal.show')return null;return null},
    getElementById(id){
      if(id==='appShell')return {};
      if(id==='loginScreen')return null;
      if(id==='pedidos')return pedidosPage;
      if(id==='separationOrder')return separationSelect;
      return null;
    }
  };
  const context={
    window,
    Promise,
    Date,
    navigator:{onLine:true},
    document,
    cloudAccessToken:'token',
    hlgbRecordReady:true,
    cloudEnsureFreshSession:window.cloudEnsureFreshSession,
    setCloudStatus:window.setCloudStatus,
    getComputedStyle:()=>({display:'none'}),
    alert(){},
    console:{info(){},warn(){},error(){}},
    setInterval(){return 1},
    setTimeout(fn,ms){timeouts.push(Number(ms)||0);fn();return 1},
    clearTimeout(){}
  };

  vm.runInNewContext(src,context,{filename:'release-production-cut-reconcile-v9307.js'});

  assert.strictEqual(window.HLGB_PRODUCTION_CUT_RECONCILE_9307,'93.07','v93.07 production guard must load');
  assert.strictEqual(window.HLGB_RELEASE_VERSION,'93.13','release stamp must advance to v93.13');
  assert(window.syncFinalizedCutsToProduction.__hlgb9307,'cut→production sync must be wrapped');
  assert(window.hlgbProductionCutReconcile9307,'production diagnostic API must be exposed');

  const beforeRepairs=repairs.length;
  const result=window.syncFinalizedCutsToProduction();
  assert.strictEqual(result,'legacy-result','wrapper must preserve legacy sync return value');
  assert.strictEqual(originalCalls,1,'legacy reconciliation must still execute exactly once');
  assert(timeouts.includes(0)&&timeouts.includes(60)&&timeouts.includes(250)&&timeouts.includes(900)&&timeouts.includes(1800),'post-sync convergence must schedule all settle passes');
  for(let i=0;i<8;i++)await Promise.resolve();
  assert(repairs.length>beforeRepairs,'post-sync convergence must invoke repair');
  assert(repairs.some(x=>x.startsWith('post-cut-sync-')),'repair reason must identify post-cut sync');
  assert(refreshes.some(x=>x.startsWith('post-cut-sync-')&&x.endsWith('-cloud')),'cloud authority must be refreshed after cut sync');

  assert(window.hlgbSaveIntegrity9312,'v93.13 save diagnostic API must be exposed');
  assert.strictEqual(window.hlgbSaveIntegrity9312.version,'93.13');
  assert(window.persistDb.__hlgb9312,'persistDb must trigger confirmed background delivery');
  assert(window.applySeparationProgress938.__hlgb9312,'separation must require cloud readiness');
  assert(window.hlgbRenderIncomingRecord.__hlgb9312,'incoming changes must refresh separation UI');
  assert(window.hlgbRecordCanWrite.__hlgb9312,'separation permission compatibility must be installed');
  assert(window.renderHubFinance.__hlgb9312,'Hub renderer must be coalesced');
  assert(window.hlgbHubMaster9258.renderAll.__hlgb9312,'Hub master renderer must be coalesced');
  assert.strictEqual(window.hlgbRecordCanWrite('separations'),true,'Pedidos permission must allow separation writes');
  assert.strictEqual(window.hlgbRecordCanWrite('anotherModule'),false,'unrelated write permissions must remain unchanged');

  window.persistDb();
  for(let i=0;i<8;i++)await Promise.resolve();
  assert.strictEqual(persistCalls,1,'original persistDb must still run once');
  assert.strictEqual(normalizedCalls,0,'v93.13 must not duplicate normalized sync when recovery owns the flush');
  assert(flushCalls>=1,'WAL/pending delivery must be flushed after save');

  const sepResult=await window.applySeparationProgress938(123,'p1',false);
  assert.strictEqual(sepResult,'separation-ok','confirmed separation must preserve original action result');
  assert.strictEqual(separationCalls,1,'separation action must execute exactly once after cloud readiness');
  assert(flushCalls>=2,'separation must force one serialized confirmation after its record saves');

  window.hlgbRenderIncomingRecord('separations');
  assert.strictEqual(incomingCalls,1,'existing incoming handler must still execute');
  assert(fillCalls>=1,'incoming separation must refresh its order list');
  assert(renderSepCalls>=1,'incoming separation must refresh the selected separation detail');

  const st=window.hlgbSaveIntegrity9312.status();
  assert.strictEqual(st.version,'93.13');
  assert.strictEqual(st.persistGuard,true);
  assert.strictEqual(st.separationGuard,true);
  assert.strictEqual(st.hubRendererGuard,true);
  assert.strictEqual(st.recoveryBusy,false);
  assert(statuses.some(([text])=>String(text).includes('confirmad')),'confirmed saves should expose truthful cloud status');

  const prod=window.hlgbProductionCutReconcile9307.status();
  assert.strictEqual(prod.version,'93.07');
  assert.strictEqual(prod.wrapped,true);
  assert(prod.runs>0,'production diagnostic status must record reconciliation runs');

  console.log('PASS v93.13 save integrity: single recovery flush; separation cloud-gated with timeout; incoming refresh and Hub render coalescing preserved.');
})().catch(err=>{console.error(err);process.exit(1)});
