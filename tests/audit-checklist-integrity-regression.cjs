const fs=require('fs'),vm=require('vm'),assert=require('assert');
const src=fs.readFileSync(require('path').join(__dirname,'..','release-checklist-integrity.js'),'utf8');
const first={id:1,productionId:10,orderId:20,productId:30,qty:420,status:'Pendente',createdAt:'2026-09-10T10:00:00Z',destinationId:40,unitPrice:1,total:420};
const duplicate={...first,id:2,createdAt:'2026-09-10T10:00:10Z'};
const distinct={...first,id:3,createdAt:'2026-09-10T10:00:20Z',destinationId:41};
const cap1={id:101,orderId:20,itemKey:'30',locationId:40,qty:420,date:'2026-09-11',source:'cut_assignment'};
const capDup={...cap1,id:102};
const capManual={id:103,orderId:20,itemKey:'30',locationId:40,qty:420,date:'2026-09-11',source:'capacity_queue_v9140',active:true};
const capFactionA={id:104,orderId:20,itemKey:'30',locationId:null,factionId:'FA',qty:210,date:'2026-09-11',source:'cut_assignment'};
const capFactionB={id:105,orderId:20,itemKey:'30',locationId:null,factionId:'FB',qty:210,date:'2026-09-11',source:'cut_assignment'};
let renders=0,capRenders=0;
const db={materialChecklists:[first],capacityAssignments:[cap1]};
const window={
 db,
 hlgb916CreateMaterialChecklist(){const r={...duplicate,id:99,createdAt:'2026-09-10T10:00:30Z'};db.materialChecklists.push(r);db.capacityAssignments.push({...capDup,id:199});return r},
 renderDestinationChecklists(){renders++;return db.materialChecklists.map(x=>x.id)},
 renderCapacityPlanning(){capRenders++;return db.capacityAssignments.map(x=>x.id)}
};
const ctx=vm.createContext({db,window,console});vm.runInContext(src,ctx);
const returned=window.hlgb916CreateMaterialChecklist();
assert.equal(returned.id,1,'exact repeated checklist must reuse existing row');
assert.deepEqual(db.materialChecklists.map(x=>x.id),[1],'new exact checklist duplicate must be removed before save');
assert.deepEqual(db.capacityAssignments.map(x=>x.id),[101],'new exact cut_assignment duplicate must be removed before save');
db.materialChecklists.push(duplicate,distinct);
const canonical=window.hlgbCanonicalMaterialChecklists(db.materialChecklists);
assert.deepEqual(canonical.map(x=>x.id),[1,3],'historical checklist duplicate consolidated; genuine variant preserved');
const rendered=window.renderDestinationChecklists();
assert.deepEqual(rendered,[1,3],'checklist renderer hides only exact equivalent duplicate');
assert.deepEqual(db.materialChecklists.map(x=>x.id),[1,2,3],'renderer must not delete historical checklist rows');

db.capacityAssignments.push(capDup,capManual,capFactionA,capFactionB);
const capCanonical=window.hlgbCanonicalAutoCapacity(db.capacityAssignments);
assert.deepEqual(capCanonical.map(x=>x.id),[101,103,104,105],'only exact automatic duplicate is consolidated; manual and distinct faction assignments are preserved');
const capRendered=window.renderCapacityPlanning();
assert.deepEqual(capRendered,[101,103,104,105],'capacity renderer must not merge different faction destinations');
assert.deepEqual(db.capacityAssignments.map(x=>x.id),[101,102,103,104,105],'capacity renderer must not delete historical rows');
assert.equal(renders,1);assert.equal(capRenders,1);assert.equal(window.HLGB_CHECKLIST_INTEGRITY_GUARD,'v2');
console.log('PASS checklist/capacity integrity: exact duplicates hidden; manual and distinct faction destinations preserved.');