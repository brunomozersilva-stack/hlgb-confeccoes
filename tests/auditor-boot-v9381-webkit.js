const {webkit}=require('playwright');
(async()=>{
 const browser=await webkit.launch({headless:true});
 const page=await browser.newPage({viewport:{width:1280,height:900}});
 const errors=[];page.on('pageerror',e=>errors.push(String(e.message||e)));
 await page.goto('http://127.0.0.1:4173/app-stable3.html',{waitUntil:'domcontentloaded',timeout:60000});
 await page.waitForFunction(()=>!!document.getElementById('loginScreen')&&!!document.getElementById('appShell')&&window.HLGB_AUDITOR_BOOT_TIMELINE_9379==='93.79'&&window.HLGB_AUDITOR_CALL_TRACE_9380==='93.80'&&window.HLGB_AUDITOR_BOOT_ANALYSIS_9381==='93.81',null,{timeout:60000});
 await page.evaluate(()=>{window.__HLGB_AUTH_READY=true;window.dispatchEvent(new Event('hlgb:authenticated'))});
 await page.waitForFunction(()=>!!window.hlgbInternalAuditor&&!!window.hlgbAuditorProduction9369?.active&&!!document.getElementById('hlgbAuditorNavBtn'),null,{timeout:60000});
 const refs=await page.evaluate(()=>{window.__boot9381Refs={save:window.hlgbRecordSaveWithRetry,cloud:window.cloudRequest};return {timeline:window.hlgbBootTimeline9379.snapshot(),trace:window.hlgbAuditorCallTrace9380.snapshot(),analysis:window.hlgbAuditorBootAnalysis9381.analyze()}});
 if(refs.timeline?.version!=='93.79'||refs.trace?.version!=='93.80'||refs.analysis?.version!=='93.81')throw new Error('instrumentação incompleta '+JSON.stringify(refs));
 if(!refs.timeline?.coverage||refs.timeline.coverage.preInstrumentationMeasured!==false)throw new Error('cobertura inicial não foi declarada conservadoramente');
 await page.click('#hlgbAuditorNavBtn');
 await page.waitForSelector('#hlgbBootAnalysisBtn9381',{state:'visible',timeout:10000});
 await page.click('#hlgbBootAnalysisBtn9381');
 await page.waitForSelector('#hlgbBootAnalysis9381',{state:'visible',timeout:10000});
 const out=await page.evaluate(()=>({
   report:window.hlgbAuditorBootAnalysis9381.last||window.hlgbAuditorBootAnalysis9381.analyze(),
   saveSame:window.__boot9381Refs.save===window.hlgbRecordSaveWithRetry,
   cloudSame:window.__boot9381Refs.cloud===window.cloudRequest,
   button:document.getElementById('hlgbBootAnalysisBtn9381')?.textContent||'',
   panel:document.getElementById('hlgbBootAnalysis9381')?.textContent||''
 }));
 if(out.report?.kind!=='hlgb_boot_analysis'||out.report?.version!=='93.81')throw new Error('relatório de boot inválido '+JSON.stringify(out.report));
 if(!out.saveSame||!out.cloudSame)throw new Error('diagnóstico de boot alterou função crítica');
 if(!/Boot \/ cargas/.test(out.button)||!/Boot \/ cargas \/ renders/.test(out.panel))throw new Error('interface real do boot não apareceu');
 if(errors.some(x=>/9381|boot analysis|auditor/i.test(x)))throw new Error('pageerror relacionado ao Auditor: '+errors.join(' | '));
 console.log('AUDITOR_BOOT_V9381_WEBKIT_OK',{status:out.report.status,summary:out.report.summary});
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
