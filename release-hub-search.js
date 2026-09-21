/* HLGB audit — pesquisa do Hub Financeiro por nome e período, com edição segura */
(function(){
'use strict';
const V='v1';
const state={query:'',start:'',end:'',flow:'',status:''};

const sid=v=>String(v??'');
const norm=v=>sid(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\s+/g,' ').trim();
const escHtml=v=>sid(v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
const amount=v=>Math.max(0,Number(v)||0);
const rows=()=>{try{return Array.isArray(db?.hubFinanceEntries)?db.hubFinanceEntries:[]}catch(e){return []}};
const fmtMoney=v=>{try{return typeof money==='function'?money(v):Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}catch(e){return 'R$ '+Number(v||0).toFixed(2).replace('.',',')}};
const fmtDateSafe=v=>{try{return typeof fmtDate==='function'?fmtDate(v):sid(v)}catch(e){return sid(v)}};

function searchableText(e){
  return norm([
    e?.description,e?.person,e?.origin,e?.category,e?.subcategory,e?.note,
    e?.method,Array.isArray(e?.acceptedMethods)?e.acceptedMethods.join(' '):''
  ].filter(Boolean).join(' '));
}
function filterRows(list,filter=state){
  const q=norm(filter.query),start=sid(filter.start).slice(0,10),end=sid(filter.end).slice(0,10),flow=sid(filter.flow),status=sid(filter.status);
  return (Array.isArray(list)?list:[]).filter(e=>{
    const d=sid(e?.date).slice(0,10);
    if(q&&!searchableText(e).includes(q))return false;
    if(start&&(!d||d<start))return false;
    if(end&&(!d||d>end))return false;
    if(flow&&sid(e?.flow)!==flow)return false;
    if(status&&sid(e?.status||'Previsto')!==status)return false;
    return true;
  }).slice().sort((a,b)=>sid(b?.date).localeCompare(sid(a?.date))||sid(b?.updatedAt||b?.createdAt).localeCompare(sid(a?.updatedAt||a?.createdAt)));
}
function totals(list){
  const arr=Array.isArray(list)?list:[];
  const entries=arr.filter(e=>sid(e?.flow)==='Entrada').reduce((s,e)=>s+amount(e?.value),0);
  const exits=arr.filter(e=>sid(e?.flow)==='Saída').reduce((s,e)=>s+amount(e?.value),0);
  return {count:arr.length,entries,exits,balance:entries-exits};
}
function readUi(){
  state.query=document.getElementById('hubSearchName9248')?.value||'';
  state.start=document.getElementById('hubSearchStart9248')?.value||'';
  state.end=document.getElementById('hubSearchEnd9248')?.value||'';
  state.flow=document.getElementById('hubSearchFlow9248')?.value||'';
  state.status=document.getElementById('hubSearchStatus9248')?.value||'';
}
function names(){
  const set=new Set();
  for(const e of rows()){
    for(const v of [e?.person,e?.origin,e?.description]){
      const x=sid(v).trim();if(x)set.add(x);
    }
  }
  return [...set].sort((a,b)=>a.localeCompare(b,'pt-BR'));
}
function ensurePanel(){
  const page=document.getElementById('hubFinanceiro');if(!page)return null;
  let panel=document.getElementById('hubSearchPanel9248');
  if(panel)return panel;
  const weekly=document.getElementById('hubFinanceEntriesTable')?.closest?.('.panel');
  panel=document.createElement('div');
  panel.id='hubSearchPanel9248';
  panel.className='panel';
  panel.innerHTML=`
    <h2>🔎 Pesquisar lançamentos por nome e período</h2>
    <div class="sub">Pesquise fornecedor, pessoa, origem ou descrição em qualquer período. Os lançamentos encontrados continuam com edição normal.</div>
    <div class="toolbar" style="align-items:flex-end;flex-wrap:wrap;margin-top:10px">
      <div class="field" style="min-width:240px;flex:1"><label>Nome / descrição</label><input id="hubSearchName9248" list="hubSearchNames9248" placeholder="Ex.: Messias, Use Bojos, fornecedor..." oninput="hlgbHubSearchApply9248()"><datalist id="hubSearchNames9248"></datalist></div>
      <div class="field"><label>De</label><input id="hubSearchStart9248" type="date" onchange="hlgbHubSearchApply9248()"></div>
      <div class="field"><label>Até</label><input id="hubSearchEnd9248" type="date" onchange="hlgbHubSearchApply9248()"></div>
      <div class="field"><label>Tipo</label><select id="hubSearchFlow9248" onchange="hlgbHubSearchApply9248()"><option value="">Todos</option><option>Entrada</option><option>Saída</option></select></div>
      <div class="field"><label>Status</label><select id="hubSearchStatus9248" onchange="hlgbHubSearchApply9248()"><option value="">Todos</option><option>Previsto</option><option>Realizado</option></select></div>
      <button type="button" class="secondary" onclick="hlgbHubSearchClear9248()">Limpar</button>
    </div>
    <div id="hubSearchCards9248" class="cards" style="margin-top:10px"></div>
    <div id="hubSearchRange9248" class="sub"></div>
    <div id="hubSearchResults9248" style="margin-top:10px"></div>`;
  if(weekly?.parentNode)weekly.parentNode.insertBefore(panel,weekly);
  else page.appendChild(panel);
  return panel;
}
function syncInputs(){
  const set=(id,v)=>{const el=document.getElementById(id);if(el&&el.value!==v)el.value=v};
  set('hubSearchName9248',state.query);set('hubSearchStart9248',state.start);set('hubSearchEnd9248',state.end);set('hubSearchFlow9248',state.flow);set('hubSearchStatus9248',state.status);
  const dl=document.getElementById('hubSearchNames9248');if(dl)dl.innerHTML=names().map(x=>'<option value="'+escHtml(x)+'"></option>').join('');
}
function actions(e){
  const id=Number(e?.id);
  if(!Number.isFinite(id))return '<span class="sub">Sem ação disponível</span>';
  const realized=sid(e?.status)==='Realizado';
  return '<button type="button" class="secondary" onclick="editHubFinanceEntry('+id+')">Editar</button> '+
    '<button type="button" class="primary" onclick="toggleHubFinanceEntry('+id+')">'+(realized?'Reabrir':'✓ Realizado')+'</button>';
}
function render(){
  if(!ensurePanel())return;
  syncInputs();
  const list=filterRows(rows(),state),t=totals(list);
  const cards=document.getElementById('hubSearchCards9248');
  if(cards)cards.innerHTML=
    '<div class="card"><small>Encontrados</small><strong>'+t.count.toLocaleString('pt-BR')+'</strong></div>'+
    '<div class="card"><small>Entradas</small><strong>'+fmtMoney(t.entries)+'</strong></div>'+
    '<div class="card"><small>Saídas</small><strong>'+fmtMoney(t.exits)+'</strong></div>'+
    '<div class="card"><small>Saldo do filtro</small><strong>'+fmtMoney(t.balance)+'</strong></div>';
  const range=document.getElementById('hubSearchRange9248');
  if(range){
    let bits=[];if(state.query)bits.push('Busca: “'+escHtml(state.query)+'”');if(state.start)bits.push('de '+fmtDateSafe(state.start));if(state.end)bits.push('até '+fmtDateSafe(state.end));if(state.flow)bits.push(state.flow);if(state.status)bits.push(state.status);
    range.innerHTML=bits.length?bits.join(' · '):'Sem filtros: mostrando todos os lançamentos do Hub.';
  }
  const box=document.getElementById('hubSearchResults9248');if(!box)return;
  if(!list.length){box.innerHTML='<div class="empty">Nenhum lançamento encontrado com esses filtros.</div>';return}
  const body=list.map(e=>{
    const payment=sid(e?.flow)==='Entrada'?(e?.method||'-'):(Array.isArray(e?.acceptedMethods)&&e.acceptedMethods.length?e.acceptedMethods.join(' / '):'-');
    return '<tr>'+
      '<td>'+escHtml(fmtDateSafe(e?.date))+'</td>'+
      '<td><span class="badge '+(sid(e?.flow)==='Entrada'?'ok':'warn')+'">'+escHtml(e?.flow||'-')+'</span></td>'+
      '<td><b>'+escHtml(e?.description||'-')+'</b>'+(e?.note?'<div class="sub">'+escHtml(e.note)+'</div>':'')+'</td>'+
      '<td>'+escHtml(e?.person||e?.origin||'-')+'</td>'+
      '<td>'+escHtml(e?.category||'-')+'</td>'+
      '<td>'+fmtMoney(amount(e?.value))+'</td>'+
      '<td>'+escHtml(payment)+'</td>'+
      '<td><span class="badge '+(sid(e?.status)==='Realizado'?'ok':'')+'">'+escHtml(e?.status||'Previsto')+'</span></td>'+
      '<td>'+actions(e)+'</td>'+
    '</tr>';
  }).join('');
  box.innerHTML='<div style="overflow:auto"><table><thead><tr><th>Data</th><th>Tipo</th><th>Descrição</th><th>Pessoa / origem</th><th>Categoria</th><th>Valor</th><th>Pagamento</th><th>Status</th><th>Ações</th></tr></thead><tbody>'+body+'</tbody></table></div>';
}

window.hlgbHubSearchApply9248=function(){readUi();render()};
window.hlgbHubSearchClear9248=function(){state.query='';state.start='';state.end='';state.flow='';state.status='';render()};
window.hlgbHubSearchFilterRows=filterRows;
window.hlgbHubSearchTotals=totals;
window.hlgbHubSearchState=state;
window.hlgbRenderHubSearch9248=render;

const oldRender=window.renderHubFinance;
if(typeof oldRender==='function'&&!oldRender.__hlgbHubSearchV1){
  const wrapped=function(){const out=oldRender.apply(this,arguments);try{render()}catch(e){console.warn('[HLGB hub search '+V+'] render',e)}return out};
  wrapped.__hlgbHubSearchV1=true;wrapped.__original=oldRender;window.renderHubFinance=wrapped;
}

function boot(){try{render()}catch(e){console.warn('[HLGB hub search '+V+'] boot',e)}}
try{if(typeof hlgbAfterLogin==='function')hlgbAfterLogin(()=>{setTimeout(boot,700);setTimeout(boot,1900)},0)}catch(e){}
setTimeout(boot,1100);

window.HLGB_HUB_SEARCH_GUARD=V;
console.info('[HLGB] pesquisa do Hub Financeiro '+V+' ativa');
})();