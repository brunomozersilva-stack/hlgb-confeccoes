'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('release-operations-pack.js','utf8');
const start=source.indexOf('function routeLocationKey9778('),end=source.indexOf('/* v94.53:',start);
assert.ok(start>=0&&end>start);
const data={factionMasters:[{id:1,name:'Roseli'},{id:2,name:'Luana'},{id:3,name:'Inativa',active:false},{id:4,deleted:true}],productionLocations:[{id:1,name:'Interno'}]};
const ctx={sid:x=>String(x??''),arr:key=>data[key]||[]};
vm.createContext(ctx);vm.runInContext(source.slice(start,end),ctx);
const locs=ctx.routeLocations();assert.equal(locs.length,3);
const sel={selectedIndex:0,options:[{dataset:{routeLocation9778:ctx.routeLocationKey9778(locs[0])}}]};
assert.equal(ctx.routeResolveLocation9778(sel).name,'Roseli');
data.factionMasters.reverse();assert.equal(ctx.routeResolveLocation9778(sel).name,'Roseli','sync must not change selected person');
data.factionMasters.push({id:1,name:'Duplicada'});assert.equal(ctx.routeResolveLocation9778(sel),null);
data.factionMasters.pop();data.factionMasters.find(x=>x.id===1).active=false;assert.equal(ctx.routeResolveLocation9778(sel),null);
sel.options[0].dataset.routeLocation9778=ctx.routeLocationKey9778({type:'Confecção',id:1});assert.equal(ctx.routeResolveLocation9778(sel).name,'Interno');
assert.equal(ctx.routeResolveLocation9778({selectedIndex:0,options:[{dataset:{}}]}),null);
assert.ok(!source.includes('routeLocations()[Number('));assert.ok(!source.includes('locs[Number(sel)]'));
console.log('PASS route location identity across reorder, duplicate, inactive and shared ID across types');


const production=[
 {id:'p1',orderId:'o1',productId:'m1',factionId:2,productionLocationId:8,planned:100,done:10,stage:'Em produção'},
 {id:'p2',orderId:'o2',productId:'m2',planned:50,done:0,stage:'Aguardando atribuição'},
 {id:'p3',orderId:'o3',productId:'m3',factionId:1,productionLocationId:8,planned:70,done:70,stage:'Pronto'}
];
const capacityAssignments=[
 {id:'c1',orderId:'o1',productId:'m1',factionId:1,pieces:100},
 {id:'c2',orderId:'o3',productId:'m3',factionId:1,pieces:70},
 {id:'c3',orderId:'o4',productId:'m4',locationId:8,pieces:30},
 {id:'c4',orderId:'o5',productId:'m5',factionId:1,pieces:20}
];
const data2={production,capacityAssignments,factionMasters:[{id:1,name:'A',productionLocationId:8},{id:2,name:'B',productionLocationId:8}],orders:[],products:[]};
const a2=source.indexOf('function routeWrittenOff9733('),b2=source.indexOf('function routeAssignedLine9249(',a2);assert.ok(a2>=0&&b2>a2);
const ctx2={sid:x=>String(x??''),q:x=>Number(x)||0,arr:k=>data2[k]||[],routeOrderNo9249:o=>o.id,routeWriteoffIndex9733:()=>new Set()};
vm.createContext(ctx2);vm.runInContext(source.slice(a2,b2),ctx2);
const before=JSON.stringify(data2);
const review=ctx2.routeDestinationReview9779(data2,new Set());
assert.equal(review.length,3);assert.ok(review.some(x=>x.id==='p2'&&x.qty===50));assert.ok(review.some(x=>x.id==='p3'&&x.qty===70&&/confirmar/.test(x.reason)));assert.ok(review.some(x=>x.id==='c3'&&/compartilhado/.test(x.reason)));
const aRoute=ctx2.routeAssignedProducts9249({type:'Facção',id:1});assert.equal(aRoute.active.length,0);assert.equal(aRoute.planned.length,1);assert.equal(aRoute.planned[0].key,'capacity:c4');
const bRoute=ctx2.routeAssignedProducts9249({type:'Facção',id:2});assert.equal(bRoute.active.length,1);assert.equal(bRoute.active[0].qty,90);
assert.equal(ctx2.routeDestinationReview9779(data2,new Set(['o2|m2'])).length,2);assert.equal(JSON.stringify(data2),before);
console.log('PASS unassigned and ready destination review, shared locations, stale capacity and read-only');
