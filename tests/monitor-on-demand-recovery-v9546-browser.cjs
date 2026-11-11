'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs');
const {chromium,webkit}=require('playwright');
const engine=process.env.HLGB_BROWSER==='webkit'?webkit:chromium;
const kind=process.env.HLGB_BROWSER||'chromium';
const auditor=fs.readFileSync('release-internal-auditor.js','utf8');
const moduleSource=fs.readFileSync('release-health-monitor-panel-v9541.js','utf8');
const fullApp=fs.readFileSync('app9240.html','utf8');
const css=(fullApp.match(/<style(?:\s[^>]*)?>[\s\S]*?<\/style>/gi)||[]).join('');
const a=auditor.indexOf('let hlgbMonitorRecoveryPromise9546=null;');
const b=auditor.indexOf('window.openHlgbAuditor=openAuditor;',a);
if(a<0||b<a)throw Error('Cannot locate recovery handler');
const script=auditor.slice(a,b);
const SHA='a'.repeat(40),OLD='b'.repeat(40);
const reportApi={
 branch:{commit:{sha:SHA}},
 actions:{workflow_runs:[
  {id:101,name:'HLGB Hourly Health Monitor v95.38',head_branch:'main',head_sha:OLD,
   status:'completed',conclusion:'success',created_at:'2026-11-11T18:56:00Z'},
  {id:102,name:'HLGB Audit Regression',head_branch:'main',head_sha:SHA,
   status:'completed',conclusion:'failure',created_at:'2026-11-11T19:00:00Z'},
  {id:103,name:'pages build and deployment',head_branch:'main',head_sha:SHA,
   status:'completed',conclusion:'success',created_at:'2026-11-11T19:01:00Z'}
 ]}
};
async function boot(page,mode){
 await page.route('https://hlgb.test/**',async route=>{
  const url=route.request().url();
  if(url.includes('release-health-monitor-panel-v9541.js')){
   if(mode==='script-error'||mode==='fully-offline')return route.abort('failed');
   return route.fulfill({status:200,body:moduleSource,contentType:'application/javascript'});
  }
  if(url.endsWith('app-stable3.html'))return route.fulfill({
   status:200,contentType:'text/html',
   body:'<!doctype html><html><head>'+css+'</head><body>'+
   '<div id="modal" class="modal"><div class="modalbox"><div id="modalContent"></div></div></div>'+
   '</body></html>'
  });
  return route.fulfill({status:404,body:'Not found'});
 });
 await page.goto('https://hlgb.test/app-stable3.html');
 await page.evaluate(()=>{
  window.openModal=(title,body,fn)=>{
   document.querySelector('#modalContent').innerHTML='<h2>'+title+'</h2>'+body;
   document.querySelector('#modal').classList.add('show');
   window.modalSave=fn;
  };
  window.closeModal=()=>{document.querySelector('#modal').classList.remove('show')};
  window.alert=(msg)=>{window.alertHistory=(window.alertHistory||[]).concat(msg)};
 });
 await page.route('https://api.github.com/**',route=>{
  if(mode==='fully-offline')return route.abort('failed');
  const url=route.request().url();
  if(url.includes('/branches/main'))return route.fulfill({status:200,
   headers:{'access-control-allow-origin':'*'},contentType:'application/json',
   body:JSON.stringify(reportApi.branch)});
  if(url.includes('/actions/runs?'))return route.fulfill({status:200,
   headers:{'access-control-allow-origin':'*'},contentType:'application/json',
   body:JSON.stringify(reportApi.actions)});
  return route.fulfill({status:404,body:'Unexpected API request'});
 });
 await page.evaluate(script=>{(0,eval)(script)},script);
}
test(kind+': missing optional module is recovered automatically; direct native JSON download',async()=>{
 const browser=await engine.launch();
 try{
  const ctx=await browser.newContext({acceptDownloads:true});
  const page=await ctx.newPage();await boot(page,'ok');
  assert.equal(await page.evaluate(()=>!!window.hlgbHourlyHealthPanel9541),false);
  await page.evaluate(()=>window.hlgbAuditorOpenBot9543());
  await page.waitForFunction(()=>!!window.hlgbHourlyHealthPanel9541);
  await page.waitForSelector('#hlgbHealthPinnedJson9545');
  assert.equal(await page.locator('#hlgbHealthPinnedJson9545').isVisible(),true);
  const ev=page.waitForEvent('download');
  await page.locator('#hlgbHealthPinnedJson9545').click();
  const d=await ev;
  assert.match(d.suggestedFilename(),/^HLGB-MONITOR-SAUDE-.*\.json$/);
  const data=JSON.parse(fs.readFileSync(await d.path(),'utf8'));
  assert.equal(data.ci.failed,1);
  assert.equal(data.lastHourlyRun.currentCommit,false);
  assert.equal(data.synchronization.provedAcrossRealTwoSessions,false);
  assert.equal(page.url(),'https://hlgb.test/app-stable3.html');
  assert.deepEqual(await page.evaluate(()=>window.alertHistory||[]),[]);
  await ctx.close();
 }finally{await browser.close()}
});
test(kind+': script missing permanently still exports real public GH status without redirect',async()=>{
 const browser=await engine.launch();
 try{
  const ctx=await browser.newContext({acceptDownloads:true});
  const page=await ctx.newPage();await boot(page,'script-error');
  await page.evaluate(()=>window.hlgbAuditorOpenBot9543());
  await page.waitForFunction(()=>document.getElementById('hlgbBotRecoveryStatus9546')?.
    textContent.includes('Resumo gerado'));
  const link=page.locator('#hlgbBotRecoveryDownload9546');
  assert.equal(await link.isVisible(),true);
  const ev=page.waitForEvent('download');await link.click();const d=await ev;
  const data=JSON.parse(fs.readFileSync(await d.path(),'utf8'));
  assert.equal(data.kind,'hlgb-hourly-health-fallback-report');
  assert.equal(data.ci.failed,1);
  assert.equal(data.lastHourlyRun.currentCommit,false);
  assert.equal(data.synchronization.provedAcrossRealTwoSessions,false);
  assert.equal(page.url(),'https://hlgb.test/app-stable3.html');
  assert.deepEqual(await page.evaluate(()=>window.alertHistory||[]),[]);
  await ctx.close();
 }finally{await browser.close()}
});
test(kind+': module and GH API unavailable, link yields not_verified diagnostic',async()=>{
 const browser=await engine.launch();
 try{
  const ctx=await browser.newContext({acceptDownloads:true});
  const page=await ctx.newPage();await boot(page,'fully-offline');
  await page.evaluate(()=>window.hlgbAuditorOpenBot9543());
  await page.waitForFunction(()=>document.getElementById('hlgbBotRecoveryStatus9546')?.
    textContent.includes('GitHub não respondeu'));
  const ev=page.waitForEvent('download');
  await page.locator('#hlgbBotRecoveryDownload9546').click();
  const d=await ev;const data=JSON.parse(fs.readFileSync(await d.path(),'utf8'));
  assert.equal(data.status,'not_verified');
  assert.equal(data.liveCrossBrowserProof,false);
  assert.equal(page.url(),'https://hlgb.test/app-stable3.html');
  await ctx.close();
 }finally{await browser.close()}
});
