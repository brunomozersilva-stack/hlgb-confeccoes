/* HLGB — visão financeira semanal, mensal e anual */
(function(){
'use strict';
const V='2026.10.01-hub-period-summary-v2';
const sid=v=>String(v??'');
const q=v=>Math.max(0,Number(v)||0);
const escSafe=v=>typeof esc==='function'?esc(v):sid(v).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const moneySafe=v=>typeof money==='function'?money(v):Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
function rows(){try{return Array.isArray(db?.hubFinanceEntries)?db.hubFinanceEntries:[]}catch(e){return []}}
function today(){return new Date().toISOString().slice(0,10)}
function isoWeek(iso){
  const d=new Date((iso||today())+'T12:00:00'),tmp=new Date(d);tmp.setHours(0,0,0,0);tmp.setDate(tmp.getDate()+3-((tmp.getDay()+6)%7));
  const w1=new Date(tmp.getFullYear(),0,4),wk=1+Math.round(((tmp-w1)/86400000-3+((w1.getDay()+6)%7))/7);
  return tmp.getFullYear()+'-W'+String(wk).padStart(2,'0');
}
function weekRange(v){
  const m=String(v||'').match(/^(\d{4})-W(\d{2})$/);if(!m)return null;
  const y=+m[1],w=+m[2],jan4=new Date(y,0,4,12),day=jan4.getDay()||7,mon=new Date(jan4);mon.setDate(jan4.getDate()-day+1+(w-1)*7);
  const sun=new Date(mon);sun.setDate(mon.getDate()+6);
  return {start:mon.toISOString().slice(0,10),end:sun.toISOString().slice(0,10),label:'Semana '+w+'/'+y};
}
function monthRange(v){
  const m=String(v||'').match(/^(\d{4})-(\d{2})$/);if(!m)return null;
  const y=+m[1],mo=+m[2],last=new Date(y,mo,0).getDate();
  return {start:v+'-01',end:v+'-'+String(last).padStart(2,'0'),label:new Date(y,mo-1,1,12).toLocaleDateString('pt-BR',{month:'long',year:'numeric'})};
}
function yearRange(v){const y=String(v||'').match(/^\d{4}$/)?.[0];return y?{start:y+'-01-01',end:y+'-12-31',label:'Ano '+y}:null}
function selectedRange(){
  const mode=document.getElementById('hlgbHubPeriodMode')?.value||'month';
  if(mode==='week')return weekRange(document.getElementById('hlgbHubPeriodWeek')?.value);
  if(mode==='year')return yearRange(document.getElementById('hlgbHubPeriodYear')?.value);
  return monthRange(document.getElementById('hlgbHubPeriodMonth')?.value);
}
function rangeRows(range){
  if(!range)return [];
  return rows().filter(e=>e&&String(e.date||'').slice(0,10)>=range.start&&String(e.date||'').slice(0,10)<=range.end&&!String(e.kind||'').startsWith('hub_settings'));
}
function expenseRows(range){return rangeRows(range).filter(e=>e.flow==='Saída')}
function incomeRows(range){return rangeRows(range).filter(e=>e.flow==='Entrada')}
function detailLabel(e){
  const cat=String(e?.category||'');
  if(cat==='Gasto pessoal')return String(e.person||e.description||e.subcategory||e.origin||'Sem detalhe').trim()||'Sem detalhe';
  if(cat==='Matéria-prima')return String(e.description||e.subcategory||e.origin||e.person||'Sem detalhe').trim()||'Sem detalhe';
  return String(e.subcategory||e.description||e.person||e.origin||e.sourceType||'Sem detalhe').trim()||'Sem detalhe';
}
function detailGroups(list,category){
  const groups={};
  for(const e of list.filter(x=>String(x.category||'Sem categoria')===category)){
    const label=detailLabel(e),v=q(e.value),g=groups[label]||(groups[label]={label,total:0,realized:0,pending:0,count:0});
    g.total+=v;g.count++;if(String(e.status||'Previsto')==='Realizado')g.realized+=v;else g.pending+=v;
  }
  return Object.values(groups).sort((a,b)=>b.total-a.total||a.label.localeCompare(b.label,'pt-BR'));
}
function cashSummary(range){
  const all=rangeRows(range);let inTotal=0,outTotal=0,inReal=0,outReal=0;
  for(const e of all){const v=q(e.value),real=String(e.status||'Previsto')==='Realizado';if(e.flow==='Entrada'){inTotal+=v;if(real)inReal+=v}else if(e.flow==='Saída'){outTotal+=v;if(real)outReal+=v}}
  return {inTotal,outTotal,inReal,outReal,projected:inTotal-outTotal,realized:inReal-outReal};
}
function summarize(list){
  const groups={};let total=0,realized=0,pending=0;
  for(const e of list){const v=q(e.value),cat=String(e.category||'Sem categoria').trim()||'Sem categoria';total+=v;if(String(e.status||'Previsto')==='Realizado')realized+=v;else pending+=v;const g=groups[cat]||(groups[cat]={category:cat,total:0,realized:0,pending:0,count:0});g.total+=v;g.count++;if(String(e.status||'Previsto')==='Realizado')g.realized+=v;else g.pending+=v}
  return {total,realized,pending,count:list.length,categories:Object.values(groups).sort((a,b)=>b.total-a.total||a.category.localeCompare(b.category,'pt-BR'))};
}
function ensurePanel(){
  const page=document.getElementById('hubFinanceiro');if(!page)return null;
  let panel=document.getElementById('hlgbHubPeriodSummary');if(panel)return panel;
  panel=document.createElement('div');panel.id='hlgbHubPeriodSummary';panel.className='panel';
  const now=today(),month=now.slice(0,7),year=now.slice(0,4),week=isoWeek(now);
  panel.innerHTML='<h2>📊 Visão de despesas por período</h2><div class="sub">Veja matéria-prima, funcionários e qualquer outra categoria no curto ou longo prazo.</div>'+
    '<div class="toolbar" style="align-items:flex-end;flex-wrap:wrap;margin-top:10px">'+
    '<div class="field"><label>Visão</label><select id="hlgbHubPeriodMode" onchange="hlgbHubPeriodModeChange()"><option value="week">Semanal</option><option value="month" selected>Mensal</option><option value="year">Anual</option></select></div>'+
    '<div class="field" id="hlgbHubPeriodWeekWrap" style="display:none"><label>Semana</label><input id="hlgbHubPeriodWeek" type="week" value="'+week+'" onchange="hlgbHubPeriodRender()"></div>'+
    '<div class="field" id="hlgbHubPeriodMonthWrap"><label>Mês</label><input id="hlgbHubPeriodMonth" type="month" value="'+month+'" onchange="hlgbHubPeriodRender()"></div>'+
    '<div class="field" id="hlgbHubPeriodYearWrap" style="display:none"><label>Ano</label><input id="hlgbHubPeriodYear" type="number" min="2020" max="2100" value="'+year+'" onchange="hlgbHubPeriodRender()"></div>'+
    '</div><div id="hlgbHubPeriodLabel" class="sub"></div><div id="hlgbHubPeriodCards" class="cards" style="margin-top:10px"></div><div id="hlgbHubPeriodPie" style="margin-top:14px"></div><div id="hlgbHubPeriodTable" style="margin-top:10px"></div><div id="hlgbHubPeriodDetail" style="margin-top:14px"></div>';
  const search=document.getElementById('hubSearchPanel9248');if(search?.parentNode)search.parentNode.insertBefore(panel,search.nextSibling);else page.appendChild(panel);
  return panel;
}
function modeChange(){
  const mode=document.getElementById('hlgbHubPeriodMode')?.value||'month';
  const show=(id,on)=>{const e=document.getElementById(id);if(e)e.style.display=on?'':'none'};
  show('hlgbHubPeriodWeekWrap',mode==='week');show('hlgbHubPeriodMonthWrap',mode==='month');show('hlgbHubPeriodYearWrap',mode==='year');render();
}
function render(){
  if(!ensurePanel())return;
  const range=selectedRange(),list=expenseRows(range),s=summarize(list),cash=cashSummary(range);
  const label=document.getElementById('hlgbHubPeriodLabel');if(label)label.textContent=range?range.label+' · '+range.start+' até '+range.end:'Selecione um período válido.';
  const cards=document.getElementById('hlgbHubPeriodCards');
  if(cards)cards.innerHTML=
    '<div class="card"><small>Total de despesas</small><strong>'+moneySafe(s.total)+'</strong></div>'+
    '<div class="card"><small>Entradas</small><strong>'+moneySafe(cash.inTotal)+'</strong></div>'+
    '<div class="card"><small>Resultado realizado</small><strong>'+(cash.realized>=0?'+ ':'- ')+moneySafe(Math.abs(cash.realized))+'</strong><div class="sub">'+(cash.realized>=0?'Lucro/sobra':'Déficit')+'</div></div>'+
    '<div class="card"><small>Resultado previsto</small><strong>'+(cash.projected>=0?'+ ':'- ')+moneySafe(Math.abs(cash.projected))+'</strong><div class="sub">'+(cash.projected>=0?'Lucro/sobra':'Déficit')+'</div></div>'+
    '<div class="card"><small>Lançamentos de saída</small><strong>'+s.count.toLocaleString('pt-BR')+'</strong></div>'+
    '<div class="card"><small>Categorias</small><strong>'+s.categories.length.toLocaleString('pt-BR')+'</strong></div>';
  const pie=document.getElementById('hlgbHubPeriodPie');
  if(pie){
    if(!s.total)pie.innerHTML='';
    else{
      let acc=0;const stops=[];
      s.categories.forEach((g,i)=>{const pct=g.total/s.total*100,start=acc,end=acc+pct,shade='hsl('+(i*47%360)+' 65% 55%)';stops.push(shade+' '+start.toFixed(2)+'% '+end.toFixed(2)+'%');g.pct=pct;g.shade=shade;acc=end});
      pie.innerHTML='<div class="panel" style="background:#fff"><h3 style="margin-top:0">Distribuição das despesas</h3><div style="display:flex;gap:24px;align-items:center;flex-wrap:wrap"><div style="width:220px;height:220px;border-radius:50%;background:conic-gradient('+stops.join(',')+');box-shadow:inset 0 0 0 1px #0001"></div><div style="min-width:280px;flex:1">'+s.categories.map(g=>'<div style="display:flex;justify-content:space-between;gap:12px;margin:5px 0"><span><i style="display:inline-block;width:12px;height:12px;border-radius:3px;background:'+g.shade+';margin-right:6px"></i>'+escSafe(g.category)+'</span><b>'+g.pct.toLocaleString('pt-BR',{maximumFractionDigits:1})+'% · '+moneySafe(g.total)+'</b></div>').join('')+'</div></div></div>';
    }
  }
  const box=document.getElementById('hlgbHubPeriodTable');if(!box)return;
  if(!s.categories.length){box.innerHTML='<div class="empty">Nenhuma despesa encontrada nesse período.</div>';document.getElementById('hlgbHubPeriodDetail').innerHTML='';return}
  const body=s.categories.map(g=>'<tr><td><button type="button" class="linklike hlgbHubCatBtn" data-cat="'+escSafe(g.category)+'"><b>'+escSafe(g.category)+'</b></button></td><td>'+g.count.toLocaleString('pt-BR')+'</td><td>'+moneySafe(g.realized)+'</td><td>'+moneySafe(g.pending)+'</td><td><b>'+moneySafe(g.total)+'</b></td><td>'+((g.total/s.total)*100).toLocaleString('pt-BR',{maximumFractionDigits:1})+'%</td></tr>').join('');
  box.innerHTML='<div style="overflow:auto"><table><thead><tr><th>Categoria</th><th>Lançamentos</th><th>Realizado</th><th>Previsto</th><th>Total</th><th>% das despesas</th></tr></thead><tbody>'+body+'</tbody></table></div><div class="sub">Clique em uma categoria para ver onde o dinheiro foi gasto.</div>';
  box.querySelectorAll('.hlgbHubCatBtn').forEach(b=>b.onclick=()=>renderDetail(b.dataset.cat,range,list,s.total));
}
function renderDetail(category,range,list,totalExpenses){
  const detail=document.getElementById('hlgbHubPeriodDetail');if(!detail)return;
  const groups=detailGroups(list,category),catTotal=groups.reduce((a,g)=>a+g.total,0);
  if(!groups.length){detail.innerHTML='';return}
  const rowsHtml=groups.map((g,i)=>'<tr><td>'+(i+1)+'</td><td><b>'+escSafe(g.label)+'</b></td><td>'+g.count+'</td><td>'+moneySafe(g.realized)+'</td><td>'+moneySafe(g.pending)+'</td><td><b>'+moneySafe(g.total)+'</b></td><td>'+((g.total/catTotal)*100).toLocaleString('pt-BR',{maximumFractionDigits:1})+'%</td></tr>').join('');
  detail.innerHTML='<div class="panel" style="background:#fff8fb"><h3 style="margin-top:0">Onde foi gasto — '+escSafe(category)+'</h3><div class="sub">Do maior para o menor no período selecionado. Esta categoria representa '+((catTotal/Math.max(1,totalExpenses))*100).toLocaleString('pt-BR',{maximumFractionDigits:1})+'% das despesas.</div><div style="overflow:auto;margin-top:10px"><table><thead><tr><th>#</th><th>Subcategoria / destino</th><th>Lançamentos</th><th>Realizado</th><th>Previsto</th><th>Total</th><th>% da categoria</th></tr></thead><tbody>'+rowsHtml+'</tbody></table></div></div>';
}
window.hlgbHubPeriodModeChange=modeChange;window.hlgbHubPeriodRender=render;
window.hlgbHubPeriodSummary={weekRange,monthRange,yearRange,rangeRows,expenseRows,incomeRows,summarize,detailLabel,detailGroups,cashSummary,render,renderDetail};
const old=window.renderHubFinance;if(typeof old==='function'&&!old.__hlgbPeriodSummaryV2){const w=function(){const r=old.apply(this,arguments);setTimeout(render,0);return r};w.__hlgbPeriodSummaryV1=true;w.__original=old;window.renderHubFinance=w}
function boot(){try{ensurePanel();modeChange()}catch(e){console.warn('[HLGB hub period]',e)}}
try{if(typeof hlgbAfterLogin==='function')hlgbAfterLogin(()=>setTimeout(boot,800),0)}catch(e){}
setTimeout(boot,1400);
window.HLGB_HUB_PERIOD_SUMMARY_GUARD=V;
console.info('[HLGB] visão financeira por período v2 com detalhamento e pizza ativa');
})();