'use strict';
module.exports=(function calendar(){
 const DAY=86400000,iso=n=>new Date(n).toISOString().slice(0,10);
 const dt=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&Number.isFinite(Date.parse(s+'T00:00:00Z'))&&iso(Date.parse(s+'T00:00:00Z'))===s?Date.parse(s+'T00:00:00Z'):null;
 function due(input){
  const {competence,asOf,holidays=[],bankClosed=[],holidayCoverageVerified,agreementVerified,agreementEarlierDate=null,bankCoverageVerified}=input||{};
  if(typeof competence!=='string'||!/^\d{4}-(0[1-9]|1[0-2])$/.test(competence)||dt(asOf)===null||!Array.isArray(holidays)||!Array.isArray(bankClosed)||[...holidays,...bankClosed].some(d=>dt(d)===null))throw Error('invalid-calendar');
  const [y,m]=competence.split('-').map(Number),start=Date.UTC(y,m,1),end=Date.UTC(y,m+1,1),h=new Set(holidays),b=new Set(bankClosed);
  const work=n=>new Date(n).getUTCDay()!==0&&!h.has(iso(n));
  const bank=n=>work(n)&&new Date(n).getUTCDay()!==6&&!b.has(iso(n));
  let count=0,fifth=null;for(let n=start;n<end;n+=DAY){if(work(n)&&++count===5){fifth=n;break}}
  if(fifth===null)throw Error('no-fifth-day');
  let limit=fifth;
  if(agreementEarlierDate!==null){const a=dt(agreementEarlierDate);if(a===null||a<start||a>fifth)throw Error('invalid-agreement-date');limit=a}
  let schedule=limit;while(schedule>=start-31*DAY&&!bank(schedule))schedule-=DAY;
  if(!bank(schedule))throw Error('no-bank-day');
  const legalConfirmed=holidayCoverageVerified===true&&agreementVerified===true,bankConfirmed=legalConfirmed&&bankCoverageVerified===true;
  const now=dt(asOf),dayState=now<fifth?'upcoming':now===fifth?'today':'passed';
  return {competence,forecastKey:'payroll-preview:'+competence,fifthDay:iso(fifth),legalLimit:legalConfirmed?iso(limit):null,candidateLimit:iso(limit),operationalDate:bankConfirmed?iso(schedule):null,candidateOperationalDate:iso(schedule),calendarQuality:legalConfirmed?'verified-input':'provisional',bankQuality:bankConfirmed?'verified-input':'provisional',fifthDaySignal:legalConfirmed?dayState:'unverified-calendar',deadlineSignal:legalConfirmed?(now<limit?'upcoming':now===limit?'today':'passed'):'unverified-calendar',bankAdvanceRequired:bankConfirmed?schedule<limit:null,paymentStatus:'not-determined'};
 }
 function preview(input){
  const dates=due(input),{employees,employeeCoverageVerified,sourceVerified}=input;
  if(!Array.isArray(employees)||employees.length>100000)throw Error('invalid-employees');
  const seen=new Set(),issues=[],lines=[];
  for(const e of employees){
   const id=typeof e?.employeeId==='string'?e.employeeId.trim():'';
   if(!id||seen.has(id)||e.competence!==dates.competence||e.verified!==true||!['open','paid'].includes(e.status)||!Number.isSafeInteger(e.netCents)||e.netCents<0||e.netCents>1000000000){issues.push({employeeId:id,reason:'invalid-or-unverified-line'});continue}
   seen.add(id);lines.push({employeeId:id,netCents:e.netCents,status:e.status});
  }
  const ready=employeeCoverageVerified===true&&sourceVerified===true&&issues.length===0;
  return {...dates,lines,issues,amountQuality:ready?'verified-input':'incomplete',netPayrollCents:ready?lines.reduce((s,e)=>s+e.netCents,0):null,remainingPayrollCents:ready?lines.filter(e=>e.status==='open').reduce((s,e)=>s+e.netCents,0):null,forecastStatus:'draft',canPublish:false};
 }
 return {due,preview};
})();
