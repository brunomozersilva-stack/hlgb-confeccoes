'use strict';
const {chromium,webkit}=require('playwright'),assert=require('node:assert/strict');
const engine=process.env.HLGB_BROWSER==='webkit'?webkit:chromium;
(async()=>{
 const browser=await engine.launch({headless:true});
 try{
  for(const width of [360,390,700]){
   const page=await browser.newPage({viewport:{width,height:780},isMobile:false,deviceScaleFactor:2});
   const errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.goto('http://127.0.0.1:4173/tests/mobile-friendly-v9512-fixture.html',{waitUntil:'domcontentloaded'});
   await page.waitForFunction(()=>!!document.getElementById('hlgbMobileMenu9512'),null,{timeout:15000});
   const initial=await page.evaluate(()=>({
    width:window.innerWidth,scrollWidth:document.documentElement.scrollWidth,
    mainWidth:document.querySelector('#appShell main').getBoundingClientRect().width,
    tableScrollable:document.querySelector('.page table').scrollWidth>document.querySelector('.page table').clientWidth,
    navInvisible:getComputedStyle(document.getElementById('nav')).visibility==='hidden',
    tabCount:document.querySelectorAll('#hlgbMobileNav9250 button').length
   }));
   assert(initial.scrollWidth<=width+2,'unexpected horizontal document overflow '+width+'px: '+JSON.stringify(initial));
   assert(initial.mainWidth<=width+2);
   if(width<=390)assert(initial.tableScrollable,'wide business table must scroll inside itself on narrow phones');
   assert(initial.navInvisible,'drawer should be hidden before opening');
   assert.equal(initial.tabCount,5);
   await page.locator('#hlgbMobileMenu9512').click();
   assert(await page.locator('body').evaluate(b=>b.classList.contains('hlgb-mobile-nav-open9512')));
   assert.equal(await page.locator('#hlgbMobileMenu9512').getAttribute('aria-expanded'),'true');
   await page.locator('#nav button').filter({hasText:'Produção ›'}).click();
   assert(await page.locator('body').evaluate(b=>b.classList.contains('hlgb-mobile-nav-open9512')),'expanding nav group must not close drawer');
   await page.locator('#nav button').filter({hasText:'Pedidos'}).click();
   await page.waitForFunction(()=>!document.body.classList.contains('hlgb-mobile-nav-open9512'));
   assert.equal(await page.evaluate(()=>window.__lastPage),'pedidos');
   await page.locator('#hlgbMobileMenu9512').click();
   await page.keyboard.press('Escape');
   assert(!(await page.locator('body').evaluate(b=>b.classList.contains('hlgb-mobile-nav-open9512'))));
   assert.equal(errors.length,0,errors.join('\n'));
   console.log('PASS v95.12 '+engine.name()+' '+width+'px: responsive main, scrollable tables, accessible drawer and navigation');
   await page.close();
  }
  const desktop=await browser.newPage({viewport:{width:1280,height:820}});
  await desktop.goto('http://127.0.0.1:4173/tests/mobile-friendly-v9512-fixture.html');
  assert.equal(await desktop.locator('#hlgbMobileMenu9512').isVisible(),false,'desktop navigation must stay unchanged');
  assert.equal(await desktop.locator('#nav').isVisible(),true);
  console.log('PASS v95.12 '+engine.name()+': desktop navigation unchanged');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});