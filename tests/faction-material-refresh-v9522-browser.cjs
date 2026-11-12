'use strict';
const assert=require('node:assert/strict'),{chromium,webkit}=require('playwright');
const engine=process.env.HLGB_BROWSER==='webkit'?webkit:chromium;
(async()=>{
 const browser=await engine.launch({headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1180,height:900},serviceWorkers:'block'});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:4173/tests/faction-material-refresh-v9522-fixture.html',{waitUntil:'domcontentloaded',timeout:30000});
  await page.evaluate(async()=>{
   const r=await new Promise((resolve,reject)=>{
    const req=indexedDB.open('hlgb_durable_wal',1);
    req.onupgradeneeded=()=>req.result.createObjectStore('entries',{keyPath:'key'});
    req.onerror=()=>reject(req.error);req.onsuccess=()=>resolve(req.result)
   });r.close();
   window.renderDestinationChecklists();
   window.renderFactionChecklists9198();
  });
  await page.locator('#hlgbMaterialRevisions9522 details > summary').click();
  await page.locator('#hlgbFactionMaterialRevisions9522 details > summary').click();
  await page.waitForSelector('#hlgbMaterialRevisions9522 button[data-material-revision9522]',{timeout:12000});
  await page.waitForSelector('#hlgbFactionMaterialRevisions9522 button[data-material-revision9522]',{timeout:12000});
  const first=await page.locator('#hlgbMaterialRevisions9522').innerText();
  assert.match(first,/Short Doll Crystal/);
  const faccoes=await page.locator('#hlgbFactionMaterialRevisions9522').innerText();
  assert.match(faccoes,/Short Doll Crystal/);
  assert.match(faccoes,/Short Doll Melanie/);
  assert.match(faccoes,/Graziano/);
  assert.match(faccoes,/Vanessa/);
  assert.match(first,/Short Doll Melanie/);
  assert.match(first,/0 material\(is\) no envio \/ 4 na ficha/);
  assert.match(first,/0 material\(is\) no envio \/ 6 na ficha/);
  assert.equal(await page.evaluate(()=>window.__posts),0,'viewing old dispatch may not trigger write');
  // Old printing must be blocked until the updated checklist is reviewed.
  const unsafePrint=await page.evaluate(()=>{
   printMaterialChecklist(1794313232479);
   return {alerts:window.__alerts.slice(),legacy:document.getElementById('legacyPrint').textContent};
  });
  assert.ok(unsafePrint.alerts.some(v=>/desatualizado/i.test(v)),'stale print must warn');
  assert.equal(unsafePrint.legacy,'','outdated checklist must not be printed');

  await page.locator('#hlgbMaterialRevisions9522 [data-material-revision9522="1794313232479"]').click();
  await page.waitForSelector('#hlgbMaterialRefreshConfirm9522');
  const modal=await page.locator('#modal').innerText();
  assert.match(modal,/Romantic/);
  assert.match(modal,/32/,'Crystal: 192 / 6 = 32 kg of Romantic');
  await page.locator('#hlgbMaterialRefreshConfirm9522').click();
  await page.waitForFunction(()=>window.db.materialChecklists[0].materials.length===4,{timeout:10000});
  const c=await page.evaluate(()=>({
   posts:window.__posts,
   len:db.materialChecklists[0].materials.length,
   kg:db.materialChecklists[0].materials.find(m=>m.name==='Romantic').qty,
   revision:window.hlgbRecordSnapshots.materialChecklists.get('1794313232479').revision,
   printed:document.getElementById('legacyPrint').textContent
  }));
  assert.equal(c.posts,1);assert.equal(c.len,4);assert.equal(c.kg,32);assert.equal(c.revision,2);
  await page.locator('#hlgbMaterialRevisions9522 [data-material-revision9522="1794313367933"]').click();
  await page.waitForSelector('#hlgbMaterialRefreshConfirm9522');
  assert.match(await page.locator('#modal').innerText(),/21,5/,'Melanie: 172 / 8 = 21.5 kg');
  await page.locator('#hlgbMaterialRefreshConfirm9522').click();
  await page.waitForFunction(()=>window.db.materialChecklists[1].materials.length===6,{timeout:10000});
  const data=await page.evaluate(()=>({posts:window.__posts,
   count:db.materialChecklists[1].materials.length,
   kg:db.materialChecklists[1].materials.find(m=>m.name==='Romantic').qty,
   payments:(db.factionPayments||[]).length}));
  assert.equal(data.posts,2);assert.equal(data.count,6);assert.equal(data.kg,21.5);assert.equal(data.payments,0);
  await page.evaluate(()=>{db.materialChecklists[0].materials[0].checked=true;db.materialChecklists[0].materials[0].qty=99;renderDestinationChecklists()});
  await page.waitForSelector('#hlgbMaterialRevisions9522 [data-material-revision9522="1794313232479"]');
  await page.locator('#hlgbMaterialRevisions9522 [data-material-revision9522="1794313232479"]').click();
  await page.waitForFunction(()=>document.getElementById('modal').textContent.includes('revisão manual'));
  assert.equal(await page.locator('#hlgbMaterialRefreshConfirm9522').count(),0,'checked materials must not be auto-rewritten');
  assert.equal(await page.evaluate(()=>window.__posts),2);
  assert.deepEqual(errors,[]);
  console.log('PASS '+engine.name()+': Crystal 4 items, Melanie 6 items, live yield calculation, cloud ACK, checked items protected');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});