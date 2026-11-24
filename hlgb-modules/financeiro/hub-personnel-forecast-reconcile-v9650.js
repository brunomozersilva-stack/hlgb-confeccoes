'use strict';
(function(root,api){if(typeof module==='object'&&module.exports)module.exports=api;else root.HLGBHubPersonnelForecast9650=api;})(typeof globalThis==='object'?globalThis:this,(function reconcileCore(){
 const id=v=>typeof v==='string'&&/^[A-Za-z0-9_-]{1,100}$/.test(v);
 const month=v=>typeof v==='string'&&/^\d{4}-(0[1-9]|1[0-2])$/.test(v);
 const date=v=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&Number.isFinite(Date.parse(v+'T00:00:00Z'))&&new Date(v+'T00:00:00Z').toISOString().slice(0,10)===v;
 const cents=v=>Number.isSafeInteger(v)&&v>=0&&v<=100000000000;
 const live=r=>r&&!r.deletedAt&&!r.deleted_at&&r.deleted!==true&&r._deleted!==true;
 function identity(p){
  if(p?.kind==='salary'&&month(p.competence))return {type:'payroll_forecast_v1',key:p.competence};
  if(p?.kind==='worker-week'&&id(p.personId)&&date(p.friday)&&new Date(p.friday+'T00:00:00Z').getUTCDay()===5)return {type:'worker_week_forecast_v1',key:p.personId+':'+p.friday};
  if(p?.kind==='worker-month'&&id(p.personId)&&month(p.competence))return {type:'worker_month_forecast_v1',key:p.personId+':'+p.competence};
  throw Error('invalid-forecast-identity');
 }
 function inspect(ctx,p){
  const absent=reason=>({state:reason,canPublish:false,proposal:null});
  if(ctx?.authenticated!==true||ctx?.payrollAllowed!==true||ctx?.financeAllowed!==true)return absent('permission');
  if(!Array.isArray(ctx.rows)||!Array.isArray(ctx.pendingOrigins))return absent('source-unavailable');
  const {type,key}=identity(p),origin=type+'|'+key,rows=ctx.rows.filter(live);
  if(ctx.pendingOrigins.includes(origin))return absent('pending-sync-review');
  const direct=rows.filter(r=>r.sourceType===type&&String(r.sourceId)===key);
  const legacy=p.kind==='salary'?rows.filter(r=>r.sourceType==='payroll_month'&&String(r.sourceId)===key||r.sourceType==='payroll'&&(String(r.sourceId)===key||String(r.description||'').endsWith('— '+key))):[];
  // Paid-by-date rows are derived evidence, never editable forecasts. Monthly legacy rows may include amounts already paid.
  const paidViews=p.kind==='salary'?rows.filter(r=>r.sourceType==='payroll_paid_date_view'&&String(r.sourceId)===key):[];
  const possibleUnlinked=rows.filter(r=>{
   if(r.flow!=='Saída'||r.category!=='Funcionários'||[...direct,...legacy,...paidViews].includes(r))return false;
   const desc=String(r.description||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
   return p.kind==='salary'?/folha|salario/.test(desc)&&(!date(r.date)||r.date.slice(0,7)===String(p.dueDate||'').slice(0,7)): /diarista|mensalista/.test(desc)&&(!date(r.date)||r.date===p.dueDate);
  });
  if(direct.length>1||legacy.length>1)return {...absent('duplicate-review'),origin,existingCount:direct.length+legacy.length};
  if(direct.some(r=>r.status==='Realizado'))return {...absent('already-paid-review'),origin};
  if(legacy.length||possibleUnlinked.length)return {...absent('legacy-or-unlinked-review'),origin,existingCount:legacy.length+possibleUnlinked.length,paidViewCount:paidViews.length};
  if(direct.some(r=>r.status!=='Previsto'||r.flow!=='Saída'||r.category!=='Funcionários'))return {...absent('existing-conflict'),origin};
  if(!date(p.dueDate)||!cents(p.amountCents))return {...absent('incomplete-forecast'),origin};
  if(ctx.snapshotVerified!==true||ctx.coverageVerified!==true||ctx.pendingVerified!==true||p.sourceVerified!==true||p.calendarVerified!==true)return {...absent('local-preview-only'),origin,observedAmountCents:p.amountCents,existingCount:direct.length,paidViewCount:paidViews.length};
  const prev=direct[0],existingCents=prev?Math.round(Number(prev.value)*100):null;
  if(prev&&(!Number.isSafeInteger(existingCents)||existingCents<0||prev.id==null||!date(prev.date)))return {...absent('existing-conflict'),origin};
  const state=prev?(existingCents===p.amountCents&&prev.date===p.dueDate?'unchanged':'review-update'):'review-create';
  return {state,origin,existingId:prev?.id??null,observedAmountCents:p.amountCents,previousAmountCents:existingCents,proposal:{sourceType:type,sourceId:key,flow:'Saída',category:'Funcionários',status:'Previsto',date:p.dueDate,value:p.amountCents/100},canPublish:false};
 }
 return {identity,inspect};
})());
