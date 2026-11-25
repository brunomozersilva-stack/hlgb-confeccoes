const {webkit}=require('playwright');
(async()=>{
 const browser=await webkit.launch({headless:true});
 const page=await browser.newPage({viewport:{width:1280,height:900}});
 const errors=[];page.on('pageerror',e=>errors.push(String(e.message||e)));
 await page.goto('http://127.0.0.1:4173/app-stable3.html',{waitUntil:'domcontentloaded',timeout:60000});
 await page.waitForFunction(()=>!!document.getElementById('loginScreen')&&!!document.getElementById('appShell')&&window.HLGB_AUDITOR_BOOT_ANALYSIS_9381==='94.45'&&typeof window.hlgbAuditorBootAnalysis9381?.analyze==='function'&&!!window.hlgbAuditorAuthority9374,null,{timeout:60000});
 await page.evaluate(()=>{window.__HLGB_AUTH_READY=true;window.dispatchEvent(new Event('hlgb:authenticated'))});
 await page.waitForFunction(()=>window.HLGB_AUDITOR_SHELL_AUTHORITY==='93.82'&&typeof window.openHlgbAuditor==='function'&&!!document.getElementById('hlgbAuditorNavBtn'),null,{timeout:60000});
 await page.evaluate(()=>{
  const login=document.getElementById('loginScreen');if(login)login.style.setProperty('display','none','important');
  const app=document.getElementById('appShell');if(app){app.style.setProperty('display','block','important');app.style.setProperty('visibility','visible','important');app.style.setProperty('opacity','1','important')}
  const btn=document.getElementById('hlgbAuditorNavBtn');if(btn){document.body.appendChild(btn);Object.assign(btn.style,{display:'block',visibility:'visible',opacity:'1',position:'fixed',left:'20px',top:'20px',zIndex:'2147483647'})}
 });
 await page.click('#hlgbAuditorNavBtn',{timeout:10000});
 await page.waitForSelector('#hlgbSmartStatus',{state:'visible',timeout:10000});
 await page.waitForTimeout(500);
 await page.waitForSelector('#hlgbAuditorUnifiedRun9434A',{state:'visible',timeout:15000});
 const out=await page.evaluate(()=>{
  const status=document.getElementById('hlgbSmartStatus');
  const root=status?.closest?.('[role="dialog"],.modal,.modal-content,.modalCard,.modal-card,.dialog')||document.body;
  const visible=el=>{if(!el)return false;const s=getComputedStyle(el),r=el.getBoundingClientRect();return !el.hidden&&s.display!=='none'&&s.visibility!=='hidden'&&r.width>0&&r.height>0};
  return {authority:window.HLGB_AUDITOR_SHELL_AUTHORITY,buttons:[...root.querySelectorAll('.hlgb-auditor-actions button')].filter(visible).map(x=>x.id),legacy:['hlgbSmartTest','hlgbSmartProblem','hlgbSmartHistoryBtn','hlgbAuthorityBtn9374','hlgbBootAnalysisBtn9381','hlgbDailyReport9368'].filter(id=>visible(document.getElementById(id)))};
 });
 if(out.authority!=='93.82'||out.buttons.length!==1||out.buttons[0]!=='hlgbAuditorUnifiedRun9434A'||out.legacy.length)throw Error('Autoridade visual vigente incorreta '+JSON.stringify(out));
 // The current UI hides individual diagnostic buttons. Keep testing the
 // underlying report/export APIs, not resurrecting retired controls.
 const bootDownloadPromise=page.waitForEvent('download',{timeout:10000});
 await page.evaluate(()=>{const a=window.hlgbAuditorBootAnalysis9381,r=a.analyze();if(!r?.summary||!r?.timeline)throw Error('Relatório boot incompleto');a.download(r)});
 const bootDownload=await bootDownloadPromise;
 if(!/^hlgb-boot-cargas-.*\.json$/i.test(bootDownload.suggestedFilename()))throw Error('nome inesperado do download de boot: '+bootDownload.suggestedFilename());
 const archDownloadPromise=page.waitForEvent('download',{timeout:10000});
 await page.evaluate(()=>{const a=window.hlgbAuditorAuthority9374,r=a.scan();if(!r?.summary)throw Error('Relatório arquitetura incompleto');a.download(r)});
 const archDownload=await archDownloadPromise;
 if(!/^hlgb-arquitetura-autoridades-.*\.json$/i.test(archDownload.suggestedFilename()))throw Error('nome inesperado do download de arquitetura: '+archDownload.suggestedFilename());
 if(errors.some(x=>/auditor|9382|9374|9381/i.test(x)))throw new Error('pageerror relacionado ao Auditor: '+errors.join(' | '));
 console.log('AUDITOR_REPORT_DOWNLOADS_WEBKIT_OK',bootDownload.suggestedFilename(),archDownload.suggestedFilename());
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
