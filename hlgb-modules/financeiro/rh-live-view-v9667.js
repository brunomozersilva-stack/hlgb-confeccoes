'use strict';
(function(root){
 if(!root||root.HLGBRHLive9667)return;root.HLGBRHLive9667=true;
 const api=()=>root.HLGBRHPlanning9636;
 const actor=()=>{try{return String(typeof cloudUser!=='undefined'?cloudUser?.id||'':typeof currentUser==='function'?currentUser()?.id||'':'')}catch(_){return ''}};
 const auth=()=>root.__HLGB_AUTH_READY===true;
 const can=p=>{try{return typeof canOpenPage==='function'&&canOpenPage(p)===true}catch(_){return false}};
 const allowed=()=>auth()&&!!actor()&&can('folhaPagamento')&&can('funcionarios');
 const deps={auth:allowed,can,read:k=>{const d=typeof db!=='undefined'?db:root.db;return k==='employees'&&Array.isArray(d?.employees)?d.employees:null}};
 const today=()=>{const p=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());const v=k=>p.find(x=>x.type===k)?.value;return v('year')+'-'+v('month')+'-'+v('day')};
 const el=(tag,text,host)=>{const x=document.createElement(tag);x.textContent=text;host.appendChild(x);return x};
 const field=(label,host,type='text',value='')=>{const w=el('label',label,host);w.style.cssText='display:block;margin:6px 0;min-width:0';const x=el('input','',w);x.type=type;x.value=value;x.style.cssText='display:block;min-width:0;max-width:100%;width:100%;box-sizing:border-box';return x};
 const select=(label,host,options)=>{const w=el('label',label,host);w.style.cssText='display:block;margin:6px 0';const x=el('select','',w);x.setAttribute('aria-label',label);x.style.cssText='max-width:100%;width:100%';for(const [v,t] of options){const o=el('option',t,x);o.value=v}return x};
 const checkbox=(label,host)=>{const w=el('label','',host);w.style.cssText='display:block;overflow-wrap:anywhere';const x=el('input','',w);x.type='checkbox';el('span',' '+label,w);return x};
 const button=(label,host,fn)=>{const x=el('button',label,host);x.type='button';x.className='secondary';x.style.cssText='max-width:100%;white-space:normal;margin:4px 4px 4px 0';x.onclick=fn;return x};
 const money=c=>c==null?'Não confirmado':(c/100).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
 const inputMoney=c=>c==null?'':(c/100).toFixed(2);
 const cents=v=>/^\d{1,7}(?:[.,]\d{1,2})?$/.test(String(v).trim())?Math.round(Number(String(v).replace(',','.'))*100):null;
 const days=v=>/^(?:[0-9]|[12][0-9]|30)$/.test(String(v))?Number(v):null;
 const output=host=>{const x=el('div','',host);x.setAttribute('aria-live','polite');return x};
 const block=(label,host)=>{const x=el('details','',host);x.className='panel';el('summary',label,x);return x};
 const labels={all:'Todos os períodos',acquired:'Direito adquirido',overdue:'Concessivo vencido',proportional:'Em aquisição',used:'Saldo zero informado',unknown:'A revisar'};
 const issueText={'annual-period-history-unverified':'Histórico anual de férias coletivas não informado','annual-period-limit':'Limite de períodos anuais a revisar','calendar-unverified':'Calendário e convenção não verificados','start-date-review':'Data de início a revisar','employee-entitlement-incomplete':'Saldo/direito incompleto','proportional-cycle-recalculation':'Novo ciclo aquisitivo proporcional exige revisão','insufficient-balance':'Saldo insuficiente para o período'};
 function clear(){document.getElementById('hlgbRHLive9667')?.remove()}
 function mount(){
  const page=document.getElementById('folhaPagamento');
  if(!allowed()||!page?.classList.contains('active')){clear();return}
  const old=document.getElementById('hlgbRHLive9667');if(old){if(old.dataset.actor!==actor())clear();else return}
  if(typeof api()?.roster!=='function')return;
  const host=el('section','',page);host.id='hlgbRHLive9667';host.className='panel';host.dataset.actor=actor();
  const active=()=>host.isConnected&&allowed()&&actor()===host.dataset.actor&&page.classList.contains('active');
  const current=()=>active()?api().roster(deps):{state:'forbidden',rows:[]};
  el('h3','Planejamento de RH — férias, provisões e desligamento',host);
  el('p','Usa o cadastro local autorizado. Valores e direitos precisam ser conferidos pelo RH/contador. Não altera a folha, não registra desligamento, não cria pagamento e não grava rascunhos na nuvem.',host);
  const overview=output(host);let roster=current(),selected=new Map(),cycles=[],noticeItems=[],cycleSequence=0,itemSequence=0,editingCycle=null;
  const vacation=block('Simular férias coletivas por funcionário e confecção',host);
  const start1=field('Primeiro período — início',vacation,'date'),end1=field('Primeiro período — fim',vacation,'date'),second=checkbox('Simular também um segundo período',vacation);
  const start2=field('Segundo período — início',vacation,'date'),end2=field('Segundo período — fim',vacation,'date');
  const prior1=field('Períodos coletivos anteriores no ano do primeiro início (opcional)',vacation,'number'),prior2=field('Períodos coletivos anteriores no ano do segundo início (opcional)',vacation,'number');
  for(const x of [prior1,prior2]){x.min='0';x.max='2';x.step='1'}
  const query=field('Buscar funcionário ou ID',vacation,'search'),company=select('Filtrar confecção',vacation,[['','Todas']]);
  const choices=el('div','',vacation),reviewHost=el('div','',vacation),vacOut=output(vacation);let choiceOffset=0,reviewOffset=0;
  function matched(){return api().selectRoster(roster,query.value,company.value)}
  function clearResults(){vacOut.replaceChildren();provisionOut.replaceChildren();noticeOut.replaceChildren()}
  function choose(row){if(!active())return;if(!selected.has(row.id)&&selected.size>=200){el('p','Limite de 200 funcionários por simulação. Separe os grupos.',vacOut);return}
   if(!selected.has(row.id))selected.set(row.id,{employeeId:row.id,signature:row.signature,reviewed:false,baseCents:row.baseCents,availableDays:null,entitlement:'',paidLeaveApproved:false,name:row.name});
   else selected.delete(row.id);vacOut.replaceChildren();drawChoices();drawReviews()
  }
  function drawChoices(){
   choices.replaceChildren();if(!active())return;const rows=matched();if(choiceOffset>=rows.length)choiceOffset=Math.max(0,Math.floor((rows.length-1)/30)*30);
   el('p',rows.length+' funcionário(s) neste filtro · '+selected.size+' selecionado(s)',choices);
   for(const r of rows.slice(choiceOffset,choiceOffset+30)){const x=button((selected.has(r.id)?'Remover ':'Adicionar ')+r.name+' · '+r.company+' · ID '+r.id,choices,()=>choose(r));x.setAttribute('aria-pressed',String(selected.has(r.id)))}
   if(choiceOffset>0)button('Funcionários anteriores',choices,()=>{choiceOffset-=30;drawChoices()});if(choiceOffset+30<rows.length)button('Mais funcionários',choices,()=>{choiceOffset+=30;drawChoices()})
  }
  function drawReviews(){
   reviewHost.replaceChildren();if(!active())return;const rows=[...selected.values()];if(reviewOffset>=rows.length)reviewOffset=Math.max(0,Math.floor((rows.length-1)/20)*20);
   el('h4','Conferência dos '+rows.length+' selecionados',reviewHost);
   for(const r of rows.slice(reviewOffset,reviewOffset+20)){
    const card=el('article','',reviewHost);card.className='panel';el('strong',r.name+' · ID '+r.employeeId,card);
    const fresh=roster.rows.find(e=>e.id===r.employeeId);if(!fresh||fresh.signature!==r.signature)el('p','Cadastro alterado: remova e selecione novamente antes de simular.',card);
    const base=field('Base de férias revisada (R$)',card,'text',inputMoney(r.baseCents)),balance=field('Dias disponíveis comprovados',card,'number',r.availableDays===null?'':String(r.availableDays));balance.min='0';balance.max='30';
    const kind=select('Direito neste ciclo',card,[['','Selecione'],['acquired','Adquirido'],['proportional','Proporcional']]);kind.value=r.entitlement;
    const extra=checkbox('Licença remunerada adicional revisada (proporcional)',card);extra.checked=r.paidLeaveApproved;
    const reviewed=checkbox('Conferi base, direito e saldo com os registros de RH',card);reviewed.checked=r.reviewed;
    const change=()=>{r.baseCents=cents(base.value);r.availableDays=days(balance.value);r.entitlement=kind.value;r.paidLeaveApproved=extra.checked;r.reviewed=false;reviewed.checked=false;vacOut.replaceChildren()};
    for(const x of [base,balance,kind,extra])x.addEventListener('change',change);
    reviewed.onchange=()=>{r.reviewed=reviewed.checked;vacOut.replaceChildren()};
    button('Remover da simulação',card,()=>{selected.delete(r.employeeId);vacOut.replaceChildren();drawChoices();drawReviews()})
   }
   if(reviewOffset>0)button('Conferências anteriores',reviewHost,()=>{reviewOffset-=20;drawReviews()});if(reviewOffset+20<rows.length)button('Mais conferências',reviewHost,()=>{reviewOffset+=20;drawReviews()})
  }
  button('Selecionar todos do filtro',vacation,()=>{if(!active())return;const add=matched().filter(r=>!selected.has(r.id));if(selected.size+add.length>200){vacOut.replaceChildren();el('p','Selecione até 200 funcionários por simulação.',vacOut);return}for(const r of add)selected.set(r.id,{employeeId:r.id,signature:r.signature,reviewed:false,baseCents:r.baseCents,availableDays:null,entitlement:'',paidLeaveApproved:false,name:r.name});vacOut.replaceChildren();drawChoices();drawReviews()});
  button('Limpar selecionados',vacation,()=>{selected.clear();vacOut.replaceChildren();drawChoices();drawReviews()});
  button('Calcular férias coletivas',vacation,()=>{
   vacOut.replaceChildren();if(!active())return;
   try{
    const source=current();if(source.state!=='local-roster'||!active())return;const periods=[{start:start1.value,end:end1.value}],priorPeriodsByYear={};
    if(second.checked)periods.push({start:start2.value,end:end2.value});
    for(const [date,input] of [[start1.value,prior1],...(second.checked?[[start2.value,prior2]]:[])]){if(input.value==='')continue;const n=Number(input.value),y=date.slice(0,4);if(!Number.isInteger(n)||n<0||n>2||Object.hasOwn(priorPeriodsByYear,y)&&priorPeriodsByYear[y]!==n)throw Error('annual-history');priorPeriodsByYear[y]=n}
    const r=api().reviewedVacations(source,{periods,priorPeriodsByYear,reviews:[...selected.values()]});if(!active())return;
    el('p',r.reviewedCount+' de '+r.selectedCount+' funcionários revisados. '+(r.coverage==='partial-review'?'Total parcial; há saldos ou períodos a revisar.':'Entradas revisadas localmente; não é fechamento oficial.'),vacOut);
    for(const t of r.totals){el('h4',t.start+' a '+t.end+' · '+t.days+' dias',vacOut);el('p','Férias + 1/3 observadas: '+money(t.grossVacationCents)+' · Licença informada: '+money(t.paidLeaveCents)+' · Prazo candidato: '+t.paymentCandidate+(t.partial?' · Total parcial / revisão necessária':''),vacOut)}
    el('strong','Total bruto observado: '+money(r.observedGrossCents),vacOut);for(const x of r.issues)el('p',issueText[x]||x,vacOut);
    for(const x of r.reviewIssues)el('p',(selected.get(x.employeeId)?.name||x.employeeId)+' · '+(x.reason==='roster-changed'?'Cadastro mudou; selecione novamente.':'Revisão de direito/saldo pendente.'),vacOut);
    const detail=block('Detalhamento por funcionário e período',vacOut);for(const row of r.people){el('h4',selected.get(row.id)?.name||row.id,detail);for(const z of row.periods)el('p',z.start+' · '+(z.vacationDays??'a revisar')+' dias · Férias + 1/3 '+money(z.grossVacationCents)+' · Saldo '+(z.remainingDays??'a revisar')+' · '+(z.status==='review'?'Revisão necessária':'Estimativa'),detail)}
   }catch(_){el('p','Confira datas, seleção, histórico anual e campos de revisão. Nenhum valor foi lançado.',vacOut)}
  });
  for(const x of [start1,end1,second,start2,end2,prior1,prior2])x.addEventListener('change',()=>vacOut.replaceChildren());
  query.addEventListener('input',()=>{choiceOffset=0;drawChoices()});company.onchange=()=>{choiceOffset=0;drawChoices()};
  const provision=block('Provisões por período aquisitivo — total e filtros',host);
  el('p','O quadro antigo de provisões continua disponível. Aqui os períodos e valores de férias são informados/revisados individualmente; admissão ou antecipação em dinheiro não comprovam saldo de férias.',provision);
  const provEmployee=select('Funcionário',provision,[['','Selecione']]),acqStart=field('Início aquisitivo',provision,'date'),acqEnd=field('Fim aquisitivo',provision,'date'),concEnd=field('Fim concessivo',provision,'date'),remain=field('Dias restantes',provision,'number'),provisionValue=field('Valor provisionado do período (R$)',provision,'text'),provChecked=checkbox('Conferi o período, o saldo e o valor com RH',provision);
  const asOf=field('Data de referência',provision,'date',today()),kind=select('Visualização',provision,[['focus','Vencido mais antigo por funcionário'],['open','Todos os direitos em aberto'],...Object.entries(labels)]),provisionOut=output(provision);
  function resetCycle(){editingCycle=null;for(const x of [acqStart,acqEnd,concEnd,remain,provisionValue])x.value='';provChecked.checked=false}
  function drawCycles(){
   provisionOut.replaceChildren();if(!active())return;try{const source=current();if(source.state!=='local-roster')return;const focus=api().provisionFocus(source,cycles,asOf.value,true);if(focus.state!=='local-focus'||!active())return;
    const t=focus.totals;
    el('p','Total em aberto observado (exclui saldos zero): '+(t.openCount?money(t.openCents):'Não confirmado')+' · Direito adquirido ainda não vencido: '+(focus.allOpenRows.some(x=>x.status==='acquired')?money(t.acquiredCents):'Sem registro observado')+' · Proporcional: '+(focus.allOpenRows.some(x=>x.status==='proportional')?money(t.proportionalCents):'Sem registro observado'),provisionOut);
    el('p','Vencido mais antigo: '+(t.oldestCount?money(t.oldestOverdueCents):'Sem registro observado')+' · Outros vencidos: '+t.otherOverdueCount+' período(s), '+money(t.otherOverdueCents)+' · Total vencido identificado: '+money(t.overdueCents),provisionOut);
    el('p',focus.withoutCycles+' funcionários sem período informado · '+t.unknownCount+' períodos a revisar. Dados locais, não é saldo oficial. Os demais vencidos não são excluídos do total.',provisionOut);
    if(kind.value==='focus'||kind.value==='open'){
     const list=kind.value==='focus'?focus.focusRows:focus.allOpenRows;el('h4',kind.value==='focus'?'Período vencido mais antigo por funcionário':'Todos os direitos em aberto',provisionOut);
     if(!list.length)el('p','Nenhum período correspondente informado. Isso não comprova ausência de direito.',provisionOut);
     const holder=el('div','',provisionOut);let offset=0;
     const draw=()=>{holder.replaceChildren();if(!active())return;for(const row of list.slice(offset,offset+20)){const item=el('article','',holder);item.className='panel';const p=focus.people.find(x=>x.employeeId===row.employeeId);el('strong',row.name+' · '+labels[row.status],item);el('p',row.acquisitionStart+' a '+row.acquisitionEnd+' · Concessivo até '+row.concessionEnd+' · '+row.remainingDays+' dias · '+money(row.provisionCents),item);if(kind.value==='focus'&&p?.otherOverdueCount)el('p','Outros vencidos: '+p.otherOverdueCount+' · '+money(p.otherOverdueCents)+' (consulte todos os direitos)',item)}
     if(offset>0)button('Anteriores',holder,()=>{offset-=20;draw()});if(offset+20<list.length)button('Próximos',holder,()=>{offset+=20;draw()})};draw();el('p','Para editar ou remover um período informado, use Todos os períodos.',provisionOut);return;
    }
    const r=api().provisionCycles(source,cycles,asOf.value,kind.value);if(!active())return;
    el('strong','Total histórico informado (inclui saldo zero): '+money(r.observedTotalCents),provisionOut);el('p',labels[kind.value]+': '+money(r.filteredTotalCents)+' · '+r.reviewedCount+' períodos revisados · '+r.unknownCount+' a revisar',provisionOut);
    for(const [k,v] of Object.entries(r.totals))el('p',labels[k]+': '+money(v)+' · '+r.groups[k].length+' período(s)',provisionOut);
    for(const row of r.rows){const card=el('article','',provisionOut);card.className='panel';el('strong',row.name+' · '+labels[row.status],card);el('p',row.acquisitionStart+' a '+row.acquisitionEnd+' · Concessivo até '+row.concessionEnd+' · '+money(row.provisionCents),card);
     button('Editar período',card,()=>{if(!active())return;const x=cycles.find(c=>c.cycleId===row.cycleId);if(!x)return;editingCycle=x.cycleId;provEmployee.value=x.employeeId;acqStart.value=x.acquisitionStart;acqEnd.value=x.acquisitionEnd;concEnd.value=x.concessionEnd;remain.value=String(x.remainingDays);provisionValue.value=inputMoney(x.provisionCents);provChecked.checked=false});
     button('Remover período local',card,()=>{cycles=cycles.filter(c=>c.cycleId!==row.cycleId);if(editingCycle===row.cycleId)resetCycle();drawCycles()})
    }
   }catch(_){el('p','Confira a data de referência e os períodos informados.',provisionOut)}
  }
  button('Adicionar / atualizar período revisado',provision,()=>{
   if(!active())return;const source=current(),e=source.rows.find(r=>r.id===provEmployee.value),balance=days(remain.value),value=cents(provisionValue.value);if(!e||!provChecked.checked||!acqStart.value||!acqEnd.value||!concEnd.value||balance===null||value===null){provisionOut.replaceChildren();el('p','Informe funcionário, datas, saldo, valor e confirme a revisão.',provisionOut);return}
   if(!editingCycle&&cycles.length>=1000){el('p','Limite de períodos da sessão.',provisionOut);return}
   const row={cycleId:editingCycle||'local-'+(++cycleSequence),employeeId:e.id,signature:e.signature,acquisitionStart:acqStart.value,acquisitionEnd:acqEnd.value,concessionEnd:concEnd.value,remainingDays:balance,provisionCents:value,reviewed:true};
   let check;try{check=api().provisionCycles(source,[row],asOf.value)}catch(_){provisionOut.replaceChildren();el('p','Data de referência inválida.',provisionOut);return}if(check.unknownCount){provisionOut.replaceChildren();el('p','Datas ou valores inconsistentes. Confira antes de adicionar.',provisionOut);return}cycles=cycles.filter(c=>c.cycleId!==row.cycleId).concat(row);resetCycle();drawCycles()
  });
  button('Novo período',provision,resetCycle);button('Atualizar totais',provision,drawCycles);for(const x of [asOf,kind])x.addEventListener('change',drawCycles);
  for(const x of [provEmployee,acqStart,acqEnd,concEnd,remain,provisionValue])x.addEventListener('change',()=>{provChecked.checked=false});
  const notice=block('Planejar desligamento e conferir verbas',host);
  const noticeEmployee=select('Funcionário',notice,[['','Selecione']]),hire=field('Admissão revisada',notice,'date'),noticeDate=field('Data de comunicação',notice,'date',today()),salary=field('Base salarial revisada (R$)',notice,'text');
  const type=select('Modalidade',notice,[['employer-no-cause','Dispensa sem justa causa'],['resignation','Pedido de demissão'],['mutual','Acordo'],['cause','Justa causa'],['fixed-term','Término de contrato'],['other','Outra / revisar']]),mode=select('Aviso',notice,[['review','A revisar'],['worked','Trabalhado'],['indemnified','Indenizado'],['waived','Dispensado']]),noticeChecked=checkbox('Conferi admissão, salário e modalidade',notice);
  const itemLabel=field('Descrição da verba revisada',notice),itemKind=select('Tipo de verba',notice,[['credit','Crédito ao funcionário'],['discount','Desconto'],['employer-charge','Encargo da empresa']]),itemStatus=select('Situação',notice,[['open','Em aberto'],['paid','Já pago']]),itemValue=field('Valor da verba (R$)',notice,'text'),itemHost=el('div','',notice),noticeOut=output(notice);let noticeSignature='';
  function drawItems(){itemHost.replaceChildren();for(const x of noticeItems){const line=el('div','',itemHost);el('p',x.label+' · '+money(x.amountCents)+' · '+(x.status==='paid'?'Já pago':'Em aberto'),line);button('Remover verba',line,()=>{noticeItems=noticeItems.filter(z=>z.id!==x.id);noticeOut.replaceChildren();drawItems()})}}
  function loadNotice(){if(!active())return;const e=current().rows.find(x=>x.id===noticeEmployee.value);noticeSignature=e?.signature||'';hire.value=e?.hireDate||'';salary.value=inputMoney(e?.baseCents);noticeChecked.checked=false;noticeItems=[];noticeOut.replaceChildren();drawItems()}
  noticeEmployee.onchange=loadNotice;
  for(const x of [hire,noticeDate,salary,type,mode])x.addEventListener('change',()=>{noticeChecked.checked=false;noticeOut.replaceChildren()});
  button('Adicionar verba conferida',notice,()=>{if(!active()||!noticeEmployee.value)return;const v=cents(itemValue.value),label=itemLabel.value.trim();if(!label||label.length>120||v===null||noticeItems.length>=100){noticeOut.replaceChildren();el('p','Informe descrição e valor válidos.',noticeOut);return}noticeItems.push({id:'verba-'+(++itemSequence),label,kind:itemKind.value,status:itemStatus.value,amountCents:v,verified:true});itemLabel.value='';itemValue.value='';noticeOut.replaceChildren();drawItems()});
  button('Simular desligamento',notice,()=>{noticeOut.replaceChildren();if(!active())return;try{const x=api().reviewedNotice(current(),{employeeId:noticeEmployee.value,signature:noticeSignature,reviewed:noticeChecked.checked,hireDate:hire.value,noticeDate:noticeDate.value,type:type.value,mode:mode.value,salaryCents:cents(salary.value),approvedItems:noticeItems});if(!active())return;el('h4',x.name+' · '+x.completedYears+' anos completos',noticeOut);el('p','Aviso de referência: '+(x.referenceDays===null?'A revisar':x.referenceDays+' dias')+' · Fim projetado candidato: '+(x.projectedEnd||'A revisar'),noticeOut);el('p','Indenização de referência: '+money(x.referenceIndemnityCents)+' (não somada automaticamente às verbas)',noticeOut);el('p','Créditos informados em aberto: '+money(x.items.length?x.observedCreditsCents:null)+' · Descontos: '+money(x.items.length?x.observedDiscountsCents:null)+' · Encargos: '+money(x.items.length?x.observedEmployerChargesCents:null),noticeOut);el('strong','Diferença das verbas informadas: '+money(x.observedItemsDifferenceCents),noticeOut);el('p','Não é valor líquido da rescisão. Conferir aviso, projeções, CCT, férias, 13º, FGTS e demais verbas antes do lançamento original.',noticeOut)}catch(_){el('p','Confira o cadastro atualizado, admissão, data, modalidade, salário e revisão. Nenhum desligamento registrado.',noticeOut)}});
  function rosterOptions(){
   if(!active())return;roster=current();overview.replaceChildren();if(roster.state!=='local-roster'){clearResults();choices.replaceChildren();reviewHost.replaceChildren();provEmployee.replaceChildren();noticeEmployee.replaceChildren();noticeSignature='';noticeItems=[];drawItems();noticeChecked.checked=false;hire.value='';salary.value='';el('p','Cadastro de funcionários indisponível nesta sessão. Atualize para continuar.',overview);return}
   el('p',roster.rows.length+' funcionários ativos disponíveis · '+roster.issues.length+' tipos de lacunas no cadastro.',overview);
   const previous=company.value;company.replaceChildren();for(const v of ['',...new Set(roster.rows.map(r=>r.company).filter(Boolean))]){const o=el('option',v||'Todas',company);o.value=v}company.value=[...company.options].some(o=>o.value===previous)?previous:'';
   for(const input of [provEmployee,noticeEmployee]){const v=input.value;input.replaceChildren();let o=el('option','Selecione',input);o.value='';for(const r of roster.rows){o=el('option',r.name+' · '+r.company+' · ID '+r.id,input);o.value=r.id}input.value=[...input.options].some(o=>o.value===v)?v:''}
   if(noticeEmployee.value&&!roster.rows.some(r=>r.id===noticeEmployee.value&&r.signature===noticeSignature)){noticeChecked.checked=false}
   clearResults();drawChoices();drawReviews();drawCycles();
  }
  button('Atualizar funcionários',host,rosterOptions);rosterOptions()
 }
 document.addEventListener('click',()=>setTimeout(mount,0),true);
 document.addEventListener('visibilitychange',()=>{clear();if(!document.hidden)mount()});
 root.addEventListener?.('hlgb:logout',clear);root.addEventListener?.('hlgb:authenticated',()=>{clear();mount()});setTimeout(mount,800);
})(typeof window!=='undefined'?window:null);
