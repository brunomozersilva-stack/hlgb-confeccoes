const {webkit}=require('playwright');
(async()=>{
 const browser=await webkit.launch({headless:true});
 const page=await browser.newPage({viewport:{width:1280,height:900}});
 const errors=[];page.on('pageerror',e=>errors.push(String(e.message||e)));
 await page.goto('http://127.0.0.1:4173/app-stable3.html',{waitUntil:'domcontentloaded',timeout:60000});
 await page.waitForFunction(()=>window.HLGB_PRODUCTION_VISIBILITY_RENDER_GUARD==='93.89'&&!!window.hlgbAuditorCallTrace9380&&!!document.getElementById('appShell'),null,{timeout:60000});
 await page.waitForTimeout(1200);
 const before=await page.evaluate(()=>{
  const ev=window.hlgbAuditorCallTrace9380.snapshot().events||[];
  return ev.filter(e=>e.type==='render:start'&&!e.authReady&&/release-production-operations-v9386-finalize\.js/.test(String(e.data?.stack||''))).map(e=>({name:e.name,stack:e.data?.stack||''}));
 });
 if(before.length)throw new Error('finalize ainda renderizou antes do login: '+JSON.stringify(before));
 await page.evaluate(()=>{
  window.__HLGB_AUTH_READY=true;
  const login=document.getElementById('loginScreen');if(login)login.style.setProperty('display','none','important');
  const shell=document.getElementById('appShell');if(shell){shell.style.setProperty('display','block','important');shell.style.setProperty('visibility','visible','important');shell.style.setProperty('opacity','1','important')}
  window.hlgbOperationalVisibility9386.refresh();
 });
 await page.waitForTimeout(300);
 const after=await page.evaluate(()=>{
  const ev=window.hlgbAuditorCallTrace9380.snapshot().events||[];
  return ev.filter(e=>e.type==='render:start'&&e.authReady&&/release-production-operations-v9386-finalize\.js/.test(String(e.data?.stack||''))).map(e=>e.name);
 });
 if(!after.includes('renderProjection')||!after.includes('renderProduction'))throw new Error('refresh pós-login não chamou renders esperados: '+JSON.stringify(after));
 if(errors.some(x=>/9386|9389|render/i.test(x)))throw new Error('pageerror relacionado ao guard: '+errors.join(' | '));
 console.log('PRODUCTION_HIDDEN_RENDER_GUARD_V9389_WEBKIT_OK',after);
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
