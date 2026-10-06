/* HLGB v92.95 — Folha: duas visões + status visual pago/pendente */
(function(){
'use strict';
if(window.hlgbPayrollView9295)return;
const V='92.95',VIEW_KEY='hlgb_payroll_view_9295',STATUS_KEY='hlgb_payroll_status_9295';
const sid=v=>String(v??'');
const q=v=>Math.max(0,Number(v)||0);
function dbr(){try{if(typeof db!=='undefined'&&db)return db}catch(e){}return window.db||null}
function arr(n){const d=dbr();return Array.isArray(d?.[n])?d[n]:[]}
function escs(v){try{return typeof window.esc==='function'?window.esc(v):sid(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}catch(e){return sid(v)}}
function moneySafe(v){try{return typeof window.money==='function'?window.money(v):Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}catch(e){return 'R$ '+Number(v||0).toFixed(2).replace('.',',')}}
function company(e,r){try{return typeof window.employeeCompanyName==='function'?window.employeeCompanyName(e):sid(r?.companyName||e?.companyName||'Sem confecção')}catch(_){return sid(r?.companyName||e?.companyName||'Sem confecção')}}
function calc(r,e){try{if(typeof window.payrollCalc==='function')return window.payrollCalc(r,e||{})}catch(_){}const salary=q(r?.salary||e?.salary),transport=0,benefit=q(r?.benefit),overtime=q(r?.overtime),bonus=q(r?.bonus),otherCredit=q(r?.otherCredit),absence=q(r?.absence),inss=0,union=q(r?.unionDiscount),advance=q(r?.advance),purchase=q(r?.purchase),otherDiscount=q(r?.otherDiscount),gross=salary+transport+benefit+overtime+bonus+otherCredit,discounts=absence+inss+union+advance+purchase+otherDiscount;return {salary,transport,benefit,overtime,bonus,otherCredit,absence,inss,union,advance,purchase,otherDiscount,gross,discounts,net:Math.max(0,gross-discounts)}}
function getView(){try{return localStorage.getItem(VIEW_KEY)==='alpha'?'alpha':'company'}catch(e){return 'company'}}
function getStatus(){try{const v=localStorage.getItem(STATUS_KEY);return v==='paid'||v==='pending'?v:'all'}catch(e){return 'all'}}
function setView(v){try{localStorage.setItem(VIEW_KEY,v==='alpha'?'alpha':'company')}catch(e){}renderVisual()}
function setStatus(v){try{localStorage.setItem(STATUS_KEY,v==='paid'||v==='pending'?v:'all')}catch(e){}renderVisual()}
function currentRows(){
 const month=document.getElementById('payrollMonth')?.value||new Date().toISOString().slice(0,7),companyFilter=document.getElementById('payrollCompanyFilter')?.value||'',qf=(document.getElementById('payrollEmployeeFilter')?.value||'').trim().toLowerCase(),status=getStatus();
 return arr('payroll').filter(r=>{
  if(sid(r?.month)!==month)return false;
  if(companyFilter&&sid(r?.companyName)!==companyFilter)return false;
  if(qf&&!sid(r?.employeeName).toLowerCase().includes(qf))return false;
  if(status==='paid'&&!r?.paid)return false;
  if(status==='pending'&&r?.paid)return false;
  return true;
 });
}
function allMonthRows(){const month=document.getElementById('payrollMonth')?.value||new Date().toISOString().slice(0,7);return arr('payroll').filter(r=>sid(r?.month)===month)}
function style(){
 if(document.getElementById('hlgbPayrollViewStyle9295'))return;
 const s=document.createElement('style');s.id='hlgbPayrollViewStyle9295';s.textContent=`
 #hlgbPayrollViewControls9295{margin:12px 0;padding:12px 14px;border:1px solid #d9dee8;border-radius:12px;background:#fff}
 #hlgbPayrollViewControls9295 .hlgb-payroll-view-row{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
 #hlgbPayrollViewControls9295 button.active{box-shadow:inset 0 0 0 2px currentColor;font-weight:800}
 #hlgbPayrollViewControls9295 .hlgb-payroll-spacer{flex:1 1 24px}
 #payrollTable .hlgb-payroll-status-row{border-radius:12px;margin:8px 0;overflow:hidden;border:1px solid #dde3ec;border-left-width:7px}
 #payrollTable .hlgb-payroll-paid{border-left-color:#199c55;background:#f1fbf5}
 #payrollTable .hlgb-payroll-pending{border-left-color:#e39a18;background:#fff9ed}
 #payrollTable .hlgb-status-pill{display:inline-flex;align-items:center;gap:6px;padding:6px 10px;border-radius:999px;font-weight:900;white-space:nowrap}
 #payrollTable .hlgb-status-paid{background:#dff6e8;color:#116a3a;border:1px solid #9edbb6}
 #payrollTable .hlgb-status-pending{background:#fff0cf;color:#8b5700;border:1px solid #efc66c}
 #payrollTable .hlgb-alpha-letter{font-size:18px;font-weight:900;margin:16px 0 6px;padding:6px 2px;border-bottom:2px solid #e2e6ed}
 #payrollTable .hlgb-payroll-name{display:flex;flex-direction:column;gap:3px}
 #payrollTable .hlgb-payroll-name strong{font-size:15px}
 #payrollTable .hlgb-payroll-name small{opacity:.72}
 @media(max-width:780px){#hlgbPayrollViewControls9295 .hlgb-payroll-spacer{display:none}#payrollTable .payroll-row-main{min-width:920px}}
 `;document.head.appendChild(s)
}
function ensureControls(){
 const table=document.getElementById('payrollTable');if(!table)return null;let box=document.getElementById('hlgbPayrollViewControls9295');
 if(!box){box=document.createElement('div');box.id='hlgbPayrollViewControls9295';table.parentNode?.insertBefore(box,table)}
 const view=getView(),status=getStatus(),all=allMonthRows(),paid=all.filter(r=>r.paid).length,pending=all.length-paid;
 box.innerHTML=`<div class="hlgb-payroll-view-row"><strong>Visualização:</strong><button type="button" class="secondary ${view==='company'?'active':''}" onclick="hlgbPayrollView9295.setView('company')">🏭 Por confecção</button><button type="button" class="secondary ${view==='alpha'?'active':''}" onclick="hlgbPayrollView9295.setView('alpha')">🔤 Ordem alfabética</button><span class="hlgb-payroll-spacer"></span><strong>Status:</strong><button type="button" class="secondary ${status==='all'?'active':''}" onclick="hlgbPayrollView9295.setStatus('all')">Todos (${all.length})</button><button type="button" class="secondary ${status==='pending'?'active':''}" onclick="hlgbPayrollView9295.setStatus('pending')">● Pendentes (${pending})</button><button type="button" class="secondary ${status==='paid'?'active':''}" onclick="hlgbPayrollView9295.setStatus('paid')">✓ Pagos (${paid})</button></div><div class="sub" style="margin-top:8px">Verde = pago. Amarelo = pendente. A troca de visualização não altera nenhum cálculo nem pagamento.</div>`;
 return box
}
function rowHtml(r){
 const e=arr('employees').find(x=>sid(x?.id)===sid(r?.employeeId))||{},c=calc(r,e),add=q(c.transport)+q(c.benefit)+q(c.overtime)+q(c.bonus)+q(c.otherCredit),disc=q(c.absence)+q(c.inss)+q(c.union)+q(c.advance)+q(c.purchase)+q(c.otherDiscount),id=sid(r?.id).replace(/'/g,"\\'"),paid=!!r?.paid,status=paid?'<span class="hlgb-status-pill hlgb-status-paid">✓ PAGO</span>':'<span class="hlgb-status-pill hlgb-status-pending">● PENDENTE</span>';
 return `<div class="payroll-row hlgb-payroll-status-row ${paid?'hlgb-payroll-paid':'hlgb-payroll-pending'}"><div class="payroll-row-main"><div class="hlgb-payroll-name"><strong>${escs(r.employeeName||e.name||'-')}</strong><small>${escs(r.companyName||company(e,r)||'-')}</small></div><div class="payroll-num">${moneySafe(c.salary)}</div><div class="payroll-num">${moneySafe(add)}</div><div class="payroll-num">${moneySafe(disc)}</div><div class="payroll-net-cell"><strong>${moneySafe(c.net)}</strong></div><div class="payroll-pix">${escs(r.pix||e.pix||'-')}</div><div>${status}</div><div class="payroll-actions"><button class="primary" onclick="editPayrollRow('${id}')">✏️ Editar</button> <button class="secondary" onclick="togglePayrollPaid('${id}')">${paid?'↩ Reabrir':'✓ Pagar'}</button> <button class="danger" onclick="deletePayrollRow('${id}')">Excluir</button></div></div><details class="payroll-detail"><summary>Ver composição da folha</summary><div class="payroll-detail-grid"><div class="payroll-detail-item"><small>Vale-transporte</small><span>${moneySafe(c.transport)}</span></div><div class="payroll-detail-item"><small>Benefício</small><span>${moneySafe(c.benefit)}</span></div><div class="payroll-detail-item"><small>Hora extra</small><span>${moneySafe(c.overtime)}</span></div><div class="payroll-detail-item"><small>Bônus</small><span>${moneySafe(c.bonus)}</span></div><div class="payroll-detail-item"><small>Outros créditos</small><span>${moneySafe(c.otherCredit)}</span></div><div class="payroll-detail-item"><small>Faltas</small><span>${moneySafe(c.absence)}</span></div><div class="payroll-detail-item"><small>INSS</small><span>${moneySafe(c.inss)}</span></div><div class="payroll-detail-item"><small>Sindical</small><span>${moneySafe(c.union)}</span></div><div class="payroll-detail-item"><small>Vale / adiantamento</small><span>${moneySafe(c.advance)}</span></div><div class="payroll-detail-item"><small>Compra</small><span>${moneySafe(c.purchase)}</span></div><div class="payroll-detail-item"><small>Outros descontos</small><span>${moneySafe(c.otherDiscount)}</span></div></div></details></div>`
}
function renderCompany(rows,table){
 const groups={};for(const r of rows){const n=r.companyName||'Sem confecção';(groups[n]||(groups[n]=[])).push(r)}
 const names=Object.keys(groups).sort((a,b)=>a.localeCompare(b,'pt-BR'));table.innerHTML=names.length?`<div class="payroll-company-list">${names.map(name=>{const list=groups[name].slice().sort((a,b)=>sid(a.employeeName).localeCompare(sid(b.employeeName),'pt-BR')),paid=list.filter(x=>x.paid).length;return `<section class="payroll-company"><div class="payroll-company-head"><div class="payroll-company-title">🏭 ${escs(name)}</div><div class="payroll-company-stats"><span class="payroll-company-stat"><strong>${list.length}</strong> funcionário${list.length===1?'':'s'}</span><span class="payroll-company-stat"><strong>${paid}</strong> pago${paid===1?'':'s'}</span><span class="payroll-company-stat"><strong>${list.length-paid}</strong> pendente${list.length-paid===1?'':'s'}</span></div></div><div class="payroll-list-head"><div>Funcionário</div><div>Salário</div><div>Adicionais</div><div>Descontos</div><div>A pagar</div><div>PIX</div><div>Status</div><div>Ações</div></div>${list.map(rowHtml).join('')}</section>`}).join('')}</div>`:'<div class="empty">Nenhum funcionário encontrado para estes filtros.</div>'
}
function renderAlpha(rows,table){
 const list=rows.slice().sort((a,b)=>sid(a.employeeName).localeCompare(sid(b.employeeName),'pt-BR'));let last='';
 table.innerHTML=list.length?`<div class="payroll-company-list"><div class="payroll-list-head"><div>Funcionário</div><div>Salário</div><div>Adicionais</div><div>Descontos</div><div>A pagar</div><div>PIX</div><div>Status</div><div>Ações</div></div>${list.map(r=>{const letter=(sid(r.employeeName).trim()[0]||'#').toUpperCase(),head=letter!==last?`<div class="hlgb-alpha-letter">${escs(letter)}</div>`:'';last=letter;return head+rowHtml(r)}).join('')}</div>`:'<div class="empty">Nenhum funcionário encontrado para estes filtros.</div>'
}
function renderVisual(){style();ensureControls();const table=document.getElementById('payrollTable');if(!table)return false;const rows=currentRows();if(getView()==='alpha')renderAlpha(rows,table);else renderCompany(rows,table);return true}
function wrap(){const fn=window.renderPayroll;if(typeof fn!=='function'||fn.__hlgbPayrollView9295)return false;const w=function(){const out=fn.apply(this,arguments);try{renderVisual()}catch(e){console.warn('[HLGB folha '+V+'] visual',e)}return out};w.__hlgbPayrollView9295=true;w.__original=fn;window.renderPayroll=w;return true}
function boot(){style();wrap();try{renderVisual()}catch(e){}}
boot();setTimeout(boot,500);setTimeout(boot,1700);
window.hlgbPayrollView9295={version:V,setView,setStatus,render:renderVisual,getView,getStatus};
window.HLGB_PAYROLL_VIEW_9295=V;
console.info('[HLGB] Folha v'+V+' — visões por confecção/alfabética + status visual');
})();
