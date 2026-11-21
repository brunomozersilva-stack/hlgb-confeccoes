/* HLGB Evolucao - consulta filtrada e auditavel de acertos.
 * Nao altera dados. Datas sao explicitamente de pagamento ou vencimento.
 * Jamais interpreta data faltante como data atual ou criacao do acerto.
 */
(function(root,factory){
 const api=factory(typeof module==='object'&&module.exports?
  require('./historico-acertos-v1.js'):(root&&root.HLGBLabSettlementHistoryV1));
 if(typeof module==='object'&&module.exports)module.exports=api;
 else if(root)root.HLGBLabSettlementHistoryFiltersV2=api;
})(typeof window!=='undefined'?window:null,function(history){
 'use strict';
 const validDate=x=>typeof x==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(x)&&
  !Number.isNaN(Date.parse(x+'T00:00:00Z'))&&
  new Date(x+'T00:00:00Z').toISOString().slice(0,10)===x;
 const sum=(entries,field)=>entries.reduce((n,x)=>n+x[field],0);
 function query(state,{groupBy='faccao',partyId='todos',clientId='todos',
    factionId='todos',status='todos',from='',to='',dateField='nenhuma',
    includeUndated=false,settlementId='todos',view='resumo'}={}){
  if(!history||!history.report)throw Error('Motor de acertos indisponivel.');
  if(!['faccao','cliente'].includes(groupBy)||
    !['todos','aberto','pago'].includes(status)||
    !['nenhuma','pagamento','vencimento'].includes(dateField)||
    !['resumo','detalhado','separado'].includes(view))
   throw Error('Filtros de acerto invalidos.');
  if((from&&!validDate(from))||(to&&!validDate(to))||
    (from&&to&&from>to))throw Error('Periodo de acertos invalido.');
  if((from||to)&&dateField==='nenhuma')
   throw Error('Escolha data de pagamento ou vencimento para filtrar periodo.');
  const base=history.report(state,{groupBy,partyId,view});
  let undated=0;
  const entries=base.entries.filter(x=>{
   if(clientId!=='todos'&&(x.clientId||'sem-cliente')!==clientId)return false;
   if(factionId!=='todos'&&(x.factionId||'sem-faccao')!==factionId)return false;
   if(settlementId!=='todos'&&x.id!==settlementId)return false;
   if(status!=='todos'&&x.status!==status)return false;
   if(dateField==='nenhuma')return true;
   const date=dateField==='pagamento'?x.paidDate:x.dueDate;
   if(!date){undated++;return !!includeUndated;}
   if(!validDate(date))throw Error('Data invalida no acerto '+x.id);
   return (!from||date>=from)&&(!to||date<=to);
  });
  const grouped=new Map();
  for(const x of entries){
   const id=groupBy==='faccao'?(x.factionId||'sem-faccao'):(x.clientId||'sem-cliente');
   const name=groupBy==='faccao'?x.factionName:x.clientName;
   if(!grouped.has(id))grouped.set(id,{id,name,count:0,pieces:0,totalCents:0,
    paidCents:0,openCents:0,compensationNetCents:0,entries:[]});
   const g=grouped.get(id);g.entries.push(x);g.count++;g.pieces+=x.qty;
   g.totalCents+=x.amountCents;g.paidCents+=x.paidCents;g.openCents+=x.openCents;
   g.compensationNetCents+=x.compensationNetCents;
  }
  return {schema:'hlgb-lab-historico-acertos-filtros-v2',
   filters:{groupBy,partyId,clientId,factionId,status,from,to,dateField,includeUndated,settlementId,view},
   entries,groups:[...grouped.values()].sort((a,b)=>a.name.localeCompare(b.name,'pt-BR')),
   totals:{count:entries.length,pieces:sum(entries,'qty'),
    totalCents:sum(entries,'amountCents'),paidCents:sum(entries,'paidCents'),
    openCents:sum(entries,'openCents'),compensationNetCents:sum(entries,'compensationNetCents')},
   excludedUndated:includeUndated?0:undated,
   readOnly:true,canApproveFinance:false};
 }
 return Object.freeze({version:'2.0.0-lab',query});
});
