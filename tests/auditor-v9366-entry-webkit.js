const {webkit}=require('playwright');
(async()=>{
 const browser=await webkit.launch({headless:true});
 const page=await browser.newPage({viewport:{width:1280,height:900}});
 const errors=[];page.on('pageerror',e=>errors.push(String(e.message||e)));
 await page.goto('http://127.0.0.1:4173/app-stable3.html',{waitUntil:'domcontentloaded',timeout:60000});
 await page.waitForFunction(()=>!!document.getElementById('loginScreen')&&!!document.getElementById('appShell'),null,{timeout:60000});
 await page.evaluate(()=>{window.__HLGB_AUTH_READY=true;window.dispatchEvent(new Event('hlgb:authenticated'))});
 await page.waitForFunction(()=>!!window.hlgbInternalAuditor&&!!window.hlgbAuditorBlackbox9299&&!!window.hlgbOperationalAuditor9314&&!!document.getElementById('hlgbAuditorNavBtn'),null,{timeout:60000});
 await page.evaluate(()=>{window.alert=()=>{};window.closeModal=()=>{};window.openModal=(title,html)=>{let h=document.getElementById('entry9366Host');if(!h){h=document.createElement('div');h.id='entry9366Host';h.setAttribute('role','dialog');document.body.appendChild(h)}h.innerHTML=html;window.__entry9366Title=title}});
 await page.evaluate(async()=>{const r=await fetch('/auditor-test-loader-v9366.js?fresh='+Date.now(),{cache:'no-store'});if(!r.ok)throw new Error('HTTP '+r.status+' loader v93.66');(0,eval)(await r.text())});
 await page.waitForFunction(()=>window.HLGB_AUDITOR_TEST_LOADER_9366===true&&document.querySelector('[data-hlgb-smart-entry="93.66"]'),null,{timeout:30000});
 await page.evaluate(()=>{const b=document.getElementById('hlgbAuditorNavBtn');if(!b||typeof b.onclick!=='function')throw new Error('onclick do botão real não foi ligado');b.onclick.call(b,new MouseEvent('click',{bubbles:true}))});
 await page.waitForSelector('#entry9366Host #hlgbSmartStatus',{timeout:10000});
 const buttons=(await page.locator('#entry9366Host .hlgb-auditor-actions button:visible').allTextContents()).map(x=>x.replace(/\s+/g,' ').trim());
 const core=['Testar sistema','Registrar problema','Histórico'];
 for(const expected of core)if(!buttons.some(x=>x.includes(expected)))throw new Error('Ação ausente no clique real: '+expected+'; '+buttons.join(' | '));
 // A entrada real pode ganhar novos módulos (multiusuário, inteligência, expansão, WhatsApp...).
 // O teste deve proteger o contrato essencial e impedir o retorno de ações antigas, sem congelar a UI.
 const forbidden=['Teste visual completo','Exportar diagnóstico de sincronização','Exportar diagnóstico sync','Blackbox do Auditor'];
 const bad=buttons.filter(text=>forbidden.some(label=>text.includes(label)));
 if(bad.length)throw new Error('Clique real exibiu ação legada/proibida: '+bad.join(' | ')+'; '+buttons.join(' | '));
 if(!/Auditor HLGB/i.test(String(await page.evaluate(()=>window.__entry9366Title||''))))throw new Error('Clique real não abriu o Auditor novo');
 if(errors.some(x=>/9366|auditor/i.test(x)))throw new Error('Erro WebKit relacionado ao Auditor: '+errors.join(' | '));
 console.log('AUDITOR_V9366_REAL_ENTRY_WEBKIT_OK',buttons);
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
