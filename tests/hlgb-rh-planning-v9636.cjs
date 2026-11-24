const assert=require('node:assert/strict');const api=require('../hlgb-modules/financeiro/rh-planning-v9636.js');(function tests(api,ok){
 const periods=[{start:'2026-12-21',end:'2027-01-09'},{start:'2027-02-08',end:'2027-02-17'}],e={id:'1',baseCents:300000,availableDays:30,entitlement:'acquired',entitlementVerified:true},x={periods,employees:[e],priorPeriodsByYear:{2026:0,2027:0}},before=JSON.stringify(x),p=api.vacations(x);
 ok(p.totals[0].days===20&&p.totals[1].days===10,'20+10');ok(p.people[0].periods[1].remainingDays===0,'no double use');ok(p.observedGrossCents===400000,'gross plus third');ok(p.totals[0].paymentCandidate==='2026-12-19','payment date');ok(p.officialTotalCents===null&&!p.canPublish,'not actual');
 ok(api.vacations({...x,employees:[{...e,availableDays:15}]}).issues.includes('insufficient-balance'),'insufficient balance');
 ok(api.vacations({...x,employees:[{...e,availableDays:10,entitlement:'proportional',paidLeaveApproved:true}]}).issues.includes('proportional-cycle-recalculation'),'new employee');
 ok(api.vacations({...x,employees:[e,e]}).people.length===0,'duplicate person');ok(JSON.stringify(x)===before,'immutable');
 let err=false;try{api.vacations({...x,periods:[periods[0],periods[0]]})}catch(_){err=true}ok(err,'overlap');
 const p0={id:'a',acquisitionEnd:'2026-01-01',concessionEnd:'2027-01-01',remainingDays:20,provisionCents:10000,verified:true};
 const g=api.provisions([p0,{...p0,id:'b',concessionEnd:'2026-11-01'},{...p0,id:'c',acquisitionEnd:'2027-01-01',concessionEnd:'2028-01-01'},{...p0,id:'d',verified:false}], '2026-11-23');
 ok(g.groups.acquired.length===1&&g.groups.overdue.length===1&&g.groups.proportional.length===1&&g.groups.unknown.length===1,'rights distinction');
 ok(g.observedTotalCents===30000&&g.officialTotalCents===null,'filtered total');
 const a={hireDate:'2021-11-23',noticeDate:'2026-11-23',type:'employer-no-cause',mode:'indemnified',salaryCents:300000};
 ok(api.notice(a).referenceDays===45&&api.notice(a).referenceIndemnityCents===450000,'5 years');ok(api.notice({...a,hireDate:'2000-01-01'}).referenceDays===90,'cap');ok(api.notice({...a,hireDate:'2026-11-01'}).referenceDays===30,'recent');
 ok(api.notice({...a,type:'resignation'}).referenceIndemnityCents===null,'resignation not employer benefit');
 ok(api.notice({...a,mode:'worked'}).projectedEnd===null,'worked review');
 ok(api.notice({...a,type:'mutual'}).referenceDays===null,'agreement review');
 const v=api.notice({...a,approvedItems:[{id:'x',amountCents:1000,status:'paid',kind:'credit',verified:true},{id:'y',amountCents:2000,status:'open',kind:'credit',verified:true}]});ok(v.observedCreditsCents===2000&&!v.canPublish&&v.officialNetCents===null,'paid excluded');
})(api,(v,m)=>{assert.ok(v,m);console.log('PASS',m)});
