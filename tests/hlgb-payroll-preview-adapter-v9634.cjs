const assert=require('node:assert/strict');const api=require('../hlgb-modules/financeiro/payroll-preview-adapter-v9634.cjs');(function tests(api,ok){
 const opt={competence:'2026-10',asOf:'2026-11-23',holidays:['2026-11-02'],bankClosed:[]},rows=[{id:1,employeeId:1,month:'2026-10',paid:false,salary:2000,transport:150},{id:2,employeeId:2,month:'2026-10',paid:true,paidAt:'2026-11-06',paidValue:1800}],db={payroll:rows,employees:[{id:1},{id:2}]},ctx={authenticated:true,payrollAllowed:true,db,payrollCalc:r=>({net:r.salary+r.transport})},p=(x={},o=opt)=>api.inspect({...ctx,...x},o),before=JSON.stringify(db);
 ok(p().localOpenCents===215000&&p().localPaidCents===180000,'official calculation and paid value');
 ok(p().officialAmountCents===null&&!p().canPublish,'no unconfirmed salary');
 ok(p().calendar.legalLimit===null&&p().calendar.fifthDay==='2026-11-07','provisional calendar');
 ok(p({authenticated:false}).state==='unavailable','auth');
 ok(p({payrollAllowed:false}).state==='unavailable','permission');
 ok(p({payrollCalc:null}).state==='unavailable','no fallback');
 ok(p({payrollCalc:()=>{throw Error('x')}}).issues.includes('official-calc-unavailable'),'calc failure');
 ok(p({db:{...db,payroll:[...rows,{...rows[0],id:3}]}}).localOpenCents===0,'duplicate employee');
 ok(p({db:{...db,payroll:[...rows,{...rows[0],employeeId:2}]}}).localOpenCents===0,'duplicate row');
 ok(p({db:{...db,payroll:[rows[0],{...rows[1],paidAt:'2026-11-30'}]}}).localPaidCents===0,'future paid');
 ok(p({db:{...db,payroll:[rows[0],{...rows[1],paidValue:null}]}}).localPaidCents===0,'missing paid value');
 ok(p({db:{...db,payroll:[{...rows[0],pendingSync:true},rows[1]]}}).localOpenCents===0,'pending WAL');
 ok(p({payrollCalc:r=>{r.salary=1;return {net:1}}}).localOpenCents===100&&JSON.stringify(db)===before,'copy');
 ok(!JSON.stringify(p()).includes('employeeId'),'aggregates only');
 ok(p({}, {...opt,competence:'2026-09'}).officialAmountCents===null,'empty month not confirmed zero');
})(api,(v,m)=>{assert.ok(v,m);console.log('PASS',m)});
