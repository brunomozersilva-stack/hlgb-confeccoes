'use strict';
(function(root,api){if(typeof module==='object'&&module.exports)module.exports=api;else root.HLGBSettlementHistory9653=api;})(typeof globalThis==='object'?globalThis:this,(function core(){
 const sid=v=>typeof v==='string'||typeof v==='number'?String(v).trim():'',norm=v=>sid(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase(),live=x=>x&&!x.deletedAt&&!x.deleted_at&&x.deleted!==true&&x._deleted!==true&&!x.manualCanceledV9590&&!/cancelad|excluid/.test(norm(x.status));
 const cents=v=>(typeof v==='number'||typeof v==='string'&&/^\d+(\.\d{1,2})?$/.test(v))&&Number.isFinite(Number(v))&&Number(v)>=0&&Number.isSafeInteger(Math.round(Number(v)*100))&&Math.abs(Number(v)*100-Math.round(Number(v)*100))<.00001?Math.round(Number(v)*100):null;
 const valid=v=>Number.isSafeInteger(v)&&v>=0,day=v=>{const s=sid(v).slice(0,10),t=Date.parse(s+'T00:00:00Z');return /^\d{4}-\d{2}-\d{2}$/.test(s)&&Number.isFinite(t)&&new Date(t).toISOString().slice(0,10)===s?s:null};
 function inspect(ctx,filter={}){
  if(ctx?.authenticated!==true)return {state:'forbidden',rows:[],groups:[],issues:[]};
  if((filter.from&&day(filter.from)!==filter.from)||(filter.to&&day(filter.to)!==filter.to)||(filter.from&&filter.to&&filter.from>filter.to)||filter.status&&!['all','open','paid','compensated','review'].includes(filter.status))return {state:'invalid-filter',rows:[],groups:[],issues:[]};
  const rows=[],issues=[],keys=new Set();const add=r=>{if(!r.id||!r.ownerId||!r.date){issues.push('identidade-ou-data-incompleta');return}if(keys.has(r.id)){issues.push('duplicidade:'+r.id);return}keys.add(r.id);rows.push(r)};
  const row=(kind,id,ownerId,name,date,total,paid,credit,lines,document,status,extra={})=>({kind,id,ownerId,name,date,totalCents:total,paidCents:paid,creditCents:credit,balanceCents:valid(total)&&valid(paid)&&valid(credit)&&paid+credit<=total?total-paid-credit:null,lines,document,status,...extra});
  const serviceLine=p=>({id:sid(p.id),description:sid(p.description||p.manualProductNameV9589||p.productName||'Serviço').slice(0,180),quantity:p.quantity!==null&&p.quantity!==undefined&&sid(p.quantity)!==''&&Number.isSafeInteger(Number(p.quantity))&&Number(p.quantity)>=0?Number(p.quantity):null,unitPriceCents:cents(p.unitPrice),serviceCents:cents(p.value),paidCents:cents(p.paidAmount),travetaCents:cents(p.travetaDiscountTotalV9577),discountCents:p.discountAmount==null?0:cents(p.discountAmount),note:sid(p.manualLineNoteV9566||'').slice(0,500)});
  const proofLine=p=>JSON.stringify([sid(p.id),sid(p.factionMasterId),sid(p.manualGroupId),p.manual===true,cents(p.value),cents(p.paidAmount),day(p.paymentDate),norm(p.status)]);
  if(ctx.factionsAllowed===true){
   if(!Array.isArray(ctx.payments)||!Array.isArray(ctx.manualGroups))issues.push('faccoes-fonte-incompleta');
   else{
    const counts=new Map(),groupCounts=new Map(),manual=new Set(),manualRows=new Map();
    for(const p of ctx.payments.filter(live)){const k=sid(p.id);counts.set(k,(counts.get(k)||0)+1);if(p.manual){const gid=sid(p.manualGroupId);manual.add(gid);const list=manualRows.get(gid)||[];list.push(p);manualRows.set(gid,list)}}
    for(const g of ctx.manualGroups){const k=sid(g?.id);groupCounts.set(k,(groupCounts.get(k)||0)+1)}
    for(const g of ctx.manualGroups){
     const gid=sid(g?.id);if(!gid||groupCounts.get(gid)!==1){issues.push('grupo-duplicado-ou-sem-id');continue}
     const items=Array.isArray(g.rows)?g.rows.filter(live):[],current=manualRows.get(gid)||[];
     if(!items.length){if(current.length)issues.push('grupo-sem-linhas:'+gid);continue}
     const ids=items.map(x=>sid(x.id)),idSet=new Set(ids),proofs=new Set(current.map(proofLine)),owners=new Set(items.map(x=>sid(x.factionMasterId)));
     if(ids.some(k=>!k||counts.get(k)!==1)||idSet.size!==ids.length||current.length!==items.length||current.some(p=>!idSet.has(sid(p.id)))||items.some(x=>sid(x.manualGroupId)!==gid||!x.manual||!proofs.has(proofLine(x)))||owners.size!==1||owners.has('')){issues.push('grupo-sem-prova:'+gid);continue}
     const amounts=items.map(x=>cents(x.paidAmount)),total=cents(g.total),paid=amounts.every(valid)?amounts.reduce((s,x)=>s+x,0):null;
     const status=norm(g.status),dates=new Set(items.map(x=>day(x.paymentDate)));
     if(!valid(total)||!valid(paid)||!['pago','pendente'].includes(status)||status==='pago'&&(paid!==total||dates.size!==1||dates.has(null))||status==='pendente'&&paid!==0){issues.push('grupo-requer-conferencia:'+gid);continue}
     add(row('faccao','group:'+gid,[...owners][0],sid(g.factionName),day(g.date),total,paid,0,ids,!!g.receipt,sid(g.status),{dateBasis:status==='pago'?'payment':'scheduled',details:current.map(serviceLine),netOfAdjustments:true,nominalCents:cents(g.nominal)}));
     manual.delete(gid);
    }
    if(manual.size)issues.push('grupos-avulsos-sem-conciliacao:'+manual.size);
    for(const p of ctx.payments.filter(live)){
     if(p.manual)continue;const id=sid(p.id),total=cents(p.value),paid=cents(p.paidAmount),credit=p.discountAmount==null?0:cents(p.discountAmount),status=norm(p.status);
     if(!id||counts.get(id)!==1||!valid(total)||!valid(paid)||paid>total){issues.push('pagamento-revisar:'+id);continue}
     const r=row('faccao','payment:'+id,sid(p.factionMasterId),sid(p.factionName),day(p.paymentDate||p.scheduledPaymentDate||p.serviceFinishedAt||p.date),total,paid,credit,[id],!!p.receiptPdfV9566,sid(p.status),{dateBasis:p.paymentDate?'payment':p.scheduledPaymentDate?'scheduled':p.serviceFinishedAt?'service':'record',details:[serviceLine(p)]});
     // discountAmount is an actual settlement credit; traveta is already reflected in service pricing.
     // Contradictory paid/partial/pending states are not allowed into observed totals.
     if(!valid(credit)||r.balanceCents===null||!['pago','parcial','pendente'].includes(status)||status==='pago'&&(r.balanceCents!==0||!day(p.paymentDate))||status==='parcial'&&(r.balanceCents<=0||paid+credit<=0)||status==='pendente'&&(paid+credit!==0||r.balanceCents<=0)){
      r.balanceCents=null;issues.push('pagamento-saldo-ou-status-inconsistente:'+id);
     }
     add(r);
    }
   }
  }
  if(ctx.clientsAllowed===true){
   if(!Array.isArray(ctx.notes))issues.push('notas-fonte-incompleta');
   else {const counts=new Map();for(const n of ctx.notes){const k=sid(n?.key);counts.set(k,(counts.get(k)||0)+1)}
   for(const n of ctx.notes){const k=sid(n?.key);if(!k||counts.get(k)!==1||!sid(n.clientKey).startsWith('id:')||n.mismatch||!valid(n.total)||!valid(n.paid)||!valid(n.credit)||n.paid+n.credit>n.total||n.balance!==n.total-n.paid-n.credit){issues.push('nota-revisar:'+k);continue}
    add(row('cliente','note:'+k,sid(n.clientKey).slice(3),sid(n.client),day(n.issued),n.total,n.paid,n.credit,[sid(n.id)],false,n.balance===0?'Liquidado':'Em aberto',{dateBasis:'issue',due:day(n.due),number:sid(n.number||n.id),source:sid(n.source),details:[]}))}}
  }
  if(ctx.employeesAllowed===true){
   if(!Array.isArray(ctx.payroll))issues.push('folha-fonte-incompleta');
   else{const ids=new Map(),personMonths=new Map();for(const p of ctx.payroll.filter(live)){const k=sid(p.id),pm=sid(p.employeeId)+'|'+sid(p.month);ids.set(k,(ids.get(k)||0)+1);personMonths.set(pm,(personMonths.get(pm)||0)+1)}
    for(const p of ctx.payroll.filter(live)){if(p.paid!==true)continue;const k=sid(p.id),paid=cents(p.paidValue);if(!k||ids.get(k)!==1||personMonths.get(sid(p.employeeId)+'|'+sid(p.month))!==1||!valid(paid)||!day(p.paidAt)){issues.push('folha-revisar:'+k);continue}
    add(row('funcionario','payroll:'+k,sid(p.employeeId),sid(p.employeeName),day(p.paidAt),paid,paid,0,[k],false,'Pago registrado',{dateBasis:'payment',competence:sid(p.month),details:[]}))}}
  }
  const statusOf=r=>r.balanceCents===null?'review':r.balanceCents>0?'open':r.creditCents>0?'compensated':'paid';
  const query=norm(filter.query),all=rows.filter(r=>!filter.kind||r.kind===filter.kind);
  const owners=new Map();for(const r of all){const k=JSON.stringify([r.kind,r.ownerId]),x=owners.get(k)||{kind:r.kind,ownerId:r.ownerId,name:r.name,count:0};x.count++;if(r.name&&x.name!==r.name)x.name=[x.name,r.name].filter(Boolean).sort((a,b)=>a.localeCompare(b,'pt-BR'))[0];owners.set(k,x)}
  const filtered=all.filter(r=>(!filter.ownerId||r.ownerId===sid(filter.ownerId))&&(!filter.from||r.date>=filter.from)&&(!filter.to||r.date<=filter.to)&&(!filter.status||filter.status==='all'||statusOf(r)===filter.status)&&(!query||norm([r.name,r.id,r.ownerId,r.number,r.competence,...r.lines,...(r.details||[]).map(x=>x.description)].join(' ')).includes(query))).map(r=>({...r,settlementState:statusOf(r)})).sort((a,b)=>b.date.localeCompare(a.date)||a.id.localeCompare(b.id));
  const sum=(list)=>{const out={count:0,totalCents:null,paidCents:null,creditCents:null,balanceCents:null,reviewCount:0};for(const r of list){if(!valid(r.balanceCents)){out.reviewCount++;continue}out.count++;for(const k of ['totalCents','paidCents','creditCents','balanceCents']){const next=(out[k]??0)+r[k];if(!Number.isSafeInteger(next))throw Error('total-overflow');out[k]=next}}return out};
  const groups=new Map(),personGroups=new Map();
  for(const r of filtered){if(r.balanceCents===null){issues.push('saldo-inconsistente:'+r.id);continue}
   for(const [map,k,base] of [[groups,JSON.stringify([r.kind,r.ownerId,r.date]),{date:r.date,dateBasis:r.dateBasis}],[personGroups,JSON.stringify([r.kind,r.ownerId]),{}]]){const x=map.get(k)||{kind:r.kind,ownerId:r.ownerId,name:r.name,...base,list:[]};x.list.push(r);if(x.dateBasis!==undefined&&x.dateBasis!==r.dateBasis)x.dateBasis='mixed';map.set(k,x)}
  }
  const aggregate=map=>[...map.values()].map(({list,...x})=>({...x,...sum(list)}));
  const totals=sum(filtered),ownerRows=aggregate(personGroups);
  const limit=Number.isSafeInteger(filter.limit)?Math.min(200,Math.max(1,filter.limit)):50,offset=Number.isSafeInteger(filter.offset)?Math.max(0,filter.offset):0;
  if(filter.export===true&&filtered.length>5000)return {state:'export-limit',rows:[],groups:[],issues:[],total:filtered.length};
  return {state:'local-observation',rows:filter.export===true?filtered:filtered.slice(offset,offset+limit),total:filtered.length,groups:aggregate(groups).slice(offset,offset+limit),groupTotal:groups.size,ownerGroups:ownerRows.slice(offset,offset+limit),ownerTotal:ownerRows.length,owners:[...owners.values()].sort((a,b)=>a.name.localeCompare(b.name,'pt-BR')||a.ownerId.localeCompare(b.ownerId)),totals,issues:[...new Set(issues)],officialTotals:false,canWrite:false};
 }

 function noteEvents(ctx,filter={}){
  const empty=state=>({state,events:[],eventTotal:0,owners:[],issues:[],totals:null,canWrite:false});
  if(ctx?.authenticated!==true||ctx.clientsAllowed!==true)return empty('forbidden');
  if(!Array.isArray(ctx.notes)||!Array.isArray(ctx.noteSources)||ctx.notes.length>50000||ctx.noteSources.length>100000)return empty('unavailable');
  if((filter.from&&day(filter.from)!==filter.from)||(filter.to&&day(filter.to)!==filter.to)||(filter.from&&filter.to&&filter.from>filter.to)||filter.eventType&&!['all','payment-recorded','material-offset','return-active','return-reversed'].includes(filter.eventType))return empty('invalid-filter');
  const notes=new Map(),raw=new Map(),issues=[],events=[],owners=new Map();
  for(const n of ctx.notes){const k=sid(n?.key);if(k)notes.set(k,notes.has(k)?null:n)}
  for(const x of ctx.noteSources){const k=sid(x?.key);if(k)raw.set(k,raw.has(k)?null:x.record)}
  for(const [k,n] of notes){
   if(!n||!sid(n.clientKey).startsWith('id:')||n.mismatch||![n.total,n.paid,n.credit,n.balance].every(valid)||n.total!==n.paid+n.credit+n.balance){issues.push('nota-revisar:'+k);continue}
   const ownerId=sid(n.clientKey).slice(3);if(!ownerId){issues.push('nota-sem-cliente:'+k);continue}
   owners.set(ownerId,{ownerId,name:sid(n.client)});
   const record=raw.get(k);if(!record||!live(record)||!['projection','order'].some(type=>k===type+':'+sid(record.id))||sid(record.clientId)!==ownerId){issues.push('origem-nao-confirmada:'+k);continue}
   const history=record.paymentHistory??[],returns=record.acertoReturnsV9565??[];
   if(!Array.isArray(history)||!Array.isArray(returns)){issues.push('historico-invalido:'+k);continue}
   const keys=new Set(),local=[];let paid=0,credit=0,invalid=false;
   function append(x,type){
    const eventId=sid(x?.id),date=day(x?.date),amount=cents(x?.value),id=JSON.stringify([k,type.startsWith('return')?'return':'payment',eventId]);
    if(!eventId||!date||!valid(amount)||amount===0||keys.has(id)){invalid=true;return}
    keys.add(id);const reversedAt=type==='return-reversed'?day(x.reversedAt):null;if(type==='return-reversed'&&(!reversedAt||reversedAt<date)){invalid=true;return}
    local.push({kind:'cliente',id,ownerId,name:sid(n.client),noteKey:k,noteNumber:sid(n.number||n.id),date,type,amountCents:amount,reversedAt,method:sid(x.method).slice(0,120),description:sid(type.startsWith('return')?x.reason:x.note).slice(0,500)});
    if(type==='payment-recorded'||type==='material-offset')paid+=amount;else if(type==='return-active')credit+=amount;
   }
   for(const x of history)append(x,x?.tradeSettlementId||norm(x?.method)==='abatimento materia-prima'?'material-offset':'payment-recorded');
   for(const x of returns)append(x,x?.reversedAt?'return-reversed':'return-active');
   // Scalar/legacy receipt values are not invented as dated events. Exclude ambiguous histories.
   if(invalid||!Number.isSafeInteger(paid)||!Number.isSafeInteger(credit)||paid!==n.paid||credit!==n.credit){issues.push('eventos-sem-conciliacao:'+k);continue}
   events.push(...local)
  }
  const q=norm(filter.query),filtered=events.filter(x=>(!filter.ownerId||x.ownerId===sid(filter.ownerId))&&(!filter.from||x.date>=filter.from)&&(!filter.to||x.date<=filter.to)&&(!filter.eventType||filter.eventType==='all'||x.type===filter.eventType)&&(!q||norm([x.name,x.ownerId,x.noteKey,x.noteNumber,x.id,x.method,x.description].join(' ')).includes(q))).sort((a,b)=>b.date.localeCompare(a.date)||a.id.localeCompare(b.id));
  const totals={paymentRecordedCents:null,materialOffsetCents:null,activeReturnCents:null,reversedReturnReferenceCents:null};const fields={'payment-recorded':'paymentRecordedCents','material-offset':'materialOffsetCents','return-active':'activeReturnCents','return-reversed':'reversedReturnReferenceCents'};
  for(const r of filtered){const k=fields[r.type];totals[k]=(totals[k]??0)+r.amountCents;if(!Number.isSafeInteger(totals[k]))return empty('unavailable')}
  if(filter.export===true&&filtered.length>5000)return empty('export-limit');
  const limit=Number.isSafeInteger(filter.limit)?Math.min(200,Math.max(1,filter.limit)):50,offset=Number.isSafeInteger(filter.offset)?Math.max(0,filter.offset):0;
  return {state:'local-events',events:filter.export===true?filtered:filtered.slice(offset,offset+limit),eventTotal:filtered.length,owners:[...owners.values()].sort((a,b)=>a.name.localeCompare(b.name,'pt-BR')||a.ownerId.localeCompare(b.ownerId)),issues:[...new Set(issues)],totals,canWrite:false,officialTotals:false};
 }
 // Dated movements, never infer a cash event from a scalar or the last settlement date.
 function factionEvents(ctx,filter={}){
  const empty=state=>({state,events:[],eventTotal:0,owners:[],issues:[],totals:null,canWrite:false});
  if(ctx?.authenticated!==true||ctx.factionsAllowed!==true)return empty('forbidden');
  if(!Array.isArray(ctx.payments)||ctx.payments.length>50000)return empty('unavailable');
  if((filter.from&&day(filter.from)!==filter.from)||(filter.to&&day(filter.to)!==filter.to)||(filter.from&&filter.to&&filter.from>filter.to)||filter.eventType&&!['all','faction-paid','faction-discount'].includes(filter.eventType))return empty('invalid-filter');
  const counts=new Map(),owners=new Map(),events=[],issues=[],manualRows=new Map();
  for(const p of ctx.payments.filter(live)){const id=sid(p.id);counts.set(id,(counts.get(id)||0)+1)}
  for(const p of ctx.payments.filter(live)){
   const id=sid(p.id),ownerId=sid(p.factionMasterId),name=sid(p.factionName),paid=cents(p.paidAmount??0),credit=cents(p.discountAmount??0),total=cents(p.value);
   if(p.manual===true){const gid=sid(p.manualGroupId);if(!gid){issues.push('avulso-sem-grupo:'+id);continue}const list=manualRows.get(gid)||[];list.push(p);manualRows.set(gid,list);continue}
   if(!id||counts.get(id)!==1||!ownerId||!name||![paid,credit,total].every(valid)||paid+credit>total){issues.push('pagamento-revisar:'+id);continue}
   owners.set(ownerId,{ownerId,name});
   const history=p.paymentHistory??[],local=[],keys=new Set();let paidSum=0,creditSum=0,invalid=!Array.isArray(history);
   if(invalid){issues.push('historico-invalido:'+id);continue}
   for(const h of history){
    const eventId=sid(h?.id),date=day(h?.date),a=cents(h?.paid??0),b=cents(h?.discount??0);
    if(!eventId||!date||keys.has(eventId)||!valid(a)||!valid(b)||a+b<=0){invalid=true;continue}
    keys.add(eventId);paidSum+=a;creditSum+=b;
    for(const [type,amount] of [['faction-paid',a],['faction-discount',b]])if(amount>0)local.push({kind:'faccao',id:JSON.stringify([id,eventId,type]),ownerId,name,paymentId:id,noteKey:'payment:'+id,noteNumber:sid(p.description||p.productName||id),date,type,amountCents:amount,method:sid(h.method).slice(0,120),description:sid(h.observation).slice(0,500)});
   }
   if(invalid||!Number.isSafeInteger(paidSum)||!Number.isSafeInteger(creditSum)||paidSum!==paid||creditSum!==credit||!['pago','parcial','pendente'].includes(norm(p.status))||(norm(p.status)==='pago'&&paid+credit!==total)||(norm(p.status)==='pendente'&&paid+credit!==0)||(norm(p.status)==='parcial'&&(paid+credit<=0||paid+credit>=total))){issues.push('eventos-sem-conciliacao:'+id);continue}
   events.push(...local);
  }
  // Avulsos are one financial outflow per group, not one outflow per product.
  // Require permission, original rows, a single dated transition per active line and a matching local Hub entry.
  const groupMap=new Map(),hubBySource=new Map(),hubIds=new Map();
  const hubAvailable=ctx.manualHubAllowed===true&&Array.isArray(ctx.manualGroups)&&Array.isArray(ctx.manualHub)&&ctx.manualGroups.length<=50000&&ctx.manualHub.length<=100000;
  if(hubAvailable){
   for(const g of ctx.manualGroups){const k=sid(g?.id);if(k)groupMap.set(k,groupMap.has(k)?null:g)}
   for(const h of ctx.manualHub){if(!h)continue;const id=sid(h.id),k=sid(h.sourceId);hubIds.set(id,(hubIds.get(id)||0)+1);if(h.sourceType==='faction_manual_payment'&&k){const a=hubBySource.get(k)||[];a.push(h);hubBySource.set(k,a)}}
  }
  const hubId=gid=>{let n=0;for(const ch of gid)n=(n*31+ch.charCodeAt(0))%9999999999999;return String(300000000000000+n)};
  for(const [gid,rows] of manualRows){
   if(rows.every(p=>norm(p.status)==='pendente'&&cents(p.paidAmount??0)===0))continue;
   const fail=()=>issues.push('avulso-sem-prova-de-movimento:'+gid);
   if(!hubAvailable){fail();continue}
   const g=groupMap.get(gid),hubs=hubBySource.get(gid)||[],h=hubs[0];
   const ownerId=sid(rows[0].factionMasterId),name=sid(rows[0].factionName),date=day(rows[0].paymentDate),method=sid(rows[0].paymentMethod);
   const total=cents(g?.total),ids=new Set(rows.map(p=>sid(p.id))),fromGroup=Array.isArray(g?.rows)?g.rows.filter(live):[];
   const proof=p=>JSON.stringify([sid(p.id),sid(p.manualGroupId),sid(p.factionMasterId),norm(p.factionName),norm(p.status),cents(p.value),cents(p.paidAmount),day(p.paymentDate),sid(p.paymentMethod),p.paymentHistory]);
   if(!g||norm(g.status)!=='pago'||g.dateEvidence!=='consistent'||day(g.paidDate)!==date||!ownerId||!name||!date||!method||!valid(total)||total<=0||ids.size!==rows.length||fromGroup.length!==rows.length||new Set(fromGroup.map(p=>sid(p.id))).size!==rows.length||fromGroup.some(p=>!rows.some(x=>proof(p)===proof(x)))||rows.some(p=>!sid(p.id)||counts.get(sid(p.id))!==1||sid(p.factionMasterId)!==ownerId||norm(p.factionName)!==norm(name)||norm(p.status)!=='pago'||day(p.paymentDate)!==date||sid(p.paymentMethod)!==method||!valid(cents(p.paidAmount))||!valid(cents(p.value)))){fail();continue}
   let sum=0,validTransitions=true;
   for(const p of rows){
    const history=p.paymentHistory,amount=cents(p.paidAmount);
    if(!Array.isArray(history)||history.length!==1){validTransitions=false;break}
    const e=history[0];
    if(sid(e?.id)!=='manual-paid-'+gid||e.source!=='manual-payment-v9588'||day(e.date)!==date||sid(e.method)!==method||cents(e.amount)!==amount){validTransitions=false;break}
    sum+=amount;
   }
   if(!validTransitions||!Number.isSafeInteger(sum)||sum!==total||hubs.length!==1||!live(h)||sid(h.id)!==hubId(gid)||hubIds.get(sid(h.id))!==1||norm(h.status)!=='realizado'||norm(h.flow)!=='saida'||day(h.date)!==date||sid(h.paymentMethod)!==method||norm(h.person)!==norm(name)||cents(h.value)!==total){fail();continue}
   owners.set(ownerId,{ownerId,name});
   events.push({kind:'faccao',id:JSON.stringify(['manual-group',gid,'faction-paid']),ownerId,name,paymentId:gid,noteKey:'group:'+gid,noteNumber:('Acerto avulso · '+rows.map(p=>sid(p.description||p.productName||p.id)).join(', ')).slice(0,800),date,type:'faction-paid',amountCents:total,method,description:'Total líquido do grupo vinculado a uma única saída local do Hub; ajustes já incorporados.',origin:'manual-group'});
  }
  const q=norm(filter.query),filtered=events.filter(x=>(!filter.ownerId||x.ownerId===sid(filter.ownerId))&&(!filter.from||x.date>=filter.from)&&(!filter.to||x.date<=filter.to)&&(!filter.eventType||filter.eventType==='all'||x.type===filter.eventType)&&(!q||norm([x.name,x.ownerId,x.noteKey,x.noteNumber,x.id,x.method,x.description].join(' ')).includes(q))).sort((a,b)=>b.date.localeCompare(a.date)||a.id.localeCompare(b.id));
  const totals={factionPaidCents:null,factionDiscountCents:null};
  for(const r of filtered){const k=r.type==='faction-paid'?'factionPaidCents':'factionDiscountCents';totals[k]=(totals[k]??0)+r.amountCents;if(!Number.isSafeInteger(totals[k]))return empty('unavailable')}
  if(filter.export===true&&filtered.length>5000)return empty('export-limit');
  const limit=Number.isSafeInteger(filter.limit)?Math.min(200,Math.max(1,filter.limit)):50,offset=Number.isSafeInteger(filter.offset)?Math.max(0,filter.offset):0;
  return {state:'local-events',events:filter.export===true?filtered:filtered.slice(offset,offset+limit),eventTotal:filtered.length,owners:[...owners.values()].sort((a,b)=>a.name.localeCompare(b.name,'pt-BR')||a.ownerId.localeCompare(b.ownerId)),issues:[...new Set(issues)],totals,canWrite:false,officialTotals:false};
 }
 return {inspect,noteEvents,factionEvents};
})());
