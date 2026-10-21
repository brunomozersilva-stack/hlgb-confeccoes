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
 const out=await page.evaluate(()=>({
   authority:window.HLGB_AUDITOR_SHELL_AUTHORITY,
   title:[...document.querySelectorAll('h1,h2,h3,.modal-title')].map(x=>x.textContent||'').join(' | '),
   text:document.body.innerText,
   hasSmart:!!document.getElementById('hlgbSmartTest'),
   hasProblem:!!document.getElementById('hlgbSmartProblem'),
   hasHistory:!!document.getElementById('hlgbSmartHistoryBtn'),
   hasArch:!!document.getElementById('hlgbAuthorityBtn9374'),
   hasBoot:!!document.getElementById('hlgbBootAnalysisBtn9381'),
   oldHub:[...document.querySelectorAll('button')].some(b=>/Diagnóstico profundo do Hub/i.test(b.textContent||'')),
   oldExport:[...document.querySelectorAll('button')].some(b=>/Exportar diagnóstico visual/i.test(b.textContent||''))
 }));
 if(out.authority!=='93.82'||!out.hasSmart||!out.hasProblem||!out.hasHistory||!out.hasArch||!out.hasBoot)throw new Error('interface atual incompleta '+JSON.stringify(out));
 if(out.oldHub||out.oldExport)throw new Error('controles legados reapareceram '+JSON.stringify(out));
 if(!/93\.82/.test(out.text))throw new Error('versão do shell não está visível');
 if(errors.some(x=>/auditor|9382/i.test(x)))throw new Error('pageerror relacionado ao Auditor: '+errors.join(' | '));
 console.log('AUDITOR_SHELL_V9382_WEBKIT_OK',out.authority);
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
