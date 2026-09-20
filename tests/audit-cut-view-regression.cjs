const fs=require('node:fs');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const src=fs.readFileSync('release-cut-view.js','utf8');
function run(db){
  let localSaves=0;
  const ctx=vm.createContext({db,window:{},renderCuts(){},renderProjection(){},localSaveOnly(){localSaves++},hlgbAfterLogin(fn){fn()},setTimeout(fn){fn()}});
  vm.runInContext(src,ctx);
  return {db,guard:ctx.window.HLGB_CUT_VIEW_GUARD,localSaves};
}
const product='P1';
let r=run({orders:[{id:20,status:'Corte finalizado',grade:[{productId:product,qty:180}]}],cuts:[{id:1,orderId:20,productId:product,status:'Planejado',pieces:180}]});
assert.equal(r.db.cuts.length,1,'status alone must never hide an unconfirmed cut');
assert.equal(r.db.cuts[0].status,'Planejado');
assert.equal(r.localSaves,0,'view cleanup must not persist a filtered snapshot');
r=run({orders:[{id:23,status:'Corte finalizado',grade:[{productId:product,qty:720}]}],cuts:[{id:10,orderId:23,productId:product,status:'Finalizado',pieces:720},{id:11,orderId:23,productId:product,status:'Planejado',pieces:80},{id:12,orderId:23,productId:product,status:'Planejado',pieces:60}]});
assert.deepEqual(r.db.cuts.map(c=>c.id),[10],'planned detail rows covered by a finished summary may be hidden from the view');
assert.equal(r.guard,'v2');
r=run({orders:[{id:24,status:'Corte finalizado',grade:[{productId:product,qty:720}]}],cuts:[{id:20,orderId:24,productId:product,status:'Finalizado',pieces:700},{id:21,orderId:24,productId:product,status:'Planejado',pieces:20}]});
assert.equal(r.db.cuts.length,2,'partial finished coverage must not hide the remainder');
console.log('PASS cut-view guard: no status-only hiding, no snapshot save, only full finished coverage hides legacy planned rows.');

// The view guard retaining a cut is insufficient if the order queue still hides it.
const html=fs.readFileSync('app9240.html','utf8');
const start=html.indexOf('function terminalCut9199(c)');
const end=html.indexOf('function activeCuts9199(o)',start);
assert(start>=0&&end>start);
const queueDb={cuts:[]};
const queue=vm.createContext({
  arr9199:n=>queueDb[n],
  n9199:v=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim(),
  q9199:v=>Math.max(0,+v||0),qtyOfOrder:o=>o.qty
});
vm.runInContext(html.slice(start,end),queue);
const order={id:20,status:'Corte finalizado',qty:360,productId:'P1'};
queueDb.cuts=[{id:1,orderId:20,status:'Planejado',pieces:360}];
assert.equal(queue.orderNeedsCut9199(order),true,'status alone cannot remove the order from its queue');
queueDb.cuts.push({id:2,orderId:20,status:'Finalizado',pieces:360});
assert.equal(queue.orderNeedsCut9199(order),false,'finished coverage prevents duplicate cutting');
queueDb.cuts[1].pieces=300;
assert.equal(queue.orderNeedsCut9199(order),true,'partial coverage leaves pending work');
assert.equal(queue.orderNeedsCut9199({...order,invoiceReady:true}),false);
console.log('PASS actual order queue: unproven final status retained; covered and invoiced orders excluded.');
