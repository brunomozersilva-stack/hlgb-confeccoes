const {webkit}=require('playwright');
(async()=>{
 const browser=await webkit.launch({headless:true});
 const page=await browser.newPage({viewport:{width:1280,height:900}});
 const errors=[];page.on('pageerror',e=>errors.push(String(e.message||e)));
 await page.goto('http://127.0.0.1:4173/app-stable3.html',{waitUntil:'domcontentloaded',timeout:60000});
 await page.waitForFunction(()=>!!document.getElementById('loginScreen')&&!!document.getElementById('appShell')&&window.HLGB_AUDITOR_SINGLE_ACTION_9429==='94.29',null,{timeout:60000});
 await page.evaluate(()=>{window.__HLGB_AUTH_READY=true;window.dispatchEvent(new Event('hlgb:authenticated'))});
 await page.waitForFunction(()=>!!window.hlgbInternalAuditor&&!!window.hlgbAuditorBlackbox9299&&!!window.hlgbOperationalAuditor9314&&window.HLGB_AUDITOR_SHELL_AUTHORITY==='93.82',null,{timeout:60000});
 await page.evaluate(()=>{window.alert=()=>{};window.openModal=(title,html)=>{let h=document.getElementById('remoteInjectHost');if(!h){h=document.createElement('div');h.id='remoteInjectHost';h.setAttribute('role','dialog');document.body.appendChild(h)}h.innerHTML=html};window.closeModal=()=>{};window.hlgbAuditorSingleAction9429.install()});
 await page.evaluate(()=>{window.__auditorCriticalBefore={recordSave:window.hlgbRecordSaveWithRetry,cloudRequest:window.cloudRequest,setInterval:window.setInterval,setTimeout:window.setTimeout}});
 await page.evaluate(async()=>{
  const r=await fetch('/auditor-test-loader-v9362.js?fresh='+Date.now(),{cache:'no-store'});if(!r.ok)throw new Error('HTTP '+r.status+' no loader local');const src=await r.text();(0,eval)(src);
 });
 await page.waitForFunction(()=>window.HLGB_AUDITOR_TEST_LOADER_9362===true&&window.hlgbAuditorSmart?.version==='93.63'&&!!window.HLGB_AUDITOR_UI_COMPAT_9361,null,{timeout:30000});
 const result=await page.evaluate(()=>({
  smart:window.HLGB_AUDITOR_SMART_9360===true,
  compat:window.HLGB_AUDITOR_UI_COMPAT_9361,
  version:window.hlgbAuditorSmart?.version,
  open:typeof window.openHlgbAuditor==='function',
  identities:{
   recordSave:window.__auditorCriticalBefore.recordSave===window.hlgbRecordSaveWithRetry,
   cloudRequest:window.__auditorCriticalBefore.cloudRequest===window.cloudRequest,
   setInterval:window.__auditorCriticalBefore.setInterval===window.setInterval,
   setTimeout:window.__auditorCriticalBefore.setTimeout===window.setTimeout
  }
 }));
 if(!result.smart||!result.compat||!result.open||result.version!=='93.63')throw new Error('loader temporario incompleto: '+JSON.stringify(result));
 for(const [name,same] of Object.entries(result.identities||{}))if(!same)throw new Error('loader alterou funcao critica: '+name);
 await page.evaluate(()=>{window.hlgbAuditorSingleAction9429.install();window.openHlgbAuditor();setTimeout(()=>window.hlgbAuditorSingleAction9429.canonicalize(),50)});
 await page.waitForSelector('#remoteInjectHost #hlgbSmartStatus',{timeout:10000});
 await page.waitForSelector('#remoteInjectHost #hlgbAuditorUnifiedRun9429',{state:'visible',timeout:10000});
 await page.waitForTimeout(1200);
 const buttons=await page.evaluate(()=>{
  const host=document.getElementById('remoteInjectHost');const visible=el=>{const s=getComputedStyle(el),r=el.getBoundingClientRect();return !el.hidden&&s.display!=='none'&&s.visibility!=='hidden'&&r.width>0&&r.height>0};
  return [...host.querySelectorAll('.hlgb-auditor-actions button')].filter(visible).map(x=>({id:x.id,text:(x.textContent||'').replace(/\s+/g,' ').trim()}));
 });
 if(buttons.length!==1||buttons[0].id!=='hlgbAuditorUnifiedRun9429')throw new Error('injeção antiga deve terminar com um único botão canônico: '+JSON.stringify(buttons));
 await page.evaluate(()=>{const h=document.getElementById('remoteInjectHost');h.insertAdjacentHTML('beforeend','<div class="hlgb-auditor-actions"><button id="oldExtra" onclick="hlgbAuditorExportSync()">Exportar diagnóstico sync</button></div>');window.hlgbAuditorSmart.enforceSimpleUi();window.hlgbAuditorSingleAction9429.canonicalize()});
 if(await page.locator('#oldExtra:visible').count())throw new Error('opcao antiga voltou a aparecer apos injecao');
 const canonical=await page.evaluate(()=>window.hlgbAuditorSingleAction9429.validate());
 if(canonical?.ok!==true)throw new Error('validação canônica falhou após injeção antiga: '+JSON.stringify(canonical));
 if(window?.unused){};
 if(errors.some(x=>/auditor|9360|9361|9362|9363|9429/i.test(x)))throw new Error('erro relacionado ao Auditor: '+errors.join(' | '));
 console.log('AUDITOR_LEGACY_REMOTE_INJECTION_SINGLE_ACTION_OK',result,buttons,canonical);
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});