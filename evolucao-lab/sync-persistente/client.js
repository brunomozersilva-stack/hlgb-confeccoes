'use strict';
(function(){
 const $=id=>document.getElementById(id);
 const money=cents=>(cents/100).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
 let actor=null,pending=null,seen=null,busy=false;
 const walName='HLGB_EVOLUCAO_SYNC_DESCARTAVEL_V1';
 const DB_VERSION=1;
 const open=()=>new Promise((resolve,reject)=>{
  const req=indexedDB.open(walName,DB_VERSION);
  req.onupgradeneeded=()=>{
   const db=req.result;
   if(!db.objectStoreNames.contains('commands'))db.createObjectStore('commands',{keyPath:'commandId'});
   if(!db.objectStoreNames.contains('drafts'))db.createObjectStore('drafts',{keyPath:'actor'});
  };
  req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);
 });
 async function tx(store,mode,work){
  const db=await open();
  try{
   return await new Promise((resolve,reject)=>{
    const t=db.transaction(store,mode),operation=work(t.objectStore(store));
    let val;
    operation.onsuccess=()=>{val=operation.result};
    operation.onerror=()=>reject(operation.error);
    t.oncomplete=()=>resolve(val);
    t.onabort=()=>reject(t.error||Error('WAL abortado.'));
    t.onerror=()=>reject(t.error||Error('WAL indisponível.'));
   });
  }finally{db.close()}
 }
 const putCommand=entry=>tx('commands','readwrite',store=>store.put({commandId:entry.command.commandId,...entry}));
 const getCommands=()=>tx('commands','readonly',store=>store.getAll());
 const delCommand=id=>tx('commands','readwrite',store=>store.delete(id));
 const putDraft=(id,amount)=>tx('drafts','readwrite',store=>store.put({actor:id,amount}));
 const getDraft=id=>tx('drafts','readonly',store=>store.get(id));
 async function api(route,method='GET',data){
  const options={method,credentials:'same-origin',headers:method==='POST'?{'content-type':'application/json','x-hlgb-lab-request':'1'}:{}};
  if(method==='POST')options.body=JSON.stringify(data||{});
  const reply=await fetch(route,options),result=await reply.json();
  return {...result,httpStatus:reply.status};
 }
 function parseMoney(text){
  const s=String(text).trim();
  if(!/^(0|[1-9]\d*)([,.]\d{1,2})?$/.test(s))throw Error('Digite um valor com até duas casas decimais.');
  const parts=s.replace(',','.').split('.');
  const value=Number(parts[0])*100+Number((parts[1]||'').padEnd(2,'0'));
  if(!Number.isSafeInteger(value)||value<100||value>1000000)throw Error('Valor deve estar entre R$ 1,00 e R$ 10.000,00.');
  return value;
 }
 const status=(message,type='')=>{
  const el=$('operation-status');el.className='status'+(type?' '+type:'');el.textContent=message;
 };
 const setBusy=value=>{busy=value;updateControls()};
 function updateControls(){
  $('save').disabled=busy||!!pending||!seen;
  $('reconcile').disabled=busy||!pending;
  $('retry').disabled=busy||pending?.status!=='not_found';
  $('review').disabled=busy||pending?.status!=='conflict';
  $('refresh').disabled=busy||!seen||!!pending;
  $('reload-wal').disabled=busy;
  $('wal-status').textContent=pending?(pending.command.commandId+' · '+pending.status):'Vazio';
  $('who').textContent=actor||'—';
 }
 async function renderState(){
  if(!actor)return;
  const data=await api('/api/state');
  if(data.status!=='ok')throw Error('Falha ao obter revisão do banco.');
  $('server-amount').textContent=money(data.record.amountCents);
  $('server-rev').textContent=String(data.record.revision);
  $('event-count').textContent=String(data.events.length);
  const evs=$('events');evs.replaceChildren();
  for(const ev of [...data.events].reverse()){
   const item=document.createElement('div');item.className='event';
   const strong=document.createElement('strong');
   strong.textContent=ev.commandId+' · '+money(ev.afterCents)+' · revisão '+ev.revision;
   const small=document.createElement('small');small.textContent='Sessão '+ev.actor+' · antes: '+money(ev.beforeCents);
   item.append(strong,small);evs.append(item);
  }
  if(!data.events.length){const p=document.createElement('p');p.textContent='Sem eventos no banco de testes.';evs.append(p)}
  return data.record;
 }
 function renderSeen(){
  $('seen-amount').textContent=seen?money(seen.amountCents):'—';
  $('seen-rev').textContent=seen?String(seen.revision):'—';
  let amount;try{amount=parseMoney($('draft').value)}catch{amount=null}
  $('draft-display').textContent=amount!==null?money(amount):'Inválido';
  updateControls();
 }
 async function loadWal(){
  const commands=await getCommands();
  const mine=commands.filter(c=>c.actor===actor).sort((a,b)=>a.command.commandId.localeCompare(b.command.commandId));
  if(mine.length>1)throw Error('Há mais de um comando pendente neste navegador. Requer conciliação manual.');
  pending=mine[0]||null;
  const savedDraft=await getDraft(actor);
  if(savedDraft&&Number.isSafeInteger(savedDraft.amount))$('draft').value=(savedDraft.amount/100).toFixed(2).replace('.',',');
  renderSeen();return pending;
 }
 async function doLogin(e){
  e.preventDefault();
  if(busy)return;
  try{
   const result=await api('/api/login','POST',{actor:$('role').value,pin:$('pin').value});
   if(result.status!=='ok')throw Error(result.message||'Login fictício recusado.');
   actor=result.actor;
   $('login').hidden=true;$('lab').hidden=false;
   seen=await renderState();
   await loadWal();
   if(!pending){
    const saved=await getDraft(actor);
    if(!saved)$('draft').value=(seen.amountCents/100).toFixed(2).replace('.',',');
   }
   renderSeen();
   status(pending?'Comando recuperado do IndexedDB. Confira o ID antes de transmitir.':'Sessão de teste conectada. Salve somente valores fictícios.',pending?'warn':'ok');
  }catch(err){status(err.message,'error');$('login').hidden=false;$('lab').hidden=true}
 }
 async function save(){
  if(busy||pending||!actor||!seen)return;
  setBusy(true);
  try{
   const cents=parseMoney($('draft').value);
   if(cents===seen.amountCents)throw Error('O rascunho é igual ao último valor visto; não há alteração.');
   const cmd={commandId:'TX-DEMO-'+crypto.randomUUID(),recordId:'HUB-DEMO-001',expectedRevision:seen.revision,amountCents:cents};
   pending={command:cmd,actor,status:'queued'};
   // Durabilidade do pedido local primeiro: nunca enviar sem guardar o ID.
   await putCommand(pending);await putDraft(actor,cents);
   status('ID '+cmd.commandId+' registrado no WAL local; envio em andamento.','warn');
   let result;
   try{result=await api('/api/commands','POST',{...cmd,simulateLostAck:$('lostack').checked})}
   catch(err){
    pending.status='uncertain';await putCommand(pending);
    status('Resposta indisponível. Comando permanece no WAL. Não reenviar automaticamente.','warn');return;
   }
   if(result.status==='conflict'){
    pending.status='conflict';await putCommand(pending);
    status('CONFLITO: outra sessão atualizou o banco. O rascunho foi preservado. Revise antes de tentar novamente.','error');return;
   }
   if(result.status==='uncertain'){
    pending.status='uncertain';await putCommand(pending);
    status('ACK perdido: servidor pode ter gravado. Use Conferir comando por ID.','warn');return;
   }
   if(!['committed','already_committed'].includes(result.status))throw Error(result.message||'Envio rejeitado.');
   // Nunca exibir confirmado só por um POST / ACK.
   await reconcileCommand();
  }catch(err){status(err.message,'error')}
  finally{setBusy(false);renderSeen()}
 }
 async function reconcileCommand(){
  if(!pending)return;
  const cmd=pending.command;
  let result;
  try{result=await api('/api/commands/'+encodeURIComponent(cmd.commandId))}
  catch(err){
   pending.status='uncertain';await putCommand(pending);
   status('Falha de releitura. O comando permanece no WAL para conciliação posterior.','warn');return;
  }
  if(result.status==='readback_confirmed'){
   if(result.commandId!==cmd.commandId||result.amountCents!==cmd.amountCents){
    pending.status='uncertain';await putCommand(pending);
    status('Divergência na prova de salvamento. Operação mantida pendente.','error');return;
   }
   await delCommand(cmd.commandId);pending=null;
   const current=await renderState();
   seen=current;
   // Se outro operador gravou depois, mostre a versão atual, não o valor antigo do comando.
   $('draft').value=(current.amountCents/100).toFixed(2).replace('.',',');
   await putDraft(actor,current.amountCents);
   status('Salvo e confirmado por releitura do ID '+cmd.commandId+' · evento '+result.eventId+' · revisão '+result.revision+'.','ok');
  }else if(result.status==='not_found'){
   pending.status='not_found';await putCommand(pending);
   status('ID não encontrado nessa leitura. Reenvio permitido somente de forma manual com o MESMO ID.','warn');
  }else{
   pending.status='uncertain';await putCommand(pending);
   status('A conferência não comprovou o salvamento. Não repetir automaticamente.','warn');
  }
 }
 async function reconcile(){
  if(!pending||busy)return;setBusy(true);
  try{await reconcileCommand()}catch(e){status(e.message,'error')}finally{setBusy(false);renderSeen()}
 }
 async function retry(){
  if(!pending||pending.status!=='not_found'||busy)return;setBusy(true);
  try{
   const cmd=pending.command;pending.status='queued';await putCommand(pending);
   const result=await api('/api/commands','POST',cmd);
   if(result.status==='conflict'){
    pending.status='conflict';await putCommand(pending);
    status('Reenvio negado por revisão desatualizada, rascunho preservado.','error');
   }else if(result.status==='committed'||result.status==='already_committed')await reconcileCommand();
   else{
    pending.status='uncertain';await putCommand(pending);
    status('Resposta não confirmada. Conferir por ID antes de outra ação.','warn');
   }
  }catch(err){
   pending.status='uncertain';await putCommand(pending);
   status('Conexão perdida, envio inconclusivo.','warn');
  }finally{setBusy(false);renderSeen()}
 }
 async function review(){
  if(!pending||pending.status!=='conflict'||busy)return;setBusy(true);
  try{
   const current=await renderState();
   const original=parseMoney($('draft').value);
   await delCommand(pending.command.commandId);pending=null;
   seen=current;await putDraft(actor,original);
   status('Conflito revisto: versão atual '+current.revision+' ('+money(current.amountCents)+'). Rascunho '+money(original)+' preservado. Se decidir alterar o valor, salve um NOVO comando.','warn');
  }catch(err){status(err.message,'error')}finally{setBusy(false);renderSeen()}
 }
 async function refresh(){
  if(busy||pending||!seen)return;setBusy(true);
  try{
   const current=parseMoney($('draft').value);
   if(current!==seen.amountCents){status('Atualização bloqueada para não apagar o rascunho não salvo.','warn');return}
   seen=await renderState();
   $('draft').value=(seen.amountCents/100).toFixed(2).replace('.',',');
   await putDraft(actor,seen.amountCents);
   status('Leitura atualizada do PostgreSQL de teste.','ok');
  }catch(e){status(e.message,'error')}finally{setBusy(false);renderSeen()}
 }
 $('role').addEventListener('change',()=>$('pin').value=$('role').value==='B'?'demo-session-b':'demo-session-a');
 $('login-form').addEventListener('submit',doLogin);
 $('draft').addEventListener('input',()=>{
  renderSeen();
  try{const amount=parseMoney($('draft').value);putDraft(actor,amount).catch(()=>{})}catch{}
 });
 $('save').addEventListener('click',save);
 $('reconcile').addEventListener('click',reconcile);
 $('retry').addEventListener('click',retry);
 $('review').addEventListener('click',review);
 $('refresh').addEventListener('click',refresh);
 $('reload-wal').addEventListener('click',async()=>{
  if(busy)return;setBusy(true);
  try{await loadWal();status(pending?'WAL recuperado, reconcilie pelo ID.':'Nenhum comando pendente no WAL.',pending?'warn':'ok')}
  catch(e){status(e.message,'error')}finally{setBusy(false)}
 });
 $('server-read').addEventListener('click',()=>renderState().catch(e=>status(e.message,'error')));
 // Não autenticar automaticamente após reinício do servidor; novo login fictício será necessário.
 api('/api/session').then(async result=>{
  if(result.status==='ok'){
   actor=result.actor;$('login').hidden=true;$('lab').hidden=false;
   seen=await renderState();await loadWal();
   const saved=await getDraft(actor);
   if(!saved)$('draft').value=(seen.amountCents/100).toFixed(2).replace('.',',');
   renderSeen();
   status(pending?'WAL recuperado após recarregar; operação não confirmada.':'Sessão de teste recuperada.',pending?'warn':'ok');
  }
 }).catch(()=>{});
})();
