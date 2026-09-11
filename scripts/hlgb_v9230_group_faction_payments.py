from pathlib import Path

src=Path('app9229.html')
out=Path('app9230.html')
s=src.read_text(encoding='utf-8')

addon=r'''<!-- HLGB_V9230_GROUP_FACTION_PAYMENTS_START -->
<style>
.hlgb9230-models{display:grid;gap:4px;min-width:220px}.hlgb9230-model{padding:6px 8px;border:1px solid #eadde4;border-radius:8px;background:#fff8fb;font-size:12px}.hlgb9230-model b{display:block;color:#5c3749}.hlgb9230-week{font-weight:800;color:#6f3f59}.hlgb9230-actions{display:flex;gap:6px;flex-wrap:wrap}.hlgb9230-details table{min-width:900px}
</style>
<script>
(function(){
'use strict';
const q9230=v=>Math.max(0,+v||0);
const esc9230=v=>typeof esc==='function'?esc(v):String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const money9230=v=>typeof money==='function'?money(v):q9230(v).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const fmt9230=d=>{try{return typeof fmtDate==='function'?fmtDate(d):(d?new Date(String(d).slice(0,10)+'T12:00').toLocaleDateString('pt-BR'):'-')}catch(e){return d||'-'}};
function normalize9230(v){return String(v||'').trim().toLocaleLowerCase('pt-BR').normalize('NFD').replace(/[\u0300-\u036f]/g,'')}
function week9230(p){
 if(p?.scheduledPaymentWeek)return String(p.scheduledPaymentWeek);
 const ds=String(p?.scheduledPaymentDate||p?.serviceFinishedAt||'').slice(0,10);if(!ds)return 'SEM-DATA';
 const d=new Date(ds+'T12:00:00'),tmp=new Date(d);tmp.setHours(0,0,0,0);tmp.setDate(tmp.getDate()+3-((tmp.getDay()+6)%7));const w1=new Date(tmp.getFullYear(),0,4);const wk=1+Math.round(((tmp-w1)/86400000-3+((w1.getDay()+6)%7))/7);return `${tmp.getFullYear()}-W${String(wk).padStart(2,'0')}`;
}
function remaining9230(p){try{return typeof window.factionPaymentRemaining==='function'?Math.max(0,+window.factionPaymentRemaining(p)||0):Math.max(0,q9230(p.value)-q9230(p.travetaDiscount)-q9230(p.discountAmount)-q9230(p.paidAmount))}catch(e){return Math.max(0,q9230(p.value)-q9230(p.travetaDiscount)-q9230(p.discountAmount)-q9230(p.paidAmount))}}
function status9230(g){const rem=g.items.reduce((a,p)=>a+remaining9230(p),0),paid=g.items.reduce((a,p)=>a+q9230(p.paidAmount)+q9230(p.discountAmount)+q9230(p.travetaDiscount),0);if(rem<=0.009)return 'Pago';return paid>0?'Parcial':'Pendente'}
function group9230(rows){
 const m=new Map();(rows||[]).forEach(p=>{const w=week9230(p),name=String(p.factionName||'Sem facção').trim()||'Sem facção',key=normalize9230(name)+'||'+w;let g=m.get(key);if(!g){g={key,name,week:w,items:[],pix:'',scheduledDates:[]};m.set(key,g)}g.items.push(p);if(!g.pix&&p.pix)g.pix=p.pix;if(p.scheduledPaymentDate)g.scheduledDates.push(String(p.scheduledPaymentDate).slice(0,10))});return [...m.values()].sort((a,b)=>String(b.week).localeCompare(String(a.week))||a.name.localeCompare(b.name,'pt-BR'))}
function visibleRows9230(){
 try{if(typeof syncFactionPayments==='function')syncFactionPayments()}catch(e){}
 const start=document.getElementById('fpPeriodStart')?.value||'',end=document.getElementById('fpPeriodEnd')?.value||'';
 return (Array.isArray(db.factionPayments)?db.factionPayments:[]).filter(p=>{try{return typeof factionPaymentInPeriod==='function'?factionPaymentInPeriod(p,start,end):true}catch(e){return true}})
}
function totals9230(g){const gross=g.items.reduce((a,p)=>a+q9230(p.value),0),trav=g.items.reduce((a,p)=>a+q9230(p.travetaDiscount),0),disc=g.items.reduce((a,p)=>a+q9230(p.discountAmount),0),paid=g.items.reduce((a,p)=>a+q9230(p.paidAmount),0),rem=g.items.reduce((a,p)=>a+remaining9230(p),0);return {gross,trav,disc,paid,rem,net:Math.max(0,gross-trav-disc)}}
function findGroup9230(key){return group9230(Array.isArray(db.factionPayments)?db.factionPayments:[]).find(g=>g.key===key)||null}
function render9230(){
 const tbl=document.getElementById('factionPaymentTable');if(!tbl)return;
 const filter=document.getElementById('factionPaymentFilter')?.value||'';
 let groups=group9230(visibleRows9230()).filter(g=>!filter||status9230(g)===filter);
 const rows=groups.map(g=>{const t=totals9230(g),st=status9230(g),models=g.items.slice().sort((a,b)=>String(a.serviceFinishedAt||'').localeCompare(String(b.serviceFinishedAt||''))).map(p=>`<div class="hlgb9230-model"><b>${esc9230(p.description||'Serviço')}</b>${q9230(p.quantity).toLocaleString('pt-BR')} pç · ${money9230(p.unitPrice)}/pç · ${money9230(p.value)}</div>`).join(''),lastDate=g.scheduledDates.length?g.scheduledDates.sort().slice(-1)[0]:'';return [
   `<span class="hlgb9230-week">${esc9230(g.week)}</span>${lastDate?`<div class="sub">Pgto. ${fmt9230(lastDate)}</div>`:''}`,
   `<b>${esc9230(g.name)}</b>`,
   g.pix?`${esc9230(g.pix)}<br><button class="secondary" style="padding:4px 7px" onclick="navigator.clipboard?.writeText('${esc9230(g.pix).replace(/'/g,"\\'")}')">Copiar</button>`:'-',
   `<div class="hlgb9230-models">${models}</div>`,
   g.items.reduce((a,p)=>a+q9230(p.quantity),0).toLocaleString('pt-BR'),
   money9230(t.gross),t.trav?`- ${money9230(t.trav)}`:'-',t.disc?`- ${money9230(t.disc)}`:'-',money9230(t.net),money9230(t.paid),money9230(t.rem),
   `<span class="badge ${st==='Pago'?'ok':st==='Parcial'?'warn':''}">${st}</span>`,
   `<div class="hlgb9230-actions"><button class="secondary" onclick='hlgbFactionGroupDetails9230(${JSON.stringify(g.key)})'>Detalhes</button>${st==='Pago'?`<button class="secondary" onclick='hlgbReopenFactionGroup9230(${JSON.stringify(g.key)})'>Reabrir</button>`:`<button class="primary" onclick='hlgbPayFactionGroup9230(${JSON.stringify(g.key)})'>Dar baixa</button>`}</div>`
 ]});
 tbl.innerHTML=rows.length?table(['Semana','Facção','PIX','Modelos / serviços','Peças','Bruto','Traveta','Outros abat.','Líquido','Pago','Saldo','Status','Ações'],rows):'<div class="empty">Nenhum serviço encontrado.</div>';
 const cards=document.getElementById('factionPaymentCards');if(cards){const all=visibleRows9230(),gross=all.reduce((a,p)=>a+q9230(p.value),0),trav=all.reduce((a,p)=>a+q9230(p.travetaDiscount),0),disc=all.reduce((a,p)=>a+q9230(p.discountAmount),0),paid=all.reduce((a,p)=>a+q9230(p.paidAmount),0),rem=all.reduce((a,p)=>a+remaining9230(p),0);cards.innerHTML=`<div class="card"><small>Valor bruto</small><strong>${money9230(gross)}</strong></div><div class="card"><small>Abatimentos + traveta</small><strong>${money9230(trav+disc)}</strong></div><div class="card"><small>Já pago</small><strong>${money9230(paid)}</strong></div><div class="card"><small>A pagar</small><strong>${money9230(rem)}</strong></div>`}
}
window.hlgbFactionGroupDetails9230=function(key){const g=findGroup9230(key);if(!g)return;const t=totals9230(g);const rows=g.items.map(p=>[fmt9230(p.serviceFinishedAt),esc9230(p.description||'-'),q9230(p.quantity).toLocaleString('pt-BR'),money9230(p.unitPrice),money9230(p.value),money9230(q9230(p.travetaDiscount)+q9230(p.discountAmount)),money9230(q9230(p.paidAmount)),money9230(remaining9230(p)),`<button class="secondary" onclick="closeModal();setTimeout(()=>editFactionPayment(${Number(p.id)}),30)">Editar item</button>`]);openModal('Acerto semanal — '+esc9230(g.name),`<div class="cards"><div class="card"><small>Semana</small><strong>${esc9230(g.week)}</strong></div><div class="card"><small>Modelos</small><strong>${g.items.length}</strong></div><div class="card"><small>Total líquido</small><strong>${money9230(t.net)}</strong></div><div class="card"><small>Saldo</small><strong>${money9230(t.rem)}</strong></div></div><div class="hlgb9230-details" style="overflow:auto">${table(['Finalizado','Modelo','Qtd.','Preço','Bruto','Abat.','Pago','Saldo','Ação'],rows)}</div><button class="secondary" onclick="closeModal()">Fechar</button>`,()=>true)};
window.hlgbPayFactionGroup9230=function(key){const g=findGroup9230(key);if(!g)return;const t=totals9230(g);if(t.rem<=.009){alert('Este acerto já está quitado.');return}const models=g.items.map(p=>`${esc9230(p.description||'Serviço')} — ${q9230(p.quantity).toLocaleString('pt-BR')} pç — saldo ${money9230(remaining9230(p))}`).join('<br>');openModal('Dar baixa — '+esc9230(g.name)+' / '+esc9230(g.week),`<div class="panel" style="margin-top:0"><b>Este pagamento reúne ${g.items.length} modelo(s) da mesma facção na semana.</b><div class="sub" style="margin-top:6px">${models}</div></div><div class="cards"><div class="card"><small>Bruto</small><strong>${money9230(t.gross)}</strong></div><div class="card"><small>Já pago</small><strong>${money9230(t.paid)}</strong></div><div class="card"><small>Abatimentos</small><strong>${money9230(t.trav+t.disc)}</strong></div><div class="card"><small>Saldo do acerto</small><strong>${money9230(t.rem)}</strong></div></div><div class="grid"><div class="field"><label>Valor pago agora</label><input id="fgPaid9230" type="number" min="0" step="0.01" value="${t.rem.toFixed(2)}"></div><div class="field"><label>Abatimento adicional</label><input id="fgDisc9230" type="number" min="0" step="0.01" value="0"></div><div class="field"><label>Data do pagamento</label><input id="fgDate9230" type="date" value="${new Date().toISOString().slice(0,10)}"></div><div class="field"><label>Forma de pagamento</label><select id="fgMethod9230"><option>PIX</option><option>Transferência</option><option>Dinheiro</option><option>Outro</option></select></div></div><div class="field"><label>Observação do acerto</label><input id="fgObs9230" placeholder="Ex.: acerto semanal"></div><button class="primary modalSave">✅ Registrar um único acerto</button>`,()=>{
 const pay=Math.max(0,+document.getElementById('fgPaid9230')?.value||0),disc=Math.max(0,+document.getElementById('fgDisc9230')?.value||0),date=document.getElementById('fgDate9230')?.value||new Date().toISOString().slice(0,10),method=document.getElementById('fgMethod9230')?.value||'PIX',obs=document.getElementById('fgObs9230')?.value||'';
 if(pay+disc<=0){alert('Informe o valor pago ou um abatimento.');return false}if(pay+disc>t.rem+.009){alert('Pagamento + abatimento não pode ultrapassar o saldo de '+money9230(t.rem)+'.');return false}
 const settlementId='FG-'+Date.now(),items=g.items.slice().sort((a,b)=>String(a.serviceFinishedAt||'').localeCompare(String(b.serviceFinishedAt||'')));let discLeft=disc,payLeft=pay;
 for(const p of items){let rem=remaining9230(p);if(rem<=.009)continue;const d=Math.min(rem,discLeft);if(d>0){p.discountAmount=q9230(p.discountAmount)+d;discLeft-=d;rem=remaining9230(p)}const a=Math.min(rem,payLeft);if(a>0){p.paidAmount=q9230(p.paidAmount)+a;payLeft-=a}p.paymentHistory=Array.isArray(p.paymentHistory)?p.paymentHistory:[];if(d>0||a>0)p.paymentHistory.push({date,paid:a,discount:d,method,observation:obs||'Acerto semanal agrupado',groupSettlementId:settlementId,groupWeek:g.week,groupFaction:g.name});const nr=remaining9230(p);p.status=nr<=.009?'Pago':(q9230(p.paidAmount)>0||q9230(p.discountAmount)>0?'Parcial':'Pendente');if(nr<=.009)p.paymentDate=date;p.paymentMethod=method;p.observation=obs||p.observation||'';p.lastGroupSettlementId=settlementId;p.lastGroupSettlementAt=new Date().toISOString()}
 try{if(typeof auditAction==='function')auditAction('Acerto semanal de facção',`${g.name} — ${g.week} — ${g.items.length} modelo(s) — pago ${money9230(pay)} — abatimento ${money9230(disc)}`)}catch(e){}closeModal();try{save()}catch(e){};render9230();return true
 })};
window.hlgbReopenFactionGroup9230=function(key){const g=findGroup9230(key);if(!g)return;if(!confirm(`Reabrir o acerto semanal de ${g.name} (${g.week})? Os pagamentos e abatimentos registrados nesses modelos voltarão para pendente.`))return;g.items.forEach(p=>{p.status='Pendente';p.paymentDate='';p.paymentMethod='';p.paidAmount=0;p.discountAmount=0;p.paymentHistory=[];p.observation=''});try{save()}catch(e){};render9230()};
const oldRender9230=window.renderFactionPayments;window.renderFactionPayments=function(){try{if(typeof oldRender9230==='function')oldRender9230.apply(this,arguments)}catch(e){console.warn('[HLGB 92.30] render anterior',e)}try{render9230()}catch(e){console.error('[HLGB 92.30] agrupamento',e)}};
function stamp9230(){try{document.title='HLGB Confecções — Sistema de Gestão v92.30 Multiusuário'}catch(e){}const el=document.querySelector('#appShell .logo small');if(el)el.textContent='v92.30'}
if(typeof hlgbAfterLogin==='function')hlgbAfterLogin(()=>{setTimeout(stamp9230,250);setTimeout(()=>{try{render9230()}catch(e){}},700);[1800,3500,6500].forEach(ms=>setTimeout(stamp9230,ms))},0);setTimeout(stamp9230,1000);
console.log('[HLGB] v92.30 pagamentos de facção agrupados por facção e semana');
})();
</script>
<!-- HLGB_V9230_GROUP_FACTION_PAYMENTS_END -->'''

pos=s.rfind('</body>')
if pos<0: raise SystemExit('Fechamento </body> não encontrado')
s=s[:pos]+addon+'\n'+s[pos:]
s=s.replace('<title>HLGB Confecções — Sistema de Gestão v92.29 Multiusuário</title>','<title>HLGB Confecções — Sistema de Gestão v92.30 Multiusuário</title>')
out.write_text(s,encoding='utf-8')
Path('abrir.html').write_text('''<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate"><meta http-equiv="Pragma" content="no-cache"><meta http-equiv="Expires" content="0"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Abrindo HLGB Confecções v92.30</title><script>(function(){window.location.replace('./app9230.html?v=92.30&fresh='+Date.now())})();</script></head><body>Abrindo HLGB...</body></html>''',encoding='utf-8')
print('v92.30 preparada: acertos de facção agrupados por facção + semana, com baixa única')
