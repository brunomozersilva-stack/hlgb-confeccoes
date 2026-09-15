/* HLGB — proteção consolidada de pagamentos por entrega de facção */
(function(){
'use strict';
const q=v=>Math.max(0,Number(v)||0),sid=v=>String(v??''),norm=v=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase();
function arr(n){try{return Array.isArray(db?.[n])?db[n]:[]}catch(e){return []}}
function faction(id){return arr('factions').find(f=>sid(f?.id)===sid(id))||null}
function payment(id){return arr('factionPayments').find(p=>sid(p?.id)===sid(id))||null}
function perDelivery(f){return !!(f&&f.paymentByDeliveryV9135===true)}
function activePayments(fid){return arr('factionPayments').filter(p=>p&&sid(p.factionServiceId)===sid(fid)&&!['cancelado','cancelada'].includes(norm(p.status)))}
function overAccounted(f){
  if(!f)return null;
  const ps=activePayments(f.id),sum=ps.reduce((s,p)=>s+q(p.quantity),0),limit=Math.max(q(f.sent),q(f.done));
  return ps.length>1&&sum>limit?{payments:ps,sum,limit,sent:q(f.sent),done:q(f.done),excess:sum-limit}:null;
}

/* A rotina legada usa f.done (acumulado). Em facções com pagamento por entrega ela não pode tocar nos pagamentos. */
const oldSync=window.syncFactionPayments;
if(typeof oldSync==='function'&&!oldSync.__hlgbPaymentDeliveryGuard){
  const guarded=function(){
    const protectedRows=arr('factions').filter(perDelivery),flags=protectedRows.map(f=>[f,f.paymentSeparated]);
    protectedRows.forEach(f=>{f.paymentSeparated=false});
    try{return oldSync.apply(this,arguments)}finally{flags.forEach(([f,v])=>{f.paymentSeparated=v})}
  };
  guarded.__hlgbPaymentDeliveryGuard=true;window.syncFactionPayments=guarded;
}

/* Uma facção cujo pagamento já nasce a cada entrega não deve voltar para a separação antiga. */
const oldSeparate=window.separateFactionForPayment;
window.separateFactionForPayment=function(id){
  const f=faction(id);
  if(perDelivery(f)){
    alert('Esta facção usa pagamento por entrega. Os pagamentos já são criados quando cada entrega é registrada; não use a separação antiga.');
    return false;
  }
  return typeof oldSeparate==='function'?oldSeparate.apply(this,arguments):false;
};

/* Nunca permitir dar baixa quando a soma das quantidades de pagamentos supera o próprio envio da facção. */
const oldPay=window.payFactionPayment;
window.payFactionPayment=function(id){
  const p=payment(id),f=p?faction(p.factionServiceId):null,bad=f?overAccounted(f):null;
  if(bad){
    alert('Pagamento bloqueado por segurança. Esta facção possui '+bad.sum.toLocaleString('pt-BR')+' peças distribuídas em pagamentos, mas o envio é de '+bad.sent.toLocaleString('pt-BR')+' peças e o entregue é '+bad.done.toLocaleString('pt-BR')+'. Revise os lançamentos antes de dar baixa.');
    return false;
  }
  return typeof oldPay==='function'?oldPay.apply(this,arguments):false;
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
function repairPaymentWarnings(){
  const root=document.getElementById('factionPaymentTable');if(!root)return;
  root.querySelectorAll('tbody tr').forEach(tr=>{
    const btn=[...tr.querySelectorAll('button[onclick]')].find(b=>/payFactionPayment\((\d+)\)/.test(String(b.getAttribute('onclick')||''))||/editFactionPayment\((\d+)\)/.test(String(b.getAttribute('onclick')||'')));
    if(!btn)return;const m=String(btn.getAttribute('onclick')||'').match(/(?:payFactionPayment|editFactionPayment)\((\d+)\)/),p=m?payment(m[1]):null,f=p?faction(p.factionServiceId):null,bad=f?overAccounted(f):null;
    tr.querySelectorAll('.hlgb-payment-warning').forEach(x=>x.remove());
    if(!bad)return;
    const cell=tr.children?.[1]||tr.firstElementChild;if(cell){const w=document.createElement('div');w.className='badge warn hlgb-payment-warning';w.style.marginTop='4px';w.textContent='⚠ Revisar: soma de pagamentos excede o envio';cell.appendChild(w)}
  });
}
const oldRenderFactions=window.renderFactions;
if(typeof oldRenderFactions==='function')window.renderFactions=function(){const r=oldRenderFactions.apply(this,arguments);setTimeout(repairFactionButtons,0);setTimeout(repairFactionButtons,120);return r};
const oldRenderPayments=window.renderFactionPayments;
if(typeof oldRenderPayments==='function')window.renderFactionPayments=function(){const r=oldRenderPayments.apply(this,arguments);setTimeout(repairPaymentWarnings,0);setTimeout(repairPaymentWarnings,120);return r};
function repair(){repairFactionButtons();repairPaymentWarnings()}
try{if(typeof hlgbAfterLogin==='function')hlgbAfterLogin(()=>{setTimeout(repair,500);setTimeout(repair,1800)},0)}catch(e){}
setTimeout(repair,1200);
window.HLGB_FACTION_PAYMENT_GUARD='v1';
window.hlgbFactionPaymentOverAccounted=overAccounted;
console.info('[HLGB] proteção de pagamentos por entrega de facção ativa');
})();
