const {webkit}=require('playwright');
(async()=>{
 const browser=await webkit.launch({headless:true});
 const page=await browser.newPage({viewport:{width:1280,height:900}});
 const errors=[];page.on('pageerror',e=>errors.push(String(e.message||e)));
 await page.goto('http://127.0.0.1:4173/app-stable3.html',{waitUntil:'domcontentloaded',timeout:60000});
 await page.waitForFunction(()=>!!document.getElementById('loginScreen')&&!!document.getElementById('appShell')&&window.HLGB_AUDITOR_SINGLE_ACTION_9429==='94.29',null,{timeout:60000});
 await page.evaluate(()=>{window.__HLGB_AUTH_READY=true;window.dispatchEvent(new Event('hlgb:authenticated'))});
 await page.waitForFunction(()=>window.HLGB_AUDITOR_SHELL_AUTHORITY==='93.82'&&typeof window.openHlgbAuditor==='function'&&!!document.getElementById('hlgbAuditorNavBtn')&&typeof window.hlgbAuditorIntelligence9396?.currentMetrics==='function',null,{timeout:60000});
 await page.evaluate(()=>{
  const login=document.getElementById('loginScreen');if(login)login.style.setProperty('display','none','important');
  const app=document.getElementById('appShell');if(app){app.style.setProperty('display','block','important');app.style.setProperty('visibility','visible','important');app.style.setProperty('opacity','1','important')}
  const btn=document.getElementById('hlgbAuditorNavBtn');if(btn){document.body.appendChild(btn);Object.assign(btn.style,{display:'block',visibility:'visible',opacity:'1',position:'fixed',left:'20px',top:'20px',zIndex:'2147483647'})}
 });
 await page.click('#hlgbAuditorNavBtn',{timeout:10000});
 await page.waitForFunction(()=>{
   const visible=id=>{const el=document.getElementById(id);if(!el)return false;const s=getComputedStyle(el),r=el.getBoundingClientRect();return !el.hidden&&s.display!=='none'&&s.visibility!=='hidden'&&r.width>0&&r.height>0};
   return visible('hlgbAuditorIntelligenceBtn9396')&&visible('hlgbAuditorBusinessBtn9401')&&visible('hlgbDailyReport9368')&&!document.getElementById('hlgbAuditorUnifiedRun9429');
 },null,{timeout:10000});
 // Espera os antigos timers tardios do 94.29. O shell oficial deve continuar intacto.
 await page.waitForTimeout(15000);
 const before=await page.evaluate(()=>{
   const visible=id=>{const el=document.getElementById(id);if(!el)return false;const s=getComputedStyle(el),r=el.getBoundingClientRect();return !el.hidden&&s.display!=='none'&&s.visibility!=='hidden'&&r.width>0&&r.height>0};
   if(!visible('hlgbAuditorIntelligenceBtn9396')||!visible('hlgbAuditorBusinessBtn9401')||!visible('hlgbDailyReport9368')||document.getElementById('hlgbAuditorUnifiedRun9429'))throw new Error('Shell oficial foi alterado por timer tardio do 94.29');
   const metrics=window.hlgbAuditorIntelligence9396.currentMetrics();
   localStorage.setItem('hlgb_auditor_intelligence_baseline_v9396',JSON.stringify({at:'2000-01-01T00:00:00.000Z',appVersion:'seed',metrics:metrics.metrics}));
   localStorage.setItem('hlgb_auditor_learning_history_v9429',JSON.stringify([{at:'2000-01-01T00:00:00.000Z',metrics:{seed:1},comparison:{}}]));
   window.__HLGB_TEST_ORIGINAL_SMART_RUN=window.hlgbAuditorSmartRun;
   window.hlgbAuditorSmartRun=async()=>({
    status:'fail',
    summary:{pass:76,warn:2,fail:4,total:82,result:'Falhou'},
    operational:{
      summary:{pass:11,warn:3,fail:2,result:'Falhou'},
      pending:{records:2,wal:2,totalCopies:4,unique:2,duplicatedAcrossQueues:2},
      checks:[
       {code:'operational:pending',status:'warn',pending:{records:2,wal:2,totalCopies:4,unique:2,duplicatedAcrossQueues:2}},
       {code:'operational:delivery',status:'fail',detail:'Há pendências, mas nenhuma confirmação aparece ativa.'},
       {code:'operational:saving-ui',status:'fail',detail:'Alterações aguardando confirmação sem envio ativo.'}
      ]
    },
    testStub:true
   });
   return {history:JSON.parse(localStorage.getItem('hlgb_auditor_learning_history_v9429')||'[]').length};
 });
 await page.evaluate(()=>window.hlgbAuditorSingleAction9429.run());
 await page.waitForFunction(()=>!!window.HLGB_AUDITOR_SINGLE_ACTION_LAST?.daily,null,{timeout:60000});
 const out=await page.evaluate(()=>{
   if(window.__HLGB_TEST_ORIGINAL_SMART_RUN)window.hlgbAuditorSmartRun=window.__HLGB_TEST_ORIGINAL_SMART_RUN;
   const status=document.getElementById('hlgbSmartStatus');
   const root=status?.closest?.('[role="dialog"],.modal,.modal-content,.modalCard,.modal-card,.dialog')||status?.parentElement?.parentElement||status?.parentElement||document.body;
   const visible=el=>{if(!el)return false;const s=getComputedStyle(el),r=el.getBoundingClientRect();return !el.hidden&&s.display!=='none'&&s.visibility!=='hidden'&&r.width>0&&r.height>0};
   const officialIds=['hlgbSmartTest','hlgbSmartProblem','hlgbSmartHistoryBtn','hlgbAuthorityBtn9374','hlgbBootAnalysisBtn9381','hlgbAuditorIntelligenceBtn9396','hlgbAuditorBusinessBtn9401','hlgbDailyReport9368'];
   const officialVisible=officialIds.filter(id=>visible(root.querySelector('#'+id)));
   const retiredIds=['hlgbAuditorUnifiedRun9426','hlgbAuditorUnifiedRun9427','hlgbAuditorMaxDebug9292','hlgbAuditorBlackbox9299','hlgbAuditFull9315','hlgbAuditCritical9315','hlgbAuditDownloadFull9315','hlgbAuditDownloadCritical9315','hlgbAuditorHubDeep9315'];
   const retiredVisible=retiredIds.filter(id=>visible(root.querySelector('#'+id)));
   const history=JSON.parse(localStorage.getItem('hlgb_auditor_learning_history_v9429')||'[]');
   const baseline=JSON.parse(localStorage.getItem('hlgb_auditor_intelligence_baseline_v9396')||'null');
   const daily=JSON.parse(localStorage.getItem('hlgb_auditor_daily_report_latest_v9429')||'null');
   const last=window.HLGB_AUDITOR_SINGLE_ACTION_LAST;
   return {officialVisible,retiredVisible,ownPresent:!!document.getElementById('hlgbAuditorUnifiedRun9429'),historyCount:history.length,baseline,daily,last:{version:last?.version,learning:last?.deep?.learning,daily:last?.daily},test:window.hlgbAuditorSingleAction9429?.validate?.(),shellAuthority:window.HLGB_AUDITOR_SHELL_AUTHORITY,canonicalShell:window.openHlgbAuditor===window.hlgbAuditorShell9382?.open,release:window.HLGB_AUDITOR_RELEASE_VERSION,appRelease:window.HLGB_RELEASE_VERSION,downloadVisible:visible(root.querySelector('#hlgbAuditorDailyDownload9429'))};
 });
 for(const id of ['hlgbAuditorIntelligenceBtn9396','hlgbAuditorBusinessBtn9401','hlgbDailyReport9368'])if(!out.officialVisible.includes(id))throw new Error('Controle oficial ausente no shell 93.82: '+id+' '+JSON.stringify(out));
 if(out.ownPresent)throw new Error('O 94.29 não pode criar interface própria quando o shell 93.82 está ativo: '+JSON.stringify(out));
 if(out.retiredVisible.length)throw new Error('Controles realmente aposentados voltaram a aparecer: '+JSON.stringify(out));
 if(out.test?.ok!==true||out.test?.mode!=='headless'||out.test?.headless!==true)throw new Error('Validação headless do 94.29 falhou: '+JSON.stringify(out));
 if(out.shellAuthority!=='93.82'||out.canonicalShell!==true)throw new Error('Autoridade do Shell foi quebrada: '+JSON.stringify(out));
 if(out.release!=='94.29'||out.last.version!=='94.29'||Number(out.appRelease)<94.29)throw new Error('Versão não foi alinhada: '+JSON.stringify(out));
 if(out.last.learning?.saved!==true)throw new Error('A rodada não foi salva como aprendizado: '+JSON.stringify(out));
 if(out.historyCount!==before.history+1)throw new Error('Histórico de aprendizado não cresceu em uma rodada: '+JSON.stringify({before,out}));
 if(!out.baseline?.at||out.baseline.at==='2000-01-01T00:00:00.000Z')throw new Error('Baseline não foi atualizada: '+JSON.stringify(out));
 if(out.daily?.kind!=='hlgb_auditor_daily_report'||out.daily?.version!=='94.29'||out.daily?.appVersion!=='94.29')throw new Error('Relatório diário/versionamento incorreto: '+JSON.stringify(out));
 if(out.daily?.operations?.summary?.pass!==11||out.daily?.operations?.summary?.warn!==3||out.daily?.operations?.summary?.fail!==2)throw new Error('Resumo operacional não entrou no relatório diário: '+JSON.stringify(out.daily?.operations));
 if(out.daily?.health?.pendingUnique!==2||out.daily?.health?.pendingRecords!==2||out.daily?.health?.pendingWal!==2)throw new Error('Pendências reais não entraram no relatório diário: '+JSON.stringify(out.daily?.health));
 if(out.daily?.health?.deliveryStatus!=='fail'||out.daily?.health?.savingUiStatus!=='fail')throw new Error('Falhas de entrega/salvamento não foram propagadas ao diário: '+JSON.stringify(out.daily?.health));
 if(!out.downloadVisible)throw new Error('Download do relatório diário não ficou disponível no resultado: '+JSON.stringify(out));
 if(errors.some(x=>/auditor|9429/i.test(x)))throw new Error('pageerror relacionado ao Auditor: '+errors.join(' | '));
 console.log('AUDITOR_SINGLE_ACTION_V9429_HEADLESS_OK',JSON.stringify({officialVisible:out.officialVisible,historyCount:out.historyCount,operations:out.daily.operations,health:out.daily.health,release:out.release,mode:out.test.mode}));
 await browser.close();
})().catch(async e=>{console.error(e);process.exit(1)});