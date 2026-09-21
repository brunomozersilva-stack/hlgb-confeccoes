const fs=require('fs'),vm=require('vm'),assert=require('assert');
const html=fs.readFileSync('app9240.html','utf8');
const start=html.indexOf('function projectionClientParts9240(');
const end=html.indexOf('function renderProjection()',start);
assert(start>=0&&end>start,'projectionClientParts9240 must exist');
const ctx=vm.createContext({
  projectionDeliverableQty:(order,item)=>item.remainingQty
});
vm.runInContext(html.slice(start,end),ctx);

const order={
  clientId:'MAIN',client:'Cliente principal',
  projectionItems:{
    P1:{clientAllocations:[
      {clientId:'A',clientName:'Cliente A',qty:60},
      {clientId:'B',clientName:'Cliente B',qty:40}
    ]}
  },
  productClientAssignments:{
    P2:{clientId:'C',clientName:'Cliente C'}
  }
};
let parts=ctx.projectionClientParts9240(order,{key:'P1',productId:'P1',remainingQty:70});
assert.deepEqual(JSON.parse(JSON.stringify(parts)),[
 {clientId:'A',clientName:'Cliente A',qty:60},
 {clientId:'B',clientName:'Cliente B',qty:10}
],'remaining quantity must be split by saved client allocations without exceeding available pieces');

parts=ctx.projectionClientParts9240(order,{key:'P2',productId:'P2',remainingQty:50});
assert.deepEqual(JSON.parse(JSON.stringify(parts)),[
 {clientId:'C',clientName:'Cliente C',qty:50}
],'product client assignment must be the fallback when no split allocation exists');

parts=ctx.projectionClientParts9240(order,{key:'P3',productId:'P3',remainingQty:25,clientId:'I',clientName:'Cliente do item'});
assert.deepEqual(JSON.parse(JSON.stringify(parts)),[
 {clientId:'I',clientName:'Cliente do item',qty:25}
],'item client must be preferred over order client in fallback');

parts=ctx.projectionClientParts9240(order,{key:'P1',productId:'P1',remainingQty:0});
assert.equal(parts.length,0,'fully delivered item must not leave a client balance');

assert(html.includes('HLGB_V9240_PROJECTION_CLIENT_TOTALS'),'projection client totals guard marker must remain present');
assert(html.includes('projectionDeliveredRows'),'delivered projection must be derived from finalized delivery rows');
console.log('PASS projection clients: allocations, fallback client and zero remaining quantities are calculated consistently.');