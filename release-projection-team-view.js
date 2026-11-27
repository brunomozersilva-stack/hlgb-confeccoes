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
function cutterAndMissing(order,item){
  const pid=sid(item?.productId);
  const cuts=arr('cuts').filter(c=>sid(c?.orderId)===sid(order?.id)&&(!pid||!c?.productId||sid(c.productId)===pid));
  const cutterIds=[...new Set(cuts.map(c=>sid(c?.cutterId)).filter(Boolean))];
  const cutters=cutterIds.map(cid=>arr('cutters').find(c=>sid(c?.id)===cid)?.name).filter(Boolean);
  const missing=arr('missingPieces').filter(m=>sid(m?.orderId)===sid(order?.id)&&(!pid||!m?.productId||sid(m.productId)===pid)&&norm(m?.status)!=='resolvido').reduce((a,m)=>a+q(m?.remainingQty!=null?m.remainingQty:m?.originalQty),0);
  return {cutters:[...new Set(cutters)],missing};
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
    const progress=prodProgress(order,item),detail=cutterAndMissing(order,item);
    return {
      order,item,date:String(item.date).slice(0,10),client:item.clientName||order.client||'Sem cliente',
      product:item.name||'Produto',qty,value,location,priority:order.priority||'Padrão',status:item.invoiced?'Nota finalizada':(order.status||'Em produção'),
      number:typeof displayOrderNumber==='function'?displayOrderNumber(order):order.id,progress,cutters:detail.cutters,missing:detail.missing
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
  return '<div class="hlgb-team-card '+cls+'"><div class="hlgb-team-client">'+escSafe(r.client)+'</div><div class="hlgb-team-product">'+escSafe(r.product)+'</div><div class="hlgb-team-line"><span>Pedido #'+escSafe(r.number)+'</span><span class="badge">'+escSafe(r.priority)+'</span></div><div class="hlgb-team-line"><span><b>'+r.qty.toLocaleString('pt-BR')+' peças</b></span><span class="hlgb-team-value">'+money(r.value)+'</span></div>'+progress+'<div class="hlgb-team-line"><span>✂️ Cortador: <b>'+escSafe(r.cutters.length?r.cutters.join(' · '):'Não definido')+'</b></span><span>'+(r.missing>0?'⚠️ Faltam <b>'+r.missing.toLocaleString('pt-BR')+'</b>':'✅ Sem faltas em aberto')+'</span></div><div class="hlgb-team-line"><span>📍 '+escSafe(r.location)+'</span><span class="badge '+(ready?'ok':late?'warn':'')+'">'+escSafe(situation)+'</span></div></div>';
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

function plannerActor(){try{return String(typeof cloudUser!=='undefined'?cloudUser?.id||'':typeof currentUser==='function'?currentUser()?.id||'':'')}catch(_){return ''}}
function plannerAllowed(){try{return mode==='admin'&&window.__HLGB_AUTH_READY===true&&!!plannerActor()&&typeof canOpenPage==='function'&&['projecao','pedidos','producao','financeiro'].every(p=>canOpenPage(p)===true)&&document.getElementById('projecao')?.classList.contains('active')}catch(_){return false}}
function clearPlanner(){document.getElementById('hlgbDeliveryCapacityPlanner')?.remove()}
function mountPlanner(){
 if(!plannerAllowed()){clearPlanner();return}
 const today=()=>{const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());return ['year','month','day'].map(k=>parts.find(p=>p.type===k).value).join('-')};
 const api=window.HLGBProductionPlanning9661,area=document.getElementById('projecao');if(!api?.deliveryCapacityPlan||!area)return;
 const prev=document.getElementById('hlgbDeliveryCapacityPlanner');if(prev?.dataset.actor===plannerActor())return;prev?.remove();
 const el=(tag,t,host)=>{const x=document.createElement(tag);x.textContent=t;host.appendChild(x);return x};
 const host=el('details','',area);host.id='hlgbDeliveryCapacityPlanner';host.className='panel';host.dataset.actor=plannerActor();host.open=true;
 const active=()=>plannerAllowed()&&host.isConnected&&host.dataset.actor===plannerActor();
 el('summary','Central de planejamento de produção e entregas',host);
 el('p','Simulação de carteira e capacidade. Não altera datas, metas, pedidos ou caixa. Histórico de entregas é referência, não capacidade comprovada de costura/corte.',host);
 const field=(label,type,value='',parent=host)=>{const l=el('label',label,parent);l.style.cssText='display:block;margin:7px 0';const f=el('input','',l);f.type=type;f.value=value;f.style.cssText='display:block;max-width:100%;box-sizing:border-box';return f};
 const btn=(label,parent,fn)=>{const b=el('button',label,parent);b.type='button';b.className='secondary';b.onclick=fn;return b};
 const start=field('Início do planejamento','date',today()),goal=field('Meta máxima semanal informada (opcional)','number'),buffer=field('Reserva de segurança (%)','number','15'),horizon=field('Semanas a planejar','number','8'),newPieces=field('Peças de um novo pedido hipotético','number','0'),closed=field('Feriados e dias fechados (AAAA-MM-DD, separados por vírgula)','text');
 const history=el('details','',host);el('summary','Histórico semanal para aprender com as entregas',history);
 el('p','Confira se a semana está completa e se a data da projeção corresponde à entrega realizada. Sem confirmação, a semana não entra na média. Uma semana de zero entregas pode ser confirmada explicitamente.',history);
 const histHost=el('div','',history),termHost=el('details','',host);el('summary','Condições de recebimento para simulação',termHost);el('p','Confirme a condição por cliente apenas para este cenário. Se houver condições diferentes por pedido, deixe desconhecida até a conciliação. Valores não representam saldo a receber ou recebimento confirmado.',termHost);
 const coverageLabel=el('label','Conferi a carteira inteira e as datas, inclusive pedidos sem projeção.',host),coverage=el('input','',coverageLabel);coverage.type='checkbox';
 const output=el('div','',host);output.setAttribute('aria-live','polite');let hist=[],terms=new Map(),orderTerms=new Map();
 function buildHistory(){
  histHost.replaceChildren();hist=[];coverage.checked=false;output.replaceChildren();if(!active()||!start.value)return;
  const base=Date.parse((start.value<today()?start.value:today())+'T00:00:00Z');if(!Number.isFinite(base))return;
  const day=86400000,m=base-((new Date(base).getUTCDay()+6)%7)*day,rows=[];
  try{if(typeof window.projectionDeliveredRows==='function'&&window.projectionDeliveredRows.__hlgbProjectionDeliveryIntegrityV1)rows.push(...window.projectionDeliveredRows('0000-01-01','9999-12-31'))}catch(_){}
  for(let i=1;i<=12;i++){const t=m-i*7*day,week=new Date(t).toISOString().slice(0,10),end=new Date(t+6*day).toISOString().slice(0,10);
   const observed=rows.filter(r=>{const d=sid(r.projectionDate||r.date).slice(0,10);return r.hlgbProjectionCanonical===true&&d>=week&&d<=end&&Number.isSafeInteger(r.qty)&&r.qty>0}).reduce((n,r)=>n+r.qty,0);
   const line=el('div','',histHost),pieces=field(week+' até '+end+' · peças observadas (conferir)','number',String(observed),line),l=el('label','Semana completa e entrega conferida',line),check=el('input','',l);check.type='checkbox';
   pieces.oninput=()=>{check.checked=false;output.replaceChildren()};check.onchange=()=>output.replaceChildren();hist.push({week,pieces,check});
  }
 }
 function getOrders(){if(typeof allProjectionRows!=='function'||typeof projectionDeliverableQty!=='function')throw Error('source');const raw=allProjectionRows();if(!Array.isArray(raw))throw Error('source');return raw.filter(r=>r.order&&r.item&&projectionDeliverableQty(r.order,r.item)>0).map(({order,item})=>{
  const client=sid(item.clientName||order.client||'Sem cliente'),qty=projectionDeliverableQty(order,item),rawValue=typeof projectionDeliverableValue==='function'?projectionDeliverableValue(order,item):null,amount=typeof rawValue==='number'&&Number.isFinite(rawValue)&&rawValue>=0?Math.round(rawValue*100):null;
  const key=order.id!=null&&item.key!=null?JSON.stringify([sid(order.id),sid(item.key)]):'';
  return {key,orderId:sid(order.id),orderNumber:sid(order.orderNumber||order.id),paymentTerms:order.paymentTerms,paymentDays:order.paymentDays,client,model:sid(item.name||'Produto'),dueDate:sid(item.date).slice(0,10),pieces:qty,amountCents:amount};
 })}
 function buildTerms(){if(!active())return;terms.clear();while(termHost.children.length>2)termHost.lastChild.remove();let clients=[];try{clients=[...new Set(getOrders().map(r=>r.client))].sort()}catch(_){return}
  for(const c of clients){const row=el('div','',termHost);el('strong',c,row);const select=el('select','',row);
   for(const [v,t] of [['unknown','Não conferido'],['cash','À vista na entrega (hipótese)'],['term','A prazo (hipótese)']]){const o=el('option',t,select);o.value=v}
   const days=field('Prazo em dias corridos','number','',row);days.min='1';days.max='365';select.onchange=days.oninput=()=>output.replaceChildren();terms.set(c,{select,days});
  }
 }

 const perOrder=el('details','',host);el('summary','Condições diferentes por pedido',perOrder);
 el('p','Condição registrada no pedido tem prioridade sobre a hipótese do cliente. Use o ajuste individual quando necessário; não altera cadastro ou título.',perOrder);
 const orderSearch=field('Buscar cliente ou número do pedido','search','',perOrder),orderTermList=el('div','',perOrder);let orderTermPage=0;
 function drawOrderTerms(){
  orderTermList.replaceChildren();if(!active())return;let rows;try{rows=[...new Map(getOrders().map(o=>[o.orderId,o])).values()]}catch(_){return}
  const query=orderSearch.value.toLocaleLowerCase('pt-BR');rows=rows.filter(o=>(o.client+' '+o.orderNumber).toLocaleLowerCase('pt-BR').includes(query));
  for(const o of rows.slice(orderTermPage,orderTermPage+20)){
   const row=el('div','',orderTermList);el('strong','Pedido '+o.orderNumber+' · '+o.client,row);
   el('p','Condição cadastrada: '+(o.paymentTerms||'Não informada'),row);
   const select=el('select','',row);for(const [v,t] of [['inherit','Usar condição registrada ou hipótese do cliente'],['unknown','Condição não confirmada'],['cash','À vista (simulação)'],['term','A prazo (simulação)']]){const x=el('option',t,select);x.value=v}
   const days=field('Dias corridos para pagamento','number','',row),prior=orderTerms.get(o.orderId);select.value=prior?.mode||'inherit';days.value=prior?.days??'';
   const save=()=>{orderTerms.set(o.orderId,{mode:select.value,days:Number(days.value)});output.replaceChildren()};select.onchange=days.oninput=save;
  }
  if(orderTermPage>0)btn('Anterior',orderTermList,()=>{orderTermPage-=20;drawOrderTerms()});if(orderTermPage+20<rows.length)btn('Mais pedidos',orderTermList,()=>{orderTermPage+=20;drawOrderTerms()});
 }
 orderSearch.oninput=()=>{orderTermPage=0;drawOrderTerms()};drawOrderTerms();
 start.onchange=buildHistory;for(const f of [goal,buffer,horizon,newPieces,closed])f.oninput=()=>output.replaceChildren();coverage.onchange=()=>output.replaceChildren();
 btn('Atualizar dados de pedidos e histórico',host,()=>{orderTerms.clear();buildHistory();buildTerms();orderTermPage=0;drawOrderTerms()});
 btn('Simular capacidade, entregas e recebimentos',host,()=>{
  output.replaceChildren();if(!active())return;
  try{
   const orders=getOrders().map(o=>{const t=terms.get(o.client),v=api.orderPaymentCondition(o,orderTerms.get(o.orderId),{mode:t?.select.value||'unknown',days:Number(t?.days.value||0)},true);return {...o,paymentMode:v.mode,paymentDays:v.days}});
   const missing=orders.filter(o=>!o.dueDate||!o.key).length;
   const p=api.deliveryCapacityPlan({start:start.value,asOf:today(),weeks:Number(horizon.value),weeklyGoal:goal.value===''?null:Number(goal.value),bufferPercent:Number(buffer.value),newPieces:Number(newPieces.value),closedDates:closed.value.split(',').map(x=>x.trim()).filter(Boolean),coverageConfirmed:coverage.checked&&missing===0,history:hist.map(h=>({week:h.week,pieces:Number(h.pieces.value),confirmed:h.check.checked})),orders},true);
   if(p.state!=='local-capacity-simulation'){el('p','Confira datas, metas, histórico e limites da simulação.',output);return}
   const fmt=n=>n===null?'Não confirmado':n.toLocaleString('pt-BR');
   el('h3','Capacidade semanal e carteira',output);el('p','Semanas conferidas: '+p.sampleCount+' · Média entregue: '+fmt(p.average)+' · Referência conservadora: '+fmt(p.conservative)+' · Meta após reserva: '+fmt(p.weeklyTarget)+' peças/semana.',output);
   el('p','Peças atrasadas na carteira: '+fmt(p.overdue)+' · Fora do prazo na simulação: '+fmt(p.late)+' · Não alocadas no horizonte: '+fmt(p.unallocated),output);
   if(p.issues.length||missing)el('p','Dados a conferir: '+p.issues.join(', ')+' · '+missing+' itens sem data ou identificação; não prometa prazo com carteira incompleta.',output);
   if(p.newPieces)el('p','Novo pedido: '+fmt(p.newPieces)+' peças · primeira conclusão hipotética '+(p.firstAvailable||'não cabe no horizonte')+' · '+p.unplacedNewPieces+' ainda sem capacidade. Não é data de entrega confirmada.',output);
   const wrap=el('div','',output);wrap.style.cssText='overflow:auto;max-width:100%';const table=el('table','',wrap),head=el('tr','',el('thead','',table));for(const h of ['Semana','Capacidade','Entregas previstas (pç)','Carga alocada','Vagas (pç)','À vista*','A prazo*','Pç sem condição'])el('th',h,head);
   const body=el('tbody','',table);for(const w of p.weeks){const tr=el('tr','',body);for(const v of [w.start,fmt(w.capacity),fmt(w.committed),fmt(w.allocated),fmt(w.free),money(w.cashAtDeliveryCents/100),money(w.termReceiptsCents/100),fmt(w.unknownPaymentPieces)])el('td',String(v),tr)}
   el('p','Peças sem estimativa de recebimento: '+fmt(p.excludedReceiptPieces)+'.',output);
   el('p','* Recebimentos brutos hipotéticos somente para lotes concluídos na simulação, na data mais tardia entre prazo prometido e conclusão, acrescida do prazo de pagamento. Não são saldos de títulos nem caixa líquido; não incluem parcelas ou pagamentos anteriores.',output);
   const details=el('details','',output);el('summary','Entregas por cliente, pedido e data',details);
   for(const o of p.orders)el('p',o.dueDate+' · '+o.client+' · '+o.model+' · '+o.pieces+' pç · '+(o.paymentMode==='cash'?'À vista':o.paymentMode==='term'?'Prazo '+o.paymentDays+' dias':'Condição não conferida')+' · previsão de conclusão '+(o.lastWorkDate||'sem alocação')+(o.remaining?' · '+o.remaining+' pç pendentes':''),details);

   const cash=el('details','',output);el('summary','Simular necessidades de caixa e antecipação de entregas',cash);
   el('p','Simulação manual: informe o saldo disponível e os compromissos ainda abertos, sem repetir títulos. Não substitui a conciliação financeira; não muda prazos nem efetua pagamentos.',cash);
   const balance=field('Saldo inicial (R$)','number','',cash),reserve=field('Reserva mínima desejada (R$)','number','0',cash),delay=field('Atraso de recebimentos para cenário de risco (dias)','number','7',cash);
   const label=el('label','Compromissos abertos: uma linha por título — data;entrada/saida;valor em R$;referência única',cash),ledger=el('textarea','',label);ledger.rows=5;ledger.style.cssText='display:block;width:100%;box-sizing:border-box';ledger.placeholder='2026-12-04;saida;2500,00;fornecedor-01';
   const checkedLabel=el('label','Conferi saldo, recebimentos, pagamentos e cobertura dos compromissos informados.',cash),checked=el('input','',checkedLabel);checked.type='checkbox';
   const additions=el('details','',cash);el('summary','Recebimentos adicionais de pedidos ainda não incluídos acima',additions);
   el('p','Selecione somente saldo ainda a receber, não registrado entre os compromissos. A antecipação exige aceite do cliente. O prazo parte da conclusão/entrega simulada.',additions);
   const list=el('div','',additions),pick=new Map(),eligible=p.orders.filter(o=>o.remaining===0&&o.lastWorkDate&&o.paymentMode!=='unknown'&&o.amountCents>0);let offset=0;
   const cashOut=el('div','',cash);
   function invalidateCash(){cashOut.replaceChildren()}
   let hubImported=null;
   const hubMessage=el('p','Hub: nenhuma consulta carregada.',cash);
   const hubAllowed=()=>active()&&typeof canOpenPage==='function'&&canOpenPage('hubFinanceiro')===true&&canOpenPage('folhaPagamento')===true;
   function readHub(){
    if(!hubAllowed()||start.value!==today())return null;
    const adapter=window.HLGBHubIntelligenceAdapter9633,guard=window.hlgbWalIdbGuard9536,status=guard?.status?.(),ids=new Set();
    if(typeof adapter?.inspect!=='function'||typeof guard?.ids!=='function'||typeof window.hlgbRecordPendingIdentitySet9535!=='function')return null;
    for(const k of guard.ids())ids.add(String(k));for(const k of window.hlgbRecordPendingIdentitySet9535())ids.add(String(k));
    const age=Date.now()-Date.parse(status?.lastProbeAt||''),observed=!!status&&status.probes>0&&status.readFailed===false&&status.localReadFailed===false&&status.unsupported===false&&Number.isFinite(age)&&age>=0&&age<=120000;
    const source=typeof db!=='undefined'?db:window.db;
    const result=adapter.inspect({db:source,authenticated:true,financeAllowed:true,payrollAggregateAllowed:true,paidDateApi:window.hlgbHubPayrollPaidDate9515,pendingEvidence:{state:observed?'observed':'incomplete',ids:[...ids]}},{asOf:today(),targetDate:today(),historyWeeks:8,receiptDelayDays:14});
    return result?.state==='local-observation-only'?result.plannerObligations:null;
   }
   const hubLines=h=>h.entries.map(e=>[e.date,e.direction==='in'?'entrada':'saida',(e.amountCents/100).toFixed(2),e.reference].join(';')).join('\n');
   btn('Consultar compromissos previstos do Hub',cash,()=>{
    if(!active())return;
    try{
     const h=readHub();if(!h||h.pendingState!=='observed'){hubMessage.textContent='Consulta indisponível: requer data inicial de hoje, permissões de Hub/Folha e fila de sincronização observada. Atualize a fonte e confira.';return}
     if(ledger.value.trim()&&!confirm('Substituir os compromissos manuais desta simulação pela consulta do Hub? Nenhum lançamento real será alterado.'))return;
     if(h.entries.length>5000||h.entries.some(e=>/[;\r\n]/.test(e.reference)))throw Error('limit');
     hubImported=JSON.stringify(h);ledger.value=hubLines(h);ledger.readOnly=true;checked.checked=false;checked.disabled=true;pick.clear();additions.hidden=true;invalidateCash();
     hubMessage.textContent=h.entries.length+' compromissos previstos observados · '+h.overdueReceipts.length+' recebimentos vencidos excluídos até nova data confirmada · '+h.omitted+' ocorrências na fonte. Pagamentos vencidos foram trazidos para hoje apenas na simulação. Não adiciona valores de pedidos para evitar dupla contagem; saldo e cobertura não confirmados.';
    }catch(_){hubMessage.textContent='Não foi possível consultar o Hub. O cenário anterior foi preservado.'}
   });
   btn('Voltar à simulação manual',cash,()=>{
    if(!active())return;if(hubImported&&!confirm('Descartar a cópia do Hub deste cenário?'))return;
    if(hubImported)ledger.value='';hubImported=null;ledger.readOnly=false;checked.disabled=false;checked.checked=false;additions.hidden=false;pick.clear();drawCashOrders();invalidateCash();hubMessage.textContent='Modo manual; nenhum valor importado do Hub.';
   });

   function drawCashOrders(){
    list.replaceChildren();if(!active())return;
    for(const o of eligible.slice(offset,offset+20)){const row=el('div','',list),l=el('label',o.client+' · '+o.model+' · entrega '+o.dueDate,row),c=el('input','',l);c.type='checkbox';
     const v=pick.get(o.key)||{include:false,amount:'',reference:'',early:false};pick.set(o.key,v);c.checked=v.include;
     const amount=field('Saldo adicional a receber (R$)','number',v.amount,row),ref=field('Referência única do recebimento','text',v.reference,row),a=el('label','Cliente aceita entrega e recebimento antecipados',row),early=el('input','',a);early.type='checkbox';early.checked=v.early;
     c.onchange=()=>{v.include=c.checked;invalidateCash()};amount.oninput=()=>{v.amount=amount.value;invalidateCash()};ref.oninput=()=>{v.reference=ref.value;invalidateCash()};early.onchange=()=>{v.early=early.checked;invalidateCash()};
    }
    if(offset>0)btn('Pedidos anteriores',list,()=>{offset-=20;drawCashOrders()});if(offset+20<eligible.length)btn('Mais pedidos',list,()=>{offset+=20;drawCashOrders()});
   }
   drawCashOrders();
   for(const f of [balance,reserve,delay,ledger])f.oninput=()=>{checked.checked=false;invalidateCash()};checked.onchange=invalidateCash;
   const cents=s=>{const v=String(s).trim().replace(',','.');return /^-?\d+(?:\.\d{1,2})?$/.test(v)?Math.round(Number(v)*100):NaN};
   btn('Comparar caixa e oportunidades',cash,()=>{
    cashOut.replaceChildren();if(!active())return;
    if(hubImported){try{const fresh=readHub();if(!fresh||JSON.stringify(fresh)!==hubImported||ledger.value!==hubLines(fresh)){el('p','A fonte do Hub ou as permissões mudaram. Consulte novamente antes de simular.',cashOut);return}}catch(_){el('p','Não foi possível reconferir a fonte do Hub.',cashOut);return}}
    const entries=ledger.value.split(/\r?\n/).filter(x=>x.trim()).map(line=>{const a=line.split(';').map(x=>x.trim());return {date:a[0],direction:a.length===4?({entrada:'in',saida:'out'})[a[1]]:'invalid',amountCents:cents(a[2]),reference:a[3]}});
    const additional=(hubImported?[]:[...pick]).filter(([,v])=>v.include).map(([key,v])=>({key,reference:v.reference.trim(),amountCents:cents(v.amount),notAlreadyIncluded:true,earlyAccepted:v.early}));
    const v=api.deliveryCashScenario(p,{start:start.value,openingCents:cents(balance.value),reserveCents:cents(reserve.value),delayDays:Number(delay.value),entries,additional,coverageConfirmed:!hubImported&&checked.checked},active());
    if(v.state!=='local-cash-scenario'){el('p','Confira saldo, datas, referências únicas, valores e pedidos escolhidos. Recebimento adicional não pode superar o valor do pedido.',cashOut);return}
    const f=n=>money(n/100);
    el('p',v.partial?'Cenário parcial: '+v.issues.join(', '):'Cenário informado e revisado, ainda sem conciliação automática.',cashOut);
    for(const [title,s] of [['Somente compromissos informados',v.baseline],['Com entregas planejadas',v.planned],['Com antecipações aceitas',v.early],['Com atraso de recebimentos',v.stress]]){el('h4',title,cashOut);el('p','Primeiro dia abaixo da reserva: '+(s.firstGap||'nenhum nos 91 dias')+' · necessidade máxima '+f(s.maximumGapCents)+' · menor saldo '+f(s.minimumCents)+(s.outside?' · '+s.outside+' movimentos fora do período':''),cashOut)}
    for(const o of v.opportunities)el('p',o.client+' · '+o.model+' · '+f(o.amountCents)+' · '+o.normalReceipt+' → '+o.earlyReceipt+(o.requiresCustomerAcceptance?' · confirmar aceite antes de antecipar':' · aceite informado'),cashOut);
    const wrap=el('div','',cashOut);wrap.style.cssText='overflow:auto;max-width:100%';const table=el('table','',wrap),head=el('tr','',el('thead','',table));for(const h of ['Semana','Entradas planejadas','Saídas','Saldo planejado','Saldo antecipado','Saldo com atraso'])el('th',h,head);
    const body=el('tbody','',table);v.planned.weeks.forEach((w,i)=>{const tr=el('tr','',body);for(const x of [w.start,f(w.incomingCents),f(w.outgoingCents),f(w.closingCents),f(v.early.weeks[i].closingCents),f(v.stress.weeks[i].closingCents)])el('td',x,tr)});
    el('p','Não usar como confirmação de caixa disponível. Nenhum pedido, título ou data foi modificado.',cashOut);
   });


   const recv=el('details','',output);el('summary','Clientes, condições e títulos a receber',recv);
   el('p','Consulta as notas canônicas e seus títulos financeiros vinculados. Saldos divergentes ou pendentes ficam em revisão. Nota compartilhada entre pedidos aparece uma vez nos totais do cliente. Condição de nota anterior não garante a condição de nova entrega.',recv);
   const recvSearch=field('Buscar cliente, pedido ou nota','search','',recv),recvOut=el('div','',recv);let recvData=null,recvPage=0;
   const recvAllowed=()=>active()&&typeof canOpenPage==='function'&&canOpenPage('notas')===true&&canOpenPage('hubFinanceiro')===true;
   function drawReceivables(){
    recvOut.replaceChildren();if(!recvAllowed()||recvData?.state!=='local-receivables-review')return;
    const query=recvSearch.value.toLocaleLowerCase('pt-BR'),match=(...values)=>values.join(' ').toLocaleLowerCase('pt-BR').includes(query),term=v=>v==='cash'?'À vista':v==='term'?'A prazo / modalidade registrada':'Não confirmada',brl=v=>v===null?'Não confirmado':money(v/100);
    el('p',recvData.titles.length+' notas consultadas · '+recvData.issues.length+' ocorrências a conferir · '+recvData.orders.length+' pedidos. Não é conciliação bancária nem saldo disponível.',recvOut);
    const groups=el('details','',recvOut);el('summary','Saldos conciliados localmente por cliente',groups);
    for(const g of recvData.clients.filter(g=>match(g.clientName)))el('p',g.clientName+' · '+g.noteCount+' notas · recebido '+brl(g.paidCents)+' · saldo '+brl(g.balanceCents)+' · à vista '+brl(g.cashOpenCents)+' · a prazo '+brl(g.termOpenCents)+' · vencido '+brl(g.overdueCents),groups);
    const rows=recvData.orders.filter(o=>match(o.clientName,o.number,o.orderId));
    el('h4','Pedidos e condição registrada',recvOut);
    for(const o of rows.slice(recvPage,recvPage+25))el('p','Pedido '+o.number+' · '+o.clientName+' · '+term(o.terms)+(o.termsSource==='linked-note-history'?' (histórico de nota, não confirmação do pedido)':o.termsSource==='order'?' (pedido)':'')+' · '+o.noteCount+' notas vinculadas · '+o.sharedNotes+' compartilhadas · '+o.reviewNotes+' em revisão · saldo de notas exclusivas '+brl(o.exclusiveNoteBalanceCents),recvOut);
    if(recvPage>0)btn('Anterior',recvOut,()=>{recvPage-=25;drawReceivables()});if(recvPage+25<rows.length)btn('Mais pedidos',recvOut,()=>{recvPage+=25;drawReceivables()});
    const notes=el('details','',recvOut);el('summary','Notas e títulos vinculados',notes);
    for(const t of recvData.titles.filter(t=>match(t.clientName,t.noteId,t.titleId,...t.orderIds)).slice(0,100))el('p',t.clientName+' · nota '+t.noteId+' · título '+(t.titleId||'ausente')+' · '+term(t.terms)+' · vencimento '+(t.due||'não confirmado')+' · '+(t.status==='review'?'Revisar: '+t.reason:'saldo '+brl(t.balanceCents))+(t.shared?' · nota compartilhada':''),notes);
    const review=el('details','',recvOut);el('summary','Ocorrências de conciliação',review);for(const x of recvData.issues.slice(0,100))el('p',x.key+' · '+x.reason,review);
    el('p','Não soma esses valores ao Hub nem prevê recebimento de pedido sem título conciliado. Nenhuma alteração gravada.',recvOut);
   }
   btn('Consultar títulos e pedidos existentes',recv,()=>{
    recvOut.replaceChildren();recvData=null;if(!recvAllowed())return;
    try{
     const source=typeof db!=='undefined'?db:window.db,guard=window.hlgbWalIdbGuard9536,status=guard?.status?.(),canonical=window.hlgbCanonicalProjectionInvoices;
     if(typeof canonical!=='function'||typeof guard?.ids!=='function'||typeof window.hlgbRecordPendingIdentitySet9535!=='function')throw Error('source');
     const age=Date.now()-Date.parse(status?.lastProbeAt||''),pendingObserved=!!status&&status.probes>0&&status.readFailed===false&&status.localReadFailed===false&&status.unsupported===false&&Number.isFinite(age)&&age>=0&&age<=120000;
     const rows=canonical();if(!Array.isArray(rows))throw Error('canonical');
     recvData=api.orderReceivablesReview(source,{asOf:today(),canonicalIds:rows.map(n=>sid(n.id)),pendingIds:[...new Set([...guard.ids(),...window.hlgbRecordPendingIdentitySet9535()].map(String))],pendingObserved},recvAllowed());
     recvPage=0;drawReceivables();if(recvData.state!=='local-receivables-review')el('p','Consulta indisponível. Confira fonte canônica e fila de sincronização.',recvOut);
    }catch(_){el('p','Não foi possível consultar as notas e títulos com segurança.',recvOut)}
   });recvSearch.oninput=()=>{recvPage=0;drawReceivables()};
   const stages=el('details','',output);el('summary','Metas por setor, equipes e facções',stages);
   el('p','Simule uma semana de produção em sequência, com capacidade de cada setor e peças já disponíveis para a próxima etapa. Sem transferência no mesmo dia; só use capacidade e estoque conferidos. Não é distribuição oficial nem reserva de produção.',stages);
   const target=field('Meta de entrega para os próximos 7 dias (peças)','number',String(p.weeklyTarget??''),stages),stageRows=[];
   for(const [key,name] of [['cut','Corte'],['separation','Separação'],['sewing','Costura / facções'],['finishing','Acabamento'],['delivery','Entregas']]){
    const panel=el('details','',stages);el('summary',name,panel);
    const capacity=field('Capacidade semanal de 5 dias (peças)','number','',panel),wip=key==='cut'?null:field('Peças prontas da etapa anterior, disponíveis no início','number','0',panel);
    const label=el('label','Estoque em processo conferido',panel),confirmed=el('input','',label);confirmed.type='checkbox';if(!wip)label.hidden=true;
    const histLabel=el('label','Histórico conferido: uma semana completa por linha (segunda-feira;peças)',panel);
    const hist=el('textarea','',histLabel);hist.rows=3;hist.style.cssText='display:block;width:100%;box-sizing:border-box';hist.placeholder='2026-11-16;2500';
    const teamLabel=el('label','Dividir por equipe/facção: nome;capacidade semanal, uma por linha',panel),teams=el('textarea','',teamLabel);teams.rows=3;teams.style.cssText='display:block;width:100%;box-sizing:border-box';teams.placeholder='Equipe A;1000';
    stageRows.push({key,name,capacity,wip,confirmed,hist,teams});
   }

   const observed=el('details','',stages);el('summary','Histórico observado automaticamente por modelo e local',observed);
   el('p','Cortes finalizados pela grade realizada, devoluções de facção por evento e conclusões internas sem vínculo externo. Semanas sem registros não são zero; devolução não mede horas trabalhadas. Confira a cobertura antes de usar como capacidade.',observed);
   const observedOut=el('div','',observed),queryObserved=field('Buscar modelo ou local','search','',observed);let observedData=null,observedOffset=0;
   function drawObserved(){
    observedOut.replaceChildren();if(!active()||observedData?.state!=='local-observation')return;
    const labels={cut:'Corte',external:'Devolução de facção',internal:'Conclusão interna'},query=queryObserved.value.toLocaleLowerCase('pt-BR');
    el('p',observedData.eventCount+' eventos aceitos nas últimas 12 semanas completas · '+observedData.issues.length+' registros a conferir.',observedOut);
    const selected=observedData.rows.filter(r=>(r.productName+' '+r.teamName+' '+labels[r.source]).toLocaleLowerCase('pt-BR').includes(query));
    for(const r of selected.slice(observedOffset,observedOffset+25)){const d=el('details','',observedOut);el('summary',labels[r.source]+' · '+r.productName+' · '+r.teamName+' · '+fmt(r.total)+' pç',d);el('p','Média nas '+r.observedWeeks+' semanas com movimento: '+fmt(r.averageActiveWeek)+' pç (não é capacidade validada).',d);for(const w of r.samples)el('p',w.week+' · '+w.pieces+' pç',d)}
    if(observedOffset>0)btn('Anterior',observedOut,()=>{observedOffset-=25;drawObserved()});if(observedOffset+25<selected.length)btn('Mais resultados',observedOut,()=>{observedOffset+=25;drawObserved()});
   }
   btn('Consultar histórico dos registros atuais',observed,()=>{if(!active())return;observedData=api.observedThroughput(typeof db!=='undefined'?db:window.db,start.value,active());observedOffset=0;drawObserved();if(observedData.state!=='local-observation')el('p','Fonte histórica indisponível.',observedOut)});
   queryObserved.oninput=()=>{observedOffset=0;drawObserved()};
   btn('Copiar semanas observadas de corte para revisar',observed,()=>{if(!active()||observedData?.state!=='local-observation')return;const row=stageRows.find(r=>r.key==='cut');const values=observedData.weeks.filter(w=>w.source==='cut');if(!values.length)return;const draft=values.map(w=>w.week+';'+w.pieces).join('\n');if(!confirm('Conferiu as semanas e a cobertura do histórico de corte? As semanas sem registro não serão incluídas. Substituir o histórico informado para esta simulação?'))return;row.hist.value=draft;stageOut.replaceChildren()});

   const lead=el('details','',stages);el('summary','Tempo de retorno por facção e modelo',lead);
   el('p','Dias corridos entre envio e último retorno conciliado. Compara lotes do mesmo modelo, local e faixa de quantidade. Não inclui fila futura, transporte, acabamento ou capacidade disponível.',lead);
   const leadOut=el('div','',lead),leadSearch=field('Buscar facção ou modelo','search','',lead),leadReport=el('div','',lead);let leadData=null,leadOffset=0;
   function drawLead(){
    leadOut.replaceChildren();if(!active()||leadData?.state!=='local-leadtime-observation')return;
    const search=leadSearch.value.toLocaleLowerCase('pt-BR'),matches=x=>(x.productName+' '+x.teamName).toLocaleLowerCase('pt-BR').includes(search);
    const list=leadData.rows.filter(matches);
    el('p',leadData.rows.length+' combinações históricas · '+leadData.open.length+' lotes abertos observados · '+leadData.issues.length+' registros a conferir.',leadOut);
    for(const r of list.slice(leadOffset,leadOffset+20)){
     const d=el('details','',leadOut);el('summary',r.teamName+' · '+r.productName+' · '+r.band+' pç',d);
     el('p',r.count+' lotes · média '+r.averageDays+' dias · mediana '+r.medianDays+' · máximo '+r.maxDays+' · referência conservadora '+(r.conservativeDays===null?'histórico insuficiente':r.conservativeDays+' dias'),d);
     for(const s of r.samples)el('p',s.sentAt+' → '+s.finishedAt+' · '+s.pieces+' pç · '+s.elapsedDays+' dias',d);
    }
    if(leadOffset>0)btn('Anterior',leadOut,()=>{leadOffset-=20;drawLead()});if(leadOffset+20<list.length)btn('Mais históricos',leadOut,()=>{leadOffset+=20;drawLead()});
    const pending=el('details','',leadOut);el('summary','Lotes em andamento e sinais de atraso',pending);
    for(const o of leadData.open.filter(matches))el('p',o.teamName+' · '+o.productName+' · '+o.remaining+' pç pendentes · '+o.elapsedDays+' dias desde envio · prazo '+(o.dueDate||'não informado')+(o.lateAgainstDue?' (vencido)':'')+' · '+(o.referenceDate?'referência histórica '+o.referenceDate+(o.pastReference?' (superada)':''):'sem referência suficiente'),pending);
   }
   const modelField=field('ID do modelo para simular','text','',lead),teamField=field('ID do local/facção','text','',lead),qtyField=field('Quantidade do novo lote','number','',lead),sentField=field('Data hipotética de envio','date',start.value,lead);
   const models=el('datalist','',lead),teams=el('datalist','',lead);models.id='hlgbLeadModels';teams.id='hlgbLeadTeams';modelField.setAttribute('list',models.id);teamField.setAttribute('list',teams.id);
   btn('Consultar histórico e lotes abertos',lead,()=>{
    if(!active())return;
    const source=typeof db!=='undefined'?db:window.db;leadData=api.factionLeadTimes(source,today(),active());leadOffset=0;drawLead();leadReport.replaceChildren();models.replaceChildren();teams.replaceChildren();
    if(leadData.state!=='local-leadtime-observation'){el('p','Histórico indisponível.',leadOut);return}
    for(const r of source.products||[]){if(r?.id==null||r.deletedAt||r.deleted_at||r.deleted===true)continue;const o=el('option','',models);o.value=sid(r.id);o.label=sid(r.name)}
    for(const r of source.productionLocations||[]){if(r?.id==null||r.deletedAt||r.deleted_at||r.deleted===true)continue;const o=el('option','',teams);o.value=sid(r.id);o.label=sid(r.name)}
   });
   leadSearch.oninput=()=>{leadOffset=0;drawLead()};for(const f of [modelField,teamField,qtyField,sentField])f.oninput=()=>leadReport.replaceChildren();
   btn('Simular referência de retorno',lead,()=>{
    leadReport.replaceChildren();if(!active())return;
    const v=api.factionLeadTimePreview(leadData,{productId:modelField.value.trim(),teamId:teamField.value.trim(),pieces:Number(qtyField.value),sentAt:sentField.value},active());
    if(v.state!=='historical-reference'){el('p',v.state==='insufficient-history'?'Ainda não há quatro lotes concluídos comparáveis ('+v.sampleCount+' observados). Não estimar prazo automaticamente.':'Consulte o histórico e confira modelo, local, data e quantidade.',leadReport);return}
    el('p','Referência: '+v.referenceDays+' dias corridos · retorno em '+v.referenceDate+' · '+v.sampleCount+' lotes comparáveis. Não é promessa de entrega; confira fila e capacidade atuais.',leadReport);
   });

   const queue=el('details','',stages);el('summary','Fila atual e capacidade disponível por facção',queue);
   el('p','Simule novos lotes somente depois dos compromissos existentes. A capacidade semanal é informada e conferida; a velocidade histórica não prova disponibilidade. Atribuições sem lote vinculado aparecem separadamente para evitar duplicidades.',queue);
   const qteam=el('select','',queue);qteam.setAttribute('aria-label','Local ou facção para simular fila');qteam.style.maxWidth='100%';
   const option=(value,label)=>{const o=el('option',label,qteam);o.value=value};option('','Escolher local/facção');
   const qcap=field('Capacidade semanal em 5 dias (peças)','number','',queue),qextra=field('Outros compromissos conciliados, ainda não incluídos nos lotes (peças)','number','0',queue),qnew=field('Quantidade do novo lote (peças)','number','',queue);
   const qlabel=el('label','Conferi a fila completa e os compromissos adicionais sem duplicar peças',queue),qcover=el('input','',qlabel);qcover.type='checkbox';
   const capLabel=el('label','Conferi a capacidade disponível da facção para o período',queue),qverified=el('input','',capLabel);qverified.type='checkbox';
   const qout=el('div','',queue);
   function refreshQueueLocations(){
    if(!active())return;const source=typeof db!=='undefined'?db:window.db,previous=qteam.value;qteam.replaceChildren();option('','Escolher local/facção');
    const seen=new Set();for(const l of source?.productionLocations||[]){const key=sid(l?.id);if(!key||seen.has(key)||l.deletedAt||l.deleted_at||l.deleted===true||l._deleted)continue;seen.add(key);option(key,sid(l.name||key))}qteam.value=seen.has(previous)?previous:'';
   }
   function invalidateQueue(){qout.replaceChildren()}
   qteam.onchange=()=>{qcover.checked=false;qverified.checked=false;invalidateQueue()};qcap.oninput=()=>{qverified.checked=false;invalidateQueue()};qextra.oninput=()=>{qcover.checked=false;invalidateQueue()};qnew.oninput=invalidateQueue;qcover.onchange=qverified.onchange=invalidateQueue;
   btn('Atualizar lista de locais',queue,()=>{refreshQueueLocations();qcover.checked=false;qverified.checked=false;invalidateQueue()});
   btn('Simular fila e novo lote',queue,()=>{
    qout.replaceChildren();if(!active())return;
    const source=typeof db!=='undefined'?db:window.db;
    const n=x=>/^\d+$/.test(String(x).trim())?Number(x):NaN;
    const v=api.factionQueueScenario(source,{teamId:qteam.value,start:start.value,weeklyCapacity:n(qcap.value),additionalCommitted:n(qextra.value),newPieces:n(qnew.value),bufferPercent:Number(buffer.value),weeks:Number(horizon.value),closedDates:closed.value.split(',').map(x=>x.trim()).filter(Boolean),coverageConfirmed:qcover.checked,capacityConfirmed:qverified.checked},active());
    if(v.state!=='local-queue-scenario'){el('p','Confira local, datas, horizonte, capacidade e quantidade inteira de peças.',qout);return}
    el('h4',v.teamName+' · fila observada '+fmt(v.observedPieces)+' pç',qout);
    el('p','Atribuições sem lote '+fmt(v.pendingPieces)+' pç (não somadas automaticamente) · outros compromissos '+fmt(v.additionalCommitted)+' · meta semanal com reserva '+fmt(v.weeklyTarget)+' pç.',qout);
    if(v.partial)el('p','Cenário parcial: '+v.issues.length+' registros/condições a conferir. Não use para prometer data.',qout);
    el('p','Primeiro dia com capacidade hipotética livre: '+(v.firstFree||'sem disponibilidade no horizonte')+' · conclusão hipotética do novo lote: '+(v.newCompletion||'não concluído no horizonte')+' · saldo do novo lote '+fmt(v.newUnallocated)+' pç.',qout);
    el('p','Compromissos existentes não alocados '+fmt(v.existingRemaining)+' pç · peças fora de prazo na simulação '+fmt(v.latePieces)+'.',qout);
    const wrap=el('div','',qout);wrap.style.cssText='overflow:auto;max-width:100%';const table=el('table','',wrap),head=el('tr','',el('thead','',table));for(const h of ['Semana','Capacidade','Compromissos','Novo lote','Livre'])el('th',h,head);
    const body=el('tbody','',table);for(const w of v.weeks){const tr=el('tr','',body);for(const x of [w.start,fmt(w.capacity),fmt(w.existing),fmt(w.newPieces),fmt(w.free)])el('td',x,tr)}
    const detail=el('details','',qout);el('summary','Lotes existentes e prazos',detail);for(const l of v.lots)el('p',l.productName+' · '+l.remaining+' pç · prazo '+(l.dueDate||'não informado')+' · conclusão simulada '+(l.lastWorkDate||'não alocado')+(l.unallocated?' · '+l.unallocated+' pç não alocadas':''),detail);
    const pending=el('details','',qout);el('summary','Atribuições que precisam ser conciliadas',pending);for(const l of v.pendingCandidates)el('p','Produção '+l.key+' · modelo '+l.pid+' · '+l.remaining+' pç · '+(l.dueDate||'sem prazo'),pending);
    const issues=el('details','',qout);el('summary','Ocorrências a conferir',issues);for(const i of v.issues)el('p',i.recordId+' · '+i.reason,issues);
    el('p','Nenhuma reserva, transferência ou alteração foi gravada. Não inclui complexidade, transporte ou confirmação de disponibilidade real.',qout);
   });refreshQueueLocations();

   const distribute=el('details','',stages);el('summary','Distribuir um novo pedido entre várias facções',distribute);
   el('p','Compara filas, capacidades revisadas e lotes históricos do mesmo modelo. Só considera faixas observadas e locais com compatibilidade confirmada. Não reserva capacidade nem altera pedidos.',distribute);
   const dmodel=el('select','',distribute);dmodel.setAttribute('aria-label','Modelo para distribuir');dmodel.style.maxWidth='100%';
   const dqty=field('Quantidade total do pedido','number','',distribute),ddue=field('Data limite de entrega ao cliente','date','',distribute),dfinish=field('Dias corridos de reserva para acabamento e transporte','number','2',distribute);
   const dlist=el('div','',distribute),dout=el('div','',distribute),dteams=[];
   function loadDistribution(){
    if(!active())return;const source=typeof db!=='undefined'?db:window.db;dmodel.replaceChildren();dlist.replaceChildren();dout.replaceChildren();dteams.length=0;
    const add=(s,value,label)=>{const o=el('option',label,s);o.value=value};add(dmodel,'','Selecionar modelo');
    const seen=new Set();for(const p of source?.products||[]){const k=sid(p?.id);if(!k||seen.has(k)||p.deletedAt||p.deleted_at||p.deleted===true||p._deleted||p.active===false)continue;seen.add(k);add(dmodel,k,sid(p.name||k))}
    seen.clear();for(const l of source?.productionLocations||[]){const k=sid(l?.id);if(!k||seen.has(k)||l.deletedAt||l.deleted_at||l.deleted===true||l._deleted)continue;seen.add(k);
     const row=el('details','',dlist);el('summary',sid(l.name||k),row);
     const pickLabel=el('label','Incluir nesta comparação',row),pick=el('input','',pickLabel);pick.type='checkbox';
     const cap=field('Capacidade semanal (peças em cinco dias)','number','',row),extra=field('Compromissos adicionais conciliados (peças)','number','0',row);
     const check=(text)=>{const label=el('label',text,row),c=el('input','',label);c.type='checkbox';return c};
     const compatible=check('Confirmei que este local produz o modelo selecionado'),coverage=check('Conferi a fila completa, sem duplicar compromissos'),capacity=check('Conferi capacidade disponível e calendário');
     for(const f of [pick,compatible,coverage,capacity])f.onchange=()=>dout.replaceChildren();
     cap.oninput=()=>{capacity.checked=false;dout.replaceChildren()};extra.oninput=()=>{coverage.checked=false;dout.replaceChildren()};
     dteams.push({key:k,pick,cap,extra,compatible,coverage,capacity});
    }
   }
   dmodel.onchange=()=>{for(const t of dteams)t.compatible.checked=false;dout.replaceChildren()};for(const f of [dqty,ddue,dfinish])f.oninput=()=>dout.replaceChildren();
   btn('Atualizar modelos e locais',distribute,loadDistribution);
   btn('Comparar e distribuir pedido',distribute,()=>{
    dout.replaceChildren();if(!active())return;
    const n=v=>/^\d+$/.test(String(v).trim())?Number(v):NaN,source=typeof db!=='undefined'?db:window.db;
    const v=api.distributeFactionOrder(source,{productId:dmodel.value,pieces:n(dqty.value),start:start.value,asOf:today(),dueDate:ddue.value,finishBufferDays:n(dfinish.value),bufferPercent:Number(buffer.value),weeks:Number(horizon.value),closedDates:closed.value.split(',').map(x=>x.trim()).filter(Boolean),teams:dteams.filter(t=>t.pick.checked).map(t=>({teamId:t.key,weeklyCapacity:n(t.cap.value),additionalCommitted:n(t.extra.value),compatibilityConfirmed:t.compatible.checked,coverageConfirmed:t.coverage.checked,capacityConfirmed:t.capacity.checked}))},active());
    if(v.state!=='local-distribution-scenario'){el('p','Confira modelo, quantidade, datas (início a partir de hoje), locais e parâmetros.',dout);return}
    el('h4','Distribuição hipotética: '+fmt(v.allocated)+' de '+fmt(v.pieces)+' pç',dout);
    el('p','Sem alocação: '+fmt(v.unallocated)+' pç · referência de entrega '+(v.referenceDelivery||'não disponível')+' · reserva '+v.finishBufferDays+' dias corridos.',dout);
    if(v.partial)el('p','Simulação parcial: existem locais não elegíveis ou peças sem alocação. Não prometa o prazo.',dout);
    for(const a of v.allocations)el('p',a.teamName+' · '+fmt(a.pieces)+' pç · início livre '+a.firstFree+' · retorno de referência '+a.referenceReturn+' · '+a.sampleCount+' lotes históricos comparáveis',dout);
    const reasons={'fila-indisponivel':'Fila indisponível','modelo-nao-confirmado':'Compatibilidade não conferida','fila-ou-capacidade-a-conferir':'Fila/capacidade a conferir','sem-capacidade-ate-prazo':'Sem capacidade até o prazo','sem-faixa-historica-e-capacidade-compativeis':'Sem quantidade histórica e capacidade compatíveis'};
    const detail=el('details','',dout);el('summary','Por que cada local foi considerado ou excluído',detail);for(const t of v.teams){el('p',t.teamName+' · '+(t.reason?reasons[t.reason]||t.reason:t.ranges.map(r=>r.min+'–'+r.max+' pç ('+r.days+' dias)').join(' · ')),detail);if(t.queue?.issues?.length)el('p',t.queue.issues.length+' ocorrências na fila a conferir',detail)}
    el('p','Histórico com '+v.historyIssues+' ocorrências a conferir. Referência, não garantia de retorno ou entrega. Nenhuma alteração gravada.',dout);
   });loadDistribution();

   const learning=el('details','',stages);el('summary','Precisão das previsões e aprendizagem histórica',learning);
   el('p','Reconstrói previsões para lotes já concluídos, usando somente os retornos conhecidos antes de cada envio. Não é histórico de previsões salvas. Sem quatro lotes anteriores comparáveis não calcula prazo; sem quatro erros anteriores resolvidos não testa reserva adicional.',learning);
   const learnSearch=field('Buscar modelo ou facção','search','',learning),learnOut=el('div','',learning);let learnData=null,learnOffset=0;
   function drawLearning(){
    learnOut.replaceChildren();if(!active()||learnData?.state!=='local-forecast-backtest')return;
    const s=learnData.summary,show=n=>n===null?'Sem amostra suficiente':String(n);
    el('h4','Avaliação retrospectiva — últimas '+learnData.windowDays+' dias',learnOut);
    el('p',s.evaluated+' lotes avaliados de '+s.eligibleLots+' reconciliados · '+s.insufficient+' sem histórico anterior suficiente · '+learnData.issues.length+' ocorrências na fonte.',learnOut);
    el('p','Dentro do prazo de referência: '+show(s.onTimePercent)+(s.onTimePercent===null?'':'%')+' · erro absoluto médio '+show(s.meanAbsoluteErrorDays)+(s.meanAbsoluteErrorDays===null?'':' dias')+' · atrasos '+s.lateCount,learnOut);
    el('p','Reserva adicional testada em '+s.calibratedEvaluated+' lotes: '+show(s.calibratedOnTimePercent)+(s.calibratedOnTimePercent===null?'':'% dentro da referência')+' · erro médio absoluto '+show(s.calibratedMeanAbsoluteErrorDays),learnOut);
    el('p','Percentuais dos dois métodos podem representar amostras diferentes. Não são garantia de desempenho futuro.',learnOut);
    const query=learnSearch.value.toLocaleLowerCase('pt-BR'),rows=learnData.rows.filter(r=>(r.productName+' '+r.teamName).toLocaleLowerCase('pt-BR').includes(query));
    for(const r of rows.slice(learnOffset,learnOffset+20)){
     const d=el('details','',learnOut);el('summary',r.teamName+' · '+r.productName+' · '+r.band+' pç · '+r.evaluated+' avaliações',d);
     el('p','Erro absoluto médio '+show(r.meanAbsoluteErrorDays)+' · erro assinado médio '+show(r.meanSignedErrorDays)+' · reserva candidata '+show(r.suggestedBufferDays)+(r.suggestedBufferDays===null?'':' dias')+' (não aplicada)',d);
     for(const a of r.records)el('p','Envio '+a.sentAt+' · referência '+a.predictedDate+' · retorno '+a.actualDate+' · erro '+a.errorDays+' dias · '+a.trainingCount+' lotes anteriores'+(a.calibratedDate?' · referência calibrada '+a.calibratedDate+' · erro '+a.calibratedErrorDays+' dias':''),d);
    }
    if(learnOffset>0)btn('Anterior',learnOut,()=>{learnOffset-=20;drawLearning()});if(learnOffset+20<rows.length)btn('Mais avaliações',learnOut,()=>{learnOffset+=20;drawLearning()});
    el('p','Nenhuma reserva ou previsão é aplicada automaticamente. Resultados dependem do histórico atualmente disponível, sem comprovação de cobertura integral.',learnOut);
   }
   btn('Avaliar precisão com os registros atuais',learning,()=>{
    if(!active())return;learnData=api.factionForecastBacktest(typeof db!=='undefined'?db:window.db,today(),active());learnOffset=0;drawLearning();if(learnData.state!=='local-forecast-backtest')el('p','Histórico indisponível.',learnOut);
   });learnSearch.oninput=()=>{learnOffset=0;drawLearning()};

   const journal=el('details','',stages);el('summary','Diário de previsões — registro e conferência',journal);
   el('p','Arquivo portátil de previsões originais e revisões. Não é armazenamento em nuvem: exporte depois de registrar e importe novamente em outra sessão. Não é prova de data de criação nem de autoria. Nenhum dado comercial será gravado.',journal);
   const jfile=el('input','',journal);jfile.type='file';jfile.accept='.json,application/json';
   const jpick=el('div','',journal),jout=el('div','',journal),jstatus=el('p','Nenhum diário carregado.',journal);let entries=[],openLots=[],chosen=new Set(),journalOffset=0;
   const journalSource=()=>typeof db!=='undefined'?db:window.db;
   function showJournal(v){
    jout.replaceChildren();if(!active())return;
    if(v.state!=='local-forecast-journal'){el('p','Diário não validado: '+v.state+'. O conteúdo anterior foi preservado.',jout);return}
    const s=v.summary;el('p',s.records+' previsões · '+s.lots+' lotes distintos · '+s.evaluated+' primeiras previsões avaliadas · '+(s.onTimePercent===null?'Sem precisão calculável':s.onTimePercent+'% dentro da referência')+' · erro absoluto médio '+(s.meanAbsoluteErrorDays===null?'indisponível':s.meanAbsoluteErrorDays+' dias'),jout);
    el('p',v.issues.length+' ocorrências a conferir. Resultados sem evidência na janela histórica atual permanecem sem avaliação.',jout);
    for(const e of v.rows.slice(-50).reverse())el('p','Lote '+e.lotId+' · registrado '+e.capturedAt+' · referência '+e.referenceDate+' · '+e.status+(e.actualDate?' · retorno '+e.actualDate+' · erro '+e.errorDays+' dias':''),jout);
    if(v.rows.length>50)el('p','Mostrando as 50 últimas previsões. O arquivo inclui todas.',jout);
   }
   function drawLots(){
    jpick.replaceChildren();if(!active())return;
    el('p',openLots.length+' lotes abertos conciliados · '+chosen.size+' selecionados',jpick);
    for(const o of openLots.slice(journalOffset,journalOffset+20)){
     const label=el('label',o.teamName+' · '+o.productName+' · '+o.remaining+' pç pendentes · '+o.sampleCount+' lotes históricos',jpick);label.style.display='block';
     const c=el('input','',label);c.type='checkbox';c.checked=chosen.has(o.recordId);c.onchange=()=>{if(c.checked)chosen.add(o.recordId);else chosen.delete(o.recordId)};
    }
    if(journalOffset>0)btn('Anterior',jpick,()=>{journalOffset-=20;drawLots()});if(journalOffset+20<openLots.length)btn('Mais lotes',jpick,()=>{journalOffset+=20;drawLots()});
   }
   btn('Consultar lotes abertos e atualizar resultados',journal,()=>{
    if(!active())return;const src=journalSource(),day=today(),h=api.factionLeadTimes(src,day,active());
    openLots=h.state==='local-leadtime-observation'?h.open:[];chosen.clear();journalOffset=0;drawLots();showJournal(api.forecastJournal(src,{asOf:day,mode:'inspect',entries},active()));
   });
   btn('Registrar referência dos lotes selecionados no diário',journal,()=>{
    if(!active())return;const v=api.forecastJournal(journalSource(),{asOf:today(),mode:'capture',entries,lotIds:[...chosen]},active());
    if(v.state==='local-forecast-journal'){entries=v.entries;jstatus.textContent=v.added+' previsões novas no diário em memória. Exporte para manter o registro.'}showJournal(v);
   });
   let importing=false;
   btn('Importar e unir arquivo ao diário',journal,async()=>{
    if(!active()||importing)return;const f=jfile.files?.[0];if(!f||f.size>10000000){jstatus.textContent='Selecione um arquivo JSON de até 10 MB.';return}
    importing=true;
    try{const x=JSON.parse(await f.text());if(!active())return;if(x?.format!=='hlgb-forecast-journal-v1'||!Array.isArray(x.entries))throw Error('format');
     const v=api.forecastJournal(journalSource(),{asOf:today(),mode:'inspect',entries:[...entries,...x.entries]},active());
     if(v.state==='local-forecast-journal'){entries=v.entries;jstatus.textContent=entries.length+' previsões no diário; exporte o arquivo unido.'}showJournal(v);
    }catch(_){if(active())jstatus.textContent='Arquivo inválido. Diário anterior preservado.'}finally{importing=false}
   });
   btn('Exportar diário completo (JSON)',journal,()=>{
    if(!active())return;const v=api.forecastJournal(journalSource(),{asOf:today(),mode:'inspect',entries},active());if(v.state!=='local-forecast-journal'||!v.entries.length){jstatus.textContent='Não há previsões válidas para exportar.';return}
    const url=URL.createObjectURL(new Blob([JSON.stringify({format:v.format,entries:v.entries},null,2)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download='hlgb-diario-previsoes-'+today()+'.json';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),15000);jstatus.textContent='Arquivo local solicitado. Confirme o download. Não foi enviado à nuvem.';
   });
   const stageOut=el('div','',stages),lines=s=>s.split(/\r?\n/).filter(x=>x.trim()).map(x=>x.split(';').map(v=>v.trim())),num=v=>/^\d+$/.test(String(v).trim())?Number(v):NaN;
   for(const r of stageRows){for(const f of [r.capacity,r.wip,r.hist,r.teams].filter(Boolean))f.oninput=()=>{if(f===r.wip)r.confirmed.checked=false;stageOut.replaceChildren()};r.confirmed.onchange=()=>stageOut.replaceChildren()}
   target.oninput=()=>stageOut.replaceChildren();
   btn('Calcular metas e gargalos por setor',stages,()=>{
    stageOut.replaceChildren();if(!active())return;
    const input={start:start.value,goal:num(target.value),bufferPercent:Number(buffer.value),closedDates:closed.value.split(',').map(x=>x.trim()).filter(Boolean),stages:stageRows.map(r=>({key:r.key,name:r.name,manualCapacity:r.capacity.value.trim()===''?null:num(r.capacity.value),initialWip:r.wip?num(r.wip.value):0,wipConfirmed:r.wip?r.confirmed.checked:true,history:lines(r.hist.value).map(a=>({week:a[0],pieces:a.length===2?num(a[1]):NaN,confirmed:true})),teams:lines(r.teams.value).map(a=>({key:a[0],name:a[0],capacity:a.length===2?num(a[1]):NaN}))}))};
    const v=api.productionStageGoals(input,active());
    if(v.state!=='local-stage-goals'){el('p','Confira datas, capacidades inteiras, semanas completas, estoque em processo e nomes de equipes únicos.',stageOut);return}
    el('p','Meta '+fmt(v.goal)+' pç · '+v.workdays+' dias úteis · entregas simuladas '+fmt(v.simulatedDeliveries)+' · diferença '+fmt(v.goalGap),stageOut);
    if(v.partial)el('p','Dados a conferir: '+v.issues.join(', '),stageOut);
    if(v.bottlenecks.length)el('p','Menor capacidade nominal: '+v.bottlenecks.map(x=>x.name+' ('+fmt(x.capacity)+' pç)').join(' · '),stageOut);
    for(const s of v.stages){const panel=el('details','',stageOut);el('summary',s.name+' · capacidade '+fmt(s.periodCapacity)+' · meta viável '+fmt(s.simulatedPieces),panel);
     el('p','Média histórica '+fmt(s.average)+' · '+s.sampleCount+' semanas · estoque inicial '+s.initialWip+' · pendente da meta '+fmt(s.remainingGoal)+' · estoque final '+fmt(s.endingWip),panel);
     for(const t of s.teamAllocations)el('p',t.name+' · meta '+t.pieces+' de '+t.capacity+' pç disponíveis',panel);
    }
    const daily=el('details','',stageOut);el('summary','Metas diárias por setor',daily);for(const d of v.days){el('strong',d.date,daily);for(const s of d.stages)el('p',v.stages.find(x=>x.key===s.key).name+' · '+s.pieces+' pç',daily)}
    el('p','Capacidades e históricos informados manualmente; não valida complexidade de modelos, rotas, estoque ou caixa. Nenhuma alteração gravada.',stageOut);
   });
   const days=el('details','',output);el('summary','Distribuição diária de produção (simulada)',days);for(const d of p.daily.filter(d=>d.assignments.length)){el('strong',d.date+' · '+d.allocated+' pç',days);for(const a of d.assignments)el('p',a.client+' · '+a.model+' · '+a.pieces+' pç',days)}
  }catch(_){el('p','Fonte da projeção indisponível. Nenhum prazo ou valor foi confirmado.',output)}
 });
 buildHistory();buildTerms();
}
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
  mountPlanner();
}
window.hlgbProjectionSetView=function(v){mode=v==='admin'?'admin':'team';try{localStorage.setItem(STORE,mode)}catch(e){};applyMode();if(mode==='team')renderTeam()};
try{mode=localStorage.getItem(STORE)==='admin'?'admin':'team'}catch(e){mode='team'}
const old=window.renderProjection;
if(typeof old==='function'&&!old.__hlgbTeamProjectionV1){
  const wrapped=function(){const out=old.apply(this,arguments);try{injectUI();applyMode();if(mode==='team')renderTeam()}catch(e){console.error('[HLGB projeção equipe]',e)}return out};
  wrapped.__hlgbTeamProjectionV1=true;wrapped.__original=old;window.renderProjection=wrapped;
}
window.hlgbProjectionTeam={baseRows,teamRows,prodProgress,cutterAndMissing,setMode:v=>window.hlgbProjectionSetView(v)};
function boot(){injectUI();applyMode();if(document.getElementById('projecao')?.classList.contains('active'))renderTeam()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
document.addEventListener('visibilitychange',()=>{if(document.hidden)clearPlanner();else mountPlanner()});window.addEventListener?.('hlgb:logout',clearPlanner);window.addEventListener?.('hlgb:authenticated',()=>{clearPlanner();mountPlanner()});
console.info('[HLGB] Projeção semanal: visão da equipe '+V+' carregada');
})();