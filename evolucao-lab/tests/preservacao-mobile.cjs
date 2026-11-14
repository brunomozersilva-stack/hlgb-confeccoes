'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const {chromium,webkit}=require('playwright');
const engine=process.env.HLGB_BROWSER==='webkit'?webkit:chromium;
const uri=pathToFileURL(path.resolve(__dirname,'../preservacao.html')).href;
const outDir=process.env.HLGB_SCREENSHOT_DIR||'/tmp';
async function caseAt(browser,width){
 const page=await browser.newPage({viewport:{width,height:820},deviceScaleFactor:1});
 const errors=[],http=[];
 page.on('pageerror',e=>errors.push(String(e?.message||e)));
 page.on('request',r=>{if(/^https?:\/\//i.test(r.url()))http.push(r.url())});
 try{
  await page.goto(uri,{waitUntil:'load'});
  assert.equal((await page.locator('#stat-all').textContent()).trim(),'76');
  assert.equal((await page.locator('#stat-visible').textContent()).trim(),'76');
  assert.equal(await page.locator('#feature-list .case').count(),76);
  await page.locator('#feature-search').fill('acerto');
  const acertoCount=await page.locator('#feature-list .case').count();
  assert(acertoCount>3&&acertoCount<76,'busca de acerto');
  await page.locator('#feature-search').fill('');
  await page.locator('#feature-module').selectOption('acertos');
  const chosen=await page.locator('#feature-list .case').count();
  assert(chosen>=8,'inventário de acertos');
  await page.locator('#feature-priority').selectOption('P0');
  const critical=await page.locator('#feature-list .case').count();
  assert(critical>0&&critical<=chosen,'filtro P0');
  await page.locator('#feature-list .case').first().getByRole('button',{name:'Separar para revisão'}).click();
  assert.equal((await page.locator('#stat-reviewed').textContent()).trim(),'1');
  assert.equal(await page.locator('#feature-list .case').first().getByRole('button',{name:'Desmarcar revisão visual'}).count(),1);
  await page.locator('#feature-priority').selectOption('');
  await page.locator('#feature-module').selectOption('');
  assert.equal(await page.locator('#feature-list .case').count(),76);
  assert.equal((await page.locator('#stat-reviewed').textContent()).trim(),'1');
  const text=await page.locator('#feature-list .case').first().locator('details').innerText();
  assert.match(text,/Ver evidências|Arquivo/);
  const metrics=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth}));
  assert(metrics.scroll<=metrics.width+2,'overflow horizontal '+width+': '+JSON.stringify(metrics));
  assert.deepEqual(errors,[],'JS error');
  assert.deepEqual(http,[],'remote request');
  if(width===375){
   fs.mkdirSync(outDir,{recursive:true});
   await page.screenshot({path:path.join(outDir,'hlgb-evolucao-preservacao-'+engine.name()+'-375.png'),fullPage:true});
  }
  console.log('PASS paridade visual '+engine.name()+' '+width+'px: 76 itens, filtros, contagem, sem rede');
 }finally{await page.close()}
}
(async()=>{
 const browser=await engine.launch({headless:true});
 try{for(const width of [320,375,390,768,1280])await caseAt(browser,width)}
 finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
