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
  await page.waitForFunction(()=>Boolean(window.hlgbPayrollSaveStability9296?.edit&&window.hlgbPayrollView9295?.render));
  const state=async()=>page.evaluate(()=>{
    window.hlgbPayrollView9295.render();
    return {
      view:window.hlgbPayrollView9295.getView(),
      names:[...document.querySelectorAll('#payrollTable .hlgb-payroll-name strong')].map(x=>x.textContent),
      panel:Boolean(document.getElementById('hlgbPayrollFare9489')),
      fareParent:document.getElementById('payrollFareValue')?.closest('#hlgbPayrollFare9489')?.id,
      fareValue:document.getElementById('payrollFareValue')?.value,
      daysValue:document.getElementById('payrollWorkDays')?.value
    };
  });
  const initial=await state();
  assert.equal(initial.view,'alpha','new payroll view must default to A-Z');
  assert.deepEqual(initial.names,['Ana','Zuleica']);
  assert.equal(initial.panel,true,'passage controls must appear in a stable visible panel');
  assert.equal(initial.fareParent,'hlgbPayrollFare9489');
  assert.equal(initial.fareValue,'6');
  assert.equal(initial.daysValue,'22');
  // Failed localStorage writes must never revert the active A-Z view.
  await page.evaluate(()=>{
   const old=Storage.prototype.setItem;
   Storage.prototype.setItem=function(k,v){if(String(k).includes('payroll_view'))throw new DOMException('Quota exceeded','QuotaExceededError');return old.call(this,k,v)};
   window.hlgbPayrollView9295.setView('company');
   window.hlgbPayrollView9295.setView('alpha');
   window.renderPayroll();
  });
  assert.equal((await state()).view,'alpha');
  assert.deepEqual((await state()).names,['Ana','Zuleica']);

  // One employee gets a manual passage amount; a different employee remains unchanged.
  await page.evaluate(()=>window.editPayrollRow('p-z'));
  assert.equal(await page.locator('#prTransportOverride').inputValue(),'');
  await page.locator('#prTransportOverride').fill('70.50');
  await page.locator('#modal .modalSave').click();
  await page.waitForFunction(()=>!document.getElementById('modal').children.length);
  let proof=await page.evaluate(()=>{
   const z=window.db.payroll.find(x=>x.id==='p-z'),a=window.db.payroll.find(x=>x.id==='p-a');
   return {z:structuredClone(z),a:structuredClone(a),
    zcalc:window.payrollCalc(z,window.db.employees.find(e=>e.id==='2')),
    acalc:window.payrollCalc(a,window.db.employees.find(e=>e.id==='1')),
    calls:window.__fixture.rpcCalls.length};
  });
  assert.equal(proof.z.transportOverride,70.5);
  assert.equal(proof.zcalc.transport,70.5);
  assert.equal(proof.zcalc.gross,2070.5);
  assert.equal(proof.zcalc.net,2070.5);
  assert.equal(proof.acalc.transport,132);
  assert.equal(proof.a.transportOverride,undefined);
  assert.equal(proof.calls,1,'one cloud write for one edited employee');
  assert.deepEqual((await state()).names,['Ana','Zuleica'],'saving cannot change A-Z order');

  // Mark paid: use the adjusted net, and still render A-Z.
  await page.evaluate(()=>window.togglePayrollPaid('p-z'));
  await page.waitForFunction(()=>window.db.payroll.find(x=>x.id==='p-z').paid);
  const paid=await page.evaluate(()=>window.db.payroll.find(x=>x.id==='p-z').paidValue);
  assert.equal(paid,2070.5);
  assert.deepEqual((await state()).names,['Ana','Zuleica']);

  // Clearing the optional override returns to the original fare/day/absence rule.
  await page.evaluate(()=>window.editPayrollRow('p-z'));
  assert.equal(await page.locator('#prTransportOverride').inputValue(),'70.5');
  await page.locator('#prTransportOverride').fill('');
  await page.locator('#prTransportAbsenceDays').fill('3');
  await page.locator('#modal .modalSave').click();
  await page.waitForFunction(()=>!document.getElementById('modal').children.length);
  const restored=await page.evaluate(()=>{
   const row=window.db.payroll.find(x=>x.id==='p-z');
   return {row:structuredClone(row),c:window.payrollCalc(row,window.db.employees.find(e=>e.id==='2'))};
  });
  assert.equal(restored.row.transportOverride,undefined);
  assert.equal(restored.row.transportAbsenceDays,3);
  assert.equal(restored.c.transport,114,'original 19 days * R$6,00');
  assert.equal(restored.row.paidValue,2114);
  assert.deepEqual((await state()).names,['Ana','Zuleica']);

  // No remote ACK means no local mutation, no modal dismissal, no lost inputs.
  await page.evaluate(()=>{window.__fixture.failOnce=true;window.editPayrollRow('p-a')});
  await page.locator('#prTransportOverride').fill('30.00');
  await page.locator('#modal .modalSave').click();
  await page.waitForFunction(()=>window.__fixture.alerts.some(x=>x.includes('nuvem não confirmou')));
  assert.equal(await page.locator('#prTransportOverride').inputValue(),'30.00');
  const failed=await page.evaluate(()=>({
   anna:window.db.payroll.find(x=>x.id==='p-a').transportOverride,
   modal:document.getElementById('modal').children.length
  }));
  assert.equal(failed.anna,undefined);
  assert(failed.modal>0,'modal remains open after a failed save');
  assert.deepEqual((await state()).names,['Ana','Zuleica']);
  assert.equal(errors.length,0,errors.join(' | '));
  console.log('PASS payroll v94.89 '+(process.env.HLGB_BROWSER||'chromium')+': A-Z persists without localStorage, fare panel visible, per-person monthly override/revert, paid net and failed cloud ACK protected');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
