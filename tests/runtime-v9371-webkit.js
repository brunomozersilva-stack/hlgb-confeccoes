const { webkit } = require('playwright');
const path = require('path');
(async()=>{
 const browser=await webkit.launch({headless:true});
 const page=await browser.newPage();
 await page.setContent('<!doctype html><html><body><div id="appShell"><div class="page active" id="dashboard"></div><div class="page" id="relatorios"></div><div class="page" id="cortadores"></div></div></body></html>');
 await page.evaluate(()=>{
   window.__cleared=[];
   const nativeClear=window.clearInterval.bind(window);
   window.clearInterval=(id)=>{window.__cleared.push(Number(id));try{return nativeClear(id)}catch(e){}};
   window.hlgbRuntimeProfiler9292={snapshot:()=>({active:[{id:'41',delayMs:4000,callbackPreview:'function refreshAll9252(){stampVersion9252();ensureReports9252();}'},{id:'42',delayMs:5000,callbackPreview:'otherTimer()'}]})};
   window.hlgbInternalAuditor={runtimeErrors:[]};
   window.hlgbAuditorSmart={classifyProblem:()=>({observed:[{code:'patch-confirmation-timeout'}],probableCauses:[{code:'cloud-save-timeout'},{code:'render-loop'}]})};
   window.hlgbImprovements9252={ensureReports9252:()=>{window.__reports=(window.__reports||0)+1},ensureCutterGroups:()=>{window.__cutters=(window.__cutters||0)+1}};
 });
 await page.addScriptTag({path:path.join(process.cwd(),'release-runtime-performance-v9371.js')});
 const out=await page.evaluate(()=>({
   version:window.hlgbRuntimePerformance9371?.version,
   stopped:window.hlgbRuntimePerformance9371?.stoppedIntervals||[],
   cleared:window.__cleared,
   classification:window.hlgbAuditorSmart.classifyProblem({}, {}, {}, {timeline:[{type:'record-save-finished',elapsedMs:2521,applied:true}],errors:[]})
 }));
 if(out.version!=='93.71')throw new Error('v93.71 não ativou');
 if(!out.cleared.includes(41)||out.cleared.includes(42))throw new Error('intervalo alvo não foi isolado corretamente: '+JSON.stringify(out));
 if(out.classification.observed.some(x=>x.code==='patch-confirmation-timeout'))throw new Error('falso PATCH timeout não foi removido');
 if(out.classification.probableCauses.some(x=>x.code==='cloud-save-timeout'))throw new Error('falso cloud timeout não foi removido');
 if(!out.classification.probableCauses.some(x=>x.code==='render-loop'))throw new Error('achado legítimo foi removido');
 const real=await page.evaluate(()=>window.hlgbAuditorSmart.classifyProblem({}, {}, {}, {timeline:[{type:'record-save-error',message:'HLGB_CLOUD_TIMEOUT PATCH demorou demais'}],errors:[]}));
 if(!real.observed.some(x=>x.code==='patch-confirmation-timeout'))throw new Error('timeout real foi filtrado indevidamente');
 await browser.close();
 console.log('runtime v93.71 webkit ok');
})().catch(e=>{console.error(e);process.exit(1)});
