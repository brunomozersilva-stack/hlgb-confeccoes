const {webkit,chromium}=require('playwright');
const kind=process.env.HLGB_BROWSER||'webkit';
(async()=>{
 const browser=await (kind==='chromium'?chromium:webkit).launch({headless:true});
 try{
 const page=await browser.newPage({viewport:{width:1280,height:900}}),errors=[];
 page.on('pageerror',e=>errors.push(String(e.message||e)));
 await page.goto('http://127.0.0.1:4173/app-stable3.html',{waitUntil:'domcontentloaded',timeout:60000});
 await page.waitForFunction(()=>window.HLGB_AUDITOR_SINGLE_UI_RECLAIM_9434A==='94.34a'&&typeof window.hlgbAuditorSingleAction9429?.run==='function',null,{timeout:60000});
 if(await page.evaluate(()=>!!window.HLGB_AUDITOR_REPAIR_9440))throw new Error('reparador antes do login');
 await page.evaluate(()=>{window.__HLGB_AUTH_READY=true;window.dispatchEvent(new Event('hlgb:authenticated'));document.getElementById('loginScreen')?.style.setProperty('display','none','important');document.getElementById('appShell')?.style.setProperty('display','block','important')});
 await page.waitForFunction(()=>typeof window.openHlgbAuditor==='function'&&window.hlgbDiagnosticsCenter?.getIssues&&window.HLGB_AUDITOR_FINALIZE_9439,null,{timeout:20000});
 await page.evaluate(()=>{window.openHlgbAuditor();window.hlgbAuditorSingleUiReclaim9434A.heal('test')});
 await page.waitForFunction(()=>{const b=document.getElementById('hlgbAuditorUnifiedRun9434A');return b&&b.getBoundingClientRect().height>0});
 const button=page.locator('#hlgbAuditorUnifiedRun9434A');
 if(!/Auditar e corrigir/.test(await button.textContent()))throw new Error('texto da ação');
 const count=await page.locator('.hlgb-auditor-actions > button:visible').count();if(count!==1)throw new Error('ações visíveis '+count);
 await page.evaluate(()=>{
  const ids=['1788606175817','1788744242004','1788606082524','1788432339810'];
  window.__repairFixture={calls:0,heals:0,remoteIssues:new Map()};
  db.finance=ids.map((id,i)=>({id,projectionInvoiceId:'missing-'+i,amount:100+i}));window.__financeBefore=JSON.stringify(db.finance);
  db.systemIssues=[{id:'old-save',title:'Falha ao salvar production',opId:'op-test',recordRefs:[{module:'production',id:'test-production'}],status:'Aberto',lastSeenAt:'2026-10-30T12:00:00Z'},{id:'old-aggregate',title:'Falha de conexão ao salvar production',status:'Aberto',lastSeenAt:'2026-10-30T12:00:00Z'},{id:'old-js',title:'Erro JavaScript em corte',status:'Aberto',lastSeenAt:'2026-10-30T12:00:00Z'}];
  for(const x of db.systemIssues)window.__repairFixture.remoteIssues.set(String(x.id),structuredClone(x));
  // Keep the REAL diagnostics API; replace only its network transport.
  window.hlgbRecordSaveWithRetry=async(module,id,data)=>{if(module!=='systemIssues')throw new Error('Unexpected business write');window.__repairFixture.remoteIssues.set(String(id),structuredClone(data));return {applied:true,data}};
  window.cloudRequest=async path=>{const p=String(path);if(!p.includes('module=eq.systemIssues'))return[];const m=p.match(/entity_id=eq\.([^&]+)/),id=decodeURIComponent(m?.[1]||'');const rows=id?(window.__repairFixture.remoteIssues.has(id)?[[id,window.__repairFixture.remoteIssues.get(id)]]:[]):[...window.__repairFixture.remoteIssues.entries()];return rows.map(([entity_id,data])=>({module:'systemIssues',entity_id,data:structuredClone(data),deleted_at:null,revision:7,updated_at:new Date().toISOString(),updated_by:'browser-test'}))};
  window.cloudEnsureFreshSession=async()=>true;
  window.hlgbAckReconcile9436={install:()=>true};
  window.hlgbProductionReconcile9439={candidates:async()=>[],reconcile:async()=>({results:++window.__repairFixture.heals===1?[{id:'test-production',ok:true,proof:'server-semantic-match',serverRevision:9,normalizedRemoved:1,walRemoved:2,operationIds:['op-test']}]:[]})};
  window.hlgbAuditorRapid9437.heal=()=>true;
  window.hlgbAuditorFinalize9439.install=()=>true;
  window.hlgbAuditorIntelligence9396.currentMetrics=()=>({metrics:{pendingUnique:0,scriptDuplicates:0,saveDuplicateResponsibilities:0}});
  window.hlgbAuditorSingleAction9429.run=async()=>{
   window.__repairFixture.calls++;
   window.closeModal?.();document.querySelectorAll('.page.active').forEach(x=>x.classList.remove('active'));document.getElementById('pedidos')?.classList.add('active');
   return {main:{checks:ids.map(id=>({code:'data:finance-projection-orphan',refs:[{id,module:'finance'}],detail:'Sem nota '+id,status:'fail'}))},daily:{operations:{pending:{unique:0},delivery:{status:'pass'},savingUi:{status:'pass'}},intelligence:{metrics:{pendingUnique:0,scriptDuplicates:0,saveDuplicateResponsibilities:0}}}};
  };
  document.querySelectorAll('.page.active').forEach(x=>x.classList.remove('active'));document.getElementById('pedidos')?.classList.add('active');
 });
 await button.click();
 await page.waitForFunction(()=>!!window.hlgbAuditorRepair9440?.state.lastSummary&&!window.hlgbAuditorSingleUiReclaim9434A.state.running,null,{timeout:30000});
 const out=await page.evaluate(()=>({summary:window.hlgbAuditorRepair9440.state.lastSummary,issues:window.hlgbDiagnosticsCenter.getIssues(),calls:window.__repairFixture.calls,page:document.querySelector('.page.active')?.id,unchanged:JSON.stringify(db.finance)===window.__financeBefore}));
 if(out.page!=='pedidos'||!out.unchanged||out.summary.blocked.length!==4||out.summary.fixed!==1||out.summary.passes!==2||out.calls!==3)throw new Error('ciclo incorreto '+JSON.stringify(out));
 if(out.issues.find(x=>x.id==='old-save').status!=='Resolvido'||out.issues.find(x=>x.id==='old-js').status!=='Aberto'||out.issues.find(x=>x.id==='old-aggregate').status!=='Aberto')throw new Error('fechamento incorreto '+JSON.stringify(out));
 await page.evaluate(()=>{window.openHlgbAuditor();window.hlgbAuditorSingleUiReclaim9434A.heal('reopen')});
 if(await page.locator('.hlgb-auditor-actions > button:visible').count()!==1)throw new Error('ação única ao reabrir');
 const text=await page.locator('#hlgbAuditorRepair9440Card').textContent();
 for(const label of ['Corrigido e validado','Ainda com falha','Aguardando decisão humana','Não foi possível verificar'])if(!text.includes(label))throw new Error('categoria ausente '+label);
 const repeated=await page.evaluate(()=>window.hlgbAuditorRepair9440.run());if(repeated.fixed!==0)throw new Error('repetição duplicou reparo');
 if(errors.length)throw new Error('Erros JavaScript: '+errors.join(' | '));
 console.log('AUDITOR_REPAIR_V9440_BROWSER_OK',kind,JSON.stringify({passes:out.summary.passes,fixed:out.summary.fixed,orphans:4,actualDiagnostics:true,remoteReadback:true}));
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
