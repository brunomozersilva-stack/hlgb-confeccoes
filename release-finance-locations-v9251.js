/* HLGB v92.92 — despesas por confecção, baixa de facções no Hub e visão de fornecedores, sem redraw pesado a cada 5s */
(function(){
'use strict';
const V='2026.10.05-finance-locations-v9292';
const CUTOFF='2026-10-05';
const sid=v=>String(v??'');
const q=v=>Math.max(0,Number(v)||0);
const norm=v=>sid(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase();
const escSafe=v=>typeof esc==='function'?esc(v):sid(v).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'}[m]));
const moneySafe=v=>typeof money==='function'?money(v):Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const today=()=>{const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')};
const now=()=>new Date().toISOString();
function arr(n){try{db[n]=Array.isArray(db[n])?db[n]:[];return db[n]}catch(e){return []}}
function clone(v){try{return structuredClone(v)}catch(e){return JSON.parse(JSON.stringify(v))}}
function editing(){return !!window.HLGB_HUB_EDITING||!!document.getElementById('hlgbHubEditor9270')}
function hubActive(){const p=document.getElementById('hubFinanceiro');return !!p&&(p.classList.contains('active')||p.offsetParent!==null)}
function upsertLocal(module,row){const a=arr(module),i=a.findIndex(x=>sid(x?.id)===sid(row?.id));if(i>=0)a[i]=clone(row);else a.push(clone(row));try{localSaveOnly?.()}catch(e){}}
async function saveRow(module,row){
 if(typeof cloudEnsureFreshSession==='function')await cloudEnsureFreshSession(false);
 if(typeof window.hlgbRecordSaveWithRetry!=='function')throw new Error('Gravação multiusuário indisponível.');
 const out=await window.hlgbRecordSaveWithRetry(module,sid(row.id),clone(row),false);
 if(!out?.applied)throw new Error(out?.reason||('A nuvem não confirmou '+module+'.'));
 const saved=out.data||row;upsertLocal(module,saved);return saved;
}
function costCenters(){
 const out=[],seen=new Set();
 const push=(id,name,kind)=>{name=sid(name).trim();if(!name)return;const k=norm(name);if(seen.has(k))return;seen.add(k);out.push({id:sid(id),name,kind})};
 for(const x of arr('factionMasters'))if(x&&x.active!==false&&!norm(x.status).includes('inativo'))push(x.id,x.name,'factionMaster');
 for(const x of arr('productionLocations'))if(x&&x.active!==false&&!norm(x.status).includes('inativo'))push(x.id,x.name,'productionLocation');
 for(const x of arr('factions'))if(x&&!norm(x.status).includes('cancelado'))push(x.factionMasterId||x.productionLocationId||x.id,x.name,'faction');
 return out.sort((a,b)=>a.name.localeCompare(b.name,'pt-BR'));
}
function selectedHubRange(){
 const mode=document.getElementById('hlgbHubPeriodMode')?.value||'month',t=new Date();
 const iso=d=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
 if(mode==='week'){
  const v=document.getElementById('hlgbHubPeriodWeek')?.value||'';const m=v.match(/^(\d{4})-W(\d{2})$/);
  if(m){const jan4=new Date(+m[1],0,4,12),day=(jan4.getDay()+6)%7;jan4.setDate(jan4.getDate()-day+(+m[2]-1)*7);const e=new Date(jan4);e.setDate(e.getDate()+6);return {start:iso(jan4),end:iso(e),label:'Semana '+m[2]+'/'+m[1]}}
 }
 if(mode==='year'){
  const y=+document.getElementById('hlgbHubPeriodYear')?.value||t.getFullYear();return {start:y+'-01-01',end:y+'-12-31',label:'Ano '+y};
 }
 const v=document.getElementById('hlgbHubPeriodMonth')?.value||iso(t).slice(0,7),m=v.match(/^(\d{4})-(\d{2})$/);
 if(m){const e=new Date(+m[1],+m[2],0,12);return {start:v+'-01',end:iso(e),label:'Mês '+v}}
 return {start:iso(new Date(t.getFullYear(),t.getMonth(),1)),end:iso(new Date(t.getFullYear(),t.getMonth()+1,0)),label:'Mês atual'};
}
function expenseCenterName(e){return sid(e?.costCenterName||e?.productionLocationName||e?.factionName||e?.person||e?.locationName||'').trim()||'Sem local';}
function isConfExpense(e){const c=norm(e?.category),st=norm(e?.sourceType);return e?.flow==='Saída'&&(c==='gastos da confeccao'||c==='despesa de confeccao'||c==='despesas por confeccao'||st==='confecao_expense_v9251');}
function confExpenseRows(range){return arr('hubFinanceEntries').filter(e=>e&&isConfExpense(e)&&sid(e.date).slice(0,10)>=range.start&&sid(e.date).slice(0,10)<=range.end);}
function graphHtml(groups){
 const entries=Object.entries(groups).sort((a,b)=>b[1]-a[1]),max=Math.max(1,...entries.map(x=>x[1]));
 if(!entries.length)return '<div class="empty">Nenhuma despesa de confecção neste período.</div>';
 return '<div style="display:grid;gap:8px">'+entries.map(([n,v])=>'<div style="display:grid;grid-template-columns:minmax(120px,220px) 1fr auto;gap:10px;align-items:center"><b>'+escSafe(n)+'</b><div style="background:#eee;border-radius:999px;height:14px;overflow:hidden"><div style="height:100%;width:'+Math.max(2,(v/max)*100).toFixed(1)+'%;background:linear-gradient(90deg,#7b1f4c,#d45b8f)"></div></div><b>'+moneySafe(v)+'</b></div>').join('')+'</div>';
}
function ensureConfExpensePanel(){
 const page=document.getElementById('hubFinanceiro');if(!page)return false;
 let p=document.getElementById('hlgbConfExpense9251');
 if(!p){p=document.createElement('div');p.id='hlgbConfExpense9251';p.className='panel';p.innerHTML='<div style="display:flex;justify-content:space-between;gap:12px;align-items:center;flex-wrap:wrap"><div><h2 style="margin:0">🏭 Gastos por confecção / local</h2><div class="sub">Pão, café, limpeza, transporte e outros gastos do dia a dia separados por local.</div></div><button class="primary" type="button" onclick="openConfExpense9251()">+ Lançar gasto da confecção</button></div><div id="hlgbConfExpenseCards9251" class="cards" style="margin-top:12px"></div><div id="hlgbConfExpenseGraph9251" style="margin-top:14px"></div><div id="hlgbConfExpenseTable9251" style="margin-top:14px"></div>';
  const supplier=document.getElementById('supplierDebtPanel9250');if(supplier)supplier.insertAdjacentElement('afterend',p);else page.insertBefore(p,page.children[2]||null);
 }
 return true;
}
window.openConfExpense9251=function(){
 const centers=costCenters(),opts=centers.map(x=>'<option value="'+escSafe(x.id)+'">'+escSafe(x.name)+'</option>').join('');
 openModal('Lançar gasto da confecção','<div class="grid"><div class="field"><label>Origem do local</label><select id="ceMode9251"><option value="registered">Selecionar cadastrado</option><option value="other">Pessoa/local não cadastrado</option></select></div><div class="field" id="ceRegisteredWrap9251"><label>Confecção / local cadastrado</label><select id="ceCenter9251"><option value="">Selecione</option>'+opts+'</select></div><div class="field" id="ceOtherWrap9251" style="display:none"><label>Nome da pessoa/local</label><input id="ceOther9251" placeholder="Ex.: Costureira Maria"></div><div class="field"><label>Tipo de gasto</label><select id="ceType9251"><option>Pão / café</option><option>Limpeza</option><option>Transporte</option><option>Manutenção</option><option>Material de apoio</option><option>Energia / utilidades</option><option>Outro</option></select></div><div class="field"><label>Valor</label><input id="ceValue9251" type="number" min="0" step="0.01"></div><div class="field"><label>Data</label><input id="ceDate9251" type="date" value="'+today()+'"></div><div class="field"><label>Forma de pagamento</label><input id="ceMethod9251" placeholder="Pix, dinheiro, cartão..."></div></div><div class="field"><label>Observação</label><input id="ceNote9251" placeholder="Detalhe opcional"></div><button class="primary modalSave" type="button">☁️ Salvar gasto</button>',async()=>{
  const mode=document.getElementById('ceMode9251')?.value||'registered',value=q(document.getElementById('ceValue9251')?.value);if(value<=0)return alert('Informe o valor.');
  let center=null,name='';if(mode==='registered'){center=centers.find(x=>sid(x.id)===sid(document.getElementById('ceCenter9251')?.value));name=center?.name||''}else name=sid(document.getElementById('ceOther9251')?.value).trim();if(!name)return alert('Informe a confecção/local.');
  const date=document.getElementById('ceDate9251')?.value||today(),type=document.getElementById('ceType9251')?.value||'Outro',method=sid(document.getElementById('ceMethod9251')?.value).trim(),note=sid(document.getElementById('ceNote9251')?.value).trim();
  const row={id:'confexp-'+Date.now(),flow:'Saída',description:type+' — '+name,value,date,category:'Gastos da confecção',subcategory:type,person:name,status:'Realizado',realizedAt:date,paymentMethod:method,acceptedMethods:method?[method]:[],note,costCenterId:center?.id||'',costCenterName:name,costCenterKind:center?.kind||'external',sourceType:'confecao_expense_v9251',sourceId:'',createdAt:now(),updatedAt:now()};row.sourceId=row.id;
  try{await saveRow('hubFinanceEntries',row);closeModal();refresh(true);try{renderHubFinance?.()}catch(e){}}catch(e){alert('Não foi possível salvar: '+sid(e?.message||e))}
 });
 setTimeout(()=>{const m=document.getElementById('ceMode9251'),a=document.getElementById('ceRegisteredWrap9251'),b=document.getElementById('ceOtherWrap9251');if(m)m.onchange=()=>{const other=m.value==='other';if(a)a.style.display=other?'none':'';if(b)b.style.display=other?'':'none'}},20);
};
function renderConfExpenses(){
 const p=document.getElementById('hlgbConfExpense9251');if(!p)return;const range=selectedHubRange(),rows=confExpenseRows(range),groups={};
 for(const e of rows){const n=expenseCenterName(e);groups[n]=(groups[n]||0)+q(e.value)}
 const total=rows.reduce((a,e)=>a+q(e.value),0),count=rows.length,avg=count?total/count:0,top=Object.entries(groups).sort((a,b)=>b[1]-a[1])[0];
 const cards=document.getElementById('hlgbConfExpenseCards9251');if(cards)cards.innerHTML='<div class="card"><small>'+escSafe(range.label)+'</small><strong>'+moneySafe(total)+'</strong></div><div class="card"><small>Lançamentos</small><strong>'+count.toLocaleString('pt-BR')+'</strong></div><div class="card"><small>Média por lançamento</small><strong>'+moneySafe(avg)+'</strong></div><div class="card"><small>Maior gasto por local</small><strong>'+(top?escSafe(top[0]):'-')+'</strong><div class="sub">'+(top?moneySafe(top[1]):moneySafe(0))+'</div></div>';
 const g=document.getElementById('hlgbConfExpenseGraph9251');if(g)g.innerHTML='<h3>Comparativo por confecção</h3>'+graphHtml(groups);
 const t=document.getElementById('hlgbConfExpenseTable9251');if(t){const rs=rows.slice().sort((a,b)=>sid(b.date).localeCompare(sid(a.date))).map(e=>'<tr><td>'+escSafe(e.date||'-')+'</td><td><b>'+escSafe(expenseCenterName(e))+'</b></td><td>'+escSafe(e.subcategory||e.description||'-')+'</td><td>'+escSafe(e.paymentMethod||'-')+'</td><td><b>'+moneySafe(e.value)+'</b></td></tr>').join('');t.innerHTML=rs?'<div style="overflow:auto"><table><thead><tr><th>Data</th><th>Confecção/local</th><th>Tipo</th><th>Pagamento</th><th>Valor</th></tr></thead><tbody>'+rs+'</tbody></table></div>':''}
}
function paymentDate(p){return sid(p?.paymentDate||p?.paidAt||p?.realizedAt||'').slice(0,10)}
function isPaidFactionPayment(p){return ['pago','paga','realizado','realizada'].includes(norm(p?.status))&&paymentDate(p)>=CUTOFF;}
function factionPaymentValue(p){return q(p?.paidAmount)||q(p?.value)||q(p?.total)||q(p?.quantity)*q(p?.unitPrice);}
function existingFactionHub(p){const id=sid(p?.id);return arr('hubFinanceEntries').some(e=>e&&sid(e.sourceId)===id&&norm(e.category).includes('facc'));}
async function syncPaidFactionPayments(){
 if(syncPaidFactionPayments.busy)return;syncPaidFactionPayments.busy=true;
 try{
  const list=arr('factionPayments').filter(isPaidFactionPayment);
  for(const p of list){if(existingFactionHub(p))continue;const value=factionPaymentValue(p);if(value<=0)continue;const date=paymentDate(p),name=sid(p.factionName||p.name||'Facção').trim()||'Facção',desc=sid(p.description||p.productName||'Pagamento de facção').trim();
   const row={id:'fpayhub-'+sid(p.id),flow:'Saída',description:'Pagamento de facção — '+name+(desc?' — '+desc:''),value,date,category:'Facções',subcategory:'Pagamento de facção',person:name,status:'Realizado',realizedAt:date,paymentMethod:sid(p.paymentMethod||''),acceptedMethods:p.paymentMethod?[sid(p.paymentMethod)]:[],note:'Lançado automaticamente ao finalizar pagamento de facção.',costCenterName:name,sourceType:'faction_payment_auto_v9251',sourceId:sid(p.id),createdAt:now(),updatedAt:now()};
   try{await saveRow('hubFinanceEntries',row)}catch(e){console.warn('[HLGB '+V+'] falha ao lançar pagamento de facção no Hub',p.id,e)}
  }
 }finally{syncPaidFactionPayments.busy=false}
}
function decorateSupplierDebt(){
 const c=document.getElementById('supplierDebtCards9250'),e=document.getElementById('supplierDebtEvolution9250');if(!c||!e)return;
 const debts=arr('supplierDebts').filter(x=>x.active!==false),tx=arr('supplierDebtTransactions').filter(x=>x.status!=='Cancelado'),purchases=arr('purchases');
 const debtBalance=debts.reduce((a,d)=>{let b=q(d.originalValue);for(const x of tx.filter(t=>sid(t.debtId)===sid(d.id))){if(['Pagamento','Abatimento'].includes(x.type))b-=q(x.value);else if(['Juros','Acréscimo'].includes(x.type))b+=q(x.value)}return a+Math.max(0,b)},0);
 const open=purchases.map(p=>{const total=q(p.total),paid=norm(p.status)==='pago'?total:q(p.paid||p.paidAmount),remain=Math.max(0,total-paid),due=sid(p.dueDate||p.date).slice(0,10);return {p,total,paid,remain,due}}).filter(x=>x.remain>0);
 const overdue=open.filter(x=>x.due&&x.due<today()).reduce((a,x)=>a+x.remain,0),dueToday=open.filter(x=>x.due===today()).reduce((a,x)=>a+x.remain,0),future=open.filter(x=>x.due>today()).reduce((a,x)=>a+x.remain,0),openPurchases=open.reduce((a,x)=>a+x.remain,0);
 const month=today().slice(0,7),paidDebtMonth=tx.filter(x=>sid(x.date).slice(0,7)===month&&['Pagamento','Abatimento'].includes(x.type)).reduce((a,x)=>a+q(x.value),0);
 c.innerHTML='<div class="card"><small>Dívida antiga atual</small><strong>'+moneySafe(debtBalance)+'</strong></div><div class="card"><small>Notas em aberto hoje</small><strong>'+moneySafe(openPurchases)+'</strong></div><div class="card"><small>Vencidas</small><strong>'+moneySafe(overdue)+'</strong></div><div class="card"><small>Vencem hoje</small><strong>'+moneySafe(dueToday)+'</strong></div><div class="card"><small>A vencer</small><strong>'+moneySafe(future)+'</strong></div><div class="card"><small>Total exposto atual</small><strong>'+moneySafe(debtBalance+openPurchases)+'</strong></div><div class="card"><small>Pago/abatido dívida antiga no mês</small><strong>'+moneySafe(paidDebtMonth)+'</strong></div>';
 const hist={};for(const p of purchases){const m=sid(p.date||p.issueDate||p.createdAt).slice(0,7);if(!/^\d{4}-\d{2}$/.test(m))continue;const total=q(p.total),paid=norm(p.status)==='pago'?total:q(p.paid||p.paidAmount),remain=Math.max(0,total-paid);hist[m]=hist[m]||{bought:0,paid:0,open:0};hist[m].bought+=total;hist[m].paid+=Math.min(total,paid);hist[m].open+=remain}
 const histRows=Object.entries(hist).sort((a,b)=>b[0].localeCompare(a[0])).slice(0,12).map(([m,d])=>'<tr><td>'+escSafe(m)+'</td><td>'+moneySafe(d.bought)+'</td><td>'+moneySafe(d.paid)+'</td><td><b>'+moneySafe(d.open)+'</b></td></tr>').join('');
 const fut={};for(const x of open){if(!x.due)continue;const m=x.due.slice(0,7);fut[m]=(fut[m]||0)+x.remain}
 const futRows=Object.entries(fut).sort((a,b)=>a[0].localeCompare(b[0])).map(([m,v])=>'<tr><td>'+escSafe(m)+'</td><td><b>'+moneySafe(v)+'</b></td></tr>').join('');
 e.innerHTML='<h3>Histórico das compras</h3><div class="sub">Mostra quanto foi comprado em cada mês, quanto dessas compras já está quitado e quanto ainda permanece aberto hoje.</div>'+(histRows?'<div style="overflow:auto"><table><thead><tr><th>Mês da compra</th><th>Comprado</th><th>Quitado</th><th>Saldo ainda aberto</th></tr></thead><tbody>'+histRows+'</tbody></table></div>':'<div class="empty">Sem histórico.</div>')+'<h3 style="margin-top:18px">Projeção de pagamentos futuros</h3><div class="sub">Notas ainda abertas agrupadas pelo mês de vencimento. Lançamentos de outubro, novembro, dezembro e meses seguintes permanecem visíveis enquanto não forem pagos.</div>'+(futRows?'<div style="overflow:auto"><table><thead><tr><th>Mês de vencimento</th><th>Valor a pagar</th></tr></thead><tbody>'+futRows+'</tbody></table></div>':'<div class="empty">Nenhuma nota futura em aberto.</div>');
}
function fixCuttersOverflow(){
 const page=document.querySelector('#cutters.page.active,#cortadores.page.active,[id*="cortador" i].page.active');if(!page)return;for(const t of page.querySelectorAll('table')){t.style.maxWidth='100%';t.style.width='100%';t.style.tableLayout='auto'}for(const x of page.querySelectorAll('.table-wrap,.table-responsive,[style*="overflow"]'))x.style.maxWidth='100%';
}
function collectionStamp(name){const a=arr(name),last=a[a.length-1];return name+':'+a.length+':'+sid(last?.id)+':'+sid(last?.updatedAt||last?.updated_at||last?.date||last?.status||'')}
function refreshSignature(){let range='';try{const r=selectedHubRange();range=r.start+'|'+r.end}catch(e){}return [collectionStamp('hubFinanceEntries'),collectionStamp('purchases'),collectionStamp('supplierDebts'),collectionStamp('supplierDebtTransactions'),range].join('||')}
let lastRefreshSig='';
function refresh(force=false){
 if(!hubActive()||editing())return false;
 const sig=refreshSignature();if(!force&&sig===lastRefreshSig)return false;
 if(!ensureConfExpensePanel())return false;
 renderConfExpenses();decorateSupplierDebt();lastRefreshSig=sig;return true;
}
const oldHub=window.renderHubFinance;if(typeof oldHub==='function'&&!oldHub.__financeLocations9251){const w=function(){const r=oldHub.apply(this,arguments);setTimeout(()=>refresh(true),80);setTimeout(syncPaidFactionPayments,140);return r};w.__financeLocations9251=true;w.__original=oldHub;window.renderHubFinance=w}
const oldIncoming=window.hlgbRenderIncomingRecord;if(typeof oldIncoming==='function'&&!oldIncoming.__financeLocations9251){const w=function(module){const r=oldIncoming.apply(this,arguments);if(['hubFinanceEntries','factionPayments','purchases','supplierDebts','supplierDebtTransactions'].includes(module)){setTimeout(()=>refresh(true),80);if(module==='factionPayments')setTimeout(syncPaidFactionPayments,140)}return r};w.__financeLocations9251=true;w.__original=oldIncoming;window.hlgbRenderIncomingRecord=w}
setTimeout(()=>{refresh(true);syncPaidFactionPayments();fixCuttersOverflow()},2400);
setInterval(()=>{if(hubActive()&&!editing())refresh(false);syncPaidFactionPayments();fixCuttersOverflow()},30000);
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'){setTimeout(()=>refresh(false),180);setTimeout(syncPaidFactionPayments,260)}},false);
window.hlgbFinanceLocations9251={renderConfExpenses,syncPaidFactionPayments,decorateSupplierDebt,costCenters,CUTOFF,refresh,refreshSignature,version:V};
window.HLGB_FINANCE_LOCATIONS_GUARD=V;
console.info('[HLGB] '+V+' ativo — refresh do Hub por mudança, sem redraw a cada 5s');
})();