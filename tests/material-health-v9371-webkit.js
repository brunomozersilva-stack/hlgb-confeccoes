const {webkit}=require('playwright');
const path=require('path');
(async()=>{
 const browser=await webkit.launch({headless:true});
 const page=await browser.newPage();
 await page.setContent('<!doctype html><html><body><div id="appShell"><div class="page active" id="dashboard"></div></div><div id="supplierDebtEvolution9250"></div><div id="supplierDebtCards9250"></div></body></html>');
 await page.evaluate(()=>{
   window.db={purchases:[],hubFinanceEntries:[]};
   window.money=v=>'R$ '+Number(v||0).toFixed(2);
   window.HLGB_RELEASE_VERSION='93.71';
 });
 await page.addScriptTag({path:path.join(process.cwd(),'release-material-health-v9260.js')});
 await page.evaluate(()=>window.hlgbMaterialHealth9260.render());
 const out=await page.evaluate(async()=>{
   const host=document.getElementById('supplierDebtEvolution9250');
   let mutations=0;
   const mo=new MutationObserver(list=>{mutations+=list.length});
   mo.observe(host,{subtree:true,childList:true,attributes:true,characterData:true});
   const before=host.innerHTML;
   window.hlgbMaterialHealth9260.render();
   await new Promise(r=>setTimeout(r,30));
   mo.disconnect();
   return {mutations,before,after:host.innerHTML};
 });
 if(out.before!==out.after)throw new Error('render sem mudança alterou HTML');
 if(out.mutations!==0)throw new Error('render sem mudança gerou '+out.mutations+' mutações DOM');
 await browser.close();
 console.log('material health v93.71 webkit ok');
})().catch(e=>{console.error(e);process.exit(1)});
