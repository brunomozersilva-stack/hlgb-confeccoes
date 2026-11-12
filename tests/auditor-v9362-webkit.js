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
 // O harness v93.60 roda sobre o aplicativo atual: a autoridade canônica
 // deve ficar pronta antes de abrir, mesmo quando os scripts legados entram depois.
 await frame.waitForFunction(()=>typeof window.hlgbAuditorSingleUiReclaim9434A?.heal==='function'&&
  typeof window.hlgbAuditorSingleAction9429?.run==='function',null,{timeout:30000});
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
  window.hlgbAuditorSingleUiReclaim9434A.heal('webkit-legacy-iframe-open');
 });
 await frame.waitForSelector('#hlgbAuditorTestHost #hlgbSmartStatus',{timeout:10000});
 await frame.waitForSelector('#hlgbAuditorTestHost #hlgbAuditorUnifiedRun9434A',
  {state:'visible',timeout:15000});
 const visible=await frame.locator('#hlgbAuditorTestHost .hlgb-auditor-actions button:visible').evaluateAll(
  buttons=>buttons.map(x=>({id:x.id,text:(x.textContent||'').replace(/\s+/g,' ').trim()})));
 const normalized=visible.map(x=>x.text);
 // O harness é legado, mas a UI visível precisa obedecer ao contrato
 // atual: apenas o botão de ação única. Não aceitar regressão silenciosa.
 const canonical=await frame.evaluate(()=>window.hlgbAuditorSingleUiReclaim9434A?.status?.()||null);
 const current=visible.find(x=>x.id==='hlgbAuditorUnifiedRun9434A');
 if(!current||visible.length!==1||!current.text.includes('Auditar e corrigir')||
    !canonical?.buttonPresent||!canonical?.apiReady||!canonical?.observerActive)
  throw new Error('Botão canônico não está isolado no harness legado: '+JSON.stringify({visible,canonical}));
 const forbiddenVisible=['Teste visual completo','Exportar diagnóstico de sincronização','Blackbox do Auditor'];
 const forbiddenNow=normalized.filter(x=>forbiddenVisible.some(label=>x.includes(label)));
 if(forbiddenNow.length)throw new Error('acao legada/proibida apareceu no Auditor: '+forbiddenNow.join(' | '));
 await frame.evaluate(()=>{
  const host=document.getElementById('hlgbAuditorTestHost');
  const actions=host.querySelector('.hlgb-auditor-actions');
  if(!actions)throw Error('Barra atual do Auditor ausente');
  actions.insertAdjacentHTML('beforeend','<button id="legacyVisual" onclick="hlgbAuditorRunVisual()">Teste visual completo</button><button id="legacySync" onclick="hlgbAuditorExportSync()">Exportar diagnóstico de sincronização</button><button id="legacyBlackbox">Blackbox do Auditor</button>');
  window.hlgbAuditorSmart.enforceSimpleUi();
  window.hlgbAuditorSingleUiReclaim9434A.heal('webkit-legacy-iframe-injection');
 });
 const legacy=await frame.locator('#legacyVisual:visible,#legacySync:visible,#legacyBlackbox:visible').count();
 if(legacy)throw new Error('botoes legados dinamicos ainda visiveis: '+legacy);
 const after=await frame.locator('#hlgbAuditorTestHost .hlgb-auditor-actions button:visible').evaluateAll(
  buttons=>buttons.map(x=>x.id));
 if(after.length!==1||after[0]!=='hlgbAuditorUnifiedRun9434A')
  throw new Error('Injeção reabriu controles antigos: '+JSON.stringify(after));
 if(errors.some(x=>/auditor|9360|9361|9362|9363/i.test(x)))throw new Error('erro WebKit relacionado ao Auditor: '+errors.join(' | '));
 console.log('AUDITOR_CURRENT_WEBKIT_OK',meta,visible,canonical);
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
