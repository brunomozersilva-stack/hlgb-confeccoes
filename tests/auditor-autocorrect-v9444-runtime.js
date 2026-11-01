const {webkit,chromium}=require('playwright');
const kind=process.env.HLGB_BROWSER||'webkit',engine=kind==='chromium'?chromium:webkit;
(async()=>{
 const browser=await engine.launch({headless:true});
 const page=await browser.newPage({viewport:{width:1280,height:900}}),errors=[];
 page.on('pageerror',e=>errors.push(String(e.message||e)));
 await page.goto('http://127.0.0.1:4173/app-stable3.html',{waitUntil:'domcontentloaded',timeout:60000});
 await page.waitForFunction(()=>window.HLGB_AUDITOR_SINGLE_UI_RECLAIM_9434A==='94.34a'&&typeof window.hlgbLoginConfirmGate9407?.prepareAuditorRepairs9442==='function',null,{timeout:60000});
 const before=await page.evaluate(()=>({auto44:!!window.hlgbAuditorAutoCorrect9444,auth:window.__HLGB_AUTH_READY===true}));
 if(before.auto44)throw new Error('v94.44 carregou antes da autenticação '+JSON.stringify(before));
 // Reproduz a memória real enviada pela usuária: uma tentativa antiga foi registrada como duas falhas e caiu de 0,85 para 0,49.
 await page.evaluate(()=>localStorage.setItem('hlgb_auditor_repair_learning_v9441',JSON.stringify({'production-reconcile|general':{recipeId:'production-reconcile',fingerprint:'general',level:'B',observations:0,attempts:1,verifiedSuccesses:0,failures:2,recurrences:0,confidence:0.49,firstSeenVersion:'94.41',lastSeenVersion:'94.41',proofType:''}})));
 await page.evaluate(()=>{window.__HLGB_AUTH_READY=true;window.dispatchEvent(new Event('hlgb:authenticated'));const l=document.getElementById('loginScreen');if(l)l.style.setProperty('display','none','important');const a=document.getElementById('appShell');if(a){a.style.setProperty('display','block','important');a.style.setProperty('visibility','visible','important')}});
 await page.waitForFunction(()=>window.HLGB_AUDITOR_AUTOCORRECT_9444==='94.44'&&typeof window.hlgbAuditorAutoCorrect9444?.run==='function'&&window.HLGB_AUDITOR_AUTOCORRECT_9443==='94.43'&&window.hlgbProductionReconcile9439?.concurrencyPatch==='94.43-await-busy',null,{timeout:30000});
 const prep=await page.evaluate(()=>window.hlgbAuditorAutoCorrect9444.prepare('v9444-runtime'));
 if(!prep?.ok)throw new Error('v94.44 não preparou a cadeia real '+JSON.stringify(prep));
 const migrated=await page.evaluate(()=>JSON.parse(localStorage.getItem('hlgb_auditor_repair_learning_v9441')||'{}')['production-reconcile|general']);
 if(migrated?.failures!==1||migrated?.confidence!==0.67||migrated?.migratedBy!=='94.44-double-failure-dedup')throw new Error('memória contaminada não foi migrada '+JSON.stringify(migrated));
 // Aguarda o burst automático de Produção e prova que o gate de confiança não pula mais a receita real.
 await page.waitForTimeout(2300);
 await page.waitForFunction(()=>window.hlgbProductionReconcile9439?.status?.().busy===false,null,{timeout:15000});
 const heal=await page.evaluate(()=>window.hlgbAuditorAutoCorrect9441.healTechnical('v9444-confidence-runtime'));
 const production=heal.find(x=>x.name==='production-reconcile');
 if(!production||production.skipped===true||production.error==='Receita sem confiança suficiente')throw new Error('Produção continua bloqueada pela confiança antiga '+JSON.stringify({production,heal}));
 await page.waitForFunction(()=>typeof window.openHlgbAuditor==='function',null,{timeout:15000});
 await page.evaluate(()=>{window.openHlgbAuditor();window.hlgbAuditorSingleUiReclaim9434A?.heal?.('v9444-runtime')});
 await page.waitForFunction(()=>{const b=document.getElementById('hlgbAuditorUnifiedRun9434A');if(!b)return false;const s=getComputedStyle(b),r=b.getBoundingClientRect();return !b.hidden&&!b.disabled&&s.display!=='none'&&s.visibility!=='hidden'&&r.width>0&&r.height>0},null,{timeout:15000});
 const ui=await page.evaluate(()=>window.hlgbAuditorSingleUiReclaim9434A.status());
 if(ui.appBase!=='94.44'||ui.repairReady!==true||ui.learningAccountingReady!==true||ui.productionConcurrencyReady!==true)throw new Error('UI não aponta integralmente para v94.44 '+JSON.stringify(ui));
 if(errors.some(x=>/9444|autocorrect|production-reconcile/i.test(x)))throw new Error('pageerror v94.44 '+errors.join(' | '));
 console.log('AUDITOR_AUTOCORRECT_V9444_RUNTIME_'+kind.toUpperCase()+'_OK',JSON.stringify({migration:{failures:migrated.failures,confidence:migrated.confidence},production:{ok:production.ok,skipped:!!production.skipped},prep:{ok:prep.ok},ui:{appBase:ui.appBase,repairReady:ui.repairReady,learningAccountingReady:ui.learningAccountingReady}}));
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
