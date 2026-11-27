'use strict';
(function(root,api){if(typeof module==='object'&&module.exports){module.exports=api;return}if(!root||root.HLGBLivePersonnelFinance9656)return;root.HLGBLivePersonnelFinance9656=api;
const auth=()=>root.__HLGB_AUTH_READY===true,can=p=>{try{return typeof canOpenPage==='function'&&canOpenPage(p)===true}catch(_){return false}};
const pendingEvidence=()=>{
 const guard=root.hlgbWalIdbGuard9536,status=guard?.status?.(),ids=new Set();
 try{for(const key of guard?.ids?.()||[])ids.add(String(key));for(const key of root.hlgbRecordPendingIdentitySet9535?.()||[])ids.add(String(key))}catch(_){return {state:'incomplete',ids:[...ids]}}
 const age=Date.now()-Date.parse(status?.lastProbeAt||'');
 const observed=!!status&&status.probes>0&&status.readFailed===false&&status.localReadFailed===false&&status.unsupported===false&&typeof root.hlgbRecordPendingIdentitySet9535==='function'&&Number.isFinite(age)&&age>=0&&age<=120000;
 return {state:observed?'observed':'incomplete',ids:[...ids]};
};
const deps={auth,can,pendingEvidence,read:k=>{const d=typeof db!=='undefined'?db:root.db;return Array.isArray(d?.[k])?d[k]:null},calc:(r,e)=>{if(typeof root.payrollCalc!=='function')throw Error('official-calc-unavailable');return root.payrollCalc(r,e)},payrollApi:()=>root.HLGBPayrollPreview9634,calendarApi:()=>root.HLGBPayrollPlanning9645,reconcileApi:()=>root.HLGBHubPersonnelForecast9650,financeApi:()=>root.HLGBHubIntelligenceAdapter9633,paidDateApi:()=>root.hlgbHubPayrollPaidDate9515};
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
 const heading=el('h4',signal.schedule==='today'?'Hoje é a data candidata para programar o pagamento':signal.fifth==='today'?'Hoje é o quinto dia útil candidato':signal.company==='today'?'Hoje é o quinto dia de expediente candidato da empresa':signal.schedule==='upcoming'?'Próxima programação salarial':'Data candidata já passou: confira a folha',salaryOut);
 heading.setAttribute('role','status');el('p','Competência '+month.value+' · 5º dia útil salarial: '+dateLabel(signal.fifthDay)+' · 5º dia de expediente: '+dateLabel(signal.companyFifthDay)+' · Programação da empresa: '+dateLabel(signal.scheduledDay),salaryOut);
 el('p','Calendário provisório. Sábado conta para o prazo salarial, mas não para o expediente da empresa. Feriados, convenção e banco precisam de confirmação.',salaryOut);
 const x=api.payroll(deps,opt,hub);if(!active()){salaryOut.replaceChildren();return}if(x.state!=='local-preview-only'){el('p','Prévia indisponível. Confira acesso, competência e fontes.',salaryOut);return}
 el('p','Funcionários considerados: '+x.observedEmployeeCount+' · '+x.issueCount+' registro(s) exigem revisão.',salaryOut);
 el('p',x.observedEmployeeCount?'Em aberto observado: '+money(x.localOpenCents)+' · Pago informado: '+money(x.localPaidCents):'Nenhum registro salarial válido carregado. Valor desconhecido, não zero.',salaryOut);
 if(x.coverage){const v=x.coverage;el('p','Cobertura da competência: '+v.expectedCount+' funcionários com vínculo no mês · '+v.missingCount+' sem linha de folha · '+v.reviewCount+' cadastros/linhas a revisar · '+v.unexpectedCount+' vínculos fora do período.',salaryOut);el('p',v.pendingObserved?'Fila local de sincronização consultada; valores pendentes excluídos.':'Fila de sincronização não confirmada; total observado pode estar incompleto.',salaryOut);}
 el('p','Consulta local, não é previsão oficial gravada nem confirmação de pagamento.',salaryOut);
 if(x.reconciliation)el('p','Conferência Hub: '+({'local-preview-only':'Sem prova suficiente para lançamento','legacy-or-unlinked-review':'Conciliar lançamento anterior','already-paid-review':'Pagamento registrado: revisar','duplicate-review':'Duplicidade: revisar','existing-conflict':'Conflito em lançamento','source-unavailable':'Fonte indisponível'}[x.reconciliation.state]||x.reconciliation.state),salaryOut);
 }
 b.onclick=salaryDraw;
 for(const x of [month,holidays,companyClosed,bankClosed])x.addEventListener('change',salaryDraw);
 salaryDraw();
 if(hub){const target=field('Semana a consultar','date',today()),select=el('select','',controls);select.setAttribute('aria-label','Semanas de histórico');for(const n of [8,12,26]){const o=el('option',n+' semanas',select);o.value=String(n)}const delay=el('select','',controls);delay.setAttribute('aria-label','Simulação de atraso de recebimentos');for(const n of [0,7,14,21,28]){const o=el('option',n+' dias de atraso de recebimentos',delay);o.value=String(n)}delay.value='14';const f=el('button','Consultar inteligência financeira',controls);f.type='button';f.className='secondary';f.onclick=async()=>{out.replaceChildren();if(!active()||f.disabled)return;f.disabled=true;el('p','Conferindo pendências locais antes da análise...',out);try{await root.hlgbWalIdbGuard9536?.probe?.()}catch(_){}finally{f.disabled=false}if(!active()||!host.isConnected)return;out.replaceChildren();const x=api.finance(deps,{asOf:today(),targetDate:target.value,historyWeeks:Number(select.value),receiptDelayDays:Number(delay.value)});if(x.state!=='local-observation-only'){el('p','Consulta indisponível. Confira período e fontes.',out);return}el('p',x.reason,out);if(x.pendingEvidence){const p=x.pendingEvidence;el('p','Pendências de sincronização: '+(p.state==='observed'?'fila local consultada':'leitura incompleta ou antiga')+' · '+p.excludedCount+' registro(s) pendente(s) excluído(s) · '+(p.allPayrollBlocked?'Folha inteira em revisão':p.blockedPayrollMonths+' competência(s) da folha em revisão')+'. Não é confirmação na nuvem.',out)}const sum=api.weeklySummary(x);if(sum.state==='observed'){el('h4','Resumo da semana selecionada',out);el('p','Entradas previstas '+money(sum.plannedInCents)+' · Saídas previstas '+money(sum.plannedOutCents)+' · Diferença prevista '+money(sum.plannedDifferenceCents),out);el('p','Entradas realizadas informadas '+money(sum.paidInCents)+' · Saídas realizadas informadas '+money(sum.paidOutCents),out);if(sum.topExpense)el('p','Maior categoria de saída observada: '+sum.topExpense.category+' · '+money(sum.topExpense.totalCents),out)}else el('p','Sem registros válidos na semana selecionada. Não significa ausência de compromissos.',out);for(const g of x.observations)el('p',g.flow+' · '+g.category+' · Previsto '+money(g.plannedCents)+' · Realizado informado '+money(g.paidCents),out);const h=x.recordedHistory;
 const timing=x.settlementTiming;
 if(timing?.state==='partial-local'){
  const section=el('details','',out);section.className='panel';el('summary','Prazos reais observados — recebimentos e pagamentos',section);
  el('p','Comparação entre vencimento ainda registrado e data realizada nas '+timing.weeks+' semanas anteriores. Não comprova a previsão original nem representa todos os títulos.',section);
  const line=(g,host)=>el('p',g.flow+(g.category?' · '+g.category:'')+' · '+g.count+' títulos · '+g.earlyCount+' antecipados · '+g.onTimeCount+' no dia · '+g.lateCount+' atrasados ('+g.latePercent+'%) · Valor em atraso '+money(g.lateAmountCents)+(g.medianLateDays==null?'':' · Mediana entre atrasados '+g.medianLateDays+' dias')+(g.maxLateDays==null?'':' · Maior atraso '+g.maxLateDays+' dias'),host);
  for(const g of timing.overall)line(g,section);
  if(!timing.overall.length)el('p','Nenhum título com vencimento e realização comparáveis. Não significa ausência de atraso.',section);
  el('p',timing.excluded.noDueDate+' sem vencimento válido · '+timing.excluded.payroll+' consolidados de folha excluídos · '+timing.omitted+' registros em revisão na consulta geral. Mediana exige quatro atrasos observados.',section);
  if(timing.categoryLimitExceeded)el('p','Categorias em excesso; confira o cadastro antes de detalhar.',section);
  else if(timing.categories.length){const chooser=el('select','',section);chooser.setAttribute('aria-label','Tipo de prazo observado');for(const g of ['Entrada','Saída']){const o=el('option',g,chooser);o.value=g}const detail=el('div','',section);const draw=()=>{detail.replaceChildren();if(!active())return;const selected=timing.categories.filter(g=>g.flow===chooser.value);for(const g of selected)line(g,detail);if(!selected.length)el('p','Sem títulos comparáveis nesta direção.',detail)};chooser.onchange=draw;draw()}
 }
 const priorities=x.weeklyActions;
 if(priorities?.state==='partial-local'){
  const block=el('section','',out);block.className='panel';el('h4','Prioridades de revisão financeira',block);
  el('p','Sugestões baseadas nos registros locais observados. Não são diagnóstico de saúde, confirmação bancária ou autorização de pagamento.',block);
  const labels={'review-source-quality':'Qualidade dos dados','review-overdue-in':'Recebimentos vencidos','review-overdue-out':'Pagamentos vencidos','review-above-range':'Despesa acima da faixa registrada','review-concentration':'Concentração de pagamentos nos próximos 7 dias','review-coverage':'Cobertura do histórico'};
  if(!priorities.actions.length)el('p','Nenhuma prioridade identificada nesta consulta parcial. Isso não comprova ausência de riscos.',block);
  for(const a of priorities.actions){const item=el('article','',block),e=a.evidence;el('h4',labels[a.code]||a.code,item);
   if(e.category)el('p',e.category+' · Semana '+e.targetWeek+' · Observado '+money(e.observedTotalCents)+' · Mediana parcial '+money(e.medianCents)+' · Maior valor histórico '+money(e.maxCents)+' · Diferença '+money(e.differenceCents)+' · '+e.recordedWeeks+'/'+e.totalWeeks+' semanas registradas.',item);
   else if(e.date)el('p',e.date+' · '+money(e.amountCents)+' de '+money(e.sevenDayTotalCents)+' previstos em 7 dias ('+e.sharePercent+'%).',item);
   else if(e.missingWeeks!=null)el('p',e.missingWeeks+' de '+e.totalWeeks+' semanas sem realizados observados.',item);
   else el('p',e.count+' registro(s)'+(e.amountCents==null?'':' · '+money(e.amountCents)),item);
   el('p',a.suggestion,item);
  }
  if(priorities.aboveRangeCount>3)el('p','Mostrando as três maiores diferenças entre '+priorities.aboveRangeCount+' categorias acima da faixa; consulte o comparativo por categoria.',block);
 }
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
 const review=x.cash.commitmentReview;
 if(review?.state==='partial-simulation'){
  el('h4','Planejamento de compromissos — próximos 7, 14, 30 e 91 dias',out);
  el('p','Simulação apenas dos lançamentos previstos carregados: não é saldo bancário, necessidade real de capital de giro ou autorização de pagamento. Pagamentos considerados antes dos recebimentos no mesmo dia.',out);
  el('p','Recebimentos vencidos sem nova data excluídos: '+review.overdueReceiptsExcluded+' · Pagamentos vencidos considerados no início: '+review.overduePaymentsIncluded+'.',out);
  for(const [i,w] of review.base.entries()){
   const z=review.delayed[i],item=el('div','',out);item.className='panel';
   el('h4',w.horizon+' dias · '+w.start+' a '+w.end,item);
   if(!w.activeDays&&!z.activeDays){el('p','Sem compromissos observados nesse intervalo; cobertura não confirmada.',item);continue}
   el('p','Entradas previstas '+money(w.incomingCents)+' · Saídas previstas '+money(w.outgoingCents)+' · Diferença de fluxos '+money(w.netObservedCents),item);
   el('p','Pico de diferença a cobrir partindo de zero: '+money(w.hypotheticalPeakGapCents)+' · Com atraso de '+x.cash.receiptDelayDays+' dias: '+money(z.hypotheticalPeakGapCents),item);
   if(z.firstHypotheticalGapDate)el('p','Primeira data de atenção na simulação de atraso: '+z.firstHypotheticalGapDate,item);
  }
 }
 const reservePanel=el('details','',out);el('summary','Simular saldo inicial e reserva mínima de caixa',reservePanel);
 el('p','Informe o saldo inicial disponível para esta simulação, já descontados pagamentos realizados, e a reserva que deseja manter. Dados locais não conciliados, sem gravação.',reservePanel);
 const scenarioInput=(label)=>{const l=el('label',label,reservePanel);l.style.display='block';const z=el('input','',l);z.type='text';z.inputMode='decimal';z.style.cssText='display:block;max-width:100%;box-sizing:border-box';return z};
 const opening=scenarioInput('Saldo inicial hipotético (R$; admite negativo)'),reserve=scenarioInput('Reserva mínima (R$)'),scenarioOut=el('div','',reservePanel);
 const cbLabel=el('label','Conferi o saldo inicial e reconheço que os compromissos podem estar incompletos',reservePanel),cb=el('input','',cbLabel);cb.type='checkbox';
 const calc=el('button','Simular caixa com reserva',reservePanel);calc.type='button';calc.className='secondary';
 const parse=v=>/^-?\d{1,9}(?:[.,]\d{1,2})?$/.test(v.trim())?Math.round(Number(v.replace(',','.'))*100):null;
 for(const z of [opening,reserve])z.oninput=()=>{cb.checked=false;scenarioOut.replaceChildren()};cb.onchange=()=>scenarioOut.replaceChildren();
 calc.onclick=()=>{scenarioOut.replaceChildren();if(!active()||!reservePanel.isConnected||!cb.checked)return;
  const fresh=api.finance(deps,{asOf:today(),targetDate:target.value,historyWeeks:Number(select.value),receiptDelayDays:Number(delay.value)});
  if(!active()||!reservePanel.isConnected)return;
  if(fresh.state!=='local-observation-only'||JSON.stringify(fresh.plannerObligations)!==JSON.stringify(x.plannerObligations)){el('p','Compromissos alterados. Atualize a consulta financeira antes de simular novamente.',scenarioOut);return}
  const v=root.HLGBHubIntelligenceAdapter9633.reserveScenario(fresh.plannerObligations,{asOf:today(),openingCents:parse(opening.value),reserveCents:parse(reserve.value),delayDays:Number(delay.value),reviewed:cb.checked},true);
  if(v.state!=='scenario-only'){el('p','Confira saldo, reserva e qualidade dos dados.',scenarioOut);return}
  el('p','Maior diferença para manter a reserva: '+money(v.base.peakReserveGapCents)+' · Com atraso de '+v.delayDays+' dias: '+money(v.delayed.peakReserveGapCents),scenarioOut);
  el('p','Primeira data abaixo da reserva: '+(v.base.firstReserveBreach||'Não observada')+' · Com atraso: '+(v.delayed.firstReserveBreach||'Não observada'),scenarioOut);
  el('p','Recebimentos vencidos excluídos: '+v.overdueExcludedCount+' · '+money(v.overdueExcludedCents)+' · Omissões: '+v.omitted+' · Fila: '+v.pendingState+'. Simulação parcial, não representa necessidade real de financiamento.',scenarioOut);
  for(const [i,w] of v.base.weeks.entries()){const z=v.delayed.weeks[i];el('p',w.start+' a '+w.end+' · Fechamento simulado '+money(w.closingCents)+' · Menor saldo '+money(w.lowestCents)+' · Com atraso '+money(z.closingCents)+' · Diferença máxima para reserva '+money(z.reserveGapCents),scenarioOut)}
  el('p','Valores fora dos 91 dias: entradas '+money(v.base.outsideIncomingCents)+' / saídas '+money(v.base.outsideOutgoingCents)+' · Entradas fora do prazo no cenário de atraso '+money(v.delayed.outsideIncomingCents),scenarioOut);
 };
 el('h4','Compromissos previstos — 13 semanas',out);
 for(const [i,w] of x.cash.base.entries()){const z=x.cash.conservative?.[i];el('p',w.start+' a '+w.end+' · Entradas '+money(w.incomingCents)+' · Saídas '+money(w.outgoingCents)+(z?' · Entradas com atraso de '+x.cash.receiptDelayDays+' dias '+money(z.incomingCents):''),out)}
 el('p','Saldo bancário, diagnóstico de saúde e margens não confirmados. Registros omitidos: '+x.omitted,out)}}
 for(const x of controls.querySelectorAll('input,select'))x.addEventListener('change',()=>out.replaceChildren());
}
function refresh(){for(const host of document.querySelectorAll('[data-live-finance9656]')){const page=host.closest('.page');if(!auth()||!can('folhaPagamento')||!page?.classList.contains('active')||page.id==='hubFinanceiro'&&!can(page.id))host.remove()}mount('folhaPagamento');mount('hubFinanceiro')}
function clear(){for(const x of document.querySelectorAll('[data-live-finance9656]'))x.remove()}
let operationalPending9845=false;
function scheduleOperational9845(){
 if(operationalPending9845)return;
 operationalPending9845=true;
 setTimeout(()=>{operationalPending9845=false;refresh()},0);
}
if(typeof document!=='undefined'){document.addEventListener('click',scheduleOperational9845,true);document.addEventListener('visibilitychange',()=>{clear();if(!document.hidden)refresh()});root.addEventListener?.('hlgb:authenticated',()=>{clear();refresh()});root.addEventListener?.('hlgb:logout',clear);setTimeout(refresh,600)}
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
   const pending=typeof deps.pendingEvidence==='function'?deps.pendingEvidence():{state:'incomplete',ids:[]};if(!allowed(deps,...areas))return invalid('permission');
   const calendar=c.salaryDate(opts),v=p.inspect({authenticated:true,payrollAllowed:true,pendingEvidence:copy(pending),db:{payroll:copy(rows),employees:copy(employees)},payrollCalc:(row,e)=>deps.calc(row,e)},opts);
   if(!allowed(deps,...areas))return invalid('permission');
   if(v.state!=='local-preview-only')return invalid(v.reason||'payroll-review');
   const out={state:'local-preview-only',competence:opts.competence,calendar,coverage:v.coverage,observedEmployeeCount:v.observedEmployeeCount,localOpenCents:v.localOpenCents,localPaidCents:v.localPaidCents,issueCount:v.issues.length,officialAmountCents:null,canPublish:false};
   if(fromHub){
    const raw=deps.read('hubFinanceEntries');if(!allowed(deps,...areas))return invalid('permission');const a=deps.reconcileApi();if(!allowed(deps,...areas))return invalid('permission');
    if(!Array.isArray(raw)||typeof a?.inspect!=='function')return {...out,reconciliation:{state:'source-unavailable',canPublish:false}};
    const res=a.inspect({authenticated:true,payrollAllowed:true,financeAllowed:true,rows:copy(raw),pendingOrigins:(pending?.ids||[]).includes('payroll_forecast_v1|'+opts.competence)?['payroll_forecast_v1|'+opts.competence]:[],snapshotVerified:false,coverageVerified:false,pendingVerified:false},{kind:'salary',competence:opts.competence,dueDate:calendar.scheduledCandidate,amountCents:v.localOpenCents,sourceVerified:false,calendarVerified:false});
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
   const pending=typeof deps.pendingEvidence==='function'?deps.pendingEvidence():{state:'incomplete',ids:[]};if(!allowed(deps,'hubFinanceiro','folhaPagamento'))return invalid('permission');
   const x=api.inspect({authenticated:true,financeAllowed:true,payrollAggregateAllowed:true,db:{hubFinanceEntries:copy(rows),payroll:copy(payroll)},paidDateApi:pd,pendingEvidence:copy(pending)},{asOf:opt.asOf,targetDate:opt.targetDate,historyWeeks:opt.historyWeeks,receiptDelayDays:opt.receiptDelayDays});
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
