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

 // Live roster: only fields needed for planning; never infer entitlement from admission or paid history.
 const employeeId=v=>(typeof v==='string'&&/^[A-Za-z0-9_-]{1,100}$/.test(v)||Number.isSafeInteger(v)&&v>0)?String(v):'';
 const text=(v,n)=>typeof v==='string'?v.trim().slice(0,n):'';
 const toCents=v=>{if(typeof v!=='number'&&!(typeof v==='string'&&/^\d+(\.\d{1,2})?$/.test(v)))return null;const n=Number(v),c=Math.round(n*100);return money(c)&&Math.abs(n*100-c)<.00001?c:null};
 const permit=d=>{try{return d.auth()===true&&d.can('folhaPagamento')===true&&d.can('funcionarios')===true}catch(_){return false}};
 const norm=s=>String(s??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase();
 const absent=state=>({state,rows:[],issues:[],canPublish:false});
 function roster(deps){
  if(!permit(deps))return absent('forbidden');
  try{
   const raw=deps.read('employees');if(!permit(deps))return absent('forbidden');
   if(!Array.isArray(raw)||raw.length>10000)return absent('unavailable');
   const map=new Map(),issues=[];
   for(const e of raw){if(!e||e.deletedAt||e.deleted_at||e.deleted===true||e._deleted===true)continue;const k=employeeId(e.id);if(!k){issues.push('invalid-employee-id');continue}map.set(k,map.has(k)?null:e)}
   const rows=[];
   for(const [k,e] of map){if(!e){issues.push('duplicate-employee-id');continue}if(e.active===false||e.terminationDate)continue;
    const name=text(e.name,160);if(!name){issues.push('employee-name-missing');continue}
    const r={id:k,name,company:text(e.companyName,160),hireDate:date(e.hireDate)===null?null:e.hireDate,baseCents:toCents(e.salary)};
    rows.push({...r,signature:JSON.stringify(r)});
   }
   if(!permit(deps))return absent('forbidden');
   rows.sort((a,b)=>a.name.localeCompare(b.name,'pt-BR')||a.id.localeCompare(b.id));
   return {state:'local-roster',rows,issues:[...new Set(issues)],canPublish:false};
  }catch(_){return absent('unavailable')}
 }
 function selectRoster(source,query='',company=''){
  if(source?.state!=='local-roster'||!Array.isArray(source.rows))return [];
  return source.rows.filter(x=>(!company||x.company===company)&&norm([x.name,x.id,x.company].join(' ')).includes(norm(query)));
 }
 function reviewedVacations(source,input){
  if(source?.state!=='local-roster'||!Array.isArray(input?.reviews)||input.reviews.length<1||input.reviews.length>200)throw Error('invalid-review');
  const current=new Map(source.rows.map(x=>[x.id,x])),seen=new Set(),valid=[],issues=[];
  for(const r of input.reviews){
   const k=employeeId(r?.employeeId),e=current.get(k);
   if(!k||seen.has(k))throw Error('duplicate-review');seen.add(k);
   if(!e||r.signature!==e.signature){issues.push({employeeId:k,reason:'roster-changed'});continue}
   if(r.reviewed!==true||!money(r.baseCents)||!days(r.availableDays)||!['acquired','proportional'].includes(r.entitlement)){issues.push({employeeId:k,reason:'entitlement-review-required'});continue}
   valid.push({id:k,baseCents:r.baseCents,availableDays:r.availableDays,entitlement:r.entitlement,entitlementVerified:true,paidLeaveApproved:r.paidLeaveApproved===true});
  }
  const result=vacations({periods:input.periods,employees:valid,priorPeriodsByYear:input.priorPeriodsByYear||{},calendarVerified:false,closedDays:[]});
  const partial=result.people.some(x=>x.periods.some(p=>p.status==='review'));
  const totals=result.totals.map((t,i)=>{const rows=result.people.map(p=>p.periods[i]),grossCount=rows.filter(x=>Number.isSafeInteger(x?.grossVacationCents)).length,leaveCount=rows.filter(x=>Number.isSafeInteger(x?.paidLeaveCents)).length;return {...t,grossVacationCents:grossCount?t.grossVacationCents:null,paidLeaveCents:leaveCount?t.paidLeaveCents:null,grossCount,leaveCount,partial:grossCount<input.reviews.length||leaveCount<input.reviews.length||rows.some(x=>x?.status==='review')}});
  return {...result,totals,selectedCount:input.reviews.length,reviewedCount:valid.length,reviewIssues:issues,observedGrossCents:valid.length?result.observedGrossCents:null,coverage:!issues.length&&!partial?'reviewed-local-input':'partial-review',canPublish:false};
 }
 // Multiple acquisition cycles per person. Overlapping cycles and duplicate identifiers are not counted.
 function provisionCycles(source,rows,asOf,filter='all'){
  if(source?.state!=='local-roster'||!Array.isArray(rows)||rows.length>1000||date(asOf)===null||!['all','acquired','overdue','proportional','used','unknown'].includes(filter))throw Error('invalid-input');
  const people=new Map(source.rows.map(x=>[x.id,x])),byPerson=new Map(),counts=new Map(),invalid=new Set(),records=[];
  for(const [i,r] of rows.entries()){
   const employee=people.get(employeeId(r?.employeeId)),k=id(r?.cycleId),a=date(r?.acquisitionStart),b=date(r?.acquisitionEnd),c=date(r?.concessionEnd);
   const row={i,cycleId:k,employeeId:employeeId(r?.employeeId),name:employee?.name||'Cadastro não localizado',acquisitionStart:r?.acquisitionStart,acquisitionEnd:r?.acquisitionEnd,concessionEnd:r?.concessionEnd,remainingDays:r?.remainingDays,provisionCents:r?.provisionCents,a,b,c};
   records.push(row);if(k)counts.set(k,(counts.get(k)||0)+1);
   if(!k||!employee||r.signature!==employee.signature||r.reviewed!==true||a===null||b===null||c===null||a>=b||b>=c||a>date(asOf)||!days(r.remainingDays)||!money(r.provisionCents))invalid.add(i);
   if(employee&&a!==null&&b!==null&&a<b){const list=byPerson.get(row.employeeId)||[];list.push(row);byPerson.set(row.employeeId,list)}
  }
  for(const r of records)if(counts.get(r.cycleId)!==1)invalid.add(r.i);
  for(const list of byPerson.values()){list.sort((a,b)=>a.a-b.a||a.b-b.b);for(let i=0;i<list.length;i++)for(let j=i+1;j<list.length&&list[j].a<=list[i].b;j++){invalid.add(list[i].i);invalid.add(list[j].i)}}
  const groups={acquired:[],overdue:[],proportional:[],used:[],unknown:[]};
  for(const r of records){const status=invalid.has(r.i)?'unknown':r.remainingDays===0?'used':date(asOf)>r.c?'overdue':date(asOf)>=r.b?'acquired':'proportional';const {i,a,b,c,...safe}=r;groups[status].push({...safe,provisionCents:status==='unknown'?null:r.provisionCents,status})}
  const known=Object.values(groups).flat().filter(x=>x.status!=='unknown'),sum=a=>a.length?a.reduce((s,x)=>s+x.provisionCents,0):null;
  const filtered=filter==='all'?Object.values(groups).flat():groups[filter];
  return {state:'local-review',groups,rows:filtered,totals:Object.fromEntries(Object.entries(groups).map(([k,v])=>[k,k==='unknown'?null:sum(v)])),observedTotalCents:sum(known),filteredTotalCents:sum(filtered.filter(x=>x.status!=='unknown')),unknownCount:groups.unknown.length,reviewedCount:known.length,employeeCount:new Set(known.map(x=>x.employeeId)).size,officialTotalCents:null,canPublish:false};
 }
 function reviewedNotice(source,input){
  if(source?.state!=='local-roster')throw Error('roster-unavailable');
  const e=source.rows.find(x=>x.id===employeeId(input?.employeeId));
  if(!e||input.signature!==e.signature||input.reviewed!==true||date(input.hireDate)===null)throw Error('employee-review-required');
  const result=notice({hireDate:input.hireDate,noticeDate:input.noticeDate,type:input.type,mode:input.mode,salaryCents:input.salaryCents,approvedItems:input.approvedItems||[]});
  return {...result,employeeId:e.id,name:e.name,observedItemsDifferenceCents:result.items.some(x=>x.status==='open'&&['credit','discount'].includes(x.kind))?result.observedCreditsCents-result.observedDiscountsCents:null,canPublish:false};
 }
 return {vacations,provisions,notice,roster,selectRoster,reviewedVacations,provisionCycles,reviewedNotice};
})());
