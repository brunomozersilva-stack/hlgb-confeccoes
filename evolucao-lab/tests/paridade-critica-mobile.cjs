'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const {chromium,webkit}=require('playwright');
const browserType=process.env.HLGB_BROWSER==='webkit'?webkit:chromium;
const url=pathToFileURL(path.resolve(__dirname,'../paridade-critica.html')).href;
const screenshots=process.env.HLGB_SCREENSHOT_DIR||'/tmp';
async function check(browser,width){
 const page=await browser.newPage({viewport:{width,height:800}});
 const requests=[],errors=[];
 page.on('pageerror',e=>errors.push(String(e.message||e)));
 page.on('request',r=>{if(/^https?:/i.test(r.url()))requests.push(r.url())});
 try{
  await page.goto(url,{waitUntil:'load'});
  assert.equal((await page.locator('#kpi-all').innerText()).trim(),'43');
  assert.equal(await page.locator('#cases .case').count(),43);
  await page.locator('#area').selectOption('acertos');
  assert.equal(await page.locator('#cases .case').count(),22);
  await page.locator('#area').selectOption('faccoes');
  assert.equal(await page.locator('#cases .case').count(),12);
  await page.locator('#area').selectOption('hub');
  assert.equal(await page.locator('#cases .case').count(),9);
  await page.locator('#risk').selectOption('P0');
  const crit=await page.locator('#cases .case').count();
  assert(crit>0&&crit<9);
  await page.locator('#risk').selectOption('');
  await page.locator('#area').selectOption('');
  await page.locator('#q').fill('travetada');
  const found=await page.locator('#cases .case').count();
  assert(found>0&&found<43);
  await page.locator('#q').fill('');
  await page.locator('#cases .case').first().getByRole('button',{name:'Separar para revisão'}).click();
  assert.equal((await page.locator('#kpi-selected').innerText()).trim(),'1');
  assert.equal((await page.locator('#kpi-all').innerText()).trim(),'43');
  const first=page.locator('#cases .case').first();
  assert.equal(await first.locator('.compare').count(),2);
  assert.match(await first.locator('.mobile').innerText(),/Mobile/);
  await first.locator('details summary').click();
  assert.match(await first.locator('details').innerText(),/autorização explícita/);
  const sizing=await page.evaluate(()=>({w:innerWidth,scroll:document.documentElement.scrollWidth}));
  assert(sizing.scroll<=sizing.w+2,'document overflow '+width+' '+JSON.stringify(sizing));
  assert.deepEqual(requests,[],'network request');
  assert.deepEqual(errors,[],'page errors');
  if(width===375){fs.mkdirSync(screenshots,{recursive:true});await page.screenshot({path:path.join(screenshots,'paridade-critica-'+browserType.name()+'-375.png'),fullPage:true})}
  console.log('PASS paridade crítica '+browserType.name()+' '+width+'px: 43 cenários, comparações, mobile, offline');
 }finally{await page.close()}
}
(async()=>{
 const browser=await browserType.launch({headless:true});
 try{for(const width of [320,375,390,768,1280])await check(browser,width)}
 finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
