const {webkit}=require('playwright');
(async()=>{
 const browser=await webkit.launch({headless:true});
 const page=await browser.newPage({viewport:{width:1280,height:900}});
 const errors=[];page.on('pageerror',e=>errors.push(String(e.message||e)));
 await page.goto('http://127.0.0.1:4173/app-stable3.html',{waitUntil:'domcontentloaded',timeout:60000});
 await page.waitForFunction(()=>!!window.hlgbInternalAuditor&&!!window.hlgbAuditorBlackbox9299&&!!window.hlgbOperationalAuditor9314,null,{timeout:60000});
 const result=await page.evaluate(async()=>{
  const base='https://raw.githubusercontent.com/brunomozersilva-stack/hlgb-confeccoes/feat/auditor-smart-v9360/';
  for(const file of ['release-auditor-smart-v9360.js','release-auditor-ui-compat-v9361.js']){
   const r=await fetch(base+file+'?fresh='+Date.now(),{cache:'no-store'});if(!r.ok)throw new Error('HTTP '+r.status+' em '+file);
   const src=await r.text();(0,eval)(src);
  }
  return {smart:window.HLGB_AUDITOR_SMART_9360===true,compat:!!window.HLGB_AUDITOR_UI_COMPAT_9361,version:window.hlgbAuditorSmart?.version,open:typeof window.openHlgbAuditor==='function'};
 });
 if(!result.smart||!result.compat||!result.open||result.version!=='93.62')throw new Error('injecao temporaria incompleta: '+JSON.stringify(result));
 await page.evaluate(()=>{
  window.openModal=(title,html)=>{let h=document.getElementById('remoteInjectHost');if(!h){h=document.createElement('div');h.id='remoteInjectHost';document.body.appendChild(h)}h.innerHTML=html};window.closeModal=()=>{};window.openHlgbAuditor();
 });
 await page.waitForSelector('#remoteInjectHost #hlgbSmartStatus',{timeout:10000});
 const buttons=(await page.locator('#remoteInjectHost .hlgb-auditor-actions button:visible').allTextContents()).map(x=>x.replace(/\s+/g,' ').trim());
 if(buttons.length!==3||!buttons.some(x=>x.includes('Testar sistema'))||!buttons.some(x=>x.includes('Registrar problema'))||!buttons.some(x=>x.includes('Histórico')))throw new Error('botoes inesperados: '+buttons.join(' | '));
 if(errors.some(x=>/auditor|9360|9361|9362/i.test(x)))throw new Error('erro relacionado ao Auditor: '+errors.join(' | '));
 console.log('AUDITOR_V9362_REMOTE_INJECT_OK',result,buttons);
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
