const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const src=fs.readFileSync('release-notes.js','utf8');
const pid='1788436445298',legacy='1788437076679',current='1788443109346',delayed='ORDER-DELAYED';
const currentOrder={id:current,projectionItems:{},noteSourceOrderId:legacy,fulfillmentByProduct:{[pid]:{sourceOrderId:legacy}}};
const delayedOrder={id:delayed,projectionItems:{[pid]:{noteQueuedQty:250}}};
const db={orders:[currentOrder,delayedOrder],noteQueue:[
 {id:'q1',orderId:legacy,itemKey:pid,productId:pid,qty:1077,remainingQty:1077,status:'Aguardando'},
 {id:'q2',orderId:legacy,itemKey:pid,productId:pid,qty:1078,remainingQty:1078,status:'Aguardando'},
 {id:'other-product',orderId:legacy,itemKey:'OTHER',productId:'OTHER',qty:418,remainingQty:418,status:'Aguardando'}
]};
const hlgbRecordSnapshots={noteQueue:new Map()};
const window={projectionItemsForOrder:o=>[{key:pid,productId:pid,qty:o.id===delayed?250:1078,remainingQty:o.id===delayed?250:1078}],sendProjectionToNotes9202:()=>true};
const ctx=vm.createContext({db,window,hlgbRecordSnapshots,console,setTimeout(){},document:{querySelector(){return {}}}});
vm.runInContext(src,ctx);
window.sendProjectionToNotes9202();
assert.equal(currentOrder.projectionItems[pid].noteQueuedQty,1078,'source-order queues must reserve the current linked order without double counting beyond remaining quantity');
assert.equal(delayedOrder.projectionItems[pid].noteQueuedQty,250,'empty local queue before authoritative load must not erase a known reservation');
// Once a non-empty snapshot map proves that the queue module was loaded, absence for this order is authoritative.
hlgbRecordSnapshots.noteQueue.set('deleted-marker',{deleted_at:'2026-09-17T10:00:00Z',data:{id:'deleted-marker',orderId:'OTHER',productId:'OTHER',qty:1}});
window.hlgbNotesSyncLocal();
assert.equal(delayedOrder.projectionItems[pid].noteQueuedQty,0,'authoritative snapshot may legitimately clear a reservation that no longer has an active queue');
assert.equal(window.HLGB_NOTE_QUEUE_GUARD,'v4');
console.log('PASS notes v4: aliases reserve correctly; delayed queue load cannot zero known reservation; authoritative absence can clear it.');