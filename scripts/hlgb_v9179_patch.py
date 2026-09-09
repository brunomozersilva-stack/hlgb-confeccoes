from pathlib import Path
import re

path = Path('index.html')
text = path.read_text(encoding='utf-8')

MARK_START = '<!-- HLGB_V9179_START -->'
MARK_END = '<!-- HLGB_V9179_END -->'

# Idempotente: remove uma aplicação anterior do mesmo patch.
if MARK_START in text and MARK_END in text:
    a = text.index(MARK_START)
    b = text.index(MARK_END, a) + len(MARK_END)
    text = text[:a] + text[b:]

# Atualiza apenas a identificação visual/códigos de versão já existentes.
text = text.replace('v91.78', 'v91.79')
text = text.replace('V91.78', 'V91.79')

block = r'''<!-- HLGB_V9179_START -->
<style id="hlgb-v9179-style">
.hlgb9179-report-actions{display:flex;gap:6px;flex-wrap:wrap}
.hlgb9179-filter{margin:0 0 12px;padding:12px;border:1px solid #eadde4;border-radius:12px;background:#fff9fb}
.hlgb9179-price-row[hidden]{display:none!important}
.hlgb9179-cut-status{display:inline-flex;align-items:center;gap:5px;margin-left:6px;padding:3px 8px;border-radius:999px;font-size:11px;font-weight:700;white-space:nowrap}
.hlgb9179-cut-status.done{background:#e9f8ef;color:#087443;border:1px solid #b9e4c9}
.hlgb9179-cut-status.pending{background:#fff4d6;color:#8a5a00;border:1px solid #f1d487}
.hlgb9179-cut-status.none{background:#f4f1f3;color:#6f626a;border:1px solid #ded6da}
.hlgb9179-excel-wrap{overflow:auto;border:1px solid #e3d8de;border-radius:12px;background:#fff}
.hlgb9179-excel{border-collapse:collapse;min-width:1100px;width:100%;font-size:12px}
.hlgb9179-excel th,.hlgb9179-excel td{border:1px solid #e7dde2;padding:7px;vertical-align:top;text-align:left}
.hlgb9179-excel th{background:#f8f1f5;position:sticky;top:0;z-index:1}
.hlgb9179-excel .cutter-name{font-weight:800;min-width:150px;background:#fcf8fa;position:sticky;left:0;z-index:2}
.hlgb9179-cut-chip{display:block;margin:0 0 5px;padding:6px 7px;border-radius:8px;background:#f7f4f6;border:1px solid #e9e1e5;line-height:1.25}
.hlgb9179-cut-chip strong{display:block;font-size:12px}
.hlgb9179-week-total{font-weight:800;white-space:nowrap}
.hlgb9179-report-grid{display:grid;grid-template-columns:repeat(4,minmax(140px,1fr));gap:10px;margin:12px 0}
.hlgb9179-report-card{padding:12px;border:1px solid #eadde4;border-radius:12px;background:#fff}
.hlgb9179-report-card small{display:block;color:#786b73}.hlgb9179-report-card strong{font-size:20px}
@media(max-width:780px){.hlgb9179-report-grid{grid-template-columns:1fr 1fr}.hlgb9179-report-actions{flex-direction:column}}
</style>
<script id="hlgb-v9179-script">
(function(){
  'use strict';
  const V='91.79';
  const norm=v=>String(v||'').trim().toLowerCase();
  const asDate=v=>String(v||'').slice(0,10);
  const money9179=v=>'R$ '+Number(v||0).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2});
  const esc9179=v=>typeof esc==='function'?esc(v):String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const fmt9179=v=>{if(!v)return '-';try{return new Date(String(v).slice(0,10)+'T12:00:00').toLocaleDateString('pt-BR')}catch(e){return String(v)}};
  const orderNo9179=o=>{try{return typeof displayOrderNumber==='function'?(displayOrderNumber(o)||o.orderNumber||o.id):(o.orderNumber||o.id)}catch(e){return o.orderNumber||o.id}};
  const orderQty9179=o=>{try{return typeof qtyOfOrder==='function'?qtyOfOrder(o):(+o.qty||+o.totalQty||0)}catch(e){return +o.qty||+o.totalQty||0}};
  const orderModels9179=o=>{try{return typeof orderProductSummary==='function'?orderProductSummary(o):(o.items||'-')}catch(e){return o.items||'-'}};
  const clientMatches9179=(c,x)=>{
    if(!c||!x)return false;
    const cid=x.clientId??x.customerId;
    if(cid!=null && String(cid)===String(c.id))return true;
    const name=x.clientName||x.client||x.customer||'';
    return !!name && norm(name)===norm(c.name);
  };
  const inPeriod9179=(d,start,end)=>{d=asDate(d);if(!d)return !start&&!end;return (!start||d>=start)&&(!end||d<=end)};

  function clientOrders9179(c,start,end){
    return (db.orders||[]).filter(o=>clientMatches9179(c,o)&&inPeriod9179(o.date||o.deliveryDate||o.createdAt,start,end))
      .sort((a,b)=>String(a.date||'').localeCompare(String(b.date||'')));
  }
  function isOrderDone9179(o){
    const s=norm(o.status);
    return s.includes('finalizado')||s==='pago'||o.projectionInvoiced===true;
  }
  function clientFinance9179(c,start,end){
    const rows=[];
    (db.finance||[]).filter(f=>String(f.type||'').toLowerCase()==='receber'&&clientMatches9179(c,f)&&inPeriod9179(f.date||f.dueDate||f.paidDate,start,end)).forEach(f=>{
      const value=+f.value||0,paid=+f.paid||+(f.status==='Pago'?value:0),remaining=f.remaining!=null?+f.remaining:Math.max(0,value-paid);
      rows.push({id:f.id,date:f.date||f.dueDate||'',desc:f.desc||'Recebimento',value,paid,remaining,status:remaining<=0.009||norm(f.status)==='pago'?'Pago':(paid>0?'Parcial':'Em aberto')});
    });
    // Notas prontas antigas que não possuem lançamento financeiro próprio.
    (db.orders||[]).filter(o=>clientMatches9179(c,o)&&(o.invoiceReady||o.noteReady||o.paymentStatus)&&inPeriod9179(o.dueDate||o.invoiceDate||o.date,start,end)).forEach(o=>{
      if(rows.some(r=>String(r.id)===String(o.id)||String((db.finance||[]).find(f=>+f.orderId===+o.id)?.id||'')===String(r.id)))return;
      if((db.finance||[]).some(f=>+f.orderId===+o.id&&String(f.type)==='Receber'))return;
      let paid=0;try{paid=typeof orderPaid==='function'?orderPaid(o):(+o.received||0)}catch(e){paid=+o.received||0}
      const value=+o.total||0,remaining=Math.max(0,value-paid);
      rows.push({id:'o'+o.id,date:o.dueDate||o.invoiceDate||o.date||'',desc:'Pedido #'+orderNo9179(o),value,paid,remaining,status:remaining<=0.009?'Pago':(paid>0?'Parcial':'Em aberto')});
    });
    return rows.sort((a,b)=>String(a.date||'').localeCompare(String(b.date||'')));
  }

  window.hlgbRefreshClientReport9179=function(clientId){
    const c=(db.clients||[]).find(x=>String(x.id)===String(clientId));if(!c)return;
    const start=document.getElementById('hlgbClientReportStart9179')?.value||'';
    const end=document.getElementById('hlgbClientReportEnd9179')?.value||'';
    const orders=clientOrders9179(c,start,end),ongoing=orders.filter(o=>!isOrderDone9179(o)),fin=clientFinance9179(c,start,end);
    const sales=orders.reduce((a,o)=>a+(+o.total||0),0),pieces=orders.reduce((a,o)=>a+orderQty9179(o),0);
    const paid=fin.reduce((a,f)=>a+(+f.paid||0),0),open=fin.reduce((a,f)=>a+(+f.remaining||0),0);
    const target=document.getElementById('hlgbClientReportBody9179');if(!target)return;
    const orderRows=orders.map(o=>[fmt9179(o.date),esc9179('#'+orderNo9179(o)),esc9179(orderModels9179(o)),orderQty9179(o).toLocaleString('pt-BR'),money9179(o.total),esc9179(o.status||'Aberto')]);
    const ongoingRows=ongoing.map(o=>[fmt9179(o.date),esc9179('#'+orderNo9179(o)),esc9179(orderModels9179(o)),orderQty9179(o).toLocaleString('pt-BR'),esc9179(o.status||'Em andamento')]);
    const finRows=fin.map(f=>[fmt9179(f.date),esc9179(f.desc),money9179(f.value),money9179(f.paid),money9179(f.remaining),`<span class="badge ${f.status==='Pago'?'ok':f.status==='Parcial'?'':'warn'}">${esc9179(f.status)}</span>`]);
    target.innerHTML=`
      <div class="hlgb9179-report-grid">
       <div class="hlgb9179-report-card"><small>Vendas no período</small><strong>${money9179(sales)}</strong></div>
       <div class="hlgb9179-report-card"><small>Peças</small><strong>${pieces.toLocaleString('pt-BR')}</strong></div>
       <div class="hlgb9179-report-card"><small>Recebido</small><strong>${money9179(paid)}</strong></div>
       <div class="hlgb9179-report-card"><small>Em aberto</small><strong>${money9179(open)}</strong></div>
      </div>
      <div class="panel"><div class="toolbar" style="justify-content:space-between"><div><h3 style="margin:0">Pedidos em andamento</h3><div class="sub">Data, modelo, quantidade e situação atual.</div></div><button type="button" class="secondary" onclick="hlgbPrintClientReport9179('${clientId}','ongoing')">🖨️ Imprimir pedidos em andamento</button></div>${ongoingRows.length?table(['Data','Pedido','Modelo','Peças','Status'],ongoingRows):'<div class="empty">Nenhum pedido em andamento no período.</div>'}</div>
      <div class="panel"><h3>Histórico de vendas</h3>${orderRows.length?table(['Data','Pedido','Modelo','Peças','Valor','Status'],orderRows):'<div class="empty">Nenhuma venda no período.</div>'}</div>
      <div class="panel"><h3>Financeiro do cliente</h3><div class="sub">Notas/recebimentos em aberto, parciais e pagos no período selecionado.</div>${finRows.length?table(['Data','Descrição','Valor','Pago','Falta','Situação'],finRows):'<div class="empty">Nenhuma nota financeira no período.</div>'}</div>`;
  };

  window.hlgbOpenClientReport9179=function(clientId){
    const c=(db.clients||[]).find(x=>String(x.id)===String(clientId));if(!c)return;
    const now=new Date(),first=new Date(now.getFullYear(),now.getMonth(),1),iso=d=>d.toISOString().slice(0,10);
    openModal('Relatório do cliente — '+esc9179(c.name),`
      <div class="hlgb9179-filter"><div class="toolbar" style="align-items:flex-end;flex-wrap:wrap">
       <div class="field"><label>De</label><input id="hlgbClientReportStart9179" type="date" value="${iso(first)}" onchange="hlgbRefreshClientReport9179('${clientId}')"></div>
       <div class="field"><label>Até</label><input id="hlgbClientReportEnd9179" type="date" value="${iso(now)}" onchange="hlgbRefreshClientReport9179('${clientId}')"></div>
       <button type="button" class="secondary" onclick="document.getElementById('hlgbClientReportStart9179').value='';document.getElementById('hlgbClientReportEnd9179').value='';hlgbRefreshClientReport9179('${clientId}')">Todo período</button>
       <button type="button" class="primary" onclick="hlgbPrintClientReport9179('${clientId}','full')">🖨️ Imprimir relatório completo</button>
      </div></div><div id="hlgbClientReportBody9179"></div>`,()=>{});
    setTimeout(()=>hlgbRefreshClientReport9179(clientId),0);
  };

  window.hlgbPrintClientReport9179=function(clientId,mode){
    const c=(db.clients||[]).find(x=>String(x.id)===String(clientId));if(!c)return;
    const start=document.getElementById('hlgbClientReportStart9179')?.value||'',end=document.getElementById('hlgbClientReportEnd9179')?.value||'';
    const orders=clientOrders9179(c,start,end),showOrders=mode==='ongoing'?orders.filter(o=>!isOrderDone9179(o)):orders,fin=clientFinance9179(c,start,end);
    const rows=showOrders.map(o=>`<tr><td>${fmt9179(o.date)}</td><td>#${esc9179(orderNo9179(o))}</td><td>${esc9179(orderModels9179(o))}</td><td>${orderQty9179(o).toLocaleString('pt-BR')}</td><td>${money9179(o.total)}</td><td>${esc9179(o.status||'Aberto')}</td></tr>`).join('');
    const frows=fin.map(f=>`<tr><td>${fmt9179(f.date)}</td><td>${esc9179(f.desc)}</td><td>${money9179(f.value)}</td><td>${money9179(f.paid)}</td><td>${money9179(f.remaining)}</td><td>${esc9179(f.status)}</td></tr>`).join('');
    const w=window.open('','_blank');if(!w){alert('Permita pop-ups no navegador para imprimir.');return}
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Relatório - ${esc9179(c.name)}</title><style>body{font-family:Arial;color:#332a30;margin:28px}h1{margin-bottom:4px}.muted{color:#777}table{width:100%;border-collapse:collapse;margin:16px 0 28px}th,td{border:1px solid #ddd;padding:7px;text-align:left;font-size:12px}th{background:#f5eef2}.noPrint{padding:10px 18px}@media print{.noPrint{display:none}}</style></head><body><h1>HLGB Confecções</h1><h2>${mode==='ongoing'?'Pedidos em andamento':'Relatório do cliente'} — ${esc9179(c.name)}</h2><div class="muted">Período: ${start?fmt9179(start):'início'} até ${end?fmt9179(end):'hoje'}</div><h3>${mode==='ongoing'?'Pedidos em andamento':'Vendas / pedidos'}</h3><table><tr><th>Data</th><th>Pedido</th><th>Modelo</th><th>Peças</th><th>Valor</th><th>Status</th></tr>${rows||'<tr><td colspan="6">Nenhum registro.</td></tr>'}</table>${mode==='full'?`<h3>Financeiro</h3><table><tr><th>Data</th><th>Descrição</th><th>Valor</th><th>Pago</th><th>Falta</th><th>Situação</th></tr>${frows||'<tr><td colspan="6">Nenhum registro.</td></tr>'}</table>`:''}<button class="noPrint" onclick="window.print()">Imprimir</button></body></html>`);w.document.close();
  };

  function enhanceClients9179(){
    const box=document.getElementById('clientTable');if(!box)return;
    const rows=[...box.querySelectorAll('table tr')].slice(1);
    rows.forEach((tr,i)=>{
      const c=(db.clients||[])[i],td=tr.lastElementChild;if(!c||!td||td.querySelector('.hlgb9179-client-report'))return;
      const b=document.createElement('button');b.type='button';b.className='secondary hlgb9179-client-report';b.textContent='Relatório';b.onclick=()=>hlgbOpenClientReport9179(c.id);td.append(' ',b);
    });
  }

  // Filtro de busca dentro da precificação de cliente.
  window.hlgbFilterClientPricing9179=function(){
    const q=norm(document.getElementById('hlgbClientPriceFilter9179')?.value);
    document.querySelectorAll('.hlgb9179-price-row').forEach(r=>r.hidden=!!q&&!norm(r.dataset.search).includes(q));
    const count=[...document.querySelectorAll('.hlgb9179-price-row')].filter(r=>!r.hidden).length;
    const el=document.getElementById('hlgbClientPriceCount9179');if(el)el.textContent=count+' produto(s) exibido(s)';
  };
  window.clientPricing=function(id){
    const c=(db.clients||[]).find(x=>String(x.id)===String(id));if(!c)return;c.prices=c.prices||{};
    const products=(db.products||[]).slice().sort((a,b)=>String(a.name||'').localeCompare(String(b.name||''),'pt-BR'));
    const rows=products.map(p=>`<div class="grid hlgb9179-price-row" data-search="${esc9179(norm((p.name||'')+' '+(p.code||'')+' '+(p.category||'')))}" style="margin-bottom:8px"><div class="field"><label>Produto</label><input value="${esc9179(p.name)}" disabled></div><div class="field"><label>Preço padrão</label><input value="${(+p.price||0).toFixed(2)}" disabled></div><div class="field"><label>Preço deste cliente</label><input id="cp_${p.id}" type="number" step=".01" value="${c.prices[p.id]!=null?c.prices[p.id]:''}" placeholder="Usar padrão"></div></div>`).join('');
    openModal(`Precificação — ${esc9179(c.name)}`,`<div class="hlgb9179-filter"><div class="field"><label>🔎 Filtrar produto</label><input id="hlgbClientPriceFilter9179" placeholder="Digite nome, código ou categoria" oninput="hlgbFilterClientPricing9179()"></div><div id="hlgbClientPriceCount9179" class="sub">${products.length} produto(s) exibido(s)</div></div>${rows||'<div class="empty">Cadastre produtos primeiro.</div>'}<div class="sub">Se deixar o preço especial vazio, o sistema usará o preço padrão do produto.</div><button class="primary modalSave">Salvar preços</button>`,()=>{products.forEach(p=>{const v=document.getElementById('cp_'+p.id)?.value;if(v!==''&&v!=null)c.prices[p.id]=+v;else delete c.prices[p.id]});closeModal();save();});
    setTimeout(()=>document.getElementById('hlgbClientPriceFilter9179')?.focus(),0);
  };

  function cutStatus9179(productId,orderId){
    const cuts=(db.cuts||[]).filter(c=>{
      const direct=productId&&String(c.productId)===String(productId);
      const byOrder=orderId&&String(c.orderId)===String(orderId);
      return direct||byOrder;
    });
    if(cuts.some(c=>norm(c.status)==='finalizado'))return {text:'✓ Já cortado',cls:'done'};
    if(cuts.some(c=>c.plannedCutDate||c.cutterId||norm(c.status)==='planejado'))return {text:'Programado / a cortar',cls:'pending'};
    return {text:'Ainda não cortado',cls:'none'};
  }
  window.hlgbProgramAnyModel9179=function(){
    const products=(db.products||[]).slice().sort((a,b)=>String(a.name||'').localeCompare(String(b.name||''),'pt-BR'));
    const cutters=(db.cutters||[]).filter(x=>x.active!==false);
    const today=new Date().toISOString().slice(0,10);
    openModal('Programar corte — qualquer modelo',`<div class="sub" style="margin-bottom:12px">Escolha qualquer modelo cadastrado, mesmo que ele não esteja ligado a um pedido. O corte ficará como programação avulsa e não altera nenhum pedido.</div><div class="grid"><div class="field"><label>Modelo</label><select id="hlgbCutProduct9179"><option value="">Selecione</option>${products.map(p=>`<option value="${p.id}">${esc9179(p.name)}</option>`).join('')}</select></div><div class="field"><label>Peças</label><input id="hlgbCutQty9179" type="number" min="1" step="1"></div><div class="field"><label>Data programada</label><input id="hlgbCutDate9179" type="date" value="${today}"></div><div class="field"><label>Cortador</label><select id="hlgbCutCutter9179"><option value="">Sem cortador definido</option>${cutters.map(c=>`<option value="${c.id}">${esc9179(c.name)}</option>`).join('')}</select></div><div class="field"><label>Tipo de corte</label><select id="hlgbCutType9179"><option value="">Selecione</option><option>Interno</option><option>Externo</option></select></div><div class="field"><label>Observação</label><input id="hlgbCutNote9179" placeholder="Opcional"></div></div><button type="button" class="primary modalSave">💾 Programar modelo</button>`,()=>{
      const pid=document.getElementById('hlgbCutProduct9179')?.value,p=(db.products||[]).find(x=>String(x.id)===String(pid)),qty=Math.max(0,+document.getElementById('hlgbCutQty9179')?.value||0);if(!p){alert('Escolha o modelo.');return false}if(!qty){alert('Informe a quantidade de peças.');return false}
      const id=Date.now()+Math.floor(Math.random()*100000);db.cuts=Array.isArray(db.cuts)?db.cuts:[];db.cuts.push({id,orderId:null,manual:true,isAdHoc:true,op:'AVULSO-'+String(id).slice(-6),productId:p.id,product:p.name,client:'',pieces:qty,cutterId:document.getElementById('hlgbCutCutter9179')?.value?+document.getElementById('hlgbCutCutter9179').value:null,cutType:document.getElementById('hlgbCutType9179')?.value||'',plannedCutDate:document.getElementById('hlgbCutDate9179')?.value||today,date:today,status:'Planejado',note:document.getElementById('hlgbCutNote9179')?.value||''});closeModal();try{persistDb()}catch(e){console.error(e)}try{renderCuts()}catch(e){}try{renderCutters()}catch(e){};
    });
  };

  function enhanceCutPage9179(){
    const sec=document.getElementById('corte');if(!sec)return;
    const toolbar=sec.querySelector('.panel .toolbar');
    if(toolbar&&!toolbar.querySelector('.hlgb9179-any-model')){const b=document.createElement('button');b.type='button';b.className='primary hlgb9179-any-model';b.textContent='+ Programar qualquer modelo';b.onclick=hlgbProgramAnyModel9179;toolbar.appendChild(b)}
    // Marca visualmente situações nas telas que exibem linhas de modelos sem destino.
    document.querySelectorAll('#corte tr, #producao tr, #capacidadeProducao tr, #projecao tr').forEach(tr=>{
      if(tr.querySelector('.hlgb9179-cut-status'))return;
      const text=tr.textContent||'';let order=null;const m=text.match(/#\s*(\d+)/);if(m)order=(db.orders||[]).find(o=>String(orderNo9179(o))===String(m[1]));
      let product=null;for(const p of (db.products||[])){if(p.name&&norm(text).includes(norm(p.name))&&(!product||String(p.name).length>String(product.name).length))product=p}
      if(!product&&!order)return;
      const s=cutStatus9179(product?.id,order?.id);const td=product?[...tr.children].find(x=>norm(x.textContent).includes(norm(product.name))):tr.children[0];if(!td)return;
      const sp=document.createElement('span');sp.className='hlgb9179-cut-status '+s.cls;sp.textContent=s.text;td.appendChild(sp);
    });
  }

  let cutterWeek9179='';
  function monday9179(v){const d=v?new Date(v+'T12:00:00'):new Date(),day=d.getDay(),diff=day===0?-6:1-day;d.setDate(d.getDate()+diff);return d}
  function iso9179(d){return d.toISOString().slice(0,10)}
  window.hlgbMoveCutterWeek9179=function(delta){const d=monday9179(cutterWeek9179||iso9179(new Date()));d.setDate(d.getDate()+delta*7);cutterWeek9179=iso9179(d);hlgbRenderCutterExcel9179()};
  window.hlgbSetCutterWeek9179=function(v){cutterWeek9179=iso9179(monday9179(v||iso9179(new Date())));hlgbRenderCutterExcel9179()};
  window.hlgbCurrentCutterWeek9179=function(){cutterWeek9179=iso9179(monday9179());hlgbRenderCutterExcel9179()};
  function cutsForDay9179(cutterId,day){return (db.cuts||[]).filter(c=>String(c.cutterId||'')===String(cutterId||'')&&asDate(c.plannedCutDate||c.finishedAt||c.date)===day)}
  window.hlgbRenderCutterExcel9179=function(){
    const el=document.getElementById('hlgbCutterExcel9179');if(!el)return;if(!cutterWeek9179)cutterWeek9179=iso9179(monday9179());
    const mon=monday9179(cutterWeek9179),days=Array.from({length:7},(_,i)=>{const d=new Date(mon);d.setDate(d.getDate()+i);return d}),dayIds=days.map(iso9179);
    let cutters=(db.cutters||[]).filter(c=>c.active!==false).map(c=>({id:c.id,name:c.name||'Cortador'}));if((db.cuts||[]).some(c=>!c.cutterId&&dayIds.includes(asDate(c.plannedCutDate||c.finishedAt||c.date))))cutters.push({id:'',name:'⚠ Sem cortador'});
    const heads=days.map(d=>`<th>${d.toLocaleDateString('pt-BR',{weekday:'short',day:'2-digit',month:'2-digit'})}</th>`).join('');
    const rows=cutters.map(ct=>{let weekTotal=0;const cells=dayIds.map(day=>{const cuts=cutsForDay9179(ct.id,day);const total=cuts.reduce((a,c)=>a+(+c.pieces||0),0);weekTotal+=total;const chips=cuts.map(c=>`<span class="hlgb9179-cut-chip"><strong>${esc9179(c.product||'Modelo')}</strong>${(+c.pieces||0).toLocaleString('pt-BR')} pç · ${norm(c.status)==='finalizado'?'✓ cortado':'a cortar'}</span>`).join('');return `<td>${chips||'<span class="sub">—</span>'}${total?`<div class="hlgb9179-week-total">${total.toLocaleString('pt-BR')} pç</div>`:''}</td>`}).join('');return `<tr><td class="cutter-name">${esc9179(ct.name)}</td>${cells}<td class="hlgb9179-week-total">${weekTotal.toLocaleString('pt-BR')} pç</td></tr>`}).join('');
    el.innerHTML=`<div class="toolbar" style="justify-content:space-between;align-items:flex-end;flex-wrap:wrap;margin-bottom:10px"><div><button class="secondary" onclick="hlgbMoveCutterWeek9179(-1)">← Semana anterior</button> <button class="secondary" onclick="hlgbCurrentCutterWeek9179()">Esta semana</button> <button class="secondary" onclick="hlgbMoveCutterWeek9179(1)">Próxima semana →</button></div><div class="field"><label>Semana</label><input type="date" value="${cutterWeek9179}" onchange="hlgbSetCutterWeek9179(this.value)"></div><button class="secondary" onclick="hlgbPrintCutterExcel9179()">🖨️ Imprimir</button></div><div class="hlgb9179-excel-wrap"><table class="hlgb9179-excel"><thead><tr><th>Cortador</th>${heads}<th>Total semana</th></tr></thead><tbody>${rows||'<tr><td colspan="9">Nenhum cortador cadastrado.</td></tr>'}</tbody></table></div>`;
  };
  window.hlgbPrintCutterExcel9179=function(){const el=document.getElementById('hlgbCutterExcel9179');if(!el)return;const w=window.open('','_blank');if(!w){alert('Permita pop-ups para imprimir.');return}w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Projeção de cortadores</title><style>body{font-family:Arial;margin:18px}table{border-collapse:collapse;width:100%;font-size:10px}th,td{border:1px solid #aaa;padding:5px;vertical-align:top}.hlgb9179-cut-chip{display:block;margin-bottom:4px}.toolbar,.field label,.field input,button{display:none}</style></head><body><h2>HLGB Confecções — Projeção semanal dos cortadores</h2>${el.innerHTML}</body></html>`);w.document.close();setTimeout(()=>w.print(),150)};
  function ensureCutterExcel9179(){
    const anchor=document.getElementById('cutterTable')?.closest('.panel');if(!anchor)return;
    let panel=document.getElementById('hlgbCutterExcelPanel9179');if(!panel){panel=document.createElement('div');panel.id='hlgbCutterExcelPanel9179';panel.className='panel';panel.innerHTML='<h2>📊 Projeção semanal dos cortadores — visão tipo Excel</h2><div class="sub">Cada linha é um cortador e cada coluna é um dia. Assim fica fácil enxergar quem está com cada modelo e quantas peças estão programadas.</div><div id="hlgbCutterExcel9179" style="margin-top:12px"></div>';anchor.insertAdjacentElement('afterend',panel)}hlgbRenderCutterExcel9179();
  }

  // Login Safari/rede: impede uma requisição de senha de ficar pendurada indefinidamente e tenta uma vez novamente.
  try{
    if(typeof cloudSignIn==='function' && typeof HLGB_SUPABASE_URL!=='undefined' && typeof HLGB_SUPABASE_KEY!=='undefined'){
      window.hlgbCloudSignInBase9179=cloudSignIn;
      cloudSignIn=async function(email,password){
        let lastErr=null;
        for(let attempt=0;attempt<2;attempt++){
          const controller=typeof AbortController!=='undefined'?new AbortController():null;const timer=controller?setTimeout(()=>controller.abort(),12000):null;
          try{
            const res=await fetch(`${HLGB_SUPABASE_URL}/auth/v1/token?grant_type=password`,{method:'POST',headers:{apikey:HLGB_SUPABASE_KEY,'Content-Type':'application/json'},body:JSON.stringify({email,password}),signal:controller?.signal});
            const data=await res.json().catch(()=>({}));if(!res.ok||!data.access_token)throw new Error(data.error_description||data.msg||data.message||'Não foi possível entrar.');if(timer)clearTimeout(timer);cloudApplyAuth(data);return data;
          }catch(e){if(timer)clearTimeout(timer);lastErr=e;if(attempt===0&&(e?.name==='AbortError'||/network|fetch|tempo|timeout/i.test(String(e?.message||'')))){await new Promise(r=>setTimeout(r,700));continue}throw e}
        }
        throw lastErr||new Error('A sessão demorou para responder. Tente entrar novamente.');
      };
    }
  }catch(e){console.warn('HLGB v91.79: proteção de login não aplicada',e)}

  // Encadeia os renderizadores existentes sem trocar a lógica principal.
  try{const base=renderClients;renderClients=function(){const r=base.apply(this,arguments);setTimeout(enhanceClients9179,0);return r}}catch(e){}
  try{const base=renderCuts;renderCuts=function(){const r=base.apply(this,arguments);setTimeout(enhanceCutPage9179,0);return r}}catch(e){}
  try{const base=renderCutters;renderCutters=function(){const r=base.apply(this,arguments);setTimeout(ensureCutterExcel9179,0);return r}}catch(e){}
  ['renderProduction','renderProjection','renderCapacityPlanning'].forEach(name=>{try{const base=window[name];if(typeof base==='function')window[name]=function(){const r=base.apply(this,arguments);setTimeout(enhanceCutPage9179,0);return r}}catch(e){}});

  document.addEventListener('DOMContentLoaded',()=>{setTimeout(()=>{try{enhanceClients9179()}catch(e){}try{enhanceCutPage9179()}catch(e){}try{ensureCutterExcel9179()}catch(e){}},300)});
  console.log('HLGB v'+V+' carregada: relatórios de cliente, filtro de preços, corte avulso e projeção tipo Excel.');
})();
</script>
<!-- HLGB_V9179_END -->'''

if '</body>' not in text:
    raise SystemExit('index.html sem </body>; patch abortado')

text = text.replace('</body>', block + '\n</body>', 1)
path.write_text(text, encoding='utf-8')
print('HLGB v91.79 aplicado com sucesso')
