'use strict';
const assert=require('node:assert/strict');
const {chromium,webkit}=require('playwright');
const browserName=process.env.HLGB_BROWSER==='webkit'?'webkit':'chromium';
const engine=browserName==='webkit'?webkit:chromium;
async function submit(page,{name,qty,price}){
 await page.locator('#hlgbFactionManualPaymentBtn').click();
 const modal=page.locator('#fm66-root');
 await modal.waitFor({state:'visible'});
 await page.locator('#fm66-faction').fill('roseli');
 await page.locator('#fm66-faction-suggestions [data-faction="Roseli"]').click();
 const line=page.locator('.fm66-line').first();
 assert.equal(await line.getAttribute('data-kind'),'product');
 assert.equal(await line.locator('.fm66-unregistered').count(),1,'checkbox now exists for costura');
 await line.locator('.fm66-unregistered').check();
 await line.locator('.fm66-manual-name').fill(name);
 await line.locator('.fm66-qty').fill(String(qty));
 await line.locator('.fm66-unit').fill(String(price));
 assert.match(await line.locator('.fm66-hint').innerText(),/Não exige preço de venda ao cliente/);
 await page.locator('#modal .modalSave').click();
 await page.locator('#modal').waitFor({state:'detached'});
}
(async()=>{
 const browser=await engine.launch({headless:true});
 try{
  const page=await browser.newPage({viewport:{width:390,height:820},serviceWorkers:'block'});
  const errors=[];page.on('pageerror',x=>errors.push(x.message));
  await page.goto('http://127.0.0.1:4173/tests/faction-manual-v9566-fixture.html',
   {waitUntil:'domcontentloaded'});
  await page.addScriptTag({url:'http://127.0.0.1:4173/release-faction-acerto-consolidated-v95102.js'});
  await submit(page,{name:'Camisola avulsa sem preço comercial',qty:10,price:1.2});
  await submit(page,{name:'Conjunto avulso sem cadastro comercial',qty:5,price:3});
  const first=await page.evaluate(()=>{
   window.db.factionPayments.push({id:'normal-001',status:'Pendente',manual:false,
    factionName:'ROSÉLI',factionMasterId:'1',value:8,paidAmount:0,
    description:'Outro lote enviado à facção',scheduledPaymentDate:'2026-11-12'});
   window.db.factionPayments.push({id:'normal-pago',status:'Pago',manual:false,
    factionName:'Roseli',value:400,paidAmount:400});
   window.hlgbFactionAcertoUnified95102.render();
   return {groups:window.hlgbFactionAcertoUnified95102.currentData().manualGroups,
    result:window.hlgbFactionAcertoUnified95102.consolidate(
     window.hlgbFactionAcertoUnified95102.currentData()),
    sourceRows:window.db.factionPayments.map(x=>({
      id:x.id,value:x.value,manual:x.manual,productId:x.productId,status:x.status})),
    hub:window.db.hubFinanceEntries.length,products:window.db.products.length};
  });
  assert.equal(first.groups.filter(x=>x.status==='Pendente').length,2);
  assert.equal(first.result.groups.length,1);
  assert.equal(first.result.groups[0].sourceCount,3);
  assert.equal(first.result.groups[0].manualCents,2700);
  assert.equal(first.result.groups[0].regularCents,800);
  assert.equal(first.result.groups[0].totalCents,3500);
  assert.equal(first.result.warnings.length,0);
  assert.equal(first.hub,0,'pending consolidated acerto is not posted to finance');
  assert.equal(first.products,3,'manual name cannot register product');
  assert.equal(await page.locator('#hlgb-unified-acertos-v95102').count(),1);
  assert.match(await page.locator('#hlgb-unified-acertos-v95102').innerText(),
   /Acerto consolidado por pessoa/);
  assert.match(await page.locator('#hlgb-unified-acertos-v95102').innerText(),/R\$\s?35,00/);
  assert.equal(await page.locator('#hlgb-unified-acertos-v95102 tbody tr').count(),1);
  assert.equal(errors.length,0,'no browser errors: '+errors.join(' | '));
  console.log('PASS '+browserName+' mobile: 2 peças avulsas sem cadastro e 1 pagamento normal geram 1 total visual R$35,00, sem baixa');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
