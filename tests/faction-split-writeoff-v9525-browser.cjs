'use strict';
const {chromium,webkit}=require('playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browserName=process.env.HLGB_BROWSER||'chromium';
 const browser=await ({chromium,webkit})[browserName].launch({headless:true});
 try{
  const page=await browser.newPage();
  await page.setContent('<!doctype html><html lang="pt-BR"><body><section class="page" id="faccoes"><h1>Facções</h1><div class="panel"><table id="factionTable"></table></div></section></body></html>');
  await page.evaluate(()=>{
   window.db={factions:[{id:123,name:'Graziano',productId:5,description:'Cueca Boxer Emerson',sent:260,price:1.25,op:'PED-38',done:0,returned:0}],products:[{id:5,name:'Cueca Boxer Emerson'}],factionMasters:[{id:11,name:'Roseli',active:true}]};
   window.renderFactions=()=>{};
   window.hlgbFactionAdjust9514={open(id){window.__openedTransfer=id}};
  });
  await page.addScriptTag({path:'release-faction-operations-v9520.js'});
  await page.evaluate(()=>window.hlgbFactionOperations9520.install());
  const panel=page.locator('#faccoes > #hlgbFactionOpsPanel9520');
  assert.equal(await panel.count(),1,'Panel must be visible directly in Facções (not hidden near the table)');
  assert.match(await panel.innerText(),/Trocar facção \/ alterar preço de um envio/);
  await panel.locator('#hlgbFactionOpsDetails9531 > summary').click();
  await panel.locator('#hlgbFactionOpsSearch9520').fill('Cueca');
  assert.match(await panel.innerText(),/Cueca Boxer Emerson/);
  assert.match(await panel.innerText(),/R\$\s?1,25/);
  await panel.locator('button[data-hlgb-faction-action="transfer"]').click();
  assert.equal(await page.evaluate(()=>window.__openedTransfer),'123');
  console.log('PASS '+browserName+': Facções access, price and protected transfer entry');
 }finally{await browser.close()}
})().catch(err=>{console.error(err);process.exitCode=1});
