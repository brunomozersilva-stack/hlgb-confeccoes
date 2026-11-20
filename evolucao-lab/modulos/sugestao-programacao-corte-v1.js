/* HLGB Evolucao — proposta hipotetica de redistribuicao de Corte.
 * Somente leitura. Nao reprograma folhas nem promete prazo: produtividade
 * e calendario escolhidos sao premissas do cenario, nao registros empresariais.
 */
(function(root,factory){
 const api=factory(typeof module==='object'&&module.exports?
  require('./capacidade-corte-v1.js'):(root&&root.HLGBLabCutCapacityV1));
 if(typeof module==='object'&&module.exports)module.exports=api;
 else if(root)root.HLGBLabCutScheduleProposalV1=api;
})(typeof window!=='undefined'?window:null,function(capacity){
 'use strict';
 const priorities={urgente:0,alta:1,normal:2,baixa:3};
 const dateAdd=(date,n)=>{
  const d=new Date(date+'T00:00:00Z');d.setUTCDate(d.getUTCDate()+n);
  return d.toISOString().slice(0,10);
 };
 const weekday=date=>new Date(date+'T00:00:00Z').getUTCDay();
 function propose(state,{dailyCapacityPieces,workingDays,horizonDays=60}={}){
  if(!capacity||typeof capacity.evaluate!=='function')
   throw Error('Analise de capacidade indisponivel.');
  if(!Array.isArray(workingDays)||!workingDays.length||
    workingDays.some(x=>!Number.isSafeInteger(x)||x<0||x>6)||
    new Set(workingDays).size!==workingDays.length)
   throw Error('Selecione explicitamente os dias de trabalho (0=domingo ate 6=sabado).');
  if(!Number.isSafeInteger(horizonDays)||horizonDays<1||horizonDays>180)
   throw Error('Horizonte de simulacao invalido (1 a 180 dias).');
  const base=capacity.evaluate(state,{dailyCapacityPieces});
  const open=base.plans.filter(p=>p.status==='aberto');
  const sorted=open.slice().sort((a,b)=>a.scheduledDate.localeCompare(b.scheduledDate)||
   (priorities[a.priority]??9)-(priorities[b.priority]??9)||a.id.localeCompare(b.id));
  const taken=new Map(),usedPeople=new Map(),moves=[],blocked=[];
  for(const p of sorted){
   if(!(p.priority in priorities)){
    blocked.push({id:p.id,reason:'prioridade_invalida'});continue;
   }
   if(p.qty>dailyCapacityPieces){
    blocked.push({id:p.id,reason:'folha_maior_que_capacidade_diaria',pieces:p.qty});
    continue;
   }
   let proposed=null;
   for(let offset=0;offset<horizonDays;offset++){
    const d=dateAdd(p.scheduledDate,offset);
    if(!workingDays.includes(weekday(d)))continue;
    if((taken.get(d)||0)+p.qty>dailyCapacityPieces)continue;
    const persons=usedPeople.get(d)||new Set();
    if(p.team.some(person=>persons.has(person)))continue;
    proposed=d;break;
   }
   if(!proposed){
    blocked.push({id:p.id,reason:'sem_encaixe_no_horizonte',pieces:p.qty});
    continue;
   }
   taken.set(proposed,(taken.get(proposed)||0)+p.qty);
   const persons=usedPeople.get(proposed)||new Set();
   p.team.forEach(person=>persons.add(person));
   usedPeople.set(proposed,persons);
   moves.push({id:p.id,orderId:p.orderId,itemId:p.itemId,qty:p.qty,
    priority:p.priority,team:p.team,originalDate:p.scheduledDate,
    suggestedDate:proposed,changed:proposed!==p.scheduledDate,
    delayedDays:Math.round((Date.parse(proposed+'T00:00:00Z')-
      Date.parse(p.scheduledDate+'T00:00:00Z'))/86400000)});
  }
  return {schema:'hlgb-lab-cut-schedule-proposal-v1',baseRevision:state.revision,
   assumptions:{dailyCapacityPieces,workingDays:workingDays.slice(),horizonDays},
   proposals:moves,blocked,changed:moves.filter(x=>x.changed).length,
   noAutomaticChanges:true,writePerformed:false,
   requiresHumanApproval:true,canApproveProduction:false,
   note:'A proposta nao valida prazos de entrega, materia-prima, turnos, feriados, habilidade por modelo ou disponibilidade real de pessoal.'};
 }
 return Object.freeze({version:'1.0.0-lab',propose});
});
