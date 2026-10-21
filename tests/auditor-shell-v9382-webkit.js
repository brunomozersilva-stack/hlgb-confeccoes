const {webkit}=require('playwright');
(async()=>{
 const browser=await webkit.launch({headless:true});
 const page=await browser.newPage({viewport:{width:1280,height:900}});
 const errors=[];page.on('pageerror',e=>errors.push(String(e.message||e)));
 await page.goto('http://127.0.0.1:4173/app-stable3.html',{waitUntil:'domcontentloaded',timeout:60000});
 await page.waitForFunction(()=>!!document.getElementById('loginScreen')&&!!document.getElementById('appShell')&&window.HLGB_AUDITOR_BOOT_ANALYSIS_9381==='93.81',null,{timeout:60000});
 await page.evaluate(()=>{window.__HLGB_AUTH_READY=true;window.dispatchEvent(new Event('hlgb:authenticated'))});
 await page.waitForFunction(()=>window.HLGB_AUDITOR_SHELL_AUTHORITY==='93.82'&&typeof window.openHlgbAuditor==='function'&&!!document.getElementById('hlgbAuditorNavBtn'),null,{timeout:60000});
 await page.evaluate(()=>{
  const login=document.getElementById('loginScreen');if(login)login.style.setProperty('display','none','important');
  const btn=document.getElementById('hlgbAuditorNavBtn');if(btn){document.body.appendChild(btn);Object.assign(btn.style,{display:'block',visibility:'visible',opacity:'1',position:'fixed',left:'20px',top:'20px',zIndex:'2147483647'})}
 });
 await page.click('#hlgbAuditorNavBtn',{timeout:10000});
 await page.waitForSelector('#hlgbSmartStatus',{state:'visible',timeout:10000});
 await page.waitForTimeout(500);
 const out=await page.evaluate(()=>{
   const status=document.getElementById('hlgbSmartStatus');
   const root=status?.closest?.('[role="dialog"],.modal,.modal-content,.modalCard,.modal-card,.dialog')||status?.parentElement?.parentElement||status?.parentElement||document.body;
   const visible=id=>{const el=root.querySelector('#'+id);if(!el)return false;const s=getComputedStyle(el),r=el.getBoundingClientRect();return !el.hidden&&s.display!=='none'&&s.visibility!=='hidden'&&r.width>0&&r.height>0};
   return {
    authority:window.HLGB_AUDITOR_SHELL_AUTHORITY,
    modalText:root.innerText,
    hasSmart:visible('hlgbSmartTest'),
    hasProblem:visible('hlgbSmartProblem'),
    hasHistory:visible('hlgbSmartHistoryBtn'),
    hasArch:visible('hlgbAuthorityBtn9374'),
    hasBoot:visible('hlgbBootAnalysisBtn9381'),
    oldHub:[...root.querySelectorAll('button')].some(b=>!b.hidden&&/Diagnóstico profundo do Hub/i.test(b.textContent||'')),
    oldExport:[...root.querySelectorAll('button')].some(b=>!b.hidden&&/Exportar diagnóstico visual/i.test(b.textContent||''))
   };
 });
 if(out.authority!=='93.82'||!out.hasSmart||!out.hasProblem||!out.hasHistory||!out.hasArch||!out.hasBoot)throw new Error('interface atual incompleta '+JSON.stringify(out));
 if(out.oldHub||out.oldExport)throw new Error('controles legados visíveis no modal atual '+JSON.stringify(out));
 if(!/93\.82/.test(out.modalText)||!/Boot \/ cargas/.test(out.modalText)||!/Arquitetura \/ versões/.test(out.modalText))throw new Error('interface atual não ficou visível '+JSON.stringify(out));
 if(errors.some(x=>/auditor|9382/i.test(x)))throw new Error('pageerror relacionado ao Auditor: '+errors.join(' | '));
 console.log('AUDITOR_SHELL_V9382_WEBKIT_OK',out.authority);
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
