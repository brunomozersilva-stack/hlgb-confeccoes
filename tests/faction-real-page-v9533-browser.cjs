'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {chromium,webkit}=require('playwright');

(async()=>{
 const browserName=process.env.HLGB_BROWSER||'chromium';
 const browser=await ({chromium,webkit})[browserName].launch({headless:true});
 try{
  // Use the actual section shipped in the real 1.8 MB app, not a hand-built fake layout.
  const source=fs.readFileSync('app9240.html','utf8');
  const begin=source.indexOf('<section id="faccoes" class="page">');
  const end=source.indexOf('</section>',begin);
  assert.ok(begin>=0&&end>begin,'Current real menu must exist in app9240.html');
  const actual=source.slice(begin,end+'</section>'.length);
  const page=await browser.newPage();
  await page.setContent('<!doctype html><html lang="pt-BR"><body>'+actual+'</body></html>');
  const panel=page.locator('#hlgbFactionOpsPanel9520');
  const label=page.locator('#hlgbFactionOpsDetails9531 > summary');
  // This must be visible BEFORE any optional Javascript module is loaded.
  assert.equal(await panel.count(),1,'Static entry must be in the real page');
  assert.equal(await label.isVisible(),true,'Entry is visible even before scripts load');
  assert.equal(await panel.evaluate(el=>el.nextElementSibling?.id),'factionChecklistPanel9176');
  await label.click();
  assert.equal(await page.locator('#hlgbFactionOpsSearch9520').isVisible(),true);
  assert.match(await page.locator('#hlgbFactionOpsRows9520').innerText(),/módulo não carregou/);
  await page.evaluate(()=>{
   window.db={
    factions:[{id:1793732315854,name:'Graziano',description:'Cueca Boxer Tule',productId:15,
      op:'PED-1793732315854',sent:480,price:1.2,status:'Em produção'}],
    products:[{id:15,name:'Cueca Boxer Tule'}],factionMasters:[{id:11,name:'Roseli',active:true}]
   };
   window.__HLGB_AUTH_READY=true;
   window.renderFactions=()=>{};
   window.hlgbAfterLogin=()=>{};
   window.openModal=(title,body,onSave)=>{window.__factionModal={title,body,canSave:typeof onSave==='function'}};
  });
  const before=await page.evaluate(()=>JSON.stringify(window.db));
  await page.addScriptTag({path:'release-faction-safe-adjust-v9514.js'});
  await page.addScriptTag({path:'release-faction-operations-v9520.js'});
  assert.equal(await panel.count(),1,'Module must reuse the built-in panel, not create a duplicate');
  assert.equal(await panel.evaluate(el=>el.dataset.hlgbFactionOpsBound9533),'yes','Module must bind existing HTML');
  // Search in the real input; check separate action buttons and actual event handlers.
  await page.locator('#hlgbFactionOpsSearch9520').fill('Tule');
  assert.match(await page.locator('#hlgbFactionOpsRows9520').innerText(),/Cueca Boxer Tule/);
  await panel.locator('button[data-hlgb-faction-action="price"]').click();
  const price=await page.evaluate(()=>window.__factionModal);
  assert.match(price.title,/Alterar preço por peça/);
  assert.match(price.body,/value="price" selected/);
  await panel.locator('button[data-hlgb-faction-action="transfer"]').click();
  const transfer=await page.evaluate(()=>window.__factionModal);
  assert.match(transfer.title,/Transferir peças/);
  assert.match(transfer.body,/value="transfer" selected/);
  await page.evaluate(()=>window.renderFactions());
  assert.equal(await panel.count(),1);
  assert.equal(await panel.evaluate(el=>el.nextElementSibling?.id),'factionChecklistPanel9176');
  assert.equal(await page.evaluate(()=>JSON.stringify(window.db)),before,'No record may change before submitting a transaction');
  console.log('PASS '+browserName+' with real HLGB faccoes markup, static entry and bound actions');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
