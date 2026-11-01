const {webkit,chromium}=require('playwright');
const kind=process.env.HLGB_BROWSER||'webkit',engine=kind==='chromium'?chromium:webkit;
(async()=>{
 const browser=await engine.launch({headless:true});
 const page=await browser.newPage({viewport:{width:1280,height:900}}),errors=[];
 page.on('pageerror',e=>errors.push(String(e.message||e)));
 await page.goto('http://127.0.0.1:4173/app-stable3.html',{waitUntil:'domcontentloaded',timeout:60000});
 await page.waitForFunction(()=>window.HLGB_AUDITOR_SINGLE_UI_RECLAIM_9434A==='94.34a'&&typeof window.hlgbLoginConfirmGate9407?.prepareAuditorRepairs9442==='function',null,{timeout:60000});
 await page.evaluate(()=>{window.__HLGB_AUTH_READY=true;window.dispatchEvent(new Event('hlgb:authenticated'));const l=document.getElementById('loginScreen');if(l)l.style.setProperty('display','none','important');const a=document.getElementById('appShell');if(a){a.style.setProperty('display','block','important');a.style.setProperty('visibility','visible','important')}});
 await page.waitForFunction(()=>window.HLGB_AUDITOR_AUTOCORRECT_9447==='94.47'&&typeof window.hlgbAuditorAutoCorrect9447?.run==='function'&&window.HLGB_AUDITOR_AUTOCORRECT_9446==='94.46',null,{timeout:30000});
 const out=await page.evaluate(async()=>{
  const now=Date.now(),old=new Date(now-2*60*60*1000).toISOString();
  const audit={main:{summary:{total:31,pass:29,warn:2,fail:0,result:'Atenção'},checks:[{code:'sync:pending',status:'warn',title:'Pendências locais de sincronização',detail:'21 registro(s) aguardando sincronização.'},{code:'issues:open',status:'warn',title:'Erros abertos na Central',detail:'124 aberto(s); 124 de alta prioridade.'}]},operations:{pending:{unique:0,records:0,wal:0,totalCopies:0},delivery:{status:'pass'},savingUi:{status:'pass'},runtime:{status:'pass'}}};
  const issues=Array.from({length:116},(_,i)=>({id:'old-'+i,status:'Aberto',title:'Falha ao salvar production',detail:'Falha ao salvar production',lastSeenAt:old}));
  const ev=[{recipeId:'production-reconcile',recordId:'a',status:'unverified',detail:'Reteste da fila, operação ou prova remota incompleta',at:new Date(now-1000).toISOString()},{recipeId:'production-reconcile',recordId:'b',status:'unverified',detail:'Reteste da fila, operação ou prova remota incompleta',at:new Date(now-900).toISOString()},{recipeId:'production-reconcile',recordId:'c',status:'failed',detail:'business-difference',at:new Date(now-800).toISOString()},{recipeId:'production-reconcile',recordId:'d',status:'failed',detail:'business-difference',at:new Date(now-700).toISOString()}];
  const a41=window.hlgbAuditorAutoCorrect9441,intel=window.hlgbAuditorIntelligence9396,diag=window.hlgbDiagnosticsCenter,prod=window.hlgbProductionReconcile9439;
  const saved={silent:a41.silentAudit,events:a41.repairEvents,metrics:intel.currentMetrics,issues:diag.getIssues,candidates:prod.candidates};
  a41.silentAudit=async()=>audit;a41.repairEvents=()=>ev;intel.currentMetrics=()=>({metrics:{pendingUnique:21,pendingBusiness:21,pendingTechnicalRecent:0,pendingTechnicalHistorical:0,scriptDuplicates:0,saveDuplicateResponsibilities:0}});diag.getIssues=()=>issues;prod.candidates=async()=>[{id:'a'},{id:'b'},{id:'c'},{id:'d'}];
  try{return await window.hlgbAuditorAutoCorrect9447.run({reason:'v9447-runtime',render:false,download:false})}finally{a41.silentAudit=saved.silent;a41.repairEvents=saved.events;intel.currentMetrics=saved.metrics;diag.getIssues=saved.issues;prod.candidates=saved.candidates}
 });
 if(out?.version!=='94.47'||out?.repairSkipped!==true||out?.passes!==0)throw new Error('fast path não evitou rodadas '+JSON.stringify(out));
 if(out.needsCode?.length!==2||out.businessBlocked?.length!==2||out.unverified?.length!==2||out.historicalBacklog?.count!==116)throw new Error('triagem não ficou compacta '+JSON.stringify({needs:out.needsCode?.length,business:out.businessBlocked?.length,unverified:out.unverified?.length,historical:out.historicalBacklog?.count}));
 const ui=await page.evaluate(()=>window.hlgbAuditorSingleUiReclaim9434A.status());
 if(ui.appBase!=='94.47'||ui.repairReady!==true||ui.fastConvergenceReady!==true||ui.recordLearningScopeReady!==true)throw new Error('UI não aponta para v94.47 preservando v94.46 '+JSON.stringify(ui));
 if(errors.some(x=>/9447|autocorrect/i.test(x)))throw new Error('pageerror v94.47 '+errors.join(' | '));
 console.log('AUDITOR_AUTOCORRECT_V9447_RUNTIME_'+kind.toUpperCase()+'_OK',JSON.stringify({passes:out.passes,needsCode:out.needsCode.length,businessBlocked:out.businessBlocked.length,historical:out.historicalBacklog.count,ui:{appBase:ui.appBase,fastConvergenceReady:ui.fastConvergenceReady}}));
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
