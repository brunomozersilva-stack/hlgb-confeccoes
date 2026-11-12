/* WebKit: the shipped v94.34a Auditor owns the only visible repair action.
   Obsolete debug/sync buttons cannot reappear via a legacy UI injection. */
const {webkit}=require('playwright');
(async()=>{
 const browser=await webkit.launch({headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1280,height:900}});
  const errors=[];page.on('pageerror',e=>errors.push(String(e.message||e)));
  await page.goto('http://127.0.0.1:4173/app-stable3.html',
   {waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForFunction(()=>!!document.getElementById('loginScreen')&&
   !!document.getElementById('appShell')&&
   typeof window.hlgbAuditorSingleUiReclaim9434A?.heal==='function',
   null,{timeout:60000});
  await page.evaluate(()=>{
   window.__HLGB_AUTH_READY=true;
   window.dispatchEvent(new Event('hlgb:authenticated'));
  });
  await page.waitForFunction(()=>!!window.hlgbInternalAuditor&&
   !!window.hlgbAuditorBlackbox9299&&!!window.hlgbOperationalAuditor9314,
   null,{timeout:60000});
  await page.evaluate(()=>{
   window.alert=()=>{};
   window.openModal=(title,html)=>{
    let h=document.getElementById('guardHost');
    if(!h){h=document.createElement('div');h.id='guardHost';h.setAttribute('role','dialog');document.body.appendChild(h)}
    h.innerHTML=html;
   };
   window.closeModal=()=>{};
   window.openHlgbAuditor();
   window.hlgbAuditorSingleUiReclaim9434A.heal('webkit-guard-open');
  });
  await page.waitForSelector('#guardHost #hlgbAuditorUnifiedRun9434A',
   {state:'visible',timeout:15000});
  const identity=await page.evaluate(()=>{
   const before={save:window.hlgbRecordSaveWithRetry,cloud:window.cloudRequest,
    interval:window.setInterval,timeout:window.setTimeout};
   const actions=document.querySelector('#guardHost .hlgb-auditor-actions');
   if(!actions)throw Error('Barra de ações atual indisponível');
   actions.insertAdjacentHTML('beforeend','<button id="legacy1">Debug máximo</button>'+
    '<button id="legacy2">Caixa-preta completa</button>'+
    '<button id="legacy3">Exportar diagnóstico sync</button>');
   window.hlgbAuditorSmart?.enforceSimpleUi?.();
   window.hlgbAuditorSingleUiReclaim9434A.heal('webkit-after-legacy-controls');
   return {save:before.save===window.hlgbRecordSaveWithRetry,
    cloud:before.cloud===window.cloudRequest,
    interval:before.interval===window.setInterval,
    timeout:before.timeout===window.setTimeout};
  });
  if(Object.values(identity).some(x=>!x))throw Error('Teste de UI mudou função crítica: '+JSON.stringify(identity));
  await page.waitForFunction(()=>{
   const root=document.getElementById('guardHost');
   const live=[...root.querySelectorAll('.hlgb-auditor-actions button')].filter(el=>{
    const css=getComputedStyle(el),r=el.getBoundingClientRect();
    return !el.hidden&&css.display!=='none'&&css.visibility!=='hidden'&&r.width>0&&r.height>0;
   });
   return live.length===1&&live[0].id==='hlgbAuditorUnifiedRun9434A';
  },null,{timeout:10000});
  const state=await page.evaluate(()=>window.hlgbAuditorSingleUiReclaim9434A.status());
  if(!state.buttonPresent||!state.apiReady||!state.observerActive)
   throw Error('Proteção do Auditor incompleta: '+JSON.stringify(state));
  if(await page.locator('#legacy1:visible,#legacy2:visible,#legacy3:visible').count())
   throw Error('Controle legado voltou a aparecer');
  if(errors.some(x=>/auditor|guard|9365|9434/i.test(x)))throw Error('Erro no Auditor: '+errors.join(' | '));
  console.log('AUDITOR_VISUAL_GUARD_WEBKIT_OK',{identity,button:state.buttonPresent,observer:state.observerActive});
 }finally{await browser.close()}
})().catch(err=>{console.error(err);process.exit(1)});
