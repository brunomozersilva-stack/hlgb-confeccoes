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
  // Copy before calling the existing adapter. No callback receives the live database.
  let effective;
  try{effective=paidDateApi.rows(JSON.parse(JSON.stringify(db.hubFinanceEntries)),JSON.parse(JSON.stringify(db.payroll)));if(!Array.isArray(effective))throw Error('invalid')}catch(_){return unavailable('payroll-view-failed')}
  const records=[],issues=[],ids=new Map(),originCounts=new Map();
  for(const e of effective){
   if(!e||deleted(e)||String(e.kind||'').startsWith('hub_settings'))continue;
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

  // Historical observation does not establish complete weeks; a missing record is null, not zero.
  const historical=recordedHistory(accepted,comparison.history,target,asOf,issues.length);
  const weeklyCash=rows=>rows.map(x=>({start:x.start,end:x.end,incomingCents:x.incomingCents,outgoingCents:x.outgoingCents,closingCents:null,shortfall:null}));
  return {state:'local-observation-only',reason:'Consulta local; saldo bancário, cobertura histórica e confirmação na nuvem não comprovados.',observations:[...groups.values()].sort((a,b)=>b.plannedCents+b.paidCents-a.plannedCents-a.paidCents),comparison:{quality:comparison.quality,history:comparison.history,categories:comparison.categories.map(x=>({category:x.category,medianCents:null,signal:'insufficient-evidence'}))},recordedHistory:historical,cash:{quality:projection.quality,base:weeklyCash(projection.base.weeks),conservative:weeklyCash(projection.conservative.weeks),receiptDelayDays,issues:projection.issues.map(x=>({reason:x.reason}))},issues:issues.map(x=>({reason:x.reason})),omitted:issues.length};
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
 return {inspect};
});
