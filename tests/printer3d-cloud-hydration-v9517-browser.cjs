'use strict';
const assert=require('node:assert/strict'),{chromium,webkit}=require('playwright');
const engine=process.env.HLGB_BROWSER==='webkit'?webkit:chromium;
(async()=>{
 const browser=await engine.launch({headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1280,height:780}});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:4173/tests/printer3d-cloud-hydration-v9517-fixture.html',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.hlgbPrinter3dCloud9517?.status()?.verified===true,{timeout:10000});
  const status=await page.evaluate(()=>window.hlgbPrinter3dCloud9517.status());
  assert.equal(status.status,'pass',JSON.stringify(status));
  assert.equal(status.remoteCounts.printer3dProducts.cloud,6);
  assert.equal(status.remoteCounts.printer3dSales.cloud,1);
  assert.equal(status.filamentPriceKg,120);
  const data=await page.evaluate(()=>({count:window.db.printer3dProducts.length,sales:window.db.printer3dSales.length,price:window.db.printer3dSettings[0].filamentPriceKg,rev:window.hlgbRecordSnapshots.printer3dSettings.get('settings-main').revision}));
  assert.deepEqual(data,{count:6,sales:1,price:120,rev:2});
  assert.match(await page.locator('#printer3dProducts9400Host').innerText(),/Produto 6/);
  assert.match(await page.locator('#printer3dProducts9400Cloud9517').innerText(),/6 produto/);
  const preserved=await page.evaluate(async()=>{
    window.db.printer3dSettings[0].filamentPriceKg=135;
    localStorage.setItem('hlgb_records_pending_v91',JSON.stringify({modules:{printer3dSettings:[{id:'settings-main',deleted:false,data:window.db.printer3dSettings[0]}]}}));
    return window.hlgbPrinter3dCloud9517.refresh('pending-test',true);
  });
  assert.equal(preserved.status,'warn');
  assert.equal(await page.evaluate(()=>window.db.printer3dSettings[0].filamentPriceKg),135,'pending price preserved');
  const offline=await page.evaluate(async()=>{window.__failCloud=true;return window.hlgbPrinter3dCloud9517.refresh('offline',true)});
  assert.equal(offline.status,'warn');
  assert.equal(await page.evaluate(()=>window.db.printer3dProducts.length),6);
  assert.deepEqual(errors,[]);
  console.log('PASS '+engine.name()+': six products, original R$120/kg restored, pending edits preserved, offline safe');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});