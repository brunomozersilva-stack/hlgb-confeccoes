const fs=require('fs'),vm=require('vm'),assert=require('assert');
const html=fs.readFileSync('app9240.html','utf8');
const start=html.indexOf('function q9238(v)');
const end=html.indexOf('window.renderProjectionDeliveryTracking=function()',start);
assert(start>=0&&end>start,'projection client delivery helpers must exist');
const db={projectionInvoices:[{
 id:1,clientId:'A',client:'Cliente A',
 items:[{orderId:'O1',productId:'P1',clientId:'A',clientName:'Cliente A',qty:20,value:200}]
}]};
const ctx=vm.createContext({
 db,
 document:{getElementById:()=>({value:''})},
 displayOrderNumber:o=>o.id,
 projectionDeliverableQty:(o,item)=>item.remainingQty,
 projectionRemainingQty:item=>item.remainingQty
});
vm.runInContext(html.slice(start,end),ctx);
const order={id:'O1',clientId:'MAIN',client:'Principal',projectionItems:{P1:{clientAllocations:[
 {clientId:'A',clientName:'Cliente A',qty:60},
 {clientId:'B',clientName:'Cliente B',qty:40}
]}}};
const item={key:'P1',productId:'P1',qty:100,value:1000,remainingQty:80,name:'Modelo'};
const parts=JSON.parse(JSON.stringify(ctx.splitRemaining9238(order,item)));
assert.deepEqual(parts,[
 {clientId:'A',clientName:'Cliente A',qty:60,original:60,done:20,remaining:40},
 {clientId:'B',clientName:'Cliente B',qty:40,original:40,done:0,remaining:40}
],'delivered quantity must be attributed to the correct client allocation');
assert.equal(parts.reduce((s,x)=>s+x.remaining,0),80);
const unit=item.value/item.qty;
assert.equal(parts.reduce((s,x)=>s+x.remaining*unit,0),800,'remaining client value must equal remaining pieces times the item unit price');
assert.equal(ctx.invoiceDelivered9238(order,item,{clientId:'A',clientName:'Cliente A'}),20);
assert.equal(ctx.invoiceDelivered9238(order,item,{clientId:'B',clientName:'Cliente B'}),0);

console.log('PASS projection delivery: per-client delivered quantity and remaining monetary value stay aligned.');