'use strict';
(function(root,api){if(typeof module==='object'&&module.exports)module.exports=api;else root.HLGBCashProjection9631=api;})(typeof globalThis==='object'?globalThis:this,(function cashCore(){
 const DAY=86400000;
 const dt=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&Number.isFinite(Date.parse(s+'T00:00:00Z'))&&new Date(s+'T00:00:00Z').toISOString().slice(0,10)===s?Date.parse(s+'T00:00:00Z'):null;
 const iso=n=>new Date(n).toISOString().slice(0,10);
 const key=s=>typeof s==='string'?s.trim():'';
 const validCents=n=>Number.isSafeInteger(n)&&Math.abs(n)<=Math.floor(Number.MAX_SAFE_INTEGER/100000);
 function project(input){
  const {startDate,openingBalanceCents,openingVerified,coverageVerified,entries,receiptDelayDays=14}=input||{};
  const start=dt(startDate);
  if(start===null||!Array.isArray(entries)||entries.length>100000||!Number.isInteger(receiptDelayDays)||receiptDelayDays<0||receiptDelayDays>91)throw Error('invalid-input');
  const issues=[],seen=new Map(),origins=new Map(),rows=[],overdue=[];
  if(!openingVerified||!validCents(openingBalanceCents))issues.push({reason:'opening-balance-unverified'});
  if(coverageVerified!==true)issues.push({reason:'coverage-unverified'});
  for(const e of entries){
   const id=key(e?.id),origin=key(e?.origin),due=dt(e?.dueDate);
   if(!id||!origin||due===null||!validCents(e?.amountCents)||e.amountCents<=0||!['in','out'].includes(e.direction)||!['open','settled'].includes(e.status)||e.verified!==true){issues.push({id,reason:'unverified-or-invalid-entry'});continue}
   seen.set(id,(seen.get(id)||0)+1);origins.set(origin,(origins.get(origin)||0)+1);rows.push({...e,id,origin,due});
  }
  const active=[];
  for(const e of rows){
   if(seen.get(e.id)>1||origins.get(e.origin)>1){issues.push({id:e.id,reason:'duplicate-id-or-origin'});continue}
   if(e.status==='settled')continue;
   if(e.due<start){overdue.push({id:e.id,direction:e.direction,amountCents:e.amountCents,dueDate:e.dueDate});if(e.direction==='in'){issues.push({id:e.id,reason:'overdue-receipt-needs-new-date'});continue}}
   active.push(e);
  }
  const ready=issues.length===0;
  function scenario(mode){
   const days=Array.from({length:91},(_,i)=>({date:iso(start+i*DAY),incomingCents:0,outgoingCents:0,ids:[]}));
   const outside=[];
   for(const e of active){
    const due=Math.max(e.due,start)+(e.direction==='in'&&mode==='conservative'?receiptDelayDays*DAY:0),i=(due-start)/DAY;
    if(i>=91){outside.push(e.id);continue}
    const d=days[i];d[e.direction==='in'?'incomingCents':'outgoingCents']+=e.amountCents;d.ids.push(e.id);
   }
   let balance=ready?openingBalanceCents:null;
   for(const d of days){
    // Without intraday timing, payments-first is a conservative within-day stress indicator.
    d.beforeReceiptsCents=balance===null?null:balance-d.outgoingCents;
    balance=balance===null?null:d.beforeReceiptsCents+d.incomingCents;d.closingCents=balance;
   }
   const weeks=Array.from({length:13},(_,i)=>{const w=days.slice(i*7,i*7+7),lowest=ready?Math.min(...w.map(d=>Math.min(d.beforeReceiptsCents,d.closingCents))):null;return {start:w[0].date,end:w[6].date,incomingCents:w.reduce((a,d)=>a+d.incomingCents,0),outgoingCents:w.reduce((a,d)=>a+d.outgoingCents,0),closingCents:w[6].closingCents,lowestCents:lowest,shortfall:lowest===null?null:lowest<0,ids:w.flatMap(d=>d.ids)}});
   return {mode,weeks,days,outside,firstShortfall:ready?days.find(d=>Math.min(d.beforeReceiptsCents,d.closingCents)<0)?.date||null:null};
  }
  return {quality:ready?'verified-input':'incomplete',issues,overdue,base:scenario('base'),conservative:scenario('conservative'),receiptDelayDays,mode:'simulation-only'};
 }
 return {project};
})());
