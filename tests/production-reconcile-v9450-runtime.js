'use strict';
const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path');
function load(name){vm.runInThisContext(fs.readFileSync(path.join(__dirname,'..',name),'utf8'),{filename:name});}
global.window={addEventListener(){},__HLGB_AUTH_READY:false};
global.localStorage={getItem(){return null},setItem(){},removeItem(){}};
global.document={querySelector(){return null}};
load('release-production-reconcile-v9439.js');
const r=window.hlgbProductionReconcile9439;
assert.equal(r.version,'94.50');
const server={module:'production',entity_id:'1793299026551',revision:10,updated_at:'2026-11-01T21:48:11.325892+00:00',deleted_at:null,data:{id:1793299026551,op:'PED-1793015637350-3437',date:'2026-10-29',done:0,size:'',color:'',cutId:1793034493460400,stage:'Aguardando atribuição',client:'Click Sophia',orderId:1793015637350,planned:300,product:'Camisola Trancada',factionId:null,productId:'1788437283437',updatedAt:'2026-11-01T21:48:11.242Z',assignedAt:'',cutProductKey:'1793034493460400:1788437283437',sentToFactionAt:'',assignmentSource:true,cutEffectiveQtyV9240:true,cutEffectiveQtyV9246:true,cutQuantityLinkedV9246:true}};
const desired={...server.data,updatedAt:'2026-10-30T13:11:08.408Z',__hlgb9423StaleProductionLocationId:1787869360532,productionLocationId:null};
delete desired.cutEffectiveQtyV9246;
const base={...desired};delete base.__hlgb9423StaleProductionLocationId;delete base.productionLocationId;
let p=r.staleOperationSatisfied(server,desired,base,'2026-10-30T13:11:09.116511+00:00','1793299026551',false);
assert.equal(p.ok,true,'technical-only drift must reconcile');
const qty={...desired,planned:301};
p=r.staleOperationSatisfied(server,qty,base,'2026-10-30T13:11:09.116511+00:00','1793299026551',false);
assert.equal(p.ok,false,'quantity change must remain blocked');
assert(p.diff.some(x=>x.field==='planned'),'diff must expose planned');
const staleLocation={...desired,productionLocationId:1787869360532,__hlgb9423StaleProductionLocationId:1787869360532};
p=r.staleOperationSatisfied(server,staleLocation,base,'2026-10-30T13:11:09.116511+00:00','1793299026551',false);
assert.equal(p.ok,true,'exact stale location marker may be cleared');
const realLocation={...staleLocation,productionLocationId:999999999};
p=r.staleOperationSatisfied(server,realLocation,base,'2026-10-30T13:11:09.116511+00:00','1793299026551',false);
assert.equal(p.ok,false,'real location change must remain blocked');
assert(p.diff.some(x=>x.field==='productionLocationId'),'diff must expose productionLocationId');
load('release-production-residual-v9448.js');
const s=window.hlgbProductionResidual9448._test.summarizeProofs([
 {source:'wal-local',opId:'c6e0bf5e-0982-4d5d-bcf8-1b76271a6a04',ok:false,reason:'business-difference',diff:[{field:'planned'}]},
 {source:'wal-idb',opId:'c6e0bf5e-0982-4d5d-bcf8-1b76271a6a04',ok:false,reason:'business-difference',diff:[{field:'planned'}]}
]);
assert.equal(s.businessCopies,1,'same operation in local+IDB must count once logically');
assert.equal(s.physicalCopies,2);
assert.equal(s.duplicateCopies,1);
console.log('PASS production reconcile v94.50', {logical:s.businessCopies,physical:s.physicalCopies,duplicate:s.duplicateCopies});
