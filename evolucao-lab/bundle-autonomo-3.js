/* modulos/corte-multimodelo-v1.js */
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

;
/* modulos/fluxo-multimodelo-v1.js */
/* HLGB Evolução — percurso multimodelo isolado: Corte → Facção → Separação → Expedição.
 * Nunca escreve em pedidos/financeiro/estoque/acertos da produção ou no banco comercial.
 * Retornos criam ACERTOS FICTÍCIOS a CONFERIR, nunca títulos a pagar nem pagamentos.
 */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 else if(root)root.HLGBLabMultiFlowV1=api;
})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 const fail=m=>{throw Error(m)};
 const clone=x=>JSON.parse(JSON.stringify(x));
 const norm=x=>String(x??'').trim().toLocaleLowerCase('pt-BR');
 const cell=(color,size)=>norm(color)+'\u0000'+norm(size);
 const find=(a,id)=>(a||[]).find(x=>x.id===id);
 const integer=(x,label,min=0,max=100000)=>{if(!Number.isSafeInteger(x)||x<min||x>max)fail(label+' deve ser inteiro entre '+min+' e '+max);return x};
 const note=(x,label='Justificativa')=>{
  if(typeof x!=='string'||!x.trim()||x.trim().length>240)fail(label+' obrigatória (máximo de 240 caracteres)');
  return x.trim();
 };
 const sum=a=>a.reduce((n,x)=>n+x.qty,0);
 // Assinatura lógica do snapshot: JSONB reorganiza chaves, mas não pode alterar valores.
 const fingerprint=x=>JSON.stringify(x,(_key,v)=>v&&typeof v==='object'&&!Array.isArray(v)?
  Object.fromEntries(Object.keys(v).sort().map(k=>[k,v[k]])):v);
 const proof=(s,id,revision,type)=>{
  const x=(s.log||[]).find(e=>e.commandId===id);
  if(!x||x.revision!==revision||x.type!==type)fail('Evento sem prova global: '+id);
 };
 function signatureMatches(stored,obj){
  if(typeof stored!=='string')return false;
  try{return fingerprint(JSON.parse(stored))===fingerprint(obj)}catch(_e){return false}
 }
 function ensure(s){
  for(const name of ['multiFlowLots','multiFlowSeparations','multiFlowShipments']){
   if(s[name]===undefined)s[name]=[];
   if(!Array.isArray(s[name]))fail('Registro multimodelo ilegível: '+name);
  }
 }
 function orderItem(s,orderId,itemId){
  const o=find(s.multiOrders,orderId),i=o&&find(o.items,itemId);
  if(!o||!i||o.phase!=='preparacao_nao_integrada'||
     o.financeLinked!==false||o.stockLinked!==false||o.productionLinked!==false)
   fail('Pedido ou modelo indisponível no laboratório isolado.');
  return {order:o,item:i};
 }
 function slots(item){
  const m=new Map();
  for(const color of item.colors)for(const [size,qty] of Object.entries(color.grade))
   m.set(cell(color.color,size),{color:color.color,size,ordered:qty});
  return m;
 }
 function validateLines(lines,limitMap,label){
  if(!Array.isArray(lines)||!lines.length||lines.length>480)fail(label+': informe uma grade de 1 a 480 variações.');
  const clean=[],seen=new Set();
  for(const line of lines){
   const k=cell(line?.color,line?.size),target=limitMap.get(k);
   if(!target||seen.has(k))fail(label+': cor ou tamanho incorreto/repetido.');
   seen.add(k);
   integer(line.qty,label+' / '+target.color+' '+target.size,1,100000);
   if(line.qty>target.remaining)fail(label+': saldo insuficiente em '+target.color+' / '+target.size+' ('+target.remaining+').');
   clean.push({color:target.color,size:target.size,qty:line.qty});
  }
  return clean;
 }
 function add(map,lines){for(const l of lines)map.set(cell(l.color,l.size),(map.get(cell(l.color,l.size))||0)+l.qty);}
 function orderBalance(s,orderId,itemId){
  const {item}=orderItem(s,orderId,itemId),m=slots(item),
   cut=new Map(),reserved=new Map(),allocated=new Map(),returned=new Map(),separated=new Map(),shipped=new Map();
  for(const p of s.multiCutPlans||[])if(p.orderId===orderId&&p.itemId===itemId){
   if(p.status==='concluido')add(cut,p.lines);
   if(p.status==='aberto')add(reserved,p.lines);
  }
  for(const lot of s.multiFlowLots||[])if(lot.orderId===orderId&&lot.itemId===itemId){
   add(allocated,lot.lines);
   for(const e of lot.returns||[])add(returned,e.lines);
  }
  for(const e of s.multiFlowSeparations||[])if(e.orderId===orderId&&e.itemId===itemId)add(separated,e.lines);
  for(const e of s.multiFlowShipments||[])if(e.orderId===orderId&&e.itemId===itemId)add(shipped,e.lines);
  return [...m.values()].map(x=>{
   const k=cell(x.color,x.size),c=cut.get(k)||0,r=reserved.get(k)||0,a=allocated.get(k)||0,
    back=returned.get(k)||0,sp=separated.get(k)||0,sh=shipped.get(k)||0;
   return {...x,cut:c,cutReserved:r,allocated:a,returned:back,separated:sp,shipped:sh,
    toCut:x.ordered-c,toAllocate:c-a,inFaction:a-back,cutToSeparate:c-sp,
    availableToSeparate:back-sp,toShip:sp-sh};
  });
 }
 function lineLimits(lines,subtractions=[]){
  const map=new Map(lines.map(l=>[cell(l.color,l.size),{...l,remaining:l.qty}]));
  for(const subtract of subtractions)for(const l of subtract){
   const v=map.get(cell(l.color,l.size));if(!v)fail('Movimento sem origem');
   v.remaining-=l.qty;
  }
  for(const v of map.values())if(v.remaining<0)fail('Quantidade movimentada maior que o saldo de origem');
  return map;
 }
 function allocate(s,p,{next,uid}){
  ensure(s);
  const cut=find(s.multiCutPlans,p.cutId),faction=find(s.factions,p.factionId);
  if(!cut||cut.status!=='concluido')fail('Somente corte CONCLUÍDO libera envio à facção.');
  if(!faction)fail('Escolha a facção correta e cadastrada.');
  const {item}=orderItem(s,cut.orderId,cut.itemId);
  if(item.productId!==cut.productId)fail('Modelo do corte diverge do pedido.');
  const fromCut=(s.multiFlowLots||[]).filter(l=>l.cutId===cut.id);
  const available=lineLimits(cut.lines,fromCut.map(l=>l.lines));
  const lines=validateLines(p.lines,available,'Envio à facção');
  const unitCents=integer(p.unitCents,'Mão de obra em centavos',1,1000000);
  const reason=note(p.reason),id=next(s,'MFL');
  const lot={id,cutId:cut.id,orderId:cut.orderId,itemId:cut.itemId,productId:cut.productId,
   lines,qty:sum(lines),createdCommandId:uid,createdRevision:s.revision+1,
   originalFactionId:faction.id,originalUnitCents:unitCents,
   factionId:faction.id,unitCents,reason,returns:[],changes:[],
   immutableFingerprint:fingerprint({cutId:cut.id,orderId:cut.orderId,itemId:cut.itemId,
    productId:cut.productId,lines,qty:sum(lines),originalFactionId:faction.id,originalUnitCents:unitCents,reason})};
  s.multiFlowLots.push(lot);
  return id+' · '+lot.qty+' peças para '+faction.name+' (somente laboratório)';
 }
 function moveOrRate(s,p,{uid},type){
  ensure(s);
  const lot=find(s.multiFlowLots,p.id);
  if(!lot)fail('Envio à facção não encontrado.');
  const pending=lineLimits(lot.lines,(lot.returns||[]).map(e=>e.lines));
  const remaining=[...pending.values()].reduce((n,x)=>n+x.remaining,0);
  if(!remaining)fail('Sem peças pendentes para transferir ou alterar mão de obra.');
  const reason=note(p.reason),fromFactionId=lot.factionId,fromUnitCents=lot.unitCents;
  const factionId=type==='transfer'?p.factionId:lot.factionId,
   unitCents=type==='price'?integer(p.unitCents,'Nova mão de obra em centavos',1,1000000):
    integer(p.unitCents??lot.unitCents,'Mão de obra na nova facção',1,1000000);
  if(!find(s.factions,factionId))fail('Nova facção não cadastrada.');
  if(type==='transfer'&&factionId===fromFactionId)fail('Selecione outra facção.');
  if(type==='price'&&unitCents===fromUnitCents)fail('O valor da mão de obra não mudou.');
  lot.factionId=factionId;lot.unitCents=unitCents;
  const change={type,commandId:uid,revision:s.revision+1,
   fromFactionId,fromUnitCents,toFactionId:factionId,toUnitCents:unitCents,
   pending:remaining,lines:[...pending.values()].filter(x=>x.remaining>0)
     .map(x=>({color:x.color,size:x.size,qty:x.remaining})),reason};
  lot.changes.push({...change,immutableFingerprint:fingerprint(change)});
  return lot.id+' · '+remaining+' peças pendentes: '+fromFactionId+' → '+factionId+
   ' · '+unitCents+' centavos por peça (retornos antigos preservados)';
 }
 function returnPieces(s,p,{next,uid}){
  ensure(s);const lot=find(s.multiFlowLots,p.id);
  if(!lot)fail('Envio à facção não encontrado.');
  const available=lineLimits(lot.lines,(lot.returns||[]).map(e=>e.lines));
  const lines=validateLines(p.lines,available,'Retorno da facção');
  const reason=note(p.reason),id=next(s,'MFR'),qty=sum(lines);
  const amountCents=qty*lot.unitCents;
  if(!Number.isSafeInteger(amountCents)||amountCents<=0)fail('Acerto fictício fora do limite seguro.');
  const e={id,lotId:lot.id,orderId:lot.orderId,itemId:lot.itemId,
   productId:lot.productId,cutId:lot.cutId,lines,qty,
   factionId:lot.factionId,unitCents:lot.unitCents,amountCents,
   reason,commandId:uid,revision:s.revision+1,review:null,
   immutableFingerprint:fingerprint({lotId:lot.id,orderId:lot.orderId,itemId:lot.itemId,
    productId:lot.productId,cutId:lot.cutId,lines,qty,factionId:lot.factionId,
    unitCents:lot.unitCents,amountCents,reason})};
  lot.returns.push(e);
  return id+' · '+qty+' peças retornadas · acerto fictício '+amountCents+' centavos (NÃO lançado no Hub)';
 }
 function reviewReturn(s,p,{uid}){
  ensure(s);
  const entry=(s.multiFlowLots||[]).flatMap(x=>x.returns||[]).find(x=>x.id===p.id);
  if(!entry||entry.review)fail('Acerto fictício inexistente ou já conferido.');
  const reviewer=note(p.reviewer,'Conferente'),reason=note(p.reason);
  const review={commandId:uid,revision:s.revision+1,reviewer,reason,
   amountCents:entry.amountCents,factionId:entry.factionId};
  entry.review={...review,immutableFingerprint:fingerprint(review)};
  return entry.id+' · acerto de '+entry.factionId+' CONFERIDO, sem quitação financeira';
 }
 function moveByOrder(s,p,{next,uid},type){
  ensure(s);
  const {item}=orderItem(s,p.orderId,p.itemId),rows=orderBalance(s,p.orderId,p.itemId);
  const limits=new Map(rows.map(row=>[cell(row.color,row.size),{...row,
   remaining:type==='separate'?row.availableToSeparate:row.toShip}]));
  const lines=validateLines(p.lines,limits,type==='separate'?'Separação':'Expedição');
  const reason=note(p.reason),id=next(s,type==='separate'?'MFS':'MFX');
  const event={id,orderId:p.orderId,itemId:p.itemId,productId:item.productId,
   lines,qty:sum(lines),reason,commandId:uid,revision:s.revision+1,
   immutableFingerprint:fingerprint({orderId:p.orderId,itemId:p.itemId,
    productId:item.productId,lines,qty:sum(lines),reason})};
  s[type==='separate'?'multiFlowSeparations':'multiFlowShipments'].push(event);
  return id+' · '+event.qty+' peças '+(type==='separate'?'separadas':'expedidas')+' fictícias';
 }
 function acertos(s){
  const grouped=new Map();
  for(const lot of s.multiFlowLots||[])for(const r of lot.returns||[]){
   const f=find(s.factions,r.factionId);
   if(!grouped.has(r.factionId))grouped.set(r.factionId,{factionId:r.factionId,
    name:f?.name||r.factionId,items:[],totalCents:0,pendingCents:0,reviewedCents:0});
   const g=grouped.get(r.factionId);
   g.items.push({...r,lotId:lot.id,reviewed:!!r.review});
   g.totalCents+=r.amountCents;
   if(r.review)g.reviewedCents+=r.amountCents;else g.pendingCents+=r.amountCents;
  }
  return [...grouped.values()].sort((a,b)=>a.name.localeCompare(b.name,'pt-BR'));
 }
 function inspect(s){
  if(s.multiFlowLots===undefined&&s.multiFlowSeparations===undefined&&s.multiFlowShipments===undefined)return [];
  if(!Array.isArray(s.multiFlowLots)||!Array.isArray(s.multiFlowSeparations)||
    !Array.isArray(s.multiFlowShipments))return ['Fluxo multimodelo: coleções ilegíveis'];
  const issues=[],ids=new Set(),seenProof=new Set();
  const checkId=x=>{if(ids.has(x.id)||!x.id)fail('ID de movimento duplicado/ausente');ids.add(x.id)};
  const eventProof=(entry,type)=>{
   if(!entry.commandId||seenProof.has(entry.commandId))fail('Comando repetido ou ausente');
   seenProof.add(entry.commandId);proof(s,entry.commandId,entry.revision,type);
  };
  for(const lot of s.multiFlowLots){
   try{
    checkId(lot);
    const cut=find(s.multiCutPlans,lot.cutId),item=orderItem(s,lot.orderId,lot.itemId).item;
    if(!cut||cut.status!=='concluido'||cut.orderId!==lot.orderId||
       cut.itemId!==lot.itemId||lot.productId!==item.productId||
       !find(s.factions,lot.originalFactionId))fail('Origem do envio inválida');
    const fields={cutId:lot.cutId,orderId:lot.orderId,itemId:lot.itemId,
      productId:lot.productId,lines:lot.lines,qty:lot.qty,
      originalFactionId:lot.originalFactionId,originalUnitCents:lot.originalUnitCents,reason:lot.reason};
    if(!signatureMatches(lot.immutableFingerprint,fields))fail('Envio alterado fora do histórico');
    if(lot.qty!==sum(lot.lines))fail('Total de envio divergente');
    validateLines(lot.lines,lineLimits(cut.lines),'Origem do envio');
    eventProof({commandId:lot.createdCommandId,revision:lot.createdRevision},'multi.flow.allocate');
    let factionId=lot.originalFactionId,unitCents=lot.originalUnitCents,prevRevision=lot.createdRevision;
    const all=[...(lot.changes||[]).map(e=>({...e,kind:'change'})),
      ...(lot.returns||[]).map(e=>({...e,kind:'return'}))]
      .sort((a,b)=>a.revision-b.revision);
    const done=[];
    for(const e of all){
     if(e.revision<=prevRevision)fail('Evento do envio fora de ordem');
     prevRevision=e.revision;
     if(e.kind==='change'){
      eventProof(e,e.type==='transfer'?'multi.flow.transfer':'multi.flow.rate');
      if(!['transfer','price'].includes(e.type)||e.fromFactionId!==factionId||
       e.fromUnitCents!==unitCents||!find(s.factions,e.toFactionId)||
       !Number.isSafeInteger(e.toUnitCents)||e.toUnitCents<1||
       !e.reason)fail('Revisão da facção ou mão de obra inválida');
      const pending=lineLimits(lot.lines,done);
      const expected=[...pending.values()].reduce((n,x)=>n+x.remaining,0);
      const immutableChange={type:e.type,commandId:e.commandId,revision:e.revision,
       fromFactionId:e.fromFactionId,fromUnitCents:e.fromUnitCents,toFactionId:e.toFactionId,
       toUnitCents:e.toUnitCents,pending:e.pending,lines:e.lines,reason:e.reason};
      if(!signatureMatches(e.immutableFingerprint,immutableChange))
       fail('Histórico da facção/mão de obra foi alterado fora do comando');
      if(e.pending!==expected||expected<1)fail('Histórico de saldo da transferência inválido');
      const remain=[...pending.values()].filter(x=>x.remaining>0)
        .map(x=>({color:x.color,size:x.size,qty:x.remaining}));
      if(fingerprint(e.lines)!==fingerprint(remain))fail('Grade transferida não corresponde ao pendente');
      factionId=e.toFactionId;unitCents=e.toUnitCents;
     }else{
      checkId(e);eventProof(e,'multi.flow.return');
      const vals={lotId:lot.id,orderId:lot.orderId,itemId:lot.itemId,productId:lot.productId,
        cutId:lot.cutId,lines:e.lines,qty:e.qty,factionId:e.factionId,
        unitCents:e.unitCents,amountCents:e.amountCents,reason:e.reason};
      if(!signatureMatches(e.immutableFingerprint,vals)||e.factionId!==factionId||
        e.unitCents!==unitCents||e.qty!==sum(e.lines)||
        e.amountCents!==e.qty*e.unitCents)fail('Retorno/acerto modificado ou divergente');
      validateLines(e.lines,lineLimits(lot.lines,done),'Origem do retorno');
      done.push(e.lines);
      if(e.review){
       eventProof(e.review,'multi.flow.review');
       const immutableReview={commandId:e.review.commandId,revision:e.review.revision,
        reviewer:e.review.reviewer,reason:e.review.reason,amountCents:e.review.amountCents,
        factionId:e.review.factionId};
       if(e.review.revision<=e.revision||e.review.amountCents!==e.amountCents||
          e.review.factionId!==e.factionId||!e.review.reviewer||!e.review.reason||
          !signatureMatches(e.review.immutableFingerprint,immutableReview))
        fail('Conferência de acerto fictício inconsistente');
      }
     }
    }
    if(lot.factionId!==factionId||lot.unitCents!==unitCents)
     fail('Facção ou mão de obra atual alterada fora do histórico');
   }catch(e){issues.push(String(lot?.id||'Envio')+': '+e.message)}
  }
  for(const [type,list] of [['separate',s.multiFlowSeparations],['ship',s.multiFlowShipments]]){
   for(const e of list)try{
    checkId(e);const item=orderItem(s,e.orderId,e.itemId).item;
    const fields={orderId:e.orderId,itemId:e.itemId,productId:e.productId,
      lines:e.lines,qty:e.qty,reason:e.reason};
    if(e.productId!==item.productId||e.qty!==sum(e.lines)||
       !signatureMatches(e.immutableFingerprint,fields))fail('Movimento sem origem ou adulterado');
    validateLines(e.lines,new Map([...slots(item).values()].map(x=>[cell(x.color,x.size),
      {...x,remaining:x.ordered}])),'Variação separada/expedida');
    eventProof(e,type==='separate'?'multi.flow.separate':'multi.flow.ship');
   }catch(err){issues.push(String(e?.id||'Movimento')+': '+err.message)}
  }
  for(const order of s.multiOrders||[])for(const item of order.items||[])try{
   for(const r of orderBalance(s,order.id,item.id)){
    if(r.cut<0||r.cutReserved<0||r.allocated<0||r.returned<0||
       r.separated<0||r.shipped<0||
       r.ordered<r.cut+r.cutReserved||r.cut<r.allocated||r.allocated<r.returned||
       r.returned<r.separated||r.separated<r.shipped)
      fail('Saldo impossível em '+r.color+' / '+r.size+' (P/C/F/R/S/E).');
   }
  }catch(e){issues.push(order.id+'/'+item.id+': '+e.message)}
  for(const cut of s.multiCutPlans||[])if(cut.status==='concluido')try{
   const lots=s.multiFlowLots.filter(x=>x.cutId===cut.id);
   for(const v of lineLimits(cut.lines,lots.map(l=>l.lines)).values())
    if(v.remaining<0)fail('Corte alocado em excesso');
  }catch(e){issues.push(cut.id+': '+e.message)}
  // Verificação inversa: todo evento de fluxo no log global precisa existir
  // exatamente uma vez no registro operacional. Sem isso seria possível
  // ocultar um retorno ou acerto removendo o objeto e deixando só o log.
  const recognized=new Set([
   'multi.flow.allocate','multi.flow.transfer','multi.flow.rate',
   'multi.flow.return','multi.flow.review','multi.flow.separate','multi.flow.ship'
  ]);
  for(const event of s.log||[])if(recognized.has(event.type)&&!seenProof.has(event.commandId))
   issues.push('Evento multimodelo sem registro operacional correspondente: '+event.commandId+' / '+event.type);
  return issues;
 }
 return Object.freeze({version:'1.0.0-lab',ensure,orderBalance,allocate,
  transfer:(s,p,ctx)=>moveOrRate(s,p,ctx,'transfer'),
  rate:(s,p,ctx)=>moveOrRate(s,p,ctx,'price'),
  returnPieces,reviewReturn,
  separate:(s,p,ctx)=>moveByOrder(s,p,ctx,'separate'),
  ship:(s,p,ctx)=>moveByOrder(s,p,ctx,'ship'),acertos,inspect});
});

;
/* modulos/fluxo-multimodelo-ui-v1.js */
/* HLGB Evolução — interface modular do percurso multimodelo fictício.
 * Apenas HTML; envia comandos ao núcleo isolado e não tem acesso a rede/estoque.
 */
(function(root,factory){
 const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;
 else if(root)root.HLGBLabMultiFlowUiV1=api;
})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const money=x=>(x/100).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
 const sum=(a,k)=>a.reduce((n,x)=>n+x[k],0);
 const table=(headers,rows)=>'<div class="table-wrap"><table><thead><tr>'+headers.map(x=>'<th>'+esc(x)+'</th>').join('')+
  '</tr></thead><tbody>'+rows.map(row=>'<tr>'+row.map(x=>'<td>'+esc(x)+'</td>').join('')+'</tr>').join('')+
  '</tbody></table></div>';
 const panel=(title,body)=>'<section class="panel"><h2>'+esc(title)+'</h2>'+body+'</section>';
 const input=(name,label,value,required=true,type='text')=>
  '<div class="field"><label>'+esc(label)+'<input class="input" type="'+type+'" name="'+esc(name)+'" value="'+esc(value)+
  '" '+(required?'required':'')+'></label></div>';
 const hidden=(name,value)=>'<input type="hidden" name="'+esc(name)+'" value="'+esc(value)+'">';
 const options=(list,selected='')=>list.map(([v,name])=>'<option value="'+esc(v)+'"'+(v===selected?' selected':'')+'>'+esc(name)+'</option>').join('');
 const select=(name,label,list,selected='')=>'<div class="field"><label>'+esc(label)+'<select name="'+esc(name)+'" class="input" required>'+
  options([['','Selecione explicitamente...'],...list],selected)+'</select></label></div>';
 const command=(type,fields,grade,label)=>'<form data-command="'+esc(type)+'"><div class="fields">'+fields+'</div>'+
  (grade||'')+'<button class="btn primary" type="submit">'+esc(label)+'</button></form>';
 const cutRows=x=>x.lines.map(y=>({...y,remaining:y.qty}));
 const key=x=>x.color+'|'+x.size;
 function grade(lines,limits){
  const availability=new Map(limits.map(x=>[key(x),x.remaining]));
  return '<div class="fields">'+lines.map(line=>{
   const max=availability.get(key(line))||0;
   return max>0?'<div class="field"><label>'+esc(line.color)+' / '+esc(line.size)+
    ' · saldo '+max+'<input class="input" data-mf-qty data-mf-color="'+esc(line.color)+
    '" data-mf-size="'+esc(line.size)+'" type="number" min="0" max="'+max+'" value="0" step="1"></label></div>':'';
  }).join('')+'</div>';
 }
 function readLines(form){
  const lines=[];
  for(const el of form.querySelectorAll('[data-mf-qty]')){
   const raw=String(el.value).trim();
   if(!/^(0|[1-9]\d*)$/.test(raw))throw Error('Quantidade inválida em '+el.dataset.mfColor+' / '+el.dataset.mfSize);
   const qty=Number(raw);
   if(!Number.isSafeInteger(qty)||qty>Number(el.max))throw Error('Quantidade maior que o saldo da variação.');
   if(qty)lines.push({color:el.dataset.mfColor,size:el.dataset.mfSize,qty});
  }
  if(!lines.length)throw Error('Escolha pelo menos uma variação com quantidade positiva.');
  return lines;
 }
 function balances(s,flow){
  return (s.multiOrders||[]).flatMap(o=>o.items.flatMap(item=>
   flow.orderBalance(s,o.id,item.id).filter(r=>r.ordered>0).map(r=>({
    ...r,orderId:o.id,itemId:item.id,model:item.name
   }))));
 }
 function balancePanel(s,flow){
  const rows=balances(s,flow);
  const count=k=>sum(rows,k);
  const stats=[['Pedidas',count('ordered')],['Cortadas',count('cut')],['A cortar',count('toCut')],
   ['Cortadas a separar',count('cutToSeparate')],['Retornadas disponíveis',count('availableToSeparate')],
   ['Separadas',count('separated')],['Expedidas',count('shipped')]];
  return panel('Multimodelo · saldo por cor e tamanho',
   '<p>Peças cortadas a separar incluem as que ainda estão na facção. As disponíveis para separação são somente as retornadas. Tudo nesta visão é fictício.</p>'+
   '<div class="metrics">'+stats.map(([name,n])=>'<div class="metric"><span>'+esc(name)+
    '</span><strong>'+n+'</strong></div>').join('')+'</div>'+
   table(['Pedido/modelo','Cor','Tamanho','Pedido','Cortado','A cortar','Na facção','Retornado','Cortadas a separar','Disp. separar','Separado','Expedido'],
    rows.map(r=>[r.orderId+' / '+r.model,r.color,r.size,r.ordered,r.cut,r.toCut,r.inFaction,
     r.returned,r.cutToSeparate,r.availableToSeparate,r.separated,r.shipped])));
 }
 function factionPanel(s,flow){
  const factions=s.factions.map(f=>[f.id,f.name]);
  const plans=(s.multiCutPlans||[]).filter(x=>x.status==='concluido');
  const lots=s.multiFlowLots||[];
  const creates=plans.map(p=>{
   const available=p.lines.map(line=>({...line,remaining:line.qty-
    lots.filter(l=>l.cutId===p.id).reduce((n,l)=>n+sum(l.lines.filter(x=>key(x)===key(line)),'qty'),0)}));
   if(!available.some(x=>x.remaining>0))return '';
   return '<details class="panel" data-mf-record="'+esc(p.orderId+'|'+p.itemId)+'"><summary>Corte '+esc(p.id)+' · '+esc(p.orderId)+'/'+esc(p.itemId)+'</summary>'+
    command('multi.flow.allocate',hidden('cutId',p.id)+select('factionId','Facção de destino',factions)+
     input('unitCents','Mão de obra por peça (R$)','5,50')+
     input('reason','Justificativa','Envio fictício por cor e tamanho'),
     grade(p.lines,available),'Enviar peças concluídas')+'</details>';
  }).join('');
  const existing=lots.map(l=>{
   const remaining=l.lines.map(line=>({...line,remaining:line.qty-
    (l.returns||[]).reduce((n,r)=>n+sum(r.lines.filter(x=>key(x)===key(line)),'qty'),0)}));
   const pending=remaining.reduce((n,x)=>n+x.remaining,0);
   const prev=l.returns.map(r=>[r.id,r.factionId,r.qty,money(r.amountCents),r.review?'Conferido':'A conferir']);
   return '<details class="panel"><summary>'+esc(l.id)+' · '+esc(l.orderId)+'/'+esc(l.itemId)+
    ' · Facção '+esc(l.factionId)+' · '+pending+' pendentes</summary>'+
    '<p>Origem '+esc(l.cutId)+' · '+l.qty+' peças · preço atual '+money(l.unitCents)+
    ' por peça. Transferências e preços anteriores permanecem no histórico.</p>'+
    (pending?command('multi.flow.return',hidden('id',l.id)+input('reason','Conferência','Retorno fictício parcial'),
     grade(l.lines,remaining),'Registrar retorno e acerto fictício')+
     command('multi.flow.transfer',hidden('id',l.id)+select('factionId','Nova facção do SALDO PENDENTE',factions)+
     input('unitCents','Nova mão de obra por peça (R$)',(l.unitCents/100).toFixed(2).replace('.',','))+
     input('reason','Motivo da transferência','Mudança do saldo pendente'),
     '', 'Transferir somente as peças pendentes')+
     command('multi.flow.rate',hidden('id',l.id)+
     input('unitCents','Novo valor por peça (R$)',(l.unitCents/100).toFixed(2).replace('.',','))+
     input('reason','Motivo da mão de obra','Revisão do valor futuro'),'','Revisar mão de obra futura'):'<p>Lote sem pendências.</p>')+
    table(['Retorno','Facção na devolução','Peças','Acerto fictício','Estado'],prev)+'</details>';
  }).join('');
  return panel('Facções multimodelo · envio e retorno por grade',
   '<p>Somente cortes concluídos podem ser enviados. Retornos com valor congelado nunca criam conta a pagar no Hub.</p>'+
   (creates||'<p>Sem cortes concluídos com saldo livre.</p>')+
   '<h3>Envios e retornos</h3>'+(existing||'<p>Sem envios multimodelo ainda.</p>'));
 }
 function separationPanel(s,flow){
  const blocks=(s.multiOrders||[]).flatMap(o=>o.items.map(item=>{
   const rows=flow.orderBalance(s,o.id,item.id);
   const forms=[];
   for(const [type,field,label] of [['multi.flow.separate','availableToSeparate','Separar peças retornadas'],
     ['multi.flow.ship','toShip','Expedir peças separadas']]){
    const available=rows.map(x=>({...x,remaining:x[field]}));
    if(!available.some(x=>x.remaining>0))continue;
    forms.push(command(type,hidden('orderId',o.id)+hidden('itemId',item.id)+
     input('reason','Conferência',type==='multi.flow.separate'?'Separação fictícia':'Expedição fictícia'),
     grade(rows,available),label));
   }
   return forms.length?'<details class="panel" data-mf-record="'+esc(o.id+'|'+item.id)+'" open><summary>'+esc(o.id)+' · '+esc(item.name)+'</summary>'+
    forms.join('')+'</details>':'';
  })).join('');
  return panel('Separação multimodelo · baixa parcial na grade',
   '<p>A separação só utiliza peças retornadas; a expedição usa somente peças separadas. Estas operações não alteram o programa comercial.</p>'+
   (blocks||'<p>Aguardando retornos de facções multimodelo.</p>')+
   table(['Movimento','Pedido/item','Peças','Variações'],
    [...(s.multiFlowSeparations||[]),...(s.multiFlowShipments||[])].map(x=>[x.id,x.orderId+'/'+x.itemId,
     x.qty,x.lines.map(r=>r.color+' '+r.size+': '+r.qty).join(' · ')])));
 }
 function acertoPanel(s,flow){
  const groups=flow.acertos(s),pending=groups.flatMap(g=>g.items.filter(r=>!r.reviewed));
  return panel('Acertos multimodelo · conferência sem pagamento',
   '<p>Cada retorno preserva facção, valor unitário e quantidade da data. Os valores são agrupados apenas para conferência fictícia; não há título no Hub.</p>'+
   table(['Facção','Itens','Valor simulado','A conferir','Conferido'],
    groups.map(g=>[g.name,g.items.length,money(g.totalCents),money(g.pendingCents),money(g.reviewedCents)]))+
   table(['Retorno','Facção','Pedido/modelo','Peças','Valor','Situação'],
    groups.flatMap(g=>g.items.map(r=>[r.id,g.name,r.orderId+'/'+r.itemId,r.qty,money(r.amountCents),
     r.reviewed?'Conferido':'Pendente'])))+
   pending.map(r=>'<div class="panel" data-mf-record="'+esc(r.id)+'"><b>'+esc(r.id)+'</b> · '+esc(r.orderId)+'/'+esc(r.itemId)+
    ' · '+money(r.amountCents)+' · aguardando conferência</div>').join('')+
   (pending.length?command('multi.flow.review',
    select('id','Acerto fictício',pending.map(r=>[r.id,r.id+' · '+money(r.amountCents)]))+
    input('reviewer','Conferente','Conferente fictício A')+input('reason','Motivo','Valores e peças conferidos'),
    '','Registrar conferência (não pagamento)'):'<p>Sem acertos fictícios aguardando conferência.</p>'));
 }
 function queue(s,flow){
  const queue=[];
  for(const o of s.multiOrders||[])for(const item of o.items||[]){
   for(const x of flow.orderBalance(s,o.id,item.id)){
    if(!x.ordered)continue;
    const ref=o.id+' / '+item.name+' / '+x.color+' / '+x.size,focus=o.id+'|'+item.id;
    if(x.toCut>0)queue.push({stage:'Corte pendente',ref,qty:x.toCut,to:'corte',focus});
    if(x.toAllocate>0)queue.push({stage:'Corte concluído para enviar à facção',ref,
     qty:x.toAllocate,to:'faccoes',focus});
    if(x.availableToSeparate>0)queue.push({stage:'Retorno disponível para separar',ref,
     qty:x.availableToSeparate,to:'separacao',focus});
    if(x.toShip>0)queue.push({stage:'Separado e disponível para expedir',ref,qty:x.toShip,to:'separacao',focus});
   }
  }
  for(const group of flow.acertos(s))for(const r of group.items.filter(x=>!x.reviewed))
   queue.push({stage:'Acerto fictício a conferir',ref:r.id+' / '+group.name,qty:r.qty,to:'acertos',focus:r.id});
  return queue;
 }
 function queuePanel(s,flow){
  const todo=queue(s,flow),ordered=['Corte pendente','Corte concluído para enviar à facção',
   'Retorno disponível para separar','Separado e disponível para expedir','Acerto fictício a conferir'];
  const sorted=todo.slice().sort((a,b)=>ordered.indexOf(a.stage)-ordered.indexOf(b.stage)||a.ref.localeCompare(b.ref,'pt-BR'));
  const rows=sorted.slice(0,120).map(x=>'<tr><td>'+esc(x.stage)+'</td><td>'+esc(x.ref)+'</td><td>'+
   x.qty+'</td><td><button type="button" class="btn" data-goto="'+esc(x.to)+'" data-mf-focus="'+esc(x.focus)+'">Abrir '+esc(x.to)+'</button></td></tr>').join('');
  return panel('Fila de trabalho por setor · multimodelo fictício',
   '<p>Mostra somente pendências calculadas a partir das grades e comandos deste exercício. Não possui prazo de entrega ou confirmação em outro computador; <b>não é uma fila real de produção</b>.</p>'+
   '<div class="metrics"><div class="metric"><span>Tarefas com saldo</span><strong>'+todo.length+'</strong></div>'+
   '<div class="metric"><span>Acertos por conferir</span><strong>'+
   todo.filter(x=>x.stage==='Acerto fictício a conferir').length+'</strong></div></div>'+
   (rows?'<div class="table-wrap"><table><thead><tr><th>Próxima etapa</th><th>Registro exato</th><th>Peças</th><th>Abrir módulo</th></tr></thead><tbody>'+
    rows+'</tbody></table></div>'+(todo.length>120?'<p>Lista parcial de 120 itens. Consulte o módulo para ver o restante.</p>':''):
    '<p>Sem pendências de operação multimodelo neste laboratório.</p>'));
 }
 return Object.freeze({balancePanel,factionPanel,separationPanel,acertoPanel,queue,queuePanel,readLines});
});

;
/* modulos/folha-corte-multimodelo-v1.js */
/* HLGB Evolução — folha A4 do Corte multimodelo exclusivamente fictício.
 * Visualização pura: não escreve, não imprime automaticamente, não consome estoque.
 * Não atribuir assinatura física a nomes digitados no ensaio.
 */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 else if(root)root.HLGBLabMultiCutSheetV1=api;
})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const norm=x=>String(x??'').trim().toLocaleUpperCase('pt-BR');
 const qty=xs=>xs.reduce((n,x)=>n+x.qty,0);
 const sizeOrder=['PP','P','M','G','GG','XG','G1','G2','G3','G4'];
 const fmtGrams=x=>Number.isSafeInteger(x)?(x/1000).toFixed(3).replace('.',',')+' kg':'________ kg';
 const error=m=>{throw Error(m)};
 function read(s,id){
  const plan=(s.multiCutPlans||[]).find(x=>x.id===id);
  if(!plan)error('Folha multimodelo não encontrada neste documento fictício.');
  const order=(s.multiOrders||[]).find(x=>x.id===plan.orderId);
  const item=order?.items.find(x=>x.id===plan.itemId);
  const product=s.products.find(x=>x.id===plan.productId),client=s.clients.find(x=>x.id===order?.clientId);
  if(!order||!item||!product||item.productId!==product.id||!client)
   error('Folha e pedido multimodelo não conciliados. Não imprimir.');
  const sizes=[...new Set(plan.lines.map(x=>x.size))].sort((a,b)=>{
   const ai=sizeOrder.indexOf(a.toUpperCase()),bi=sizeOrder.indexOf(b.toUpperCase());
   return (ai<0?100:ai)-(bi<0?100:bi)||a.localeCompare(b,'pt-BR');
  });
  const colors=[...new Set(plan.lines.map(x=>x.color))];
  if(!plan.qty||qty(plan.lines)!==plan.qty)error('Quantidade impressa diverge da programação. Não imprimir.');
  return {plan,order,item,product,client,sizes,colors};
 }
 function materials(s,plan,product){
  const rules=(s.materialRecipeRules||[]).filter(r=>r.active&&r.productId===product.id);
  const ids=new Set([product.materialId,...rules.map(r=>r.materialId)]);
  const rows=[];
  for(const id of ids){
   const mat=s.materials.find(x=>x.id===id);
   if(!mat)error('Matéria-prima da ficha técnica ausente: '+id);
   let amount=0,origin=new Set();
   for(const line of plan.lines){
    let best=null,bestRank=-1;
    for(const rule of rules){
     if(rule.materialId!==id)continue;
     if(rule.color!=='*'&&norm(rule.color)!==norm(line.color))continue;
     if(rule.size!=='*'&&norm(rule.size)!==norm(line.size))continue;
     const rank=(rule.color==='*'?0:2)+(rule.size==='*'?0:1);
     if(rank>bestRank){best=rule;bestRank=rank;}
    }
    const per=best?best.gramsPerUnit:id===product.materialId?product.gramsPerUnit:0;
    if(!Number.isSafeInteger(per)||per<0||per>5000)error('Consumo técnico inválido para '+mat.name);
    amount+=per*line.qty;
    if(best)origin.add('Receita '+best.id);
    else if(per)origin.add('Ficha básica');
   }
   if(!Number.isSafeInteger(amount)||amount<0||amount>100000000)error('Previsão de material inválida.');
   if(amount)rows.push({id,name:mat.name,unit:'kg',plannedGrams:amount,origin:[...origin].join(' + ')});
  }
  return rows;
 }
 function preview(s,id){
  const {plan,order,item,product,client,sizes,colors}=read(s,id);
  const mats=materials(s,plan,product);
  const w=Array.isArray(plan.weightEvents)&&plan.weightEvents.length?plan.weightEvents.at(-1):null;
  const totalsBySize=Object.fromEntries(sizes.map(size=>[size,plan.lines.filter(x=>x.size===size).reduce((n,x)=>n+x.qty,0)]));
  return {plan,order,item,product,client,sizes,colors,materials:mats,weight:w,
   totalPieces:plan.qty,totalsBySize,
   totalPlannedGrams:mats.reduce((n,x)=>n+x.plannedGrams,0),
   sampleOnly:true,stockWritten:false,productionApproval:false};
 }
 function matrix(p){
  const {sizes,colors,plan,totalsBySize}=p;
  const heads=sizes.map(s=>'<th>'+esc(s)+'</th>').join('');
  const cells=colors.map(color=>{
   let total=0;
   const values=sizes.map(size=>{const n=plan.lines.filter(x=>x.color===color&&x.size===size).reduce((a,x)=>a+x.qty,0);total+=n;return '<td class="num">'+n+'</td>';}).join('');
   return '<tr><th>'+esc(color)+'</th>'+values+'<th class="num">'+total+'</th></tr>';
  }).join('');
  return '<table class="mc-matrix"><thead><tr><th>Cor</th>'+heads+'<th>Total</th></tr></thead><tbody>'+
   cells+'<tr class="mc-total"><th>Total</th>'+sizes.map(s=>'<th class="num">'+totalsBySize[s]+'</th>').join('')+
   '<th class="num">'+p.totalPieces+'</th></tr></tbody></table>';
 }
 function materialsTable(p){
  const rows=p.materials.length?p.materials:[{name:'Sem material previsto — conferência manual',origin:'',plannedGrams:null,unit:''}];
  return '<table><thead><tr><th>Matéria-prima</th><th>Un.</th><th>Critério</th><th>Previsto</th><th>Usado real</th><th>Diferença</th><th>Aprov. %</th><th>Observação</th></tr></thead><tbody>'+
   rows.map(m=>'<tr><td>'+esc(m.name)+'</td><td>'+esc(m.unit)+'</td><td>'+esc(m.origin)+'</td>'+
    '<td class="num">'+(m.plannedGrams==null?'—':fmtGrams(m.plannedGrams))+'</td><td class="write"></td><td class="write"></td><td class="write"></td><td class="write"></td></tr>').join('')+'</tbody></table>';
 }
 function weightTable(p){
  const w=p.weight;
  const rows=p.materials.length?p.materials:[{name:'Matéria-prima a conferir'}];
  return '<table><thead><tr><th>Material cortável</th><th>Total recebido</th><th>Usado</th><th>Lixo/retalho</th><th>Aproveitamento</th></tr></thead><tbody>'+
   rows.map(m=>'<tr><td>'+esc(m.name)+'</td><td class="write"></td><td class="write"></td><td class="write"></td><td class="write"></td></tr>').join('')+
   '<tr class="mc-total"><th>Total'+(w?' (último registro)':'')+'</th><td>'+fmtGrams(w?.totalGrams)+'</td><td>'+fmtGrams(w?.usedGrams)+'</td><td>'+fmtGrams(w?.wasteGrams)+'</td>'+
   '<td>'+(w?(100*w.usedGrams/w.totalGrams).toFixed(1).replace('.',',')+' %':'_____ %')+'</td></tr></tbody></table>';
 }
 function extrasTable(p){
  const headers=p.colors.slice(0,7),overflow=p.colors.slice(7);
  return '<table><thead><tr><th>Peça/modelo extra</th><th>Previsto principal</th><th>Obtido principal</th><th>Diferença</th>'+
   headers.map(x=>'<th>'+esc(x)+'</th>').join('')+(overflow.length?'<th>Outras</th>':'')+'<th>Total extras</th></tr></thead><tbody>'+
   '<tr><th>'+esc(p.product.name)+'</th><td class="num">'+p.totalPieces+'</td><td class="write"></td><td class="write"></td>'+
   headers.map(()=>'<td class="write"></td>').join('')+(overflow.length?'<td class="write"></td>':'')+'<td class="write"></td></tr>'+
   Array.from({length:3},()=>'<tr><td class="write"></td>'+Array.from({length:4+headers.length+(overflow.length?1:0)},()=>'<td class="write"></td>').join('')+'</tr>').join('')+
   '</tbody></table>'+(overflow.length?'<p class="mc-tiny">Outras cores: '+esc(overflow.join(', '))+'</p>':'');
 }
 function render(s,id){
  const p=preview(s,id);
  const status=p.plan.status==='concluido'?'CONCLUÍDO (ENSAIO)':p.plan.status==='cancelado'?'CANCELADO — NÃO UTILIZAR':'PROGRAMADO (ENSAIO)';
  const latest=p.weight,weightHistory=Array.isArray(p.plan.weightEvents)?p.plan.weightEvents.length:0;
  return '<article class="mc-sheet"><div class="mc-head"><div class="mc-brand"><b>HLGB</b><span>EVOLUÇÃO · LAB</span></div>'+
   '<div class="mc-title">FOLHA DO CORTADOR<br><small>MULTIMODELO · A4</small></div><div class="mc-no">'+esc(p.plan.id)+'</div></div>'+
   '<div class="mc-watermark">DOCUMENTO FICTÍCIO — NÃO UTILIZAR NA PRODUÇÃO</div>'+
   '<div class="mc-meta"><span><b>Pedido</b> '+esc(p.order.id)+'</span><span><b>Modelo</b> '+esc(p.product.name)+'</span><span><b>SKU</b> '+esc(p.product.sku)+'</span>'+
   '<span><b>Cliente</b> '+esc(p.client.name)+'</span><span><b>Peças</b> '+p.totalPieces+'</span><span><b>Data</b> '+esc(p.plan.scheduledDate)+'</span>'+
   '<span><b>Status</b> '+esc(status)+'</span><span><b>Prioridade</b> '+esc(p.plan.priority)+'</span><span><b>Tipo</b> ☐ Interno ☐ Externo</span></div>'+
   '<div class="mc-team"><div>Cortador 1: <b>'+esc(p.plan.cutterOne)+'</b></div><div>Cortador 2: <b>'+esc(p.plan.cutterTwo)+'</b></div>'+
   '<div>Infestador: <b>'+esc(p.plan.spreader)+'</b></div></div>'+
   '<h2>1. Grade por cor e tamanho — somente este modelo</h2>'+matrix(p)+
   '<h2>2. Matérias-primas e consumo previsto</h2><p class="mc-tiny">Previsão ilustrativa baseada na ficha técnica fictícia e nas receitas por variação, quando existentes. Não representa estoque baixado.</p>'+
   materialsTable(p)+
   '<h2>3. Pesagem e aproveitamento por matéria</h2>'+weightTable(p)+
   '<p class="mc-tiny">Peso histórico geral após conclusão: '+weightHistory+' registro(s). '+(latest?'Último conferido por '+esc(latest.checker)+'; motivo: '+esc(latest.reason)+'.':'Pesagem ainda não registrada.')+
   ' O peso do corte não reabre a grade nem baixa materiais.</p>'+
   '<h2>4. Aproveitamento e peças extras</h2><p class="mc-tiny">Anotar peças extras por cor. Não acrescentar automaticamente ao pedido nem às contas.</p>'+extrasTable(p)+
   '<h2>5. Resumo e conferência</h2><div class="mc-bottom"><div class="mc-check">'+
   ['Grade conferida','Matérias-primas conferidas','Peso e lixo conferidos','Peças extras anotadas','Totais reconciliados'].map(x=>'<p>☐ '+x+'</p>').join('')+
   '</div><div class="mc-note"><b>Observações / divergências</b><div class="mc-write-line"></div><div class="mc-write-line"></div><div class="mc-write-line"></div></div></div>'+
   '<div class="mc-sign"><div>Assinatura do Cortador 1</div><div>Assinatura do Cortador 2</div><div>Assinatura do Infestador</div></div>'+
   '<p class="mc-foot">Registro do laboratório; assinaturas são campos físicos em branco e não comprovam execução real. Folha '+esc(p.plan.id)+
   ' · Pedido '+esc(p.order.id)+' · Item '+esc(p.item.id)+' · revisão '+s.revision+'.</p></article>';
 }
 return Object.freeze({version:'1.0.0-lab-a4',preview,render});
});

;
/* modulos/rotas-utilidades-v1.js */
/* HLGB Evolução — Utilidades > Rotas, somente dados fictícios do laboratório.
 * Sem navegador, rede, estoque, baixa de facção ou preço de venda.
 * É REQUISITO de homologação a leitura do servidor em outro computador;
 * esta implementação não a simula nem finge comprovação remota.
 */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 else if(root)root.HLGBLabRoutesV1=api;
})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 const error=x=>{throw Error(x)};
 const clone=x=>JSON.parse(JSON.stringify(x));
 const norm=x=>String(x??'').trim().toLocaleLowerCase('pt-BR');
 function text(x,label,max=300,required=false){
  if(typeof x!=='string')error(label+' deve ser texto.');
  const v=x.trim().replace(/\r\n/g,'\n');
  if(v.length>max||(required&&!v))error(label+' inválido (até '+max+' caracteres).');
  return v;
 }
 function date(value){
  if(typeof value!=='string'||!/^\d{4}-\d\d-\d\d$/.test(value)||
   Number.isNaN(Date.parse(value+'T00:00:00Z'))||new Date(value+'T00:00:00Z').toISOString().slice(0,10)!==value)
   error('Informe a data válida da rota.');
  return value;
 }
 function ensure(s){
  if(s.routePlans===undefined)s.routePlans=[];
  if(!Array.isArray(s.routePlans))error('Coleção de rotas inválida. Nenhuma gravação permitida.');
 }
 function location(s,raw){
  if(!raw||typeof raw!=='object')error('Local da parada obrigatório.');
  if(raw.type==='faccao'){
   const faction=s.factions.find(x=>x.id===raw.locationId);
   if(!faction)error('Selecione uma facção cadastrada para cada parada.');
   return {type:'faccao',locationId:faction.id,name:faction.name};
  }
  if(raw.type==='confeccao'){
   if(raw.locationId!=='HLGB-LAB')error('Local interno de demonstração inválido.');
   return {type:'confeccao',locationId:'HLGB-LAB',name:'HLGB Confecções — laboratório'};
  }
  error('Escolha a facção ou confecção da parada; não selecionar automaticamente.');
 }
 function parseList(value,label){
  if(!Array.isArray(value)||value.length>60)error(label+' comporta até 60 itens.');
  let sum=0;
  const found=new Set(),result=[];
  for(const x of value){
   const line=text(x,label+' — item',180,true),key=norm(line);
   if(found.has(key))error(label+': item repetido na mesma parada.');
   found.add(key);result.push(line);sum+=line.length;
  }
  if(sum>5000)error(label+' excede 5000 caracteres.');
  return result;
 }
 function validateStops(s,stops){
  if(!Array.isArray(stops)||stops.length<1||stops.length>30)
   error('Adicione de 1 a 30 paradas na rota.');
  return stops.map((raw,index)=>{
   const loc=location(s,raw),carry=parseList(raw.carry||[],'LEVAR na parada '+(index+1)),
    pickup=parseList(raw.pickup||[],'BUSCAR na parada '+(index+1));
   if(!carry.length&&!pickup.length)error('Parada '+(index+1)+' precisa de LEVAR ou BUSCAR.');
   const notes=text(raw.notes||'','Observações da parada',300);
   return {order:index+1,...loc,carry,pickup,notes};
  });
 }
 function payload(s,p){
  if(!p||typeof p!=='object')error('Formulário de rota ausente.');
  const status=p.status||'planejada';
  if(!['planejada','em_rota','finalizada'].includes(status))error('Estado da rota inválido.');
  return {date:date(p.date),driver:text(p.driver,'Motorista/responsável',95,true),
   status,notes:text(p.notes||'','Observações gerais',800),
   stops:validateStops(s,p.stops)};
 }
 function stable(x){return JSON.stringify(x,(_key,v)=>v&&typeof v==='object'&&!Array.isArray(v)?
  Object.fromEntries(Object.keys(v).sort().map(k=>[k,v[k]])):v);}
 function fingerprint(x){return stable({date:x.date,driver:x.driver,status:x.status,notes:x.notes,stops:x.stops});}
 function sameSignature(a,b){
  if(typeof a!=='string'||typeof b!=='string')return false;
  try{return stable(JSON.parse(a))===stable(JSON.parse(b))}catch(_e){return false}
 }
 function matchesSignature(sig,obj){return typeof sig==='string'&&sameSignature(sig,fingerprint(obj))}
 function create(s,p,{next,uid}){
  ensure(s);const validated=payload(s,p);
  const id=next(s,'ROT');
  s.routePlans.push({id,...validated,createdCommandId:uid,lastCommandId:uid,
   history:[{type:'criada',commandId:uid,revision:s.revision+1,afterFingerprint:fingerprint(validated)}]});
  return id+' · '+validated.stops.length+' parada(s) · LEVAR/BUSCAR fictícios';
 }
 function revise(s,p,{uid}){
  ensure(s);const row=s.routePlans.find(x=>x.id===p.id);
  if(!row||row.status==='cancelada')error('Rota inexistente ou cancelada.');
  const validated=payload(s,p);
  if(row.status==='finalizada'&&validated.status!=='finalizada')error('Rota finalizada não pode ser reaberta.');
  const before={date:row.date,driver:row.driver,status:row.status,notes:row.notes,stops:clone(row.stops)};
  if(stable(before)===stable(validated))error('Nenhuma mudança a salvar na rota.');
  const reason=text(p.reason,'Motivo da edição',300,true);
  const beforeFingerprint=fingerprint(before);
  Object.assign(row,validated,{lastCommandId:uid});
  row.history.push({type:'revisada',commandId:uid,revision:s.revision+1,before,reason,beforeFingerprint,
   afterFingerprint:fingerprint(row)});
  return row.id+' · rota revisada com histórico (apenas laboratório)';
 }
 function cancel(s,p,{uid}){
  ensure(s);const row=s.routePlans.find(x=>x.id===p.id);
  if(!row||row.status==='cancelada'||row.status==='finalizada')error('Somente uma rota aberta pode ser cancelada.');
  const reason=text(p.reason,'Motivo do cancelamento',300,true);
  const beforeFingerprint=fingerprint(row);
  row.status='cancelada';row.lastCommandId=uid;
  row.history.push({type:'cancelada',commandId:uid,revision:s.revision+1,reason,beforeFingerprint,
   afterFingerprint:fingerprint(row)});
  return row.id+' · cancelada sem apagar as paradas anteriores';
 }
 function inspect(s){
  if(s.routePlans===undefined)return [];
  if(!Array.isArray(s.routePlans))return ['Rotas: coleção ilegível'];
  const issues=[],seen=new Set();
  for(const route of s.routePlans){
   try{
    if(!route||!route.id||seen.has(route.id))error('ID ausente ou duplicado');
    seen.add(route.id);
    if(!['planejada','em_rota','finalizada','cancelada'].includes(route.status))error('Estado impossível');
    if(route.status!=='cancelada')payload(s,route);
    else{
     const copy={...route,status:'planejada'};payload(s,copy);
    }
    if(!Array.isArray(route.history)||!route.history.length||route.history[0].type!=='criada'||
      route.history[0].commandId!==route.createdCommandId)error('Histórico de criação inválido');
    const log=s.log||[],historyCommands=new Set();
    let revision=0,priorFingerprint=null;
    for(const h of route.history){
     const entry=log.find(x=>x.commandId===h.commandId);
     if(historyCommands.has(h.commandId)||!entry||entry.revision!==h.revision||
      h.revision<=revision||!['route.plan','route.revise','route.cancel'].includes(entry.type))
      error('Histórico de rota sem prova na revisão global');
     if(h.type==='revisada'&&(!h.reason||!h.before||!matchesSignature(h.beforeFingerprint,h.before)))error('Revisão sem justificativa ou estado anterior íntegro');
     if(h.type==='cancelada'&&!h.reason)error('Cancelamento sem justificativa');
     if(typeof h.afterFingerprint!=='string'||!h.afterFingerprint||
       (priorFingerprint!==null&&!sameSignature(h.beforeFingerprint,priorFingerprint)))error('Histórico de rota sem cadeia de estados');
     priorFingerprint=h.afterFingerprint;
     revision=h.revision;historyCommands.add(h.commandId);
    }
    if(route.history.at(-1).commandId!==route.lastCommandId)error('Última edição sem referência');
    if(!matchesSignature(priorFingerprint,route))error('Rota alterada fora de um comando válido');
    if(route.status==='cancelada'&&route.history.at(-1).type!=='cancelada')
     error('Cancelamento sem evento');
   }catch(e){issues.push(String(route?.id||'Rota')+': '+e.message)}
  }
  return issues;
 }
 function rows(s){return [...(s.routePlans||[])].sort((a,b)=>b.date.localeCompare(a.date)||a.id.localeCompare(b.id))}
 return Object.freeze({version:'1.0.0-lab',ensure,create,revise,cancel,inspect,rows});
});

;
/* modulos/etiquetas-a4-v1.js */
/* HLGB Evolução — Etiquetas A4 fictícias, gerador PURO sem acesso a dados ou rede.
 * Recupera formatos 10/18/21, lote multimodelo e volumes 1 de N.
 * Não gera nota, não altera pedido, estoque, embalagem ou histórico empresarial.
 */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 else if(root)root.HLGBLabLabelsV1=api;
})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 const specs=Object.freeze({
  '10':{cols:2,rows:5,widthMm:92,heightMm:52,gapMm:3},
  '18':{cols:3,rows:6,widthMm:62,heightMm:40,gapMm:2},
  '21':{cols:3,rows:7,widthMm:62,heightMm:34,gapMm:2}
 });
 const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const fail=message=>{throw Error(message)};
 const safe=(x,label,max=95,required=false)=>{
  if(typeof x!=='string')fail(label+' deve ser um texto.');
  const v=x.trim().replace(/\s+/g,' ');
  if(v.length>max||(required&&!v))fail(label+' obrigatório ou excede '+max+' caracteres.');
  return v;
 };
 const whole=(n,label,min=0,max=999)=>{
  if(!Number.isSafeInteger(n)||n<min||n>max)fail(label+' deve ser inteiro entre '+min+' e '+max+'.');
  return n;
 };
 function date(x){
  if(typeof x!=='string'||!/^\d{4}-\d\d-\d\d$/.test(x)||Number.isNaN(Date.parse(x+'T00:00:00Z'))||
   new Date(x+'T00:00:00Z').toISOString().slice(0,10)!==x)fail('Data de etiqueta inválida.');
  return x;
 }
 function plan(rows,layout){
  const spec=specs[String(layout)];
  if(!spec)fail('Escolha etiquetas A4 de 10, 18 ou 21 por folha.');
  if(!Array.isArray(rows)||!rows.length||rows.length>100)fail('Informe de 1 a 100 modelos no lote.');
  const labels=[],definitions=[];
  for(const [idx,row] of rows.entries()){
   if(!row||typeof row!=='object')fail('Modelo de etiqueta inválido.');
   const name=safe(row.name||'','Nome / local',95),model=safe(row.model||'','Modelo da peça',95);
   if(!name&&!model)continue; // Uma linha vazia é ignorada, inclusive se sua data foi limpa.
   const size=safe(row.size||'','Tamanho',50),
    pieceQty=whole(row.pieceQty,'Peças no volume',0,100000),
    volumes=whole(row.volumes,'Volumes',0,999),
    copies=whole(row.copies,'Cópias',1,999),
    printed=date(row.date);
   const number=volumes||copies;
   if(labels.length+number>2000)fail('Lote excede 2000 etiquetas; divida a impressão.');
   const def={name,model,size,pieceQty,volumes,copies,date:printed};
   definitions.push(def);
   for(let i=1;i<=number;i++){
    labels.push({...def,sourceRow:idx+1,
     displayVolume:volumes?i+' de '+volumes:'—',copyNumber:volumes?null:i});
   }
  }
  if(!labels.length)fail('Informe ao menos um nome ou modelo para imprimir etiquetas.');
  const per=spec.cols*spec.rows,pages=[];
  for(let offset=0;offset<labels.length;offset+=per){
   const part=labels.slice(offset,offset+per);
   pages.push({number:pages.length+1,labels:part,emptyCells:per-part.length});
  }
  return {layout:String(layout),spec,per,definitions,labels,pages,total:labels.length,
   modelCount:definitions.length,emptyCells:pages.at(-1)?.emptyCells||0,stockWritten:false,sampleOnly:true};
 }
 function card(label){
  return '<div class="mc-label-card"><b>'+esc(label.name)+'</b>'+
   '<p>MODELO: '+esc(label.model)+'</p>'+
   '<p>TAMANHO: '+esc(label.size||'—')+'</p>'+
   '<p>QUANTIDADE: '+label.pieceQty+'</p>'+
   '<p>VOLUME: '+esc(label.displayVolume)+'</p>'+
   '<p>DATA: '+esc(label.date)+'</p></div>';
 }
 function render(batch){
  if(!batch||!batch.sampleOnly||batch.stockWritten||!specs[batch.layout]||
   batch.pages.length!==Math.ceil(batch.total/batch.per))fail('Lote de impressão não validado.');
  const spec=specs[batch.layout],pages=batch.pages.map(page=>{
   if(page.labels.length+page.emptyCells!==batch.per)fail('Folha com espaços divergentes.');
   return '<section class="mc-label-page" style="--mc-label-cols:'+spec.cols+';--mc-label-w:'+spec.widthMm+
    'mm;--mc-label-h:'+spec.heightMm+'mm;--mc-label-gap:'+spec.gapMm+'mm">'+
    page.labels.map(card).join('')+
    Array.from({length:page.emptyCells},()=>'<div class="mc-label-empty" aria-hidden="true"></div>').join('')+
    '</section>';
  });
  return '<article class="mc-label-batch">'+pages.join('')+'</article>';
 }
 return Object.freeze({version:'1.0.0-lab',plan,render,specs});
});

;
/* modulos/embalagem-etiquetas-v1.js */
/* HLGB Evolução — Embaladeira e modelos de etiqueta de cliente.
 * SOMENTE LAB: não modifica embalagem operacional antiga, pedido, estoque,
 * facções, acertos ou títulos financeiros. Nunca confirma trabalho real.
 */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 else if(root)root.HLGBLabPackersV1=api;
})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 const fail=m=>{throw Error(m)};
 const clone=x=>JSON.parse(JSON.stringify(x));
 const by=(xs,id)=>xs.find(x=>x.id===id);
 const norm=x=>String(x??'').trim().toLocaleUpperCase('pt-BR');
 const txt=(x,label,max=95,needed=true)=>{
  if(typeof x!=='string')fail(label+' precisa ser texto.');
  const y=x.trim();
  if((needed&&!y)||y.length>max)fail(label+' inválido (máximo '+max+' caracteres).');
  return y;
 };
 const integer=(x,label,min,max)=>{if(!Number.isSafeInteger(x)||x<min||x>max)fail(label+' inválido.');return x};
 function date(x){
  if(typeof x!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(x)||
   !Number.isFinite(Date.parse(x+'T00:00:00Z'))||
   new Date(x+'T00:00:00Z').toISOString().slice(0,10)!==x)fail('Data inválida.');
  return x;
 }
 function ensure(s){
  if(s.labelTemplatesLab===undefined)s.labelTemplatesLab=[];
  if(s.packerAssignmentsLab===undefined)s.packerAssignmentsLab=[];
  if(!Array.isArray(s.labelTemplatesLab)||!Array.isArray(s.packerAssignmentsLab))
   fail('Estado de Embalagem ilegível. Não gravar.');
 }
 function fingerprint(obj){
  return JSON.stringify(obj,(_key,v)=>v&&typeof v==='object'&&!Array.isArray(v)?
   Object.fromEntries(Object.keys(v).sort().map(k=>[k,v[k]])):v);
 }
 function sameSignature(stored,object){
  if(typeof stored!=='string')return false;
  try{return fingerprint(JSON.parse(stored))===fingerprint(object)}catch(_e){return false}
 }
 function templateFields(s,p){
  if(!p||typeof p!=='object')fail('Formulário de etiqueta ausente.');
  const client=by(s.clients,p.clientId);
  if(!client)fail('Cliente não cadastrado na homologação.');
  const productId=p.productId||'';
  const product=productId?by(s.products,productId):null;
  if(productId&&!product)fail('Produto da etiqueta não cadastrado.');
  const cnpj=txt(p.cnpj||'','CNPJ impresso',30,false);
  if(cnpj&&!(cnpj.replace(/\D/g,'').length===14&&/^[0-9.\/-]+$/.test(cnpj)))fail('CNPJ deve conter 14 dígitos.');
  const url=txt(p.productUrl||'','URL do produto',300,false);
  if(url&&!/^https:\/\/[^\s<>"']{3,}$/i.test(url))fail('Somente URL HTTPS explícita; sem links locais.');
  const filename=txt(p.fileName||'','Nome de arquivo',115,false);
  if(filename&&!/^[\p{L}\p{N}][\p{L}\p{N} ._-]{0,110}\.(pdf|png|jpg|jpeg)$/iu.test(filename))
   fail('Nome do arquivo de referência inválido (.pdf, .png ou .jpg).');
  const sku=txt(p.sku||product?.sku||'','SKU',95,false);
  return {clientId:client.id,clientName:client.name,productId:productId||'',
   productName:product?.name||'',sku,cnpj,productUrl:url,fileName:filename,
   fieldsNote:txt(p.fieldsNote||'','Campos variáveis / observações',500,false)};
 }
 function activeTemplate(s,clientId,productId){
  const list=s.labelTemplatesLab||[];
  return list.find(x=>x.active&&x.clientId===clientId&&x.productId===productId)
    ||list.find(x=>x.active&&x.clientId===clientId&&x.productId==='')||null;
 }
 function addTemplate(s,p,{next,uid}){
  ensure(s);
  const fields=templateFields(s,p);
  if(s.labelTemplatesLab.some(x=>x.active&&x.clientId===fields.clientId&&x.productId===fields.productId))
   fail('Já existe modelo de etiqueta ativo para este cliente/produto. Edite o registro.');
  const id=next(s,'ETM');
  s.labelTemplatesLab.push({id,...fields,active:true,version:1,createdCommandId:uid,
   updatedCommandId:uid,history:[{type:'created',commandId:uid,revision:s.revision+1,
   version:1,afterFingerprint:fingerprint(fields)}]});
  return id+' · modelo de etiqueta fictício cadastrado';
 }
 function editTemplate(s,p,{uid}){
  ensure(s);
  const template=by(s.labelTemplatesLab,p.id);
  if(!template||!template.active)fail('Modelo de etiqueta inexistente ou inativo.');
  const fields=templateFields(s,p);
  if(fields.clientId!==template.clientId||fields.productId!==template.productId)
   fail('Cliente e modelo são a identidade da etiqueta; arquive e crie outra referência, sem perder vínculos antigos.');
  if(s.labelTemplatesLab.some(x=>x.id!==template.id&&x.active&&x.clientId===fields.clientId&&x.productId===fields.productId))
   fail('Já existe etiqueta ativa para o mesmo cliente e produto.');
  const before=Object.fromEntries(Object.keys(fields).map(k=>[k,template[k]]));
  if(fingerprint(before)===fingerprint(fields))fail('Modelo não foi alterado. Nenhuma gravação necessária.');
  const reason=txt(p.reason,'Motivo da edição',200);
  Object.assign(template,fields);
  template.version++;template.updatedCommandId=uid;
  template.history.push({type:'edited',commandId:uid,revision:s.revision+1,
   before,afterFingerprint:fingerprint(fields),version:template.version,reason});
  return template.id+' · versão '+template.version+' registrada; trabalhos anteriores preservados';
 }
 function archiveTemplate(s,p,{uid}){
  ensure(s);
  const template=by(s.labelTemplatesLab,p.id);
  if(!template||!template.active)fail('Modelo de etiqueta já inativo ou inexistente.');
  const reason=txt(p.reason,'Justificativa',200);
  template.active=false;template.updatedCommandId=uid;
  template.history.push({type:'archived',commandId:uid,revision:s.revision+1,
   version:template.version,reason,afterFingerprint:'archived'});
  return template.id+' · arquivado sem excluir históricos';
 }
 function labelSnapshot(s,clientId,productId){
  const t=activeTemplate(s,clientId,productId);
  return t?{id:t.id,version:t.version,clientId:t.clientId,productId:t.productId,
   fileName:t.fileName,sku:t.sku,cnpj:t.cnpj,productUrl:t.productUrl,
   fieldsNote:t.fieldsNote}:null;
 }
 function baseAssignment(s,p){
  const employee=by(s.employees,p.packerId),client=by(s.clients,p.clientId),
   product=by(s.products,p.productId);
  if(!employee||!client||!product)fail('Escolha embaladeira, cliente e modelo cadastrados.');
  const qty=integer(p.qty,'Peças enviadas à embaladeira',1,100000),
   labelQty=integer(p.labelQty,'Quantidade de etiquetas',0,100000),
   size=txt(p.size,'Tamanho da peça',40),
   color=txt(p.color||'','Cor',60,false);
  const due=date(p.date);
  return {packerId:employee.id,packerName:employee.name,
   clientId:client.id,clientName:client.name,
   productId:product.id,productName:product.name,
   date:due,size,color,qty,labelQty,
   notes:txt(p.notes||'','Observações',500,false)};
 }
 function statusOf(row){return row.doneQty===row.qty?'concluido':row.doneQty>0?'parcial':'aguardando'}
 const assignmentFields=['packerId','packerName','clientId','clientName','productId',
  'productName','date','size','color','qty','labelQty','notes'];
 function assignmentSnapshot(row){
  return Object.fromEntries(assignmentFields.map(k=>[k,clone(row[k])]));
 }
 function assignmentFingerprint(row){
  return fingerprint({fields:assignmentSnapshot(row),label:row.labelSnapshot});
 }
 function assign(s,p,{next,uid}){
  ensure(s);
  const valid=baseAssignment(s,p);
  if(s.packerAssignmentsLab.some(x=>x.status!=='cancelado'&&x.packerId===valid.packerId&&
   x.clientId===valid.clientId&&x.productId===valid.productId&&
   norm(x.size)===norm(valid.size)&&norm(x.color)===norm(valid.color)&&
   x.date===valid.date&&x.qty===valid.qty))
   fail('Tarefa semelhante já existe para a mesma embaladeira e data. Confira antes de duplicar.');
  const id=next(s,'EBA');
  const row={id,...valid,doneQty:0,status:'aguardando',
   labelSnapshot:labelSnapshot(s,valid.clientId,valid.productId),
   createdCommandId:uid,lastCommandId:uid,
   history:[]};
  row.history.push({type:'created',commandId:uid,revision:s.revision+1,
   afterFingerprint:assignmentFingerprint(row),doneAfter:0});
  s.packerAssignmentsLab.push(row);
  return id+' · '+valid.qty+' peças atribuídas somente no laboratório';
 }
 function reviseAssignment(s,p,{uid}){
  ensure(s);
  const row=by(s.packerAssignmentsLab,p.id);
  if(!row||row.status==='cancelado'||row.status==='concluido')
   fail('Somente tarefa de embalagem aguardando/parcial pode ser editada.');
  const valid=baseAssignment(s,p);
  if(valid.qty<row.doneQty)fail('Nova quantidade não pode ser inferior ao já registrado como pronto.');
  if(row.doneQty>0&&(row.clientId!==valid.clientId||row.productId!==valid.productId||
    norm(row.size)!==norm(valid.size)||norm(row.color)!==norm(valid.color)))
   fail('Peças já concluídas impedem trocar cliente, modelo, cor ou tamanho; regularize em fluxo separado.');
  const before=assignmentSnapshot(row),after=fingerprint(valid),oldLabel=clone(row.labelSnapshot);
  if(fingerprint(before)===after)fail('Nenhuma alteração na atribuição.');
  const reason=txt(p.reason,'Motivo da edição',200);
  const changedDestination=row.clientId!==valid.clientId||row.productId!==valid.productId;
  Object.assign(row,valid);
  // Uma alteração de quantidade/funcionária nunca troca silenciosamente a versão da etiqueta.
  if(changedDestination)row.labelSnapshot=labelSnapshot(s,valid.clientId,valid.productId);
  row.status=statusOf(row);row.lastCommandId=uid;
  row.history.push({type:'revised',commandId:uid,revision:s.revision+1,
   before,labelBefore:oldLabel,doneBefore:row.doneQty,afterFingerprint:assignmentFingerprint(row),doneAfter:row.doneQty,reason});
  return row.id+' · atribuição revisada sem apagar a anterior';
 }
 function progress(s,p,{uid}){
  ensure(s);
  const row=by(s.packerAssignmentsLab,p.id);
  if(!row||row.status==='cancelado')fail('Tarefa de embalagem inexistente ou cancelada.');
  const done=integer(p.doneQty,'Quantidade pronta',0,row.qty);
  if(done===row.doneQty)fail('Quantidade pronta idêntica à última. Não duplicar evento.');
  const reason=txt(p.reason,'Conferência / motivo',200);
  const before=row.doneQty;
  // Correção para baixo é explícita, justificada e preserva a quantidade anterior.
  if(done<before&&p.correction!==true)fail('Redução exige marcar correção com justificativa.');
  row.doneQty=done;row.status=statusOf(row);row.lastCommandId=uid;
  row.history.push({type:done<before?'corrected':'progressed',commandId:uid,
   revision:s.revision+1,doneBefore:before,doneAfter:done,
   afterFingerprint:assignmentFingerprint(row),reason});
  return row.id+' · '+done+' de '+row.qty+' peças prontas ('+row.status+')';
 }
 function cancelAssignment(s,p,{uid}){
  ensure(s);
  const row=by(s.packerAssignmentsLab,p.id);
  if(!row||row.status==='cancelado'||row.doneQty>0)
   fail('Somente atribuição sem peças prontas pode ser cancelada.');
  const reason=txt(p.reason,'Motivo do cancelamento',200);
  row.status='cancelado';row.lastCommandId=uid;
  row.history.push({type:'cancelled',commandId:uid,revision:s.revision+1,
   afterFingerprint:assignmentFingerprint(row),reason,doneAfter:0});
  return row.id+' · cancelada preservando o histórico';
 }
 function inspect(s){
  if(s.labelTemplatesLab===undefined&&s.packerAssignmentsLab===undefined)return [];
  const issues=[];
  if(!Array.isArray(s.labelTemplatesLab)||!Array.isArray(s.packerAssignmentsLab))
   return ['Embalagem: coleção inválida'];
  const unique=new Set(),templateKeys=new Set(),log=new Map((s.log||[]).map(x=>[x.commandId,x]));
  for(const t of s.labelTemplatesLab){
   try{
    if(unique.has(t.id))fail('ID de modelo de etiqueta duplicado');unique.add(t.id);
    if(!by(s.clients,t.clientId)||(t.productId&&!by(s.products,t.productId)))
     fail('Cliente/produto da etiqueta não localizado');
    const key=t.clientId+'|'+t.productId;
    if(t.active){if(templateKeys.has(key))fail('Modelos ativos duplicados');templateKeys.add(key);}
    if(!Array.isArray(t.history)||!t.history.length||t.history[0].type!=='created'||
      t.version<1||t.history.filter(x=>x.type==='edited').length+1!==t.version)
      fail('Histórico/versionamento da etiqueta inválido');
    if(t.history.at(-1).commandId!==t.updatedCommandId)fail('Última edição da etiqueta sem comando');
    if(t.active!==true&&t.history.at(-1).type!=='archived')fail('Arquivo de etiqueta sem evento');
    let prev=0,priorData=null;for(const e of t.history){
     const v=log.get(e.commandId);
     if(!v||v.revision!==e.revision||e.revision<=prev||!{
      created:'label.template.add',edited:'label.template.edit',archived:'label.template.archive'
     }[e.type]||v.type!=={created:'label.template.add',edited:'label.template.edit',archived:'label.template.archive'}[e.type])
      fail('Evento da etiqueta sem origem ou fora de ordem');
     if(e.type==='edited'&&(!e.before||!sameSignature(priorData,e.before)))
      fail('Etiqueta editada sem histórico anterior compatível');
     if(e.type==='archived'&&e.afterFingerprint!=='archived')fail('Evento de arquivo inválido');
     if(e.type!=='archived')priorData=e.afterFingerprint;
     prev=e.revision;
    }
    const actual=Object.fromEntries(['clientId','clientName','productId','productName','sku',
      'cnpj','productUrl','fileName','fieldsNote'].map(k=>[k,t[k]]));
    if(!sameSignature(priorData,actual))fail('Etiqueta alterada fora do histórico, inclusive se arquivada');
   }catch(e){issues.push(String(t?.id||'ETM')+': '+e.message)}
  }
  for(const row of s.packerAssignmentsLab){
   try{
    if(unique.has(row.id))fail('ID de tarefa duplicado');unique.add(row.id);
    if(!by(s.employees,row.packerId)||!by(s.clients,row.clientId)||!by(s.products,row.productId))
     fail('Cadastros vinculados à tarefa ausentes');
    integer(row.qty,'Quantidade da tarefa',1,100000);
    integer(row.doneQty,'Pronto da tarefa',0,row.qty);
    integer(row.labelQty,'Etiquetas da tarefa',0,100000);
    if(row.status!=='cancelado'&&statusOf(row)!==row.status)fail('Estado/pronto divergentes');
    if(!Array.isArray(row.history)||!row.history.length||row.history[0].type!=='created'||
      row.history.at(-1).commandId!==row.lastCommandId)fail('Histórico da tarefa incompleto');
    if(row.status==='cancelado'&&row.history.at(-1).type!=='cancelled')fail('Cancelamento sem evento');
    const snap=row.labelSnapshot;
    if(snap){
     const tmpl=by(s.labelTemplatesLab,snap.id);
     if(!tmpl||tmpl.clientId!==snap.clientId||snap.clientId!==row.clientId||
      (snap.productId&&snap.productId!==row.productId)||snap.version>tmpl.version)
      fail('Etiqueta vinculada ao cliente/modelo incorreto');
    }
    let prev=0,priorFingerprint=null,priorDone=0;for(const e of row.history){
     const event=log.get(e.commandId);
     if(!event||event.revision!==e.revision||e.revision<=prev||
      event.type!=={created:'packer.assign',revised:'packer.revise',
      progressed:'packer.progress',corrected:'packer.progress',cancelled:'packer.cancel'}[e.type])
      fail('Tarefa com operação sem prova global');
     if(e.type==='revised'&&(!e.before||
        !sameSignature(priorFingerprint,{fields:e.before,label:e.labelBefore})))
       fail('Revisão da embalagem não corresponde ao estado anterior');
     if(e.type!=='created'&&e.type!=='cancelled'&&e.doneBefore!==priorDone)
       fail('Progressão/correção sem quantidade anterior coerente');
     if(e.type==='created'&&e.doneAfter!==0)fail('Embalagem iniciada com peça concluída');
     if(!Number.isSafeInteger(e.doneAfter)||e.doneAfter<0)fail('Histórico de quantidade inválido');
     priorDone=e.doneAfter;priorFingerprint=e.afterFingerprint;
     prev=e.revision;
    }
    if(!sameSignature(row.history.at(-1).afterFingerprint,{fields:assignmentSnapshot(row),label:row.labelSnapshot}))
     fail('Tarefa alterada fora da revisão');
    if(row.history.at(-1).doneAfter!==row.doneQty)fail('Quantidade pronta sem prova');
    const steps=row.history.filter(x=>x.type==='progressed'||x.type==='corrected');
    for(const event of steps){if(!Number.isSafeInteger(event.doneBefore)||!Number.isSafeInteger(event.doneAfter)||
     event.doneBefore<0||event.doneAfter<0||
     (event.type==='progressed'&&event.doneAfter<=event.doneBefore)||
     (event.type==='corrected'&&event.doneAfter>=event.doneBefore))
      fail('Movimento de embalagem incoerente com o histórico');}
   }catch(e){issues.push(String(row?.id||'EBA')+': '+e.message)}
  }
  return issues;
 }
 function dashboard(s){
  const rows=[...(s.packerAssignmentsLab||[])],active=rows.filter(x=>x.status!=='cancelado');
  const total=active.reduce((n,x)=>n+x.qty,0),done=active.reduce((n,x)=>n+x.doneQty,0);
  return {assignments:active.length,total,done,pending:total-done,
   waiting:active.filter(x=>x.status==='aguardando').length,
   partial:active.filter(x=>x.status==='parcial').length,
   missingLabel:active.filter(x=>!x.labelSnapshot).length,
   rows:active.map(x=>({...x,remaining:x.qty-x.doneQty})),
   byPacker:[...new Set(active.map(x=>x.packerId))].map(id=>{
    const worker=by(s.employees,id);
    const items=active.filter(x=>x.packerId===id);
    return {packerId:id,name:worker?.name||id,assigned:items.reduce((n,x)=>n+x.qty,0),
     ready:items.reduce((n,x)=>n+x.doneQty,0),
     pending:items.reduce((n,x)=>n+x.qty-x.doneQty,0)};
   })};
 }
 return Object.freeze({version:'1.0.0-lab',ensure,addTemplate,editTemplate,archiveTemplate,
  activeTemplate,labelSnapshot,assign,reviseAssignment,progress,cancelAssignment,inspect,dashboard});
});

;
/* modulos/regularizacao-historica-preview-v1.js */
/* HLGB Evolução — Regularização histórica, SOMENTE PRÉVIA fictícia.
 * Sem escrita, sem importação, sem anexos PDF, sem acesso remoto.
 * Não faz correspondência aproximada por nome para evitar cliente/facção errados.
 */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 else if(root)root.HLGBLabHistoryReviewV1=api;
})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 const header='cliente;modelo;quantidade;data;referencia;status';
 const norm=x=>String(x??'').trim().normalize('NFD').replace(/[\u0300-\u036f]/g,'')
  .replace(/\s+/g,' ').toLocaleUpperCase('pt-BR');
 const date=x=>typeof x==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(x)&&
  Number.isFinite(Date.parse(x+'T00:00:00Z'))&&
  new Date(x+'T00:00:00Z').toISOString().slice(0,10)===x;
 function exactMatch(list,value){
  const key=norm(value),byId=list.filter(x=>norm(x.id)===key);
  if(byId.length===1)return byId[0];
  const byName=list.filter(x=>norm(x.name)===key);
  return byName.length===1?byName[0]:null;
 }
 function preview(s,raw){
  if(typeof raw!=='string'||raw.length>100000)throw Error('Cole uma lista CSV de até 100 mil caracteres.');
  const lines=raw.trim().replace(/^\uFEFF/,'').split(/\r?\n/);
  if(lines.length<2||norm(lines[0])!==norm(header))throw Error('Cabeçalho obrigatório: '+header);
  if(lines.length>251)throw Error('Prévia limitada a 250 linhas por lote.');
  const oldRefs=new Set([
   ...(s.orderImports||[]).flatMap(x=>(x.items||[]).map(y=>norm(y.reference))),
   ...(s.orders||[]).map(x=>norm(x.id)),
   ...(s.multiOrders||[]).map(x=>norm(x.id))
  ]);
  const refs=new Set(),results=[];
  for(let i=1;i<lines.length;i++){
   const values=lines[i].split(';'),lineNo=i+1,issues=[];
   if(values.length!==6){results.push({line:lineNo,status:'bloqueado',
     issues:['Linha deve conter exatamente seis colunas.'],reference:'',qty:0,
     clientId:null,productId:null});continue;}
   const [clientRaw,productRaw,quantityRaw,dateRaw,referenceRaw,statusRaw]=values.map(x=>x.trim());
   const client=exactMatch(s.clients,clientRaw),product=exactMatch(s.products,productRaw),
    ref=norm(referenceRaw),quantity=/^[1-9]\d*$/.test(quantityRaw)?Number(quantityRaw):0;
   if(!client)issues.push('Cliente sem correspondência exata e única.');
   if(!product)issues.push('Modelo sem correspondência exata e única.');
   if(!Number.isSafeInteger(quantity)||quantity<1||quantity>100000)
    issues.push('Quantidade deve ser de 1 a 100.000 peças.');
   if(!date(dateRaw))issues.push('Data impossível ou diferente de AAAA-MM-DD.');
   if(!ref||ref.length>75)issues.push('Referência obrigatória (até 75 caracteres).');
   if(refs.has(ref)||oldRefs.has(ref))issues.push('Referência duplicada na prévia ou já existente no laboratório.');
   if(!statusRaw||statusRaw.length>95)issues.push('Status histórico obrigatório.');
   if(ref)refs.add(ref);
   results.push({line:lineNo,reference:referenceRaw,client:clientRaw,product:productRaw,
    clientId:client?.id||null,productId:product?.id||null,qty:quantity,
    date:dateRaw,legacyStatus:statusRaw,status:issues.length?'bloqueado':'conciliavel',
    issues,productionImported:false});
  }
  const ready=results.filter(x=>x.status==='conciliavel'),blocked=results.filter(x=>x.status==='bloqueado');
  const totalPieces=ready.reduce((n,x)=>n+x.qty,0);
  if(!Number.isSafeInteger(totalPieces))throw Error('Totais da prévia fora do limite.');
  return {schema:'hlgb-historico-preview-ficticio-v1',baseRevision:s.revision,
   originalHeader:header,lines:results.length,ready:ready.length,blocked:blocked.length,
   readyPieces:totalPieces,rows:results,previewSignature:JSON.stringify([s.revision,results]),
   previewOnly:true,importedCount:0,stockWritten:false,financeWritten:false,
   canCommit:false,needsApproval:true};
 }
 return Object.freeze({version:'1.0.0-lab',header,preview});
});

;
/* operacao-integrada-core.js */
/* HLGB Evolução · operações integradas exclusivamente fictícias; nenhuma rede ou dado empresarial. */
(function(root,factory){
 'use strict';
 const batch=typeof module==='object'&&module.exports?
  require('./modulos/pagamento-lote-v1.js'):(root&&root.HLGBLabPaymentBatchV1);
 const routing=typeof module==='object'&&module.exports?
  require('./modulos/faccoes-multidestino-v1.js'):(root&&root.HLGBLabFactionRoutingV1);
 const factionGrade=typeof module==='object'&&module.exports?
  require('./modulos/grade-faccoes-v1.js'):(root&&root.HLGBLabFactionGradeV1);
 const planner=typeof module==='object'&&module.exports?
  require('./modulos/planejamento-materiais-v1.js'):(root&&root.HLGBLabMaterialsPlannerV1);
 const bomCut=typeof module==='object'&&module.exports?
  require('./modulos/corte-bom-v1.js'):(root&&root.HLGBLabBomCutV1);
 const requests=typeof module==='object'&&module.exports?
  require('./modulos/requisicoes-compras-v1.js'):(root&&root.HLGBLabPurchaseRequestsV1);
 const purchaseReturns=typeof module==='object'&&module.exports?
  require('./modulos/devolucoes-compras-v1.js'):(root&&root.HLGBLabPurchaseReturnsV1);
 const pcp=typeof module==='object'&&module.exports?require('./modulos/pcp-v1.js'):(root&&root.HLGBLabPCPV1);
 const management=typeof module==='object'&&module.exports?require('./modulos/relatorios-gerenciais-v1.js'):(root&&root.HLGBLabManagementV1);
 const auditor=typeof module==='object'&&module.exports?require('./modulos/auditor-v3.js'):(root&&root.HLGBLabAuditorV3);
 const bot=typeof module==='object'&&module.exports?require('./modulos/bot-v3.js'):(root&&root.HLGBLabBotV3);
 const costs=typeof module==='object'&&module.exports?require('./modulos/custos-v1.js'):(root&&root.HLGBLabCostsV1);
 const recovery=typeof module==='object'&&module.exports?require('./modulos/recuperacao-v1.js'):(root&&root.HLGBLabRecoveryV1);
 const services=typeof module==='object'&&module.exports?require('./modulos/servicos-faccao-v1.js'):(root&&root.HLGBLabServicesV1);
 const complements=typeof module==='object'&&module.exports?require('./modulos/complementos-v1.js'):(root&&root.HLGBLabComplementsV1);
 const payrollOrders=typeof module==='object'&&module.exports?require('./modulos/folha-pedidos-v1.js'):(root&&root.HLGBLabPayrollOrdersV1);
 const operationsV2=typeof module==='object'&&module.exports?require('./modulos/operacoes-v2.js'):(root&&root.HLGBLabOperationsV2);
 const multiOrders=typeof module==='object'&&module.exports?require('./modulos/pedidos-multimodelo-v1.js'):(root&&root.HLGBLabMultiOrdersV1);
 const multiCuts=typeof module==='object'&&module.exports?require('./modulos/corte-multimodelo-v1.js'):(root&&root.HLGBLabMultiCutsV1);
 const routes=typeof module==='object'&&module.exports?require('./modulos/rotas-utilidades-v1.js'):(root&&root.HLGBLabRoutesV1);
 const packers=typeof module==='object'&&module.exports?require('./modulos/embalagem-etiquetas-v1.js'):(root&&root.HLGBLabPackersV1);
 const multiFlow=typeof module==='object'&&module.exports?require('./modulos/fluxo-multimodelo-v1.js'):(root&&root.HLGBLabMultiFlowV1);
 const api=factory(batch,routing,factionGrade,planner,bomCut,requests,purchaseReturns,pcp,management,auditor,bot,costs,recovery,services,complements,payrollOrders,operationsV2,multiOrders,multiCuts,routes,packers,multiFlow);
 if(typeof module==='object'&&module.exports)module.exports=api;
 else if(root)root.HLGBOperationalLab=api;
})(typeof window!=='undefined'?window:null,function(batch,routing,factionGrade,planner,bomCut,requests,purchaseReturns,pcp,management,auditor,bot,costs,recovery,services,complements,payrollOrders,operationsV2,multiOrders,multiCuts,routes,packers,multiFlow){
 'use strict';
 const clone=x=>JSON.parse(JSON.stringify(x)),sizes=['P','M','G','GG'];
 const makeGrade=()=>({P:0,M:0,G:0,GG:0});
 const sum=x=>Object.values(x).reduce((a,b)=>a+b,0);
 const money=c=>(c/100).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
 const count=(s,prefix)=>(s.ids[prefix]||0)+1;
 const next=(s,prefix)=>{s.ids[prefix]=count(s,prefix);return prefix+'-'+String(s.ids[prefix]).padStart(4,'0')};
 function initial(){
  return {schema:'hlgb-evolucao-operacao-ficticia-v1',revision:1,period:'2026-11',ids:{CLI:2,FOR:2,MAT:3,PRO:3,FAC:2,FUN:2,IMP:1,CLR:3},
   clients:[{id:'CLI-0001',name:'Loja Exemplo Centro'},{id:'CLI-0002',name:'Cliente Simulado Online'}],
   suppliers:[{id:'FOR-0001',name:'Tecidos Fictícios'},{id:'FOR-0002',name:'Aviamentos Modelo'}],
   materials:[{id:'MAT-0001',name:'Malha (g)',stockGrams:16000,priceCentsKg:2800},
    {id:'MAT-0002',name:'Renda (g)',stockGrams:8000,priceCentsKg:4200},
    {id:'MAT-0003',name:'Tule (g)',stockGrams:12000,priceCentsKg:1800}],
   products:[{id:'PRO-0001',sku:'DEMO-MELINA',name:'Camisola Melina',materialId:'MAT-0001',gramsPerUnit:120,priceCents:3990},
    {id:'PRO-0002',sku:'DEMO-TAMMY',name:'Calcinha Tammy',materialId:'MAT-0002',gramsPerUnit:45,priceCents:1590},
    {id:'PRO-0003',sku:'DEMO-CRYSTAL',name:'Doll Crystal',materialId:'MAT-0003',gramsPerUnit:100,priceCents:4990}],
   factions:[{id:'FAC-0001',name:'Oficina Exemplo A',unitCents:550,traveta:true},
    {id:'FAC-0002',name:'Oficina Exemplo B',unitCents:600,traveta:false}],
   employees:[{id:'FUN-0001',name:'Ana Simulada',salaryCents:200000,passageCents:12000,extrasCents:0,discountCents:0},
    {id:'FUN-0002',name:'Bianca Modelo',salaryCents:180000,passageCents:8000,extrasCents:0,discountCents:3000}],
   colorCatalog:planner?planner.seed():[],materialRecipeRules:[],materialPlanLines:[],
   bomCutRuns:[],orders:[],multiOrders:[],multiCutPlans:[],multiFlowLots:[],multiFlowSeparations:[],multiFlowShipments:[],routePlans:[],labelTemplatesLab:[],packerAssignmentsLab:[],cutPlans:[],purchaseRequests:[],purchaseOrders:[],purchaseReturns:[],settlements:[],settlementCompensations:[],paymentBatches:[],paymentReceipts:[],finance:[],stockLedger:[],factionTransfers:[],factionAssignments:[],factionPartialTransfers:[],errors:[],
   prints:[{id:'IMP-0001',name:'Chaveiro articulado fictício',grams:28,priceCents:490,stock:12}],
   log:[],role:'supervisor',flags:{autoCorrections:false},revisionProof:'seed'};
 }
 const get=(s,list,id,label)=>{const result=s[list].find(x=>x.id===id);if(!result)throw Error((label||list)+': escolha um cadastro disponível.');return result};
 const int=(x,label,min=0,max=1000000)=>{if(!Number.isSafeInteger(x)||x<min||x>max)throw Error(label+' deve ser inteiro entre '+min+' e '+max+'.');return x};
 const name=(x,label)=>{if(typeof x!=='string'||!x.trim()||x.trim().length>95)throw Error(label+' deve ter entre 1 e 95 caracteres.');return x.trim()};
 const gradeValid=g=>g&&typeof g==='object'&&sizes.every(k=>Number.isSafeInteger(g[k])&&g[k]>=0)&&Object.keys(g).length===4;
 const quantities=o=>({ordered:sum(o.grade),cut:sum(o.cut),allocated:o.allocated,returned:o.returned,separated:o.separated,shipped:o.shipped});
 const totalCost=(q,price)=>Math.ceil(q*price/1000);
 function inspect(s){
  const problems=[];
  if(operationsV2)problems.push(...operationsV2.inspect(s,batch));
  if(payrollOrders)problems.push(...payrollOrders.inspect(s));
  if(complements)problems.push(...complements.inspect(s));
  if(services)problems.push(...services.inspect(s));
  if(costs)problems.push(...costs.inspect(s));
  if(bot)problems.push(...bot.inspect(s));
  if(pcp)problems.push(...pcp.inspect(s));
  if(multiOrders)problems.push(...multiOrders.inspect(s));
  if(multiCuts)problems.push(...multiCuts.inspect(s));
  if(multiFlow)problems.push(...multiFlow.inspect(s));
  if(routes)problems.push(...routes.inspect(s));
  if(packers)problems.push(...packers.inspect(s));
  for(const f of s.finance||[]){
   const seen=new Set();for(const v of f.revisions||[]){
    const e=s.log.find(x=>x.commandId===v.commandId);
    if(seen.has(v.commandId)||!v.reason||e?.type!=='finance.revise'||!String(e.description).startsWith(f.id+' · revisão de título manual · ')||!Number.isSafeInteger(v.before?.amountCents)||v.before.amountCents<=0||!Number.isSafeInteger(v.after?.amountCents)||v.after.amountCents<=0)problems.push(f.id+': histórico de edição financeira inválido');
    seen.add(v.commandId);
   }
  }
  for(const o of s.orders){
   const q=quantities(o);
   if(!gradeValid(o.grade)||!gradeValid(o.cut)||sizes.some(sz=>o.cut[sz]>o.grade[sz]))
    problems.push(o.id+': grade inválida ou corte acima do pedido');
   if(!(q.ordered>=q.cut&&q.cut>=q.allocated&&q.allocated>=q.returned&&q.returned>=q.separated&&q.separated>=q.shipped))
    problems.push(o.id+': baixa operacional sem quantidade anterior');
   if(o.allocated>0&&!o.factionId)problems.push(o.id+': facção não identificada');
   const linkedReturned=s.settlements.filter(a=>a.orderId===o.id).reduce((n,a)=>n+a.qty,0);
   if(linkedReturned!==o.returned)problems.push(o.id+': soma dos acertos não corresponde ao retorno');
  }
  const plans=Array.isArray(s.cutPlans)?s.cutPlans:[];
  for(const plan of plans){
   const o=s.orders.find(x=>x.id===plan.orderId),product=o&&s.products.find(x=>x.id===o.productId);
   if(!o||!product||!gradeValid(plan.grade)||sum(plan.grade)<1)problems.push(plan.id+': folha ou grade inválida');
   if(!['aberto','concluido','cancelado'].includes(plan.status))problems.push(plan.id+': status inválido');
   if(o&&product&&plan.theoreticalGrams!==sum(plan.grade)*product.gramsPerUnit)
    problems.push(plan.id+': peso teórico incompatível com a ficha');
   if(!['interno','externo'].includes(plan.workMode)||!plan.cutterOne||!plan.cutterTwo||!plan.spreader)
    problems.push(plan.id+': equipe de corte incompleta');
   if(plan.status==='concluido'){
    const tx=s.stockLedger.filter(x=>x.cutPlanId===plan.id&&x.type==='corte-planejado');
    if(tx.length!==1||tx[0].deltaGrams!==-(plan.usefulGrams+plan.scrapGrams)||
      !plan.signatureOne||!plan.signatureTwo||plan.usefulGrams<plan.theoreticalGrams||plan.scrapGrams<0)
     problems.push(plan.id+': peso, assinatura ou movimento de estoque sem conferência');
   }else if(s.stockLedger.some(x=>x.cutPlanId===plan.id))
    problems.push(plan.id+': folha não concluída com movimento de estoque');
  }
  for(const o of s.orders){
   const open=plans.filter(x=>x.orderId===o.id&&x.status==='aberto');
   for(const sz of sizes){
    if(o.cut[sz]+open.reduce((n,x)=>n+x.grade[sz],0)>o.grade[sz])
     problems.push(o.id+': reserva de corte '+sz+' acima da grade');
   }
  }
  for(const settlement of s.settlements){
   const linked=s.finance.filter(x=>x.sourceId===settlement.id&&x.kind==='pagar');
   if(linked.length!==1||linked[0].amountCents!==settlement.amountCents||
      (linked[0].status==='pago')!==(settlement.status==='pago')||
      !Number.isSafeInteger(settlement.amountCents)||settlement.amountCents<=0)
    problems.push(settlement.id+': acerto e título financeiro divergentes');
   if(settlement.productId&&!s.products.some(x=>x.id===settlement.productId))
    problems.push(settlement.id+': produto do acerto não localizado');
  }
  const comps=Array.isArray(s.settlementCompensations)?s.settlementCompensations:[];
  for(const cmp of comps){
   const original=s.settlements.find(x=>x.id===cmp.settlementId);
   const originalBill=s.finance.find(x=>x.sourceId===cmp.settlementId&&x.kind==='pagar');
   const linked=s.finance.filter(x=>x.sourceId===cmp.id);
   const expectedKind=cmp.deltaCents>0?'pagar':'receber';
   if(!original||original.status!=='pago'||!originalBill||originalBill.status!=='pago'||
      !Number.isSafeInteger(cmp.deltaCents)||cmp.deltaCents===0||
      !cmp.reference||!cmp.reason||!['aberto','pago'].includes(cmp.status)||
      linked.length!==1||linked[0].kind!==expectedKind||
      linked[0].amountCents!==Math.abs(cmp.deltaCents)||linked[0].status!==cmp.status)
    problems.push(cmp.id+': compensação e título vinculado inconsistentes');
  }
  const batches=Array.isArray(s.paymentBatches)?s.paymentBatches:[];
  const usedTitles=new Set(),usedRefs=new Set();
  for(const b of batches){
   const key=typeof b.reference==='string'?b.reference.trim().toLocaleUpperCase('pt-BR'):'';
   if(!key||usedRefs.has(key))problems.push(String(b.id)+': referência de lote duplicada ou inválida');
   usedRefs.add(key);
   if(!Array.isArray(b.items)||b.items.length<2||b.items.length>50||
    b.count!==b.items.length||b.kind!=='pagamento_ficticio_lote'||
    b.status!=='pago'||!b.reason||!b.commandId||!s.log.some(e=>e.commandId===b.commandId))
    problems.push(String(b.id)+': metadados de pagamento em lote inconsistentes');
   if(b.scope==='faccao'&&(
     !s.factions.some(f=>f.id===b.factionId)||!b.factionNameSnapshot||
     (Array.isArray(b.items)?b.items:[]).some(i=>i.factionId!==b.factionId)||
     !s.log.some(e=>e.commandId===b.commandId&&e.type==='finance.faction.close')))
    problems.push(String(b.id)+': lote de facção mistura prestadores ou perdeu prova de comando');
   let total=0;
   for(const item of Array.isArray(b.items)?b.items:[]){
    const bill=s.finance.find(x=>x.id===item.financeId);
    const src=item.sourceType==='acerto'?s.settlements.find(x=>x.id===item.sourceId):
     item.sourceType==='compensacao'?comps.find(x=>x.id===item.sourceId):null;
    if(usedTitles.has(item.financeId)||!bill||!src||bill.sourceId!==item.sourceId||
      bill.kind!=='pagar'||bill.status!=='pago'||src.status!=='pago'||bill.paidDate!==b.paidDate||
      item.factionId!==src.factionId||bill.amountCents!==item.amountCents||
      (item.sourceType==='acerto'&&src.amountCents!==item.amountCents)||
      (item.sourceType==='compensacao'&&src.deltaCents!==item.amountCents))
     problems.push(String(b.id)+': item ou vínculo de pagamento duplicado/inconsistente '+String(item.financeId));
    usedTitles.add(item.financeId);
    total+=item.amountCents;
   }
   if(!Number.isSafeInteger(total)||b.totalCents!==total||total<=0)
    problems.push(String(b.id)+': valor do lote divergente');
  }
  if(batch?.inspectReceipts)problems.push(...batch.inspectReceipts(s));
  const keys=comps.map(x=>x.settlementId+'|'+x.reference.trim().toLocaleUpperCase('pt-BR'));
  if(new Set(keys).size!==keys.length)problems.push('Referência de compensação duplicada para o mesmo acerto');
  if(routing&&typeof routing.inspect==='function')
   problems.push(...routing.inspect(s));
  if(routing&&typeof routing.inspectRateHistory==='function')
   problems.push(...routing.inspectRateHistory(s));
  if(routing&&typeof routing.inspectAssignmentRates==='function')
   problems.push(...routing.inspectAssignmentRates(s));
  if(factionGrade&&typeof factionGrade.inspect==='function')
   problems.push(...factionGrade.inspect(s));
  if(planner&&typeof planner.inspect==='function')
   problems.push(...planner.inspect(s));
  if(bomCut&&typeof bomCut.inspect==='function')
   problems.push(...bomCut.inspect(s));
  if(requests&&typeof requests.inspect==='function')
   problems.push(...requests.inspect(s));
  if(purchaseReturns&&typeof purchaseReturns.inspect==='function')
   problems.push(...purchaseReturns.inspect(s));
  for(const move of (s.factionTransfers||[])){
   if(!s.orders.some(x=>x.id===move.orderId)||!s.factions.some(x=>x.id===move.fromFactionId)||
      !s.factions.some(x=>x.id===move.toFactionId)||move.fromFactionId===move.toFactionId)
    problems.push(move.id+': troca de facção inválida');
  }
  if(s.materials.some(m=>m.stockGrams<0))problems.push('Estoque de material negativo');
  if(s.finance.some(e=>e.amountCents<=0))problems.push('Lançamento financeiro não positivo');
  if(new Set(s.log.map(e=>e.commandId)).size!==s.log.length)problems.push('Identificador de comando duplicado');
  const allIds=[...s.orders,...(s.bomCutRuns||[]),...(s.purchaseRequests||[]),...(s.purchaseReturns||[]),...(s.cutPlans||[]),...(s.multiCutPlans||[]),...(s.multiFlowLots||[]),...(s.multiFlowSeparations||[]),...(s.multiFlowShipments||[]),...(s.multiFlowLots||[]).flatMap(l=>l.returns||[]),...(s.routePlans||[]),...(s.labelTemplatesLab||[]),...(s.packerAssignmentsLab||[]),...(s.factionTransfers||[]),...(s.colorCatalog||[]),...(s.materialRecipeRules||[]),...(s.materialPlanLines||[]),...(s.factionAssignments||[]),...(s.factionPartialTransfers||[]),...(s.settlementCompensations||[]),...batches,...s.purchaseOrders,...s.settlements,...s.finance,...s.clients,...s.suppliers,
   ...s.materials,...s.products,...s.factions,...s.employees,...s.prints].map(x=>x.id);
  if(new Set(allIds).size!==allIds.length)problems.push('IDs de registro duplicados');
  return {ok:!problems.length,problems,orderCount:s.orders.length,unpaid:s.finance.filter(f=>f.status==='aberto').length,
   pendingCut:s.orders.filter(o=>sum(o.cut)<sum(o.grade)).length,
   pendingReturn:s.orders.filter(o=>o.allocated>o.returned).length,
   pendingShipment:s.orders.filter(o=>o.separated>o.shipped).length,
   stockWarnings:s.materials.filter(m=>m.stockGrams<5000).map(m=>m.name)};
 }
 function totals(s){
  const pay=s.finance.filter(x=>x.kind==='pagar'),recv=s.finance.filter(x=>x.kind==='receber');
  const comps=Array.isArray(s.settlementCompensations)?s.settlementCompensations:[];
  const batches=Array.isArray(s.paymentBatches)?s.paymentBatches:[];
  return {paymentBatches:batches.length,batchedPayablesCents:batches.reduce((n,x)=>n+x.totalCents,0),
   compensations:comps.length,
   compensatedNet:comps.reduce((a,c)=>a+c.deltaCents,0),
   compensationsOpen:comps.filter(c=>c.status==='aberto').length,
   orders:s.orders.length,pieces:s.orders.reduce((a,o)=>a+sum(o.grade),0),
   cut:s.orders.reduce((a,o)=>a+sum(o.cut),0),
   returned:s.orders.reduce((a,o)=>a+o.returned,0),
   shipped:s.orders.reduce((a,o)=>a+o.shipped,0),
   openPayables:pay.filter(x=>x.status==='aberto').reduce((a,x)=>a+x.amountCents,0),
   openReceivables:recv.filter(x=>x.status==='aberto').reduce((a,x)=>a+x.amountCents,0),
   passage:s.employees.reduce((a,e)=>a+e.passageCents,0),
   salaryCash:s.employees.reduce((a,e)=>a+e.salaryCents+e.extrasCents-e.discountCents+e.passageCents,0)};
 }
 function journey(s,selectedOrderId=null){
  // Conciliação SOMENTE LEITURA da jornada de um pedido fictício.
  // Não transfere valores, não altera revisão nem marca homologação empresarial.
  const order=s.orders.find(x=>x.id===selectedOrderId)||
   (!selectedOrderId?s.orders[s.orders.length-1]:null);
  const product=order&&s.products.find(x=>x.id===order.productId);
  const materialId=product?.materialId||null;
  const purchases=s.purchaseOrders.filter(x=>x.received&&(!materialId||x.materialId===materialId));
  const validPurchase=purchases.find(x=>{
   const moves=s.stockLedger.filter(m=>m.sourceId===x.id&&m.type==='compra');
   const titles=s.finance.filter(t=>t.sourceId===x.id&&t.kind==='pagar');
   return moves.length===1&&moves[0].deltaGrams===x.qtyGrams&&
    titles.length===1&&titles[0].amountCents===totalCost(x.qtyGrams,x.priceCentsKg);
  });
  const ordered=order?sum(order.grade):0;
  const orderTitle=order&&s.finance.filter(x=>x.sourceId===order.id&&x.kind==='receber');
  const hasOrder=!!order&&orderTitle.length===1&&
   orderTitle[0].amountCents===ordered*order.priceCents;
  const cutMoves=order?s.stockLedger.filter(x=>x.sourceId===order.id&&
   (x.type==='corte'||x.type==='corte-planejado')):[];
  const hasCut=!!order&&sum(order.cut)>0&&cutMoves.length>0&&
   cutMoves.every(m=>m.deltaGrams<0);
  const hasAllocation=!!order&&hasCut&&order.allocated>0&&
   order.allocated<=sum(order.cut)&&s.factions.some(f=>f.id===order.factionId);
  const settlements=order?s.settlements.filter(x=>x.orderId===order.id):[];
  const validSettlements=settlements.length>0&&settlements.every(x=>{
   const bills=s.finance.filter(f=>f.sourceId===x.id&&f.kind==='pagar');
   return bills.length===1&&bills[0].amountCents===x.amountCents&&
    bills[0].status===x.status;
  });
  const hasReturn=!!order&&hasAllocation&&order.returned>0&&
   settlements.reduce((a,x)=>a+x.qty,0)===order.returned&&validSettlements;
  const hasSeparation=!!order&&hasReturn&&order.separated>0&&
   order.separated<=order.returned;
  const hasShipment=!!order&&hasSeparation&&order.shipped>0&&
   order.shipped<=order.separated;
  const paid=settlements.filter(x=>x.status==='pago'&&s.finance.some(f=>
   f.sourceId===x.id&&f.kind==='pagar'&&f.status==='pago'&&
   f.amountCents===x.amountCents));
  const hasPayment=hasReturn&&paid.length>0;
  const compensations=(s.settlementCompensations||[]).filter(c=>
   settlements.some(x=>x.id===c.settlementId));
  const hasCompensation=hasPayment&&compensations.some(c=>{
   const bill=s.finance.filter(f=>f.sourceId===c.id);
   return bill.length===1&&bill[0].kind===(c.deltaCents>0?'pagar':'receber')&&
    bill[0].amountCents===Math.abs(c.deltaCents)&&bill[0].status===c.status;
  });
  const step=(id,title,module,completed,detail)=>({id,title,module,completed:!!completed,detail});
  const steps=[
   step('compras','Compra recebida com entrada no estoque','compras',!!validPurchase,
    'Compra do material do pedido, movimento de estoque e conta do fornecedor conciliados'),
   step('pedidos','Pedido e conta a receber','pedidos',hasOrder,
    'Grade de tamanhos e título a receber vinculados pelo mesmo ID'),
   step('corte','Corte com consumo de material','corte',hasCut,
    'Quantidade cortada e movimentação negativa de estoque registrada'),
   step('faccoes','Envio para facção','faccoes',hasAllocation,
    'Peças enviadas não ultrapassam o corte e a facção é identificada'),
   step('acertos','Retorno, acerto e conta a pagar','acertos',hasReturn,
    'Quantidade retornada conciliada com os acertos e títulos financeiros'),
   step('separacao','Separação das peças retornadas','separacao',hasSeparation,
    'Separação registrada sem superar o retorno'),
   step('expedicao','Expedição do pedido','separacao',hasShipment,
    'Expedição registrada sem superar o que foi separado'),
   step('hub','Pagamento fictício do acerto no Hub','hub',hasPayment,
    'Acerto e título original permanecem vinculados e quitados')
  ];
  const optional=step('compensacao','Compensação pós-pagamento (opcional)','acertos',
   hasCompensation,'Se necessária, a correção gera título separado sem reescrever o original');
  return {orderId:order?.id||null,materialId,completed:steps.filter(x=>x.completed).length,
   total:steps.length,steps,optional,scope:'indexeddb-local-fictitious',
   productionApproval:false};
 }
 function tips(s){
  const res=[];
  const h=inspect(s);
  if(h.pendingCut)res.push(h.pendingCut+' pedido(s) aguardam corte parcial ou total');
  if(h.pendingReturn)res.push(h.pendingReturn+' pedido(s) têm retorno de facção pendente');
  if(h.pendingShipment)res.push(h.pendingShipment+' pedido(s) aguardam despacho');
  if(h.unpaid)res.push(h.unpaid+' lançamento(s) financeiros em aberto');
  if(h.stockWarnings.length)res.push('Material baixo: '+h.stockWarnings.join(', '));
  if(!res.length)res.push('Nenhuma pendência nas regras deste laboratório fictício');
  return res;
 }
 function createOrder(s,p){
   const client=get(s,'clients',p.clientId,'Cliente'),product=get(s,'products',p.productId,'Produto');
   const g=p.grade;if(!gradeValid(g)||sum(g)<1||sum(g)>30000)throw Error('Grade inválida, informe quantidade P/M/G/GG.');
   const o={id:next(s,'PED'),clientId:client.id,productId:product.id,grade:clone(g),cut:makeGrade(),
    allocated:0,returned:0,separated:0,shipped:0,factionId:null,priceCents:product.priceCents,issued:false};
   s.orders.push(o);
   const f={id:next(s,'FIN'),kind:'receber',sourceId:o.id,description:'Pedido fictício '+o.id,
    amountCents:sum(g)*o.priceCents,status:'aberto'};
   s.finance.push(f);return o.id;}

 function apply(previous,command){
  if(!previous||previous.schema!=='hlgb-evolucao-operacao-ficticia-v1')throw Error('Documento de laboratório inválido.');
  if(!command||typeof command!=='object'||!command.type)throw Error('Ação inválida.');
  if(previous.log.length>3000)throw Error('Histórico do exercício atingiu o limite seguro; exporte antes de prosseguir.');
  if(command.expectedRevision!==previous.revision)throw Error('CONFLITO: outra aba alterou o laboratório. Recarregue e confira antes de repetir.');
  const uid=name(command.commandId,'ID do comando');
  if(previous.log.some(x=>x.commandId===uid))throw Error('Comando já registrado. Não duplicar.');
  const s=clone(previous),p=command.payload||{},kind=command.type;
  if(!Array.isArray(s.cutPlans))s.cutPlans=[]; // migração segura apenas do documento fictício anterior
  if(!multiOrders)throw Error('Cadastro multimodelo indisponível: operação não gravada.');
  multiOrders.ensure(s);
  if(!multiCuts)throw Error('Módulo de corte multimodelo indisponível: nenhuma operação registrada.');
  multiCuts.ensure(s);
  if(!Array.isArray(s.bomCutRuns))s.bomCutRuns=[];
  if(!requests)throw Error('Módulo de requisições indisponível; nenhuma operação aplicada.');
  requests.ensure(s);
  if(!purchaseReturns)throw Error('Módulo de devoluções de compras indisponível; nenhuma operação aplicada.');
  purchaseReturns.ensure(s);
  if(!Array.isArray(s.factionTransfers))s.factionTransfers=[];
  if(!Array.isArray(s.factionPartialTransfers))s.factionPartialTransfers=[];
  if(!Array.isArray(s.settlementCompensations))s.settlementCompensations=[];
  if(!Array.isArray(s.paymentBatches))s.paymentBatches=[];
  if(!Array.isArray(s.paymentReceipts))s.paymentReceipts=[];
  if(!planner)throw Error('Módulo de planejamento indisponível. Nenhuma gravação executada.');
  planner.ensure?.(s);
  const num=(field,min=0,max=1000000)=>int(p[field],field,min,max);
  const financeDate=v=>{if(typeof v!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(v)||!Number.isFinite(Date.parse(v+'T00:00:00Z'))||new Date(v+'T00:00:00Z').toISOString().slice(0,10)!==v)throw Error('Data financeira inválida.');return v;};
  let result;
  switch(kind){
  case 'client.add':{const obj={id:next(s,'CLI'),name:name(p.name,'Nome do cliente')};s.clients.push(obj);result=obj.id;break}
  case 'supplier.add':{const obj={id:next(s,'FOR'),name:name(p.name,'Nome do fornecedor')};s.suppliers.push(obj);result=obj.id;break}
  case 'faction.material.scope':{if(!complements)throw Error('Complementos indisponíveis.');result=complements.scope(s,p,{next,uid});break}
  case 'faction.material.checklist':{if(!complements)throw Error('Complementos indisponíveis.');result=complements.checklist(s,p,{next,uid});break}
  case 'faction.material.confirm':{if(!complements)throw Error('Complementos indisponíveis.');result=complements.confirmMaterial(s,p,{next,uid});break}
  case 'supplier.quote.add':{if(!complements)throw Error('Complementos indisponíveis.');result=complements.quote(s,p,{next,uid});break}
  case 'print.photo.attach':{if(!complements)throw Error('Complementos indisponíveis.');result=complements.photo(s,p,{next,uid});break}
  case 'service.profile.set':{if(!services)throw Error('Serviços indisponíveis.');result=services.profile(s,p,uid);break}
  case 'service.rates.set':{if(!services)throw Error('Serviços indisponíveis.');result=services.setRates(s,p,uid);break}
  case 'service.points.set':{if(!services)throw Error('Serviços indisponíveis.');result=services.points(s,p,uid);break}
  case 'settlement.service.group':{if(!services)throw Error('Serviços indisponíveis.');result=services.createGroup(s,p,{next,uid});break}
  case 'settlement.service.add':{if(!services)throw Error('Serviços indisponíveis.');result=services.create(s,p,{next,uid});break}
  case 'faction.add':{
   const obj={id:next(s,'FAC'),name:name(p.name,'Facção'),unitCents:num('unitCents',1,100000),traveta:p.traveta===true};
   s.factions.push(obj);result=obj.id;break}
  case 'faction.rate.set':{
   const fac=get(s,'factions',p.factionId,'Facção'),product=get(s,'products',p.productId,'Produto');
   const price=num('unitCents',1,100000),reason=name(p.reason,'Justificativa');
   if(!fac.productRates)fac.productRates={};
   const old=fac.productRates[product.id]??fac.unitCents;
   fac.productRates[product.id]=price;
   result=fac.name+' · '+product.name+' · '+old+' → '+price+' centavos · '+reason+
    ' (somente próximos retornos)';break}
  case 'faction.traveta.set':{
   const fac=get(s,'factions',p.factionId,'Facção'),reason=name(p.reason,'Justificativa');
   if(typeof p.traveta!=='boolean')throw Error('Selecione se a facção faz travetada.');
   const previous=fac.traveta;fac.traveta=p.traveta;
   result=fac.name+' · travetada '+String(previous)+' → '+String(fac.traveta)+
    ' · '+reason+' (sem mudar acertos anteriores)';break}
  case 'faction.assignment.rate.set':{
   if(!routing?.setAssignmentRate)throw Error('Módulo de tarifa por envio indisponível.');
   result=routing.setAssignmentRate(s,p,{int,next,uid});break}
  case 'faction.reassign':{
   if(!routing)throw Error('Módulo de distribuição de facções indisponível.');
   routing.ensure(s,next);
   const order=get(s,'orders',p.orderId,'Pedido'),newFac=get(s,'factions',p.factionId,'Nova facção');
   if(newFac.serviceRole&&newFac.serviceRole!=='costura')throw Error('Selecione uma facção de costura.');
   if(factionGrade?.hasGrade(order))
    throw Error('Pedido classificado por cor/tamanho: use apenas a distribuição detalhada.');
   const reason=name(p.reason,'Motivo da troca');
   if(!order.factionId||order.allocated<=0)throw Error('Somente pedido já enviado pode trocar de facção.');
   if(order.factionId===newFac.id)throw Error('Escolha uma facção diferente da atual.');
   if(order.returned>0||s.settlements.some(a=>a.orderId===order.id))
    throw Error('Troca bloqueada após retorno/acerto. A operação anterior não pode ser sobrescrita.');
   const oldId=order.factionId;
   routing.reassignLegacy(s,order,newFac.id,{uid,reason});
   order.factionId=newFac.id;
   s.factionTransfers.push({id:next(s,'TRO'),orderId:order.id,fromFactionId:oldId,
    toFactionId:newFac.id,qty:order.allocated,reason,commandId:uid});
   result=order.id+' · '+oldId+' → '+newFac.id+' · '+order.allocated+' peças · '+reason;break}
  case 'color.catalog.add':{
   result=planner.registerColor(s,p,{next,uid});break}
  case 'material.recipe.set':{
   result=planner.setRecipe(s,p,{next,uid});break}
  case 'materials.plan.add':{
   result=planner.lineAdd(s,p,{next,uid});break}
  case 'materials.plan.grade.add':{
   result=planner.gradeAdd(s,p,{next,uid});break}
  case 'materials.plan.archive':{
   result=planner.lineCancel(s,p,{next,uid});break}
  case 'material.add':{
   const obj={id:next(s,'MAT'),name:name(p.name,'Material'),stockGrams:0,priceCentsKg:num('priceCentsKg',1,1000000)};
   s.materials.push(obj);result=obj.id;break}
  case 'product.add':{
   const mat=get(s,'materials',p.materialId,'Material');
   const sku=name(p.sku,'SKU').toUpperCase();
   if(s.products.some(x=>x.sku===sku))throw Error('SKU já cadastrado.');
   const obj={id:next(s,'PRO'),sku,name:name(p.name,'Modelo'),materialId:mat.id,
    gramsPerUnit:num('gramsPerUnit',1,5000),priceCents:num('priceCents',100,1000000)};
   s.products.push(obj);result=obj.id;break}
  case 'pcp.plan':{
   if(!pcp)throw Error('PCP indisponível.');
   const o=get(s,'orders',p.orderId,'Pedido');
   if(o.shipped>=sum(o.grade))throw Error('Pedido expedido não pode ser replanejado.');
   if(!pcp.valid(p.dueDate)||!['urgente','alta','normal','baixa'].includes(p.priority))throw Error('Prazo ou prioridade inválidos.');
   const reason=name(p.reason,'Justificativa'),before=o.pcp?clone(o.pcp):null;
   o.pcp={dueDate:p.dueDate,priority:p.priority,reason,commandId:uid};
   result=o.id+' · '+(before?before.dueDate+' / '+before.priority:'sem planejamento')+' → '+p.dueDate+' / '+p.priority+' · '+reason;break}
  case 'pcp.capacity':{
   if(!pcp)throw Error('PCP indisponível.');
   const cap=Object.fromEntries(pcp.stages.map(k=>[k,num(k,1,100000)]));
   if(!pcp.capacityOK(cap))throw Error('Capacidade inválida.');
   const old=s.pcpCapacity||pcp.defaults,reason=name(p.reason,'Justificativa');
   s.pcpCapacity=cap;result=pcp.stages.map(k=>k+': '+old[k]+' → '+cap[k]).join(' · ')+' · '+reason;break}
  case 'order.add':{result=createOrder(s,p);break}
  case 'order.multi.create':{result=multiOrders.create(s,p,next);break}
  case 'multi.cut.plan':{result=multiCuts.create(s,p,{next,uid});break}
  case 'multi.cut.revise':{result=multiCuts.revise(s,p,{uid});break}
  case 'multi.cut.complete':{result=multiCuts.complete(s,p,{uid});break}
  case 'multi.cut.weight.record':{result=multiCuts.recordWeight(s,p,{uid});break}
  case 'multi.cut.cancel':{result=multiCuts.cancel(s,p,{uid});break}
  case 'multi.flow.allocate':{result=multiFlow.allocate(s,p,{next,uid});break}
  case 'multi.flow.transfer':{result=multiFlow.transfer(s,p,{uid});break}
  case 'multi.flow.rate':{result=multiFlow.rate(s,p,{uid});break}
  case 'multi.flow.return':{result=multiFlow.returnPieces(s,p,{next,uid});break}
  case 'multi.flow.review':{result=multiFlow.reviewReturn(s,p,{uid});break}
  case 'multi.flow.separate':{result=multiFlow.separate(s,p,{next,uid});break}
  case 'multi.flow.ship':{result=multiFlow.ship(s,p,{next,uid});break}
  case 'route.plan':{result=routes.create(s,p,{next,uid});break}
  case 'route.revise':{result=routes.revise(s,p,{uid});break}
  case 'route.cancel':{result=routes.cancel(s,p,{uid});break}
  case 'order.add.with.colors':{
   if(!factionGrade)throw Error('Módulo de matriz por cor indisponível. Nenhum pedido criado.');
   const rows=p.colorGrades;
   if(!Array.isArray(rows)||rows.length<1||rows.length>30)
    throw Error('Cadastre de 1 a 30 cores na grade horizontal.');
   const used=new Set(),totals=makeGrade();
   for(const row of rows){
    if(!row||typeof row.color!=='string')throw Error('Nome de cor obrigatório.');
    const color=row.color.trim().replace(/\s+/g,' '),key=color.toLocaleLowerCase('pt-BR');
    if(!color||color.length>40||used.has(key))throw Error('Cor vazia, duplicada ou com mais de 40 caracteres.');
    used.add(key);
    if(!gradeValid(row.grade)||sum(row.grade)<1)throw Error('Cada cor deve conter pelo menos uma peça e P/M/G/GG válidos.');
    for(const sz of sizes){
     if(row.grade[sz]>10000)throw Error('Quantidade da cor excede 10000 peças em '+sz);
     totals[sz]+=row.grade[sz];
    }
   }
   if(sum(totals)>30000)throw Error('Pedido excede limite de 30000 peças.');
   // Uma transação: se uma cor for inválida, createOrder e o título ficam no clone descartado.
   const orderId=createOrder(s,{clientId:p.clientId,productId:p.productId,grade:totals});
   for(const row of rows)factionGrade.setColor(s,{orderId,color:row.color,grade:row.grade},{int,uid});
   if(!factionGrade.makeSummary(s.orders.find(o=>o.id===orderId)).complete)
    throw Error('Totais da matriz não conferem. Nenhum pedido salvo.');
   result=orderId;break;
  }
  case 'order.import.batch':{if(!payrollOrders)throw Error('Importação indisponível.');result=payrollOrders.importOrders(s,p,{next,uid,createOrder});break}
  case 'order.color.grade.set':{
   if(!factionGrade)throw Error('Módulo de cores indisponível.');
   result=factionGrade.setColor(s,p,{int,uid});break}
  case 'order.grade.update':{
   const o=get(s,'orders',p.orderId,'Pedido'),g=p.grade;
   if(factionGrade?.hasGrade(o))
    throw Error('Pedido já tem cores cadastradas. Remova as cores primeiro para alterar a grade geral.');
   if(!gradeValid(g)||sum(g)<1||sum(g)>30000)throw Error('Grade inválida.');
   const title=s.finance.find(f=>f.sourceId===o.id&&f.kind==='receber');
   if(!title||title.status!=='aberto')throw Error('Pedido com título pago ou não encontrado não pode mudar de grade.');
   for(const sz of sizes){
    const reserved=s.cutPlans.filter(x=>x.orderId===o.id&&x.status==='aberto')
      .reduce((n,x)=>n+x.grade[sz],0);
    if(g[sz]<o.cut[sz]+reserved)
     throw Error('Não pode reduzir '+sz+' abaixo do corte já feito e das folhas abertas.');
   }
   o.grade=clone(g);
   title.amountCents=sum(g)*o.priceCents;
   result=o.id+' · grade alterada com título a receber reconciliado';break}
  case 'cut.bom.execute':{
   if(!bomCut||!planner)throw Error('Módulo de Corte BOM indisponível; nenhuma baixa realizada.');
   result=bomCut.execute(s,p,{next,uid},planner);break}
  case 'cut.plan.split':{if(!operationsV2)throw Error('Divisão indisponível.');result=operationsV2.split(s,p,{next,uid});break}
  case 'packaging.assign':{if(!operationsV2)throw Error('Embalagem indisponível.');result=operationsV2.packagingAssign(s,p,{next,uid},services);break}
  case 'packaging.complete':{if(!operationsV2)throw Error('Embalagem indisponível.');result=operationsV2.packagingFinish(s,p,{next,uid},services);break}
  case 'packaging.cancel':{if(!operationsV2)throw Error('Embalagem indisponível.');result=operationsV2.packagingCancel(s,p,{next,uid});break}
  case 'label.template.add':{result=packers.addTemplate(s,p,{next,uid});break}
  case 'label.template.edit':{result=packers.editTemplate(s,p,{uid});break}
  case 'label.template.archive':{result=packers.archiveTemplate(s,p,{uid});break}
  case 'packer.assign':{result=packers.assign(s,p,{next,uid});break}
  case 'packer.revise':{result=packers.reviseAssignment(s,p,{uid});break}
  case 'packer.progress':{result=packers.progress(s,p,{uid});break}
  case 'packer.cancel':{result=packers.cancelAssignment(s,p,{uid});break}
  case 'assistant.order.create':{if(!operationsV2)throw Error('Pedido assistido indisponível.');result=operationsV2.assistantCreate(s,p,{next,uid,createOrder},payrollOrders);break}
  case 'purchase.invoice.import':{if(!operationsV2)throw Error('Notas indisponíveis.');result=operationsV2.invoiceCreate(s,p,{next,uid});break}
  case 'purchase.invoice.pdf':{if(!operationsV2)throw Error('PDF indisponível.');result=operationsV2.invoiceAttach(s,p,{next,uid},batch);break}
  case 'cut.plan':{
   const o=get(s,'orders',p.orderId,'Pedido'),g=p.grade;
   if(s.bomCutRuns.some(x=>x.orderId===o.id))
    throw Error('Pedido iniciado com Corte BOM: não misture folhas tradicionais.');
   if(!gradeValid(g)||sum(g)<1||sum(g)>10000)throw Error('Grade planejada inválida.');
   for(const sz of sizes){
    const reserved=s.cutPlans.filter(x=>x.orderId===o.id&&x.status==='aberto')
     .reduce((n,x)=>n+x.grade[sz],0);
    if(o.cut[sz]+reserved+g[sz]>o.grade[sz])
     throw Error('Quantidade planejada excede a grade disponível em '+sz+'.');
   }
   const product=get(s,'products',o.productId),mat=get(s,'materials',product.materialId);
   if(!['interno','externo'].includes(p.workMode))throw Error('Escolha corte interno ou externo.');
   const cutterOne=name(p.cutterOne,'Cortador 1'),cutterTwo=name(p.cutterTwo,'Cortador 2'),
     spreader=name(p.spreader,'Enfestador');
   if(cutterOne.toLocaleLowerCase('pt-BR')===cutterTwo.toLocaleLowerCase('pt-BR'))
    throw Error('Cortadores 1 e 2 precisam ser pessoas diferentes.');
   const obj={id:next(s,'COR'),orderId:o.id,grade:clone(g),workMode:p.workMode,
    cutterOne,cutterTwo,spreader,materialId:mat.id,theoreticalGrams:sum(g)*product.gramsPerUnit,
    status:'aberto',usefulGrams:null,scrapGrams:null,signatureOne:null,signatureTwo:null,
    createdCommandId:uid,completedCommandId:null};
   s.cutPlans.push(obj);result=obj.id;break}
  case 'cut.plan.update':{
   const plan=get(s,'cutPlans',p.id,'Folha de corte');
   if(plan.status!=='aberto')throw Error('Apenas folha aberta pode ser editada; histórico preservado.');
   if(!gradeValid(p.grade)||sum(p.grade)<1||sum(p.grade)>10000)throw Error('Grade da folha inválida.');
   const o=get(s,'orders',plan.orderId);
   for(const sz of sizes){
    const other=s.cutPlans.filter(x=>x.orderId===o.id&&x.id!==plan.id&&x.status==='aberto')
     .reduce((n,x)=>n+x.grade[sz],0);
    if(o.cut[sz]+other+p.grade[sz]>o.grade[sz])throw Error('Folha alterada excede saldo do tamanho '+sz+'.');
   }
   if(!['interno','externo'].includes(p.workMode))throw Error('Escolha corte interno ou externo.');
   const a=name(p.cutterOne,'Cortador 1'),b=name(p.cutterTwo,'Cortador 2');
   if(a.toLocaleLowerCase('pt-BR')===b.toLocaleLowerCase('pt-BR'))throw Error('Cortadores diferentes são obrigatórios.');
   Object.assign(plan,{grade:clone(p.grade),workMode:p.workMode,cutterOne:a,cutterTwo:b,
    spreader:name(p.spreader,'Enfestador'),
    theoreticalGrams:sum(p.grade)*get(s,'products',o.productId).gramsPerUnit});
   result=plan.id+' · planejamento alterado sem perder histórico';break}
  case 'cut.plan.cancel':{
   const plan=get(s,'cutPlans',p.id,'Folha de corte');
   if(plan.status!=='aberto')throw Error('Somente folha aberta pode ser cancelada.');
   plan.status='cancelado';plan.cancelledCommandId=uid;
   result=plan.id+' · cancelada sem baixar estoque';break}
  case 'cut.plan.complete':{
   const plan=get(s,'cutPlans',p.id,'Folha de corte');
   if(s.bomCutRuns.some(x=>x.orderId===plan.orderId))
    throw Error('Pedido iniciado com Corte BOM: não misture baixas tradicionais.');
   if(plan.status!=='aberto')throw Error('A folha já foi concluída ou cancelada. Não repetir baixa.');
   const o=get(s,'orders',plan.orderId,'Pedido'),product=get(s,'products',o.productId);
   const material=get(s,'materials',plan.materialId,'Material');
   if(product.materialId!==material.id)throw Error('Material da folha não corresponde à ficha atual.');
   const useful=num('usefulGrams',1,1000000),scrap=num('scrapGrams',0,1000000);
   if(useful<plan.theoreticalGrams)throw Error('Peso útil não pode ser inferior ao consumo teórico do lote.');
   if(useful+scrap>material.stockGrams)throw Error('Peso total (útil + desperdício) excede o estoque disponível.');
   const signOne=name(p.signatureOne,'Conferência do cortador 1'),
     signTwo=name(p.signatureTwo,'Conferência do cortador 2');
   if(signOne.toLocaleLowerCase('pt-BR')!==plan.cutterOne.toLocaleLowerCase('pt-BR')||
      signTwo.toLocaleLowerCase('pt-BR')!==plan.cutterTwo.toLocaleLowerCase('pt-BR'))
    throw Error('As duas conferências digitadas precisam corresponder aos cortadores do planejamento.');
   for(const sz of sizes)if(o.cut[sz]+plan.grade[sz]>o.grade[sz])
    throw Error('Grade mudou; corte não pode exceder o pedido '+sz+'.');
   for(const sz of sizes)o.cut[sz]+=plan.grade[sz];
   material.stockGrams-=useful+scrap;
   s.stockLedger.push({id:next(s,'MOV'),materialId:material.id,deltaGrams:-(useful+scrap),
    usefulGrams:useful,scrapGrams:scrap,cutPlanId:plan.id,sourceId:o.id,
    type:'corte-planejado',commandId:uid});
   Object.assign(plan,{status:'concluido',usefulGrams:useful,scrapGrams:scrap,
    signatureOne:signOne,signatureTwo:signTwo,completedCommandId:uid});
   result=plan.id+' · '+sum(plan.grade)+' peças · usado '+useful+'g · lixo '+scrap+'g';break}
  case 'cut.record':{
   const o=get(s,'orders',p.orderId,'Pedido'),sz=p.size,q=num('qty',1,10000);
   if(s.bomCutRuns.some(x=>x.orderId===o.id))
    throw Error('Pedido iniciado com Corte BOM: não repita corte pela rotina simplificada.');
   if(!sizes.includes(sz))throw Error('Tamanho inválido.');
   const reserved=s.cutPlans.filter(x=>x.orderId===o.id&&x.status==='aberto')
    .reduce((n,x)=>n+x.grade[sz],0);
   if(o.cut[sz]+reserved+q>o.grade[sz])
    throw Error('Corte excede a grade disponível (incluindo folhas planejadas).');
   const product=get(s,'products',o.productId),material=get(s,'materials',product.materialId);
   const cost=q*product.gramsPerUnit;
   if(cost>material.stockGrams)throw Error('Estoque insuficiente de '+material.name+'. Use Compras ou ajuste de estoque.');
   o.cut[sz]+=q;material.stockGrams-=cost;
   s.stockLedger.push({id:next(s,'MOV'),materialId:material.id,deltaGrams:-cost,sourceId:o.id,type:'corte',commandId:uid});
   result=o.id+' / '+sz+' / '+q+' peças';break}
  case 'faction.allocate':{
   if(!routing)throw Error('Módulo de distribuição de facções indisponível.');
   routing.ensure(s,next);
   const o=get(s,'orders',p.orderId,'Pedido'),fac=get(s,'factions',p.factionId,'Facção'),qty=num('qty',1,10000);
   if(fac.serviceRole&&fac.serviceRole!=='costura')throw Error('Selecione uma facção de costura.');
   if(factionGrade?.hasGrade(o))
    throw Error('Pedido com grade de cores: use Envio por cor/tamanho.');
   const q=quantities(o);
   if(q.allocated+qty>q.cut)throw Error('Envio excede a quantidade cortada.');
   if(o.factionId&&o.factionId!==fac.id)throw Error('Esta simulação aceita uma facção por pedido; não sobrescrever destino.');
   o.factionId=fac.id;o.allocated+=qty;
   routing.recordLegacyAllocation(s,o,fac,qty,{next,uid});
   result=o.id+' → '+fac.name;break}
  case 'faction.return':{
   if(!routing)throw Error('Módulo de distribuição de facções indisponível.');
   routing.ensure(s,next);
   const o=get(s,'orders',p.orderId,'Pedido'),qty=num('qty',1,10000);
   if(factionGrade?.hasGrade(o))
    throw Error('Pedido com grade de cores: retorne por cor/tamanho.');
   routing.canLegacyReturn(s,o);
   if(!o.factionId||o.returned+qty>o.allocated)throw Error('Retorno excede o que foi enviado para a facção.');
   o.returned+=qty;
   const fac=get(s,'factions',o.factionId),product=get(s,'products',o.productId);
   const rate=routing.resolveRate(routing.canLegacyReturn(s,o),fac,product,s);
   const listUnit=rate.gross,travetaDiscount=rate.traveta,unit=rate.unit;
   if(unit<=0)throw Error('Preço líquido da facção deve ser positivo.');
   const assignmentId=routing.recordLegacyReturn(s,o,qty);
   const settlement={id:next(s,'ACE'),orderId:o.id,assignmentId,factionId:fac.id,productId:product.id,
    kind:'retorno',serviceType:'costura',qty,listUnitCents:listUnit,
    travetaCents:travetaDiscount,unitCents:unit,
    adjustmentCents:0,amountCents:qty*unit,description:'Retorno fictício',status:'aberto',
    ...(rate.agreementCommandId?{rateAgreementCommandId:rate.agreementCommandId}:{})};
   s.settlements.push(settlement);
   s.finance.push({id:next(s,'FIN'),kind:'pagar',sourceId:settlement.id,
    description:'Acerto fictício '+settlement.id,amountCents:settlement.amountCents,status:'aberto'});
   result=settlement.id;break}
  case 'faction.multi.allocate':{
   if(!routing)throw Error('Módulo de distribuição por facção indisponível.');
   if(factionGrade?.hasGrade(get(s,'orders',p.orderId,'Pedido')))
    throw Error('Pedido com grade de cores: envie por cor/tamanho.');
   result=routing.allocation(s,p,{next,int,uid});break}
  case 'faction.multi.transfer':{
   if(!routing||typeof routing.transfer!=='function')
    throw Error('Módulo de transferência entre facções indisponível. Nenhum saldo alterado.');
   const from=s.factionAssignments?.find(x=>x.id===p.fromAssignmentId);
   if(from&&factionGrade?.hasGrade(get(s,'orders',from.orderId,'Pedido')))
    throw Error('Envio classificado: transfira por cor/tamanho.');
   result=routing.transfer(s,p,{next,int,uid});break}
  case 'faction.multi.return':{
   if(!routing)throw Error('Módulo de retorno por facção indisponível.');
   const row=s.factionAssignments?.find(x=>x.id===p.assignmentId);
   if(row&&factionGrade?.hasGrade(get(s,'orders',row.orderId,'Pedido')))
    throw Error('Envio classificado: retorne por cor/tamanho.');
   result=routing.ret(s,p,{next,int,uid});break}
  case 'faction.grade.allocate':{
   if(!routing||!factionGrade)throw Error('Módulo de grade por facção indisponível.');
   result=factionGrade.allocate(s,p,{next,int,uid},routing);break}
  case 'faction.grade.return':{
   if(!routing||!factionGrade)throw Error('Módulo de retorno de grade indisponível.');
   result=factionGrade.ret(s,p,{next,int,uid},routing);break}
  case 'faction.grade.transfer':{
   if(!routing||!factionGrade)throw Error('Módulo de transferência de grade indisponível.');
   result=factionGrade.transfer(s,p,{next,int,uid},routing);break}
  case 'settlement.grade.pieces.return':{
   if(!routing||!factionGrade)throw Error('Módulo de devolução de grade indisponível.');
   result=factionGrade.reverse(s,p,{next,int,uid},routing);break}
  case 'settlement.add':{
   const fac=get(s,'factions',p.factionId,'Facção'),product=get(s,'products',p.productId,'Produto');
   if(!['costura','embalagem'].includes(p.serviceType))throw Error('Selecione costura ou embalagem.');
   if(fac.serviceRole)throw Error('Prestador classificado: use o novo acerto por serviço, com tarifa e pontos conferidos.');
   const qty=num('qty',1,100000),listUnit=num('unitCents',1,100000),
     traveta=num('travetaCents',0,100000),reason=name(p.reason,'Descrição do serviço');
   if(traveta>=listUnit)throw Error('Desconto por travetada não pode zerar ou superar o valor por peça.');
   const netUnit=listUnit-traveta;
   const obj={id:next(s,'ACE'),orderId:null,factionId:fac.id,productId:product.id,
    kind:'avulso',serviceType:p.serviceType,qty,listUnitCents:listUnit,
    travetaCents:traveta,unitCents:netUnit,adjustmentCents:0,
    amountCents:qty*netUnit,description:reason,status:'aberto'};
   s.settlements.push(obj);
   s.finance.push({id:next(s,'FIN'),kind:'pagar',sourceId:obj.id,
    description:'Serviço '+obj.serviceType+' · '+obj.id,amountCents:obj.amountCents,status:'aberto'});
   result=obj.id;break}
  case 'order.separate':{
   const o=get(s,'orders',p.orderId,'Pedido'),qty=num('qty',1,10000);
   if(o.separated+qty>o.returned)throw Error('Separação excede o retorno da facção.');
   if(operationsV2)operationsV2.guardSeparation(s,o,qty);
   o.separated+=qty;result=o.id;break}
  case 'order.ship':{
   const o=get(s,'orders',p.orderId,'Pedido'),qty=num('qty',1,10000);
   if(o.shipped+qty>o.separated)throw Error('Expedição excede a quantidade separada.');
   o.shipped+=qty;result=o.id;break}
  case 'settlement.pieces.return':{
   if(!routing)throw Error('Módulo de distribuição de facções indisponível.');
   routing.ensure(s,next);
   const x=get(s,'settlements',p.id,'Acerto');
   if(x.packagingLotId)throw Error('Acerto de embalagem vinculado: não modificar quantidade por este fluxo.');
   if(x.gradeTracked)throw Error('Acerto rastreado por cor/tamanho: use Devolução detalhada.');
   if(x.status!=='aberto')throw Error('Não é permitido devolver peças após pagamento.');
   const bill=get(s,'finance',s.finance.find(y=>y.sourceId===x.id&&y.kind==='pagar')?.id,'Título a pagar');
   if(bill.status!=='aberto')throw Error('Título já pago impede devolução direta.');
   const qty=num('qty',1,100000),reason=name(p.reason,'Motivo da devolução');
   if(qty>=x.qty)throw Error('Devolução integral não permitida neste fluxo; registre uma correção formal.');
   const newQty=x.qty-qty,newAmount=newQty*x.unitCents+x.adjustmentCents;
   if(newAmount<=0)throw Error('Devolução deixaria acerto sem valor positivo.');
   if(x.orderId){
    const order=get(s,'orders',x.orderId,'Pedido associado');
    if(order.returned-qty<order.separated)throw Error('Devolução excede o saldo não separado deste pedido.');
    order.returned-=qty;
    routing.reverseReturn(s,x,qty);
   }
   const before=x.amountCents,oldQty=x.qty;
   x.qty=newQty;x.amountCents=newAmount;
   if(!Array.isArray(x.returns))x.returns=[];
   x.returns.push({commandId:uid,qty,reason,beforeQty:oldQty,afterQty:newQty,
    beforeCents:before,afterCents:newAmount});
   bill.amountCents=newAmount;
   result=x.id+' · '+oldQty+' → '+newQty+' peças · '+reason;break}
  case 'settlement.compensate':{
   const original=get(s,'settlements',p.id,'Acerto original'),reason=name(p.reason,'Motivo da compensação'),
    reference=name(p.reference,'Referência única da correção').toLocaleUpperCase('pt-BR');
   if(original.status!=='pago')throw Error('Compensação separada só pode ser registrada após pagamento do acerto.');
   const originalBill=s.finance.find(y=>y.sourceId===original.id&&y.kind==='pagar');
   if(!originalBill||originalBill.status!=='pago'||originalBill.amountCents!==original.amountCents)
    throw Error('Pagamento original não está confirmado e conciliado.');
   const delta=int(p.deltaCents,'Valor da compensação',-10000000,10000000);
   if(delta===0)throw Error('Compensação precisa ser positiva ou negativa.');
   if(s.settlementCompensations.some(x=>x.settlementId===original.id&&
      x.reference.trim().toLocaleUpperCase('pt-BR')===reference))
    throw Error('Referência de compensação já utilizada neste acerto. Confira o histórico para evitar duplicidade.');
   const id=next(s,'CMP'),kind=delta>0?'pagar':'receber';
   const comp={id,settlementId:original.id,factionId:original.factionId,
    reference,reason,deltaCents:delta,kind,status:'aberto',
    originalAmountCents:original.amountCents,originalFinanceId:originalBill.id,
    commandId:uid};
   s.settlementCompensations.push(comp);
   const bill={id:next(s,'FIN'),kind,sourceId:comp.id,
    description:'Compensação fictícia '+comp.id+' do acerto '+original.id,
    amountCents:Math.abs(delta),status:'aberto'};
   s.finance.push(bill);
   result=comp.id+' · '+kind+' · '+delta+' centavos (original preservado)';break}
  case 'settlement.revise':{
   if(!routing||typeof routing.reviseSettlement!=='function')throw Error('Correção de acertos indisponível.');
   result=routing.reviseSettlement(s,p,{int,uid});break}
  case 'settlement.adjust':{
   const x=get(s,'settlements',p.id,'Acerto');
   if(x.packagingLotId)throw Error('Acerto de embalagem vinculado: preserve a origem.');
   if(x.status!=='aberto')throw Error('Acerto pago não pode ser alterado nesta prévia.');
   const bill=get(s,'finance',s.finance.find(f=>f.sourceId===x.id)?.id,'Conta vinculada');
   if(bill.status!=='aberto')throw Error('O título está quitado: ajuste direto bloqueado.');
   const delta=int(p.adjustmentCents,'Ajuste',-1000000,1000000);
   const amount=x.qty*x.unitCents+delta;
   if(amount<=0)throw Error('Acerto não pode ter valor zerado ou negativo.');
   if(delta===(x.adjustmentCents||0))throw Error('Nenhuma alteração informada: ajuste já está registrado.');
   const reason=name(p.reason,'Motivo do ajuste');
   const before=x.amountCents;
   x.adjustmentCents=delta;x.amountCents=amount;
   if(!Array.isArray(x.history))x.history=[];
   x.history.push({commandId:uid,beforeCents:before,afterCents:amount,
    reason});
   bill.amountCents=amount;
   result=x.id+' · '+before+' → '+amount+' centavos';break}
  case 'finance.receipt.attach':{
   if(!batch?.attachReceipt)throw Error('Módulo de comprovantes indisponível.');
   result=batch.attachReceipt(s,p,{next,uid});break}
  case 'finance.faction.close':{
   if(!batch||typeof batch.executeFaction!=='function')
    throw Error('Módulo de fechamento por facção indisponível.');
   result=batch.executeFaction(s,p,{next,uid});break}
  case 'finance.batch.pay':{
   if(!batch||typeof batch.execute!=='function')
    throw Error('Módulo obrigatório de pagamentos em lote indisponível; nenhuma baixa aplicada.');
   result=batch.execute(s,p,{next,uid});break}
  case 'finance.pay':{
   const entry=get(s,'finance',p.id,'Lançamento');
   if(entry.status!=='aberto')throw Error('Lançamento já conferido, evitar pagamento repetido.');
   entry.status='pago';entry.paidDate=financeDate(p.paidDate||'2026-11-16');
   if(payrollOrders)payrollOrders.payrollPaid(s,entry);
   const acerto=s.settlements.find(a=>a.id===entry.sourceId);
   if(acerto)acerto.status='pago';
   const compensation=s.settlementCompensations.find(c=>c.id===entry.sourceId);
   if(compensation)compensation.status='pago';
   const purchaseReturn=(s.purchaseReturns||[]).find(x=>x.id===entry.sourceId);
   if(purchaseReturn)purchaseReturn.status='credito_recebido';
   result=entry.id;break}
  case 'finance.add':{
   if(!['pagar','receber'].includes(p.kind))throw Error('Tipo de lançamento inválido.');
   const entry={id:next(s,'FIN'),kind:p.kind,description:name(p.description,'Descrição'),
    amountCents:num('amountCents',1,100000000),status:'aberto',sourceId:null};
   if(p.dueDate)entry.dueDate=financeDate(p.dueDate);
   if(p.category){if(!["Vendas","Facções","Compras","Folha","Aluguel","Impostos","Transporte","Outras despesas","Outras receitas","Compensações","Devoluções"].includes(p.category))throw Error('Categoria inválida.');entry.category=p.category;}
   s.finance.push(entry);result=entry.id;break}
  case 'finance.revise':{
   const entry=get(s,'finance',p.id,'Lançamento');
   if(entry.sourceId||entry.status!=='aberto'||entry.reconciliation)throw Error('Somente título manual aberto e não conciliado pode ser editado. Corrija a origem dos títulos vinculados.');
   if((s.costAllocations||[]).some(x=>x.financeId===entry.id))throw Error('Título com rateio já registrado: edição bloqueada para preservar custos.');
   const description=name(p.description,'Descrição'),amountCents=num('amountCents',1,100000000),reason=name(p.reason,'Motivo');
   if(!['Vendas','Facções','Compras','Folha','Aluguel','Impostos','Transporte','Outras despesas','Outras receitas','Compensações','Devoluções'].includes(p.category))throw Error('Categoria inválida.');
   const dueDate=p.dueDate?financeDate(p.dueDate):null;
   const before={description:entry.description,amountCents:entry.amountCents,category:entry.category||null,dueDate:entry.dueDate||null};
   const after={description,amountCents,category:p.category,dueDate};
   if(JSON.stringify(before)===JSON.stringify(after))throw Error('Nenhuma alteração informada.');
   if(!Array.isArray(entry.revisions))entry.revisions=[];
   entry.revisions.push({commandId:uid,before,after,reason});
   entry.description=description;entry.amountCents=amountCents;entry.category=p.category;
   if(dueDate)entry.dueDate=dueDate;else delete entry.dueDate;
   result=entry.id+' · revisão de título manual · '+before.amountCents+' → '+amountCents+' centavos · '+reason;break}
  case 'finance.schedule':{
   const entry=get(s,'finance',p.id,'Lançamento');
   if(entry.status!=='aberto')throw Error('Somente título aberto pode receber vencimento.');
   if((s.payrollPeriods||[]).some(x=>x.id===entry.sourceId))throw Error('Vencimento da folha por competência requer rotina própria.');
   const old=entry.dueDate||'sem data';entry.dueDate=financeDate(p.dueDate);
   result=entry.id+' · '+old+' → '+entry.dueDate+' · '+name(p.reason,'Motivo');break}
  case 'finance.reconcile':{
   const entry=get(s,'finance',p.id,'Lançamento');
   if(entry.status!=='pago'||entry.reconciliation)throw Error('Título não quitado ou já conferido.');
   const amount=num('amountCents',1,100000000);
   if(amount!==entry.amountCents)throw Error('Valor do extrato diverge do título; nenhuma conferência registrada.');
   const reference=name(p.reference,'Referência do extrato').trim().toUpperCase();
   if(s.finance.some(x=>x.reconciliation?.reference===reference))throw Error('Referência de conferência já utilizada.');
   entry.reconciliation={amountCents:amount,reference,date:financeDate(p.reconcileDate),commandId:uid};
   result=entry.id+' · conferência manual fictícia · '+reference;break}
  case 'purchase.request.create':{
   result=requests.create(s,p,{next,uid},planner);break}
  case 'purchase.request.approve':{
   result=requests.approve(s,p,{next,uid},planner);break}
  case 'purchase.request.issue':{
   result=requests.issue(s,p,{next,uid},planner);break}
  case 'purchase.request.cancel':{
   result=requests.cancel(s,p,{next,uid});break}
  case 'purchase.request.cancelIssued':{
   result=requests.cancelIssued(s,p,{next,uid});break}
  case 'purchase.return.full':{
   result=purchaseReturns.full(s,p,{next,uid});break}
  case 'purchase.add':{
   const material=get(s,'materials',p.materialId,'Material'),supplier=get(s,'suppliers',p.supplierId,'Fornecedor');
   const obj={id:next(s,'COM'),materialId:material.id,supplierId:supplier.id,
    qtyGrams:num('qtyGrams',1,1000000),priceCentsKg:material.priceCentsKg,
    checkerOne:name(p.checkerOne,'Conferente 1'),checkerTwo:name(p.checkerTwo,'Conferente 2'),received:false};
   if(obj.checkerOne.toLowerCase()===obj.checkerTwo.toLowerCase())throw Error('Conferência exige duas pessoas diferentes.');
   s.purchaseOrders.push(obj);result=obj.id;break}
  case 'purchase.receive':{
   const obj=get(s,'purchaseOrders',p.id,'Compra');
   if(obj.cancelled===true)
    throw Error('Compra formalmente cancelada: recebimento e baixa de estoque bloqueados.');
   if(obj.received)throw Error('Compra já recebida. Estoque não será duplicado.');
   obj.received=true;
   const material=get(s,'materials',obj.materialId);
   material.stockGrams+=obj.qtyGrams;
   s.stockLedger.push({id:next(s,'MOV'),materialId:obj.materialId,deltaGrams:obj.qtyGrams,
    sourceId:obj.id,type:'compra',commandId:uid});
   s.finance.push({id:next(s,'FIN'),kind:'pagar',sourceId:obj.id,
    description:'Compra fictícia '+obj.id,amountCents:totalCost(obj.qtyGrams,obj.priceCentsKg),status:'aberto'});
   requests.receive(s,obj,{uid});
   result=obj.id;break}
  case 'stock.adjust':{
   const material=get(s,'materials',p.materialId,'Material'),delta=int(p.deltaGrams,'Ajuste de estoque',-1000000,1000000);
   if(!delta)throw Error('Informe ajuste diferente de zero.');
   if(material.stockGrams+delta<0)throw Error('Não é possível deixar estoque negativo.');
   material.stockGrams+=delta;
   s.stockLedger.push({id:next(s,'MOV'),materialId:material.id,deltaGrams:delta,sourceId:'AJUSTE-DEMO',
    type:'ajuste',commandId:uid,note:name(p.note,'Justificativa')});
   result=material.id;break}
  case 'payroll.period.create':{if(!payrollOrders)throw Error('Folha indisponível.');result=payrollOrders.payrollCreate(s,p,{next,uid});break}
  case 'payroll.period.revise':{if(!payrollOrders)throw Error('Folha indisponível.');result=payrollOrders.payrollRevise(s,p,{uid});break}
  case 'payroll.update':{
   const e=get(s,'employees',p.id,'Funcionário fictício');
   for(const k of ['salaryCents','passageCents','extrasCents','discountCents'])e[k]=num(k,0,10000000);
   if(e.salaryCents<100||e.discountCents>e.salaryCents+e.extrasCents)throw Error('Valores da folha fictícia inconsistentes.');
   result=e.id;break}
  case 'print.add':{
   const obj={id:next(s,'IMP'),name:name(p.name,'Produto 3D'),
    grams:num('grams',1,1000),priceCents:num('priceCents',100,1000000),stock:num('stock',0,100000)};
   s.prints.push(obj);result=obj.id;break}
  case 'recovery.repair':{
   if(!recovery||!auditor)throw Error('Recuperação indisponível.');
   result=recovery.repair(s,{before:p.before,expected:p.expected,revision:num('revision',1,100000000),reason:name(p.reason,'Justificativa')},{uid,inspect,audit:auditor.analyze});break}
  case 'cost.allocate':{
   if(!costs)throw Error('Módulo de custos indisponível.');
   result=costs.allocate(s,{financeId:name(p.financeId,'Título'),orderId:name(p.orderId,'Pedido'),amountCents:num('amountCents',1,100000000),reason:name(p.reason,'Justificativa')},uid);break}
  case 'bot.observe':{
   if(!bot||!auditor)throw Error('Bot ou auditor indisponível.');
   result=bot.observe(s,auditor.analyze(s),uid);break}
  case 'bot.feedback':{
   if(!bot)throw Error('Bot indisponível.');
   result=bot.feedback(s,{observationId:name(p.observationId,'Observação'),key:name(p.key,'Ocorrência'),outcome:p.outcome,note:name(p.note,'Evidência')},uid);break}
  case 'audit.review':{
   if(!auditor)throw Error('Auditor 3.0 indisponível.');
   result=auditor.review(s,{key:name(p.key,'Identificador da ocorrência'),note:name(p.note,'Evidência da revisão'),status:p.status},{uid});break}
  case 'error.add':{
   const obj={id:next(s,'ERR'),message:name(p.message,'Descrição da falha'),status:'aberto',severity:'alta'};
   s.errors.push(obj);result=obj.id;break}
  case 'error.resolve':{
   const err=get(s,'errors',p.id,'Ocorrência');
   if(err.status==='resolvido')throw Error('Ocorrência já marcada como resolvida.');
   err.status='resolvido';result=err.id;break}
  default:throw Error('Operação ainda não implementada neste laboratório: '+kind);
  }
  if(costs)costs.capture(previous,s,uid);
  s.revision++;
  s.revisionProof=uid;
  s.log.push({commandId:uid,revision:s.revision,actor:name(command.actor||'Operador fictício','Operador'),
   type:kind,description:String(result),...(management?management.capture(previous,s,command.recordedAt):{})});
  const condition=inspect(s);
  if(!condition.ok)throw Error('Integridade não aprovada: '+condition.problems.join('; '));
  return {state:s,result,checks:condition};
 }
 return {initial,apply,inspect,totals,tips,journey,quantities,makeGrade,gradeValid,sizes,money};
});
