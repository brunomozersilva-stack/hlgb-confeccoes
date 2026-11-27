'use strict';
const {chromium,webkit}=require('playwright'),assert=require('node:assert/strict');
const engine=process.env.HLGB_BROWSER==='webkit'?webkit:chromium;
const url='http://127.0.0.1:4173/app-stable3.html';
const fixture='<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><script>function doLogin(){};window.hlgbLoginConfirmGate9407={confirm:function(){return true}};<\/script></head><body><div id="loginScreen">Login de teste</div><div id="appShell">Sistema simulado</div></body></html>';
async function setup(browser){
 const context=await browser.newContext({serviceWorkers:'block'});
 const page=await context.newPage();
 // Keep the test focused on the loader, not 100 independently tested modules.
 await page.route('**/*.js*',route=>route.fulfill({status:200,contentType:'application/javascript',body:''}));
 return {context,page};
}
(async()=>{
 const browser=await engine.launch({headless:true});
 try{
  {
   const {context,page}=await setup(browser);let tries=0,errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   await page.route('**/app9240.html*',route=>{
    tries++;
    if(tries===1)return route.abort('failed');
    return route.fulfill({status:200,contentType:'text/html',body:fixture});
   });
   await page.goto(url,{waitUntil:'domcontentloaded',timeout:30000});
   await page.waitForSelector('#loginScreen',{timeout:25000});
   await page.waitForFunction(()=>window.__HLGB_BOOT_READY_9477===true,{timeout:15000});
   assert.equal(tries,2,'a failed fetch must recover on the second attempt');
   const phase=await page.evaluate(()=>({metric:window.hlgbBootPhases9844,links:[...document.querySelectorAll('link[rel=preload][as=script]')].map(n=>n.href),scripts:[...document.scripts].filter(n=>n.src).map(n=>n.src)}));
   assert.equal(phase.metric.baseAttempts,2);assert.equal(phase.metric.bootReady,true);
   assert.equal(phase.metric.preloadCount,6);assert.equal(phase.links.length,6);
   for(const link of phase.links)assert.equal(phase.scripts.filter(s=>s===link).length,1,'preload must reuse exact script URL, not create a second script');
   for(const key of ['baseFetchMs','patchMs','scriptsAndDocumentMs','totalMs'])assert.ok(Number.isFinite(phase.metric[key])&&phase.metric[key]>=0);
   assert.ok(Math.abs(phase.metric.totalMs-phase.metric.baseFetchMs-phase.metric.patchMs-phase.metric.scriptsAndDocumentMs)<1);
   assert.ok(phase.metric.baseFetchMs>=450,'retry delay included in fetch phase');
   console.log('BOOT_PHASES_9844 '+JSON.stringify(phase.metric));
   assert.deepEqual(errors,[],'boot must not generate JavaScript page errors');
   await context.close();
  }
  {
   const {context,page}=await setup(browser);let tries=0;
   const originalWal='{"entries":{"production|test":{"id":"test","state":"pending"}}}';
   await page.addInitScript(raw=>{localStorage.setItem('hlgb_durable_wal_v1',raw)},originalWal);
   await page.route('**/app9240.html*',route=>{tries++;return route.abort('failed')});
   await page.goto(url,{waitUntil:'domcontentloaded',timeout:30000});
   await page.waitForFunction(()=>document.body.innerText.includes('Não foi possível abrir o sistema'),{timeout:20000});
   const report=await page.evaluate(()=>({wal:localStorage.getItem('hlgb_durable_wal_v1'),record:JSON.parse(sessionStorage.getItem('hlgb_boot_failure_v9478')||'null'),text:document.body.innerText}));
   assert.equal(tries,3,'three finite retries only');
   assert.equal(report.wal,originalWal,'pending browser WAL must stay intact');
   assert.equal(report.record.attempts.length,3,'diagnostic should record all three failures');
   assert.match(report.text,/Diagnóstico seguro de abertura/);
   await context.close();
  }
  console.log('PASS v95.18 '+engine.name()+': Chrome failed fetch recovery and protected local WAL on persistent failure');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
