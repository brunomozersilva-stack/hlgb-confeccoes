'use strict';
const {chromium,webkit}=require('playwright'),assert=require('node:assert/strict');
const engine=process.env.HLGB_BROWSER==='webkit'?webkit:chromium;
(async()=>{
 const browser=await engine.launch({headless:true});
 try{
  const page=await browser.newPage({viewport:{width:390,height:844}});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:4173/tests/hub-payroll-paid-date-v9515-fixture.html',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.hlgbHubPayrollPaidDate9515?.status()?.automaticMonthlyResyncDisabled===true);
  assert.equal(await page.evaluate(()=>window.__total),39737.93,'old week must not include pay on 9 Nov');
  await page.locator('#hubFinanceWeek').fill('2026-11-09');await page.locator('#hubFinanceWeek').dispatchEvent('change');
  assert.equal(await page.evaluate(()=>window.__total),16324.43,'current week only contains actual 9 Nov payments');
  await page.waitForFunction(()=>!document.querySelector('#hubFinanceEntriesTable button'));
  assert.match(await page.locator('#hubFinanceEntriesTable').innerText(),/Consulta — altere na Folha/);
  assert.equal(await page.evaluate(()=>window.db.hubFinanceEntries[0].value),39637.93,'historic cloud entry not overwritten');
  assert.equal(await page.evaluate(()=>window.__syncWrites),0,'no legacy write');
  assert.deepEqual(errors,[],'no browser script errors');
  console.log('PASS v95.15 '+engine.name()+': historical week unchanged, new payment in correct week, financial records untouched');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
