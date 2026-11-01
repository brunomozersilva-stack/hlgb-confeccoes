const {webkit}=require('playwright');
(async()=>{
 const browser=await webkit.launch({headless:true});
 const page=await browser.newPage({viewport:{width:1280,height:900}});
 const errors=[];page.on('pageerror',e=>errors.push(String(e.message||e)));
 await page.goto('http://127.0.0.1:4173/app-stable3.html',{waitUntil:'domcontentloaded',timeout:60000});
 await page.waitForFunction(()=>!!document.getElementById('loginScreen')&&!!document.getElementById('appShell')&&window.hlgbAuditorIntelligence9396?.version==='93.98'&&window.HLGB_AUDITOR_SINGLE_UI_RECLAIM_9434A==='94.34a'&&typeof window.hlgbAuditorSingleAction9429?.run==='function',null,{timeout:60000});
 await page.evaluate(()=>{window.__HLGB_AUTH_READY=true;window.dispatchEvent(new Event('hlgb:authenticated'));const l=document.getElementById('loginScreen');if(l)l.style.setProperty('display','none','important');const a=document.getElementById('appShell');if(a){a.style.setProperty('display','block','important');a.style.setProperty('visibility','visible','important');a.style.setProperty('opacity','1','important')}});
 await page.waitForFunction(()=>window.HLGB_AUDITOR_SHELL_AUTHORITY==='93.82'&&typeof window.openHlgbAuditor==='function'&&!!document.getElementById('hlgbAuditorNavBtn'),null,{timeout:60000});
 await page.evaluate(()=>{const btn=document.getElementById('hlgbAuditorNavBtn');if(btn){document.body.appendChild(btn);Object.assign(btn.style,{display:'block',visibility:'visible',opacity:'1',position:'fixed',left:'20px',top:'20px',zIndex:'2147483647'})}});
 await page.click('#hlgbAuditorNavBtn',{timeout:10000});
 await page.waitForSelector('#hlgbSmartStatus',{state:'visible',timeout:10000});
 await page.waitForFunction(()=>{window.hlgbAuditorSingleUiReclaim9434A?.heal?.('test-v9398');const b=document.getElementById('hlgbAuditorUnifiedRun9434A');if(!b)return false;const s=getComputedStyle(b),r=b.getBoundingClientRect();return !b.hidden&&s.display!=='none'&&s.visibility!=='hidden'&&r.width>0&&r.height>0},null,{timeout:10000});

 const ui=await page.evaluate(()=>{
  window.hlgbAuditorSingleUiReclaim9434A?.heal?.('test-ui');
  const actions=document.querySelector('.hlgb-auditor-actions');
  const shown=[...(actions?.querySelectorAll?.(':scope > button')||[])].filter(el=>{const s=getComputedStyle(el),r=el.getBoundingClientRect();return !el.hidden&&s.display!=='none'&&s.visibility!=='hidden'&&r.width>0&&r.height>0}).map(el=>({id:el.id||'',text:String(el.textContent||'').trim()}));
  const legacy=['hlgbSmartTest','hlgbSmartProblem','hlgbSmartHistoryBtn','hlgbAuthorityBtn9374','hlgbBootAnalysisBtn9381','hlgbAuditorIntelligenceBtn9396','hlgbDailyReport9368','hlgbAuditorBusinessBtn9401'];
  const unified=document.getElementById('hlgbAuditorUnifiedRun9434A');
  return {shown,legacyVisible:legacy.filter(id=>shown.some(x=>x.id===id)),unifiedVisible:shown.some(x=>x.id==='hlgbAuditorUnifiedRun9434A'),unifiedText:String(unified?.textContent||'').trim(),unifiedHandler:typeof unified?.onclick==='function',authority:window.HLGB_AUDITOR_SHELL_AUTHORITY,openerIsShell:window.openHlgbAuditor===window.hlgbAuditorShell9382?.open,reclaim:window.hlgbAuditorSingleUiReclaim9434A?.status?.()||null};
 });
 if(ui.shown.length!==1||!ui.unifiedVisible||ui.unifiedText!=='🧪 Auditar e corrigir'||!ui.unifiedHandler||ui.legacyVisible.length||ui.authority!=='93.82'||!ui.openerIsShell)throw new Error('Auditor atual não está em ação única '+JSON.stringify(ui));

 // A Inteligência continua ativa por trás da ação única; o botão legado deve permanecer oculto.
 const intelligence=await page.evaluate(async()=>{
  const report=await window.hlgbAuditorIntelligence9396.collect({saveBaseline:false});
  return {version:window.hlgbAuditorIntelligence9396?.version||'',status:report?.status||'',hasSaveChain:!!report?.current?.saveChain&&Number.isFinite(Number(report.current.saveChain.depth))&&Array.isArray(report.current.saveChain.duplicateResponsibilities),hasProjectionIntegrity:!!report?.current?.projectionIntegrity&&Number.isFinite(Number(report.current.projectionIntegrity.count))&&Number.isFinite(Number(report.current.projectionIntegrity.unresolved)),metrics:report?.current?.metrics||null,duplicateScripts:report?.current?.duplicateScripts||[],repeatedRequests:report?.current?.repeatedScriptRequests||[]};
 });
 if(intelligence.version!=='93.98'||!intelligence.hasSaveChain||!intelligence.hasProjectionIntegrity)throw new Error('Inteligência v93.98 não está disponível por trás do Auditor único '+JSON.stringify(intelligence));
 if(!Object.prototype.hasOwnProperty.call(intelligence.metrics||{},'saveDuplicateResponsibilities')||!Object.prototype.hasOwnProperty.call(intelligence.metrics||{},'projectionOrphans')||!Object.prototype.hasOwnProperty.call(intelligence.metrics||{},'projectionOrphansUnresolved'))throw new Error('métricas de Inteligência ausentes '+JSON.stringify(intelligence.metrics));

 // Garante estabilidade do único botão no WebKit durante a janela em que os botões antigos piscavam.
 const stability=await page.evaluate(async()=>{const samples=[];for(let i=0;i<100;i++){window.hlgbAuditorSingleUiReclaim9434A?.heal?.('stability-'+i);const all=[...document.querySelectorAll('#hlgbAuditorUnifiedRun9434A')],b=all[0],s=b?getComputedStyle(b):null,r=b?.getBoundingClientRect();samples.push({count:all.length,hidden:b?.hidden??null,display:s?.display||'',visibility:s?.visibility||'',width:r?.width||0,height:r?.height||0,handler:typeof b?.onclick==='function'});await new Promise(r=>setTimeout(r,40))}return samples});
 const bad=stability.filter(x=>x.count!==1||x.hidden||x.display==='none'||x.visibility==='hidden'||x.width<=0||x.height<=0||!x.handler);
 if(bad.length)throw new Error('botão único do Auditor piscou/sumiu ou duplicou '+JSON.stringify({bad:bad.slice(0,12),last:stability.at(-1)}));

 // O relatório diário permanece acessível pela API da ação única, sem recriar botão legado separado.
 const daily=await page.evaluate(()=>{window.HLGB_RELEASE_VERSION='94.38';const main={summary:{pass:1,warn:0,fail:0},operational:{summary:{pass:1,warn:0,fail:0},checks:[]}};const deep={authority:{status:'pass',summary:{}},boot:{status:'pass',summary:{}},business:{status:'pass',summary:{}},intelligence:{status:'pass',freshness:{status:'fresh'},comparison:{available:false,summary:{}},current:{at:new Date().toISOString(),appVersion:'94.38',metrics:{saveDuplicateResponsibilities:0,projectionOrphans:0,projectionOrphansUnresolved:0},queues:{},duplicateScripts:[],projectionIntegrity:{count:0,unresolved:0}}},learning:{saved:true,historyAfter:1}};const report=window.hlgbAuditorSingleAction9429.buildDailyReport(main,deep);return {kind:report?.kind||'',date:report?.date||'',appVersion:report?.appVersion||'',auditorVersion:report?.auditorVersion||'',legacyDailyVisible:(()=>{const e=document.getElementById('hlgbDailyReport9368');if(!e)return false;const s=getComputedStyle(e),r=e.getBoundingClientRect();return !e.hidden&&s.display!=='none'&&s.visibility!=='hidden'&&r.width>0&&r.height>0})()}});
 if(daily.kind!=='hlgb_auditor_daily_report'||daily.legacyDailyVisible)throw new Error('relatório diário não está integrado à ação única '+JSON.stringify(daily));

 await page.screenshot({path:'/tmp/hlgb-auditor-inteligencia-webkit.png',fullPage:true});
 if(errors.some(x=>/auditor|9396|9398|9434|9438|intelig/i.test(x)))throw new Error('pageerror relacionado ao Auditor: '+errors.join(' | '));
 console.log('AUDITOR_INTELLIGENCE_BUTTON_WEBKIT_V9398_OK',JSON.stringify({ui,intelligence:{version:intelligence.version,metrics:intelligence.metrics,duplicateScripts:intelligence.duplicateScripts,repeatedRequests:intelligence.repeatedRequests},daily,samples:stability.length}));
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
