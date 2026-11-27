/* HLGB v95.64 — Painel de notas / contas a receber.
 * Apenas leitura e navegação para acertos existentes; jamais altera WAL nem dados. */
(function(){
'use strict';
if(window.hlgbNotesReceivables9564)return;
const ID='hlgbNotesReceivables9564',V='95.64';
const state={tab:'open',client:'',search:'',min:'',max:'',basis:'total',dateBasis:'due',from:'',to:'',sort:'due',lastCloud:'',draws:0,page:0};
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
// Archive eligibility must use unclamped evidence, not the display balance.
function exactPaidProof9771(row,totalKey,paidKey){
 const cents=v=>{if(typeof v!=='number'&&!(typeof v==='string'&&/^\d+(?:\.\d{1,2})?$/.test(v)))return null;const n=Number(v),k=Math.round(n*100);return Number.isSafeInteger(k)&&k>=0&&Math.abs(n*100-k)<.00001?k:null};
 const total=cents(row?.[totalKey]);if(total===null||total<=0)return false;
 const explicit=row[paidKey]==null?null:cents(row[paidKey]);
 if(row[paidKey]!=null&&explicit===null)return false;
 if(row.remaining!=null&&cents(row.remaining)!==0)return false;
 if(row.paymentHistory!=null&&!Array.isArray(row.paymentHistory))return false;
 const history=row.paymentHistory||[];
 if(history.length){const values=history.map(x=>cents(x?.value));if(values.some(x=>x===null||x<=0))return false;const paid=values.reduce((a,b)=>a+b,0);if(!Number.isSafeInteger(paid)||paid!==total||explicit!==null&&explicit!==paid)return false;}
 else if(explicit!==total)return false;
 if(row.acertoReturnsV9565!=null&&!Array.isArray(row.acertoReturnsV9565))return false;
 if((row.acertoReturnsV9565||[]).some(x=>!x?.reversedAt))return false;
 return true;
}
function noteItems9847(items){
 if(!Array.isArray(items)||!items.length)return {models:[],pieces:null};
 const groups=new Map();let total=0,valid=true;
 for(const x of items){const qty=Number(x?.qty),name=sid(x?.productName||x?.name||x?.product||''),pid=sid(x?.productId||x?.itemKey),key=JSON.stringify([pid,name]);
  if(x?.qty==null||!Number.isSafeInteger(qty)||qty<0||!name){valid=false;continue}
  total+=qty;const v=groups.get(key)||{name,productId:pid,qty:0};v.qty+=qty;groups.set(key,v);
 }
 return {models:[...groups.values()],pieces:valid&&Number.isSafeInteger(total)?total:null};
}
function projectionView(inv){
 const total=cent(inv.value!=null?inv.value:(inv.items||[]).reduce((s,i)=>s+num(i.value||num(i.qty)*num(i.unitPrice)),0));
 const history=Array.isArray(inv.paymentHistory)?inv.paymentHistory:[];
 const finance=list('finance').find(x=>sid(x.projectionInvoiceId)===sid(inv.id));
 let paid=history.length?history.reduce((s,p)=>s+cent(p.value),0):
  inv.paid!=null?cent(inv.paid):finance?.paid!=null?cent(finance.paid):
  inv.remaining!=null?Math.max(0,total-cent(inv.remaining)):0;
 paid=Math.min(total,paid);const credit=Array.isArray(inv.acertoReturnsV9565)?inv.acertoReturnsV9565.reduce((sum,x)=>sum+(x?.reversedAt?0:cent(x?.value)),0):0;const balance=Math.max(0,total-paid-credit);
 return {...noteItems9847(inv.items),type:'projection',id:sid(inv.id),key:'projection:'+sid(inv.id),
 number:sid(inv.externalNoteNumber||inv.noteNumber||inv.id),
 client:sid(inv.client||inv.clientName||'Sem cliente'),
 clientKey:inv.clientId!=null&&sid(inv.clientId)?'id:'+sid(inv.clientId):'name:'+norm(inv.client||inv.clientName||'Sem cliente'),
 issued:date(inv.issueDate||inv.date),due:date(inv.dueDate),
 total,paid,credit,balance,paymentEvidence:history.length>0||inv.paid!=null||finance?.paid!=null,sourceStatus:sid(inv.status),terms:sid(inv.terms||inv.paymentTerms||'-'),source:'Nota de entrega',
 archiveProof:exactPaidProof9771(inv,'value','paid'),mismatch:inv.remaining!=null&&Math.abs(cent(inv.remaining)-balance)>1};
}
function orderView(o){
 const total=cent(o.total),history=Array.isArray(o.paymentHistory)?o.paymentHistory:[];
 const paid=Math.min(total,history.length?history.reduce((s,p)=>s+cent(p.value),0):cent(o.received));
 const credit=Array.isArray(o.acertoReturnsV9565)?o.acertoReturnsV9565.reduce((sum,x)=>sum+(x?.reversedAt?0:cent(x?.value)),0):0;
 return {...noteItems9847(Array.isArray(o.grade)?o.grade.map(g=>({...g,productName:list('products').find(p=>sid(p.id)===sid(g.productId))?.name||g.productName||''})):[]),type:'order',id:sid(o.id),key:'order:'+sid(o.id),number:sid(o.orderNumber||o.id),
 client:sid(o.client||'Sem cliente'),
 clientKey:o.clientId!=null&&sid(o.clientId)?'id:'+sid(o.clientId):'name:'+norm(o.client||'Sem cliente'),
 issued:date(o.invoiceDate||o.date),due:date(o.dueDate),total,paid,credit,balance:Math.max(0,total-paid-credit),
 paymentEvidence:history.length>0||o.received!=null,sourceStatus:sid(o.status),terms:sid(o.paymentTerms||'-'),source:'Pedido com nota pronta',
 archiveProof:exactPaidProof9771(o,'total','received'),mismatch:o.remaining!=null&&Math.abs(cent(o.remaining)-Math.max(0,total-paid-credit))>1};
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
/* v97.10: archive only visual evidence; never move or modify the ledger. */
function settledForArchive9710(n){
 return !!n&&n.archiveProof===true&&!/cancelad|excluid|estornad/.test(norm(n.sourceStatus))&&n.paymentEvidence===true&&Number.isSafeInteger(n.total)&&n.total>0&&
 Number.isSafeInteger(n.paid)&&n.paid===n.total&&n.balance===0&&n.credit===0&&!n.mismatch;
}
function clientNotes9710(clientId,rows=allNotes()){
 const id=sid(clientId),clients=list('clients').filter(x=>x&&!x.deleted_at&&!x.deletedAt&&x.deleted!==true);
 const exact=clients.filter(x=>sid(x.id)===id);if(exact.length!==1)return {rows:[],ambiguous:0,available:false};
 const name=norm(exact[0].name),unique=!!name&&clients.filter(x=>norm(x.name)===name).length===1;
 return {rows:rows.filter(n=>n.clientKey==='id:'+id||(unique&&n.clientKey==='name:'+name)),
 ambiguous:unique?0:rows.filter(n=>n.clientKey==='name:'+name).length,available:true};
}
function pendingProtection9710(){
 try{
  const guard=window.hlgbWalIdbGuard9536,fn=window.hlgbRecordPendingIdentitySet9535,status=guard?.status?.();
  if(!status||status.readFailed!==false||!(Number(status.probes)>0)||typeof guard.ids!=='function'||typeof fn!=='function')return null;
  return new Set([...guard.ids(),...fn()].map(sid));
 }catch(_){return null}
}
function archiveAllowed9710(n,pending){
 if(!settledForArchive9710(n)||!pending)return false;
 const module=n.type==='projection'?'projectionInvoices':'orders',id=sid(n.id);
 const blocked=(m,k)=>pending.has(m+'::'+sid(k))||pending.has(m+'|'+sid(k));
 if(blocked(module,id))return false;
 // A pending finance edit can change the payment proof used for this note.
 if(list('finance').some(x=>sid(n.type==='projection'?x.projectionInvoiceId:x.orderId)===id&&blocked('finance',x.id)))return false;
 return true;
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
 const needle=norm(state.search).replace(/#/g,'').trim().split(/\s+/).filter(Boolean),min=state.min===''?null:cent(state.min),max=state.max===''?null:cent(state.max);
 return rows.filter(x=>{
  if(state.client&&x.clientKey!==state.client)return false;
  const searchable=norm([x.client,x.number,x.id,x.terms,x.source,...(x.models||[]).flatMap(m=>[m.name,m.productId])].join(' ')).replace(/#/g,'');
  if(needle.some(term=>!searchable.includes(term)))return false;
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
 '<div><label for="nr-search">Pesquisar cliente / nota / produto</label><input id="nr-search" placeholder="Número, cliente, produto, condição"></div>'+
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
  const el=root.querySelector('#nr-'+id);el.addEventListener(['search','min','max'].includes(id)?'input':'change',()=>{state[key]=el.value;state.page=0;paint()});
 }
 root.addEventListener('click',async e=>{
  const b=e.target?.closest?.('button[data-action]');if(!b||!root.contains(b))return;
  const action=b.dataset.action;
  if(action==='tab'){state.tab=b.dataset.tab;state.page=0;paint();return}
  if(action==='page'){state.page=Math.max(0,state.page+(b.dataset.step==='next'?1:-1));paint();return}
  if(action==='week'){state.page=0;const span=weekBounds(Number(b.dataset.week)||0);state.from=span.from;state.to=span.to;root.querySelector('#nr-from').value=state.from;root.querySelector('#nr-to').value=state.to;paint();return}
  if(action==='history'){state.page=0;state.client=sid(b.dataset.client);state.tab='all';state.search='';state.from='';state.to='';root.querySelector('#nr-search').value='';root.querySelector('#nr-from').value='';root.querySelector('#nr-to').value='';root.querySelector('#nr-client').value=state.client;paint();return}
  if(action==='clear'){state.page=0;for(const key of Object.values(fields))state[key]=key==='basis'?'total':key==='sort'?'due':key==='dateBasis'?'due':'';for(const [id,key] of Object.entries(fields))root.querySelector('#nr-'+id).value=state[key];paint();return}
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
  if(action==='print'&&type==='projection')window.hlgbPrintNote9411?.(id);
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
 const pageSize=100;state.page=Math.max(0,Math.min(Number.isSafeInteger(state.page)?state.page:0,Math.max(0,Math.ceil(filtered.length/pageSize)-1)));const shown=filtered.slice(state.page*pageSize,(state.page+1)*pageSize);
 root.querySelector('#nr-table').innerHTML=shown.length?'<div class="nr-table"><table><thead><tr><th>Nota</th><th>Cliente</th><th>Produtos / peças</th><th>Emissão</th><th>Vencimento</th><th class="nr-money">Total</th><th class="nr-money">Recebido</th><th class="nr-money">Devoluções</th><th class="nr-money">Saldo</th><th>Situação</th><th>Ações</th></tr></thead><tbody>'+
 shown.map(n=>{const badge=label(n,now),partial=n.balance>1&&n.paid>0?' · Parcial':'';
 const actions=actionButton('view',n,n.type==='order'?'Ver pedido':'Ver')+
 (n.type==='projection'&&typeof window.hlgbDownloadNotePdf9411==='function'?actionButton('pdf',n,'PDF'):'')+
 (n.type==='projection'&&typeof window.hlgbPrintNote9411==='function'?actionButton('print',n,'Imprimir'):'')+
 (n.type==='order'?(n.balance>1&&typeof window.openAcerto==='function'?actionButton('pay',n,'Acerto'):''):(typeof window.openProjectionAcerto9214==='function'?actionButton(n.balance>1?'pay':'edit',n,n.balance>1?'Acerto':'Abrir / editar'):''));
 return '<tr><td><b>#'+esc(n.number)+'</b><div class="sub">'+esc(n.source)+'</div></td><td>'+esc(n.client)+'</td><td><details><summary>'+esc(n.pieces==null?'Quantidade a conferir':n.pieces+' pç')+'</summary>'+((n.models||[]).map(m=>'<div>'+esc(m.name)+' · '+m.qty+' pç</div>').join('')||'Itens não identificados')+'</details></td><td>'+esc(n.issued?dateFmt(n.issued):'-')+'</td>'+
 '<td>'+esc(dateFmt(n.due))+'</td><td class="nr-money">'+brl(n.total)+'</td><td class="nr-money">'+brl(n.paid)+'</td><td class="nr-money">'+brl(n.credit)+'</td><td class="nr-money">'+brl(n.balance)+'</td>'+
 '<td><span class="badge '+badge[1]+'">'+esc(badge[0]+partial)+'</span>'+(n.mismatch?'<div style="color:#a66300">⚠ Conferir saldo</div>':'')+'</td><td><div class="nr-actions">'+actions+'</div></td></tr>';
 }).join('')+'</tbody></table></div>':'<div class="empty" style="padding:14px">Nenhuma nota encontrada nos filtros.</div>';
 if(filtered.length>pageSize)root.querySelector('#nr-table').insertAdjacentHTML('beforeend','<div class="nr-row"><button type="button" class="secondary" data-action="page" data-step="prev"'+(state.page===0?' disabled':'')+'>Anteriores</button><span class="sub">Exibindo '+(state.page*pageSize+1)+'–'+Math.min(filtered.length,(state.page+1)*pageSize)+' de '+filtered.length+' notas; CSV exporta todo o filtro.</span><button type="button" class="secondary" data-action="page" data-step="next"'+((state.page+1)*pageSize>=filtered.length?' disabled':'')+'>Próximas</button></div>');
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
let archiveEvidence9710={observed:false,legacyPaid:null,projectionPaid:null};
function organizeLegacyNotes9710(){
 if(window.__HLGB_AUTH_READY!==true)return;
 const pending=pendingProtection9710(),orders=new Map();for(const o of list('orders')){const id=sid(o.id);orders.set(id,orders.has(id)?null:o)}
 let archived=0,observed=false;
 for(const hostId of ['orderNotesTable','allOrderNotesTable']){
  const host=document.getElementById(hostId);if(!host)continue;observed=true;
  for(const existing of Array.from(host.querySelectorAll('[data-hlgb-paid-legacy9710]'))){
   for(const tr of Array.from(existing.querySelectorAll('tbody tr'))){const body=tr.__hlgbPaidOriginalBody9710;if(body?.isConnected){body.__hlgbPaidHistoryOpen9710=existing.open;body.appendChild(tr)}}
   existing.remove();
  }
  for(const table of Array.from(host.querySelectorAll('table')).filter(t=>!t.closest('.v930ProjectionNotes'))){
   const body=table.querySelector('tbody');if(!body)continue;
   const rows=Array.from(body.children).filter(tr=>{
    const ids=Array.from(tr.querySelectorAll('button[onclick]')).map(b=>sid(b.getAttribute('onclick')).match(/^openAcerto\(\s*(['"]?)([^'")\s]+)\1\s*\)$/)?.[2]).filter(Boolean);
    if(ids.length!==1)return false;const o=orders.get(ids[0]);return !!o&&archiveAllowed9710(orderView(o),pending);
   });
   if(!rows.length)continue;
   const details=document.createElement('details');details.dataset.hlgbPaidLegacy9710='1';details.open=body.__hlgbPaidHistoryOpen9710===true;
   const summary=document.createElement('summary');summary.textContent='Notas pagas — histórico ('+rows.length+')';details.appendChild(summary);
   const wrap=document.createElement('div');wrap.style.overflowX='auto';
   const historical=table.cloneNode(false);historical.removeAttribute('id');const head=table.querySelector('thead');if(head)historical.appendChild(head.cloneNode(true));
   const dest=document.createElement('tbody');historical.appendChild(dest);wrap.appendChild(historical);details.appendChild(wrap);
   table.insertAdjacentElement('afterend',details);
   for(const tr of rows){tr.__hlgbPaidOriginalBody9710=body;dest.appendChild(tr);archived++}
  }
 }
 archiveEvidence9710={...archiveEvidence9710,observed,legacyPaid:observed?archived:null,at:new Date().toISOString()};
}
function observeProjectionArchive9710(n){if(window.__HLGB_AUTH_READY===true&&Number.isSafeInteger(n)&&n>=0)archiveEvidence9710={...archiveEvidence9710,observed:true,projectionPaid:n,at:new Date().toISOString()}}
function historyAuthorized9710(){
 try{return window.__HLGB_AUTH_READY===true&&typeof canOpenPage==='function'&&canOpenPage('clientes')&&canOpenPage('notas')}catch(_){return false}
}
// Positive opening means customer owes us; negative means customer credit.
// Read-only estimate over current note balances; opening must be independent.
function clientAccountPreview9759(rows,input,allowed){
 const blocked=reason=>({state:'blocked',reason,canWrite:false});
 if(allowed!==true||!Array.isArray(rows)||!input)return blocked('permission-or-source');
 const opening=input.openingCents,payment=input.paymentCents,day=input.date;
 if(!Number.isSafeInteger(opening)||!Number.isSafeInteger(payment)||payment<0||!date(day)||day!==date(day))return blocked('invalid-input');
 if(opening!==0&&(input.independentOpening!==true||!sid(input.reason).trim()))return blocked('opening-proof');
 const key=sid(input.clientKey);if(!key.startsWith('id:')||key.length<=3)return blocked('client-identity');
 const seen=new Set();let notesBalance=0;const notes=[];
 for(const n of rows){
  if(!n||n.clientKey!==key||!['order','projection'].includes(n.type)||n.key!==n.type+':'+sid(n.id)||!sid(n.id)||seen.has(n.key)||n.mismatch||/cancelad|excluid|estornad/.test(norm(n.sourceStatus))||!['total','paid','credit','balance'].every(k=>Number.isSafeInteger(n[k])&&n[k]>=0)||n.total-n.paid-n.credit!==n.balance||n.paid>0&&n.paymentEvidence!==true)return blocked('note-review');
  seen.add(n.key);notesBalance+=n.balance;if(!Number.isSafeInteger(notesBalance))return blocked('amount-limit');
  if(n.balance>0)notes.push(n);
 }
 const ordered=notes.slice().sort((a,b)=>(a.issued||'9999-12-31').localeCompare(b.issued||'9999-12-31')||a.key.localeCompare(b.key));
 const chosen=input.noteKeys==null?ordered.map(n=>n.key):input.noteKeys;
 if(!Array.isArray(chosen)||new Set(chosen).size!==chosen.length||chosen.some(k=>!ordered.some(n=>n.key===k)))return blocked('selection');
 let left=payment,allocated=0,weighted=0,dated=0;const allocations=[];
 for(const k of chosen){const n=ordered.find(n=>n.key===k),amount=Math.min(left,n.balance);if(!amount)continue;left-=amount;allocated+=amount;const elapsed=n.issued&&date(n.issued)===n.issued&&n.issued<=day?days(day,n.issued):null;if(elapsed!==null){weighted+=amount*elapsed;dated+=amount}allocations.push({key:k,number:n.number,issued:n.issued||'',before:n.balance,amount,after:n.balance-amount,days:elapsed})}
 const openingApplied=Math.min(left,Math.max(0,opening));left-=openingApplied;
 const before=notesBalance+opening,after=before-payment;
 if(![before,after,allocated,weighted,dated].every(Number.isSafeInteger))return blocked('amount-limit');
 return {state:'preview-only',clientKey:key,notesBalance,opening,payment,before,after,allocations,openingApplied,unallocatedPayment:left,weightedDays:dated?weighted/dated:null,datedAmount:dated,canWrite:false};
}
// Continuous account statement derived from reconciled existing notes/events.
// The independent starting balance is a scenario, never a fabricated dated receipt.
function clientAccountStatement9773(rows,eventReport,input,allowed){
 const empty=state=>({state,rows:[],issues:[],summary:null,canWrite:false,officialBalance:false});
 if(allowed!==true)return empty('forbidden');
 const key=sid(input?.clientKey),owner=key.slice(3),opening=input?.openingCents??0,from=input?.from||'',to=input?.to||'';
 if(!key.startsWith('id:')||!owner||!Array.isArray(rows)||rows.length>5000||eventReport?.state!=='local-events'||!Array.isArray(eventReport.events)||eventReport.events.length!==eventReport.eventTotal||!Array.isArray(eventReport.issues)||!Number.isSafeInteger(opening)||opening!==0&&(input.independentOpening!==true||!sid(input.reason).trim())||from&&date(from)!==from||to&&date(to)!==to||from&&to&&from>to)return empty('unavailable');
 const notes=new Map(),issues=[],seen=new Set(),eventsByNote=new Map(),movements=[];let current=0,undated=0;
 for(const n of rows){
  if(!n||n.clientKey!==key||!sid(n.key)||notes.has(n.key)||n.mismatch||!['total','paid','credit','balance'].every(k=>Number.isSafeInteger(n[k])&&n[k]>=0)||n.total!==n.paid+n.credit+n.balance||/cancelad|excluid|estornad/.test(norm(n.sourceStatus)))return empty('note-review');
  notes.set(n.key,n);current+=n.balance;if(!Number.isSafeInteger(current))return empty('amount-limit');
 }
 for(const e of eventReport.events){
  const n=notes.get(e?.noteKey),id=sid(e?.id),day=date(e?.date);
  if(!n||sid(e.ownerId)!==owner||!id||seen.has(id)||day!==e.date||!day||!Number.isSafeInteger(e.amountCents)||e.amountCents<=0||!['payment-recorded','material-offset','return-active','return-reversed'].includes(e.type))return empty('event-review');
  seen.add(id);const list=eventsByNote.get(n.key)||[];list.push(e);eventsByNote.set(n.key,list);
 }
 for(const n of rows){
  const issue=eventReport.issues.some(x=>sid(x).endsWith(':'+n.key));
  const list=eventsByNote.get(n.key)||[],issued=date(n.issued);
  let paid=0,credit=0,ok=!!issued&&issued===n.issued&&!issue;
  for(const e of list){if(e.date<issued)ok=false;if(e.type==='payment-recorded'||e.type==='material-offset')paid+=e.amountCents;else if(e.type==='return-active')credit+=e.amountCents;else if(date(e.reversedAt)!==e.reversedAt||!e.reversedAt||e.reversedAt<e.date)ok=false}
  if(!ok||paid!==n.paid||credit!==n.credit){issues.push({key:n.key,number:n.number,reason:'Emissão ou histórico financeiro sem conciliação por data',balanceCents:n.balance});undated+=n.balance;continue}
  movements.push({id:'issue:'+n.key,date:issued,noteKey:n.key,number:n.number,type:'issue',deltaCents:n.total});
  for(const e of list){
   movements.push({id:e.id,date:e.date,noteKey:n.key,number:n.number,type:e.type==='return-reversed'?'return-active':e.type,deltaCents:-e.amountCents,method:e.method,description:e.description});
   if(e.type==='return-reversed')movements.push({id:e.id+':reverse',date:e.reversedAt,noteKey:n.key,number:n.number,type:'return-reversal',deltaCents:e.amountCents,description:e.description});
  }
 }
 const daysMap=new Map();for(const m of movements){const a=daysMap.get(m.date)||[];a.push(m);daysMap.set(m.date,a)}
 let running=0,prior=0;const groups=[];
 for(const day of [...daysMap.keys()].sort()){
  const entries=daysMap.get(day).sort((a,b)=>a.number.localeCompare(b.number,'pt-BR',{numeric:true})||a.id.localeCompare(b.id));
  const debits=entries.filter(e=>e.deltaCents>0).reduce((s,e)=>s+e.deltaCents,0),credits=entries.filter(e=>e.deltaCents<0).reduce((s,e)=>s-e.deltaCents,0);
  const before=running;running+=debits-credits;if(![running,before,debits,credits].every(Number.isSafeInteger))return empty('amount-limit');
  if(from&&day<from){prior=running;continue}if(to&&day>to)continue;
  groups.push({date:day,before,debits,credits,after:running,entries});
 }
 if(!Number.isSafeInteger(current+opening)||!Number.isSafeInteger(undated)||running!==current-undated)return empty('balance-review');
 return {...empty('local-statement'),rows:groups,issues,summary:{currentNotesCents:current,independentOpeningCents:opening,projectedCurrentCents:current+opening,datedBalanceCents:running,unreconciledBalanceCents:undated,priorDatedCents:prior,periodEndDatedCents:groups.length?groups[groups.length-1].after:prior,notes:notes.size,complete:issues.length===0}};
}
function readClientStatement9773(id,rows,input){
 if(!historyAuthorized9710()||typeof window.HLGBSettlementHistory9653?.noteEvents!=='function'||typeof window.hlgbCanonicalProjectionInvoices!=='function')return {state:'unavailable'};
 const pending=pendingProtection9710();if(!pending)return {state:'unavailable'};
 if(rows.some(n=>{const m=n.type==='order'?'orders':'projectionInvoices';return pending.has(m+'::'+n.id)||pending.has(m+'|'+n.id)||list('finance').some(f=>sid(n.type==='order'?f.orderId:f.projectionInvoiceId)===n.id&&(pending.has('finance::'+f.id)||pending.has('finance|'+f.id)))}))return {state:'pending'};
 const canonicalRows=window.hlgbCanonicalProjectionInvoices();if(!Array.isArray(canonicalRows))return {state:'unavailable'};
 const sources=[...canonicalRows.map(record=>({key:'projection:'+sid(record.id),record})),...list('orders').map(record=>({key:'order:'+sid(record.id),record}))].filter(x=>rows.some(n=>n.key===x.key));
 const report=window.HLGBSettlementHistory9653.noteEvents({authenticated:true,clientsAllowed:true,notes:rows,noteSources:sources},{ownerId:sid(id),export:true});
 return clientAccountStatement9773(rows,report,{...input,clientKey:'id:'+sid(id)},true);
}
// Read-only preflight for a future atomic settlement. Never calls a save API.
function globalPaymentPreflight9775(input,allowed){
 const fail=(reason,detail='')=>({state:'blocked',reason,detail,allocations:[],canWrite:false,atomicConfirmed:false});
 if(allowed!==true)return fail('permission');
 const p=input?.preview,clientId=sid(input?.clientId),ref=sid(input?.reference).trim(),method=sid(input?.method).trim(),day=input?.date;
 if(!clientId||p?.state!=='preview-only'||p.clientKey!=='id:'+clientId||!Number.isSafeInteger(p.payment)||p.payment<=0||!Array.isArray(p.allocations)||!p.allocations.length||p.allocations.length>50||!date(day)||day!==date(day)||!ref||ref.length>128||!method||method.length>80)return fail('invalid-input');
 // No credit/opening writes until a persistent independent account exists.
 if(p.opening!==0||p.openingApplied!==0||p.unallocatedPayment!==0)return fail('independent-balance-not-supported');
 if(!Array.isArray(input.records)||!Array.isArray(input.pendingIds)||input.pendingObserved!==true||input.canonicalObserved!==true)return fail('source-unconfirmed');
 const centExact=v=>{if(typeof v!=='number'&&!(typeof v==='string'&&/^\d+(?:\.\d{1,2})?$/.test(v)))return null;const n=Number(v),c=Math.round(n*100);return Number.isSafeInteger(c)&&c>=0&&Math.abs(n*100-c)<.00001?c:null};
 const pending=new Set(input.pendingIds.map(sid)),records=new Map(),notes=[],used=new Set();
 for(const e of input.records){
  const m=sid(e?.module),id=sid(e?.entity_id),k=m+':'+id;
  if(!['projectionInvoices','finance'].includes(m)||!id||e.deleted_at!=null||!Number.isSafeInteger(e.revision)||e.revision<1||!e.data||sid(e.data.id)!==id||records.has(k))return fail('record-identity',k);
  if(pending.has(m+'::'+id)||pending.has(m+'|'+id))return fail('pending-sync',k);
  records.set(k,e);
 }
 let sum=0;
 for(const a of p.allocations){
  const k=sid(a?.key);if(!k.startsWith('projection:')||used.has(k))return fail('note-selection',k);used.add(k);
  const id=k.slice(11),e=records.get('projectionInvoices:'+id),n=e?.data;
  if(!n||sid(n.clientId)!==clientId||!['pendente','parcial'].includes(norm(n.status))||!date(n.issueDate||n.date)||date(n.issueDate||n.date)>day)return fail('note-identity-date-status',k);
  const total=centExact(n.value),paid=centExact(n.paid),remaining=centExact(n.remaining),history=n.paymentHistory??[],returns=n.acertoReturnsV9565??[];
  if(!Array.isArray(history)||!Array.isArray(returns)||[total,paid,remaining].some(v=>v===null)||total<=0||remaining<=0)return fail('note-money',k);
  const hids=new Set();let historyPaid=0,credit=0;
  for(const h of history){const hid=sid(h?.id),v=centExact(h?.value);if(!hid||hids.has(hid)||v===null||v<=0||h?.globalPaymentReference9775===ref)return fail('payment-history',k);hids.add(hid);historyPaid+=v}
  for(const h of returns){const hid=sid(h?.id),v=centExact(h?.value);if(!hid||hids.has('return:'+hid)||v===null||v<=0)return fail('return-history',k);hids.add('return:'+hid);if(!h.reversedAt)credit+=v}
  if(![historyPaid,credit].every(Number.isSafeInteger)||historyPaid!==paid||total-paid-credit!==remaining||remaining!==a.before||!Number.isSafeInteger(a.amount)||a.amount<=0||a.amount>remaining||a.after!==remaining-a.amount)return fail('balance-changed',k);
  const matches=[...records.values()].filter(f=>f.module==='finance'&&sid(f.data.projectionInvoiceId)===id);
  if(matches.length!==1)return fail('title-count',k);
  const f=matches[0],t=f.data;
  if(sid(t.clientId)!==clientId||centExact(t.value)!==total||centExact(t.paid)!==paid||centExact(t.remaining)!==remaining||centExact(t.creditReturnsV9565??0)!==credit||!['pendente','parcial'].includes(norm(t.status)))return fail('title-divergence',k);
  sum+=a.amount;if(!Number.isSafeInteger(sum))return fail('amount-limit');
  notes.push({noteId:id,noteRevision:e.revision,titleId:sid(f.entity_id),titleRevision:f.revision,amountCents:a.amount,beforeCents:remaining,afterCents:a.after});
 }
 if(sum!==p.payment||notes.length*2!==records.size||new Set(notes.map(n=>n.titleId)).size!==notes.length)return fail('allocation-divergence');
 return {state:'preflight-only',clientId,reference:ref,method,date:day,amountCents:sum,allocations:notes,hubExpectedEntries:1,canWrite:false,atomicConfirmed:false,referenceUniquenessVerified:false,hubReconciled:false};
}
// Cloud comparison is read-only and not a server-side transaction or a lock.
async function globalCloudCheck9812(input,deps){
 const fail=reason=>({state:'blocked',reason,allocations:[],canWrite:false,atomicConfirmed:false,hubReconciled:false});
 const permitted=()=>{try{return deps.allowed()===true}catch(_){return false}};
 if(!permitted())return fail('permission');
 const p=input?.preview,clientId=sid(input?.clientId);
 if(!clientId||p?.state!=='preview-only'||p.clientKey!=='id:'+clientId||!Array.isArray(p.allocations)||!p.allocations.length||p.allocations.length>50||p.opening!==0||p.openingApplied!==0||p.unallocatedPayment!==0||!sid(input.method).trim()||!sid(input.reference).trim()||date(input.date)!==input.date)return fail('preview-not-supported');
 const ids=p.allocations.map(a=>sid(a.key)).map(k=>k.startsWith('projection:')?k.slice(11):'');
 if(ids.some(id=>!id||id.length>128)||new Set(ids).size!==ids.length)return fail('note-selection');
 try{
  const first=await deps.pending();
  if(!permitted()||!Array.isArray(first))return fail('sync-unavailable');
  const canon=deps.canonical();if(!Array.isArray(canon)||ids.some(id=>canon.filter(n=>sid(n.id)===id).length!==1))return fail('canonical-local');
  const pending=new Set(first.map(sid)),related=k=>pending.has(k.replace(':','::'))||pending.has(k.replace(':','|'));
  if(ids.some(id=>related('projectionInvoices:'+id)))return fail('pending-sync');
  const records=[];
  for(const id of ids){
   if(!permitted())return fail('permission');
   const n=await deps.read('projectionInvoices','entity_id',id);
   if(!permitted())return fail('permission');
   const titles=await deps.read('finance','data->>projectionInvoiceId',id);
   if(!permitted())return fail('permission');
   if(!Array.isArray(n)||n.length!==1||!Array.isArray(titles)||titles.length!==1)return fail('note-title-count');
   if(n[0].module!=='projectionInvoices'||sid(n[0].entity_id)!==id||titles[0].module!=='finance'||sid(titles[0].data?.projectionInvoiceId)!==id)return fail('record-identity');
   if(n[0].data?.migratedToNoteQueueV9223||n[0].data?.items?.some?.(i=>i?.source==='faction_delivery_v9140'))return fail('shadow-note');
   // Preserve canonical local financial evidence; do not accept a cloud value changed
   // since the preview, even when the net balance coincidentally stayed equal.
   const local=canon.find(x=>sid(x.id)===id);
   const canonJson=v=>Array.isArray(v)?v.map(canonJson):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonJson(v[k])])):v;
   for(const key of ['clientId','value','paid','remaining','status','issueDate','date','paymentHistory','acertoReturnsV9565']){
    if(JSON.stringify(canonJson(local[key]??null))!==JSON.stringify(canonJson(n[0].data?.[key]??null)))return fail('note-changed');
   }
   records.push(n[0],titles[0]);
  }
  const final=await deps.pending();if(!permitted()||!Array.isArray(final))return fail('sync-unavailable');
  const latest=deps.canonical();if(!Array.isArray(latest)||ids.some(id=>latest.filter(n=>sid(n.id)===id).length!==1))return fail('canonical-local');
  if(JSON.stringify(canon)!==JSON.stringify(latest))return fail('canonical-changed');
  const report=globalPaymentPreflight9775({...input,records,pendingIds:[...first,...final],pendingObserved:true,canonicalObserved:true},true);
  if(!permitted())return fail('permission');
  return {...report,cloudNotesCompared:report.state==='preflight-only',canonicalScope:'local',serverLockConfirmed:false};
 }catch(_){return fail('cloud-unavailable')}
}
function cloudCheckAllowed9812(){try{return historyAuthorized9710()&&window.__HLGB_AUTH_READY===true&&['clientes','notas','financeiro','hubFinanceiro'].every(k=>canOpenPage(k)===true)}catch(_){return false}}
function browserCloudCheck9812(input){
 const deps={allowed:cloudCheckAllowed9812,canonical:()=>{if(typeof window.hlgbCanonicalProjectionInvoices!=='function')return null;const r=window.hlgbCanonicalProjectionInvoices();return Array.isArray(r)?JSON.parse(JSON.stringify(r)):null},
 pending:async()=>{const guard=window.hlgbWalIdbGuard9536;if(typeof guard?.probe!=='function'||await guard.probe()!==true)return null;const ids=pendingProtection9710();return ids?[...ids]:null},
 read:async(module,field,id)=>{if(typeof window.cloudRequest!=='function')return null;return window.cloudRequest('hlgb_records?select=module,entity_id,data,revision,deleted_at&module=eq.'+encodeURIComponent(module)+'&'+field+'=eq.'+encodeURIComponent(id)+'&deleted_at=is.null&limit=2',{method:'GET'})}};
 return globalCloudCheck9812(input,deps);
}
// A legacy Hub entry without explicit source identity is a review item, NOT
// a note payment. Never derive a link from amount, description, person or date.
function hubLegacyReview9814(input,allowed){
 const fail=reason=>({state:'unavailable',reason,rows:[],canWrite:false,hubReconciled:false});
 if(allowed!==true)return fail('permission');
 const {hub,clients,clientId,pendingIds}=input||{};
 if(!Array.isArray(hub)||!Array.isArray(clients)||!Array.isArray(pendingIds)||hub.length>20000||clients.length>20000||input.pendingObserved!==true)return fail('source');
 const live=x=>x&&!x.deleted_at&&!x.deletedAt&&x.deleted!==true&&x._deleted!==true;
 const exact=clients.filter(x=>live(x)&&sid(x.id)===sid(clientId));
 if(exact.length!==1)return fail('client');
 const name=norm(exact[0].name),unique=!!name&&clients.filter(x=>live(x)&&norm(x.name)===name).length===1;
 const pending=new Set(pendingIds.map(sid)),counts=new Map();
 for(const h of hub.filter(live)){const id=sid(h.id);counts.set(id,(counts.get(id)||0)+1)}
 const rows=[],summary={planned:0,realized:0,unlinked:0,marked:0,missingPerson:0,clientNameCandidates:0,review:0,omitted:0};
 const cents=v=>{if(typeof v!=='number'&&!(typeof v==='string'&&/^\d+(\.\d{1,2})?$/.test(v)))return null;const n=Number(v),c=Math.round(n*100);return Number.isSafeInteger(c)&&c>0&&Math.abs(n*100-c)<.00001?c:null};
 for(const h of hub.filter(live)){
  if(h.flow!=='Entrada')continue;
  const id=sid(h.id),status=h.status,amount=cents(h.value),day=status==='Realizado'?date(h.realizedAt):date(h.date);
  if(status==='Previsto')summary.planned++;else if(status==='Realizado')summary.realized++;else{summary.omitted++;continue}
  const marker=!!sid(h.projectionInvoiceId).trim()||!!sid(h.sourceId).trim()||!!sid(h.sourceType).trim();
  const person=norm(h.person);
  if(marker)summary.marked++;else{summary.unlinked++;if(!person)summary.missingPerson++;if(unique&&person===name)summary.clientNameCandidates++}
  const issue=!id||counts.get(id)!==1||pending.has('hubFinanceEntries::'+id)||pending.has('hubFinanceEntries|'+id)||h.pendingSync===true||h.walPending===true||h.unverified===true||amount===null||!day;
  if(issue)summary.review++;
  if(marker)continue;
  const kind=unique&&person===name?'name-candidate':!person?'unassigned':'other-person';
  // Other named people are counted, not displayed in this client's account.
  if(kind==='other-person')continue;
  rows.push({id:id||null,status,amountCents:amount,day,description:sid(h.description).slice(0,300),kind,issue:!!issue});
 }
 rows.sort((a,b)=>Number(b.kind==='name-candidate')-Number(a.kind==='name-candidate')||(b.day||'').localeCompare(a.day||'')||sid(a.id).localeCompare(sid(b.id)));
 return {state:'local-review-only',summary,rows,uniqueClientName:unique,canWrite:false,hubReconciled:false,remoteConfirmed:false};
}
// Explicit review only. A forecast for one whole outstanding title is the
// narrow initial scope; group/partial forecasts and realized cash are excluded.
function forecastLinkReview9815(input,allowed){
 const fail=reason=>({state:'blocked',reason,canWrite:false,hubReconciled:false});
 if(allowed!==true)return fail('permission');
 const clientId=sid(input?.clientId),noteId=sid(input?.noteId),hubId=sid(input?.hubId),reason=sid(input?.reason).trim(),evidence=sid(input?.evidence).trim();
 if(!clientId||!noteId||!hubId||reason.length<5||reason.length>500||evidence.length<3||evidence.length>200||input.confirmed!==true||input.pendingObserved!==true||!Array.isArray(input.pendingIds)||!Array.isArray(input.records)||!Array.isArray(input.hubRows)||input.hubRows.length>20000)return fail('input');
 const pending=new Set(input.pendingIds.map(sid)),blocked=(m,k)=>pending.has(m+'::'+k)||pending.has(m+'|'+k);
 const exact=v=>{if(typeof v!=='number'&&!(typeof v==='string'&&/^\d+(\.\d{1,2})?$/.test(v)))return null;const x=Number(v),c=Math.round(x*100);return Number.isSafeInteger(c)&&c>=0&&Math.abs(x*100-c)<.00001?c:null};
 const list=input.records;
 if(list.length!==3||list.some(x=>!x||!x.data||x.deleted_at!=null||!Number.isSafeInteger(x.revision)||x.revision<1||!sid(x.entity_id)||sid(x.data.id)!==sid(x.entity_id)||blocked(x.module,sid(x.entity_id))))return fail('records-or-sync');
 const n=list.find(x=>x.module==='projectionInvoices'&&sid(x.entity_id)===noteId),t=list.find(x=>x.module==='finance'&&sid(x.data.projectionInvoiceId)===noteId),h=list.find(x=>x.module==='hubFinanceEntries'&&sid(x.entity_id)===hubId);
 if(!n||!t||!h||sid(n.data.clientId)!==clientId||sid(t.data.clientId)!==clientId||n.data.migratedToNoteQueueV9223||!Array.isArray(n.data.items)||n.data.items.some(x=>x?.source==='faction_delivery_v9140'))return fail('identity');
 const amount=exact(n.data.remaining),issued=date(n.data.issueDate||n.data.date);
 if(amount===null||amount<=0||!issued)return fail('balance');
 const p=globalPaymentPreflight9775({preview:{state:'preview-only',clientKey:'id:'+clientId,payment:amount,opening:0,openingApplied:0,unallocatedPayment:0,allocations:[{key:'projection:'+noteId,before:amount,amount,after:0}]},clientId,reference:'forecast-link-review:'+hubId,method:'Somente conferência',date:issued,records:[n,t],pendingIds:input.pendingIds,pendingObserved:true,canonicalObserved:true},true);
 if(p.state!=='preflight-only'||norm(n.data.status)!==norm(t.data.status))return fail('note-title-'+(p.reason||'status'));
 const row=h.data,hd=date(row.date),due=date(t.data.dueDate||n.data.dueDate);
 if(row.flow!=='Entrada'||row.status!=='Previsto'||sid(row.realizedAt).trim()||!hd||!due||hd!==due||exact(row.value)!==amount||row.pendingSync===true||row.walPending===true||row.unverified===true)return fail('forecast-shape');
 if(['projectionInvoiceId','sourceId','sourceType','clientId','clientForecastLinkV9815'].some(k=>row[k]!=null&&sid(row[k]).trim()))return fail('already-marked');
 const live=input.hubRows.filter(x=>x&&!x.deleted_at&&!x.deletedAt&&x.deleted!==true&&x._deleted!==true);
 if(live.filter(x=>sid(x.id)===hubId).length!==1||live.some(x=>sid(x.id)!==hubId&&(sid(x.projectionInvoiceId)===noteId||sid(x.sourceId)===sid(t.entity_id)||sid(x.clientForecastLinkV9815?.titleId)===sid(t.entity_id))))return fail('competing-link');
 const candidate={clientId,noteId,noteRevision:n.revision,titleId:sid(t.entity_id),titleRevision:t.revision,hubId,hubRevision:h.revision,amountCents:amount,dueDate:due,reason,evidence};
 return {state:'link-review-only',candidate,canWrite:false,hubReconciled:false,serverRevalidationRequired:true};
}
async function forecastLinkCloud9815(input,deps){
 const fail=reason=>({state:'blocked',reason,canWrite:false,hubReconciled:false}),allowed=()=>{try{return deps.allowed()===true}catch(_){return false}};
 if(!allowed())return fail('permission');
 try{
  const first=await deps.pending();if(!allowed()||!Array.isArray(first))return fail('sync');
  const notes=deps.canonical();if(!Array.isArray(notes)||notes.filter(x=>sid(x.id)===sid(input.noteId)).length!==1)return fail('canonical-local');
  const n=await deps.read('projectionInvoices','entity_id',input.noteId);if(!allowed())return fail('permission');
  const t=await deps.read('finance','data->>projectionInvoiceId',input.noteId);if(!allowed())return fail('permission');
  const h=await deps.read('hubFinanceEntries','entity_id',input.hubId);if(!allowed())return fail('permission');
  if([n,t,h].some(x=>!Array.isArray(x)||x.length!==1))return fail('record-count');
  const hubs=await deps.hubs();if(!allowed()||!Array.isArray(hubs))return fail('hub-read');
  const last=await deps.pending();if(!allowed()||!Array.isArray(last))return fail('sync');
  const latest=deps.canonical();if(JSON.stringify(notes)!==JSON.stringify(latest))return fail('canonical-changed');
  const normalized=hubs.map(x=>x.data);
  if(hubs.some(x=>x.module!=='hubFinanceEntries'||x.deleted_at!=null||sid(x.entity_id)!==sid(x.data?.id)||!Number.isSafeInteger(x.revision)||x.revision<1)||hubs.filter(x=>sid(x.entity_id)===sid(input.hubId)&&x.revision===h[0].revision&&JSON.stringify(x.data)===JSON.stringify(h[0].data)).length!==1)return fail('hub-changed');
  return forecastLinkReview9815({...input,records:[n[0],t[0],h[0]],hubRows:normalized,pendingIds:[...first,...last],pendingObserved:true},allowed());
 }catch(_){return fail('cloud-unavailable')}
}
function browserForecastLink9815(input){
 const request=q=>window.cloudRequest('hlgb_records?select=module,entity_id,data,revision,deleted_at&deleted_at=is.null&'+q,{method:'GET'});
 return forecastLinkCloud9815(input,{allowed:cloudCheckAllowed9812,canonical:()=>{const x=window.hlgbCanonicalProjectionInvoices?.();return Array.isArray(x)?JSON.parse(JSON.stringify(x)):null},pending:async()=>{const guard=window.hlgbWalIdbGuard9536;if(typeof guard?.probe!=='function'||await guard.probe()!==true)return null;const p=pendingProtection9710();return p?[...p]:null},read:(module,field,id)=>request('module=eq.'+module+'&'+field+'=eq.'+encodeURIComponent(id)+'&limit=2'),hubs:async()=>{const all=[];for(let offset=0;offset<20000;offset+=200){if(!cloudCheckAllowed9812())return null;const a=await request('module=eq.hubFinanceEntries&order=entity_id.asc&limit=200&offset='+offset);if(!Array.isArray(a)||a.length>200)return null;all.push(...a);if(a.length<200)return all}return null}});
}
function signedMoney9759(v){
 const s=sid(v).trim();if(!/^-?\d{1,10}(?:[,.]\d{1,2})?$/.test(s))return null;
 const n=Math.round(Number(s.replace(',','.'))*100);return Number.isSafeInteger(n)?n:null;
}
function openAccountPreview9759(id){
 if(!historyAuthorized9710())return false;
 const result=clientNotes9710(id);if(!result.available||result.ambiguous||typeof window.openModal!=='function')return false;
 const client=list('clients').find(x=>sid(x.id)===sid(id));
 const html='<p>Prévia de conta corrente contínua — não registra recebimento nem altera notas ou Hub.</p><p>Saldo inicial somente de valores <b>não incluídos nas notas existentes</b>. Positivo: cliente deve; negativo: crédito do cliente.</p>'+
 '<div class="grid"><label>Saldo inicial independente (R$)<input id="ca9759-opening" value="0" inputmode="decimal"></label><label>Justificativa<input id="ca9759-reason"></label><label>Pagamento global (R$)<input id="ca9759-payment" value="0" inputmode="decimal"></label><label>Data do pagamento<input id="ca9759-date" type="date" value="'+today()+'"></label></div>'+
 '<label><input id="ca9759-independent" type="checkbox"> Confirmo que o saldo inicial não repete notas existentes.</label><p>Distribuição sugerida: emissão mais antiga primeiro; notas sem data ficam no final. Selecione quais notas deseja incluir.</p>'+
 '<div style="overflow:auto;max-height:250px">'+result.rows.filter(n=>n.balance>0).map(n=>'<label style="display:block"><input type="checkbox" data-ca9759-note="'+esc(n.key)+'" checked> '+esc(n.number)+' · '+esc(dateFmt(n.issued))+' · '+brl(n.balance)+'</label>').join('')+'</div>'+
 '<button type="button" class="primary" id="ca9759-preview">Simular pagamento global</button><div id="ca9759-result" aria-live="polite"></div><details><summary>Conferência das notas na nuvem (sem gravar)</summary><p>Somente pagamentos alocados integralmente em notas, sem saldo inicial ou crédito excedente. Ainda não confirma Hub nem autoriza baixa.</p><label>Referência do recebimento<input id="ca9812-ref" maxlength="128"></label><label>Forma de pagamento<input id="ca9812-method" maxlength="80"></label><button type="button" id="ca9812-check" disabled>Conferir notas e títulos</button><div id="ca9812-output" aria-live="polite"></div></details><button type="button" class="secondary modalSave">Fechar</button>';
 const hubReviewHtml='<details><summary>Conferir entradas antigas do Hub</summary><p>Consulta local: entradas sem origem identificada não são associadas a notas automaticamente. Uma coincidência de nome é apenas candidata.</p><button type="button" id="ca9814-review">Consultar entradas sem vínculo</button><div id="ca9814-output" aria-live="polite"></div><details><summary>Preparar vínculo de uma previsão com uma nota (sem gravar)</summary><p>Somente previsão integral de uma nota em aberto, com valor e vencimento iguais. Acertos globais, pagamentos realizados e previsões parciais exigem outra conferência.</p><label>ID da nota<input id="ca9815-note"></label><label>ID do lançamento previsto no Hub<input id="ca9815-hub"></label><label>Referência do documento de origem<input id="ca9815-evidence" maxlength="200"></label><label>Motivo do vínculo<input id="ca9815-reason" maxlength="500"></label><label><input type="checkbox" id="ca9815-confirmed"> Conferi a origem documental; não é apenas coincidência de valor/data.</label><button type="button" id="ca9815-review">Conferir vínculo na nuvem</button><div id="ca9815-output" aria-live="polite"></div></details></details>';
 const statementHtml='<details id="ca9773-statement"><summary>Extrato detalhado por data</summary><p>Emissões, pagamentos, compensações, devoluções e estornos com evidência. O saldo inicial independente permanece separado, sem data fictícia. Não é extrato bancário.</p><div class="grid"><label>De<input id="ca9773-from" type="date"></label><label>Até<input id="ca9773-to" type="date"></label></div><button type="button" class="secondary" id="ca9773-load">Consultar extrato</button><button type="button" class="secondary" id="ca9773-export" disabled>Exportar extrato CSV</button><div id="ca9773-output" aria-live="polite"></div></details>';
 window.openModal('Conta corrente — '+esc(client.name)+' (prévia)',html+hubReviewHtml+statementHtml,()=>window.closeModal?.());
 const host=document.getElementById('modalContent')||document.getElementById('modal'),btn=host?.querySelector('#ca9759-preview');if(!btn)return false;
 const hubBtn=host.querySelector('#ca9814-review'),hubOut=host.querySelector('#ca9814-output');
 if(hubBtn)hubBtn.onclick=()=>{
  if(!cloudCheckAllowed9812()||!hubOut)return;
  hubOut.replaceChildren();
  const pending=pendingProtection9710(),d=records();
  const v=hubLegacyReview9814({hub:d.hubFinanceEntries,clients:d.clients,clientId:id,pendingIds:pending?[...pending]:null,pendingObserved:!!pending},true);
  if(!cloudCheckAllowed9812())return;
  if(v.state!=='local-review-only'){hubOut.textContent='Não foi possível conferir a base local ou a sincronização.';return}
  const p=document.createElement('p'),a=v.summary;p.textContent='Hub local: '+a.planned+' previstas, '+a.realized+' realizadas; '+a.unlinked+' sem origem identificada, '+a.missingPerson+' sem pessoa, '+a.marked+' com marcador de origem (não conciliado), '+a.review+' com dados ou sincronização a conferir. Candidatas por nome único: '+a.clientNameCandidates+'. Nenhuma baixa autorizada.';hubOut.appendChild(p);
  const search=document.createElement('input');search.placeholder='Filtrar por descrição, data ou ID';search.setAttribute('aria-label','Filtrar entradas antigas');hubOut.appendChild(search);
  const body=document.createElement('div');hubOut.appendChild(body);let offset=0;
  const draw=()=>{body.replaceChildren();if(!cloudCheckAllowed9812())return;const q=norm(search.value),rows=v.rows.filter(x=>!q||norm(x.description+' '+x.day+' '+sid(x.id)).includes(q));
   const count=document.createElement('p');count.textContent=rows.length+' entrada(s) sem pessoa ou candidata(s) por nome; consulte a origem e o comprovante. Atualize a consulta se houver alterações.';body.appendChild(count);
   for(const x of rows.slice(offset,offset+25)){const line=document.createElement('p');line.textContent=(x.day?dateFmt(x.day):'Sem data comprovável')+' · '+x.status+' · '+(x.amountCents===null?'valor a conferir':brl(x.amountCents))+' · '+x.description+' · ID '+sid(x.id||'indefinido')+' · '+(x.kind==='name-candidate'?'Nome candidato, não vinculado':'Sem pessoa')+(x.issue?' · REVISAR':'');body.appendChild(line)}
   for(const [label,delta] of [['Anterior',-25],['Mais entradas',25]])if(delta<0?offset>0:offset+25<rows.length){const b=document.createElement('button');b.type='button';b.textContent=label;b.onclick=()=>{offset+=delta;draw()};body.appendChild(b)}
  };search.oninput=()=>{offset=0;draw()};draw();
 };
 const linkBtn=host.querySelector('#ca9815-review'),linkOut=host.querySelector('#ca9815-output');let linkEpoch=0;
 for(const k of ['note','hub','evidence','reason','confirmed'])host.querySelector('#ca9815-'+k)?.addEventListener('input',()=>{linkEpoch++;if(linkOut)linkOut.textContent='Conferir novamente após alterar os dados.';if(linkBtn)linkBtn.disabled=false});
 if(linkBtn)linkBtn.onclick=async()=>{
  if(!cloudCheckAllowed9812()||!linkOut)return;
  const epoch=++linkEpoch,val=k=>sid(host.querySelector('#ca9815-'+k)?.value).trim();
  linkBtn.disabled=true;linkOut.textContent='Conferindo origem, nota, título e previsão…';
  const v=await browserForecastLink9815({clientId:sid(id),noteId:val('note'),hubId:val('hub'),evidence:val('evidence'),reason:val('reason'),confirmed:host.querySelector('#ca9815-confirmed')?.checked===true});
  if(epoch!==linkEpoch||!host.isConnected||!cloudCheckAllowed9812())return;linkBtn.disabled=false;
  linkOut.textContent=v.state==='link-review-only'?'Proposta conferida: nota '+v.candidate.noteId+' · título '+v.candidate.titleId+' · previsão '+v.candidate.hubId+' · '+brl(v.candidate.amountCents)+' · vencimento '+dateFmt(v.candidate.dueDate)+'. Nenhum vínculo ou pagamento foi gravado.':'Conferência bloqueada: '+v.reason+'. Nenhum dado alterado.';
 };
 let statement=null,statementSignature='';
 const load=host.querySelector('#ca9773-load'),exportButton=host.querySelector('#ca9773-export'),statementOut=host.querySelector('#ca9773-output');
 const statementInput=()=>({openingCents:signedMoney9759(host.querySelector('#ca9759-opening')?.value),reason:host.querySelector('#ca9759-reason')?.value,independentOpening:host.querySelector('#ca9759-independent')?.checked===true,from:host.querySelector('#ca9773-from')?.value,to:host.querySelector('#ca9773-to')?.value});
 const labels={issue:'Emissão da nota','payment-recorded':'Recebimento registrado','material-offset':'Compensação de matéria-prima','return-active':'Devolução','return-reversal':'Estorno de devolução'};
 const resetStatement=()=>{statement=null;exportButton.disabled=true;statementOut.textContent='Atualize a consulta após alterar os filtros ou o saldo inicial.'};
 for(const k of ['ca9759-opening','ca9759-reason','ca9759-independent','ca9773-from','ca9773-to'])host.querySelector('#'+k)?.addEventListener('input',resetStatement);
 load.onclick=()=>{
  resetStatement();if(!historyAuthorized9710())return;
  try{
   const latest=clientNotes9710(id),input=statementInput();if(!latest.available||latest.ambiguous||input.openingCents===null){statementOut.textContent='Confira cadastro, saldo inicial e identidade das notas.';return}
   const v=readClientStatement9773(id,latest.rows,input);
   if(v.state!=='local-statement'){statementOut.textContent='Extrato não confirmado. Confira a sincronização, as datas e as notas.';return}
   statement=v;statementSignature=JSON.stringify({rows:latest.rows,input,v});exportButton.disabled=false;
   const s=v.summary;statementOut.innerHTML='<p><b>Saldo atual das notas: '+brl(s.currentNotesCents)+' · Saldo inicial independente (simulado): '+brl(s.independentOpeningCents)+' · Saldo projetado: '+brl(s.projectedCurrentCents)+'</b></p><p>Saldo datado antes do período: '+brl(s.priorDatedCents)+' · Saldo datado ao final do período: '+brl(s.periodEndDatedCents)+' · Saldo de notas sem conciliação por data: '+brl(s.unreconciledBalanceCents)+'</p><p>'+(s.complete?'Histórico local conciliado por data.':'Histórico parcial: '+v.issues.length+' nota(s) a conferir, inclusive se estiverem quitadas.')+'</p>'+v.issues.map(x=>'<p class="sub">Nota '+esc(x.number)+' · '+esc(x.reason)+'</p>').join('');
   const body=document.createElement('div');statementOut.appendChild(body);let page=0;
   const draw=()=>{body.replaceChildren();for(const g of v.rows.slice(page,page+20)){
    const d=document.createElement('details'),sum=document.createElement('summary');sum.textContent=dateFmt(g.date)+' · entradas na conta '+brl(g.debits)+' · abatimentos '+brl(g.credits)+' · saldo '+brl(g.after);d.appendChild(sum);
    for(const m of g.entries){const p=document.createElement('p');p.textContent='Nota '+m.number+' · '+labels[m.type]+' · '+brl(m.deltaCents)+(m.description?' · '+m.description:'');d.appendChild(p)}body.appendChild(d)}
    for(const [label,step] of [['Anterior',-20],['Mais datas',20]])if(step<0?page>0:page+20<v.rows.length){const b=document.createElement('button');b.type='button';b.textContent=label;b.onclick=()=>{page+=step;draw()};body.appendChild(b)}
   };draw();
  }catch(_){statementOut.textContent='Não foi possível conciliar o extrato. Nenhum dado foi alterado.'}
 };
 exportButton.onclick=()=>{
  if(!statement||!historyAuthorized9710())return;
  try{const latest=clientNotes9710(id),input=statementInput(),v=latest.available&&!latest.ambiguous?readClientStatement9773(id,latest.rows,input):null;
   if(JSON.stringify({rows:latest.rows,input,v})!==statementSignature){resetStatement();return}
   const money=c=>(c/100).toFixed(2).replace('.',','),lines=[['Data','Nota','Movimento','Valor (R$)','Saldo do dia (R$)','Descrição']];
   for(const g of v.rows)for(const m of g.entries)lines.push([g.date,m.number,labels[m.type],money(m.deltaCents),money(g.after),m.description||'']);
   lines.push(['','','Saldo inicial independente (simulado)',money(v.summary.independentOpeningCents),'','Sem data atribuída'],['','','Saldo atual das notas',money(v.summary.currentNotesCents),'',''],['','','Saldo sem conciliação por data',money(v.summary.unreconciledBalanceCents),'','']);
   for(const issue of v.issues)lines.push(['',issue.number,'Revisão','','',issue.reason]);
   const url=URL.createObjectURL(new Blob(['\ufeff'+lines.map(l=>l.map(csvCell).join(';')).join('\r\n')],{type:'text/csv;charset=utf-8'})),a=document.createElement('a');a.href=url;a.download='HLGB-extrato-cliente-'+today()+'.csv';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),15000);
  }catch(_){resetStatement()}
 };
 const signature=JSON.stringify(result.rows);
 let cloudPreview=null,cloudEpoch=0;const checkBtn=host.querySelector('#ca9812-check'),checkOut=host.querySelector('#ca9812-output');
 const invalidateCloud=()=>{cloudPreview=null;cloudEpoch++;if(checkBtn)checkBtn.disabled=true;if(checkOut)checkOut.textContent='Simule novamente após alterar os dados.'};
 host.addEventListener('input',e=>{if(e.target?.matches?.('[id^="ca9759-"],[data-ca9759-note]'))invalidateCloud();else if(e.target?.matches?.('#ca9812-ref,#ca9812-method')){cloudEpoch++;if(checkOut)checkOut.textContent='Conferir novamente após alterar referência ou forma de pagamento.';if(checkBtn)checkBtn.disabled=!cloudPreview||!cloudCheckAllowed9812()}});
 if(checkBtn)checkBtn.onclick=async()=>{
  if(!cloudPreview||!cloudCheckAllowed9812()||!checkOut)return;
  const epoch=++cloudEpoch,p=cloudPreview,reference=host.querySelector('#ca9812-ref')?.value,method=host.querySelector('#ca9812-method')?.value;
  checkBtn.disabled=true;checkOut.textContent='Conferindo notas, títulos e sincronização…';
  const report=await browserCloudCheck9812({preview:p.preview,clientId:sid(id),date:p.date,reference,method});
  if(epoch!==cloudEpoch||!host.isConnected||!cloudCheckAllowed9812())return;
  checkBtn.disabled=false;
  if(report.state!=='preflight-only'){checkOut.textContent='Conferência bloqueada: '+report.reason+'. Nenhuma gravação realizada.';return}
  checkOut.textContent=report.allocations.length+' nota(s) e título(s) conferidos na nuvem, total '+brl(report.amountCents)+'. Somente comparação de leitura; referência, Hub e transação ainda não confirmados. Nenhuma baixa realizada.';
 };
 btn.onclick=()=>{
  invalidateCloud();
  if(!historyAuthorized9710())return;
  const latest=clientNotes9710(id),out=host.querySelector('#ca9759-result');if(!out)return;
  if(!latest.available||latest.ambiguous||JSON.stringify(latest.rows)!==signature){out.textContent='As notas mudaram. Reabra a consulta antes de simular.';return}
  const val=k=>host.querySelector('#ca9759-'+k)?.value;
  const p=clientAccountPreview9759(latest.rows.map(n=>({...n,clientKey:'id:'+sid(id)})),{clientKey:'id:'+sid(id),openingCents:signedMoney9759(val('opening')),paymentCents:signedMoney9759(val('payment')),date:val('date'),reason:val('reason'),independentOpening:host.querySelector('#ca9759-independent')?.checked===true,noteKeys:Array.from(host.querySelectorAll('[data-ca9759-note]:checked')).map(x=>x.dataset.ca9759Note).sort((a,b)=>{const x=latest.rows.find(n=>n.key===a),y=latest.rows.find(n=>n.key===b);return (x.issued||'9999-12-31').localeCompare(y.issued||'9999-12-31')||a.localeCompare(b)})},true);
  if(p.state!=='preview-only'){out.textContent='Confira valores, saldo inicial independente e divergências das notas antes de simular.';return}
  cloudPreview={preview:p,date:val('date')};if(checkBtn)checkBtn.disabled=!cloudCheckAllowed9812();if(checkOut)checkOut.textContent='Informe referência e forma de pagamento para conferir.';
  out.innerHTML='<p><b>Saldo das notas: '+brl(p.notesBalance)+' · Saldo anterior: '+brl(p.before)+' · Pagamento: '+brl(p.payment)+' · Saldo projetado: '+brl(p.after)+'</b></p><p>Abatimento do saldo inicial: '+brl(p.openingApplied)+' · Pagamento sem alocação: '+brl(p.unallocatedPayment)+' (crédito ainda não registrado).</p><div style="overflow:auto"><table><thead><tr><th>Nota</th><th>Antes</th><th>Abatimento</th><th>Depois</th></tr></thead><tbody>'+p.allocations.map(a=>'<tr><td>'+esc(a.number)+'</td><td>'+brl(a.before)+'</td><td>'+brl(a.amount)+'</td><td>'+brl(a.after)+'</td></tr>').join('')+'</tbody></table></div><p>Prazo médio simulado: '+(p.weightedDays===null?'sem datas comprováveis':p.weightedDays.toFixed(1)+' dias sobre '+brl(p.datedAmount))+' · Não é histórico de recebimentos.</p><p>Nenhum valor foi gravado.</p>';
 };
 return true;
}
function openClientNotes9710(id){
 if(!historyAuthorized9710())return false;
 const result=clientNotes9710(id);if(!result.available||typeof window.openModal!=='function')return false;
 const rows=result.rows.slice().sort((a,b)=>b.issued.localeCompare(a.issued)||a.number.localeCompare(b.number));
 const client=list('clients').find(x=>sid(x.id)===sid(id));
 const html='<div class="sub">Histórico de notas do cadastro. Consulta dos dados carregados, sem alterar lançamentos.</div>'+
 (result.ambiguous?'<p>Há '+result.ambiguous+' nota(s) sem identidade inequívoca. Confira na central de notas.</p>':'')+
 '<p><b>'+rows.length+' nota(s) · A receber: '+brl(sum(rows,'balance'))+' · Recebido: '+brl(sum(rows,'paid'))+'</b></p>'+
 '<div style="overflow:auto"><table><thead><tr><th>Nota</th><th>Emissão</th><th>Valor</th><th>Recebido</th><th>Saldo</th><th>Situação</th><th>Ações</th></tr></thead><tbody>'+
 rows.map(n=>'<tr><td>'+esc(n.number)+'</td><td>'+esc(dateFmt(n.issued))+'</td><td>'+brl(n.total)+'</td><td>'+brl(n.paid)+'</td><td>'+brl(n.balance)+'</td><td>'+esc(label(n,today())[0])+(n.mismatch?' · Conferir saldo':'')+'</td><td><button type="button" class="secondary" data-client-note-type="'+esc(n.type)+'" data-client-note-id="'+esc(n.id)+'">Abrir</button></td></tr>').join('')+
 '</tbody></table></div><button type="button" class="secondary modalSave">Fechar</button>';
 window.openModal('Histórico de notas — '+esc(client.name),html,()=>window.closeModal?.());
 const host=document.getElementById('modalContent');
 host?.querySelectorAll('[data-client-note-id]').forEach(b=>b.onclick=()=>{if(!historyAuthorized9710())return;const current=clientNotes9710(id).rows.find(n=>n.id===b.dataset.clientNoteId&&n.type===b.dataset.clientNoteType);if(!current)return;if(current.type==='projection')window.hlgbViewNote9411?.(current.id);else window.viewOrderDetails?.(current.id)});
 return true;
}
function decorateClients9710(){
 const root=document.getElementById('clientTable');if(!root)return;
 for(const tr of Array.from(root.querySelectorAll('tbody tr'))){
  const existing=tr.querySelector('[data-hlgb-client-notes9710]');
  if(!historyAuthorized9710()){existing?.remove();tr.querySelector('[data-hlgb-client-account9759]')?.remove();continue}if(existing)continue;
  const ids=Array.from(tr.querySelectorAll('button[onclick]')).map(b=>sid(b.getAttribute('onclick')).match(/^editClient\(\s*(['"]?)([^'")\s]+)\1\s*\)$/)?.[2]).filter(Boolean);
  if(ids.length!==1||!clientNotes9710(ids[0],[]).available)continue;
  const b=document.createElement('button');b.type='button';b.className='secondary';b.dataset.hlgbClientNotes9710='1';b.textContent='Histórico de notas';b.onclick=()=>openClientNotes9710(ids[0]);tr.lastElementChild?.appendChild(b);const account=document.createElement('button');account.type='button';account.className='secondary';account.dataset.hlgbClientAccount9759='1';account.textContent='Conta corrente (prévia)';account.onclick=()=>openAccountPreview9759(ids[0]);tr.lastElementChild?.appendChild(account);
 }
}
function installClients9710(){
 const old=window.renderClients;let fn=old;const seen=new Set();
 while(typeof fn==='function'&&!seen.has(fn)){if(fn.__hlgbClientNotes9710){decorateClients9710();return}seen.add(fn);fn=fn.__original}
 if(typeof old==='function'){const wrapper=function(){const result=old.apply(this,arguments);decorateClients9710();return result};wrapper.__hlgbClientNotes9710=true;wrapper.__original=old;window.renderClients=wrapper}
 decorateClients9710();
}
function install(){
 ensure();paint();installClients9710();organizeLegacyNotes9710();
 const old=window.renderOrderNotes;
 if(typeof old==='function'&&!hasPanelWrapper(old)){
  const wrapper=function(){const result=old.apply(this,arguments);setTimeout(()=>{paint();organizeLegacyNotes9710()},0);return result};
  // Preserve the existing live-sync signature. Otherwise its delayed
  // installer could wrap us repeatedly, causing nested redraw loops.
  if(old.__hlgbNotesLive9563)wrapper.__hlgbNotesLive9563=true;
  wrapper.__hlgbReceivables9564=true;wrapper.__original=old;window.renderOrderNotes=wrapper;
 }
}
window.hlgbNotesReceivables9564={version:V,globalPaymentPreflight9775,globalCloudCheck9812,hubLegacyReview9814,forecastLinkReview9815,forecastLinkCloud9815,clientAccountStatement9773,exactPaidProof9771,clientAccountPreview9759,openAccountPreview9759,allNotes,projectionView,orderView,category,matchTab,calculate,filterAll,exportRows,paint,install,state,settledForArchive9710,archiveAllowed9710,pendingProtection9710,clientNotes9710,openClientNotes9710,organizeLegacyNotes9710,observeProjectionArchive9710,archiveStatus9710:()=>({...archiveEvidence9710}),readOnly:true};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
[350,1300,3200].forEach(ms=>setTimeout(install,ms));
document.addEventListener('click',e=>{if(e.target?.closest?.('[onclick*="notas"]'))setTimeout(paint,40)},true);
window.addEventListener?.('hlgb:authenticated',()=>setTimeout(install,350));
window.addEventListener?.('hlgb:logout',()=>{archiveEvidence9710={observed:false,legacyPaid:null,projectionPaid:null};document.querySelectorAll?.('[data-hlgb-client-notes9710],[data-hlgb-client-account9759]').forEach(x=>x.remove())});
console.info('[HLGB] notas v'+V+' organização/recebíveis somente leitura');
})();