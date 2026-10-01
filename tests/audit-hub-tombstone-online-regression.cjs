const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path');
const src=fs.readFileSync(path.join(__dirname,'..','release-hub-tombstone-online.js'),'utf8');
function fixture({module='hubFinanceEntries',withSnapshot=true}={}){
 const store=new Map(),calls=[];
 const row={id:'1790118449369',value:0.01,description:'TESTE'};
 const ctx={
  console,
  db:{hubFinanceEntries:[{...row}],orders:[{id:'x'}]},
  localStorage:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,String(v)),removeItem:k=>store.delete(k)},
  hlgbRecordSnapshots:{
   hubFinanceEntries:new Map(withSnapshot?[['1790118449369',{data:{...row},deleted_at:'2026-09-24T01:12:27Z',revision:9,updated_at:'2026-09-24T01:12:27Z'}]]:[]),
   orders:new Map()
  },
  hlgbRecordId:(_m,r)=>String(r.id),
  localSaveOnly(){},
  window:{
   hlgbRecordSaveWithRetry:async function(m,id,data,deleted){
    calls.push({m,id,deleted});
    const e=new Error('Registro já excluído na nuvem');e.code='HLGB_TOMBSTONE_BLOCK';throw e;
   }
  }
 };
 ctx.window.window=ctx.window;
 ctx.window.hlgbRecordSnapshots=ctx.hlgbRecordSnapshots;
 ctx.window.localStorage=ctx.localStorage;
 ctx.window.db=ctx.db;
 ctx.window.localSaveOnly=ctx.localSaveOnly;
 ctx.window.hlgbRecordId=ctx.hlgbRecordId;
 store.set('hlgb_records_pending_v91',JSON.stringify({modules:{hubFinanceEntries:[{id:'1790118449369',data:{...row},deleted:false}],orders:[{id:'keep',data:{id:'keep'},deleted:false}]}}));
 vm.createContext(ctx);
 vm.runInContext(src,ctx);
 return {ctx,store,calls,row,module};
}
(async()=>{
 const f=fixture();
 const out=await f.ctx.window.hlgbRecordSaveWithRetry('hubFinanceEntries','1790118449369',f.row,false);
 assert(out.applied&&out.hlgbTombstonePruned&&out.hlgbOnlineCacheCompat,'cached tombstone must become confirmed cleanup');
 assert.equal(f.ctx.db.hubFinanceEntries.length,0,'stale local finance row must be removed');
 const pending=JSON.parse(f.store.get('hlgb_records_pending_v91'));
 assert.equal(pending.modules.hubFinanceEntries,undefined,'stale finance pending must be removed');
 assert.equal(pending.modules.orders.length,1,'unrelated pending data must remain');
 assert.equal(f.calls.length,1,'original cached guard is still invoked once');
 assert.equal(f.ctx.window.HLGB_HUB_TOMBSTONE_ONLINE_GUARD,'2026.10.01-v1');

 const other=fixture();
 await assert.rejects(
  other.ctx.window.hlgbRecordSaveWithRetry('orders','x',{id:'x'},false),
  e=>e.code==='HLGB_TOMBSTONE_BLOCK',
  'non-finance tombstones must keep existing behavior'
 );

 const noSnap=fixture({withSnapshot:false});
 await assert.rejects(
  noSnap.ctx.window.hlgbRecordSaveWithRetry('hubFinanceEntries','1790118449369',noSnap.row,false),
  e=>e.code==='HLGB_TOMBSTONE_BLOCK',
  'without authoritative tombstone snapshot, do not mask the error'
 );

 console.log('PASS online tombstone compatibility: cached Safari wrapper is neutralized only for confirmed Hub Finance tombstones.');
})().catch(e=>{console.error(e);process.exit(1)});