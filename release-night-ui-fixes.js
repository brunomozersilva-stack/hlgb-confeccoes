/* HLGB — ajustes visuais: pagamentos de facção, produtos e barra superior */
(function(){
'use strict';
const V='2026.10.26-topbar-clean-v3';
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

function injectTopbarCss(){
 if(document.getElementById('hlgbTopbarCleanStyle'))return;
 const s=document.createElement('style');s.id='hlgbTopbarCleanStyle';
 s.textContent=`
#appShell>header.hlgb-topbar-clean{display:flex!important;align-items:center!important;justify-content:space-between!important;gap:14px!important;min-width:0!important;overflow:visible!important;padding-left:18px!important;padding-right:18px!important}
#appShell>header.hlgb-topbar-clean>.logo{flex:0 0 auto;min-width:max-content}
#appShell>header .hlgb-topbar-host{display:flex!important;align-items:center!important;justify-content:flex-end!important;gap:8px!important;min-width:0!important;flex:1 1 auto!important;position:relative!important;overflow:visible!important}
#appShell>header .hlgb-topbar-status{display:flex!important;align-items:center!important;justify-content:flex-end!important;gap:7px!important;min-width:0!important;flex:1 1 auto!important;flex-wrap:nowrap!important}
#appShell>header #cloudStatus,#appShell>header #currentUserLabel{position:static!important;inset:auto!important;top:auto!important;right:auto!important;bottom:auto!important;left:auto!important;transform:none!important;margin:0!important}
#appShell>header #cloudStatus{white-space:nowrap!important;flex:0 0 auto!important;width:auto!important;min-width:0!important;max-width:96px!important;padding:6px 8px!important;overflow:hidden!important;text-overflow:ellipsis!important;text-align:center!important}
#appShell>header #currentUserLabel{max-width:260px!important;min-width:0!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important;flex:0 1 auto!important}
#appShell>header .hlgb-topbar-pending{white-space:nowrap!important;flex:0 0 auto!important}
#backupImportInput{display:none!important;visibility:hidden!important;width:0!important;height:0!important;position:absolute!important;pointer-events:none!important}
#appShell>header .hlgb-topbar-actions-wrap{position:relative!important;flex:0 0 auto!important}
#appShell>header .hlgb-topbar-menu-btn{white-space:nowrap!important;min-width:auto!important;padding:7px 11px!important}
#appShell>header .hlgb-topbar-menu{position:absolute!important;right:0!important;top:calc(100% + 8px)!important;z-index:2147482000!important;width:min(260px,86vw)!important;padding:8px!important;background:#fff!important;border:1px solid #eadde4!important;border-radius:12px!important;box-shadow:0 16px 42px rgba(57,25,43,.18)!important;display:none!important}
#appShell>header .hlgb-topbar-menu.open{display:flex!important;flex-direction:column!important;gap:6px!important}
#appShell>header .hlgb-topbar-menu>button{width:100%!important;text-align:left!important;justify-content:flex-start!important;margin:0!important;white-space:nowrap!important}
#appShell>header .hlgb-topbar-menu>button[style*="display: none"],#appShell>header .hlgb-topbar-menu>button[style*="display:none"]{display:none!important}
@media(max-width:1080px){#appShell>header #currentUserLabel{max-width:170px!important}.hlgb-topbar-menu-btn .hlgb-topbar-actions-label{display:none!important}}
@media(max-width:780px){#appShell>header.hlgb-topbar-clean{flex-wrap:wrap!important;align-items:flex-start!important;gap:8px!important}#appShell>header .hlgb-topbar-host{width:100%!important;flex-basis:100%!important}#appShell>header .hlgb-topbar-status{justify-content:flex-start!important;flex-wrap:wrap!important}#appShell>header #currentUserLabel{max-width:min(62vw,260px)!important}}
`;
 document.head.appendChild(s);
}
function topbarPendingNodes(header){
 return [...header.querySelectorAll('.badge,button,span')].filter(el=>{
  if(!el||el.id==='cloudStatus'||el.id==='currentUserLabel'||el.id==='hlgbTopbarActionsBtn9253')return false;
  if(el.closest?.('#hlgbTopbarMenu9253'))return false;
  const t=sid(el.textContent).replace(/\s+/g,' ').trim();
  return /(altera[cç][aã]o|altera[cç][oõ]es).*(aguardando|pendente)|\baguardando\b.*(altera[cç][aã]o|confirma[cç][aã]o)/i.test(t);
 });
}
function cleanTopbar(){
 injectTopbarCss();
 const header=document.querySelector('#appShell>header')||document.querySelector('#appShell header');
 const cloud=document.getElementById('cloudStatus');if(!header||!cloud)return false;
 header.classList.add('hlgb-topbar-clean');
 let host=document.getElementById('hlgbTopbarHost9253');
 if(!host){
  const candidate=cloud.parentElement;
  if(candidate&&candidate!==header&&candidate.id!=='hlgbTopbarStatus9253')host=candidate;
  else{host=document.createElement('div');header.appendChild(host)}
  host.id='hlgbTopbarHost9253';host.classList.add('hlgb-topbar-host');
 }else host.classList.add('hlgb-topbar-host');
 let status=document.getElementById('hlgbTopbarStatus9253');
 if(!status){status=document.createElement('div');status.id='hlgbTopbarStatus9253';status.className='hlgb-topbar-status';host.insertBefore(status,host.firstChild)}
 else if(status.parentElement!==host)host.insertBefore(status,host.firstChild);
 if(cloud.parentElement!==status)status.appendChild(cloud);
 const user=document.getElementById('currentUserLabel');if(user&&user.parentElement!==status)status.appendChild(user);
 for(const n of topbarPendingNodes(header)){n.classList.add('hlgb-topbar-pending');if(n.parentElement!==status)status.appendChild(n)}
 const file=document.getElementById('backupImportInput');if(file){file.style.setProperty('display','none','important');file.setAttribute('aria-hidden','true')}
 let wrap=document.getElementById('hlgbTopbarActionsWrap9253');
 if(!wrap){wrap=document.createElement('div');wrap.id='hlgbTopbarActionsWrap9253';wrap.className='hlgb-topbar-actions-wrap';host.appendChild(wrap)}
 let toggle=document.getElementById('hlgbTopbarActionsBtn9253');
 if(!toggle){toggle=document.createElement('button');toggle.type='button';toggle.id='hlgbTopbarActionsBtn9253';toggle.className='secondary hlgb-topbar-menu-btn';toggle.innerHTML='☰ <span class="hlgb-topbar-actions-label">Ações</span>';toggle.setAttribute('aria-expanded','false');wrap.appendChild(toggle)}
 let menu=document.getElementById('hlgbTopbarMenu9253');
 if(!menu){menu=document.createElement('div');menu.id='hlgbTopbarMenu9253';menu.className='hlgb-topbar-menu';wrap.appendChild(menu)}
 const ids=['cloudSaveBtn','backupBtn','importBackupBtn'];
 for(const id of ids){const b=document.getElementById(id);if(b&&b.parentElement!==menu)menu.appendChild(b)}
 const logout=[...header.querySelectorAll('button')].find(b=>b.id!=='hlgbTopbarActionsBtn9253'&&(/logout\s*\(/i.test(sid(b.getAttribute('onclick')))||norm(b.textContent)==='sair'));
 if(logout&&logout.parentElement!==menu)menu.appendChild(logout);
 if(file&&file.parentElement!==menu)menu.appendChild(file);
 if(toggle.dataset.hlgbTopbarBound!=='1'){
  toggle.dataset.hlgbTopbarBound='1';
  toggle.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();const open=!menu.classList.contains('open');menu.classList.toggle('open',open);toggle.setAttribute('aria-expanded',open?'true':'false')});
 }
 if(menu.dataset.hlgbTopbarBound!=='1'){
  menu.dataset.hlgbTopbarBound='1';
  menu.addEventListener('click',e=>{if(e.target?.closest?.('button')){menu.classList.remove('open');toggle.setAttribute('aria-expanded','false')}});
 }
 if(document.documentElement.dataset.hlgbTopbarOutsideBound!=='1'){
  document.documentElement.dataset.hlgbTopbarOutsideBound='1';
  document.addEventListener('click',e=>{const w=document.getElementById('hlgbTopbarActionsWrap9253');const m=document.getElementById('hlgbTopbarMenu9253'),b=document.getElementById('hlgbTopbarActionsBtn9253');if(!w||w.contains(e.target))return;m?.classList.remove('open');b?.setAttribute('aria-expanded','false')},true);
  document.addEventListener('keydown',e=>{if(e.key!=='Escape')return;document.getElementById('hlgbTopbarMenu9253')?.classList.remove('open');document.getElementById('hlgbTopbarActionsBtn9253')?.setAttribute('aria-expanded','false')},true);
 }
 return true;
}
function scheduleTopbar(){[0,180,600,1400].forEach(ms=>setTimeout(cleanTopbar,ms))}

function boot(){ensureFactionControls();blankFactionPayments();compactProducts();scheduleTopbar()}
try{if(typeof hlgbAfterLogin==='function')hlgbAfterLogin(()=>setTimeout(boot,900),0)}catch(e){}
setTimeout(boot,1800);
window.hlgbNightUi={fpSelected,reorganizeFactionPayments,blankFactionPayments,compactProducts,cleanTopbar,scheduleTopbar};
window.HLGB_NIGHT_UI_GUARD=V;
console.info('[HLGB] pagamentos de facção por período + produtos compactos + barra superior clean ativos');
})();