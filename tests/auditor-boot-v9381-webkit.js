const {webkit}=require('playwright');
(async()=>{
 const browser=await webkit.launch({headless:true});
 const page=await browser.newPage({viewport:{width:1280,height:900}});
 const errors=[];page.on('pageerror',e=>errors.push(String(e.message||e)));
 await page.goto('http://127.0.0.1:4173/app-stable3.html',{waitUntil:'domcontentloaded',timeout:60000});
 await page.waitForFunction(()=>!!document.getElementById('loginScreen')&&!!document.getElementById('appShell')&&window.HLGB_AUDITOR_BOOT_TIMELINE_9379==='93.79'&&window.HLGB_AUDITOR_CALL_TRACE_9380==='93.80'&&window.HLGB_AUDITOR_BOOT_ANALYSIS_9381==='93.81',null,{timeout:60000});
 await page.evaluate(()=>{window.__HLGB_AUTH_READY=true;window.dispatchEvent(new Event('hlgb:authenticated'))});
 await page.waitForFunction(()=>!!window.hlgbInternalAuditor&&!!window.hlgbAuditorProduction9369?.active&&!!document.getElementById('hlgbAuditorNavBtn'),null,{timeout:60000});
 /* A autoridade de gravação v93.06 é instalada de forma tardia após login.
    Espere esse estado antes de medir se o painel de boot altera funções críticas. */
 await page.waitForFunction(()=>{
   let f=window.hlgbRecordSaveWithRetry,n=0,seen=new Set();
   while(typeof f==='function'&&n++<64&&!seen.has(f)){
     seen.add(f);if(f.__hlgb9306)return true;
     f=f.__original||f.__hlgb9306Original||f.__originalGradeLink||f.__hlgb9313Original||f.__hlgb9312Original||f.__hlgb9320Original||f.__hlgbRecordIntegrityOriginal||f.__hlgb955Original||f.__hlgb9339Original||null;
   }
   return false;
 },null,{timeout:10000});
 await page.waitForTimeout(350);
 await page.evaluate(()=>{
   const login=document.getElementById('loginScreen');
   if(login){login.style.setProperty('display','none','important');login.style.setProperty('pointer-events','none','important')}
   const btn=document.getElementById('hlgbAuditorNavBtn');
   if(btn){document.body.appendChild(btn);for(const [k,v] of Object.entries({display:'block',visibility:'visible',opacity:'1','pointer-events':'auto',position:'fixed',left:'20px',top:'20px','z-index':'2147483647'}))btn.style.setProperty(k,v,'important')}
 });
 await page.waitForSelector('#hlgbAuditorNavBtn',{state:'visible',timeout:10000});
 const refs=await page.evaluate(()=>{window.__boot9381Refs={save:window.hlgbRecordSaveWithRetry,cloud:window.cloudRequest};return {timeline:window.hlgbBootTimeline9379.snapshot(),trace:window.hlgbAuditorCallTrace9380.snapshot(),analysis:window.hlgbAuditorBootAnalysis9381.analyze()}});
 if(refs.timeline?.version!=='93.79'||refs.trace?.version!=='93.80'||refs.analysis?.version!=='93.81')throw new Error('instrumentação incompleta '+JSON.stringify(refs));
 if(!refs.timeline?.coverage||refs.timeline.coverage.preInstrumentationMeasured!==false)throw new Error('cobertura inicial não foi declarada conservadoramente');
 await page.click('#hlgbAuditorNavBtn',{timeout:10000});
 await page.waitForSelector('#hlgbBootAnalysisBtn9381',{state:'visible',timeout:10000});
 await page.click('#hlgbBootAnalysisBtn9381',{timeout:10000});
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
