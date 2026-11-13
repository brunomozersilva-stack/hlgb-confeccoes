'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const src=fs.readFileSync('release-product-traceability-v9580.js','utf8');
const clone=x=>JSON.parse(JSON.stringify(x));
const db={products:[{id:'p',name:'Camisola',price:39}],orders:[{id:'o1',grade:[{productId:'p',qty:12}]}],
 cuts:[{id:'c1',productId:'p',pieces:12,status:'Finalizado'}],factionPayments:[]};
let cloud=clone(db.products[0]),writes=0;
const window={__HLGB_AUTH_READY:true,addEventListener(){},hlgbWalIdbGuard9536:{
 probe:async()=>true,ids:()=>[],status:()=>({readFailed:false})},
 cloudRequest:async()=>[{entity_id:'p',module:'products',deleted_at:null,data:clone(cloud)}],
 hlgbRecordSaveWithRetry:async(m,id,row)=>{assert.equal(m,'products');assert.equal(id,'p');writes++;cloud=clone(row);return {applied:true,data:clone(row)}}};
const ctx={window,db,console,Date,Math,Set,JSON,Promise,encodeURIComponent,
 document:{readyState:'loading',addEventListener(){}},setTimeout(){}};
vm.createContext(ctx);
vm.runInContext(src,ctx);
const api=window.hlgbProductTraceability9580;
(async()=>{
 assert.equal(window.db,undefined,'test must simulate global lexical database, not window.db');
 const trace=api.timeline('p');
 assert(trace.some(e=>e.kind==='pedido'&&e.details.quantity===12));
 assert(trace.some(e=>e.kind==='corte'&&e.details.quantity===12));
 const newRound=await api.createRound('p',{name:'Corte #1',actor:'Cyrlene'});
 assert(newRound.ok);
 assert.equal(db.products[0].productChecklistsV9580.length,1,'confirmed event must update canonical global db');
 await api.addWorkEvent('p',newRound.event.id,{actor:'Roseli',stage:'producao',quantity:12,grade:'P 4, M 8'});
 assert.equal(api.timeline('p').filter(e=>e.kind==='execucao').length,1);
 assert.equal(writes,2);
 assert.equal(db.products[0].price,39);
 console.log('PASS v95.82: canonical global db is loaded and updated even when window.db is absent');
})().catch(e=>{console.error(e);process.exitCode=1});
