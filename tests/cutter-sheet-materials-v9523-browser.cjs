'use strict';
const {chromium,webkit}=require('playwright');
const assert=require('node:assert/strict');
(async()=>{
 const type=process.env.HLGB_BROWSER||'chromium';
 const b=await ({chromium,webkit})[type].launch({headless:true});
 try{
   const page=await b.newPage();
   await page.setContent('<!doctype html><html><body><button id="crystal" onclick="printCuttingSheet(7,8)">Crystal</button><button id="blank" onclick="printCuttingSheet(7,11)">Sem ficha</button></body></html>');
   await page.evaluate(()=>{
     window.db={products:[{id:1,name:'Crystal',materials:[{name:'Romantic',qty:6,unit:'kg',calcMode:'yield'}]},{id:3,name:'Sem ficha',materials:[]}],
       orders:[{id:7,client:'Teste',grade:[]}],
       cuts:[{id:8,orderId:7,productId:1,originalGrade:[{productId:1,color:'Preto',size:'P',qty:192}]},
         {id:11,orderId:7,productId:3,originalGrade:[{productId:3,color:'Branco',size:'M',qty:12}]}],
       cutters:[],materials:[],factionPayments:[{id:12,paid:true}]};
     window.printCuttingSheet=()=>{throw Error('Fallback inesperado')};
     window.renderCuts=()=>{};
   });
   await page.addScriptTag({path:'release-cutter-sheet-materials-v9523.js'});
   const before=await page.evaluate(()=>JSON.stringify(window.db));
   let wait=page.waitForEvent('popup');await page.click('#crystal');
   const popup=await wait;await popup.waitForLoadState('domcontentloaded');
   const txt=await popup.locator('body').innerText();
   assert.match(txt,/Romantic/);assert.match(txt,/32/);assert.match(txt,/Peso usado no corte/);
   await popup.close();
   wait=page.waitForEvent('popup');await page.click('#blank');
   const blank=await wait;await blank.waitForLoadState('domcontentloaded');
   const txt2=await blank.locator('body').innerText();
   assert.match(txt2,/Sem ficha técnica com materiais cadastrados/);
   assert.doesNotMatch(txt2,/Romantic/);
   await blank.close();
   const after=await page.evaluate(()=>JSON.stringify(window.db));
   assert.equal(after,before,'A impressão não pode alterar os registros da produção nem pagamentos');
   console.log('PASS: '+type+' — Crystal, ficha ausente, somente leitura');
 }finally{await b.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
