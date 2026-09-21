const fs=require('node:fs');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const src=fs.readFileSync('release-cut-view.js','utf8');
function run(db,hlgbRecordSnapshots={}){
  let localSaves=0;
  const ctx=vm.createContext({db,hlgbRecordSnapshots,window:{},renderCuts(){},renderProjection(){},localSaveOnly(){localSaves++},hlgbAfterLogin(fn){fn()},setTimeout(fn){fn()}});
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
assert.equal(r.guard,'v3');
r=run({orders:[{id:24,status:'Corte finalizado',grade:[{productId:product,qty:720}]}],cuts:[{id:20,orderId:24,productId:product,status:'Finalizado',pieces:700},{id:21,orderId:24,productId:product,status:'Planejado',pieces:20}]});
assert.equal(r.db.cuts.length,2,'partial finished coverage must not hide the remainder');

r=run({orders:[],cuts:[{id:30,orderId:'deleted-order',productId:null,status:'Planejado',pieces:360}]},{
 orders:new Map([['deleted-order',{deleted_at:'2026-09-17T12:56:32Z',data:{id:'deleted-order'}}]])
});
assert.equal(r.db.cuts.length,0,'planned cut of an authoritatively tombstoned parent order must be hidden from the operational view');
assert.equal(r.localSaves,0,'hiding orphan historical cut must never rewrite/delete cloud history');

r=run({orders:[],cuts:[{id:31,orderId:'unknown-order',productId:null,status:'Planejado',pieces:360}]},{orders:new Map()});
assert.equal(r.db.cuts.length,1,'unknown parent without tombstone proof must remain visible');

console.log('PASS cut-view guard: no status-only hiding, no snapshot save, full finished coverage and proven parent tombstones hide only obsolete planned rows.');

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


// PED-<numero exibido> must never be treated as the internal order id.
const resolverStart=html.indexOf('function resolveOrder9179(');
const resolverEnd=html.indexOf('function cutStatus9179(',resolverStart);
assert(resolverStart>=0&&resolverEnd>resolverStart,'order resolver for cut badges must exist');
const resolverDb={orders:[
  {id:1788443919436,orderNumber:20},
  {id:20,orderNumber:999}
]};
const resolver=vm.createContext({
  db:resolverDb,
  orderNo9179:o=>o.orderNumber||o.id,
  window:{}
});
vm.runInContext(html.slice(resolverStart,resolverEnd),resolver);
assert.equal(resolver.resolveOrder9179(null,'20',null).id,1788443919436,'PED-20 resolves by displayed order number, not internal id 20');
assert.equal(resolver.resolveOrder9179(1788443919436,'20',null).id,1788443919436,'an explicit internal order id keeps priority');
assert.equal(resolver.window.hlgbResolveOrder9179(null,'20',null).id,1788443919436,'resolver is exposed for audit diagnostics');
console.log('PASS cut-status order resolution: PED display number cannot overwrite the correct internal order link.');


// Historical aggregate cuts without productId must not be mistaken for exact model coverage.
const cutStatusStart=html.indexOf('function cutStatus9179(');
const cutStatusEnd=html.indexOf('window.hlgbCutStatusEvidence9179',cutStatusStart);
assert(cutStatusStart>=0&&cutStatusEnd>cutStatusStart,'cutStatus9179 must exist');
const statusDb={
 orders:[{id:'O1',projectionItems:{}}],
 cuts:[{id:'agg',orderId:'O1',productId:null,product:'100 Produto A | 100 Produto B',status:'Finalizado',pieces:200}]
};
const statusCtx=vm.createContext({
 db:statusDb,window:{},
 norm:v=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim()
});
vm.runInContext(html.slice(cutStatusStart,cutStatusEnd),statusCtx);
assert.equal(statusCtx.cutStatus9179('P1','O1').text,'Ainda não cortado','aggregate cut with no product evidence cannot mark a specific product as cut');
statusDb.cuts[0].actualCutGrade=[{productId:'P1',qty:100}];
assert.equal(statusCtx.cutStatus9179('P1','O1').text,'✓ Já cortado','grade evidence may link a historical aggregate cut to an exact product');
console.log('PASS cut-status evidence: aggregate historical cut needs exact productId/grade proof before marking a model as cut.');
