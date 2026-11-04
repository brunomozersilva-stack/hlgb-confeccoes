'use strict';
const assert=require('node:assert/strict');
const {chromium,webkit}=require('playwright');
const engine=process.env.HLGB_BROWSER==='webkit'?webkit:chromium;
(async()=>{
 const browser=await engine.launch({headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1408,height:900}});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:4173/tests/hub-save-v9483-fixture.html');
  await page.waitForFunction(()=>window.hlgbHubDelivery9324?.build==='94.83'&&typeof window.newHubFinanceEntry==='function');

  // Real create button event. Local persistence is intentionally QuotaExceededError.
  await page.evaluate(()=>window.newHubFinanceEntry('Saída'));
  await page.locator('#testDesc').fill('Novo teste confirmado');
  await page.locator('#testValue').fill('86.40');
  await page.locator('#modal .modalSave').click();
  await page.waitForFunction(()=>document.getElementById('modal').hidden===true);
  const created=await page.evaluate(()=>{
   const r=[...window.__fixture.remote.values()].find(x=>x.data.description==='Novo teste confirmado');
   return {rev:r?.revision,value:r?.data.value,
    n:window.__fixture.rpcCalls.filter(x=>String(x.id)===String(r?.entity_id)).length,
    local:window.db.hubFinanceEntries.some(x=>String(x.id)===String(r?.entity_id)),
    trace:window.hlgbHubSaveTrace9483.status()};
  });
  assert.equal(created.rev,1);
  assert.equal(created.value,86.4);
  assert.equal(created.n,1);
  assert.equal(created.local,true);
  assert.equal(created.trace.clickObserved,true);
  assert.equal(created.trace.outcome,'confirmed');

  // Real editor, same record, expected revision 4 -> 5, then verified GET.
  await page.evaluate(()=>window.hlgbHubEditor9270.open('hub-fixture-old'));
  await page.locator('#heValue9286').fill('96.40');
  await page.locator('.he-save9286').click();
  await page.waitForFunction(()=>!document.getElementById('hlgbHubEditor9270'));
  const edited=await page.evaluate(()=>({
   server:window.__fixture.remote.get('hub-fixture-old'),
   calls:window.__fixture.rpcCalls.filter(x=>x.id==='hub-fixture-old').length,
   trace:window.hlgbHubSaveTrace9483.status()
  }));
  assert.equal(edited.server.revision,5);
  assert.equal(edited.server.data.value,96.4);
  assert.equal(edited.calls,1);
  assert.equal(edited.trace.clickObserved,true);
  assert(edited.trace.readbackAt&&edited.trace.ackAt);

  // Remote revision changed by another computer; editor must remain open with same text.
  await page.evaluate(()=>{
   const remote=window.__fixture.remote.get('hub-fixture-old');remote.revision=6;remote.data.value=700;
   window.hlgbHubEditor9270.open('hub-fixture-old');
  });
  await page.locator('#heValue9286').fill('123.45');
  await page.locator('.he-save9286').click();
  await page.waitForFunction(()=>getComputedStyle(document.getElementById('heErr9286')).display!=='none');
  assert.equal(await page.locator('#heValue9286').inputValue(),'123.45');
  assert.equal(await page.evaluate(()=>window.__fixture.remote.get('hub-fixture-old').data.value),700);

  // After losing the RPC response, the creation form keeps its ID and can safely retry.
  await page.evaluate(()=>{window.hlgbHubEditor9270.close();window.__fixture.dropAckOnce=true;window.newHubFinanceEntry('Saída')});
  await page.locator('#testDesc').fill('Teste retorno perdido');
  await page.locator('#testValue').fill('32.10');
  await page.locator('#modal .modalSave').click();
  await page.waitForFunction(()=>window.__fixture.lastAlert.includes('simulated ACK lost'));
  assert.equal(await page.locator('#modal').getAttribute('hidden'),null);
  await page.locator('#modal .modalSave').click();
  await page.waitForFunction(()=>document.getElementById('modal').hidden===true);
  const retry=await page.evaluate(()=>{
   const r=[...window.__fixture.remote.values()].filter(x=>x.data.description==='Teste retorno perdido');
   return {count:r.length,rpc:window.__fixture.rpcCalls.filter(x=>String(x.id)===String(r[0]?.entity_id)).length}
  });
  assert.equal(retry.count,1);
  assert.equal(retry.rpc,1,'lost ACK may not create a duplicate entry');

  // Network loss must leave the entry form open.
  await page.evaluate(()=>window.newHubFinanceEntry('Saída'));
  await page.locator('#testDesc').fill('Offline preserve form');
  await page.locator('#testValue').fill('17.00');
  await page.context().setOffline(true);
  await page.locator('#modal .modalSave').click();
  await page.waitForFunction(()=>window.__fixture.lastAlert.includes('Sem conexão'));
  assert.equal(await page.locator('#testValue').inputValue(),'17');
  assert.equal(await page.locator('#modal').getAttribute('hidden'),null);
  await page.context().setOffline(false);
  assert.equal(errors.length,0,errors.join(' | '));
  console.log('PASS v94.83 Hub real button Chrome/WebKit fixture: create/edit ACK, quota, lost ACK retry, conflict and offline');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});