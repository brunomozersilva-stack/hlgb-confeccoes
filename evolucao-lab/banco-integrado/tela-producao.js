/* Tela de produção fictícia: apenas projeção restrita, sem ler o snapshot integral. */
(function(){
 'use strict';
 const remote=window.HLGBRemoteLab,byId=id=>document.getElementById(id);
 let view=null,busy=false,serverRevision=null,checking=false;
 const changed=()=>!!view&&Number.isSafeInteger(serverRevision)&&serverRevision>view.revision;
 function syncWarning(){
  const notice=byId('shared-revision-notice'),button=byId('sync-refresh');
  const stale=changed();
  notice.hidden=!stale;
  button.hidden=!stale;
  button.disabled=busy||!stale;
  if(stale)notice.textContent='Outro computador ou aba alterou o banco para a revisão '+serverRevision+
    '. Os campos em edição foram preservados. Confira os dados antes de salvar.';
  else notice.textContent='';
 }
 const sizes=['P','M','G','GG'],sum=g=>sizes.reduce((n,k)=>n+(g?.[k]||0),0);
 function message(value,kind=''){const m=byId('message');m.textContent=value;m.className=kind;}
 function options(select,rows,format){
  const before=select.value;select.replaceChildren();
  for(const record of rows){const o=document.createElement('option');o.value=record.id;o.textContent=format(record);select.append(o);}
  if([...select.options].some(x=>x.value===before))select.value=before;
 }
 function updatePending(){
  const pending=remote.info().pending;
  byId('pending-state').textContent=pending?'Comando em revisão: '+pending.command.commandId+' ('+pending.stage+'). Não envie outra operação.':'Nenhum comando pendente de confirmação.';
  byId('remote-retry').disabled=busy||pending?.stage!=='not_found';
  byId('remote-discard').disabled=busy||!pending||!['not_found','conflict','rejected'].includes(pending.stage);
  const allowed=remote.info().permissions?.allowedCommands||[];
  for(const form of document.querySelectorAll('form[data-command]')){
   const permitted=allowed.includes(form.dataset.command);
   form.parentElement.hidden=!permitted;
   form.parentElement.style.display=permitted?'':'none';
   const button=form.querySelector('button[type=submit]');
   if(button)button.disabled=busy||!!pending||!permitted||changed();
  }
  syncWarning();
 }
 function remaining(order,size){
  if(!order)return 0;
  const reserved=(view?.cutPlans||[]).filter(p=>p.orderId===order.id&&p.status==='aberto').reduce((n,p)=>n+(p.grade[size]||0),0);
  return Math.max(0,(order.grade[size]||0)-(order.cut[size]||0)-reserved);
 }
 function chooseAvailableCut(){
  const form=document.querySelector('form[data-command="cut.record"]');
  if(!form||!view)return;
  const order=view.orders.find(o=>o.id===form.elements.namedItem('orderId').value);
  const sizeSelect=form.elements.namedItem('size');
  if(order&&remaining(order,sizeSelect.value)===0){
   const available=sizes.find(size=>remaining(order,size)>0);
   if(available)sizeSelect.value=available;
  }
  const available=remaining(order,sizeSelect.value),quantity=form.elements.namedItem('qty');
  quantity.max=String(Math.max(1,Math.min(10000,available)));
  if(!Number.isSafeInteger(Number(quantity.value))||Number(quantity.value)>available||Number(quantity.value)<1)quantity.value='1';
 }
 function stageRemaining(order,type){
  if(!order)return 0;
  if(type==='order.separate')return Math.max(0,order.returned-order.separated);
  if(type==='order.ship')return Math.max(0,order.separated-order.shipped);
  return 0;
 }
 function stageBalances(){
  for(const type of ['order.separate','order.ship']){
   const form=document.querySelector('form[data-command="'+type+'"]');
   if(!form||!view)continue;
   const order=view.orders.find(o=>o.id===form.elements.namedItem('orderId').value);
   const remaining=stageRemaining(order,type),field=form.elements.namedItem('qty');
   field.max=String(Math.max(1,Math.min(10000,remaining)));
   const label=byId('orders')?.closest('section')?.querySelector('[data-balance="'+type+'"]')||form.parentElement.querySelector('[data-balance="'+type+'"]');
   if(label)label.textContent=(type==='order.separate'?'Saldo retornado não separado: ':'Saldo separado não expedido: ')+remaining+' peça(s).'+
    (remaining===0?' Nenhuma peça disponível nesta etapa.':'');
   // Não sobrescrever o valor digitado: conferência exige rascunho intacto.
  }
 }
 function render(next){
  if(next.schema!=='hlgb-evolucao-operacao-producao-ficticia-v1'||next.readScope!==remote.info().permissions?.readScope)throw Error('Projeção não autorizada');
  view=next;
  serverRevision=Math.max(serverRevision||0,view.revision);
  byId('top-revision').textContent='Revisão do PostgreSQL de teste: '+view.revision+' · '+remote.info().permissions.label+' ('+remote.info().permissions.employeeId+') · leitura limitada';
  const clients=view.clients||[],products=view.products,factions=view.factions||[],orders=view.orders;
  options(document.querySelector('form[data-command="order.add"] [name=clientId]'),clients,x=>x.name);
  options(document.querySelector('form[data-command="order.add"] [name=productId]'),products,x=>x.name+' · '+x.sku);
  for(const form of document.querySelectorAll('form[data-command="cut.record"],form[data-command="faction.allocate"],form[data-command="faction.return"],form[data-command="order.separate"],form[data-command="order.ship"]')){
   options(form.elements.namedItem('orderId'),orders,x=>x.id+' · '+(products.find(p=>p.id===x.productId)?.name||'Modelo'));
  }
  options(document.querySelector('form[data-command="faction.allocate"] [name=factionId]'),factions,x=>x.name);
  chooseAvailableCut();
  stageBalances();
  const tbody=byId('orders');tbody.replaceChildren();
  for(const o of orders){
   const row=document.createElement('tr');
   const values=[o.id,products.find(x=>x.id===o.productId)?.name||o.productId,sum(o.grade),sum(o.cut),o.allocated??'—',o.returned??'—',Math.max(0,(o.returned||0)-(o.separated||0)),o.separated??'—',Math.max(0,(o.separated||0)-(o.shipped||0)),o.shipped??'—'];
   for(const value of values){const td=document.createElement('td');td.textContent=String(value);row.append(td);}
   tbody.append(row);
  }
  updatePending();
 }
 // Somente leitura: não repete comandos, não toca nos rascunhos ou no WAL.
 async function checkSharedRevision(){
  if(!view||checking||busy)return;
  checking=true;
  try{
   const current=await remote.revision();
   if(current>serverRevision||serverRevision===null)serverRevision=current;
   if(current<view.revision)message('Revisão do servidor regrediu. Pare os lançamentos e confira o ambiente.','error');
   updatePending();
  }catch(e){
   message('Não foi possível verificar mudanças de outros computadores: '+e.message,'error');
  }finally{checking=false;}
 }
 async function refreshShared(){
  if(busy)return;
  busy=true;updatePending();
  try{
   const pending=await remote.load();
   if(pending){message('Há uma operação pendente: confira o WAL antes de atualizar. Nenhum rascunho foi apagado.','error');return;}
   const current=await remote.state();
   render(current);
   if(changed())message('Uma nova revisão apareceu durante a leitura. Confira novamente antes de gravar.','error');
   else message('Dados compartilhados atualizados. Seus campos de formulário foram mantidos.','success');
  }catch(e){message('Atualização sem confirmação: '+e.message,'error');}
  finally{busy=false;updatePending();}
 }
 function payload(form){
  const type=form.dataset.command,values=Object.fromEntries(new FormData(form).entries());
  if(type==='order.add'){
   const grade=Object.fromEntries(sizes.map(k=>[k,Number(values[k])]));
   if(sizes.some(k=>!Number.isSafeInteger(grade[k])||grade[k]<0)||sum(grade)<1||sum(grade)>30000)throw Error('Informe uma grade válida entre 1 e 30000 peças.');
   return {clientId:values.clientId,productId:values.productId,grade};
  }
  const qty=Number(values.qty);
  if(!Number.isSafeInteger(qty)||qty<1||qty>10000)throw Error('Quantidade inválida.');
  if(type==='cut.record')return {orderId:values.orderId,size:values.size,qty};
  if(type==='faction.allocate')return {orderId:values.orderId,factionId:values.factionId,qty};
  if(type==='faction.return')return {orderId:values.orderId,qty};
  if(type==='order.separate'||type==='order.ship'){
   const order=view?.orders.find(o=>o.id===values.orderId);
   if(!order)throw Error('Pedido não localizado nesta revisão de teste.');
   if(qty>stageRemaining(order,type))throw Error('Quantidade excede o saldo disponível nesta etapa. Nenhum comando enviado.');
   return {orderId:values.orderId,qty};
  }
  throw Error('Operação não suportada na tela restrita.');
 }
 async function onSubmit(event){
  event.preventDefault();
  if(busy||!view||remote.info().pending)return;
  if(changed()){message('Há uma revisão nova de outro computador. Confira os dados antes de salvar; nenhuma operação foi enviada.','error');return;}
  const form=event.currentTarget,type=form.dataset.command;
  try{
   const input=payload(form);
   busy=true;updatePending();
   const current=await remote.revision();
   if(current!==view.revision){serverRevision=current;updatePending();message('O servidor mudou para a revisão '+current+'. Confira a nova situação antes de gravar. Nenhum comando foi enviado.','error');return;}
   const result=await remote.submit(type,input,view.revision);
   if(result.status!=='confirmed'){message('Registro sem confirmação: '+result.status+'. Confira o WAL antes de repetir.','error');return;}
   render(result.state);message('Operação '+type+' salva e confirmada. '+result.result,'success');
  }catch(e){message('Não foi possível confirmar: '+e.message+'. Confira o WAL antes de repetir.','error');}
  finally{busy=false;updatePending();}
 }
 async function action(which){
  if(busy)return;busy=true;updatePending();
  try{
   let result;
   if(which==='check')result=await remote.reconcile();
   if(which==='retry')result=await remote.retry();
   if(which==='discard'){
    if(!window.confirm('Descartar somente após conferência de ausência ou rejeição do comando?'))return;
    result=await remote.discard();
   }
   if(result?.state)render(result.state);
   message('Conferência: '+(result?.status||'sem resultado')+(result?.result?' · '+result.result:''),result?.status==='confirmed'?'success':'');
  }catch(e){message('Conferência inconclusiva: '+e.message,'error');}
  finally{busy=false;updatePending();}
 }
 async function start(){
  try{
   if(!remote)throw Error('Transporte local não carregado');
   const state=await remote.init();
   if(remote.info().permissions?.id!=='demo-production')throw Error('Não é uma sessão de produção');
   for(const f of document.querySelectorAll('form[data-command]'))f.addEventListener('submit',onSubmit);
   const cutForm=document.querySelector('form[data-command="cut.record"]');
   for(const name of ['orderId','size'])cutForm.elements.namedItem(name).addEventListener('change',chooseAvailableCut);
   for(const type of ['order.separate','order.ship'])
    document.querySelector('form[data-command="'+type+'"] [name=orderId]').addEventListener('change',stageBalances);
   byId('remote-check').addEventListener('click',()=>void action('check'));
   byId('sync-refresh').addEventListener('click',()=>void refreshShared());
   window.addEventListener('focus',()=>void checkSharedRevision());
   document.addEventListener('visibilitychange',()=>{if(!document.hidden)void checkSharedRevision();});
   setInterval(()=>{if(!document.hidden)void checkSharedRevision();},15000);
   byId('remote-retry').addEventListener('click',()=>void action('retry'));
   byId('remote-discard').addEventListener('click',()=>void action('discard'));
   byId('logout-demo').addEventListener('click',()=>{if(!busy)void remote.logout().catch(e=>message('Não foi possível encerrar a sessão: '+e.message,'error'));});
   render(state);message('Somente cadastros e operações produtivas fictícias estão visíveis.','success');
   void checkSharedRevision();
  }catch(e){message('Acesso de produção indisponível: '+e.message,'error');for(const b of document.querySelectorAll('button'))b.disabled=true;}
 }
 void start();
})();