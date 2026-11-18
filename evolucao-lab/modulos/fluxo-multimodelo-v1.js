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
 const fingerprint=x=>JSON.stringify(x);
 const proof=(s,id,revision,type)=>{
  const x=(s.log||[]).find(e=>e.commandId===id);
  if(!x||x.revision!==revision||x.type!==type)fail('Evento sem prova global: '+id);
 };
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
    if(fingerprint(fields)!==lot.immutableFingerprint)fail('Envio alterado fora do histórico');
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
      if(e.immutableFingerprint!==fingerprint(immutableChange))
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
      if(fingerprint(vals)!==e.immutableFingerprint||e.factionId!==factionId||
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
          e.review.immutableFingerprint!==fingerprint(immutableReview))
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
       fingerprint(fields)!==e.immutableFingerprint)fail('Movimento sem origem ou adulterado');
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
  return issues;
 }
 return Object.freeze({version:'1.0.0-lab',ensure,orderBalance,allocate,
  transfer:(s,p,ctx)=>moveOrRate(s,p,ctx,'transfer'),
  rate:(s,p,ctx)=>moveOrRate(s,p,ctx,'price'),
  returnPieces,reviewReturn,
  separate:(s,p,ctx)=>moveByOrder(s,p,ctx,'separate'),
  ship:(s,p,ctx)=>moveByOrder(s,p,ctx,'ship'),acertos,inspect});
});
