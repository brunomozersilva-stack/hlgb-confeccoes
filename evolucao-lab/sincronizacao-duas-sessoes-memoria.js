/* HLGB Evolução · núcleo experimental de duas sessões em memória. Sem banco ou rede. */
(function(root,factory){
 'use strict';
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 else if(root)root.HLGBTwoSessionsLab=api;
})(typeof window!=='undefined'?window:null,function(){
'use strict';
const copy=x=>JSON.parse(JSON.stringify(x));
const failure=(status,message)=>({status,message});
function initial(){
 const record={id:'HUB-DEMO-001',amountCents:10000,revision:1,description:'Nota fictícia de materiais'};
 return {server:{record,operations:{},events:[]},clients:{
  A:{id:'A',online:true,seenRevision:1,seenCents:10000,draftCents:10000,pending:null,notices:[]},
  B:{id:'B',online:true,seenRevision:1,seenCents:10000,draftCents:10000,pending:null,notices:[]}
 },nextId:1,events:[]};
}
function createLab(){
 let state=initial();
 const session=id=>{
  const c=state.clients[id];
  if(!c)throw Error('Sessão fictícia inválida.');
  return c;
 };
 const log=(type,client,message,detail={})=>{
  const entry={sequence:state.events.length+1,type,client,message,...copy(detail)};
  state.events.push(entry);return entry;
 };
 const getState=()=>copy(state);
 const getChecks=()=>{
  const srv=state.server,ev=srv.events,ops=Object.values(srv.operations);
  return {
   versionMatchesEvents:srv.record.revision===ev.length+1,
   ledgerUnique:new Set(ev.map(e=>e.commandId)).size===ev.length,
   ledgerMatchesCommands:ev.every(e=>srv.operations[e.commandId]?.revision===e.revision),
   noPartialFinancialCommit:ops.every(o=>o.status!=='committed'||ev.some(e=>e.commandId===o.commandId)),
   amountMatchesLastEvent:ev.length?srv.record.amountCents===ev[ev.length-1].amountCents:srv.record.amountCents===10000,
   clientsPendingCommandsHaveIds:Object.values(state.clients).every(c=>!c.pending||/^TX-DEMO-\d{4,}$/.test(c.pending.command.commandId)),
   noSilentDraftLoss:Object.values(state.clients).every(c=>Number.isSafeInteger(c.draftCents)&&c.draftCents>=100&&c.draftCents<=1000000)
  };
 };
 function edit(id,amountCents){
  const c=session(id);
  if(c.pending)return failure('blocked','Existe uma operação pendente. Reconcilie antes de modificar o valor.');
  if(!Number.isSafeInteger(amountCents)||amountCents<100||amountCents>1000000)
   return failure('rejected','Informe entre R$ 1,00 e R$ 10.000,00, em centavos inteiros.');
  c.draftCents=amountCents;
  log('draft',id,'Formulário alterado apenas nesta sessão.',{amountCents});
  return {status:'draft',amountCents};
 }
 function setOnline(id,on){
  const c=session(id);c.online=Boolean(on);
  log('connectivity',id,c.online?'Sessão simulada conectada.':'Sessão simulada sem conexão.');
  return {status:c.online?'online':'offline',pendingStatus:c.pending?.status||null};
 }
 function submit(id,opts={}){
  const c=session(id);
  if(c.pending)return failure('blocked','Há uma operação pendente; confirme, concilie ou reavalie antes de salvar novamente.');
  if(c.draftCents===c.seenCents)return failure('rejected','Nenhuma alteração em relação à última leitura desta sessão.');
  if(!Number.isSafeInteger(c.draftCents)||c.draftCents<100||c.draftCents>1000000)return failure('rejected','Valor inválido.');
  const command={commandId:'TX-DEMO-'+String(state.nextId++).padStart(4,'0'),kind:'hub.set_value',recordId:'HUB-DEMO-001',
   sessionId:id,expectedRevision:c.seenRevision,amountCents:c.draftCents};
  c.pending={command,status:'queued',attempts:0,reason:'Aguardando transmissão.',queuedAtEvent:state.events.length+1};
  log('queue',id,'Comando imutável registrado em memória. Não confirmado.',{commandId:command.commandId,expectedRevision:command.expectedRevision});
  if(!c.online)return {status:'queued',commandId:command.commandId,message:'Sem conexão. Não houve gravação no servidor fictício.'};
  return deliver(id,opts);
 }
 const fingerprint=cmd=>JSON.stringify([cmd.kind,cmd.recordId,cmd.sessionId,cmd.expectedRevision,cmd.amountCents]);
 function serverCommit(cmd){
  const srv=state.server,exists=srv.operations[cmd.commandId];
  if(exists){
   if(exists.fingerprint!==fingerprint(cmd))return failure('rejected','Mesmo ID de comando com dados diferentes. Operação bloqueada.');
   return {status:'already_applied',commandId:cmd.commandId,revision:exists.revision,eventId:exists.eventId};
  }
  if(srv.record.revision!==cmd.expectedRevision)return failure('conflict','Revisão mudou. É obrigatório comparar o valor atual com o seu rascunho.');
  if(!Number.isSafeInteger(cmd.amountCents)||cmd.amountCents<100||cmd.amountCents>1000000||
   cmd.recordId!=='HUB-DEMO-001'||!['A','B'].includes(cmd.sessionId)||cmd.kind!=='hub.set_value')
   return failure('rejected','Operação inválida para o servidor fictício.');
  const event={eventId:'EVT-'+String(srv.events.length+1).padStart(4,'0'),commandId:cmd.commandId,
   previousCents:srv.record.amountCents,amountCents:cmd.amountCents,revision:srv.record.revision+1,sessionId:cmd.sessionId};
  srv.record={...srv.record,revision:event.revision,amountCents:cmd.amountCents};
  srv.events.push(event);srv.operations[cmd.commandId]={status:'committed',commandId:cmd.commandId,
   fingerprint:fingerprint(cmd),revision:event.revision,eventId:event.eventId};
  return {status:'committed',commandId:cmd.commandId,revision:event.revision,eventId:event.eventId};
 }
 function deliver(id,opts={}){
  const c=session(id),pending=c.pending;
  if(!pending)return failure('blocked','Nenhum comando aguardando transmissão.');
  if(!c.online)return failure('offline','Sem conexão. O comando continua na fila em memória.');
  if(!['queued','not_found'].includes(pending.status))
   return failure('blocked','Operação '+pending.status+'. Releia a confirmação antes de qualquer reenvio.');
  if(!['none','before_commit','after_commit_before_ack','readback_failure'].includes(opts.failureAt||'none'))
   return failure('rejected','Cenário de falha inválido.');
  pending.attempts++;
  if(opts.failureAt==='before_commit'){
   pending.status='uncertain';pending.reason='Falha antes do processamento simulada. Não reenviar automaticamente.';
   log('uncertain',id,pending.reason,{commandId:pending.command.commandId});
   return {status:'uncertain',commandId:pending.command.commandId,message:pending.reason};
  }
  const committed=serverCommit(pending.command);
  if(committed.status==='conflict'||committed.status==='rejected'){
   pending.status=committed.status;pending.reason=committed.message;
   log(committed.status,id,committed.message,{commandId:pending.command.commandId});
   return {...committed,commandId:pending.command.commandId};
  }
  if(opts.failureAt==='after_commit_before_ack'){
   pending.status='uncertain';pending.reason='Servidor aplicou a operação, mas o ACK se perdeu. Ainda não confirmar na interface.';
   log('uncertain',id,pending.reason,{commandId:pending.command.commandId});
   return {status:'uncertain',commandId:pending.command.commandId,message:pending.reason};
  }
  pending.status='ack_received';
  log('ack_received',id,'ACK recebido. Ainda falta comprovar a gravação por releitura.',{commandId:pending.command.commandId});
  if(opts.failureAt==='readback_failure'){
   pending.status='uncertain';pending.reason='ACK recebido, mas a releitura falhou. Resultado inconclusivo.';
   log('uncertain',id,pending.reason,{commandId:pending.command.commandId});
   return {status:'uncertain',commandId:pending.command.commandId,message:pending.reason};
  }
  return reconcile(id);
 }
 function reconcile(id,opts={}){
  const c=session(id),pending=c.pending;
  if(!pending)return failure('blocked','Não existe operação pendente para conciliar.');
  if(!c.online)return failure('offline','Não é possível reler com a sessão desconectada.');
  if(pending.status==='conflict')return failure('conflict','A revisão mudou. Reavalie o conflito preservando seu rascunho.');
  if(opts.readbackUnavailable){
   pending.status='uncertain';pending.reason='Releitura indisponível. Sem prova de salvamento.';
   log('uncertain',id,pending.reason,{commandId:pending.command.commandId});
   return {status:'uncertain',commandId:pending.command.commandId};
  }
  const op=state.server.operations[pending.command.commandId];
  const ev=state.server.events.find(e=>e.commandId===pending.command.commandId);
  if(!op||!ev){
   pending.status='not_found';pending.reason='ID não encontrado nesta leitura. Apenas reenvio manual do mesmo comando é permitido.';
   log('not_found',id,pending.reason,{commandId:pending.command.commandId});
   return {status:'not_found',commandId:pending.command.commandId,message:pending.reason};
  }
  if(op.fingerprint!==fingerprint(pending.command)||op.status!=='committed'||
   ev.revision!==op.revision||ev.eventId!==op.eventId||ev.amountCents!==pending.command.amountCents){
   pending.status='uncertain';pending.reason='Provas inconsistentes. Nenhum sucesso pode ser mostrado.';
   log('integrity_error',id,pending.reason,{commandId:pending.command.commandId});
   return {status:'uncertain',commandId:pending.command.commandId,message:pending.reason};
  }
  const proof={status:'readback_confirmed',commandId:pending.command.commandId,eventId:ev.eventId,revision:ev.revision,
   valueCents:ev.amountCents,latestRevision:state.server.record.revision};
  c.pending=null;
  c.seenRevision=state.server.record.revision;c.seenCents=state.server.record.amountCents;
  c.draftCents=c.seenCents;
  log('confirmed',id,'Releitura de evento e ID confirmou o salvamento; formulário atualizado com visão atual.',proof);
  return proof;
 }
 function retrySameId(id,opts={}){
  const c=session(id);
  if(!c.pending||c.pending.status!=='not_found')return failure('blocked','Reenvio exige primeiro releitura sem registro do comando.');
  if(!c.online)return failure('offline','Reconecte antes de reenviar.');
  log('manual_retry',id,'Reenvio manual preservando o ID e a revisão originais.',{commandId:c.pending.command.commandId});
  return deliver(id,opts);
 }
 function reviewConflict(id){
  const c=session(id);
  if(!c.online)return failure('offline','Precisa reconectar para comparar revisões.');
  if(!c.pending||c.pending.status!=='conflict')return failure('blocked','Nenhum conflito identificado.');
  const previous={seenRevision:c.seenRevision,draftCents:c.draftCents,serverRevision:state.server.record.revision,
   serverCents:state.server.record.amountCents,conflictedCommandId:c.pending.command.commandId};
  c.pending=null;
  c.seenRevision=state.server.record.revision;c.seenCents=state.server.record.amountCents;
  // Preserva o rascunho divergente para decisão humana. Não dispara nova gravação.
  log('review_required',id,'Base atualizada; rascunho original preservado, sem sobrescrever ninguém.',previous);
  return {status:'review_required',...previous,draftPreserved:c.draftCents};
 }
 function refresh(id){
  const c=session(id);
  if(!c.online)return failure('offline','Sessão desconectada.');
  if(c.pending)return failure('blocked','Há operação pendente: concilie antes de atualizar.');
  if(c.draftCents!==c.seenCents)return failure('blocked_unsaved','Formulário tem alterações. Atualização bloqueada para não apagar o rascunho.');
  c.seenRevision=state.server.record.revision;c.seenCents=state.server.record.amountCents;c.draftCents=c.seenCents;
  log('refresh',id,'Leitura da versão fictícia mais recente.',{revision:c.seenRevision});
  return {status:'refreshed',revision:c.seenRevision,amountCents:c.seenCents};
 }
 function simulateDelayedServerCommit(id){
  const c=session(id);
  if(!c.pending||c.pending.status!=='not_found')return failure('blocked','Só é possível simular atraso de um comando não encontrado na releitura.');
  const result=serverCommit(c.pending.command);
  log('delayed_commit',id,'Comando fictício aplicado após uma leitura anterior sem registro.',{commandId:c.pending.command.commandId});
  return result;
 }
 function reset(){state=initial();return {status:'reset',message:'A simulação foi reiniciada; dados fictícios apenas.'}}
 function inspectServer(){return copy(state.server)}
 return {snapshot:getState,checks:getChecks,edit,setOnline,submit,deliver,reconcile,retrySameId,reviewConflict,refresh,reset,inspectServer,simulateDelayedServerCommit};
}
return {createLab};
});
