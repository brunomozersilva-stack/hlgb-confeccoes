'use strict';
(function(root,api){if(typeof module==='object'&&module.exports)module.exports=api;else root.HLGBPayrollPreview9634=api;})(typeof globalThis==='object'?globalThis:this,(function factory(calendar){
 const id=v=>typeof v==='string'||(typeof v==='number'&&Number.isSafeInteger(v))?String(v).trim():'';
 const deleted=x=>!!(x?.deleted===true||x?.deleted_at||x?.deletedAt||x?._deleted===true);
 const cents=v=>{if(typeof v!=='number'&&!(typeof v==='string'&&/^\d+(\.\d{1,2})?$/.test(v)))return null;const x=Number(v),c=Math.round(x*100);return Number.isSafeInteger(c)&&c>=0&&c<=1000000000&&Math.abs(x*100-c)<.00001?c:null};
 function inspect(ctx,opt){
  const empty=reason=>({state:'unavailable',reason,amount:null});
  if(ctx?.authenticated!==true||ctx?.payrollAllowed!==true)return empty('permission');
  if(!Array.isArray(ctx.db?.payroll)||!Array.isArray(ctx.db?.employees)||typeof ctx.payrollCalc!=='function')return empty('source-unavailable');
  let date;try{date=calendar.due({...opt,holidayCoverageVerified:false,agreementVerified:false,bankCoverageVerified:false})}catch(_){return empty('calendar-unavailable')}
  const month=date.competence,rows=ctx.db.payroll.filter(x=>x&&!deleted(x)&&x.month===month),people=new Map(),seen=new Set(),rowCounts=new Map(),employeeCounts=new Map(),issues=[],local=[];
  for(const p of ctx.db.employees){const k=id(p?.id);if(k&&!deleted(p))people.set(k,people.has(k)?null:p)}
  for(const row of rows){const k=id(row.id),e=id(row.employeeId);rowCounts.set(k,(rowCounts.get(k)||0)+1);employeeCounts.set(e,(employeeCounts.get(e)||0)+1)}
  for(const row of rows){
   const key=id(row.id),emp=id(row.employeeId),person=people.get(emp);
   if(!key||!emp||!person||rowCounts.get(key)!==1||employeeCounts.get(emp)!==1||seen.has(emp)||row.pendingSync===true||row.walPending===true||row.unverified===true||typeof row.paid!=='boolean'){issues.push('invalid-or-unverified-row');continue}
   seen.add(emp);
   let v=null,paid=row.paid;
   if(paid){const day=typeof row.paidAt==='string'?row.paidAt.slice(0,10):'';const d=Date.parse(day+'T00:00:00Z');if(/^\d{4}-\d{2}-\d{2}$/.test(day)&&Number.isFinite(d)&&new Date(d).toISOString().slice(0,10)===day&&day<=opt.asOf)v=cents(row.paidValue);}
   else {try{const clone=x=>JSON.parse(JSON.stringify(x));v=cents(ctx.payrollCalc(clone(row),clone(person))?.net)}catch(_){}}
   if(v===null){issues.push(paid?'paid-without-evidence':'official-calc-unavailable');continue}
   local.push({employeeId:emp,netCents:v,status:paid?'paid':'open',competence:month,verified:false});
  }
  return {state:'local-preview-only',calendar:date,observedEmployeeCount:local.length,localOpenCents:local.reduce((s,x)=>s+(x.status==='open'?x.netCents:0),0),localPaidCents:local.reduce((s,x)=>s+(x.status==='paid'?x.netCents:0),0),officialAmountCents:null,amountQuality:'incomplete',issues,canPublish:false,reason:'Prévia local não conciliada; calendário, cobertura de funcionários e cálculos precisam de confirmação.'};
 }
 return {inspect};
})((typeof module==='object'&&module.exports?require('./payroll-fifth-day-v9632.js'):globalThis.HLGBPayrollCalendar9632)));
