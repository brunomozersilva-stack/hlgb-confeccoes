'use strict';
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory(require('./payroll-calendar-transport-workers-v9645.js'),require('./hub-personnel-forecast-reconcile-v9650.js'));else root.HLGBWorkerRegistry9659=factory(root.HLGBPayrollPlanning9645,root.HLGBHubPersonnelForecast9650)})(typeof globalThis==='object'?globalThis:this,function registry(planning,reconcile){
 const uuid=v=>typeof v==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
 const txt=(v,n)=>typeof v==='string'&&v.trim().length>0&&v.trim().length<=n?v.trim():null;
 const date=v=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&Number.isFinite(Date.parse(v+'T00:00:00Z'))&&new Date(v+'T00:00:00Z').toISOString().slice(0,10)===v;
 const integer=(v,min,max)=>Number.isSafeInteger(v)&&v>=min&&v<=max;
 const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
 const no=reason=>({state:reason,confirmed:false,canPublish:false});
 function profile(p){
  if(!uuid(p.worker_id)||!uuid(p.operation_id)||!integer(p.revision,1,2147483647)||!txt(p.name,160)||!txt(p.role_name,120)||!txt(p.sector,120)||!date(p.start_date)||typeof p.active!=='boolean'||p.planned_days!==null&&!integer(p.planned_days,0,7)||!Array.isArray(p.benefits))throw Error('invalid-profile');
  // Registered employees must remain in canonical payroll; this supplemental registry must not create another payment.
  const x=planning.worker({id:p.worker_id,mode:p.mode,relationship:p.relationship,rateCents:p.rate_cents,transportEnabled:p.transport_enabled,transportCents:p.transport_cents,benefits:p.benefits});
  if(x.relationship==='registered')throw Error('use-canonical-payroll');
  return {worker_id:p.worker_id,operation_id:p.operation_id,revision:p.revision,name:p.name.trim(),role_name:p.role_name.trim(),sector:p.sector.trim(),start_date:p.start_date,active:p.active,planned_days:p.planned_days,mode:x.mode,relationship:x.relationship,rate_cents:x.rateCents,transport_enabled:x.transportEnabled,transport_cents:x.transportCents,benefits:[...x.benefits].sort()};
 }
 function review(p,input){
  const x=profile(p);
  if(!x.active||x.mode!=='daily'||!date(input.friday)||new Date(input.friday+'T00:00:00Z').getUTCDay()!==5||input.friday<x.start_date||!date(input.asOf))throw Error('invalid-period');
  const weekStart=new Date(Date.parse(input.friday+'T00:00:00Z')-4*86400000).toISOString().slice(0,10);
  if(weekStart<x.start_date)throw Error('partial-first-week-review');
  return planning.weekly({id:x.worker_id,mode:x.mode,relationship:x.relationship,rateCents:x.rate_cents,transportEnabled:x.transport_enabled,transportCents:x.transport_cents,benefits:x.benefits},{friday:input.friday,asOf:input.asOf,plannedDays:x.planned_days,workedDays:input.workedDays??null,commuteDays:input.commuteDays??null,closedDays:input.closedDays||[],calendarVerified:false,existing:input.existing||[]});
 }
 function draft(p,v){
  const x=profile(p);if(!uuid(v.operation_id)||!integer(v.revision,1,2147483647)||!integer(v.worked_days,0,7)||!integer(v.commute_days,0,v.worked_days)||!date(v.as_of)||v.as_of<v.friday||typeof v.note!=='string'||v.note.length>500)throw Error('invalid-week-draft');
  if(!x.transport_enabled&&v.commute_days!==0)throw Error('transport-disabled');
  const q=review(x,{friday:v.friday,asOf:v.as_of,workedDays:v.worked_days,commuteDays:v.commute_days});
  if(q.actualCents===null)throw Error('missing-days');
  return {worker_id:x.worker_id,worker_revision:x.revision,week_friday:v.friday,revision:v.revision,operation_id:v.operation_id,worked_days:v.worked_days,commute_days:v.commute_days,note:v.note.trim()};
 }
 function fields(row,template){return Object.fromEntries(Object.keys(template).map(k=>[k,row?.[k]]))}
 async function save(kind,record,transport){
  if(!transport||typeof transport.allowed!=='function'||transport.allowed()!==true)return no('permission-or-disabled');
  try{
   const previous=await transport.byOperation(kind,record.operation_id);
   if(transport.allowed()!==true)return no('permission-or-disabled');
   if(previous)return same(fields(previous,record),record)?{state:'confirmed',confirmed:true,record:fields(previous,record),canPublish:false}:no('operation-conflict');
   const current=await transport.latest(kind,record);
   if(transport.allowed()!==true)return no('permission-or-disabled');
   if((current?.revision||0)!==record.revision-1)return no('revision-conflict');
   // Server unique constraint and immutable versions are authoritative. A network error is not success.
   let ack=null;try{ack=await transport.insert(kind,record)}catch(_){}
   if(transport.allowed()!==true)return no('permission-or-disabled');
   const verified=await transport.byOperation(kind,record.operation_id);
   if(transport.allowed()!==true)return no('permission-or-disabled');
   if(!verified||!same(fields(verified,record),record))return no('unconfirmed-retry-same-operation');
   return {state:'confirmed',confirmed:true,record:fields(verified,record),canPublish:false};
  }catch(_){return no('unconfirmed-retry-same-operation')}
 }
 function forecast(profileRow,input,ctx){
  const x=profile(profileRow),v=review(x,input);
  const amounts={plannedCents:v.plannedCents,actualCents:v.actualCents,differenceCents:v.differenceCents,scheduledCandidate:v.scheduledCandidate,requiresDays:v.requiresDays,requiresRegularizationReview:v.requiresRegularizationReview};
  if(!v.scheduledCandidate||v.plannedCents===null)return {...amounts,reconciliation:'incomplete-forecast',canPublish:false};
  // This view never establishes remote completeness even when a registry revision is confirmed.
  const r=reconcile.inspect({authenticated:ctx?.authenticated===true,payrollAllowed:ctx?.payrollAllowed===true,financeAllowed:ctx?.financeAllowed===true,rows:ctx?.rows,pendingOrigins:[],snapshotVerified:false,coverageVerified:false,pendingVerified:false},{kind:'worker-week',personId:x.worker_id,friday:input.friday,dueDate:v.scheduledCandidate,amountCents:v.actualCents??v.plannedCents,sourceVerified:false,calendarVerified:false});
  return {...amounts,reconciliation:r.state,canPublish:false};
 }

 function monthly(profileRow,input,ctx){
  const x=profile(profileRow);
  if(!x.active||x.mode!=='monthly'||typeof input?.competence!=='string'||!/^\d{4}-(0[1-9]|1[0-2])$/.test(input.competence)||input.competence<x.start_date.slice(0,7)||!date(input.asOf)||!date(input.contractDate))throw Error('invalid-month');
  if(input.competence===x.start_date.slice(0,7)&&!x.start_date.endsWith('-01'))throw Error('partial-first-month-review');
  const v=planning.monthly({id:x.worker_id,mode:x.mode,relationship:x.relationship,rateCents:x.rate_cents,transportEnabled:x.transport_enabled,transportCents:x.transport_cents,benefits:x.benefits},input);
  const r=reconcile.inspect({authenticated:ctx?.authenticated===true,payrollAllowed:ctx?.payrollAllowed===true,financeAllowed:ctx?.financeAllowed===true,rows:ctx?.rows,pendingOrigins:[],snapshotVerified:false,coverageVerified:false,pendingVerified:false},{kind:'worker-month',personId:x.worker_id,competence:input.competence,dueDate:input.contractDate,amountCents:v.observedGrossCents,sourceVerified:false,calendarVerified:false});
  return {...v,reconciliation:r.state,canPublish:false};
 }
 // Dated weekly scenario supports admission during the week and separate
 // planned/actual commutes. Does not turn a partial week into a saved payment.
 function datedWeek(profileRow,input,ctx){
  const p=profile(profileRow),friday=input?.friday,asOf=input?.asOf;
  if(!p.active||p.mode!=='daily'||!date(friday)||new Date(friday+'T00:00:00Z').getUTCDay()!==5||!date(asOf)||friday<p.start_date)throw Error('invalid-week');
  const day=86400000,finish=Date.parse(friday+'T00:00:00Z'),start=new Date(finish-4*day).toISOString().slice(0,10);
  const calendar=Array.from({length:5},(_,i)=>new Date(finish-(4-i)*day).toISOString().slice(0,10));
  const valid=(a,nullable=false)=>{if(nullable&&a===null)return null;if(!Array.isArray(a)||a.length>5||new Set(a).size!==a.length||a.some(d=>!calendar.includes(d)||d<p.start_date))throw Error('invalid-dates');return [...a].sort()};
  const planned=valid(input.plannedDates),plannedCommute=valid(input.plannedCommuteDates),worked=valid(input.workedDates,true),commute=valid(input.commuteDates,true),closed=input.closedDates||[];
  if(!Array.isArray(closed)||new Set(closed).size!==closed.length||closed.some(d=>!calendar.includes(d)))throw Error('invalid-closed-days');
  const subset=(a,b)=>a.every(d=>b.includes(d));
  if(!subset(plannedCommute,planned)||!p.transport_enabled&&plannedCommute.length||worked===null&&commute!==null||worked&&worked.some(d=>d>asOf)||commute&&(!subset(commute,worked)||!p.transport_enabled&&commute.length))throw Error('invalid-commute-or-future');
  if(planned.some(d=>closed.includes(d)))throw Error('planned-on-closed-day');
  const issues=[];if(worked?.some(d=>closed.includes(d)))issues.push('worked-on-closed-day-review');
  if(worked?.some(d=>!planned.includes(d)))issues.push('worked-outside-plan-review');
  if(input.reviewed!==true)issues.push('parameters-unreviewed');
  if(asOf<friday)issues.push('week-not-ended');
  const plan=planned.length*p.rate_cents+plannedCommute.length*p.transport_cents,actual=worked===null||p.transport_enabled&&commute===null?null:worked.length*p.rate_cents+(commute?.length||0)*p.transport_cents;
  const due=[...calendar].reverse().find(d=>!closed.includes(d)&&d>=p.start_date)||null;
  const identity='worker_week_forecast_v1|'+p.worker_id+':'+friday;
  let state='incomplete-forecast';if(due&&typeof reconcile?.inspect==='function')state=reconcile.inspect({authenticated:ctx?.authenticated===true,payrollAllowed:ctx?.payrollAllowed===true,financeAllowed:ctx?.financeAllowed===true,rows:ctx?.rows,pendingOrigins:[],snapshotVerified:false,coverageVerified:false,pendingVerified:false},{kind:'worker-week',personId:p.worker_id,friday,dueDate:due,amountCents:actual??plan,sourceVerified:false,calendarVerified:false}).state;
  return {state:'dated-week-preview',identity,start,friday,partialFirstWeek:p.start_date>start,plannedDays:planned.length,plannedCommuteDays:plannedCommute.length,workedDays:worked?.length??null,commuteDays:commute?.length??null,plannedCents:plan,actualCents:actual,differenceCents:actual===null?null:actual-plan,scheduledCandidate:due,issues,benefits:p.benefits,requiresRegularizationReview:p.relationship==='review-required',reconciliation:state,officialAmountCents:null,canPublish:false};
 }
 // Collective scenario: individual reviewed snapshots, never a payable total.
 function batchDatedWeeks(entries,friday,asOf,ctx){
  const empty=state=>({state,rows:[],canPublish:false,officialAmountCents:null});
  if(ctx?.authenticated!==true||ctx?.payrollAllowed!==true)return empty('permission');
  if(!Array.isArray(entries)||entries.length<1||entries.length>200||!date(friday)||new Date(friday+'T00:00:00Z').getUTCDay()!==5||!date(asOf))return empty('invalid-batch');
  const ids=new Map(),names=new Map(),rows=[],totals={plannedCents:null,actualCents:null,pairedPlannedCents:null,pairedDifferenceCents:null};
  const nameKey=p=>p.name.normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase();
  for(const entry of entries){let p;try{p=profile(entry?.profile)}catch(_){return empty('invalid-profile')}if(entry.input?.friday!==friday)return empty('mixed-week');ids.set(p.worker_id,(ids.get(p.worker_id)||0)+1);const k=nameKey(p);names.set(k,(names.get(k)||0)+1)}
  let plannedCount=0,actualCount=0,reviewCount=0;
  for(const entry of entries){
   const p=profile(entry.profile),row={workerId:p.worker_id,name:p.name,sector:p.sector,revision:p.revision,localDraft:entry.localDraft===true,preview:null,reason:null};
   if(ids.get(p.worker_id)>1)row.reason='duplicate-worker';
   else if(names.get(nameKey(p))>1)row.reason='same-name-review';
   else if(entry.input.reviewed!==true)row.reason='parameters-unreviewed';
   else try{const v=datedWeek(p,{...entry.input,asOf},ctx);row.preview=v;
    if(!v.scheduledCandidate)row.reason='no-payment-date';
    else if(v.reconciliation==='already-paid-review')row.reason='already-paid-review';
    else if(['duplicate-review','legacy-or-unlinked-review','existing-conflict','pending-sync-review'].includes(v.reconciliation))row.reason=v.reconciliation;
    else {totals.plannedCents=(totals.plannedCents??0)+v.plannedCents;plannedCount++;
     if(v.actualCents!==null&&!v.issues.some(x=>x!=='week-not-ended')&&asOf>=friday){totals.actualCents=(totals.actualCents??0)+v.actualCents;totals.pairedPlannedCents=(totals.pairedPlannedCents??0)+v.plannedCents;totals.pairedDifferenceCents=(totals.pairedDifferenceCents??0)+v.differenceCents;actualCount++}
     else row.reason=v.actualCents===null?'actual-unknown':'actual-review';
    }
   }catch(_){row.reason='invalid-dates-or-profile'}
   if(row.reason)reviewCount++;rows.push(row);
  }
  if(Object.values(totals).some(x=>x!==null&&!Number.isSafeInteger(x)))return empty('amount-limit');
  return {state:'local-batch',friday,asOf,rows,totals,selectedCount:rows.length,plannedCount,actualCount,reviewCount,partial:reviewCount>0,officialAmountCents:null,canPublish:false};
 }
 function reviewedWeek(p,old,friday){
  const x=profile(p);if(!date(friday)||new Date(friday+'T00:00:00Z').getUTCDay()!==5)throw Error('invalid-friday');
  if(old&&(old.worker_id!==x.worker_id||old.week_friday!==friday||!integer(old.revision,1,2147483647)))throw Error('invalid-week-record');
  return {worker_id:x.worker_id,worker_revision:x.revision,friday,expectedRevision:old?.revision||0};
 }
 function nextWeek(p,reviewed,v){
  const x=profile(p);
  if(!reviewed||reviewed.worker_id!==x.worker_id||reviewed.worker_revision!==x.revision||reviewed.friday!==v.friday||!integer(reviewed.expectedRevision,0,2147483646))throw Error('review-required');
  return draft(x,{...v,revision:reviewed.expectedRevision+1});
 }
 return {profile,review,draft,save,forecast,monthly,datedWeek,batchDatedWeeks,reviewedWeek,nextWeek};
});
