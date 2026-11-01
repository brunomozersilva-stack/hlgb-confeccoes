const {webkit,chromium}=require('playwright');
const engine=process.env.HLGB_BROWSER==='chromium'?chromium:webkit;
(async()=>{
 const browser=await engine.launch({headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1280,height:900}}),errors=[],dialogs=[];
  page.on('pageerror',e=>errors.push(String(e.message||e)));
  page.on('dialog',async d=>{dialogs.push(d.type()+':'+d.message());await d.dismiss()});
  await page.goto('http://127.0.0.1:4173/app-stable3.html',{waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForFunction(()=>window.HLGB_AUDITOR_SINGLE_UI_RECLAIM_9434A==='94.34a'&&typeof window.hlgbAuditorSingleUiReclaim9434A?.ensureRepair==='function',null,{timeout:60000});
  if(await page.evaluate(()=>!!window.HLGB_AUDITOR_AUTOCORRECT_9441))throw new Error('autocorretor carregou antes do login');
  await page.evaluate(()=>{window.__HLGB_AUTH_READY=true;window.__HLGB_TEST__=true;window.dispatchEvent(new Event('hlgb:authenticated'));document.getElementById('loginScreen')?.style.setProperty('display','none','important');document.getElementById('appShell')?.style.setProperty('display','block','important')});
  const loaded=await page.evaluate(()=>window.hlgbAuditorSingleUiReclaim9434A.ensureRepair());if(!loaded)throw new Error('não carregou v94.41');
  await page.waitForFunction(()=>window.HLGB_AUDITOR_AUTOCORRECT_9441==='94.41'&&typeof window.hlgbAuditorAutoCorrect9441?.run==='function',null,{timeout:15000});
  const result=await page.evaluate(async()=>{
   let metrics={pendingUnique:0,scriptDuplicates:0,saveDuplicateResponsibilities:0};
   window.__acTest={singleCalls:0,auditCalls:0};
   window.hlgbAuditorSingleAction9429.run=async()=>{window.__acTest.singleCalls++;throw new Error('execução visual proibida')};
   window.hlgbAuditorIntelligence9396.currentMetrics=()=>({metrics:{...metrics}});
   window.hlgbInternalAuditor.run=async()=>{window.__acTest.auditCalls++;return {summary:{result:'Aprovado'},checks:[],operational:{checks:[{code:'operational:pending',pending:{unique:metrics.pendingUnique}},{code:'operational:delivery',status:'pass'},{code:'operational:saving-ui',status:'pass'}]}}};
   window.hlgbAckReconcile9436={install:async()=>true};window.hlgbAuditorRapid9437.heal=async()=>true;window.hlgbAuditorFinalize9439.install=async()=>true;
   window.hlgbProductionReconcile9439={reconcile:async()=>({results:[]}),candidates:async()=>[]};
   document.querySelectorAll('.page.active').forEach(x=>x.classList.remove('active'));document.getElementById('pedidos')?.classList.add('active');
   const first=await window.hlgbAuditorAutoCorrect9441.run({render:false,download:false});
   const pageAfterFirst=document.querySelector('.page.active')?.id||'';
   metrics={pendingUnique:1,scriptDuplicates:0,saveDuplicateResponsibilities:0};
   window.hlgbProductionReconcile9439.reconcile=async()=>{metrics.pendingUnique=0;return {results:[{id:'browser-prod',ok:true,proof:'server-semantic-match',serverRevision:11,normalizedRemoved:1,walRemoved:1,operationIds:['browser-op']}]}};
   const second=await window.hlgbAuditorAutoCorrect9441.run({render:false,download:false});
   return {first:{passes:first.passes,stopReason:first.stopReason},second:{passes:second.passes,fixed:second.fixed,stable:second.ui?.stable,events:second.report?.repairEvents?.length,hasContract:!!second.report?.featureContracts?.['auditor-autocorrect-core']},pageAfterFirst,pageAfterSecond:document.querySelector('.page.active')?.id||'',singleCalls:window.__acTest.singleCalls,auditCalls:window.__acTest.auditCalls,version:window.HLGB_RELEASE_VERSION};
  });
  if(result.pageAfterFirst!=='pedidos'||result.pageAfterSecond!=='pedidos'||result.singleCalls!==0)throw new Error('autocorretor navegou/usou Auditor visual '+JSON.stringify(result));
  if(result.first.passes!==0||result.second.passes!==1||result.second.fixed!==1||!result.second.stable||result.second.events!==1||!result.second.hasContract)throw new Error('ciclo v94.41 incorreto '+JSON.stringify(result));
  if(dialogs.length)throw new Error('autocorretor abriu diálogo/pergunta: '+dialogs.join(' | '));
  if(errors.some(x=>/autocorrect|9441/i.test(x)))throw new Error('erros JS '+errors.join(' | '));
  console.log('AUDITOR_AUTOCORRECT_V9441_BROWSER_OK',process.env.HLGB_BROWSER||'webkit',JSON.stringify(result));
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});