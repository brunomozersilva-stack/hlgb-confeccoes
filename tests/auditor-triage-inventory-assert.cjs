'use strict';
const assert=require('node:assert/strict');
module.exports=function assertCompact(out){
 const w=out?.triage?.signal?.indexedDbWal;
 assert.ok(w&&typeof w.status==='string','WAL inventory missing');
 const expected=['a','b'];
 if(w.count==null){
  assert.ok(['unsupported','error','timeout'].includes(w.status),'unknown inventory status');
  if(w.status!=='unsupported')expected.push('sync:indexeddb-unverified');
 }else{
  assert.ok(Number.isSafeInteger(w.count)&&w.count>=0,'invalid inventory count');
  assert.ok(['ok','no-store'].includes(w.status),'invalid inventory status');
  if(w.count>0){assert.equal(w.status,'ok');expected.push('sync:indexeddb-wal')}
 }
 const ids=rows=>{assert.ok(Array.isArray(rows));return rows.map(x=>x.id).sort()};
 assert.deepEqual(ids(out.needsCode),expected.slice().sort(),'exact code tasks and independent WAL evidence');
 assert.deepEqual(ids(out.unverified),expected.slice().sort(),'exact unverified tasks');
 assert.deepEqual(ids(out.businessBlocked),['c','d'],'protected business tasks');
 assert.equal(out.historicalBacklog?.count,116);
 assert.equal(out.repairSkipped,true);assert.equal(out.passes,0);assert.equal(out.cleanTechnical,false);
 return {needs:expected.length,inventory:w.status,count:w.count};
};
