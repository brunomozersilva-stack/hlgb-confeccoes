const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path');
const src=fs.readFileSync(path.join(__dirname,'..','release-notes.js'),'utf8');
const order={id:'o1',grade:[{productId:'p1',qty:240}],projectionItems:{p1:{date:'2026-09-03',invoicedQty:178,noteQueuedQty:178}}};
const noteRow={id:'q1',orderId:'o1',readyOrderId:'o1',productId:'p1',itemKey:'p1',qty:178,remainingQty:178,status:'Aguardando'};
let renderCalls=0,sendObserved=null;
const page={classList:{contains:n=>n==='active'}};
const table={offsetParent:{},closest:s=>s==='.page'?page:null,querySelectorAll(){return []}};
const shell={};
const context={
 console,getComputedStyle:()=>({display:'block',visibility:'visible',opacity:'1'}),
 db:{orders:[order],noteQueue:[noteRow],projectionInvoices:[]},
 window:{
  __HLGB_AUTH_READY:true,scrollY:0,pageYOffset:0,scrollTo(){},
  renderProjection(){renderCalls++;return true},
  sendProjectionToNotes9202(){sendObserved=order.projectionItems.p1.noteQueuedQty;return true},
  projectionItemsForOrder(){return [{key:'p1',productId:'p1',qty:240,remainingQty:62,name:'Produto'}]}
 },
 hlgbRecordSnapshots:{noteQueue:new Map([['q1',{data:{...noteRow},deleted_at:null}]])},
 setTimeout(fn){fn();return 1},
 document:{
  activeElement:null,head:{appendChild(){}},createElement(){return {dataset:{}}},
  getElementById(id){return id==='appShell'?shell:id==='projectionProductsTable'?table:null},
  querySelector(sel){return sel==='.page.active'?page:{dataset:{}}},querySelectorAll(){return []}
 }
};
context.projectionItemsForOrder=context.window.projectionItemsForOrder;
vm.createContext(context);vm.runInContext(src,context);
assert.equal(order.projectionItems.p1.noteQueuedQty,178,'loading notes module must not mutate persisted order state');
assert.equal(context.window.hlgbNotesCanRenderProjection(),true,'authenticated visible projection may render');
context.window.renderProjection();
assert.equal(renderCalls>0,true,'visible authenticated render must reach original renderer');
assert.equal(order.projectionItems.p1.noteQueuedQty,178,'renderProjection must remain read-only for noteQueuedQty');
context.window.sendProjectionToNotes9202();
assert.equal(sendObserved,62,'explicit send action may apply the derived queue cap before official send flow');
assert.equal(context.window.HLGB_NOTE_QUEUE_GUARD,'v6');
console.log('PASS notes v6: render gate is read-only and explicit send applies derived reservation.');