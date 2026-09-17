const fs=require('fs'),vm=require('vm'),assert=require('assert');
const src=fs.readFileSync(require('path').join(__dirname,'..','release-record-integrity.js'),'utf8');
let calls=0,saves=0,lastCall=null;const store=new Map();
const localStorage={getItem:k=>store.has(k)?store.get(k):null,setItem:(k,v)=>store.set(k,String(v)),removeItem:k=>store.delete(k)};
const row={id:'70k',description:'Pagamento',value:70000};
const deletedOrder={id:'ord-del',orderNumber:49};
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
function baseMerge(base,local,remote){
 if(same(local,base))return JSON.parse(JSON.stringify(remote));
 if(same(remote,base))return JSON.parse(JSON.stringify(local));
 if(local&&remote&&typeof local==='object'&&typeof remote==='object'&&!Array.isArray(local)&&!Array.isArray(remote)){
  const b=base&&typeof base==='object'&&!Array.isArray(base)?base:{},out={};
  for(const k of new Set([...Object.keys(b),...Object.keys(local),...Object.keys(remote)]))out[k]=baseMerge(b[k],local[k],remote[k]);
  return out;
 }
 return JSON.parse(JSON.stringify(local));
}
const context={
 console,localStorage,
 db:{hubFinanceEntries:[row],cuts:[{id:'cut-orphan',orderId:'ord-del',autoOrderCutV9203:true}],orders:[]},
 hlgbRecordSnapshots:{
  hubFinanceEntries:new Map([['70k',{revision:7,deleted_at:'2026-09-16T15:30:37Z',updated_at:'2026-09-16T15:30:37Z',data:row}]]),
  orders:new Map([['ord-del',{revision:14,deleted_at:'2026-09-17T12:56:20Z',updated_at:'2026-09-17T12:56:20Z',data:deletedOrder}]])
 },
 localSaveOnly(){saves++},
 window:{db:null,cloudMergeThreeWay:baseMerge,hlgbRecordSaveWithRetry:async(module,id,data,deleted)=>{calls++;lastCall={module,id,data,deleted};return {applied:true,deleted_at:deleted?'2026-09-17T13:00:00Z':null,data}}}
};
context.window.db=context.db;
vm.createContext(context);vm.runInContext(src,context);
(async()=>{
 let blocked=false;
 try{await context.window.hlgbRecordSaveWithRetry('hubFinanceEntries','70k',row,false)}catch(e){blocked=e.code==='HLGB_TOMBSTONE_BLOCK'}
 assert(blocked,'tombstone must block stale restore');
 assert.equal(calls,0,'stale restore must not reach original saver');
 assert.equal(context.db.hubFinanceEntries.length,0,'stale local row must be removed');

 let orphanBlocked=false;
 try{await context.window.hlgbRecordSaveWithRetry('cuts','cut-orphan',{id:'cut-orphan',orderId:'ord-del',autoOrderCutV9203:true},false)}catch(e){orphanBlocked=e.code==='HLGB_ORPHAN_AUTO_CUT_BLOCK'}
 assert(orphanBlocked,'auto cut for deleted parent order must be blocked');
 assert.equal(calls,0,'orphan auto cut must not reach original saver');
 assert.equal(context.db.cuts.length,0,'orphan cut must be removed locally');

 context.hlgbRecordSnapshots.hubFinanceEntries.set('ok',{revision:1,deleted_at:null,updated_at:'2026-09-17T10:00:00Z',data:{id:'ok',value:10}});
 context.db.hubFinanceEntries.push({id:'ok',value:10});
 const out=await context.window.hlgbRecordSaveWithRetry('hubFinanceEntries','ok',{id:'ok',value:10},false);
 assert(out.applied&&calls===1,'normal active save must pass');

 await context.window.hlgbRecordSaveWithRetry('hubFinanceEntries','ok',{id:'ok',value:10},true);
 assert(calls===2&&lastCall.deleted===true,'legitimate delete must reach original saver');
 assert(lastCall.data.__hlgb_explicit_delete===true,'legitimate delete must carry explicit marker');

 let restored=false;
 try{await context.window.hlgbRecordSaveWithRetry('hubFinanceEntries','70k',{...row,__hlgb_explicit_restore:true},false);restored=true}catch(e){}
 assert(restored&&calls===3,'explicit restore must remain possible');

 const staleData={id:'stale',value:100};
 context.hlgbRecordSnapshots.hubFinanceEntries.set('stale',{revision:4,deleted_at:null,updated_at:'2026-09-17T12:00:00Z',data:{id:'stale',value:200}});
 store.set('hlgb_records_pending_v91',JSON.stringify({at:Date.parse('2026-09-17T11:00:00Z'),modules:{hubFinanceEntries:[{id:'stale',data:staleData,deleted:false}]}}));
 let staleBlocked=false;
 try{await context.window.hlgbRecordSaveWithRetry('hubFinanceEntries','stale',staleData,false)}catch(e){staleBlocked=e.code==='HLGB_STALE_PENDING_BLOCK'}
 assert(staleBlocked,'pending write older than remote snapshot must be blocked');
 assert.equal(calls,3,'stale pending must not reach original saver');

 const base={id:'x',value:100,note:'a'},local={id:'x',value:120,note:'a'},remote={id:'x',value:130,note:'a'};
 assert.deepEqual(context.window.hlgbRecordConflictPaths(base,local,remote),['value'],'same scalar edited on both sides must conflict');
 let mergeBlocked=false;
 try{context.window.cloudMergeThreeWay(base,local,remote)}catch(e){mergeBlocked=e.code==='HLGB_SAME_FIELD_CONFLICT'}
 assert(mergeBlocked,'central three-way merge must not silently choose local on same-field conflict');
 const nonOverlap=context.window.cloudMergeThreeWay(base,{id:'x',value:120,note:'a'},{id:'x',value:100,note:'b'});
 assert.equal(nonOverlap.value,120);assert.equal(nonOverlap.note,'b','non-overlapping fields must still merge');

 assert(saves>=2,'local cleanup must be persisted');
 assert.equal(context.window.HLGB_RECORD_INTEGRITY_GUARD,'v3');
 console.log('PASS record integrity v3: tombstone/orphan/stale pending/same-field conflict blocked; normal save/delete and non-overlap merge preserved.');
})().catch(e=>{console.error(e);process.exit(1)});