const {webkit}=require('playwright');
(async()=>{
 const browser=await webkit.launch({headless:true});
 const page=await browser.newPage();
 await page.setContent('<div id="hlgbAuditorResult"></div>');
 await page.evaluate(()=>{
  window.hlgbInternalAuditor={redactDiagnostic:x=>x};
  window.hlgbAuditorSmart={problem:async()=>({kind:'hlgb_bug_capture',ok:true})};
  window.hlgbAuditorSmartProblem=window.hlgbAuditorSmart.problem;
  window.setInterval=((orig)=>function(fn,ms){const id=orig(fn,Math.min(ms,5));return id})(window.setInterval);
 });
 const src=require('fs').readFileSync('release-auditor-safari-download-v9367.js','utf8');
 await page.evaluate(src=>{(0,eval)(src)},src);
 await page.waitForFunction(()=>window.hlgbAuditorSmart?.safariDownload?.version==='93.67',null,{timeout:5000});
 await page.evaluate(()=>window.hlgbAuditorSmartProblem());
 await page.waitForSelector('#hlgbSafariDownload9367',{state:'visible',timeout:5000});
 const info=await page.$eval('#hlgbSafariDownload9367',a=>({text:a.textContent,href:a.href,download:a.download}));
 if(!/Baixar diagnóstico/.test(info.text))throw new Error('Texto do fallback ausente');
 if(!/^blob:/.test(info.href))throw new Error('Link não usa Blob URL: '+info.href);
 if(!/^HLGB-PROBLEMA-/.test(info.download))throw new Error('Nome de arquivo incorreto: '+info.download);
 console.log('AUDITOR_V9367_SAFARI_DOWNLOAD_WEBKIT_OK',info.download);
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
