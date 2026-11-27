'use strict';
(function(root){
 if(!root||root.HLGBAttendanceView9658)return;root.HLGBAttendanceView9658=true;
 const actor=()=>{try{return String(typeof cloudUser!=='undefined'?cloudUser?.id||'':typeof currentUser==='function'?currentUser()?.id||'':'')}catch(_){return ''}};
 const allowed=()=>{try{return root.__HLGB_AUTH_READY===true&&!!actor()&&typeof canOpenPage==='function'&&canOpenPage('folhaPagamento')===true}catch(_){return false}};
 const data=()=>typeof db!=='undefined'?db:root.db;
 const today=()=>{const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());const v=k=>parts.find(p=>p.type===k)?.value;return v('year')+'-'+v('month')+'-'+v('day')};
 const el=(tag,t,host)=>{const x=document.createElement(tag);x.textContent=t;host.appendChild(x);return x};
 const money=c=>c==null?'Não confirmado':(c/100).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
 function clear(){document.getElementById('hlgbAttendance9658')?.remove()}
 function mount(){
  const area=document.getElementById('folhaPagamento');if(!allowed()||!area?.classList.contains('active')){clear();return}
  const previous=document.getElementById('hlgbAttendance9658');if(previous&&previous.dataset.actor!==actor())previous.remove();else if(previous)return;
  if(!root.HLGBAttendance9658||!root.HLGBPayrollPlanning9645)return;
  const host=el('section','',area);host.id='hlgbAttendance9658';host.className='panel';host.dataset.actor=actor();
  el('h3','Ponto diário e prévia de passagem',host);el('p','Importação de CSV normalizado, não do relógio bruto. Dados apenas na sessão, sem desconto, confirmação, gravação ou envio ao Hub.',host);
  const detail=el('details','',host);el('summary','Formato do CSV',detail);el('p',root.HLGBAttendance9658.header.join(';'),detail);el('p','Data AAAA-MM-DD; escalado sim/nao; ocorrência trabalhado, falta_justificada, falta_injustificada, ferias, afastamento, folga ou pendente; deslocamento e compensada sim/nao/pendente. Passagem antecipada em reais ou vazia. Inclua cada dia, inclusive folgas. ID exato do cadastro.',detail);
  const field=(label,type,val='')=>{const l=el('label',label,host);l.style.cssText='display:block;margin:8px 0';const x=el('input','',l);x.type=type;x.value=val;x.style.cssText='display:block;max-width:100%;min-width:0';return x};
  const month=field('Competência','month',document.getElementById('payrollMonth')?.value||today().slice(0,7)),file=field('CSV diário','file');file.accept='.csv,text/csv';
  const paid=field('Passagem já antecipada até','date'),fare=field('Valor diário em reais (para simulação)','text');fare.inputMode='decimal';
  const employee=el('select','',host);employee.setAttribute('aria-label','Funcionário do ponto');employee.style.maxWidth='100%';
  const button=el('button','Conferir prévia do ponto e passagem',host);button.type='button';button.className='secondary';const out=el('div','',host);out.setAttribute('aria-live','polite');
  let batch=null,request=0;const active=()=>allowed()&&host.isConnected&&host.dataset.actor===actor()&&area.classList.contains('active');function reset(){request++;batch=null;employee.replaceChildren();out.replaceChildren();file.value='';resetBatch()}
  month.addEventListener('change',reset);
  file.addEventListener('change',async()=>{const selected=file.files?.[0],token=++request,competence=month.value;batch=null;employee.replaceChildren();out.replaceChildren();resetBatch();if(!selected||selected.size>2000000||!active())return;try{const text=await selected.text();if(token!==request||!active()||month.value!==competence)return;const people=data()?.employees;batch=root.HLGBAttendance9658.inspect(text,people,competence,true);if(batch.state!=='local-preview'||!active())throw Error('review');el('p',batch.rows.length+' registros observados · '+batch.duplicateCount+' repetições ignoradas · '+batch.issues.length+' ocorrências de importação a revisar.',out);for(const id of [...new Set(batch.rows.map(r=>r.employeeId))]){const e=people.find(x=>String(x.id)===id),o=el('option',String(e?.name||id)+' · ID '+id,employee);o.value=id}refreshBatch()}catch(_){batch=null;resetBatch();if(!active())return;el('p','Não foi possível importar. Confira o formato, competência e IDs.',out)}});
  for(const x of [paid,fare,employee])x.addEventListener('change',()=>out.replaceChildren());
  button.onclick=()=>{out.replaceChildren();if(!active()||!batch)return;const people=data()?.employees||[],matches=people.filter(x=>String(x.id)===employee.value&&!x.deletedAt&&!x.deleted_at&&!x.deleted&&!x._deleted);if(matches.length!==1||!/^\d{1,7}(?:[.,]\d{1,2})?$/.test(fare.value.trim())||!paid.value||paid.value>today()){el('p','Selecione funcionário, tarifa e cobertura comprovada até hoje.',out);return}try{const x=root.HLGBAttendance9658.preview(batch,matches[0],{asOf:today(),paidThrough:paid.value,rateCents:Math.round(Number(fare.value.replace(',','.'))*100)},root.HLGBPayrollPlanning9645);if(x.state!=='local-preview'||!active())throw Error('review');el('p','Dias escalados: '+x.counts.scheduled+' · Trabalhados: '+x.counts.worked+' · Faltas justificadas: '+x.counts.justified+' · Injustificadas: '+x.counts.unjustified+' · Pendências: '+x.counts.pending,out);el('p','Dias sem registro: '+x.missingDays+' · Linhas rejeitadas/conflitos no arquivo: '+batch.issues.length,out);if(x.transport){el('p','Antecipação estimada: '+money(x.transport.forecastCents)+' · Crédito possível por ausência de deslocamento: '+money(x.transport.possibleCreditCents),out);el('p','Primeiro dia não coberto observado: '+(x.transport.firstUncoveredDate||'não identificado')+' · Valor definitivo não confirmado.',out)}else el('p','Passagem indisponível: confira elegibilidade e dados.',out);for(const row of x.rows)el('p',row.date+' · '+row.status+' · Deslocamento '+row.commute+' · Antecipado '+money(row.advanceCents)+' · Compensado '+row.adjusted,out)}catch(_){el('p','Prévia indisponível. Confira o período e os dados.',out)}};
  const digital=el('details','',host);digital.className='panel';el('summary','Importar cartão de ponto digital e conferir salário',digital);
  el('p','Relatório diário consolidado em CSV/TSV: matrícula, data, minutos previstos, minutos trabalhados e ocorrência. Horas podem ser HH:MM ou minutos inteiros. Arquivos brutos do relógio, PDF e XLSX ainda requerem adaptador específico.',digital);
  const df=(label,type,parent=digital)=>{const l=el('label',label,parent);l.style.cssText='display:block;margin:6px 0';const x=el('input','',l);x.type=type;x.style.cssText='display:block;width:100%;max-width:100%;box-sizing:border-box';return x};
  const ds=(label,parent=digital)=>{const l=el('label',label,parent),x=el('select','',l);x.setAttribute('aria-label',label);x.style.cssText='display:block;width:100%;max-width:100%';return x};
  const opt=(select,value,label)=>{const x=el('option',label,select);x.value=value;return x};
  const dbtn=(label,parent,fn)=>{const x=el('button',label,parent);x.type='button';x.className='secondary';x.onclick=fn;return x};
  const dfile=df('Relatório digital','file'),sep=ds('Separador do relatório'),mapHost=el('div','',digital),linkHost=el('div','',digital),dout=el('div','',digital),salaryHost=el('div','',digital);dfile.accept='.csv,.tsv,.txt,text/csv,text/tab-separated-values';
  opt(sep,';','Ponto e vírgula');opt(sep,',','Vírgula');opt(sep,'\t','Tabulação');
  let rawDigital=null,tableDigital=null,batchDigital=null,requestDigital=0,mapped={},links=new Map();
  function invalidateDigital(){batchDigital=null;dout.replaceChildren();salaryHost.replaceChildren()}
  function drawDigital(){
   invalidateDigital();mapHost.replaceChildren();linkHost.replaceChildren();if(!active()||rawDigital===null)return;
   try{tableDigital=root.HLGBAttendance9658.digitalTable(rawDigital,sep.value,true)}catch(_){tableDigital=null;el('p','Não foi possível ler o arquivo. Confira separador e cabeçalhos.',mapHost);return}
   el('p',tableDigital.rows.length+' linhas lidas. Confira a associação das colunas.',mapHost);
   mapped={};links.clear();
   for(const [key,label,aliases] of [['employee','Matrícula / ID',['funcionario_id','matricula','id','codigo']],['date','Data',['data','date']],['scheduled','Duração prevista',['minutos_previstos','horas_previstas','jornada']],['worked','Duração trabalhada',['minutos_trabalhados','horas_trabalhadas','trabalhado']],['status','Ocorrência',['ocorrencia','status']]]){
    const x=ds(label,mapHost);opt(x,'','Escolher coluna');for(const c of tableDigital.columns)opt(x,c,c);x.value=tableDigital.columns.find(c=>aliases.includes(c.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim().replace(/\s+/g,'_')))||'';mapped[key]=x;x.onchange=invalidateDigital;
   }
   el('p','Use o ID do cadastro ou vincule a matrícula externa ao funcionário. Não fazemos associação automática por nome.',linkHost);
   const code=df('Matrícula externa','text',linkHost),person=ds('Funcionário correspondente',linkHost);opt(person,'','Escolher funcionário');
   for(const e of (data()?.employees||[]).filter(e=>e&&!e.deletedAt&&!e.deleted_at&&!e.deleted&&!e._deleted))opt(person,String(e.id),String(e.name||e.id)+' · ID '+e.id);
   const linkList=el('div','',linkHost);
   const showLinks=()=>{linkList.replaceChildren();for(const [k,v] of links){const row=el('div',k+' → ID '+v,linkList);dbtn('Remover vínculo',row,()=>{links.delete(k);invalidateDigital();showLinks()})}};
   dbtn('Vincular matrícula nesta sessão',linkHost,()=>{if(!active()||!/^[A-Za-z0-9_-]{1,100}$/.test(code.value.trim())||!person.value)return;links.set(code.value.trim(),person.value);invalidateDigital();showLinks()});
  }
  dfile.addEventListener('change',async()=>{const f=dfile.files?.[0],token=++requestDigital;rawDigital=null;tableDigital=null;drawDigital();if(!f||f.size>2000000||!active())return;try{const t=await f.text();if(token!==requestDigital||!active())return;rawDigital=t;drawDigital()}catch(_){if(active())el('p','Falha ao ler relatório.',dout)}});
  sep.onchange=drawDigital;month.addEventListener('change',()=>{requestDigital++;rawDigital=null;tableDigital=null;dfile.value='';drawDigital()});
  dbtn('Conferir relatório de ponto',digital,()=>{
   invalidateDigital();if(!active()||!tableDigital)return;
   const mapping=Object.fromEntries(Object.entries(mapped).map(([k,x])=>[k,x.value]));
   const x=root.HLGBAttendance9658.inspectDigital(tableDigital,mapping,data()?.employees,month.value,true,[...links].map(([code,employeeId])=>({code,employeeId})));
   if(x.state!=='local-digital-preview'){el('p','Confira colunas, vínculos e competência.',dout);return}
   batchDigital=x;el('p',x.rows.length+' dias/funcionários importados · '+x.duplicateCount+' repetidos ignorados · '+x.issues.length+' linhas a revisar.',dout);
   for(const i of x.issues.slice(0,30))el('p','Linha '+i.line+' · '+i.reason+' · matrícula '+i.code,dout);
   const person=ds('Funcionário para prévia salarial',salaryHost);opt(person,'','Escolher funcionário');
   for(const pid of new Set(x.rows.map(r=>r.employeeId))){const e=(data()?.employees||[]).find(z=>String(z.id)===pid);opt(person,pid,String(e?.name||pid))}
   const divisor=df('Divisor mensal de horas (confirmar com RH/contador)','number',salaryHost),ded=df('Minutos de desconto aprovados','number',salaryHost),extra=df('Minutos extras aprovados','number',salaryHost),percent=df('Percentual total de hora extra (ex.: 150)','number',salaryHost),reviewLabel=el('label','Conferi a jornada, regras e valores',salaryHost),review=el('input','',reviewLabel);review.type='checkbox';
   for(const field of [divisor,ded,extra,percent]){field.min='0';field.step='1'}
   const result=el('div','',salaryHost);const current=()=>active()&&batchDigital===x;
   const calculate=()=>{
    result.replaceChildren();if(!current())return;
    const matches=(data()?.employees||[]).filter(e=>String(e.id)===person.value&&!e.deletedAt&&!e.deleted_at&&!e.deleted&&!e._deleted);
    if(matches.length!==1)return;
    const n=v=>v.trim()===''?NaN:Number(v),p=root.HLGBAttendance9658.salaryDigitalPreview(x,matches[0],{monthlyHours:n(divisor.value),approvedDeductionMinutes:n(ded.value),approvedExtraMinutes:n(extra.value),extraPercent:n(percent.value),reviewed:review.checked},true);
    if(p.state!=='local-salary-preview'){el('p','Informe o divisor mensal revisado e confira o salário do cadastro.',result);return}
    el('p','Salário-base cadastrado: '+money(p.baseCents)+' · Previsto '+p.counts.scheduled+' min · Trabalhado '+p.counts.worked+' min',result);
    el('p','Faltas injustificadas '+p.counts.absenceUnjustified+' min · Justificadas '+p.counts.absenceJustified+' min · Jornada abaixo da prevista '+p.counts.shortfall+' min · Jornada acima '+p.counts.extra+' min',result);
    el('p','Dias sem linha no relatório: '+p.missingDays+' · Pendências: '+p.counts.pending+' · Linhas a revisar: '+p.issues,result);
    if(p.reviewed)el('p','Desconto simulado '+money(p.deductionCents)+' · Acréscimo simulado '+money(p.extraCents)+' · Bruto indicativo '+money(p.indicativeGrossCents)+(p.partial?' · Dados incompletos; não fechar folha.':''),result);else el('p','Confirme os minutos autorizados, percentual e divisor. Ausência de linha não é falta.',result);
    el('p','Não é salário líquido nem fechamento da folha; não inclui demais verbas, tributos ou ajustes. Nada foi gravado.',result);
   };
   for(const f of [person,divisor,ded,extra,percent])f.onchange=()=>{review.checked=false;calculate()};review.onchange=calculate;
   dbtn('Calcular impacto no salário',salaryHost,calculate);
   const collective=el('details','',salaryHost);el('summary','Conferência salarial coletiva',collective);
   el('p','Confira todos os funcionários, inclusive os que não aparecem no arquivo. Os valores são prévias brutas; nenhum lançamento automático.',collective);
   const roster=root.HLGBAttendance9658.digitalSalaryRoster(x,data()?.employees,true);
   if(roster.state!=='local-digital-roster')return;
   const query=df('Buscar funcionário ou confecção','search',collective),list=el('div','',collective),report=el('div','',collective),selected=new Map();let offset=0;
   const filtered=()=>roster.rows.filter(r=>(r.name+' '+r.company+' '+r.employeeId).toLocaleLowerCase('pt-BR').includes(query.value.toLocaleLowerCase('pt-BR')));
   function choose(r){if(!selected.has(r.employeeId)&&selected.size<200)selected.set(r.employeeId,{employeeId:r.employeeId,signature:r.signature,monthlyHours:null,approvedDeductionMinutes:null,approvedExtraMinutes:null,extraPercent:null,reviewed:false})}
   function draw(){
    list.replaceChildren();report.replaceChildren();if(!current())return;const visible=filtered();
    if(offset>=visible.length)offset=Math.max(0,Math.floor((visible.length-1)/20)*20);
    el('p',visible.length+' funcionários no filtro · '+selected.size+' selecionados',list);
    for(const r of visible.slice(offset,offset+20)){
     const card=el('article','',list);card.className='panel';const s=selected.get(r.employeeId);
     dbtn((s?'Remover ':'Adicionar ')+r.name+' · '+r.company+(r.imported?'':' · Sem ponto importado'),card,()=>{if(!current())return;if(s)selected.delete(r.employeeId);else choose(r);draw()});
     if(!s||!r.imported)continue;
     el('p','Salário-base atual: '+money(r.baseCents),card);
     const fields=[['monthlyHours','Divisor mensal'],['approvedDeductionMinutes','Minutos de desconto aprovados'],['approvedExtraMinutes','Minutos extras aprovados'],['extraPercent','Percentual total de hora extra']];
     const label=el('label','Conferi parâmetros e ocorrências deste funcionário',card),check=el('input','',label);check.type='checkbox';check.checked=s.reviewed;
     for(const [key,title] of fields){const f=df(title,'number',card);f.min='0';f.step='1';f.value=s[key]===null?'':String(s[key]);f.onchange=()=>{s[key]=f.value.trim()===''?null:Number(f.value);s.reviewed=false;check.checked=false;report.replaceChildren()}}
     check.onchange=()=>{s.reviewed=check.checked;report.replaceChildren()};
    }
    if(offset>0)dbtn('Funcionários anteriores',list,()=>{offset-=20;draw()});if(offset+20<visible.length)dbtn('Mais funcionários',list,()=>{offset+=20;draw()});
   }
   query.oninput=()=>{offset=0;draw()};
   dbtn('Selecionar todos do filtro',collective,()=>{if(!current())return;const all=filtered();if(new Set([...selected.keys(),...all.map(r=>r.employeeId)]).size>200){report.replaceChildren();el('p','Limite de 200 funcionários por conferência.',report);return}for(const r of all)choose(r);draw()});
   dbtn('Limpar seleção',collective,()=>{selected.clear();draw()});
   dbtn('Calcular prévia salarial coletiva',collective,()=>{
    report.replaceChildren();if(!current())return;const b=root.HLGBAttendance9658.digitalSalaryBatch(x,data()?.employees,[...selected.values()],true);
    if(b.state!=='local-digital-batch'){el('p','Selecione os funcionários e confira os parâmetros.',report);return}
    el('h4',b.reviewedCount+' de '+b.selectedCount+' funcionários calculados',report);
    el('p',b.partial?'Prévia parcial: existem dados faltantes, pendências ou parâmetros não conferidos.':'Prévia bruta dos dados revisados; não é fechamento da folha.',report);
    if(b.totals)el('p','Salários-base '+money(b.totals.baseCents)+' · Descontos '+money(b.totals.deductionCents)+' · Extras '+money(b.totals.extraCents)+' · Bruto indicativo '+money(b.totals.indicativeGrossCents),report);
    for(const r of b.rows){const item=el('article','',report);el('strong',r.name+' · '+r.company,item);if(r.preview){const p=r.preview;el('p','Faltas injustificadas '+p.counts.absenceUnjustified+' min · Justificadas '+p.counts.absenceJustified+' min · Diferença de jornada '+p.counts.shortfall+' min · Extras observadas '+p.counts.extra+' min · Dias sem registro '+p.missingDays,item);if(p.reviewed)el('p','Descontos '+money(p.deductionCents)+' · Extras '+money(p.extraCents)+' · Bruto indicativo '+money(p.indicativeGrossCents),item)}if(r.reason)el('p',({'roster-or-report-changed':'Cadastro ou relatório alterado: importe novamente','missing-attendance':'Sem ponto importado','parameters-unreviewed':'Parâmetros ainda não conferidos','unavailable':'Confira salário e divisor'})[r.reason]||r.reason,item)}
   });draw();
   const transportSection=el('details','',salaryHost);el('summary','Usar este relatório para conferir passagem',transportSection);
   el('p','Associe três colunas explícitas do mesmo arquivo: deslocamento (sim/nao/pendente), passagem antecipada por dia em reais (ou vazia) e compensada (sim/nao/pendente). Não inferimos deslocamento pela presença ou falta.',transportSection);
   const transportMapped={};
   for(const [key,label,alias] of [['commute','Deslocamento','deslocamento'],['advance','Antecipação diária','passagem_antecipada'],['adjusted','Compensação anterior','compensada']]){
    const sel=ds(label,transportSection);opt(sel,'','Escolher coluna');for(const c of tableDigital.columns)opt(sel,c,c);sel.value=tableDigital.columns.includes(alias)?alias:'';transportMapped[key]=sel;
   }
   const transportOut=el('div','',transportSection);
   for(const sel of Object.values(transportMapped))sel.onchange=()=>transportOut.replaceChildren();
   dbtn('Conferir e carregar passagem do mesmo arquivo',transportSection,()=>{
    transportOut.replaceChildren();if(!current()||!tableDigital)return;
    const v=root.HLGBAttendance9658.digitalTransportBridge(tableDigital,mapping,data()?.employees,month.value,[...links].map(([code,employeeId])=>({code,employeeId})),Object.fromEntries(Object.entries(transportMapped).map(([k,s])=>[k,s.value])),true);
    if(v.state!=='local-preview'||!v.rows.length){el('p','Sem evidência suficiente. Confira colunas e vínculos; a prévia anterior permanece.',transportOut);return}
    if(batch&&!confirm('Substituir a prévia de passagem atual nesta sessão? Nenhum dado gravado será alterado.'))return;
    request++;batch=v;file.value='';employee.replaceChildren();out.replaceChildren();resetBatch();
    for(const pid of new Set(v.rows.map(r=>r.employeeId))){const e=(data()?.employees||[]).find(x=>String(x.id)===pid);opt(employee,pid,String(e?.name||pid)+' · ID '+pid)}
    el('p',v.rows.length+' registros de passagem importados dos '+v.salaryRows+' registros de ponto · '+v.issues.length+' ocorrências a revisar. Confira tarifa e cobertura individual na seção de passagem.',transportOut);
    for(const i of v.issues.slice(0,30))el('p','Linha '+i.line+' · '+i.reason,transportOut);
    refreshBatch();
   });

  });
  const bulk=el('details','',host);bulk.className='panel';el('summary','Conferência coletiva de ponto e passagem por confecção',bulk);
  el('p','Selecione os funcionários, confira a tarifa de cada um e a data até a qual a passagem foi antecipada. O valor sugerido de cobertura é somente calendário; não comprova pagamento. A prévia não altera a edição individual da Folha.',bulk);
  const bulkField=(label,type,val='',parent=bulk)=>{const l=el('label',label,parent);l.style.cssText='display:block;margin:6px 0;min-width:0';const x=el('input','',l);x.type=type;x.value=val;x.style.cssText='display:block;min-width:0;max-width:100%;width:100%;box-sizing:border-box';return x};
  const bulkSelect=(label,parent=bulk)=>{const l=el('label',label,parent);const x=el('select','',l);x.setAttribute('aria-label',label);x.style.cssText='display:block;max-width:100%;width:100%';return x};
  const bbtn=(label,parent,fn)=>{const x=el('button',label,parent);x.type='button';x.className='secondary';x.style.cssText='max-width:100%;white-space:normal;margin:4px 4px 4px 0';x.onclick=fn;return x};
  const check=(label,parent)=>{const l=el('label','',parent);l.style.cssText='display:block';const x=el('input','',l);x.type='checkbox';el('span',' '+label,l);return x};
  const holidays=bulkField('Feriados informados (datas separadas por vírgula)','text'),closed=bulkField('Outros dias sem expediente (datas separadas por vírgula)','text');
  const calendarOut=el('div','',bulk),defaultPaid=bulkField('Data de cobertura comum para preencher seleção','date'),defaultFare=bulkField('Tarifa diária comum para preencher seleção (R$)','text');defaultFare.inputMode='decimal';
  const query=bulkField('Buscar funcionário do lote','search'),company=bulkSelect('Confecção do lote'),rosterHost=el('div','',bulk),editHost=el('div','',bulk),batchOut=el('div','',bulk);batchOut.setAttribute('aria-live','polite');
  let source=null,settings=new Map(),rosterOffset=0,editOffset=0;
  const list=s=>s.split(',').map(x=>x.trim()).filter(Boolean),normalize=x=>String(x??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  const rate=v=>/^\d{1,7}(?:[.,]\d{1,2})?$/.test(v.trim())?Math.round(Number(v.replace(',','.'))*100):null;
  function clearResult(){batchOut.replaceChildren()}
  function resetBatch(){source=null;settings.clear();rosterOffset=0;editOffset=0;rosterHost.replaceChildren();editHost.replaceChildren();company.replaceChildren();calendarOut.replaceChildren();clearResult()}
  function calendar(){calendarOut.replaceChildren();if(!active())return null;const x=root.HLGBAttendance9658.coverageCandidate(month.value,today(),{holidays:list(holidays.value),companyClosed:list(closed.value)},root.HLGBPayrollPlanning9645);if(x.state!=='calendar-candidate'){el('p','Calendário candidato indisponível. Confira competência e datas.',calendarOut);return null}el('p','5º dia de expediente da empresa: '+x.candidate+' · Prazo salarial candidato: '+x.salaryLimitCandidate+' · Programação salarial: '+x.scheduledSalaryCandidate,calendarOut);el('p','Não se presume que a passagem foi paga nessa data. Confira o comprovante/registro antes de usar.',calendarOut);return x}
  bbtn('Consultar quinto dia de expediente',bulk,calendar);
  bbtn('Usar data candidata no campo comum',bulk,()=>{const x=calendar();if(x){defaultPaid.value=x.candidate;clearResult()}});
  function matched(){return (source?.rows||[]).filter(x=>(!company.value||x.company===company.value)&&normalize(x.name+' '+x.id+' '+x.company).includes(normalize(query.value)))}
  function add(r){if(!settings.has(r.id))settings.set(r.id,{employeeId:r.id,signature:r.signature,name:r.name,company:r.company,reviewed:false,paidThrough:'',rateCents:null});}
  function drawRoster(){rosterHost.replaceChildren();if(!active()||!source)return;const rows=matched();if(rosterOffset>=rows.length)rosterOffset=Math.max(0,Math.floor((rows.length-1)/30)*30);el('p',rows.length+' funcionário(s) no filtro · '+settings.size+' selecionado(s)',rosterHost);
   for(const r of rows.slice(rosterOffset,rosterOffset+30)){const b=bbtn((settings.has(r.id)?'Remover ':'Adicionar ')+r.name+' · '+r.company+' · ID '+r.id+(r.imported?'':' · Sem ponto no arquivo'),rosterHost,()=>{if(!active())return;if(settings.has(r.id))settings.delete(r.id);else if(settings.size<200)add(r);clearResult();drawRoster();drawEdits()});b.setAttribute('aria-pressed',String(settings.has(r.id)))}
   if(rosterOffset>0)bbtn('Funcionários anteriores',rosterHost,()=>{rosterOffset-=30;drawRoster()});if(rosterOffset+30<rows.length)bbtn('Mais funcionários',rosterHost,()=>{rosterOffset+=30;drawRoster()})
  }
  function drawEdits(){editHost.replaceChildren();if(!active())return;const rows=[...settings.values()];if(editOffset>=rows.length)editOffset=Math.max(0,Math.floor((rows.length-1)/20)*20);el('h4','Parâmetros individuais ('+rows.length+')',editHost);
   for(const r of rows.slice(editOffset,editOffset+20)){const card=el('article','',editHost);card.className='panel';el('strong',r.name+' · ID '+r.employeeId,card);
    const date=bulkField('Passagem antecipada até', 'date',r.paidThrough,card),price=bulkField('Tarifa diária revisada (R$)','text',r.rateCents===null?'':(r.rateCents/100).toFixed(2),card),verified=check('Conferi a tarifa e a cobertura deste funcionário',card);price.inputMode='decimal';verified.checked=r.reviewed;
    const update=()=>{r.paidThrough=date.value;r.rateCents=rate(price.value);r.reviewed=false;verified.checked=false;clearResult()};date.onchange=update;price.onchange=update;verified.onchange=()=>{r.reviewed=verified.checked;clearResult()};
    if(!source.rows.find(x=>x.id===r.employeeId&&x.signature===r.signature))el('p','Cadastro alterado; remova e selecione novamente.',card);
   }
   if(editOffset>0)bbtn('Parâmetros anteriores',editHost,()=>{editOffset-=20;drawEdits()});if(editOffset+20<rows.length)bbtn('Mais parâmetros',editHost,()=>{editOffset+=20;drawEdits()})
  }
  function refreshBatch(){if(!active()||!batch)return;source=root.HLGBAttendance9658.roster(batch,data()?.employees,active());if(!active())return;if(source.state!=='local-roster'){resetBatch();return}
   const value=company.value;company.replaceChildren();for(const c of ['',...new Set(source.rows.map(x=>x.company).filter(Boolean))]){const o=el('option',c||'Todas',company);o.value=c}company.value=[...company.options].some(x=>x.value===value)?value:'';clearResult();drawRoster();drawEdits();calendar()
  }
  query.oninput=()=>{rosterOffset=0;drawRoster()};company.onchange=()=>{rosterOffset=0;drawRoster()};
  for(const x of [holidays,closed])x.onchange=()=>{calendar();clearResult()};
  bbtn('Selecionar todos do filtro',bulk,()=>{if(!active()||!source)return;const rows=matched().filter(x=>!settings.has(x.id));if(rows.length+settings.size>200){clearResult();el('p','Limite de 200 funcionários por conferência.',batchOut);return}for(const r of rows)add(r);clearResult();drawRoster();drawEdits()});
  bbtn('Limpar seleção coletiva',bulk,()=>{settings.clear();clearResult();drawRoster();drawEdits()});
  bbtn('Preencher parâmetros comuns nos selecionados',bulk,()=>{if(!active()||!settings.size)return;const r=rate(defaultFare.value);if(r===null||!defaultPaid.value){clearResult();el('p','Informe a data e a tarifa comuns.',batchOut);return}if([...settings.values()].some(x=>x.reviewed||x.paidThrough||x.rateCents!==null)&&!confirm('Substituir os parâmetros individuais atuais pelos valores comuns? A revisão individual será desmarcada.'))return;for(const x of settings.values()){x.paidThrough=defaultPaid.value;x.rateCents=r;x.reviewed=false}clearResult();drawEdits()});
  bbtn('Atualizar cadastro do lote',bulk,refreshBatch);
  const reasons={'roster-changed':'Cadastro alterado ou não localizado','attendance-missing':'Sem ponto importado para o funcionário','eligibility-unknown':'Elegibilidade à passagem não informada','parameters-unreviewed':'Tarifa/cobertura sem revisão individual','coverage-in-future':'Cobertura futura ainda não comprovada','preview-unavailable':'Não foi possível calcular'};
  bbtn('Calcular prévia coletiva de passagem',bulk,()=>{clearResult();if(!active()||!batch)return;
   const x=root.HLGBAttendance9658.batchPreview(batch,data()?.employees,[...settings.values()],today(),root.HLGBPayrollPlanning9645,active());if(!active())return;
   if(x.state!=='local-batch-preview'){el('p','Selecione funcionários e confira os dados.',batchOut);return}
   el('h4','Resumo da conferência coletiva',batchOut);el('p',x.reviewedCount+' de '+x.selectedCount+' funcionários calculados · '+(x.totalsPartial?'Totais parciais: há lacunas a revisar.':'Dados locais informados; não é fechamento oficial.'),batchOut);
   el('p','Antecipação observada após cobertura: '+money(x.observedForecastCents)+' · Crédito possível por falta de deslocamento: '+money(x.observedCreditCents),batchOut);el('p','Nenhum desconto aplicado. Não subtrair os créditos automaticamente do salário.',batchOut);
   for(const r of x.rows){const card=el('article','',batchOut);card.className='panel';el('h4',r.name+' · '+r.company,card);if(r.state!=='observed'){el('p',reasons[r.reason]||r.reason,card);continue}el('p','Antecipação '+money(r.forecastCents)+' · Crédito possível '+money(r.possibleCreditCents)+' · Primeiro dia descoberto '+(r.firstUncoveredDate||'Não identificado'),card);el('p','Faltas justificadas '+r.counts.justified+' · Injustificadas '+r.counts.unjustified+' · Pendências '+r.counts.pending+' · Dias sem registro '+r.missingDays,card);if(r.issues?.length)el('p','Conferir evidências de antecipação e ponto ('+r.issues.length+' tipos).',card)}
  });

 }
 document.addEventListener('click',()=>setTimeout(mount,0),true);document.addEventListener('visibilitychange',()=>{clear();if(!document.hidden)mount()});root.addEventListener?.('hlgb:logout',clear);root.addEventListener?.('hlgb:authenticated',()=>{clear();mount()});setTimeout(mount,700);
})(typeof window!=='undefined'?window:null);
