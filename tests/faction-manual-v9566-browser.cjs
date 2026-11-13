'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs/promises'),{chromium,webkit}=require('playwright');
const engine=process.env.HLGB_BROWSER==='webkit'?webkit:chromium;
(async()=>{
 const browser=await engine.launch({headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1180,height:920},serviceWorkers:'block',acceptDownloads:true});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:4173/tests/faction-manual-v9566-fixture.html',{waitUntil:'domcontentloaded'});
  await page.locator('#hlgbFactionManualPaymentBtn').click();
  await page.locator('#fm66-root').waitFor({state:'visible'});
  assert.equal(await page.evaluate(()=>window.__oldOpen),0,'new plugin should intercept old button action');
  await page.locator('#fm66-faction').fill('roseli');
  await page.locator('#fm66-faction-suggestions [data-faction="Roseli"]').click();
  assert.equal(await page.locator('#fm66-faction').inputValue(),'Roseli','master not present in allocations still selectable');
  const productRow=page.locator('.fm66-line').first();
  await productRow.locator('.fm66-search').fill('CL21');
  await productRow.locator('[data-product-id="p1"]').click();
  assert.equal(await productRow.locator('.fm66-unit').inputValue(),'2.60','registered product factionCost must prefill');
  await productRow.locator('.fm66-unit').fill('3.50');
  await productRow.locator('.fm66-qty').fill('10');
  await page.locator('#fm66-add-traveta').click();
  const trav=page.locator('.fm66-line').nth(1);
  assert.equal(await trav.getAttribute('data-kind'),'travetada');
  await trav.locator('.fm66-qty').fill('20');
  await trav.locator('.fm66-unit').fill('0.20');
  assert.match(await page.locator('#fm66-grand').innerText(),/39,00/);
  await page.locator('#fm66-status').selectOption('Pago');
  await page.locator('#fm66-method').fill('Pix');
  await page.locator('#fm66-note').fill('Acerto de serviços e travetada');
  const pdf=Buffer.from('%PDF-1.4\n1 0 obj\n<</Type /Catalog>>\nendobj\n%%EOF');
  await page.locator('#fm66-pdf').setInputFiles({name:'comprovante.pdf',mimeType:'application/pdf',buffer:pdf});
  assert.match(await page.locator('#fm66-pdf-summary').innerText(),/comprovante.pdf/);
  await page.locator('#modal .modalSave').click();
  await page.locator('#modal').waitFor({state:'detached'});
  const saved=await page.evaluate(()=>({
    groups:window.db.factionPayments.map(x=>({kind:x.manualKindV9566,qty:x.quantity,unit:x.unitPrice,
       description:x.description,pdf:!!x.receiptPdfV9566,source:x.source})),
    hub:window.db.hubFinanceEntries.map(x=>({amount:x.value,sourceId:x.sourceId})),
    price:window.db.products.find(x=>x.id==='p1').factionCost,
    old:window.__oldOpen,writes:window.__written.length
  }));
  assert.equal(saved.groups.length,2);
  assert.deepEqual(saved.groups.map(x=>[x.kind,x.qty,x.unit,x.pdf]),
   [['product',10,3.5,true],['travetada',20,0.2,false]]);
  assert.equal(saved.groups[1].description,'Travetada');
  assert.equal(saved.price,2.6,'manual override must not modify product ficha');
  assert.equal(saved.hub.length,1,'one payment in Hub, not one per service row');
  assert.equal(saved.hub[0].amount,39);
  assert.equal(saved.writes,3);
  const receipt=page.locator('#fm66-receipts .fm66-download');
  assert.equal(await receipt.count(),1);
  const downloadWait=page.waitForEvent('download');
  await receipt.click();
  const dl=await downloadWait;
  assert.equal(dl.suggestedFilename(),'comprovante.pdf');
  const bytes=await fs.readFile(await dl.path());
  assert.equal(bytes.toString('utf8',0,5),'%PDF-');
  // Price missing in the product master must require an editable manual value.
  await page.locator('#hlgbFactionManualPaymentBtn').click();
  await page.locator('#fm66-root').waitFor({state:'visible'});
  await page.locator('#fm66-faction').fill('ge');
  await page.locator('#fm66-faction-suggestions [data-faction="Ge"]').click();
  const nextRow=page.locator('.fm66-line').first();
  await nextRow.locator('.fm66-search').fill('DM99');
  await nextRow.locator('[data-product-id="p2"]').click();
  assert.equal(await nextRow.locator('.fm66-unit').inputValue(),'','no false price suggested when unregistered');
  await nextRow.locator('.fm66-qty').fill('2');
  await nextRow.locator('.fm66-unit').fill('1.70');
  await page.locator('#modal .modalSave').click();
  await page.locator('#modal').waitFor({state:'detached'});
  assert.equal(await page.evaluate(()=>window.db.factionPayments.length),3);
  assert.equal(await page.evaluate(()=>window.db.hubFinanceEntries.length),1,'pending payment cannot appear as paid in Hub');
  // A proof can also be attached after a manual payment has been recorded.
  const attach=page.locator('#fm66-receipts .fm66-attach').first();
  assert.equal(await attach.count(),1,'existing manual payment without PDF offers attachment');
  await page.locator('#fm66-receipts .fm66-attach-input').first().setInputFiles({name:'comprovante-pendente.pdf',mimeType:'application/pdf',buffer:pdf});
  // Post-login reinstallation used to redraw receipt rows and silently clear
  // the browser's selected PDF before the user could click "Salvar PDF".
  await page.evaluate(()=>{
   window.hlgbFactionManual9566.install();
   window.hlgbFactionManual9566.renderReceipts();
   window.hlgbFactionManual9566.renderReceipts();
  });
  assert.equal(await page.locator('#fm66-receipts .fm66-attach-input').first().evaluate(el=>el.files?.[0]?.name),
   'comprovante-pendente.pdf','repeated renders must preserve selected file');
  await attach.click();
  try{
   await page.waitForFunction(()=>window.db.factionPayments.some(p=>p.factionName==='Ge'&&p.receiptPdfV9566?.name==='comprovante-pendente.pdf'),
    null,{timeout:12000});
  }catch(error){
   const details=await page.evaluate(()=>({
    feedback:document.querySelector('#fm66-receipt-feedback')?.textContent,
    groups:window.hlgbFactionManual9566.receiptGroups().map(g=>({name:g.factionName,id:g.id,proof:g.receipt?.name})),
    files:[...document.querySelectorAll('#fm66-receipts .fm66-attach-input')].map(el=>({group:el.dataset.groupId,file:el.files?.[0]?.name})),
    written:window.__written.slice(-3)
   }));
   throw new Error('PDF attachment not confirmed: '+JSON.stringify(details)+'; original='+error.message);
  }
  assert.equal(await page.evaluate(()=>window.db.factionPayments.find(x=>x.factionName==='Ge').status),'Pendente','adding a PDF cannot mark pending as paid');
  assert.equal(await page.locator('#fm66-receipts .fm66-download').count(),2,'both proofs must remain downloadable');

  // v95.88: the existing pending group must reopen with the same line ID,
  // allow a value correction and then post exactly one confirmed Hub payment.
  const geRow=page.locator('#fm66-receipts tr[data-fm88-row]').filter({hasText:'Ge'});
  assert.equal(await geRow.locator('.fm88-edit').count(),1);
  const geGroup=await geRow.locator('.fm88-edit').getAttribute('data-group-id');
  const rowId=await page.evaluate(g=>window.db.factionPayments.find(x=>x.manualGroupId===g).id,geGroup);
  await geRow.locator('.fm88-edit').click();
  await page.locator('#fm66-root').waitFor({state:'visible'});
  assert.equal(await page.locator('#fm66-faction').inputValue(),'Ge');
  assert.equal(await page.locator('.fm66-line').first().getAttribute('data-id'),rowId,'edit retains identity');
  assert.equal(await page.locator('.fm66-line .fm66-remove').first().isDisabled(),true,'saved line is not deleted');
  await page.locator('.fm66-line .fm66-qty').first().fill('4');
  await page.locator('.fm66-line .fm66-discount').first().fill('0.10');
  await page.locator('#modal .modalSave').click();
  await page.locator('#modal').waitFor({state:'detached'});
  const corrected=await page.evaluate(id=>window.db.factionPayments.find(x=>x.id===id),rowId);
  assert.equal(corrected.value,6.4);
  assert.equal(corrected.status,'Pendente');
  assert.equal(corrected.receiptPdfV9566.name,'comprovante-pendente.pdf','edit cannot discard PDF');
  assert.equal(await page.evaluate(()=>window.db.hubFinanceEntries.length),1,'edit cannot post a paid Hub');
  const geRowAfter=page.locator('#fm66-receipts tr[data-fm88-row]').filter({hasText:'Ge'});
  assert.equal(await geRowAfter.locator('.fm88-pay').count(),1);
  await geRowAfter.locator('.fm88-pay').click();
  await page.locator('#fm88-pay-modal').waitFor({state:'visible'});
  await page.locator('#fm88-paid-date').fill('2026-11-13');
  await page.locator('#fm88-paid-method').fill('Pix');
  await page.locator('#fm88-pay-modal .modalSave').click();
  await page.locator('#fm88-pay-modal').waitFor({state:'detached'});
  const paid=await page.evaluate(id=>({
    row:window.db.factionPayments.find(x=>x.id===id),
    hub:window.db.hubFinanceEntries.find(x=>x.sourceId===window.db.factionPayments.find(p=>p.id===id).manualGroupId),
    hubCount:window.db.hubFinanceEntries.length
  }),rowId);
  assert.equal(paid.row.status,'Pago');
  assert.equal(paid.row.paidAmount,6.4);
  assert.equal(paid.hub.value,6.4,'Hub receives corrected net value');
  assert.equal(paid.hubCount,2,'one Hub entry for each of two groups');
  assert.equal(await page.locator('#fm66-receipts tr[data-fm88-row]').filter({hasText:'Ge'}).locator('.fm88-pay').count(),0,'paid group cannot be paid twice');
  assert.equal(await page.locator('#fm88-filter-status').count(),1);
  await page.locator('#fm88-filter-status').selectOption('Pendente');
  assert.equal(await page.locator('#fm66-receipts tr[data-fm88-row]:visible').count(),0);
  await page.locator('#fm88-filter-status').selectOption('Pago');
  assert.equal(await page.locator('#fm66-receipts tr[data-fm88-row]:visible').count(),2);


  // v95.89: an embaladeira can receive a product not registered in the catalog.
  await page.locator('#fm88-filter-status').selectOption('todos');
  const catalogueBefore=await page.evaluate(()=>window.db.products.length);
  await page.locator('#hlgbFactionManualPaymentBtn').click();
  await page.locator('#fm66-mode').selectOption('embalagem');
  await page.locator('#fm66-faction').fill('Marina');
  await page.locator('#fm66-faction-suggestions [data-faction="Marina"]').click();
  assert.equal(await page.locator('.fm66-line').first().getAttribute('data-kind'),'embalagem');
  await page.locator('.fm66-line .fm66-unregistered').first().check();
  await page.locator('.fm66-line .fm66-manual-name').first().fill('Camisola amostra cliente');
  await page.locator('.fm66-line .fm66-manual-category').first().selectOption('camisola');
  assert.equal(await page.locator('.fm66-line .fm66-unit').first().inputValue(),'0.25');
  await page.locator('.fm66-line .fm66-qty').first().fill('80');
  assert.match(await page.locator('#fm66-grand').innerText(),/20,00/);
  await page.locator('#modal .modalSave').click();
  await page.locator('#modal').waitFor({state:'detached'});
  const packer=await page.evaluate(()=>window.db.factionPayments.find(x=>x.factionName==='Marina'));
  assert.equal(packer.manualProductNameV9589,'Camisola amostra cliente');
  assert.equal(packer.manualProductCategoryV9589,'camisola');
  assert.equal(packer.productId,null,'non-catalog product must have no fake product ID');
  assert.equal(packer.status,'Pendente');
  assert.equal(await page.evaluate(()=>window.db.products.length),catalogueBefore,'no invented catalog row');
  const packerGroup=page.locator('#fm66-receipts tr[data-fm88-row]').filter({hasText:'Marina'});
  await packerGroup.locator('.fm88-edit').click();
  await page.locator('#fm66-root').waitFor({state:'visible'});
  assert.equal(await page.locator('.fm66-line .fm66-unregistered').first().isChecked(),true);
  assert.equal(await page.locator('.fm66-line .fm66-manual-name').first().inputValue(),'Camisola amostra cliente');
  assert.equal(await page.locator('.fm66-line .fm66-manual-category').first().inputValue(),'camisola');
  await page.locator('.fm66-line .fm66-qty').first().fill('90');
  await page.locator('#modal .modalSave').click();
  await page.locator('#modal').waitFor({state:'detached'});
  const updatedPacker=await page.evaluate(id=>window.db.factionPayments.find(x=>x.id===id),packer.id);
  assert.equal(updatedPacker.value,22.5,'corrected net packaging amount');
  assert.equal(updatedPacker.productId,null);
  assert.equal(updatedPacker.manualProductNameV9589,'Camisola amostra cliente');
  assert.equal(await page.evaluate(()=>window.db.products.length),catalogueBefore);
  await page.locator('#fm66-receipts tr[data-fm88-row]').filter({hasText:'Marina'}).locator('.fm88-pay').click();
  await page.locator('#fm88-pay-modal').waitFor({state:'visible'});
  await page.locator('#fm88-paid-method').fill('Pix');
  await page.locator('#fm88-pay-modal .modalSave').click();
  await page.locator('#fm88-pay-modal').waitFor({state:'detached'});
  assert.equal(await page.evaluate(id=>window.db.factionPayments.find(x=>x.id===id).status,packer.id),'Pago');
  assert.equal(await page.evaluate(g=>window.db.hubFinanceEntries.filter(x=>x.sourceId===g).length,packer.manualGroupId),1);

  // A person who only does travetada is a distinct payee in the same ledger.
  await page.locator('#hlgbFactionManualPaymentBtn').click();
  await page.locator('#fm66-mode').selectOption('travetada');
  await page.locator('#fm66-faction').fill('Tania');
  await page.locator('#fm66-faction-suggestions [data-faction="Tania"]').click();
  assert.equal(await page.locator('.fm66-line').first().getAttribute('data-kind'),'travetada');
  assert.equal(await page.locator('.fm66-line .fm66-unit').first().inputValue(),'0.08','uses travetadora registered rate');
  await page.locator('.fm66-line .fm66-qty').first().fill('300');
  assert.match(await page.locator('#fm66-grand').innerText(),/24,00/);
  await page.locator('#modal .modalSave').click();
  await page.locator('#modal').waitFor({state:'detached'});
  const travetadora=await page.evaluate(()=>window.db.factionPayments.find(x=>x.factionName==='Tania'));
  assert.equal(travetadora.serviceModeV9577,'travetada');
  assert.equal(travetadora.manualKindV9566,'travetada');
  assert.equal(travetadora.status,'Pendente');
  assert.equal(travetadora.productId,null,'travetada can be paid without any catalog product');
  await page.locator('#fm66-receipts tr[data-fm88-row]').filter({hasText:'Tania'}).locator('.fm88-pay').click();
  await page.locator('#fm88-pay-modal').waitFor({state:'visible'});
  await page.locator('#fm88-paid-method').fill('Pix');
  await page.locator('#fm88-pay-modal .modalSave').click();
  await page.locator('#fm88-pay-modal').waitFor({state:'detached'});
  const travetPaid=await page.evaluate(id=>{
   const x=window.db.factionPayments.find(row=>row.id===id);
   return {status:x.status,amount:x.paidAmount,
    financial:window.db.hubFinanceEntries.filter(h=>h.sourceId===x.manualGroupId)};
  },travetadora.id);
  assert.equal(travetPaid.status,'Pago');
  assert.equal(travetPaid.amount,24);
  assert.equal(travetPaid.financial.length,1,'one Hub entry for standalone travetada');
  assert.equal(travetPaid.financial[0].value,24);
  assert.equal(await page.evaluate(()=>window.db.products.length),catalogueBefore);

  await page.setViewportSize({width:390,height:850});
  await page.locator('#hlgbFactionManualPaymentBtn').click();
  assert.equal(await page.locator('#fm66-faction').isVisible(),true);
  assert.equal(await page.locator('#fm66-add-traveta').isVisible(),true);
  assert.deepEqual(errors,[]);
  console.log('PASS faction manual '+engine.name()+' v95.66: master search, SKU and editable price, travetada, PDF save+download, Hub single entry, pending and mobile.');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
