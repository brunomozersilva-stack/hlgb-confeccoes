'use strict';
(function(root,api){if(typeof module==='object'&&module.exports){module.exports=api;return}if(!root||root.HLGBEvidenceQuery9655)return;root.HLGBEvidenceQuery9655=api;
const actor=()=>{try{return String(typeof cloudUser!=='undefined'?cloudUser?.id||'':typeof currentUser==='function'?currentUser()?.id||'':'')}catch(_){return ''}};
const auth=()=>root.__HLGB_AUTH_READY===true&&!!actor(),can=p=>{try{return typeof canOpenPage==='function'&&canOpenPage(p)===true}catch(_){return false}};
const read=k=>{const d=typeof db!=='undefined'?db:root.db;return Array.isArray(d?.[k])?d[k]:null};
const today=()=>{const p=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());const v=k=>p.find(x=>x.type===k)?.value;return v('year')+'-'+v('month')+'-'+v('day')};
const deps={auth,can,read,today,get productApi(){return root.HLGBProductHistory9652},get planningApi(){return root.HLGBProductionPlanning9661},
 settlement:(kind,filter)=>root.HLGBSettlementHistoryView9654?.read({auth,can,rows:read,manualGroups:()=>root.hlgbFactionManual9566?.receiptGroups?.()??null,notes:()=>root.hlgbNotesReceivables9564?.allNotes?.()??null,inspect:(ctx,f)=>root.HLGBSettlementHistory9653.inspect(ctx,f)},kind,filter),
 finance:opt=>root.HLGBLivePersonnelFinance9656?.finance({auth,can,read,financeApi:()=>root.HLGBHubIntelligenceAdapter9633,paidDateApi:()=>root.hlgbHubPayrollPaidDate9515},opt),
 weeklySummary:x=>root.HLGBLivePersonnelFinance9656?.weeklySummary(x)
};
const boundInputs=new WeakSet();
const scopeStamp=()=>['pedidos','corte','producao','produtos','materiais','faccoes','pagamentosFaccoes','notas','financeiro','folhaPagamento','hubFinanceiro'].map(p=>can(p)?'1':'0').join('');
function clear(){document.getElementById('hlgbEvidenceQuery9655')?.remove()}
function mount(){
 const input=document.getElementById('hlgbAssistantInput'),existing=document.getElementById('hlgbEvidenceQuery9655');
 if(!input||!auth()){clear();return}
 if(existing&&existing.dataset.actor===actor()&&existing.dataset.scope===scopeStamp())return;clear();
 const host=document.createElement('section');host.id='hlgbEvidenceQuery9655';host.className='panel';host.dataset.actor=actor();host.dataset.scope=scopeStamp();host.style.cssText='max-width:100%;min-width:0;overflow-wrap:anywhere';
 const active=()=>host.isConnected&&input.isConnected&&auth()&&actor()===host.dataset.actor&&scopeStamp()===host.dataset.scope;
 const b=document.createElement('button');b.type='button';b.className='secondary';b.textContent='Consulta com evidências';const out=document.createElement('div');out.setAttribute('aria-live','polite');out.dataset.evidenceOutput='1';
 const help=document.createElement('details'),summary=document.createElement('summary');summary.textContent='Exemplos de consultas';help.appendChild(summary);
 for(const [label,query] of [['Andamento de pedido','pedido 125'],['Histórico de modelo','histórico produto Camisola'],['Matéria-prima','material malha'],['Acertos de facção','acertos facção Roseli'],['Notas de cliente','acertos cliente NOME'],['Folha paga','acertos funcionário NOME'],['Previsão semanal','financeiro semana'],['Histórico produtivo','produção histórico'],['Resumo gerencial','resumo operação'],['Carteira de pedidos','carteira pedidos']]){
  const btn=document.createElement('button');btn.type='button';btn.className='secondary';btn.style.cssText='max-width:100%;white-space:normal';btn.textContent=label;btn.onclick=()=>{if(active()){input.value=query;out.replaceChildren();input.focus()}};help.appendChild(btn)
 }
 host.append(b,help,out);input.closest('.hlgb-assistant-input')?.insertAdjacentElement('afterend',host);if(!host.isConnected)input.insertAdjacentElement('afterend',host);
 b.onclick=()=>{out.replaceChildren();if(!active())return;const x=api.ask(input.value,deps);if(!active())return;const p=document.createElement('p');p.textContent=x.message;out.appendChild(p);for(const row of x.rows){const item=document.createElement('p');item.textContent=row.label+' · '+row.detail+' · Origem: '+row.source+' / '+row.id;out.appendChild(item)}};
 // Manual, ephemeral scenario; no local storage or database writes.
 if(['pedidos','corte','producao','faccoes','produtos','hubFinanceiro','folhaPagamento'].every(can)){
  const details=document.createElement('details'),heading=document.createElement('summary');heading.textContent='Simular novo pedido — prazo e caixa';details.appendChild(heading);
  const info=document.createElement('p');info.textContent='Cenário manual de até 13 semanas. Informe capacidade de saída final, carteira restante e caixa revisados; não é aceite nem promessa de entrega.';details.appendChild(info);
  const fields=Object.create(null);
  const field=(key,label,type,placeholder)=>{const wrap=document.createElement('label');wrap.style.cssText='display:block;margin:6px 0;min-width:0';const title=document.createElement('span');title.textContent=label;const el=document.createElement(type==='textarea'?'textarea':'input');if(type!=='textarea')el.type=type;el.style.cssText='display:block;width:100%;max-width:100%;box-sizing:border-box';if(placeholder)el.placeholder=placeholder;wrap.append(title,el);details.appendChild(wrap);fields[key]=el;return el};
  field('weeklyGoal','Capacidade semanal de saída final (peças)','text','1000');
  field('buffer','Margem de segurança (%)','text','10');
  field('pieces','Peças do novo pedido','text','500');
  field('dueDate','Data solicitada','date');
  field('receipt','Valor total a receber (R$)','text','5000,00');
  field('paymentDays','Prazo em dias corridos após entrega prevista (0 = à vista)','text','0');
  field('cost','Custo adicional total estimado (R$)','text','3000,00');
  field('costDate','Data de pagamento do custo estimado','date');
  field('opening','Saldo inicial de caixa revisado (R$)','text','10000,00');
  field('reserve','Reserva mínima desejada (R$)','text','2000,00');
  field('delay','Atraso adicional de recebimentos no cenário de estresse (dias)','text','14');
  field('queue','Carteira restante: AAAA-MM-DD | peças | cliente | prazo em dias (0 à vista; ? desconhecido). Também aceita só data | peças. Vazio somente se não houver.','textarea','2026-12-04 | 300 | Cliente A | 0');
  field('cash','Compromissos financeiros existentes: AAAA-MM-DD | entrada ou saída | valor em R$ (vazio somente se não houver)','textarea','2026-12-04 | saída | 2000,00');
  field('closed','Feriados e dias sem expediente: uma data AAAA-MM-DD por linha; sábados e domingos já excluídos','textarea','2026-12-25');
  const check=document.createElement('input');check.type='checkbox';const checkLabel=document.createElement('label');checkLabel.append(check,document.createTextNode(' Revisei as premissas; custo e recebimento do novo pedido não constam dos compromissos existentes.'));details.appendChild(checkLabel);
  const submit=document.createElement('button');submit.type='button';submit.className='secondary';submit.textContent='Calcular cenário';const answer=document.createElement('div');answer.setAttribute('aria-live','polite');details.append(submit,answer);host.appendChild(details);
  const invalidate=()=>{answer.replaceChildren();check.checked=false};for(const el of Object.values(fields))el.addEventListener('input',invalidate);check.addEventListener('change',()=>answer.replaceChildren());
  submit.onclick=()=>{answer.replaceChildren();if(!active())return;const raw=Object.fromEntries(Object.entries(fields).map(([k,v])=>[k,v.value]));const x=api.simulateOrder({...raw,reviewed:check.checked},deps);if(!active())return;const p=document.createElement('p');p.textContent=x.message;answer.appendChild(p);for(const row of x.rows){const line=document.createElement('p');line.textContent=row.label+' · '+row.detail;answer.appendChild(line)}};
 }
 if(['produtos','producao','faccoes'].every(can)){
  const details=document.createElement('details'),summary=document.createElement('summary');summary.textContent='Distribuir produção entre facções';details.appendChild(summary);
  const note=document.createElement('p');note.textContent='Sugestão por histórico local do mesmo modelo e fila atual. Selecione apenas equipes externas compatíveis e revise suas capacidades e compromissos.';details.appendChild(note);
  const field=(parent,label,type)=>{const wrap=document.createElement('label'),title=document.createElement('span'),el=document.createElement(type==='select'?'select':type==='textarea'?'textarea':'input');wrap.style.cssText='display:block;margin:6px 0;min-width:0';title.textContent=label;if(type!=='select'&&type!=='textarea')el.type=type;el.style.cssText='display:block;width:100%;max-width:100%;box-sizing:border-box';wrap.append(title,el);parent.appendChild(wrap);return el};
  const search=field(details,'Pesquisar modelo (nome, código ou ID)','text'),load=document.createElement('button');load.type='button';load.className='secondary';load.textContent='Buscar modelo e equipes';details.appendChild(load);
  const product=field(details,'Modelo','select'),pieces=field(details,'Quantidade de peças','number'),due=field(details,'Data de entrega ao cliente','date'),finish=field(details,'Dias corridos reservados para acabamento e expedição','number'),buffer=field(details,'Margem de segurança (%)','number'),closed=field(details,'Feriados e dias sem expediente (uma data AAAA-MM-DD por linha)','textarea');finish.value='2';buffer.value='10';
  const teamsHost=document.createElement('div'),status=document.createElement('p');status.setAttribute('aria-live','polite');details.append(status,teamsHost);
  const confirm=document.createElement('input');confirm.type='checkbox';const label=document.createElement('label');label.append(confirm,document.createTextNode(' Revisei compatibilidade, capacidade, fila e compromissos adicionais das equipes selecionadas.'));details.appendChild(label);
  const submit=document.createElement('button');submit.type='button';submit.className='secondary';submit.textContent='Calcular distribuição';const answer=document.createElement('div');answer.setAttribute('aria-live','polite');details.append(submit,answer);host.appendChild(details);
  let controls=[];const invalidate=()=>{confirm.checked=false;answer.replaceChildren()};for(const el of [product,pieces,due,finish,buffer,closed])el.addEventListener('input',invalidate);confirm.addEventListener('change',()=>answer.replaceChildren());
  search.addEventListener('input',()=>{invalidate();product.replaceChildren();teamsHost.replaceChildren();controls=[];status.textContent='Busque novamente.'});
  load.onclick=()=>{invalidate();product.replaceChildren();teamsHost.replaceChildren();controls=[];if(!active())return;const x=api.distributionChoices(search.value,deps);if(!active())return;status.textContent=x.message;if(x.state!=='observed')return;
   const first=document.createElement('option');first.value='';first.textContent='Escolha o modelo';product.appendChild(first);for(const p of x.products){const o=document.createElement('option');o.value=p.id;o.textContent=p.name+' · '+p.id;product.appendChild(o)}
   for(const t of x.teams){const group=document.createElement('details'),title=document.createElement('summary');title.textContent=t.name+' · '+t.id;group.appendChild(title);const choose=document.createElement('input');choose.type='checkbox';const tag=document.createElement('label');tag.append(choose,document.createTextNode(' Incluir: equipe externa compatível com o modelo'));group.appendChild(tag);const capacity=field(group,'Capacidade semanal revisada (peças)','number'),extra=field(group,'Compromissos extras ainda não incluídos na fila (peças)','number');extra.value='0';for(const el of [choose,capacity,extra])el.addEventListener('input',invalidate);teamsHost.appendChild(group);controls.push({id:t.id,choose,capacity,extra})}
  };
  submit.onclick=()=>{answer.replaceChildren();if(!active())return;const x=api.simulateDistribution({productId:product.value,pieces:pieces.value,dueDate:due.value,finish:finish.value,buffer:buffer.value,closed:closed.value,reviewed:confirm.checked,teams:controls.filter(t=>t.choose.checked).map(t=>({id:t.id,capacity:t.capacity.value,extra:t.extra.value}))},deps);if(!active())return;const p=document.createElement('p');p.textContent=x.message;answer.appendChild(p);for(const row of x.rows){const line=document.createElement('p');line.textContent=row.label+' · '+row.detail;answer.appendChild(line)}};
 }
 if(!boundInputs.has(input)){boundInputs.add(input);input.addEventListener('input',()=>document.getElementById('hlgbEvidenceQuery9655')?.querySelector('[data-evidence-output]')?.replaceChildren(),{passive:true})}
}
if(typeof document!=='undefined'){document.addEventListener('click',()=>setTimeout(mount,0),true);document.addEventListener('focusin',mount);root.addEventListener?.('hlgb:logout',clear);root.addEventListener?.('hlgb:authenticated',()=>{clear();mount()});document.addEventListener('visibilitychange',()=>{clear();if(!document.hidden)mount()});}
})(typeof window!=='undefined'?window:null,(function engine(){
 const norm=s=>String(s??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim().replace(/\s+/g,' ');
 const sid=x=>typeof x==='string'||typeof x==='number'?String(x).trim():'';
 const live=x=>x&&!x.deletedAt&&!x.deleted_at&&!x.deleted&&!x._deleted;
 const result=(state,message,rows=[])=>({state,message,rows,canWrite:false,coverage:'local-only'});
 function operationOverview(deps,withFinance){
  const areas=['corte','producao','faccoes','produtos',...(withFinance?['hubFinanceiro','folhaPagamento']:[])],allowed=()=>deps.auth()===true&&areas.every(p=>deps.can(p)===true);
  if(!allowed())return result('forbidden','Consulta gerencial não autorizada para todos os módulos necessários.');
  const plan=deps.planningApi;if(typeof plan?.observedThroughput!=='function'||typeof deps.today!=='function')return result('unavailable','Histórico produtivo indisponível.');
  const today=deps.today();if(!allowed())return result('forbidden','Sessão ou acesso alterado.');
  if(typeof today!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(today)||!Number.isFinite(Date.parse(today+'T00:00:00Z'))||new Date(today+'T00:00:00Z').toISOString().slice(0,10)!==today)return result('unavailable','Data de referência inválida.');
  const data={};for(const key of ['cuts','factions','production','products','productionLocations']){if(!allowed())return result('forbidden','Sessão ou acesso alterado.');data[key]=deps.read(key);if(!allowed())return result('forbidden','Sessão ou acesso alterado.');if(!Array.isArray(data[key]))return result('unavailable','Fontes de produção incompletas.');}
  const x=plan.observedThroughput(data,today,true);if(!allowed())return result('forbidden','Sessão ou acesso alterado.');
  if(x?.state!=='local-observation'||!Array.isArray(x.weeks)||!Array.isArray(x.issues))return result('unavailable','Histórico produtivo não confirmado.');
  const fmt=n=>n.toLocaleString('pt-BR'),groups={cut:[],external:[],internal:[]},seen=new Set();
  const day=86400000,at=Date.parse(today+'T00:00:00Z'),end=at-((new Date(at).getUTCDay()+6)%7)*day,first=end-84*day;
  for(const z of x.weeks){const key=JSON.stringify([z?.source,z?.week]),d=Date.parse(z?.week+'T00:00:00Z');if(!Object.hasOwn(groups,z?.source)||typeof z.week!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(z.week)||!Number.isFinite(d)||new Date(d).toISOString().slice(0,10)!==z.week||d<first||d>=end||(d-first)%(7*day)!==0||!Number.isSafeInteger(z.pieces)||z.pieces<=0||seen.has(key))return result('unavailable','Semanas de produção inconsistentes.');seen.add(key);groups[z.source].push(z);}
  const labels={cut:'Corte',external:'Retornos de facções',internal:'Produção interna'},rows=[];
  for(const [stage,records] of Object.entries(groups)){const total=records.reduce((a,b)=>a+b.pieces,0);if(!Number.isSafeInteger(total))return result('unavailable','Limite de quantidade excedido.');rows.push({source:'observedThroughput',id:stage+':'+today,label:labels[stage],detail:records.length?fmt(total)+' peças registradas · média '+fmt(Math.round(total/records.length))+' por semana com registro ('+records.length+'/12 semanas)':'Sem semanas com registros válidos; não significa zero produção'});}
  let message='Últimas 12 semanas completas: '+x.issues.length+' ocorrência(s) de dados para revisar. Etapas separadas; não somar como peças entregues. Médias apenas das semanas com registro, não comprovam capacidade, expedição ou cobertura da nuvem.';
  if(withFinance){
   if(typeof deps.finance!=='function'||typeof deps.weeklySummary!=='function')return result('unavailable','Inteligência financeira indisponível.');
   const raw=deps.finance({asOf:today,targetDate:today,historyWeeks:8,receiptDelayDays:14});if(!allowed())return result('forbidden','Sessão ou acesso alterado.');
   const y=deps.weeklySummary(raw);if(!allowed())return result('forbidden','Sessão ou acesso alterado.');
   if(y?.state==='observed'&&[y.plannedInCents,y.plannedOutCents,y.plannedDifferenceCents].every(Number.isSafeInteger)&&y.plannedInCents>=0&&y.plannedOutCents>=0&&y.plannedInCents-y.plannedOutCents===y.plannedDifferenceCents){const money=n=>(n/100).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});rows.push({source:'hubFinanceEntries',id:today,label:'Financeiro da semana atual',detail:'Entradas previstas '+money(y.plannedInCents)+' · saídas previstas '+money(y.plannedOutCents)+' · diferença '+money(y.plannedDifferenceCents)});message+=' '+(y.plannedDifferenceCents<0?'Atenção: saídas previstas superam entradas previstas. ':'')+'Previsão local, não é saldo bancário nem autorização para aceitar pedidos.';}
   else {rows.push({source:'hubFinanceEntries',id:today,label:'Financeiro da semana atual',detail:'Dados insuficientes para uma previsão.'});message+=' Cobertura financeira insuficiente.';}
  }
  return allowed()?result('observed',message,rows):result('forbidden','Sessão ou acesso alterado.');
 }
 function priorityReview(planApi,options,baseline){
  if(!Array.isArray(options.orders)||!options.orders.length||baseline?.state!=='local-capacity-simulation')return [];
  const score=o=>o.paymentMode==='cash'?0:o.paymentMode==='term'?o.paymentDays:366;
  const rank=options.orders.slice().sort((a,b)=>a.dueDate.localeCompare(b.dueDate)||score(a)-score(b)||a.key.localeCompare(b.key));
  const alternativeOrders=rank.map((o,i)=>({...o,key:'priority-'+String(i).padStart(4,'0')}));
  const alternative=planApi.deliveryCapacityPlan({...options,orders:alternativeOrders},true);
  const old=new Map(baseline.orders.map(o=>[o.key,o])),next=new Map(alternative?.orders?.map(o=>[o.key,o])||[]);
  if(alternative?.state!=='local-capacity-simulation'||old.size!==rank.length||next.size!==rank.length)return [{source:'deliveryCapacityPlan',id:'priority',label:'Prioridade da carteira',detail:'Comparação indisponível.'}];
  const worsened=[],improved=[];
  for(const [i,o] of rank.entries()){
   const a=old.get(o.key),b=next.get(alternativeOrders[i].key);if(!a||!b||![a.remaining,b.remaining,a.latePieces,b.latePieces].every(Number.isSafeInteger))return [{source:'deliveryCapacityPlan',id:'priority',label:'Prioridade da carteira',detail:'Comparação inconsistente.'}];
   if(b.remaining>a.remaining||b.latePieces>a.latePieces)worsened.push(o.key);
   if(b.remaining<a.remaining||b.latePieces<a.latePieces)improved.push(o.key);
  }
  const unknown=rank.filter(o=>o.paymentMode==='unknown').length;
  const changed=rank.some((o,i)=>o.key!==options.orders.slice().sort((a,b)=>a.dueDate.localeCompare(b.dueDate)||a.key.localeCompare(b.key))[i].key);
  const rows=[{source:'deliveryCapacityPlan',id:'priority',label:'Prioridade por prazo e pagamento',detail:(worsened.length?'Não recomendar troca de ordem: '+worsened.length+' compromisso(s) teriam mais atraso ou saldo não alocado.':changed?'Alternativa sem aumento de peças atrasadas ou não alocadas por compromisso; revisar antes de alterar a fila.':'A ordem por prazo e pagamento coincide com a referência.')+' '+improved.length+' compromisso(s) melhorariam atraso ou saldo. '+unknown+' condição(ões) desconhecida(s). Comparação só dentro do mesmo prazo; sem valores de recebimento e sem alterar a simulação financeira.'}];
  for(const [i,o] of rank.slice(0,20).entries()){const b=next.get(alternativeOrders[i].key),condition=o.paymentMode==='cash'?'À vista':o.paymentMode==='term'?o.paymentDays+' dias':'Condição desconhecida';rows.push({source:'deliveryCapacityPlan',id:o.key,label:'Alternativa '+(i+1)+' · '+o.client,detail:o.dueDate+' · '+o.pieces+' peças · '+condition+' · conclusão '+(b.remaining?'não cabe no horizonte':b.lastWorkDate||'não informada')+' · '+b.latePieces+' peças após o prazo'});}
  if(rank.length>20)rows.push({source:'deliveryCapacityPlan',id:'priority-limit',label:'Mais compromissos',detail:(rank.length-20)+' não exibidos; todos considerados na comparação.'});
  return rows;
 }
 function simulateOrder(raw,deps){
  const areas=['pedidos','corte','producao','faccoes','produtos','hubFinanceiro','folhaPagamento'],allowed=()=>deps.auth()===true&&areas.every(p=>deps.can(p)===true);
  if(!allowed())return result('forbidden','Simulação não autorizada para todos os módulos necessários.');
  if(raw?.reviewed!==true)return result('unsupported','Revise e confirme as premissas antes de simular.');
  const date=v=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&Number.isFinite(Date.parse(v+'T00:00:00Z'))&&new Date(v+'T00:00:00Z').toISOString().slice(0,10)===v;
  const integer=(v,max)=>typeof v==='string'&&/^\d{1,8}$/.test(v.trim())&&Number(v)<=max?Number(v):null;
  const cents=v=>{if(typeof v!=='string'||!/^[-]?\d{1,9}(?:[.,]\d{1,2})?$/.test(v.trim()))return null;const n=Math.round(Number(v.replace(',','.'))*100);return Number.isSafeInteger(n)?n:null};
  const lines=v=>typeof v==='string'&&v.length<=50000?v.split(/\r?\n/).map(x=>x.trim()).filter(Boolean):null;
  try{
   const start=deps.today(),planApi=deps.planningApi;if(!allowed())return result('forbidden','Sessão ou acesso alterado.');
   if(!date(start)||typeof planApi?.deliveryCapacityPlan!=='function'||typeof planApi?.newOrderDecision!=='function')return result('unavailable','Planejador indisponível.');
   const weeklyGoal=integer(raw.weeklyGoal,10000000),pieces=integer(raw.pieces,10000000),bufferPercent=integer(raw.buffer,90),paymentDays=integer(raw.paymentDays,365),delayDays=integer(raw.delay,91),receiptCents=cents(raw.receipt),costCents=cents(raw.cost),openingCents=cents(raw.opening),reserveCents=cents(raw.reserve);
   const queue=lines(raw.queue),cash=lines(raw.cash),closedDates=lines(raw.closed);
   if(!weeklyGoal||!pieces||bufferPercent===null||paymentDays===null||delayDays===null||!receiptCents||receiptCents<0||costCents===null||costCents<0||openingCents===null||reserveCents===null||reserveCents<0||!date(raw.dueDate)||raw.dueDate<start||!date(raw.costDate)||raw.costDate<start||!queue||!cash||!closedDates||queue.length>500||cash.length>500||closedDates.length>366||closedDates.some(d=>!date(d)))return result('unsupported','Informe datas e valores válidos, sem separador de milhar. Confira todos os campos.');
   const D=86400000,at=Date.parse(start+'T00:00:00Z'),end=at-((new Date(at).getUTCDay()+6)%7)*D+90*D,cashEnd=at+90*D,endDate=new Date(end).toISOString().slice(0,10),cashEndDate=new Date(cashEnd).toISOString().slice(0,10);
   if(raw.dueDate>endDate||raw.costDate>cashEndDate)return result('unsupported','Prazo ou custo fora das 13 semanas simuladas.');
   const orders=[],entries=[];
   for(const [i,line] of queue.entries()){const a=line.split('|').map(x=>x.trim()),q=integer(a[1],10000000),days=a.length===4&&a[3]!=='?'?integer(a[3],365):null;if(![2,4].includes(a.length)||!date(a[0])||!q||a.length===4&&(!a[2]||a[2].length>120||(a[3]!=='?'&&days===null)))return result('unsupported','Carteira: confira linha '+(i+1)+'.');orders.push({key:'manual-queue-'+String(i).padStart(4,'0'),client:a[2]||'Compromisso '+(i+1),dueDate:a[0],pieces:q,paymentMode:days===null?'unknown':days===0?'cash':'term',paymentDays:days});}
   for(const [i,line] of cash.entries()){const a=line.split('|').map(x=>x.trim()),v=cents(a[2]),direction=norm(a[1])==='entrada'?'in':norm(a[1])==='saida'?'out':null;if(a.length!==3||!date(a[0])||a[0]<start||!direction||!v||v<0)return result('unsupported','Caixa: confira linha '+(i+1)+'.');entries.push({reference:'manual-cash-'+i,date:a[0],direction,amountCents:v});}
   if(!allowed())return result('forbidden','Sessão ou acesso alterado.');
   const options={start,asOf:start,weeks:13,weeklyGoal,bufferPercent,history:[],orders,closedDates,coverageConfirmed:false,newPieces:pieces};
   const plan=planApi.deliveryCapacityPlan(options,true);
   if(!allowed())return result('forbidden','Sessão ou acesso alterado.');
   const x=planApi.newOrderDecision(plan,{start,openingCents,reserveCents,delayDays,entries,reviewed:true,newCostsAndReceiptNotIncluded:true,proposal:{pieces,dueDate:raw.dueDate,receiptCents,paymentMode:paymentDays===0?'cash':'term',paymentDays,costs:[{reference:'manual-new-cost',date:raw.costDate,amountCents:costCents}]}},true);
   if(!allowed())return result('forbidden','Sessão ou acesso alterado.');
   if(x?.state!=='local-order-decision')return result('unavailable','Não foi possível calcular com estas premissas. Nenhum pedido foi gravado.');
   const fmt=n=>Number.isSafeInteger(n)?n.toLocaleString('pt-BR'):'Não confirmado',money=n=>Number.isSafeInteger(n)?(n/100).toLocaleString('pt-BR',{style:'currency',currency:'BRL'}):'Não confirmado',receiptDate=x.completion?new Date(Math.max(Date.parse(x.completion+'T00:00:00Z'),Date.parse(raw.dueDate+'T00:00:00Z'))+paymentDays*D).toISOString().slice(0,10):null;
   const rows=[{source:'deliveryCapacityPlan',id:start,label:'Capacidade semanal após margem',detail:fmt(plan.weeklyTarget)+' peças; carteira informada tem '+fmt(plan.late)+' peças em atraso simulado'},{source:'newOrderDecision',id:start,label:'Prazo simulado',detail:(x.completion||'Não cabe no horizonte')+' · '+(x.withinDue?'Cabe na data solicitada':'Não cabe na data solicitada')+' · saldo de capacidade até o prazo '+fmt(x.freeByDue)+' peças'},{source:'newOrderDecision',id:start,label:'Condição de recebimento',detail:(paymentDays===0?'À vista':paymentDays+' dias')+' · '+(receiptDate?(receiptDate>cashEndDate?receiptDate+' (fora do horizonte financeiro)':receiptDate):'Recebimento não incluído')},{source:'newOrderDecision',id:start,label:'Caixa sem novo pedido',detail:'Maior falta de reserva '+money(x.baseline.maximumGapCents)},{source:'newOrderDecision',id:start,label:'Caixa com novo pedido',detail:'Maior falta de reserva '+money(x.withOrder.maximumGapCents)+' · variação '+money(x.extraReserveGapCents)},{source:'newOrderDecision',id:start,label:'Estresse de recebimentos',detail:'Maior falta de reserva '+money(x.withOrderStress.maximumGapCents)+' · variação '+money(x.extraStressGapCents)},{source:'newOrderDecision',id:start,label:'Contribuição indicativa',detail:money(x.indicativeContributionCents)+' antes de custos não informados; não é lucro líquido'}];
   if(x.withOrder.outside||x.withOrderStress.outside)rows.push({source:'newOrderDecision',id:start,label:'Atenção',detail:'Há lançamentos fora do horizonte em um ou mais cenários.'});
   const priorities=priorityReview(planApi,options,plan);if(!allowed())return result('forbidden','Sessão ou acesso alterado.');rows.push(...priorities);
   return result('observed','Cenário manual, carteira e caixa não sincronizados nem confirmados; não autoriza aceite. '+(!x.withinDue?'Revisar prazo ou quantidade. ':'')+(x.extraReserveGapCents>0||x.extraStressGapCents>0?'Revisar risco de caixa e condição de pagamento. ':'')+'Sem gravação.',rows);
  }catch(_){return result('unavailable','Não foi possível conferir a simulação. Nenhuma alteração foi feita.')}
 }
 const distributionAllowed=deps=>deps.auth()===true&&['produtos','producao','faccoes'].every(p=>deps.can(p)===true);
 function distributionChoices(query,deps){
  const no=(state,message)=>({...result(state,message),products:[],teams:[]});
  if(!distributionAllowed(deps))return no('forbidden','Consulta não autorizada.');
  if(typeof query!=='string'||!query.trim()||query.length>120)return no('unsupported','Informe nome, código ou ID do modelo.');
  try{
   const products=deps.read('products');if(!distributionAllowed(deps))return no('forbidden','Sessão alterada.');
   const locations=deps.read('productionLocations');if(!distributionAllowed(deps))return no('forbidden','Sessão alterada.');
   if(!Array.isArray(products)||!Array.isArray(locations))return no('unavailable','Cadastro local indisponível.');
   const unique=rows=>{const counts=new Map();for(const r of rows.filter(live)){const k=sid(r.id);counts.set(k,(counts.get(k)||0)+1)}return rows.filter(r=>live(r)&&sid(r.id)&&counts.get(sid(r.id))===1)};
   const q=norm(query),found=unique(products).filter(r=>[r.id,r.name,r.code].some(v=>norm(v).includes(q))),teams=unique(locations);
   if(!found.length)return no('empty','Modelo não localizado no cadastro local.');
   if(found.length>50)return no('unsupported','Mais de 50 modelos. Refine a pesquisa.');
   if(teams.length>100)return no('unavailable','Mais de 100 destinos. Revise o cadastro antes de simular.');
   const shape=r=>({id:sid(r.id),name:sid(r.name)||sid(r.id)}),sort=(a,b)=>a.name.localeCompare(b.name,'pt-BR')||a.id.localeCompare(b.id);
   return {...no('observed','Selecione o modelo e somente destinos externos compatíveis; cadastro local não confirma especialidade.'),products:found.map(shape).sort(sort),teams:teams.map(shape).sort(sort)};
  }catch(_){return no('unavailable','Não foi possível conferir os cadastros.')}
 }
 function simulateDistribution(raw,deps){
  if(!distributionAllowed(deps))return result('forbidden','Simulação de facções não autorizada.');
  if(raw?.reviewed!==true)return result('unsupported','Confirme as capacidades, compatibilidade e carteira das equipes.');
  const int=(v,max)=>typeof v==='string'&&/^\d{1,8}$/.test(v.trim())&&Number(v)<=max?Number(v):null;
  const date=v=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&Number.isFinite(Date.parse(v+'T00:00:00Z'))&&new Date(v+'T00:00:00Z').toISOString().slice(0,10)===v;
  try{
   const today=deps.today(),api=deps.planningApi;if(!distributionAllowed(deps))return result('forbidden','Sessão alterada.');
   const pieces=int(raw.pieces,1000000),finish=int(raw.finish,90),buffer=int(raw.buffer,90),pid=sid(raw.productId),closed=typeof raw.closed==='string'&&raw.closed.length<=5000?raw.closed.split(/\r?\n/).map(x=>x.trim()).filter(Boolean):null;
   if(!date(today)||typeof api?.distributeFactionOrder!=='function')return result('unavailable','Planejador indisponível.');
   const D=86400000,at=Date.parse(today+'T00:00:00Z'),end=new Date(at-((new Date(at).getUTCDay()+6)%7)*D+90*D).toISOString().slice(0,10);
   if(!pid||!pieces||finish===null||buffer===null||!date(raw.dueDate)||raw.dueDate<today||raw.dueDate>end||!closed||closed.length>366||closed.some(d=>!date(d))||!Array.isArray(raw.teams)||!raw.teams.length||raw.teams.length>20)return result('unsupported','Confira modelo, quantidade, prazo de até 13 semanas, margens e equipes (máximo 20).');
   const teams=[],seen=new Set();for(const t of raw.teams){const key=sid(t?.id),cap=int(t?.capacity,10000000),extra=int(t?.extra,10000000);if(!key||seen.has(key)||!cap||extra===null)return result('unsupported','Equipe duplicada ou capacidade/compromisso inválido.');seen.add(key);teams.push({teamId:key,weeklyCapacity:cap,additionalCommitted:extra,compatibilityConfirmed:true,coverageConfirmed:true,capacityConfirmed:true})}
   const data={};for(const k of ['products','productionLocations','factions','production']){if(!distributionAllowed(deps))return result('forbidden','Sessão alterada.');data[k]=deps.read(k);if(!distributionAllowed(deps))return result('forbidden','Sessão alterada.');if(!Array.isArray(data[k]))return result('unavailable','Fontes de produção incompletas.')}
   if(data.products.filter(p=>live(p)&&sid(p.id)===pid).length!==1||teams.some(t=>data.productionLocations.filter(p=>live(p)&&sid(p.id)===t.teamId).length!==1))return result('unavailable','Modelo ou equipe não identificado unicamente. Atualize a pesquisa.');
   const x=api.distributeFactionOrder(data,{productId:pid,pieces,start:today,asOf:today,dueDate:raw.dueDate,finishBufferDays:finish,bufferPercent:buffer,weeks:13,closedDates:closed,teams},true);
   if(!distributionAllowed(deps))return result('forbidden','Sessão alterada.');
   if(x?.state!=='local-distribution-scenario'||!Array.isArray(x.allocations)||!Array.isArray(x.teams)||!Number.isSafeInteger(x.allocated)||!Number.isSafeInteger(x.unallocated)||x.allocated<0||x.unallocated<0||x.allocated+x.unallocated!==pieces||x.allocations.some(a=>!seen.has(a.teamId)||!Number.isSafeInteger(a.pieces)||a.pieces<=0||!date(a.deliveryReference)||a.deliveryReference>raw.dueDate)||new Set(x.allocations.map(a=>a.teamId)).size!==x.allocations.length||x.allocations.reduce((n,a)=>n+a.pieces,0)!==x.allocated)return result('unavailable','Distribuição não confirmada.');
   const fmt=n=>n.toLocaleString('pt-BR'),rows=[],reasons={'fila-indisponivel':'Fila indisponível','modelo-nao-confirmado':'Compatibilidade não confirmada','fila-ou-capacidade-a-conferir':'Fila ou capacidade com lacunas','sem-capacidade-ate-prazo':'Sem capacidade até o prazo','sem-faixa-historica-e-capacidade-compativeis':'Histórico comparável insuficiente ou capacidade incompatível'};
   for(const a of x.allocations)rows.push({source:'distributeFactionOrder',id:a.teamId,label:a.teamName,detail:fmt(a.pieces)+' peças · livre a partir de '+a.firstFree+' · retorno de referência '+a.referenceReturn+' · entrega de referência '+a.deliveryReference+' · '+a.sampleCount+' lotes históricos'});
   for(const t of x.teams){const a=x.allocations.find(z=>z.teamId===t.teamId);rows.push({source:'factionQueueScenario',id:t.teamId,label:'Fila: '+t.teamName,detail:(Number.isSafeInteger(t.queue?.observedPieces)?fmt(t.queue.observedPieces)+' peças observadas na fila · ':'')+(t.reason?reasons[t.reason]||'Conferir dados':a?'Equipe considerada na divisão':'Elegível, sem alocação nesta combinação')});}
   return result('observed',fmt(x.allocated)+' de '+fmt(pieces)+' peças sugeridas; '+fmt(x.unallocated)+' sem distribuição. '+(x.referenceDelivery?'Última entrega de referência: '+x.referenceDelivery+'. ':'')+'Ocorrências no histórico para revisão: '+x.historyIssues+'. Cenário local, capacidades e compatibilidade declaradas; não é promessa de entrega nem movimentação de estoque.',rows);
  }catch(_){return result('unavailable','Não foi possível conferir a distribuição. Nenhuma alteração foi feita.')}
 }
 function portfolio(deps){
  const allowed=()=>deps.auth()===true&&['pedidos','produtos','notas'].every(p=>deps.can(p)===true);
  if(!allowed())return result('forbidden','Consulta de carteira não autorizada.');
  const data={};for(const k of ['orders','products','projectionInvoices']){if(!allowed())return result('forbidden','Sessão alterada.');data[k]=deps.read(k);if(!allowed())return result('forbidden','Sessão alterada.');if(!Array.isArray(data[k]))return result('unavailable','Carteira ou notas locais indisponíveis.');}
  const index=rows=>{const m=new Map();for(const r of rows.filter(live)){const k=sid(r.id);if(k)m.set(k,m.has(k)?null:r)}return m};
  const validQty=v=>typeof v==='number'&&Number.isSafeInteger(v)&&v>=0&&v<=10000000;
  const date=v=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&Number.isFinite(Date.parse(v+'T00:00:00Z'))&&new Date(v+'T00:00:00Z').toISOString().slice(0,10)===v;
  const terminal=o=>/^(?:entregue|cancelad[oa]|finalizad[oa]|aguardando nota|faturad[oa])$/.test(norm(o.status)),orders=index(data.orders),products=index(data.products),notes=index(data.projectionInvoices),byPair=new Map(),uncertainOrders=new Set();let unlinkedNotes=0;
  const key=(o,p)=>JSON.stringify([o,p]);
  for(const n of data.projectionInvoices.filter(live)){
   if(/cancelad|estornad|excluid/.test(norm(n.status)))continue;
   if(!Array.isArray(n.items)||!n.items.length){if(sid(n.orderId))uncertainOrders.add(sid(n.orderId));else unlinkedNotes++;continue}
   for(const item of n.items){const oid=sid(item?.orderId||n.orderId),pid=sid(item?.productId),nid=sid(n.id);
    if(!oid||!pid){if(oid)uncertainOrders.add(oid);else unlinkedNotes++;continue}
    const k=key(oid,pid),list=byPair.get(k)||[];list.push({nid,qty:item?.qty,valid:!!nid&&notes.get(nid)===n&&validQty(item?.qty)&&item.qty>0});byPair.set(k,list);
   }
  }
  const rows=[];let review=0,terminalCount=0,active=0,gradeErrors=0,contracted=0;
  const fmt=n=>n.toLocaleString('pt-BR');
  for(const [oid,o] of orders){
   if(!o){review++;rows.push({source:'orders',id:oid,label:'Pedido duplicado',detail:'Identidade ambígua; não somado.'});continue}
   if(terminal(o)){terminalCount++;continue}
   if(o.sourceOrderId||o.readyOrderId||o.fulfillmentByProduct){review++;rows.push({source:'orders',id:oid,label:'Pedido #'+sid(o.orderNumber||oid),detail:'Vínculo de desdobramento ou conclusão a conferir; não somado.'});continue}
   active++;
   const grade=o.grade,groups=new Map(),cells=new Set();let bad=!Array.isArray(grade)||!grade.length;
   if(!bad)for(const g of grade){const pid=sid(g?.productId),color=sid(g?.color),size=sid(g?.size),k=JSON.stringify([pid,norm(color),norm(size)]);if(!products.get(pid)||!color||!size||!validQty(g?.qty)||cells.has(k)){bad=true;break}cells.add(k);groups.set(pid,(groups.get(pid)||0)+g.qty);}
   if(bad||[...groups.values()].some(n=>!validQty(n)||!n)){review++;gradeErrors++;rows.push({source:'orders',id:oid,label:'Pedido #'+sid(o.orderNumber||oid),detail:'Grade ou modelo inconsistente; não somado.'});continue}
   for(const [pid,qty] of groups){
    contracted+=qty;
    const m=o.projectionItems?.[pid],history=m?.deliveryHistory,links=byPair.get(key(oid,pid))||[],perNote=new Map();
    let conflict=uncertainOrders.has(oid)||!!m?.clientAllocations?.length;
    for(const a of links){if(!a.valid){conflict=true;continue}perNote.set(a.nid,(perNote.get(a.nid)||0)+a.qty)}
    const noteQty=[...perNote.values()].reduce((a,b)=>a+b,0);if(!validQty(noteQty)||noteQty>qty)conflict=true;
    let historical=null;
    if(Array.isArray(history)&&history.length){const seen=new Set();let sum=0;for(const h of history){const nid=sid(h?.invoiceId);if(!nid||seen.has(nid)||!date(h.date)||!validQty(h.qty)||h.qty<=0||perNote.get(nid)!==h.qty){conflict=true;break}seen.add(nid);sum+=h.qty}
     if(seen.size!==perNote.size||sum!==noteQty||sum>qty)conflict=true;else historical=sum;
    }else if(history!=null&&!Array.isArray(history)||links.length||Number(m?.invoicedQty||0)>0)conflict=true;
    if(m?.invoicedQty!=null&&(!validQty(m.invoicedQty)||m.invoicedQty!==noteQty))conflict=true;
    const planDate=date(m?.date)?m.date:null,client=sid(o.productClientAssignments?.[pid]?.clientName||o.client||o.clientName)||'Cliente não informado';
    const payment=deps.planningApi?.orderPaymentCondition?.(o,null,null,true),condition=payment?.mode==='cash'?'À vista':payment?.mode==='term'&&Number.isSafeInteger(payment.days)?payment.days+' dias':'Condição não confirmada';
    const detail=[client,fmt(qty)+' contratadas',planDate?'Data da projeção '+planDate:'Data de projeção não informada',condition];
    if(conflict){review++;detail.push('Divergência entre histórico/notas ou vínculo de cliente; saldo a conferir');}
    else if(historical!==null){detail.push(fmt(historical)+' registradas em histórico e notas locais; diferença documental '+fmt(qty-historical));}
    else detail.push('Sem histórico de entrega conciliado; quantidade restante não confirmada');
    rows.push({source:'orders',id:oid+'/'+pid,label:'Pedido #'+sid(o.orderNumber||oid)+' · '+sid(products.get(pid).name||pid),detail:detail.join(' · ')});
   }
  }
  if(!Number.isSafeInteger(contracted))return result('unavailable','Limite de quantidade excedido.');
  if(!allowed())return result('forbidden','Sessão ou acesso alterado.');
  return result('observed',active+' pedidos ativos examinados; '+fmt(contracted)+' peças contratadas em grades válidas (não saldo de produção). '+review+' ocorrências para revisão, '+gradeErrors+' grades inválidas, '+terminalCount+' pedidos em status de encerramento ou nota excluídos; '+unlinkedNotes+' registros de nota sem vínculo completo. Histórico e nota não comprovam expedição física nem sincronização. Até 50 linhas exibidas de '+rows.length+'. Não importa automaticamente para o simulador.',rows.slice(0,50));
 }
 function ask(raw,deps){
  if(deps.auth()!==true)return result('forbidden','Entre no programa para consultar.');
  const q=String(raw??'').trim();if(!q||q.length>180)return result('unsupported','Informe uma consulta curta.');
  const m=q.match(/^(?:(?:status|andamento|situa[cç][aã]o)(?: do)? |como est[aá] (?:o )?)?pedido\s*#?\s*([A-Za-z0-9_-]{1,80})\??$/i),product=q.match(/^(?:hist[oó]rico(?: do)? produto|produto|modelo)\s+(.+)$/i),material=q.match(/^(?:material|mat[eé]ria.prima)\s+(.+)$/i),settlement=q.match(/^acertos?\s+(fac[cç][aã]o|cliente|funcion[aá]rio)\s+(.+)$/i),finance=/^(?:financeiro semana|previs[aã]o financeira semanal|como est[aá] o financeiro)\??$/i.test(q);
  const permitted=p=>deps.auth()===true&&deps.can(p)===true;
  try{
   if(/^(?:carteira (?:de )?pedidos|carteira real|pedidos em aberto)\??$/i.test(q))return portfolio(deps);
   if(/^(?:distribuir produ[cç][aã]o|distribuir (?:entre )?fac[cç][oõ]es)\??$/i.test(q))return result('unsupported','Abra “Distribuir produção entre facções” na consulta com evidências e revise as premissas.');
   if(/^(?:simular novo pedido|avaliar novo pedido|simula[cç][aã]o de pedido)\??$/i.test(q))return result('unsupported','Abra “Simular novo pedido — prazo e caixa” na consulta com evidências e revise as premissas.');
   if(/^(?:resumo opera[cç][aã]o|resumo gerencial|vis[aã]o geral da opera[cç][aã]o)\??$/i.test(q))return operationOverview(deps,true);
   if(/^(?:produ[cç][aã]o hist[oó]rico|hist[oó]rico (?:da )?produ[cç][aã]o|m[eé]dia (?:de )?produ[cç][aã]o)\??$/i.test(q))return operationOverview(deps,false);
   if(material){
    if(!permitted('materiais'))return result('forbidden','Consulta de materiais não autorizada.');
    const data=deps.read('materials');if(!permitted('materiais'))return result('forbidden','Sessão alterada.');
    if(!Array.isArray(data))return result('unavailable','Cadastro de matérias-primas indisponível.');
    const counts=new Map();for(const r of data.filter(live)){const k=sid(r.id);counts.set(k,(counts.get(k)||0)+1)}
    const query=norm(material[1]),found=data.filter(x=>live(x)&&sid(x.id)&&counts.get(sid(x.id))===1&&[x.id,x.name,x.code,x.cat].map(norm).join(' ').includes(query));
    if(!permitted('materiais'))return result('forbidden','Sessão alterada.');
    return result(found.length?'observed':'empty',found.length?found.length+' material(is) cadastrado(s); até 30 exibidos. Estoque físico e preço não confirmados.':'Material não encontrado nos registros locais.',found.slice(0,30).map(x=>({source:'materials',id:sid(x.id),label:sid(x.name)||sid(x.id),detail:[sid(x.cat),sid(x.unit)].filter(Boolean).join(' · ')||'Unidade não informada'})))
   }
   if(settlement){
    const kind=norm(settlement[1]),scopes={faccao:['pagamentosFaccoes','faccoes'],cliente:['notas','financeiro'],funcionario:['folhaPagamento']},areas=scopes[kind];
    if(!areas||!areas.every(permitted))return result('forbidden','Consulta de acertos não autorizada.');
    if(typeof deps.settlement!=='function')return result('unavailable','Histórico indisponível.');
    const query=settlement[2].trim(),x=deps.settlement(kind,{query,limit:30});
    if(!areas.every(permitted))return result('forbidden','Sessão ou acesso alterado.');
    if(x?.state!=='local-observation'||!Array.isArray(x.rows)||!Array.isArray(x.owners))return result('unavailable','Histórico não confirmado.');
    const owners=x.owners.filter(r=>norm(r.name).includes(norm(query))||sid(r.ownerId)===query);
    if(owners.length!==1)return result(owners.length?'ambiguous':'empty',owners.length?'Há mais de uma pessoa com esta referência. Consulte o ID exato.':'Pessoa não localizada nos registros carregados.',owners.slice(0,20).map(r=>({source:'settlement-history',id:r.ownerId,label:r.name,detail:'ID '+r.ownerId})));
    const owner=owners[0],y=deps.settlement(kind,{ownerId:owner.ownerId,limit:30});
    if(!areas.every(permitted))return result('forbidden','Sessão ou acesso alterado.');
    if(y?.state!=='local-observation'||!Array.isArray(y.rows)||y.rows.some(r=>r.kind!==kind||r.ownerId!==owner.ownerId)||!y.totals)return result('unavailable','Histórico não confirmado.');
    const money=c=>Number.isSafeInteger(c)?(c/100).toLocaleString('pt-BR',{style:'currency',currency:'BRL'}):'Não confirmado';
    return result('observed',owner.name+' · '+y.total+' registros locais. Pago informado '+money(y.totals.paidCents)+' · Crédito '+money(y.totals.creditCents)+' · Saldo '+money(y.totals.balanceCents)+'. '+(kind==='cliente'?'Data da nota é emissão, não recebimento. ':'')+'Não é conciliação bancária.',y.rows.map(r=>({source:'settlement-history',id:r.id,label:r.date,detail:r.status+' · '+money(r.totalCents)+' · Saldo '+money(r.balanceCents)})))
   }
   if(finance){
    const areas=['hubFinanceiro','folhaPagamento'];if(!areas.every(permitted))return result('forbidden','Consulta do Hub e Folha não autorizada.');
    if(typeof deps.finance!=='function'||typeof deps.weeklySummary!=='function'||typeof deps.today!=='function')return result('unavailable','Inteligência financeira indisponível.');
    const today=deps.today(),x=deps.finance({asOf:today,targetDate:today,historyWeeks:8,receiptDelayDays:14});
    if(!areas.every(permitted))return result('forbidden','Sessão ou acesso alterado.');
    const y=deps.weeklySummary(x);if(!areas.every(permitted))return result('forbidden','Sessão ou acesso alterado.');
    if(y?.state!=='observed')return result('unavailable','Não há cobertura local suficiente para resumir a semana. Consulte o Hub Financeiro.');
    const money=c=>Number.isSafeInteger(c)?(c/100).toLocaleString('pt-BR',{style:'currency',currency:'BRL'}):'Não confirmado';
    return result('observed','Semana atual observada: entradas previstas '+money(y.plannedInCents)+' · saídas previstas '+money(y.plannedOutCents)+' · diferença prevista '+money(y.plannedDifferenceCents)+'. Não é saldo de caixa nem diagnóstico financeiro confirmado.',[{source:'hubFinanceEntries',id:today,label:'Realizados informados',detail:'Entradas '+money(y.paidInCents)+' · Saídas '+money(y.paidOutCents)},...(y.topExpense?[{source:'hubFinanceEntries',id:today,label:'Maior categoria observada',detail:y.topExpense.category+' · '+money(y.topExpense.totalCents)}]:[])])
   }
   if(m){
    if(!permitted('pedidos'))return result('forbidden','Consulta de pedidos não autorizada.');
    const data=deps.read('orders');if(!Array.isArray(data))return result('unavailable','Pedidos ainda não disponíveis.');
    const rows=data.filter(x=>live(x)&&(sid(x.id)===m[1]||sid(x.orderNumber)===m[1]||sid(x.number)===m[1]));
    if(!permitted('pedidos'))return result('forbidden','Consulta indisponível nesta sessão.');
    if(rows.length!==1)return result(rows.length?'ambiguous':'empty',rows.length?'Há mais de um pedido com esta referência. Confira os IDs na tela de Pedidos.':'Não encontrado nos registros carregados.');
    const o=rows[0],id=sid(o.id),grade=Array.isArray(o.grade)?o.grade:Array.isArray(o.items)?o.items:null;
    const quantities=grade?.map(g=>g.qty??g.quantity??g.pieces);
    const qty=quantities?.every(v=>(typeof v==='number'||typeof v==='string'&&/^\d+$/.test(v))&&Number.isSafeInteger(Number(v))&&Number(v)>=0)?quantities.reduce((sum,v)=>sum+Number(v),0):null;
    const answer=[{source:'orders',id,label:'Pedido #'+sid(o.orderNumber||o.number||id),detail:[sid(o.status),Number.isSafeInteger(qty)?qty+' peças':'Quantidade não comprovada'].filter(Boolean).join(' · ')}];
    for(const [page,key] of [['corte','cuts'],['producao','production']]){
     if(!permitted('pedidos'))return result('forbidden','Sessão alterada.');if(!permitted(page))continue;const items=deps.read(key);if(!permitted('pedidos'))return result('forbidden','Sessão alterada.');
     if(!Array.isArray(items))continue;
     const linked=items.filter(x=>live(x)&&sid(x.orderId)===id&&!x.hiddenByModelSplitV1);
     const counts=new Map();for(const x of linked){const k=sid(x.id);counts.set(k,(counts.get(k)||0)+1)}
     for(const x of linked){if(!sid(x.id)||counts.get(sid(x.id))!==1)continue;answer.push({source:key,id:sid(x.id),label:key==='cuts'?'Corte':'Produção',detail:sid(x.status||x.stage)||'Status não informado'})}
    }
    if(!permitted('pedidos'))return result('forbidden','Sessão alterada.');
    const visible=answer.filter(x=>x.source==='orders'||x.source==='cuts'&&permitted('corte')||x.source==='production'&&permitted('producao'));
    return result('observed','Registros locais vinculados por ID. Não confirma conclusão, saldo ou sincronização.',visible.slice(0,50));
   }
   if(product){
    if(!permitted('produtos'))return result('forbidden','Consulta de produtos não autorizada.');
    const db={products:deps.read('products')};if(!permitted('produtos'))return result('forbidden','Sessão alterada.');const p=deps.productApi;
    if(!p||!Array.isArray(db.products))return result('unavailable','Catálogo ainda não disponível.');
    const x=p.search(db,product[1],{allowed:true,limit:20});
    if(!permitted('produtos'))return result('forbidden','Sessão alterada.');
    if(x.total!==1)return result(x.total?'ambiguous':'empty',x.total?'Selecione a referência exata na busca de Produtos.':'Modelo não encontrado nos registros locais.',x.rows.map(r=>({source:'products',id:r.id,label:r.name,detail:r.code||r.id})));
    const row=x.rows[0],modules=[];for(const [page,key] of [['pedidos','orders'],['corte','cuts'],['producao','production'],['faccoes','factions']])if(permitted(page)){if(!permitted('produtos'))return result('forbidden','Sessão alterada.');modules.push(key);db[key]=deps.read(key);if(!permitted('produtos')||!permitted(page))return result('forbidden','Sessão alterada.')}
    const history=p.timeline(db,row.id,{allowed:true,modules,limit:30});
    if(!permitted('produtos')||modules.some(k=>!permitted(({orders:'pedidos',cuts:'corte',production:'producao',factions:'faccoes'})[k])))return result('forbidden','Sessão ou acesso alterado.');
    return result('observed','Modelo '+row.name+' · '+history.total+' eventos locais; até 30 exibidos. '+(history.issues.length?'Há lacunas de vínculo ou dados. ':'')+'Não confirma cobertura da nuvem.',[{source:'products',id:row.id,label:row.name,detail:row.code||''},...history.rows.map(e=>({source:e.source,id:e.sourceId,label:e.status||e.source,detail:[e.date,e.orderId?'Pedido '+e.orderId:'',e.quantity===null?'':e.quantity+' peças'].filter(Boolean).join(' · ')}))]);
   }
   return result('unsupported','Use “pedido 125”, “histórico produto Camisola”, “material malha”, “acertos facção Roseli” “financeiro semana”, “produção histórico” ou “resumo operação”. Para as demais funções, utilize o Assistente original.');
  }catch(_){return result('unavailable','Não foi possível conferir a consulta. Nenhuma alteração foi feita.')}
 }
 return {ask,simulateOrder,distributionChoices,simulateDistribution};
})());
