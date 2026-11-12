'use strict';
const assert=require('node:assert/strict'),{chromium,webkit}=require('playwright');
const browserType=process.env.HLGB_BROWSER==='webkit'?webkit:chromium;
(async()=>{
 const browser=await browserType.launch({headless:true});
 try{
 const page=await browser.newPage({serviceWorkers:'block'});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:4173/tests/notes-live-sync-v9563-fixture.html',{waitUntil:'domcontentloaded'});
 const result=await page.evaluate(()=>window.hlgbNotesLiveSync9563.refresh('test',true));
 assert.equal(result.ok,true,JSON.stringify(result));
 const after=await page.evaluate(()=>({
  invoiceIds:db.projectionInvoices.map(x=>String(x.id)),
  financeIds:db.finance.map(x=>String(x.id)),
  blocked:db.finance.find(x=>x.id==='blocked')?.value,
  notesText:document.getElementById('orderNotesTable').innerText,
  allText:document.getElementById('allOrderNotesTable').innerText,
  writes:window.__writes,requests:window.__requests,
  status:window.hlgbNotesLiveSync9563.status()
 }));
 assert(after.invoiceIds.includes('1794501067585703'),'remote invoice must reach Safari');
 assert(after.financeIds.includes('1794501067585704'),'corresponding finance record must be fetched');
 assert.equal(after.blocked,999,'WAL-protected local finance cannot be overwritten');
 assert.match(after.notesText,/Quesia/);
 assert.match(after.allText,/Quesia/);
 assert.match(after.notesText,/10.697,40/);
 assert.match(after.notesText,/Body Helena/);
 assert(after.requests.length===3);
 assert(after.requests.every(x=>x.method==='GET'),'read-only note reconciliation');
 assert.equal(after.writes,1,'only local cache persisted');
 assert.equal(result.protected,1);
 await page.evaluate(()=>window.hlgbNotesLiveSync9563.refresh('test-repeat',true));
 const repeated=await page.evaluate(()=>({count:db.projectionInvoices.filter(x=>String(x.id)==='1794501067585703').length,writes:window.__writes}));
 assert.equal(repeated.count,1,'idempotent duplicate handling');
 await page.evaluate(()=>{window.__fail=true});
 const broken=await page.evaluate(()=>window.hlgbNotesLiveSync9563.refresh('network-error',true));
 assert.equal(broken.ok,false,'network errors must not silently claim success');
 assert.equal(await page.evaluate(()=>db.projectionInvoices.some(x=>String(x.id)==='1794501067585703')),true,'network failures retain data');
 assert.deepEqual(errors,[]);
 console.log('PASS '+browserType.name()+': Quesia #1794501067585703 visible in both notes panels; GET-only; WAL safe; idempotent; failure visible');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});