const {webkit}=require('playwright');
(async()=>{
 const browser=await webkit.launch({headless:true});
 const page=await browser.newPage({viewport:{width:1280,height:900}});
 const errors=[];page.on('pageerror',e=>errors.push(String(e.message||e)));
 await page.goto('http://127.0.0.1:4173/app-stable3.html',{waitUntil:'domcontentloaded',timeout:60000});
 await page.waitForFunction(()=>!!document.getElementById('loginScreen')&&!!document.getElementById('appShell')&&window.HLGB_AUDITOR_SINGLE_ACTION_9427==='94.27',null,{timeout:60000});
 await page.evaluate(()=>{window.__HLGB_AUTH_READY=true;window.dispatchEvent(new Event('hlgb:authenticated'))});
 await page.waitForFunction(()=>window.HLGB_AUDITOR_SHELL_AUTHORITY==='93.82'&&typeof window.openHlgbAuditor==='function'&&!!document.getElementById('hlgbAuditorNavBtn')&&typeof window.hlgbAuditorIntelligence9396?.currentMetrics==='function',null,{timeout:60000});
 await page.evaluate(()=>{
  const login=document.getElementById('loginScreen');if(login)login.style.setProperty('display','none','important');
  const app=document.getElementById('appShell');if(app){app.style.setProperty('display','block','important');app.style.setProperty('visibility','visible','important');app.style.setProperty('opacity','1','important')}
  const btn=document.getElementById('hlgbAuditorNavBtn');if(btn){document.body.appendChild(btn);Object.assign(btn.style,{display:'block',visibility:'visible',opacity:'1',position:'fixed',left:'20px',top:'20px',zIndex:'2147483647'})}
 });
 await page.click('#hlgbAuditorNavBtn',{timeout:10000});
 await page.waitForSelector('#hlgbAuditorUnifiedRun9427',{state:'visible',timeout:10000});
 // Dá tempo para decoradores legados tentarem reaparecer.
 await page.waitForTimeout(8000);
 const before=await page.evaluate(()=>{
   const metrics=window.hlgbAuditorIntelligence9396.currentMetrics();
   localStorage.setItem('hlgb_auditor_intelligence_baseline_v9396',JSON.stringify({at:'2000-01-01T00:00:00.000Z',appVersion:'seed',metrics:metrics.metrics}));
   localStorage.setItem('hlgb_auditor_learning_history_v9427',JSON.stringify([{at:'2000-01-01T00:00:00.000Z',metrics:{seed:1},comparison:{}}]));
   window.__HLGB_TEST_ORIGINAL_SMART_RUN=window.hlgbAuditorSmartRun;
   window.hlgbAuditorSmartRun=async()=>({status:'pass',summary:{pass:1,warn:0,fail:0},testStub:true});
   return {history:JSON.parse(localStorage.getItem('hlgb_auditor_learning_history_v9427')||'[]').length};
 });
 await page.click('#hlgbAuditorUnifiedRun9427',{timeout:10000});
 await page.waitForFunction(()=>!!window.HLGB_AUDITOR_SINGLE_ACTION_LAST?.daily,null,{timeout:60000});
 const out=await page.evaluate(()=>{
   if(window.__HLGB_TEST_ORIGINAL_SMART_RUN)window.hlgbAuditorSmartRun=window.__HLGB_TEST_ORIGINAL_SMART_RUN;
   const status=document.getElementById('hlgbSmartStatus');
   const root=status?.closest?.('[role="dialog"],.modal,.modal-content,.modalCard,.modal-card,.dialog')||status?.parentElement?.parentElement||status?.parentElement||document.body;
   const visible=el=>{if(!el)return false;const s=getComputedStyle(el),r=el.getBoundingClientRect();return !el.hidden&&s.display!=='none'&&s.visibility!=='hidden'&&r.width>0&&r.height>0};
   const actions=[...root.querySelectorAll('.hlgb-auditor-actions button')].filter(visible).map(x=>({id:x.id,text:(x.textContent||'').trim()}));
   const legacyIds=['hlgbAuditorUnifiedRun9426','hlgbMultiuserOpen','hlgbSmartTest','hlgbSmartProblem','hlgbSmartHistoryBtn','hlgbAuthorityBtn9374','hlgbBootAnalysisBtn9381','hlgbAuditorIntelligenceBtn9396','hlgbAuditorBusinessBtn9401','hlgbDailyReport9368'];
   const legacyVisible=legacyIds.filter(id=>visible(root.querySelector('#'+id)));
   const history=JSON.parse(localStorage.getItem('hlgb_auditor_learning_history_v9427')||'[]');
   const baseline=JSON.parse(localStorage.getItem('hlgb_auditor_intelligence_baseline_v9396')||'null');
   const daily=JSON.parse(localStorage.getItem('hlgb_auditor_daily_report_latest_v9427')||'null');
   const last=window.HLGB_AUDITOR_SINGLE_ACTION_LAST;
   return {actions,legacyVisible,historyCount:history.length,historyLast:history.at?.(-1)||null,baseline,daily,last:{version:last?.version,learning:last?.deep?.learning,daily:last?.daily},test:window.hlgbAuditorSingleAction9427?.validate?.(),shellAuthority:window.HLGB_AUDITOR_SHELL_AUTHORITY,canonicalShell:window.openHlgbAuditor===window.hlgbAuditorShell9382?.open,release:window.HLGB_AUDITOR_RELEASE_VERSION,downloadVisible:visible(root.querySelector('#hlgbAuditorDailyDownload9427'))};
 });
 if(out.actions.length!==1||out.actions[0].id!=='hlgbAuditorUnifiedRun9427')throw new Error('Auditor deve ter exatamente uma ação principal visível: '+JSON.stringify(out));
 if(out.legacyVisible.length)throw new Error('Botões antigos do Auditor voltaram a aparecer: '+JSON.stringify(out));
 if(out.test?.ok!==true)throw new Error('Validação interna da ação única falhou: '+JSON.stringify(out));
 if(out.shellAuthority!=='93.82'||out.canonicalShell!==true)throw new Error('Autoridade do Shell foi quebrada: '+JSON.stringify(out));
 if(out.release!=='94.27'||out.last.version!=='94.27')throw new Error('Marcador do Auditor não está em 94.27: '+JSON.stringify(out));
 if(out.last.learning?.saved!==true)throw new Error('A rodada não foi salva como aprendizado: '+JSON.stringify(out));
 if(out.historyCount!==before.history+1)throw new Error('Histórico de aprendizado não cresceu em uma rodada: '+JSON.stringify({before,out}));
 if(!out.baseline?.at||out.baseline.at==='2000-01-01T00:00:00.000Z')throw new Error('Baseline não foi atualizada: '+JSON.stringify(out));
 if(out.daily?.kind!=='hlgb_auditor_daily_report'||out.last.daily?.kind!=='hlgb_auditor_daily_report')throw new Error('Relatório diário não foi criado: '+JSON.stringify(out));
 if(!out.downloadVisible)throw new Error('Download do relatório diário não ficou disponível no resultado: '+JSON.stringify(out));
 if(errors.some(x=>/auditor|9427/i.test(x)))throw new Error('pageerror relacionado ao Auditor: '+errors.join(' | '));
 console.log('AUDITOR_SINGLE_ACTION_V9427_OK',JSON.stringify({actions:out.actions,historyCount:out.historyCount,learning:out.last.learning,daily:{date:out.daily.date,runCount:out.daily.runCount},release:out.release}));
 await browser.close();
})().catch(async e=>{console.error(e);process.exit(1)});
