const {webkit}=require('playwright');
(async()=>{
 const browser=await webkit.launch({headless:true});
 const page=await browser.newPage({viewport:{width:1280,height:900}});
 const errors=[];page.on('pageerror',e=>errors.push(String(e.message||e)));
 await page.goto('http://127.0.0.1:4173/app-stable3.html',{waitUntil:'domcontentloaded',timeout:60000});
 await page.waitForFunction(()=>!!document.getElementById('loginScreen')&&!!document.getElementById('appShell')&&window.HLGB_AUDITOR_SINGLE_ACTION_9426==='94.26',null,{timeout:60000});
 await page.evaluate(()=>{window.__HLGB_AUTH_READY=true;window.dispatchEvent(new Event('hlgb:authenticated'))});
 await page.waitForFunction(()=>window.HLGB_AUDITOR_SHELL_AUTHORITY==='93.82'&&typeof window.openHlgbAuditor==='function'&&!!document.getElementById('hlgbAuditorNavBtn'),null,{timeout:60000});
 await page.evaluate(()=>{
  const login=document.getElementById('loginScreen');if(login)login.style.setProperty('display','none','important');
  const app=document.getElementById('appShell');if(app){app.style.setProperty('display','block','important');app.style.setProperty('visibility','visible','important');app.style.setProperty('opacity','1','important')}
  const btn=document.getElementById('hlgbAuditorNavBtn');if(btn){document.body.appendChild(btn);Object.assign(btn.style,{display:'block',visibility:'visible',opacity:'1',position:'fixed',left:'20px',top:'20px',zIndex:'2147483647'})}
 });
 await page.click('#hlgbAuditorNavBtn',{timeout:10000});
 await page.waitForSelector('#hlgbAuditorUnifiedRun9426',{state:'visible',timeout:10000});
 // Espera todos os decoradores tardios antigos tentarem rodar. A autoridade v94.26 deve continuar com uma ação só.
 await page.waitForTimeout(8000);
 const out=await page.evaluate(()=>{
   const status=document.getElementById('hlgbSmartStatus');
   const root=status?.closest?.('[role="dialog"],.modal,.modal-content,.modalCard,.modal-card,.dialog')||status?.parentElement?.parentElement||status?.parentElement||document.body;
   const visible=el=>{if(!el)return false;const s=getComputedStyle(el),r=el.getBoundingClientRect();return !el.hidden&&s.display!=='none'&&s.visibility!=='hidden'&&r.width>0&&r.height>0};
   const actions=[...root.querySelectorAll('.hlgb-auditor-actions button')].filter(visible).map(x=>({id:x.id,text:(x.textContent||'').trim()}));
   const legacyIds=['hlgbMultiuserOpen','hlgbSmartTest','hlgbSmartProblem','hlgbSmartHistoryBtn','hlgbAuthorityBtn9374','hlgbBootAnalysisBtn9381','hlgbAuditorIntelligenceBtn9396','hlgbAuditorBusinessBtn9401','hlgbDailyReport9368'];
   const legacyVisible=legacyIds.filter(id=>visible(root.querySelector('#'+id)));
   return {actions,legacyVisible,test:window.hlgbAuditorSingleAction9426?.validate?.(),shellAuthority:window.HLGB_AUDITOR_SHELL_AUTHORITY,canonicalShell:window.openHlgbAuditor===window.hlgbAuditorShell9382?.open,release:window.HLGB_AUDITOR_RELEASE_VERSION};
 });
 if(out.actions.length!==1||out.actions[0].id!=='hlgbAuditorUnifiedRun9426')throw new Error('Auditor deve ter exatamente uma ação visível: '+JSON.stringify(out));
 if(out.legacyVisible.length)throw new Error('Botões antigos do Auditor voltaram a aparecer: '+JSON.stringify(out));
 if(out.test?.ok!==true)throw new Error('Validação interna da ação única falhou: '+JSON.stringify(out));
 if(out.shellAuthority!=='93.82'||out.canonicalShell!==true)throw new Error('Autoridade do shell foi quebrada pela correção: '+JSON.stringify(out));
 if(out.release!=='94.26')throw new Error('Marcador do Auditor não está em 94.26: '+JSON.stringify(out));
 if(errors.some(x=>/auditor|9426/i.test(x)))throw new Error('pageerror relacionado ao Auditor: '+errors.join(' | '));
 console.log('AUDITOR_SINGLE_ACTION_V9426_OK',JSON.stringify(out));
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
