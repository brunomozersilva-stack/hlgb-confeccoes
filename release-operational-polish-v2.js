/* HLGB — pacote operacional 02/10: grades, estoque, Hub facções e Assistente enxuto */
(function(){
'use strict';
const V='2026.10.02-operational-polish-v2';
const sid=v=>String(v??''),q=v=>Math.max(0,Number(v)||0),norm=v=>sid(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim().replace(/\s+/g,' ');
const escSafe=v=>typeof esc==='function'?esc(v):sid(v).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const moneySafe=v=>typeof money==='function'?money(v):Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
function arr(n){try{return Array.isArray(db?.[n])?db[n]:[]}catch(e){return []}}
function sizesFor(rows){
 let all=[];try{all=typeof hlgbSortedSizes==='function'?hlgbSortedSizes(db.sizes):(db.sizes||[])}catch(e){all=['P','M','G','GG']}
 const used=new Set((rows||[]).map(x=>sid(x.size)).filter(Boolean));return all.filter(s=>used.has(sid(s))).concat([...used].filter(s=>!all.map(sid).includes(sid(s))));
}
function matrix(rows){
 rows=(rows||[]).filter(x=>q(x.qty)>0);if(!rows.length)return '<div class="empty">Sem grade detalhada.</div>';
 const ss=sizesFor(rows),groups={};
 for(const x of rows){const c=x.color||'-';groups[c]=groups[c]||{};groups[c][sid(x.size)]=(groups[c][sid(x.size)]||0)+q(x.qty)}
 const colTotals={};ss.forEach(s=>colTotals[s]=0);
 let grand=0;
 const body=Object.entries(groups).map(([color,map])=>{
   let total=0;const cells=ss.map(s=>{const v=q(map[s]);colTotals[s]+=v;total+=v;grand+=v;return '<td>'+v.toLocaleString('pt-BR')+'</td>'}).join('');
   return '<tr><td><b>'+escSafe(color)+'</b></td>'+cells+'<td><b>'+total.toLocaleString('pt-BR')+'</b></td></tr>';
 }).join('');
 return '<div style="overflow:auto"><table class="hlgbStdMatrix"><thead><tr><th>Cor</th>'+ss.map(s=>'<th>'+escSafe(s)+'</th>').join('')+'<th>Total</th></tr></thead><tbody>'+body+'<tr><td><b>Total</b></td>'+ss.map(s=>'<td><b>'+q(colTotals[s]).toLocaleString('pt-BR')+'</b></td>').join('')+'<td><b>'+grand.toLocaleString('pt-BR')+'</b></td></tr></tbody></table></div>';
}
function productOf(id){return arr('products').find(p=>sid(p?.id)===sid(id))||null}
function orderOf(id){return arr('orders').find(o=>sid(o?.id)===sid(id))||null}
function orderNo(o){try{return typeof displayOrderNumber==='function'?displayOrderNumber(o):(o?.orderNumber||o?.id)}catch(e){return o?.orderNumber||o?.id}}
function gradeForProduct(o,pid){return (o?.grade||[]).filter(g=>!pid||sid(g.productId)===sid(pid)).map(g=>({...g,qty:q(g.qty)})).filter(g=>g.qty>0)}
function decorateSeparation(){
 const root=document.getElementById('separationTable'),id=document.getElementById('separationOrder')?.value,o=orderOf(id);if(!root||!o)return;
 let p=document.getElementById('sepGrade9198');
 if(!p){p=document.createElement('div');p.id='sepGrade9198';p.className='panel';const action=root.querySelector('.separation-action-box');if(action)action.insertAdjacentElement('afterend',p);else root.prepend(p)}
 const groups={};for(const g of (o.grade||[])){const k=sid(g.productId);if(!k)continue;(groups[k]=groups[k]||[]).push(g)}
 p.innerHTML='<h3>📐 Grade dos produtos para separação</h3><div class="sub">Mesmo padrão da Folha dos Cortadores.</div>'+Object.entries(groups).map(([pid,rows])=>'<div style="margin-top:14px"><h3 style="margin:0 0 6px">'+escSafe(productOf(pid)?.name||'Produto')+'</h3>'+matrix(rows)+'</div>').join('');
}
const oldSep=window.renderSeparation;
if(typeof oldSep==='function'&&!oldSep.__hlgbStdMatrixV2){
 const w=function(){const r=oldSep.apply(this,arguments);setTimeout(decorateSeparation,0);setTimeout(decorateSeparation,80);return r};w.__hlgbStdMatrixV2=true;w.__original=oldSep;window.renderSeparation=w;
}
window.printMaterialSeparationSheet=function(orderId){
 const o=orderOf(orderId);if(!o)return;
 let breakdown=[];try{breakdown=typeof orderMaterialBreakdownByProduct==='function'?orderMaterialBreakdownByProduct(o):[]}catch(e){}
 const ids=[...new Set([...(o.grade||[]).map(g=>sid(g.productId)),...breakdown.map(g=>sid(g.productId))].filter(Boolean))];
 const blocks=ids.map(pid=>{
   const p=productOf(pid),gr=gradeForProduct(o,pid),g=breakdown.find(x=>sid(x.productId)===pid),mats=g?Object.values(g.materials||{}):[];
   const mh=mats.length?'<table><thead><tr><th>Material</th><th>Un.</th><th>Por cor</th><th>Total</th></tr></thead><tbody>'+mats.map(m=>'<tr><td>'+escSafe(m.name||'-')+'</td><td>'+escSafe(m.unit||'')+'</td><td>'+Object.entries(m.byColor||{}).map(([c,v])=>escSafe(c)+': '+q(v).toLocaleString('pt-BR',{maximumFractionDigits:3})).join('<br>')+'</td><td>'+q(m.qty).toLocaleString('pt-BR',{maximumFractionDigits:3})+'</td></tr>').join('')+'</tbody></table>':'<p>Sem materiais cadastrados.</p>';
   return '<section class="product-block"><h2>'+escSafe(p?.name||g?.productName||'Produto')+'</h2><h3>Grade</h3>'+matrix(gr)+'<h3>Materiais</h3>'+mh+'<p>Separado por: ____________________________ &nbsp; OK: ☐</p></section>';
 }).join('');
 const w=window.open('','_blank');if(!w)return alert('Permita pop-ups para imprimir.');
 w.document.write('<!doctype html><html><head><meta charset="utf-8"><title>Separação pedido #'+escSafe(orderNo(o))+'</title><style>body{font-family:Arial;padding:25px;color:#222}table{border-collapse:collapse;width:100%;margin:10px 0 18px}th,td{border:1px solid #aaa;padding:7px;text-align:center;font-size:12px}th:first-child,td:first-child{text-align:left}.product-block{page-break-inside:avoid;margin-bottom:28px}h1{font-size:21px}h2{font-size:17px}h3{font-size:14px}</style></head><body><h1>HLGB Confecções — Separação de material</h1><p><b>Pedido:</b> #'+escSafe(orderNo(o))+' &nbsp; <b>Cliente:</b> '+escSafe(o.client||'-')+'</p>'+blocks+'<script>window.onload=()=>window.print();<\/script></body></html>');w.document.close();
};

/* Produtos: listagem limpa; ficha técnica continua completa. */
function cleanProductTable(){
 const root=document.getElementById('productTable'),tableEl=root?.querySelector('table');if(!tableEl)return;
 const headers=[...tableEl.querySelectorAll('thead th, tr:first-child th')],hide=[];
 headers.forEach((th,i)=>{if(['material','cores','grade'].includes(norm(th.textContent)))hide.push(i)});
 for(const i of hide){tableEl.querySelectorAll('tr').forEach(tr=>{const cell=tr.children[i];if(cell)cell.style.display='none'})}
 tableEl.style.minWidth='920px';root.style.overflowX='auto';
}
const oldProducts=window.renderProducts;
if(typeof oldProducts==='function'&&!oldProducts.__hlgbCleanV2){
 const w=function(){const r=oldProducts.apply(this,arguments);setTimeout(cleanProductTable,0);setTimeout(cleanProductTable,80);return r};w.__hlgbCleanV2=true;w.__original=oldProducts;window.renderProducts=w;
}

/* Estoque: matéria-prima e peças em tabelas separadas, com valor e resumo patrimonial. */
function productCost(p){
 if(!p)return 0;let v=0;
 try{if(Array.isArray(p.materials)&&typeof materialCostPerPiece==='function')v=p.materials.reduce((a,m)=>a+q(materialCostPerPiece(m)),0)+q(p.labor)}catch(e){}
 return v||q(p.cost)||q(p.unitCost)||0;
}
function stockUnitValue(s){
 const direct=q(s?.unitCost||s?.cost||s?.price||s?.value);if(direct)return direct;
 const m=arr('materials').find(x=>norm(x?.name)===norm(s?.item));if(m)return q(m.price||m.purchasePrice);
 const p=arr('products').find(x=>norm(x?.name)===norm(s?.item));return productCost(p);
}
function stockRows(list){
 return list.map(s=>'<tr><td><b>'+escSafe(s.item||'-')+'</b></td><td>'+escSafe(s.cat||'-')+'</td><td>'+q(s.qty).toLocaleString('pt-BR')+' '+escSafe(s.unit||'')+'</td><td>'+moneySafe(stockUnitValue(s))+'</td><td><b>'+moneySafe(q(s.qty)*stockUnitValue(s))+'</b></td><td>'+q(s.min).toLocaleString('pt-BR')+'</td><td>'+ (q(s.qty)<q(s.min)?'<span class="badge bad">Comprar</span>':'<span class="badge ok">OK</span>') +'</td><td><button class="secondary" onclick="moveStock('+JSON.stringify(s.id)+')">Movimentar</button></td></tr>').join('');
}
function stockTableHtml(list,empty){
 return list.length?'<div style="overflow:auto"><table><thead><tr><th>Item</th><th>Categoria</th><th>Saldo</th><th>Custo/un.</th><th>Valor em estoque</th><th>Mínimo</th><th>Status</th><th>Ações</th></tr></thead><tbody>'+stockRows(list)+'</tbody></table></div>':'<div class="empty">'+escSafe(empty)+'</div>';
}
function assetTotal(){return arr('assets').filter(a=>norm(a.status)!=='baixado').reduce((a,x)=>a+q(x.value)*Math.max(1,q(x.qty)),0)}
function renderStockV2(){
 const root=document.getElementById('stockTable'),cards=document.getElementById('stockReadyCards');if(!root)return;
 const query=norm(document.getElementById('stockSearch')?.value||''),cat=document.getElementById('stockCategoryFilter')?.value||'';
 const all=arr('stock').filter(s=>(!query||norm(s.item).includes(query))&&(!cat||s.cat===cat));
 const rawCats=new Set(['Matéria-prima','Aviamento']),finishedCats=new Set(['Peças prontas — Pronto para venda','Peças prontas — 2ª escolha','Produto acabado']);
 const raw=all.filter(s=>rawCats.has(s.cat)),finished=all.filter(s=>finishedCats.has(s.cat)),other=all.filter(s=>!rawCats.has(s.cat)&&!finishedCats.has(s.cat));
 const rawValue=raw.reduce((a,s)=>a+q(s.qty)*stockUnitValue(s),0),finishedValue=finished.reduce((a,s)=>a+q(s.qty)*stockUnitValue(s),0),finishedQty=finished.reduce((a,s)=>a+q(s.qty),0),assets=assetTotal();
 if(cards)cards.innerHTML='<div class="card"><small>Matéria-prima / aviamentos</small><strong>'+moneySafe(rawValue)+'</strong></div><div class="card"><small>Peças prontas</small><strong>'+finishedQty.toLocaleString('pt-BR')+' un.</strong><div class="sub">'+moneySafe(finishedValue)+'</div></div><div class="card"><small>Inventário de bens</small><strong>'+moneySafe(assets)+'</strong></div><div class="card"><small>Total patrimonial</small><strong>'+moneySafe(rawValue+finishedValue+assets)+'</strong></div>';
 root.innerHTML='<div class="panel" style="background:#fff"><h2>🧵 Matéria-prima e aviamentos</h2><div class="sub">Quantidades permanecem em suas unidades próprias; o consolidado é feito em valor.</div>'+stockTableHtml(raw,'Nenhuma matéria-prima encontrada.')+'</div><div class="panel" style="background:#fff"><h2>👗 Peças prontas / produto acabado</h2>'+stockTableHtml(finished,'Nenhuma peça pronta encontrada.')+'</div>'+(other.length?'<div class="panel"><h2>Outros itens</h2>'+stockTableHtml(other,'')+'</div>':'');
}
window.renderStock=renderStockV2;

/* Hub Financeiro: filtro de facções ativas ao abrir a categoria Facção. */
function activeFactionNames(){
 const names=new Set();
 for(const f of arr('factionMasters'))if(f&&f.active!==false&&!norm(f.status).includes('inativo')&&f.name)names.add(String(f.name));
 for(const f of arr('factions'))if(f&&norm(f.status)!=='finalizado'&&f.name)names.add(String(f.name));
 return [...names].sort((a,b)=>a.localeCompare(b,'pt-BR'));
}
function hubRange(){
 const mode=document.getElementById('hlgbHubPeriodMode')?.value||'month';
 const today=new Date(),iso=d=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
 if(mode==='year'){const y=+document.getElementById('hlgbHubPeriodYear')?.value||today.getFullYear();return {start:y+'-01-01',end:y+'-12-31',label:'Ano '+y}}
 if(mode==='week'){const v=document.getElementById('hlgbHubPeriodWeek')?.value||'';const m=v.match(/^(\d{4})-W(\d{2})$/);if(m){const jan4=new Date(+m[1],0,4,12),day=(jan4.getDay()+6)%7;jan4.setDate(jan4.getDate()-day+(+m[2]-1)*7);const e=new Date(jan4);e.setDate(e.getDate()+6);return {start:iso(jan4),end:iso(e),label:'Semana '+m[2]}}}
 const v=document.getElementById('hlgbHubPeriodMonth')?.value||iso(today).slice(0,7),m=v.match(/^(\d{4})-(\d{2})$/);if(m){const d=new Date(+m[1],+m[2],0,12);return {start:v+'-01',end:iso(d),label:'Mês '+v}}return null;
}
function entryFaction(e){
 const direct=[e?.person,e?.subcategory,e?.description,e?.origin].filter(Boolean).join(' ');
 for(const name of activeFactionNames())if(norm(direct).includes(norm(name)))return name;
 const fp=arr('factionPayments').find(x=>sid(x?.id)===sid(e?.sourceId));return fp?.factionName||fp?.name||'';
}
function hubExpenseRows(range){return arr('hubFinanceEntries').filter(e=>e&&e.flow==='Saída'&&String(e.date||'').slice(0,10)>=range.start&&String(e.date||'').slice(0,10)<=range.end)}
function rangeForMode(mode){
 const now=new Date(),iso=d=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
 if(mode==='week'){const d=new Date(now),day=(d.getDay()+6)%7;d.setDate(d.getDate()-day);const e=new Date(d);e.setDate(e.getDate()+6);return {start:iso(d),end:iso(e)}}
 if(mode==='year')return {start:now.getFullYear()+'-01-01',end:now.getFullYear()+'-12-31'};
 const s=new Date(now.getFullYear(),now.getMonth(),1),e=new Date(now.getFullYear(),now.getMonth()+1,0);return {start:iso(s),end:iso(e)};
}
function factionTotals(name,range){const rows=hubExpenseRows(range).filter(e=>norm(e.category)==='faccao'&&(!name||norm(entryFaction(e))===norm(name)));return {rows,total:rows.reduce((a,e)=>a+q(e.value),0),realized:rows.filter(e=>e.status==='Realizado').reduce((a,e)=>a+q(e.value),0),pending:rows.filter(e=>e.status!=='Realizado').reduce((a,e)=>a+q(e.value),0)}}
function renderHubFactionDetail(){
 const box=document.getElementById('hlgbHubPeriodDetail');if(!box)return;
 const names=activeFactionNames(),selected=document.getElementById('hlgbHubFactionFilter')?.value||'',range=hubRange();if(!range)return;
 const current=factionTotals(selected,range),wk=factionTotals(selected,rangeForMode('week')),mo=factionTotals(selected,rangeForMode('month')),yr=factionTotals(selected,rangeForMode('year'));
 const rows=current.rows.slice().sort((a,b)=>String(b.date).localeCompare(String(a.date))).map(e=>'<tr><td>'+escSafe(e.date||'-')+'</td><td>'+escSafe(entryFaction(e)||'Sem facção')+'</td><td>'+escSafe(e.description||e.subcategory||'-')+'</td><td>'+escSafe(e.status||'Previsto')+'</td><td><b>'+moneySafe(e.value)+'</b></td></tr>').join('');
 box.innerHTML='<div class="panel" style="background:#fff8fb"><h3 style="margin-top:0">Facções — '+escSafe(range.label||'período')+'</h3><div class="toolbar" style="align-items:flex-end;flex-wrap:wrap"><div class="field"><label>Facção ativa</label><select id="hlgbHubFactionFilter"><option value="">Todas as facções ativas</option>'+names.map(n=>'<option '+(n===selected?'selected':'')+'>'+escSafe(n)+'</option>').join('')+'</select></div><button type="button" class="primary" onclick="hlgbRenderHubFactionDetail()">Aplicar</button></div><div class="cards"><div class="card"><small>Semana atual</small><strong>'+moneySafe(wk.total)+'</strong></div><div class="card"><small>Mês atual</small><strong>'+moneySafe(mo.total)+'</strong></div><div class="card"><small>Ano atual</small><strong>'+moneySafe(yr.total)+'</strong></div><div class="card"><small>Período selecionado</small><strong>'+moneySafe(current.total)+'</strong><div class="sub">Pago '+moneySafe(current.realized)+' · previsto '+moneySafe(current.pending)+'</div></div></div><div style="overflow:auto"><table><thead><tr><th>Data</th><th>Facção</th><th>Descrição</th><th>Status</th><th>Valor</th></tr></thead><tbody>'+rows+'</tbody></table></div></div>';
}
window.hlgbRenderHubFactionDetail=renderHubFactionDetail;
function decorateHubButtons(){
 document.querySelectorAll('.hlgbHubCatBtn').forEach(b=>{if(norm(b.dataset.cat)==='faccao'){b.onclick=()=>renderHubFactionDetail()}});
}
const hp=window.hlgbHubPeriodSummary;
if(hp?.render&&!hp.render.__hlgbFactionV2){const old=hp.render;const w=function(){const r=old.apply(this,arguments);setTimeout(decorateHubButtons,0);return r};w.__hlgbFactionV2=true;hp.render=w}
const oldHub=window.renderHubFinance;if(typeof oldHub==='function'&&!oldHub.__hlgbFactionV2){const w=function(){const r=oldHub.apply(this,arguments);setTimeout(decorateHubButtons,80);return r};w.__hlgbFactionV2=true;w.__original=oldHub;window.renderHubFinance=w}

/* Assistente: respostas de corte enxutas e grade somente em PDF/impressão. */
function localDate(n=0){const d=new Date();d.setDate(d.getDate()+n);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')}
function cutDate(c){return String(c?.plannedCutDate||c?.cutDate||c?.scheduledDate||c?.date||c?.createdAt||'').slice(0,10)}
function cutProductId(c){if(c?.productId)return sid(c.productId);const o=orderOf(c?.orderId),ids=[...new Set((o?.grade||[]).map(g=>sid(g.productId)).filter(Boolean))];return ids.length===1?ids[0]:''}
function cutQty(c){return q(c?.pieces)|| (c?.originalGrade||c?.actualCutGrade||[]).reduce((a,x)=>a+q(x.qty),0)}
function cutUnit(c,pid){const o=orderOf(c?.orderId),p=productOf(pid);let u=0;try{if(o?.clientId&&pid&&typeof suggestedPrice==='function')u=q(suggestedPrice(o.clientId,pid))}catch(e){}return u||q(p?.price)}
function cutsForRaw(raw){
 const n=norm(raw);if(!/(\bcorte\b|\bcortes\b|\bcortar\b)/.test(n)||/grade/.test(n))return null;
 let target='',label='pendentes';if(/amanha/.test(n)){target=localDate(1);label='amanhã'}else if(/hoje/.test(n)){target=localDate(0);label='hoje'}
 const active=arr('cuts').filter(c=>{const st=norm(c?.status);if(st.includes('finalizado')||st.includes('cancelado'))return false;return !target||cutDate(c)===target});
 const groups={};
 for(const c of active){const pid=cutProductId(c),p=productOf(pid),name=p?.name||c?.product||'Produto',key=pid||norm(name),qty=cutQty(c),unit=cutUnit(c,pid),g=groups[key]||(groups[key]={name,qty:0,value:0});g.qty+=qty;g.value+=qty*unit}
 const rows=Object.values(groups).sort((a,b)=>b.qty-a.qty||a.name.localeCompare(b.name,'pt-BR')),qty=rows.reduce((a,x)=>a+x.qty,0),value=rows.reduce((a,x)=>a+x.value,0);
 return {title:'Cortes para '+label,text:rows.length?rows.map(x=>'• <b>'+escSafe(x.name)+'</b> — '+x.qty.toLocaleString('pt-BR')+' peças — '+moneySafe(x.value)).join('<br>')+'<br><br><b>Total: '+qty.toLocaleString('pt-BR')+' peças — '+moneySafe(value)+'</b>':'Não encontrei cortes '+label+'.'};
}
function gradeRequest(raw){
 const n=norm(raw);if(!/grade/.test(n))return null;
 const m=String(raw).match(/pedido\s*#?\s*(\d+)/i);let orders=[];
 if(m){const o=arr('orders').find(x=>sid(orderNo(x))===sid(m[1])||sid(x.id)===sid(m[1]));if(o)orders=[o]}
 else if(/amanha/.test(n)||/hoje/.test(n)){const d=/amanha/.test(n)?localDate(1):localDate(0),ids=[...new Set(arr('cuts').filter(c=>cutDate(c)===d&&!norm(c.status).includes('finalizado')).map(c=>sid(c.orderId)))];orders=ids.map(orderOf).filter(Boolean)}
 if(!orders.length){const client=arr('clients').filter(c=>c?.name&&n.includes(norm(c.name))).sort((a,b)=>String(b.name).length-String(a.name).length)[0];if(client)orders=arr('orders').filter(o=>norm(o.client)===norm(client.name)).slice(-5)}
 if(!orders.length)return {title:'Grade em PDF',text:'Não consegui identificar com segurança qual pedido deve gerar a grade.'};
 window.__hlgbGradePdfOrders=orders.map(o=>sid(o.id));
 return {title:'Grade em PDF',text:'A grade não será mostrada na conversa para não poluir a tela.<br><br><button type="button" class="primary" onclick="hlgbAssistantGradePdf()">📄 Gerar grade em PDF / imprimir</button>'};
}
window.hlgbAssistantGradePdf=function(){
 const orders=(window.__hlgbGradePdfOrders||[]).map(orderOf).filter(Boolean);if(!orders.length)return alert('Nenhuma grade selecionada.');
 const blocks=orders.map(o=>{const by={};for(const g of (o.grade||[])){const k=sid(g.productId);(by[k]=by[k]||[]).push(g)}return '<section><h2>Pedido #'+escSafe(orderNo(o))+' — '+escSafe(o.client||'-')+'</h2>'+Object.entries(by).map(([pid,rows])=>'<h3>'+escSafe(productOf(pid)?.name||'Produto')+'</h3>'+matrix(rows)).join('')+'</section>'}).join('');
 const w=window.open('','_blank');if(!w)return alert('Permita pop-ups para gerar a grade.');
 w.document.write('<!doctype html><html><head><meta charset="utf-8"><title>Grade HLGB</title><style>body{font-family:Arial;padding:24px;color:#222}table{width:100%;border-collapse:collapse;margin:10px 0 22px}th,td{border:1px solid #aaa;padding:7px;text-align:center}th:first-child,td:first-child{text-align:left}section{page-break-inside:avoid;margin-bottom:28px}</style></head><body><h1>HLGB Confecções — Grade</h1>'+blocks+'<p style="font-size:12px;color:#666">Na janela de impressão, escolha “Salvar como PDF” para baixar e encaminhar.</p><script>setTimeout(()=>window.print(),200)<\/script></body></html>');w.document.close();
};
function ensureImportButton(){
 const input=document.getElementById('hlgbAssistantInput');if(!input||document.getElementById('hlgbAssistantImportBtn'))return;
 const api=window.hlgbAssistantOrderImport;if(!api?.openImporter)return;
 const b=document.createElement('button');b.id='hlgbAssistantImportBtn';b.type='button';b.className='secondary';b.textContent='📥 Importar WhatsApp / PDF / Excel';b.onclick=()=>api.openImporter();
 const controls=document.getElementById('hlgbAssistantVoiceControls');(controls||input.parentElement)?.insertAdjacentElement('afterend',b);
}
function assistantDirect(raw){return gradeRequest(raw)||cutsForRaw(raw)||null}
function boot(){decorateSeparation();cleanProductTable();renderStockV2();decorateHubButtons();ensureImportButton()}
setTimeout(boot,2200);setInterval(()=>{ensureImportButton();decorateHubButtons()},1800);
try{if(typeof hlgbAfterLogin==='function')hlgbAfterLogin(()=>setTimeout(boot,1000),0)}catch(e){}
window.hlgbOperationalPolish={matrix,decorateSeparation,renderStockV2,stockUnitValue,activeFactionNames,cutsForRaw,gradeRequest,assistantDirect,ensureImportButton,cleanProductTable,renderHubFactionDetail};
window.HLGB_OPERATIONAL_POLISH_GUARD=V;
console.info('[HLGB] pacote operacional v2 ativo');
})();