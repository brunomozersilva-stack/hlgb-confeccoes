const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path');
const src=fs.readFileSync(path.join(__dirname,'..','release-payroll-termination-provisions.js'),'utf8');
const loader=fs.readFileSync(path.join(__dirname,'..','app-stable3.html'),'utf8');
assert(loader.includes("'release-payroll-termination-provisions.js'"));
const context={console,setTimeout(fn){fn();return 0},db:{config:{payrollExtraChargesPct:0},employees:[
{id:'e1',name:'Elaine de Oliveira Costa',salary:2400,hireDate:'2026-01-01',active:true,provisionPaidHistory:[{id:'p1',type:'13º',value:600,date:'2026-09-20'}]},
{id:'e2',name:'Ana',salary:1200,hireDate:'2026-01-01',active:true,provisionPaidHistory:[]}
],formerEmployees:[],terminations:[]},window:{renderPayrollProvisions(){return true}},document:{getElementById(){return null}},provisionMonthKeys:()=>['2026-01','2026-02','2026-03','2026-04','2026-05','2026-06','2026-07','2026-08','2026-09'],employeeWorkedAtLeast15DaysInMonth:()=>true,salaryForEmployeeAtDate:e=>e.salary,employeeCompanyName:()=>'',money:v=>String(v),fmtDate:v=>v,esc:v=>String(v),table:()=>''};
vm.createContext(context);vm.runInContext(src,context);
const api=context.window.hlgbPayrollTerminationProvisions;
const rows=api.buildRows('2026-01-01','2026-09-30','','');
const elaine=rows.find(r=>r.e.id==='e1');
assert(elaine.p.thirteenth>=600,'manual 13th advance must be recognized');
assert(elaine.rem13<elaine.gross13,'advance must reduce employee remaining 13th');
const totalRemaining=rows.reduce((s,r)=>s+r.remaining,0);
const totalGross=rows.reduce((s,r)=>s+r.gross13+r.grossVac+r.fgts+r.grossExtra,0);
assert(totalRemaining<=totalGross-600+0.01,'advance must reduce overall remaining total');
const desc=api.sortRows(rows.map((r,i)=>({...r,remaining:i?100:500})));api.setSort?.('name-asc');
assert(api.paidBreakdown,'paid breakdown API must exist');
console.log('PASS payroll provision totals: advance reduces remaining totals and sort support is present.');