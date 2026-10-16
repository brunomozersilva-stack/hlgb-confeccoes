const {webkit}=require('playwright');
const path=require('path');
(async()=>{
 const browser=await webkit.launch({headless:true});
 const page=await browser.newPage({viewport:{width:1280,height:900}});
 const errors=[];page.on('pageerror',e=>errors.push(String(e.message||e)));
 await page.goto('http://127.0.0.1:4173/app-stable3.html',{waitUntil:'domcontentloaded',timeout:60000});
 // O app estável já carrega o Auditor de produção. Este teste agora valida a integração real
 // em vez de tentar injetar o loader antigo sobre um Smart já ativo.
 await page.waitForFunction(()=>window.hlgbAuditorProduction9369?.active===true&&window.hlgbAuditorSmart?.safariDownload?.version==='93.68'&&!!document.getElementById('hlgbAuditorNavBtn'),null,{timeout:60000});
 await page.evaluate(()=>{window.alert=()=>{};window.closeModal=()=>{};window.openModal=(title,html)=>{let h=document.getElementById('entry9368Host');if(!h){h=document.createElement('div');h.id='entry9368Host';h.setAttribute('role','dialog');document.body.appendChild(h)}h.innerHTML=html;window.__entry9368Title=title}});
 const safety=await page.evaluate(()=>window.hlgbAuditorProduction9369?.safety||{});
 for(const k of ['recordSave','cloudRequest','setInterval','setTimeout'])if(safety[k]!==true)throw new Error('Produção do Auditor alterou função crítica: '+k+' '+JSON.stringify(safety));
 await page.evaluate(()=>{const b=document.getElementById('hlgbAuditorNavBtn');b.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true}))});
 await page.waitForSelector('#entry9368Host #hlgbSmartStatus',{timeout:10000});
 const buttons=(await page.locator('#entry9368Host .hlgb-auditor-actions button:visible').allTextContents()).map(x=>x.replace(/\s+/g,' ').trim());
 if(buttons.length!==3)throw new Error('Produção abriu quantidade errada de ações: '+buttons.join(' | '));
 for(const expected of ['Testar sistema','Registrar problema','Histórico'])if(!buttons.some(x=>x.includes(expected)))throw new Error('Ação ausente: '+expected);
 if(errors.some(x=>/9368|auditor/i.test(x)))throw new Error('Erro WebKit relacionado ao Auditor: '+errors.join(' | '));

 const dl=await browser.newPage();
 await dl.setContent('<div id="hlgbAuditorResult"></div>');
 await dl.evaluate(()=>{window.hlgbInternalAuditor={redactDiagnostic:x=>x};window.hlgbAuditorSmart={problem:async()=>({kind:'hlgb_bug_capture',ok:true})};window.hlgbAuditorSmartProblem=window.hlgbAuditorSmart.problem;window.__beforeIntervals=window.setInterval});
 await dl.addScriptTag({path:path.join(process.cwd(),'release-auditor-safari-download-v9368.js')});
 await dl.waitForFunction(()=>window.hlgbAuditorSmart?.safariDownload?.version==='93.68',null,{timeout:10000});
 const sameInterval=await dl.evaluate(()=>window.__beforeIntervals===window.setInterval);
 if(!sameInterval)throw new Error('Entrega v93.68 alterou setInterval');
 await dl.evaluate(()=>window.hlgbAuditorSmartProblem());
 await dl.waitForSelector('#hlgbSafariDownload9368',{state:'visible',timeout:10000});
 const info=await dl.$eval('#hlgbSafariDownload9368',a=>({text:a.textContent,href:a.href,download:a.download}));
 if(!/Baixar diagnóstico/.test(info.text))throw new Error('Botão de download v93.68 não apareceu');
 if(!/^blob:/.test(info.href))throw new Error('Download v93.68 não usa Blob URL');
 if(!/^HLGB-PROBLEMA-/.test(info.download))throw new Error('Nome de arquivo v93.68 inválido: '+info.download);
 console.log('AUDITOR_V9368_PRODUCTION_WEBKIT_OK',safety,buttons,info.download);
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
