'use strict';
const assert=require('node:assert/strict'),{chromium,webkit}=require('playwright');
const name=process.env.HLGB_BROWSER==='webkit'?'webkit':'chromium';
const browserType=name==='webkit'?webkit:chromium;
const pure='/hlgb-modules/producao/separacao-progresso-v9617.js';
(async()=>{
 const browser=await browserType.launch({headless:true});
 try{
  for(const blockOptional of [false,true]){
   const context=await browser.newContext({serviceWorkers:'block'});
   const page=await context.newPage(),methods=[],errors=[];
   page.on('request',r=>methods.push(r.method()));
   page.on('pageerror',e=>errors.push(String(e.message).slice(0,160)));
   await page.route('**/*',route=>{
    const req=route.request(),url=new URL(req.url());
    if(blockOptional&&url.pathname===pure)return route.abort('blockedbyclient');
    if(url.hostname!=='127.0.0.1')return route.abort('blockedbyclient');
    return route.continue();
   });
   await page.goto('http://127.0.0.1:4173/abrir.html',{waitUntil:'domcontentloaded',timeout:60000});
   await page.waitForFunction(()=>window.__HLGB_BOOT_READY_9477===true,undefined,{timeout:65000}).catch(async e=>{
    const diagnostic=await page.evaluate(()=>({failed:(window.__HLGB_BOOT_FAILED_FILES_9477||[]).slice(0,8),reason:window.__HLGB_BOOT_ERROR_9477,login:!!document.getElementById('loginScreen')})).catch(()=>({unreadable:true}));
    throw new Error('HLGB did not boot with optional module '+(blockOptional?'blocked':'present')+' in '+name+' '+JSON.stringify(diagnostic)+' '+e.message+' errors='+JSON.stringify(errors.slice(0,4)));
   });
   assert.equal(await page.locator('#loginScreen').isVisible(),true,'login visible');
   assert.equal(await page.locator('#appShell').isVisible(),false,'commercial panel gated');
   const state=await page.evaluate(()=>({
    core:typeof window.HLGB_SEPARATION_PROGRESS_9617?.totalsForItems==='function',
    legacy:window.hlgbSeparationDirect9321?.status()?.installed===true,
    saved:window.hlgbSeparationDirect9321?.status()?.saves||0
   }));
   assert.equal(state.core,!blockOptional,'pure calculator present only when loaded');
   assert.equal(state.legacy,true,'legacy separation controller still installed');
   assert.equal(state.saved,0,'no synthetic commercial write');
   assert.ok(methods.every(m=>m==='GET'),'no prelogin business writes');
   console.log('PASS '+name+' full live boot, optional progress '+(blockOptional?'blocked':'present')+', login visible and legacy separation intact');
   await context.close();
  }
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
