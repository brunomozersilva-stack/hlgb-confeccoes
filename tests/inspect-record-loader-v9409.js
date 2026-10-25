const {webkit}=require('playwright');
(async()=>{
  const browser=await webkit.launch({headless:true});
  const page=await browser.newPage();
  await page.goto('http://127.0.0.1:4173/app-stable3.html',{waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForFunction(()=>{
    try{return typeof eval('hlgbRecordLoadBundle')==='function'&&typeof eval('hlgbLoadNormalizedCore')==='function'}catch(e){return false}
  },null,{timeout:60000});
  const info=await page.evaluate(()=>{
    const get=n=>{try{const v=(0,eval)(n);return typeof v==='function'?String(v):String(v)}catch(e){try{const v=window[n];return typeof v==='function'?String(v):String(v)}catch(_){return 'ERR:'+e.message}}};
    const snaps=(()=>{try{return Object.keys((0,eval)('hlgbRecordSnapshots')||{})}catch(e){return []}})();
    return {loadBundle:get('hlgbRecordLoadBundle'),loadCore:get('hlgbLoadNormalizedCore'),rpcSave:get('hlgbRecordRpcSave'),renderIncoming:get('hlgbRenderIncomingRecord'),snapshotKeys:snaps};
  });
  console.log('HLGB_RECORD_LOADER_INSPECT_V9409='+JSON.stringify(info));
  await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
