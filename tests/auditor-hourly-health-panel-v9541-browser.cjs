'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {chromium,webkit}=require('playwright');
const browserName=process.env.HLGB_BROWSER||'chromium';
const browserType=browserName==='webkit'?webkit:chromium;
const SHA='a'.repeat(40),OLD='b'.repeat(40);
test('Auditor UI '+browserName+': hourly status, failure links, download and refresh',async()=>{
 const browser=await browserType.launch({headless:true});
 try{
  const page=await browser.newPage();
  await page.goto('about:blank');
  await page.setContent('<!doctype html><html><head></head><body>'+
   '<div id="modal"><div id="modalContent"><div class="hlgb-auditor-actions"></div>'+
   '<div id="hlgbAuditorResult"></div></div></div></body></html>');
  await page.evaluate(({SHA,OLD})=>{
   window.healthTestCalls=[];
   window.fetch=async(url,init)=>{
    window.healthTestCalls.push({url,method:init.method,credentials:init.credentials});
    let data={};
    if(String(url).includes('/branches/main'))data={commit:{sha:SHA}};
    else if(String(url).includes('/actions/runs?'))data={workflow_runs:[
     {id:55,name:'HLGB Hourly Health Monitor v95.38',head_branch:'main',
      head_sha:OLD,status:'completed',conclusion:'success',created_at:'2026-11-11T11:20:00Z'},
     {id:56,name:'HLGB Audit Regression',head_branch:'main',head_sha:SHA,
      status:'completed',conclusion:'failure',created_at:'2026-11-11T13:22:00Z'},
     {id:57,name:'pages build and deployment',head_branch:'main',head_sha:SHA,
      status:'completed',conclusion:'success',created_at:'2026-11-11T13:23:00Z'}
    ]};
    else throw Error('unknown API '+url);
    return {ok:true,status:200,json:async()=>data};
   };
  },{SHA,OLD});
  await page.addScriptTag({path:'release-health-monitor-panel-v9541.js'});
  await page.evaluate(()=>window.hlgbHourlyHealthPanel9541.onOpen());
  await page.waitForFunction(()=>window.hlgbHourlyHealthPanel9541.status().latest!=null);
  assert.equal(await page.locator('#hlgbHourlyHealthPanel9541').count(),1);
  assert.match(await page.locator('#hlgbHealthSummary9541').innerText(),/HLGB Audit Regression/);
  assert.match(await page.locator('#hlgbHealthSummary9541').innerText(),/Sem prova em duas sessões reais/);
  assert.match(await page.locator('#hlgbHealthSummary9541').innerText(),/commit anterior/);
  assert.equal(await page.locator('#hlgbHealthDownload9541').isDisabled(),false);
  const j=await page.evaluate(()=>window.hlgbHourlyHealthPanel9541.report());
  assert.equal(j.ci.failed,1);
  assert.equal(j.publication.current,true);
  await page.evaluate(()=>window.hlgbHourlyHealthPanel9541.onOpen());
  assert.equal(await page.locator('#hlgbHourlyHealthPanel9541').count(),1,'must not duplicate panel');
  assert.equal(await page.evaluate(()=>window.healthTestCalls.length),2,'cached render must not refetch');
  await page.click('#hlgbHealthRefresh9541');
  await page.waitForFunction(()=>window.healthTestCalls.length===4);
  assert.ok((await page.evaluate(()=>window.healthTestCalls)).every(x=>x.method==='GET'&&x.credentials==='omit'));
  assert.equal(await page.locator('#hlgbHealthRawLink9541').count(),0,'monitor must not redirect user to GitHub');
  assert.equal(await page.locator('#hlgbHealthDownloadTxt9544').count(),1);
  assert.equal(await page.locator('#hlgbHealthDownload9541').isDisabled(),false);
 }finally{await browser.close()}
});
