'use strict';
(function(root,api){if(typeof module==='object'&&module.exports)module.exports=api;else root.HLGBWeeklyFinance9627=api;})(typeof globalThis==='object'?globalThis:this,(function buildCore(){
 const day=86400000;
 function date(v){if(typeof v!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(v))return null;const n=Date.parse(v+'T00:00:00Z');return Number.isFinite(n)&&new Date(n).toISOString().slice(0,10)===v?n:null}
 const iso=n=>new Date(n).toISOString().slice(0,10);
 function monday(v){const n=date(v);return n===null?null:iso(n-((new Date(n).getUTCDay()+6)%7)*day)}
 const median=a=>{const s=a.slice().sort((x,y)=>x-y),i=Math.floor(s.length/2);return s.length%2?s[i]:(s[i-1]+s[i])/2};
 function amount(v){if(typeof v!=='number'&&!(typeof v==='string'&&/^\d+(\.\d{1,2})?$/.test(v)))return null;const n=Number(v),c=Math.round(n*100);return Number.isSafeInteger(c)&&c>=0&&c<=Math.floor(Number.MAX_SAFE_INTEGER/100000)&&Math.abs(n*100-c)<0.00001?c:null}
 const id=v=>typeof v==='string'||typeof v==='number'?String(v).trim():'';
 function compare(rows,options={}){
  const {targetDate,asOf,historyWeeks=8,verifiedWeeks=[],targetVerified=false,uncertainIds=[],snapshotVerified=false}=options;
  const target=monday(targetDate),current=monday(asOf);
  if(!target||!current||![8,12,26].includes(historyWeeks)||target<current||!Array.isArray(rows)||!Array.isArray(verifiedWeeks)||!Array.isArray(uncertainIds)||rows.length>100000)throw new Error('invalid-input');
  const history=Array.from({length:historyWeeks},(_,i)=>iso(date(current)-(historyWeeks-i)*7*day));
  const covered=new Set(verifiedWeeks.filter(w=>monday(w)===w&&w<current));
  const scope=new Set([...history,target]), issues=[], normalized=[], ids=new Map(), origins=new Map(), uncertain=new Set(uncertainIds.map(id)), cats=new Set();
  const mark=(row,reason,week)=>issues.push({id:id(row?.id)||null,reason,week:week||null});
  for(const row of rows){
   if(!row||typeof row!=='object'){mark(row,'invalid-row');continue}
   if(String(row.kind||'').startsWith('hub_settings'))continue;
   if(row.deleted===true||row.deleted_at||row.deletedAt||row._deleted===true)continue;
   if(row.flow==='Entrada')continue;
   const actual=row.status==='Realizado', planned=row.status==='Previsto', rawDate=actual?(typeof row.realizedAt==='string'?row.realizedAt.slice(0,10):null):row.date;
   // An effective payroll view already provides its own realizedAt date.
   const w=monday(rawDate),key=id(row.id),cat=typeof row.category==='string'?row.category.trim():'',cents=amount(row.value);
   if(w&&!scope.has(w))continue;
   if(row.flow!=='Saída'||(!actual&&!planned)||!w||!key||!cat||cents===null||uncertain.has(key)||row.pendingSync===true||row.walPending===true||row.unverified===true){mark(row,'incomplete-or-unverified',w);continue}
   if(actual&&rawDate>asOf){mark(row,'future-realized-date',w);continue}
   if(planned&&w!==target){mark(row,'historical-unpaid',w);continue}
   const originType=id(row.sourceType),originId=id(row.sourceId);
   if(Boolean(originType)!==Boolean(originId)){mark(row,'incomplete-origin',w);continue}
   const origin=originType?JSON.stringify([originType,originId,originType==='payroll_paid_date_view'?rawDate:'']):null;
   const x={key,origin,w,cat,cents,actual};normalized.push(x);
   ids.set(key,(ids.get(key)||0)+1);if(origin)origins.set(origin,(origins.get(origin)||0)+1);
  }
  const totals=new Map();
  for(const x of normalized){
   if(ids.get(x.key)>1||(x.origin&&origins.get(x.origin)>1)){mark({id:x.key},'duplicate-id-or-origin',x.w);continue}
   cats.add(x.cat);
   const k=JSON.stringify([x.w,x.cat]),t=totals.get(k)||{paid:0,planned:0,ids:[]};
   if(x.actual)t.paid+=x.cents;else t.planned+=x.cents;t.ids.push(x.key);totals.set(k,t);
  }
  const invalidWeeks=new Set(issues.map(x=>x.week)),globalGap=invalidWeeks.has(null);
  const comparable=history.filter(w=>covered.has(w)&&!invalidWeeks.has(w)&&!globalGap);
  const targetComplete=snapshotVerified===true&&targetVerified===true&&!invalidWeeks.has(target)&&!globalGap;
  const full=snapshotVerified===true&&targetComplete&&comparable.length===historyWeeks;
  const empty={paid:0,planned:0,ids:[]};
  const get=(w,c)=>totals.get(JSON.stringify([w,c]))||empty;
  const categories=[...cats].sort().map(category=>{
   const historical=comparable.map(w=>({week:w,paidCents:get(w,category).paid,ids:get(w,category).ids.slice()}));
   const t=get(target,category),total=t.paid+t.planned,values=historical.map(x=>x.paidCents);
   const medianCents=full?median(values):null,meanCents=full?values.reduce((a,b)=>a+b,0)/values.length:null;
   const differenceCents=full?total-medianCents:null;
   return {category,targetPaidCents:t.paid,targetPlannedCents:t.planned,targetTotalCents:total,targetIds:t.ids.slice(),historical,medianCents,meanCents,minCents:full?Math.min(...values):null,maxCents:full?Math.max(...values):null,differenceCents,percentChange:full&&medianCents>0?100*differenceCents/medianCents:null,signal:!full?'insufficient-evidence':medianCents===0?(total>0?'new-or-irregular-expense':'no-expense'):total>Math.max(...values)?'above-observed-range':total<Math.min(...values)?'below-observed-range':'within-observed-range'};
  });
  return {target,history,comparableWeeks:comparable,quality:full?'verified-input':'incomplete',issues,categories,limitations:['Not a cash balance or profit measure','No historical forecast snapshot','Verified weeks and snapshot must be proven by caller','No automatic payment or mutation']};
 }
 return {compare,monday};
})());
