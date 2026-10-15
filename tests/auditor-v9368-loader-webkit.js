const {webkit}=require('playwright');
(async()=>{
 const browser=await webkit.launch({headless:true});
 const page=await browser.newPage({viewport:{width:1280,height:900}});
 const errors=[];page.on('pageerror',e=>errors.push(String(e.message||e)));
 await page.goto('http://127.0.0.1:4173/app-stable3.html',{waitUntil:'domcontentloaded',timeout:60000});
 await page.waitForFunction(()=>!!window.hlgbInternalAuditor&&!!window.hlgbAuditorBlackbox9299&&!!window.hlgbOperationalAuditor9314&&!!document.getElementById('hlgbAuditorNavBtn'),null,{timeout:60000});
 await page.evaluate(()=>{window.alert=()=>{};window.closeModal=()=>{};window.openModal=(title,html)=>{let h=document.getElementById('entry9368Host');if(!h){h=document.createElement('div');h.id='entry9368Host';h.setAttribute('role','dialog');document.body.appendChild(h)}h.innerHTML=html;window.__entry9368Title=title};window.__before9368={recordSave:window.hlgbRecordSaveWithRetry,cloudRequest:window.cloudRequest,setInterval:window.setInterval,setTimeout:window.setTimeout}});
 await page.evaluate(async()=>{const r=await fetch('/auditor-test-loader-v9368.js?fresh='+Date.now(),{cache:'no-store'});if(!r.ok)throw new Error('HTTP '+r.status+' loader v93.68');(0,eval)(await r.text())});
 await page.waitForFunction(()=>window.HLGB_AUDITOR_TEST_LOADER_9368===true&&window.hlgbAuditorSmart?.safariDownload?.version==='93.68',null,{timeout:30000});
 const safety=await page.evaluate(()=>({recordSave:window.__before9368.recordSave===window.hlgbRecordSaveWithRetry,cloudRequest:window.__before9368.cloudRequest===window.cloudRequest,setInterval:window.__before9368.setInterval===window.setInterval,setTimeout:window.__before9368.setTimeout===window.setTimeout}));
 for(const [k,v] of Object.entries(safety))if(!v)throw new Error('Loader v93.68 alterou função crítica: '+k);
 await page.evaluate(()=>{const b=document.getElementById('hlgbAuditorNavBtn');b.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true}))});
 await page.waitForSelector('#entry9368Host #hlgbSmartStatus',{timeout:10000});
 const buttons=(await page.locator('#entry9368Host .hlgb-auditor-actions button:visible').allTextContents()).map(x=>x.replace(/\s+/g,' ').trim());
 if(buttons.length!==3)throw new Error('v93.68 abriu quantidade errada de ações: '+buttons.join(' | '));
 for(const expected of ['Testar sistema','Registrar problema','Histórico'])if(!buttons.some(x=>x.includes(expected)))throw new Error('Ação ausente v93.68: '+expected);
 await page.evaluate(()=>{window.hlgbAuditorSmart.problem=async()=>({kind:'hlgb_bug_capture',ok:true});window.__hlgbBaseProblem9368=null;const src=require?null:null});
 // valida o download pela função já instalada, substituindo apenas a base capturada não é seguro; chama a função real do Auditor.
 await page.evaluate(()=>window.hlgbAuditorSmartProblem());
 await page.waitForSelector('#hlgbSafariDownload9368',{state:'visible',timeout:15000});
 const info=await page.$eval('#hlgbSafariDownload9368',a=>({text:a.textContent,href:a.href,download:a.download}));
 if(!/Baixar diagnóstico/.test(info.text))throw new Error('Botão de download v93.68 não apareceu');
 if(!/^blob:/.test(info.href))throw new Error('Download v93.68 não usa Blob URL');
 if(!/^HLGB-PROBLEMA-/.test(info.download))throw new Error('Nome de arquivo v93.68 inválido: '+info.download);
 if(errors.some(x=>/9368|auditor/i.test(x)))throw new Error('Erro WebKit relacionado ao Auditor v93.68: '+errors.join(' | '));
 console.log('AUDITOR_V9368_ISOLATED_WEBKIT_OK',safety,buttons,info.download);
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
