'use strict';
const {chromium,webkit}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const engine=process.env.HLGB_BROWSER==='webkit'?webkit:chromium;
const uri=pathToFileURL(path.resolve(__dirname,'../fluxos-operacionais.html')).href;
const outDir=process.env.HLGB_SCREENSHOT_DIR||'/tmp';
async function validate(browser,width){
 const page=await browser.newPage({viewport:{width,height:820},deviceScaleFactor:1});
 const failures=[],http=[];
 page.on('pageerror',err=>failures.push(String(err?.message||err)));
 page.on('request',req=>{if(/^https?:\/\//i.test(req.url()))http.push(req.url())});
 try{
  await page.goto(uri,{waitUntil:'load'});
  assert.equal(await page.locator('[data-view="search"]').isVisible(),true);
  assert.equal(await page.locator('#product-results .product').count(),6);
  await page.locator('#search-input').fill('calcinha preto M');
  assert.equal(await page.locator('#product-results .product').count(),1);
  assert.match(await page.locator('#product-results .product').first().innerText(),/EX-001/);
  await page.locator('#search-input').fill('');
  await page.locator('#category').selectOption('Conjunto');
  await page.locator('#available').check();
  assert.equal(await page.locator('#product-results .product').count(),0);
  await page.locator('#category').selectOption('');
  await page.locator('#available').uncheck();
  await page.locator('#search-input').fill('cAmÍsOlA');
  assert.equal(await page.locator('#product-results .product').count(),1,'buscar com acentos diferentes');
  await page.locator('[data-tab="settlement"]').click();
  assert.equal(await page.locator('[data-view="search"]').isVisible(),false);
  assert.equal(await page.locator('#settlement-lines tr').count(),2);
  assert.match(await page.locator('#settlement-gross').innerText(),/19,50/);
  await page.locator('#adjustment').fill('2');
  assert.match(await page.locator('#settlement-status').innerText(),/Conferência bloqueada/);
  await page.locator('#reason').fill('Ajuste fictício de demonstração');
  assert.match(await page.locator('#settlement-total').innerText(),/17,50/);
  assert.match(await page.locator('#settlement-status').innerText(),/Prévia coerente/);
  assert.equal(await page.getByRole('button',{name:'Salvar (bloqueado)'}).isDisabled(),true);
  await page.locator('#new-item').selectOption('EX-004');
  await page.locator('#add-line').click();
  assert.equal(await page.locator('#settlement-lines tr').count(),3);
  await page.locator('#settlement-lines tr').last().locator('input[type="number"]').first().fill('10');
  assert.match(await page.locator('#settlement-gross').innerText(),/22,00/);
  await page.locator('#settlement-lines tr').last().getByRole('button',{name:/Remover/}).click();
  assert.equal(await page.locator('#settlement-lines tr').count(),2);
  await page.locator('[data-tab="reports"]').click();
  assert.equal(await page.locator('#report-lines tr').count(),5);
  assert.equal((await page.locator('#report-qty').innerText()).trim(),'960');
  await page.locator('#report-area').selectOption('Corte');
  assert.equal((await page.locator('#report-qty').innerText()).trim(),'570');
  await page.locator('#report-period').selectOption('1');
  assert.equal((await page.locator('#report-qty').innerText()).trim(),'420');
  assert.equal(await page.locator('#report-lines tr').count(),1);
  await page.locator('#report-lines tr').first().getByRole('button',{name:'Ver origem'}).click();
  assert.match(await page.locator('#report-trace').innerText(),/SIM-C001/);
  assert.match(await page.locator('#report-trace').innerText(),/Nenhuma origem financeira real foi consultada/);
  const metrics=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth}));
  assert(metrics.scroll<=metrics.width+2,'rolagem horizontal indevida a '+width+'px: '+JSON.stringify(metrics));
  assert.deepEqual(http,[],'não pode acessar rede');
  assert.deepEqual(failures,[],'não pode lançar exceções');
  if(width===375){
   const name='hlgb-evolucao-fluxos-'+engine.name()+'-'+width+'.png';
   fs.mkdirSync(outDir,{recursive:true});
   await page.screenshot({path:path.join(outDir,name),fullPage:true});
  }
  console.log('PASS '+engine.name()+' '+width+'px: busca, acerto, relatórios, isolamento, layout');
 }finally{await page.close()}
}
(async()=>{
 const browser=await engine.launch({headless:true});
 try{for(const width of [320,375,390,768,1280])await validate(browser,width)}
 finally{await browser.close()}
})().catch(err=>{console.error(err);process.exitCode=1});
