'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),{chromium,webkit}=require('playwright');
const engine=process.env.HLGB_BROWSER==='webkit'?webkit:chromium;
const diag=fs.readFileSync('diagnostico-rede-safari.html','utf8');
const prodHtml=fs.readFileSync('app9240.html','utf8');
// Contract against the REAL published HTML, not just the Playwright mocked fixture.
// Do not print the real publishable key or project URL to CI logs.
assert.ok(/HLGB_SUPABASE_URL\s*=\s*["']https:\/\/[a-z0-9.-]+\.supabase\.co["']/i.test(prodHtml),'Diagnostic URL extractor must match real application');
assert.ok(/HLGB_SUPABASE_KEY\s*=\s*["']sb_publishable_[A-Za-z0-9_-]+["']/.test(prodHtml),'Diagnostic public key extractor must match real application');
assert.ok(/id=["']loginScreen["']/.test(prodHtml),'Diagnostic login marker must match real application');
(async()=>{
 const browser=await engine.launch({headless:true});
 try{
  const context=await browser.newContext({serviceWorkers:'block'});
  const page=await context.newPage();
  const pageErrors=[],requests=[];
  page.on('pageerror',err=>pageErrors.push(err.message));
  page.on('request',req=>requests.push({url:req.url(),method:req.method()}));
  await page.addInitScript(()=>sessionStorage.setItem('hlgb_boot_failure_v9478',JSON.stringify({at:'2026-11-21T17:00:00.000Z',reason:'falha essencial token=PRIVATE_SECRET_MARKER',failedFiles:['release-current.js','PRIVATE_SECRET_MARKER'],attempts:[{category:'login',message:'password=PRIVATE_SECRET_MARKER'}]})));
  await page.route('**/*',route=>{
   const url=new URL(route.request().url());
   if(url.hostname==='hlgb.test'){
    if(url.pathname.endsWith('/diagnostico-rede-safari.html'))return route.fulfill({status:200,contentType:'text/html',body:diag});
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
  await page.goto('http://hlgb.test/diagnostico-rede-safari.html');
  await page.waitForFunction(()=>document.getElementById('raw').textContent.includes('"authService"'),undefined,{timeout:30000});
  const report=await page.evaluate(()=>JSON.parse(document.getElementById('raw').textContent));
  assert.equal(report.name,'HLGB boot diagnostic');
  assert.equal(report.results.length,5);
  assert.equal(report.authService.file,'Supabase Auth (saúde, sem senha)');
  assert.equal(report.authService.ok,true);
  assert.equal(report.previousBoot.reasonCategory,'essential-files');
  assert.deepEqual(report.previousBoot.failedFiles,['release-current.js']);
  assert.equal(report.previousBoot.attemptCount,1);
  assert.deepEqual(pageErrors,[]);
  assert.ok(requests.length>=7);
  assert.ok(requests.every(r=>['GET','OPTIONS'].includes(r.method)),'diagnostic must never POST/PATCH/DELETE; CORS preflight OPTIONS is allowed');
  assert.ok(requests.every(r=>!r.url.includes('/rest/v1/')),'diagnostic must never query business records');
  assert.doesNotMatch(JSON.stringify(report),/sb_publishable_test|access_token|refresh_token|password|PRIVATE_SECRET_MARKER/);
  await page.route('**/auth/v1/health*',route=>route.fulfill({status:route.request().method()==='OPTIONS'?204:503,
   headers:{'access-control-allow-origin':'*','access-control-allow-headers':'apikey, content-type','access-control-allow-methods':'GET,OPTIONS'},body:''}));
  await page.locator('#rerun').click();
  await page.waitForFunction(()=>{try{return JSON.parse(document.querySelector('#raw').textContent).authService.status===503}catch(e){return false}},undefined,{timeout:30000});
  const failedReport=JSON.parse(await page.locator('#raw').textContent());
  assert.equal(failedReport.authService.ok,false);
  assert.equal(failedReport.results.filter(x=>x.ok).length,5,'auth outage must not erase successful static checks');
  assert.deepEqual(pageErrors,[]);
  console.log('PASS '+engine.name()+' read-only Auth connectivity and boot diagnostic without exposing keys');
  await context.close();
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
