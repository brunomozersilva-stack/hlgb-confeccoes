const {webkit,chromium}=require('playwright');
const kind=process.env.HLGB_BROWSER||'webkit',engine=kind==='chromium'?chromium:webkit;
(async()=>{
 const browser=await engine.launch({headless:true});
 const page=await browser.newPage({viewport:{width:1280,height:900}}),errors=[];
 page.on('pageerror',e=>errors.push(String(e.message||e)));
 await page.goto('http://127.0.0.1:4173/app-stable3.html',{waitUntil:'domcontentloaded',timeout:60000});
 await page.waitForFunction(()=>window.HLGB_AUDITOR_SINGLE_UI_RECLAIM_9434A==='94.34a'&&typeof window.hlgbLoginConfirmGate9407?.prepareAuditorRepairs9442==='function',null,{timeout:60000});
 const before=await page.evaluate(()=>({auto46:!!window.hlgbAuditorAutoCorrect9446,auth:window.__HLGB_AUTH_READY===true}));
 if(before.auto46)throw new Error('v94.46 carregou antes da autenticação '+JSON.stringify(before));
 await page.evaluate(()=>localStorage.setItem('hlgb_auditor_repair_learning_v9441',JSON.stringify({
  'production-reconcile|general':{recipeId:'production-reconcile',fingerprint:'general',level:'B',observations:0,attempts:3,verifiedSuccesses:0,failures:1,recurrences:0,confidence:0.67,lastSeenVersion:'94.41',proofType:'',migratedBy:'94.44-double-failure-dedup'},
  'production-reconcile|production|1793298514267':{recipeId:'production-reconcile',fingerprint:'production|1793298514267',level:'B',observations:0,attempts:0,verifiedSuccesses:0,failures:2,recurrences:0,confidence:0.49,lastSeenVersion:'94.41',proofType:''}
 })));
 await page.evaluate(()=>{window.__HLGB_AUTH_READY=true;window.dispatchEvent(new Event('hlgb:authenticated'));const l=document.getElementById('loginScreen');if(l)l.style.setProperty('display','none','important');const a=document.getElementById('appShell');if(a){a.style.setProperty('display','block','important');a.style.setProperty('visibility','visible','important')}});
 await page.waitForFunction(()=>window.HLGB_AUDITOR_AUTOCORRECT_9447==='94.47'&&window.HLGB_AUDITOR_AUTOCORRECT_9446==='94.46'&&typeof window.hlgbAuditorAutoCorrect9446?.run==='function'&&window.HLGB_AUDITOR_AUTOCORRECT_9444==='94.44'&&window.hlgbProductionReconcile9439?.concurrencyPatch==='94.43-await-busy',null,{timeout:30000});
 const prep=await page.evaluate(()=>window.hlgbAuditorAutoCorrect9446.prepare('v9446-runtime'));
 if(!prep?.ok)throw new Error('v94.46 não preparou a cadeia real '+JSON.stringify(prep));
 const learned=await page.evaluate(()=>JSON.parse(localStorage.getItem('hlgb_auditor_repair_learning_v9441')||'{}'));
 const general=learned['production-reconcile|general'],specific=learned['production-reconcile|production|1793298514267'];
 if(general?.recipeId!=='production-reconcile'||general?.confidence!==0.67||general?.failures!==1)throw new Error('confiança global foi alterada '+JSON.stringify(general));
 if(specific?.recipeId!=='production-reconcile-record'||specific?.scope!=='record'||specific?.confidence!==0.49||specific?.failures!==2)throw new Error('registro 0,49 não foi isolado preservando evidência '+JSON.stringify(specific));
 await page.waitForTimeout(2300);
 await page.waitForFunction(()=>window.hlgbProductionReconcile9439?.status?.().busy===false,null,{timeout:15000});
 const heal=await page.evaluate(()=>window.hlgbAuditorAutoCorrect9441.healTechnical('v9446-record-scope-runtime'));
 const production=heal.find(x=>x.name==='production-reconcile');
 if(!production||production.skipped===true||production.error==='Receita sem confiança suficiente')throw new Error('Produção ainda foi bloqueada por confiança de registro '+JSON.stringify({production,heal,specific}));
 await page.waitForFunction(()=>typeof window.openHlgbAuditor==='function',null,{timeout:15000});
 await page.evaluate(()=>{window.openHlgbAuditor();window.hlgbAuditorSingleUiReclaim9434A?.heal?.('v9446-runtime')});
 await page.waitForFunction(()=>{const b=document.getElementById('hlgbAuditorUnifiedRun9434A');if(!b)return false;const s=getComputedStyle(b),r=b.getBoundingClientRect();return !b.hidden&&!b.disabled&&s.display!=='none'&&s.visibility!=='hidden'&&r.width>0&&r.height>0},null,{timeout:15000});
 const ui=await page.evaluate(()=>window.hlgbAuditorSingleUiReclaim9434A.status());
 if(ui.appBase!=='94.47'||ui.repairReady!==true||ui.fastConvergenceReady!==true||ui.recordLearningScopeReady!==true||ui.learningAccountingReady!==true||ui.productionConcurrencyReady!==true)throw new Error('UI não preservou v94.46 sob v94.47 '+JSON.stringify(ui));
 if(errors.some(x=>/9447|9446|autocorrect|production-reconcile/i.test(x)))throw new Error('pageerror v94.46/v94.47 '+errors.join(' | '));
 console.log('AUDITOR_AUTOCORRECT_V9446_RUNTIME_'+kind.toUpperCase()+'_OK_WITH_V9447',JSON.stringify({general:{confidence:general.confidence,failures:general.failures},specific:{confidence:specific.confidence,failures:specific.failures,recipeId:specific.recipeId},production:{ok:production.ok,skipped:!!production.skipped},ui:{appBase:ui.appBase,repairReady:ui.repairReady,fastConvergenceReady:ui.fastConvergenceReady,recordLearningScopeReady:ui.recordLearningScopeReady}}));
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});