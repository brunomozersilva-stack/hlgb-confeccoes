const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path');
const src=fs.readFileSync(path.join(__dirname,'..','release-cut-model-split.js'),'utf8');
const loader=fs.readFileSync(path.join(__dirname,'..','app-stable3.html'),'utf8');
assert(loader.includes("'release-cut-model-split.js'"));
let saved=[];
const context={console,setTimeout(fn){return 0},db:{
 orders:[{id:'o1',orderNumber:122,client:'Click Sophia',status:'Aguardando corte',grade:[
  {productId:'p1',color:'Preto',size:'P',qty:100},
  {productId:'p1',color:'Preto',size:'M',qty:200},
  {productId:'p2',color:'Rubi',size:'P',qty:90},
  {productId:'p2',color:'Rubi',size:'M',qty:100}
 ]}],
 products:[{id:'p1',name:'Tanga Nakamura'},{id:'p2',name:'Calcinha Canelada Manu'}],
 cuts:[{id:'parent1',orderId:'o1',client:'Click Sophia',op:'PED-o1',product:'Tanga Nakamura, Calcinha Canelada Manu',pieces:490,status:'Planejado',autoOrderCutV9199:true,plannedCutDate:'2026-10-01'}],
 cutters:[{id:'ct1',name:'João',active:true}]
},window:{renderCuts(){},renderDailyCuts(){}},document:{getElementById(){return null}},displayOrderNumber:o=>o.orderNumber,
hlgbRecordSaveWithRetry:async(module,id,row)=>{saved.push({module,id,row:JSON.parse(JSON.stringify(row))});return {applied:true,data:JSON.parse(JSON.stringify(row))}},
localSaveOnly(){},alert(){},confirm(){return true},hlgbAfterLogin:null};
context.window.hlgbRecordSaveWithRetry=context.hlgbRecordSaveWithRetry;
vm.createContext(context);vm.runInContext(src,context);
const api=context.window.hlgbCutModelSplit;assert(api);
(async()=>{
 const out=await api.splitOrder('o1');
 assert.equal(out.length,2,'one child cut must be created per product');
 assert.equal(api.splitChildren('o1').length,2);
 const p1=api.splitChildren('o1').find(x=>String(x.productId)==='p1');
 const p2=api.splitChildren('o1').find(x=>String(x.productId)==='p2');
 assert.equal(p1.product,'Tanga Nakamura');assert.equal(p1.pieces,300);assert.equal(p1.originalGrade.length,2);
 assert.equal(p2.product,'Calcinha Canelada Manu');assert.equal(p2.pieces,190);assert.equal(p2.originalGrade.length,2);
 const parent=context.db.cuts.find(x=>x.id==='parent1');
 assert.equal(parent.modelSplitParentV1,true);assert.equal(parent.hiddenByModelSplitV1,true);
 assert.equal(context.db.orders[0].cutSplitByModelV1,true);
 assert.equal(api.hasCompleteSplit(context.db.orders[0]),true);
 assert(saved.some(x=>x.module==='orders'),'order split flag must be persisted');
 assert.equal(context.window.HLGB_CUT_MODEL_SPLIT_GUARD,'2026.10.01-cut-model-split-v1');
 console.log('PASS cut model split: whole-order cut is converted into independent model cuts with product-specific grades.');
})().catch(e=>{console.error(e);process.exit(1)});