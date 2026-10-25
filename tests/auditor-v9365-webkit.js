const {webkit}=require('playwright');
(async()=>{
 const browser=await webkit.launch({headless:true});
 const page=await browser.newPage({viewport:{width:1280,height:900}});
 await page.goto('http://127.0.0.1:4173/app-stable3.html',{waitUntil:'domcontentloaded',timeout:60000});
 await page.waitForFunction(()=>!!document.getElementById('loginScreen')&&!!document.getElementById('appShell'),null,{timeout:60000});
 await page.evaluate(()=>{window.__HLGB_AUTH_READY=true;window.dispatchEvent(new Event('hlgb:authenticated'))});
 await page.waitForFunction(()=>!!window.hlgbInternalAuditor&&!!window.hlgbAuditorBlackbox9299&&!!window.hlgbOperationalAuditor9314,null,{timeout:60000});
 await page.evaluate(()=>{window.alert=()=>{};window.openModal=(title,html)=>{let h=document.getElementById('guardHost');if(!h){h=document.createElement('div');h.id='guardHost';document.body.appendChild(h)}h.innerHTML=html};window.closeModal=()=>{}});
 await page.evaluate(async()=>{const r=await fetch('/auditor-test-loader-v9365.js?fresh='+Date.now(),{cache:'no-store'});if(!r.ok)throw new Error('HTTP '+r.status);(0,eval)(await r.text())});
 await page.waitForFunction(()=>window.HLGB_AUDITOR_TEST_LOADER_9365===true&&window.hlgbAuditorSmart?.version==='93.63',null,{timeout:30000});
 await page.evaluate(()=>window.openHlgbAuditor());
 await page.waitForSelector('#guardHost #hlgbSmartStatus',{timeout:10000});
 await page.evaluate(()=>{
   const actions=document.querySelector('#guardHost .hlgb-auditor-actions');
   actions.insertAdjacentHTML('beforeend','<button id="legacy1">Debug máximo</button><button id="legacy2">Caixa-preta completa</button>');
   window.hlgbAuditorSmart?.enforceSimpleUi?.();
 });
 await page.waitForTimeout(400);
 const visible=(await page.locator('#guardHost .hlgb-auditor-actions button:visible').allTextContents()).map(x=>x.replace(/\s+/g,' ').trim());
 const core=['Testar sistema','Registrar problema','Histórico'];
 for(const x of core)if(!visible.some(v=>v.includes(x)))throw new Error('Botao oficial ausente: '+x+'; visiveis='+visible.join(' | '));
 // Extensões legítimas do Auditor podem acrescentar módulos. O guard visual não congela a lista;
 // ele garante os controles essenciais e bloqueia ações legadas/perigosas.
 const forbidden=['Debug máximo','Caixa-preta completa','Teste visual completo','Exportar diagnóstico de sincronização','Exportar diagnóstico sync','Blackbox do Auditor'];
 const bad=visible.filter(v=>forbidden.some(x=>v.includes(x)));
 if(bad.length)throw new Error('Botao legado/proibido ficou visivel: '+bad.join(' | '));
 const hiddenLegacy=await page.locator('#legacy1:visible,#legacy2:visible').count();if(hiddenLegacy)throw new Error('Botao legado ficou visivel');
 console.log('AUDITOR_V9365_WEBKIT_OK',visible);
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
