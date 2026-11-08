'use strict';
const {webkit,chromium}=require('playwright');
const engine=process.env.HLGB_BROWSER==='webkit'?webkit:chromium;
(async()=>{
 const browser=await engine.launch({headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1280,height:900}});
  await page.goto('http://127.0.0.1:4173/app-stable3.html',{waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForFunction(()=>typeof window.hlgbAuditorAutoCorrect9441?.historyPersistence9508?.save==='function',null,{timeout:60000});
  const proof=await page.evaluate(async()=>{
    const api=window.hlgbAuditorAutoCorrect9441.historyPersistence9508;
    const historyKey='hlgb_auditor_autocorrect_history_v9441';
    const original=Storage.prototype.setItem;
    const runId='isolated-audit-test-'+Date.now();
    Storage.prototype.setItem=function(key,value){
      if(key===historyKey)throw new DOMException('Quota exceeded','QuotaExceededError');
      return original.call(this,key,value);
    };
    let saved,status;
    try{
      saved=await api.save({runId,at:new Date().toISOString(),version:'95.08',passes:1,
       stopReason:'isolated test',fixed:0,stillFailing:[],unverified:[],blocked:[],corrected:[]});
      status=api.status();
    }finally{Storage.prototype.setItem=original}
    const db=await new Promise((resolve,reject)=>{
      const req=indexedDB.open('hlgb_auditor_history_v9508');
      req.onsuccess=()=>resolve(req.result);
      req.onerror=()=>reject(req.error);
    });
    let row;
    try{
      row=await new Promise((resolve,reject)=>{
        const tx=db.transaction('runs','readonly'),get=tx.objectStore('runs').get(runId);
        get.onsuccess=()=>resolve(get.result);
        get.onerror=()=>reject(get.error);
      });
    }finally{db.close()}
    const normal=await api.save({runId:'normal-audit-'+Date.now(),at:new Date().toISOString(),version:'95.08'});
    const normalStatus=api.status();
    return {saved,status,foundId:row?.runId,foundSource:row?.source,normal,normalStatus};
  });
  if(!proof.saved||proof.status.storage!=='auditor-indexeddb'||!proof.foundId||proof.foundSource!=='auditor-compact-history-v95.08')
    throw Error('Fallback independent IndexedDB was not verified: '+JSON.stringify(proof));
  if(!proof.normal||proof.normalStatus.storage!=='localStorage')throw Error('Normal localStorage path invalid: '+JSON.stringify(proof));
  console.log('PASS v95.08 '+engine.name()+': quota fallback saved with IndexedDB readback; ordinary path preserved');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
