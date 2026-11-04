'use strict';
const {webkit,chromium}=require('playwright');
const assert=require('node:assert/strict');
const browserName=process.env.HLGB_BROWSER==='chromium'?'chromium':'webkit';
const engine=browserName==='chromium'?chromium:webkit;
(async()=>{
 const browser=await engine.launch({headless:true});
 try {
  for(const scenario of [
   {name:'nonessential module',file:'release-whatsapp-pilot-v9250.js',block:false},
   {name:'essential save transport',file:'release-save-transport-v9320.js',block:true}
  ]){
   const context=await browser.newContext({serviceWorkers:'block'});
   const page=await context.newPage();
   await page.route('**/'+scenario.file+'*',route=>route.fulfill({status:503,contentType:'text/javascript',body:'/* simulated missing dependency */'}));
   await page.goto('http://127.0.0.1:4173/index.html',{waitUntil:'domcontentloaded',timeout:90000});
   await page.waitForFunction(file=>Array.isArray(window.__HLGB_BOOT_FAILED_FILES_9477)&&window.__HLGB_BOOT_FAILED_FILES_9477.includes(file),scenario.file,{timeout:90000});
   await page.waitForFunction(()=>window.__HLGB_BOOT_READY_9477===true||!!window.__HLGB_BOOT_ERROR_9477,null,{timeout:90000});
   const actual=await page.evaluate(()=>({
    failed:window.__HLGB_BOOT_FAILED_FILES_9477,
    ready:window.__HLGB_BOOT_READY_9477,
    error:window.__HLGB_BOOT_ERROR_9477||'',
    warn:window.__HLGB_BOOT_WARNING_9478||'',
    blocked:document.documentElement.classList.contains('hlgb-boot-loading-9477'),
    rescue:!!document.getElementById('hlgbBootRescue9477'),
    diagnostic:JSON.parse(sessionStorage.getItem('hlgb_boot_failure_v9478')||'null')
   }));
   assert(actual.failed.includes(scenario.file));
   assert.equal(actual.ready,!scenario.block,scenario.name+' boot readiness');
   assert.equal(actual.blocked,scenario.block,scenario.name+' gate');
   if(scenario.block){assert(actual.error.includes('essenciais'));assert(actual.rescue)}
   else {assert(actual.warn.includes(scenario.file))}
   assert(actual.diagnostic?.failedFiles.includes(scenario.file));
   assert(!JSON.stringify(actual.diagnostic).includes('password'),'report must not contain credentials');
   console.log('PASS '+scenario.name+' '+JSON.stringify({browser:browserName,blocked:actual.blocked,reported:actual.failed}));
   await context.close();
  }
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
