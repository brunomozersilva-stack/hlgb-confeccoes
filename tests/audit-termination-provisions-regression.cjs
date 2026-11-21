const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path');
const src=fs.readFileSync(path.join(__dirname,'..','release-payroll-termination-provisions.js'),'utf8');
const loader=fs.readFileSync(path.join(__dirname,'..','app-stable3.html'),'utf8');
assert(loader.includes("'release-payroll-termination-provisions.js'"),'loader must include termination provision guard');

function months(start,end){
  const out=[];let [y,m]=start.slice(0,7).split('-').map(Number),[ey,em]=end.slice(0,7).split('-').map(Number);
  while(y<ey||(y===ey&&m<=em)){out.push(String(y)+'-'+String(m).padStart(2,'0'));m++;if(m>12){m=1;y++}}
  return out;
}
function worked15(e,y,m){
  const start=new Date(y,m-1,1,12),end=new Date(y,m,0,12),hire=new Date(e.hireDate+'T12:00:00'),term=e.terminationDate?new Date(e.terminationDate+'T12:00:00'):null;
  const a=hire>start?hire:start,b=term&&term<end?term:end;
  return b>=a&&(Math.floor((b-a)/86400000)+1>=15);
}
const context={
 console,setTimeout(fn){fn();return 0},
 db:{
   config:{payrollExtraChargesPct:0},
   employees:[
     {id:'ari',name:'Arisergio',salary:2000,hireDate:'2026-07-07',active:false,terminationDate:'2026-08-28',companyName:'Prado',provisionPaidHistory:[]},
     {id:'ativa',name:'Ativa',salary:1800,hireDate:'2026-01-01',active:true,companyName:'Prado',provisionPaidHistory:[]}
   ],
   formerEmployees:[],
   terminations:[{id:'t-ari',employeeId:'ari',date:'2026-08-28',value:1582.02}]
 },
 window:{renderPayrollProvisions(){return true}},
 document:{getElementById(){return null}},
 provisionMonthKeys:months,
 employeeWorkedAtLeast15DaysInMonth:worked15,
 salaryForEmployeeAtDate:e=>Number(e.salary)||0,
 provisionPaid9161:()=>({thirteenth:0,vacation:0,extra:0,total:0}),
 employeeCompanyName:e=>e.companyName||'',
 money:v=>'R$ '+Number(v||0).toFixed(2),
 fmtDate:v=>v,
 esc:v=>String(v??''),
 table:()=>''
};
vm.createContext(context);vm.runInContext(src,context);
const api=context.window.hlgbPayrollTerminationProvisions;
assert(api,'termination provision API must load');
const after=api.buildRows('2026-01-01','2026-09-30','','');
const ari=after.find(r=>r.e.id==='ari'),ativa=after.find(r=>r.e.id==='ativa');
assert(ari,'terminated employee must remain visible in historical period');
assert.equal(ari.settled,true,'registered termination must settle provisions after termination date');
assert.equal(ari.remaining,0,'terminated employee must not keep open provision balance');
assert(ari.terminationSettlement>0,'historical accrued amount must be identified as settled by termination');
assert(ativa.remaining>0,'active employee must keep open provision balance');

const before=api.buildRows('2026-01-01','2026-08-15','','').find(r=>r.e.id==='ari');
assert(before,'employee must exist before termination date');
assert.equal(before.settled,false,'period ending before termination must not be treated as settled');
assert(before.remaining>0,'historical balance before termination must remain visible');

console.log('PASS termination provisions: historical accrual preserved and post-termination balance cleared.');
