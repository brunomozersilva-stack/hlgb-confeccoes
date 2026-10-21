const {webkit}=require('playwright');
(async()=>{
 const browser=await webkit.launch({headless:true});
 const page=await browser.newPage({viewport:{width:1280,height:900}});
 const errors=[];page.on('pageerror',e=>errors.push(String(e.message||e)));
 await page.goto('http://127.0.0.1:4173/app-stable3.html',{waitUntil:'domcontentloaded',timeout:60000});
 await page.waitForFunction(()=>!!document.getElementById('loginScreen')&&!!document.getElementById('appShell'),null,{timeout:60000});
 /* Harness sem backend real: reproduz o estado visual e a autoridade explícita
    que só existem depois que a sessão foi preparada pelo produto. */
 await page.evaluate(()=>{
   window.__HLGB_AUTH_READY=true;
   const login=document.getElementById('loginScreen');
   const app=document.getElementById('appShell');
   if(login)login.style.display='none';
   if(app)app.style.display='block';
   window.dispatchEvent(new Event('hlgb:authenticated'));
 });
 await page.waitForFunction(()=>{
   const login=document.getElementById('loginScreen');
   const app=document.getElementById('appShell');
   return window.__HLGB_AUTH_READY===true&&(!login||getComputedStyle(login).display==='none')&&!!app&&getComputedStyle(app).display!=='none';
 },null,{timeout:10000});
 await page.waitForFunction(()=>!!window.hlgbInternalAuditor&&!!window.HLGB_AUDITOR_AUTHORITY_9374&&!!window.hlgbAuditorAuthority9374&&!!document.getElementById('hlgbAuditorNavBtn'),null,{timeout:60000});
 await page.evaluate(()=>{
   window.__authorityRefs={save:window.hlgbRecordSaveWithRetry,cloud:window.cloudRequest,open:window.openHlgbAuditor};
   window.alert=()=>{};window.closeModal=()=>{};
   window.openModal=(title,html)=>{let h=document.getElementById('authority9374Host');if(!h){h=document.createElement('div');h.id='authority9374Host';h.setAttribute('role','dialog');document.body.appendChild(h)}h.innerHTML=html;window.__authorityTitle=title};
 });
 /* Clique real: valida listeners de captura/propagação e não chama onclick diretamente. */
 await page.click('#hlgbAuditorNavBtn',{timeout:10000});
 await page.waitForSelector('#authority9374Host #hlgbAuditorResult',{timeout:10000});
 await page.waitForSelector('#authority9374Host #hlgbAuthorityBtn9374',{timeout:10000});
 await page.click('#authority9374Host #hlgbAuthorityBtn9374',{timeout:10000});
 await page.waitForSelector('#authority9374Host #hlgbAuthorityMap9374',{timeout:10000});
 const out=await page.evaluate(()=>{
   const r=window.hlgbAuditorAuthority9374.last||window.hlgbAuditorAuthority9374.scan();
   return {
     refs:window.__authorityRefs.save===window.hlgbRecordSaveWithRetry&&window.__authorityRefs.cloud===window.cloudRequest&&window.__authorityRefs.open===window.openHlgbAuditor,
     kind:r.kind,version:r.version,
     families:(r.families||[]).map(x=>x.id),
     title:window.__authorityTitle||'',
     text:document.getElementById('hlgbAuthorityMap9374')?.textContent||''
   };
 });
 if(!out.refs)throw new Error('Mapa de autoridades alterou função crítica');
 if(out.kind!=='hlgb_authority_map'||out.version!=='93.74')throw new Error('Relatório de autoridade inválido: '+JSON.stringify(out));
 for(const id of ['hub','production','sync','auditor'])if(!out.families.includes(id))throw new Error('Família ausente: '+id);
 if(!/Arquitetura \/ Versões \/ Autoridades/i.test(out.text))throw new Error('Painel de arquitetura não apareceu');
 if(errors.some(x=>/authority|9374|auditor/i.test(x)))throw new Error('Erro WebKit relacionado ao mapa de autoridades: '+errors.join(' | '));
 console.log('AUDITOR_AUTHORITY_V9374_WEBKIT_OK',out.families.join(','));
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
