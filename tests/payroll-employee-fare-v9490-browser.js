'use strict';
const assert=require('node:assert/strict');
const {chromium,webkit}=require('playwright');
const engine=process.env.HLGB_BROWSER==='webkit'?webkit:chromium;
(async()=>{
 const browser=await engine.launch({headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1408,height:950}});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:4173/tests/payroll-alpha-fare-v9489-fixture.html');
  await page.waitForFunction(()=>window.hlgbPayrollSaveStability9296?.version==='94.96');
  const initial=await page.evaluate(()=>{
   const table=document.createElement('div');table.id='employeeTable';document.body.appendChild(table);
   window.editEmployee=id=>{
    const e=window.db.employees.find(x=>String(x.id)===String(id));
    if(!e)throw Error('missing employee');
    window.openModal('Editar funcionário '+e.name,
     '<div class="grid"><div class="field"><label>Salário</label><input id="empSalary" value="'+e.salary+'"></div></div>'+
     '<button class="primary modalSave" type="button">Salvar alterações do cadastro</button>',()=>window.closeModal());
   };
   window.renderEmployees=()=>{
    table.innerHTML=window.db.employees.map(e=>
     '<div><strong>'+e.name+'</strong> <button class="secondary" onclick="editEmployee('+e.id+')">Editar / histórico</button></div>'
    ).join('');
   };
   window.hlgbPayrollSaveStability9296.install();
   window.renderEmployees();
   return {
    version:window.hlgbPayrollSaveStability9296.version,
    employeeButtons:[...document.querySelectorAll('[data-hlgb-employee-fare-9490]')].length,
    payrollButtons:[...document.querySelectorAll('#payrollTable button')].filter(x=>x.textContent.includes('Passagem')).length
   };
  });
  assert.equal(initial.employeeButtons,2,'passage action must be visible on each employee');
  assert.equal(initial.payrollButtons,2,'passage action must be visible on the payroll rows');
  // Use the user-visible button on the employee page.
  await page.locator('#employeeTable [data-hlgb-employee-fare-9490]').last().click();
  assert.equal(await page.locator('#hlgbFareMonth9490').inputValue(),'2026-11');
  assert.equal(await page.locator('#hlgbFareAmount9490').inputValue(),'');
  assert.match(await page.locator('#hlgbFareHint9490').textContent(),/R\$ 120,00|R\$ 120\.00/);
  await page.locator('#hlgbFareAmount9490').fill('73.50');
  await page.locator('#hlgbFareSave9490').click();
  await page.waitForFunction(()=>window.db.payroll.find(x=>x.id==='p-z').transportOverride===73.5);
  let state=await page.evaluate(()=>{
   const a=window.db.payroll.find(x=>x.id==='p-a'),
         z=window.db.payroll.find(x=>x.id==='p-z');
   return {a:structuredClone(a),z:structuredClone(z),
    aCalc:window.payrollCalc(a,window.db.employees[0]).transport,
    zCalc:window.payrollCalc(z,window.db.employees[1]).transport,
    count:window.__fixture.rpcCalls.length,
    info:window.hlgbPayrollSaveStability9296.fareMonthInfo('2','2026-11')};
  });
  assert.equal(state.z.transportOverride,73.5);
  assert.equal(state.a.transportOverride,undefined,'other employee unchanged');
  assert.equal(state.aCalc,132);
  assert.equal(state.zCalc,73.5);
  assert.equal(state.count,1,'one write to exactly one payroll record');
  assert.equal(state.info.manual,73.5);
  assert.match(await page.locator('#hlgbFareResult9490').textContent(),/confirmada/);
  // Correct to zero for an employee absent the whole month.
  await page.locator('#hlgbFareAmount9490').fill('0');
  await page.locator('#hlgbFareSave9490').click();
  await page.waitForFunction(()=>window.db.payroll.find(x=>x.id==='p-z').transportOverride===0);
  state=await page.evaluate(()=>{
   const z=window.db.payroll.find(x=>x.id==='p-z');return {r:z.transportOverride,transport:window.payrollCalc(z,window.db.employees[1]).transport}
  });
  assert.equal(state.r,0);assert.equal(state.transport,0);
  // A blank passage goes back to automatic absence-based fare, no old data erased.
  await page.locator('#hlgbFareAmount9490').fill('');
  await page.locator('#hlgbFareSave9490').click();
  await page.waitForFunction(()=>window.db.payroll.find(x=>x.id==='p-z').transportOverride===null);
  state=await page.evaluate(()=>{
   const z=window.db.payroll.find(x=>x.id==='p-z');return {transport:window.payrollCalc(z,window.db.employees[1]).transport,days:z.transportAbsenceDays}
  });
  assert.equal(state.transport,120);assert.equal(state.days,2);
  // Different month must not magically change an existing payroll row.
  await page.locator('#hlgbFareMonth9490').fill('2026-12');
  assert.equal(await page.locator('#hlgbFareSave9490').isDisabled(),true);
  assert.match(await page.locator('#hlgbFareHint9490').textContent(),/não gerada/);
  await page.locator('#hlgbFareMonth9490').fill('2026-11');
  // Cloud failure preserves original data and editability.
  await page.evaluate(()=>{window.__fixture.failOnce=true});
  await page.locator('#hlgbFareAmount9490').fill('19.80');
  await page.locator('#hlgbFareSave9490').click();
  await page.waitForFunction(()=>document.getElementById('hlgbFareResult9490')?.textContent.includes('❌'));
  assert.equal(await page.locator('#hlgbFareAmount9490').inputValue(),'19.80');
  const afterFailure=await page.evaluate(()=>window.db.payroll.find(x=>x.id==='p-z').transportOverride);
  assert.equal(afterFailure,null,'a failed ACK must not modify employee payroll');
  // Completed payments cannot silently have their amount rewritten.
  await page.evaluate(()=>{window.db.payroll.find(x=>x.id==='p-z').paid=true});
  await assert.rejects(()=>page.evaluate(()=>window.hlgbPayrollSaveStability9296.saveEmployeeFare('2','2026-11','18.00')),/PAGO/);
  assert.equal(errors.length,0,errors.join(' | '));
  console.log('PASS v94.90 '+(process.env.HLGB_BROWSER||'chromium')+': employee and payroll visible passage buttons, isolated cloud ACK, zero/reset, other month, failed cloud, paid protected');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
