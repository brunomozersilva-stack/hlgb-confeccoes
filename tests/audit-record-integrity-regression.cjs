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
let context;
context={
 console,localStorage,
 db:{hubFinanceEntries:[row],cuts:[{id:'cut-orphan',orderId:'ord-del',autoOrderCutV9203:true}],production:[],orders:[]},
 hlgbRecordSnapshots:{
  hubFinanceEntries:new Map([['70k',{revision:7,deleted_at:'2026-09-16T15:30:37Z',updated_at:'2026-09-16T15:30:37Z',data:row}]]),
  orders:new Map([['ord-del',{revision:14,deleted_at:'2026-09-17T12:56:20Z',updated_at:'2026-09-17T12:56:20Z',data:deletedOrder}],['ord-ok',{revision:1,deleted_at:null,updated_at:'2026-09-17T13:00:00Z',data:{id:'ord-ok'}}]]),
  cuts:new Map([['cloud-cut-id',{revision:4,deleted_at:'2026-09-17T16:28:56Z',updated_at:'2026-09-17T16:28:56Z',data:{id:'cloud-cut-id',orderId:'old-order',autoOrderCutV9203:true}}],['final-existing',{revision:5,deleted_at:null,updated_at:'2026-09-21T10:00:00Z',data:{id:'final-existing',orderId:'dup-order',status:'Finalizado',pieces:180}}]]),
  production:new Map([['prod-existing',{revision:6,deleted_at:null,updated_at:'2026-09-21T10:01:00Z',data:{id:'prod-existing',cutId:'cut-75',orderId:'ord-75',productId:'prod-a',cutProductKey:'cut-75:prod-a',planned:1080,done:0,stage:'Aguardando atribuição',assignmentSource:true,productionLocationId:null,factionId:null}}]])
 },
 localSaveOnly(){saves++},
 window:{cloudMergeThreeWay:baseMerge,
  syncOrdersToCuts(){context.db.cuts.push({id:'cloud-cut-id',orderId:'ord-ok',productId:'prod-new',product:'350 Produto novo',pieces:350,status:'Planejado',autoOrderCutV9203:true,createdAt:new Date().toISOString()});return true},
  hlgbRecordPendingStore(){store.set('hlgb_records_pending_v91',JSON.stringify({at:Date.parse('2026-09-17T13:00:00Z'),modules:{hubFinanceEntries:[{id:'age',data:{id:'age',value:100},deleted:false}]}}));},
  hlgbRecordSaveWithRetry:async(module,id,data,deleted)=>{calls++;lastCall={module,id,data,deleted};return {applied:true,deleted_at:deleted?'2026-09-17T13:00:00Z':null,data,revision:9,updated_at:'2026-09-17T13:00:00Z'}}
 }
};
store.set('hlgb_records_pending_v91',JSON.stringify({at:Date.parse('2026-09-17T11:00:00Z'),modules:{hubFinanceEntries:[{id:'age',data:{id:'age',value:100},deleted:false}]}}));
vm.createContext(context);vm.runInContext(src,context);
(async()=>{
 // Browser real: top-level let db is a lexical global and window.db does not exist.
 assert.equal(context.window.db,undefined,'regression must not fake window.db');

 // Recomputing the pending envelope must not make an old operation look new.
 context.window.hlgbRecordPendingStore();
 const aged=JSON.parse(store.get('hlgb_records_pending_v91'));
 const ageOp=aged.modules.hubFinanceEntries[0];
 assert.equal(ageOp.__hlgb_pending_at,Date.parse('2026-09-17T11:00:00Z'),'same pending operation must preserve its original queue time');
 assert.equal(context.window.HLGB_RECORD_PENDING_AGE_GUARD,'v1');
 context.hlgbRecordSnapshots.hubFinanceEntries.set('age',{revision:4,deleted_at:null,updated_at:'2026-09-17T12:00:00Z',data:{id:'age',value:200}});
 context.db.hubFinanceEntries.push({id:'age',value:100});
 let ageBlocked=false;
 try{await context.window.hlgbRecordSaveWithRetry('hubFinanceEntries','age',{id:'age',value:100},false)}catch(e){ageBlocked=e.code==='HLGB_STALE_PENDING_BLOCK'}
 assert(ageBlocked,'old pending operation must stay stale even after pending envelope is regenerated');
 assert.equal(calls,0,'aged stale operation must not reach original saver');
 store.delete('hlgb_records_pending_v91');

 let blocked=false;
 try{await context.window.hlgbRecordSaveWithRetry('hubFinanceEntries','70k',row,false)}catch(e){blocked=e.code==='HLGB_TOMBSTONE_BLOCK'}
 assert(blocked,'tombstone must block stale restore');
 assert.equal(calls,0,'stale restore must not reach original saver');
 assert.equal(context.db.hubFinanceEntries.some(x=>x.id==='70k'),false,'stale tombstoned local row must be removed without disturbing unrelated rows');

 let orphanBlocked=false;
 try{await context.window.hlgbRecordSaveWithRetry('cuts','cut-orphan',{id:'cut-orphan',orderId:'ord-del',autoOrderCutV9203:true},false)}catch(e){orphanBlocked=e.code==='HLGB_ORPHAN_AUTO_CUT_BLOCK'}
 assert(orphanBlocked,'auto cut for deleted parent order must be blocked');
 assert.equal(calls,0,'orphan auto cut must not reach original saver');
 assert.equal(context.db.cuts.length,0,'orphan cut must be removed locally');

 context.db.cuts.push({id:'dup-new',orderId:'dup-order',status:'Planejado',pieces:180,autoOrderCutV9203:true});
 const cutDup=await context.window.hlgbRecordSaveWithRetry('cuts','dup-new',context.db.cuts[0],false);
 assert(cutDup.hlgbLogicalDuplicate&&cutDup.hlgbDuplicateKind==='auto-cut-order','second automatic cut for an order with an active final/auto cut must be blocked logically');
 assert.equal(cutDup.hlgbTwinId,'final-existing');
 assert.equal(calls,0,'logical auto-cut duplicate must not reach Supabase saver');
 assert.equal(context.db.cuts.some(x=>x.id==='dup-new'),false,'blocked duplicate auto cut must be removed locally');

 context.db.production.push({id:'prod-new',cutId:'cut-75',orderId:'ord-75',productId:'prod-a',cutProductKey:'cut-75:prod-a',planned:1080,done:0,stage:'Aguardando atribuição',assignmentSource:true,productionLocationId:null,factionId:null});
 const prodDup=await context.window.hlgbRecordSaveWithRetry('production','prod-new',context.db.production[0],false);
 assert(prodDup.hlgbLogicalDuplicate&&prodDup.hlgbDuplicateKind==='production-cut-key','second free automatic production row for the same cut/model must be blocked');
 assert.equal(prodDup.hlgbTwinId,'prod-existing');
 assert.equal(calls,0,'logical production duplicate must not reach Supabase saver');
 assert.equal(context.db.production.length,0,'blocked duplicate production row must be removed locally');
 assert.equal(context.window.hlgbLogicalProductionTwin('split-ok',{id:'split-ok',cutId:'cut-75',orderId:'ord-75',productId:'prod-a',cutProductKey:'cut-75:prod-a',planned:300,done:0,stage:'Aguardando produção',assignmentSource:true,productionLocationId:'LOC-2',factionId:null}),null,'legitimate assigned split production must not be treated as an automatic free-row duplicate');
 assert.equal(context.window.HLGB_LOGICAL_DUPLICATE_GUARD,'v1');

 const syncOut=context.window.syncOrdersToCuts();
 const rekeyed=context.db.cuts.find(x=>x.orderId==='ord-ok');
 assert(syncOut&&rekeyed,'new automatic cut must remain available after collision handling');
 assert.notEqual(String(rekeyed.id),'cloud-cut-id','new auto cut colliding with a cloud/tombstoned ID must be rekeyed before save');
 assert(!context.hlgbRecordSnapshots.cuts.has(String(rekeyed.id)),'replacement cut ID must not already exist in cloud snapshots');
 assert(Number.isSafeInteger(rekeyed.id),'replacement cut ID must stay a safe numeric identifier');

 context.hlgbRecordSnapshots.hubFinanceEntries.set('same',{revision:3,deleted_at:null,updated_at:'2026-09-17T10:00:00Z',data:{id:'same',value:10}});
 context.db.hubFinanceEntries.push({id:'same',value:10});
 const sameOut=await context.window.hlgbRecordSaveWithRetry('hubFinanceEntries','same',{id:'same',value:10},false);
 assert(sameOut.applied&&sameOut.hlgbNoop&&sameOut.hlgbNoopReason==='identical','identical save must be treated as confirmed no-op');
 assert.equal(calls,0,'identical save must not reach Supabase saver');

 const cutCloud={id:'cut-touch',orderId:'o1',pieces:118,status:'Planejado',createdAt:'2026-09-10T13:51:20.171Z',updatedAt:'2026-09-14T17:39:15.986Z'};
 const cutLocal={...cutCloud,updatedAt:'2026-09-14T17:39:21.991Z'};
 context.hlgbRecordSnapshots.cuts.set('cut-touch',{revision:1080,deleted_at:null,updated_at:'2026-09-14T17:39:17Z',data:cutCloud});
 context.db.cuts.push({...cutLocal});
 const touchOut=await context.window.hlgbRecordSaveWithRetry('cuts','cut-touch',cutLocal,false);
 assert(touchOut.hlgbNoop,'updatedAt-only churn must be no-op');
 assert.equal(calls,0,'updatedAt-only save must not reach Supabase saver');
 assert.equal(context.db.cuts.find(x=>x.id==='cut-touch').updatedAt,cutCloud.updatedAt,'local timestamp-only churn must be normalized back to cloud snapshot');

 const createdCloud={id:'cut-created',orderId:'o2',pieces:420,status:'Planejado',createdAt:'2026-09-14T15:46:38.307Z'};
 const createdLocal={...createdCloud,createdAt:'2026-09-17T17:21:09.182Z'};
 context.hlgbRecordSnapshots.cuts.set('cut-created',{revision:2580,deleted_at:null,updated_at:'2026-09-17T18:11:03Z',data:createdCloud});
 context.db.cuts.push({...createdLocal});
 const createdOut=await context.window.hlgbRecordSaveWithRetry('cuts','cut-created',createdLocal,false);
 assert(createdOut.hlgbNoop&&createdOut.hlgbNoopReason==='technical-metadata-only','createdAt-only churn must be no-op');
 assert.equal(calls,0,'createdAt-only save must not reach Supabase saver');
 assert.equal(context.db.cuts.find(x=>x.id==='cut-created').createdAt,createdCloud.createdAt,'local createdAt churn must normalize back to cloud snapshot');

 const allocCloud={id:'cut-alloc',orderId:'o3',pieces:350,status:'Planejado',clientAllocations:null};
 const allocLocal={...allocCloud,clientAllocations:[]};
 context.hlgbRecordSnapshots.cuts.set('cut-alloc',{revision:60,deleted_at:null,updated_at:'2026-09-15T00:06:12Z',data:allocCloud});
 context.db.cuts.push({...allocLocal});
 const allocOut=await context.window.hlgbRecordSaveWithRetry('cuts','cut-alloc',allocLocal,false);
 assert(allocOut.hlgbNoop,'null and empty clientAllocations must be equivalent for cuts');
 assert.equal(calls,0,'empty allocation normalization must not reach Supabase saver');

 context.hlgbRecordSnapshots.hubFinanceEntries.set('ok',{revision:1,deleted_at:null,updated_at:'2026-09-17T10:00:00Z',data:{id:'ok',value:10}});
 context.db.hubFinanceEntries.push({id:'ok',value:12});
 const out=await context.window.hlgbRecordSaveWithRetry('hubFinanceEntries','ok',{id:'ok',value:12},false);
 assert(out.applied&&calls===1,'substantive active change must pass to saver');

 await context.window.hlgbRecordSaveWithRetry('hubFinanceEntries','ok',{id:'ok',value:12},true);
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

 // A fila pendente jamais pode ressuscitar um registro já tombstonado.
 context.db.hubFinanceEntries.push({...row});
 store.set('hlgb_records_pending_v91',JSON.stringify({at:Date.now(),modules:{hubFinanceEntries:[{id:'70k',data:{...row},deleted:false}]}}));
 const pruned=context.window.hlgbPrunePendingTombstones();
 assert(pruned.changed&&pruned.removed===1,'pending tombstone replay must be pruned');
 assert.equal(context.db.hubFinanceEntries.some(x=>x.id==='70k'),false,'tombstoned pending row must be removed locally');
 assert.equal(store.has('hlgb_records_pending_v91'),false,'empty pending envelope must be cleared');
 assert.equal(context.window.HLGB_RECORD_PENDING_TOMBSTONE_GUARD,'v1');

 const base={id:'x',value:100,note:'a'},local={id:'x',value:120,note:'a'},remote={id:'x',value:130,note:'a'};
 assert.deepEqual(context.window.hlgbRecordConflictPaths(base,local,remote),['value'],'same scalar edited on both sides must conflict');
 let mergeBlocked=false;
 try{context.window.cloudMergeThreeWay(base,local,remote)}catch(e){mergeBlocked=e.code==='HLGB_SAME_FIELD_CONFLICT'}
 assert(mergeBlocked,'central three-way merge must not silently choose local on same-field conflict');
 const nonOverlap=context.window.cloudMergeThreeWay(base,{id:'x',value:120,note:'a'},{id:'x',value:100,note:'b'});
 assert.equal(nonOverlap.value,120);assert.equal(nonOverlap.note,'b','non-overlapping fields must still merge');

 assert(saves>=6,'lexical-db cleanup/no-op/rekey normalization must be persisted');
 assert.equal(context.window.HLGB_RECORD_INTEGRITY_GUARD,'v7');
 console.log('PASS record integrity v7: tombstones, stale pending/conflicts, logical auto-cut/production duplicates and technical churn blocked; legitimate split/save/delete preserved.');
})().catch(e=>{console.error(e);process.exit(1)});