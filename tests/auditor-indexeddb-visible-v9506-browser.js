'use strict';
const {chromium,webkit}=require('playwright');
const browserType=process.env.HLGB_BROWSER==='webkit'?webkit:chromium;
(async()=>{
 const browser=await browserType.launch({headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1280,height:900}});
  await page.goto('http://127.0.0.1:4173/app-stable3.html',{waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForFunction(()=>!!window.hlgbInternalAuditor?.run,null,{timeout:60000});
  const result=await page.evaluate(async()=>{
   await new Promise((resolve,reject)=>{
    const req=indexedDB.open('hlgb_durable_wal',1);
    req.onupgradeneeded=()=>{
     const db=req.result;
     if(!db.objectStoreNames.contains('entries'))db.createObjectStore('entries',{keyPath:'key'});
    };
    req.onerror=()=>reject(req.error);
    req.onsuccess=()=>{
     const db=req.result,tx=db.transaction('entries','readwrite'),store=tx.objectStore('entries');
     for(let i=0;i<7;i++)store.put({key:'wal-auditor-test|'+i,module:'auditorWalTest',id:String(i),opId:'test-only-'+i,data:{sample:true}});
     tx.oncomplete=()=>{db.close();resolve()};
     tx.onerror=()=>{db.close();reject(tx.error)};
    };
   });
   const row=await window.hlgbInternalAuditor.run('full',false);
   const flag=row.checks.find(x=>x.code==='sync:indexeddb-wal');
   const normalized=row.checks.find(x=>x.code==='sync:pending');
   const after=await new Promise((resolve,reject)=>{
    const req=indexedDB.open('hlgb_durable_wal');
    req.onsuccess=()=>{
     const db=req.result,tx=db.transaction('entries','readonly'),q=tx.objectStore('entries').getAllKeys();
     q.onsuccess=()=>{db.close();resolve(q.result.length)};
     q.onerror=()=>{db.close();reject(q.error)};
    };
    req.onerror=()=>reject(req.error);
   });
   return {flag,normalized,after,summary:row.summary,evidence:row.walEvidence};
  });
  if(result.flag?.status!=='warn'||result.evidence?.count!==7||result.after!==7)
   throw Error('IndexedDB WAL must warn and must not remove user data: '+JSON.stringify(result));
  if(!result.normalized?.detail?.includes('não verifica o WAL durável'))
   throw Error('Normalized queue must not claim all pending data is empty: '+JSON.stringify(result.normalized));
  if(result.summary?.warn<1)throw Error('WAL warn missing from total audit summary');
  console.log('PASS WAL audit in '+browserType.name()+': 7 rows preserved, read-only warning shown in main audit');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
