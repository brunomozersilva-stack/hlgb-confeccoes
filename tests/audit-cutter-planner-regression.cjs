const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path');
const src=fs.readFileSync(path.join(__dirname,'..','release-cutter-planner.js'),'utf8');
const loader=fs.readFileSync(path.join(__dirname,'..','app-stable3.html'),'utf8');
assert(loader.includes("'release-cutter-planner.js'"));
const context={console,setTimeout(){return 0},db:{
 cuts:[{id:'agg1',orderId:'o1',productId:null,pieces:150,status:'Planejado',date:'2026-10-02',product:'100 Camisola Romantic | 50 Calcinha Liz'}],
 orders:[{id:'o1',orderNumber:87,client:'Gisele',priority:'Urgente',status:'Aguardando corte',grade:[
   {productId:'p1',color:'Preto',size:'P',qty:40},{productId:'p1',color:'Preto',size:'M',qty:60},
   {productId:'p2',color:'Rubi',size:'P',qty:20},{productId:'p2',color:'Rubi',size:'M',qty:30}
 ]}],
 products:[{id:'p1',name:'Camisola Romantic'},{id:'p2',name:'Calcinha Liz'}],
 cutters:[{id:'ct1',name:'João',active:true}]
},window:{renderCutters(){}},document:{getElementById(){return null}},displayOrderNumber:o=>o.orderNumber};
vm.createContext(context);vm.runInContext(src,context);
const api=context.window.hlgbCutterPlanner;assert(api);
const rows=api.modelRows();
assert.equal(rows.length,2,'multi-model order must become one planning row per product');
assert.equal(rows.find(x=>x.productId==='p1').pieces,100);
assert.equal(rows.find(x=>x.productId==='p2').pieces,50);
assert.equal(api.matches('').length,0,'nothing should appear before search');
assert.equal(api.matches('gisele').length,2,'searching the client must show every model separately');
assert.equal(api.matches('romantic').length,1);
assert.equal(api.matches('liz').length,1);
assert.equal(api.orderSearchRows('87').length,1,'order search must find the order before choosing a model');
assert.equal(context.window.HLGB_CUTTER_PLANNER_GUARD,'2026.10.01-cutter-planner-v4');
console.log('PASS cutter planner v4: explicit order search exposes each model for independent scheduling.');