'use strict';
const assert=require('node:assert/strict');
const {chromium,webkit}=require('playwright');
const engine=process.env.HLGB_BROWSER==='webkit'?webkit:chromium;
(async()=>{
 const browser=await engine.launch({headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1408,height:900}});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:4173/tests/payroll-alpha-fare-v9489-fixture.html');
  await page.waitForFunction(()=>window.hlgbPayrollSaveStability9296?.version==='94.96');
  const first=await page.evaluate(()=>{
   const ana=window.db.employees.find(x=>x.id==='1');
   const row=window.db.payroll.find(x=>x.id==='p-a');
   ana.hasTransport=false;
   window.hlgbPayrollView9295.render();
   const before=window.payrollCalc(row,ana);
   row.transportOverride=121; // Explicit monthly credit as on the reported payroll
   window.hlgbPayrollView9295.render();
   const after=window.payrollCalc(row,ana);
   const z=window.db.payroll.find(x=>x.id==='p-z');
   const zcalc=window.payrollCalc(z,window.db.employees.find(x=>x.id==='2'));
   return {before,after,other:zcalc,rowMarkup:document.getElementById('payrollTable').textContent};
  });
  assert.equal(first.before.transport,0,'no automatic passage for disabled transport');
  assert.equal(first.after.transport,121,'explicit passage must be honored');
  assert.equal(first.after.gross,first.before.gross+121,'credit must enter gross');
  assert.equal(first.after.net,first.before.net+121,'credit must enter payable net');
  assert(first.rowMarkup.includes('R$ 121,00'),'breakdown must show manual passage');
  assert.equal(first.other.transport,120,'other employees keep automatic fare');
  // Employee-panel adjustment must remain usable even if automatic benefit is off.
  await page.evaluate(()=>{
   window.openModal('Editar empregado','<button class="modalSave">Salvar cadastro</button>',()=>{});
   window.hlgbPayrollSaveStability9296.employeeFarePanel('1');
  });
  assert.equal(await page.locator('#hlgbFareAmount9490').inputValue(),'121');
  assert.equal(await page.locator('#hlgbFareAmount9490').isDisabled(),false);
  assert.match(await page.locator('#hlgbFareHint9490').textContent(),/sem transporte automático/i);
  await page.locator('#hlgbFareAmount9490').fill('145.50');
  await page.locator('#hlgbFareSave9490').click();
  await page.waitForFunction(()=>window.db.payroll.find(x=>x.id==='p-a').transportOverride===145.5);
  const saved=await page.evaluate(()=>{
   const row=window.db.payroll.find(x=>x.id==='p-a'),emp=window.db.employees.find(x=>x.id==='1');
   return {row:structuredClone(row),calc:window.payrollCalc(row,emp),calls:window.__fixture.rpcCalls.slice()};
  });
  assert.equal(saved.calc.transport,145.5);
  assert.equal(saved.calc.net,2145.5);
  assert.equal(saved.calls.length,1,'one cloud ACK for only this record');
  assert.equal(saved.calls[0].id,'p-a');
  // Blank passage must resume automatic calculation (zero when disabled).
  await page.locator('#hlgbFareAmount9490').fill('');
  await page.locator('#hlgbFareSave9490').click();
  await page.waitForFunction(()=>window.db.payroll.find(x=>x.id==='p-a').transportOverride===null);
  assert.equal(await page.evaluate(()=>{
   const row=window.db.payroll.find(x=>x.id==='p-a'),emp=window.db.employees.find(x=>x.id==='1');
   return window.payrollCalc(row,emp).transport;
  }),0);
  // No silent revisions after payment.
  await page.evaluate(()=>{
   const row=window.db.payroll.find(x=>x.id==='p-a');row.paid=true;row.paidValue=2000;
  });
  await assert.rejects(()=>page.evaluate(()=>window.hlgbPayrollSaveStability9296.saveEmployeeFare('1','2026-11','100')),/PAGO/);
  assert.equal(errors.length,0,errors.join(' | '));
  console.log('PASS v94.96 '+(process.env.HLGB_BROWSER||'chromium')+': explicit passage on disabled benefit enters total, other employees untouched, cloud ACK, blank reset, paid blocked');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});