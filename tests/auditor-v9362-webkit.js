const {webkit}=require('playwright');
(async()=>{
 const browser=await webkit.launch({headless:true});
 const page=await browser.newPage({viewport:{width:1280,height:900}});
 const errors=[];
 page.on('pageerror',e=>errors.push(String(e.message||e)));
 await page.goto('http://127.0.0.1:4173/teste-auditor-v9360.html',{waitUntil:'domcontentloaded',timeout:60000});
 await page.waitForFunction(()=>document.querySelector('#state')?.textContent?.includes('Auditor v93.60/93.61 carregado'),null,{timeout:60000});
 const frame=page.frames().find(f=>f!==page.mainFrame());
 if(!frame)throw new Error('iframe do sistema nao carregou');
 await frame.waitForFunction(()=>window.HLGB_AUDITOR_SMART_9360===true&&window.HLGB_AUDITOR_UI_COMPAT_9361,{timeout:30000});
 const meta=await frame.evaluate(()=>({version:window.hlgbAuditorSmart?.version,open:typeof window.openHlgbAuditor==='function',saveWrapped:!!window.hlgbAuditorSmart?.__original}));
 if(!meta.open)throw new Error('entrada do Auditor nao ficou disponivel');
 if(meta.version!=='93.62')throw new Error('versao inesperada do Auditor: '+meta.version);
 if(meta.saveWrapped)throw new Error('Auditor nao deve estar embrulhado como wrapper');
 await frame.evaluate(()=>{
  window.__auditorTestModalHtml='';
  window.openModal=(title,html)=>{
   window.__auditorTestModalHtml=html;
   let host=document.getElementById('hlgbAuditorTestHost');
   if(!host){host=document.createElement('div');host.id='hlgbAuditorTestHost';document.body.appendChild(host)}
   host.innerHTML=html;
  };
  window.closeModal=()=>{};
  window.openHlgbAuditor();
 });
 await frame.waitForSelector('#hlgbAuditorTestHost #hlgbSmartStatus',{timeout:10000});
 const visible=await frame.locator('#hlgbAuditorTestHost .hlgb-auditor-actions button:visible').allTextContents();
 const normalized=visible.map(x=>x.replace(/\s+/g,' ').trim());
 for(const expected of ['Testar sistema','Registrar problema','Histórico']){
  if(!normalized.some(x=>x.includes(expected)))throw new Error('botao principal ausente: '+expected+'; visiveis='+normalized.join(' | '));
 }
 if(normalized.length!==3)throw new Error('Auditor deve mostrar exatamente 3 acoes principais; visiveis='+normalized.join(' | '));
 await frame.evaluate(()=>{
  const host=document.getElementById('hlgbAuditorTestHost');
  host.insertAdjacentHTML('beforeend','<button id="hlgbAuditorBlackbox9299">legacy</button><button id="hlgbAuditFull9315">legacy</button><button id="hlgbAuditCritical9315">legacy</button><button id="hlgbAuditDownloadFull9315">legacy</button><button id="hlgbAuditDownloadCritical9315">legacy</button>');
 });
 const legacy=await frame.locator('#hlgbAuditorBlackbox9299:visible,#hlgbAuditFull9315:visible,#hlgbAuditCritical9315:visible,#hlgbAuditDownloadFull9315:visible,#hlgbAuditDownloadCritical9315:visible').count();
 if(legacy)throw new Error('botoes legados ainda visiveis: '+legacy);
 if(errors.some(x=>/auditor|9360|9361|9362/i.test(x)))throw new Error('erro WebKit relacionado ao Auditor: '+errors.join(' | '));
 console.log('AUDITOR_V9362_WEBKIT_OK',meta,normalized);
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
