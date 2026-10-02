/* HLGB — ajustes visuais: pagamentos de facção e tabela de produtos */
(function(){
'use strict';
const V='2026.10.01-night-ui-v1';
const sid=v=>String(v??''),q=v=>Math.max(0,Number(v)||0),norm=v=>sid(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
const escSafe=v=>typeof esc==='function'?esc(v):sid(v).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const moneySafe=v=>typeof money==='function'?money(v):Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const fmtSafe=v=>{try{return typeof fmtDate==='function'?fmtDate(v):sid(v)}catch(e){return sid(v)}};
function arr(n){try{return Array.isArray(db?.[n])?db[n]:[]}catch(e){return []}}
function localToday(){const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')}
function payDate(p){return sid(p?.serviceFinishedAt||p?.paymentDate||'').slice(0,10)}
function inRange(p,start,end){const d=payDate(p);if(!d)return false;if(start&&d<start)return false;if(end&&d>end)return false;return true}
function fpSelected(){
 const page=document.getElementById('pagamentosFaccoes');
 const start=document.getElementById('fpPeriodStart')?.value||'',end=document.getElementById('fpPeriodEnd')?.value||'';
 return !!(start||end||page?.dataset?.hlgbFpExplicitAll==='1');
}
function blankFactionPayments(){
 const label=document.getElementById('factionPaymentPeriodLabel');if(label)label.innerHTML='<b>Selecione um período para consultar os pagamentos.</b>';
 for(const id of ['factionPaymentCards','factionPaymentWeeklySummary','factionPaymentSummary','factionPaymentTable']){
  const el=document.getElementById(id);if(el)el.innerHTML=id==='factionPaymentTable'?'<div class="empty">Escolha uma semana, mês ou período para carregar os lançamentos.</div>':'';
 }
}
function actionButtons(p){
 const n=Number(p?.id);if(!Number.isFinite(n))return '';
 if(norm(p?.status)==='pago')return '<button type="button" class="secondary" onclick="editFactionPayment('+n+')">Ver / editar</button> <button type="button" class="secondary" onclick="reopenFactionPayment('+n+')">Reabrir</button>';
 return '<button type="button" class="primary" onclick="payFactionPayment('+n+')">Dar baixa</button> <button type="button" class="secondary" onclick="editFactionPayment('+n+')">Editar</button>';
}
function rowHtml(p){
 const rem=Math.max(0,q(p?.value)-q(p?.discountAmount)-q(p?.paidAmount));
 return '<tr><td>'+fmtSafe(payDate(p))+'</td><td><b>'+escSafe(p?.factionName||'-')+'</b></td><td>'+escSafe(p?.description||'-')+'</td><td>'+q(p?.quantity).toLocaleString('pt-BR')+'</td><td>'+moneySafe(p?.value)+'</td><td>'+moneySafe(rem)+'</td><td>'+escSafe(p?.pix||'-')+'</td><td>'+actionButtons(p)+'</td></tr>';
}
function tableHtml(rows,empty){
 if(!rows.length)return '<div class="empty">'+escSafe(empty)+'</div>';
 return '<div class="hlgb-fp-scroll"><table><thead><tr><th>Finalizado</th><th>Facção</th><th>Modelo / serviço</th><th>Peças</th><th>Valor</th><th>Saldo</th><th>PIX</th><th>Ações</th></tr></thead><tbody>'+rows.map(rowHtml).join('')+'</tbody></table></div>';
}
function reorganizeFactionPayments(){
 if(!fpSelected()){blankFactionPayments();return}
 const box=document.getElementById('factionPaymentTable');if(!box)return;
 const start=document.getElementById('fpPeriodStart')?.value||'',end=document.getElementById('fpPeriodEnd')?.value||'',today=localToday();
 const period=arr('factionPayments').filter(p=>inRange(p,start,end));
 const pending=period.filter(p=>norm(p.status)!=='pago'&&(!sid(p.scheduledPaymentDate).slice(0,10)||sid(p.scheduledPaymentDate).slice(0,10)<=today));
 const future=arr('factionPayments').filter(p=>norm(p.status)!=='pago'&&sid(p.scheduledPaymentDate).slice(0,10)>today).sort((a,b)=>sid(a.scheduledPaymentDate).localeCompare(sid(b.scheduledPaymentDate)));
 const paid=period.filter(p=>norm(p.status)==='pago').sort((a,b)=>sid(b.paymentDate||b.serviceFinishedAt).localeCompare(sid(a.paymentDate||a.serviceFinishedAt)));
 box.innerHTML=
  '<div class="hlgb-fp-section"><h3>💳 Pendentes do período</h3><div class="sub">Ao dar baixa, o lançamento sai daqui automaticamente e entra no histórico.</div>'+tableHtml(pending,'Nenhum pagamento pendente neste período.')+'</div>'+
  '<div class="hlgb-fp-section"><h3>📅 Pagamentos futuros</h3><div class="sub">Lançamentos ainda não vencidos ficam separados da lista de pagamentos da semana.</div>'+tableHtml(future.slice(0,100),'Nenhum pagamento futuro programado.')+'</div>'+
  '<details class="hlgb-fp-section hlgb-fp-history"><summary><b>🗂️ Histórico pago do período ('+paid.length+')</b></summary><div class="sub" style="margin:8px 0">Pagamentos já finalizados ficam guardados aqui sem poluir a lista de pendentes.</div>'+tableHtml(paid,'Nenhum pagamento realizado neste período.')+'</details>';
}
function ensureFactionControls(){
 const page=document.getElementById('pagamentosFaccoes');if(!page)return;
 if(page.dataset.hlgbFpInit!=='1'){
  page.dataset.hlgbFpInit='1';page.dataset.hlgbFpExplicitAll='0';
  const s=document.getElementById('fpPeriodStart'),e=document.getElementById('fpPeriodEnd');if(s)s.value='';if(e)e.value='';
 }
 const toolbar=document.getElementById('fpPeriodStart')?.closest('.toolbar');
 if(toolbar&&!document.getElementById('hlgbFpClearPeriod')){
  const b=document.createElement('button');b.type='button';b.id='hlgbFpClearPeriod';b.className='secondary';b.textContent='Limpar período';b.onclick=()=>{const s=document.getElementById('fpPeriodStart'),e=document.getElementById('fpPeriodEnd');if(s)s.value='';if(e)e.value='';page.dataset.hlgbFpExplicitAll='0';blankFactionPayments()};toolbar.appendChild(b);
 }
}
const oldSet=window.setFactionPaymentPeriod;
if(typeof oldSet==='function'&&!oldSet.__hlgbNightV1){
 const w=function(mode){ensureFactionControls();const page=document.getElementById('pagamentosFaccoes');if(page)page.dataset.hlgbFpExplicitAll=mode==='all'?'1':'0';const r=oldSet.apply(this,arguments);setTimeout(reorganizeFactionPayments,0);return r};w.__hlgbNightV1=true;w.__original=oldSet;window.setFactionPaymentPeriod=w;
}
const oldRenderFp=window.renderFactionPayments;
if(typeof oldRenderFp==='function'&&!oldRenderFp.__hlgbNightV1){
 const w=function(){
  ensureFactionControls();
  if(!fpSelected()){blankFactionPayments();return}
  const r=oldRenderFp.apply(this,arguments);setTimeout(reorganizeFactionPayments,0);setTimeout(reorganizeFactionPayments,120);return r;
 };w.__hlgbNightV1=true;w.__original=oldRenderFp;window.renderFactionPayments=w;
}
function injectProductCss(){
 if(document.getElementById('hlgbProductCompactStyle'))return;
 const s=document.createElement('style');s.id='hlgbProductCompactStyle';
 s.textContent='#productTable{overflow-x:auto}#productTable table{min-width:1180px}#productTable th,#productTable td{padding:6px 8px!important;vertical-align:middle!important;line-height:1.25}#productTable tbody tr{height:auto!important}#productTable td:last-child{min-width:250px}#productTable .hlgb-product-actions{display:flex;gap:4px;flex-wrap:wrap;align-items:center}#productTable .hlgb-product-actions button{padding:5px 7px!important;font-size:11px!important;line-height:1.15!important;margin:0!important;white-space:nowrap}#productTable td:nth-child(5),#productTable td:nth-child(6){max-width:170px;white-space:normal}';
 document.head.appendChild(s);
}
function compactProducts(){
 injectProductCss();const root=document.getElementById('productTable');if(!root)return;
 root.querySelectorAll('tbody tr').forEach(tr=>{const td=tr.lastElementChild;if(!td||td.querySelector('.hlgb-product-actions'))return;const wrap=document.createElement('div');wrap.className='hlgb-product-actions';while(td.firstChild)wrap.appendChild(td.firstChild);td.appendChild(wrap)});
}
const oldProducts=window.renderProducts;
if(typeof oldProducts==='function'&&!oldProducts.__hlgbCompactV1){
 const w=function(){const r=oldProducts.apply(this,arguments);setTimeout(compactProducts,0);setTimeout(compactProducts,80);return r};w.__hlgbCompactV1=true;w.__original=oldProducts;window.renderProducts=w;
}
function boot(){ensureFactionControls();blankFactionPayments();compactProducts()}
try{if(typeof hlgbAfterLogin==='function')hlgbAfterLogin(()=>setTimeout(boot,900),0)}catch(e){}
setTimeout(boot,1800);
window.hlgbNightUi={fpSelected,reorganizeFactionPayments,blankFactionPayments,compactProducts};
window.HLGB_NIGHT_UI_GUARD=V;
console.info('[HLGB] pagamentos de facção por período + produtos compactos ativos');
})();