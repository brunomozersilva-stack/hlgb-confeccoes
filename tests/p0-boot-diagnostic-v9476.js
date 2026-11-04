'use strict';
const assert=require('node:assert/strict');
const {webkit,chromium}=require('playwright');
const engine=process.env.HLGB_BROWSER==='chromium'?chromium:webkit;
(async()=>{
 const browser=await engine.launch({headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1100,height:800}});
  const errors=[];page.on('pageerror',e=>errors.push(String(e.message||e)));
  await page.goto('http://127.0.0.1:4173/diagnostico-abertura.html',{waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForFunction(()=>!document.getElementById('copy').disabled,null,{timeout:60000});
  const report=JSON.parse(await page.locator('#raw').innerText());
  assert.equal(report.name,'HLGB boot diagnostic');
  assert.equal(report.results.length,5);
  assert(report.results.every(x=>x.ok),'all essential static files should load: '+JSON.stringify(report.results));
  assert(!report.results.some(x=>x.file.includes('supabase')),'diagnostic must not read private cloud data');
  assert(await page.getByRole('link',{name:/Tentar abrir o HLGB/i}).count()===1);
  assert.equal(errors.length,0,'diagnostic must have zero page errors: '+JSON.stringify(errors));
  console.log('P0_SAFE_BOOT_DIAGNOSTIC_OK '+JSON.stringify({browser:process.env.HLGB_BROWSER||'webkit',files:report.results.map(x=>({file:x.file,status:x.status,ms:x.ms})),serviceWorker:report.serviceWorker}));
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
