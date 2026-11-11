'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs');
const {chromium,webkit}=require('playwright');
const kind=process.env.HLGB_BROWSER||'chromium';
const engine=kind==='webkit'?webkit:chromium;
const html=fs.readFileSync('app9240.html','utf8');
const realStyles=(html.match(/<style(?:\s[^>]*)?>[\s\S]*?<\/style>/gi)||[]).join('\n');
const head='a'.repeat(40);
async function boot(page,offline){
 await page.goto('about:blank');
 await page.setContent('<!doctype html><html lang="pt-BR"><head>'+realStyles+'</head><body>'+
  '<div id="modal" class="modal"><div class="modalbox"><div id="modalContent"></div></div></div></body></html>');
 await page.evaluate(({offline,head})=>{
  window.openModal=(title,body,fn)=>{
   document.querySelector('#modalContent').innerHTML='<h2>'+title+'</h2>'+body;
   document.querySelector('#modal').classList.add('show');
   window.modalSave=fn;
  };
  window.closeModal=()=>document.querySelector('#modal').classList.remove('show');
  window.fetch=async url=>{
   if(offline)throw Error('GitHub indisponível');
   if(String(url).includes('/branches/main'))
    return {ok:true,json:async()=>({commit:{sha:head}})};
   if(String(url).includes('/actions/runs?'))
    return {ok:true,json:async()=>({workflow_runs:[
     {id:21,head_branch:'main',name:'HLGB Hourly Health Monitor v95.38',
      head_sha:head,status:'completed',conclusion:'success',created_at:'2026-11-11T22:00:00Z'},
     {id:22,head_branch:'main',name:'HLGB Audit Regression',
      head_sha:head,status:'completed',conclusion:'failure',created_at:'2026-11-11T22:01:00Z'},
     {id:23,head_branch:'main',name:'pages build and deployment',
      head_sha:head,status:'completed',conclusion:'success',created_at:'2026-11-11T22:02:00Z'}
    ]})};
   throw Error('Unexpected network '+url);
  };
 },{offline,head});
 await page.addScriptTag({path:'release-health-monitor-panel-v9541.js'});
 // Reproduce reported state: ordinary auditor buttons are completely hidden
 // by conflicting styling. The download link must NOT depend on those controls.
 await page.addStyleTag({content:'.hlgb-auditor-actions{display:none!important}'});
 await page.evaluate(()=>window.hlgbHourlyHealthPanel9541.openStandalone());
 await page.waitForFunction(()=>{const s=window.hlgbHourlyHealthPanel9541.status();return !!s.latest||!!s.error;});
}
test(kind+': visible native download remains accessible when button groups are hidden',async()=>{
 const browser=await engine.launch({headless:true});
 try{
  const context=await browser.newContext({acceptDownloads:true});
  const page=await context.newPage();
  await boot(page,false);
  const link=page.locator('#hlgbHealthPinnedJson9545');
  assert.equal(await link.count(),1);
  assert.equal(await link.isVisible(),true,'anchor must be visible without buttons');
  const style=await link.evaluate(el=>({display:getComputedStyle(el).display,
   visibility:getComputedStyle(el).visibility,opacity:getComputedStyle(el).opacity,
   rect:el.getBoundingClientRect().toJSON()}));
  assert.notEqual(style.display,'none');
  assert.equal(style.visibility,'visible');
  assert.ok(style.rect.height>=20,'actual clickable area');
  assert.ok((await page.locator('#modalContent').innerText()).includes('CLIQUE AQUI PARA BAIXAR'));
  const before=page.url();
  const event=page.waitForEvent('download');
  await link.click();
  const download=await event;
  assert.match(download.suggestedFilename(),/^HLGB-MONITOR-SAUDE-.*\.json$/);
  const data=JSON.parse(fs.readFileSync(await download.path(),'utf8'));
  assert.equal(data.kind,'hlgb-hourly-health-dashboard');
  assert.equal(data.ci.failed,1);
  assert.equal(data.publication.current,true);
  assert.equal(page.url(),before,'native download cannot navigate away from HLGB');
  const e2=page.waitForEvent('download');
  await page.locator('#hlgbHealthPinnedTxt9545').click();
  const t=await e2;
  assert.match(t.suggestedFilename(),/\.txt$/);
  assert.match(fs.readFileSync(await t.path(),'utf8'),/HLGB.*MONITOR DE SAÚDE/);
  assert.equal(page.url(),before);
  await context.close();
 }finally{await browser.close()}
});
test(kind+': API failure shows visible download with not_verified result',async()=>{
 const browser=await engine.launch({headless:true});
 try{
  const context=await browser.newContext({acceptDownloads:true});
  const page=await context.newPage();
  await boot(page,true);
  const link=page.locator('#hlgbHealthPinnedJson9545');
  assert.equal(await link.isVisible(),true);
  const event=page.waitForEvent('download');
  await link.click();
  const dl=await event;
  const j=JSON.parse(fs.readFileSync(await dl.path(),'utf8'));
  assert.equal(j.status,'not_verified');
  assert.match(j.error,/GitHub indisponível/);
  assert.equal(page.url(),'about:blank');
  await context.close();
 }finally{await browser.close()}
});
