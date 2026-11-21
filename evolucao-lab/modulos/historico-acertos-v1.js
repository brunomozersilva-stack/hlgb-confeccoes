/* HLGB Evolucao — historico de acertos por cliente e faccao (somente leitura).
 * Cliente e obtido do pedido vinculado; avulsos sem pedido ficam nao vinculados.
 * Consolidacao nao confunde acerto com titulo, nem soma pagamento duas vezes.
 */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 else if(root)root.HLGBLabSettlementHistoryV1=api;
})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 const find=(xs,id)=>(xs||[]).find(x=>x.id===id);
 const integer=x=>Number.isSafeInteger(x);
 function report(s,{groupBy='faccao',partyId='todos',view='resumo'}={}){
  if(!['faccao','cliente'].includes(groupBy)||!['resumo','detalhado','separado'].includes(view))
   throw Error('Modo de historico de acertos invalido.');
  if(!s||!Array.isArray(s.settlements)||!Array.isArray(s.orders)||
     !Array.isArray(s.finance)||!Array.isArray(s.clients)||!Array.isArray(s.factions))
   throw Error('Acertos e cadastros indisponiveis; nao usar totais parciais.');
  const ids=new Set(),lines=[],compensations=s.settlementCompensations||[];
  const index=(items)=>new Map(items.map(x=>[x.id,x]));
  const clients=index(s.clients),factions=index(s.factions),
   products=index(s.products||[]),orders=index(s.orders);
  const titles=new Map(),compsBySettlement=new Map(),batchesByTitle=new Map();
  const eventsByCommand=new Map(),eventsByDescription=new Map();
  for(const e of s.log||[]){
   if(!e||!e.commandId)continue;
   if(eventsByCommand.has(e.commandId))throw Error('Evento duplicado no historico: '+e.commandId);
   eventsByCommand.set(e.commandId,e);
   const desc=String(e.description||'');
   // Somente primeira referencia separada por delimitador; nao procurar substring
   // que confundiria ACE-1 com ACE-10 ou FIN-2 com FIN-20.
   const key=desc.split(/\s*[·]\s*|\s+/)[0];
   if(key){
    const list=eventsByDescription.get(key)||[];
    list.push(e);eventsByDescription.set(key,list);
   }
  }
  const eventSummary=e=>({
   commandId:e.commandId,revision:e.revision??null,type:e.type||'evento',
   actor:e.actor||null,recordedAt:e.recordedAt||null,
   description:e.description||''
  });
  for(const f of s.finance){
   const group=titles.get(f.sourceId)||[];group.push(f);titles.set(f.sourceId,group);
  }
  for(const c of compensations){
   const group=compsBySettlement.get(c.settlementId)||[];
   group.push(c);compsBySettlement.set(c.settlementId,group);
  }
  for(const batch of s.paymentBatches||[])for(const item of batch.items||[]){
   if(batchesByTitle.has(item.financeId))
    throw Error('Pagamento associado a mais de um lote: '+item.financeId);
   batchesByTitle.set(item.financeId,batch);
  }
  for(const a of s.settlements){
   if(!a||!a.id||ids.has(a.id)||!integer(a.amountCents)||a.amountCents<0||
      !integer(a.qty)||a.qty<0)throw Error('Acerto invalido ou duplicado.');
   ids.add(a.id);
   const order=a.orderId?orders.get(a.orderId):null;
   if(a.orderId&&!order)throw Error('Pedido de acerto nao localizado: '+a.id);
   const clientId=order?.clientId||null;
   const factionId=a.factionId||null;
   const faction=factionId?factions.get(factionId):null;
   if(factionId&&!faction)throw Error('Faccao ausente no historico: '+a.id);
   const bills=(titles.get(a.id)||[]).filter(x=>x.kind==='pagar');
   if(bills.length!==1||bills[0].amountCents!==a.amountCents)
    throw Error('Titulo divergente do acerto: '+a.id);
   const bill=bills[0],paid=bill.status==='pago';
   if(!['pago','aberto'].includes(bill.status)||a.status!==bill.status)
    throw Error('Situacao do acerto e titulo divergentes: '+a.id);
   const comps=(compsBySettlement.get(a.id)||[]).map(x=>{
    const related=titles.get(x.id)||[];
    if(related.length!==1||!integer(x.deltaCents)||related[0].amountCents!==Math.abs(x.deltaCents))
     throw Error('Compensacao sem titulo valido: '+x.id);
    return {id:x.id,deltaCents:x.deltaCents,status:related[0].status,
     reference:x.reference||null,reason:x.reason||'',financeId:related[0].id,
     paidDate:related[0].paidDate||null};
   });
   const batch=batchesByTitle.get(bill.id);
   const localHistory=[...(a.history||[]),...(a.rateHistory||[]),...(a.returns||[])];
   const eventIds=new Set();
   const timeline=[];
   const addEvent=e=>{if(e&&!eventIds.has(e.commandId)){
    eventIds.add(e.commandId);timeline.push(eventSummary(e));
   }};
   for(const h of localHistory)if(h.commandId)addEvent(eventsByCommand.get(h.commandId));
   for(const c of comps)for(const x of s.settlementCompensations||[]){
    if(x.id===c.id&&x.commandId)addEvent(eventsByCommand.get(x.commandId));
   }
   for(const key of [a.id,bill.id,...comps.map(x=>x.id),...comps.map(x=>x.financeId)]){
    for(const e of eventsByDescription.get(key)||[])addEvent(e);
   }
   // O comando de pagamento deve ser identificado pelo titulo financeiro completo,
   // nunca pela situacao atual ou por uma data presumida.
   timeline.sort((x,y)=>(x.revision??0)-(y.revision??0));
   const localWithoutEvent=localHistory.filter(x=>x.commandId&&!eventsByCommand.has(x.commandId))
    .map(x=>x.commandId);
   const row={id:a.id,orderId:a.orderId||null,clientId,clientName:clientId?
      clients.get(clientId)?.name||clientId:'Sem cliente vinculado',
    factionId,factionName:faction?.name||'Sem faccao',
    model:products.get(a.productId)?.name||
      products.get(order?.productId)?.name||a.serviceQuote?.model||'Modelo nao identificado',
    service:a.serviceType||'costura',qty:a.qty,amountCents:a.amountCents,
    paidCents:paid?a.amountCents:0,openCents:paid?0:a.amountCents,
    status:a.status,financeId:bill.id,paidDate:bill.paidDate||null,
    dueDate:bill.dueDate||null,batchId:batch?.id||null,
    batchReference:batch?.reference||null,
    compensationNetCents:comps.reduce((n,c)=>n+c.deltaCents,0),
    compensations:comps,history:localHistory,timeline,missingEventReferences:localWithoutEvent,
    reason:a.reason||null};
   lines.push(row);
  }
  const selected=lines.filter(x=>partyId==='todos'||
   (groupBy==='faccao'?(x.factionId||'sem-faccao'):(x.clientId||'sem-cliente'))===partyId);
  const groups=new Map();
  for(const x of selected){
   const id=groupBy==='faccao'?(x.factionId||'sem-faccao'):(x.clientId||'sem-cliente');
   const name=groupBy==='faccao'?x.factionName:x.clientName;
   if(!groups.has(id))groups.set(id,{id,name,count:0,pieces:0,totalCents:0,
      paidCents:0,openCents:0,compensationNetCents:0,entries:[]});
   const g=groups.get(id);g.count++;g.pieces+=x.qty;g.totalCents+=x.amountCents;
   g.paidCents+=x.paidCents;g.openCents+=x.openCents;
   g.compensationNetCents+=x.compensationNetCents;g.entries.push(x);
  }
  const summary=[...groups.values()].sort((a,b)=>a.name.localeCompare(b.name,'pt-BR'));
  return {schema:'hlgb-lab-historico-acertos-v1',groupBy,partyId,view,
   groups:summary,entries:selected,totals:{count:selected.length,
    pieces:selected.reduce((n,x)=>n+x.qty,0),
    totalCents:selected.reduce((n,x)=>n+x.amountCents,0),
    paidCents:selected.reduce((n,x)=>n+x.paidCents,0),
    openCents:selected.reduce((n,x)=>n+x.openCents,0),
    compensationNetCents:selected.reduce((n,x)=>n+x.compensationNetCents,0)},
   readOnly:true,
   caveat:'Acertos avulsos sem pedido nao possuem cliente identificado. Data de criacao sem registro nao e presumida. Compensacoes sao exibidas separadamente do valor do acerto.'};
 }
 return Object.freeze({version:'1.0.0-lab',report});
});
