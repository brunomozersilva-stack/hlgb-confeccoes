const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const src=fs.readFileSync('release-notes.js','utf8');
const pid='1788436445298',legacy='1788437076679',current='1788443109346';
const currentOrder={id:current,projectionItems:{},noteSourceOrderId:legacy,fulfillmentByProduct:{[pid]:{sourceOrderId:legacy}}};
const db={orders:[currentOrder],noteQueue:[
 {id:'q1',orderId:legacy,itemKey:pid,productId:pid,qty:1077,remainingQty:1077,status:'Aguardando'},
 {id:'q2',orderId:legacy,itemKey:pid,productId:pid,qty:1078,remainingQty:1078,status:'Aguardando'},
 {id:'other-product',orderId:legacy,itemKey:'OTHER',productId:'OTHER',qty:418,remainingQty:418,status:'Aguardando'}
]};
const window={projectionItemsForOrder:o=>[{key:pid,productId:pid,qty:1078,remainingQty:1078}],sendProjectionToNotes9202:()=>true};
const ctx=vm.createContext({db,window,console,setTimeout(){},document:{querySelector(){return {}}}});
vm.runInContext(src,ctx);
window.sendProjectionToNotes9202();
assert.equal(currentOrder.projectionItems[pid].noteQueuedQty,1078,'source-order queues must reserve the current linked order without double counting beyond remaining quantity');
assert.equal(window.HLGB_NOTE_QUEUE_GUARD,'v3');
console.log('PASS notes alias guard: linked legacy source queues block duplicate reservation on current order.');