'use strict';
const assert=require('node:assert/strict');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const {chromium,webkit}=require('playwright');
const engine=process.env.HLGB_BROWSER==='webkit'?webkit:chromium;
const target=pathToFileURL(path.resolve(__dirname,'../prototipo.html')).href;
const saveDir=process.env.HLGB_SCREENSHOT_DIR||'/tmp';
const fs=require('node:fs');

async function testViewport(browser,width,height){
 const isMobile=width<=390;
 const page=await browser.newPage({viewport:{width,height},isMobile:false,deviceScaleFactor:1});
 const pageErrors=[],external=[];
 page.on('pageerror',e=>pageErrors.push(String(e.message||e)));
 page.on('request',r=>{if(/^https?:/i.test(r.url()))external.push(r.url())});
 try{
  await page.goto(target,{waitUntil:'load'});
  await page.waitForFunction(()=>document.querySelectorAll('[data-page]').length===6);
  assert.equal(await page.locator('[data-page="overview"]').isVisible(),true);
  assert.equal(await page.locator('[data-page="modules"]').isVisible(),false);
  const nav=isMobile?'.bottom-nav button':'aside .desktop-nav button';
  assert.equal(await page.locator('.bottom-nav').isVisible(),isMobile);
  const metrics=await page.evaluate(()=>({width:window.innerWidth,scroll:document.documentElement.scrollWidth}));
  assert(metrics.scroll<=metrics.width+2,'overflow horizontal em '+width+': '+JSON.stringify(metrics));
  await page.locator(nav+'[data-tab="modules"]').click();
  await page.waitForSelector('#module-list .module');
  assert.equal(await page.locator('#module-list .module').count(),19);
  await page.locator('#module-search').fill('Facções');
  assert.equal(await page.locator('#module-list .module').count(),1);
  await page.locator('#module-search').fill('');
  await page.locator('#module-group').selectOption('financeiro');
  assert.equal(await page.locator('#module-list .module').count(),3,'acertos, hub, folha');
  await page.locator('#module-group').selectOption('todos');
  // Protected core cannot be disabled even in the temporary visual simulation.
  const protectedBtn=page.locator('.module .module-actions button[data-sim-toggle="nucleo"]');
  assert.equal(await protectedBtn.isDisabled(),true);
  const optional=page.locator('.module .module-actions button[data-sim-toggle="produtos"]');
  await optional.click();
  assert.equal(await page.locator('.module').filter({has:optional}).locator('.pill.good').count(),1);
  await page.locator(nav+'[data-tab="dependencies"]').click();
  assert.equal(await page.locator('[data-page="dependencies"]').isVisible(),true);
  assert.equal(await page.locator('#dep-module').inputValue(),'acertos');
  assert.equal(await page.locator('#dep-outgoing .dependency-card').count(),3);
  assert.equal(await page.locator('#dep-write-risks .dependency-risk').count(),1);
  await page.locator('#dep-module').selectOption('produtos');
  assert.equal(await page.locator('#dep-incoming .dependency-card').count(),5);
  await page.locator('#dep-module').selectOption('acertos');
  await page.locator(nav+'[data-tab="laboratory"]').click();
  await page.locator('#role').selectOption('faccao');
  assert.equal((await page.locator('#phone-title').textContent()).trim(),'Facção externa');
  assert.equal(await page.locator('#phone-items .phone-item').count(),3);
  await page.locator(nav+'[data-tab="requests"]').click();
  await page.locator('#request-module').selectOption('relatorios');
  await page.locator('#request-title').fill('Melhorar filtro mobile');
  await page.locator('#request-description').fill('Quero buscas simples para formulários e relatórios no celular.');
  await page.locator('#request-form button[type="submit"]').click();
  assert.match(await page.locator('#request-feedback').textContent(),/NÃO foi enviada nem salva/);
  await page.locator(nav+'[data-tab="quality"]').click();
  assert.equal(await page.locator('[data-page="quality"]').isVisible(),true);
  assert.equal(pageErrors.length,0,'erro JS: '+pageErrors.join(' | '));
  assert.deepEqual(external,[],'laboratório fez solicitações remotas');
  const storage=await page.evaluate(()=>({local:localStorage.length,session:sessionStorage.length}));
  assert.equal(storage.local,0);assert.equal(storage.session,0);
  const after=await page.evaluate(()=>({width:window.innerWidth,scroll:document.documentElement.scrollWidth}));
  assert(after.scroll<=after.width+2,'overflow final '+width+': '+JSON.stringify(after));
  if(isMobile&&width===375){
   await page.locator(nav+'[data-tab="dependencies"]').click();
   fs.mkdirSync(saveDir,{recursive:true});
   await page.screenshot({path:path.join(saveDir,'evolucao-dependencias-'+engine.name()+'-375.png'),fullPage:true});
  }
  console.log('PASS isolado '+engine.name()+' '+width+'px: 6 abas, módulos, risco, formulário, mobile, sem rede');
 }finally{await page.close()}
}
(async()=>{
 const browser=await engine.launch({headless:true});
 try{
  for(const width of [320,375,390,768,1280]){
   await testViewport(browser,width,width<=390?812:900);
  }
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
