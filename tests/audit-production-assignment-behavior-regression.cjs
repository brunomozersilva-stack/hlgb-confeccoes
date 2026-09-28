const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync('app9240.html','utf8');
const start=html.indexOf('function openCutAssignment(productionId){');
const source=html.slice(start,html.indexOf('// A Projeção Semanal passa',start));
const clone=x=>JSON.parse(JSON.stringify(x));
function scenario(mode="same"){
 const row={id:100,orderId:200,productId:300,planned:4,done:0,stage:'Aguardando atribuição',assignmentSource:true};
 const db={production:[row],orders:[{id:200}],serviceTypes:[],capacityAssignments:[]};
 const fields={assignQty:{value:'4'},assignService:{value:''},assignDestination:{value:'L:400'},assignWeekStart:{value:'2026-09-21'},assignForecast:{value:'2026-09-24'}};
 let submit,saved,alerted="";
 const noop=()=>{};
 const ctx={updateCutAssignmentPreview:noop,db,console,Date,Math,setTimeout:noop,document:{getElementById:id=>fields[id],querySelector:()=>null},hlgb916EnsureData:noop,hlgb916ServiceNameForProduction:()=>'',hlgb916EligibleDestinations:()=>[{type:'L',id:400,locationId:400,name:'Externo'}],isoDate:()=> '2026-09-25',mondayOf:d=>d,hlgb916ProductForProduction:()=>({name:'TESTE'}),esc:String,hlgb916Norm:String,hlgb916DestinationOptions:()=>'',openModal:(_t,_h,cb)=>{submit=cb},alert:m=>{alerted=m},removeProductionFactionLink:noop,projectionItemsForOrder:()=>[{key:'300'}],saveProjectionItemDate:noop,hlgb916CreateMaterialChecklist:noop,closeModal:noop,save:()=>{saved=clone(db.production)},renderCuts:noop,renderProduction:noop,renderCutAssignmentQueue:noop,renderDestinationChecklists:noop,renderProjection:noop,renderFactions:noop,renderFactionPaymentPlanner:noop};
 vm.createContext(ctx);vm.runInContext(source,ctx);
 ctx.openCutAssignment(100);
 // Realtime replaces the row while the modal remains open.
 db.production[0]={...clone(row),remoteMemo:'keep this concurrent field'};
 if(mode==='changed')db.production[0].stage='Em produção';
 if(mode==='deleted')db.production=[];
 submit();
 if(mode!=='same'){
  assert(alerted,'conflicting assignment/deletion must be reported');
  assert.equal(saved,undefined,'conflict must not save or create dependents');
  assert.equal(db.capacityAssignments.length,0);return;
 }
 assert.equal(db.production.length,1,'full assignment reuses existing production');
 assert.equal(saved[0].stage,'Em produção','assignment must update current row after remote replacement');
 assert.equal(saved[0].assignedAt,'2026-09-25');
 assert.equal(saved[0].productionLocationId,400);
 assert.equal(saved[0].remoteMemo,'keep this concurrent field');
}
scenario();scenario('changed');scenario('deleted');
console.log('PASS explicit production assignment survives remote row replacement');

// Editing an existing destination must record an explicit operational assignment
// without creating another production, capacity assignment or checklist.
function destinationScenario(mode='same'){
 const p={id:100,planned:4,done:0,stage:'Aguardando atribuição',productionLocationId:400};
 const db={production:[p],productionLocations:[{id:400,name:'Externo'}],factionMasters:[]};
 const fields={prodDestination:{value:'L:400'},prodStage:{value:'Em produção'},prodSentDate:{value:'2026-09-24'},prodDueDate:{value:''},prodDefects:{value:'0'},prodMissing:{value:'0'}};
 let submit,saves=0,alerts=0;const noop=()=>{};
 const ctx={db,document:{getElementById:id=>fields[id]},esc:String,isoDate:()=> '2026-09-26',openModal:(_t,_h,cb)=>{submit=cb},alert:()=>{alerts++},closeModal:noop,save:()=>{saves++},renderProduction:noop,renderProductionHub:noop,renderFactions:noop,syncProductionIssuesToMissing:noop,removeProductionFactionLink:noop,syncProductionToFaction:noop};
 const start=html.indexOf('function openProductionDestination(id){');
 vm.createContext(ctx);vm.runInContext(html.slice(start,html.indexOf('function hlgbProductionDone9196',start)),ctx);
 ctx.openProductionDestination(100);
 assert.equal(p.assignedAt,undefined,'opening a legacy location must not assign it');
 db.production[0]={...p,remoteMemo:'preserve'};
 if(mode==='changed')db.production[0].done=1;
 if(mode==='deleted')db.production=[];
 submit();
 if(mode!=='same'){assert.equal(saves,0);assert.equal(alerts,1);return}
 assert.equal(saves,1);assert.equal(db.production.length,1);
 assert.equal(db.production[0].stage,'Em produção');
 assert.equal(db.production[0].assignedAt,'2026-09-24');
 assert.equal(db.production[0].remoteMemo,'preserve');
}
destinationScenario();destinationScenario('changed');destinationScenario('deleted');
console.log('PASS explicit destination edit records assignment on current row; conflicts cannot save');

// The grade listener runs before the principal callback. A rejected assignment
// must not write a grade onto a row assigned concurrently by another session.
(async()=>{
 const begin=html.indexOf('  function applyPostGrade938(');
 const fn=html.slice(begin,html.indexOf('\n  const oldCutAssignment938=',begin));
 let scheduled,writes=0;
 const p={id:100,productionLocationId:400,factionId:null,stage:'Em produção',assignedAt:'2026-09-25'};
 const context={db:{production:[p]},console,Date,setTimeout:cb=>{scheduled=cb},mergeGrade938:clone,persistProductionRows938:async()=>{writes++},renderProduction(){},renderCutAssignmentQueue(){},renderProjection(){},renderFinishedPieces(){},alert:m=>{throw Error(m)}};
 vm.createContext(context);vm.runInContext(fn,context);
 const grade=[{color:'Preto',size:'P',qty:4}],before=new Set(['100']);
 context.applyPostGrade938('assign',100,before,grade,grade,{confirmed:false});await scheduled();
 assert.equal(writes,0,'rejected main callback cannot write delayed grade');
 const receipt={confirmed:true,id:'100',stage:p.stage,assignedAt:p.assignedAt,location:400,faction:null};
 context.applyPostGrade938('assign',100,before,grade,grade,receipt);await scheduled();
 assert.equal(writes,1,'successful explicit assignment permits its grade');
 p.productionLocationId=500;
 context.applyPostGrade938('assign',100,before,grade,grade,receipt);await scheduled();
 assert.equal(writes,1,'later reassignment must not receive an obsolete grade');
 console.log('PASS delayed grade requires successful unchanged assignment');
})().catch(e=>{console.error(e);process.exitCode=1});
