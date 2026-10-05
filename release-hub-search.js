/* HLGB v92.79 — pesquisa leve do Hub Financeiro: filtros sob demanda e DOM limitado */
(function(){
'use strict';
const V='92.79';
const MAX_RESULTS=400;
const MAX_NAMES=180;
const state={query:'',start:'',end:'',flow:'',status:'',showAll:false};
let renderTimer=null,namesBuilt=false;
const sid=v=>String(v??'');
const norm=v=>sid(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\s+/g,' ').trim();
const esc=v=>sid(v).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const amount=v=>Math.max(0,Number(v)||0);
function dbRef(){try{if(typeof db!=='undefined'&&db)return db}catch(e){}try{if(window.db)return window.db}catch(e){}return null}
function rows(){try{const d=dbRef();return Array.isArray(d?.hubFinanceEntries)?d.hubFinanceEntries:[]}catch(e){return []}}
const moneySafe=v=>{try{return typeof window.money==='function'?window.money(v):Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}catch(e){return 'R$ '+Number(v||0).toFixed(2).replace('.',',')}};
const dateSafe=v=>{try{return typeof window.fmtDate==='function'?window.fmtDate(v):sid(v)}catch(e){return sid(v)}};
function searchableText(e){return norm([e?.description,e?.person,e?.origin,e?.category,e?.subcategory,e?.note,e?.method,Array.isArray(e?.acceptedMethods)?e.acceptedMethods.join(' '):''].filter(Boolean).join(' '))}
function filterRows(list,filter=state){
 const q=norm(filter.query),start=sid(filter.start).slice(0,10),end=sid(filter.end).slice(0,10),flow=sid(filter.flow),status=sid(filter.status);
 return (Array.isArray(list)?list:[]).filter(e=>{const d=sid(e?.date).slice(0,10);if(q&&!searchableText(e).includes(q))return false;if(start&&(!d||d<start))return false;if(end&&(!d||d>end))return false;if(flow&&sid(e?.flow)!==flow)return false;if(status&&sid(e?.status||'Previsto')!==status)return false;return true}).sort((a,b)=>sid(b?.date).localeCompare(sid(a?.date))||sid(b?.updatedAt||b?.createdAt).localeCompare(sid(a?.updatedAt||a?.createdAt)));
}
function totals(list){let entries=0,exits=0;for(const e of list||[]){const v=amount(e?.value);if(sid(e?.flow)==='Entrada')entries+=v;else if(sid(e?.flow)==='Saída')exits+=v}return {count:(list||[]).length,entries,exits,balance:entries-exits}}
function ensurePanel(){
 const page=document.getElementById('hubFinanceiro');if(!page)return null;
 let panel=document.getElementById('hubSearchPanel9248');if(panel)return panel;
 panel=document.createElement('div');panel.id='hubSearchPanel9248';panel.className='panel';
 panel.innerHTML='<h2>🔎 Pesquisar lançamentos por nome e período</h2><div class="sub">Os dados só são processados quando você usa os filtros, para manter o Hub leve.</div><div class="toolbar" style="align-items:flex-end;flex-wrap:wrap;margin-top:10px"><div class="field" style="min-width:240px;flex:1"><label>Nome / descrição</label><input id="hubSearchName9248" list="hubSearchNames9248" placeholder="Ex.: fornecedor, pessoa ou descrição"><datalist id="hubSearchNames9248"></datalist></div><div class="field"><label>De</label><input id="hubSearchStart9248" type="date"></div><div class="field"><label>Até</label><input id="hubSearchEnd9248" type="date"></div><div class="field"><label>Tipo</label><select id="hubSearchFlow9248"><option value="">Todos</option><option>Entrada</option><option>Saída</option></select></div><div class="field"><label>Status</label><select id="hubSearchStatus9248"><option value="">Todos</option><option>Previsto</option><option>Realizado</option></select></div><label style="display:flex;gap:8px;align-items:center;padding:9px 10px;border:1px solid #ddd;border-radius:10px"><input id="hubSearchShowAll9248" type="checkbox"> Mostrar período inteiro</label><button type="button" class="secondary" id="hubSearchClear9248">Limpar</button></div><div id="hubSearchCards9248" class="cards" style="margin-top:10px"></div><div id="hubSearchRange9248" class="sub"></div><div id="hubSearchResults9248" style="margin-top:10px"></div>';
 const weekly=document.getElementById('hubFinanceEntriesTable')?.closest?.('.panel');if(weekly?.parentNode)weekly.parentNode.insertBefore(panel,weekly);else page.appendChild(panel);
 bindPanel(panel);return panel;
}
function readUi(){state.query=document.getElementById('hubSearchName9248')?.value||'';state.start=document.getElementById('hubSearchStart9248')?.value||'';state.end=document.getElementById('hubSearchEnd9248')?.value||'';state.flow=document.getElementById('hubSearchFlow9248')?.value||'';state.status=document.getElementById('hubSearchStatus9248')?.value||'';state.showAll=!!document.getElementById('hubSearchShowAll9248')?.checked}
function scheduleRender(){clearTimeout(renderTimer);renderTimer=setTimeout(()=>{readUi();render()},160)}
function buildNames(){
 if(namesBuilt)return;const dl=document.getElementById('hubSearchNames9248');if(!dl)return;const seen=new Set(),out=[];
 for(const e of rows()){for(const v of [e?.person,e?.origin,e?.supplier,e?.client]){const x=sid(v).trim(),k=norm(x);if(!x||!k||seen.has(k))continue;seen.add(k);out.push(x);if(out.length>=MAX_NAMES)break}if(out.length>=MAX_NAMES)break}
 out.sort((a,b)=>a.localeCompare(b,'pt-BR'));dl.innerHTML=out.map(x=>'<option value="'+esc(x)+'"></option>').join('');namesBuilt=true;
}
function bindPanel(panel){
 if(panel.dataset.light9279)return;panel.dataset.light9279='1';
 const ids=['hubSearchStart9248','hubSearchEnd9248','hubSearchFlow9248','hubSearchStatus9248','hubSearchShowAll9248'];for(const id of ids){const el=document.getElementById(id);if(el)el.addEventListener('change',scheduleRender)}
 const q=document.getElementById('hubSearchName9248');if(q){q.addEventListener('input',scheduleRender);q.addEventListener('focus',buildNames,{once:true})}
 const clear=document.getElementById('hubSearchClear9248');if(clear)clear.onclick=()=>window.hlgbHubSearchClear9248();
 const results=document.getElementById('hubSearchResults9248');if(results)results.addEventListener('click',async ev=>{const b=ev.target?.closest?.('button[data-hub-search-action]');if(!b)return;ev.preventDefault();const id=sid(b.dataset.hubId),kind=b.dataset.hubSearchAction;if(kind==='edit'){const fn=window.hlgbHubEditor9275?.open||window.hlgbHubEditor9270?.open||window.editHubFinanceEntry;if(typeof fn==='function')await fn(id)}else if(kind==='toggle'&&typeof window.toggleHubFinanceEntry==='function')await window.toggleHubFinanceEntry(id)},false);
}
function syncUi(){const set=(id,v)=>{const el=document.getElementById(id);if(el&&el.value!==v)el.value=v};set('hubSearchName9248',state.query);set('hubSearchStart9248',state.start);set('hubSearchEnd9248',state.end);set('hubSearchFlow9248',state.flow);set('hubSearchStatus9248',state.status);const all=document.getElementById('hubSearchShowAll9248');if(all)all.checked=!!state.showAll}
function actionHtml(e){const id=sid(e?.id??e?.__hlgbId),real=sid(e?.status)==='Realizado';if(!id)return '<span class="sub">Sem ação disponível</span>';return '<button type="button" class="secondary" data-hub-search-action="edit" data-hub-id="'+esc(id)+'">Editar</button> <button type="button" class="primary" data-hub-search-action="toggle" data-hub-id="'+esc(id)+'">'+(real?'Reabrir':'✓ Realizado')+'</button>'}
function render(){
 const panel=ensurePanel();if(!panel)return;bindPanel(panel);syncUi();
 const hasExplicit=!!(norm(state.query)||state.start||state.end||state.flow||state.status||state.showAll);const all=hasExplicit?filterRows(rows(),state):[],t=totals(all),shown=all.slice(0,MAX_RESULTS);
 const cards=document.getElementById('hubSearchCards9248');if(cards)cards.innerHTML='<div class="card"><small>Encontrados</small><strong>'+t.count.toLocaleString('pt-BR')+'</strong></div><div class="card"><small>Entradas</small><strong>'+moneySafe(t.entries)+'</strong></div><div class="card"><small>Saídas</small><strong>'+moneySafe(t.exits)+'</strong></div><div class="card"><small>Saldo do filtro</small><strong>'+moneySafe(t.balance)+'</strong></div>';
 const range=document.getElementById('hubSearchRange9248');if(range){const bits=[];if(state.query)bits.push('Busca: “'+esc(state.query)+'”');if(state.start)bits.push('de '+dateSafe(state.start));if(state.end)bits.push('até '+dateSafe(state.end));if(state.flow)bits.push(state.flow);if(state.status)bits.push(state.status);if(all.length>MAX_RESULTS)bits.push('mostrando '+MAX_RESULTS+' de '+all.length+' — refine o filtro');range.innerHTML=bits.length?bits.join(' · '):(state.showAll?'Mostrando o período selecionado.':'Informe um filtro. A lista completa não é montada automaticamente.')}
 const box=document.getElementById('hubSearchResults9248');if(!box)return;if(!hasExplicit){box.innerHTML='<div class="empty">Use os filtros acima para pesquisar.</div>';return}if(!shown.length){box.innerHTML='<div class="empty">Nenhum lançamento encontrado.</div>';return}
 const body=shown.map(e=>{const payment=sid(e?.flow)==='Entrada'?(e?.method||'-'):(Array.isArray(e?.acceptedMethods)&&e.acceptedMethods.length?e.acceptedMethods.join(' / '):'-');return '<tr><td>'+esc(dateSafe(e?.date))+'</td><td><span class="badge '+(sid(e?.flow)==='Entrada'?'ok':'warn')+'">'+esc(e?.flow||'-')+'</span></td><td><b>'+esc(e?.description||'-')+'</b></td><td>'+esc(e?.person||e?.origin||'-')+'</td><td>'+esc(e?.category||'-')+'</td><td>'+moneySafe(amount(e?.value))+'</td><td>'+esc(payment)+'</td><td><span class="badge '+(sid(e?.status)==='Realizado'?'ok':'')+'">'+esc(e?.status||'Previsto')+'</span></td><td>'+actionHtml(e)+'</td></tr>'}).join('');
 box.innerHTML='<div style="overflow:auto"><table><thead><tr><th>Data</th><th>Tipo</th><th>Descrição</th><th>Pessoa / origem</th><th>Categoria</th><th>Valor</th><th>Pagamento</th><th>Status</th><th>Ações</th></tr></thead><tbody>'+body+'</tbody></table></div>';
}
window.hlgbHubSearchApply9248=function(){readUi();render()};
window.hlgbHubSearchClear9248=function(){state.query='';state.start='';state.end='';state.flow='';state.status='';state.showAll=false;render()};
window.hlgbHubSearchFilterRows=filterRows;window.hlgbHubSearchTotals=totals;window.hlgbHubSearchState=state;window.hlgbRenderHubSearch9248=render;
function boot(){try{ensurePanel();render()}catch(e){console.warn('[HLGB Hub Search '+V+']',e)}}
setTimeout(boot,900);try{if(typeof hlgbAfterLogin==='function')hlgbAfterLogin(()=>setTimeout(boot,650),0)}catch(e){}
window.HLGB_HUB_SEARCH_GUARD=V;console.info('[HLGB] pesquisa do Hub v'+V+' ativa — processamento sob demanda');
})();
