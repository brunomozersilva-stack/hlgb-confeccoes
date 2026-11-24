(function(root,api){if(typeof module==='object'&&module.exports)module.exports=api;else root.HLGBRHPlanning9636=api;})(typeof globalThis==='object'?globalThis:this,(function rh(){
 const day=86400000,iso=n=>new Date(n).toISOString().slice(0,10),date=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&Number.isFinite(Date.parse(s+'T00:00:00Z'))&&iso(Date.parse(s+'T00:00:00Z'))===s?Date.parse(s+'T00:00:00Z'):null;
 const id=s=>typeof s==='string'?s.trim():'',money=n=>Number.isSafeInteger(n)&&n>=0&&n<=1000000000,days=n=>Number.isInteger(n)&&n>=0&&n<=30;
 function vacations(input){
  const {periods,employees,priorPeriodsByYear={},calendarVerified=false,closedDays=[]}=input||{};
  if(!Array.isArray(periods)||!periods.length||periods.length>2||!Array.isArray(employees)||employees.length>10000||!Array.isArray(closedDays)||closedDays.some(s=>date(s)===null))throw Error('invalid-input');
  const ps=periods.map(p=>{const start=date(p.start),end=date(p.end);if(start===null||end===null||end<start||(end-start)/day+1<10||(end-start)/day+1>30)throw Error('invalid-period');return {start:p.start,end:p.end,n:(end-start)/day+1,paymentCandidate:iso(start-2*day),startMs:start,endMs:end}}).sort((a,b)=>a.startMs-b.startMs);
  if(ps.length===2&&ps[1].startMs<=ps[0].endMs)throw Error('overlap');
  const yearCounts=new Map(),issues=[],blocked=new Set(closedDays);
  for(const p of ps){const y=p.start.slice(0,4),old=priorPeriodsByYear[y];if(!Number.isInteger(old)||old<0||old>2)issues.push('annual-period-history-unverified');yearCounts.set(y,(yearCounts.get(y)||0)+1);if(Number.isInteger(old)&&old+yearCounts.get(y)>2)issues.push('annual-period-limit');
   if(!calendarVerified)issues.push('calendar-unverified');else if([0,6].includes(new Date(p.startMs).getUTCDay())||blocked.has(p.start)||blocked.has(iso(p.startMs+day))||blocked.has(iso(p.startMs+2*day)))issues.push('start-date-review');
  }
  const counts=new Map();for(const e of employees)counts.set(id(e?.id),(counts.get(id(e?.id))||0)+1);
  const people=[],totals=ps.map(p=>({start:p.start,end:p.end,days:p.n,paymentCandidate:p.paymentCandidate,grossVacationCents:0,paidLeaveCents:0}));
  for(const e of employees){
   const k=id(e?.id),base=e?.baseCents;
   if(!k||counts.get(k)!==1||!money(base)||!days(e.availableDays)||e.entitlementVerified!==true||!['acquired','proportional'].includes(e.entitlement)){issues.push('employee-entitlement-incomplete');continue}
   let remaining=e.availableDays;const rows=[];
   for(let i=0;i<ps.length;i++){const p=ps[i];
    // Subsequent period for a new employee needs a new acquisition-cycle calculation.
    if(i>0&&e.entitlement==='proportional'){issues.push('proportional-cycle-recalculation');rows.push({start:p.start,status:'review',grossVacationCents:null,paidLeaveCents:null});continue}
    const used=Math.min(remaining,p.n),extra=p.n-used;remaining-=used;
    const vacation=Math.round(base*used/30),third=Math.round(vacation/3);
    // Only a separately confirmed paid-leave allocation may be valued, never as vacation.
    const approvedExtra=extra===0||e.entitlement==='proportional'&&e.paidLeaveApproved===true;
    const leave=approvedExtra?Math.round(base*extra/30):null;
    if(!approvedExtra)issues.push('insufficient-balance');
    rows.push({start:p.start,days:p.n,vacationDays:used,otherDays:extra,remainingDays:remaining,vacationCents:vacation,thirdCents:third,grossVacationCents:vacation+third,paidLeaveCents:leave,status:approvedExtra?'estimate':'review'});
    totals[i].grossVacationCents+=vacation+third;if(leave!==null)totals[i].paidLeaveCents+=leave;
   }
   people.push({id:k,periods:rows});
  }
  return {mode:'simulation-only',people,totals,issues:[...new Set(issues)],observedGrossCents:totals.reduce((a,x)=>a+x.grossVacationCents+x.paidLeaveCents,0),officialTotalCents:null,netCents:null,employerCostCents:null,canPublish:false};
 }
 function provisions(rows,asOf){
  if(!Array.isArray(rows)||date(asOf)===null)throw Error('invalid-input');const groups={acquired:[],overdue:[],proportional:[],used:[],unknown:[]},seen=new Map();for(const e of rows)seen.set(id(e?.id),(seen.get(id(e?.id))||0)+1);
  for(const e of rows){const k=id(e?.id),a=date(e?.acquisitionEnd),c=date(e?.concessionEnd);let status='unknown';if(k&&seen.get(k)===1&&a!==null&&c!==null&&c>a&&days(e.remainingDays)&&money(e.provisionCents)&&e.verified===true){status=e.remainingDays===0?'used':asOf>e.concessionEnd?'overdue':asOf>=e.acquisitionEnd?'acquired':'proportional'}groups[status].push({id:k,provisionCents:status==='unknown'?null:e.provisionCents})}
  const sum=a=>a.reduce((s,x)=>s+x.provisionCents,0);return {groups,totals:Object.fromEntries(Object.entries(groups).map(([k,v])=>[k,k==='unknown'?null:sum(v)])),observedTotalCents:sum([...groups.acquired,...groups.overdue,...groups.proportional,...groups.used]),officialTotalCents:null};
 }
 function notice(input){
  const {hireDate,noticeDate,type,mode,salaryCents,approvedItems=[]}=input||{},h=date(hireDate),n=date(noticeDate);
  if(h===null||n===null||h>n||!money(salaryCents)||!['employer-no-cause','resignation','mutual','cause','fixed-term','other'].includes(type)||!['worked','indemnified','waived','review'].includes(mode)||!Array.isArray(approvedItems))throw Error('invalid-input');
  let years=Number(noticeDate.slice(0,4))-Number(hireDate.slice(0,4));if(noticeDate.slice(5)<hireDate.slice(5))years--;
  const referenceDays=type==='employer-no-cause'?Math.min(90,30+3*years):type==='resignation'?30:null;
  const projectedEnd=referenceDays!==null&&type==='employer-no-cause'&&mode==='indemnified'?iso(n+referenceDays*day):null;
  const referenceIndemnityCents=projectedEnd?Math.round(salaryCents*referenceDays/30):null;
  const seen=new Set(),issues=[],items=[];for(const x of approvedItems){const k=id(x?.id);if(!k||seen.has(k)||!money(x.amountCents)||!['credit','discount','employer-charge'].includes(x.kind)||!['open','paid'].includes(x.status)||x.verified!==true){issues.push('invalid-verba');continue}seen.add(k);items.push({id:k,kind:x.kind,status:x.status,amountCents:x.amountCents})}
  const sum=kind=>items.filter(x=>x.kind===kind&&x.status==='open').reduce((a,x)=>a+x.amountCents,0);
  return {mode:'simulation-only',type,noticeMode:mode,completedYears:years,referenceDays,projectedEnd,referenceIndemnityCents,items,issues,observedCreditsCents:sum('credit'),observedDiscountsCents:sum('discount'),observedEmployerChargesCents:sum('employer-charge'),officialNetCents:null,canPublish:false,requiresReview:true};
 }
 return {vacations,provisions,notice};
})());
