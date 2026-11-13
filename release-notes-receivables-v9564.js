/* HLGB v95.64 — Painel de notas / contas a receber.
 * Apenas leitura e navegação para acertos existentes; jamais altera WAL nem dados. */
(function(){
'use strict';
if(window.hlgbNotesReceivables9564)return;
const ID='hlgbNotesReceivables9564',V='95.64';
const state={tab:'open',client:'',search:'',min:'',max:'',basis:'total',dateBasis:'due',from:'',to:'',sort:'due',lastCloud:'',draws:0};
const sid=x=>String(x??''),num=x=>Math.max(0,Number(x)||0),cent=x=>Math.round(num(x)*100);
const norm=x=>sid(x).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
const esc=x=>sid(x).replace(/[&<>"']/g,k=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[k]));
const sum=(rows,key)=>rows.reduce((v,x)=>v+(x[key]||0),0);
const brl=c=>(c/100).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const records=()=>{try{return typeof db!=='undefined'&&db?db:window.db||{}}catch(_){return window.db||{}}};
const list=k=>Array.isArray(records()[k])?records()[k]:[];
function date(v){
 const s=sid(v).slice(0,10);
 if(!/^\d{4}-\d{2}-\d{2}$/.test(s))return '';
 const d=new Date(+s.slice(0,4),+s.slice(5,7)-1,+s.slice(8,10));
 return d.getFullYear()===+s.slice(0,4)&&d.getMonth()+1===+s.slice(5,7)&&d.getDate()===+s.slice(8,10)?s:'';
}
function today(){const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')}
function dateFmt(v){return v?v.slice(8,10)+'/'+v.slice(5,7)+'/'+v.slice(0,4):'Sem vencimento'}
function days(a,b){return a?Math.round((Date.UTC(+a.slice(0,4),+a.slice(5,7)-1,+a.slice(8,10))-Date.UTC(+b.slice(0,4),+b.slice(5,7)-1,+b.slice(8,10)))/86400000):null}
function canonical(){
 try{const f=window.hlgbCanonicalProjectionInvoices;if(typeof f==='function'){const x=f();if(Array.isArray(x))return x}}catch(_){}
 const shadows=typeof window.hlgbNoteLegacyShadowIds==='function'?window.hlgbNoteLegacyShadowIds():new Set();
 return list('projectionInvoices').filter(n=>n&&!shadows?.has?.(sid(n.id))&&!n.migratedToNoteQueueV9223&&!(n.items||[]).some(i=>i?.source==='faction_delivery_v9140'));
}
function projectionView(inv){
 const total=cent(inv.value!=null?inv.value:(inv.items||[]).reduce((s,i)=>s+num(i.value||num(i.qty)*num(i.unitPrice)),0));
 const history=Array.isArray(inv.paymentHistory)?inv.paymentHistory:[];
 const finance=list('finance').find(x=>sid(x.projectionInvoiceId)===sid(inv.id));
 let paid=history.length?history.reduce((s,p)=>s+cent(p.value),0):
  inv.paid!=null?cent(inv.paid):finance?.paid!=null?cent(finance.paid):
  inv.remaining!=null?Math.max(0,total-cent(inv.remaining)):0;
 paid=Math.min(total,paid);const credit=Array.isArray(inv.acertoReturnsV9565)?inv.acertoReturnsV9565.reduce((sum,x)=>sum+(x?.reversedAt?0:cent(x?.value)),0):0;const balance=Math.max(0,total-paid-credit);
 return {type:'projection',id:sid(inv.id),key:'projection:'+sid(inv.id),
 number:sid(inv.externalNoteNumber||inv.noteNumber||inv.id),
 client:sid(inv.client||inv.clientName||'Sem cliente'),
 clientKey:inv.clientId!=null&&sid(inv.clientId)?'id:'+sid(inv.clientId):'name:'+norm(inv.client||inv.clientName||'Sem cliente'),
 issued:date(inv.issueDate||inv.date),due:date(inv.dueDate),
 total,paid,credit,balance,terms:sid(inv.terms||inv.paymentTerms||'-'),source:'Nota de entrega',
 mismatch:inv.remaining!=null&&Math.abs(cent(inv.remaining)-balance)>1};
}
function orderView(o){
 const total=cent(o.total),history=Array.isArray(o.paymentHistory)?o.paymentHistory:[];
 const paid=Math.min(total,history.length?history.reduce((s,p)=>s+cent(p.value),0):cent(o.received));
 const credit=Array.isArray(o.acertoReturnsV9565)?o.acertoReturnsV9565.reduce((sum,x)=>sum+(x?.reversedAt?0:cent(x?.value)),0):0;
 return {type:'order',id:sid(o.id),key:'order:'+sid(o.id),number:sid(o.orderNumber||o.id),
 client:sid(o.client||'Sem cliente'),
 clientKey:o.clientId!=null&&sid(o.clientId)?'id:'+sid(o.clientId):'name:'+norm(o.client||'Sem cliente'),
 issued:date(o.invoiceDate||o.date),due:date(o.dueDate),total,paid,credit,balance:Math.max(0,total-paid-credit),
 terms:sid(o.paymentTerms||'-'),source:'Pedido com nota pronta',
 mismatch:o.remaining!=null&&Math.abs(cent(o.remaining)-Math.max(0,total-paid-credit))>1};
}
function allNotes(){
 const original=canonical().filter(x=>x&&x.id!=null&&!/cancelad|excluid/.test(norm(x.status)));
 const invoices=original.map(projectionView);
 // An order may also have a delivery invoice. Count the invoice, not the same
 // sale twice as both a prepared order and a projection invoice.
 const linkedOrders=new Set();
 for(const n of original){
  if(n.orderId!=null)linkedOrders.add(sid(n.orderId));
  for(const i of Array.isArray(n.items)?n.items:[])if(i?.orderId!=null)linkedOrders.add(sid(i.orderId));
 }
 const existing=new Set(list('invoices').filter(x=>x&&!/cancelad|excluid/.test(norm(x.status))).map(x=>sid(x.orderId)));
 for(const o of list('orders'))
  if(o&&o.id!=null&&!linkedOrders.has(sid(o.id))&&
     (o.invoiceReady===true||o.noteReady===true||existing.has(sid(o.id)))&&
     !/cancelad|excluid/.test(norm(o.status)))invoices.push(orderView(o));
 return [...new Map(invoices.map(x=>[x.key,x])).values()];
}
function category(n,now=today()){
 if(n.balance<=1)return n.credit>0?'compensated':'paid';
 if(!n.due)return 'unknown';
 return n.due<now?'overdue':n.due===now?'today':'upcoming';
}
function matchTab(n,tab,now){
 const k=category(n,now);
 return tab==='all'||(tab==='open'&&n.balance>1)||(tab==='paid'&&k==='paid')||(tab==='compensated'&&k==='compensated')||
 (tab==='overdue'&&k==='overdue')||(tab==='upcoming'&&(k==='today'||k==='upcoming'));
}
function weekBounds(offset=0,at=today()){
 const year=+at.slice(0,4),month=+at.slice(5,7)-1,day=+at.slice(8,10);
 const start=new Date(year,month,day),weekday=(start.getDay()+6)%7;
 start.setDate(start.getDate()-weekday+offset*7);
 const end=new Date(start);end.setDate(end.getDate()+6);
 const fmt=x=>x.getFullYear()+'-'+String(x.getMonth()+1).padStart(2,'0')+'-'+String(x.getDate()).padStart(2,'0');
 return {from:fmt(start),to:fmt(end)};
}
function filterAll(rows){
 const needle=norm(state.search),min=state.min===''?null:cent(state.min),max=state.max===''?null:cent(state.max);
 return rows.filter(x=>{
  if(state.client&&x.clientKey!==state.client)return false;
  if(needle&&!norm(x.client+' '+x.number+' '+x.terms+' '+x.source).includes(needle))return false;
  const val=state.basis==='balance'?x.balance:x.total;
  if(min!==null&&val<min)return false;if(max!==null&&val>max)return false;
  const period=state.dateBasis==='issued'?x.issued:x.due;
  if(state.from&&(!period||period<state.from))return false;
  if(state.to&&(!period||period>state.to))return false;
  return true;
 });
}
function sortRows(rows){
 return rows.slice().sort((a,b)=>{
  if(state.sort==='client')return a.client.localeCompare(b.client,'pt-BR')||a.due.localeCompare(b.due);
  if(state.sort==='balance')return b.balance-a.balance||a.client.localeCompare(b.client,'pt-BR');
  if(state.sort==='value')return b.total-a.total||a.client.localeCompare(b.client,'pt-BR');
  return (state.tab==='paid'?1:-1)*(b.due||'9999-12-31').localeCompare(a.due||'9999-12-31')||a.client.localeCompare(b.client,'pt-BR');
 });
}
function calculate(rows,now=today()){
 const opened=rows.filter(x=>x.balance>1),paid=rows.filter(x=>category(x,now)==='paid'),compensated=rows.filter(x=>category(x,now)==='compensated'),
 overdue=opened.filter(x=>category(x,now)==='overdue'),
 future=opened.filter(x=>['today','upcoming'].includes(category(x,now))),
 next7=future.filter(x=>days(x.due,now)<=7),
 todayRows=future.filter(x=>x.due===now),
 unknown=opened.filter(x=>!x.due);
 return {all:[rows.length,sum(rows,'total')],open:[opened.length,sum(opened,'balance')],
 paid:[paid.length,sum(paid,'total')],compensated:[compensated.length,sum(compensated,'credit')],overdue:[overdue.length,sum(overdue,'balance')],
 upcoming:[future.length,sum(future,'balance')],next7:[next7.length,sum(next7,'balance')],
 today:[todayRows.length,sum(todayRows,'balance')],unknown:[unknown.length,sum(unknown,'balance')],
 received:[rows.filter(x=>x.paid>0).length,sum(rows,'paid')],credits:[rows.filter(x=>x.credit>0).length,sum(rows,'credit')]};
}
function label(n,now){
 const group=category(n,now),dist=days(n.due,now);
 if(group==='paid')return ['Pago','ok'];
 if(group==='compensated')return ['Compensada por devolução','ok'];
 if(group==='unknown')return ['Sem vencimento','warn'];
 if(group==='overdue')return ['Vencida há '+Math.abs(dist)+' dia(s)','bad'];
 if(group==='today')return ['Vence hoje','warn'];
 if(dist===1)return ['Vence amanhã','warn'];
 if(dist<=7)return ['Em '+dist+' dias','warn'];
 return ['A vencer',''];
}
function ensure(){
 const page=document.getElementById('notas');if(!page)return null;
 let root=document.getElementById(ID);if(root)return root;
 const css=document.createElement('style');css.id=ID+'Css';css.textContent=[
 '#'+ID+'{padding:14px;margin:12px 0 18px;border:1px solid #e3d1de;background:#fffafb}',
 '#'+ID+' .nr-tabs{display:flex;gap:7px;flex-wrap:wrap;margin:12px 0}',
 '#'+ID+' .nr-tabs button{min-width:112px;min-height:52px;text-align:left}',
 '#'+ID+' .nr-tabs button[aria-selected="true"]{background:#6c3958;color:#fff}',
 '#'+ID+' .nr-stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(135px,1fr));gap:9px;margin:12px 0}',
 '#'+ID+' .nr-stat{background:#fff;border:1px solid #e7dfe6;border-radius:8px;padding:11px}',
 '#'+ID+' .nr-stat small,#'+ID+' .nr-stat strong,#'+ID+' .nr-stat span{display:block}',
 '#'+ID+' .nr-stat strong{font-size:19px;margin:5px 0}',
 '#'+ID+' .nr-filters{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:9px;margin:12px 0}',
 '#'+ID+' .nr-filters label{display:block;font-size:12px;font-weight:600;margin-bottom:4px}',
 '#'+ID+' .nr-filters input,#'+ID+' .nr-filters select{width:100%;box-sizing:border-box;padding:7px;min-height:38px;border:1px solid #c9b8c4;border-radius:6px;background:#fff}',
 '#'+ID+' .nr-table{overflow-x:auto;max-width:100%}',
 '#'+ID+' table{width:100%;border-collapse:collapse}',
 '#'+ID+' td,#'+ID+' th{padding:8px 7px;border-bottom:1px solid #ece7ec;text-align:left;white-space:nowrap}',
 '#'+ID+' td.nr-money,#'+ID+' th.nr-money{text-align:right;font-variant-numeric:tabular-nums}',
 '#'+ID+' .nr-actions{display:flex;gap:5px}',
 '#'+ID+' .nr-row{display:flex;gap:10px;align-items:center;justify-content:space-between;flex-wrap:wrap;margin:10px 0}',
 '@media(max-width:650px){#'+ID+'{padding:9px}#'+ID+' .nr-stat strong{font-size:16px}}'
 ].join('');document.head.appendChild(css);
 root=document.createElement('section');root.id=ID;root.className='panel';
 root.innerHTML='<div class="nr-row" style="margin:0"><div><h2 style="margin:0">💳 Controle de notas e recebimentos</h2>'+
 '<div class="sub">Abas por situação, vencimentos e totais por cliente</div></div>'+
 '<button type="button" class="secondary" data-action="cloud">☁️ Conferir na nuvem</button></div>'+
 '<div class="nr-stats" id="nr-stats"></div><div class="nr-tabs" id="nr-tabs" role="tablist"></div>'+
 '<div class="nr-filters"><div><label for="nr-client">Cliente</label><select id="nr-client"><option value="">Todos</option></select></div>'+
 '<div><label for="nr-search">Pesquisar cliente / nota</label><input id="nr-search" placeholder="Número, cliente, condição"></div>'+
 '<div><label for="nr-basis">Filtrar valor por</label><select id="nr-basis"><option value="total">Valor total</option><option value="balance">Saldo a receber</option></select></div>'+
 '<div><label for="nr-min">Valor mínimo (R$)</label><input type="number" min="0" step="0.01" id="nr-min" placeholder="Sem mínimo"></div>'+
 '<div><label for="nr-max">Valor máximo (R$)</label><input type="number" min="0" step="0.01" id="nr-max" placeholder="Sem máximo"></div>'+
 '<div><label for="nr-dateBasis">Pesquisar semana por</label><select id="nr-dateBasis"><option value="due">Vencimento</option><option value="issued">Data de emissão/entrega</option></select></div>'+ 
 '<div><label for="nr-from">Período de</label><input type="date" id="nr-from"></div>'+
 '<div><label for="nr-to">Vencimento até</label><input type="date" id="nr-to"></div>'+
 '<div><label for="nr-sort">Ordenar por</label><select id="nr-sort"><option value="due">Vencimento</option><option value="client">Cliente</option><option value="balance">Maior saldo</option><option value="value">Maior nota</option></select></div></div>'+
 '<div class="nr-row"><div><button type="button" class="secondary" data-action="week" data-week="0">Esta semana</button> '+
 '<button type="button" class="secondary" data-action="week" data-week="-1">Semana anterior</button> '+
 '<button type="button" class="secondary" data-action="clear">Limpar filtros</button> '+
 '<button type="button" class="secondary" data-action="csv">⬇️ Exportar CSV</button></div>'+
 '<span class="sub" id="nr-sync" role="status"></span></div>'+
 '<div id="nr-summary"></div><div id="nr-table"></div><div id="nr-agenda"></div>';
 const title=page.querySelector('h1');if(title)title.insertAdjacentElement('afterend',root);else page.prepend(root);
 const fields={client:'client',search:'search',basis:'basis',min:'min',max:'max',dateBasis:'dateBasis',from:'from',to:'to',sort:'sort'};
 for(const [id,key] of Object.entries(fields)){
  const el=root.querySelector('#nr-'+id);el.addEventListener(['search','min','max'].includes(id)?'input':'change',()=>{state[key]=el.value;paint()});
 }
 root.addEventListener('click',async e=>{
  const b=e.target?.closest?.('button[data-action]');if(!b||!root.contains(b))return;
  const action=b.dataset.action;
  if(action==='tab'){state.tab=b.dataset.tab;paint();return}
  if(action==='week'){const span=weekBounds(Number(b.dataset.week)||0);state.from=span.from;state.to=span.to;root.querySelector('#nr-from').value=state.from;root.querySelector('#nr-to').value=state.to;paint();return}
  if(action==='history'){state.client=sid(b.dataset.client);state.tab='all';state.search='';state.from='';state.to='';root.querySelector('#nr-search').value='';root.querySelector('#nr-from').value='';root.querySelector('#nr-to').value='';root.querySelector('#nr-client').value=state.client;paint();return}
  if(action==='clear'){for(const key of Object.values(fields))state[key]=key==='basis'?'total':key==='sort'?'due':key==='dateBasis'?'due':'';for(const [id,key] of Object.entries(fields))root.querySelector('#nr-'+id).value=state[key];paint();return}
  if(action==='csv'){exportCsv();return}
  if(action==='cloud'){
   const sync=window.hlgbNotesLiveSync9563;
   if(typeof sync?.refresh!=='function'){state.lastCloud='Consulta autenticada indisponível nesta sessão.';paint();return}
   b.disabled=true;state.lastCloud='Conferindo a nuvem sem descartar pendências…';paint();
   try{const result=await sync.refresh('painel-notas-v9564',true);
    state.lastCloud=result?.ok?'Conferência concluída; pendências locais preservadas.':'Conferência não confirmada: '+sid(result?.error||'indisponível');
   }catch(err){state.lastCloud='Falha na conferência: '+sid(err?.message||err)}finally{b.disabled=false;paint()}
   return;
  }
  const id=b.dataset.id,type=b.dataset.type;
  if(!id||!['projection','order'].includes(type))return;
  if(action==='view'&&type==='projection')window.hlgbViewNote9411?.(id);
  if(action==='view'&&type==='order')window.viewOrderDetails?.(id);
  if(action==='pdf'&&type==='projection')window.hlgbDownloadNotePdf9411?.(id);
  if(action==='pay'&&type==='projection')window.openProjectionAcerto9214?.(id);
  if(action==='edit'&&type==='projection')window.openProjectionAcerto9214?.(id);
  if(action==='pay'&&type==='order')window.openAcerto?.(id);
 });
 return root;
}
function clientOptions(root,rows){
 const sel=root.querySelector('#nr-client'),opts=[...new Map(rows.map(x=>[x.clientKey,x.client])).entries()].sort((a,b)=>a[1].localeCompare(b[1],'pt-BR')),stamp=JSON.stringify(opts);
 if(sel.dataset.stamp===stamp)return;
 sel.innerHTML='<option value="">Todos os clientes</option>'+opts.map(([k,v])=>'<option value="'+esc(k)+'">'+esc(v)+'</option>').join('');
 sel.dataset.stamp=stamp;
 if(state.client&&!opts.some(x=>x[0]===state.client))state.client='';
 sel.value=state.client;
}
function actionButton(action,n,text){return '<button type="button" class="secondary" data-action="'+action+'" data-type="'+esc(n.type)+'" data-id="'+esc(n.id)+'">'+esc(text)+'</button>'}
function agenda(rows,now){
 const open=rows.filter(x=>x.balance>1);
 const buckets=[['Atrasadas',n=>n.due&&n.due<now],['Hoje',n=>n.due===now],['Amanhã',n=>days(n.due,now)===1],
 ['2–7 dias',n=>days(n.due,now)>=2&&days(n.due,now)<=7],
 ['8–15 dias',n=>days(n.due,now)>=8&&days(n.due,now)<=15],
 ['16–30 dias',n=>days(n.due,now)>=16&&days(n.due,now)<=30],
 ['Após 30 dias',n=>days(n.due,now)>30],['Sem vencimento',n=>!n.due]];
 return '<details open style="margin-top:15px"><summary><b>🗓️ Organizador de vencimentos</b> · saldos ainda a receber</summary><div class="nr-stats">'+
 buckets.map(([label,test])=>{const hits=open.filter(test);return '<div class="nr-stat"><small>'+esc(label)+'</small><strong>'+brl(sum(hits,'balance'))+'</strong><span class="sub">'+hits.length+' nota(s)</span></div>'}).join('')+'</div></details>';
}
function byClient(rows){
 const group=new Map();
 for(const x of rows.filter(n=>n.balance>1)){const c=group.get(x.clientKey)||{name:x.client,balance:0,count:0};c.count++;c.balance+=x.balance;group.set(x.clientKey,c)}
 const result=[...group.values()].sort((a,b)=>b.balance-a.balance);
 return '<details style="margin-top:12px"><summary><b>👥 Totais por cliente em aberto</b></summary>'+
 (result.length?'<div class="nr-table"><table><thead><tr><th>Cliente</th><th>Notas</th><th class="nr-money">Saldo</th></tr></thead><tbody>'+
 result.map(x=>'<tr><td>'+esc(x.name)+'</td><td>'+x.count+'</td><td class="nr-money">'+brl(x.balance)+'</td></tr>').join('')+'</tbody></table></div>':
 '<div class="empty">Nenhuma nota aberta nos filtros.</div>')+'</details>';
}
function clientHistory(all){
 const groups=new Map();
 for(const n of all){
  const v=groups.get(n.clientKey)||{key:n.clientKey,name:n.client,notes:0,open:0,paid:0,balance:0};
  v.notes++;v.balance+=n.balance;if(n.balance>1)v.open++;else v.paid++;groups.set(n.clientKey,v);
 }
 const values=[...groups.values()].sort((a,b)=>a.name.localeCompare(b.name,'pt-BR'));
 return '<details style="margin-top:14px"><summary><b>📚 Histórico completo por cliente</b> · notas abertas e quitadas</summary>'+
 '<p class="sub">Selecione um cliente para consultar suas notas, inclusive pagas, sem limitar a semana atual.</p>'+
 (values.length?'<div class="nr-table"><table><thead><tr><th>Cliente</th><th>Notas</th><th>Em aberto</th><th>Quitadas</th><th class="nr-money">Saldo</th><th>Ações</th></tr></thead><tbody>'+
 values.map(v=>'<tr><td>'+esc(v.name)+'</td><td>'+v.notes+'</td><td>'+v.open+'</td><td>'+v.paid+'</td><td class="nr-money">'+brl(v.balance)+'</td><td><button type="button" class="secondary" data-action="history" data-client="'+esc(v.key)+'">Ver histórico</button></td></tr>').join('')+'</tbody></table></div>':
 '<div class="empty">Nenhum cliente com notas registradas.</div>')+'</details>';
}
function paint(){
 const root=ensure();if(!root)return false;
 const now=today(),all=allNotes();clientOptions(root,all);
 const base=filterAll(all),tot=calculate(base,now);
 const filtered=sortRows(base.filter(x=>matchTab(x,state.tab,now)));
 const tabs=[['open','Em aberto'],['overdue','Vencidas'],['upcoming','A vencer'],['paid','Pagas'],['compensated','Compensadas'],['all','Todas']];
 root.querySelector('#nr-stats').innerHTML=[['A receber','open'],['Recebido','received'],['Devoluções abatidas','credits'],['Vencidas','overdue'],['Vence hoje','today'],['Próximos 7 dias','next7'],['Sem vencimento','unknown']]
 .map(([label,key])=>'<div class="nr-stat"><small>'+label+'</small><strong>'+brl(tot[key][1])+'</strong><span class="sub">'+tot[key][0]+' nota(s)</span></div>').join('');
 root.querySelector('#nr-tabs').innerHTML=tabs.map(([key,label])=>
  '<button class="secondary" type="button" role="tab" data-action="tab" data-tab="'+key+'" aria-selected="'+(key===state.tab)+'">'+
  label+' ('+tot[key][0]+')<span style="display:block;font-size:12px">'+brl(tot[key][1])+'</span></button>').join('');
 const amount=state.tab==='compensated'?sum(filtered,'credit'):state.tab==='paid'||state.tab==='all'?sum(filtered,'total'):sum(filtered,'balance');
 root.querySelector('#nr-summary').innerHTML='<div class="nr-row"><b>'+filtered.length+' nota(s) · '+brl(amount)+'</b><span class="sub">Valores calculados sobre dados carregados. Pagamentos parciais deixam o saldo em aberto.</span></div>';
 const shown=filtered.slice(0,300);
 root.querySelector('#nr-table').innerHTML=shown.length?'<div class="nr-table"><table><thead><tr><th>Nota</th><th>Cliente</th><th>Emissão</th><th>Vencimento</th><th class="nr-money">Total</th><th class="nr-money">Recebido</th><th class="nr-money">Devoluções</th><th class="nr-money">Saldo</th><th>Situação</th><th>Ações</th></tr></thead><tbody>'+
 shown.map(n=>{const badge=label(n,now),partial=n.balance>1&&n.paid>0?' · Parcial':'';
 const actions=actionButton('view',n,n.type==='order'?'Ver pedido':'Ver')+
 (n.type==='projection'&&typeof window.hlgbDownloadNotePdf9411==='function'?actionButton('pdf',n,'PDF'):'')+
 (n.type==='order'?(n.balance>1&&typeof window.openAcerto==='function'?actionButton('pay',n,'Acerto'):''):(typeof window.openProjectionAcerto9214==='function'?actionButton(n.balance>1?'pay':'edit',n,n.balance>1?'Acerto':'Abrir / editar'):''));
 return '<tr><td><b>#'+esc(n.number)+'</b><div class="sub">'+esc(n.source)+'</div></td><td>'+esc(n.client)+'</td><td>'+esc(n.issued?dateFmt(n.issued):'-')+'</td>'+
 '<td>'+esc(dateFmt(n.due))+'</td><td class="nr-money">'+brl(n.total)+'</td><td class="nr-money">'+brl(n.paid)+'</td><td class="nr-money">'+brl(n.credit)+'</td><td class="nr-money">'+brl(n.balance)+'</td>'+
 '<td><span class="badge '+badge[1]+'">'+esc(badge[0]+partial)+'</span>'+(n.mismatch?'<div style="color:#a66300">⚠ Conferir saldo</div>':'')+'</td><td><div class="nr-actions">'+actions+'</div></td></tr>';
 }).join('')+'</tbody></table></div>':'<div class="empty" style="padding:14px">Nenhuma nota encontrada nos filtros.</div>';
 if(filtered.length>300)root.querySelector('#nr-table').insertAdjacentHTML('beforeend','<div class="sub">Exibindo 300 notas; CSV exporta todos os resultados filtrados.</div>');
 root.querySelector('#nr-agenda').innerHTML=agenda(base,now)+byClient(base)+clientHistory(all);
 const s=window.hlgbNotesLiveSync9563?.status?.();
 root.querySelector('#nr-sync').textContent=state.lastCloud||(s?.unverified?'⚠ Última leitura da nuvem sem confirmação.':s?.lastAt?'Nuvem conferida: '+new Date(s.lastAt).toLocaleString('pt-BR'):'Sem prova de atualização da nuvem nesta sessão.');
 state.draws++;return true;
}
function exportRows(){return sortRows(filterAll(allNotes()).filter(x=>matchTab(x,state.tab,today())))}
function csvCell(v){let t=sid(v);if(/^[=+\-@\t\r]/.test(t))t="'"+t;return '"'+t.replace(/"/g,'""')+'"'}
function exportCsv(){
 const rows=[['Origem','Nota','Cliente','Emissão','Vencimento','Situação','Total','Recebido','Devoluções','Saldo','Condição']];
 for(const n of exportRows())rows.push([n.source,n.number,n.client,n.issued,n.due,label(n,today())[0],
 (n.total/100).toFixed(2).replace('.',','),(n.paid/100).toFixed(2).replace('.',','),(n.credit/100).toFixed(2).replace('.',','),(n.balance/100).toFixed(2).replace('.',','),n.terms]);
 const blob=new Blob(['\uFEFF'+rows.map(x=>x.map(csvCell).join(';')).join('\r\n')],{type:'text/csv;charset=utf-8'}),
 url=URL.createObjectURL(blob),a=document.createElement('a');
 a.href=url;a.download='HLGB-notas-'+today()+'.csv';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1800);
 return rows.length-1;
}
function hasPanelWrapper(fn){
 const seen=new Set();let f=fn;
 while(typeof f==='function'&&!seen.has(f)){
  if(f.__hlgbReceivables9564)return true;
  seen.add(f);f=f.__original||null;
 }
 return false;
}
function install(){
 ensure();paint();
 const old=window.renderOrderNotes;
 if(typeof old==='function'&&!hasPanelWrapper(old)){
  const wrapper=function(){const result=old.apply(this,arguments);setTimeout(paint,0);return result};
  // Preserve the existing live-sync signature. Otherwise its delayed
  // installer could wrap us repeatedly, causing nested redraw loops.
  if(old.__hlgbNotesLive9563)wrapper.__hlgbNotesLive9563=true;
  wrapper.__hlgbReceivables9564=true;wrapper.__original=old;window.renderOrderNotes=wrapper;
 }
}
window.hlgbNotesReceivables9564={version:V,allNotes,projectionView,orderView,category,matchTab,calculate,filterAll,exportRows,paint,install,state,readOnly:true};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
[350,1300,3200].forEach(ms=>setTimeout(install,ms));
document.addEventListener('click',e=>{if(e.target?.closest?.('[onclick*="notas"]'))setTimeout(paint,40)},true);
window.addEventListener?.('hlgb:authenticated',()=>setTimeout(paint,350));
console.info('[HLGB] notas v'+V+' organização/recebíveis somente leitura');
})();