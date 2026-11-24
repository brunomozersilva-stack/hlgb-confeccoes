'use strict';
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory(require('./payroll-calendar-transport-workers-v9645.js'),require('./hub-personnel-forecast-reconcile-v9650.js'));else root.HLGBWorkerRegistry9659=factory(root.HLGBPayrollPlanning9645,root.HLGBHubPersonnelForecast9650)})(typeof globalThis==='object'?globalThis:this,function registry(planning,reconcile){
 const uuid=v=>typeof v==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
 const txt=(v,n)=>typeof v==='string'&&v.trim().length>0&&v.trim().length<=n?v.trim():null;
 const date=v=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&Number.isFinite(Date.parse(v+'T00:00:00Z'))&&new Date(v+'T00:00:00Z').toISOString().slice(0,10)===v;
 const integer=(v,min,max)=>Number.isSafeInteger(v)&&v>=min&&v<=max;
 const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
 const no=reason=>({state:reason,confirmed:false,canPublish:false});
 function profile(p){
  if(!uuid(p.worker_id)||!uuid(p.operation_id)||!integer(p.revision,1,2147483647)||!txt(p.name,160)||!txt(p.role_name,120)||!txt(p.sector,120)||!date(p.start_date)||typeof p.active!=='boolean'||!integer(p.planned_days,0,7)||!Array.isArray(p.benefits))throw Error('invalid-profile');
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
 return {profile,review,draft,save,forecast};
});
