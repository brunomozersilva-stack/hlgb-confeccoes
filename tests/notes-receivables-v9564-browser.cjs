'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs/promises'),{chromium,webkit}=require('playwright');
const engine=process.env.HLGB_BROWSER==='webkit'?webkit:chromium;
(async()=>{
 const browser=await engine.launch({headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1200,height:880},serviceWorkers:'block',acceptDownloads:true});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:4173/tests/notes-receivables-v9564-fixture.html',{waitUntil:'domcontentloaded'});
  await page.locator('#nr-tabs button[data-tab="open"]').waitFor({state:'visible'});
  const counts=await page.evaluate(()=>window.hlgbNotesReceivables9564.calculate(window.hlgbNotesReceivables9564.allNotes()));
  assert.deepEqual([...counts.open],[4,138000]);
  assert.deepEqual([...counts.paid],[1,10000]);
  assert.deepEqual([...counts.overdue],[1,30000]);
  assert.deepEqual([...counts.today],[1,40000]);
  assert.deepEqual([...counts.next7],[2,58000]);
  assert.deepEqual([...counts.unknown],[1,50000]);
  assert.equal(await page.locator('#nr-table tbody tr').count(),4);
  assert.equal(await page.locator('#original-notes').innerText(),'Operação normal de montagem preservada');
  await page.locator('#nr-tabs [data-tab="paid"]').click();
  assert.equal(await page.locator('#nr-table tbody tr').count(),1);
  assert.equal(await page.locator('#nr-table [data-action="pay"]').count(),0,'paid note may not receive duplicate payment');
  await page.locator('#nr-table [data-action="view"]').click();
  await page.locator('#nr-table [data-action="pdf"]').click();
  await page.locator('#nr-tabs [data-tab="open"]').click();
  await page.locator('#nr-client').selectOption('id:1');
  assert.equal(await page.locator('#nr-table tbody tr').count(),1,'paid customer note excluded from open tab');
  await page.locator('#nr-min').fill('210');
  assert.equal(await page.locator('#nr-table tbody tr').count(),0,'minimum note amount should hide 200');
  await page.locator('#nr-min').fill('100');
  assert.equal(await page.locator('#nr-table tbody tr').count(),1);
  await page.locator('#nr-table [data-action="pay"]').click();
  await page.locator('#ar65-return').waitFor({state:'visible'});
  await page.locator('#ar65-return').fill('30');
  await page.locator('#ar65-reason').fill('Peças devolvidas');
  await page.locator('[data-ar65="return"]').click();
  await page.waitForFunction(()=>window.db.projectionInvoices.find(x=>x.id==='2')?.acertoReturnsV9565?.length===1);
  // Intl.NumberFormat may use a non-breaking space between R$ and amount.
  // First verify the actual financial credit; then verify the displayed column
  // without depending on which whitespace the browser currency formatter emits.
  await page.waitForFunction(()=>{
   const note=window.hlgbNotesReceivables9564.allNotes().find(x=>x.id==='2');
   const displayed=document.querySelector('#nr-table tbody tr')?.textContent?.replace(/\\s/g,' ');
   return note?.credit===3000&&note?.balance===15000&&displayed?.includes('30,00');
  },null,{timeout:12000});
  await page.locator('#ar65-memo').fill('Cliente informou que fará o próximo pagamento sexta-feira.');
  await page.locator('[data-ar65="note"]').click();
  await page.waitForFunction(()=>window.db.projectionInvoices.find(x=>x.id==='2')?.acertoNotesV9565?.length===1);
  await page.locator('#ar65-return').fill('10000');
  await page.locator('#ar65-reason').fill('Devolução excessiva');
  await page.locator('[data-ar65="return"]').click();
  await page.locator('#ar65-feedback').waitFor({state:'visible'});
  assert.match(await page.locator('#ar65-feedback').innerText(),/ultrapassar/);
  await page.locator('#ar65-pay').fill('40');
  await page.locator('[data-ar65="payment"]').click();
  await page.waitForFunction(()=>window.db.projectionInvoices.find(x=>x.id==='2')?.paymentHistory?.length===2);
  const noteState=await page.evaluate(()=>{
   const n=window.db.projectionInvoices.find(x=>x.id==='2'),x=window.hlgbNotesReceivables9564.allNotes().find(x=>x.id==='2');
   return {history:n.paymentHistory.length,memo:n.acertoNotesV9565.length,returns:n.acertoReturnsV9565.length,
    paid:x.paid,credit:x.credit,balance:x.balance};
  });
  assert.deepEqual(noteState,{history:2,memo:1,returns:1,paid:6000,credit:3000,balance:11000});
  await page.locator('[data-action="clear"]').click();
  await page.locator('#nr-tabs [data-tab="overdue"]').click();
  assert.equal(await page.locator('#nr-table tbody tr').count(),1);
  await page.locator('#nr-tabs [data-tab="upcoming"]').click();
  assert.equal(await page.locator('#nr-table tbody tr').count(),2,'today + future must be included');
  const downloadPromise=page.waitForEvent('download');
  await page.locator('[data-action="csv"]').click();
  const download=await downloadPromise;
  assert.match(download.suggestedFilename(),/^HLGB-notas-.*\.csv$/);
  const csv=await fs.readFile(await download.path(),'utf8');
  assert.match(csv,/;"200,00";/,'CSV must use decimal comma for Brazilian Excel');
  assert.match(csv,/;"400,00";/,'second filtered amount must also have decimal comma');
  await page.locator('[data-action="cloud"]').click();
  const results=await page.evaluate(()=>({actions:window.__actions,cloud:window.__cloudChecks,writes:window.__writes}));
  assert.deepEqual(results.actions,['view:1','pdf:1'],'return / payment modal is handled by the real module');
  assert.equal(results.cloud,1);
  assert.equal(results.writes,3,'only three user-confirmed note writes; no hidden automatic save');
  await page.evaluate(()=>{window.db.projectionInvoices.push({id:'6',client:'Cliente A',clientId:1,value:50,paid:0,dueDate:offset(3),status:'Pendente'});window.renderOrderNotes()});
  await page.waitForFunction(()=>document.querySelector('#nr-tabs [data-tab="all"]').textContent.includes('(6)'));
  await page.setViewportSize({width:390,height:844});
  assert.equal(await page.locator('#nr-client').isVisible(),true);
  assert.equal(await page.locator('#nr-tabs button[data-tab="paid"]').isVisible(),true);
  assert.deepEqual(errors,[]);
  console.log('PASS notas v95.64 '+engine.name()+': tabs, amounts, client filter, pay/view/pdf actions, CSV, cloud refresh, incoming refresh and mobile');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
