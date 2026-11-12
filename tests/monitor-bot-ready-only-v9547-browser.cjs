'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs');
const {chromium,webkit}=require('playwright');
const browser=process.env.HLGB_BROWSER==='webkit'?webkit:chromium;
const type=process.env.HLGB_BROWSER||'chromium';
const app=fs.readFileSync('app9240.html','utf8');
const css=(app.match(/<style(?:\s[^>]*)?>[\s\S]*?<\/style>/gi)||[]).join('');
const sha='a'.repeat(40);
async function prep(page,mode){
 await page.goto('about:blank');
 await page.setContent('<!doctype html><html><head>'+css+'</head><body>'+
  '<div class="modal show" id="modal"><div class="modalbox"><div id="modalContent"></div></div></div>'+
  '</body></html>');
 await page.evaluate(({mode,sha})=>{
  window.openModal=(title,body,save)=>{
   document.getElementById('modalContent').innerHTML='<h2>'+title+'</h2>'+body;
   window.modalSave=save;
  };
  window.closeModal=()=>{};
  window.__requests=[];
  window.fetch=async url=>{
   const result=String(url).includes('/branches/main')?{commit:{sha}}:
    {workflow_runs:[
     {id:501,name:'HLGB Hourly Health Monitor v95.38',head_branch:'main',
      head_sha:sha,status:'completed',conclusion:'success',created_at:'2026-11-11T20:00:00Z'},
     {id:502,name:'HLGB Audit Regression',head_branch:'main',
      head_sha:sha,status:'completed',conclusion:'failure',created_at:'2026-11-11T20:01:00Z'},
     {id:503,name:'pages build and deployment',head_branch:'main',
      head_sha:sha,status:'completed',conclusion:'success',created_at:'2026-11-11T20:02:00Z'}
    ]};
   if(mode==='offline')throw Error('Sem conexão com GitHub Actions');
   if(mode==='slow')return new Promise(resolve=>{
    window.__requests.push(()=>resolve({ok:true,json:async()=>result}));
   });
   return {ok:true,json:async()=>result};
  };
 },{mode,sha});
 await page.addScriptTag({path:'release-health-monitor-panel-v9541.js'});
 await page.evaluate(()=>window.hlgbHourlyHealthPanel9541.openStandalone());
}
test(type+': a slow GitHub query cannot produce an incomplete JSON',async()=>{
 const engine=await browser.launch({headless:true});
 try{
  const context=await engine.newContext({acceptDownloads:true});
  const page=await context.newPage();
  await prep(page,'slow');
  await page.waitForFunction(()=>window.__requests.length===2);
  const link=page.locator('#hlgbHealthPinnedJson9545');
  assert.equal(await link.isVisible(),true);
  assert.equal(await link.getAttribute('href'),null);
  assert.equal(await link.getAttribute('download'),null);
  assert.equal(await link.getAttribute('aria-disabled'),'true');
  assert.equal(await page.locator('#hlgbHealthDownloadTop9544').isDisabled(),true);
  assert.equal(await page.locator('#hlgbHealthDownload9541').isDisabled(),true);
  assert.equal(await page.evaluate(()=>window.hlgbHourlyHealthPanel9541.report()),null);
  assert.match(await page.locator('#hlgbHealthPinnedStatus9547').innerText(),/Consultando/);
  await page.evaluate(()=>{window.__requests.forEach(resolve=>resolve());window.__requests.length=0});
  await page.waitForFunction(()=>window.hlgbHourlyHealthPanel9541.report()!==null);
  await page.waitForFunction(()=>!!document.querySelector('#hlgbHealthPinnedJson9545')?.getAttribute('href'));
  assert.equal(await link.getAttribute('aria-disabled'),null);
  assert.equal(await link.isVisible(),true);
  const e=page.waitForEvent('download');
  await link.click();
  const d=await e;
  assert.match(d.suggestedFilename(),/HLGB-MONITOR-SAUDE-.*\.json/);
  const contents=JSON.parse(fs.readFileSync(await d.path(),'utf8'));
  assert.equal(contents.kind,'hlgb-hourly-health-dashboard');
  assert.equal(contents.version,'95.47');
  assert.equal(contents.ci.failed,1);
  assert.equal(contents.publication.current,true);
  assert.equal(contents.synchronization.provedAcrossRealTwoSessions,false);
  assert.equal(page.url(),'about:blank');
  await context.close();
 }finally{await engine.close()}
});
test(type+': actual GitHub failure allows a clearly labelled error diagnostic',async()=>{
 const engine=await browser.launch({headless:true});
 try{
  const context=await engine.newContext({acceptDownloads:true});
  const page=await context.newPage();
  await prep(page,'offline');
  await page.waitForFunction(()=>!!window.hlgbHourlyHealthPanel9541.status().error);
  await page.waitForFunction(()=>!!document.querySelector('#hlgbHealthPinnedJson9545')?.getAttribute('href'));
  const link=page.locator('#hlgbHealthPinnedJson9545');
  assert.match(await link.innerText(),/DIAGNÓSTICO DA FALHA/);
  assert.match(await page.locator('#hlgbHealthPinnedStatus9547').innerText(),/Sem conexão/);
  const e=page.waitForEvent('download');
  await link.click();
  const d=await e;
  const contents=JSON.parse(fs.readFileSync(await d.path(),'utf8'));
  assert.equal(contents.kind,'hlgb-hourly-health-access-diagnostic');
  assert.equal(contents.status,'not_verified');
  assert.match(contents.error,/Sem conexão/);
  assert.equal(page.url(),'about:blank');
  await context.close();
 }finally{await engine.close()}
});
