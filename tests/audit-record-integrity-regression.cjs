const fs=require('fs'),vm=require('vm'),assert=require('assert');
const src=fs.readFileSync(require('path').join(__dirname,'..','release-record-integrity.js'),'utf8');
let calls=0,saves=0;
const row={id:'70k',description:'Pagamento',value:70000};
const context={
 console,
 db:{hubFinanceEntries:[row]},
 hlgbRecordSnapshots:{hubFinanceEntries:new Map([['70k',{revision:7,deleted_at:'2026-09-16T15:30:37Z',data:row}]])},
 localSaveOnly(){saves++},
 window:{db:null,hlgbRecordSaveWithRetry:async()=>{calls++;return {applied:true,deleted_at:null}}}
};
context.window.db=context.db;
vm.createContext(context);vm.runInContext(src,context);
(async()=>{
 let blocked=false;
 try{await context.window.hlgbRecordSaveWithRetry('hubFinanceEntries','70k',row,false)}catch(e){blocked=e.code==='HLGB_TOMBSTONE_BLOCK'}
 assert(blocked,'tombstone must block stale restore');
 assert.equal(calls,0,'stale restore must not reach original saver');
 assert.equal(context.db.hubFinanceEntries.length,0,'stale local row must be removed');
 assert.equal(saves,1,'local cleanup must be saved');
 context.hlgbRecordSnapshots.hubFinanceEntries.set('ok',{revision:1,deleted_at:null,data:{id:'ok'}});
 context.db.hubFinanceEntries.push({id:'ok'});
 const out=await context.window.hlgbRecordSaveWithRetry('hubFinanceEntries','ok',{id:'ok'},false);
 assert(out.applied&&calls===1,'normal active save must pass');
 let restored=false;
 try{await context.window.hlgbRecordSaveWithRetry('hubFinanceEntries','70k',{...row,__hlgb_explicit_restore:true},false);restored=true}catch(e){}
 assert(restored&&calls===2,'explicit restore must remain possible');
 console.log('PASS record integrity guard: tombstone blocked, normal save preserved, explicit restore allowed.');
})().catch(e=>{console.error(e);process.exit(1)});