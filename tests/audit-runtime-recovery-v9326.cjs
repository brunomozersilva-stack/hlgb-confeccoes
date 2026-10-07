const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert');
const root=path.join(__dirname,'..'),src=fs.readFileSync(path.join(root,'release-runtime-recovery-v9326.js'),'utf8');
function makeCtx({fail=false}={}){
 const store=new Map(),id='x1',data={id:'x1',description:'Teste',value:10,status:'Previsto',updatedAt:'2026-10-07T21:00:00.000Z'};
 store.set('hlgb_durable_wal_v1',JSON.stringify({entries:{['hubFinanceEntries|'+id]:{module:'hubFinanceEntries',id,deleted:false,data,createdAt:'2026-10-07T21:00:00.000Z'}}}));
 let cloud=null,saves=0,reconciles=0;
 const localStorage={getItem:k=>store.has(k)?store.get(k):null,setItem:(k,v)=>store.set(k,String(v)),removeItem:k=>store.delete(k)};
 const document={getElementById:()=>null,querySelector:()=>null,createElement:()=>({}),head:{appendChild(){}}};
 const ctx={console,setTimeout,clearTimeout,Promise,Date,JSON,Object,Array,String,Number,encodeURIComponent,localStorage,document,MutationObserver:undefined,queueMicrotask,navigator:{onLine:true},
  cloudRequest:async()=>cloud?[{module:'hubFinanceEntries',entity_id:id,data:cloud,deleted_at:null,revision:1,updated_at:'2026-10-07T21:00:01Z'}]:[],
  hlgbRecordSaveWithRetry:async(m,i,row)=>{saves++;if(fail)throw new Error('falha simulada');cloud=JSON.parse(JSON.stringify(row));return {applied:true,data:cloud}},
  hlgb955ReconcileServer:async()=>{reconciles++;if(cloud)store.set('hlgb_durable_wal_v1',JSON.stringify({entries:{}}))},setCloudStatus:()=>{},addEventListener:()=>{}};
 ctx.window=ctx;vm.runInNewContext(src,ctx);return {ctx,stats:()=>({saves,reconciles,wal:JSON.parse(store.get('hlgb_durable_wal_v1')).entries})};
}
(async()=>{
 assert(src.includes("const V='93.26'"),'release must identify v93.26');
 assert(src.includes('window.hlgb955FlushSilent=safeFlush'),'safe flush must become authoritative');
 assert(src.includes("'entradas e saidas por vencimento'"),'Hub top must have text fallback for due section');
 assert(src.includes("'#hubDue9166'"),'Hub due id must remain a preferred selector');
 assert(src.includes("'#hubFinanceEntriesTable'"),'planned entries must be promoted');
 assert(!src.includes('originalFlush'),'new recovery must never call the runaway legacy flusher');
 {const t=makeCtx();const ok=await t.ctx.hlgb955FlushSilent();assert.equal(ok,true);assert.equal(t.stats().saves,1);assert.equal(t.stats().reconciles,1);assert.equal(Object.keys(t.stats().wal).length,0)}
 {const t=makeCtx({fail:true});const ok=await t.ctx.hlgb955FlushSilent();assert.equal(ok,false);assert.equal(t.stats().saves,1);assert.equal(Object.keys(t.stats().wal).length,1);await t.ctx.hlgb955FlushSilent();assert.equal(t.stats().saves,1,'immediate retry must be throttled and WAL preserved')}
 console.log('PASS v93.26: WAL recovery is single-flight/throttled and Hub due entries have deterministic top placement.');
})().catch(e=>{console.error(e);process.exit(1)});
