const fs=require('fs'),vm=require('vm'),assert=require('assert');
const html=fs.readFileSync('app9240.html','utf8');
function extract(start,end){const a=html.lastIndexOf(start),b=html.indexOf(end,a);assert(a>=0&&b>a);return html.slice(a,b)}
const helper=html.includes('function hlgbRecordDataEqual(')?extract('function hlgbRecordDataEqual(','function hlgbRecordPendingStore('):'';
const source=helper+extract('function hlgbRecordPendingStore(','function hlgbPendingExplicitRestore917(')+extract('async function hlgbNormalizedSyncModule(','async function hlgbNormalizedSyncNow(');
const local={id:'fixture',details:{quantity:4,color:'rubi'},sizes:['P','M'],updatedAt:'2026-09-30'};
const remote={updatedAt:'2026-09-30',sizes:['P','M'],details:{color:'rubi',quantity:4},id:'fixture'};
const storage=new Map(),writes=[];
const ctx=vm.createContext({console,Map,JSON,Date,HLGB_RECORD_PENDING_KEY:'pending',HLGB_RECORD_MODULES:['fixtureModule'],hlgbRecordReady:true,cloudApplying:false,cloudBootstrapping:false,cloudAccessToken:'mock',cloudUser:{email:'fixture@example.invalid'},normEmail:x=>x,hlgbRecordCanWrite:()=>true,hlgbRecordClone:x=>JSON.parse(JSON.stringify(x)),cloudEq:(a,b)=>JSON.stringify(a)===JSON.stringify(b),hlgbRecordSnapshots:{fixtureModule:new Map([['fixture',{data:remote,deleted_at:null}]])},hlgbRecordLocalMap:()=>new Map([['fixture',local]]),localStorage:{setItem:(k,v)=>storage.set(k,v)},hlgbRecordPendingClear:()=>storage.delete('pending'),hlgbRecordSaveWithRetry:async(...args)=>writes.push(args)});
vm.runInContext(source,ctx);
(async()=>{
 ctx.hlgbRecordPendingStore();
 assert(!storage.has('pending'),'object key order must not create a normalized pending operation');
 await ctx.hlgbNormalizedSyncModule('fixtureModule');
 assert.equal(writes.length,0,'object key order must not issue a save or create WAL entries');
 for(const change of [()=>local.details.quantity++,()=>local.sizes.reverse(),()=>local.updatedAt='2026-10-01',()=>delete local.details.color]){
  change();ctx.hlgbRecordPendingStore();
  assert(storage.has('pending'),'actual content changes must remain pending');
  await ctx.hlgbNormalizedSyncModule('fixtureModule');
 }
 assert.equal(writes.length,4,'content, array order, metadata and removed fields must still be saved');
 ctx.hlgbRecordSnapshots.fixtureModule.clear();ctx.hlgbRecordPendingStore();
 assert(storage.has('pending'),'missing remote snapshot must never count as confirmation');
 ctx.hlgbRecordSnapshots.fixtureModule.set('fixture',{data:local,deleted_at:'2026-09-30'});ctx.hlgbRecordPendingStore();
 assert(storage.has('pending'),'deleted remote row must not count as an active match');
 console.log('PASS normalized sync: key order is ignored; actual changes, metadata, array order, absent snapshots and tombstones are preserved.');
})().catch(e=>{console.error(e);process.exit(1)});
