/* HLGB v95.102 — Acertos pendentes consolidados por pessoa, leitura segura.
 * Jamais regrava pagamento, baixa, nota, financeiro, WAL ou cadastro.
 * Um agrupamento visual NÃO equivale a uma liquidação bancária.
 */
(function(root,factory){
 'use strict';
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.hlgbFactionAcertoUnified95102=api;
})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 const VERSION='95.102';
 const sid=x=>String(x??'').trim();
 const norm=x=>sid(x).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-BR').replace(/\s+/g,' ');
 const esc=x=>sid(x).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const money=c=>(Math.round(c)/100).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
 const num=x=>Number.isFinite(Number(x))?Number(x):0;
 const cents=x=>Math.round(num(x)*100);
 const active=status=>norm(status)==='pendente';
 const canceled=p=>p?.manualCanceledV9590===true||p?.deleted===true||!!(p?.deleted_at||p?.deletedAt)||['cancelado','cancelada','excluido','excluida'].includes(norm(p?.status));
 const validId=id=>sid(id).length>0;
 const exactMoney=v=>{if(typeof v!=='number'&&!(typeof v==='string'&&/^\d+(?:\.\d{1,2})?$/.test(v)))return null;const n=Number(v),c=Math.round(n*100);return Number.isSafeInteger(c)&&c>=0&&Math.abs(n*100-c)<.00001?c:null};
 const validDay=v=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&Number.isFinite(Date.parse(v+'T00:00:00Z'))&&new Date(v+'T00:00:00Z').toISOString().slice(0,10)===v;
 const iso=n=>new Date(n).toISOString().slice(0,10);
 function weekOf(v){if(!validDay(v))return null;const n=Date.parse(v+'T00:00:00Z'),m=n-((new Date(n).getUTCDay()+6)%7)*86400000;return {start:iso(m),end:iso(m+6*86400000)}}
 const dateBr=v=>validDay(v)?v.split('-').reverse().join('/'):'Não informada';
 const qtyText=v=>v===null?'—':v.toLocaleString('pt-BR');
 const cash=v=>v===null?'—':money(v);
 function originDetail(r,context){
  const unique=(rows,id)=>{if(!sid(id))return null;const matches=(Array.isArray(rows)?rows:[]).filter(x=>x&&!canceled(x)&&sid(x.id)===sid(id));return matches.length===1?matches[0]:null};
  const f=unique(context?.factions,r.factionServiceId),p=unique(context?.production,f?.productionId);
  const candidates=[r.orderId,f?.orderId,p?.orderId].map(sid).filter(Boolean),ids=[...new Set(candidates)],order=ids.length===1?unique(context?.orders,ids[0]):null;
  const note=unique(context?.projectionInvoices,r.projectionInvoiceId);
  const noteOrderIds=[note?.orderId,...(Array.isArray(note?.items)?note.items.map(x=>x?.orderId):[])].map(sid).filter(Boolean);
  const explicit=sid(r.externalNoteNumber||r.noteNumber),linked=note&&ids.length<=1&&(!ids.length||!noteOrderIds.length||noteOrderIds.includes(ids[0]))?sid(note.externalNoteNumber||note.noteNumber):'';
  const noteNumber=explicit&&linked&&explicit!==linked?'':explicit||linked;
  const orderNumber=sid(r.orderNumber)||sid(order?.orderNumber||order?.number);
  return {noteNumber,orderNumber:ids.length>1?'':orderNumber,originReview:ids.length>1||!!(explicit&&linked&&explicit!==linked)};
 }
 // Only the actual registered delivery proves a production week. Never use send,
 // finish, note issue or scheduled payment dates as substitutes.
 function deliveryEvidence(r,context){
  if(r.manual===true||!sid(r.factionServiceId)||!sid(r.deliveryId)||r.serviceModeV9577&&r.serviceModeV9577!=='faccao')return null;
  const fs=(Array.isArray(context?.factions)?context.factions:[]).filter(f=>f&&!canceled(f)&&sid(f.id)===sid(r.factionServiceId));
  if(fs.length!==1)return null;
  const f=fs[0],history=Array.isArray(f.deliveryHistory)?f.deliveryHistory:[],matches=history.filter(h=>h&&sid(h.id)===sid(r.deliveryId)&&!canceled(h));
  if(matches.length!==1)return null;
  const h=matches[0],day=sid(h.date).slice(0,10),qty=Number(h.qty);
  if(!validDay(day)||!Number.isSafeInteger(qty)||qty<=0||qty!==Number(r.quantity))return null;
  const siblings=(Array.isArray(context?.payments)?context.payments:[]).filter(p=>p&&!canceled(p)&&p.manual!==true&&sid(p.factionServiceId)===sid(r.factionServiceId)&&sid(p.deliveryId)===sid(r.deliveryId));
  if(siblings.length!==1||sid(siblings[0].id)!==sid(r.id))return null;
  return {date:day,projectionInvoiceId:h.projectionInvoiceId||h.noteInvoiceId||null};
 }
 // Read only: local metadata is not proof of a confirmed server event.
 // Separate remuneration from physical quantity without changing the latter.
 function adjustmentDetail(r,proof){
  if(!Object.prototype.hasOwnProperty.call(r,'settlementAdjustmentV9879'))return {state:'original',payableQuantity:Number(r.quantity)};
  const a=r.settlementAdjustmentV9879,physical=Number(r.quantity),rate=exactMoney(r.unitPrice),total=exactMoney(r.value),validInt=x=>Number.isSafeInteger(x)&&x>0;
  if(r.manual===true||!a||!proof||!sid(a.reference)||!sid(a.actor)||sid(a.reason).length<6||sid(a.reason).length>500||a.deliveryDate!==proof.date||a.deliveredQuantity!==physical||!validInt(physical)||!validInt(a.payableQuantity)||a.payableQuantity>physical||!validInt(a.previousPayableQuantity)||a.previousPayableQuantity>physical||!validInt(a.previousUnitCents)||!validInt(a.previousCents)||a.previousPayableQuantity*a.previousUnitCents!==a.previousCents||!validInt(rate)||!validInt(total)||a.unitCents!==rate||a.totalCents!==total||a.payableQuantity*rate!==total)return {state:'review',payableQuantity:null};
  return {state:'local-adjustment',payableQuantity:a.payableQuantity,previousCents:a.previousCents,reason:sid(a.reason)};
 }
 function lineDetail(r,manual,context){
  const quantity=r.quantity==null||r.quantity===''?null:Number(r.quantity),points=r.manualKindV9566==='travetada'?Number(r.travetaPointsPerPieceV9592):null;
  const q=Number.isSafeInteger(quantity)&&quantity>=0?quantity:null,point=Number.isSafeInteger(points)&&points>0?points:null;
  const traveta=r.manualKindV9566==='travetada',displayQty=traveta?(q!==null&&point!==null&&Number.isSafeInteger(q*point)?q*point:null):q;
  const service=r.serviceModeV9577==='travetada'||traveta?'Travetada':r.serviceModeV9577==='embalagem'||r.manualKindV9566==='embalagem'?'Embalagem':manual&&r.manualKindV9566==='service'?'Outro serviço':'Facção / costura';
  const proof=deliveryEvidence(r,context),adjustment=adjustmentDetail(r,proof);return {...originDetail(proof?.projectionInvoiceId&&!r.projectionInvoiceId?{...r,projectionInvoiceId:proof.projectionInvoiceId}:r,context),deliveryDate:proof?.date||null,id:sid(r.id),label:sid(r.description||r.manualProductNameV9589||r.productName||'Modelo / serviço não informado'),service,quantity:q,displayQty:adjustment.state==='local-adjustment'?adjustment.payableQuantity:displayQty,adjustment,points:point,unit:traveta?'travetadas':'peças',unitPriceCents:exactMoney(r.unitPrice),amountCents:exactMoney(r.value),travetaDiscountCents:manual?exactMoney(r.travetaDiscountTotalV9577??0):null,note:manual?sid(r.manualLineNoteV9566):'',referenceDate:validDay(r.scheduledPaymentDate)?r.scheduledPaymentDate:null,serviceDate:validDay(sid(r.serviceFinishedAt).slice(0,10))?sid(r.serviceFinishedAt).slice(0,10):null};
 }
 function weekSummary(entry){
  if(entry.kind==='avulso'&&!entry.manualDeliveryConfirmed)return {key:null,label:'Avulso original — separado das entregas',basis:null};
  const lines=entry.details||[],weeks=lines.map(x=>weekOf(x.deliveryDate));
  if(!lines.length||weeks.some(x=>!x))return {key:null,label:'Entrega não comprovada — conferência individual',basis:null};
  if(new Set(weeks.map(x=>x.start)).size!==1)return {key:null,label:'Datas de entrega divergentes — conferir',basis:null};
  return {key:'delivery:'+weeks[0].start,label:'Semana das entregas registradas: '+dateBr(weeks[0].start)+' a '+dateBr(weeks[0].end),basis:'delivery'};
 }
 function groupWeeks(g){
  const list=new Map();for(const e of g.entries){const w=weekSummary(e),k=w.key||JSON.stringify(['individual',e.kind,e.groupId||e.paymentId]);const old=list.get(k)||{...w,scopeKey:k,entries:[],totalCents:0};old.entries.push(e);old.totalCents+=e.amountCents;list.set(k,old)}
  return [...list.values()].sort((a,b)=>(a.key||'zz').localeCompare(b.key||'zz')||a.scopeKey.localeCompare(b.scopeKey));
 }
 function consolidate(data){
  const payments=Array.isArray(data?.payments)?data.payments:[],
   masters=Array.isArray(data?.masters)?data.masters:[],
   manualGroups=Array.isArray(data?.manualGroups)?data.manualGroups:[],
   possible=new Map(),seenEntries=new Set(),errors=[];
  const countIds=rows=>{const m=new Map();for(const x of rows){const k=sid(x?.id);if(k)m.set(k,(m.get(k)||0)+1)}return m};
  const paymentCounts=countIds(payments.filter(x=>x&&!canceled(x))),groupCounts=countIds(manualGroups);
  const deliveryCounts=new Map(),deliveryKey=r=>sid(r.factionServiceId)&&sid(r.deliveryId)?JSON.stringify([sid(r.factionServiceId),sid(r.deliveryId)]):null;
  for(const r of payments){if(!r||r.manual===true||canceled(r))continue;const k=deliveryKey(r);if(k)deliveryCounts.set(k,(deliveryCounts.get(k)||0)+1)}
  const perName=new Map();
  for(const m of masters.filter(x=>x?.active!==false&&sid(x.name)&&validId(x.id))){
   const n=norm(m.name),set=perName.get(n)||new Set();set.add(sid(m.id));perName.set(n,set);
  }
  // Nomes homônimos não podem receber o mesmo acerto por coincidência visual.
  for(const p of payments.filter(x=>x&&sid(x.factionMasterId)&&sid(x.factionName))){
   const n=norm(p.factionName),ids=perName.get(n)||new Set();
   ids.add(sid(p.factionMasterId));perName.set(n,ids);
  }
  for(const g of manualGroups){
   for(const p of Array.isArray(g?.rows)?g.rows:[]){
    if(!sid(p?.factionMasterId)||!sid(p?.factionName))continue;
    const n=norm(p.factionName),ids=perName.get(n)||new Set();
    ids.add(sid(p.factionMasterId));perName.set(n,ids);
   }
  }
  function owner(name,masterId){
   const label=sid(name),n=norm(label),known=perName.get(n)||new Set();
   const id=sid(masterId);
   const ambiguous=known.size>1||id&&known.size&&(!known.has(id));
   const key=ambiguous?(id?'master:'+id:'ambiguous:'+n):
    known.size===1?'master:'+([...known][0]):'person:'+n;
   return {key,name:label,ambiguous:!!ambiguous,
    masterId:id||(!ambiguous&&known.size===1?[...known][0]:null)};
  }
  function append(p,entry){
   if(!p?.name||!Number.isSafeInteger(entry.amountCents)||entry.amountCents<=0)
    return;
   const old=possible.get(p.key)||{key:p.key,factionName:p.name,masterId:p.masterId,
    identityAmbiguous:p.ambiguous,totalCents:0,manualCents:0,regularCents:0,
    entries:[],groupIds:[],paymentIds:[],dates:[]};
   old.identityAmbiguous=old.identityAmbiguous||p.ambiguous;
   if(!old.masterId&&p.masterId)old.masterId=p.masterId;
   old.totalCents+=entry.amountCents;
   if(entry.kind==='avulso')old.manualCents+=entry.amountCents;else old.regularCents+=entry.amountCents;
   old.entries.push(entry);
   if(entry.groupId)old.groupIds.push(entry.groupId);
   if(entry.paymentId)old.paymentIds.push(entry.paymentId);
   if(entry.date&&!old.dates.includes(entry.date))old.dates.push(entry.date);
   possible.set(p.key,old);
  }
  // Cada grupo avulso conta uma vez, incluindo seus ajustes e abatimentos já
  // calculados pelo módulo original; nunca somamos suas linhas individualmente.
  const seenManual=new Set(),manualRowIds=new Set();
  for(const g of manualGroups){
   const gid=sid(g?.id),items=Array.isArray(g?.rows)?g.rows:[],
    unique=items.filter(x=>validId(x?.id)&&x?.manual===true);
   for(const row of unique)manualRowIds.add(sid(row.id));
   if(!gid||groupCounts.get(gid)!==1||seenManual.has(gid)){errors.push('grupo-avulso-duplicado-ou-sem-id');continue}
   seenManual.add(gid);
   if(!active(g.status)){
    if(norm(g.status)==='revisar')errors.push('grupo-avulso-requer-revisao:'+gid);
    continue;
   }
   const live=unique.filter(x=>!canceled(x)),liveIds=new Set(live.map(x=>sid(x.id))),source=payments.filter(p=>p?.manual===true&&!canceled(p)&&sid(p.manualGroupId)===gid);
   const ownerKey=x=>JSON.stringify([sid(x.factionMasterId),norm(x.factionName)]);
   if(!live.length||unique.length!==items.length||unique.some(x=>sid(x.manualGroupId)!==gid)||liveIds.size!==live.length||live.some(x=>paymentCounts.get(sid(x.id))!==1)||source.length!==live.length||source.some(x=>!liveIds.has(sid(x.id)))||new Set(live.map(ownerKey)).size!==1||source.some(x=>!live.some(y=>sid(y.id)===sid(x.id)&&ownerKey(y)===ownerKey(x)&&norm(y.status)===norm(x.status)&&cents(y.value)===cents(x.value)&&cents(y.paidAmount)===cents(x.paidAmount)))){
    errors.push('grupo-avulso-sem-evidencia:'+gid);continue;
   }
   if(unique.some(x=>!canceled(x)&&norm(x.status)!=='pendente')){
    errors.push('grupo-avulso-misto:'+gid);continue;
   }
   const amountCents=cents(g.total);
   if(amountCents<=0){errors.push('valor-avulso-invalido:'+gid);continue}
   const first=unique.find(x=>!canceled(x))||unique[0];
   const factionName=sid(first.factionName||g.factionName);
   const actor=owner(factionName,first.factionMasterId);
   const manualDeliveryConfirmed=!!actor.masterId&&!actor.ambiguous&&source.every(x=>sid(x.manualDeliveryOwnerV9875)===sid(actor.masterId)&&sid(x.factionMasterId)===sid(actor.masterId)&&validDay(x.manualDeliveryDateV9875)&&x.serviceModeV9577!=='embalagem'&&x.serviceModeV9577!=='travetada'&&x.manualDeliveryDateV9875===source[0].manualDeliveryDateV9875);
   const details=source.map(x=>({...lineDetail(x,true,data),deliveryDate:manualDeliveryConfirmed?x.manualDeliveryDateV9875:null})),nominal=details.every(x=>x.amountCents!==null)?details.reduce((n,x)=>n+x.amountCents,0):null;
   const signed=(items,minus,plus)=>Array.isArray(items)?items.map(x=>{const v=exactMoney(x?.amount);return v===null||![minus,plus].includes(x.kind)?null:{label:x.kind===minus?'Abatimento / crédito':'Acréscimo / complemento',amountCents:x.kind===minus?-v:v,note:sid(x.reason)}}):[];
   const adjustments=[...signed(g.directAdjustments,'abater','acrescentar'),...signed(g.applications,'a_mais','a_menos')];
   const detailVerified=nominal!==null&&adjustments.every(Boolean)&&nominal+adjustments.reduce((n,x)=>n+x.amountCents,0)===amountCents;
   append(actor,{kind:'avulso',groupId:gid,amountCents,details,manualDeliveryConfirmed,nominalCents:nominal,adjustments:detailVerified?adjustments:[],detailVerified,
    date:g.dateEvidence==='review'?'':sid(g.date||first.scheduledPaymentDate),
    label:'Pagamento avulso · '+unique.filter(x=>!canceled(x)).length+' item(ns)',
    lineIds:unique.map(x=>sid(x.id))});
  }
  // Normal and partial settlements retain their original identities. Discount
  // reduces the obligation but is never counted as money already transferred.
  const exact=v=>{if(typeof v!=='number'&&!(typeof v==='string'&&/^\d+(?:\.\d{1,2})?$/.test(v)))return null;const n=Number(v),c=Math.round(n*100);return Number.isSafeInteger(c)&&c>=0&&Math.abs(n*100-c)<.00001?c:null};
  for(const row of payments){
   if(!row||row.manual===true||canceled(row)||!['pendente','parcial'].includes(norm(row.status)))continue;
   const id=sid(row.id);
   if(!id||paymentCounts.get(id)!==1||seenEntries.has(id)||manualRowIds.has(id)){
    errors.push('pagamento-duplicado-ou-sem-id:'+id);continue;
   }
   seenEntries.add(id);
   const delivery=deliveryKey(row);if(delivery&&deliveryCounts.get(delivery)!==1){errors.push('entrega-com-pagamento-duplicado:'+id);continue}
   const total=exact(row.value),paid=exact(row.paidAmount??0),discount=exact(row.discountAmount??0);
   if([total,paid,discount].some(v=>v===null)||!Number.isSafeInteger(paid+discount)||total<=0||paid+discount>=total){
    errors.push('valor-normal-invalido:'+id);continue;
   }
   const partial=norm(row.status)==='parcial';
   if(!partial&&paid!==0||partial&&paid+discount===0){errors.push('pagamento-parcial-requer-conferencia:'+id);continue}
   const history=row.paymentHistory??[];let historyPaid=0,historyDiscount=0,valid=Array.isArray(history);const eventIds=new Set();
   if(valid)for(const h of history){const eventId=sid(h?.id),p=exact(h?.paid??0),d=exact(h?.discount??0);if(!eventId||eventIds.has(eventId)||p===null||d===null||p+d<=0){valid=false;break}eventIds.add(eventId);historyPaid+=p;historyDiscount+=d}
   if(!valid||!Number.isSafeInteger(historyPaid)||!Number.isSafeInteger(historyDiscount)||history.length&&(historyPaid!==paid||historyDiscount!==discount)||partial&&!history.length){errors.push('pagamento-parcial-requer-conferencia:'+id);continue}
   const adjustment=adjustmentDetail(row,deliveryEvidence(row,data));if(adjustment.state==='review'){errors.push('ajuste-de-remuneracao-sem-evidencia:'+id);continue}
   const balance=total-paid-discount;
   const actor=owner(row.factionName,row.factionMasterId);
   if(!actor.name){errors.push('pagamento-sem-pessoa:'+id);continue}
   append(actor,{kind:'normal',paymentId:id,amountCents:balance,totalCents:total,paidCents:paid,discountCents:discount,partial,
    date:sid(row.scheduledPaymentDate||row.serviceFinishedAt||row.paymentDate),
    label:sid(row.description||row.productName||'Pagamento de facção'),details:[lineDetail(row,false,data)],lineIds:[id]});
  }
  return {version:VERSION,scope:'apenas_visual_sem_baixa',productionPayment:false,
   groups:[...possible.values()].map(g=>({...g,sourceCount:g.entries.length,
    uniqueDates:g.dates.sort()})).sort((a,b)=>a.factionName.localeCompare(b.factionName,'pt-BR')),
   warnings:errors,rowsScanned:payments.length,manualGroupsScanned:manualGroups.length};
 }
 function dbRef(){
  try{return typeof db!=='undefined'&&db?db:window.db||{}}catch(e){return (typeof window!=='undefined'&&window.db)||{}}
 }
 function currentData(){
  const d=dbRef(),api=typeof window!=='undefined'?window.hlgbFactionManual9566:null;
  return {payments:Array.isArray(d.factionPayments)?d.factionPayments:[],
   masters:Array.isArray(d.factionMasters)?d.factionMasters:[],
   factions:d.factions,production:d.production,orders:d.orders,projectionInvoices:d.projectionInvoices,
   manualGroups:typeof api?.receiptGroups==='function'?api.receiptGroups():[]};
 }
 function printablePending(data,key,allowed,scopeKey=null){
  if(allowed!==true||data?.scope!=='apenas_visual_sem_baixa'||!Array.isArray(data.groups)||!Array.isArray(data.warnings))throw Error('Consulta indisponível');
  const matches=data.groups.filter(g=>g.key===key),g=matches[0];
  if(matches.length!==1||!g.masterId||g.identityAmbiguous||!Array.isArray(g.entries)||!g.entries.length||g.entries.length>500||g.sourceCount!==g.entries.length)throw Error('Identidade ou quantidade de registros a conferir');
  const valid=n=>Number.isSafeInteger(n)&&n>=0,ids=new Set();let total=0,normal=0,manual=0;
  for(const e of g.entries){const id=e.kind==='normal'?'n:'+sid(e.paymentId):'a:'+sid(e.groupId);if(!['normal','avulso'].includes(e.kind)||id.length<=2||ids.has(id)||!valid(e.amountCents)||e.amountCents===0)throw Error('Linha inválida');ids.add(id);
   if(e.kind==='normal'){if(![e.totalCents,e.paidCents,e.discountCents].every(valid)||e.totalCents-e.paidCents-e.discountCents!==e.amountCents)throw Error('Saldo divergente');normal+=e.amountCents}else manual+=e.amountCents;total+=e.amountCents;
  }
  if(![total,normal,manual].every(valid)||total!==g.totalCents||normal!==g.regularCents||manual!==g.manualCents)throw Error('Totais divergentes');
  const partitions=groupWeeks(g),sections=scopeKey===null?partitions:partitions.filter(w=>w.scopeKey===scopeKey);if(!sections.length)throw Error('Semana ou lançamento indisponível');
  const selected=sections.flatMap(w=>w.entries),combined=sections.length>1;
  normal=selected.filter(e=>e.kind==='normal').reduce((n,e)=>n+e.amountCents,0);manual=selected.filter(e=>e.kind==='avulso').reduce((n,e)=>n+e.amountCents,0);total=normal+manual;
  const weekNote=combined?'Consulta geral de saldos separados — não é um acerto único.':sections[0].key?'Somente entregas registradas na mesma semana.':sections[0].label;
  const renderWeek=w=>{
   const rows=[],adjustments=[],fallback=[];
   let serviceTotal=0,complete=true;
   for(const [i,e] of w.entries.entries()){
    const tag=(e.kind==='avulso'?'Avulso':'Normal')+' '+(i+1),ds=Array.isArray(e.details)?e.details:[],good=ds.length&&ds.every(d=>d&&sid(d.label)&&valid(d.amountCents));
    if(good){
     for(const d of ds){rows.push('<tr><td><b>'+esc(d.label)+'</b><div class="muted">'+esc(d.service)+' · '+tag+(d.noteNumber?' · Nota '+esc(d.noteNumber):'')+(d.orderNumber?' · Pedido '+esc(d.orderNumber):'')+(d.originReview?' · Origem a conferir':'')+(d.points?' · '+qtyText(d.quantity)+' peças × '+d.points+' travetadas/peça':'')+(d.deliveryDate?' · '+(e.kind==='avulso'?'Entrega avulsa informada ':'Entrega registrada ')+dateBr(d.deliveryDate):d.serviceDate?' · Serviço informado '+dateBr(d.serviceDate):'')+(d.referenceDate?' · Referência '+dateBr(d.referenceDate):'')+(d.adjustment?.state==='local-adjustment'?' · Entregues: '+qtyText(d.quantity)+' · Remuneradas: '+qtyText(d.adjustment.payableQuantity):'')+'</div>'+(d.adjustment?.state==='local-adjustment'?'<div class="muted">Ajuste informado: '+esc(d.adjustment.reason)+' · Valor anterior '+money(d.adjustment.previousCents)+'</div>':'')+(d.note?'<div class="muted">'+esc(d.note)+'</div>':'')+'</td><td>'+qtyText(d.displayQty)+(d.displayQty!==null?'<div class="muted">'+esc(d.unit)+'</div>':'')+'</td><td>'+cash(d.unitPriceCents)+'</td><td>'+cash(d.amountCents)+(d.travetaDiscountCents>0?'<div class="muted">Travetada descontada: '+money(d.travetaDiscountCents)+'</div>':'')+'</td></tr>');serviceTotal+=d.amountCents}
    }else {complete=false;rows.push('<tr><td colspan="4">'+tag+' · Detalhamento indisponível. Confira o lançamento original.</td></tr>')}
    if(e.kind==='normal'){
     if(e.paidCents>0)adjustments.push([tag+' · Pago registrado',-e.paidCents]);
     if(e.discountCents>0)adjustments.push([tag+' · Abatimento',-e.discountCents]);
    }else if(e.detailVerified){for(const a of e.adjustments)adjustments.push([tag+' · '+a.label+(a.note?' · '+a.note:''),a.amountCents])}
    else {complete=false;fallback.push(tag+' · Composição dos ajustes não comprovada. Saldo original preservado.')}
    // Preserve each source balance, without repeating a separate product table.
    fallback.push(tag+' · '+(e.partial?'Parcial':'Pendente')+' · Saldo '+money(e.amountCents));
   }
   const reconciled=complete&&serviceTotal+adjustments.reduce((n,a)=>n+a[1],0)===w.totalCents;
   const summary=(label,value)=>'<div class="summaryrow"><span>'+esc(label)+'</span><b>'+value+'</b></div>';
   return '<h3 class="week">'+esc(w.label)+'</h3><table class="week-products"><colgroup><col style="width:55%"><col style="width:15%"><col style="width:15%"><col style="width:15%"></colgroup><thead><tr><th>Modelo / serviço</th><th>Qtd.</th><th>Unid.</th><th>Valor</th></tr></thead><tbody>'+rows.join('')+'</tbody></table>'+summary(reconciled?'Total dos serviços':'Valores de serviços observados',money(serviceTotal))+adjustments.map(a=>summary(a[0],(a[1]<0?'− ':'+ ')+money(Math.abs(a[1])))).join('')+(reconciled?'':'<p class="muted">Composição incompleta ou divergente; saldo original preservado, confira antes de pagar.</p>')+'<div class="muted">'+fallback.map(esc).join('<br>')+'</div><div class="summaryrow subtotal"><b>Subtotal da seção</b><b>'+money(w.totalCents)+'</b></div>';
  };
  return '<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>HLGB — Conferência de acerto</title><style>@page{size:A4 portrait;margin:14mm}*{box-sizing:border-box}body{font:12px Arial,sans-serif;color:#29252d;margin:24px auto;max-width:780px;padding:0 12px}h1{font-size:21px;color:#57355f;margin:0 0 5px}h2{font-size:14px;margin:0 0 12px}h3{font-size:12px;margin:12px 0 5px;break-after:avoid}p{margin:6px 0}.meta,.subtotal,.total{background:#f3eff5;padding:9px}.week{margin-top:18px;color:#57355f;border-bottom:1px solid #bbaec0;padding-bottom:4px}table{width:100%;border-collapse:collapse;table-layout:fixed;margin:5px 0}th,td{padding:7px 6px;vertical-align:top;overflow-wrap:anywhere;border-bottom:1px solid #ddd}th{background:#57355f;color:white;text-align:left;print-color-adjust:exact;-webkit-print-color-adjust:exact}tbody tr:nth-child(even){background:#f8f6f9}thead{display:table-header-group}tr,.summaryrow{break-inside:avoid}td:nth-child(n+2),th:nth-child(n+2){text-align:right}.muted{color:#666;font-size:10px}.summaryrow{display:flex;justify-content:space-between;gap:12px;padding:5px 7px}.summaryrow b{white-space:nowrap}.total{font-weight:bold;color:#57355f;font-size:15px;border-top:2px solid #57355f}button{margin-top:12px;padding:9px 14px}@media print{body{margin:0;padding:0;max-width:none}button{display:none}}</style></head><body><h1>HLGB CONFECÇÕES</h1><h2>'+ (combined?'CONSULTA GERAL DE SALDOS':'DEMONSTRATIVO DE ACERTO') +' — Conferência de acerto</h2><div class="meta"><b>Profissional: '+esc(g.factionName)+'</b><p>Situação: pendente / parcial · '+selected.length+' lançamento(s)</p><p>'+esc(weekNote)+'</p></div><h3>PRODUTOS E SERVIÇOS</h3>'+sections.map(renderWeek).join('')+'<h3>'+ (combined?'RESUMO DA CONSULTA (não pagar como um único acerto)':'RESUMO DO ACERTO') +'</h3><div class="summaryrow"><span>Normal</span><b>'+money(normal)+'</b></div><div class="summaryrow"><span>Avulso</span><b>'+money(manual)+'</b></div><div class="summaryrow total"><span>'+ (combined?'SALDO GERAL DE CONSULTA':sections[0].key||sections[0].entries[0].kind==='avulso'?'TOTAL LÍQUIDO A CONFERIR':'SALDO INDIVIDUAL A REVISAR') +'</span><b>'+money(total)+'</b></div><p class="muted">'+data.warnings.length+' alerta(s) na consulta geral. Somente o histórico de entrega confirma a semana; datas de referência não comprovam entrega. Valores locais. Não é recibo nem dá baixa. Confira antes de pagar.</p><button type="button" onclick="window.print()">Imprimir / salvar PDF</button></body></html>';

 }
 function authorized(){try{return window.__HLGB_AUTH_READY===true&&typeof canOpenPage==='function'&&canOpenPage('pagamentosFaccoes')===true&&canOpenPage('faccoes')===true}catch(_){return false}}
 let signature='';
 function dateBreakdown(group,allowed){
  const fail=()=>({state:'review',rows:[],canWrite:false});
  if(allowed!==true||!Array.isArray(group?.entries)||!Number.isSafeInteger(group.totalCents)||group.totalCents<0)return fail();
  const dates=new Map(),seen=new Set();let total=0;
  const validDay=v=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&Number.isFinite(Date.parse(v+'T00:00:00Z'))&&new Date(v+'T00:00:00Z').toISOString().slice(0,10)===v;
  for(const e of group.entries){
   const key=e.kind==='normal'?'n:'+sid(e.paymentId):'a:'+sid(e.groupId);
   if(!['normal','avulso'].includes(e.kind)||key.length<=2||seen.has(key)||!Number.isSafeInteger(e.amountCents)||e.amountCents<=0)return fail();
   seen.add(key);const date=validDay(e.date)?e.date:null;
   const row=dates.get(date)||{date,normalCents:0,manualCents:0,totalCents:0,count:0};
   row[e.kind==='normal'?'normalCents':'manualCents']+=e.amountCents;row.totalCents+=e.amountCents;row.count++;total+=e.amountCents;
   if(!Number.isSafeInteger(total))return fail();dates.set(date,row);
  }
  if(total!==group.totalCents)return fail();
  return {state:'local-date-summary',rows:[...dates.values()].sort((a,b)=>(a.date||'9999-12-31').localeCompare(b.date||'9999-12-31')),totalCents:total,canWrite:false};
 }
 function dateSummaryHtml(group){
  const x=dateBreakdown(group,true);if(x.state!=='local-date-summary')return '<p class="sub">Conferir saldos e datas antes de agrupar.</p>';
  return '<details><summary>Resumo por data de referência</summary><p class="sub">Saldos pendentes, não pagamentos realizados. Datas ausentes ou inválidas permanecem separadas.</p><div style="overflow-x:auto"><table><thead><tr><th>Data</th><th>Normal</th><th>Avulso</th><th>Saldo</th></tr></thead><tbody>'+x.rows.map(r=>'<tr><td>'+esc(r.date||'Sem data válida')+' · '+r.count+' item(ns)</td><td>'+money(r.normalCents)+'</td><td>'+money(r.manualCents)+'</td><td>'+money(r.totalCents)+'</td></tr>').join('')+'</tbody></table></div></details>';
 }
 function printButtons(g){if(!g.masterId||g.identityAmbiguous)return '';const groups=groupWeeks(g),button=(w,label)=>'<button type="button" class="secondary" data-faction-print9777="'+esc(g.key)+'"'+(w?' data-faction-scope9868="'+esc(w.scopeKey)+'"':'')+'>'+esc(label)+'</button>';return (groups.length>1?button(null,'Consulta geral de saldos / PDF'):'')+groups.map(w=>'<div class="sub">'+esc(w.label)+' · '+money(w.totalCents)+' '+button(w,w.key?'Imprimir acerto da semana':w.entries[0].kind==='avulso'?'Imprimir avulso':'Imprimir conferência individual')+(w.key&&w.entries.some(e=>e.kind==='normal')?' <button type="button" class="secondary" data-add-week-avulso9875="'+esc(g.key)+'" data-week9875="'+esc(w.key.slice(9))+'">+ Mercadoria avulsa nesta semana</button>':'')+'</div>').join('')}
 // Financial-only proposal: physical delivery quantity never changes.
 function normalAdjustmentPreview(data,groupKey,paymentId,input,allowed){
  const fail=reason=>({state:'blocked',reason,canWrite:false});
  if(allowed!==true)return fail('permission');
  const fresh=consolidate(data),groups=fresh.groups.filter(g=>g.key===groupKey&&g.masterId&&!g.identityAmbiguous);
  if(groups.length!==1)return fail('identity');
  const entry=groups[0].entries.find(e=>e.kind==='normal'&&e.paymentId===sid(paymentId));
  const matches=(Array.isArray(data?.payments)?data.payments:[]).filter(r=>!canceled(r)&&sid(r.id)===sid(paymentId));
  if(!entry||matches.length!==1||entry.partial||entry.paidCents!==0||entry.discountCents!==0)return fail('not-wholly-pending');
  const row=matches[0],proof=deliveryEvidence(row,data),qty=Number(row.quantity),rate=exactMoney(row.unitPrice),adjustment=adjustmentDetail(row,proof),oldQty=adjustment.payableQuantity;
  if(!proof||!Number.isSafeInteger(qty)||qty<=0||rate===null||rate<=0||adjustment.state==='review'||!Number.isSafeInteger(oldQty*rate)||oldQty*rate!==entry.totalCents||!Array.isArray(row.paymentHistory??[])||(row.paymentHistory??[]).length)return fail('delivery-or-value-proof');
  const f=(data.factions||[]).find(x=>sid(x.id)===sid(row.factionServiceId));
  if(row.travetaPricingVersion||f?.travetaPricingVersion||Number(row.travetaDiscountTotalV9577||0)>0||Number(row.travetaDiscount||0)>0||Number(row.travetaDiscountUnitV9577||0)>0)return fail('special-pricing');
  const rawQty=input?.payableQuantity,proposedQty=typeof rawQty==='number'||typeof rawQty==='string'&&/^\d+$/.test(rawQty)?Number(rawQty):NaN,proposedRate=exactMoney(input?.unitPrice),reason=sid(input?.reason);
  if(!Number.isSafeInteger(proposedQty)||proposedQty<=0||proposedQty>qty)return fail('quantity-range');
  if(proposedRate===null||proposedRate<=0||proposedRate>1000000||!Number.isSafeInteger(proposedQty*proposedRate))return fail('unit-price');
  if(reason.length<6||reason.length>500)return fail('reason');
  const total=proposedQty*proposedRate;
  if(total===entry.totalCents&&proposedQty===oldQty&&proposedRate===rate)return fail('unchanged');
  const week=groupWeeks(groups[0]).find(w=>w.entries.includes(entry));
  if(!week?.key||!Number.isSafeInteger(week.totalCents-entry.amountCents+total))return fail('week');
  return {state:'preview-only',paymentId:sid(row.id),deliveryId:sid(row.deliveryId),factionServiceId:sid(row.factionServiceId),deliveryDate:proof.date,weekKey:week.key,deliveredQuantity:qty,previousPayableQuantity:oldQty,payableQuantity:proposedQty,previousUnitCents:rate,proposedUnitCents:proposedRate,previousCents:entry.amountCents,proposedCents:total,differenceCents:total-entry.amountCents,previousWeekCents:week.totalCents,proposedWeekCents:week.totalCents-entry.amountCents+total,reason,canWrite:false,serverRevalidationRequired:true};
 }
 function openNormalPreview(groupKey,id,expectedSignature){
  if(!authorized()||typeof window.openModal!=='function')throw Error('Formulário indisponível.');
  const data=consolidate(currentData());if(JSON.stringify(data)!==expectedSignature)throw Error('Acerto mudou. Atualize a conferência.');
  const g=data.groups.find(x=>x.key===groupKey&&x.masterId&&!x.identityAmbiguous),e=g?.entries.find(x=>x.kind==='normal'&&x.paymentId===id&&!x.partial),d=e?.details?.[0];
  if(!e||!d?.deliveryDate||!d.quantity||!d.unitPriceCents)throw Error('Entrega sem comprovação suficiente para esta prévia.');
  window.openModal('Prévia de edição do item do acerto','<section id="hlgb-normal-preview9877"><p><b>'+esc(g.factionName)+' · '+esc(d.label)+'</b></p><p>Entrega registrada: '+dateBr(d.deliveryDate)+' · '+qtyText(d.quantity)+' peças · Saldo '+money(e.amountCents)+'</p><div class="field"><label>Quantidade a remunerar <input id="np9877-qty" type="number" min="1" max="'+d.quantity+'" step="1" value="'+(d.adjustment?.state==='local-adjustment'?d.adjustment.payableQuantity:d.quantity)+'"></label></div><div class="field"><label>Valor unitário (R$) <input id="np9877-price" type="number" min="0.01" step="0.01" value="'+(d.unitPriceCents/100).toFixed(2)+'"></label></div><div class="field"><label>Motivo da correção <textarea id="np9877-reason" maxlength="500"></textarea></label></div><button id="np9877-calculate" type="button" class="secondary">Calcular prévia</button><p id="np9877-result" role="status"></p><p class="sub">Somente simulação. A quantidade física da entrega não muda. A gravação da correção de pagamentos normais ainda depende de validação integrada; não use esta prévia como autorização de baixa.</p></section>',()=>false);
  document.getElementById('np9877-calculate')?.addEventListener('click',()=>{const out=document.getElementById('np9877-result');if(!out)return;if(!authorized()||JSON.stringify(consolidate(currentData()))!==expectedSignature){out.textContent='Acerto mudou. Reabra a consulta.';return}const x=normalAdjustmentPreview(currentData(),groupKey,id,{payableQuantity:document.getElementById('np9877-qty')?.value,unitPrice:document.getElementById('np9877-price')?.value,reason:document.getElementById('np9877-reason')?.value},true);const labels={'quantity-range':'A quantidade a remunerar não pode ultrapassar a entrega registrada.','special-pricing':'Preço especial/travetada: conferir cálculo original.','reason':'Informe motivo de 6 a 500 caracteres.','unit-price':'Informe valor unitário válido.','unchanged':'Nenhuma alteração informada.'};out.textContent=x.state==='preview-only'?'Valor atual: '+money(x.previousCents)+' · Novo valor: '+money(x.proposedCents)+' · Diferença: '+(x.differenceCents<0?'− ':'+ ')+money(Math.abs(x.differenceCents))+' · Novo total semanal simulado: '+money(x.proposedWeekCents)+'. Nada foi salvo.':labels[x.reason]||'Item não elegível: confira entrega, valores ou pagamentos anteriores.';});
 }
 function validateDeliveryScope(scope){if(!authorized()||!scope||!validDay(scope.weekStart))return false;const found=consolidate(currentData()).groups.filter(g=>g.masterId===sid(scope.masterId)&&!g.identityAmbiguous&&norm(g.factionName)===norm(scope.name)&&groupWeeks(g).some(w=>w.key==='delivery:'+scope.weekStart&&w.entries.some(e=>e.kind==='normal')));return found.length===1;}
 function render(){
  if(typeof document==='undefined')return false;
  if(!authorized()){document.getElementById('hlgb-unified-acertos-v95102')?.remove();signature='';return false}
  const anchor=document.getElementById('factionPaymentTable');
  if(!anchor)return false;
  const data=consolidate(currentData()),json=JSON.stringify(data);
  let host=document.getElementById('hlgb-unified-acertos-v95102');
  if(!host){host=document.createElement('section');host.id='hlgb-unified-acertos-v95102';
   host.className='panel';host.style.cssText='margin:12px 0;padding:12px';
   signature='';
   const manual=document.getElementById('fm66-receipts');
   if(manual)manual.insertAdjacentElement('beforebegin',host);
   else anchor.insertAdjacentElement('afterend',host);
  }
  if(signature===json)return true;
  signature=json;
  host.innerHTML='<h3 style="margin:0 0 8px">🧾 Acerto consolidado por pessoa</h3>'+
   '<p class="sub">Uma visão de saldos por pessoa. O acerto semanal junta somente entregas registradas na mesma semana. Avulsos sem data real de entrega informada e entregas sem comprovação permanecem separados. <b>Não dá baixa nem cria um novo lançamento financeiro.</b></p>'+
   (data.warnings.length?'<p class="sub" style="color:#934">⚠ Existem '+data.warnings.length+
    ' registro(s) que precisam de conferência e não entram na soma para evitar pagamento incorreto.</p>':'')+
   (data.groups.length?'<div style="overflow-x:auto"><table style="width:100%"><thead><tr>'+
    '<th>Profissional</th><th>Acertos pendentes</th><th>Normal</th><th>Avulso</th>'+
    '<th>Saldo geral (consulta)</th><th>Detalhamento</th></tr></thead><tbody>'+
    data.groups.map(g=>'<tr><td><b>'+esc(g.factionName)+'</b>'+
      (g.identityAmbiguous?'<div class="sub" style="color:#934">Nome duplicado: conferir identidade</div>':'')+
      '</td><td>'+g.sourceCount+' lançamento(s)</td><td>'+money(g.regularCents)+
      '</td><td>'+money(g.manualCents)+'</td><td><b>'+money(g.totalCents)+'</b></td>'+
      '<td>'+dateSummaryHtml(g)+printButtons(g)+'<details><summary>Ver itens e datas</summary>'+
      g.entries.map(e=>'<div style="padding:5px;border-bottom:1px solid #ddd">'+
       esc(e.kind==='avulso'?'Avulso':'Normal')+' · '+esc(e.label)+' · '+
       esc(e.date||'Sem data')+' · Saldo '+money(e.amountCents)+(e.kind==='normal'?' · Bruto '+money(e.totalCents)+' · Pago '+money(e.paidCents)+' · Desconto '+money(e.discountCents):'')+'<br><small>'+
       esc(weekSummary(e).label)+'</small>'+ (e.details||[]).map(d=>'<div class="sub">'+esc(d.label)+' · '+qtyText(d.displayQty)+' '+esc(d.unit)+' · '+cash(d.unitPriceCents)+' · '+cash(d.amountCents)+(d.adjustment?.state==='local-adjustment'?' · Entregues: '+qtyText(d.quantity)+' · Remuneradas: '+qtyText(d.adjustment.payableQuantity)+' · '+esc(d.adjustment.reason):'')+'</div>').join('')+       (e.kind==='normal'&&!e.partial?        (e.details?.[0]?.deliveryDate&&!g.identityAmbiguous&&g.masterId?' <button type="button" class="secondary" data-normal-preview9877="'+esc(e.paymentId)+'" data-normal-owner9877="'+esc(g.key)+'">Prévia de editar quantidade / valor</button>':'')+' <button type="button" class="secondary" data-payee104-id="'+esc(e.paymentId)+'">↔ Trocar facção</button>'+        ' <button type="button" class="secondary" data-already-paid104-id="'+esc(e.paymentId)+'">✓ Já estava pago</button>':e.kind==='avulso'?        ' <button type="button" class="secondary" data-manual-payee104-group="'+esc(e.groupId)+'">↔ Trocar facção avulsa</button> <button type="button" class="secondary" data-edit-avulso9875="'+esc(e.groupId)+'">Editar acerto avulso (quantidade / valor / produtos)</button> <button type="button" class="primary" data-avulso-register9871="'+esc(e.groupId)+'">Registrar pagamento / marcar pago</button> <button type="button" class="secondary" data-avulso-paid9865="'+esc(e.groupId)+'">Conferir se já foi pago</button>':' <span class="sub">Parcial: continuar no acerto original</span>')+       '</div>').join('')+
      '</details></td></tr>').join('')+'</tbody></table></div>':
    '<div class="sub">Nenhum acerto pendente nos dados disponíveis neste computador.</div>')+
   '<p class="sub">A conferência da mesma pessoa usa o cadastro e o nome normalizado. Se houver homônimos ou pagamento parcial, revise os registros antes de pagar. Para registrar uma única saída bancária, será necessário homologar uma transação financeira unificada com confirmação remota; as baixas atuais continuam separadas e protegidas.</p>';
  host.querySelectorAll('[data-normal-preview9877]').forEach(b=>b.onclick=()=>{if(!host.isConnected)return;try{openNormalPreview(b.dataset.normalOwner9877,b.dataset.normalPreview9877,signature)}catch(e){alert(sid(e?.message||e))}});
  host.querySelectorAll('[data-edit-avulso9875],[data-add-week-avulso9875]').forEach(b=>b.onclick=()=>{if(!authorized()||!host.isConnected)return;const fresh=consolidate(currentData());if(JSON.stringify(fresh)!==signature){render();return alert('Os acertos mudaram. Confira novamente.')}const api=window.hlgbFactionManual9566;try{if(typeof api?.openForm!=='function')throw Error('Formulário original indisponível.');if(b.dataset.editAvulso9875){const gid=b.dataset.editAvulso9875;const matches=fresh.groups.filter(g=>g.masterId&&!g.identityAmbiguous&&g.entries.some(e=>e.kind==='avulso'&&e.groupId===gid));if(matches.length!==1)throw Error('Identidade do acerto a conferir.');api.openForm(gid)}else{const g=fresh.groups.find(x=>x.key===b.dataset.addWeekAvulso9875),scope={masterId:g?.masterId,name:g?.factionName,weekStart:b.dataset.week9875};if(!validateDeliveryScope(scope))throw Error('Semana indisponível.');api.openForm('',{deliveryScope9875:scope})}}catch(e){alert(sid(e?.message||e))}});
  host.querySelectorAll('[data-avulso-register9871]').forEach(b=>b.onclick=()=>{if(!authorized()||!host.isConnected)return;const gid=b.dataset.avulsoRegister9871,fresh=consolidate(currentData());if(JSON.stringify(fresh)!==signature){render();return alert('Os acertos mudaram. Confira novamente.')}const match=fresh.groups.filter(g=>g.masterId&&!g.identityAmbiguous&&g.entries.some(e=>e.kind==='avulso'&&e.groupId===gid));if(match.length!==1)return alert('Identidade do acerto a conferir.');const api=window.hlgbFactionManual9566;try{if(typeof api?.openPayModal!=='function')throw Error('Formulário original indisponível.');api.openPayModal(gid)}catch(e){alert(sid(e?.message||e))}});
  host.querySelectorAll('[data-avulso-paid9865]').forEach(b=>b.onclick=()=>{if(!authorized()||!host.isConnected)return;const gid=b.dataset.avulsoPaid9865,fresh=consolidate(currentData());if(JSON.stringify(fresh)!==signature){render();return alert('Os acertos mudaram. Confira novamente.')}const api=window.hlgbFactionManual9566,linked=(dbRef().hubFinanceEntries||[]).filter(x=>x&&!canceled(x)&&x.sourceType==='faction_manual_payment'&&sid(x.sourceId)===gid&&norm(x.status)==='realizado');if(linked.length===1&&typeof api?.openPayModal==='function'){if(confirm('Existe uma saída registrada com vínculo a este avulso. Confira data, valor e forma no acerto original; nenhuma nova saída deve ser criada.'))try{api.openPayModal(gid,{requireExistingHub:true})}catch(_){alert('Não foi possível abrir o acerto original.')}}else alert('Não há saída vinculada única e confirmada nesta consulta. Se já foi pago fora do fluxo, confira o comprovante e a conciliação antes de dar baixa. Não registre um segundo pagamento.');});
  host.querySelectorAll('[data-faction-print9777]').forEach(b=>b.onclick=()=>{
   if(!authorized()||!host.isConnected)return;
   const fresh=consolidate(currentData());if(JSON.stringify(fresh)!==signature){render();return alert('Os acertos mudaram. Confira os valores e solicite a impressão novamente.')}
   let w;try{const html=printablePending(fresh,b.dataset.factionPrint9777,true,b.dataset.factionScope9868||null);w=window.open('','_blank');if(!w)return alert('Permita pop-ups para imprimir.');if(!authorized()){w.close();return}w.opener=null;w.document.open();w.document.write(html);w.document.close();w.focus()}catch(_){try{w?.close()}catch(e){}alert('Relatório indisponível. Confira a identidade e os saldos.')}
  });
  return true;
 }
 function install(){return render()}
 if(typeof document!=='undefined'){
  [0,600,1800].forEach(ms=>setTimeout(install,ms));
  try{window.hlgbAfterLogin?.(()=>setTimeout(install,300),0)}catch(e){}
  window.addEventListener?.('hlgb:authenticated',()=>setTimeout(install,250));
  window.addEventListener?.('hlgb:logout',()=>{document.getElementById('hlgb-unified-acertos-v95102')?.remove();signature=''});
 }
 return Object.freeze({version:VERSION,consolidate,dateBreakdown,weekSummary,groupWeeks,printablePending,currentData,normalAdjustmentPreview,validateDeliveryScope,render,install});
});
