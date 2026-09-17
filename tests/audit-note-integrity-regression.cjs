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
const fakeEl=()=>({style:{setProperty(){}},setAttribute(){},appendChild(){},querySelector(){return null},querySelectorAll(){return[]},children:[]});
const context={console,db:{projectionInvoices,noteQueue,orders},alert(){},clearTimeout(){},setTimeout(fn){fn();return 1},MutationObserver:class{constructor(){} observe(){}},document:{head:{appendChild(){}},documentElement:{},createElement(){return fakeEl()},getElementById(){return null},querySelector(){return null},querySelectorAll(){return[]}},window:{}};
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
console.log('PASS note integrity guard: migrated history deduped; valid partial deliveries preserved; overqueued Tammy blocked.');