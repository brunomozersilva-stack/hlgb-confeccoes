'use strict';
const assert=require('node:assert/strict'),{chromium,webkit}=require('playwright');
const engine=process.env.HLGB_BROWSER==='webkit'?webkit:chromium;
(async()=>{
 const browser=await engine.launch({headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1100,height:900},serviceWorkers:'block'});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:4173/tests/cut-faction-traveta-v9521-fixture.html',{waitUntil:'domcontentloaded',timeout:30000});
  await page.evaluate(()=>{window.hlgbCutModelSplit.renderSplitPanel();window.hlgbFactionOperations9520.install()});
  await page.waitForSelector('#hlgbFactionOpsRows9520 button[data-hlgb-faction-action="transfer"]',{timeout:10000});
  let cutText=await page.locator('#hlgbCutSplitPanel').innerText();
  assert.match(cutText,/Conjunto/);
  assert.doesNotMatch(cutText,/Cueca/,'finished model must be hidden in pending queue');
  await page.locator('#hlgbFactionOpsRows9520 button[data-hlgb-faction-action="transfer"]').click();
  assert.equal(await page.evaluate(()=>window.__transferId),'301','must call protected transfer action');
  await page.getByRole('button',{name:/Mostrar 1 finalizado/}).click();
  cutText=await page.locator('#hlgbCutSplitPanel').innerText();
  assert.match(cutText,/Cueca/,'finished model must stay available in history');
  await page.getByRole('button',{name:/Conferir materiais da grade cortada/}).click();
  const view=await page.evaluate(()=>({modal:window.__modal,grade:window.__materialGrade,writes:window.__writes}));
  assert.match(view.modal.body,/Elástico/);
  assert.doesNotMatch(view.modal.body,/Chocolate/,'removed color must not request material');
  assert.equal(view.grade.length,1);
  assert.equal(view.grade[0].color,'Preto');
  assert.equal(view.writes,0,'no writes from preview');
  await page.locator('#hlgbFactionOpsRows9520 button[data-hlgb-faction-action="traveta"]').click();
  const travel=await page.evaluate(()=>({modal:window.__modal,price:window.db.factions[0].price,paid:window.db.factionPayments||[],writes:window.__writes}));
  assert.match(travel.modal.title,/Baixa operacional/);
  assert.match(travel.modal.body,/não altera pagamento/);
  assert.equal(travel.price,1.5);
  assert.equal(travel.paid.length,0);
  assert.equal(travel.writes,0);
  assert.deepEqual(errors,[]);
  console.log('PASS HLGB v95.21 '+engine.name()+': both PRs together; pending models only, read-only cut grade, protected faction action and traveta form');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
