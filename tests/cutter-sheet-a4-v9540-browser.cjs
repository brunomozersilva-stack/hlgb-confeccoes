'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const {chromium}=require('playwright');
const source=fs.readFileSync('release-cutter-sheet-materials-v9523.js','utf8');
async function scenario(page,count){
 const colors=['Preto','Branco','Rubi','Azul Marinho','Rosa','Vinho'].slice(0,count);
 const grade=colors.flatMap(color=>['P','M','G','GG'].map(size=>({productId:1,color,size,qty:50})));
 const materials=[
  {name:'Tule',cat:'Tecido',unit:'m',qty:.6},
  {name:'Renda 18 Jacatronica',cat:'Renda',unit:'kg',qty:.02},
  {name:'Malha',cat:'Malha',unit:'kg',qty:.15},
  {name:'Alça Papiro 40 cm',cat:'Aviamento',unit:'un.',qty:1},
  {name:'Alça Papiro 30 cm',cat:'Aviamento',unit:'un.',qty:1},
  {name:'gancho prata',cat:'Aviamento',unit:'un.',qty:1},
  {name:'Anis',cat:'Aviamento',unit:'m',qty:1},
  {name:'Alpinia',cat:'Aviamento',unit:'m',qty:1.1},
  {name:'geranio',cat:'Aviamento',unit:'m',qty:.8}
 ];
 const db={products:[{id:1,name:'Camisola Liliane',materials}],materials:[],
  orders:[{id:42,orderNumber:42,client:'Click Sophia',grade}],
  cuts:[{id:88,orderId:42,productId:1,cutterId:2,originalGrade:grade,plannedCutDate:'2026-11-10'}],
  cutters:[{id:2,name:'Cortador cadastrado'}]};
 const ctx={db,document:{getElementById:()=>null},console,setTimeout(){},window:null,renderCuts(){},printCuttingSheet(){}};
 ctx.window=ctx;vm.createContext(ctx);vm.runInContext(source,ctx);
 const html=ctx.hlgbCutterSheetV9523.renderSheet(db.orders[0],db.cuts[0]);
 await page.setContent(html,{waitUntil:'load'});
 await page.emulateMedia({media:'print'});
 const doc=await page.evaluate(()=>({main:document.querySelector('main.sheet')?.getBoundingClientRect().height,
  extraHeaders:[...document.querySelectorAll('.extras-table .color-cell')].map(e=>e.textContent),
  weighNames:[...document.querySelectorAll('.weigh-table tbody tr:not(.total-row) td:first-child')].map(e=>e.textContent)}));
 assert.ok(doc.main>0);
 assert.equal(doc.extraHeaders.length,count+1);
 assert.equal(doc.weighNames.length,3);
 const pdf=await page.pdf({printBackground:true,preferCSSPageSize:true});
 const pages=(pdf.toString('latin1').match(/\/Type\s*\/Page\b/g)||[]).length;
 console.log('A4 '+count+' colors: main='+doc.main+'px, PDF pages='+pages);
 assert.equal(pages,1,'worksheet must fit on one A4 page for '+count+' colors');
 return {pdf,doc};
}
(async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  const page=await browser.newPage({viewport:{width:920,height:1280}});
  fs.mkdirSync('test-artifacts',{recursive:true});
  const a=await scenario(page,3);
  fs.writeFileSync('test-artifacts/cutter-sheet-a4-v9540.pdf',a.pdf);
  await page.screenshot({path:'test-artifacts/cutter-sheet-a4-v9540.png',fullPage:true});
  await scenario(page,6);
  console.log('PASS A4 printed page count, dynamic colors and cuttable materials');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
