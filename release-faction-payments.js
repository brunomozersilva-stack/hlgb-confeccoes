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
if(typeof oldRenderPayments==='function')window.renderFactionPayments=function(){const r=oldRenderPayments.apply(this,arguments);setTimeout(repairPaymentWarnings,0);setTimeout(repairPaymentWarnings,120);return r};
function repair(){repairFactionButtons();repairPaymentWarnings()}
try{if(typeof hlgbAfterLogin==='function')hlgbAfterLogin(()=>{setTimeout(repair,500);setTimeout(repair,1800)},0)}catch(e){}
setTimeout(repair,1200);
window.HLGB_FACTION_PAYMENT_GUARD='v3';
window.hlgbFactionPaymentOverAccounted=overAccounted;
window.hlgbFactionPaymentBadGroup=badGroup;
console.info('[HLGB] proteção de pagamentos por entrega de facção ativa, inclusive baixa semanal agrupada');
})();
