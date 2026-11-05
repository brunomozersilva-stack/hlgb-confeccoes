'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict');
const {chromium,webkit}=require('playwright');
const engine=process.env.HLGB_BROWSER==='webkit'?webkit:chromium;
(async()=>{
 const browser=await engine.launch({headless:true});
 try{
  const context=await browser.newContext({acceptDownloads:true});
  const page=await context.newPage();
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:4173/tests/wal-evidence-export-v9494-fixture.html');
  await page.waitForFunction(()=>!!window.hlgbAuditorAutoCorrect9448?.exportWalPayload);
  const before=await page.evaluate(async()=>{
   const operations=[
    {key:'projectionInvoices|p-test',module:'projectionInvoices',id:'p-test',opId:'test-op-projection-9494',
     deleted:false,data:{id:'p-test',amount:128.9,description:'Projeção não enviada'},baseData:null,state:'pending'},
    {key:'routePlans|r-test',module:'routePlans',id:'r-test',opId:'test-op-route-9494',
     deleted:false,data:{id:'r-test',stops:[{name:'A'},{name:'B'}]},state:'pending'}
   ];
   const req=indexedDB.open('hlgb_durable_wal',1);
   await new Promise((resolve,reject)=>{
    req.onupgradeneeded=()=>req.result.createObjectStore('entries',{keyPath:'key'});
    req.onerror=()=>reject(req.error);
    req.onsuccess=()=>{
     const tx=req.result.transaction('entries','readwrite');
     for(const op of operations)tx.objectStore('entries').put(op);
     tx.oncomplete=()=>{req.result.close();resolve()};
     tx.onerror=()=>reject(tx.error)
    }
   });
   const local={version:1,entries:{
    'projectionInvoices|p-test':{...operations[0],data:{id:'p-test',amount:129.1,note:'cópia local diferente'}}
   }};
   localStorage.setItem('hlgb_durable_wal_v1',JSON.stringify(local));
   window.__HLGB_AUTH_READY=true;
   window.hlgbAuditorAutoCorrect9448.render({
    passes:0,stopReason:'pending proof',needsCode:[],
    triage:{signal:{indexedDbWal:{count:2,items:operations.map(({module,id,opId,key})=>({module,id,opId,key}))}}}
   });
   return {localRaw:localStorage.getItem('hlgb_durable_wal_v1'),ops:operations}
  });
  assert.equal(await page.locator('#hlgbWalEvidenceExport9494').count(),1);
  const downloading=page.waitForEvent('download');
  await page.locator('#hlgbWalEvidenceExport9494').click();
  const download=await downloading;
  assert(download.suggestedFilename().startsWith('HLGB-WAL-COPIA-SEGURA-'));
  const bytes=fs.readFileSync(await download.path(),'utf8'),saved=JSON.parse(bytes);
  assert.equal(saved.kind,'hlgb_wal_local_evidence_backup');
  assert.equal(saved.formatVersion,'94.94');
  assert.equal(saved.indexedDbEntries.length,2);
  assert.equal(saved.indexedDbEntries.find(x=>x.key==='projectionInvoices|p-test').data.amount,128.9);
  assert.equal(saved.localStorageWal.entries['projectionInvoices|p-test'].data.amount,129.1);
  assert.equal(saved.indexedDbEntries.find(x=>x.key==='routePlans|r-test').opId,'test-op-route-9494');
  const after=await page.evaluate(async()=>{
   const current=await window.hlgbAuditorAutoCorrect9448.readWalIndexedDb();
   return {data:current,localRaw:localStorage.getItem('hlgb_durable_wal_v1'),
    message:document.querySelector('#hlgbWalEvidenceExportStatus9494')?.textContent};
  });
  assert.deepEqual(after.data.map(x=>x.key).sort(),before.ops.map(x=>x.key).sort());
  assert.equal(after.data.find(x=>x.key==='projectionInvoices|p-test').data.amount,128.9);
  assert.equal(after.localRaw,before.localRaw,'localStorage must be byte-for-byte unchanged');
  assert.match(after.message,/Nenhuma operação foi removida/);
  assert.deepEqual(errors,[]);
  // An empty origin (new browser storage partition) must not generate a fake backup.
  const fresh=await browser.newContext({acceptDownloads:true});
  const other=await fresh.newPage();
  await other.goto('http://127.0.0.1:4173/tests/wal-evidence-export-v9494-fixture.html');
  await other.waitForFunction(()=>!!window.hlgbAuditorAutoCorrect9448?.exportWalPayload);
  await other.evaluate(()=>{
   window.__HLGB_AUTH_READY=true;
   window.hlgbAuditorAutoCorrect9448.render({passes:0,needsCode:[],
     triage:{signal:{indexedDbWal:{count:1,items:[{module:'routePlans',id:'none',opId:'none'}]}}}});
  });
  await other.locator('#hlgbWalEvidenceExport9494').click();
  await other.waitForFunction(()=>document.querySelector('#hlgbWalEvidenceExportStatus9494')?.textContent.includes('❌'));
  assert.match(await other.locator('#hlgbWalEvidenceExportStatus9494').textContent(),/base WAL não existia/);
  await fresh.close();await context.close();
  console.log('PASS v94.94 '+(process.env.HLGB_BROWSER||'chromium')+': explicit download, both WAL copies preserved, no deletions, missing DB blocks empty backup');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
