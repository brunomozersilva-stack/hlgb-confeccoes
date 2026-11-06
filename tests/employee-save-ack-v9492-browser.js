'use strict';
const assert=require('node:assert/strict');
const {chromium,webkit}=require('playwright');
const engine=process.env.HLGB_BROWSER==='webkit'?webkit:chromium;
(async()=>{
 const browser=await engine.launch({headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1380,height:850}});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:4173/tests/payroll-alpha-fare-v9489-fixture.html');
  await page.waitForFunction(()=>window.hlgbPayrollSaveStability9296?.version==='94.96');
  await page.evaluate(()=>{
   window.__fixture.serverEmployees=new Map(window.db.employees.map(e=>[String(e.id),{data:structuredClone(e),revision:1}]));
   window.__fixture.employeeRpc=[];
   window.__fixture.failEmployeeOnce=false;
   window.__fixture.cloudReads=0;
   const baseSave=window.hlgbRecordSaveWithRetry;
   window.hlgbRecordSaveWithRetry=async function(module,id,data,deleted){
    if(module!=='employees')return baseSave(module,id,data,deleted);
    window.__fixture.employeeRpc.push({id,data:structuredClone(data)});
    if(window.__fixture.failEmployeeOnce){window.__fixture.failEmployeeOnce=false;return {applied:false}}
    const old=window.__fixture.serverEmployees.get(String(id));
    const revision=(old?.revision||0)+1;
    window.__fixture.serverEmployees.set(String(id),{data:structuredClone(data),revision});
    return {applied:true,data:structuredClone(data),revision};
   };
   window.cloudRequest=async function(q){
    window.__fixture.cloudReads++;
    const id=decodeURIComponent((q.match(/entity_id=eq\.([^&]+)/)||[])[1]||'');
    if(!id)return [];
    const row=window.__fixture.serverEmployees.get(String(id));
    return row?[{module:'employees',entity_id:String(id),revision:row.revision,deleted_at:null,
     updated_at:new Date().toISOString(),data:structuredClone(row.data)}]:[]
   };
   // Real application uses window.modalSave resolved dynamically by submitModal().
   window.openModal=(title,html,onSave)=>{
    document.getElementById('modal').innerHTML='<h2>'+title+'</h2>'+html;
    window.modalSave=onSave;
   };
   window.closeModal=()=>{document.getElementById('modal').innerHTML='';window.modalSave=null};
   document.addEventListener('click',e=>{
    if(e.target.matches('#modal .modalSave'))window.modalSave?.()
   });
   window.editEmployee=id=>{
    const e=window.db.employees.find(x=>String(x.id)===String(id));
    if(!e)throw Error('employee not found');
    window.openModal('Editar funcionário',
     '<div class="grid">'+
      '<input id="empName" value="'+e.name+'">'+
      '<select id="empLocation"><option value="">Nenhuma</option></select>'+
      '<input id="empSalary" type="number" value="'+e.salary+'">'+
      '<select id="empHasTransport"><option value="true">Sim</option><option value="false">Não</option></select>'+
      '<input id="empBenefit" value="'+(e.benefitDefault||0)+'">'+
      '<input id="empHire" value="'+(e.hireDate||'')+'">'+
      '<input id="empPix" value="'+(e.pix||'')+'">'+
      '<select id="empActive"><option value="true">Sim</option><option value="false">Não</option></select>'+
     '</div><button type="button" class="primary modalSave">Salvar alterações</button>',()=>{
      // Never execute: simulates legacy close-without-ACK hazard.
      window.__fixture.legacySaveInvoked=true;window.closeModal()
     });
   };
   window.hlgbPayrollSaveStability9296.install();
  });
  const open=()=>page.evaluate(()=>window.editEmployee('2'));
  const mainSave=()=>page.locator('#modal .modalSave').click();
  // Main button must ACK employee AND edited passage before dismissing.
  await open();
  // Regression: a legacy modal handler may overwrite window.modalSave after
  // opening. The button must still use the confirmed cloud path.
  await page.evaluate(()=>{window.modalSave=()=>{window.__fixture.legacySaveInvoked=true;window.closeModal()}});
  await page.locator('#empSalary').fill('2350');
  await page.locator('#hlgbFareAmount9490').fill('70.50');
  await mainSave();
  await page.waitForFunction(()=>window.__fixture.serverEmployees.get('2')?.data.salary===2350
    &&window.db.payroll.find(x=>x.id==='p-z')?.transportOverride===70.5);
  await page.waitForFunction(()=>document.getElementById('modal').children.length===0);
  let result=await page.evaluate(()=>({
   serverSalary:window.__fixture.serverEmployees.get('2').data.salary,
   localSalary:window.db.employees.find(e=>e.id==='2'||e.id===2).salary,
   remoteRev:window.__fixture.serverEmployees.get('2').revision,
   passage:window.db.payroll.find(x=>x.id==='p-z').transportOverride,
   employeeRpc:window.__fixture.employeeRpc.length,
   payrollRpc:window.__fixture.rpcCalls.filter(x=>x.module==='payroll').length,
   legacy:window.__fixture.legacySaveInvoked||false,
   otherSalary:window.db.employees.find(x=>String(x.id)==='1').salary
  }));
  assert.equal(result.serverSalary,2350);
  assert.equal(result.localSalary,2350);
  assert.equal(result.remoteRev,2);
  assert.equal(result.passage,70.5);
  assert.equal(result.employeeRpc,1);
  assert.equal(result.payrollRpc,1);
  assert.equal(result.otherSalary,2000);
  assert.equal(result.legacy,false,'legacy optimistic close must not run');
  assert((await page.evaluate(()=>window.__fixture.cloudReads))>0,'employee save must query the cloud before saving');

  // Failed employee ACK: keep input and modal, and never update local salary.
  await page.evaluate(()=>{window.__fixture.failEmployeeOnce=true;window.editEmployee('1')});
  await page.locator('#empSalary').fill('2150');
  await mainSave();
  await page.waitForFunction(()=>document.getElementById('hlgbEmployeeSaveStatus9492')?.textContent.includes('NÃO confirmado'));
  assert.equal(await page.locator('#empSalary').inputValue(),'2150');
  result=await page.evaluate(()=>({
   local:window.db.employees.find(x=>String(x.id)==='1').salary,
   server:window.__fixture.serverEmployees.get('1').data.salary,
   modal:document.getElementById('modal').children.length
  }));
  assert.equal(result.local,2000);
  assert.equal(result.server,2000);
  assert(result.modal>0);
  await mainSave();
  await page.waitForFunction(()=>window.__fixture.serverEmployees.get('1')?.data.salary===2150
     &&document.getElementById('modal').children.length===0);
  assert.equal(await page.evaluate(()=>window.db.employees.find(e=>String(e.id)==='1').salary),2150);

  // A fare failure after employee ACK must preserve the form, not duplicate the employee write.
  await open();
  await page.locator('#empSalary').fill('2470');
  await page.locator('#hlgbFareAmount9490').fill('80');
  await page.evaluate(()=>{window.__fixture.failOnce=true});
  const beforeCount=await page.evaluate(()=>window.__fixture.employeeRpc.length);
  await mainSave();
  await page.waitForFunction(()=>document.getElementById('hlgbEmployeeSaveStatus9492')?.textContent.includes('Cadastro confirmado'));
  const partial=await page.evaluate(()=>({
   salary:window.__fixture.serverEmployees.get('2').data.salary,
   passage:window.db.payroll.find(x=>x.id==='p-z').transportOverride,
   rpc:window.__fixture.employeeRpc.length
  }));
  assert.equal(partial.salary,2470);
  assert.equal(partial.passage,70.5);
  assert.equal(partial.rpc,beforeCount+1);
  assert.equal(await page.locator('#hlgbFareAmount9490').inputValue(),'80');
  await mainSave();
  await page.waitForFunction(()=>window.db.payroll.find(x=>x.id==='p-z').transportOverride===80
    &&document.getElementById('modal').children.length===0);
  assert.equal(await page.evaluate(()=>window.__fixture.employeeRpc.length),beforeCount+1,'retry fare must not write employee twice');

  // Local unsynced data mismatch must NEVER be overwritten from cloud as a side effect.
  await page.evaluate(()=>{
   window.db.employees.find(x=>String(x.id)==='2').salary=9000;
   window.editEmployee('2');
  });
  await page.locator('#empPix').fill('PIX-IN-LOCAL-FORM');
  const beforeDivergence=await page.evaluate(()=>window.__fixture.employeeRpc.length);
  await mainSave();
  await page.waitForFunction(()=>document.getElementById('hlgbEmployeeSaveStatus9492')?.textContent.includes('difere da nuvem'));
  const divergence=await page.evaluate(()=>({
   server:window.__fixture.serverEmployees.get('2').data.salary,
   local:window.db.employees.find(e=>String(e.id)==='2').salary,
   rpc:window.__fixture.employeeRpc.length
  }));
  assert.equal(divergence.server,2470);
  assert.equal(divergence.local,9000);
  assert.equal(divergence.rpc,beforeDivergence);
  assert.equal(await page.locator('#empPix').inputValue(),'PIX-IN-LOCAL-FORM');
  assert.deepEqual(errors,[],errors.join(' | '));
  console.log('PASS employee save v94.92 '+(process.env.HLGB_BROWSER||'chromium')+': ACK+remote readback, passage via primary Save, failures preserved, partial retry, local/cloud conflict protected');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
