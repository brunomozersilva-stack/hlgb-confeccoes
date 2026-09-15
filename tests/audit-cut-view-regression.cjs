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
