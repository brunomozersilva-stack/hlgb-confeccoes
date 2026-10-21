const {webkit}=require('playwright');
(async()=>{
 const browser=await webkit.launch({headless:true});
 const page=await browser.newPage({viewport:{width:1280,height:900}});
 const errors=[];page.on('pageerror',e=>errors.push(String(e.message||e)));
 await page.goto('http://127.0.0.1:4173/app-stable3.html',{waitUntil:'domcontentloaded',timeout:60000});
 await page.waitForFunction(()=>!!document.getElementById('loginScreen')&&!!document.getElementById('appShell'),null,{timeout:60000});
 await page.evaluate(()=>{window.__HLGB_AUTH_READY=true;window.dispatchEvent(new Event('hlgb:authenticated'))});
 await page.waitForFunction(()=>window.HLGB_OPERATIONAL_WRITEOFF_AUTHORITY==='93.91'&&!!window.hlgbWriteoffIntegrity9391&&!!document.getElementById('hlgbDarBaixaNav9378'),null,{timeout:60000});
 await page.evaluate(()=>{
   const login=document.getElementById('loginScreen');if(login)login.style.setProperty('display','none','important');
   const shell=document.getElementById('appShell');if(shell)shell.style.setProperty('display','block','important');
   const b=document.getElementById('hlgbDarBaixaNav9378');if(b){document.body.appendChild(b);for(const [k,v] of Object.entries({display:'block',visibility:'visible',opacity:'1','pointer-events':'auto',position:'fixed',left:'20px',top:'20px','z-index':'2147483647'}))b.style.setProperty(k,v,'important')}
 });
 await page.waitForSelector('#hlgbDarBaixaNav9378',{state:'visible',timeout:10000});
 await page.click('#hlgbDarBaixaNav9378',{timeout:10000});
 await page.waitForSelector('#darBaixa9378.active',{state:'visible',timeout:10000});
 const out=await page.evaluate(()=>({
   authority:window.HLGB_OPERATIONAL_WRITEOFF_AUTHORITY,
   version:window.hlgbWriteoffIntegrity9391?.version,
   diagnostics:window.hlgbWriteoffIntegrity9391?.diagnostics?.(),
   text:document.getElementById('darBaixa9378Host')?.textContent||'',
   save:typeof window.hlgbRecordSaveWithRetry,
   open:typeof window.openHlgbAuditor
 }));
 if(out.authority!=='93.91'||out.version!=='93.91')throw new Error('autoridade da baixa incorreta '+JSON.stringify(out));
 if(!/Cada pedido \+ modelo é confirmado uma única vez/.test(out.text))throw new Error('interface idempotente não apareceu');
 if(out.save!=='function')throw new Error('gravação oficial indisponível após carregar baixa');
 if(errors.some(x=>/9391|writeoff integrity/i.test(x)))throw new Error('pageerror relacionado à baixa: '+errors.join(' | '));
 console.log('WRITEOFF_INTEGRITY_V9391_WEBKIT_OK',out.diagnostics);
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
