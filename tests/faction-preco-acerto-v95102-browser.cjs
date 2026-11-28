'use strict';
const assert=require('node:assert/strict');
const {chromium,webkit}=require('playwright');
const browserName=process.env.HLGB_BROWSER==='webkit'?'webkit':'chromium';
const engine=browserName==='webkit'?webkit:chromium;
async function submit(page,{name,qty,price,date}){
 await page.locator('#hlgbFactionManualPaymentBtn').click();
 const modal=page.locator('#fm66-root');
 await modal.waitFor({state:'visible'});
 if(date)await page.locator('#fm66-date').fill(date);
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
  await page.evaluate(()=>{window.__factionReportAllowed=true;window.canOpenPage=area=>window.__factionReportAllowed&&['faccoes','pagamentosFaccoes'].includes(area)});
  await page.addScriptTag({url:'http://127.0.0.1:4173/release-faction-acerto-consolidated-v95102.js'});
  await submit(page,{name:'Camisola avulsa sem preço comercial',qty:10,price:1.2,date:'2026-11-13'});
  await submit(page,{name:'Conjunto avulso sem cadastro comercial',qty:5,price:3,date:'2026-11-13'});
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
  assert.equal(await page.locator('#hlgb-unified-acertos-v95102 > div > table > tbody > tr').count(),1,'one professional, excluding nested date rows');
  const dates=page.locator('#hlgb-unified-acertos-v95102 details').filter({has:page.getByText('Resumo por data de referência',{exact:true})});
  await dates.locator('summary').click();
  assert.equal(await dates.locator('tbody tr').count(),2,'two distinct dates; both avulsos grouped on the same day');
  assert.match(await dates.innerText(),/2026-11-13/);
  assert.match(await dates.innerText(),/R\$\s?27,00/);
  assert.match(await dates.innerText(),/2026-11-12/);
  assert.match(await dates.innerText(),/R\$\s?8,00/);
  assert.equal(await page.evaluate(()=>window.db.hubFinanceEntries.length),0);
  await dates.locator('summary').click();

  const popupPromise=page.waitForEvent('popup');await page.getByRole('button',{name:'Consulta geral de saldos / PDF'}).click();const report=await popupPromise;
  await report.waitForLoadState('domcontentloaded');assert.match(await report.locator('body').innerText(),/Conferência de acerto/);assert.match(await report.locator('body').innerText(),/35,00/);assert.match(await report.locator('body').innerText(),/Camisola avulsa sem preço comercial/);assert.match(await report.locator('body').innerText(),/Conjunto avulso sem cadastro comercial/);assert.match(await report.locator('body').innerText(),/Avulso original/);assert.match(await report.locator('body').innerText(),/SALDO GERAL DE CONSULTA/);assert.equal(await report.locator('table.week-products').count(),3,'reference dates do not consolidate unverified deliveries or avulsos');assert.doesNotMatch(await report.locator('body').innerText(),/fmpli-/);await report.close();
  await page.locator('#hlgb-unified-acertos-v95102').getByText('Ver itens e datas',{exact:true}).click();
  await page.locator('[data-edit-avulso9875]').first().click();await page.getByText('Editar pagamento avulso pendente',{exact:true}).waitFor();assert.equal(await page.locator('#fm66-root .fm66-qty').count(),1);assert.equal(await page.locator('#fm66-root .fm66-unit').count(),1);await page.evaluate(()=>window.closeModal());
  await page.locator('[data-avulso-register9871]').first().click();await page.locator('#fm88-pay-modal').waitFor({state:'visible'});assert.match(await page.locator('#fm88-pay-modal').innerText(),/não realiza Pix/);await page.getByRole('button',{name:'Conferir sincronização deste acerto'}).click();await page.getByText(/Nenhuma pendência deste acerto na fila consultada/).waitFor();assert.equal(await page.evaluate(()=>window.db.hubFinanceEntries.length),0);await page.evaluate(()=>window.closeModal());
  await page.evaluate(()=>{window.__factionReportAllowed=false;window.hlgbFactionAcertoUnified95102.render()});
  assert.equal(await page.locator('#hlgb-unified-acertos-v95102').count(),0);
  await page.evaluate(()=>{window.__factionReportAllowed=true;window.hlgbFactionAcertoUnified95102.render()});
  assert.equal(await page.locator('#hlgb-unified-acertos-v95102').count(),1);
  await page.evaluate(()=>{const n=window.db.factionPayments.find(x=>x.id==='normal-001');Object.assign(n,{quantity:4,unitPrice:2,factionServiceId:'registered-f',deliveryId:'registered-d'});window.db.factions.push({id:'registered-f',deliveryHistory:[{id:'registered-d',date:'2026-11-12',qty:4}]});window.hlgbFactionAcertoUnified95102.render()});
  await page.getByRole('button',{name:'+ Mercadoria avulsa nesta semana'}).click();
  await page.getByLabel('Data real da entrega avulsa').fill('2026-11-13');
  await page.locator('#fm9875-confirm').check();await page.locator('#fm66-date').fill('2026-11-20');
  const extra=page.locator('#fm66-root .fm66-line').first();await extra.locator('.fm66-unregistered').check();await extra.locator('.fm66-manual-name').fill('Mercadoria entregue junto');await extra.locator('.fm66-qty').fill('5');await extra.locator('.fm66-unit').fill('2');
  await page.locator('#modal .modalSave').click();await page.locator('#modal').waitFor({state:'detached'});
  const result=await page.evaluate(()=>{const api=window.hlgbFactionAcertoUnified95102,g=api.consolidate(api.currentData()).groups[0],r=window.db.factionPayments.find(x=>x.description==='Mercadoria entregue junto');return {group:r?.manualGroupId,date:r?.manualDeliveryDateV9875,week:api.groupWeeks(g).find(w=>w.key==='delivery:2026-11-09')?.totalCents,hub:window.db.hubFinanceEntries.length,qty:window.db.factionPayments.find(x=>x.id==='normal-001').quantity}});
  assert.equal(result.date,'2026-11-13');assert.equal(result.week,1800);assert.equal(result.hub,0);assert.equal(result.qty,4);
  await page.locator('#hlgb-unified-acertos-v95102').getByText('Ver itens e datas',{exact:true}).click();
  await page.locator('[data-edit-avulso9875="'+result.group+'"]').click();await page.locator('#fm9875-confirm').check();await page.locator('#fm66-root .fm66-qty').first().fill('6');await page.locator('#fm66-root .fm66-unit').first().fill('3');await page.locator('#modal .modalSave').click();await page.locator('#modal').waitFor({state:'detached'});
  const edited=await page.evaluate(()=>{const api=window.hlgbFactionAcertoUnified95102,g=api.consolidate(api.currentData()).groups[0],r=window.db.factionPayments.find(x=>x.description==='Mercadoria entregue junto');return {quantity:r.quantity,value:r.value,date:r.manualDeliveryDateV9875,week:api.groupWeeks(g).find(w=>w.key==='delivery:2026-11-09')?.totalCents,hub:window.db.hubFinanceEntries.length}});
  assert.deepEqual(edited,{quantity:6,value:18,date:'2026-11-13',week:2600,hub:0});
  await page.locator('#hlgb-unified-acertos-v95102').getByText('Ver itens e datas',{exact:true}).click();await page.locator('[data-normal-preview9877="normal-001"]').click();await page.locator('#np9877-qty').fill('3');await page.locator('#np9877-price').fill('3');await page.locator('#np9877-reason').fill('Conferência de remuneração');await page.getByRole('button',{name:'Calcular prévia'}).click();assert.match(await page.locator('#np9877-result').innerText(),/27,00/);assert.match(await page.locator('#np9877-result').innerText(),/Nada foi salvo/);assert.equal(await page.evaluate(()=>window.db.factionPayments.find(x=>x.id==='normal-001').quantity),4);await page.evaluate(()=>window.closeModal());
  await page.getByRole('button',{name:'Conferir baixa semanal única'}).click();await page.locator('#hlgb-weekly-conference9885').waitFor();assert.match(await page.locator('#hlgb-weekly-conference9885').innerText(),/26,00/);assert.match(await page.locator('#hlgb-weekly-conference9885').innerText(),/Mercadoria entregue junto/);assert.match(await page.locator('#hlgb-weekly-conference9885').innerText(),/Nada foi salvo/);assert.doesNotMatch(await page.locator('#hlgb-weekly-conference9885').innerText(),/Camisola avulsa sem preço comercial/);await page.getByRole('button',{name:'Fechar conferência'}).click();assert.equal(await page.evaluate(()=>window.db.hubFinanceEntries.length),0);
  assert.equal(errors.length,0,'no browser errors: '+errors.join(' | '));
  console.log('PASS '+browserName+' mobile: 2 peças avulsas sem cadastro e 1 pagamento normal geram 1 total visual R$35,00, sem baixa');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
