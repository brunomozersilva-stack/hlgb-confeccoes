'use strict';
const assert=require('node:assert/strict');
const {chromium,webkit}=require('playwright');
const fs=require('node:fs');
(async()=>{
 const kind=process.env.HLGB_BROWSER||'chromium';
 const browser=await ({chromium,webkit})[kind].launch({headless:true});
 try{
  const page=await browser.newPage();
  await page.goto('about:blank');
  await page.evaluate(async()=>{
   const request=indexedDB.open('hlgb_durable_wal',1);
   await new Promise((resolve,reject)=>{
    request.onupgradeneeded=()=>request.result.createObjectStore('entries',{keyPath:'key'});
    request.onsuccess=resolve;request.onerror=()=>reject(request.error);
   });
   const db=request.result;
   await new Promise((resolve,reject)=>{
    const tx=db.transaction('entries','readwrite');
    const store=tx.objectStore('entries');
    store.put({key:'orders|safari-only',module:'orders',id:'safari-only',opId:'only-idb-op',
      data:{id:'safari-only',qty:100,client:'Teste local'},createdAt:'2026-11-11T10:00:00Z'});
    store.put({key:'cuts|cut-safari',module:'cuts',id:'cut-safari',opId:'cut-idb-op',
      data:{id:'cut-safari',planned:100},createdAt:'2026-11-11T10:00:00Z'});
    tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);
   });
   db.close();
   localStorage.removeItem('hlgb_durable_wal_v1');
   window.db={orders:[{id:'safari-only',qty:100,client:'Teste local'}],cuts:[{id:'cut-safari'}]};
   window.__syncReads=0;
   window.hlgbRecordPendingIdentitySet9535=()=>new Set();
   window.hlgbRecordLoadBundle=async()=>{
    window.__syncReads++;
    if(!window.hlgbRecordPendingIdentitySet9535().has('orders::safari-only'))db.orders=[{id:'safari-only',qty:0,client:'Servidor mais antigo'}];
    return {rows:[],modules:['orders']};
   };
   window.hlgbApplyRecordRow=row=>{
    return !window.hlgbRecordPendingIdentitySet9535().has(row.module+'::'+row.entity_id);
   };
  });
  await page.addScriptTag({path:'release-wal-idb-convergence-v9536.js'});
  let proof=await page.evaluate(async()=>{
   const api=window.hlgbWalIdbGuard9536;
   const probe=await api.probe();
   const ids=api.ids(),keys=api.keys();
   await window.hlgbRecordLoadBundle({preserveLocal:false,since:null});
   return {probe,ids:[...ids],keys:[...keys],orders:window.db.orders,
    incomingAllowed:window.hlgbApplyRecordRow({module:'orders',entity_id:'safari-only'}),
    readCount:window.__syncReads,status:api.status()};
  });
  assert.equal(proof.probe.count,2);
  assert.equal(proof.probe.indexedDbOnly,2);
  assert.ok(proof.ids.includes('orders::safari-only'));
  assert.ok(proof.ids.includes('cuts::cut-safari'));
  assert.deepEqual(proof.orders,[{id:'safari-only',qty:100,client:'Teste local'}]);
  assert.equal(proof.incomingAllowed,false);
  assert.equal(proof.readCount,1);
  // Confirm that the probe never deleted, modified, or acknowledged the test's WAL entries.
  const still=await page.evaluate(async()=>{
   const req=indexedDB.open('hlgb_durable_wal');
   const db=await new Promise((resolve,reject)=>{req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error)});
   const rows=await new Promise((resolve,reject)=>{
    const tx=db.transaction('entries','readonly');
    const r=tx.objectStore('entries').getAll();
    r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);
   });db.close();return rows;
  });
  assert.equal(still.length,2);
  assert.equal(still[0].data?.qty,100);
  // A confirmed cleanup done by OTHER code must be observed on next probe,
  // without the guard itself writing anything.
  await page.evaluate(async()=>{
   const req=indexedDB.open('hlgb_durable_wal');
   const db=await new Promise((resolve,reject)=>{req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error)});
   await new Promise((resolve,reject)=>{const tx=db.transaction('entries','readwrite');tx.objectStore('entries').clear();tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error)});db.close();
  });
  const after=await page.evaluate(async()=>({probe:await window.hlgbWalIdbGuard9536.probe(),ids:[...window.hlgbRecordPendingIdentitySet9535()]}));
  assert.equal(after.probe.count,0);
  assert.equal(after.ids.length,0);
  // Regression: the recovery layer must include only-IDB WAL in the visible total.
  const recovery=fs.readFileSync('release-sync-recovery-v9301.js','utf8');
  const loader=fs.readFileSync('app-stable3.html','utf8');
  assert.match(recovery,/hlgbWalIdbGuard9536\?\.keys/);
  assert.match(recovery,/indexedDbOnly:/);
  assert.match(loader,/release-save-transport-v9320\.js','release-wal-idb-convergence-v9536\.js','release-pricing/);
  assert.match(loader,/critical=\[[^\]]*release-wal-idb-convergence-v9536/);
  console.log('PASS '+kind+' — localStorage zero / IndexedDB two; cloud and realtime guarded; no WAL writes');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
