const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const html = fs.readFileSync('app9240.html', 'utf8');
let scripts = 0;
for (const match of html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)) {
  if (!match[1].trim()) continue;
  new vm.Script(match[1]);
  scripts++;
}
function between(start, end) {
  const from = html.indexOf(start);
  assert(from >= 0, start);
  const to = html.indexOf(end, from);
  assert(to > from, end);
  return html.slice(from, to);
}
(async () => {
  const db = {noteQueue: []};
  const context = vm.createContext({db});
  vm.runInContext(between('function qtyDone(f)', 'function ensureClient(f)'), context);
  const f = {id: 12, done: 418, waste: 2, sent: 420};
  assert.equal(context.pendingQty(f), 418);
  db.noteQueue = [{id: 1, factionServiceId: '12', qty: 418, remainingQty: 418}];
  assert.equal(context.pendingQty(f), 0, 'integrated delivery must block legacy resend');
  db.noteQueue[0].remainingQty = 0;
  db.noteQueue[0].status = 'Faturado';
  assert.equal(context.pendingQty(f), 0, 'invoiced delivery must remain consumed');
  db.noteQueue = [{id: 2, sourceFactionId: 12, qty: 100}];
  assert.equal(context.pendingQty(f), 318, 'partial delivery preserves only unreserved balance');
  db.noteQueue[0].sourceFactionId = 99;
  assert.equal(context.pendingQty(f), 418, 'another faction cannot consume this delivery');

  let calls = 0;
  const queueDb = {noteQueue: [{id:'archived'}, {id:'unsaved'}]};
  const queueContext = vm.createContext({
    window: {__HLGB_AUTH_READY:false}, db:queueDb,
    cloudRequest: async () => {calls++; return [
      {entity_id:'archived',deleted_at:'2026-09-15',data:{id:'archived'}},
      {entity_id:'kept',deleted_at:null,data:{id:'kept'}}
    ];},
    clone:structuredClone, arr:n=>queueDb[n], local:()=>{}, console
  });
  vm.runInContext(between('async function loadQueue(){','function clientForOrder(o)'),queueContext);
  await queueContext.loadQueue();
  assert.equal(calls,0,'no query before authentication');
  queueContext.window.__HLGB_AUTH_READY=true;
  await queueContext.loadQueue();
  assert.deepEqual(queueDb.noteQueue.map(x=>x.id),['kept','unsaved']);

  const cutDb={orders:[{id:1,qty:420,status:'Pedido em produção'}],cuts:[{id:2,orderId:1,status:'Finalizado',pieces:418,autoOrderCutV9203:true}]};
  const cutContext=vm.createContext({db:cutDb,window:{},arr9203:n=>cutDb[n],norm9203:v=>String(v||'').toLowerCase(),qtyOfOrder:o=>o.qty});
  vm.runInContext(between('function terminal9203(c)', 'const saveBefore9203='),cutContext);
  assert.equal(cutContext.window.syncOrdersToCuts(),false);
  assert.equal(cutDb.cuts.length,1);
  assert.equal(cutDb.cuts[0].pieces,418,'finalized quantity must not be reset from original order');
  cutDb.orders.push({id:3,qty:10,status:'Aguardando corte',items:'TESTE WORK'});
  assert.equal(cutContext.window.syncOrdersToCuts(),true);
  assert.equal(cutDb.cuts.length,2);
  assert.equal(cutContext.window.syncOrdersToCuts(),false);
  assert.equal(cutDb.cuts.length,2,'repeat synchronization must not create another cut');
  console.log(`PASS: ${scripts} inline scripts parse; queue reservations, tombstones, auth gate, partial quantities and idempotent cuts.`);
})().catch(e=>{console.error(e);process.exitCode=1});
