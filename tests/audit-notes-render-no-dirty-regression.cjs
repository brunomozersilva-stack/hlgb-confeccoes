const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path');
const src=fs.readFileSync(path.join(__dirname,'..','release-notes.js'),'utf8');

const order={
  id:'o1',
  grade:[{productId:'p1',qty:240}],
  projectionItems:{p1:{date:'2026-09-03',invoicedQty:178,noteQueuedQty:178}}
};
const noteRow={id:'q1',orderId:'o1',readyOrderId:'o1',productId:'p1',itemKey:'p1',qty:178,remainingQty:178,status:'Aguardando'};
let renderCalls=0,sendObserved=null;
const context={
  console,
  db:{orders:[order],noteQueue:[noteRow],projectionInvoices:[]},
  window:{
    renderProjection(){renderCalls++;return true},
    sendProjectionToNotes9202(){sendObserved=order.projectionItems.p1.noteQueuedQty;return true},
    projectionItemsForOrder(){return [{key:'p1',productId:'p1',qty:240,remainingQty:62,name:'Produto'}]}
  },
  hlgbRecordSnapshots:{noteQueue:new Map([['q1',{data:{...noteRow},deleted_at:null}]])},
  setTimeout(fn){fn();return 1},
  document:{
    head:{appendChild(){}},
    createElement(){return {dataset:{}}},
    getElementById(){return null},
    querySelector(){return {dataset:{}}},
    querySelectorAll(){return []}
  }
};
context.projectionItemsForOrder=context.window.projectionItemsForOrder;
vm.createContext(context);
vm.runInContext(src,context);

assert.equal(order.projectionItems.p1.noteQueuedQty,178,'loading/rendering notes module must not mutate persisted order state');
context.window.renderProjection();
assert.equal(renderCalls>0,true);
assert.equal(order.projectionItems.p1.noteQueuedQty,178,'renderProjection must remain read-only for noteQueuedQty');

context.window.sendProjectionToNotes9202();
assert.equal(sendObserved,62,'explicit send action may apply the derived queue cap before the official send flow');
assert.equal(context.window.HLGB_NOTE_QUEUE_GUARD,'v5');
console.log('PASS notes v5: render is read-only; derived noteQueuedQty is applied only for explicit send flow.');
