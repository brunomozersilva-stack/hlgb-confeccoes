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
 if(meta.saveWrapped)throw new Error('Auditor nao deve estar embrulhado como wrapper');
 await frame.evaluate(()=>window.openHlgbAuditor());
 await frame.waitForSelector('#hlgbSmartStatus',{timeout:10000});
 const visible=await frame.locator('.hlgb-auditor-actions button:visible').allTextContents();
 const normalized=visible.map(x=>x.replace(/\s+/g,' ').trim());
 for(const expected of ['Testar sistema','Registrar problema','Histórico']){
  if(!normalized.some(x=>x.includes(expected)))throw new Error('botao principal ausente: '+expected+'; visiveis='+normalized.join(' | '));
 }
 const legacy=await frame.locator('#hlgbAuditorBlackbox9299:visible,#hlgbAuditFull9315:visible,#hlgbAuditCritical9315:visible,#hlgbAuditDownloadFull9315:visible,#hlgbAuditDownloadCritical9315:visible').count();
 if(legacy)throw new Error('botoes legados ainda visiveis: '+legacy);
 if(errors.some(x=>/auditor|9360|9361/i.test(x)))throw new Error('erro WebKit relacionado ao Auditor: '+errors.join(' | '));
 console.log('AUDITOR_V9362_WEBKIT_OK',meta,normalized);
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
