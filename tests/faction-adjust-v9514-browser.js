'use strict';
const {chromium,webkit}=require('playwright'),assert=require('node:assert/strict');
const engine=process.env.HLGB_BROWSER==='webkit'?webkit:chromium;
(async()=>{
 const browser=await engine.launch({headless:true});
 try{
 const page=await browser.newPage({viewport:{width:390,height:844}});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:4173/tests/faction-adjust-v9514-fixture.html',{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>typeof window.hlgbFactionAdjust9514?.open==='function'&&!!document.querySelector('.hlgb-faction-adjust9514'),null,{timeout:12000});
 await page.locator('.hlgb-faction-adjust9514').click();
 await page.locator('#hlgbFactionAction9514').selectOption('transfer');
 await page.locator('#hlgbFactionTarget9514').selectOption('Facção Beta');
 await page.locator('#hlgbFactionQuantity9514').fill('30');
 await page.locator('#hlgbFactionReason9514').fill('Redistribuição de capacidade da fábrica');
 assert((await page.locator('#hlgbFactionPreview9514').innerText()).includes('70 peça(s)'));
 await page.locator('#hlgbFactionSubmit9514').click();
 await page.waitForFunction(()=>!!window.hlgbFactionAdjust9514.status().lastResult,null,{timeout:15000});
 let snap=await page.evaluate(()=>({
  calls:window.__rpcCalls.map(x=>({action:x.p_action,id:x.p_faction_id,qty:x.p_quantity,reason:x.p_reason,revision:x.p_expected_revision,token:x.p_request_id})),
  origin:window.__remote.factions['1'].data.sent,local:window.db.factions.map(x=>({id:x.id,name:x.name,sent:x.sent})),
  status:window.hlgbFactionAdjust9514.status()
 }));
 assert.equal(snap.calls.length,1);
 assert.equal(snap.calls[0].revision,5);
 assert.equal(snap.calls[0].qty,30);
 assert.match(snap.calls[0].token,/^[0-9a-f-]{36}$/);
 assert.equal(snap.origin,70);
 assert.equal(snap.local.reduce((sum,x)=>sum+Number(x.sent),0),100,'total pieces must stay unchanged');
 assert(snap.local.some(x=>x.name==='Facção Beta'&&x.sent===30));
 await page.evaluate(()=>window.hlgbFactionAdjust9514.open('1'));
 await page.locator('#hlgbFactionAction9514').selectOption('price');
 await page.locator('#hlgbFactionPrice9514').fill('2.50');
 await page.locator('#hlgbFactionReason9514').fill('Novo valor negociado de mão de obra');
 await page.locator('#hlgbFactionSubmit9514').click();
 await page.waitForFunction(()=>window.__rpcCalls.length===2,null,{timeout:15000});
 snap=await page.evaluate(()=>({
  calls:window.__rpcCalls.map(x=>({action:x.p_action,id:x.p_faction_id,price:x.p_new_price,revision:x.p_expected_revision})),
  price:window.__remote.factions['1'].data.price,
  ui:window.db.factions.find(f=>String(f.id)==='1').price
 }));
 assert.equal(snap.calls[1].action,'price');
 assert.equal(snap.calls[1].revision,6);
 assert.equal(snap.price,2.5);
 assert.equal(snap.ui,2.5);
 await page.evaluate(()=>{
  localStorage.setItem('hlgb_durable_wal_v1',JSON.stringify({entries:{
   'factions|1':{module:'factions',id:'1',data:{name:'unsynced'}}
  }}));
  window.hlgbFactionAdjust9514.open('1');
 });
 await page.locator('#hlgbFactionAction9514').selectOption('price');
 await page.locator('#hlgbFactionPrice9514').fill('2.75');
 await page.locator('#hlgbFactionReason9514').fill('Alteração não deve sobrepor WAL pendente');
 await page.locator('#hlgbFactionSubmit9514').click();
 await page.waitForFunction(()=>/pendente|não confirmad/i.test(window.hlgbFactionAdjust9514.status().lastError),null,{timeout:10000});
 assert.equal(await page.evaluate(()=>window.__rpcCalls.length),2,'Never send RPC with locally pending operation');
 assert(/pendente|não confirmad/i.test(await page.locator('#hlgbFactionError9514').innerText()));
 assert.deepEqual(errors,[],'no browser errors in workflow');
 console.log('PASS v95.14 '+engine.name()+': split 100=70+30, update unpaid price, forbid local WAL collision, confirm cloud readback');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});