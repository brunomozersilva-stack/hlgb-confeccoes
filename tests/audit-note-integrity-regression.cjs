const fs=require('fs'),vm=require('vm'),assert=require('assert');
const src=fs.readFileSync(require('path').join(__dirname,'..','release-note-integrity.js'),'utf8');
const projectionInvoices=[
 {id:'1788874522423544',items:[{productId:'amanda',qty:437}],value:1782.96},
 {id:'true-old',items:[{productId:'old',qty:100}],value:500},
 {id:'source-legacy',items:[{productId:'x',qty:10,source:'faction_delivery_v9140'}],value:10},
 {id:'9999999999999',items:[{productId:'y',qty:12}],value:12}
];
const orders=[
 {id:'ord-amanda',grade:[{productId:'amanda',qty:490}]},
 {id:'ord-tammy',grade:[{productId:'tammy',qty:1078}]},
 {id:'ord-sandy',grade:[{productId:'sandy',qty:420}]}
];
const noteQueue=[
 {id:'m9223-9999999999999-1',orderId:'ord-amanda',productId:'other',qty:1,status:'Aguardando'},
 {id:'a1',orderId:'ord-amanda',productId:'amanda',qty:437,status:'Aguardando'},
 {id:'a2',orderId:'ord-amanda',productId:'amanda',qty:51,status:'Aguardando'},
 {id:'t1',orderId:'ord-tammy',productId:'tammy',qty:1077,status:'Aguardando'},
 {id:'t2',orderId:'ord-tammy',productId:'tammy',qty:1078,status:'Aguardando'},
 {id:'s1',orderId:'ord-sandy',productId:'sandy',qty:419,status:'Aguardando'},
 {id:'s2',orderId:'ord-sandy',productId:'sandy',qty:1,status:'Aguardando'}
];
const orphan={id:'fin-orphan',projectionInvoiceId:'missing-projection',clientName:'Teste',status:'Pago',value:10,paid:10,remaining:0};
const finance=[{...orphan}];
const local=new Map();
const localStorage={getItem(k){return local.has(k)?local.get(k):null},setItem(k,v){local.set(k,String(v))},removeItem(k){local.delete(k)}};
const hlgbRecordSnapshots={
 projectionInvoices:new Map([['true-old',{data:{id:'true-old'},deleted_at:null}]]),
 finance:new Map([['fin-orphan',{data:{...orphan},deleted_at:null}]])
};
const fakeEl=()=>({style:{setProperty(){}},setAttribute(){},appendChild(){},querySelector(){return null},querySelectorAll(){return[]},children:[]});
let localSaves=0,deleteCalls=0;
const context={
 console,
 db:{projectionInvoices,noteQueue,orders,finance},
 hlgbRecordSnapshots,
 hlgbRecordReady:true,
 localStorage,
 localSaveOnly(){localSaves++},
 alert(){},clearTimeout(){},setTimeout(){return 1},
 MutationObserver:class{constructor(){} observe(){}},
 document:{head:{appendChild(){}},documentElement:{},createElement(){return fakeEl()},getElementById(){return null},querySelector(){return null},querySelectorAll(){return[]}},
 window:{
  addEventListener(){},
  async hlgbRecordSaveWithRetry(module,id,data,deleted){
   if(module==='finance'&&deleted){deleteCalls++;return {applied:true,deleted_at:'2026-10-26T20:00:00.000Z',data:{...data}}}
   return {applied:true,data:{...data}}
  }
 }
};
vm.createContext(context);vm.runInContext(src,context);
const canonical=context.window.hlgbCanonicalProjectionInvoices().map(x=>String(x.id));
assert.deepStrictEqual(canonical,['true-old'],'only genuine legacy invoice must remain visible');
const over=context.window.hlgbNoteQueueOverages();
assert.strictEqual(over.length,1,'only one order/product group should be overqueued');
assert.strictEqual(over[0].orderId,'ord-tammy');
assert.strictEqual(over[0].productId,'tammy');
assert.strictEqual(over[0].queued,2155);
assert.strictEqual(over[0].expected,1078);
const unsafe=[...context.window.hlgbNoteUnsafeQueueIds()].sort();
assert.deepStrictEqual(unsafe,['t1','t2']);
assert(!unsafe.includes('a1')&&!unsafe.includes('a2'),'437+51 Amanda is a valid partial-delivery sequence');
assert(!unsafe.includes('s1')&&!unsafe.includes('s2'),'419+1 Sandy exactly completes the order');
const shadows=context.window.hlgbNoteLegacyShadowIds();
assert(shadows.has('1788874522423544'),'known migration id must stay quarantined');
assert(shadows.has('9999999999999'),'active m9223 lineage must quarantine its old invoice');

(async()=>{
 const found=context.window.hlgbFindOrphanNoteFinance9411();
 assert.strictEqual(found.length,1,'missing projection must identify the finance row as orphan');
 assert.strictEqual(String(found[0].id),'fin-orphan');
 const cleaned=await context.window.hlgbCleanupOrphanNoteFinance9411();
 assert.strictEqual(cleaned.deleted,1,'cloud-confirmed orphan must be deleted once');
 assert.strictEqual(deleteCalls,1,'orphan cleanup must issue exactly one delete');
 assert.strictEqual(context.db.finance.length,0,'confirmed tombstone must remove local finance row');
 assert(localSaves>0,'local cache must be persisted after removal');
 assert(context.window.hlgbNoteFinanceTombstoneIds9418().includes('fin-orphan'),'confirmed tombstone id must be remembered');
 assert(context.hlgbRecordSnapshots.finance.get('fin-orphan').deleted_at,'current snapshot must be marked tombstoned immediately');

 // Simula uma carga antiga chegando depois da confirmação da nuvem.
 context.db.finance.push({...orphan});
 context.hlgbRecordSnapshots.finance.set('fin-orphan',{data:{...orphan},deleted_at:null});
 const reconciled=context.window.hlgbReconcileNoteFinanceTombstones9418();
 assert.strictEqual(reconciled.removed,1,'stale rehydration must be pruned from local memory');
 assert.strictEqual(context.db.finance.length,0,'stale snapshot must not resurrect confirmed orphan');
 assert.strictEqual(context.window.hlgbFindOrphanNoteFinance9411().length,0,'remembered tombstone must not requeue the same deletion');
 assert.strictEqual(deleteCalls,1,'reconciliation must not create another cloud delete');
 console.log('PASS note integrity guard: history/queue rules preserved and confirmed orphan tombstones cannot resurrect.');
})().catch(err=>{console.error(err);process.exitCode=1});
