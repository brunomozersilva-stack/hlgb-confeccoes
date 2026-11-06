'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict');
const {chromium,webkit}=require('playwright');
const engine=process.env.HLGB_BROWSER==='webkit'?webkit:chromium;
const base='http://127.0.0.1:4173/';
(async()=>{
 const browser=await engine.launch({headless:true});
 try{
  const ctx=await browser.newContext({acceptDownloads:true});
  const page=await ctx.newPage();const external=[];
  page.on('request',r=>{if(!r.url().startsWith(base)&&!r.url().startsWith('blob:'))external.push(r.url())});
  await page.goto(base+'tests/wal-evidence-export-v9494-fixture.html');
  await page.evaluate(async()=>{
   const req=indexedDB.open('hlgb_durable_wal',1);
   await new Promise((ok,bad)=>{
    req.onupgradeneeded=()=>req.result.createObjectStore('entries',{keyPath:'key'});
    req.onerror=()=>bad(req.error);
    req.onsuccess=()=>{
     const tx=req.result.transaction('entries','readwrite'),store=tx.objectStore('entries');
     store.put({key:'projectionInvoices|unconfirmed',module:'projectionInvoices',id:'unconfirmed',opId:'test-id-151',
      data:{id:'unconfirmed',amount:300.01,description:'Invoice pending on this machine'}});
     store.put({key:'routePlans|route-confirmation',module:'routePlans',id:'route-confirmation',opId:'test-id-152',
      data:{routeStops:[{id:'x'},{id:'y'}]}});
     tx.oncomplete=()=>{req.result.close();ok()};
     tx.onerror=()=>bad(tx.error)
    }
   });
   localStorage.setItem('hlgb_durable_wal_v1',JSON.stringify({version:1,entries:{
    'projectionInvoices|unconfirmed':{module:'projectionInvoices',opId:'test-id-151',data:{amount:300.02}}
   }}));
   localStorage.setItem('hlgb_records_pending_v91',JSON.stringify({modules:{
    cuts:[{id:'c100',data:{qty:25}}],
    production:[{id:'p100',data:{planned:87}},{id:'p101',data:{planned:12}}]
   }}));
  });
  const before=await page.evaluate(()=>({wal:localStorage.getItem('hlgb_durable_wal_v1'),
   pending:localStorage.getItem('hlgb_records_pending_v91')}));
  await page.goto(base+'resgatar-wal.html');
  assert.equal(await page.locator('#export').count(),1);
  assert.equal(await page.evaluate(()=>typeof window.hlgbAuditorAutoCorrect9448),'undefined','rescue must not boot Auditor');
  assert.deepEqual(await page.evaluate(()=>performance.getEntriesByType('resource').map(x=>x.name)),[],
   'rescue must load no app JavaScript or external files');
  const d=page.waitForEvent('download');
  await page.locator('#export').click();
  if(process.env.HLGB_BROWSER==='webkit'){
   await page.locator('#manualDownload').waitFor({state:'visible'});
   assert.match(await page.locator('#result').textContent(),/Cópia preparada/);
   await page.locator('#manualDownload').click();
  }
  const download=await d;
  const json=JSON.parse(fs.readFileSync(await download.path(),'utf8'));
  assert.equal(json.kind,'hlgb_wal_local_evidence_backup');
  assert.equal(json.formatVersion,'94.99');
  assert.equal(json.normalizedPendingCount,3);
  assert.equal(json.normalizedPending.modules.cuts[0].data.qty,25);
  assert.equal(json.normalizedPending.modules.production.length,2);
  await page.locator('#copyBackup').click();
  assert.equal(await page.locator('#backupText').inputValue(),JSON.stringify(json,null,2),
   'Safari/Chrome fallback textarea must contain complete and unchanged backup');
  assert.equal(await page.locator('#backupText').isVisible(),true);
  assert.equal(await page.locator('#manualDownload').isVisible(),true);
  assert(download.suggestedFilename().includes(process.env.HLGB_BROWSER==='webkit'?'SAFARI':'CHROME'));
  assert.equal(json.indexedDbEntries.length,2);
  assert.equal(json.indexedDbEntries.find(x=>x.module==='projectionInvoices').data.amount,300.01);
  assert.equal(json.localStorageWal.entries['projectionInvoices|unconfirmed'].data.amount,300.02);
  assert.match(await page.locator('#result').textContent(),/Nenhuma operação foi excluída/);
  const after=await page.evaluate(async()=>{
   const read=indexedDB.open('hlgb_durable_wal');
   const rows=await new Promise((ok,bad)=>{
    read.onerror=()=>bad(read.error);
    read.onsuccess=()=>{
     const db=read.result,tx=db.transaction('entries','readonly'),get=tx.objectStore('entries').getAll();
     get.onsuccess=()=>ok(get.result);get.onerror=()=>bad(get.error);
     tx.oncomplete=()=>db.close()
    }
   });
   return {rows,local:localStorage.getItem('hlgb_durable_wal_v1'),
    pending:localStorage.getItem('hlgb_records_pending_v91')}
  });
  assert.equal(after.rows.length,2);
  assert.equal(after.local,before.wal,'byte-for-byte WAL localStorage unchanged');
  assert.equal(after.pending,before.pending,'normalized pending queue must remain unchanged');
  assert.deepEqual(external,[],'rescue must make no external network requests');
  const fresh=await browser.newContext({acceptDownloads:true});
  const empty=await fresh.newPage();
  await empty.goto(base+'resgatar-wal.html');
  await empty.locator('#export').click();
  await empty.waitForFunction(()=>document.getElementById('result')?.textContent.includes('❌'));
  assert.match(await empty.locator('#result').textContent(),/WAL não existe|Nenhuma WAL/);
  await fresh.close();await ctx.close();
  console.log('PASS v95.00 '+(process.env.HLGB_BROWSER||'chromium')+': Safari manual click and copy fallback, complete 3-store backup, no writes/network');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
