/* HLGB — proteção consolidada de pagamentos por entrega de facção */
(function(){
'use strict';
const q=v=>Math.max(0,Number(v)||0),sid=v=>String(v??''),norm=v=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase();
function arr(n){try{return Array.isArray(db?.[n])?db[n]:[]}catch(e){return []}}
function faction(id){return arr('factions').find(f=>sid(f?.id)===sid(id))||null}
function payment(id){return arr('factionPayments').find(p=>sid(p?.id)===sid(id))||null}
function perDelivery(f){return !!(f&&f.paymentByDeliveryV9135===true)}
function activePayments(fid,input=arr('factionPayments')){return input.filter(p=>p&&sid(fid)&&sid(p.factionServiceId)===sid(fid)&&!p.manualCanceledV9590&&!['cancelado','cancelada'].includes(norm(p.status)))}
function deliveryPayment9737(p){return !p.manual&&(!p.serviceModeV9577||p.serviceModeV9577==='faccao')&&(/^(faction_delivery)(_|$)/.test(norm(p.source))||!!sid(p.deliveryId).trim())}
function overAccounted(f,input=arr('factionPayments')){
  if(!f)return null;
  const all=activePayments(f.id,input),explicit=all.some(deliveryPayment9737),byDelivery=perDelivery(f)||explicit;
  const ps=byDelivery?all.filter(p=>!p.manual&&(!p.serviceModeV9577||p.serviceModeV9577==='faccao')):all;
  const sum=ps.reduce((s,p)=>s+q(p.quantity),0),limit=byDelivery?q(f.done):Math.max(q(f.sent),q(f.done));
  const keys=new Set(),duplicates=new Set();for(const p of ps){const id=sid(p.deliveryId).trim();if(!id)continue;if(keys.has(id))duplicates.add(id);keys.add(id)}
  const invalid=byDelivery&&(ps.some(p=>p.quantity==null||sid(p.quantity).trim()===''||!Number.isSafeInteger(Number(p.quantity))||Number(p.quantity)<=0)||f.done==null||sid(f.done).trim()===''||!Number.isSafeInteger(Number(f.done))||Number(f.done)<0);
  const reason=byDelivery&&duplicates.size?'duplicate-delivery':invalid?'invalid-quantity':(byDelivery?sum>limit:ps.length>1&&sum>limit)?'excess-quantity':'';
  return reason?{payments:ps,sum,limit,sent:q(f.sent),done:q(f.done),excess:Math.max(0,sum-limit),reason,duplicateDeliveryIds:[...duplicates],byDelivery}:null;
}
function usesDelivery9739(f){return perDelivery(f)||activePayments(f?.id).some(deliveryPayment9737)}
function badReason9737(b){return b.reason==='duplicate-delivery'?'A mesma entrega aparece em mais de um pagamento.':b.reason==='invalid-quantity'?'Quantidade entregue ou contabilizada inválida.':'Quantidade em pagamentos superior ao '+(b.byDelivery?'total efetivamente entregue.':'limite do envio.');}
function weekKey(p){
  // A baixa agrupada usa a semana explicitamente escolhida antes da data.
  if(p?.scheduledPaymentWeek)return sid(p.scheduledPaymentWeek);
  const ds=sid(p?.scheduledPaymentDate||p?.serviceFinishedAt).slice(0,10);if(!ds)return 'SEM-DATA';
  const d=new Date(ds+'T12:00:00'),tmp=new Date(d);tmp.setHours(0,0,0,0);tmp.setDate(tmp.getDate()+3-((tmp.getDay()+6)%7));const w1=new Date(tmp.getFullYear(),0,4),wk=1+Math.round(((tmp-w1)/86400000-3+((w1.getDay()+6)%7))/7);return `${tmp.getFullYear()}-W${String(wk).padStart(2,'0')}`;
}
function paymentGroupKey(p){const name=sid(p?.factionName||'Sem facção').trim()||'Sem facção';return norm(name)+'||'+weekKey(p)}
function badGroup(key){
  const rows=arr('factionPayments').filter(p=>p&&paymentGroupKey(p)===sid(key)&&!['cancelado','cancelada'].includes(norm(p.status))),issues=[];
  const seen=new Set();for(const p of rows){const f=faction(p.factionServiceId);if(!f||seen.has(sid(f.id)))continue;seen.add(sid(f.id));const bad=overAccounted(f);if(bad)issues.push({faction:f,bad})}
  return issues.length?{key:sid(key),rows,issues}:null;
}

/* A rotina legada usa f.done (acumulado). Em facções com pagamento por entrega ela não pode tocar nos pagamentos. */
const oldSync=window.syncFactionPayments;
if(typeof oldSync==='function'&&!oldSync.__hlgbPaymentDeliveryGuard){
  const guarded=function(){
    const protectedRows=arr('factions').filter(usesDelivery9739),flags=protectedRows.map(f=>[f,f.paymentSeparated]);
    protectedRows.forEach(f=>{f.paymentSeparated=false});
    try{return oldSync.apply(this,arguments)}finally{flags.forEach(([f,v])=>{f.paymentSeparated=v})}
  };
  guarded.__hlgbPaymentDeliveryGuard=true;window.syncFactionPayments=guarded;
}

/* Uma facção cujo pagamento já nasce a cada entrega não deve voltar para a separação antiga. */
const oldSeparate=window.separateFactionForPayment;
window.separateFactionForPayment=function(id){
  const f=faction(id);
  if(usesDelivery9739(f)){
    alert('Esta facção usa pagamento por entrega. Os pagamentos já são criados quando cada entrega é registrada; não use a separação antiga.');
    return false;
  }
  return typeof oldSeparate==='function'?oldSeparate.apply(this,arguments):false;
};

/* Nunca permitir dar baixa individual quando a soma das quantidades de pagamentos supera o próprio envio da facção. */
const oldPay=window.payFactionPayment;
window.payFactionPayment=function(id){
  const p=payment(id),f=p?faction(p.factionServiceId):null,bad=f?overAccounted(f):null;
  if(bad){
    alert('Pagamento bloqueado por segurança. Esta facção possui '+bad.sum.toLocaleString('pt-BR')+' peças distribuídas em pagamentos, mas o envio é de '+bad.sent.toLocaleString('pt-BR')+' peças e o entregue é '+bad.done.toLocaleString('pt-BR')+'. '+badReason9737(bad)+' Revise os lançamentos antes de dar baixa.');
    return false;
  }
  return typeof oldPay==='function'?oldPay.apply(this,arguments):false;
};

/* A tela atual usa a baixa semanal agrupada; ela precisa da mesma trava do pagamento individual. */
const oldGroupPay=window.hlgbPayFactionGroup9230;
if(typeof oldGroupPay==='function')window.hlgbPayFactionGroup9230=function(key){
  const issue=badGroup(key);
  if(issue){
    const first=issue.issues[0].bad;
    alert('Acerto bloqueado por segurança. Há pagamento inconsistente neste grupo: '+first.sum.toLocaleString('pt-BR')+' peças em pagamentos para '+first.sent.toLocaleString('pt-BR')+' peças enviadas. '+badReason9737(first)+' Confira os registros antes de abrir a baixa semanal.');
    return false;
  }
  return oldGroupPay.apply(this,arguments);
};

function idFromRow(tr){
  for(const b of tr?.querySelectorAll?.('button[onclick]')||[]){
    const s=String(b.getAttribute('onclick')||''),m=s.match(/(?:editFaction|separateFactionForPayment)\((\d+)\)/);if(m&&faction(m[1]))return m[1];
  }
  return null;
}
function repairFactionButtons(){
  const root=document.getElementById('factionTable');if(!root)return;
  root.querySelectorAll('tbody tr').forEach(tr=>{
    const id=idFromRow(tr),f=faction(id);if(!perDelivery(f))return;
    tr.querySelectorAll('button[onclick]').forEach(b=>{if(/separateFactionForPayment\(/.test(String(b.getAttribute('onclick')||''))){b.disabled=true;b.classList.remove('primary');b.classList.add('secondary');b.textContent='Pagamento por entrega';b.title='Os pagamentos desta facção são criados a cada entrega registrada.'}});
  });
}
function groupedKeyFromButton(b){
  const s=String(b?.getAttribute?.('onclick')||''),m=s.match(/hlgbPayFactionGroup9230\((.+)\)/);if(!m)return '';
  try{return sid(JSON.parse(m[1]))}catch(e){return m[1].replace(/^['\"]|['\"]$/g,'')}
}
function repairPaymentWarnings(){
  const root=document.getElementById('factionPaymentTable');if(!root)return;
  root.querySelectorAll('tbody tr').forEach(tr=>{
    tr.querySelectorAll('.hlgb-payment-warning').forEach(x=>x.remove());
    const groupBtn=[...tr.querySelectorAll('button[onclick]')].find(b=>/hlgbPayFactionGroup9230\(/.test(String(b.getAttribute('onclick')||'')));
    if(groupBtn){const key=groupedKeyFromButton(groupBtn),issue=badGroup(key);if(!issue)return;groupBtn.disabled=true;groupBtn.classList.remove('primary');groupBtn.classList.add('secondary');groupBtn.textContent='Bloqueado — revisar';groupBtn.title=badReason9737(issue.issues[0].bad);const cell=tr.children?.[1]||tr.firstElementChild;if(cell){const w=document.createElement('div');w.className='badge warn hlgb-payment-warning';w.style.marginTop='4px';w.textContent='⚠ '+badReason9737(issue.issues[0].bad);cell.appendChild(w)}return}
    const btn=[...tr.querySelectorAll('button[onclick]')].find(b=>/payFactionPayment\((\d+)\)/.test(String(b.getAttribute('onclick')||''))||/editFactionPayment\((\d+)\)/.test(String(b.getAttribute('onclick')||'')));
    if(!btn)return;const m=String(btn.getAttribute('onclick')||'').match(/(?:payFactionPayment|editFactionPayment)\((\d+)\)/),p=m?payment(m[1]):null,f=p?faction(p.factionServiceId):null,bad=f?overAccounted(f):null;
    if(!bad)return;
    const cell=tr.children?.[1]||tr.firstElementChild;if(cell){const w=document.createElement('div');w.className='badge warn hlgb-payment-warning';w.style.marginTop='4px';w.textContent='⚠ Revisar: '+badReason9737(bad);cell.appendChild(w)}
  });
}
const oldRenderFactions=window.renderFactions;
if(typeof oldRenderFactions==='function')window.renderFactions=function(){const r=oldRenderFactions.apply(this,arguments);setTimeout(repairFactionButtons,0);setTimeout(repairFactionButtons,120);return r};
const oldRenderPayments=window.renderFactionPayments;
if(typeof oldRenderPayments==='function')window.renderFactionPayments=function(){const r=oldRenderPayments.apply(this,arguments);setTimeout(()=>{repairPaymentWarnings();renderTravetaReview9781()},0);setTimeout(()=>{repairPaymentWarnings();renderTravetaReview9781()},120);return r};
/* Normal service payments: prospective discount review, never a payment edit. */
function normalTravetaReview9781(data,allowed){
 const result={state:allowed===true?'local-review':'forbidden',rows:[],canWrite:false,financiallyApplied:false};
 if(allowed!==true)return result;
 const modules=['factionPayments','factions','production','factionMasters','products','factionSettings'];
 if(!data||modules.some(k=>!Array.isArray(data[k])))return {...result,state:'source-unavailable'};
 const live=x=>x&&!x.deleted_at&&!x.deletedAt&&x.deleted!==true&&!x._deleted&&!x.manualCanceledV9590&&!/cancelad|excluid/.test(norm(x.status));
 const exact=(rows,id)=>{const xs=rows.filter(x=>live(x)&&sid(x.id)===sid(id));return sid(id)&&xs.length===1?xs[0]:null};
 const cents=v=>{if(typeof v!=='number'&&!(typeof v==='string'&&/^\d+(?:[.,]\d{1,2})?$/.test(v.trim())))return null;const n=Number(sid(v).replace(',','.')),k=Math.round(n*100);return Number.isSafeInteger(k)&&n>=0&&Math.abs(n*100-k)<.00001?k:null};
 const int=v=>v!=null&&sid(v).trim()!==''&&Number.isSafeInteger(Number(v))&&Number(v)>=0?Number(v):null;
 const payments=data.factionPayments.filter(p=>live(p)&&p.manual!==true&&['pendente','parcial'].includes(norm(p.status))&&(!p.serviceModeV9577||p.serviceModeV9577==='faccao'));
 if(payments.length>5000)return {...result,state:'source-limit'};
 for(const p of payments){
  const row={id:sid(p.id),serviceId:sid(p.factionServiceId),model:sid(p.productName||p.description||'Modelo a conferir'),faction:sid(p.factionName||'Facção a conferir'),quantity:int(p.quantity),points:null,rateCents:null,grossCents:cents(p.value),existingDiscountCents:cents(p.discountAmount),suggestedCents:null,netCents:null,recordedPricingCents:null,recordedUnitDiscountCents:null,pricingSource:null,reason:''};
  const add=reason=>{row.reason=reason;result.rows.push(row)};
  if(!exact(data.factionPayments,p.id)){add('Identidade do pagamento a conferir');continue}
  const f=exact(data.factions,p.factionServiceId),prod=f&&exact(data.production,f.productionId);
  if(!f||!prod||!sid(f.orderId)||!sid(f.productId)||sid(f.orderId)!==sid(prod.orderId)||sid(f.productId)!==sid(prod.productId)){add('Vínculo serviço/produção a conferir');continue}
  if(p.productId!=null&&sid(p.productId)&&sid(p.productId)!==sid(f.productId)){add('Modelo do pagamento divergente');continue}
  const masterIds=new Set([p.factionMasterId,f.factionId,prod.factionId].map(sid).filter(Boolean));
  if(masterIds.size!==1){add('Identidade da facção a conferir');continue}
  const m=exact(data.factionMasters,[...masterIds][0]),model=exact(data.products,f.productId);
  if(!m||m.active===false||!model){add('Cadastro de facção ou modelo não confirmado');continue}
  row.faction=sid(m.name);row.model=sid(model.name);
  if(p.factionName&&norm(p.factionName)!==norm(m.name)){add('Nome do pagamento diverge do cadastro atual');continue}
  if(row.quantity===null||row.quantity<=0||row.grossCents===null||row.grossCents<=0||cents(p.unitPrice)===null||cents(p.unitPrice)*row.quantity!==row.grossCents){add('Valor bruto ou quantidade a conferir');continue}
  if(row.existingDiscountCents===null||row.existingDiscountCents!==0||cents(p.paidAmount)!==0||norm(p.status)!=='pendente'||p.paymentHistory!=null&&(!Array.isArray(p.paymentHistory)||p.paymentHistory.length)||p.travetaDiscountTotalV9577!=null||p.grossValueV9577!=null){add('Pagamento ou abatimento existente: preservar e revisar');continue}
  const servicePayments=data.factionPayments.filter(x=>live(x)&&x.manual!==true&&sid(x.factionServiceId)===sid(f.id)&&(!x.serviceModeV9577||x.serviceModeV9577==='faccao'));
  const quantities=servicePayments.map(x=>int(x.quantity)),ids=new Set(servicePayments.map(x=>sid(x.id))),deliveryKeys=servicePayments.map(x=>sid(x.deliveryId)).filter(Boolean);
  if(quantities.some(n=>n===null||n<=0)||ids.has('')||ids.size!==servicePayments.length||new Set(deliveryKeys).size!==deliveryKeys.length||int(f.done)===null||quantities.reduce((a,b)=>a+b,0)>int(f.done)){add('Quantidade entregue ou pagamentos do serviço a conferir');continue}
  // Stored service pricing is already the net labor rate in the delivery flow.
  // Never treat a net title as gross and subtract the current catalog rate again.
  const snapshotFields=['baseUnitPrice','payableUnitPrice','travetaDeductionUnit','travetaPricingVersion','travetaPricingUpdatedAt','travetaPointsPerPieceV9592','travetaPricePerPointV9592','travetaDiscountOriginV9592'];
  if(snapshotFields.some(k=>f[k]!=null&&sid(f[k]).trim()!=='')){
   const base=cents(f.baseUnitPrice),net=cents(f.payableUnitPrice),discount=cents(f.travetaDeductionUnit),servicePrice=cents(f.price);
   if(!sid(f.travetaPricingVersion)||typeof f.doesTraveta!=='boolean'||[base,net,discount,servicePrice].some(v=>v===null)||base<=0||net<=0||base-discount!==net||net!==servicePrice||f.doesTraveta&&discount!==0||cents(p.unitPrice)!==net||!Number.isSafeInteger(base*row.quantity)||!Number.isSafeInteger(discount*row.quantity)){
    add('Preço histórico da alocação ou título divergente: não aplicar novo desconto');continue;
   }
   row.pricingSource='service-snapshot';row.recordedPricingCents=base*row.quantity;row.recordedUnitDiscountCents=discount;
   row.grossCents=base*row.quantity;row.netCents=net*row.quantity;row.suggestedCents=0;
   row.points=int(f.travetaPointsPerPieceV9592);row.rateCents=cents(f.travetaPricePerPointV9592);
   add('Valor líquido histórico já está no título. Não descontar novamente; cadastro atual não altera este preço.');continue;
  }
  row.points=int(model.travetadas);
  if(typeof m.doesTraveta!=='boolean'){add('Definir no cadastro se a facção faz travetada');continue}
  if(m.doesTraveta===true){row.suggestedCents=0;row.netCents=row.grossCents;add('Facção faz travetada');continue}
  if(row.points===null||row.points>100){add('Quantidade de pontos do modelo a conferir');continue}
  if(row.points===0){row.suggestedCents=0;row.netCents=row.grossCents;add('Modelo sem pontos cadastrados (zero explícito)');continue}
  const setting=exact(data.factionSettings,'traveta'),raw=m.travetaDeductionUnit!=null&&sid(m.travetaDeductionUnit).trim()!==''?m.travetaDeductionUnit:setting?.travetaUnitValue;
  row.rateCents=cents(raw);
  if(row.rateCents===null||row.rateCents>100000){add('Tarifa por ponto a conferir');continue}
  const total=row.quantity*row.points*row.rateCents;
  if(!Number.isSafeInteger(total)||total>row.grossCents){add('Desconto supera valor bruto ou limite seguro');continue}
  row.suggestedCents=total;row.netCents=row.grossCents-total;add('Simulação com cadastro atual; confirmar regra do período');
 }
 return result;
}
function travetaReviewAllowed9781(){try{return window.__HLGB_AUTH_READY===true&&typeof canOpenPage==='function'&&['pagamentosFaccoes','faccoes','produtos','producao'].every(k=>canOpenPage(k)===true)}catch(_){return false}}
function renderTravetaReview9781(){
 const old=document.getElementById('hlgbNormalTraveta9781'),table=document.getElementById('factionPaymentTable');
 if(!table||!travetaReviewAllowed9781()){old?.remove();return}
 const data={};for(const k of ['factionPayments','factions','production','factionMasters','products','factionSettings'])data[k]=arr(k);
 const review=normalTravetaReview9781(data,true),sig=JSON.stringify(review);
 if(old?.__signature9781===sig)return;
 const host=old||document.createElement('details');host.id='hlgbNormalTraveta9781';host.className='panel';host.__signature9781=sig;
 if(!old)table.insertAdjacentElement('afterend',host);
 host.replaceChildren();const el=(tag,t,p=host)=>{const n=document.createElement(tag);n.textContent=t;p.appendChild(n);return n},money=v=>v===null?'A conferir':(v/100).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
 el('summary','Conferir travetadas nos acertos normais ('+review.rows.length+')');
 el('p','Somente simulação do cadastro atual. Não altera valores anteriores, não confirma desconto nem autoriza pagamento. Configure facção/modelo antes da próxima baixa.');
 if(review.state!=='local-review'){el('p','Consulta indisponível. Confira a sincronização.');return}
 const output=el('div','');let offset=0;
 function draw(){output.replaceChildren();for(const row of review.rows.slice(offset,offset+20)){const d=el('details','',output);el('summary',row.faction+' · '+row.model+' · '+(row.quantity??'—')+' pç',d);el('p',row.reason,d);el('p','Bruto '+money(row.grossCents)+' · desconto registrado no título '+money(row.existingDiscountCents)+(row.pricingSource==='service-snapshot'?' · desconto já embutido por peça '+money(row.recordedUnitDiscountCents)+' · desconto adicional '+money(row.suggestedCents)+' · líquido do título '+money(row.netCents):' · simulação '+money(row.suggestedCents)+' · líquido simulado '+money(row.netCents)),d);el('p','Pagamento '+row.id+' · Serviço '+row.serviceId+' · pontos por peça '+(row.points??'A conferir')+' · tarifa '+money(row.rateCents),d)}
 for(const [label,step] of [['Anterior',-20],['Próximos',20]])if(step<0?offset>0:offset+20<review.rows.length){const b=el('button',label,output);b.type='button';b.onclick=()=>{if(!travetaReviewAllowed9781()){host.remove();return}offset+=step;draw()}}}
 draw();
}
function repair(){repairFactionButtons();repairPaymentWarnings();renderTravetaReview9781()}
try{if(typeof hlgbAfterLogin==='function')hlgbAfterLogin(()=>{setTimeout(repair,500);setTimeout(repair,1800)},0)}catch(e){}
setTimeout(repair,1200);
window.addEventListener?.('hlgb:logout',()=>document.getElementById('hlgbNormalTraveta9781')?.remove());
window.hlgbNormalTravetaReview9781=normalTravetaReview9781;
window.HLGB_FACTION_PAYMENT_GUARD='v3';
window.hlgbFactionPaymentOverAccounted=overAccounted;
window.hlgbFactionPaymentBadGroup=badGroup;
console.info('[HLGB] proteção de pagamentos por entrega de facção ativa, inclusive baixa semanal agrupada');
})();
