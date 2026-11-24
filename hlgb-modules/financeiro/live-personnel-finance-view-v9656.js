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
 const month=field('Competência','month',document.getElementById('payrollMonth')?.value||previousMonth(today())),holidays=field('Feriados informados (AAAA-MM-DD, separados por vírgula)','text','');
 const b=el('button','Consultar prévia salarial',controls);b.type='button';b.className='secondary';
 const out=el('div','',host);out.dataset.financeOutput='1';out.setAttribute('aria-live','polite');
 const active=()=>area.classList.contains('active')&&auth()&&can('folhaPagamento')&&(!hub||can(pageId));
 b.onclick=()=>{out.replaceChildren();if(!active())return;const x=api.payroll(deps,{competence:month.value,asOf:today(),holidays:holidays.value.split(',').map(s=>s.trim()).filter(Boolean)},hub);if(x.state!=='local-preview-only'){el('p','Prévia indisponível. Confira acesso, competência e fontes.',out);return}el('p','Registros de funcionários considerados: '+x.observedEmployeeCount,out);el('p','Em aberto observado: '+money(x.localOpenCents)+' · Pago informado: '+money(x.localPaidCents),out);el('p','Quinto dia útil candidato: '+x.calendar.fifthDay+' · Expediente da empresa: '+x.calendar.companyFifthCandidate+' · Programação candidata: '+x.calendar.scheduledCandidate,out);el('p','Calendário não confirmado. '+x.issueCount+' registro(s) exigem revisão. Valor oficial não confirmado.',out);if(x.reconciliation)el('p','Conferência Hub: '+({'local-preview-only':'Sem prova suficiente para lançamento','legacy-or-unlinked-review':'Conciliar lançamento anterior','already-paid-review':'Pagamento registrado: revisar','duplicate-review':'Duplicidade: revisar','existing-conflict':'Conflito em lançamento','source-unavailable':'Fonte indisponível'}[x.reconciliation.state]||x.reconciliation.state),out)};
 if(hub){const target=field('Semana a consultar','date',today()),select=el('select','',controls);select.setAttribute('aria-label','Semanas de histórico');for(const n of [8,12,26]){const o=el('option',n+' semanas',select);o.value=String(n)}const f=el('button','Consultar inteligência financeira',controls);f.type='button';f.className='secondary';f.onclick=()=>{out.replaceChildren();if(!active())return;const x=api.finance(deps,{asOf:today(),targetDate:target.value,historyWeeks:Number(select.value)});if(x.state!=='local-observation-only'){el('p','Consulta indisponível. Confira período e fontes.',out);return}el('p',x.reason,out);for(const g of x.observations)el('p',g.flow+' · '+g.category+' · Previsto '+money(g.plannedCents)+' · Realizado informado '+money(g.paidCents),out);el('h4','Compromissos previstos — 13 semanas',out);for(const w of x.cash.base)el('p',w.start+' a '+w.end+' · Entradas '+money(w.incomingCents)+' · Saídas '+money(w.outgoingCents),out);el('p','Saldo bancário, diagnóstico de saúde e margens não confirmados. Registros omitidos: '+x.omitted,out)}}
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
   const x=api.inspect({authenticated:true,financeAllowed:true,payrollAggregateAllowed:true,db:{hubFinanceEntries:copy(rows),payroll:copy(payroll)},paidDateApi:pd},{asOf:opt.asOf,targetDate:opt.targetDate,historyWeeks:opt.historyWeeks});
   if(!allowed(deps,'hubFinanceiro','folhaPagamento'))return invalid('permission');
   if(x.state!=='local-observation-only')return invalid(x.reason||'source-review');
   return {...x,canPublish:false};
  }catch(_){return invalid('source-review')}
 }
 return {payroll,finance};
})());
