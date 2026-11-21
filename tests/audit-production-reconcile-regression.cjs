const fs=require('fs'),vm=require('vm'),assert=require('assert');
const html=fs.readFileSync('app9240.html','utf8');
const start=html.indexOf('<!-- HLGB_V9240_CUT_PRODUCTION_QTY_START -->');
const end=html.indexOf('<!-- HLGB_V9240_CUT_PRODUCTION_QTY_END -->',start);
assert(start>=0&&end>start,'final cut→production reconciler block must exist');
const block=html.slice(start,end);
const js=block.match(/<script>([\s\S]*)<\/script>/)?.[1]||'';
assert(js,'reconciler script must be extractable');

let queued=0,pending=0,saved=0;
const db={
 products:[{id:'P1',name:'Modelo 1'},{id:'P2',name:'Modelo 2'}],
 orders:[{id:'O1',client:'Cliente',grade:[{productId:'P1',qty:600},{productId:'P2',qty:400}]}],
 cuts:[{id:'C1',orderId:'O1',status:'Finalizado',actualCutGrade:[{productId:'P1',qty:600},{productId:'P2',qty:400}],pieces:1000}],
 production:[]
};
const window={addEventListener(){},};
const ctx=vm.createContext({
 window,db,console,Date,Math,
 setTimeout(){return 1},clearTimeout(){},
 isoDate:d=>new Date(d).toISOString().slice(0,10),
 localSaveOnly(){saved++},
 hlgbRecordPendingStore(){pending++},
 hlgbQueueNormalizedSync(){queued++}
});
vm.runInContext(js,ctx);

assert.equal(typeof window.syncFinalizedCutsToProduction,'function');
assert.equal(window.syncFinalizedCutsToProduction(),true,'first reconciliation must create production rows');
assert.equal(db.production.length,2,'one free production row must be created per cut product');
assert.equal(db.production.find(p=>p.productId==='P1').planned,600);
assert.equal(db.production.find(p=>p.productId==='P2').planned,400);

const ids=db.production.map(p=>p.id);
assert.equal(window.syncFinalizedCutsToProduction(),false,'repeat reconciliation with unchanged data must be a no-op');
assert.equal(db.production.length,2,'repeat reconciliation must not create duplicates');
assert.deepEqual(db.production.map(p=>p.id),ids,'existing free rows must be reused');

// Legitimate split/assignment uses the same cut/product but must reduce only the free balance.
db.production.push({
 id:'assigned-P1',cutId:'C1',orderId:'O1',productId:'P1',cutProductKey:'C1:P1',
 planned:300,done:0,stage:'Aguardando produção',assignmentSource:true,productionLocationId:'LOC1',factionId:null
});
assert.equal(window.syncFinalizedCutsToProduction(),true,'adding an assigned split must recalculate the free balance');
const p1free=db.production.find(p=>p.productId==='P1'&&!p.productionLocationId&&!p.factionId&&p.stage!=='Consolidado');
assert.equal(p1free.planned,300,'free P1 row must become order total minus assigned split');
assert.equal(db.production.find(p=>p.id==='assigned-P1').planned,300,'assigned split must remain untouched');

// A second accidental free row for the same key is consolidated, not multiplied.
db.production.push({
 id:'duplicate-free',cutId:'C1',orderId:'O1',productId:'P1',cutProductKey:'C1:P1',
 planned:300,done:0,stage:'Aguardando atribuição',assignmentSource:true,productionLocationId:null,factionId:null
});
assert.equal(window.syncFinalizedCutsToProduction(),true,'duplicate free row must be reconciled');
const duplicate=db.production.find(p=>p.id==='duplicate-free');
assert.equal(duplicate.planned,0,'extra free row must be zeroed');
assert.equal(duplicate.stage,'Consolidado','extra free row must be marked consolidated');
assert.equal(db.production.filter(p=>p.productId==='P1'&&!p.productionLocationId&&!p.factionId&&(+p.planned||0)>0).length,1,'only one positive free row may remain for a cut/product');

// If an adjusted cut removes a model entirely, its still-free row is zeroed instead of recreated.
db.cuts[0].actualCutGrade=[{productId:'P1',qty:600}];
assert.equal(window.syncFinalizedCutsToProduction(),true);
const p2=db.production.find(p=>p.productId==='P2');
assert.equal(p2.planned,0);
assert.equal(p2.stage,'Consolidado');

assert(saved>0&&pending>0&&queued>0,'changed reconciliation must schedule persistence/sync');
console.log('PASS production reconciliation: repeat runs are idempotent, assigned splits are preserved, duplicate free rows consolidate, removed models are zeroed.');