/* modulos/auditor-v3.js */
/* Auditor 3.0: diagnóstico local, evidências e rechecagem, nunca autocorreção financeira. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.HLGBLabAuditorV3=api;})(typeof window!=='undefined'?window:null,function factory(){
 'use strict';
 const fields=['ordered','cut','allocated','returned','separated','shipped'];
 const priorities={critica:0,alta:1,media:2,informativa:3};
 const arr=(s,k)=>Array.isArray(s[k])?s[k]:[];
 const day=x=>typeof x==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(x)&&Number.isFinite(Date.parse(x+'T00:00:00Z'))&&new Date(x+'T00:00:00Z').toISOString().slice(0,10)===x;
 const stamp=x=>typeof x==='string'&&Number.isFinite(Date.parse(x))&&new Date(x).toISOString()===x;
 const sum=x=>Object.values(x||{}).reduce((a,b)=>a+b,0);
 const qty=o=>({ordered:sum(o.grade),cut:sum(o.cut),allocated:o.allocated,returned:o.returned,separated:o.separated,shipped:o.shipped});
 function analyze(s){
 if(s?.schema!=='hlgb-evolucao-operacao-ficticia-v1')throw Error('Documento fora do laboratório.');
 const checks=[],findings=[],keys=new Set(),events=arr(s,'log'),byCommand=new Map(events.map(e=>[e.commandId,e])),orders=arr(s,'orders'),titles=arr(s,'finance'),moves=arr(s,'stockLedger'),reviews=arr(s,'auditReviews');
 const add=(code,severity,module,id,message,evidence,action)=>{const key=code+'|'+String(id);if(keys.has(key))return;keys.add(key);findings.push({key,code,severity,module,recordId:String(id),message,evidence:String(evidence),action});};
 const run=(id,label,test)=>{const before=findings.length;try{const coverage=test();const count=findings.length-before;checks.push({id,label,status:count?'falha':coverage==='partial'?'parcial':'conforme',findings:count});}catch(e){checks.push({id,label,status:'erro_de_verificacao',findings:0});add('AUDITOR_REGRA_FALHOU','alta','auditor',id,'Verificação não concluída.',e.message,'Revisar a regra e não interpretar ausência de alertas como aprovação.');}};
 run('revision','Sequência de revisões e prova de salvamento',()=>{
 const base=events[0]?.type==='demo.reset'&&Number.isSafeInteger(events[0].revision)&&events[0].revision>=2?events[0].revision-1:1;
 if(s.revision!==events.length+base)add('REVISAO_CONTAGEM','critica','nucleo','documento','Revisão não corresponde ao número de eventos.',s.revision+' / '+events.length,'Comparar snapshot e trilha; não repetir gravações.');
 const seen=new Set();events.forEach((e,i)=>{if(!e.commandId||seen.has(e.commandId)||e.revision!==base+i+1)add('EVENTO_SEQUENCIA','critica','nucleo',e.commandId||i,'Evento duplicado, ausente ou fora da sequência.',e.revision+' / esperado '+(base+i+1),'Conferir histórico e idempotência.');seen.add(e.commandId);});
 if(s.revisionProof!==(events.at(-1)?.commandId||'seed'))add('REVISAO_PROVA','critica','nucleo','documento','Prova de revisão não corresponde ao último comando.',s.revisionProof,'Comparar releitura e última operação.');
 });
 run('finance','Valores, datas e conciliação financeira',()=>{
 const ids=new Set(),refs=new Set();for(const f of titles){if(!f.id||ids.has(f.id)||!Number.isSafeInteger(f.amountCents)||f.amountCents<=0||!['pagar','receber'].includes(f.kind)||!['aberto','pago'].includes(f.status))add('FIN_TITULO_INVALIDO','critica','hub',f.id,'Título inválido ou duplicado.',String(f.kind)+' / '+f.amountCents+' / '+f.status,'Conferir título original antes de alterar.');ids.add(f.id);
 if(f.dueDate!=null&&!day(f.dueDate)||f.paidDate!=null&&!day(f.paidDate))add('FIN_DATA_INVALIDA','alta','hub',f.id,'Data financeira inválida.',String(f.dueDate)+' / '+String(f.paidDate),'Conferir documento e data original.');
 if(f.status==='pago'&&!f.paidDate)add('FIN_BAIXA_SEM_DATA','media','hub',f.id,'Baixa sem data registrada.','Não entra no fluxo datado.','Verificar comprovante; não inventar data.');
 const c=f.reconciliation;if(c){const e=byCommand.get(c.commandId);if(f.status!=='pago'||c.amountCents!==f.amountCents||!c.reference||refs.has(c.reference)||!day(c.date)||e?.type!=='finance.reconcile'||!String(e.description||'').startsWith(f.id+' ·'))add('FIN_CONCILIACAO_INVALIDA','critica','hub',f.id,'Conciliação sem prova válida, divergente ou repetida.',String(c.reference)+' / '+c.amountCents+' / '+String(c.commandId),'Conferir extrato e título sem efetuar novo pagamento.');refs.add(c.reference);}
 }});
 run('pcp','Planejamento e fluxo físico dos pedidos',()=>{
 if(s.pcpCapacity&&['corte','envio','costura','separacao','expedicao'].some(k=>!Number.isSafeInteger(s.pcpCapacity[k])||s.pcpCapacity[k]<=0||s.pcpCapacity[k]>100000))add('PCP_CAPACIDADE_INVALIDA','alta','producao','capacidades','Capacidade diária inválida.','Configuração fora do intervalo.','Revisar parâmetros de capacidade.');
 for(const o of orders){const q=Object.values(qty(o));if(q.some((v,i)=>!Number.isSafeInteger(v)||v<0||i>0&&v>q[i-1]))add('PCP_FLUXO_INVALIDO','critica','producao',o.id,'Quantidade superior à etapa anterior.',q.join(' → '),'Conferir pedido e movimentações de cada etapa.');
 if(o.pcp){const p=o.pcp,e=byCommand.get(p.commandId);if(!day(p.dueDate)||!['urgente','alta','normal','baixa'].includes(p.priority)||!p.reason||e?.type!=='pcp.plan'||!String(e.description||'').startsWith(o.id+' ·'))add('PCP_PLANO_SEM_PROVA','alta','producao',o.id,'Planejamento inválido ou sem evento correspondente.',String(p.commandId)+' / '+String(p.dueDate),'Conferir prioridade, prazo e histórico de alterações.');}
 }});
 run('history','Histórico de movimentos, sem reconstruir lacunas',()=>{
 const captured=events.filter(e=>Array.isArray(e.changes)&&Array.isArray(e.moves)),all=captured.length===events.length,totals=new Map(),moveProof=new Map(),orderIds=new Set(orders.map(x=>x.id));
 for(const e of events){if(e.recordedAt!=null&&!stamp(e.recordedAt))add('HIST_DATA_INVALIDA','alta','relatorios',e.commandId,'Data de registro inválida.',e.recordedAt,'Preservar evento e investigar origem da data.');
 if(!Array.isArray(e.changes)||!Array.isArray(e.moves))continue;
 const seen=new Set();for(const c of e.changes){if(!orderIds.has(c.orderId)||seen.has(c.orderId)||fields.some(k=>!Number.isSafeInteger(c.delta?.[k])))add('HIST_DELTA_INVALIDO','critica','relatorios',e.commandId,'Alteração de pedido inválida ou repetida.',String(c.orderId),'Conferir trilha e registro original.');seen.add(c.orderId);
 if(!totals.has(c.orderId))totals.set(c.orderId,Object.fromEntries(fields.map(k=>[k,0])));const t=totals.get(c.orderId);for(const k of fields)if(Number.isSafeInteger(c.delta?.[k]))t[k]+=c.delta[k];}
 for(const m of e.moves){if(!m.id||moveProof.has(m.id)||!Number.isSafeInteger(m.deltaGrams))add('HIST_MOV_REPETIDO','critica','estoque',m.id,'Movimento repetido ou inválido na trilha.',e.commandId,'Conferir ID do movimento e evitar nova baixa.');moveProof.set(m.id,{...m,commandId:e.commandId});}
 }
 const ledger=new Map(moves.map(x=>[x.id,x]));for(const [id,p] of moveProof){const x=ledger.get(id);if(!x||x.deltaGrams!==p.deltaGrams||x.materialId!==p.materialId||x.sourceId!==p.sourceId||x.type!==p.type||x.commandId!==p.commandId)add('HIST_MOV_DIVERGENTE','critica','estoque',id,'Movimento histórico diverge do estoque atual.',p.commandId,'Comparar trilha com movimento original, sem reconstrução automática.');}
 if(all){for(const o of orders){const t=totals.get(o.id)||{},q=qty(o);if(fields.some(k=>(t[k]||0)!==q[k]))add('HIST_PEDIDO_DIVERGENTE','critica','pedidos',o.id,'Soma dos movimentos não corresponde ao pedido atual.',fields.map(k=>k+': '+(t[k]||0)+' / '+q[k]).join(' · '),'Conferir alterações e baixas; preservar histórico.');}
 for(const m of moves)if(!moveProof.has(m.id))add('HIST_MOV_SEM_PROVA','critica','estoque',m.id,'Movimento sem evento correspondente.',m.commandId,'Investigar a gravação e não repetir baixa.');}
 return all?'complete':'partial';
 });
 run('reviews','Registro de revisões e verificação de ocorrências',()=>{
 const seen=new Set();for(const x of reviews){const e=byCommand.get(x.commandId);if(!x.key||!x.note||seen.has(x.commandId)||!['investigado','verificado'].includes(x.status)||e?.type!=='audit.review'||!String(e.description||'').startsWith(x.key+' · '+x.status))add('AUDIT_REVISAO_INVALIDA','alta','auditor',x.commandId,'Registro de revisão sem trilha correspondente.',x.key,'Conferir a ocorrência e a evidência original.');seen.add(x.commandId);}
 });
 findings.sort((a,b)=>priorities[a.severity]-priorities[b.severity]||a.key.localeCompare(b.key));
 const latest=new Map();for(const x of reviews)latest.set(x.key,x);
 const cases=findings.map(f=>({...f,review:latest.get(f.key)||null,state:'detectado'}));
 const previously=Array.from(latest.values()).filter(x=>!keys.has(x.key)).map(x=>({...x,state:x.status==='verificado'?'verificado':'aguarda_verificacao'}));
 const bySeverity={critica:0,alta:0,media:0,informativa:0};for(const f of findings)bySeverity[f.severity]++;
 return {schema:'hlgb-lab-auditor-v3',revision:s.revision,productionApproval:false,checks,findings:cases,previously,bySeverity,status:findings.length?'investigar':checks.some(x=>x.status!=='conforme')?'cobertura_parcial':'sem_alertas_nas_regras_cobertas',legacyEvents:events.filter(e=>!Array.isArray(e.changes)||!Array.isArray(e.moves)).length,undatedEvents:events.filter(e=>!stamp(e.recordedAt)).length};
 }
 function review(s,{key,note,status},ctx){const result=analyze(s),current=result.findings.find(x=>x.key===key),prior=[...arr(s,'auditReviews')].reverse().find(x=>x.key===key);
 if(status==='investigado'){if(!current)throw Error('Ocorrência não está presente nesta revisão.');}
 else if(status==='verificado'){if(current)throw Error('A regra ainda detecta a ocorrência; não é possível encerrar.');if(!prior||prior.status!=='investigado')throw Error('Não há investigação anterior pendente.');const checkId=prior.checkId;if(result.checks.find(x=>x.id===checkId)?.status!=='conforme')throw Error('A verificação da regra não está completa.');}
 else throw Error('Estado de revisão inválido.');
 const checkId=current?({REVISAO:'revision',EVENTO:'revision',FIN:'finance',PCP:'pcp',HIST:'history',AUDIT:'reviews',AUDITOR:'reviews'}[current.code.split('_')[0]]):prior.checkId;
 if(current?.code==='AUDITOR_REGRA_FALHOU'||!checkId)throw Error('Corrija a regra de auditoria antes de revisar.');
 if(!Array.isArray(s.auditReviews))s.auditReviews=[];
 s.auditReviews.push({key,note,status,checkId,commandId:ctx.uid,revision:s.revision+1});
 return key+' · '+status+' · '+note;
 }
 return {analyze,review};
});

;
/* modulos/bot-v3.js */
/* Bot 3.0: aprendizado verificável por observações locais, sem ações automáticas. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.HLGBLabBotV3=api;})(typeof window!=='undefined'?window:null,function factory(){
 'use strict';
 const severity={critica:0,alta:1,media:2,informativa:3};
 const arr=(s,k)=>Array.isArray(s[k])?s[k]:[];
 const normalize=x=>String(x??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim().replace(/\s+/g,' ');
 const validAudit=(s,a)=>{if(!a||a.revision!==s.revision||!Array.isArray(a.findings)||!Array.isArray(a.checks))throw Error('Diagnóstico da revisão atual indisponível.');};
 const relevant=e=>!['bot.observe','bot.feedback'].includes(e.type);
 const operationalRevision=s=>arr(s,'log').filter(relevant).at(-1)?.revision||1;
 function digest(a){return JSON.stringify(a.findings.map(x=>[x.key,x.severity,x.evidence]).sort((a,b)=>a[0].localeCompare(b[0])));}
 function inspect(s){
 const errors=[],events=new Map(arr(s,'log').map(e=>[e.commandId,e])),seen=new Set(),snapshots=arr(s,'botObservations'),feedback=arr(s,'botFeedback');let last=0;
 for(const x of snapshots){const e=events.get(x.commandId);if(!x.commandId||seen.has(x.commandId)||!Number.isSafeInteger(x.revision)||!Number.isSafeInteger(x.operationalRevision)||x.operationalRevision<=last||x.operationalRevision>=x.revision||e?.type!=='bot.observe'||e.revision!==x.revision||!Array.isArray(x.findings)||!Array.isArray(x.checks)||typeof x.digest!=='string'||x.digest!==digest(x))errors.push('BOT observação sem prova: '+x.commandId);seen.add(x.commandId);last=x.operationalRevision;}
 for(const x of feedback){const e=events.get(x.commandId);if(!x.commandId||seen.has(x.commandId)||e?.type!=='bot.feedback'||e.revision!==x.revision||!['util','nao_util','investigando'].includes(x.outcome)||!x.key||!x.note||!snapshots.some(o=>o.commandId===x.observationId&&o.findings.some(f=>f.key===x.key)&&o.revision<x.revision))errors.push('BOT feedback sem prova: '+x.commandId);seen.add(x.commandId);}
 return errors;
 }
 function observe(s,a,uid){validAudit(s,a);if(a.checks.some(x=>x.status==='erro_de_verificacao'))throw Error('Diagnóstico incompleto: não registrar aprendizado.');
 const op=operationalRevision(s),prior=arr(s,'botObservations').at(-1);if(prior&&prior.operationalRevision>=op)throw Error('Já existe observação desta revisão operacional. Faça uma nova operação antes de registrar outra.');
 const record={commandId:uid,revision:s.revision+1,operationalRevision:op,digest:digest(a),checks:a.checks.map(x=>({id:x.id,status:x.status})),findings:a.findings.map(x=>({key:x.key,code:x.code,severity:x.severity,module:x.module,recordId:x.recordId,message:x.message,evidence:x.evidence,action:x.action}))};
 if(!s.botObservations)s.botObservations=[];s.botObservations.push(record);return 'Observação '+uid+' · revisão operacional '+op+' · '+record.findings.length+' ocorrências';
 }
 function feedback(s,p,uid){const observation=arr(s,'botObservations').find(x=>x.commandId===p.observationId);if(!observation||!observation.findings.some(x=>x.key===p.key))throw Error('Recomendação sem observação correspondente.');
 if(!['util','nao_util','investigando'].includes(p.outcome))throw Error('Resultado inválido.');
 if(!s.botFeedback)s.botFeedback=[];s.botFeedback.push({commandId:uid,revision:s.revision+1,observationId:p.observationId,key:p.key,outcome:p.outcome,note:p.note});return p.key+' · '+p.outcome+' · '+p.note;
 }
 function analyze(s,a){validAudit(s,a);const snapshots=arr(s,'botObservations'),feedback=arr(s,'botFeedback'),integrity=inspect(s);
 const lineage=new Map(),byCode=new Map(),lastSnapshot=snapshots.at(-1),currentKeys=new Set(a.findings.map(f=>f.key));
 for(const o of snapshots){const codes=new Set();for(const f of o.findings){if(!lineage.has(f.key))lineage.set(f.key,{key:f.key,observations:0,first:o.operationalRevision,last:o.operationalRevision});const x=lineage.get(f.key);x.observations++;x.last=o.operationalRevision;codes.add(f.code);}for(const code of codes)byCode.set(code,(byCode.get(code)||0)+1);}
 const latest=new Map();for(const x of feedback)latest.set(x.key,x);
 const active=a.findings.map(f=>{const history=lineage.get(f.key),count=history?.observations||0,codeCount=byCode.get(f.code)||0,review=latest.get(f.key)||null;const lastWithFinding=[...snapshots].reverse().find(o=>o.findings.some(x=>x.key===f.key));return {...f,observations:count,ruleObservations:codeCount,firstSeen:history?.first||null,lastSeen:history?.last||null,feedback:review,observationId:lastWithFinding?.commandId||null,priorityReason:count>1?'Persistente em revisões distintas':codeCount>1?'Regra recorrente em outras observações':'Gravidade da regra atual'};}).sort((x,y)=>(severity[x.severity]??9)-(severity[y.severity]??9)||y.observations-x.observations||y.ruleObservations-x.ruleObservations||x.key.localeCompare(y.key));
 const recurring=[];for(const [code,count] of byCode)if(count>1)recurring.push({code,observations:count,active:active.filter(x=>x.code===code).length});recurring.sort((a,b)=>b.observations-a.observations||a.code.localeCompare(b.code));
 const inactive=[...lineage.values()].filter(x=>!currentKeys.has(x.key)).map(x=>({...x,verified:a.previously?.some(v=>v.key===x.key&&v.state==='verificado')===true}));
 const incidents=new Map();for(const e of arr(s,'errors')){const key=normalize(e.message);if(!key)continue;const v=incidents.get(key)||{message:e.message,count:0,open:0};v.count++;if(e.status==='aberto')v.open++;incidents.set(key,v);}
 const outcomes={util:0,nao_util:0,investigando:0};for(const x of latest.values())if(Object.hasOwn(outcomes,x.outcome))outcomes[x.outcome]++;
 return {schema:'hlgb-lab-bot-v3',productionApproval:false,revision:s.revision,operationalRevision:operationalRevision(s),canObserve:!integrity.length&&!a.checks.some(x=>x.status==='erro_de_verificacao')&&(!lastSnapshot||lastSnapshot.operationalRevision<operationalRevision(s)),integrity,active,recurring,inactive,incidentPatterns:[...incidents.values()].filter(x=>x.count>1).sort((a,b)=>b.count-a.count),observations:snapshots.length,outcomes,feedbackCount:feedback.length,persistent:active.filter(x=>x.observations>1).length,history:snapshots.map(x=>({commandId:x.commandId,revision:x.revision,operationalRevision:x.operationalRevision,findings:x.findings.length})),feedbackHistory:feedback.map(x=>({...x}))};
 }
 return {analyze,observe,feedback,inspect};
});

;
/* modulos/custos-v1.js */
/* Custos e rateios gerenciais, exclusivamente fictícios. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.HLGBLabCostsV1=api;})(typeof window!=='undefined'?window:null,function factory(){
 'use strict';
 const arr=(s,k)=>Array.isArray(s[k])?s[k]:[];
 const sum=(a,f)=>a.reduce((n,x)=>{const v=f(x),r=n+v;if(!Number.isSafeInteger(v)||!Number.isSafeInteger(r))throw Error('Valor fora do limite seguro');return r;},0);
 const qty=o=>sum(Object.values(o.grade),x=>x);
 const types=['corte','corte-planejado','corte-bom'];
 const cost=(grams,price)=>{if(!Number.isSafeInteger(grams)||grams<0||!Number.isSafeInteger(price)||price<=0||!Number.isSafeInteger(grams*price))throw Error('Peso ou preço inválido');return Math.ceil(grams*price/1000);};
 const eligible=f=>f?.kind==='pagar'&&!f.sourceId&&['Aluguel','Impostos','Transporte','Folha','Outras despesas'].includes(f.category)&&Number.isSafeInteger(f.amountCents)&&f.amountCents>0&&['aberto','pago'].includes(f.status);
 const allocations=s=>arr(s,'costAllocations');
 function capture(before,s,uid){const existing=new Set(arr(before,'stockLedger').map(x=>x.id));
 for(const m of arr(s,'stockLedger'))if(!existing.has(m.id)&&types.includes(m.type)){
 const mat=arr(s,'materials').find(x=>x.id===m.materialId);if(!mat||m.deltaGrams>=0)throw Error('Movimento de corte inválido.');
 const price=m.type==='corte-bom'?arr(s,'bomCutRuns').find(x=>x.id===m.bomCutId)?.materials?.find(x=>x.materialId===m.materialId)?.priceCentsKg:mat.priceCentsKg;
 m.costBasis={priceCentsKg:price,cents:cost(-m.deltaGrams,price),method:'referencia_no_corte',commandId:uid};
 }}
 function inspect(s){const problems=[],titles=new Map(arr(s,'finance').map(x=>[x.id,x])),orders=new Set(arr(s,'orders').map(x=>x.id)),events=new Map(arr(s,'log').map(e=>[e.commandId,e])),used=new Map(),seen=new Set();
 for(const a of allocations(s)){const f=titles.get(a.financeId),e=events.get(a.commandId);
 if(!eligible(f)||!orders.has(a.orderId)||!Number.isSafeInteger(a.amountCents)||a.amountCents<=0||!a.reason||seen.has(a.commandId)||e?.type!=='cost.allocate'||!String(e.description).startsWith(a.financeId+' · '+a.orderId+' · '+a.amountCents+' centavos'))problems.push('Rateio sem vínculo válido: '+a.commandId);
 seen.add(a.commandId);used.set(a.financeId,(used.get(a.financeId)||0)+a.amountCents);}
 for(const [id,n] of used)if(!Number.isSafeInteger(n)||n>(titles.get(id)?.amountCents||0))problems.push('Rateio excede título: '+id);
 for(const m of arr(s,'stockLedger'))if(m.costBasis){const b=m.costBasis;try{if(!types.includes(m.type)||m.deltaGrams>=0||b.method!=='referencia_no_corte'||b.commandId!==m.commandId||!events.has(b.commandId)||b.cents!==cost(-m.deltaGrams,b.priceCentsKg))throw Error('Inválido');}catch(e){problems.push('Base de custo divergente: '+m.id);}}
 return problems;}
 function allocate(s,p,uid){const f=arr(s,'finance').find(x=>x.id===p.financeId);if(!eligible(f))throw Error('Somente despesas manuais elegíveis; compras e acertos vinculados não podem ser duplicados.');
 if(!arr(s,'orders').some(x=>x.id===p.orderId))throw Error('Pedido não encontrado.');
 const used=sum(allocations(s).filter(x=>x.financeId===f.id),x=>x.amountCents);
 if(!Number.isSafeInteger(p.amountCents)||p.amountCents<=0||p.amountCents>f.amountCents-used)throw Error('Rateio excede saldo disponível do título.');
 if(!s.costAllocations)s.costAllocations=[];s.costAllocations.push({...p,commandId:uid});
 return f.id+' · '+p.orderId+' · '+p.amountCents+' centavos · '+p.reason;
 }
 function report(s){if(s?.schema!=='hlgb-evolucao-operacao-ficticia-v1')throw Error('Base fora do laboratório.');const issues=inspect(s);if(issues.length)throw Error(issues.join('; '));
 const models=new Map(),clients=new Map(),rows=[],materials=new Map(arr(s,'materials').map(x=>[x.id,x])),products=new Map(arr(s,'products').map(x=>[x.id,x])),settlements=arr(s,'settlements'),comps=arr(s,'settlementCompensations'),ledger=arr(s,'stockLedger'),finance=arr(s,'finance');
 const byProduct=id=>products.get(id)?.name||id;
 for(const o of arr(s,'orders')){
 const pieces=qty(o),p=products.get(o.productId),m=materials.get(p?.materialId),moves=ledger.filter(x=>x.sourceId===o.id&&types.includes(x.type));
 const direct=settlements.filter(x=>x.orderId===o.id||(s.packagingLots||[]).some(l=>l.orderId===o.id&&l.status==='concluido'&&l.settlementId===x.id)),directIds=new Set(direct.map(x=>x.id)),corrections=comps.filter(x=>directIds.has(x.settlementId)),rateios=allocations(s).filter(x=>x.orderId===o.id);let referenceCents=0,unknownGrams=0,wasteGrams=0,unknownWasteGrams=0,materialDetails=[];
 for(const x of moves){const bom=x.type==='corte-bom'?arr(s,'bomCutRuns').find(b=>b.id===x.bomCutId)?.materials?.find(b=>b.materialId===x.materialId):null;const b=x.costBasis;const cents=b?.cents??bom?.theoreticalCostCents??null,price=b?.priceCentsKg??bom?.priceCentsKg??null;if(cents===null)unknownGrams+=-x.deltaGrams;else referenceCents+=cents;if(Number.isSafeInteger(x.scrapGrams))wasteGrams+=x.scrapGrams;else unknownWasteGrams+=-x.deltaGrams;materialDetails.push({id:x.id,materialId:x.materialId,grams:-x.deltaGrams,priceCentsKg:price,cents,source:b?'referencia_registrada':bom?'BOM_registrado':'sem_preco_historico'});}
 const revenue=pieces*o.priceCents;if(!Number.isSafeInteger(revenue))throw Error('Receita fora do limite');
 const labor=sum(direct,x=>x.amountCents)+sum(corrections,x=>x.deltaCents),overhead=sum(rateios,x=>x.amountCents),knownCost=referenceCents+labor+overhead;
 const ready=pieces>0&&o.shipped===pieces&&moves.length>0&&unknownGrams===0&&sum(direct.filter(x=>x.kind==='retorno'),x=>x.qty)===pieces;
 const difference=ready?revenue-knownCost:null;
 const theoreticalMaterial=p&&m&&Number.isSafeInteger(p.gramsPerUnit)&&p.gramsPerUnit>0?cost(p.gramsPerUnit,m.priceCentsKg):null;
 const data={id:o.id,productId:o.productId,model:byProduct(o.productId),clientId:o.clientId,client:arr(s,'clients').find(x=>x.id===o.clientId)?.name||o.clientId,pieces,shipped:o.shipped,revenue,referenceCents,unknownGrams,wasteGrams,unknownWasteGrams,labor,overhead,knownCost,theoreticalMaterial,difference,partialMarginPercent:difference!==null&&revenue>0?Math.round(difference*10000/revenue)/100:null,knownUnitReference:ready?Math.round(knownCost/pieces):null,materialDetails,settlementIds:direct.map(x=>x.id),compensationIds:corrections.map(x=>x.id),allocationCommands:rateios.map(x=>x.commandId),status:ready?'resultado_parcial_disponivel':'incompleto'};
 rows.push(data);
 for(const [map,id,label] of [[models,o.productId,data.model],[clients,o.clientId,data.client]]){const g=map.get(id)||{id,name:label,orders:0,pieces:0,revenue:0,knownCost:0,unknownGrams:0,complete:0,partialDifference:0};g.orders++;g.pieces+=pieces;g.revenue+=revenue;g.knownCost+=knownCost;g.unknownGrams+=unknownGrams;if(ready){g.complete++;g.partialDifference+=difference;}map.set(id,g);}
 }
 const manual=finance.filter(eligible).map(f=>{const used=sum(allocations(s).filter(x=>x.financeId===f.id),x=>x.amountCents);return {id:f.id,description:f.description,category:f.category,total:f.amountCents,allocated:used,remaining:f.amountCents-used};});
 const loose=settlements.filter(x=>!x.orderId&&!x.packagingLotId).map(x=>({id:x.id,model:byProduct(x.productId),service:x.serviceType,amountCents:x.amountCents+sum(comps.filter(c=>c.settlementId===x.id),c=>c.deltaCents)}));
 return {schema:'hlgb-lab-custos-v1',revision:s.revision,productionApproval:false,rows,models:[...models.values()],clients:[...clients.values()],manual,loose,totals:{orders:rows.length,revenue:sum(rows,x=>x.revenue),knownCost:sum(rows,x=>x.knownCost),unknownGrams:sum(rows,x=>x.unknownGrams),eligibleOrders:rows.filter(x=>x.difference!==null).length,unallocated:sum(manual,x=>x.remaining),looseCost:sum(loose,x=>x.amountCents)}};
 }
 return {capture,allocate,inspect,report,eligible,cost};
});

;
/* modulos/recuperacao-v1.js */
/* Reparos locais restritos a metadados e diagnóstico de intenção, sem replay automático. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.HLGBLabRecoveryV1=api;})(typeof window!=='undefined'?window:null,function factory(){
 'use strict';
 const schema='hlgb-evolucao-operacao-ficticia-v1';
 function chain(s){const events=s.log||[],base=events[0]?.type==='demo.reset'&&Number.isSafeInteger(events[0].revision)&&events[0].revision>=2?events[0].revision-1:1;
 const ids=new Set();return Number.isSafeInteger(s.revision)&&s.revision===base+events.length&&events.every((e,i)=>{if(!e.commandId||ids.has(e.commandId)||e.revision!==base+i+1)return false;ids.add(e.commandId);return true;});}
 function simulate(s,inspect,audit){if(s?.schema!==schema)throw Error('Documento fora do laboratório.');
 const expected=s.log.at(-1)?.commandId||'seed',before=s.revisionProof;let blocked=[];
 if(!chain(s))blocked.push('Sequência do histórico não comprovada.');
 const result=inspect(s);if(!result.ok)blocked.push(...result.problems);
 const a=audit(s);if(a.revision!==s.revision||a.checks.some(x=>x.status==='erro_de_verificacao'))blocked.push('Auditoria incompleta.');
 const other=a.findings.filter(x=>x.severity==='critica'&&x.code!=='REVISAO_PROVA');if(other.length)blocked.push('Outras falhas críticas: '+other.map(x=>x.code).join(', '));
 if(before===expected)return {revision:s.revision,action:'revisionProof',status:'not_needed',before,expected,blocked};
 if(blocked.length)return {revision:s.revision,action:'revisionProof',status:'blocked',before,expected,blocked};
 if(typeof before!=='string'||typeof expected!=='string')return {revision:s.revision,action:'revisionProof',status:'blocked',before,expected,blocked:['Metadado fora do formato seguro.']};
 return {revision:s.revision,action:'revisionProof',status:'ready',before,expected,blocked:[],changes:['revisionProof'],businessChanges:0};
 }
 function repair(s,p,ctx){const plan=simulate(s,ctx.inspect,ctx.audit);if(plan.status!=='ready'||p.before!==plan.before||p.expected!==plan.expected||p.revision!==plan.revision)throw Error('Simulação desatualizada ou reparo não permitido.');
 const recovery={commandId:ctx.uid,revision:s.revision+1,action:'revisionProof',before:plan.before,expected:plan.expected,reason:p.reason};
 s.revisionProof=plan.expected;
 const after=ctx.audit(s);if(after.findings.some(x=>x.code==='REVISAO_PROVA')||!ctx.inspect(s).ok)throw Error('Rechecagem não confirmou o reparo.');
 if(!s.repairHistory)s.repairHistory=[];s.repairHistory.push(recovery);return 'Metadado de revisão conferido · '+plan.before+' → '+plan.expected+' · '+p.reason;
 }
 function classify(s,intent,inspect){if(!s||s.schema!==schema||!intent?.commandId||!Number.isSafeInteger(intent.expectedRevision))return {status:'unknown',message:'Documento ou intenção indisponível.'};
 if(!chain(s)||s.revisionProof!==(s.log.at(-1)?.commandId||'seed')||!inspect(s).ok)return {status:'blocked',message:'Integridade da cópia local não confirmada; não repetir.'};
 const ev=s.log.find(x=>x.commandId===intent.commandId);
 if(ev)return ev.type===intent.type&&ev.revision===intent.expectedRevision+1&&(!intent.atomicVersion||typeof intent.actor==='string'&&ev.actor===intent.actor)?{status:'confirmed',revision:ev.revision,message:'Comando encontrado e confirmado na trilha local. Não repetir.'}:{status:'blocked',message:'Comando encontrado com prova divergente.'};
 if(s.revision===intent.expectedRevision)return {status:'not_found_same_revision',message:'Comando não encontrado nesta revisão. Verifique a intenção original; não reenviar automaticamente.'};
 return {status:'unknown',message:'Revisão mudou sem prova do comando; investigar antes de repetir.'};}
 function review(s,intent,inspect){
 const verdict=classify(s,intent,inspect);
 if(verdict.status==='confirmed')return {allowed:true,resolution:'confirmed',message:'Registro encontrado; arquivar apenas a intenção.'};
 if(verdict.status==='not_found_same_revision'&&!intent.atomicVersion)return {allowed:true,resolution:'legacy_absent',message:'Intenção antiga sem gravação na revisão esperada. Exige confirmação explícita e todas as outras abas fechadas.'};
 return {allowed:false,resolution:'investigate',message:verdict.message};
 }
 return {chain,simulate,repair,classify,review};
});

;
/* modulos/servicos-faccao-v1.js */
/* Serviços, papéis e preços fictícios; somente regras locais. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.HLGBLabServicesV1=api;})(typeof window!=='undefined'?window:null,function factory(){
 'use strict';
 const roles=['costura','embalagem','travetada'],categories=['camisola','doll','calcinha','outros'];
 const defaults={camisola:25,doll:25,calcinha:15,outros:null,pointCents:null};
 const n=(v,min,max)=>{if(!Number.isSafeInteger(v)||v<min||v>max)throw Error('Valor ou quantidade inválida.');return v;};
 const text=(v,label)=>{if(typeof v!=='string'||!v.trim()||v.trim().length>95)throw Error(label+' obrigatório, até 95 caracteres.');return v.trim();};
 const norm=x=>String(x??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
 const by=(a,id)=>a.find(x=>x.id===id);
 const cat=p=>p?.serviceCategory||(/calcinha|fio dental/.test(norm(p?.name))?'calcinha':/doll/.test(norm(p?.name))?'doll':/camisola/.test(norm(p?.name))?'camisola':'outros');
 const rates=s=>s.serviceRates||defaults;
 const allows=(f,service)=>!!f&&(!f.serviceRole||f.serviceRole===service);
 function profile(s,p,uid){const f=by(s.factions,p.factionId);if(!f||!roles.includes(p.serviceRole))throw Error('Prestador ou atividade inválida.');
 if(p.serviceRole!=='embalagem'&&(s.packagingLots||[]).some(x=>x.factionId===f.id&&x.status==='aberto'))throw Error('Prestador possui embalagem pendente. Conclua ou cancele antes de mudar papel.');
 if(p.serviceRole!=='costura'&&(s.factionAssignments||[]).some(x=>x.factionId===f.id&&x.qtySent>x.qtyReturned))throw Error('Prestador possui costura pendente; conclua antes de mudar papel.');
 const reason=text(p.reason,'Motivo');const old=f.serviceRole||'não classificado';f.serviceRole=p.serviceRole;f.serviceProfileCommandId=uid;return f.id+' · '+old+' → '+p.serviceRole+' · '+reason;}
 function setRates(s,p,uid){const next={};for(const k of ['camisola','doll','calcinha','outros','pointCents'])next[k]=n(p[k],0,100000);next.commandId=uid;next.reason=text(p.reason,'Motivo');s.serviceRates=next;return 'Tabela de serviços · '+next.reason;}
 function points(s,p,uid){const model=by(s.products,p.productId);if(!model||!categories.includes(p.category))throw Error('Modelo ou categoria inválida.');
 const reason=text(p.reason,'Motivo');model.travetaPoints=n(p.points,0,100);model.serviceCategory=p.category;model.servicePointsCommandId=uid;return model.id+' · '+model.travetaPoints+' pontos · '+reason;}
 function quote(s,p){const f=by(s.factions,p.factionId);if(!f||!roles.includes(p.serviceType)||f.serviceRole!==p.serviceType)throw Error('Escolha prestador cadastrado na atividade correspondente.');
 if(!['auto','manual'].includes(p.priceMode))throw Error('Modo de preço inválido.');
 const service=p.serviceType,product=by(s.products,p.productId),manual=service==='embalagem'&&!product&&p.productId==='manual';
 if(!product&&!manual)throw Error('Modelo cadastrado obrigatório, exceto embalagem avulsa.');
 const category=manual?p.manualCategory:cat(product);if(!categories.includes(category))throw Error('Categoria inválida.');
 const model=manual?text(p.manualName,'Nome do modelo avulso'):product.name;
 const qty=n(p.qty,1,100000);const x=rates(s);let gross,discount=0,pointRate=null,pointCount=null,origin;
 if(service==='travetada'){
  pointCount=product.travetaPoints;if(!Number.isSafeInteger(pointCount)||pointCount<1||pointCount>100)throw Error('Cadastre os pontos por peça na ficha técnica.');
  pointRate=p.priceMode==='manual'?n(p.unitCents,1,100000):x.pointCents;
  if(!Number.isSafeInteger(pointRate)||pointRate<=0)throw Error('Cadastre tarifa por ponto ou informe valor manual.');
  gross=n(pointCount*pointRate,1,100000);origin=p.priceMode==='manual'?'manual_por_ponto':'tabela_por_ponto';
 }else{
  const suggestion=service==='embalagem'?x[category]:f.productRates?.[product.id]??f.unitCents;
  gross=p.priceMode==='manual'?n(p.unitCents,1,100000):suggestion;
  if(!Number.isSafeInteger(gross)||gross<=0)throw Error('Preço não cadastrado; informe um valor manual.');
  origin=p.priceMode==='manual'?'manual_por_peca':service==='embalagem'?'tabela_categoria':'cadastro_costura';
  if(service==='costura'&&!f.traveta){
   pointCount=product.travetaPoints;if(!Number.isSafeInteger(pointCount)||pointCount<0||pointCount>100)throw Error('Defina os pontos de travetada na ficha, inclusive zero.');
   pointRate=x.pointCents;if(pointCount>0&&(!Number.isSafeInteger(pointRate)||pointRate<0))throw Error('Cadastre tarifa por ponto.');
   discount=pointCount*(pointRate||0);
  }
 }
 if(discount>=gross)throw Error('Desconto não pode zerar o preço da peça.');
 const amount=qty*(gross-discount);if(!Number.isSafeInteger(amount)||amount>100000000)throw Error('Total acima do limite.');
 return {service,productId:product?.id||null,model,category,qty,gross,discount,pointRate,pointCount,origin,amount};
 }
 function create(s,p,ctx){const q=quote(s,p),reason=text(p.reason,'Justificativa'),id=ctx.next(s,'ACE'),fin=ctx.next(s,'FIN');
 const obj={id,orderId:null,factionId:p.factionId,productId:q.productId,kind:'avulso',serviceType:q.service,qty:q.qty,listUnitCents:q.gross,travetaCents:q.discount,unitCents:q.gross-q.discount,adjustmentCents:0,amountCents:q.amount,description:reason,status:'aberto',serviceQuote:{...q,commandId:ctx.uid}};
 s.settlements.push(obj);s.finance.push({id:fin,kind:'pagar',sourceId:id,description:'Serviço '+q.service+' · '+id,amountCents:q.amount,status:'aberto'});return id;}
 function groupPreview(s,p){
 const f=by(s.factions,p.factionId),reference=text(p.reference,'Referência').toUpperCase();
 if(!f||!roles.includes(f.serviceRole))throw Error('Classifique o prestador antes de montar o acerto.');
 if(!/^[A-Z0-9_.-]{1,60}$/.test(reference))throw Error('Referência deve conter letras, números, ponto, hífen ou sublinhado.');
 if((s.serviceEntryGroups||[]).some(x=>x.factionId===f.id&&x.reference===reference))throw Error('Referência já registrada para este prestador.');
 if(!Array.isArray(p.lines)||p.lines.length<2||p.lines.length>20)throw Error('Informe de 2 a 20 linhas de serviço.');
 const rows=p.lines.map((line,i)=>{
 if(!line||typeof line!=='object'||Array.isArray(line)||Object.keys(line).some(k=>!['productId','manualName','manualCategory','qty','priceMode','unitCents'].includes(k)))throw Error('Linha '+(i+1)+' inválida.');
 try{return quote(s,{...line,factionId:f.id,serviceType:f.serviceRole});}catch(e){throw Error('Linha '+(i+1)+': '+e.message);}
 });
 const total=rows.reduce((a,x)=>a+x.amount,0);if(!Number.isSafeInteger(total)||total>100000000)throw Error('Total do grupo excede limite.');
 const signature=JSON.stringify([f.id,reference,rows]);return {factionId:f.id,factionName:f.name,reference,rows,total,signature};
 }
 function createGroup(s,p,ctx){
 const q=groupPreview(s,p);if(q.signature!==p.signature||q.total!==p.expectedTotalCents)throw Error('Prévia alterada: confira o valor novamente.');
 const reason=text(p.reason,'Justificativa'),id=ctx.next(s,'GRS'),items=[];
 for(let i=0;i<p.lines.length;i++){const aid=create(s,{...p.lines[i],factionId:q.factionId,serviceType:q.rows[i].service,reason},ctx),a=by(s.settlements,aid),bill=s.finance.find(x=>x.sourceId===aid);a.serviceEntryGroupId=id;items.push({settlementId:aid,financeId:bill.id,amountCents:q.rows[i].amount});}
 (s.serviceEntryGroups||(s.serviceEntryGroups=[])).push({id,reference:q.reference,factionId:q.factionId,factionName:q.factionName,items,totalCents:q.total,reason,commandId:ctx.uid});
 return id+' · '+items.length+' linhas · '+q.total+' centavos · aguardando pagamento';
 }
 function inspect(s){const problems=[],events=new Map(s.log.map(x=>[x.commandId,x]));const check=(record,id,type)=>{if(!events.has(id)||events.get(id).type!==type)problems.push(record+': configuração sem prova');};
 if(s.serviceRates){const a=s.serviceRates;try{for(const k of Object.keys(defaults))n(a[k],0,100000);}catch(e){problems.push('Tabela de serviços inválida');}check('Tabela',a.commandId,'service.rates.set');}
 for(const f of s.factions)if(f.serviceRole){if(!roles.includes(f.serviceRole))problems.push(f.id+': papel inválido');check(f.id,f.serviceProfileCommandId,'service.profile.set');}
 for(const p of s.products)if(p.servicePointsCommandId){if(!categories.includes(p.serviceCategory)||!Number.isSafeInteger(p.travetaPoints)||p.travetaPoints<0||p.travetaPoints>100)problems.push(p.id+': pontos inválidos');check(p.id,p.servicePointsCommandId,'service.points.set');}
 for(const a of s.settlements)if(a.serviceQuote){const q=a.serviceQuote;check(a.id,q.commandId,a.packagingLotId?'packaging.complete':a.serviceEntryGroupId?'settlement.service.group':'settlement.service.add');if(q.service!==a.serviceType||q.productId!==a.productId||q.gross-q.discount<=0||q.amount!==q.qty*(q.gross-q.discount)||q.service==='travetada'&&q.gross!==q.pointCount*q.pointRate||q.service==='costura'&&q.discount!==(q.pointCount||0)*(q.pointRate||0))problems.push(a.id+': cálculo original divergente');}
 const refs=new Set(),members=new Set(),groupIds=new Set();
 for(const g of s.serviceEntryGroups||[]){
 check(g.id,g.commandId,'settlement.service.group');const key=g.factionId+'|'+g.reference;
 if(groupIds.has(g.id)||refs.has(key)||!by(s.factions,g.factionId)||!Array.isArray(g.items)||g.items.length<2||g.items.length>20||g.totalCents!==g.items.reduce((n,x)=>n+x.amountCents,0))problems.push(g.id+': grupo de serviços inválido');
 refs.add(key);groupIds.add(g.id);
 for(const i of g.items||[]){const a=by(s.settlements,i.settlementId),f=by(s.finance,i.financeId);
 if(members.has(i.settlementId)||!a||!f||a.serviceEntryGroupId!==g.id||a.factionId!==g.factionId||f.sourceId!==a.id||a.serviceQuote?.commandId!==g.commandId||a.serviceQuote?.amount!==i.amountCents)problems.push(g.id+': linha sem vínculo original');members.add(i.settlementId);}
 }
 for(const a of s.settlements)if(a.serviceEntryGroupId&&!members.has(a.id))problems.push(a.id+': linha sem grupo de serviços');
 return problems;}
 return {roles,categories,defaults,rates,cat,allows,profile,setRates,points,quote,create,groupPreview,createGroup,inspect};
});

;
/* modulos/complementos-v1.js */
/* Complementos da homologação: materiais de facção, cotações e fotos fictícias. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.HLGBLabComplementsV1=api;})(typeof window!=='undefined'?window:null,function factory(){
 'use strict';
 const by=(a,id)=>(a||[]).find(x=>x.id===id),num=(v,min,max)=>{if(!Number.isSafeInteger(v)||v<min||v>max)throw Error('Quantidade ou valor inválido.');return v;},txt=v=>{if(typeof v!=='string'||!v.trim()||v.trim().length>95)throw Error('Preencha identificação ou justificativa (até 95 caracteres).');return v.trim();};
 const date=v=>{if(typeof v!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(v)||!Number.isFinite(Date.parse(v+'T00:00:00Z'))||new Date(v+'T00:00:00Z').toISOString().slice(0,10)!==v)throw Error('Data inválida.');return v;};
 function scope(s,p,ctx){
 const product=by(s.products,p.productId),material=by(s.materials,p.materialId);if(!product||!material||!['incluir','excluir'].includes(p.action))throw Error('Escolha modelo, material e ação.');
 if(p.action==='incluir'&&product.materialId===material.id)throw Error('Material principal já consumido no corte. Não reenviar como aviamento.');
 const reason=txt(p.reason),rows=s.factionMaterialScopes||(s.factionMaterialScopes=[]),old=rows.filter(x=>x.productId===p.productId&&x.materialId===p.materialId&&x.active).at(-1);
 if(old)old.active=false;
 rows.push({id:ctx.next(s,'FMS'),productId:p.productId,materialId:p.materialId,include:p.action==='incluir',active:true,reason,commandId:ctx.uid});
 return product.id+' · '+material.id+' · '+p.action;}
 function materialPreview(s,assignmentId){
 const a=by(s.factionAssignments,assignmentId),o=a&&by(s.orders,a.orderId),p=o&&by(s.products,o.productId);
 if(!a||!o||!p||a.qtySent<=a.qtyReturned)throw Error('Escolha envio com peças aguardando retorno.');
 const pending=a.qtySent-a.qtyReturned,entries=(a.gradeLines||[]).filter(x=>x.sent>x.returned).map(x=>({color:x.color,size:x.size,qty:x.sent-x.returned}));
 const materialIds=(s.factionMaterialScopes||[]).filter(x=>x.active&&x.include&&x.productId===p.id).map(x=>x.materialId);
 if(!materialIds.length)throw Error('Marque na ficha os aviamentos destinados à facção. Não inclua o tecido consumido no corte.');
 const rules=(s.materialRecipeRules||[]).filter(x=>x.active&&x.productId===p.id&&materialIds.includes(x.materialId));
 if(!entries.length&&rules.some(x=>x.color!=='*'||x.size!=='*'))throw Error('Receita por variante exige grade real do envio.');
 const parts=entries.length?entries:[{color:'*',size:'*',qty:pending}];
 if(parts.reduce((n,x)=>n+x.qty,0)!==pending)throw Error('Grade não corresponde ao saldo do envio.');
 const rows=[];
 for(const materialId of materialIds){
 const material=by(s.materials,materialId);if(!material)throw Error('Material não localizado.');
 for(const part of parts){const eligible=rules.filter(x=>x.materialId===materialId&&(x.color==='*'||x.color===part.color)&&(x.size==='*'||x.size===part.size));
 eligible.sort((a,b)=>((b.color==='*'?0:2)+(b.size==='*'?0:1))-((a.color==='*'?0:2)+(a.size==='*'?0:1)));
 const rule=eligible[0];if(!rule)throw Error('Consumo não cadastrado para '+material.name+' · '+part.color+' '+part.size+'.');
 rows.push({materialId,materialName:material.name,color:part.color,size:part.size,qty:part.qty,ruleId:rule.id,gramsPerUnit:rule.gramsPerUnit,grams:part.qty*rule.gramsPerUnit});}}
 const materials=[...new Set(rows.map(x=>x.materialId))].map(id=>({materialId:id,name:by(s.materials,id).name,grams:rows.filter(x=>x.materialId===id).reduce((v,x)=>v+x.grams,0)}));
 const signature=JSON.stringify([a.id,a.factionId,p.id,pending,rows.map(x=>[x.materialId,x.color,x.size,x.qty,x.ruleId,x.gramsPerUnit]).sort((x,y)=>JSON.stringify(x)<JSON.stringify(y)?-1:JSON.stringify(x)>JSON.stringify(y)?1:0)]);
 return {assignmentId:a.id,orderId:o.id,factionId:a.factionId,productId:p.id,pending,rows,materials,signature,stockWritten:false};}
 function checklist(s,p,ctx){const q=materialPreview(s,p.assignmentId);if(p.signature!==q.signature)throw Error('Envio ou ficha mudou; revise os materiais antes de confirmar.');
 const all=s.factionMaterialChecklists||(s.factionMaterialChecklists=[]),old=all.filter(x=>x.assignmentId===q.assignmentId).at(-1);
 if(old?.signature===q.signature)throw Error('Checklist já registrado para esta composição.');
 const record={...q,id:ctx.next(s,'FMC'),previousId:old?.id||null,reason:txt(p.reason),commandId:ctx.uid};all.push(record);return record.id+' · '+q.pending+' peças · sem nova baixa de estoque';}
 function confirmMaterial(s,p,ctx){const list=s.factionMaterialChecklists||[],c=by(list,p.id);if(!c||list.filter(x=>x.assignmentId===c.assignmentId).at(-1)?.id!==c.id)throw Error('Checklist substituído ou ausente.');
 if(materialPreview(s,c.assignmentId).signature!==c.signature)throw Error('Checklist desatualizado; gere nova comparação.');
 const m=c.materials.find(x=>x.materialId===p.materialId);if(!m)throw Error('Material fora do checklist.');
 const actual=num(p.actualGrams,0,100000000),reason=txt(p.reason),history=s.factionMaterialChecks||(s.factionMaterialChecks=[]);
 history.push({id:ctx.next(s,'FCF'),checklistId:c.id,materialId:m.materialId,expectedGrams:m.grams,actualGrams:actual,differenceGrams:actual-m.grams,reason,commandId:ctx.uid});
 return c.id+' · '+m.name+' · previsto '+m.grams+'g / conferido '+actual+'g';}
 function quote(s,p,ctx){if(!by(s.suppliers,p.supplierId)||!by(s.materials,p.materialId))throw Error('Fornecedor ou material não localizado.');
 const qtyGrams=num(p.qtyGrams,1,100000000),priceCentsKg=num(p.priceCentsKg,1,1000000),freightCents=num(p.freightCents,0,100000000),validUntil=date(p.validUntil),quotedAt=date(p.quotedAt);
 if(validUntil<quotedAt)throw Error('Validade anterior à cotação.');
 const baseCents=Math.ceil(qtyGrams*priceCentsKg/1000),totalCents=baseCents+freightCents;
 if(!Number.isSafeInteger(totalCents)||totalCents>1000000000)throw Error('Cotação excede limite.');
 const q={id:ctx.next(s,'COT'),supplierId:p.supplierId,materialId:p.materialId,qtyGrams,priceCentsKg,freightCents,baseCents,totalCents,quotedAt,validUntil,reference:txt(p.reference),reason:txt(p.reason),commandId:ctx.uid};
 (s.supplierQuotes||(s.supplierQuotes=[])).push(q);return q.id+' · '+totalCents+' centavos';}
 function compare(s,{materialId,qtyGrams,asOf}){date(asOf);num(qtyGrams,1,100000000);if(!by(s.materials,materialId))throw Error('Material não localizado.');
 const rows=(s.supplierQuotes||[]).filter(x=>x.materialId===materialId&&x.qtyGrams===qtyGrams&&x.quotedAt<=asOf);
 const latest=new Map();for(const x of rows){const old=latest.get(x.supplierId);if(!old||x.quotedAt>=old.quotedAt)latest.set(x.supplierId,x);}
 const result=[...latest.values()].map(x=>({...x,supplierName:by(s.suppliers,x.supplierId)?.name||x.supplierId,valid:x.validUntil>=asOf})).sort((a,b)=>Number(b.valid)-Number(a.valid)||a.totalCents-b.totalCents||a.supplierId.localeCompare(b.supplierId));
 return {materialId,qtyGrams,asOf,rows:result,best:result.find(x=>x.valid)?.id||null,stockWritten:false,purchaseCreated:false};}
 function imageOK(v){
 if(typeof v!=='string'||v.length>174764||v.length%4!==0||!/^[A-Za-z0-9+/]+={0,2}$/.test(v)||!v.startsWith('/9j/'))return false;
 const abc='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/',tail=v.slice(-8),bytes=[];
 for(let i=0;i<tail.length;i+=4){const a=abc.indexOf(tail[i]),b=abc.indexOf(tail[i+1]),c=abc.indexOf(tail[i+2]),d=abc.indexOf(tail[i+3]);bytes.push((a<<2)|(b>>4));if(c>=0)bytes.push(((b&15)<<4)|(c>>2));if(d>=0)bytes.push(((c&3)<<6)|d);}
 return v.length>=64&&bytes.at(-2)===255&&bytes.at(-1)===217;}
 function photo(s,p,ctx){const item=by(s.prints,p.productId);if(!item||p.fictitious!==true||!imageOK(p.contentBase64))throw Error('Selecione JPEG fictício válido, até 128 KiB.');
 const history=s.printPhotos||(s.printPhotos=[]),previous=history.filter(x=>x.productId===item.id).at(-1);
 if((p.previousId||null)!==(previous?.id||null))throw Error('Foto atual mudou. Confira antes de substituir.');
 if(history.length>=30||history.reduce((n,x)=>n+x.contentBase64.length,0)+p.contentBase64.length>1400000)throw Error('Limite de fotos fictícias atingido.');
 if(history.some(x=>x.contentBase64===p.contentBase64))throw Error('Imagem idêntica já registrada.');
 const record={id:ctx.next(s,'FOT'),productId:item.id,contentBase64:p.contentBase64,previousId:previous?.id||null,reason:txt(p.reason),commandId:ctx.uid};history.push(record);return record.id+' · '+item.id+' · foto fictícia';}
 function photoMetadata(s){const latest=new Map((s.printPhotos||[]).map(x=>[x.productId,x.id]));return (s.printPhotos||[]).map(({contentBase64,...x})=>({...x,current:latest.get(x.productId)===x.id}));}
 function inspect(s){const issues=[],events=new Map(s.log.map(x=>[x.commandId,x])),seen=new Set();const check=(x,type)=>{if(seen.has(x.id)||events.get(x.commandId)?.type!==type)issues.push(x.id+': identidade ou prova inválida');seen.add(x.id);};
 for(const x of s.factionMaterialScopes||[]){check(x,'faction.material.scope');if(!by(s.products,x.productId)||!by(s.materials,x.materialId)||typeof x.include!=='boolean')issues.push(x.id+': escopo inválido');}
 for(const x of s.factionMaterialChecklists||[]){check(x,'faction.material.checklist');if(!by(s.factionAssignments,x.assignmentId)||!x.rows?.length||x.rows.some(y=>!Number.isSafeInteger(y.grams)||y.grams!==y.qty*y.gramsPerUnit)||x.materials.some(m=>m.grams!==x.rows.filter(y=>y.materialId===m.materialId).reduce((n,y)=>n+y.grams,0)))issues.push(x.id+': checklist inválido');}
 for(const x of s.factionMaterialChecks||[]){check(x,'faction.material.confirm');const row=by(s.factionMaterialChecklists,x.checklistId)?.materials.find(y=>y.materialId===x.materialId);if(!row||row.grams!==x.expectedGrams||!Number.isSafeInteger(x.actualGrams)||x.actualGrams<0||x.actualGrams-x.expectedGrams!==x.differenceGrams)issues.push(x.id+': conferência divergente');}
 for(const q of s.supplierQuotes||[]){check(q,'supplier.quote.add');if(!by(s.suppliers,q.supplierId)||!by(s.materials,q.materialId)||!Number.isSafeInteger(q.totalCents)||q.baseCents!==Math.ceil(q.qtyGrams*q.priceCentsKg/1000)||q.totalCents!==q.baseCents+q.freightCents)issues.push(q.id+': cotação inválida');}
 const latest=new Map();for(const x of s.printPhotos||[]){check(x,'print.photo.attach');if(!by(s.prints,x.productId)||!imageOK(x.contentBase64)||x.previousId!==(latest.get(x.productId)||null))issues.push(x.id+': foto inválida');latest.set(x.productId,x.id);}
 return issues;}
 return {scope,materialPreview,checklist,confirmMaterial,quote,compare,photo,photoMetadata,imageOK,inspect};
});

;
/* modulos/folha-pedidos-v1.js */
/* Folha por competência e importação assistida, apenas laboratório fictício. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.HLGBLabPayrollOrdersV1=api;})(typeof window!=='undefined'?window:null,function factory(){
 'use strict';
 const sizes=['P','M','G','GG'],by=(a,id)=>(a||[]).find(x=>x.id===id),sum=a=>a.reduce((n,x)=>n+x,0),text=x=>{if(typeof x!=='string'||!x.trim()||x.trim().length>95)throw Error('Identificação e motivo obrigatórios.');return x.trim();};
 const matches=(a,b)=>!!a&&!!b&&Object.keys(a).length===Object.keys(b).length&&Object.keys(a).every(k=>Object.hasOwn(b,k)&&a[k]===b[k]);
 const month=m=>typeof m==='string'&&/^\d{4}-(0[1-9]|1[0-2])$/.test(m),validDay=d=>typeof d==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(d)&&Number.isFinite(Date.parse(d+'T00:00:00Z'))&&new Date(d+'T00:00:00Z').toISOString().slice(0,10)===d;
 function amounts(e){const a={salaryCents:e.salaryCents,passageCents:e.passageCents,extrasCents:e.extrasCents,discountCents:e.discountCents};
 if(Object.values(a).some(v=>!Number.isSafeInteger(v)||v<0||v>10000000)||a.salaryCents<100||a.discountCents>a.salaryCents+a.extrasCents)throw Error('Valores individuais inconsistentes.');
 const net=a.salaryCents+a.extrasCents-a.discountCents,cash=net+a.passageCents;if(cash<=0)throw Error('Desembolso deve ser positivo.');
 // Provisões apenas ilustrativas, sem encargos ou cálculos de legislação.
 return {...a,netCents:net,cashCents:cash,thirteenthEstimateCents:Math.round(a.salaryCents/12),vacationEstimateCents:Math.round(a.salaryCents/9)};}
 function payrollPreview(s,p){if(!month(p.period)||!validDay(p.dueDate))throw Error('Competência ou vencimento inválido.');
 const all=s.payrollPeriods||[],target=p.employeeId==='todos'?s.employees.filter(e=>!all.some(x=>x.employeeId===e.id&&x.period===p.period)):[by(s.employees,p.employeeId)];
 if(!target.length||target.some(e=>!e))throw Error('Nenhum funcionário elegível.');
 const rows=target.map(e=>{if(all.some(x=>x.employeeId===e.id&&x.period===p.period))throw Error('Folha já existe nesta competência: '+e.name);return {employeeId:e.id,employeeName:e.name,amounts:amounts(e)};});
 const signature=JSON.stringify([p.period,p.dueDate,rows]);return {period:p.period,dueDate:p.dueDate,rows,signature,totalCents:sum(rows.map(x=>x.amounts.cashCents))};}
 function payrollCreate(s,p,ctx){const q=payrollPreview(s,p);if(p.signature!==q.signature)throw Error('Prévia mudou: confira os valores novamente.');
 const reason=text(p.reason),rows=s.payrollPeriods||(s.payrollPeriods=[]);for(const row of q.rows){const id=ctx.next(s,'FOL'),financeId=ctx.next(s,'FIN');
 rows.push({id,financeId,period:q.period,dueDate:q.dueDate,...row,status:'aberto',commandId:ctx.uid,reason,history:[]});
 s.finance.push({id:financeId,sourceId:id,kind:'pagar',category:'Folha',description:'Folha '+q.period+' · '+row.employeeName,amountCents:row.amounts.cashCents,dueDate:q.dueDate,status:'aberto'});}
 return q.rows.length+' funcionário(s) · folha '+q.period+' · '+q.totalCents+' centavos';}
 function payrollRevise(s,p,ctx){const x=by(s.payrollPeriods,p.id),emp=x&&by(s.employees,x.employeeId),bill=x&&by(s.finance,x.financeId);
 if(!x||!emp||!bill||x.status!=='aberto'||bill.status!=='aberto'||bill.reconciliation)throw Error('Somente folha aberta e não conciliada pode ser revisada.');
 const revised=amounts(emp),reason=text(p.reason);if(matches(revised,x.amounts))throw Error('Nenhuma alteração nos valores individuais.');
 x.history.push({commandId:ctx.uid,before:x.amounts,after:revised,reason});x.amounts=revised;bill.amountCents=revised.cashCents;return x.id+' · revisão da folha · '+reason;}
 function payrollPaid(s,bill){const x=by(s.payrollPeriods,bill.sourceId);if(!x)return;if(x.financeId!==bill.id||x.status!=='aberto'||x.amounts.cashCents!==bill.amountCents)throw Error('Folha e pagamento divergentes.');x.status='pago';x.paidDate=bill.paidDate;}
 function payrollReport(s,period){if(!month(period))throw Error('Competência inválida.');
 const rows=(s.payrollPeriods||[]).filter(x=>x.period===period).slice().sort((a,b)=>a.employeeName.localeCompare(b.employeeName,'pt-BR'));
 return {period,rows,cashCents:sum(rows.map(x=>x.amounts.cashCents)),passageCents:sum(rows.map(x=>x.amounts.passageCents)),netCents:sum(rows.map(x=>x.amounts.netCents)),paidCents:sum(rows.filter(x=>x.status==='pago').map(x=>x.amounts.cashCents)),openCents:sum(rows.filter(x=>x.status==='aberto').map(x=>x.amounts.cashCents)),provisionsCents:sum(rows.map(x=>x.amounts.thirteenthEstimateCents+x.amounts.vacationEstimateCents))};}
 function parseImport(raw){if(typeof raw!=='string'||raw.length>30000)throw Error('Arquivo acima do limite de texto.');const lines=raw.trim().split(/\r?\n/),columns='referencia;cliente_id;sku;P;M;G;GG';if(lines.shift()?.trim()!==columns)throw Error('Cabeçalho deve ser: '+columns);
 if(!lines.length||lines.length>50)throw Error('Informe de 1 a 50 linhas.');
 return lines.map((line,i)=>{const cells=line.split(';').map(x=>x.trim());if(cells.length!==7||cells.some(x=>!x)||!cells.slice(3).every(x=>/^\d{1,5}$/.test(x)))throw Error('Linha '+(i+2)+' inválida.');
 const [reference,clientId,sku,...q]=cells;if(!/^[A-Za-z0-9_.-]{1,60}$/.test(reference))throw Error('Referência inválida na linha '+(i+2));
 const grade=Object.fromEntries(sizes.map((sz,j)=>[sz,Number(q[j])]));const qty=sum(Object.values(grade));
 if(qty<1||qty>30000)throw Error('Grade inválida na linha '+(i+2));return {reference:reference.toUpperCase(),clientId,sku:sku.toUpperCase(),grade,qty};});}
 function importPreview(s,raw){const seen=new Set((s.orderImports||[]).flatMap(x=>x.items.map(y=>y.reference))),rows=parseImport(raw).map(x=>{if(seen.has(x.reference))throw Error('Referência de importação já utilizada: '+x.reference);seen.add(x.reference);
 const client=by(s.clients,x.clientId),product=s.products.find(p=>p.sku===x.sku);
 if(!client||!product)throw Error('Cliente/SKU não localizado para '+x.reference);
 const totalCents=x.qty*product.priceCents;if(!Number.isSafeInteger(totalCents)||totalCents<=0)throw Error('Preço inválido.');
 return {...x,productId:product.id,productName:product.name,clientName:client.name,priceCents:product.priceCents,totalCents};});
 return {rows,totalCents:sum(rows.map(x=>x.totalCents)),pieces:sum(rows.map(x=>x.qty)),signature:JSON.stringify(rows)};}
 function importOrders(s,p,ctx){const q=importPreview(s,p.raw);if(p.signature!==q.signature)throw Error('Prévia de pedidos mudou, confira novamente.');
 const reason=text(p.reason),id=ctx.next(s,'IMPORD'),items=[];for(const x of q.rows){const orderId=ctx.createOrder(s,{clientId:x.clientId,productId:x.productId,grade:x.grade});items.push({...x,orderId});}
 (s.orderImports||(s.orderImports=[])).push({id,commandId:ctx.uid,reason,items,totalCents:q.totalCents});return id+' · '+items.length+' pedidos · '+q.pieces+' peças';}
 function inspect(s){const issues=[],events=new Map(s.log.map(x=>[x.commandId,x])),keys=new Set(),refs=new Set(),orderIds=new Set();
 for(const x of s.payrollPeriods||[]){const key=x.employeeId+'|'+x.period,bills=s.finance.filter(t=>t.sourceId===x.id);try{
 if(keys.has(key)||!month(x.period)||!validDay(x.dueDate)||!by(s.employees,x.employeeId)||!matches(amounts(x.amounts),x.amounts)||events.get(x.commandId)?.type!=='payroll.period.create'||bills.length!==1||bills[0].id!==x.financeId||bills[0].kind!=='pagar'||bills[0].amountCents!==x.amounts.cashCents||bills[0].status!==x.status||bills[0].dueDate!==x.dueDate||x.status==='pago'&&(!validDay(x.paidDate)||bills[0].paidDate!==x.paidDate))throw Error('Folha/título divergente.');
 for(const h of x.history||[])if(events.get(h.commandId)?.type!=='payroll.period.revise'||!matches(amounts(h.before),h.before)||!matches(amounts(h.after),h.after))throw Error('Histórico de folha inválido.');
 }catch(e){issues.push(x.id+': '+e.message);}keys.add(key);}
 for(const im of s.orderImports||[]){if(!['order.import.batch','assistant.order.create'].includes(events.get(im.commandId)?.type)||!Array.isArray(im.items)||im.totalCents!==sum((im.items||[]).map(x=>x.totalCents)))issues.push(im.id+': importação sem prova');
 for(const x of im.items||[]){const o=by(s.orders,x.orderId);if(refs.has(x.reference)||orderIds.has(x.orderId)||!o||o.productId!==x.productId||o.clientId!==x.clientId||x.qty!==sum(Object.values(x.grade))||x.qty*x.priceCents!==x.totalCents)issues.push(im.id+': vínculo importado inválido');refs.add(x.reference);orderIds.add(x.orderId);}}
 return issues;}
 return {amounts,payrollPreview,payrollCreate,payrollRevise,payrollPaid,payrollReport,parseImport,importPreview,importOrders,inspect};
});

;
/* modulos/operacoes-v2.js */
/* Operações complementares fictícias: corte, embalagem, pedidos assistidos, notas. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.HLGBLabOperationsV2=api;})(typeof window!=='undefined'?window:null,function factory(){
 'use strict';
 const sizes=['P','M','G','GG'],by=(a,id)=>(a||[]).find(x=>x.id===id),clone=x=>JSON.parse(JSON.stringify(x)),sum=a=>a.reduce((n,x)=>n+x,0);
 const num=(v,min,max)=>{if(!Number.isSafeInteger(v)||v<min||v>max)throw Error('Quantidade ou valor inválido.');return v;};
 const text=v=>{if(typeof v!=='string'||!v.trim()||v.trim().length>95)throw Error('Identificação e justificativa obrigatórias (até 95 caracteres).');return v.trim();};
 const ref=v=>{const x=text(v).toUpperCase();if(!/^[A-Z0-9_.-]+$/.test(x))throw Error('Referência inválida.');return x;};
 const grade=g=>!!g&&Object.keys(g).length===4&&sizes.every(k=>Number.isSafeInteger(g[k])&&g[k]>=0);
 const count=g=>sum(sizes.map(k=>g[k]));
 const equalGrade=(a,b)=>grade(a)&&grade(b)&&sizes.every(k=>a[k]===b[k]);
 const day=v=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&Number.isFinite(Date.parse(v+'T00:00:00Z'))&&new Date(v+'T00:00:00Z').toISOString().slice(0,10)===v;
 function split(s,p,ctx){
 const parent=by(s.cutPlans,p.id),o=parent&&by(s.orders,parent.orderId),product=o&&by(s.products,o.productId);
 if(!parent||!o||!product||parent.status!=='aberto'||!grade(p.grade)||count(p.grade)<1||count(p.grade)>=count(parent.grade)||sizes.some(k=>p.grade[k]>parent.grade[k]))throw Error('Divida somente folha aberta, em duas grades positivas dentro do saldo.');
 const before=clone(parent.grade),part=clone(p.grade),remaining=Object.fromEntries(sizes.map(k=>[k,before[k]-part[k]])),reason=text(p.reason),child={...clone(parent),id:ctx.next(s,'COR'),grade:part,theoreticalGrams:count(part)*product.gramsPerUnit,createdCommandId:ctx.uid,splitFrom:parent.id};
 parent.grade=remaining;parent.theoreticalGrams=count(remaining)*product.gramsPerUnit;s.cutPlans.push(child);
 (s.cutSplits||(s.cutSplits=[])).push({id:ctx.next(s,'DVC'),parentId:parent.id,childId:child.id,orderId:o.id,before,remaining,moved:part,reason,commandId:ctx.uid});
 return parent.id+' → '+child.id+' · '+count(part)+' peças · '+reason;}
 function packagingSummary(s,orderId){
 const o=by(s.orders,orderId);if(!o)throw Error('Pedido não localizado.');
 const lots=(s.packagingLots||[]).filter(x=>x.orderId===orderId),baseline=lots[0]?.baselineSeparated??o.separated;
 const sent=sum(lots.filter(x=>x.status!=='cancelado').map(x=>x.qty)),done=sum(lots.filter(x=>x.status==='concluido').map(x=>x.qty));
 return {orderId,baseline,sent,done,waiting:sent-done,available:o.returned-baseline-sent,tracked:lots.length>0,canSeparate:baseline+done-o.separated};}
 function packagingAssign(s,p,ctx,svc){
 const o=by(s.orders,p.orderId),qty=num(p.qty,1,10000);if(!o)throw Error('Pedido não localizado.');
 const a=packagingSummary(s,o.id);if(qty>a.available)throw Error('Quantidade excede peças retornadas ainda não destinadas à embalagem.');
 const q=svc.quote(s,{factionId:p.factionId,productId:o.productId,serviceType:'embalagem',qty,priceMode:p.priceMode,unitCents:p.unitCents});
 const lot={id:ctx.next(s,'EMB'),orderId:o.id,productId:o.productId,factionId:p.factionId,qty,baselineSeparated:a.baseline,unitCents:q.gross,quotedCents:q.amount,status:'aberto',reason:text(p.reason),commandId:ctx.uid};
 (s.packagingLots||(s.packagingLots=[])).push(lot);return lot.id+' · '+qty+' peças · '+q.amount+' centavos previstos';}
 function packagingFinish(s,p,ctx,svc){
 const lot=by(s.packagingLots,p.id);if(!lot||lot.status!=='aberto')throw Error('Lote de embalagem indisponível ou já concluído.');
 if(num(p.qty,1,10000)!==lot.qty)throw Error('Conferência deve corresponder à quantidade enviada. Para lotes menores, cancele e divida antes de concluir.');
 const reason=text(p.reason),id=svc.create(s,{factionId:lot.factionId,productId:lot.productId,serviceType:'embalagem',qty:lot.qty,priceMode:'manual',unitCents:lot.unitCents,reason},ctx);
 const entry=by(s.settlements,id);entry.packagingLotId=lot.id;
 lot.status='concluido';lot.settlementId=id;lot.completedCommandId=ctx.uid;lot.completionReason=reason;
 return lot.id+' · acerto '+id+' · '+lot.quotedCents+' centavos';}
 function packagingCancel(s,p,ctx){const x=by(s.packagingLots,p.id);if(!x||x.status!=='aberto')throw Error('Somente embalagem aberta pode ser cancelada.');x.cancelReason=text(p.reason);x.status='cancelado';x.cancelledCommandId=ctx.uid;return x.id+' · cancelado sem acerto';}
 function guardSeparation(s,o,qty){const q=packagingSummary(s,o.id);if(q.tracked&&qty>q.canSeparate)throw Error('Separação excede peças com embalagem concluída.');}
 function assistantPreview(s,p,imports){
 const client=by(s.clients,p.clientId),product=by(s.products,p.productId);if(!client||!product||!grade(p.grade))throw Error('Escolha cliente, produto e grade.');
 const raw='referencia;cliente_id;sku;P;M;G;GG\n'+[ref(p.reference),client.id,product.sku,...sizes.map(x=>p.grade[x])].join(';');
 return {...imports.importPreview(s,raw),raw};}
 function assistantCreate(s,p,ctx,imports){const q=assistantPreview(s,p,imports);if(q.signature!==p.signature)throw Error('Prévia de pedido mudou.');return imports.importOrders(s,{raw:q.raw,signature:q.signature,reason:p.reason},ctx);}
 function invoicePreview(s,p){
 const vendor=by(s.suppliers,p.supplierId),reference=ref(p.reference);if(!vendor||!day(p.issueDate))throw Error('Fornecedor ou data inválidos.');
 if((s.purchaseInvoices||[]).some(x=>x.supplierId===vendor.id&&x.reference===reference))throw Error('Nota já importada para este fornecedor.');
 if(typeof p.raw!=='string'||p.raw.length>18000)throw Error('Texto de nota inválido.');
 const lines=p.raw.trim().split(/\r?\n/);if(lines.shift()?.trim()!=='material_id;gramas;centavos_por_kg'||lines.length<1||lines.length>40)throw Error('Use cabeçalho material_id;gramas;centavos_por_kg e 1 a 40 linhas.');
 const seen=new Set(),items=lines.map((l,i)=>{
 const c=l.split(';').map(x=>x.trim());if(c.length!==3||!c.slice(1).every(x=>/^\d+$/.test(x))||seen.has(c[0]))throw Error('Linha '+(i+2)+' inválida ou material duplicado.');
 const mat=by(s.materials,c[0]);if(!mat)throw Error('Material não localizado: '+c[0]);seen.add(mat.id);
 const qtyGrams=num(Number(c[1]),1,1000000),priceCentsKg=num(Number(c[2]),1,1000000),amountCents=Math.ceil(qtyGrams*priceCentsKg/1000);
 return {materialId:mat.id,materialName:mat.name,qtyGrams,priceCentsKg,amountCents};});
 const totalCents=sum(items.map(x=>x.amountCents));if(totalCents!==num(p.declaredCents,1,1000000000))throw Error('Total da nota diverge da soma dos itens. Não importar.');
 const signature=JSON.stringify([vendor.id,reference,p.issueDate,totalCents,items]);return {supplierId:vendor.id,supplierName:vendor.name,reference,issueDate:p.issueDate,items,totalCents,signature};}
 function invoiceCreate(s,p,ctx){const q=invoicePreview(s,p);if(q.signature!==p.signature)throw Error('Prévia de nota mudou.');const a=text(p.checkerOne),b=text(p.checkerTwo),reason=text(p.reason);if(a.toLocaleLowerCase('pt-BR')===b.toLocaleLowerCase('pt-BR'))throw Error('Conferentes precisam ser diferentes.');
 const id=ctx.next(s,'NCP'),items=q.items.map(x=>{const purchaseId=ctx.next(s,'COM');s.purchaseOrders.push({id:purchaseId,materialId:x.materialId,supplierId:q.supplierId,qtyGrams:x.qtyGrams,priceCentsKg:x.priceCentsKg,checkerOne:a,checkerTwo:b,received:false,invoiceId:id});return {...x,purchaseId};});
 (s.purchaseInvoices||(s.purchaseInvoices=[])).push({id,supplierId:q.supplierId,reference:q.reference,issueDate:q.issueDate,items,totalCents:q.totalCents,reason,commandId:ctx.uid});return id+' · '+items.length+' compras aguardando recebimento';}
 function invoiceAttach(s,p,ctx,pdf){
 const invoice=by(s.purchaseInvoices,p.id);if(!invoice||p.fictitious!==true)throw Error('Escolha nota e confirme PDF fictício.');
 const name=text(p.fileName);if(!/^[A-Za-z0-9][A-Za-z0-9 ._-]{0,90}\.pdf$/i.test(name))throw Error('Nome de PDF inválido.');
 const f=pdf.decodePdf(p.contentBase64),rows=s.invoicePdfs||(s.invoicePdfs=[]),old=rows.filter(x=>x.invoiceId===invoice.id).at(-1);
 if(rows.length>=30||sum(rows.map(x=>x.size))+f.size>2*1024*1024||rows.some(x=>x.contentBase64===p.contentBase64))throw Error('Limite de PDFs ou conteúdo já existente.');
 if((p.previousId||null)!==(old?.id||null))throw Error('Versão da nota mudou.');
 const x={id:ctx.next(s,'PNF'),invoiceId:invoice.id,fileName:name,contentBase64:p.contentBase64,size:f.size,checksum:f.checksum,previousId:old?.id||null,reason:text(p.reason),commandId:ctx.uid,fictitious:true};rows.push(x);return x.id+' · '+invoice.id;}
 function pdfMetadata(s){const latest=new Map((s.invoicePdfs||[]).map(x=>[x.invoiceId,x.id]));return (s.invoicePdfs||[]).map(({contentBase64,...x})=>({...x,current:latest.get(x.invoiceId)===x.id}));}
 function inspect(s,pdf){
 const issues=[],events=new Map(s.log.map(x=>[x.commandId,x])),check=(id,cmd,type)=>{if(events.get(cmd)?.type!==type)issues.push(id+': evento ausente ou divergente');};
 const childIds=new Set();for(const x of s.cutSplits||[]){check(x.id,x.commandId,'cut.plan.split');const a=by(s.cutPlans,x.parentId),b=by(s.cutPlans,x.childId);
 if(!a||!b||a.orderId!==x.orderId||b.orderId!==x.orderId||b.splitFrom!==a.id||b.createdCommandId!==x.commandId||childIds.has(x.childId)||!grade(x.before)||!grade(x.remaining)||!grade(x.moved)||!sizes.every(k=>x.before[k]===x.remaining[k]+x.moved[k])||count(x.remaining)<1||count(x.moved)<1)issues.push(x.id+': divisão de grade inválida');childIds.add(x.childId);}
 for(const p of s.cutPlans)if(p.splitFrom&&!childIds.has(p.id))issues.push(p.id+': divisão sem histórico');
 const lots=s.packagingLots||[],seen=new Set();for(const l of lots){check(l.id,l.commandId,'packaging.assign');const o=by(s.orders,l.orderId),f=by(s.factions,l.factionId),a=by(s.settlements,l.settlementId);
 if(seen.has(l.id)||!o||!f||o.productId!==l.productId||!Number.isSafeInteger(l.qty)||l.qty<=0||!Number.isSafeInteger(l.unitCents)||l.unitCents<=0||l.quotedCents!==l.qty*l.unitCents||!['aberto','concluido','cancelado'].includes(l.status)||!Number.isSafeInteger(l.baselineSeparated)||l.baselineSeparated<0)issues.push(l.id+': lote inválido');seen.add(l.id);
 if(l.status==='concluido'){check(l.id,l.completedCommandId,'packaging.complete');if(!a||a.packagingLotId!==l.id||a.orderId!==null||a.factionId!==l.factionId||a.qty!==l.qty||a.amountCents!==l.quotedCents||a.serviceType!=='embalagem')issues.push(l.id+': acerto de embalagem divergente');}
 else if(l.settlementId||s.settlements.some(x=>x.packagingLotId===l.id))issues.push(l.id+': acerto sem conclusão');
 if(l.status==='cancelado')check(l.id,l.cancelledCommandId,'packaging.cancel');}
 for(const o of s.orders){const q=packagingSummary(s,o.id);if(q.tracked&&(q.available<0||q.canSeparate<0||lots.filter(l=>l.orderId===o.id).some(l=>l.baselineSeparated!==q.baseline)))issues.push(o.id+': embalagens ou separação excedem saldo');}
 for(const x of s.settlements)if(x.packagingLotId&&!lots.some(l=>l.id===x.packagingLotId&&l.settlementId===x.id&&l.status==='concluido'))issues.push(x.id+': acerto de embalagem órfão');
 const keys=new Set(),poIds=new Set();for(const x of s.purchaseInvoices||[]){check(x.id,x.commandId,'purchase.invoice.import');const k=x.supplierId+'|'+x.reference;
 if(keys.has(k)||!by(s.suppliers,x.supplierId)||!day(x.issueDate)||!x.items?.length||x.totalCents!==sum((x.items||[]).map(i=>i.amountCents)))issues.push(x.id+': nota inválida');keys.add(k);
 for(const i of x.items||[]){const p=by(s.purchaseOrders,i.purchaseId);if(poIds.has(i.purchaseId)||!p||p.invoiceId!==x.id||p.supplierId!==x.supplierId||p.materialId!==i.materialId||p.qtyGrams!==i.qtyGrams||p.priceCentsKg!==i.priceCentsKg||i.amountCents!==Math.ceil(i.qtyGrams*i.priceCentsKg/1000))issues.push(x.id+': item de nota divergente');poIds.add(i.purchaseId);}}
 for(const p of s.purchaseOrders)if(p.invoiceId&&!poIds.has(p.id))issues.push(p.id+': compra sem nota');
 const latest=new Map();for(const x of s.invoicePdfs||[]){check(x.id,x.commandId,'purchase.invoice.pdf');try{const f=pdf.decodePdf(x.contentBase64);if(!by(s.purchaseInvoices,x.invoiceId)||f.size!==x.size||f.checksum!==x.checksum||x.previousId!==(latest.get(x.invoiceId)||null)||x.fictitious!==true)throw Error('PDF divergente');}catch(e){issues.push(x.id+': PDF inválido');}latest.set(x.invoiceId,x.id);}
 return issues;}
 return {split,packagingSummary,packagingAssign,packagingFinish,packagingCancel,guardSeparation,assistantPreview,assistantCreate,invoicePreview,invoiceCreate,invoiceAttach,pdfMetadata,inspect};
});

;
/* modulos/pedidos-multimodelo-v1.js */
/* HLGB Evolução: pedido multimodelo em PREPARO fictício.
 * Não cria título, não movimenta produção nem converte registros reais.
 * Persistência apenas no documento isolado, com histórico/revisão transacional.
 */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 else if(root)root.HLGBLabMultiOrdersV1=api;
})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 const clone=x=>JSON.parse(JSON.stringify(x));
 // PostgreSQL JSONB não preserva a ordem das chaves. Comparar valores, nunca posição das propriedades.
 const canonical=x=>JSON.stringify(x,(_key,v)=>v&&typeof v==='object'&&!Array.isArray(v)?
  Object.fromEntries(Object.keys(v).sort().map(k=>[k,v[k]])):v);
 const sum=x=>Object.values(x).reduce((n,v)=>n+v,0);
 function fail(text){throw Error(text);}
 function normalized(raw,max,label){
  if(typeof raw!=='string')fail(label+' inválido.');
  const value=raw.trim().replace(/\s+/g,' ');
  if(!value||value.length>max||!/^[\p{L}\p{N} .-]+$/u.test(value))fail(label+' inválido.');
  return value;
 }
 function sizesOf(raw){
  if(!Array.isArray(raw)||raw.length<1||raw.length>16)fail('Use de 1 a 16 tamanhos.');
  const sizes=[],seen=new Set();
  for(const x of raw){
   const size=normalized(x,12,'Tamanho'),key=size.toLocaleLowerCase('pt-BR');
   if(seen.has(key))fail('Tamanho duplicado: '+size);
   seen.add(key);sizes.push(size);
  }
  return sizes;
 }
 function prepare(s,p,snapshots=null){
  if(!s||!Array.isArray(s.clients)||!Array.isArray(s.products))fail('Catálogo indisponível.');
  if(!s.clients.some(x=>x.id===p?.clientId))fail('Cliente não encontrado.');
  const sizes=sizesOf(p.sizes);
  if(!Array.isArray(p.items)||p.items.length<1||p.items.length>20)fail('Cadastre de 1 a 20 modelos.');
  const items=[],bySize=Object.fromEntries(sizes.map(x=>[x,0]));
  let pieces=0,amountCents=0,colorCount=0;
  for(const [idx,item] of p.items.entries()){
   const product=s.products.find(x=>x.id===item?.productId);
   if(!product)fail('Modelo não encontrado: item '+(idx+1));
   if(!Array.isArray(item.colors)||item.colors.length<1||item.colors.length>30)fail('Informe de 1 a 30 cores por modelo.');
   const snap=snapshots?.[idx],priceCents=snap?snap.priceCents:product.priceCents;
   if(!Number.isSafeInteger(priceCents)||priceCents<0)fail('Preço fictício inválido no item '+(idx+1));
   const colors=[],seen=new Set(),sizesForItem=Object.fromEntries(sizes.map(x=>[x,0]));
   for(const row of item.colors){
    const color=normalized(row?.color,40,'Cor'),key=color.toLocaleLowerCase('pt-BR');
    if(color.length<2||seen.has(key))fail('Cor repetida ou curta em '+product.name+': '+color);
    seen.add(key);
    if(!row.grade||Array.isArray(row.grade)||Object.keys(row.grade).length!==sizes.length||sizes.some(x=>!Object.hasOwn(row.grade,x)))fail('Grade incompleta: '+color);
    const grade={};let count=0;
    for(const size of sizes){
     const qty=row.grade[size];
     if(!Number.isSafeInteger(qty)||qty<0||qty>10000)fail('Quantidade inválida em '+color+'/'+size);
     grade[size]=qty;count+=qty;bySize[size]+=qty;sizesForItem[size]+=qty;
    }
    if(count===0)fail('Linha zerada não pode ser salva: '+color);
    pieces+=count;colorCount++;
    colors.push({color,grade,pieces:count});
   }
   const qty=sum(sizesForItem),value=qty*priceCents;
   if(!Number.isSafeInteger(value))fail('Subtotal inseguro do modelo.');
   amountCents+=value;
   items.push({id:'ITM-'+String(idx+1).padStart(3,'0'),productId:product.id,
    sku:product.sku,name:product.name,priceCents,qty,amountCents:value,bySize:sizesForItem,colors});
  }
  if(pieces<1||pieces>100000||!Number.isSafeInteger(amountCents)||amountCents<0||sum(bySize)!==pieces)fail('Somatório inválido do pedido.');
  return {clientId:p.clientId,sizes,items,
   totals:{pieces,amountCents,bySize,models:items.length,colors:colorCount}};
 }
 function ensure(s){if(s.multiOrders===undefined)s.multiOrders=[];if(!Array.isArray(s.multiOrders))fail('Coleção de pedidos multimodelo ilegível.');}
 function create(s,p,next){
  ensure(s);
  const data=prepare(s,p),id=next(s,'PDM');
  s.multiOrders.push({id,...data,phase:'preparacao_nao_integrada',
   financeLinked:false,stockLinked:false,productionLinked:false,createdRevision:s.revision+1});
  return id;
 }
 function inspect(s){
  if(s.multiOrders===undefined)return [];
  if(!Array.isArray(s.multiOrders))return ['Coleção multimodelo inválida'];
  const failures=[],ids=new Set();
  for(const entry of s.multiOrders){
   try{
    if(!entry||typeof entry.id!=='string'||ids.has(entry.id))fail('ID duplicado/ausente');
    ids.add(entry.id);
    if(entry.phase!=='preparacao_nao_integrada'||entry.financeLinked!==false||entry.stockLinked!==false||entry.productionLinked!==false)fail('Vínculo comercial não autorizado');
    if(!Number.isSafeInteger(entry.createdRevision)||entry.createdRevision<2||entry.createdRevision>s.revision)fail('Revisão inválida');
    const proof=(s.log||[]).filter(e=>e.type==='order.multi.create'&&e.revision===entry.createdRevision&&e.description===entry.id);
    if(proof.length!==1)fail('Pedido sem evento de criação correspondente na trilha global');
    const payload={clientId:entry.clientId,sizes:entry.sizes,items:entry.items.map(i=>({productId:i.productId,colors:i.colors.map(c=>({color:c.color,grade:clone(c.grade)}))}))};
    const ref=prepare(s,payload,entry.items);
    if(canonical(ref.items)!==canonical(entry.items)||canonical(ref.totals)!==canonical(entry.totals)||canonical(ref.sizes)!==canonical(entry.sizes))fail('Dados, preços históricos ou totais divergentes');
   }catch(error){failures.push((entry?.id||'Sem ID')+': '+error.message);}
  }
  for(const event of s.log||[])if(event.type==='order.multi.create'&&!ids.has(event.description))
   failures.push('Pedido multimodelo removido, porém ainda presente na trilha: '+event.commandId+' / '+event.description);
  return failures;
 }
 return Object.freeze({version:'1.0.0',prepare,ensure,create,inspect,sizesOf});
});
