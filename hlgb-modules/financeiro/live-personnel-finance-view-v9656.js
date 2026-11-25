'use strict';
(function(root,api){if(typeof module==='object'&&module.exports){module.exports=api;return}if(!root||root.HLGBLivePersonnelFinance9656)return;root.HLGBLivePersonnelFinance9656=api;
const auth=()=>root.__HLGB_AUTH_READY===true,can=p=>{try{return typeof canOpenPage==='function'&&canOpenPage(p)===true}catch(_){return false}};
const deps={auth,can,read:k=>{const d=typeof db!=='undefined'?db:root.db;return Array.isArray(d?.[k])?d[k]:null},calc:(r,e)=>{if(typeof root.payrollCalc!=='function')throw Error('official-calc-unavailable');return root.payrollCalc(r,e)},payrollApi:()=>root.HLGBPayrollPreview9634,calendarApi:()=>root.HLGBPayrollPlanning9645,reconcileApi:()=>root.HLGBHubPersonnelForecast9650,financeApi:()=>root.HLGBHubIntelligenceAdapter9633,paidDateApi:()=>root.hlgbHubPayrollPaidDate9515};
const el=(tag,t,parent)=>{const x=document.createElement(tag);x.textContent=t;parent.appendChild(x);return x},money=c=>c==null?'Não confirmado':(c/100).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const today=()=>{const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());const v=k=>parts.find(p=>p.type===k)?.value;return v('year')+'-'+v('month')+'-'+v('day')};
const previousMonth=day=>{const [y,m]=day.split('-').map(Number);return new Date(Date.UTC(y,m-2,1)).toISOString().slice(0,7)};
function mount(pageId){const area=document.getElementById(pageId),id='hlgb-live-finance-9656-'+pageId,hub=pageId==='hubFinanceiro';if(!area||!area.classList.contains('active')||!auth()||!can('folhaPagamento')||hub&&!can(pageId)||document.getElementById(id))return;
 const host=el('section','',area);host.id=id;host.className='panel';host.dataset.liveFinance9656='1';el('h3',hub?'Inteligência financeira e prévia de pessoal':'Prévia salarial e calendário',host);el('p','Consulta dos registros locais. Não lança valores, não confirma pagamentos, nem altera a Folha. Feriados e convenção precisam de confirmação.',host);
 const controls=el('div','',host);controls.className='toolbar';const field=(label,type,value)=>{const l=el('label',label,controls);l.style.cssText='display:flex;flex-direction:column;min-width:0;max-width:100%';const x=el('input','',l);x.type=type;x.value=value;x.style.cssText='min-width:0;max-width:100%';return x};
 const month=field('Competência','month',hub?previousMonth(today()):(document.getElementById('payrollMonth')?.value||previousMonth(today()))),holidays=field('Feriados informados (AAAA-MM-DD, separados por vírgula)','text','');
 const companyClosed=field('Outros dias sem expediente (AAAA-MM-DD)','text',''),bankClosed=field('Dias sem operação bancária (AAAA-MM-DD)','text','');
 const b=el('button','Atualizar prévia salarial',controls);b.type='button';b.className='secondary';
 const salaryOut=el('div','',host);salaryOut.dataset.salaryOutput='1';salaryOut.setAttribute('aria-live','polite');
 const out=el('div','',host);out.dataset.financeOutput='1';out.setAttribute('aria-live','polite');
 const active=()=>area.classList.contains('active')&&auth()&&can('folhaPagamento')&&(!hub||can(pageId));
 const list=x=>x.value.split(',').map(s=>s.trim()).filter(Boolean);
 function salaryDraw(){salaryOut.replaceChildren();if(!active())return;const asOf=today(),opt={competence:month.value,asOf,holidays:list(holidays),companyClosed:list(companyClosed),bankClosed:list(bankClosed)};const signal=api.salarySignal(deps,opt,hub);
 if(signal.state!=='provisional'){el('p','Calendário indisponível. Confira competência, feriados e acesso.',salaryOut);return}
 const dateLabel=d=>d.split('-').reverse().join('/');
 const heading=el('h4',signal.schedule==='today'?'Hoje é a data candidata para programar o pagamento':signal.fifth==='today'?'Hoje é o quinto dia útil candidato':signal.schedule==='upcoming'?'Próxima programação salarial':'Data candidata já passou: confira a folha',salaryOut);
 heading.setAttribute('role','status');el('p','Competência '+month.value+' · 5º dia útil salarial: '+dateLabel(signal.fifthDay)+' · 5º dia de expediente: '+dateLabel(signal.companyFifthDay)+' · Programação da empresa: '+dateLabel(signal.scheduledDay),salaryOut);
 el('p','Calendário provisório. Sábado conta para o prazo salarial, mas não para o expediente da empresa. Feriados, convenção e banco precisam de confirmação.',salaryOut);
 const x=api.payroll(deps,opt,hub);if(!active()){salaryOut.replaceChildren();return}if(x.state!=='local-preview-only'){el('p','Prévia indisponível. Confira acesso, competência e fontes.',salaryOut);return}
 el('p','Funcionários considerados: '+x.observedEmployeeCount+' · '+x.issueCount+' registro(s) exigem revisão.',salaryOut);
 el('p',x.observedEmployeeCount?'Em aberto observado: '+money(x.localOpenCents)+' · Pago informado: '+money(x.localPaidCents):'Nenhum registro salarial válido carregado. Valor desconhecido, não zero.',salaryOut);
 el('p','Consulta local, não é previsão oficial gravada nem confirmação de pagamento.',salaryOut);
 if(x.reconciliation)el('p','Conferência Hub: '+({'local-preview-only':'Sem prova suficiente para lançamento','legacy-or-unlinked-review':'Conciliar lançamento anterior','already-paid-review':'Pagamento registrado: revisar','duplicate-review':'Duplicidade: revisar','existing-conflict':'Conflito em lançamento','source-unavailable':'Fonte indisponível'}[x.reconciliation.state]||x.reconciliation.state),salaryOut);
 }
 b.onclick=salaryDraw;
 for(const x of [month,holidays,companyClosed,bankClosed])x.addEventListener('change',salaryDraw);
 salaryDraw();
 if(hub){const target=field('Semana a consultar','date',today()),select=el('select','',controls);select.setAttribute('aria-label','Semanas de histórico');for(const n of [8,12,26]){const o=el('option',n+' semanas',select);o.value=String(n)}const delay=el('select','',controls);delay.setAttribute('aria-label','Simulação de atraso de recebimentos');for(const n of [0,7,14,21,28]){const o=el('option',n+' dias de atraso de recebimentos',delay);o.value=String(n)}delay.value='14';const f=el('button','Consultar inteligência financeira',controls);f.type='button';f.className='secondary';f.onclick=()=>{out.replaceChildren();if(!active())return;const x=api.finance(deps,{asOf:today(),targetDate:target.value,historyWeeks:Number(select.value),receiptDelayDays:Number(delay.value)});if(x.state!=='local-observation-only'){el('p','Consulta indisponível. Confira período e fontes.',out);return}el('p',x.reason,out);const sum=api.weeklySummary(x);if(sum.state==='observed'){el('h4','Resumo da semana selecionada',out);el('p','Entradas previstas '+money(sum.plannedInCents)+' · Saídas previstas '+money(sum.plannedOutCents)+' · Diferença prevista '+money(sum.plannedDifferenceCents),out);el('p','Entradas realizadas informadas '+money(sum.paidInCents)+' · Saídas realizadas informadas '+money(sum.paidOutCents),out);if(sum.topExpense)el('p','Maior categoria de saída observada: '+sum.topExpense.category+' · '+money(sum.topExpense.totalCents),out)}else el('p','Sem registros válidos na semana selecionada. Não significa ausência de compromissos.',out);for(const g of x.observations)el('p',g.flow+' · '+g.category+' · Previsto '+money(g.plannedCents)+' · Realizado informado '+money(g.paidCents),out);const h=x.recordedHistory;
 if(h){el('h4','Conferência financeira e ações de revisão',out);
 el('p',h.observedWeeks+' de '+h.weeks.length+' semanas anteriores possuem registros realizados locais. Cobertura incompleta: ausência de linha não significa zero.',out);
 const actions={'review-overdue-receipts':'Conferir recebimentos com data prevista anterior a hoje','review-overdue-payments':'Conferir pagamentos com data prevista anterior a hoje','review-omitted':'Revisar registros omitidos ou conflitantes','review-history-gaps':'Conferir semanas sem registros realizados locais','review-category-count':'Conferir cadastro de categorias'};
 for(const a of h.actions)el('p',(actions[a.code]||a.code)+' · '+a.count+' registro(s) / semana(s)'+(a.amountCents===undefined?'':' · '+money(a.amountCents)),out);
 const history=el('details','',out);el('summary','Histórico por semana — entradas e saídas observadas',history);
 for(const w of h.weeks)el('p',w.week+' · Entradas realizadas '+money(w.paidInCents)+' · Saídas realizadas '+money(w.paidOutCents)+' · Saídas ainda previstas '+money(w.plannedOutCents),history);
 const byCat=el('details','',out);el('summary','Comparar despesas por categoria com semanas anteriores',byCat);const picker=el('select','',byCat);picker.setAttribute('aria-label','Categoria para conferir histórico');for(const g of h.categories){const o=el('option',g.category,picker);o.value=g.category}const historyOut=el('div','',byCat);
 const draw=()=>{historyOut.replaceChildren();if(!active())return;const g=h.categories.find(z=>z.category===picker.value);if(!g)return;el('p','Semana selecionada: realizado '+money(g.targetPaidCents)+' · previsto '+money(g.targetPlannedCents)+' · '+g.recordedWeeks+' semanas anteriores com registros realizados.',historyOut);const c=g.observedComparison;if(c?.medianRecordedCents!=null){el('p','Referência parcial: mediana '+money(c.medianRecordedCents)+' · intervalo registrado '+money(c.minRecordedCents)+' a '+money(c.maxRecordedCents)+' · '+c.recordedWeeks+'/'+c.totalWeeks+' semanas observadas.',historyOut);el('p','Semana selecionada (realizado + previsto observados): '+money(c.observedTotalCents)+' · '+({'above-recorded-range':'Acima do intervalo registrado — conferir compromissos e compras extraordinárias','below-recorded-range':'Abaixo do intervalo registrado — conferir lançamentos faltantes','within-recorded-range':'Dentro do intervalo registrado, sem diagnóstico de saúde','insufficient-observations':'Sem registros suficientes na semana selecionada'}[c.signal]||'Conferir registros'),historyOut);el('p','Comparação descritiva, não é orçamento aprovado nem prova de excesso ou economia. Semanas sem registro excluídas.',historyOut)}else el('p','São necessárias pelo menos 4 semanas com pagamentos registrados nesta categoria para uma referência parcial.',historyOut);for(const r of g.history)el('p',r.week+' · Realizado '+money(r.paidCents)+' · Ainda previsto '+money(r.plannedCents),historyOut)};
 picker.onchange=draw;draw();
 }
 el('h4','Compromissos previstos — 13 semanas',out);
 for(const [i,w] of x.cash.base.entries()){const z=x.cash.conservative?.[i];el('p',w.start+' a '+w.end+' · Entradas '+money(w.incomingCents)+' · Saídas '+money(w.outgoingCents)+(z?' · Entradas com atraso de '+x.cash.receiptDelayDays+' dias '+money(z.incomingCents):''),out)}
 el('p','Saldo bancário, diagnóstico de saúde e margens não confirmados. Registros omitidos: '+x.omitted,out)}}
 for(const x of controls.querySelectorAll('input,select'))x.addEventListener('change',()=>out.replaceChildren());
}
function refresh(){for(const host of document.querySelectorAll('[data-live-finance9656]')){const page=host.closest('.page');if(!auth()||!can('folhaPagamento')||!page?.classList.contains('active')||page.id==='hubFinanceiro'&&!can(page.id))host.remove()}mount('folhaPagamento');mount('hubFinanceiro')}
function clear(){for(const x of document.querySelectorAll('[data-live-finance9656]'))x.remove()}
if(typeof document!=='undefined'){document.addEventListener('click',()=>setTimeout(refresh,0),true);document.addEventListener('visibilitychange',()=>{clear();if(!document.hidden)refresh()});root.addEventListener?.('hlgb:authenticated',()=>{clear();refresh()});root.addEventListener?.('hlgb:logout',clear);setTimeout(refresh,600)}
})(typeof window!=='undefined'?window:null,(function bridge(){
 const invalid=(reason)=>({state:'unavailable',reason,canPublish:false});
 const safe=(f)=>{try{return f()}catch(_){return false}};
 const allowed=(d,...areas)=>safe(()=>d.auth()===true&&areas.every(p=>d.can(p)===true))===true;
 const copy=x=>JSON.parse(JSON.stringify(x));
 const date=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&Number.isFinite(Date.parse(s+'T00:00:00Z'))&&new Date(s+'T00:00:00Z').toISOString().slice(0,10)===s;
 function payroll(deps,opt,fromHub=false){
  const areas=fromHub?['folhaPagamento','hubFinanceiro']:['folhaPagamento'];
  if(!allowed(deps,...areas))return invalid('permission');
  try{
   const p=deps.payrollApi(),c=deps.calendarApi();if(typeof p?.inspect!=='function'||typeof c?.salaryDate!=='function'||typeof deps.calc!=='function')return invalid('source-unavailable');
   const rows=deps.read('payroll');if(!allowed(deps,...areas))return invalid('permission');const employees=deps.read('employees');if(!allowed(deps,...areas))return invalid('permission');if(!Array.isArray(rows)||!Array.isArray(employees))return invalid('source-unavailable');
   const opts={competence:opt.competence,asOf:opt.asOf,holidays:opt.holidays||[],companyClosed:opt.companyClosed||[],bankClosed:opt.bankClosed||[]};
   const calendar=c.salaryDate(opts),v=p.inspect({authenticated:true,payrollAllowed:true,db:{payroll:copy(rows),employees:copy(employees)},payrollCalc:(row,e)=>deps.calc(row,e)},opts);
   if(!allowed(deps,...areas))return invalid('permission');
   if(v.state!=='local-preview-only')return invalid(v.reason||'payroll-review');
   const out={state:'local-preview-only',competence:opts.competence,calendar,observedEmployeeCount:v.observedEmployeeCount,localOpenCents:v.localOpenCents,localPaidCents:v.localPaidCents,issueCount:v.issues.length,officialAmountCents:null,canPublish:false};
   if(fromHub){
    const raw=deps.read('hubFinanceEntries');if(!allowed(deps,...areas))return invalid('permission');const a=deps.reconcileApi();if(!allowed(deps,...areas))return invalid('permission');
    if(!Array.isArray(raw)||typeof a?.inspect!=='function')return {...out,reconciliation:{state:'source-unavailable',canPublish:false}};
    const res=a.inspect({authenticated:true,payrollAllowed:true,financeAllowed:true,rows:copy(raw),pendingOrigins:[],snapshotVerified:false,coverageVerified:false,pendingVerified:false},{kind:'salary',competence:opts.competence,dueDate:calendar.scheduledCandidate,amountCents:v.localOpenCents,sourceVerified:false,calendarVerified:false});
    if(!allowed(deps,...areas))return invalid('permission');
    out.reconciliation={state:res.state,existingCount:res.existingCount??null,paidViewCount:res.paidViewCount??null,canPublish:false};
   }
   return out;
  }catch(_){return invalid('source-review')}
 }
 function finance(deps,opt){
  if(!allowed(deps,'hubFinanceiro','folhaPagamento'))return invalid('permission');
  try{
   if(!date(opt.asOf)||!date(opt.targetDate))return invalid('invalid-period');
   const api=deps.financeApi(),pd=deps.paidDateApi();if(!allowed(deps,'hubFinanceiro','folhaPagamento'))return invalid('permission');const rows=deps.read('hubFinanceEntries');if(!allowed(deps,'hubFinanceiro','folhaPagamento'))return invalid('permission');const payroll=deps.read('payroll');if(!allowed(deps,'hubFinanceiro','folhaPagamento'))return invalid('permission');
   if(typeof api?.inspect!=='function'||typeof pd?.rows!=='function'||!Array.isArray(rows)||!Array.isArray(payroll))return invalid('source-unavailable');
   const x=api.inspect({authenticated:true,financeAllowed:true,payrollAggregateAllowed:true,db:{hubFinanceEntries:copy(rows),payroll:copy(payroll)},paidDateApi:pd},{asOf:opt.asOf,targetDate:opt.targetDate,historyWeeks:opt.historyWeeks,receiptDelayDays:opt.receiptDelayDays});
   if(!allowed(deps,'hubFinanceiro','folhaPagamento'))return invalid('permission');
   if(x.state!=='local-observation-only')return invalid(x.reason||'source-review');
   return {...x,canPublish:false};
  }catch(_){return invalid('source-review')}
 }
 function salarySignal(deps,opt,fromHub=false){
  const areas=fromHub?['folhaPagamento','hubFinanceiro']:['folhaPagamento'];
  if(!allowed(deps,...areas))return invalid('permission');
  try{
   if(!date(opt.asOf))return invalid('invalid-period');
   const calendar=deps.calendarApi();if(typeof calendar?.salaryDate!=='function'||!allowed(deps,...areas))return invalid('source-unavailable');
   const c=calendar.salaryDate({competence:opt.competence,asOf:opt.asOf,holidays:opt.holidays||[],companyClosed:opt.companyClosed||[],bankClosed:opt.bankClosed||[]});
   if(!allowed(deps,...areas))return invalid('permission');
   if(![c.fifthDay,c.companyFifthCandidate,c.scheduledCandidate].every(date))return invalid('calendar-review');
   const relation=d=>opt.asOf<d?'upcoming':opt.asOf===d?'today':'passed';
   return {state:'provisional',fifthDay:c.fifthDay,companyFifthDay:c.companyFifthCandidate,scheduledDay:c.scheduledCandidate,fifth:relation(c.fifthDay),company:relation(c.companyFifthCandidate),schedule:relation(c.scheduledCandidate),paymentStatus:'not-determined',canPublish:false};
  }catch(_){return invalid('calendar-review')}
 }
 function weeklySummary(x){
  const empty=()=>({state:'unavailable',plannedInCents:null,plannedOutCents:null,plannedDifferenceCents:null,paidInCents:null,paidOutCents:null,topExpense:null,canPublish:false});
  if(x?.state!=='local-observation-only'||!Array.isArray(x.observations)||!x.observations.length)return empty();
  let plannedInCents=0,plannedOutCents=0,paidInCents=0,paidOutCents=0,topExpense=null;const seen=new Set();
  for(const g of x.observations){
   if(!['Entrada','Saída'].includes(g?.flow)||typeof g.category!=='string'||!g.category.trim()||![g.plannedCents,g.paidCents].every(n=>Number.isSafeInteger(n)&&n>=0))return empty();
   const key=JSON.stringify([g.flow,g.category]);if(seen.has(key))return empty();seen.add(key);
   if(g.flow==='Entrada'){plannedInCents+=g.plannedCents;paidInCents+=g.paidCents}else{plannedOutCents+=g.plannedCents;paidOutCents+=g.paidCents;const totalCents=g.plannedCents+g.paidCents;if(!Number.isSafeInteger(totalCents))return empty();if(!topExpense||totalCents>topExpense.totalCents||totalCents===topExpense.totalCents&&g.category<topExpense.category)topExpense={category:g.category,totalCents}}
  }
  if(![plannedInCents,plannedOutCents,paidInCents,paidOutCents].every(Number.isSafeInteger))return empty();
  return {state:'observed',plannedInCents,plannedOutCents,plannedDifferenceCents:plannedInCents-plannedOutCents,paidInCents,paidOutCents,topExpense,coverage:'local-incomplete',canPublish:false};
 }
 return {payroll,finance,salarySignal,weeklySummary};
})());
