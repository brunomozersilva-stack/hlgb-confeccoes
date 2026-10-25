const {webkit}=require('playwright');
(async()=>{
 const browser=await webkit.launch({headless:true});
 const page=await browser.newPage({viewport:{width:1280,height:900}});
 const errors=[];page.on('pageerror',e=>errors.push(String(e.message||e)));
 await page.goto('http://127.0.0.1:4173/app-stable3.html',{waitUntil:'domcontentloaded',timeout:60000});
 /* Este é um harness local sem backend/login real. A partir da ponte v93.38,
    módulos pós-login só podem ser liberados pela autoridade explícita do produto. */
 await page.waitForFunction(()=>!!document.getElementById('loginScreen')&&!!document.getElementById('appShell'),null,{timeout:60000});
 await page.evaluate(()=>{window.__HLGB_AUTH_READY=true;window.dispatchEvent(new Event('hlgb:authenticated'))});
 await page.waitForFunction(()=>!!window.hlgbInternalAuditor&&!!window.hlgbAuditorBlackbox9299&&!!window.hlgbOperationalAuditor9314,null,{timeout:60000});
 await page.evaluate(()=>{window.alert=()=>{};window.openModal=(title,html)=>{let h=document.getElementById('remoteInjectHost');if(!h){h=document.createElement('div');h.id='remoteInjectHost';h.setAttribute('role','dialog');document.body.appendChild(h)}h.innerHTML=html};window.closeModal=()=>{}});
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
 await page.evaluate(()=>window.openHlgbAuditor());
 await page.waitForSelector('#remoteInjectHost #hlgbSmartStatus',{timeout:10000});
 const buttons=(await page.locator('#remoteInjectHost .hlgb-auditor-actions button:visible').allTextContents()).map(x=>x.replace(/\s+/g,' ').trim());
 const required=['Testar sistema','Registrar problema','Histórico'];
 if(required.some(label=>!buttons.some(x=>x.includes(label))))throw new Error('botoes base ausentes: '+buttons.join(' | '));
 // O carregador temporário precisa aceitar módulos legítimos adicionados ao Auditor ao longo do tempo.
 // O contrato de segurança permanece: botões essenciais continuam presentes, funções críticas não mudam
 // e ações legadas/proibidas não podem reaparecer.
 const forbidden=['Teste visual completo','Exportar diagnóstico de sincronização','Exportar diagnóstico sync','Blackbox do Auditor'];
 const bad=buttons.filter(text=>forbidden.some(label=>text.includes(label)));
 if(bad.length)throw new Error('botao legado/proibido visivel: '+bad.join(' | '));
 await page.evaluate(()=>{const h=document.getElementById('remoteInjectHost');h.insertAdjacentHTML('beforeend','<button id="oldExtra" onclick="hlgbAuditorExportSync()">Exportar diagnóstico sync</button>');window.hlgbAuditorSmart.enforceSimpleUi()});
 if(await page.locator('#oldExtra:visible').count())throw new Error('opcao antiga voltou a aparecer apos injecao');
 if(errors.some(x=>/auditor|9360|9361|9362|9363/i.test(x)))throw new Error('erro relacionado ao Auditor: '+errors.join(' | '));
 console.log('AUDITOR_V9363_SINGLE_LOADER_SAFE_OK',result,buttons);
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
