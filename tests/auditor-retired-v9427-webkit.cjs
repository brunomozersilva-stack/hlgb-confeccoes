'use strict';
const assert=require('node:assert/strict'),{webkit}=require('playwright');
(async()=>{
 const browser=await webkit.launch({headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1280,height:900},serviceWorkers:'block'});
  await page.route('**/*',r=>r.request().url().startsWith('http://127.0.0.1:4173/')?r.continue():r.abort());
  const oldRequests=[];page.on('request',r=>{if(r.url().includes('release-auditor-single-action-v9427.js'))oldRequests.push(r.url())});
  await page.goto('http://127.0.0.1:4173/app-stable3.html',{waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForFunction(()=>!!document.getElementById('appShell')&&window.HLGB_AUDITOR_SINGLE_ACTION_9429==='94.29'&&window.HLGB_AUDITOR_SHELL_AUTHORITY==='93.82',null,{timeout:60000});
  const status=await page.evaluate(()=>({old:!!window.HLGB_AUDITOR_SINGLE_ACTION_9427,oldNode:!!document.getElementById('hlgbAuditorUnifiedRun9427'),current:typeof window.hlgbAuditorSingleAction9429?.run==='function',shell:window.openHlgbAuditor===window.hlgbAuditorShell9382?.open}));
  assert.deepEqual(status,{old:false,oldNode:false,current:true,shell:true});
  assert.deepEqual(oldRequests,[]);
  console.log('PASS retired v94.27 never loads in current canonical app; current runner and shell preserved');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
