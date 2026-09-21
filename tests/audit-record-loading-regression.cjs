const fs=require('fs'),vm=require('vm'),assert=require('assert');
const html=fs.readFileSync('app9240.html','utf8');

const helperStart=html.indexOf('function hlgbPendingExplicitRestore917(');
const bundleStart=html.indexOf('async function hlgbRecordLoadBundle',helperStart);
assert(helperStart>=0&&bundleStart>helperStart,'record loading helpers must exist');
const src=html.slice(helperStart,bundleStart);

assert(!src.includes('offset<12000'),'record loader must not have the old 12,000-row hard stop');
assert(src.includes('pageSize=500,maxPages=200'),'record loader must page to a high safety ceiling');
assert(src.includes('deleted_at=is.null'),'full REST fallback must read active records only');
assert(src.includes('hlgbRecordPendingAuthoritativeRows917'),'full load must validate exact pending IDs');

const pending={modules:{hubFinanceEntries:[{id:'dead',data:{id:'dead',description:'old'},deleted:false}]}};
const requests=[];
let rpcCalls=0;
const ctx=vm.createContext({
 console,
 encodeURIComponent,
 Date,
 JSON,
 Map,Set,
 cloudUser:{email:'owner@example.com'},
 HLGB_OWNER_EMAIL:'owner@example.com',
 HLGB_RECORD_MODULES:['cuts','hubFinanceEntries'],
 hlgbRecordSnapshots:{hubFinanceEntries:new Map()},
 hlgbRecordPendingRead:()=>pending,
 normEmail:v=>String(v||'').trim().toLowerCase(),
 cloudRequest:async(path,opts={})=>{
   requests.push(path);
   if(path==='rpc/hlgb_load_records_page'){
     rpcCalls++;
     throw new Error('simulated RPC outage');
   }
   if(path.includes('module=eq.hubFinanceEntries')&&path.includes('entity_id=eq.dead')){
     return [{module:'hubFinanceEntries',entity_id:'dead',data:{id:'dead',description:'old'},deleted_at:'2026-09-21T12:00:00Z',revision:4,updated_at:'2026-09-21T12:00:00Z',updated_by:null}];
   }
   if(path.startsWith('hlgb_records?select=')&&path.includes('deleted_at=is.null')){
     return [{module:'cuts',entity_id:'final-cut',data:{id:'final-cut',orderId:'O1',status:'Finalizado'},deleted_at:null,revision:3,updated_at:'2026-09-21T13:00:00Z',updated_by:null}];
   }
   throw new Error('unexpected request '+path);
 }
});
vm.runInContext(src,ctx);

(async()=>{
 const out=await ctx.hlgbRecordLoadDirect(null);
 assert.equal(rpcCalls,1,'RPC failure should enter REST fallback once');
 assert(out.rows.some(r=>r.module==='cuts'&&r.entity_id==='final-cut'&&!r.deleted_at),'active cut must survive fallback loading');
 const dead=out.rows.find(r=>r.module==='hubFinanceEntries'&&r.entity_id==='dead');
 assert(dead&&dead.deleted_at,'exact pending tombstone must be merged into the full-load bundle');
 assert(requests.some(x=>x.includes('deleted_at=is.null')),'fallback query must exclude bulk historical tombstones');

 ctx.hlgbRecordSnapshots.hubFinanceEntries.set('dead',{deleted_at:'2026-09-21T12:00:00Z',data:{id:'dead'}});
 assert.equal(ctx.hlgbPendingOpCanReplay917('hubFinanceEntries',pending.modules.hubFinanceEntries[0]),false,'normal pending edit must not replay over a tombstone');
 assert.equal(ctx.hlgbPendingOpCanReplay917('hubFinanceEntries',{id:'dead',data:{id:'dead',__hlgb_explicit_restore:true},deleted:false}),true,'explicit restore must remain possible');

 const preserveStart=html.indexOf('async function hlgbRecordLoadBundle');
 const coreStart=html.indexOf('async function hlgbLoadNormalizedCore',preserveStart);
 const saveStart=html.indexOf('async function hlgbRecordRpcSave',coreStart);
 const preserve=html.slice(preserveStart,coreStart);
 const core=html.slice(coreStart,saveStart);
 assert(preserve.includes('explicitRestoreIds'),'preserve-local merge must distinguish explicit restore from ordinary pending writes');
 assert(preserve.includes('if(!explicitRestoreIds.has(rid))local.delete(rid)'),'remote tombstone must remove ordinary local pending copy');
 assert(core.includes('hlgbPendingOpCanReplay917(module,op)'),'pending replay must re-check tombstone safety');

 console.log('PASS record loading: fallback is complete/active-only, exact pending tombstones are fetched, stale pending replay is blocked.');
})().catch(e=>{console.error(e);process.exit(1)});