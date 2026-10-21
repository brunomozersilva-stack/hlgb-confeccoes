const {webkit}=require('playwright');
(async()=>{
 const browser=await webkit.launch({headless:true});
 const page=await browser.newPage();
 const errors=[];page.on('pageerror',e=>errors.push(String(e.message||e)));
 await page.goto('http://127.0.0.1:4173/tests/fixture-production-v9371.html',{waitUntil:'domcontentloaded',timeout:30000});
 await page.waitForFunction(()=>window.hlgbAuditorProduction9369?.active===true,null,{timeout:30000});
 const out=await page.evaluate(()=>({
   production:window.hlgbAuditorProduction9369,
   smartVersion:window.hlgbAuditorSmart?.version,
   safari:window.hlgbAuditorSmart?.safariDownload?.authority,
   events:typeof window.hlgbAuditorSmart?.eventsSnapshot,
   runtime:window.hlgbRuntimePerformance9371?.version,
   renderSignal:window.hlgbAuditorSmart?.renderSignal9372?.version,
   classifier9372:!!window.hlgbAuditorSmart?.classifyProblem?.__hlgb9372,
   classifier9371InChain:!!window.hlgbAuditorSmart?.classifyProblem?.__original?.__hlgb9371
 }));
 /* O Auditor de produção evoluiu para v93.73 (diagnóstico profundo), mas o
    sinal/classificador de render continua v93.72 e precisa permanecer ativo. */
 if(out.production?.version!=='93.73'||out.production?.renderSignal!==true)throw new Error('produção errada '+JSON.stringify(out));
 for(const [k,v] of Object.entries(out.production?.safety||{}))if(v!==true)throw new Error('safety falhou '+k);
 if(out.smartVersion!=='93.63'||out.safari!=='single-manual-download'||out.events!=='function'||out.runtime!=='93.71'||out.renderSignal!=='93.72'||!out.classifier9372||!out.classifier9371InChain)throw new Error('módulos incompletos '+JSON.stringify(out));
 if(errors.length)throw new Error('pageerror '+errors.join(' | '));
 await browser.close();console.log('production v93.73 + render signal v93.72 webkit ok',out);
})().catch(e=>{console.error(e);process.exit(1)});