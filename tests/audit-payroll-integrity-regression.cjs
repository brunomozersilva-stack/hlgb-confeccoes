const fs=require('fs'),vm=require('vm'),assert=require('assert');
const src=fs.readFileSync(require('path').join(__dirname,'..','release-payroll-integrity.js'),'utf8');
let modalSave=null,closed=0,failHubOnce=false,saveCalls=[];
const elements={};
const saveButton={disabled:false,textContent:''};
const context={
 console,
 db:{employees:[],terminations:[],formerEmployees:[],hubFinanceEntries:[]},
 window:{},
 document:{getElementById(id){return elements[id]||null},querySelector(sel){return sel==='#modal .modalSave'?saveButton:null}},
 setTimeout(fn){return 0},clearTimeout(){},
 alert(){},confirm(){return true},esc:v=>String(v??''),
 openModal(title,html,cb){modalSave=cb},closeModal(){closed++},
 localSaveOnly(){},
 hlgbRecordReady:true,
 cloudEnsureFreshSession:async()=>true,
 hlgbRecordSaveWithRetry:async(module,id,data,deleted)=>{
   saveCalls.push({module,id,data,deleted});
   if(module==='hubFinanceEntries'&&failHubOnce){failHubOnce=false;throw new Error('hub transient failure')}
   return {applied:true,data:JSON.parse(JSON.stringify(data)),deleted_at:deleted?'2026-09-17T12:00:00Z':null,revision:1,updated_at:'2026-09-17T12:00:00Z'};
 }
};
vm.createContext(context);vm.runInContext(src,context);
(async()=>{
const api=context.window.hlgbPayrollIntegrity;
assert(api,'payroll integrity API must load');
const vitoria={id:'v',name:'Vitoria',salary:2090,hireDate:'2025-07-09',provisionPaidHistory:[]};
const gross=api.gross13Until(vitoria,'2026-09-17');
assert.equal(gross,1567.50,'Jan-Sep 2026 must accrue 9/12 of 2090');
let e=api.upsertProvision(vitoria,{id:'adv-1',type:'13º',value:500,date:'2026-09-10',sourceType:'manual_provision_advance'});
assert.equal(api.paid13(e,'2026-09-17'),500,'manual 13th advance must count as paid');
assert.equal(api.remaining13(e,'2026-09-17'),1067.50,'advance must reduce remaining 13th balance');
e=api.upsertProvision(e,{id:'term13-t1',type:'13º',value:1067.50,date:'2026-09-17',sourceType:'termination',sourceId:'t1'});
assert.equal(api.remaining13(e,'2026-09-17'),0,'termination settlement must close remaining 13th balance');
e=api.upsertProvision(e,{id:'term13-t1',type:'13º',value:1000,date:'2026-09-17',sourceType:'termination',sourceId:'t1'});
assert.equal(e.provisionPaidHistory.filter(x=>x.sourceType==='termination'&&x.sourceId==='t1').length,1,'editing same termination must not duplicate settlement event');
assert.equal(api.paid13(e,'2026-09-17'),1500,'editing settlement must replace prior termination value');
const old={...vitoria,provisionPaidHistory:[]};
context.db.employees=[old];context.db.terminations=[{id:'legacy-term',employeeId:'v',employeeName:'Vitoria',date:'2026-09-17',paid:true,value:5015}];
const pending=api.unsettledTerminations();
assert.equal(pending.length,1,'legacy paid termination without settlement id must be flagged for review');
assert.equal(pending[0].suggested,1567.50,'legacy termination must be suggested, never silently auto-written');

// A retry after a partial cloud failure must reuse the same termination id.
context.db.employees=[{...vitoria,active:true,companyName:'Confecção TESTE'}];
context.db.terminations=[];context.db.formerEmployees=[];context.db.hubFinanceEntries=[];saveCalls=[];closed=0;
Object.assign(elements,{
 termEmployee:{value:'v'},termDate:{value:'2026-09-17'},termPaidAt9161:{value:'2026-09-17'},
 termType:{value:'Sem justa causa'},termValue:{value:'1000'},termFgtsPaid:{value:'0'},termFgtsFine:{value:'0'},
 termOtherCharges:{value:'0'},termNote:{value:'teste'},term13Settled:{value:'100'}
});
context.window.newTermination();
assert.equal(typeof modalSave,'function','new termination modal must expose save callback');
failHubOnce=true;
await modalSave();
const firstTermination=saveCalls.find(x=>x.module==='terminations');
assert(firstTermination,'first attempt must reach termination save before simulated Hub failure');
const firstId=firstTermination.id;
await modalSave();
const termCalls=saveCalls.filter(x=>x.module==='terminations');
assert(termCalls.length>=2,'retry must try the termination operation again');
assert(termCalls.every(x=>x.id===firstId),'retry after partial failure must reuse the same termination id, not create a second termination');
assert.equal(context.db.terminations.filter(x=>String(x.id)===String(firstId)).length,1,'local retry must remain one termination record');

console.log('PASS payroll integrity: accrual, advances, termination settlement, stable retry id and legacy audit.');
})().catch(e=>{console.error(e);process.exit(1)});