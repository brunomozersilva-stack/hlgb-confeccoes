/* HLGB Evolucao — planejamento de capacidade do Corte, SOMENTE leitura do laboratorio.
 * Uma equipe com dois cortadores e um enfestador deve ter capacidade informada em
 * pecas/dia. Nenhuma capacidade e presumida; nao altera filas, prazo, estoque ou WAL.
 */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 else if(root)root.HLGBLabCutCapacityV1=api;
})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 const norm=x=>String(x??'').trim().replace(/\s+/g,' ').toLocaleLowerCase('pt-BR');
 const validDate=x=>typeof x==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(x)&&
  !Number.isNaN(Date.parse(x+'T00:00:00Z'))&&
  new Date(x+'T00:00:00Z').toISOString().slice(0,10)===x;
 function evaluate(state,{dailyCapacityPieces}={}){
  if(!state||!Array.isArray(state.multiCutPlans)||!Number.isSafeInteger(state.revision))
   throw Error('Estado do Corte indisponivel.');
  const known=Number.isSafeInteger(dailyCapacityPieces)&&dailyCapacityPieces>0&&dailyCapacityPieces<=100000;
  if(dailyCapacityPieces!==undefined&&!known)throw Error('Capacidade diaria deve ser positiva, inteira e confirmada.');
  const entries=[],days=new Map(),resources=new Map(),problems=[];
  const seen=new Set();
  for(const plan of state.multiCutPlans){
   if(!plan||typeof plan.id!=='string'||seen.has(plan.id))throw Error('ID de folha de Corte ausente ou repetido.');
   seen.add(plan.id);
   if(!['aberto','concluido','cancelado'].includes(plan.status))throw Error('Estado de folha invalido: '+plan.id);
   if(plan.status==='cancelado')continue;
   if(!validDate(plan.scheduledDate))throw Error('Data de folha invalida: '+plan.id);
   if(!Array.isArray(plan.lines)||!plan.lines.length||
      plan.lines.some(x=>!Number.isSafeInteger(x.qty)||x.qty<=0)||
      !Number.isSafeInteger(plan.qty)||plan.qty!==plan.lines.reduce((n,x)=>n+x.qty,0))
    throw Error('Quantidade do Corte inconsistente: '+plan.id);
   const team=[plan.cutterOne,plan.cutterTwo,plan.spreader].map(norm);
   if(team.some(x=>!x)||new Set(team).size!==3)
    throw Error('Equipe de corte incompleta ou com pessoa repetida: '+plan.id);
   const record={id:plan.id,orderId:plan.orderId,itemId:plan.itemId,
    scheduledDate:plan.scheduledDate,qty:plan.qty,status:plan.status,
    priority:plan.priority,team:team.slice(),conflicts:[]};
   entries.push(record);
   // Concluidos sao historico, nao consomem a capacidade FUTURA de planejamentos.
   if(plan.status!=='aberto')continue;
   const d=days.get(record.scheduledDate)||{date:record.scheduledDate,plannedPieces:0,planIds:[],teams:0};
   d.plannedPieces+=record.qty;d.planIds.push(record.id);days.set(d.date,d);
   for(const person of team){
    const k=record.scheduledDate+'\u0000'+person, prior=resources.get(k)||[];
    for(const before of prior){
     const previous=entries.find(x=>x.id===before);
     const conflict={date:record.scheduledDate,resource:person,planIds:[before,record.id]};
     problems.push(conflict);record.conflicts.push(before);
     if(previous)previous.conflicts.push(record.id);
    }
    prior.push(record.id);resources.set(k,prior);
   }
  }
  const daily=[...days.values()].sort((a,b)=>a.date.localeCompare(b.date)).map(d=>({
   ...d,capacityPieces:known?dailyCapacityPieces:null,
   excessPieces:known?Math.max(0,d.plannedPieces-dailyCapacityPieces):null,
   capacityStatus:known?(d.plannedPieces>dailyCapacityPieces?'acima_do_limite':'dentro_do_limite'):'nao_informada'
  }));
  const conflictIds=new Set(problems.flatMap(p=>p.planIds));
  return {schema:'hlgb-lab-capacidade-corte-v1',baseRevision:state.revision,
   capacityConfirmed:known,dailyCapacityPieces:known?dailyCapacityPieces:null,
   days:daily,plans:entries,resourceConflicts:problems,
   overloadedDays:daily.filter(x=>x.excessPieces>0).length,
   conflictingPlans:[...conflictIds],canApproveSchedule:known&&
    !problems.length&&daily.every(x=>x.excessPieces===0),
   note:'Teto informado por dia, nao por pessoa; capacidade, turnos e produtividade ainda exigem cadastro operacional.',
   dataWritten:false,autoRescheduled:false};
 }
 return Object.freeze({version:'1.0.0-lab',evaluate});
});
