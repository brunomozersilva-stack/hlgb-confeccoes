const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path');
const src=fs.readFileSync(path.join(__dirname,'..','release-cut-material-usage.js'),'utf8');
const loader=fs.readFileSync(path.join(__dirname,'..','app-stable3.html'),'utf8');
assert(loader.includes("'release-cut-material-usage.js'"));
const context={console,setTimeout(){return 0},db:{
 materials:[{id:'m1',name:'Renda',unit:'kg',price:100}],
 products:[{id:'p1',name:'Camisola',materials:[]}],
 cuts:[
  {id:'c1',productId:'p1',pieces:100,status:'Finalizado',materialUsage:[{materialId:'m1',name:'Renda',weight:2,unit:'kg'}]},
  {id:'c2',productId:'p1',pieces:50,status:'Finalizado',materialUsage:[{materialId:'m1',name:'Renda',weight:500,unit:'g'}]}
 ]
},window:{renderCuts(){},renderProducts(){}},document:{getElementById(){return null}},money:v=>'R$ '+v.toFixed(2),hlgbAfterLogin:null};
vm.createContext(context);vm.runInContext(src,context);
const api=context.window.hlgbCutMaterialUsage;assert(api);
assert.equal(api.grams(2,'kg'),2000);assert.equal(api.grams(500,'g'),500);
const avg=api.avgForProduct('p1')[0];
assert.equal(avg.cutCount,2);assert(Math.abs(avg.avgGramsPerPiece-(2500/150))<0.001);
assert(Math.abs(avg.avgCostPerPiece-((2500/150)/1000*100))<0.001);
api.syncProductMeasuredSheet('p1');assert.equal(context.db.products[0].cutTechnicalSheet.length,1);
assert.equal(context.window.HLGB_CUT_MATERIAL_USAGE_GUARD,'2026.10.01-cut-material-usage-v1');
console.log('PASS cut material usage: weights normalize, averages are piece-weighted, and measured technical sheet is updated.');