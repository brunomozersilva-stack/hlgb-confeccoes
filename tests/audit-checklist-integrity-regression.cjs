const fs=require('fs'),vm=require('vm'),assert=require('assert');
const src=fs.readFileSync(require('path').join(__dirname,'..','release-checklist-integrity.js'),'utf8');
const first={id:1,productionId:10,orderId:20,productId:30,qty:420,status:'Pendente',createdAt:'2026-09-10T10:00:00Z',destinationId:40,unitPrice:1,total:420};
const duplicate={...first,id:2,createdAt:'2026-09-10T10:00:10Z'};
const distinct={...first,id:3,createdAt:'2026-09-10T10:00:20Z',destinationId:41};
let renders=0;
const db={materialChecklists:[first]};
const window={
 db,
 hlgb916CreateMaterialChecklist(){const r={...duplicate,id:99,createdAt:'2026-09-10T10:00:30Z'};db.materialChecklists.push(r);return r},
 renderDestinationChecklists(){renders++;return db.materialChecklists.map(x=>x.id)}
};
const ctx=vm.createContext({db,window,console});vm.runInContext(src,ctx);
const returned=window.hlgb916CreateMaterialChecklist();
assert.equal(returned.id,1,'exact repeated checklist must reuse existing row');
assert.deepEqual(db.materialChecklists.map(x=>x.id),[1],'new exact duplicate must be removed before save');
db.materialChecklists.push(duplicate,distinct);
const canonical=window.hlgbCanonicalMaterialChecklists(db.materialChecklists);
assert.deepEqual(canonical.map(x=>x.id),[1,3],'historical exact duplicate must be consolidated but genuine variant preserved');
const rendered=window.renderDestinationChecklists();
assert.deepEqual(rendered,[1,3],'renderer must hide only exact equivalent duplicate');
assert.deepEqual(db.materialChecklists.map(x=>x.id),[1,2,3],'renderer must not delete historical database rows');
assert.equal(renders,1);assert.equal(window.HLGB_CHECKLIST_INTEGRITY_GUARD,'v1');
console.log('PASS checklist integrity: exact duplicate blocked/hidden; distinct reassignment preserved; history not deleted.');