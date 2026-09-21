const fs=require('fs'),vm=require('vm'),assert=require('assert');
const src=fs.readFileSync('release-projection-delivery-integrity.js','utf8');
const order={
 id:'1788437076679',client:'Sem cliente',clientId:null,
 productClientAssignments:{'1788436445298':{clientId:'1788201086307',clientName:'Click Sophia'}},
 projectionItems:{'1788436445298':{
   deliveryHistory:[
    {invoiceId:'1789038421886580',qty:1077,date:'2026-09-10'},
    {invoiceId:'1789063987933758',qty:1078,date:'2026-09-10',clientId:'1788201086307',clientName:'Click Sophia'}
   ],
   lastDeliveryClientId:'1788201086307',lastDeliveryClientName:'Click Sophia'
 }}
};
const raw=[
 {invoice:{id:'1789038421886580',client:'Sem cliente'},order,item:{orderId:order.id,productId:'1788436445298',productName:'Calcinha Tammy',qty:1077,unitPrice:4.1},projectionDate:'2026-09-03',date:'2026-09-10',qty:1077,value:4415.7},
 {invoice:{id:'1789063987933758',client:'Sem cliente'},order,item:{orderId:order.id,productId:'1788436445298',productName:'Calcinha Tammy',qty:1078,unitPrice:4.1},projectionDate:'2026-09-03',date:'2026-09-10',qty:1078,value:4419.8}
];
const db={orders:[order]};
const window={
 projectionItemsForOrder:o=>[{key:'1788436445298',productId:'1788436445298',qty:1078}],
 projectionDeliveredRows:(start,end)=>raw
};
const ctx=vm.createContext({window,db,console});
vm.runInContext(src,ctx);
assert.equal(window.HLGB_PROJECTION_DELIVERY_INTEGRITY_GUARD,'v1');
const rows=window.projectionDeliveredRows('2026-09-01','2026-09-07');
assert.equal(rows.reduce((s,x)=>s+x.qty,0),1078,'duplicate historical Tammy delivery must be capped at the product order quantity');
assert(Math.abs(rows.reduce((s,x)=>s+x.value,0)-4419.8)<0.001,'delivered value must be capped to 1078 × R$4.10');
assert(rows.every(x=>x.item.clientName==='Click Sophia'),'Sem cliente legacy invoices must recover client from order/delivery metadata');
assert(rows.every(x=>String(x.item.clientId)==='1788201086307'));
assert(rows.some(x=>x.hlgbCappedDuplicateQty>0),'audit should expose when historical quantity was capped');

const otherOrder={id:'O2',client:'Gisele',clientId:'G',productClientAssignments:{},projectionItems:{}};
db.orders.push(otherOrder);
const canon=window.hlgbCanonicalProjectionDeliveredRows([
 {invoice:{id:'a'},order:otherOrder,item:{orderId:'O2',productId:'P2',unitPrice:5},qty:40,value:0,projectionDate:'2026-09-10'},
 {invoice:{id:'b'},order:otherOrder,item:{orderId:'O2',productId:'P2',unitPrice:5},qty:60,value:0,projectionDate:'2026-09-10'}
]);
assert.equal(canon.reduce((s,x)=>s+x.value,0),500,'unitPrice fallback must value rows even when old invoice value is empty');
assert(canon.every(x=>x.item.clientName==='Gisele'));
console.log('PASS projection delivery integrity: duplicate shadows are capped and legacy client/value attribution is recovered.');