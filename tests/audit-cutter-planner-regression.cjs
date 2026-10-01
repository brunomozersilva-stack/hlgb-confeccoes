const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path');
const src=fs.readFileSync(path.join(__dirname,'..','release-cutter-planner.js'),'utf8');
const loader=fs.readFileSync(path.join(__dirname,'..','app-stable3.html'),'utf8');
assert(loader.includes("'release-cutter-planner.js'"));
const context={console,setTimeout(){return 0},db:{cuts:[
{id:'c1',orderId:'o1',productId:'p1',pieces:100,status:'Planejado',date:'2026-10-02'},
{id:'c1dup',orderId:'o1',productId:'p1',pieces:100,status:'Planejado',date:'2026-10-03'},
{id:'c2',orderId:'o2',productId:'p2',pieces:50,status:'Finalizado',date:'2026-10-01'}],
orders:[{id:'o1',orderNumber:87,client:'Gisele',priority:'Urgente'},{id:'o2',orderNumber:88,client:'Quezia'}],
products:[{id:'p1',name:'Camisola Romantic'},{id:'p2',name:'Calcinha'}],cutters:[{id:'ct1',name:'João',active:true}]},
window:{renderCutters(){}},document:{getElementById(){return null}},displayOrderNumber:o=>o.orderNumber};
vm.createContext(context);vm.runInContext(src,context);
const api=context.window.hlgbCutterPlanner;assert(api);
const rows=api.eligibleCuts();assert.equal(rows.length,1,'logical duplicate and finished cut must not be shown twice');
assert.equal(rows[0].productName,'Camisola Romantic');
assert.equal(api.matches('').length,0,'nothing should appear before user searches');
assert.equal(api.matches('gisele').length,1);
assert.equal(api.matches('romantic').length,1);
assert.equal(context.window.HLGB_CUTTER_PLANNER_GUARD,'2026.10.01-cutter-planner-v2');
console.log('PASS cutter planner v2: hidden before search and duplicate logical cuts collapsed.');