const {webkit}=require('playwright');
(async()=>{
 const browser=await webkit.launch({headless:true});
 const page=await browser.newPage({viewport:{width:1280,height:900}});
 const errors=[]; page.on('pageerror',e=>errors.push(String(e.message||e)));
 await page.goto('http://127.0.0.1:4173/app-stable3.html',{waitUntil:'domcontentloaded',timeout:60000});
 await page.waitForFunction(()=>window.HLGB_AUDITOR_SINGLE_UI_RECLAIM_9434A==='94.34a'&&typeof window.hlgbAuditorSingleAction9429?.run==='function',null,{timeout:60000});
 await page.evaluate(()=>{
  window.__HLGB_AUTH_READY=true; window.dispatchEvent(new Event('hlgb:authenticated'));
  const l=document.getElementById('loginScreen'); if(l)l.style.setProperty('display','none','important');
  const a=document.getElementById('appShell'); if(a){a.style.setProperty('display','block','important');a.style.setProperty('visibility','visible','important')}
 });
 await page.waitForFunction(()=>typeof window.openHlgbAuditor==='function',null,{timeout:15000});
 await page.evaluate(()=>{window.openHlgbAuditor();window.hlgbAuditorSingleUiReclaim9434A?.heal?.('single-ui-v9434a-test')});
 await page.waitForFunction(()=>{
  window.hlgbAuditorSingleUiReclaim9434A?.heal?.('single-ui-v9434a-wait');
  const b=document.getElementById('hlgbAuditorUnifiedRun9434A');if(!b)return false;
  const s=getComputedStyle(b),r=b.getBoundingClientRect();return !b.hidden&&s.display!=='none'&&s.visibility!=='hidden'&&r.width>0&&r.height>0;
 },null,{timeout:15000});
 await page.waitForTimeout(3500);
 const out=await page.evaluate(()=>{
  window.hlgbAuditorSingleUiReclaim9434A?.heal?.('single-ui-v9434a-final');
  const vis=el=>{if(!el)return false;const s=getComputedStyle(el),r=el.getBoundingClientRect();return !el.hidden&&s.display!=='none'&&s.visibility!=='hidden'&&r.width>0&&r.height>0};
  const one=document.getElementById('hlgbAuditorUnifiedRun9434A');
  const legacy=['hlgbAuditorNavBtn','hlgbSmartTest','hlgbSmartProblem','hlgbSmartHistoryBtn','hlgbAuthorityBtn9374','hlgbBootAnalysisBtn9381','hlgbAuditorIntelligenceBtn9396','hlgbAuditorBusinessBtn9401','hlgbDailyReport9368','hlgbAuditorUnifiedRun9429'];
  const legacyVisible=legacy.filter(id=>vis(document.getElementById(id)));
  const host=document.querySelector('.hlgb-auditor-actions');
  const visibleActions=host?[...host.querySelectorAll(':scope>button')].filter(vis).map(x=>x.id):[];
  return {one:vis(one),text:one?.textContent||'',legacyVisible,visibleActions,status:window.hlgbAuditorSingleUiReclaim9434A?.status?.()};
 });
 if(!out.one||!out.text.includes('Auditar sistema'))throw new Error('botão único ausente '+JSON.stringify(out));
 if(out.legacyVisible.length)throw new Error('botões antigos visíveis '+JSON.stringify(out));
 if(out.visibleActions.length!==1||out.visibleActions[0]!=='hlgbAuditorUnifiedRun9434A')throw new Error('mais de uma ação visível '+JSON.stringify(out));
 if(out.status?.version!=='94.34a'||out.status?.appBase!=='94.34')throw new Error('UI atual divergente '+JSON.stringify(out));
 if(errors.some(x=>/auditor|9434a|9429/i.test(x)))throw new Error(errors.join(' | '));
 console.log('AUDITOR_SINGLE_UI_V9434A_WEBKIT_OK',JSON.stringify(out));
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
