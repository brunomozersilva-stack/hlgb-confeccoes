/* HLGB Evolução · Corte multimodelo em laboratório fictício.
 * Controle por pedido + item + cor + tamanho; sem baixa de estoque, facções ou financeiro.
 * Jamais converter diretamente um pedido legado nem criar movimentos de produção real.
 */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 else if(root)root.HLGBLabMultiCutsV1=api;
})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 const clone=x=>JSON.parse(JSON.stringify(x));
 const normalize=x=>String(x??'').trim().toLocaleLowerCase('pt-BR');
 const key=(color,size)=>normalize(color)+'\u0000'+normalize(size);
 const sum=lines=>lines.reduce((n,x)=>n+x.qty,0);
 const error=message=>{throw Error(message)};
 function ensure(s){
  if(s.multiCutPlans===undefined)s.multiCutPlans=[];
  if(!Array.isArray(s.multiCutPlans))error('Histórico de corte multimodelo inválido; nenhuma gravação.');
 }
 function locate(s,orderId,itemId){
  const order=(s.multiOrders||[]).find(x=>x.id===orderId);
  if(!order)error('Pedido multimodelo fictício não encontrado.');
  if(order.phase!=='preparacao_nao_integrada'||order.productionLinked!==false)
   error('Pedido fora da preparação isolada. Não gravar corte.');
  const item=order.items.find(x=>x.id===itemId);
  if(!item)error('Modelo não pertence a este pedido.');
  return {order,item};
 }
 function allowed(item){
  const m=new Map();
  for(const row of item.colors)for(const [size,qty] of Object.entries(row.grade))
   m.set(key(row.color,size),{color:row.color,size,qty});
  return m;
 }
 function reserved(s,orderId,itemId,exclude=null){
  const m=new Map();
  for(const plan of s.multiCutPlans||[]){
   if(plan.orderId!==orderId||plan.itemId!==itemId||plan.id===exclude||plan.status==='cancelado')continue;
   for(const line of plan.lines)m.set(key(line.color,line.size),(m.get(key(line.color,line.size))||0)+line.qty);
  }
  return m;
 }
 function balance(s,orderId,itemId,exclude=null){
  const {item}=locate(s,orderId,itemId),slots=allowed(item),used=reserved(s,orderId,itemId,exclude);
  return [...slots.values()].map(row=>({...row,reserved:used.get(key(row.color,row.size))||0,
   remaining:row.qty-(used.get(key(row.color,row.size))||0)}));
 }
 function validateLines(s,orderId,itemId,lines,exclude=null){
  if(!Array.isArray(lines)||lines.length<1||lines.length>480)error('Escolha entre 1 e 480 combinações de cor/tamanho.');
  const slots=new Map(balance(s,orderId,itemId,exclude).map(x=>[key(x.color,x.size),x]));
  const seen=new Set(),clean=[];
  for(const row of lines){
   const k=key(row?.color,row?.size),slot=slots.get(k);
   if(!slot||seen.has(k))error('Cor/tamanho inexistente ou repetido na programação.');
   seen.add(k);
   if(!Number.isSafeInteger(row.qty)||row.qty<1||row.qty>10000)error('Quantidade de corte inválida.');
   if(row.qty>slot.remaining)error('Saldo insuficiente para '+slot.color+' / '+slot.size+': restam '+slot.remaining+'.');
   clean.push({color:slot.color,size:slot.size,qty:row.qty});
  }
  if(sum(clean)>100000)error('Lote excede limite de 100 mil peças fictícias.');
  return clean;
 }
 function date(value){
  if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value)||
   Number.isNaN(Date.parse(value+'T00:00:00Z'))||
   new Date(value+'T00:00:00Z').toISOString().slice(0,10)!==value)
    error('Data da programação inválida.');
  return value;
 }
 function named(value,label){
  if(typeof value!=='string'||!value.trim()||value.trim().length>95)error(label+' obrigatório (até 95 caracteres).');
  return value.trim();
 }
 function details(p){
  const priority=p.priority;
  if(!['urgente','alta','normal','baixa'].includes(priority))error('Prioridade de corte inválida.');
  const cutterOne=named(p.cutterOne,'Primeiro cortador'),
   cutterTwo=named(p.cutterTwo,'Segundo cortador'),
   spreader=named(p.spreader,'Infestador');
  if(normalize(cutterOne)===normalize(cutterTwo))error('Os dois cortadores devem ser pessoas diferentes.');
  return {scheduledDate:date(p.scheduledDate),priority,cutterOne,cutterTwo,spreader};
 }
 function create(s,p,{next,uid}){
  ensure(s);const {item}=locate(s,p.orderId,p.itemId);
  const lines=validateLines(s,p.orderId,p.itemId,p.lines),d=details(p);
  const id=next(s,'PCM');
  s.multiCutPlans.push({id,orderId:p.orderId,itemId:item.id,productId:item.productId,
   ...d,lines,qty:sum(lines),status:'aberto',createdCommandId:uid,
   history:[{type:'programado',commandId:uid,revision:s.revision+1}]});
  return id;
 }
 function revise(s,p,{uid}){
  ensure(s);
  const plan=s.multiCutPlans.find(x=>x.id===p.id);
  if(!plan||plan.status!=='aberto')error('Só é possível editar um corte multimodelo em aberto.');
  const lines=validateLines(s,plan.orderId,plan.itemId,p.lines,plan.id),d=details(p);
  if(JSON.stringify(lines)===JSON.stringify(plan.lines)&&
   Object.entries(d).every(([k,v])=>plan[k]===v))error('Nenhuma mudança na programação.');
  const before={lines:clone(plan.lines),qty:plan.qty,scheduledDate:plan.scheduledDate,priority:plan.priority,
   cutterOne:plan.cutterOne,cutterTwo:plan.cutterTwo,spreader:plan.spreader};
  Object.assign(plan,d,{lines,qty:sum(lines)});
  plan.history.push({type:'revisado',commandId:uid,revision:s.revision+1,before,
   reason:named(p.reason,'Motivo da alteração')});
  return plan.id+' · grade e equipe revisadas';
 }
 function complete(s,p,{uid}){
  ensure(s);const plan=s.multiCutPlans.find(x=>x.id===p.id);
  if(!plan||plan.status!=='aberto')error('Corte já concluído ou cancelado. Não repetir.');
  const first=named(p.checkerOne,'Primeiro conferente'),second=named(p.checkerTwo,'Segundo conferente');
  if(normalize(first)===normalize(second))error('Conferência precisa de duas pessoas diferentes.');
  plan.status='concluido';plan.completedCommandId=uid;plan.checkerOne=first;plan.checkerTwo=second;
  plan.history.push({type:'concluido',commandId:uid,revision:s.revision+1,
   note:'Conclusão fictícia sem consumo físico de materiais'});
  return plan.id+' · '+plan.qty+' peças conferidas no laboratório (sem estoque)';
 }
 function cancel(s,p,{uid}){
  ensure(s);const plan=s.multiCutPlans.find(x=>x.id===p.id);
  if(!plan||plan.status!=='aberto')error('Somente uma programação em aberto pode ser cancelada.');
  plan.status='cancelado';
  plan.history.push({type:'cancelado',commandId:uid,revision:s.revision+1,
   reason:named(p.reason,'Motivo do cancelamento')});
  return plan.id+' · cancelado sem excluir o histórico';
 }
 function recordWeight(s,p,{uid}){
  ensure(s);
  const plan=s.multiCutPlans.find(x=>x.id===p.id);
  if(!plan||plan.status!=='concluido')error('Registre peso somente depois de concluir este corte fictício.');
  const total=p.totalGrams,used=p.usedGrams,waste=p.wasteGrams;
  for(const [label,n] of [['Total recebido',total],['Peso utilizado',used],['Lixo/retalho',waste]]){
   if(!Number.isSafeInteger(n)||n<0||n>20000000)error(label+' inválido (informe gramas inteiros).');
  }
  if(!total)error('O peso total precisa ser maior que zero.');
  if(used+waste>total)error('Usado + lixo não podem exceder o total recebido.');
  if(!used)error('O peso útil precisa ser maior que zero.');
  const checker=named(p.checker,'Responsável pela pesagem');
  const reason=named(p.reason,'Justificativa da pesagem');
  if(!Array.isArray(plan.weightEvents))plan.weightEvents=[];
  if(plan.weightEvents.length>=200)error('Histórico de pesos atingiu o limite; exporte as evidências.');
  const last=plan.weightEvents.at(-1);
  if(last&&last.totalGrams===total&&last.usedGrams===used&&last.wasteGrams===waste)
   error('Pesagem idêntica à última. Não duplicar lançamento.');
  const event={commandId:uid,revision:s.revision+1,cutId:plan.id,
   totalGrams:total,usedGrams:used,wasteGrams:waste,checker,reason};
  plan.weightEvents.push(event);
  // Importante: grade, estado e estoque permanecem inalterados.
  return plan.id+' · peso '+total+' g; útil '+used+' g; lixo '+waste+' g (somente histórico)';
 }
 function inspect(s){
  if(s.multiCutPlans===undefined)return [];
  if(!Array.isArray(s.multiCutPlans))return ['Coleção de cortes multimodelo ilegível'];
  const failures=[],ids=new Set(),claimed=new Set();
  const kindOf={programado:'multi.cut.plan',revisado:'multi.cut.revise',concluido:'multi.cut.complete',cancelado:'multi.cut.cancel'};
  for(const plan of s.multiCutPlans){
   try{
    if(!plan||typeof plan.id!=='string'||ids.has(plan.id))error('ID ausente/duplicado');
    ids.add(plan.id);const {item}=locate(s,plan.orderId,plan.itemId);
    if(plan.productId!==item.productId)error('Produto do item alterado');
    if(!['aberto','concluido','cancelado'].includes(plan.status))error('Status inválido');
    details(plan);
    if(!Array.isArray(plan.lines)||plan.lines.length<1||plan.lines.length>480)error('Grade ausente');
    const allowedRows=allowed(item),seen=new Set();
    for(const row of plan.lines){
     const k=key(row.color,row.size),slot=allowedRows.get(k);
     if(!slot||seen.has(k)||row.color!==slot.color||row.size!==slot.size||!Number.isSafeInteger(row.qty)||row.qty<1||row.qty>slot.qty)
      error('Variação inválida, duplicada ou maior que o pedido');
     seen.add(k);
    }
    if(plan.qty!==sum(plan.lines))error('Total do lote divergente');
    if(plan.weightEvents!==undefined){
     if(!Array.isArray(plan.weightEvents)||plan.weightEvents.length>200)error('Histórico de peso inválido');
     const commands=new Set();let lastRevision=0;
     for(const w of plan.weightEvents){
      const proof=(s.log||[]).find(x=>x.commandId===w.commandId);
      if(!proof||proof.type!=='multi.cut.weight.record'||proof.revision!==w.revision||w.revision<=lastRevision)
       error('Pesagem sem trilha global correspondente ou fora de ordem');
      lastRevision=w.revision;
      if(plan.status!=='concluido'||!w.commandId||commands.has(w.commandId)||w.cutId!==plan.id||
       !Number.isSafeInteger(w.revision)||w.revision<2||w.revision>s.revision||
       !Number.isSafeInteger(w.totalGrams)||w.totalGrams<1||w.totalGrams>20000000||
       !Number.isSafeInteger(w.usedGrams)||w.usedGrams<1||
       !Number.isSafeInteger(w.wasteGrams)||w.wasteGrams<0||
       w.usedGrams+w.wasteGrams>w.totalGrams||!w.checker||!w.reason)
       error('Pesagem histórica adulterada ou inválida');
      if(claimed.has(w.commandId))error('Comando de corte repetido na trilha');
      claimed.add(w.commandId);commands.add(w.commandId);
     }
    }
    if(!Array.isArray(plan.history)||!plan.history.length||
      plan.history[0].commandId!==plan.createdCommandId||
      plan.history[0].type!=='programado')error('Histórico de criação inválido');
    let priorRevision=0;
    for(const event of plan.history){
     const kind=kindOf[event?.type],log=(s.log||[]).find(x=>x.commandId===event?.commandId);
     if(!kind||!event.commandId||claimed.has(event.commandId)||
        !Number.isSafeInteger(event.revision)||event.revision<=priorRevision||
        event.revision>s.revision||!log||log.type!==kind||log.revision!==event.revision||
        !(log.description===plan.id||log.description.startsWith(plan.id+' · ')))
      error('Histórico de corte sem comando correspondente, repetido ou fora de ordem');
     if(event.type==='revisado'&&!event.reason)error('Revisão de corte sem justificativa');
     if(event.type==='cancelado'&&!event.reason)error('Cancelamento de corte sem justificativa');
     priorRevision=event.revision;claimed.add(event.commandId);
    }
    if(plan.status==='concluido'&&(!plan.completedCommandId||!plan.checkerOne||!plan.checkerTwo||
      !plan.history.some(x=>x.type==='concluido'&&x.commandId===plan.completedCommandId)))error('Conferência ausente');
    if(plan.status==='cancelado'&&!plan.history.some(x=>x.type==='cancelado'&&x.reason))error('Cancelamento sem motivo');
   }catch(e){failures.push((plan?.id||'Sem ID')+': '+e.message)}
  }
  for(const order of s.multiOrders||[])for(const item of order.items||[]){
   try{for(const row of balance(s,order.id,item.id))if(row.remaining<0)
    error('Cortes reservados/concluídos excedem '+row.color+'/'+row.size+' em '+order.id+'/'+item.id);}
   catch(e){failures.push(e.message)}
  }
  const types=new Set(['multi.cut.plan','multi.cut.revise','multi.cut.complete','multi.cut.cancel','multi.cut.weight.record']);
  for(const event of s.log||[])if(types.has(event.type)&&!claimed.has(event.commandId))
   failures.push('Evento de Corte multimodelo sem registro operacional: '+event.commandId+' / '+event.type);
  return failures;
 }
 return Object.freeze({version:'1.0.0-laboratorio',ensure,balance,create,revise,complete,cancel,recordWeight,inspect});
});
