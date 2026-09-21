const fs=require('fs'),vm=require('vm'),assert=require('assert');
const src=fs.readFileSync(require('path').join(__dirname,'..','release-capacity-integrity.js'),'utf8');
const auto1={id:1,orderId:10,itemKey:'P1',locationId:20,factionId:null,qty:420,date:'2026-09-07',source:'cut_assignment'};
const auto2={...auto1,id:2};
const autoDifferentQty={...auto1,id:3,qty:200};
const autoDifferentFaction={...auto1,id:8,factionId:99};
const manual1={id:4,orderId:10,itemKey:'P1',locationId:20,qty:420,date:'2026-09-07',source:'capacity_queue_v9140'};
const manual2={...manual1,id:5};
const db={capacityAssignments:[auto1,auto2,autoDifferentQty,autoDifferentFaction,manual1,manual2]};
let saveCalls=0,persistCalls=0,renderCalls=0,incomingCalls=0,recordCalls=0,localSaves=0;
const snapshots={capacityAssignments:new Map([
 ['cloud-a',{revision:3,deleted_at:null,updated_at:'2026-09-17T12:00:00Z',data:{...auto1,id:'cloud-a',orderId:77,itemKey:'PX',qty:100}}],
])};
const window={db,
 save(){saveCalls++;return db.capacityAssignments.length},
 persistDb(){persistCalls++;return true},
 renderCapacityPlanning(){renderCalls++;return db.capacityAssignments.length},
 hlgbRenderIncomingRecord(){incomingCalls++;return true},
 hlgbRecordSaveWithRetry:async(module,id,data,deleted)=>{recordCalls++;return {applied:true,data,deleted_at:null,revision:1}}
};
const ctx=vm.createContext({db,window,console,setTimeout(){},hlgbAfterLogin(){},hlgbRecordSnapshots:snapshots,localSaveOnly(){localSaves++}});
vm.runInContext(src,ctx);
(async()=>{
 const canonical=window.hlgbCanonicalCapacityAssignments([auto1,auto2,autoDifferentQty,autoDifferentFaction,manual1,manual2]);
 assert.deepEqual(canonical.map(x=>x.id),[1,3,8,4,5],'only exact cut_assignment duplicate must be removed; faction/manual/split rows stay');

 db.capacityAssignments=[auto1,auto2,autoDifferentQty,autoDifferentFaction,manual1,manual2];
 window.save();
 assert.equal(saveCalls,1);assert.deepEqual(db.capacityAssignments.map(x=>x.id),[1,3,8,4,5],'duplicate auto capacity must be removed before save');

 db.capacityAssignments.push({...auto1,id:6});
 window.persistDb();
 assert.equal(persistCalls,1);assert.deepEqual(db.capacityAssignments.map(x=>x.id),[1,3,8,4,5],'duplicate auto capacity must be removed before persistDb');

 db.capacityAssignments.push({...auto1,id:7});
 window.hlgbRenderIncomingRecord('capacityAssignments');
 assert.equal(incomingCalls,1);assert.deepEqual(db.capacityAssignments.map(x=>x.id),[1,3,8,4,5],'incoming duplicate must be collapsed locally');

 // Central record saver must stop an exact automatic duplicate before it reaches Supabase.
 db.capacityAssignments.push({id:'new-cloud-dup',orderId:77,itemKey:'PX',locationId:20,factionId:null,qty:100,date:'2026-09-07',source:'cut_assignment'});
 const blocked=await window.hlgbRecordSaveWithRetry('capacityAssignments','new-cloud-dup',db.capacityAssignments.at(-1),false);
 assert(blocked.hlgbCapacityDuplicate,'cloud-snapshot duplicate must be returned as a confirmed duplicate no-op');
 assert.equal(recordCalls,0,'duplicate cut_assignment must not reach underlying cloud saver');
 assert.equal(db.capacityAssignments.some(x=>String(x.id)==='new-cloud-dup'),false,'blocked duplicate must be removed locally');

 const fresh={id:'fresh',orderId:78,itemKey:'PX',locationId:20,factionId:null,qty:100,date:'2026-09-07',source:'cut_assignment'};
 await window.hlgbRecordSaveWithRetry('capacityAssignments','fresh',fresh,false);
 assert.equal(recordCalls,1,'non-duplicate automatic assignment must still reach cloud saver');

 assert.equal(window.HLGB_CAPACITY_INTEGRITY_GUARD,'v2');
 assert(localSaves>=3,'local duplicate cleanup should be persisted');
 console.log('PASS capacity integrity v2: exact automatic duplicate is collapsed and blocked before cloud save; faction/manual/split assignments remain.');
})().catch(e=>{console.error(e);process.exit(1)});