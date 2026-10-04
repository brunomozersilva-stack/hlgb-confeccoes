/* HLGB v92.60 — saúde financeira de matéria-prima baseada nas notas abertas reais */
(function(){
'use strict';
const V='92.60';
const sid=v=>String(v??'');
const q=v=>Math.max(0,Number(v)||0);
const norm=v=>sid(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase();
const esc=v=>sid(v).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const money=v=>{try{return typeof window.money==='function'?window.money(v):Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}catch(e){return 'R$ '+Number(v||0).toFixed(2).replace('.',',')}};
const arr=n=>{try{return Array.isArray(db?.[n])?db[n]:[]}catch(e){return []}};
function today(){const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')}
function outstanding(p){const total=q(p?.total),status=norm(p?.status);if(['pago','paga','quitado','quitada','realizado','realizada'].includes(status))return 0;const paid=q(p?.paid??p?.paidAmount??0);return Math.max(0,total-paid)}
function due(p){const d=sid(p?.dueDate).slice(0,10);return /^\d{4}-\d{2}-\d{2}$/.test(d)?d:''}
function monthKey(d){return /^\d{4}-\d{2}/.test(sid(d))?sid(d).slice(0,7):''}
function selectedRange(){try{const api=window.hlgbHubMaster9258;if(api?.weekRange&&api?.selectedDate)return api.weekRange(api.selectedDate())}catch(e){}const d=today();return {selected:d,start:d,end:d}}
function openNotes(){return arr('purchases').map(p=>({p,remain:outstanding(p),due:due(p)})).filter(x=>x.remain>0)}
function manualMaterialRows(){return arr('hubFinanceEntries').filter(e=>e&&e.flow==='Saída'&&norm(e.category)==='materia-prima'&&norm(e.status)!=='realizado')}
function sum(list,key='remain'){return list.reduce((a,x)=>a+q(x?.[key]),0)}
function render(){
 const host=document.getElementById('supplierDebtEvolution9250');if(!host)return false;
 const range=selectedRange(),month=range.selected.slice(0,7),notes=openNotes(),dated=notes.filter(x=>x.due),noDue=notes.filter(x=>!x.due),weekNotes=dated.filter(x=>x.due>=range.start&&x.due<=range.end),monthNotes=dated.filter(x=>monthKey(x.due)===month),overdue=dated.filter(x=>x.due<today());
 const manual=manualMaterialRows(),manualWeek=manual.filter(x=>sid(x.date).slice(0,10)>=range.start&&sid(x.date).slice(0,10)<=range.end),manualMonth=manual.filter(x=>monthKey(x.date)===month);
 const future={};for(const x of dated){const m=monthKey(x.due);if(!m)continue;future[m]=(future[m]||0)+x.remain}
 const futureRows=Object.entries(future).sort((a,b)=>a[0].localeCompare(b[0])).map(([m,v])=>'<tr><td>'+esc(m)+'</td><td><b>'+money(v)+'</b></td><td>'+dated.filter(x=>monthKey(x.due)===m).length+'</td></tr>').join('');
 const suppliers={};for(const x of monthNotes){const n=sid(x.p?.supplierName||'Sem fornecedor').trim()||'Sem fornecedor';suppliers[n]=(suppliers[n]||0)+x.remain}
 const supplierRows=Object.entries(suppliers).sort((a,b)=>b[1]-a[1]).map(([n,v])=>'<tr><td>'+esc(n)+'</td><td><b>'+money(v)+'</b></td></tr>').join('');
 host.innerHTML='<h3>🧾 Matéria-prima — notas realmente em aberto</h3><div class="sub">Fonte: Notas de compra. O cálculo usa somente o saldo ainda não pago e a data de vencimento da própria nota. Notas sem vencimento ficam separadas e não são jogadas em um mês pela data da compra.</div>'+
 '<div class="cards" style="margin-top:12px">'+
 '<div class="card"><small>Notas vencendo na semana '+esc(range.start)+' a '+esc(range.end)+'</small><strong>'+money(sum(weekNotes))+'</strong><div class="sub">'+weekNotes.length+' nota(s)</div></div>'+
 '<div class="card"><small>Notas vencendo em '+esc(month)+'</small><strong>'+money(sum(monthNotes))+'</strong><div class="sub">'+monthNotes.length+' nota(s)</div></div>'+
 '<div class="card"><small>Total aberto em notas</small><strong>'+money(sum(notes))+'</strong><div class="sub">Inclui notas sem vencimento</div></div>'+
 '<div class="card"><small>Vencidas hoje</small><strong>'+money(sum(overdue))+'</strong><div class="sub">'+overdue.length+' nota(s)</div></div>'+
 '<div class="card"><small>Sem data de vencimento</small><strong>'+money(sum(noDue))+'</strong><div class="sub">'+noDue.length+' nota(s) precisam de data</div></div>'+
 '</div>'+
 '<h3 style="margin-top:18px">Projeção correta por mês de vencimento</h3><div class="sub">Este quadro é o valor de notas de matéria-prima abertas que efetivamente vencem em cada mês.</div>'+
 (futureRows?'<div style="overflow:auto"><table><thead><tr><th>Mês do vencimento</th><th>Saldo a pagar</th><th>Notas</th></tr></thead><tbody>'+futureRows+'</tbody></table></div>':'<div class="empty">Nenhuma nota com vencimento em aberto.</div>')+
 (noDue.length?'<div class="panel" style="background:#fff8e8;margin-top:12px"><b>⚠️ Notas sem vencimento: '+money(sum(noDue))+'</b><div class="sub">Essas notas entram no total aberto, mas não entram em outubro/novembro até receberem uma data de vencimento.</div></div>':'')+
 '<h3 style="margin-top:18px">Fornecedores com vencimento em '+esc(month)+'</h3>'+(supplierRows?'<div style="overflow:auto"><table><thead><tr><th>Fornecedor</th><th>Saldo a pagar no mês</th></tr></thead><tbody>'+supplierRows+'</tbody></table></div>':'<div class="empty">Nenhuma nota vence neste mês.</div>')+
 '<h3 style="margin-top:18px">📌 Compromissos manuais de matéria-prima no Hub</h3><div class="sub">Estes lançamentos são separados das notas de compra porque não possuem vínculo com uma nota/fornecedor. Eles podem representar previsão, compra à vista ou até um valor já representado em uma nota. Por segurança, <b>não são somados automaticamente às notas abertas</b>, evitando dupla contagem.</div>'+
 '<div class="cards" style="margin-top:10px"><div class="card"><small>Manual na semana</small><strong>'+money(sum(manualWeek,'value'))+'</strong><div class="sub">'+manualWeek.length+' lançamento(s)</div></div><div class="card"><small>Manual em '+esc(month)+'</small><strong>'+money(sum(manualMonth,'value'))+'</strong><div class="sub">'+manualMonth.length+' lançamento(s)</div></div></div>';
 const cards=document.getElementById('supplierDebtCards9250');if(cards){let badge=document.getElementById('hlgbMaterialHealth9260');if(!badge){badge=document.createElement('div');badge.id='hlgbMaterialHealth9260';badge.className='panel';cards.insertAdjacentElement('afterend',badge)}badge.innerHTML='<b>Saúde da matéria-prima:</b> notas abertas '+money(sum(notes))+' · '+esc(month)+' '+money(sum(monthNotes))+' · semana '+money(sum(weekNotes))+' · sem vencimento '+money(sum(noDue))+'.';}
 return true;
}
function install(){render();const old=window.renderSupplierDebt9250;if(typeof old==='function'&&!old.__v9260){const w=function(){const r=old.apply(this,arguments);setTimeout(render,0);return r};w.__v9260=true;w.__original=old;window.renderSupplierDebt9250=w}const hub=window.renderHubFinance;if(typeof hub==='function'&&!hub.__material9260){const w=function(){const r=hub.apply(this,arguments);setTimeout(render,30);return r};w.__material9260=true;w.__original=hub;window.renderHubFinance=w}}
setTimeout(install,1300);setInterval(()=>{if(document.getElementById('supplierDebtEvolution9250'))render()},5000);
try{if(typeof hlgbAfterLogin==='function')hlgbAfterLogin(()=>setTimeout(install,450),0)}catch(e){}
window.hlgbMaterialHealth9260={outstanding,due,openNotes,manualMaterialRows,render};
try{const cur=Number(window.HLGB_RELEASE_VERSION)||0;if(cur<=92.60){window.HLGB_RELEASE_VERSION=V;const l=document.querySelector('#appShell .logo small');if(l)l.textContent='v'+V}}catch(e){}
console.info('[HLGB] saúde de matéria-prima v'+V+' ativa');
})();