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
  const serviceLine=p=>({id:sid(p.id),description:sid(p.description||p.manualProductNameV9589||p.productName||'Serviço').slice(0,180),quantity:p.quantity!==null&&p.quantity!==undefined&&sid(p.quantity)!==''&&Number.isSafeInteger(Number(p.quantity))&&Number(p.quantity)>=0?Number(p.quantity):null,unitPriceCents:cents(p.unitPrice),serviceCents:cents(p.value),paidCents:cents(p.paidAmount),travetaCents:cents(p.travetaDiscountTotalV9577),note:sid(p.manualLineNoteV9566||'').slice(0,500)});
  const proofLine=p=>JSON.stringify([sid(p.id),sid(p.factionMasterId),sid(p.manualGroupId),p.manual===true,cents(p.value),cents(p.paidAmount),day(p.paymentDate),norm(p.status)]);
  if(ctx.factionsAllowed===true){
   if(!Array.isArray(ctx.payments)||!Array.isArray(ctx.manualGroups))issues.push('faccoes-fonte-incompleta');
   else{
    const counts=new Map(),groupCounts=new Map(),manual=new Set();
    for(const p of ctx.payments.filter(live)){const k=sid(p.id);counts.set(k,(counts.get(k)||0)+1);if(p.manual)manual.add(sid(p.manualGroupId))}
    for(const g of ctx.manualGroups){const k=sid(g?.id);groupCounts.set(k,(groupCounts.get(k)||0)+1)}
    for(const g of ctx.manualGroups){
     const gid=sid(g?.id);if(!gid||groupCounts.get(gid)!==1){issues.push('grupo-duplicado-ou-sem-id');continue}
     const items=Array.isArray(g.rows)?g.rows.filter(live):[],current=ctx.payments.filter(p=>live(p)&&p.manual&&sid(p.manualGroupId)===gid);
     if(!items.length){if(current.length)issues.push('grupo-sem-linhas:'+gid);continue}
     const ids=items.map(x=>sid(x.id)),owners=new Set(items.map(x=>sid(x.factionMasterId)));
     if(ids.some(k=>!k||counts.get(k)!==1)||new Set(ids).size!==ids.length||current.length!==items.length||current.some(p=>!ids.includes(sid(p.id)))||items.some(x=>sid(x.manualGroupId)!==gid||!x.manual||!current.some(p=>proofLine(p)===proofLine(x)))||owners.size!==1||owners.has('')){issues.push('grupo-sem-prova:'+gid);continue}
     const amounts=items.map(x=>cents(x.paidAmount)),total=cents(g.total),paid=amounts.every(valid)?amounts.reduce((s,x)=>s+x,0):null;
     const status=norm(g.status),dates=new Set(items.map(x=>day(x.paymentDate)));
     if(!valid(total)||!valid(paid)||!['pago','pendente'].includes(status)||status==='pago'&&(paid!==total||dates.size!==1||dates.has(null))||status==='pendente'&&paid!==0){issues.push('grupo-requer-conferencia:'+gid);continue}
     add(row('faccao','group:'+gid,[...owners][0],sid(g.factionName),day(g.date),total,paid,0,ids,!!g.receipt,sid(g.status),{dateBasis:status==='pago'?'payment':'scheduled',details:current.map(serviceLine),netOfAdjustments:true,nominalCents:cents(g.nominal)}));
     manual.delete(gid);
    }
    if(manual.size)issues.push('grupos-avulsos-sem-conciliacao:'+manual.size);
    for(const p of ctx.payments.filter(live)){
     if(p.manual)continue;const id=sid(p.id),total=cents(p.value),paid=cents(p.paidAmount);
     if(!id||counts.get(id)!==1||!valid(total)||!valid(paid)||paid>total){issues.push('pagamento-revisar:'+id);continue}
     add(row('faccao','payment:'+id,sid(p.factionMasterId),sid(p.factionName),day(p.paymentDate||p.scheduledPaymentDate||p.serviceFinishedAt||p.date),total,paid,0,[id],!!p.receiptPdfV9566,sid(p.status),{dateBasis:p.paymentDate?'payment':p.scheduledPaymentDate?'scheduled':p.serviceFinishedAt?'service':'record',details:[serviceLine(p)]}));
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
 return {inspect};
})());
