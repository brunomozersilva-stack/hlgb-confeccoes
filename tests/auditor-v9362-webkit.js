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
 if(meta.version!=='93.63')throw new Error('versao inesperada do Auditor: '+meta.version);
 if(meta.saveWrapped)throw new Error('Auditor nao deve estar embrulhado como wrapper');
 await frame.evaluate(()=>{
  window.__auditorTestModalHtml='';
  window.openModal=(title,html)=>{
   window.__auditorTestModalHtml=html;
   let host=document.getElementById('hlgbAuditorTestHost');
   if(!host){host=document.createElement('div');host.id='hlgbAuditorTestHost';host.setAttribute('role','dialog');document.body.appendChild(host)}
   host.innerHTML=html;
  };
  window.closeModal=()=>{};
  window.openHlgbAuditor();
 });
 await frame.waitForSelector('#hlgbAuditorTestHost #hlgbSmartStatus',{timeout:10000});
 const visible=await frame.locator('#hlgbAuditorTestHost .hlgb-auditor-actions button:visible').evaluateAll(
  buttons=>buttons.map(x=>({id:x.id,text:(x.textContent||'').replace(/\s+/g,' ').trim()})));
 const normalized=visible.map(x=>x.text);
 // A autoridade em produção é o botão ÚNICO "Auditar e corrigir", não os
 // três botões de teste aposentados em v93.60. O teste deve reprovar se ele
 // desaparecer ou se outro controle de reparo ficar visível.
 if(visible.length!==1||visible[0].id!=='hlgbAuditorUnifiedRun9434A'||
   !visible[0].text.includes('Auditar e corrigir'))
  throw new Error('Botão único atual ausente: '+JSON.stringify(visible));
 const canonical=await frame.evaluate(()=>window.hlgbAuditorSingleUiReclaim9434A?.status?.()||null);
 if(!canonical?.buttonPresent||!canonical?.apiReady)
  throw new Error('Autoridade do Auditor não ficou pronta: '+JSON.stringify(canonical));
 const forbiddenVisible=['Teste visual completo','Exportar diagnóstico de sincronização','Blackbox do Auditor'];
 const forbiddenNow=normalized.filter(x=>forbiddenVisible.some(label=>x.includes(label)));
 if(forbiddenNow.length)throw new Error('acao legada/proibida apareceu no Auditor: '+forbiddenNow.join(' | '));
 await frame.evaluate(()=>{
  const host=document.getElementById('hlgbAuditorTestHost');
  host.insertAdjacentHTML('beforeend','<button id="legacyVisual" onclick="hlgbAuditorRunVisual()">Teste visual completo</button><button id="legacySync" onclick="hlgbAuditorExportSync()">Exportar diagnóstico de sincronização</button><button id="legacyBlackbox">Blackbox do Auditor</button>');
  window.hlgbAuditorSmart.enforceSimpleUi();
 });
 const legacy=await frame.locator('#legacyVisual:visible,#legacySync:visible,#legacyBlackbox:visible').count();
 if(legacy)throw new Error('botoes legados dinamicos ainda visiveis: '+legacy);
 if(errors.some(x=>/auditor|9360|9361|9362|9363/i.test(x)))throw new Error('erro WebKit relacionado ao Auditor: '+errors.join(' | '));
 console.log('AUDITOR_CURRENT_WEBKIT_OK',meta,visible,canonical);
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
