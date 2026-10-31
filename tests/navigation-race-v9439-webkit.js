const {webkit}=require('playwright');
(async()=>{
 const browser=await webkit.launch({headless:true});
 const page=await browser.newPage({viewport:{width:1440,height:900}});
 await page.goto('http://127.0.0.1:4173/app-stable3.html',{waitUntil:'domcontentloaded',timeout:60000});
 await page.waitForFunction(()=>!!window.hlgbProductCatalog9419&&!!document.getElementById('appShell'),null,{timeout:60000});
 await page.evaluate(()=>{
   window.__hlgbNavRace9439=[];
   const findOwner=token=>{try{return [...document.querySelectorAll('#appShell .page')].find(x=>x.classList===token)||null}catch(e){return null}};
   const add=DOMTokenList.prototype.add,remove=DOMTokenList.prototype.remove;
   DOMTokenList.prototype.add=function(...args){if(args.includes('active')){const el=findOwner(this);if(el)window.__hlgbNavRace9439.push({at:Date.now(),op:'add',id:el.id,stack:String(new Error().stack||'').slice(0,5000)})}return add.apply(this,args)};
   DOMTokenList.prototype.remove=function(...args){if(args.includes('active')){const el=findOwner(this);if(el&&el.classList.contains('active'))window.__hlgbNavRace9439.push({at:Date.now(),op:'remove',id:el.id,stack:String(new Error().stack||'').slice(0,5000)})}return remove.apply(this,args)};
   document.documentElement.classList.add('hlgb-login-confirmed-9407');
   window.__HLGB_AUTH_READY=true;
   document.getElementById('loginScreen')?.style.setProperty('display','none','important');
   const app=document.getElementById('appShell');if(app){app.style.setProperty('display','block','important');app.style.setProperty('visibility','visible','important')}
   window.dispatchEvent(new Event('hlgb:authenticated'));
 });
 await page.waitForTimeout(250);
 await page.evaluate(()=>{
   window.__hlgbNavRace9439.length=0;
   const d=window.eval('db');d.products=[{id:1,name:'Teste',code:'T',category:'Teste',price:1}];
   window.hlgbProductCatalog9419.install();window.hlgbProductCatalog9419.render();window.hlgbProductCatalog9419.open(document.getElementById('hlgbProductCatalogNav9419'));
 });
 await page.waitForTimeout(1500);
 const out=await page.evaluate(()=>({active:[...document.querySelectorAll('#appShell .page.active')].map(x=>x.id),events:window.__hlgbNavRace9439||[]}));
 console.log('NAV_RACE_V9439_TRACE',JSON.stringify(out));
 if(!out.active.includes('productCatalog9419'))throw new Error('NAV_RACE_V9439 '+JSON.stringify(out));
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
