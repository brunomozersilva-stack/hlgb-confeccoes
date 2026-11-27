'use strict';
// Pure contract for the EXISTING note/title JSON structure, not a save transport.
// Server must derive from locked records, revalidate all permissions, revisions and
// receipt identity and reconcile actual Hub sources. No RPC or data write here.
const id=v=>typeof v==='string'||Number.isSafeInteger(v)?String(v):'';
const cent=v=>{if(typeof v!=='number'&&!(typeof v==='string'&&/^\d+(\.\d{1,2})?$/.test(v)))return null;const n=Number(v),c=Math.round(n*100);return Number.isSafeInteger(c)&&c>=0&&c<=1e12&&Math.abs(n*100-c)<.00001?c:null};
const day=v=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&Number.isFinite(Date.parse(v+'T00:00:00Z'))&&new Date(v+'T00:00:00Z').toISOString().slice(0,10)===v;
const norm=v=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase();
const fail=reason=>({state:'blocked',reason,canWrite:false,atomicConfirmed:false});
const clone=v=>JSON.parse(JSON.stringify(v));
function build(input,allowed){
 if(allowed!==true)return fail('permission');
 const p=input?.preflight,records=input?.records,at=input?.serverTimestamp,actor=id(input?.actor);
 if(p?.state!=='preflight-only'||p.canWrite!==false||p.atomicConfirmed!==false||!id(p.clientId)||typeof p.reference!=='string'||!p.reference.trim()||p.reference.length>128||typeof p.method!=='string'||!p.method.trim()||p.method.length>80||!day(p.date)||typeof at!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(at)||!Number.isFinite(Date.parse(at))||!actor||p.date>at.slice(0,10)||!Array.isArray(records)||!Array.isArray(p.allocations)||!p.allocations.length||p.allocations.length>50||records.length!==p.allocations.length*2||!Number.isSafeInteger(p.amountCents)||p.amountCents<=0)return fail('input');
 const byKey=new Map(),writes=[],allocations=[],used=new Set();let sum=0;
 for(const row of records){
  const k=row?.module+':'+id(row?.entity_id);
  if(!['projectionInvoices','finance'].includes(row?.module)||!id(row.entity_id)||id(row.data?.id)!==id(row.entity_id)||row.deleted_at!=null||!Number.isSafeInteger(row.revision)||row.revision<1||row.revision>=Number.MAX_SAFE_INTEGER||byKey.has(k))return fail('record');
  byKey.set(k,row);
 }
 for(const a of p.allocations){
  const nk='projectionInvoices:'+id(a.noteId),tk='finance:'+id(a.titleId),n=byKey.get(nk),f=byKey.get(tk);
  if(!n||!f||used.has(nk)||used.has(tk)||n.revision!==a.noteRevision||f.revision!==a.titleRevision||id(n.data.clientId)!==id(p.clientId)||id(f.data.clientId)!==id(p.clientId)||id(f.data.projectionInvoiceId)!==id(a.noteId))return fail('identity-revision');
  used.add(nk);used.add(tk);
  const nd=n.data,fd=f.data,issued=nd.issueDate||nd.date;
  if(!day(issued)||issued>p.date||!['pendente','parcial'].includes(norm(nd.status))||norm(fd.status)!==norm(nd.status)||nd.migratedToNoteQueueV9223||!Array.isArray(nd.items)||nd.items.some(i=>i?.source==='faction_delivery_v9140'))return fail('note-status');
  const total=cent(nd.value),paid=cent(nd.paid),remaining=cent(nd.remaining),history=nd.paymentHistory??[],returns=nd.acertoReturnsV9565??[];
  if([total,paid,remaining].some(x=>x===null)||total<=0||remaining<=0||!Array.isArray(history)||!Array.isArray(returns))return fail('money-history');
  const hids=new Set();let hpaid=0,credit=0;
  const eventId='global-receipt:'+p.reference+':'+id(a.noteId);
  for(const h of history){const key=id(h?.id),v=cent(h?.value);if(!key||key===eventId||hids.has(key)||h.globalPaymentReference9775===p.reference||v===null||v<=0)return fail('receipt-history');hids.add(key);hpaid+=v;}
  const rids=new Set();for(const h of returns){const key=id(h?.id),v=cent(h?.value);if(!key||rids.has(key)||v===null||v<=0)return fail('return-history');rids.add(key);if(!h.reversedAt)credit+=v;}
  if(!Number.isSafeInteger(hpaid)||!Number.isSafeInteger(credit)||paid!==hpaid||total-paid-credit!==remaining||cent(fd.value)!==total||cent(fd.paid)!==paid||cent(fd.remaining)!==remaining||cent(fd.creditReturnsV9565??0)!==credit||nd.acertoCreditTotalV9565!=null&&cent(nd.acertoCreditTotalV9565)!==credit||a.beforeCents!==remaining||!Number.isSafeInteger(a.amountCents)||a.amountCents<=0||a.amountCents>remaining||a.afterCents!==remaining-a.amountCents)return fail('balance');
  const newPaid=paid+a.amountCents,after=a.afterCents,status=after===0?'Pago':'Parcial';
  const event={id:eventId,value:a.amountCents/100,method:p.method,date:p.date,note:'Recebimento global',globalPaymentReference9775:p.reference,createdAt:at,actorId:actor};
  const note={...clone(nd),paymentHistory:[...clone(history),event],paid:newPaid/100,remaining:after/100,acertoCreditTotalV9565:credit/100,status,updatedAt:at};
  const title={...clone(fd),paid:newPaid/100,remaining:after/100,creditReturnsV9565:credit/100,status,updatedAt:at};
  writes.push({module:'projectionInvoices',entityId:id(n.entity_id),expectedRevision:n.revision,data:note},{module:'finance',entityId:id(f.entity_id),expectedRevision:f.revision,data:title});
  allocations.push({...a,eventId});sum+=a.amountCents;
 }
 if(sum!==p.amountCents||used.size!==byKey.size||!Number.isSafeInteger(sum))return fail('allocation-total');
 return {state:'payload-preview-only',writes,receipt:{reference:p.reference,clientId:id(p.clientId),date:p.date,method:p.method,amountCents:sum,allocations,actor,recordedAt:at},hubExpectedEntries:1,canWrite:false,atomicConfirmed:false,hubReconciled:false,serverRevalidationRequired:true};
}
module.exports={build};
