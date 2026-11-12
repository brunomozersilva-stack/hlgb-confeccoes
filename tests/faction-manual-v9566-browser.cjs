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
  await page.setViewportSize({width:390,height:850});
  await page.locator('#hlgbFactionManualPaymentBtn').click();
  assert.equal(await page.locator('#fm66-faction').isVisible(),true);
  assert.equal(await page.locator('#fm66-add-traveta').isVisible(),true);
  assert.deepEqual(errors,[]);
  console.log('PASS faction manual '+engine.name()+' v95.66: master search, SKU and editable price, travetada, PDF save+download, Hub single entry, pending and mobile.');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
