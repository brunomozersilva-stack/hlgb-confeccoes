'use strict';
const {chromium,webkit}=require('playwright'),assert=require('node:assert/strict');
const engine=process.env.HLGB_BROWSER==='webkit'?webkit:chromium;
(async()=>{
 const browser=await engine.launch({headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1280,height:900},serviceWorkers:'block'});
  await page.goto('http://127.0.0.1:4173/app9240.html',{waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForURL(/\/app-stable3\.html\?fresh=/,{timeout:30000});
  await page.waitForFunction(()=>!!window.hlgbInternalAuditor?.auditDomStructure&&!!document.querySelector('#printer3dNav9400'),{timeout:60000});
  let checks=await page.evaluate(()=>window.hlgbInternalAuditor.auditDomStructure().filter(x=>x.code.startsWith('page:printer3d')||['nav:printer3d','module:printer3d','guard:printer3d-nav','route:canonical-entry'].includes(x.code)));
  assert.equal(checks.length,8,JSON.stringify(checks));
  assert.ok(checks.every(c=>c.status==='pass'),JSON.stringify(checks));
  await page.evaluate(()=>document.getElementById('printer3dNav9400').remove());
  checks=await page.evaluate(()=>window.hlgbInternalAuditor.auditDomStructure().filter(x=>x.code==='nav:printer3d'));
  assert.equal(checks[0].status,'fail','auditor must report missing 3D menu');
  const repaired=await page.evaluate(()=>window.hlgbBusinessExpansion9400.install());
  assert.equal(repaired,true);
  checks=await page.evaluate(()=>window.hlgbInternalAuditor.auditDomStructure().filter(x=>x.code==='nav:printer3d'));
  assert.equal(checks[0].status,'pass','3D menu should be restorable without touching any records');
  console.log('PASS v95.16 '+engine.name()+': legacy navigation redirected; all 3D pages/menu checked; missing menu reported and restored');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
