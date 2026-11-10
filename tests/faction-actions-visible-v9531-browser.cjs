'use strict';
const assert=require('node:assert/strict');
const {chromium,webkit}=require('playwright');
(async()=>{
 const kind=process.env.HLGB_BROWSER||'chromium';
 const browser=await ({chromium,webkit})[kind].launch({headless:true});
 try{
  const page=await browser.newPage();
  await page.setContent('<!doctype html><html lang="pt-BR"><body>'+
   '<section id="faccoes" class="page active">'+
   '<h1>Envios para facção</h1>'+
   '<div class="sub">Acompanhe as operações enviadas</div>'+
   '<div class="panel" id="factionChecklistPanel9176"><h2>Checklist das facções</h2><div id="factionChecklistTable9176"></div></div>'+
   '<div class="panel" id="factionPlannerCards">Calculadora</div>'+
   '<div class="panel" id="factionReport">Relatório de produção e pagamentos</div>'+
   '</section></body></html>');
  await page.evaluate(()=>{
   window.db={factions:[{id:1793732315854,name:'Graziano',description:'Cueca Boxer Tule',productId:15,
      sent:480,price:1.2,op:'PED-1793732315854',status:'Em produção'}],
    products:[{id:15,name:'Cueca Boxer Tule'}],factionMasters:[{id:1,name:'Roseli',active:true}]};
   window.renderFactions=()=>{};
   window.__HLGB_AUTH_READY=true;
   window.hlgbAfterLogin=(cb)=>{ /* normal boot will install before next render */ };
   window.openModal=(title,html,callback)=>{window.__lastModal={title,html}};
   window.cloudRequest=()=>{throw Error('No cloud operation expected by UI test')};
  });
  const before=await page.evaluate(()=>JSON.stringify(window.db));
  await page.addScriptTag({path:'release-faction-safe-adjust-v9514.js'});
  await page.addScriptTag({path:'release-faction-operations-v9520.js'});
  const panel=page.locator('#hlgbFactionOpsPanel9520');
  const summary=page.locator('#hlgbFactionOpsDetails9531 > summary');
  assert.equal(await panel.count(),1,'One entry in the actual Envios para facção tab');
  assert.equal(await summary.isVisible(),true,'Entry is visible without scrolling through reports');
  assert.match(await summary.innerText(),/Trocar facção.*alterar preço/);
  assert.equal(await panel.evaluate(el=>el.nextElementSibling?.id),'factionChecklistPanel9176','Entry must precede Checklist');
  assert.equal(await page.locator('#hlgbFactionOpsDetails9531').evaluate(el=>el.open),false,'Compact and collapsed by default');
  await summary.click();
  await page.locator('#hlgbFactionOpsSearch9520').fill('Tule');
  assert.match(await panel.innerText(),/Cueca Boxer Tule/);
  await panel.locator('button[data-hlgb-faction-action="price"]').click();
  let m=await page.evaluate(()=>window.__lastModal);
  assert.match(m.title,/Alterar preço por peça/);
  assert.match(m.html,/value="price" selected/);
  await panel.locator('button[data-hlgb-faction-action="transfer"]').click();
  m=await page.evaluate(()=>window.__lastModal);
  assert.match(m.title,/Transferir peças/);
  assert.match(m.html,/value="transfer" selected/);
  await page.evaluate(()=>window.renderFactions());
  assert.equal(await panel.count(),1,'Rendering does not duplicate section');
  assert.equal(await panel.evaluate(el=>el.nextElementSibling?.id),'factionChecklistPanel9176','Rendering maintains placement');
  assert.equal(await page.evaluate(()=>JSON.stringify(window.db)),before,'No writes in display-only test');
  console.log('PASS '+kind+' — section visible in Envios and price/transfer direct');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
