(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory(require('./weekly-intelligence-core-v9627.js'),require('./cash-projection-v9631.js'));else root.HLGBHubIntelligenceAdapter9633=factory(root.HLGBWeeklyFinance9627,root.HLGBCashProjection9631);})(typeof globalThis==='object'?globalThis:this,function factory(weekly,cash){
 const id=x=>typeof x==='string'||(typeof x==='number'&&Number.isSafeInteger(x))?String(x).trim():'';
 const cents=x=>{if(typeof x!=='number'&&!(typeof x==='string'&&/^\d+(\.\d{1,2})?$/.test(x)))return null;const v=Number(x),n=Math.round(v*100);return Number.isSafeInteger(n)&&n>=0&&n<=Math.floor(Number.MAX_SAFE_INTEGER/100000)&&Math.abs(v*100-n)<0.00001?n:null};
 const date=x=>typeof x==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(x)&&weekly.monday(x)!==null?x:null;
 const deleted=x=>!!(x?.deleted===true||x?.deleted_at||x?.deletedAt||x?._deleted===true);
 const unavailable=reason=>({state:'unavailable',reason,comparison:null,cash:null,observations:[]});
 function inspect(context,options){
  if(!context||context.authenticated!==true||context.financeAllowed!==true||context.payrollAggregateAllowed!==true)return unavailable('permission');
  const {db,paidDateApi}=context;
  if(!db||!Array.isArray(db.hubFinanceEntries)||!Array.isArray(db.payroll)||typeof paidDateApi?.rows!=='function')return unavailable('source-unavailable');
  const {asOf,targetDate,historyWeeks=8,receiptDelayDays=14}=options||{};
  if(!date(asOf)||!date(targetDate)||![8,12,26].includes(historyWeeks)||![0,7,14,21,28].includes(receiptDelayDays)||weekly.monday(targetDate)<weekly.monday(asOf))return unavailable('invalid-period');
  // Pending identities are evidence of uncertainty, not evidence of cloud confirmation.
  const evidence=context.pendingEvidence,rawIds=Array.isArray(evidence?.ids)?evidence.ids:[],pending=new Set(rawIds.filter(x=>typeof x==='string'&&x.includes('::')));
  const pendingState=evidence?.state==='observed'&&rawIds.length===pending.size?'observed':'incomplete';
  const records=[],issues=[],ids=new Map(),originCounts=new Map(),rawCounts=new Map(),payrollCounts=new Map(),blockedMonths=new Set();
  const addCount=(m,k)=>{if(k)m.set(k,(m.get(k)||0)+1)};
  const isPayroll=e=>['payroll','payroll_month','payroll_paid_date_view'].includes(id(e?.sourceType));
  const monthOf=e=>{const m=id(e?.sourceId);return /^\d{4}-(0[1-9]|1[0-2])$/.test(m)?m:id(e?.description).split('— ').pop()};
  const clean=e=>e&&!deleted(e)&&!String(e.kind||'').startsWith('hub_settings');
  for(const e of db.hubFinanceEntries.filter(clean))addCount(rawCounts,id(e.id));
  for(const p of db.payroll.filter(clean))addCount(payrollCounts,id(p.id));
  let allPayrollBlocked=false,pendingOmitted=0;
  const blockMonth=m=>{if(/^\d{4}-(0[1-9]|1[0-2])$/.test(m))blockedMonths.add(m);else allPayrollBlocked=true};
  for(const key of pending)if(key.startsWith('payroll::')&&!db.payroll.some(p=>id(p?.id)===key.slice(9)))allPayrollBlocked=true;
  for(const p of db.payroll.filter(clean)){
   if(pending.has('payroll::'+id(p.id))||p.pendingSync===true||p.walPending===true||p.unverified===true){blockMonth(id(p.month));pendingOmitted++}
   else if(payrollCounts.get(id(p.id))>1||p.paid===true&&(!id(p.id)||!date(typeof p.paidAt==='string'?p.paidAt.slice(0,10):null)||cents(p.paidValue)===null)){blockMonth(id(p.month));issues.push({reason:'payroll-source-review'})}
  }
  const rawHub=db.hubFinanceEntries.filter(clean).filter(e=>{
   const pendingRow=pending.has('hubFinanceEntries::'+id(e.id))||e.pendingSync===true||e.walPending===true||e.unverified===true;
   if(pendingRow||rawCounts.get(id(e.id))>1){
    if(isPayroll(e))blockMonth(monthOf(e));
    issues.push({reason:pendingRow?'pending-sync':'duplicate-id-or-origin'});
    if(pendingRow)pendingOmitted++;return false;
   }return true;
  });
  // Never synthesize a partial paid payroll month from the remaining employees.
  const allowedHub=rawHub.filter(e=>!isPayroll(e)||!(allPayrollBlocked||blockedMonths.has(monthOf(e))));
  const allowedPayroll=db.payroll.filter(clean).filter(p=>!allPayrollBlocked&&!blockedMonths.has(id(p.month)));
  if(blockedMonths.size||allPayrollBlocked)issues.push({reason:'payroll-month-excluded'});
  let effective;
  try{effective=paidDateApi.rows(JSON.parse(JSON.stringify(allowedHub)),JSON.parse(JSON.stringify(allowedPayroll)));if(!Array.isArray(effective))throw Error('invalid')}catch(_){return unavailable('payroll-view-failed')}
  const effectiveIds=new Map(),effectiveOrigins=new Map();
  const originOf=e=>{const type=id(e?.sourceType),src=id(e?.sourceId);return type&&src?JSON.stringify([type,src,type==='payroll_paid_date_view'?(typeof e.realizedAt==='string'?e.realizedAt.slice(0,10):''):'']):null};
  for(const e of effective.filter(clean)){addCount(effectiveIds,id(e.id));addCount(effectiveOrigins,originOf(e))}
  for(const e of effective){
   if(!e||deleted(e)||String(e.kind||'').startsWith('hub_settings'))continue;
   const originKey=originOf(e);if(effectiveIds.get(id(e.id))>1||originKey&&effectiveOrigins.get(originKey)>1){issues.push({reason:'duplicate-id-or-origin'});continue}
   const k=id(e.id),cat=typeof e.category==='string'?e.category.trim():'',value=cents(e.value),realized=e.status==='Realizado',planned=e.status==='Previsto',day=realized?date(typeof e.realizedAt==='string'?e.realizedAt.slice(0,10):null):date(e.date),type=id(e.sourceType),src=id(e.sourceId);
   if(!k||!cat||value===null||!day||(!realized&&!planned)||!['Entrada','Saída'].includes(e.flow)||Boolean(type)!==Boolean(src)||e.pendingSync===true||e.walPending===true||e.unverified===true||(realized&&day>asOf)){
    issues.push({id:k||null,reason:'invalid-or-unverified'});continue
   }
   // Legacy monthly payroll entries are not proof of the effective paid date.
   if(realized&&['payroll','payroll_month'].includes(type)){issues.push({id:k,reason:'legacy-payroll-date'});continue}
   const origin=type?JSON.stringify([type,src,type==='payroll_paid_date_view'?day:'']):null;
   ids.set(k,(ids.get(k)||0)+1);if(origin)originCounts.set(origin,(originCounts.get(origin)||0)+1);
   records.push({id:k,category:cat,value:value/100,flow:e.flow,status:e.status,date:planned?day:date(e.date)||day,realizedAt:realized?day:'',sourceType:type,sourceId:src,day,origin,cents:value});
  }
  const accepted=records.filter(x=>{if(ids.get(x.id)>1||(x.origin&&originCounts.get(x.origin)>1)){issues.push({id:x.id,reason:'duplicate-id-or-origin'});return false}return true});
  const target=weekly.monday(targetDate),groups=new Map();
  for(const x of accepted){
   if(weekly.monday(x.day)!==target)continue;
   const k=JSON.stringify([x.flow,x.category]),g=groups.get(k)||{flow:x.flow,category:x.category,paidCents:0,plannedCents:0,count:0};
   g[x.status==='Realizado'?'paidCents':'plannedCents']+=x.cents;g.count++;groups.set(k,g)
  }
  // A local application snapshot cannot establish coverage, remote ACK, or bank opening balance.
  // No caller flag is accepted to promote this path to verified-input.
  const comparison=weekly.compare(accepted,{asOf,targetDate,historyWeeks,snapshotVerified:false,targetVerified:false,verifiedWeeks:[]});
  const obligations=accepted.filter(x=>x.status==='Previsto'&&x.cents>0).map(x=>({id:x.id,origin:x.origin||'hub:'+x.id,dueDate:x.day,direction:x.flow==='Entrada'?'in':'out',amountCents:x.cents,status:'open',verified:true}));
  // verified is only the normalized local row's shape, not cloud evidence. Never expose a balance.
  const projection=cash.project({startDate:asOf,openingBalanceCents:null,openingVerified:false,coverageVerified:false,entries:obligations,receiptDelayDays});

  // Reuse the same normalized obligations for the production planner. This is not
  // a bank reconciliation. Keep overdue receipts separate and overdue payments due now.
  const plannerObligations={state:'partial-local',asOf,remoteConfirmed:false,coverageVerified:false,canWrite:false,pendingState,
   entries:obligations.filter(e=>e.dueDate>=asOf||e.direction==='out').map(e=>({reference:'hub:'+e.id,date:e.dueDate<asOf?asOf:e.dueDate,originalDate:e.dueDate,direction:e.direction,amountCents:e.amountCents})),
   overdueReceipts:obligations.filter(e=>e.dueDate<asOf&&e.direction==='in').map(e=>({reference:'hub:'+e.id,date:e.dueDate,amountCents:e.amountCents})),
   omitted:issues.length};
  // Historical observation does not establish complete weeks; a missing record is null, not zero.
  const historical=recordedHistory(accepted,comparison.history,target,asOf,issues.length);
  const weeklyCash=rows=>rows.map(x=>({start:x.start,end:x.end,incomingCents:x.incomingCents,outgoingCents:x.outgoingCents,closingCents:null,shortfall:null}));
  return {state:'local-observation-only',plannerObligations,reason:'Consulta local; saldo bancário, cobertura histórica e confirmação na nuvem não comprovados.',pendingEvidence:{state:pendingState,excludedCount:pendingOmitted,blockedPayrollMonths:blockedMonths.size,allPayrollBlocked,remoteConfirmed:false},observations:[...groups.values()].sort((a,b)=>b.plannedCents+b.paidCents-a.plannedCents-a.paidCents),comparison:{quality:comparison.quality,history:comparison.history,categories:comparison.categories.map(x=>({category:x.category,medianCents:null,signal:'insufficient-evidence'}))},recordedHistory:historical,weeklyActions:weeklyActions(historical,projection,asOf,target,issues.length),cash:{quality:projection.quality,base:weeklyCash(projection.base.weeks),conservative:weeklyCash(projection.conservative.weeks),receiptDelayDays,commitmentReview:commitmentReview(projection),issues:projection.issues.map(x=>({reason:x.reason}))},issues:issues.map(x=>({reason:x.reason})),omitted:issues.length};
 }

 // Descriptive priorities, not an automated diagnosis or payment instruction.
 function weeklyActions(history,projection,asOf,target,omitted){
  const actions=[],add=(code,evidence,suggestion)=>actions.push({code,evidence,suggestion,confidence:'partial-local'});
  if(omitted)add('review-source-quality',{count:omitted},'Conferir os registros excluídos antes de tomar decisões com estes valores.');
  if(history.overdue.in.count)add('review-overdue-in',{count:history.overdue.in.count,amountCents:history.overdue.in.amountCents},'Conferir recebimentos vencidos e atualizar datas somente quando confirmadas.');
  if(history.overdue.out.count)add('review-overdue-out',{count:history.overdue.out.count,amountCents:history.overdue.out.amountCents},'Conferir pagamentos vencidos e separar os já pagos dos ainda devidos.');
  const unusual=history.categories.filter(g=>g.observedComparison.signal==='above-recorded-range').sort((a,b)=>b.observedComparison.differenceCents-a.observedComparison.differenceCents||a.category.localeCompare(b.category,'pt-BR'));
  for(const g of unusual.slice(0,3)){
   const c=g.observedComparison;
   add('review-above-range',{category:g.category,targetWeek:target,observedTotalCents:c.observedTotalCents,medianCents:c.medianRecordedCents,maxCents:c.maxRecordedCents,differenceCents:c.differenceCents,recordedWeeks:c.recordedWeeks,totalWeeks:c.totalWeeks},'Conferir compras extraordinárias, volume de pedidos e vencimentos; comparar antes de ajustar o planejamento.');
  }
  const days=projection.base.days.slice(0,7),due=days.filter(d=>d.outgoingCents>0).sort((a,b)=>b.outgoingCents-a.outgoingCents||a.date.localeCompare(b.date)),total=due.reduce((n,d)=>n+d.outgoingCents,0);
  if(due.length&&Number.isSafeInteger(total)&&total>0&&due[0].outgoingCents>=total/2)add('review-concentration',{date:due[0].date,amountCents:due[0].outgoingCents,sevenDayTotalCents:total,sharePercent:Math.round(100*due[0].outgoingCents/total)},'Conferir concentração de vencimentos e disponibilidade real de caixa antes de comprometer novos gastos.');
  const missing=history.weeks.length-history.observedWeeks;
  if(missing)add('review-coverage',{missingWeeks:missing,totalWeeks:history.weeks.length},'Conferir semanas sem registros; ausência de lançamento não comprova gasto zero.');
  return {state:'partial-local',asOf,targetWeek:target,actions,aboveRangeCount:unusual.length,officialDiagnosis:null,canPublish:false};
 }
 // User-supplied balance is a scenario input, never a verified bank balance.
 function reserveScenario(source,input,allowed){
  const no=state=>({state,canPublish:false,bankConfirmed:false,officialFundingCents:null});
  if(allowed!==true)return no('permission');
  if(source?.state!=='partial-local'||source.asOf!==input?.asOf||!date(input.asOf)||!Array.isArray(source.entries)||!Array.isArray(source.overdueReceipts)||source.entries.length>100000||source.overdueReceipts.length>100000)return no('source-unavailable');
  const limit=Math.floor(Number.MAX_SAFE_INTEGER/100000),valid=n=>Number.isSafeInteger(n)&&Math.abs(n)<=limit;
  const opening=input.openingCents,reserve=input.reserveCents,delay=input.delayDays;
  if(input.reviewed!==true||!valid(opening)||!valid(reserve)||reserve<0||!Number.isInteger(delay)||delay<0||delay>91)return no('parameters-unreviewed');
  const seen=new Set(),entries=[];
  for(const e of source.entries){
   if(typeof e.reference!=='string'||!e.reference.startsWith('hub:')||seen.has(e.reference)||!date(e.date)||e.date<input.asOf||!['in','out'].includes(e.direction)||!valid(e.amountCents)||e.amountCents<=0)return no('invalid-obligation');
   seen.add(e.reference);entries.push({...e});
  }
  let overdueExcludedCents=0;for(const e of source.overdueReceipts){if(typeof e.reference!=='string'||!e.reference.startsWith('hub:')||seen.has(e.reference)||!date(e.date)||e.date>=input.asOf||!valid(e.amountCents)||e.amountCents<=0)return no('invalid-overdue');seen.add(e.reference);overdueExcludedCents+=e.amountCents}
  if(!Number.isSafeInteger(overdueExcludedCents))return no('amount-limit');
  const start=Date.parse(input.asOf+'T00:00:00Z'),DAY=86400000;
  const scenario=lag=>{
   const days=Array.from({length:91},(_,i)=>({date:new Date(start+i*DAY).toISOString().slice(0,10),incomingCents:0,outgoingCents:0}));
   let outsideIncomingCents=0,outsideOutgoingCents=0;
   for(const e of entries){const i=(Date.parse(e.date+'T00:00:00Z')-start)/DAY+(e.direction==='in'?lag:0);
    if(i>=91){if(e.direction==='in')outsideIncomingCents+=e.amountCents;else outsideOutgoingCents+=e.amountCents;continue}
    days[i][e.direction==='in'?'incomingCents':'outgoingCents']+=e.amountCents;
   }
   let balance=opening,peak=Math.max(0,reserve-opening),first=opening<reserve?input.asOf:null;
   for(const d of days){d.beforeReceiptsCents=balance-d.outgoingCents;balance=d.beforeReceiptsCents+d.incomingCents;d.closingCents=balance;d.lowestCents=Math.min(d.beforeReceiptsCents,balance);d.reserveGapCents=Math.max(0,reserve-d.lowestCents);peak=Math.max(peak,d.reserveGapCents);if(d.reserveGapCents>0&&!first)first=d.date;
    if(![d.incomingCents,d.outgoingCents,d.beforeReceiptsCents,balance,peak].every(Number.isSafeInteger))throw Error('overflow');
   }
   const weeks=Array.from({length:13},(_,i)=>{const w=days.slice(i*7,i*7+7);return {start:w[0].date,end:w[6].date,incomingCents:w.reduce((s,d)=>s+d.incomingCents,0),outgoingCents:w.reduce((s,d)=>s+d.outgoingCents,0),closingCents:w[6].closingCents,lowestCents:Math.min(i===0?opening:days[i*7-1].closingCents,...w.map(d=>d.lowestCents)),reserveGapCents:Math.max(i===0?Math.max(0,reserve-opening):0,...w.map(d=>d.reserveGapCents))}});
   return {weeks,firstReserveBreach:first,peakReserveGapCents:peak,outsideIncomingCents,outsideOutgoingCents};
  };
  try{return {...no('scenario-only'),openingCents:opening,reserveCents:reserve,delayDays:delay,base:scenario(0),delayed:scenario(delay),overdueExcludedCents,overdueExcludedCount:source.overdueReceipts.length,omitted:source.omitted??null,pendingState:source.pendingState,coverageVerified:false}}catch(_){return no('amount-limit')}
 }
 function commitmentReview(projection){
  const horizons=[7,14,30,91];
  function scenario(days){
   if(!Array.isArray(days)||days.length!==91)throw Error('invalid-projection');
   return horizons.map(horizon=>{
    let incoming=0,outgoing=0,net=0,peak=0,first=null,activeDays=0;
    const slice=days.slice(0,horizon);
    for(const d of slice){
     if(!Number.isSafeInteger(d.incomingCents)||d.incomingCents<0||!Number.isSafeInteger(d.outgoingCents)||d.outgoingCents<0)throw Error('invalid-projection-value');
     if(d.incomingCents||d.outgoingCents)activeDays++;
     incoming+=d.incomingCents;outgoing+=d.outgoingCents;
     // Payments first: timing stress from a hypothetical zero opening amount.
     net-=d.outgoingCents;
     if(net<0&&!first)first=d.date;
     peak=Math.max(peak,-net);
     net+=d.incomingCents;
     if(![incoming,outgoing,net,peak].every(Number.isSafeInteger))throw Error('projection-overflow');
    }
    return {horizon,start:slice[0].date,end:slice[slice.length-1].date,activeDays,incomingCents:incoming,outgoingCents:outgoing,netObservedCents:net,hypotheticalPeakGapCents:activeDays?peak:null,firstHypotheticalGapDate:first,actualFundingNeedCents:null};
   });
  }
  return {state:'partial-simulation',base:scenario(projection.base.days),delayed:scenario(projection.conservative.days),overdueReceiptsExcluded:projection.overdue.filter(x=>x.direction==='in').length,overduePaymentsIncluded:projection.overdue.filter(x=>x.direction==='out').length,openingBalanceVerified:false,coverageVerified:false,canPublish:false};
 }
 function recordedHistory(rows,weeks,target,asOf,omitted){
  const scope=new Set(weeks),byWeek=new Map(),byCategory=new Map(),targetGroups=new Map(),overdue={in:{amountCents:0,count:0},out:{amountCents:0,count:0}},categories=new Set();
  const tally=(map,key,field,x)=>{const g=map.get(key)||{paidInCents:null,paidOutCents:null,plannedInCents:null,plannedOutCents:null,paidInCount:0,paidOutCount:0,plannedInCount:0,plannedOutCount:0};const count=field.replace('Cents','Count');g[field]=(g[field]??0)+x.cents;g[count]++;map.set(key,g)};
  const blank=()=>({paidInCents:null,paidOutCents:null,plannedInCents:null,plannedOutCents:null,paidInCount:0,paidOutCount:0,plannedInCount:0,plannedOutCount:0});
  for(const x of rows){
   const w=weekly.monday(x.day),field=(x.status==='Realizado'?'paid':'planned')+(x.flow==='Entrada'?'In':'Out')+'Cents';
   if(x.status==='Previsto'&&x.day<asOf){const o=overdue[x.flow==='Entrada'?'in':'out'];o.amountCents+=x.cents;o.count++}
   if(!scope.has(w)&&w!==target)continue;
   if(scope.has(w))tally(byWeek,w,field,x);
   if(x.flow!=='Saída')continue;
   categories.add(x.category);
   if(scope.has(w))tally(byCategory,JSON.stringify([w,x.category]),field,x);
   if(w===target)tally(targetGroups,x.category,field,x);
  }
  const allWeeks=weeks.map(week=>({week,...(byWeek.get(week)||blank())}));
  const observedWeeks=allWeeks.filter(x=>x.paidInCount+x.paidOutCount>0).length;
  const actions=[];
  if(overdue.in.count)actions.push({code:'review-overdue-receipts',count:overdue.in.count,amountCents:overdue.in.amountCents});
  if(overdue.out.count)actions.push({code:'review-overdue-payments',count:overdue.out.count,amountCents:overdue.out.amountCents});
  if(omitted)actions.push({code:'review-omitted',count:omitted});
  if(observedWeeks<weeks.length)actions.push({code:'review-history-gaps',count:weeks.length-observedWeeks});
  const maxCategories=500,categoryRows=categories.size>maxCategories?[]:[...categories].sort((a,b)=>a.localeCompare(b,'pt-BR')).map(category=>{
   const targetRow=targetGroups.get(category)||blank();
   const historical=weeks.map(week=>{const r=byCategory.get(JSON.stringify([week,category]))||blank();return {week,paidCents:r.paidOutCents,plannedCents:r.plannedOutCents,paidCount:r.paidOutCount,plannedCount:r.plannedOutCount}});
   const samples=historical.filter(x=>x.paidCount>0&&Number.isSafeInteger(x.paidCents)).map(x=>x.paidCents).sort((a,b)=>a-b);
   const targetKnown=targetRow.paidOutCount+targetRow.plannedOutCount>0;
   const observedTotal=targetKnown?(targetRow.paidOutCents??0)+(targetRow.plannedOutCents??0):null;
   // A descriptive reference only, based on nonempty weeks. Never a complete
   // historical baseline, never fill absent weeks with zero or claim overspend.
   const i=Math.floor(samples.length/2),enough=samples.length>=4;
   const reference=enough?(samples.length%2?samples[i]:Math.round(samples[i-1]/2+samples[i]/2)):null;
   const difference=reference!==null&&observedTotal!==null?observedTotal-reference:null;
   const signal=!enough||!targetKnown?'insufficient-observations':observedTotal>samples[samples.length-1]?'above-recorded-range':observedTotal<samples[0]?'below-recorded-range':'within-recorded-range';
   return {category,targetPaidCents:targetRow.paidOutCents,targetPlannedCents:targetRow.plannedOutCents,recordedWeeks:samples.length,history:historical,observedComparison:{state:'partial-reference',observedTotalCents:observedTotal,medianRecordedCents:reference,minRecordedCents:enough?samples[0]:null,maxRecordedCents:enough?samples[samples.length-1]:null,differenceCents:difference,signal,recordedWeeks:samples.length,totalWeeks:weeks.length,official:false}};
  });
  if(categories.size>maxCategories)actions.push({code:'review-category-count',count:categories.size});
  return {state:'observed-incomplete',weeks:allWeeks,categories:categoryRows,categoryCount:categories.size,observedWeeks,overdue,actions,officialBaseline:null,canPublish:false};
 }
 return {inspect,reserveScenario};
});
