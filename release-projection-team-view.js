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
 const output=el('div','',host);output.setAttribute('aria-live','polite');let hist=[],terms=new Map();
 function buildHistory(){
  histHost.replaceChildren();hist=[];coverage.checked=false;output.replaceChildren();if(!active()||!start.value)return;
  const base=Date.parse(start.value+'T00:00:00Z');if(!Number.isFinite(base))return;
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
  return {key,client,model:sid(item.name||'Produto'),dueDate:sid(item.date).slice(0,10),pieces:qty,amountCents:amount};
 })}
 function buildTerms(){if(!active())return;terms.clear();while(termHost.children.length>2)termHost.lastChild.remove();let clients=[];try{clients=[...new Set(getOrders().map(r=>r.client))].sort()}catch(_){return}
  for(const c of clients){const row=el('div','',termHost);el('strong',c,row);const select=el('select','',row);
   for(const [v,t] of [['unknown','Não conferido'],['cash','À vista na entrega (hipótese)'],['term','A prazo (hipótese)']]){const o=el('option',t,select);o.value=v}
   const days=field('Prazo em dias corridos','number','',row);days.min='1';days.max='365';select.onchange=days.oninput=()=>output.replaceChildren();terms.set(c,{select,days});
  }
 }
 start.onchange=buildHistory;for(const f of [goal,buffer,horizon,newPieces,closed])f.oninput=()=>output.replaceChildren();coverage.onchange=()=>output.replaceChildren();
 btn('Atualizar dados de pedidos e histórico',host,()=>{buildHistory();buildTerms()});
 btn('Simular capacidade, entregas e recebimentos',host,()=>{
  output.replaceChildren();if(!active())return;
  try{
   const orders=getOrders().map(o=>{const t=terms.get(o.client);return {...o,paymentMode:t?.select.value||'unknown',paymentDays:Number(t?.days.value||0)}});
   const missing=orders.filter(o=>!o.dueDate||!o.key).length;
   const p=api.deliveryCapacityPlan({start:start.value,weeks:Number(horizon.value),weeklyGoal:goal.value===''?null:Number(goal.value),bufferPercent:Number(buffer.value),newPieces:Number(newPieces.value),closedDates:closed.value.split(',').map(x=>x.trim()).filter(Boolean),coverageConfirmed:coverage.checked&&missing===0,history:hist.map(h=>({week:h.week,pieces:Number(h.pieces.value),confirmed:h.check.checked})),orders},true);
   if(p.state!=='local-capacity-simulation'){el('p','Confira datas, metas, histórico e limites da simulação.',output);return}
   const fmt=n=>n===null?'Não confirmado':n.toLocaleString('pt-BR');
   el('h3','Capacidade semanal e carteira',output);el('p','Semanas conferidas: '+p.sampleCount+' · Média entregue: '+fmt(p.average)+' · Referência conservadora: '+fmt(p.conservative)+' · Meta após reserva: '+fmt(p.weeklyTarget)+' peças/semana.',output);
   el('p','Peças atrasadas na carteira: '+fmt(p.overdue)+' · Fora do prazo na simulação: '+fmt(p.late)+' · Não alocadas no horizonte: '+fmt(p.unallocated),output);
   if(p.issues.length||missing)el('p','Dados a conferir: '+p.issues.join(', ')+' · '+missing+' itens sem data ou identificação; não prometa prazo com carteira incompleta.',output);
   if(p.newPieces)el('p','Novo pedido: '+fmt(p.newPieces)+' peças · primeira conclusão hipotética '+(p.firstAvailable||'não cabe no horizonte')+' · '+p.unplacedNewPieces+' ainda sem capacidade. Não é data de entrega confirmada.',output);
   const wrap=el('div','',output);wrap.style.cssText='overflow:auto;max-width:100%';const table=el('table','',wrap),head=el('tr','',el('thead','',table));for(const h of ['Semana','Capacidade','Entregas previstas (pç)','Carga alocada','Vagas (pç)','À vista*','A prazo*','Pç sem condição'])el('th',h,head);
   const body=el('tbody','',table);for(const w of p.weeks){const tr=el('tr','',body);for(const v of [w.start,fmt(w.capacity),fmt(w.committed),fmt(w.allocated),fmt(w.free),money(w.cashAtDeliveryCents/100),money(w.termReceiptsCents/100),fmt(w.unknownPaymentPieces)])el('td',String(v),tr)}
   el('p','* Datas de recebimento simuladas a partir das entregas prometidas, não caixa líquido. Não inclui contas a pagar, saldo bancário, atrasos, parcelas ou valores já pagos.',output);
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
    const entries=ledger.value.split(/\r?\n/).filter(x=>x.trim()).map(line=>{const a=line.split(';').map(x=>x.trim());return {date:a[0],direction:a.length===4?({entrada:'in',saida:'out'})[a[1]]:'invalid',amountCents:cents(a[2]),reference:a[3]}});
    const additional=[...pick].filter(([,v])=>v.include).map(([key,v])=>({key,reference:v.reference.trim(),amountCents:cents(v.amount),notAlreadyIncluded:true,earlyAccepted:v.early}));
    const v=api.deliveryCashScenario(p,{start:start.value,openingCents:cents(balance.value),reserveCents:cents(reserve.value),delayDays:Number(delay.value),entries,additional,coverageConfirmed:checked.checked},active());
    if(v.state!=='local-cash-scenario'){el('p','Confira saldo, datas, referências únicas, valores e pedidos escolhidos. Recebimento adicional não pode superar o valor do pedido.',cashOut);return}
    const f=n=>money(n/100);
    el('p',v.partial?'Cenário parcial: '+v.issues.join(', '):'Cenário informado e revisado, ainda sem conciliação automática.',cashOut);
    for(const [title,s] of [['Somente compromissos informados',v.baseline],['Com entregas planejadas',v.planned],['Com antecipações aceitas',v.early],['Com atraso de recebimentos',v.stress]]){el('h4',title,cashOut);el('p','Primeiro dia abaixo da reserva: '+(s.firstGap||'nenhum nos 91 dias')+' · necessidade máxima '+f(s.maximumGapCents)+' · menor saldo '+f(s.minimumCents)+(s.outside?' · '+s.outside+' movimentos fora do período':''),cashOut)}
    for(const o of v.opportunities)el('p',o.client+' · '+o.model+' · '+f(o.amountCents)+' · '+o.normalReceipt+' → '+o.earlyReceipt+(o.requiresCustomerAcceptance?' · confirmar aceite antes de antecipar':' · aceite informado'),cashOut);
    const wrap=el('div','',cashOut);wrap.style.cssText='overflow:auto;max-width:100%';const table=el('table','',wrap),head=el('tr','',el('thead','',table));for(const h of ['Semana','Entradas planejadas','Saídas','Saldo planejado','Saldo antecipado','Saldo com atraso'])el('th',h,head);
    const body=el('tbody','',table);v.planned.weeks.forEach((w,i)=>{const tr=el('tr','',body);for(const x of [w.start,f(w.incomingCents),f(w.outgoingCents),f(w.closingCents),f(v.early.weeks[i].closingCents),f(v.stress.weeks[i].closingCents)])el('td',x,tr)});
    el('p','Não usar como confirmação de caixa disponível. Nenhum pedido, título ou data foi modificado.',cashOut);
   });

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