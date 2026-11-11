'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {chromium,webkit}=require('playwright');
const kind=process.env.HLGB_BROWSER||'chromium';
const engine=kind==='webkit'?webkit:chromium;
function setup(page){
 return page.evaluate(()=>{
  window.openModal=(title,body,action)=>{
   document.querySelector('#modalContent').innerHTML='<h2>'+title+'</h2>'+body;
   document.querySelector('#modal').classList.add('show');
   window.modalSave=action;
  };
  window.closeModal=()=>document.querySelector('#modal').classList.remove('show');
  window.alert=()=>{};
 });
}
test('bot report opens with a dedicated visible download in '+kind,async()=>{
 const browser=await engine.launch({headless:true});
 try{
  const context=await browser.newContext({acceptDownloads:true});
  const page=await context.newPage();
  await page.goto('about:blank');
  await page.setContent('<!doctype html><html><head></head><body>'+
   '<nav id="nav"><button id="hlgbDiagnosticsNav">Central de erros</button></nav>'+
   '<main><section id="hlgbDiagnosticsCenter"><div class="hlgb-dg-tabs"></div></section></main>'+
   '<div id="modal"><div id="modalContent"></div></div></body></html>');
  await setup(page);
  await page.evaluate(()=>{
   window.fetch=async(url,init)=>{
    if(String(url).includes('/branches/main'))return {ok:true,json:async()=>({commit:{sha:'a'.repeat(40)}})};
    if(String(url).includes('/actions/runs?'))return {ok:true,json:async()=>({workflow_runs:[
     {name:'HLGB Hourly Health Monitor v95.38',head_branch:'main',id:25,
      head_sha:'a'.repeat(40),status:'completed',conclusion:'success',created_at:'2026-11-11T22:00:00Z'},
     {name:'HLGB Audit Regression',head_branch:'main',id:26,
      head_sha:'a'.repeat(40),status:'completed',conclusion:'failure',created_at:'2026-11-11T22:01:00Z'}
    ]})};
    throw Error('Unexpected URL '+url);
   };
  });
  await page.addScriptTag({path:'release-health-monitor-panel-v9541.js'});
  await page.evaluate(()=>window.hlgbHourlyHealthPanel9541.openStandalone());
  await page.waitForFunction(()=>window.hlgbHourlyHealthPanel9541.status().latest!==null);
  assert.equal(await page.locator('#hlgbHourlyHealthPanel9541').count(),1);
  assert.equal(await page.locator('#hlgbHealthDownload9541').isDisabled(),false);
  assert.equal(await page.locator('#hlgbHealthDownloadTop9544').count(),1);
  assert.equal(await page.locator('#hlgbHealthRawLink9541').count(),0);
  assert.match(await page.locator('#hlgbHealthSummary9541').innerText(),/HLGB Audit Regression/);
  const event=page.waitForEvent('download');
  await page.click('#hlgbHealthDownload9541');
  const download=await event;
  assert.match(download.suggestedFilename(),/HLGB-MONITOR-SAUDE.*\.json/);
  assert.equal(await page.evaluate(()=>window.hlgbHourlyHealthPanel9541.report().ci.failed),1);
  // Reopening the standalone monitor should rebuild its DOM once.
  await page.evaluate(()=>window.hlgbHourlyHealthPanel9541.openStandalone());
  assert.equal(await page.locator('#hlgbHourlyHealthPanel9541').count(),1);
  await context.close();
 }finally{await browser.close()}
});
test('when GitHub blocks the request, the report button remains usable in '+kind,async()=>{
 const browser=await engine.launch({headless:true});
 try{
  const context=await browser.newContext({acceptDownloads:true});
  const page=await context.newPage();
  await page.goto('about:blank');
  await page.setContent('<!doctype html><html><head></head><body>'+
   '<div id="modal"><div id="modalContent"></div></div></body></html>');
  await setup(page);
  await page.evaluate(()=>window.fetch=async()=>{throw Error('Sem acesso GitHub')});
  await page.addScriptTag({path:'release-health-monitor-panel-v9541.js'});
  await page.evaluate(()=>window.hlgbHourlyHealthPanel9541.openStandalone());
  await page.waitForFunction(()=>window.hlgbHourlyHealthPanel9541.status().error!=='' );
  assert.equal(await page.locator('#hlgbHealthDownload9541').isDisabled(),false);
  assert.match(await page.locator('#hlgbHealthSummary9541').innerText(),/Sem acesso GitHub/);
  const ev=page.waitForEvent('download');
  await page.click('#hlgbHealthDownload9541');
  assert.match((await ev).suggestedFilename(),/HLGB-MONITOR-SAUDE.*\.json/);
  await context.close();
 }finally{await browser.close()}
});
