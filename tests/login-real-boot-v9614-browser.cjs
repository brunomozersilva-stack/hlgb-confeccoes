'use strict';
const assert=require('node:assert/strict'),{chromium,webkit}=require('playwright');
const name=process.env.HLGB_BROWSER==='webkit'?'webkit':'chromium';
const engine=name==='webkit'?webkit:chromium;
// The complete 1.8 MB production app and all 158 scripts, not a synthetic login page.
// Fresh isolated browser: no user passwords, WAL, cookies, tokens or business data.
(async()=>{
 const browser=await engine.launch({headless:true});
 try{
  const context=await browser.newContext({serviceWorkers:'block'});
  const page=await context.newPage();
  const errors=[],external=[];
  page.on('pageerror',e=>errors.push(String(e.message).slice(0,180)));
  await page.route('**/*',route=>{
   const url=new URL(route.request().url());
   if(url.hostname!=='127.0.0.1'){
    external.push({host:url.hostname,method:route.request().method()});
    return route.abort('blockedbyclient');
   }
   return route.continue();
  });
  await page.goto('http://127.0.0.1:4173/abrir.html',{waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForFunction(()=>window.__HLGB_BOOT_READY_9477===true,{
  },{timeout:65000}).catch(async e=>{
   const state=await page.evaluate(()=>({
    url:location.pathname,ready:window.__HLGB_BOOT_READY_9477,
    failed:(window.__HLGB_BOOT_FAILED_FILES_9477||[]).slice(0,8),
    loaded:!!document.getElementById('loginScreen')
   })).catch(()=>({unreadable:true}));
   throw new Error('Real HLGB bootstrap did not finish in '+name+': '+JSON.stringify(state)+' errors='+JSON.stringify(errors.slice(0,5))+' '+e.message);
  });
  assert.equal(await page.locator('#loginScreen').isVisible(),true,'login must be visible without session');
  assert.equal(await page.locator('#appShell').isVisible(),false,'business panel must remain protected');
  assert.equal(await page.evaluate(()=>window.hlgbAuthNetwork9613?.status().installed),true,
   'safe auth recovery must install after legacy scripts');
  assert.ok(external.every(x=>x.method==='GET'),'prelogin browser must not perform business writes');
  console.log('PASS '+name+' real 1.8MB HLGB boot, legacy scripts, login visibility, no prelogin business panel');
  await context.close();
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
