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
  await page.waitForFunction(()=>!!window.hlgbPayrollView9295?.render&&!!window.hlgbPayrollSaveStability9296?.edit);
  async function proof(view){
   const p=await page.evaluate(()=>{
    const table=document.getElementById('payrollTable');
    return {choice:window.hlgbPayrollView9295.getView(),
     applied:table.firstElementChild?.getAttribute('data-hlgb-payroll-view'),
     names:[...table.querySelectorAll('.hlgb-payroll-name strong')].map(x=>x.textContent),
     bonus:window.db.payroll.find(x=>x.id==='p-a')?.bonus};
   });
   assert.equal(p.choice,view,'selected view changed unexpectedly');
   assert.equal(p.applied,view,'visible table changed unexpectedly');
   return p;
  }
  await page.evaluate(()=>window.hlgbPayrollView9295.setView('alpha'));
  assert.deepEqual((await proof('alpha')).names,['Ana','Zuleica']);
  await page.evaluate(()=>{document.getElementById('payrollTable').innerHTML='<div class="payroll-company-list"><section class="payroll-company">legacy company redraw</section></div>'});
  await page.waitForFunction(()=>document.querySelector('#payrollTable > [data-hlgb-payroll-view="alpha"]'));
  assert.deepEqual((await proof('alpha')).names,['Ana','Zuleica']);
  await page.evaluate(()=>window.editPayrollRow('p-a'));
  await page.locator('#prBonus').fill('23');
  await page.locator('#modal .modalSave').click();
  await page.waitForFunction(()=>Number(window.db.payroll.find(x=>x.id==='p-a')?.bonus)===23);
  assert.equal((await proof('alpha')).bonus,23);
  await page.evaluate(()=>window.hlgbPayrollView9295.setView('company'));
  await proof('company');
  await page.evaluate(()=>{
   window.renderPayroll=function(){
    document.getElementById('payrollTable').innerHTML='<div class="hlgb-alpha-letter">Legacy alphabetical redraw</div>';
   };
   window.renderPayroll();
  });
  await page.waitForFunction(()=>document.querySelector('#payrollTable > [data-hlgb-payroll-view="company"]'));
  await proof('company');
  await page.evaluate(()=>window.editPayrollRow('p-z'));
  await page.locator('#prBonus').fill('19');
  await page.locator('#modal .modalSave').click();
  await page.waitForFunction(()=>Number(window.db.payroll.find(x=>x.id==='p-z')?.bonus)===19);
  await proof('company');
  await page.evaluate(()=>window.hlgbPayrollView9295.setView('alpha'));
  await page.evaluate(()=>{document.getElementById('payrollTable').innerHTML='<div class="payroll-company">External company redraw</div>'});
  await page.waitForFunction(()=>document.querySelector('#payrollTable > [data-hlgb-payroll-view="alpha"]'));
  await proof('alpha');
  assert.deepEqual(errors,[],'unexpected browser errors');
  console.log('PASS v94.95 '+(process.env.HLGB_BROWSER||'chromium')+': selection persists A-Z / company through late redraws and confirmed saves');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});