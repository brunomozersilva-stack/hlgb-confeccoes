'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),{chromium,webkit}=require('playwright');
const engine=process.env.HLGB_BROWSER==='webkit'?webkit:chromium;
const diag=fs.readFileSync('diagnostico-abertura.html','utf8');
(async()=>{
 const browser=await engine.launch({headless:true});
 try{
  const context=await browser.newContext({serviceWorkers:'block'});
  const page=await context.newPage();
  page.on('pageerror',err=>{throw err});
  await page.route('**/*',route=>{
   const url=new URL(route.request().url());
   if(url.hostname==='hlgb.test'){
    if(url.pathname.endsWith('/diagnostico-abertura.html'))return route.fulfill({status:200,contentType:'text/html',body:diag});
    const files={'abrir.html':'app-stable3.html','app-stable3.html':'app9240.html',
      'app9240.html':'id="loginScreen" const HLGB_SUPABASE_URL="https://test-project.supabase.co"; const HLGB_SUPABASE_KEY="sb_publishable_test";',
      'release-login-confirm-gate-v9407.js':'hlgbLoginConfirmGate9407',
      'release-sync-recovery-v9301.js':'hlgbSyncRecovery9301'};
    const k=url.pathname.split('/').pop();
    return route.fulfill({status:200,contentType:'text/plain',body:files[k]||'not found'});
   }
   if(url.hostname==='test-project.supabase.co'&&url.pathname==='/auth/v1/health')
    return route.fulfill({status:200,headers:{'access-control-allow-origin':'*','access-control-allow-headers':'apikey, content-type','access-control-allow-methods':'GET,OPTIONS'},contentType:'application/json',body:'{"healthy":true}'});
   return route.abort('blockedbyclient');
  });
  await page.goto('http://hlgb.test/diagnostico-abertura.html');
  await page.waitForFunction(()=>document.getElementById('raw').textContent.includes('authentication diagnostic'),undefined,{timeout:30000});
  const report=await page.evaluate(()=>JSON.parse(document.getElementById('raw').textContent));
  assert.equal(report.results.length,6);
  assert.equal(report.results.at(-1).file,'Supabase Auth (saúde, sem senha)');
  assert.equal(report.results.at(-1).ok,true);
  assert.doesNotMatch(JSON.stringify(report),/sb_publishable_test|access_token|refresh_token|password/);
  console.log('PASS '+engine.name()+' read-only Auth connectivity and boot diagnostic without exposing keys');
  await context.close();
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
