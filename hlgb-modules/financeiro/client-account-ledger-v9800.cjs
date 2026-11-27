'use strict';
// Isolated contract, never an authority to save. All values are integer cents.
// An independent balance must not duplicate notes; receipts allocate to notes once.
const id=v=>typeof v==='string'&&v.trim()===v&&v.length>0&&v.length<=128?v:'';
const cents=v=>Number.isSafeInteger(v)&&Math.abs(v)<=1000000000000;
const day=v=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&Number.isFinite(Date.parse(v+'T00:00:00Z'))&&new Date(v+'T00:00:00Z').toISOString().slice(0,10)===v;
const reason=v=>typeof v==='string'&&v.trim().length>0&&v.length<=500;
const fail=reason=>({state:'blocked',reason,canWrite:false,atomicConfirmed:false});
const stable=v=>Array.isArray(v)?v.map(stable):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,stable(v[k])])):v;
const same=(a,b)=>JSON.stringify(stable(a))===JSON.stringify(stable(b));
function inspect(account,allowed){
 if(allowed!==true)return fail('permission');
 if(!id(account?.clientId)||!Number.isSafeInteger(account.revision)||account.revision<0||!Array.isArray(account.events)||account.events.length>10000||account.events.length!==account.revision)return fail('account-identity');
 let independent=0,opened=false,receiptTotal=0;const refs=new Map();
 for(const e of account.events){
  if(e?.clientId!==account.clientId||!id(e.reference)||refs.has(e.reference)||!cents(e.deltaCents)||!reason(e.reason))return fail('event-identity');
  if(e.kind==='opening'){
   if(opened||refs.size!==0||e.date!==null||e.independentConfirmed!==true)return fail('opening-proof');
   opened=true;
  }else if(e.kind==='adjustment'){
   if(!opened||e.date!==null||!e.deltaCents||e.independentConfirmed!==true)return fail('adjustment-proof');
  }else if(e.kind==='receipt'){
   if(!opened||!day(e.date)||!id(e.method)||!cents(e.amountCents)||e.amountCents<=0||!Array.isArray(e.allocations)||e.allocations.length>50)return fail('receipt-proof');
   const keys=new Set(),titles=new Set();let allocated=0;
   for(const a of e.allocations){
    if(!id(a.noteId)||!id(a.titleId)||keys.has(a.noteId)||titles.has(a.titleId)||!Number.isSafeInteger(a.noteRevision)||a.noteRevision<1||!Number.isSafeInteger(a.titleRevision)||a.titleRevision<1||!cents(a.amountCents)||a.amountCents<=0||!cents(a.beforeCents)||!cents(a.afterCents)||a.beforeCents-a.amountCents!==a.afterCents||a.afterCents<0)return fail('allocation-proof');
    keys.add(a.noteId);titles.add(a.titleId);allocated+=a.amountCents;
   }
   if(!cents(allocated)||allocated>e.amountCents||e.deltaCents!==-(e.amountCents-allocated))return fail('receipt-balance');
   receiptTotal+=e.amountCents;
  }else if(e.kind==='reversal'){
   const orig=refs.get(e.reverses);
   if(!opened||!day(e.date)||orig?.kind!=='receipt'||e.date<orig.date||[...refs.values()].some(x=>x.kind==='reversal'&&x.reverses===e.reverses)||e.deltaCents!==-orig.deltaCents||e.amountCents!==orig.amountCents||!same(e.allocations,orig.allocations))return fail('reversal-proof');
   receiptTotal-=e.amountCents;
  }else return fail('event-type');
  independent+=e.deltaCents;if(!cents(independent)||!cents(receiptTotal)||receiptTotal<0)return fail('amount-limit');
  refs.set(e.reference,e);
 }
 return {state:'local-ledger-inspection',clientId:account.clientId,revision:account.revision,opened,independentCents:independent,netReceiptsCents:receiptTotal,canWrite:false,atomicConfirmed:false};
}
function propose(account,input,allowed){
 const prior=inspect(account,allowed);if(prior.state!=='local-ledger-inspection')return prior;
 if(input?.clientId!==account.clientId||!id(input.reference)||!reason(input.reason))return fail('input-identity');
 const existing=account.events.find(e=>e.reference===input.reference);
 let event={clientId:input.clientId,reference:input.reference,kind:input.kind,reason:input.reason};
 if(input.kind==='opening'||input.kind==='adjustment'){
  if(!cents(input.amountCents)||input.independentConfirmed!==true||input.date!=null)return fail('independent-proof');
  event={...event,deltaCents:input.amountCents,date:null,independentConfirmed:true};
 }else if(input.kind==='receipt'){
  if(!day(input.date)||!id(input.method)||!cents(input.amountCents)||input.amountCents<=0||!Array.isArray(input.allocations)||input.allocations.length>50)return fail('receipt-input');
  // Allocations are reviewed candidates only; server must recompute from locked note/title rows.
  const allocations=input.allocations.map(a=>({noteId:a?.noteId,titleId:a?.titleId,noteRevision:a?.noteRevision,titleRevision:a?.titleRevision,amountCents:a?.amountCents,beforeCents:a?.beforeCents,afterCents:a?.afterCents}));
  const total=allocations.reduce((n,a)=>n+a.amountCents,0);
  if(!cents(total)||total>input.amountCents)return fail('allocation-total');
  if(input.remainderReviewed!==true&&total!==input.amountCents)return fail('remainder-not-reviewed');
  event={...event,date:input.date,method:input.method,amountCents:input.amountCents,allocations,deltaCents:-(input.amountCents-total)};
 }else if(input.kind==='reversal'){
  const original=account.events.find(e=>e.reference===input.reverses&&e.kind==='receipt');
  if(!original||!day(input.date))return fail('reversal-input');
  event={...event,date:input.date,reverses:input.reverses,amountCents:original.amountCents,allocations:original.allocations.map(a=>({...a})),deltaCents:-original.deltaCents};
 }else return fail('input-kind');
 if(existing)return same(existing,event)?{state:'existing-reference-candidate',event:JSON.parse(JSON.stringify(existing)),canWrite:false,atomicConfirmed:false}:fail('reference-conflict');
 if(input.expectedRevision!==account.revision)return fail('revision-changed');
 const next={clientId:account.clientId,revision:account.revision+1,events:[...account.events,event]},verified=inspect(next,true);
 if(verified.state!=='local-ledger-inspection')return verified;
 return {state:'proposal-only',event,expectedRevision:account.revision,independentBeforeCents:prior.independentCents,independentAfterCents:verified.independentCents,hubMovementCents:input.kind==='receipt'?event.amountCents:input.kind==='reversal'?-event.amountCents:0,requiredNoteUpdates:event.allocations?.length||0,canWrite:false,atomicConfirmed:false,serverRevalidationRequired:true};
}
module.exports={inspect,propose};
