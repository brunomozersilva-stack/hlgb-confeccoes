'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {pathToFileURL}=require('node:url'),{chromium,webkit}=require('playwright');
const engine=process.env.HLGB_BROWSER==='webkit'?webkit:chromium;
const url=pathToFileURL(path.resolve(__dirname,'../transacoes-simuladas.html')).href;
const folder=process.env.HLGB_SCREENSHOT_DIR||'/tmp';
async function run(browser,width){
 const page=await browser.newPage({viewport:{width,height:830}});
 const errors=[],remote=[];page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(/^https?:/i.test(r.url()))remote.push(r.url())});
 try{
 await page.goto(url,{waitUntil:'load'});
 assert.equal((await page.locator('#target-status').textContent()).trim(),'Pendente');
 assert.match(await page.locator('#target-total').textContent(),/28,00/);
 assert.match(await page.locator('#credit-remaining').textContent(),/3,00/);
 await page.locator('#compensate').click();
 assert.match(await page.locator('#operation-status').textContent(),/readback_confirmed/);
 assert.match(await page.locator('#target-total').textContent(),/25,00/);
 assert.match(await page.locator('#credit-remaining').textContent(),/0,00/);
 await page.locator('#pay').click();
 assert.equal((await page.locator('#target-status').textContent()).trim(),'Pago');
 assert.equal((await page.locator('#hub-count').textContent()).trim(),'2');
 assert.equal((await page.locator('#receipts-count').textContent()).trim(),'2');
 assert.equal((await page.locator('#events-count').textContent()).trim(),'2');
 assert.equal(await page.locator('#pay').isDisabled(),true);
 await page.locator('#reset').click();
 await page.locator('#failure').selectOption('after_commit_before_ack');
 await page.locator('#compensate').click();
 assert.match(await page.locator('#operation-status').textContent(),/uncertain/);
 assert.equal(await page.locator('#pay').isDisabled(),true);
 assert.equal(await page.locator('#reconcile').isEnabled(),true);
 await page.locator('#reconcile').click();
 assert.match(await page.locator('#operation-status').textContent(),/readback_confirmed/);
 assert.equal(await page.locator('#pay').isEnabled(),true);
 await page.locator('#reset').click();
 await page.locator('#conflict').click();
 assert.match(await page.locator('#operation-status').textContent(),/conflict/);
 assert.equal((await page.locator('#events-count').textContent()).trim(),'0');
 await page.locator('#failure').selectOption('before_commit');
 await page.locator('#compensate').click();
 assert.match(await page.locator('#operation-status').textContent(),/rejected/);
 assert.equal((await page.locator('#events-count').textContent()).trim(),'0');
 const size=await page.evaluate(()=>({window:innerWidth,document:document.documentElement.scrollWidth}));
 assert(size.document<=size.window+2,'horizontal overflow '+width+': '+JSON.stringify(size));
 assert.deepEqual(remote,[],'no remote requests');assert.deepEqual(errors,[],'no JS errors');
 if(width===375){fs.mkdirSync(folder,{recursive:true});await page.screenshot({path:path.join(folder,'transacao-simulada-'+engine.name()+'-375.png'),fullPage:true})}
 console.log('PASS transação '+engine.name()+' '+width+'px: compensação, pagamento, conflito, readback e offline');
 }finally{await page.close()}
}
(async()=>{const browser=await engine.launch({headless:true});try{for(const w of [320,375,390,768,1280])await run(browser,w)}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
