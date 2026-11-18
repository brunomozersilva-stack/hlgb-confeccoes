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
 function assignmentPending(row){return row?Math.max(0,row.qtySent-row.qtyReturned):0;}
 function transferAvailable(row){return row?Math.max(0,Math.min(assignmentPending(row),row.qtySent-1)):0;}
 function assignmentBalances(){
  if(!view)return;
  const from=document.querySelector('form[data-command="faction.multi.transfer"]');
  const returning=document.querySelector('form[data-command="faction.multi.return"]');
  if(from){
   const selected=view.factionAssignments?.find(x=>x.id===from.elements.namedItem('fromAssignmentId').value);
   const available=transferAvailable(selected),qty=from.elements.namedItem('qty'),label=from.parentElement.querySelector('[data-balance="faction.multi.transfer"]');
   qty.max=String(Math.max(1,Math.min(10000,available)));
   if(label)label.textContent='Saldo transferível: '+available+' peça(s) (preservando ao menos 1 na origem).';
  }
  if(returning){
   const selected=view.factionAssignments?.find(x=>x.id===returning.elements.namedItem('assignmentId').value);
   const available=assignmentPending(selected),qty=returning.elements.namedItem('qty'),label=returning.parentElement.querySelector('[data-balance="faction.multi.return"]');
   qty.max=String(Math.max(1,Math.min(10000,available)));
   if(label)label.textContent='Saldo pendente de retorno: '+available+' peça(s).';
  }
 }
 // Planejamento de corte fictício: previsão de peso, jamais geometria real de moldes.
 function plannedGrade(form){
  return Object.fromEntries(sizes.map(sz=>[sz,Number(form.elements.namedItem(sz).value)]));
 }
 function cutPlanPreview(){
  if(!view)return;
  const form=document.querySelector('form[data-command="cut.plan"]');
  const order=view.orders.find(o=>o.id===form.elements.namedItem('orderId').value);
  const product=view.products.find(p=>p.id===order?.productId),grams=product?.gramsPerUnit;
  const material=view.materials?.find(m=>m.id===product?.materialId);
  const grade=plannedGrade(form),qty=sum(grade),left=sizes.map(sz=>sz+': '+remaining(order,sz)).join(' · ');
  const used=Number.isSafeInteger(grams)&&grams>0?qty*grams:null;
  const notice=byId('cut-plan-preview');
  if(!order||!product||used===null){
   notice.textContent='Selecione um pedido e uma ficha técnica válida.';return;
  }
  notice.textContent='Saldo livre por tamanho: '+left+'. '+qty+' peça(s) · consumo teórico '+used+' g. '+
    (material?'Estoque de '+material.name+': '+material.stockGrams+' g. ':'')+
    'Planejamento NÃO reserva fisicamente o estoque.';
 }
 function openPlan(){return view?.cutPlans.find(x=>x.id===document.querySelector('form[data-command="cut.plan.complete"] [name=id]').value);}
 function cutCompletePreview(){
  if(!view)return;
  const plan=openPlan(),form=document.querySelector('form[data-command="cut.plan.complete"]');
  const useful=Number(form.elements.namedItem('usefulGrams').value),scrap=Number(form.elements.namedItem('scrapGrams').value);
  const material=view.materials?.find(m=>m.id===plan?.materialId);
  const forecast=byId('cut-complete-preview'),eff=byId('cut-efficiency');
  if(!plan){forecast.textContent='Nenhuma folha de corte aberta.';eff.textContent='Aproveitamento de peso: —';return;}
  forecast.textContent='Folha '+plan.id+': '+sum(plan.grade)+' peça(s) · mínimo útil '+plan.theoreticalGrams+
    ' g · material '+(material?.name||plan.materialId)+'. Conferentes previstos: '+plan.cutterOne+' e '+plan.cutterTwo+'.';
  const total=useful+scrap;
  eff.textContent=Number.isSafeInteger(useful)&&useful>0&&Number.isSafeInteger(scrap)&&scrap>=0&&total>0?
    'Aproveitamento de peso estimado após lançamento: '+(100*useful/total).toFixed(1)+'% · consumo '+total+' g'+
    (material?' / estoque disponível '+material.stockGrams+' g.':'.'):
    'Informe pesos válidos para calcular o aproveitamento.';
 }
 function cutPlanningOptions(){
  if(!view)return;
  const plans=view.cutPlans.filter(x=>x.status==='aberto');
  const format=p=>p.id+' · '+p.orderId+' · '+sum(p.grade)+' peça(s)';
  options(document.querySelector('form[data-command="cut.plan.complete"] [name=id]'),plans,format);
  options(document.querySelector('form[data-command="cut.plan.cancel"] [name=id]'),plans,format);
  cutPlanPreview();cutCompletePreview();
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
  for(const form of document.querySelectorAll('form[data-command="cut.record"],form[data-command="cut.plan"],form[data-command="faction.allocate"],form[data-command="faction.return"],form[data-command="faction.multi.allocate"],form[data-command="order.separate"],form[data-command="order.ship"]')){
   options(form.elements.namedItem('orderId'),orders,x=>x.id+' · '+(products.find(p=>p.id===x.productId)?.name||'Modelo'));
  }
  options(document.querySelector('form[data-command="faction.allocate"] [name=factionId]'),factions,x=>x.name);
  options(document.querySelector('form[data-command="faction.multi.allocate"] [name=factionId]'),factions,x=>x.name);
  options(document.querySelector('form[data-command="faction.multi.transfer"] [name=toFactionId]'),factions,x=>x.name);
  const assignments=view.factionAssignments||[];
  const textForAssignment=x=>x.id+' · '+x.orderId+' / '+(factions.find(f=>f.id===x.factionId)?.name||x.factionId)+' · pendentes '+assignmentPending(x);
  options(document.querySelector('form[data-command="faction.multi.transfer"] [name=fromAssignmentId]'),assignments.filter(x=>transferAvailable(x)>0),textForAssignment);
  options(document.querySelector('form[data-command="faction.multi.return"] [name=assignmentId]'),assignments.filter(x=>assignmentPending(x)>0),textForAssignment);
  chooseAvailableCut();
  cutPlanningOptions();
  stageBalances();
  assignmentBalances();
  const tbody=byId('orders');tbody.replaceChildren();
  for(const o of orders){
   const row=document.createElement('tr');
   const values=[o.id,products.find(x=>x.id===o.productId)?.name||o.productId,sum(o.grade),sum(o.cut),o.allocated??'—',o.returned??'—',Math.max(0,(o.returned||0)-(o.separated||0)),o.separated??'—',Math.max(0,(o.separated||0)-(o.shipped||0)),o.shipped??'—'];
   for(const value of values){const td=document.createElement('td');td.textContent=String(value);row.append(td);}
   tbody.append(row);
  }
  const assignmentBody=byId('assignments');assignmentBody.replaceChildren();
  for(const a of view.factionAssignments||[]){
   const tr=document.createElement('tr');
   for(const value of [a.id,a.orderId,factions.find(f=>f.id===a.factionId)?.name||a.factionId,a.qtySent,a.qtyReturned,assignmentPending(a)]){
    const td=document.createElement('td');td.textContent=String(value);tr.append(td);
   }
   assignmentBody.append(tr);
  }
  const plansBody=byId('cut-plans');plansBody.replaceChildren();
  for(const plan of view.cutPlans){
   const tr=document.createElement('tr'),used=plan.usefulGrams,scrap=plan.scrapGrams;
   const values=[plan.id,plan.orderId,sum(plan.grade),plan.status,plan.cutterOne&&plan.cutterTwo?
      plan.cutterOne+' / '+plan.cutterTwo+' / '+plan.spreader:'—',
     view.materials?.find(m=>m.id===plan.materialId)?.name||plan.materialId||'—',
     plan.theoreticalGrams??'—',used??'—',scrap??'—',
     Number.isSafeInteger(used)&&Number.isSafeInteger(scrap)&&used+scrap>0?
      (100*used/(used+scrap)).toFixed(1)+'%':'—'];
   for(const value of values){const td=document.createElement('td');td.textContent=String(value);tr.append(td);}
   plansBody.append(tr);
  }
  byId('cut-plans-section').hidden=!remote.info().permissions?.allowedCommands.includes('cut.plan');
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
  if(type==='cut.plan'){
   const grade=plannedGrade(form),order=view.orders.find(x=>x.id===values.orderId);
   const cutterOne=String(values.cutterOne||'').trim(),cutterTwo=String(values.cutterTwo||'').trim(),
    spreader=String(values.spreader||'').trim();
   if(!order)throw Error('Pedido não encontrado na revisão do laboratório.');
   if(sizes.some(sz=>!Number.isSafeInteger(grade[sz])||grade[sz]<0||grade[sz]>10000)||sum(grade)<1||sum(grade)>10000)
    throw Error('Grade da folha deve ter entre 1 e 10000 peças.');
   for(const sz of sizes)if(grade[sz]>remaining(order,sz))throw Error('Folha excede saldo livre no tamanho '+sz+'. Nenhum comando enviado.');
   if(!['interno','externo'].includes(values.workMode))throw Error('Informe modalidade de corte válida.');
   if(!cutterOne||!cutterTwo||!spreader||[cutterOne,cutterTwo,spreader].some(x=>x.length>95))
    throw Error('Informe dois cortadores e um enfestador (até 95 caracteres).');
   if(cutterOne.toLocaleLowerCase('pt-BR')===cutterTwo.toLocaleLowerCase('pt-BR'))
    throw Error('Cortadores precisam ser diferentes.');
   return {orderId:order.id,grade,workMode:values.workMode,cutterOne,cutterTwo,spreader};
  }
  if(type==='cut.plan.cancel'){
   const plan=view.cutPlans.find(x=>x.id===values.id&&x.status==='aberto');
   if(!plan)throw Error('Somente folha aberta pode ser cancelada.');
   return {id:plan.id};
  }
  if(type==='cut.plan.complete'){
   const plan=view.cutPlans.find(x=>x.id===values.id&&x.status==='aberto');
   if(!plan)throw Error('Somente folha aberta pode ser concluída.');
   const usefulGrams=Number(values.usefulGrams),scrapGrams=Number(values.scrapGrams);
   const signatureOne=String(values.signatureOne||'').trim(),signatureTwo=String(values.signatureTwo||'').trim(),
    material=view.materials?.find(m=>m.id===plan.materialId);
   if(!Number.isSafeInteger(usefulGrams)||usefulGrams<plan.theoreticalGrams||usefulGrams>1000000||
      !Number.isSafeInteger(scrapGrams)||scrapGrams<0||scrapGrams>1000000)
    throw Error('Peso útil não pode ficar abaixo do consumo teórico. Confira pesos inteiros e desperdício.');
   if(!material||usefulGrams+scrapGrams>material.stockGrams)
    throw Error('Consumo excede estoque disponível para esta folha. Nenhum comando enviado.');
   if(signatureOne.toLocaleLowerCase('pt-BR')!==plan.cutterOne.toLocaleLowerCase('pt-BR')||
      signatureTwo.toLocaleLowerCase('pt-BR')!==plan.cutterTwo.toLocaleLowerCase('pt-BR'))
    throw Error('As duas conferências precisam corresponder aos cortadores planejados.');
   return {id:plan.id,usefulGrams,scrapGrams,signatureOne,signatureTwo};
  }
  const qty=Number(values.qty);
  if(!Number.isSafeInteger(qty)||qty<1||qty>10000)throw Error('Quantidade inválida.');
  if(type==='cut.record')return {orderId:values.orderId,size:values.size,qty};
  if(type==='faction.allocate')return {orderId:values.orderId,factionId:values.factionId,qty};
  if(type==='faction.return')return {orderId:values.orderId,qty};
  if(type==='faction.multi.allocate'){
   const order=view.orders.find(x=>x.id===values.orderId),faction=view.factions?.find(x=>x.id===values.factionId);
   if(!order||!faction)throw Error('Pedido ou facção inexistente nesta revisão.');
   const remaining=sum(order.cut)-order.allocated;
   if(qty>remaining)throw Error('Envio excede o saldo cortado ainda não distribuído ('+remaining+'). Nenhum comando enviado.');
   return {orderId:order.id,factionId:faction.id,qty};
  }
  if(type==='faction.multi.transfer'){
   const row=view.factionAssignments?.find(x=>x.id===values.fromAssignmentId),
    target=view.factions?.find(x=>x.id===values.toFactionId),
    reason=String(values.reason||'').trim();
   if(!row||!target)throw Error('Origem ou facção de destino indisponível.');
   if(row.factionId===target.id)throw Error('Escolha facção diferente da origem.');
   if(!reason||reason.length>95)throw Error('Justificativa obrigatória de até 95 caracteres.');
   if(qty>transferAvailable(row))throw Error('Transferência excede o saldo parcial disponível ('+transferAvailable(row)+'). Nenhum comando enviado.');
   return {fromAssignmentId:row.id,toFactionId:target.id,qty,reason};
  }
  if(type==='faction.multi.return'){
   const row=view.factionAssignments?.find(x=>x.id===values.assignmentId);
   if(!row)throw Error('Selecione um envio de facção disponível.');
   if(qty>assignmentPending(row))throw Error('Retorno excede o saldo deste envio ('+assignmentPending(row)+'). Nenhum comando enviado.');
   return {assignmentId:row.id,qty};
  }
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
   const planForm=document.querySelector('form[data-command="cut.plan"]');
   planForm.addEventListener('input',cutPlanPreview);
   planForm.addEventListener('change',cutPlanPreview);
   const completeForm=document.querySelector('form[data-command="cut.plan.complete"]');
   completeForm.addEventListener('input',cutCompletePreview);
   completeForm.addEventListener('change',cutCompletePreview);
   for(const type of ['order.separate','order.ship'])
    document.querySelector('form[data-command="'+type+'"] [name=orderId]').addEventListener('change',stageBalances);
   document.querySelector('form[data-command="faction.multi.transfer"] [name=fromAssignmentId]').addEventListener('change',assignmentBalances);
   document.querySelector('form[data-command="faction.multi.return"] [name=assignmentId]').addEventListener('change',assignmentBalances);
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