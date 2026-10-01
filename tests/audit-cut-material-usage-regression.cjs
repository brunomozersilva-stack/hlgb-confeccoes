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
const stat=api.usageStats(300,{materialId:'m1',weight:30,unit:'kg'});
assert.equal(stat.piecesPerKg,10);
assert.equal(stat.gramsPerPiece,100);
assert.equal(stat.totalCost,3000);
assert.equal(stat.costPerPiece,10);
const ep=api.extraProfit({qty:1000,saleUnitPrice:3.5,costUnitPrice:1.1});
assert.equal(ep.revenue,3500);assert.equal(ep.cost,1100);assert.equal(ep.profit,2400);
const p=context.db.products[0];api.syncMissingMaterialsIntoProduct(p,{pieces:300,materialUsage:[{materialId:'m1',name:'Renda',weight:30,unit:'kg'}]});
assert.equal(p.materials.length,1);assert.equal(p.materials[0].calcMode,'yield');assert.equal(p.materials[0].qty,10);
assert.equal(context.window.HLGB_CUT_MATERIAL_USAGE_GUARD,'2026.10.01-cut-material-usage-v2');
console.log('PASS cut material usage v2: yield, cost, auto technical-sheet material, extra-piece profit and history helpers work.');