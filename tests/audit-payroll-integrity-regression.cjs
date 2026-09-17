const fs=require('fs'),vm=require('vm'),assert=require('assert');
const src=fs.readFileSync(require('path').join(__dirname,'..','release-payroll-integrity.js'),'utf8');
const context={
 console,
 db:{employees:[],terminations:[],formerEmployees:[],hubFinanceEntries:[]},
 window:{},
 document:{getElementById(){return null},querySelector(){return null}},
 setTimeout(fn){return 0},clearTimeout(){},
 alert(){},confirm(){return true}
};
vm.createContext(context);vm.runInContext(src,context);
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
console.log('PASS payroll integrity: accrual, advance, termination settlement, idempotence and legacy audit.');