'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {chromium,webkit}=require('playwright');
const kind=process.env.HLGB_BROWSER||'chromium';
const engine=kind==='webkit'?webkit:chromium;

async function pageSetup(page,failed=false){
 await page.goto('about:blank');
 await page.setContent('<!doctype html><html><head></head><body>'+
  '<div id="modal"><div id="modalContent"></div></div></body></html>');
 await page.evaluate(({failed})=>{
  window.openModal=(title,body,done)=>{
   document.getElementById('modalContent').innerHTML='<h2>'+title+'</h2>'+body;
   window.modalSave=done;
  };
  window.closeModal=()=>{};
  window.alert=()=>{};
  window.fetch=async url=>{
   if(failed)throw Error('Rede indisponível na consulta ao monitor');
   if(String(url).includes('/branches/main'))
    return {ok:true,json:async()=>({commit:{sha:'a'.repeat(40)}})};
   if(String(url).includes('/actions/runs?'))
    return {ok:true,json:async()=>({workflow_runs:[
     {id:11,name:'HLGB Hourly Health Monitor v95.38',head_branch:'main',
      head_sha:'a'.repeat(40),status:'completed',conclusion:'success',created_at:'2026-11-11T22:00:00Z'},
     {id:12,name:'HLGB Audit Regression',head_branch:'main',
      head_sha:'a'.repeat(40),status:'completed',conclusion:'failure',created_at:'2026-11-11T22:01:00Z'},
     {id:13,name:'pages build and deployment',head_branch:'main',
      head_sha:'a'.repeat(40),status:'completed',conclusion:'success',created_at:'2026-11-11T22:02:00Z'}
    ]})};
   throw Error('Unexpected API URL '+url);
  };
 },{failed});
 await page.addScriptTag({path:'release-health-monitor-panel-v9541.js'});
 await page.evaluate(()=>window.hlgbHourlyHealthPanel9541.openStandalone());
 await page.waitForFunction(()=>{const s=window.hlgbHourlyHealthPanel9541.status();return !!s.latest||!!s.error;});
}

test(kind+': top JSON and TXT buttons download local files without opening GitHub',async()=>{
 const browser=await engine.launch({headless:true});
 try{
  const ctx=await browser.newContext({acceptDownloads:true});
  const page=await ctx.newPage();
  await pageSetup(page);
  const githubLinks=await page.locator('#hlgbHourlyHealthPanel9541 a[href*="github.com"]').count();
  assert.equal(githubLinks,0,'no navigation links in report UI');
  assert.equal(await page.locator('#hlgbHealthDownloadTop9544').count(),1);
  assert.equal(await page.locator('#hlgbHealthDownload9541').isDisabled(),false);
  const urlBefore=page.url();
  const first=page.waitForEvent('download');
  await page.locator('#hlgbHealthDownloadTop9544').click();
  const downloaded=await first;
  assert.match(downloaded.suggestedFilename(),/^HLGB-MONITOR-SAUDE-.*\.json$/);
  const data=JSON.parse(fs.readFileSync(await downloaded.path(),'utf8'));
  assert.equal(data.kind,'hlgb-hourly-health-dashboard');
  assert.equal(data.ci.failed,1);
  assert.equal(data.publication.current,true);
  assert.equal(data.synchronization.provedAcrossRealTwoSessions,false);
  assert.equal(page.url(),urlBefore,'download must not navigate to GitHub');
  const second=page.waitForEvent('download');
  await page.locator('#hlgbHealthDownloadTxt9544').click();
  const txt=await second;
  assert.match(txt.suggestedFilename(),/^HLGB-MONITOR-SAUDE-.*\.txt$/);
  const contents=fs.readFileSync(await txt.path(),'utf8');
  assert.match(contents,/HLGB.*MONITOR DE SAÚDE/);
  assert.match(contents,/FALHA.*HLGB Audit Regression/);
  assert.equal(page.url(),urlBefore,'TXT download must not navigate');
  await ctx.close();
 }finally{await browser.close()}
});

test(kind+': API failure still downloads a not-verified JSON (not a false PASS)',async()=>{
 const browser=await engine.launch({headless:true});
 try{
  const ctx=await browser.newContext({acceptDownloads:true});
  const page=await ctx.newPage();
  await pageSetup(page,true);
  assert.equal(await page.locator('#hlgbHealthDownloadTop9544').count(),1);
  const dl=page.waitForEvent('download');
  await page.locator('#hlgbHealthDownloadTop9544').click();
  const file=await dl;
  const data=JSON.parse(fs.readFileSync(await file.path(),'utf8'));
  assert.equal(data.status,'not_verified');
  assert.match(data.error,/Rede indisponível/);
  assert.ok(!data.success);
  assert.equal(page.url(),'about:blank');
  await ctx.close();
 }finally{await browser.close()}
});
