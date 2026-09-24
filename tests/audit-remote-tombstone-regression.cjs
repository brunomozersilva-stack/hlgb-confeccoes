const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path');
const root=path.join(__dirname,'..');
const html=fs.readFileSync(path.join(root,'app9240.html'),'utf8');
const start=html.indexOf('async function hlgbRecordSaveWithRetry(');
const end=html.indexOf('async function hlgbNormalizedSyncModule(',start);
assert(start>=0&&end>start);
const saver=html.slice(start,end);
const guard=fs.readFileSync(path.join(root,'release-record-integrity.js'),'utf8');
const row={id:'test',value:0.01,status:'Realizado'};
function fixture({guarded=true,restore=false,deleted=false}={}){
 const store=new Map(),calls=[];
 let remote={data:{...row},deleted_at:'2026-09-23T15:54:49Z',revision:6,updated_at:'2026-09-23T15:54:49Z'};
 const ctx={console,Map,db:{hubFinanceEntries:[{...row}]},
  localStorage:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v),removeItem:k=>store.delete(k)},
  hlgbRecordSnapshots:{hubFinanceEntries:new Map([['test',{data:{...row},revision:4,deleted_at:null}]])},
  hlgbRecordLastSeen:{},hlgbRecordClone:v=>JSON.parse(JSON.stringify(v)),localSaveOnly(){},
  hlgbRecordId:(_,r)=>String(r.id),cloudMergeThreeWay:(_b,l)=>l,
  async hlgbRecordRpcSave(module,id,data,revision,del){
   calls.push({revision,del});
   if(revision!==remote.revision)return {...remote,applied:false};
   remote={...remote,data,revision:remote.revision+1,deleted_at:del?remote.deleted_at:null};
   return {...remote,applied:true};
  }
 };
 ctx.window=ctx;vm.createContext(ctx);vm.runInContext(saver,ctx);
 store.set('hlgb_records_pending_v91',JSON.stringify({modules:{hubFinanceEntries:[{id:'test',data:{...row},deleted:false}]}}));
 if(guarded)vm.runInContext(guard,ctx);
 const payload={...row,value:0.02,...(restore?{__hlgb_explicit_restore:true}:{})};
 return {ctx,calls,store,remote:()=>remote,save:()=>ctx.hlgbRecordSaveWithRetry('hubFinanceEntries','test',payload,deleted)};
}
(async()=>{
 const before=fixture({guarded:false});await before.save();
 assert.equal(before.calls.length,2);assert.equal(before.remote().deleted_at,null,'legacy saver reproduces resurrection');
 const after=fixture();await assert.rejects(after.save(),e=>e.code==='HLGB_TOMBSTONE_BLOCK');
 assert.equal(after.calls.length,1,'conflict tombstone must prevent second RPC');
 assert(after.remote().deleted_at,'remote deletion remains intact');
 assert.equal(after.ctx.db.hubFinanceEntries.length,0,'stale local row removed');
 assert.equal(after.ctx.hlgbRecordSnapshots.hubFinanceEntries.get('test').revision,6);
 assert.equal(after.store.size,0,'pending stale replay removed');
 const restore=fixture({restore:true});await restore.save();
 assert.equal(restore.calls.length,2);assert.equal(restore.remote().deleted_at,null,'explicit restoration remains supported');
 const deletion=fixture({deleted:true});await deletion.save();
 assert(deletion.remote().deleted_at,'repeat explicit deletion remains supported');
 console.log('PASS remote tombstone: actual legacy retry reproduced; guarded retry, snapshot, pending queue, explicit restore and delete verified.');
})().catch(e=>{console.error(e);process.exitCode=1});
