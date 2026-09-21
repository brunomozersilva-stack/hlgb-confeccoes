const fs=require('fs'),vm=require('vm'),assert=require('assert');
const src=fs.readFileSync(require('path').join(__dirname,'..','release-hub-integrity.js'),'utf8');
const store=new Map();
const localStorage={getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,String(v)),removeItem:k=>store.delete(k)};
let calls=[],alerts=0,statuses=[];
const db={hubFinanceEntries:[
 {id:'payroll-month-2026-09',description:'Folha de pagamento',value:100,status:'Realizado'},
 {id:123,description:'Fornecedor',value:50,status:'Previsto'}
]};
const snaps=new Map([
 ['payroll-month-2026-09',{revision:4,deleted_at:null,data:{id:'payroll-month-2026-09'}}],
 ['123',{revision:2,deleted_at:null,data:{id:123}}]
]);
store.set('hlgb_records_pending_v91',JSON.stringify({at:Date.now(),modules:{hubFinanceEntries:[{id:'payroll-month-2026-09',data:{id:'payroll-month-2026-09'},deleted:false}]}}));
const document={
 querySelector(){return null},
 querySelectorAll(){return []},
};
const window={
 db,
 renderHubFinance(){return true},
 hlgbRecordSaveWithRetry:async(module,id,data,deleted)=>{
   calls.push({module,id,data,deleted});
   if(id==='123'&&deleted)return {applied:true,data,deleted_at:null,revision:3};
   if(deleted){
     const row={revision:5,deleted_at:'2026-09-21T13:00:00Z',data};
     snaps.set(id,row);
     return {applied:true,data,deleted_at:row.deleted_at,revision:5};
   }
   snaps.set(id,{revision:5,deleted_at:null,data});
   return {applied:true,data,deleted_at:null,revision:5};
 }
};
const context={
 window,document,db,localStorage,console,
 hlgbRecordSnapshots:{hubFinanceEntries:snaps},
 hlgbRecordReady:true,
 cloudEnsureFreshSession:async()=>true,
 hlgbEnsureRecordsOnlineAfterLogin:async()=>true,
 localSaveOnly(){},
 confirm:()=>true,
 alert:()=>{alerts++},
 setCloudStatus:(s)=>statuses.push(s),
 setTimeout:()=>1,
 clearTimeout(){},
 hlgbAfterLogin:null
};
vm.createContext(context);vm.runInContext(src,context);

(async()=>{
 assert.equal(window.HLGB_HUB_INTEGRITY_GUARD,'v1');

 const ok=await window.deleteHubFinanceEntry('payroll-month-2026-09');
 assert.equal(ok,true,'text id delete must succeed');
 assert.equal(db.hubFinanceEntries.some(x=>String(x.id)==='payroll-month-2026-09'),false,'confirmed tombstone must remove local text-id row');
 assert.equal(calls[0].deleted,true);
 assert.equal(calls[0].data.__hlgb_explicit_delete,true,'delete must carry explicit marker');
 assert.equal(store.has('hlgb_records_pending_v91'),false,'stale pending replay for deleted Hub row must be cleared');

 const bad=await window.deleteHubFinanceEntry(123);
 assert.equal(bad,false,'delete without deleted_at confirmation must fail');
 assert.equal(db.hubFinanceEntries.some(x=>String(x.id)==='123'),true,'unconfirmed delete must preserve local row');
 assert.equal(alerts,1,'unconfirmed delete should notify once');

 calls=[];
 const toggled=await window.toggleHubFinanceEntry('123');
 assert.equal(toggled,true,'text-safe status toggle must save');
 assert.equal(calls[0].id,'123');
 assert.equal(calls[0].data.status,'Realizado');

 // If a legacy/local copy reappears after a cloud tombstone, purge must remove it.
 snaps.set('123',{revision:7,deleted_at:'2026-09-21T13:10:00Z',data:{id:123}});
 db.hubFinanceEntries.push({id:123,description:'Fornecedor',value:50,status:'Previsto'});
 const removed=window.hlgbHubPurgeTombstones();
 assert(removed>=1,'local copies of tombstoned Hub rows must be purged');
 assert.equal(db.hubFinanceEntries.some(x=>String(x.id)==='123'),false);

 console.log('PASS Hub integrity: string IDs, confirmed tombstone, pending replay cleanup, unconfirmed delete preservation and local purge.');
})().catch(e=>{console.error(e);process.exit(1)});