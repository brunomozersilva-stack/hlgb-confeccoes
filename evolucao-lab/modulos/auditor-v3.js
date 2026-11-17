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
 if(s.revision!==events.length+1)add('REVISAO_CONTAGEM','critica','nucleo','documento','Revisão não corresponde ao número de eventos.',s.revision+' / '+events.length,'Comparar snapshot e trilha; não repetir gravações.');
 const seen=new Set();events.forEach((e,i)=>{if(!e.commandId||seen.has(e.commandId)||e.revision!==i+2)add('EVENTO_SEQUENCIA','critica','nucleo',e.commandId||i,'Evento duplicado, ausente ou fora da sequência.',e.revision+' / esperado '+(i+2),'Conferir histórico e idempotência.');seen.add(e.commandId);});
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
