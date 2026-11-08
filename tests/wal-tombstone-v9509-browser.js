'use strict';
const {chromium,webkit}=require('playwright'),assert=require('node:assert/strict');
const engine=process.env.HLGB_BROWSER==='webkit'?webkit:chromium;
(async()=>{
 const browser=await engine.launch({headless:true});
 try{
  const page=await browser.newPage();
  await page.goto('http://127.0.0.1:4173/tests/wal-tombstone-v9509-fixture.html',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>typeof window.hlgbWalTombstonePruner9509?.prune==='function');
  const data=await page.evaluate(async()=>{
   const store='hlgb_durable_wal_v1';
   const make=(module,id,opId='op-'+id,deleted=true)=>({
    key:module+'|'+id,module,id,opId,deleted,
    data:{name:'synthetic-'+id,qty:1},baseData:{name:'synthetic-'+id,qty:1},
    baseUpdatedAt:'2026-01-01T00:00:00Z'
   });
   const db=await new Promise((resolve,reject)=>{
    const req=indexedDB.open('hlgb_durable_wal',1);
    req.onupgradeneeded=()=>{const x=req.result;if(!x.objectStoreNames.contains('entries'))x.createObjectStore('entries',{keyPath:'key'})};
    req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);
   });
   const all=[
    ...Array.from({length:5},(_,i)=>make('hubFinanceEntries','tomb-'+i)),
    make('hubFinanceEntries','active'),make('hubFinanceEntries','missing'),
    make('hubFinanceEntries','different'),make('hubFinanceEntries','raced'),
    make('hubFinanceEntries','error'),
    make('production','P'),make('projectionInvoices','INV'),make('routePlans','R')
   ];
   const tx=db.transaction('entries','readwrite'),st=tx.objectStore('entries');
   for(const x of all)st.put(x);
   await new Promise((resolve,reject)=>{tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error)});
   const local={schema:1,entries:{
    'hubFinanceEntries|tomb-0':make('hubFinanceEntries','tomb-0'),
    'hubFinanceEntries|different':make('hubFinanceEntries','different','another-op')
   }};
   localStorage.setItem(store,JSON.stringify(local));
   const calls=[],writes=[];
   window.cloudRequest=async(q,opt)=>{
    calls.push({query:q,method:opt?.method});
    if(opt?.method!=='GET')writes.push(opt);
    const m=q.match(/entity_id=eq\.([^&]+)/),id=m?decodeURIComponent(m[1]):'';
    if(id==='error')throw Error('simulated remote failure');
    if(id==='raced'){
      const t=db.transaction('entries','readwrite'),s=t.objectStore('entries');
      s.put({...all.find(x=>x.id==='raced'),opId:'newer-race-id'});
      await new Promise((res,rej)=>{t.oncomplete=res;t.onerror=()=>rej(t.error)});
    }
    if(id==='missing')return [];
    if(id==='active')return [{module:'hubFinanceEntries',entity_id:id,deleted_at:null,revision:4}];
    return [{module:'hubFinanceEntries',entity_id:id,deleted_at:'2026-11-07T18:28:10Z',revision:3}];
   };
   const result=await window.hlgbWalTombstonePruner9509.prune({max:32});
   const left=await new Promise((resolve,reject)=>{
    const t=db.transaction('entries','readonly'),r=t.objectStore('entries').getAll();
    r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);
   });
   db.close();
   const localAfter=JSON.parse(localStorage.getItem(store));
   const byId=Object.fromEntries(result.rows.map(x=>[x.id,x.status]));
   return {removed:result.removed,removedLocal:result.removedLocal,remaining:left.map(x=>x.key),
    remainingRaceOpId:left.find(x=>x.id==='raced')?.opId,
    localAfter:Object.keys(localAfter.entries||{}),calledMethods:calls.map(x=>x.method),
    writes:writes.length,byId,errors:result.errors,proofStatus:window.hlgbWalTombstonePruner9509.status()};
  });
  assert.equal(data.removed,5,'delete only five remotely verified tombstones');
  assert.equal(data.removedLocal,1,'also remove matching localStorage copy');
  assert.equal(data.writes,0,'never write remote records');
  assert(data.calledMethods.every(x=>x==='GET'));
  assert.equal(data.remaining.length,8,'preserve other eight operations');
  for(let i=0;i<5;i++)assert(!data.remaining.includes('hubFinanceEntries|tomb-'+i));
  for(const key of ['hubFinanceEntries|active','hubFinanceEntries|missing','hubFinanceEntries|different',
    'hubFinanceEntries|raced','hubFinanceEntries|error','production|P','projectionInvoices|INV','routePlans|R'])
    assert(data.remaining.includes(key),'protected WAL was removed: '+key);
  assert.equal(data.remainingRaceOpId,'newer-race-id','newer opId must win');
  assert.deepEqual(data.localAfter,['hubFinanceEntries|different'],'mismatching local copy preserved');
  assert.equal(data.byId.active,'remote-not-proven');
  assert.equal(data.byId.missing,'remote-not-proven');
  assert.equal(data.byId.different,'local-copy-diverged');
  assert.equal(data.byId.raced,'identity-changed-during-readback');
  assert.equal(data.errors.length,1,'network failure must be surfaced without deleting');
  console.log('PASS v95.09 '+engine.name()+': five tombstones removed, eight protected, CAS race safe, no remote writes');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});