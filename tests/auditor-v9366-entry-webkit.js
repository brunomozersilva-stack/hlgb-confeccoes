/* WebKit: entering the real Auditor menu opens the current canonical action,
   never a retired v93.66 toolbar. No operational audit/save is triggered. */
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
   !!window.hlgbAuditorBlackbox9299&&!!window.hlgbOperationalAuditor9314&&
   !!document.getElementById('hlgbAuditorNavBtn'),null,{timeout:60000});
  await page.evaluate(()=>{
   window.alert=()=>{};
   window.closeModal=()=>{};
   window.openModal=(title,html)=>{
    let h=document.getElementById('entry9366Host');
    if(!h){
     h=document.createElement('div');h.id='entry9366Host';
     h.setAttribute('role','dialog');document.body.appendChild(h);
    }
    h.innerHTML=html;window.__entry9366Title=title;
   };
  });
  await page.evaluate(()=>{
   const b=document.getElementById('hlgbAuditorNavBtn');
   if(!b||typeof b.onclick!=='function')throw Error('Menu não abriu: onclick ausente');
   b.onclick.call(b,new MouseEvent('click',{bubbles:true}));
   window.hlgbAuditorSingleUiReclaim9434A.heal('webkit-menu-open');
  });
  await page.waitForSelector('#entry9366Host #hlgbSmartStatus',{timeout:10000});
  await page.waitForSelector('#entry9366Host #hlgbAuditorUnifiedRun9434A',
   {state:'visible',timeout:15000});
  const buttons=await page.locator('#entry9366Host .hlgb-auditor-actions button:visible')
   .evaluateAll(list=>list.map(x=>({id:x.id,text:(x.textContent||'').trim()})));
  if(buttons.length!==1||buttons[0].id!=='hlgbAuditorUnifiedRun9434A'||
    !buttons[0].text.includes('Auditar e corrigir'))
   throw Error('Entrada real mostrou ações incorretas: '+JSON.stringify(buttons));
  const state=await page.evaluate(()=>window.hlgbAuditorSingleUiReclaim9434A.status());
  if(!state.apiReady||!state.buttonPresent)throw Error('API canônica indisponível: '+JSON.stringify(state));
  if(errors.some(x=>/auditor|9366|9434/i.test(x)))throw Error('Erro do Auditor: '+errors.join(' | '));
  console.log('AUDITOR_REAL_MENU_WEBKIT_OK',{buttons,buttonPresent:state.buttonPresent,
   title:await page.evaluate(()=>window.__entry9366Title)});
 }finally{await browser.close()}
})().catch(err=>{console.error(err);process.exit(1)});
