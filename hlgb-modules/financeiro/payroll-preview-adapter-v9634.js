'use strict';
(function(root,api){if(typeof module==='object'&&module.exports)module.exports=api;else root.HLGBPayrollPreview9634=api;})(typeof globalThis==='object'?globalThis:this,(function factory(calendar){
 const id=v=>typeof v==='string'||(typeof v==='number'&&Number.isSafeInteger(v))?String(v).trim():'';
 const deleted=x=>!!(x?.deleted===true||x?.deleted_at||x?.deletedAt||x?._deleted===true);
 const cents=v=>{if(typeof v!=='number'&&!(typeof v==='string'&&/^\d+(\.\d{1,2})?$/.test(v)))return null;const x=Number(v),c=Math.round(x*100);return Number.isSafeInteger(c)&&c>=0&&c<=1000000000&&Math.abs(x*100-c)<.00001?c:null};
 function coverage(employees,rows,month,pending){
  const out={state:'local-coverage',expectedCount:0,validCount:0,missingCount:0,reviewCount:0,unexpectedCount:0,pendingObserved:pending?.state==='observed',canPublish:false};
  const start=month+'-01',[y,m]=month.split('-').map(Number),end=new Date(Date.UTC(y,m,0)).toISOString().slice(0,10);
  const validDate=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&Number.isFinite(Date.parse(s+'T00:00:00Z'))&&new Date(s+'T00:00:00Z').toISOString().slice(0,10)===s;
  const persons=new Map(),counts=new Map(),pendingIds=new Set(Array.isArray(pending?.ids)?pending.ids.map(String):[]);
  const isPending=(mod,k)=>pendingIds.has(mod+'::'+k)||pendingIds.has(mod+'|'+k);
  for(const p of employees){if(!p||deleted(p))continue;const k=id(p.id);if(!k){out.reviewCount++;continue}persons.set(k,persons.has(k)?null:p)}
  for(const r of rows){const k=id(r.employeeId);counts.set(k,(counts.get(k)||0)+1)}
  const expected=new Set(),review=new Set();
  for(const [k,p] of persons){
   if(!p||isPending('employees',k)||!validDate(p.hireDate)||p.terminationDate&&!validDate(p.terminationDate)||p.terminationDate&&p.terminationDate<p.hireDate||p.active===false&&!p.terminationDate){review.add(k);continue}
   if(p.hireDate<=end&&(!p.terminationDate||p.terminationDate>=start))expected.add(k);
  }
  out.expectedCount=expected.size;out.reviewCount+=review.size;
  for(const k of expected){const n=counts.get(k)||0;if(n===0)out.missingCount++;else if(n===1)out.validCount++;else out.reviewCount++}
  for(const k of counts.keys())if(!expected.has(k)&&!review.has(k))out.unexpectedCount++;
  out.complete=out.pendingObserved&&out.missingCount===0&&out.reviewCount===0&&out.unexpectedCount===0;
  return out;
 }
 function inspect(ctx,opt){
  const empty=reason=>({state:'unavailable',reason,amount:null});
  if(ctx?.authenticated!==true||ctx?.payrollAllowed!==true)return empty('permission');
  if(!Array.isArray(ctx.db?.payroll)||!Array.isArray(ctx.db?.employees)||typeof ctx.payrollCalc!=='function')return empty('source-unavailable');
  let date;try{date=calendar.due({...opt,holidayCoverageVerified:false,agreementVerified:false,bankCoverageVerified:false})}catch(_){return empty('calendar-unavailable')}
  const month=date.competence,rows=ctx.db.payroll.filter(x=>x&&!deleted(x)&&x.month===month),people=new Map(),seen=new Set(),rowCounts=new Map(),employeeCounts=new Map(),issues=[],local=[];
  for(const p of ctx.db.employees){const k=id(p?.id);if(k&&!deleted(p))people.set(k,people.has(k)?null:p)}
  for(const row of rows){const k=id(row.id),e=id(row.employeeId);rowCounts.set(k,(rowCounts.get(k)||0)+1);employeeCounts.set(e,(employeeCounts.get(e)||0)+1)}
  const pending=ctx.pendingEvidence||{state:'incomplete',ids:[]},pendingIds=new Set(Array.isArray(pending.ids)?pending.ids.map(String):[]),isPending=(mod,k)=>pendingIds.has(mod+'::'+k)||pendingIds.has(mod+'|'+k);
  for(const row of rows){
   const key=id(row.id),emp=id(row.employeeId),person=people.get(emp);
   if(!key||!emp||!person||rowCounts.get(key)!==1||employeeCounts.get(emp)!==1||seen.has(emp)||isPending('payroll',key)||isPending('employees',emp)||row.pendingSync===true||row.walPending===true||row.unverified===true||typeof row.paid!=='boolean'){issues.push('invalid-or-unverified-row');continue}
   seen.add(emp);
   let v=null,paid=row.paid;
   if(paid){const day=typeof row.paidAt==='string'?row.paidAt.slice(0,10):'';const d=Date.parse(day+'T00:00:00Z');if(/^\d{4}-\d{2}-\d{2}$/.test(day)&&Number.isFinite(d)&&new Date(d).toISOString().slice(0,10)===day&&day<=opt.asOf)v=cents(row.paidValue);}
   else {try{const clone=x=>JSON.parse(JSON.stringify(x));v=cents(ctx.payrollCalc(clone(row),clone(person))?.net)}catch(_){}}
   if(v===null){issues.push(paid?'paid-without-evidence':'official-calc-unavailable');continue}
   local.push({employeeId:emp,netCents:v,status:paid?'paid':'open',competence:month,verified:false});
  }
  return {state:'local-preview-only',calendar:date,coverage:coverage(ctx.db.employees,rows,month,pending),observedEmployeeCount:local.length,localOpenCents:local.reduce((s,x)=>s+(x.status==='open'?x.netCents:0),0),localPaidCents:local.reduce((s,x)=>s+(x.status==='paid'?x.netCents:0),0),officialAmountCents:null,amountQuality:'incomplete',issues,canPublish:false,reason:'Prévia local não conciliada; calendário, cobertura de funcionários e cálculos precisam de confirmação.'};
 }
 return {inspect,coverage};
})((typeof module==='object'&&module.exports?require('./payroll-fifth-day-v9632.js'):globalThis.HLGBPayrollCalendar9632)));
