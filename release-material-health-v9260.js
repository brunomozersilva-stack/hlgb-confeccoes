/* HLGB v92.61 — saúde financeira de matéria-prima: notas + compromissos manuais em aberto */
(function(){
'use strict';
const V='92.61';
const sid=v=>String(v??'');
const q=v=>Math.max(0,Number(v)||0);
const norm=v=>sid(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase();
const esc=v=>sid(v).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'}[m]));
const money=v=>{try{return typeof window.money==='function'?window.money(v):Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}catch(e){return 'R$ '+Number(v||0).toFixed(2).replace('.',',')}};
const arr=n=>{try{return Array.isArray(db?.[n])?db[n]:[]}catch(e){return []}};
function today(){const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')}
function outstanding(p){const total=q(p?.total),status=norm(p?.status);if(['pago','paga','quitado','quitada','realizado','realizada'].includes(status))return 0;const paid=q(p?.paid??p?.paidAmount??0);return Math.max(0,total-paid)}
function due(p){const d=sid(p?.dueDate).slice(0,10);return /^\d{4}-\d{2}-\d{2}$/.test(d)?d:''}
function monthKey(d){return /^\d{4}-\d{2}/.test(sid(d))?sid(d).slice(0,7):''}
function selectedRange(){try{const api=window.hlgbHubMaster9258;if(api?.weekRange&&api?.selectedDate)return api.weekRange(api.selectedDate())}catch(e){}const d=today();return {selected:d,start:d,end:d}}
function openNotes(){return arr('purchases').map(p=>({p,remain:outstanding(p),due:due(p)})).filter(x=>x.remain>0)}
function isAutoPurchaseEntry(e){const st=norm(e?.sourceType),source=sid(e?.sourceId||e?.purchaseId||e?.sourcePurchaseId);if(source&&arr('purchases').some(p=>sid(p.id)===source))return true;return !!(st.includes('purchase')||st.includes('compra')||st.includes('nota de compra')||st.includes('nota_compra'))}
function manualMaterialRows(){return arr('hubFinanceEntries').filter(e=>e&&e.flow==='Saída'&&norm(e.category)==='materia-prima'&&norm(e.status)!=='realizado'&&!isAutoPurchaseEntry(e))}
function sum(list,key='remain'){return list.reduce((a,x)=>a+q(x?.[key]),0)}
function render(){
 const host=document.getElementById('supplierDebtEvolution9250');if(!host)return false;
 const range=selectedRange(),month=range.selected.slice(0,7),notes=openNotes(),dated=notes.filter(x=>x.due),noDue=notes.filter(x=>!x.due),weekNotes=dated.filter(x=>x.due>=range.start&&x.due<=range.end),monthNotes=dated.filter(x=>monthKey(x.due)===month),overdueNotes=dated.filter(x=>x.due<today());
 const manual=manualMaterialRows(),manualWeek=manual.filter(x=>sid(x.date).slice(0,10)>=range.start&&sid(x.date).slice(0,10)<=range.end),manualMonth=manual.filter(x=>monthKey(x.date)===month),overdueManual=manual.filter(x=>sid(x.date).slice(0,10)&&sid(x.date).slice(0,10)<today());
 const notesTotal=sum(notes),manualTotal=sum(manual,'value'),weekTotal=sum(weekNotes)+sum(manualWeek,'value'),monthTotal=sum(monthNotes)+sum(manualMonth,'value'),grandTotal=notesTotal+manualTotal,overdueTotal=sum(overdueNotes)+sum(overdueManual,'value');
 const future={};
 for(const x of dated){const m=monthKey(x.due);if(!m)continue;future[m]=future[m]||{notes:0,manual:0};future[m].notes+=x.remain}
 for(const x of manual){const m=monthKey(x.date);if(!m)continue;future[m]=future[m]||{notes:0,manual:0};future[m].manual+=q(x.value)}
 const futureRows=Object.entries(future).sort((a,b)=>a[0].localeCompare(b[0])).map(([m,v])=>'<tr><td>'+esc(m)+'</td><td>'+money(v.notes)+'</td><td>'+money(v.manual)+'</td><td><b>'+money(v.notes+v.manual)+'</b></td></tr>').join('');
 const suppliers={};for(const x of monthNotes){const n=sid(x.p?.supplierName||'Sem fornecedor').trim()||'Sem fornecedor';suppliers[n]=(suppliers[n]||0)+x.remain}
 const supplierRows=Object.entries(suppliers).sort((a,b)=>b[1]-a[1]).map(([n,v])=>'<tr><td>'+esc(n)+'</td><td><b>'+money(v)+'</b></td></tr>').join('');
 host.innerHTML='<h3>🧾 Saúde da matéria-prima — tudo que ainda está aberto</h3><div class="sub">O total considera <b>notas de compra em aberto + lançamentos manuais de matéria-prima ainda previstos</b>. Lançamentos automáticos vinculados a uma nota são ignorados aqui para não contar a mesma compra duas vezes.</div>'+
 '<div class="cards" style="margin-top:12px">'+
 '<div class="card"><small>Total aberto de matéria-prima</small><strong>'+money(grandTotal)+'</strong><div class="sub">Notas '+money(notesTotal)+' + manual '+money(manualTotal)+'</div></div>'+
 '<div class="card"><small>Aberto na semana '+esc(range.start)+' a '+esc(range.end)+'</small><strong>'+money(weekTotal)+'</strong><div class="sub">Notas '+money(sum(weekNotes))+' + manual '+money(sum(manualWeek,'value'))+'</div></div>'+
 '<div class="card"><small>Aberto em '+esc(month)+'</small><strong>'+money(monthTotal)+'</strong><div class="sub">Notas '+money(sum(monthNotes))+' + manual '+money(sum(manualMonth,'value'))+'</div></div>'+
 '<div class="card"><small>Vencido / atrasado</small><strong>'+money(overdueTotal)+'</strong><div class="sub">Notas e compromissos manuais ainda abertos</div></div>'+
 '<div class="card"><small>Sem data de vencimento</small><strong>'+money(sum(noDue))+'</strong><div class="sub">'+noDue.length+' nota(s) precisam de data</div></div>'+
 '</div>'+
 '<h3 style="margin-top:18px">Projeção mensal completa</h3><div class="sub">Mostra separadamente o que veio de nota de compra e o que foi lançado manualmente, além do total real a considerar para o mês.</div>'+
 (futureRows?'<div style="overflow:auto"><table><thead><tr><th>Mês</th><th>Notas abertas</th><th>Manual aberto</th><th>Total a considerar</th></tr></thead><tbody>'+futureRows+'</tbody></table></div>':'<div class="empty">Nenhum compromisso de matéria-prima em aberto.</div>')+
 (noDue.length?'<div class="panel" style="background:#fff8e8;margin-top:12px"><b>⚠️ Notas sem vencimento: '+money(sum(noDue))+'</b><div class="sub">Entram no total geral aberto, mas ficam fora dos meses até receberem data de vencimento.</div></div>':'')+
 '<h3 style="margin-top:18px">Fornecedores com notas vencendo em '+esc(month)+'</h3>'+(supplierRows?'<div style="overflow:auto"><table><thead><tr><th>Fornecedor</th><th>Saldo a pagar no mês</th></tr></thead><tbody>'+supplierRows+'</tbody></table></div>':'<div class="empty">Nenhuma nota vence neste mês.</div>')+
 '<h3 style="margin-top:18px">📌 Parte lançada manualmente</h3><div class="sub">Esses valores continuam entrando no aberto porque foram usados enquanto o sistema ainda estava sendo implantado. Quando um lançamento vier automaticamente de uma nota de compra e estiver vinculado a ela, ele não entra novamente nesta parte.</div>'+
 '<div class="cards" style="margin-top:10px"><div class="card"><small>Manual total em aberto</small><strong>'+money(manualTotal)+'</strong><div class="sub">'+manual.length+' lançamento(s)</div></div><div class="card"><small>Manual na semana</small><strong>'+money(sum(manualWeek,'value'))+'</strong><div class="sub">'+manualWeek.length+' lançamento(s)</div></div><div class="card"><small>Manual em '+esc(month)+'</small><strong>'+money(sum(manualMonth,'value'))+'</strong><div class="sub">'+manualMonth.length+' lançamento(s)</div></div></div>';
 const cards=document.getElementById('supplierDebtCards9250');if(cards){let badge=document.getElementById('hlgbMaterialHealth9260');if(!badge){badge=document.createElement('div');badge.id='hlgbMaterialHealth9260';badge.className='panel';cards.insertAdjacentElement('afterend',badge)}badge.innerHTML='<b>Saúde da matéria-prima:</b> total aberto '+money(grandTotal)+' · '+esc(month)+' '+money(monthTotal)+' · semana '+money(weekTotal)+' · notas sem vencimento '+money(sum(noDue))+'.';}
 return true;
}
function install(){render();const old=window.renderSupplierDebt9250;if(typeof old==='function'&&!old.__v9261){const w=function(){const r=old.apply(this,arguments);setTimeout(render,0);return r};w.__v9261=true;w.__original=old;window.renderSupplierDebt9250=w}const hub=window.renderHubFinance;if(typeof hub==='function'&&!hub.__material9261){const w=function(){const r=hub.apply(this,arguments);setTimeout(render,30);return r};w.__material9261=true;w.__original=hub;window.renderHubFinance=w}}
setTimeout(install,1300);setInterval(()=>{if(document.getElementById('supplierDebtEvolution9250'))render()},5000);
try{if(typeof hlgbAfterLogin==='function')hlgbAfterLogin(()=>setTimeout(install,450),0)}catch(e){}
window.hlgbMaterialHealth9260={outstanding,due,openNotes,manualMaterialRows,isAutoPurchaseEntry,render};
try{const cur=Number(window.HLGB_RELEASE_VERSION)||0;if(cur<=92.61){window.HLGB_RELEASE_VERSION=V;const l=document.querySelector('#appShell .logo small');if(l)l.textContent='v'+V}}catch(e){}
console.info('[HLGB] saúde de matéria-prima v'+V+' ativa');
})();