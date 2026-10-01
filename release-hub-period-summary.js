/* HLGB — visão financeira semanal, mensal e anual */
(function(){
'use strict';
const V='2026.10.01-hub-period-summary-v1';
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
function expenseRows(range){
  if(!range)return [];
  return rows().filter(e=>e&&e.flow==='Saída'&&String(e.date||'').slice(0,10)>=range.start&&String(e.date||'').slice(0,10)<=range.end&&!String(e.kind||'').startsWith('hub_settings'));
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
    '</div><div id="hlgbHubPeriodLabel" class="sub"></div><div id="hlgbHubPeriodCards" class="cards" style="margin-top:10px"></div><div id="hlgbHubPeriodTable" style="margin-top:10px"></div>';
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
  const range=selectedRange(),list=expenseRows(range),s=summarize(list);
  const label=document.getElementById('hlgbHubPeriodLabel');if(label)label.textContent=range?range.label+' · '+range.start+' até '+range.end:'Selecione um período válido.';
  const cards=document.getElementById('hlgbHubPeriodCards');
  if(cards)cards.innerHTML='<div class="card"><small>Total de despesas</small><strong>'+moneySafe(s.total)+'</strong></div><div class="card"><small>Realizado</small><strong>'+moneySafe(s.realized)+'</strong></div><div class="card"><small>Previsto / pendente</small><strong>'+moneySafe(s.pending)+'</strong></div><div class="card"><small>Lançamentos</small><strong>'+s.count.toLocaleString('pt-BR')+'</strong></div><div class="card"><small>Categorias</small><strong>'+s.categories.length.toLocaleString('pt-BR')+'</strong></div>';
  const box=document.getElementById('hlgbHubPeriodTable');if(!box)return;
  if(!s.categories.length){box.innerHTML='<div class="empty">Nenhuma despesa encontrada nesse período.</div>';return}
  const body=s.categories.map(g=>'<tr><td><b>'+escSafe(g.category)+'</b></td><td>'+g.count.toLocaleString('pt-BR')+'</td><td>'+moneySafe(g.realized)+'</td><td>'+moneySafe(g.pending)+'</td><td><b>'+moneySafe(g.total)+'</b></td></tr>').join('');
  box.innerHTML='<div style="overflow:auto"><table><thead><tr><th>Categoria</th><th>Lançamentos</th><th>Realizado</th><th>Previsto</th><th>Total</th></tr></thead><tbody>'+body+'</tbody></table></div>';
}
window.hlgbHubPeriodModeChange=modeChange;window.hlgbHubPeriodRender=render;
window.hlgbHubPeriodSummary={weekRange,monthRange,yearRange,expenseRows,summarize,render};
const old=window.renderHubFinance;if(typeof old==='function'&&!old.__hlgbPeriodSummaryV1){const w=function(){const r=old.apply(this,arguments);setTimeout(render,0);return r};w.__hlgbPeriodSummaryV1=true;w.__original=old;window.renderHubFinance=w}
function boot(){try{ensurePanel();modeChange()}catch(e){console.warn('[HLGB hub period]',e)}}
try{if(typeof hlgbAfterLogin==='function')hlgbAfterLogin(()=>setTimeout(boot,800),0)}catch(e){}
setTimeout(boot,1400);
window.HLGB_HUB_PERIOD_SUMMARY_GUARD=V;
console.info('[HLGB] visão financeira por período ativa');
})();