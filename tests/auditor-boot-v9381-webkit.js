const {webkit}=require('playwright');
(async()=>{
 const browser=await webkit.launch({headless:true});
 const page=await browser.newPage({viewport:{width:1280,height:900}});
 const errors=[];page.on('pageerror',e=>errors.push(String(e.message||e)));
 await page.goto('http://127.0.0.1:4173/app-stable3.html',{waitUntil:'domcontentloaded',timeout:60000});
 await page.waitForFunction(()=>!!document.getElementById('loginScreen')&&!!document.getElementById('appShell')&&
  typeof window.hlgbBootTimeline9379?.snapshot==='function'&&
  typeof window.hlgbAuditorCallTrace9380?.snapshot==='function'&&
  typeof window.hlgbAuditorBootAnalysis9381?.analyze==='function'&&
  typeof window.hlgbAuditorBootAnalysis9381?.render==='function',null,{timeout:60000});
 /* Este cenário testa exclusivamente o Auditor de boot. O comportamento do gate v94.07
    é coberto em login-3d-v9407-webkit.js; aqui simulamos que o usuário já confirmou Entrar. */
 await page.evaluate(()=>{
   window.hlgbLoginConfirmGate9407?.confirm?.();
   const app=document.getElementById('appShell');if(app)app.style.setProperty('display','block','important');
   window.__HLGB_AUTH_READY=true;window.dispatchEvent(new Event('hlgb:authenticated'));
 });
 try{
  await page.waitForFunction(()=>!!window.hlgbInternalAuditor&&!!window.hlgbAuditorProduction9369?.active&&!!document.getElementById('hlgbAuditorNavBtn'),null,{timeout:60000});
 }catch(e){
  // Fail with precise readiness evidence instead of a generic 60s timeout.
  const state=await page.evaluate(()=>({
   internalAuditor:!!window.hlgbInternalAuditor,
   productionAuditor:window.hlgbAuditorProduction9369?.active??null,
   auditorNav:!!document.getElementById('hlgbAuditorNavBtn'),
   diagnosticsNav:!!document.getElementById('hlgbDiagnosticsNav'),
   systemSubmenu:!!document.querySelector('#nav .nav-group:last-of-type .nav-submenu'),
   authReady:window.__HLGB_AUTH_READY===true,
   loginConfirmed:window.__HLGB_LOGIN_CONFIRMED_9407===true,
   bootReady:window.__HLGB_BOOT_READY_9477===true,
   bootFailure:window.__HLGB_BOOT_ERROR_9477||'',
   failedFiles:window.__HLGB_BOOT_FAILED_FILES_9477||[]
  })).catch(err=>({inspectError:String(err)}));
  throw new Error('Boot WebKit sem componentes esperados: '+JSON.stringify(state)+'; erros='+errors.join(' | '),{cause:e});
 }
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
 // Losing the optional navigation anchor must not permanently hide Auditor.
 await page.evaluate(()=>{
   document.getElementById('hlgbAuditorNavBtn')?.remove();
   window.dispatchEvent(new Event('hlgb:authenticated'));
 });
 await page.waitForSelector('#hlgbAuditorNavBtn',{state:'visible',timeout:10000});

 const refs=await page.evaluate(()=>{window.__boot9381Refs={save:window.hlgbRecordSaveWithRetry,cloud:window.cloudRequest};return {timeline:window.hlgbBootTimeline9379.snapshot(),trace:window.hlgbAuditorCallTrace9380.snapshot(),analysis:window.hlgbAuditorBootAnalysis9381.analyze()}});
 // A análise Boot v93.81 foi evoluída (v94.45 em produção). Provar que o
 // contrato não regrediu, sem exigir uma versão obsoleta.
 const currentVersion=(value,min)=>/^\d+\.\d+$/.test(String(value||''))&&Number(value)>=min;
 if(!currentVersion(refs.timeline?.version,93.79)||
    !currentVersion(refs.trace?.version,93.80)||
    !currentVersion(refs.analysis?.version,93.81))
  throw new Error('instrumentação ausente ou regredida '+JSON.stringify(refs));
 if(!refs.timeline?.coverage||refs.timeline.coverage.preInstrumentationMeasured!==false)throw new Error('cobertura inicial não foi declarada conservadoramente');
 await page.click('#hlgbAuditorNavBtn',{timeout:10000});
 // O Auditor oficial oculta o botão secundário antigo para manter ação
 // única. A análise de boot segue verificável diretamente pela API read-only.
 const proof=await page.evaluate(()=>{
   const btn=document.getElementById('hlgbBootAnalysisBtn9381');
   if(btn&&!btn.hidden&&getComputedStyle(btn).display!=='none')
    throw Error('O botão antigo de boot está indevidamente visível');
   const before={save:window.hlgbRecordSaveWithRetry,cloud:window.cloudRequest};
   const report=window.hlgbAuditorBootAnalysis9381.render();
   return {kind:report?.kind,saveSame:before.save===window.hlgbRecordSaveWithRetry,
    cloudSame:before.cloud===window.cloudRequest};
 });
 if(proof.kind!=='hlgb_boot_analysis'||!proof.saveSame||!proof.cloudSame)
  throw Error('Análise de boot não preservou funções críticas: '+JSON.stringify(proof));
 await page.waitForSelector('#hlgbBootAnalysis9381',{state:'visible',timeout:10000});
 const out=await page.evaluate(()=>({
   report:window.hlgbAuditorBootAnalysis9381.last||window.hlgbAuditorBootAnalysis9381.analyze(),
   button:document.getElementById('hlgbBootAnalysisBtn9381')?.textContent||'',
   panel:document.getElementById('hlgbBootAnalysis9381')?.textContent||''
 }));
 if(out.report?.kind!=='hlgb_boot_analysis'||!currentVersion(out.report?.version,93.81)||
    out.report.status==='unavailable')
  throw new Error('Relatório de boot inválido ou sem evidência '+JSON.stringify(out.report));
 if(!proof.saveSame||!proof.cloudSame)throw new Error('diagnóstico de boot alterou função crítica');
 if(!/Boot \/ cargas/.test(out.button)||!/Boot \/ cargas \/ renders/.test(out.panel))throw new Error('interface real do boot não apareceu');
 if(errors.some(x=>/9381|boot analysis|auditor/i.test(x)))throw new Error('pageerror relacionado ao Auditor: '+errors.join(' | '));
 console.log('AUDITOR_BOOT_V9381_WEBKIT_OK',{status:out.report.status,summary:out.report.summary,loginGateConfirmed:true});
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
