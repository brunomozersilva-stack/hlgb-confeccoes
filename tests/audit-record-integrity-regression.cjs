const fs=require('fs'),vm=require('vm'),assert=require('assert');
const src=fs.readFileSync(require('path').join(__dirname,'..','release-record-integrity.js'),'utf8');
let calls=0,saves=0,lastCall=null;
const row={id:'70k',description:'Pagamento',value:70000};
const deletedOrder={id:'ord-del',orderNumber:49};
const context={
 console,
 db:{hubFinanceEntries:[row],cuts:[{id:'cut-orphan',orderId:'ord-del',autoOrderCutV9203:true}],orders:[]},
 hlgbRecordSnapshots:{
  hubFinanceEntries:new Map([['70k',{revision:7,deleted_at:'2026-09-16T15:30:37Z',data:row}]]),
  orders:new Map([['ord-del',{revision:14,deleted_at:'2026-09-17T12:56:20Z',data:deletedOrder}]])
 },
 localSaveOnly(){saves++},
 window:{db:null,hlgbRecordSaveWithRetry:async(module,id,data,deleted)=>{calls++;lastCall={module,id,data,deleted};return {applied:true,deleted_at:deleted?'2026-09-17T13:00:00Z':null,data}}}
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

 context.hlgbRecordSnapshots.hubFinanceEntries.set('ok',{revision:1,deleted_at:null,data:{id:'ok'}});
 context.db.hubFinanceEntries.push({id:'ok'});
 const out=await context.window.hlgbRecordSaveWithRetry('hubFinanceEntries','ok',{id:'ok'},false);
 assert(out.applied&&calls===1,'normal active save must pass');

 await context.window.hlgbRecordSaveWithRetry('hubFinanceEntries','ok',{id:'ok'},true);
 assert(calls===2&&lastCall.deleted===true,'legitimate delete must reach original saver');
 assert(lastCall.data.__hlgb_explicit_delete===true,'legitimate delete must carry explicit marker');

 let restored=false;
 try{await context.window.hlgbRecordSaveWithRetry('hubFinanceEntries','70k',{...row,__hlgb_explicit_restore:true},false);restored=true}catch(e){}
 assert(restored&&calls===3,'explicit restore must remain possible');
 assert(saves>=2,'local cleanup must be persisted');
 console.log('PASS record integrity v2: tombstone/orphan blocked, normal save/delete preserved, explicit restore allowed.');
})().catch(e=>{console.error(e);process.exit(1)});