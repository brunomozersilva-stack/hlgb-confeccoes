'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const app=fs.readFileSync('app9240.html','utf8');
const recovery=fs.readFileSync('release-sync-recovery-v9301.js','utf8');
function grab(start,end){
 const a=app.indexOf(start);
 if(a<0)throw Error('Missing '+start);
 const b=app.indexOf(end,a+start.length);
 if(b<a)throw Error('Missing end '+end);
 return app.slice(a,b);
}
const moduleNames=[...grab('const HLGB_RECORD_MODULES=[','const HLGB_RECORD_RPC_OMITTED_9535=').matchAll(/"([^"]+)"/g)]
 .map(m=>m[1]);
const gapNames=[...grab('const HLGB_RECORD_RPC_OMITTED_9535=[','const HLGB_RECORD_PENDING_KEY=').matchAll(/"([^"]+)"/g)]
 .map(m=>m[1]);
const pendingImpl=grab('function hlgbRecordPendingIdentitySet9535(){','function hlgbRecordPendingClear()');
const loadImpl=grab('async function hlgbRecordLoadDirect(since=null){','async function hlgbRecordLoadBundle(');
const bundleImpl=grab('async function hlgbRecordLoadBundle(','async function hlgbLoadNormalizedCore(');
const incomingImpl=grab('function hlgbApplyRecordRow(row){','function hlgbRenderIncomingRecord(');
function runtime(){
 const ls=new Map();
 const ctx={
  window:{},moduleNames:moduleNames.slice(),Date,JSON,URLSearchParams,
  HLGB_RECORD_MODULES:moduleNames,HLGB_RECORD_RPC_OMITTED_9535:gapNames,
  HLGB_OWNER_EMAIL:'owner@test.invalid',cloudUser:{email:'owner@test.invalid'},
  cloudAccessToken:'synthetic-auth-token',
  db:{orders:[],routePlans:[],labelTemplates:[],operationalWriteoffs:[]},
  hlgbRecordSnapshots:{orders:new Map(),routePlans:new Map(),labelTemplates:new Map(),operationalWriteoffs:new Map()},
  hlgbRecordLastSeen:{},hlgbRecordGlobalLastSeen:'',
  hlgbRecordReadable:new Set(),
  localStorage:{
   getItem:k=>ls.has(k)?ls.get(k):null,
   setItem:(k,v)=>ls.set(k,String(v)),
   removeItem:k=>ls.delete(k)
  },
  console:{warn(){},error(){},info(){}},
  hlgbRecordPendingRead(){try{return JSON.parse(ls.get('hlgb_records_pending_v91')||'null')}catch(_){return null}},
  hlgbRecordPendingAuthoritativeRows917:async()=>[],
  hlgbRecordHydrateData:(module,row)=>({...row.data}),
  hlgbRecordRowValue:(row)=>({...row.data}),
  hlgbRecordClone:x=>JSON.parse(JSON.stringify(x)),
  hlgbRecordDataEqual:(a,b)=>JSON.stringify(a)===JSON.stringify(b),
  hlgbRecordLocalMap:function(module){return new Map((ctx.db[module]||[]).map(x=>[String(x.id),x]))},
  hlgbPendingExplicitRestore917:()=>false,
  hlgbRecordSnapshotRows:function(module,rows){
   ctx.hlgbRecordSnapshots[module]=new Map(rows.map(r=>[String(r.entity_id),
    {data:r.data,deleted_at:r.deleted_at,revision:r.revision,updated_at:r.updated_at}]));
  },
  hlgbApplyRecordRow:()=>false,
  document:{hidden:false,visibilityState:'visible'},
  navigator:{onLine:true}
 };
 ctx.window=ctx;vm.createContext(ctx);
 vm.runInContext(pendingImpl+loadImpl+bundleImpl+incomingImpl,ctx);
 ctx.__storage=ls;
 return ctx;
}
function record(module,id,rev,data,at='2026-11-10T17:13:20.000Z'){
 return {module,entity_id:String(id),revision:rev,updated_at:at,deleted_at:null,data};
}
test('backend paginated whitelist omissions covered by complementary REST read',async()=>{
 const ctx=runtime(),query=[];
 const route=record('routePlans','route-xyz',1,{id:'route-xyz',driver:'Bruno',stops:[{name:'Roseli'}]});
 const label=record('labelTemplates','label-2',2,{id:'label-2',name:'Etiqueta'});
 ctx.cloudRequest=async(path,opts)=>{
  query.push([path,opts.method]);
  if(path==='rpc/hlgb_load_records_page')return {rows:[record('orders','order1',1,{id:'order1'})],has_more:false,server_time:'2026-11-10T17:30:00Z'};
  if(path.includes('module=in.('))return [route,label];
  throw Error('Unexpected '+path);
 };
 const data=await ctx.hlgbRecordLoadDirect(null);
 assert.deepEqual(Array.from(data.rows,r=>r.module).sort(),['labelTemplates','orders','routePlans']);
 assert.equal(query.filter(x=>x[1]==='GET').length,1,'One batched authenticated query, not 10 serial calls');
 assert.match(query[1][0],/routePlans/);
 assert.match(query[1][0],/deleted_at=is.null/);
 assert.equal(data.modules.includes('routePlans'),true);
 assert.equal(data.modules.includes('operationalWriteoffs'),true);
 assert.equal(ctx.__storage.size,0);
});
test('incremental catchup also retrieves updates from omitted modules',async()=>{
 const ctx=runtime();const q=[];
 ctx.cloudRequest=async(path,opts)=>{
  q.push(path);
  if(path==='rpc/hlgb_load_records_page')return {rows:[],has_more:false};
  if(path.includes('module=in.('))return [record('routePlans','r2',3,{id:'r2',stops:[]})];
  throw Error('Unexpected '+path);
 };
 const rows=(await ctx.hlgbRecordLoadDirect('2026-11-10T15:00:00.000Z')).rows;
 assert.equal(rows.length,1);
 assert.match(q[1],/updated_at=gte/);
 assert.equal(rows[0].entity_id,'r2');
});
test('REST supplement failure is never silently interpreted as no routes',async()=>{
 const ctx=runtime();
 ctx.cloudRequest=async(path)=>{
  if(path==='rpc/hlgb_load_records_page')return {rows:[record('orders','o1',1,{id:'o1'})],has_more:false};
  throw Error('Network failure on missing module');
 };
 await assert.rejects(()=>ctx.hlgbRecordLoadDirect(null),/Network failure/);
});
test('full load never overwrites a locally pending route while loading new remote route',async()=>{
 const ctx=runtime();
 const local={id:'route-pending',driver:'Operador Safari',stops:[{name:'Roseli'}]};
 ctx.db.routePlans=[local];
 ctx.__storage.set('hlgb_durable_wal_v1',JSON.stringify({entries:{
  'routePlans|route-pending':{module:'routePlans',id:'route-pending',opId:'op1',data:local}
 }}));
 const remote=[
 record('routePlans','route-pending',4,{id:'route-pending',driver:'Chrome anterior',stops:[]}),
 record('routePlans','route-other',2,{id:'route-other',driver:'Outro computador',stops:[]})];
 ctx.hlgbRecordLoadDirect=async()=>({modules:ctx.HLGB_RECORD_MODULES.slice(),rows:remote,server_time:''});
 await ctx.hlgbRecordLoadBundle({preserveLocal:false,since:null});
 assert.equal(ctx.db.routePlans.find(x=>x.id==='route-pending').driver,'Operador Safari');
 assert.equal(ctx.db.routePlans.find(x=>x.id==='route-other').driver,'Outro computador');
 assert.equal(JSON.parse(ctx.__storage.get('hlgb_durable_wal_v1')).entries['routePlans|route-pending'].opId,'op1');
});
test('realtime/incremental cannot replace a different local edit that is queued',()=>{
 const ctx=runtime();
 const local={id:'route-edit',driver:'Safari',stops:[{name:'Luana'}]};
 ctx.db.routePlans=[local];
 ctx.hlgbRecordSnapshots.routePlans.set('route-edit',{revision:1,updated_at:'2026-11-10T15:00:00Z'});
 ctx.__storage.set('hlgb_records_pending_v91',JSON.stringify({modules:{routePlans:[{id:'route-edit',deleted:false,data:local}]}}));
 assert.equal(ctx.hlgbApplyRecordRow(record('routePlans','route-edit',2,{id:'route-edit',driver:'Chrome'})),false);
 assert.equal(ctx.db.routePlans[0].driver,'Safari');
 assert.equal(ctx.window.__HLGB_SYNC_PROTECTED_INCOMING_9535,1);
 ctx.__storage.delete('hlgb_records_pending_v91');
 assert.equal(ctx.hlgbApplyRecordRow(record('routePlans','route-edit',2,{id:'route-edit',driver:'Chrome'})),true);
 assert.equal(ctx.db.routePlans[0].driver,'Chrome');
});
test('server tombstone still wins against unsafe local resurrecting copy',()=>{
 const ctx=runtime();
 ctx.db.orders=[{id:'old',model:'Archived'}];
 ctx.__storage.set('hlgb_durable_wal_v1',JSON.stringify({entries:{
  'orders|old':{module:'orders',id:'old',opId:'old-op'}
 }}));
 const tomb={...record('orders','old',12,{id:'old'}),deleted_at:'2026-11-10T15:00:00Z'};
 assert.equal(ctx.hlgbApplyRecordRow(tomb),true);
 assert.equal(ctx.db.orders.length,0);
 assert.ok(ctx.__storage.get('hlgb_durable_wal_v1'),'WAL still preserved for remote-proof reconciliation');
});
test('runtime includes routing, operational writeoffs and all documented gap modules',()=>{
 for(const m of [...gapNames,'operationalWriteoffs'])assert.ok(moduleNames.includes(m),m+' missing in browser module list');
 assert.equal(gapNames.length,10);
 assert.match(app,/table:'hlgb_records'/);
});
function syncRecoveryRuntime(editing=false){
 const store=new Map(),call=[];
 store.set('hlgb_records_pending_v91',JSON.stringify({modules:{orders:[{id:'1',data:{id:'1',name:'pending'}}]}}));
 const win={};const appShell={};const activeInput={tagName:'INPUT',id:'otherSearch',closest(selector){return selector==='#appShell'?appShell:null}};
 const doc={
  hidden:false,visibilityState:'visible',activeElement:editing?activeInput:null,
  documentElement:{dataset:{}},
  getElementById:id=>id==='appShell'?appShell:null,
  querySelector:sel=>sel==='#appShell .page.active'?{id:'pedidos'}:null,
  addEventListener(){}
 };
 const ctx={window:win,document:doc,navigator:{onLine:true},
  hlgbRecordReady:true,hlgbRealtimeState:'SUBSCRIBED',cloudAccessToken:'fake',
  hlgbRecordGlobalLastSeen:'2026-11-10T17:00:00Z',
  hlgbRecordLastSeen:{orders:'2026-11-10T17:00:00Z'},
  hlgbRecordSnapshots:{orders:new Map([['1',{revision:1,updated_at:'2026-11-10T17:00:00Z'}]])},
  localStorage:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v),removeItem:k=>store.delete(k)},
  cloudEnsureFreshSession:async()=>true,hlgbRecordPendingStore(){},
  hlgbNormalizedSyncNow:async()=>false,
  hlgbRecordLoadBundle:async(opts)=>{call.push({load:opts});return {rows:[record('orders','new',2,{id:'new'},'2026-11-10T17:05:00Z')]};},
  setCloudStatus(){},renderOrders(){call.push('render')},
  console:{info(){},warn(){},error(){}},
  setTimeout:()=>1,clearTimeout(){},setInterval:()=>1,clearInterval(){},addEventListener(){},
  getComputedStyle:()=>({display:'none'})
 };
 Object.assign(win,ctx);ctx.window=ctx;
 ctx.hlgbRenderIncomingRecord=()=>{call.push('defer-render')};
 vm.createContext(ctx);
 vm.runInContext(recovery,ctx);
 return {ctx,call};
}
test('incremental pull occurs EVEN while normalized local pending queue exists',async()=>{
 const {ctx,call}=syncRecoveryRuntime(false);
 await ctx.hlgbSyncRecovery9301.incrementalSync(true);
 assert.ok(call.some(x=>x.load),'Previously returned flush-only without reading remote data');
 assert.equal(ctx.hlgbSyncRecovery9301.status().lastResult.kind,'incremental');
});
test('while an input is focused, pull still occurs but redraw is deferred',async()=>{
 const {ctx,call}=syncRecoveryRuntime(true);
 await ctx.hlgbSyncRecovery9301.incrementalSync(true);
 assert.ok(call.some(x=>x.load),'Focused filter must not block cloud read');
 assert.ok(call.includes('defer-render'),'Focused input must prevent screen jumping');
 assert.ok(!call.includes('render'));
});
