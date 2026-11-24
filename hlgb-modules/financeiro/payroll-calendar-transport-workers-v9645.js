'use strict';
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory(require('./payroll-fifth-day-v9632.cjs'));else root.HLGBPayrollPlanning9645=factory(root.HLGBPayrollCalendar9632)})(typeof globalThis==='object'?globalThis:this,function payrollPlanning(calendar){
 const DAY=86400000,iso=n=>new Date(n).toISOString().slice(0,10),dt=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&Number.isFinite(Date.parse(s+'T00:00:00Z'))&&iso(Date.parse(s+'T00:00:00Z'))===s?Date.parse(s+'T00:00:00Z'):null;
 const money=n=>Number.isSafeInteger(n)&&n>=0&&n<=1000000000,validId=s=>typeof s==='string'&&/^[A-Za-z0-9_-]{1,100}$/.test(s);
 const dayList=a=>Array.isArray(a)&&a.every(s=>dt(s)!==null)&&new Set(a).size===a.length;
 function salaryDate(input){
  const result=calendar.due(input),closed=input.companyClosed||[];
  if(!dayList(closed))throw Error('invalid-company-calendar');
  const h=new Set([...(input.holidays||[]),...closed]),bank=new Set(input.bankClosed||[]);
  const work=n=>![0,6].includes(new Date(n).getUTCDay())&&!h.has(iso(n));
  const [y,m]=input.competence.split('-').map(Number),start=Date.UTC(y,m,1),end=Date.UTC(y,m+1,1);
  let count=0,fifth=null;for(let n=start;n<end;n+=DAY)if(work(n)&&++count===5){fifth=n;break}
  if(fifth===null)throw Error('no-fifth-company-day');
  let scheduled=dt(result.candidateLimit),limit=scheduled-31*DAY;while(scheduled>=limit&&(!work(scheduled)||bank.has(iso(scheduled))))scheduled-=DAY;
  if(scheduled<limit)throw Error('no-payment-day');
  const verified=input.companyCoverageVerified===true&&result.legalLimit!==null&&result.operationalDate!==null;
  return {...result,companyFifthCandidate:iso(fifth),companyFifthConfirmed:verified?iso(fifth):null,scheduledCandidate:iso(scheduled),scheduledConfirmed:verified?iso(scheduled):null,signal:verified?(input.asOf===iso(scheduled)?'today':input.asOf<iso(scheduled)?'upcoming':'passed'):'unverified-calendar',canPublish:false};
 }
 function transport(input){
  const {employeeId,start,end,asOf,paidThrough,calendarVerified=false,attendanceVerified=false,coverageVerified=false,adjustmentPolicyVerified=false,eligible,workDates,paidDays,attendance,rateCents,previousAdjustments=[]}=input||{};
  if(!validId(employeeId)||[start,end,asOf,paidThrough].some(s=>dt(s)===null)||end<start||dt(end)-dt(start)>62*DAY||typeof eligible!=='boolean'||!money(rateCents)||!dayList(workDates)||!Array.isArray(paidDays)||!Array.isArray(attendance)||!dayList(previousAdjustments))throw Error('invalid-transport-input');
  const issues=[],paid=new Map(),point=new Map(),adjusted=new Set(previousAdjustments);
  for(const p of paidDays){if(dt(p?.date)===null||!money(p.amountCents)||paid.has(p.date)||p.verified!==true){issues.push('advance-evidence-invalid');continue}paid.set(p.date,p.amountCents)}
  for(const p of attendance){if(dt(p?.date)===null||point.has(p.date)||!['worked-commuted','no-commute','unknown'].includes(p.status)||p.verified!==true){issues.push('attendance-evidence-invalid');continue}point.set(p.date,p.status)}
  const lines=[];let gross=0,credit=0;const work=workDates.filter(d=>d>=start&&d<=end).sort();
  for(const d of work){
   const status=point.get(d)||'unknown',amount=paid.get(d),covered=amount!==undefined;
   if(d<=paidThrough&&!covered&&eligible)issues.push('advance-date-not-proven');
   if(d<=asOf&&status==='unknown'&&eligible)issues.push('attendance-missing');
   let forecast=0,possibleCredit=0;
   if(eligible&&!covered&&d>paidThrough&&status!=='no-commute'){forecast=rateCents;gross+=forecast}
   if(eligible&&covered&&d<=asOf&&status==='no-commute'&&!adjusted.has(d)){possibleCredit=amount;credit+=amount}
   lines.push({date:d,status,covered,advanceCents:amount??null,forecastCents:forecast,possibleCreditCents:possibleCredit});
  }
  const quality=calendarVerified&&attendanceVerified&&coverageVerified&&adjustmentPolicyVerified&&issues.length===0;
  return {state:'draft',employeeId,firstUncoveredDate:lines.find(x=>!x.covered&&x.date>paidThrough)?.date||null,lines,forecastCents:gross,possibleCreditCents:credit,reviewedCreditCents:quality?Math.min(gross,credit):null,remainingCreditCents:quality?Math.max(0,credit-gross):null,nextAdvanceCandidateCents:quality?Math.max(0,gross-credit):null,issues:[...new Set(issues)],officialPayrollCents:null,canPublish:false};
 }
 function worker(input){
  const {id,mode,relationship,rateCents,transportEnabled,transportCents,benefits=[]}=input||{};
  if(!validId(id)||!['daily','monthly'].includes(mode)||!['registered','independent-reviewed','review-required'].includes(relationship)||!money(rateCents)||typeof transportEnabled!=='boolean'||!money(transportCents)||!Array.isArray(benefits)||benefits.some(b=>!['13th','vacation','vacation-third','other'].includes(b)))throw Error('invalid-worker');
  const required=relationship==='registered'||relationship==='review-required'?['13th','vacation','vacation-third']:[];
  return {id,mode,relationship,rateCents,transportEnabled,transportCents:transportEnabled?transportCents:0,benefits:[...new Set([...required,...benefits])],requiresRegularizationReview:relationship==='review-required',canPublish:false};
 }
 function weekly(person,input){
  const p=worker(person),{friday,asOf,plannedDays,workedDays=null,commuteDays=null,calendarVerified=false,closedDays=[],existing=[]}=input||{};
  if(p.mode!=='daily'||dt(friday)===null||new Date(dt(friday)).getUTCDay()!==5||dt(asOf)===null||plannedDays!==null&&(!Number.isInteger(plannedDays)||plannedDays<0||plannedDays>7)||!dayList(closedDays)||!Array.isArray(existing)||workedDays!==null&&(!Number.isInteger(workedDays)||workedDays<0||workedDays>7)||commuteDays!==null&&(!Number.isInteger(commuteDays)||commuteDays<0||workedDays===null||commuteDays>workedDays))throw Error('invalid-week');
  let due=dt(friday),min=due-4*DAY;const closed=new Set(closedDays);while(due>=min&&closed.has(iso(due)))due-=DAY;
  const scheduled=due>=min?iso(due):null,key='worker-week:'+p.id+':'+friday,rows=existing.filter(x=>x?.origin===key),observedPlanned=plannedDays===null?null:plannedDays*(p.rateCents+p.transportCents),actual=workedDays===null||p.transportEnabled&&commuteDays===null?null:workedDays*p.rateCents+(commuteDays||0)*p.transportCents;
  const status=rows.length>1?'duplicate-review':rows.some(x=>x.status==='paid')?'already-paid':rows.length?'existing-review':'new-draft';
  return {key,scheduledCandidate:scheduled,scheduledConfirmed:calendarVerified?scheduled:null,plannedCents:observedPlanned,actualCents:actual,differenceCents:actual===null||observedPlanned===null?null:actual-observedPlanned,status,requiresDays:!!scheduled&&asOf>=scheduled&&actual===null&&!['already-paid','duplicate-review'].includes(status),requiresRegularizationReview:p.requiresRegularizationReview,benefits:p.benefits,canPublish:false,officialAmountCents:null};
 }
 function monthly(person,input){
  const p=worker(person),{competence,asOf,contractDate,commuteDays=null,existing=[]}=input||{};
  if(p.mode!=='monthly'||typeof competence!=='string'||!/^\d{4}-(0[1-9]|1[0-2])$/.test(competence)||dt(asOf)===null||dt(contractDate)===null||!Array.isArray(existing)||commuteDays!==null&&(!Number.isInteger(commuteDays)||commuteDays<0||commuteDays>31))throw Error('invalid-month');
  const key='worker-month:'+p.id+':'+competence,rows=existing.filter(x=>x?.origin===key);
  const status=rows.length>1?'duplicate-review':rows.some(x=>x.status==='paid')?'already-paid':rows.length?'existing-review':'new-draft';
  const transportCents=p.transportEnabled?(commuteDays===null?null:p.transportCents*commuteDays):0;
  return {key,contractDateCandidate:contractDate,scheduledConfirmed:null,baseCents:p.rateCents,transportCents,observedGrossCents:transportCents===null?null:p.rateCents+transportCents,status,requiresReview:status!=='already-paid',benefits:p.benefits,requiresRegularizationReview:p.requiresRegularizationReview,officialAmountCents:null,canPublish:false};
 }
 return {salaryDate,transport,worker,weekly,monthly};
});
