/* HLGB — Projeção semanal: visão simples para a equipe
   Mantém a visão administrativa existente e acrescenta um painel operacional visual. */
(function(){
'use strict';
const V='2026.09.30-projection-team-v1';
const STORE='hlgb_projection_team_view_v1';
let mode='team',quick='period';
const sid=v=>String(v??'');
const q=v=>Math.max(0,Number(v)||0);
const escSafe=v=>typeof esc==='function'?esc(v):String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const norm=v=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase();
function arr(n){try{return Array.isArray(db?.[n])?db[n]:[]}catch(e){return []}}
function today(){return new Date().toISOString().slice(0,10)}
function addDays(iso,n){const d=new Date(iso+'T12:00:00');d.setDate(d.getDate()+n);return d.toISOString().slice(0,10)}
function monday(iso){const d=new Date(iso+'T12:00:00'),day=d.getDay()||7;d.setDate(d.getDate()-day+1);return d.toISOString().slice(0,10)}
function dateLabel(iso){
  if(iso===today())return 'Hoje · '+(typeof fmtDate==='function'?fmtDate(iso):iso);
  if(iso===addDays(today(),1))return 'Amanhã · '+(typeof fmtDate==='function'?fmtDate(iso):iso);
  return typeof fmtDate==='function'?fmtDate(iso):iso;
}
function prodProgress(order,item){
  const pid=sid(item?.productId),key=sid(item?.key);
  let list=arr('production').filter(p=>sid(p?.orderId)===sid(order?.id));
  if(pid||key){
    const exact=list.filter(p=>(pid&&sid(p?.productId)===pid)||(key&&sid(p?.itemKey)===key)||(key&&sid(p?.projectionItemKey)===key));
    if(exact.length)list=exact;
  }
  if(!list.length)return {has:false,planned:q(item?.qty),done:0,pct:0};
  let planned=list.reduce((a,p)=>a+q(p?.planned||p?.qty),0),done=list.reduce((a,p)=>a+q(p?.done||p?.completedQty||p?.deliveredQty),0);
  if(planned<=0)planned=q(item?.qty);
  done=Math.min(planned||done,done);
  return {has:true,planned,done,pct:planned>0?Math.max(0,Math.min(100,Math.round(done/planned*100))):0};
}
function baseRows(){
  if(typeof allProjectionRows!=='function')return [];
  return allProjectionRows().filter(({order,item})=>item?.date&&typeof projectionDeliverableQty==='function'&&projectionDeliverableQty(order,item)>0).map(({order,item})=>{
    const qty=projectionDeliverableQty(order,item),value=typeof projectionDeliverableValue==='function'?projectionDeliverableValue(order,item):q(item?.value);
    const location=(typeof projectionProductionSplit==='function'?projectionProductionSplit(order.id,item.key):'')||(typeof projectionLocationForOrder==='function'?projectionLocationForOrder(order):'')||'Sem local';
    const progress=prodProgress(order,item);
    return {
      order,item,date:String(item.date).slice(0,10),client:item.clientName||order.client||'Sem cliente',
      product:item.name||'Produto',qty,value,location,priority:order.priority||'Padrão',status:item.invoiced?'Nota finalizada':(order.status||'Em produção'),
      number:typeof displayOrderNumber==='function'?displayOrderNumber(order):order.id,progress
    };
  });
}
function teamRows(){
  let rows=baseRows(),start=document.getElementById('projectionStart')?.value||'0000-01-01',end=document.getElementById('projectionEnd')?.value||'9999-12-31';
  const t=today();
  if(quick==='today')rows=rows.filter(r=>r.date===t);
  else if(quick==='tomorrow')rows=rows.filter(r=>r.date===addDays(t,1));
  else if(quick==='week'){const m=monday(t),z=addDays(m,6);rows=rows.filter(r=>r.date>=m&&r.date<=z)}
  else if(quick==='late')rows=rows.filter(r=>r.date<t);
  else rows=rows.filter(r=>r.date>=start&&r.date<=end);
  const search=norm(document.getElementById('hlgbProjectionTeamSearch')?.value||''),loc=document.getElementById('hlgbProjectionTeamLocation')?.value||'',priority=document.getElementById('hlgbProjectionTeamPriority')?.value||'';
  if(search)rows=rows.filter(r=>norm([r.client,r.product,r.number,r.location,r.status].join(' ')).includes(search));
  if(loc)rows=rows.filter(r=>r.location===loc);
  if(priority)rows=rows.filter(r=>r.priority===priority);
  return rows.sort((a,b)=>a.date.localeCompare(b.date)||String(a.client).localeCompare(String(b.client),'pt-BR'));
}
function injectStyles(){
  if(document.getElementById('hlgbProjectionTeamStyle'))return;
  const st=document.createElement('style');st.id='hlgbProjectionTeamStyle';
  st.textContent='.hlgb-proj-switch{display:flex;gap:8px;flex-wrap:wrap;margin:12px 0}.hlgb-team-groups{display:grid;gap:16px}.hlgb-team-day{background:#f8f8fa;border:1px solid #e6e3e7;border-radius:16px;padding:12px}.hlgb-team-day h3{margin:0 0 10px}.hlgb-team-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:10px}.hlgb-team-card{background:white;border:1px solid #e3dfe3;border-left:5px solid #77808d;border-radius:14px;padding:14px;box-shadow:0 2px 7px #0000000d}.hlgb-team-card.late{border-left-color:#b42318}.hlgb-team-card.ready{border-left-color:#248a3d}.hlgb-team-card.urgent{border-left-color:#d98400}.hlgb-team-client{font-size:18px;font-weight:850}.hlgb-team-product{font-size:15px;font-weight:700;margin-top:4px}.hlgb-team-line{display:flex;justify-content:space-between;gap:10px;margin-top:8px;align-items:center}.hlgb-team-progress{height:9px;background:#ececef;border-radius:8px;overflow:hidden;margin-top:6px}.hlgb-team-progress>i{display:block;height:100%;background:#556070;border-radius:8px}.hlgb-team-card.ready .hlgb-team-progress>i{background:#248a3d}.hlgb-team-card.late .hlgb-team-progress>i{background:#b42318}.hlgb-team-value{font-weight:850;font-size:16px}.hlgb-proj-admin-hidden{display:none!important}';
  document.head.appendChild(st);
}
function injectUI(){
  const page=document.getElementById('projecao');if(!page)return;
  injectStyles();
  if(!document.getElementById('hlgbProjectionViewSwitch')){
    const sub=page.querySelector(':scope > .sub');
    const sw=document.createElement('div');sw.id='hlgbProjectionViewSwitch';sw.className='hlgb-proj-switch';
    sw.innerHTML='<button id="hlgbProjTeamBtn" class="primary" onclick="hlgbProjectionSetView(\'team\')">👥 Visão da equipe</button><button id="hlgbProjAdminBtn" class="secondary" onclick="hlgbProjectionSetView(\'admin\')">📊 Visão administrativa</button>';
    sub?.insertAdjacentElement('afterend',sw);
  }
  if(!document.getElementById('hlgbProjectionTeamPanel')){
    const panels=[...page.querySelectorAll(':scope > .panel')],period=panels[0];
    const p=document.createElement('div');p.id='hlgbProjectionTeamPanel';p.className='panel';
    p.innerHTML='<div style="display:flex;justify-content:space-between;gap:12px;align-items:center;flex-wrap:wrap"><div><h2 style="margin:0">📦 Entregas da equipe</h2><div class="sub">O que precisa sair, para quem, quanto vale e onde está sendo produzido.</div></div><button class="secondary" onclick="renderProjection()">🔄 Atualizar</button></div><div id="hlgbProjectionTeamCards" class="cards"></div><div class="toolbar" style="align-items:flex-end;flex-wrap:wrap"><button id="hlgbTeamQuickPeriod" class="primary" onclick="hlgbProjectionQuick(\'period\')">Período acima</button><button id="hlgbTeamQuickToday" class="secondary" onclick="hlgbProjectionQuick(\'today\')">Hoje</button><button id="hlgbTeamQuickTomorrow" class="secondary" onclick="hlgbProjectionQuick(\'tomorrow\')">Amanhã</button><button id="hlgbTeamQuickWeek" class="secondary" onclick="hlgbProjectionQuick(\'week\')">Esta semana</button><button id="hlgbTeamQuickLate" class="secondary" onclick="hlgbProjectionQuick(\'late\')">🔴 Atrasados</button><div class="field"><label>Buscar</label><input id="hlgbProjectionTeamSearch" placeholder="Cliente, produto ou pedido" oninput="hlgbProjectionRenderTeam()"></div><div class="field"><label>Local / facção</label><select id="hlgbProjectionTeamLocation" onchange="hlgbProjectionRenderTeam()"><option value="">Todos</option></select></div><div class="field"><label>Urgência</label><select id="hlgbProjectionTeamPriority" onchange="hlgbProjectionRenderTeam()"><option value="">Todas</option><option>Padrão</option><option>Urgente</option><option>Urgentíssimo</option></select></div></div><div id="hlgbProjectionTeamBody"></div>';
    period?.insertAdjacentElement('afterend',p);
  }
}
function updateLocationFilter(rows){
  const el=document.getElementById('hlgbProjectionTeamLocation');if(!el)return;
  const cur=el.value,locs=[...new Set(rows.map(r=>r.location).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'pt-BR'));
  el.innerHTML='<option value="">Todos</option>'+locs.map(x=>'<option value="'+escSafe(x)+'">'+escSafe(x)+'</option>').join('');
  if(locs.includes(cur))el.value=cur;
}
function card(r){
  const t=today(),ready=r.progress.has&&r.progress.planned>0&&r.progress.done>=r.progress.planned,late=r.date<t&&!ready,urgent=/urgent/i.test(r.priority);
  const cls=ready?'ready':late?'late':urgent?'urgent':'';
  const progress=r.progress.has?('<div class="hlgb-team-line"><span>Produção</span><b>'+r.progress.done.toLocaleString('pt-BR')+' / '+r.progress.planned.toLocaleString('pt-BR')+' · '+r.progress.pct+'%</b></div><div class="hlgb-team-progress"><i style="width:'+r.progress.pct+'%"></i></div>'):'<div class="hlgb-team-line"><span>Produção</span><span class="badge">Sem apontamento</span></div>';
  const situation=ready?'Pronto':late?'Atrasado':r.status;
  return '<div class="hlgb-team-card '+cls+'"><div class="hlgb-team-client">'+escSafe(r.client)+'</div><div class="hlgb-team-product">'+escSafe(r.product)+'</div><div class="hlgb-team-line"><span>Pedido #'+escSafe(r.number)+'</span><span class="badge">'+escSafe(r.priority)+'</span></div><div class="hlgb-team-line"><span><b>'+r.qty.toLocaleString('pt-BR')+' peças</b></span><span class="hlgb-team-value">'+money(r.value)+'</span></div>'+progress+'<div class="hlgb-team-line"><span>📍 '+escSafe(r.location)+'</span><span class="badge '+(ready?'ok':late?'warn':'')+'">'+escSafe(situation)+'</span></div></div>';
}
function renderTeam(){
  injectUI();
  const base=baseRows();updateLocationFilter(base);
  const rows=teamRows(),t=today();
  const todayRows=base.filter(r=>r.date===t),lateRows=base.filter(r=>r.date<t);
  const cards=document.getElementById('hlgbProjectionTeamCards');
  if(cards)cards.innerHTML='<div class="card"><small>Peças para hoje</small><strong>'+todayRows.reduce((a,r)=>a+r.qty,0).toLocaleString('pt-BR')+'</strong></div><div class="card"><small>Valor de hoje</small><strong>'+money(todayRows.reduce((a,r)=>a+r.value,0))+'</strong></div><div class="card"><small>Peças exibidas</small><strong>'+rows.reduce((a,r)=>a+r.qty,0).toLocaleString('pt-BR')+'</strong></div><div class="card"><small>Valor exibido</small><strong>'+money(rows.reduce((a,r)=>a+r.value,0))+'</strong></div><div class="card"><small>Clientes</small><strong>'+new Set(rows.map(r=>r.client)).size+'</strong></div><div class="card"><small>Atrasados</small><strong>'+lateRows.length+'</strong></div>';
  const groups={};rows.forEach(r=>(groups[r.date]||(groups[r.date]=[])).push(r));
  const body=document.getElementById('hlgbProjectionTeamBody');
  if(body)body.innerHTML=rows.length?'<div class="hlgb-team-groups">'+Object.entries(groups).map(([d,list])=>'<div class="hlgb-team-day"><h3>'+escSafe(dateLabel(d))+' · '+list.reduce((a,r)=>a+r.qty,0).toLocaleString('pt-BR')+' peças · '+money(list.reduce((a,r)=>a+r.value,0))+'</h3><div class="hlgb-team-grid">'+list.map(card).join('')+'</div></div>').join('')+'</div>':'<div class="empty">Nenhuma entrega encontrada neste filtro.</div>';
  ['period','today','tomorrow','week','late'].forEach(k=>{const b=document.getElementById('hlgbTeamQuick'+k[0].toUpperCase()+k.slice(1));if(b)b.className=k===quick?'primary':'secondary'});
}
window.hlgbProjectionRenderTeam=renderTeam;
window.hlgbProjectionQuick=function(v){quick=v||'period';renderTeam()};
function applyMode(){
  injectUI();
  const page=document.getElementById('projecao');if(!page)return;
  const panels=[...page.querySelectorAll(':scope > .panel')];
  const team=document.getElementById('hlgbProjectionTeamPanel'),period=panels[0];
  panels.forEach(p=>{
    if(p===period||p===team)return;
    p.classList.toggle('hlgb-proj-admin-hidden',mode==='team');
  });
  if(team)team.style.display=mode==='team'?'block':'none';
  const tb=document.getElementById('hlgbProjTeamBtn'),ab=document.getElementById('hlgbProjAdminBtn');
  if(tb)tb.className=mode==='team'?'primary':'secondary';
  if(ab)ab.className=mode==='admin'?'primary':'secondary';
}
window.hlgbProjectionSetView=function(v){mode=v==='admin'?'admin':'team';try{localStorage.setItem(STORE,mode)}catch(e){};applyMode();if(mode==='team')renderTeam()};
try{mode=localStorage.getItem(STORE)==='admin'?'admin':'team'}catch(e){mode='team'}
const old=window.renderProjection;
if(typeof old==='function'&&!old.__hlgbTeamProjectionV1){
  const wrapped=function(){const out=old.apply(this,arguments);try{injectUI();applyMode();if(mode==='team')renderTeam()}catch(e){console.error('[HLGB projeção equipe]',e)}return out};
  wrapped.__hlgbTeamProjectionV1=true;wrapped.__original=old;window.renderProjection=wrapped;
}
window.hlgbProjectionTeam={baseRows,teamRows,prodProgress,setMode:v=>window.hlgbProjectionSetView(v)};
function boot(){injectUI();applyMode();if(document.getElementById('projecao')?.classList.contains('active'))renderTeam()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
console.info('[HLGB] Projeção semanal: visão da equipe '+V+' carregada');
})();