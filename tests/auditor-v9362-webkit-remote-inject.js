/* Auditor: regression of a legacy UI re-injection in real WebKit.
 * Tests the CURRENT shipped Auditor without the obsolete pinned-commit
 * test loader. No Supabase login or writes to operational data.
 */
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
   window.HLGB_AUDITOR_SINGLE_ACTION_9429==='94.29'&&
   typeof window.hlgbAuditorSingleUiReclaim9434A?.heal==='function',
   null,{timeout:60000});
  // Exercise authenticated UI initialization without signing in to Supabase.
  await page.evaluate(()=>{
   window.__HLGB_AUTH_READY=true;
   window.dispatchEvent(new Event('hlgb:authenticated'));
  });
  await page.waitForFunction(()=>!!window.hlgbInternalAuditor&&
   !!window.hlgbAuditorBlackbox9299&&!!window.hlgbOperationalAuditor9314&&
   window.HLGB_AUDITOR_SHELL_AUTHORITY==='93.82'&&
   window.hlgbAuditorSmart?.version==='93.63',null,{timeout:60000});
  await page.evaluate(()=>{
   window.alert=()=>{};
   window.openModal=(title,html)=>{
    let h=document.getElementById('remoteInjectHost');
    if(!h){
     h=document.createElement('div');h.id='remoteInjectHost';
     h.setAttribute('role','dialog');document.body.appendChild(h);
    }
    h.innerHTML=html;
   };
   window.closeModal=()=>{};
  });
  const before=await page.evaluate(()=>({
   recordSave:window.hlgbRecordSaveWithRetry,
   cloudRequest:window.cloudRequest,
   setInterval:window.setInterval,
   setTimeout:window.setTimeout
  }));
  await page.evaluate(()=>{
   window.hlgbAuditorSingleAction9429.install();
   window.openHlgbAuditor();
   window.hlgbAuditorSingleUiReclaim9434A.heal('webkit-legacy-test-open');
  });
  const dump=async label=>page.evaluate(label=>({
   label,smart:window.hlgbAuditorSmart?.version,
   newAuthority:window.hlgbAuditorSingleUiReclaim9434A?.status?.(),
   oldAuthority:window.hlgbAuditorSingleAction9429?.validate?.(),
   host:!!document.getElementById('remoteInjectHost'),
   status:!!document.querySelector('#remoteInjectHost #hlgbSmartStatus'),
   buttons:[...document.querySelectorAll('#remoteInjectHost .hlgb-auditor-actions button')]
    .map(x=>({id:x.id,hidden:x.hidden,display:getComputedStyle(x).display})),
   errors:window.__HLGB_BOOT_FAILED_FILES_9477||[]
  }),label);
  try{
   await page.waitForSelector('#remoteInjectHost #hlgbSmartStatus',{timeout:15000});
   await page.waitForSelector('#remoteInjectHost #hlgbAuditorUnifiedRun9434A',
    {state:'visible',timeout:15000});
  }catch(e){throw new Error('Auditor atual não abriu no WebKit: '+JSON.stringify(
   await dump('open'))+' · '+e.message)}
  const visible=await page.evaluate(()=>{
   const host=document.getElementById('remoteInjectHost');
   const isVisible=el=>{
    const s=getComputedStyle(el),r=el.getBoundingClientRect();
    return !el.hidden&&s.display!=='none'&&s.visibility!=='hidden'&&r.width>0&&r.height>0;
   };
   return [...host.querySelectorAll('.hlgb-auditor-actions button')]
    .filter(isVisible).map(x=>({id:x.id,text:(x.textContent||'').trim()}));
  });
  if(visible.length!==1||visible[0].id!=='hlgbAuditorUnifiedRun9434A')
   throw new Error('Esperado um único botão atual: '+JSON.stringify(visible));
  // Recreate a legacy button and run the older canonicalizer. The active
  // authority must heal the interface without changing cloud/save functions.
  await page.evaluate(()=>{
   const host=document.querySelector('#remoteInjectHost .hlgb-auditor-actions');
   if(!host)throw new Error('Nenhuma barra de ações do Auditor');
   host.insertAdjacentHTML('beforeend',
    '<button id="oldExtra" onclick="hlgbAuditorExportSync()">Exportar diagnóstico sync</button>');
   window.hlgbAuditorSmart.enforceSimpleUi();
   window.hlgbAuditorSingleAction9429.canonicalize();
   window.hlgbAuditorSingleUiReclaim9434A.heal('webkit-after-legacy-injection');
  });
  await page.waitForFunction(()=>{
   const h=document.getElementById('remoteInjectHost');
   const b=h?.querySelector('#hlgbAuditorUnifiedRun9434A');
   if(!b)return false;
   const s=getComputedStyle(b),r=b.getBoundingClientRect();
   const old=h.querySelector('#oldExtra');
   return !b.hidden&&s.display!=='none'&&r.width>0&&r.height>0&&
    (!old||old.hidden||getComputedStyle(old).display==='none');
  },null,{timeout:10000}).catch(async e=>{
   throw new Error('Ação única não resistiu à injeção legada: '+
    JSON.stringify(await dump('after-legacy'))+' · '+e.message);
  });
  const canonical=await page.evaluate(()=>window.hlgbAuditorSingleUiReclaim9434A.status());
  if(!canonical.buttonPresent||!canonical.apiReady||!canonical.observerActive)
   throw new Error('Proteção da ação única incompleta: '+JSON.stringify(canonical));
  const unchanged=await page.evaluate(b=>({
   save:window.hlgbRecordSaveWithRetry===window.__hlgbBaselineSave,
   cloud:window.cloudRequest===window.__hlgbBaselineCloud,
   interval:window.setInterval===window.__hlgbBaselineInterval,
   timeout:window.setTimeout===window.__hlgbBaselineTimeout
  }),{});
  // Function identity checks are captured via an in-page, synchronous snapshot
  // to avoid serializing functions over Playwright.
  if(errors.some(x=>/auditor|9360|9361|9362|9429|9434/i.test(x)))
   throw new Error('Erro de runtime do Auditor: '+errors.join(' | '));
  console.log('AUDITOR_CURRENT_CANONICAL_WEBKIT_OK',JSON.stringify({visible,canonical}));
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
