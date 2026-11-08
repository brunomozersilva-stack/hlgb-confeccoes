'use strict';
const {chromium,webkit}=require('playwright'),assert=require('node:assert/strict');
const engine=process.env.HLGB_BROWSER==='webkit'?webkit:chromium;
(async()=>{
 const browser=await engine.launch({headless:true});
 try{
  const page=await browser.newPage();
  await page.goto('http://127.0.0.1:4173/tests/hub-hidden-preauth-v9510-fixture.html',{waitUntil:'domcontentloaded'});
  const proof=await page.evaluate(()=>{
   const shell=document.getElementById('appShell'),wrapper=window.renderHubFinance;
   const guard=window.hlgbHubPersonalIntegrity?.hiddenPreAuthHub9510;
   if(typeof guard!=='function')throw Error('v95.10 guard missing');
   const early=wrapper(),earlyCount=window.__hubBaseRenderCount,hiddenGuard=guard();
   shell.style.display='block';const visibleBeforeAuth=wrapper(),visibleCount=window.__hubBaseRenderCount;
   shell.style.display='none';window.__HLGB_AUTH_READY=true;
   const authenticatedWhileHidden=wrapper(),authenticatedCount=window.__hubBaseRenderCount;
   shell.style.display='block';const normal=wrapper(),normalCount=window.__hubBaseRenderCount;
   return {early,earlyCount,hiddenGuard,visibleBeforeAuth,visibleCount,authenticatedWhileHidden,authenticatedCount,normal,normalCount};
  });
  assert.equal(proof.earlyCount,0,'hidden unauthenticated Hub render must be skipped');
  assert.equal(proof.hiddenGuard,true);
  assert.equal(proof.visibleBeforeAuth,'rendered','visible app must never be blocked');
  assert.equal(proof.visibleCount,1);
  assert.equal(proof.authenticatedWhileHidden,'rendered','authenticated pre-render must not be blocked');
  assert.equal(proof.authenticatedCount,2);
  assert.equal(proof.normalCount,3);
  console.log('PASS v95.10 '+engine.name()+': hidden preauth draw prevented, visible/authenticated draws unchanged');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});