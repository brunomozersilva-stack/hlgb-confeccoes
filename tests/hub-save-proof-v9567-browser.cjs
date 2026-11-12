'use strict';
const assert=require('node:assert/strict'),{chromium,webkit}=require('playwright');
const engine=process.env.HLGB_BROWSER==='webkit'?webkit:chromium;
(async()=>{
 const browser=await engine.launch({headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1200,height:850},serviceWorkers:'block'});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:4173/tests/hub-save-v9483-fixture.html',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.hlgbHubSaveProof9567?.version==='95.67'&&
   window.hlgbHubDelivery9324?.build==='94.88');
  await page.evaluate(()=>window.newHubFinanceEntry('Saída'));
  await page.locator('#testDesc').fill('Teste de clique real P0');
  await page.locator('#testValue').fill('43.90');
  assert.equal(await page.locator('#modal .modalSave').count(),1);
  await page.locator('#modal .modalSave').click();
  await page.waitForFunction(()=>window.hlgbHubSaveProof9567.status().confirmed===1);
  const first=await page.evaluate(()=>{
   const found=[...window.__fixture.remote.values()].filter(x=>x.data.description==='Teste de clique real P0');
   const proof=window.hlgbHubSaveProof9567.status(),trace=window.hlgbHubSaveTrace9483.status();
   return {count:found.length,value:found[0]?.data.value,
    calls:window.__fixture.rpcCalls.filter(x=>String(x.id)===String(found[0]?.entity_id)).length,
    ui:proof.last.phase,proofConfirmed:proof.confirmed,clicks:proof.clicks,
    trace:trace.outcome,clickObserved:trace.clickObserved,readback:!!trace.readbackAt};
  });
  assert.equal(first.count,1);assert.equal(first.value,43.9);
  assert.equal(first.calls,1,'document bubble listener must not submit the modal twice');
  assert.equal(first.ui,'confirmed');assert.equal(first.proofConfirmed,1);
  assert.equal(first.clicks,1);assert.equal(first.trace,'confirmed');
  assert.equal(first.clickObserved,true);assert.equal(first.readback,true);
  // Empty mandatory fields are validation errors, not server errors.
  await page.evaluate(()=>window.newHubFinanceEntry('Saída'));
  await page.locator('#testDesc').fill('');
  await page.locator('#testValue').fill('8.50');
  const before=await page.evaluate(()=>window.__fixture.rpcCalls.length);
  await page.locator('#modal .modalSave').click();
  await page.waitForFunction(()=>window.hlgbHubSaveProof9567.status().last.phase==='blocked');
  const blocked=await page.evaluate(()=>window.hlgbHubSaveProof9567.status());
  assert.equal(blocked.last.errorCode,'form-rejected');
  assert.equal(await page.evaluate(()=>window.__fixture.rpcCalls.length),before);
  assert.equal(await page.locator('#testValue').inputValue(),'8.5');
  // Missing callback is not a successful save; the modal remains intact.
  await page.evaluate(()=>window.modalSave=null);
  await page.locator('#modal .modalSave').click();
  await page.waitForFunction(()=>window.hlgbHubSaveProof9567.status().last.errorCode==='no-modal-callback');
  assert.equal(await page.locator('#testValue').inputValue(),'8.5');
  assert.equal(await page.evaluate(()=>window.__fixture.rpcCalls.length),before);
  // Backend/connection failures remain distinct from validation failure.
  await page.evaluate(()=>window.newHubFinanceEntry('Saída'));
  await page.locator('#testDesc').fill('Tentativa offline protegida');
  await page.locator('#testValue').fill('19.20');
  await page.context().setOffline(true);
  await page.locator('#modal .modalSave').click();
  await page.waitForFunction(()=>window.hlgbHubSaveProof9567.status().last.phase==='failed');
  const net=await page.evaluate(()=>window.hlgbHubSaveProof9567.status());
  assert.equal(net.last.errorCode,'network');
  assert.equal(await page.locator('#testDesc').inputValue(),'Tentativa offline protegida');
  await page.context().setOffline(false);
  assert.deepEqual(errors,[],errors.join(' | '));
  console.log('PASS Hub v95.67 '+engine.name()+': single click, ACK + readback, validation, missing callback, offline and no duplicate RPC');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
