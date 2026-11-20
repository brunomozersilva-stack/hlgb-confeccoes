/* modulos/pagamento-lote-v1.js */
/* HLGB Evolução · Pagamento em lote V1 — SOMENTE LAB FICTÍCIO.
 * O núcleo é o único escritor: este componente valida e muta exclusivamente
 * o clone transacional recebido por core.apply(). Nenhuma API, WAL ou banco externo.
 * Operações financeiras antigas continuam separadas e intactas.
 */
(function(root,factory){
 'use strict';
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.HLGBLabPaymentBatchV1=api;
})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 const normalize=x=>String(x??'').trim().toLocaleUpperCase('pt-BR');
 const find=(a,id)=>a.find(x=>x.id===id);
 function groupedAccounts(s){
 const sum=rows=>rows.reduce((n,x)=>{const v=n+x.amountCents;if(!Number.isSafeInteger(v))throw Error('Total do prestador fora do limite seguro.');return v;},0);
 const by=new Map((s.factions||[]).map(f=>[f.id,{factionId:f.id,name:f.name,payables:[],credits:[],paid:[],received:[],issues:[]}]));
 const sources=new Map(),bills=new Map(),lots=new Map();
 for(const x of s.settlements||[]) {if(sources.has(x.id))throw Error('Origem de acerto duplicada.');sources.set(x.id,{...x,sourceType:'acerto',kind:'pagar',value:x.amountCents});}
 for(const x of s.settlementCompensations||[]){if(sources.has(x.id))throw Error('Origem de compensação duplicada.');sources.set(x.id,{...x,sourceType:'compensacao',kind:x.deltaCents>0?'pagar':'receber',value:Math.abs(x.deltaCents)});}
 for(const f of s.finance||[]){if(!sources.has(f.sourceId))continue;const a=bills.get(f.sourceId)||[];a.push(f);bills.set(f.sourceId,a);}
 for(const l of s.paymentBatches||[])for(const i of l.items||[]){if(lots.has(i.financeId))throw Error('Título presente em dois fechamentos.');lots.set(i.financeId,l);}
 for(const src of sources.values()){
 const g=by.get(src.factionId);if(!g)throw Error('Acerto sem prestador cadastrado: '+src.id);
 const linked=bills.get(src.id)||[],bill=linked[0];
 if(linked.length!==1||bill.kind!==src.kind||bill.status!==src.status||!['aberto','pago'].includes(bill.status)||!Number.isSafeInteger(src.value)||src.value<=0||bill.amountCents!==src.value){g.issues.push(src.id+' · origem e título divergentes');continue;}
 const original=src.sourceType==='compensacao'?sources.get(src.settlementId):src,product=(s.products||[]).find(p=>p.id===original?.productId),lot=lots.get(bill.id);
 if(lot&&(bill.status!=='pago'||lot.items.filter(i=>i.financeId===bill.id&&i.sourceId===src.id&&i.factionId===src.factionId&&i.amountCents===bill.amountCents).length!==1)){g.issues.push(src.id+' · fechamento divergente');continue;}
 const row={sourceId:src.id,financeId:bill.id,sourceType:src.sourceType,service:src.sourceType==='compensacao'?'compensacao':src.serviceType||'costura',description:src.description||src.reason||bill.description,model:original?.serviceQuote?.model||product?.name||'Modelo não identificado',qty:src.sourceType==='acerto'?src.qty:null,amountCents:bill.amountCents,status:bill.status,kind:bill.kind,paidDate:bill.paidDate||null,dueDate:bill.dueDate||null,batchId:lot?.id||null,reference:lot?.reference||null};
 g[bill.status==='aberto'?(bill.kind==='pagar'?'payables':'credits'):(bill.kind==='pagar'?'paid':'received')].push(row);
 }
 const all=[...by.values()].filter(g=>g.issues.length||g.payables.length||g.credits.length||g.paid.length||g.received.length);
 for(const g of all){g.payablesCents=sum(g.payables);g.creditsCents=sum(g.credits);g.paidCents=sum(g.paid);g.receivedCents=sum(g.received);g.ready=!g.issues.length&&g.payables.length>=2&&g.payables.length<=50;g.complete=!g.issues.length;
 for(const k of ['payables','credits','paid','received'])g[k].sort((a,b)=>a.financeId.localeCompare(b.financeId));}
 return {schema:'hlgb-acerto-agrupado-v1',revision:s.revision,productionApproval:false,groups:all.sort((a,b)=>a.name.localeCompare(b.name,'pt-BR')||a.factionId.localeCompare(b.factionId)),totals:{payablesCents:all.reduce((n,g)=>n+g.payablesCents,0),creditsCents:all.reduce((n,g)=>n+g.creditsCents,0),paidCents:all.reduce((n,g)=>n+g.paidCents,0),receivedCents:all.reduce((n,g)=>n+g.receivedCents,0),blocked:all.filter(g=>!g.complete).length}};
}
 function date(value){const v=value??'2026-11-16';if(typeof v!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(v)||!Number.isFinite(Date.parse(v+'T00:00:00Z'))||new Date(v+'T00:00:00Z').toISOString().slice(0,10)!==v)throw Error('Data de pagamento inválida.');return v;}
 function validate(s,p){
  if(!s||!Array.isArray(s.finance)||!Array.isArray(s.settlements))
   throw Error('Estado financeiro fictício incompatível.');
  if(!p||!Array.isArray(p.financeIds)||p.financeIds.length<2||p.financeIds.length>50)
   throw Error('Selecione entre 2 e 50 títulos a pagar para o lote.');
  const ids=p.financeIds;
  if(ids.some(id=>typeof id!=='string'||!/^FIN-\d+$/.test(id))||
    new Set(ids).size!==ids.length)throw Error('Títulos repetidos ou IDs inválidos no lote.');
  const reference=normalize(p.reference);
  if(!reference||reference.length>95)throw Error('Referência única do lote obrigatória (até 95 caracteres).');
  const reason=String(p.reason??'').trim();
  if(!reason||reason.length>95)throw Error('Motivo obrigatório do lote (até 95 caracteres).');
  if((s.paymentBatches||[]).some(batch=>normalize(batch.reference)===reference))
   throw Error('Referência de lote já utilizada. Confira o histórico antes de repetir.');
  const comps=Array.isArray(s.settlementCompensations)?s.settlementCompensations:[];
  const items=ids.map(id=>{
   const bill=find(s.finance,id);
   if(!bill)throw Error('Título '+id+' não localizado. Recarregue antes de confirmar.');
   if(bill.kind!=='pagar'||bill.status!=='aberto')
    throw Error('Título '+id+' não está aberto e a pagar. Não repetir quitação.');
   if(!Number.isSafeInteger(bill.amountCents)||bill.amountCents<=0)
    throw Error('Título '+id+' com valor inválido; conferência obrigatória.');
   const settlement=find(s.settlements,bill.sourceId),comp=find(comps,bill.sourceId);
   if(!settlement&&!comp)throw Error('Somente títulos de acertos e compensações a pagar entram neste lote.');
   const source=settlement||comp,sourceType=settlement?'acerto':'compensacao';
   if(source.status!=='aberto')throw Error('Origem de '+id+' já quitada ou divergente.');
   if(settlement&&settlement.amountCents!==bill.amountCents)
    throw Error('Acerto '+settlement.id+' diverge do título '+id+'.');
   if(comp&&(comp.deltaCents<=0||comp.deltaCents!==bill.amountCents))
    throw Error('Compensação '+comp.id+' diverge do título '+id+'.');
   const previous=(s.paymentBatches||[]).some(batch=>
    batch.items?.some(item=>item.financeId===id));
   if(previous)throw Error('Título '+id+' já consta em um lote anterior.');
   return {financeId:id,sourceId:source.id,sourceType,
    factionId:source.factionId||null,amountCents:bill.amountCents};
  });
  const total=items.reduce((v,x)=>v+x.amountCents,0);
  if(!Number.isSafeInteger(total)||total<=0)
   throw Error('Valor total do lote inválido.');
  if(p.expectedTotalCents!==undefined&&p.expectedTotalCents!==total)throw Error('Valor do fechamento mudou. Confira novamente.');
  return {reference,reason,items,totalCents:total,paidDate:date(p.paidDate)};
 }
 function preview(s,p){
  // Rejeitar previamente tudo que a confirmação rejeitaria.
  const r=validate(s,p);
  return {reference:r.reference,reason:r.reason,count:r.items.length,
   totalCents:r.totalCents,items:r.items.map(x=>({...x})),
   scope:'laboratorio-ficticio',realPayment:false};
 }
 function execute(s,p,context){
  if(!context||typeof context.next!=='function'||!context.uid)
   throw Error('Autoridade transacional do núcleo ausente.');
  // Chamado apenas pelo core.apply sobre snapshot isolado, após validação de
  // revisão, comando único e antes da aprovação de integridade.
  const r=validate(s,p);
  if(!Array.isArray(s.paymentBatches))s.paymentBatches=[];
  const id=context.next(s,'PAG');
  const batch={id,reference:r.reference,reason:r.reason,commandId:context.uid,
   paidDate:r.paidDate,status:'pago',kind:'pagamento_ficticio_lote',
   count:r.items.length,totalCents:r.totalCents,
   items:r.items.map(x=>({...x}))};
  for(const item of r.items){
   const bill=find(s.finance,item.financeId);
   bill.status='pago';bill.paidDate=batch.paidDate;
   const source=item.sourceType==='acerto'?find(s.settlements,item.sourceId):
    find(s.settlementCompensations,item.sourceId);
   source.status='pago';
  }
  s.paymentBatches.push(batch);
  return id+' · '+r.items.length+' títulos · '+r.totalCents+
   ' centavos · '+r.reference+' (quitação apenas fictícia)';
 }

 // Somente no laboratório: todos os acertos abertos da mesma facção em uma baixa.
 function collect(s,factionId){
  if(!find(s.factions||[],factionId))throw Error('Facção não cadastrada.');
  const sources=[
   ...s.settlements.filter(x=>x.factionId===factionId&&x.status==='aberto'),
   ...(s.settlementCompensations||[]).filter(x=>
    x.factionId===factionId&&x.status==='aberto'&&x.deltaCents>0)
  ];
  if(sources.length<2||sources.length>50)
   throw Error('É necessário ter entre 2 e 50 acertos/diferenças da mesma facção.');
  const ids=sources.map(src=>{
   const bills=s.finance.filter(f=>f.sourceId===src.id&&f.kind==='pagar');
   if(bills.length!==1||bills[0].status!=='aberto'||
      bills[0].amountCents!==(src.amountCents??src.deltaCents)||
      !Number.isSafeInteger(bills[0].amountCents)||bills[0].amountCents<=0||
      (s.paymentBatches||[]).some(b=>b.items?.some(i=>i.financeId===bills[0].id)))
    throw Error('Acerto '+src.id+' e título do Hub divergentes. Não fechar parcialmente.');
   return bills[0].id;
  }).sort();
  if(new Set(ids).size!==ids.length)throw Error('Título duplicado no fechamento.');
  return ids;
 }
 function groups(s){
  return (s.factions||[]).flatMap(f=>{
   const n=s.settlements.filter(x=>x.factionId===f.id&&x.status==='aberto').length+
    (s.settlementCompensations||[]).filter(x=>x.factionId===f.id&&
      x.status==='aberto'&&x.deltaCents>0).length;
   if(n<2)return [];
   try{
    const ids=collect(s,f.id);
    return [{factionId:f.id,name:f.name,count:ids.length,financeIds:ids,
     totalCents:ids.reduce((a,id)=>a+find(s.finance,id).amountCents,0),ready:true}];
   }catch(e){return [{factionId:f.id,name:f.name,count:n,ready:false,
    totalCents:null,error:String(e.message||e)}]}
  });
 }
 function scoped(s,p){
  const factionId=String(p?.factionId||'').trim();
  const ids=collect(s,factionId),submitted=p.financeIds;
  if(!Array.isArray(submitted)||submitted.length!==ids.length||
     new Set(submitted).size!==ids.length||
     submitted.slice().sort().some((id,i)=>id!==ids[i]))
   throw Error('A lista da facção mudou ou está incompleta. Recarregue antes da baixa.');
  const account=groupedAccounts(s).groups.find(g=>g.factionId===factionId);
  if(!account?.complete)throw Error('Há divergências no extrato do prestador. Confira antes de fechar.');
  const checked=validate(s,{financeIds:ids,reference:p.reference,reason:p.reason,paidDate:p.paidDate,expectedTotalCents:p.expectedTotalCents});
  if(checked.items.some(i=>i.factionId!==factionId))
   throw Error('Há um acerto de outra facção no fechamento. Não pagar.');
  return {factionId,ids,checked};
 }
 function previewFaction(s,p){
  const x=scoped(s,p);
  return {factionId:x.factionId,factionName:find(s.factions,x.factionId).name,
   reference:x.checked.reference,count:x.ids.length,totalCents:x.checked.totalCents,
   financeIds:x.ids,items:x.checked.items.map(i=>({...i})),
   scope:'laboratorio-ficticio',realPayment:false};
 }
 function executeFaction(s,p,ctx){
  const x=scoped(s,p),name=find(s.factions,x.factionId).name;
  const result=execute(s,{financeIds:x.ids,reference:p.reference,reason:p.reason,paidDate:p.paidDate,expectedTotalCents:p.expectedTotalCents},ctx);
  const record=s.paymentBatches[s.paymentBatches.length-1];
  record.scope='faccao';record.factionId=x.factionId;record.factionNameSnapshot=name;
  return 'Fechamento da facção '+name+' · '+result;
 }
 // Comprovantes de EXERCÍCIO apenas. Conteúdo e metadados no mesmo snapshot
 // transacional local; não existe upload remoto, liquidação ou validação bancária.
 const MAX_PDF=256*1024,MAX_TOTAL=2*1024*1024,MAX_FILES=40;
 const alphabet='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
 function decodePdf(encoded){
  if(typeof encoded!=='string'||encoded.length>Math.ceil(MAX_PDF/3)*4||
    encoded.length%4!==0||!/^[A-Za-z0-9+/]*={0,2}$/.test(encoded)||encoded.startsWith('='))
   throw Error('Conteúdo PDF inválido ou acima de 256 KiB.');
  const output=new Uint8Array(encoded.length/4*3-(encoded.endsWith('==')?2:encoded.endsWith('=')?1:0));
  let k=0;
  for(let i=0;i<encoded.length;i+=4){
   const a=alphabet.indexOf(encoded[i]),b=alphabet.indexOf(encoded[i+1]),
    c=Math.max(0,alphabet.indexOf(encoded[i+2])),d=Math.max(0,alphabet.indexOf(encoded[i+3]));
   if(encoded[i+2]==='='&&(b&15)||encoded[i+3]==='='&&encoded[i+2]!=='='&&(c&3))
    throw Error('Codificação não canônica.');
   output[k++]=(a<<2)|(b>>4);if(k<output.length)output[k++]=(b<<4)|(c>>2);
   if(k<output.length)output[k++]=(c<<6)|d;
  }
  const head=String.fromCharCode(...output.slice(0,12)),
   tail=String.fromCharCode(...output.slice(-1024));
  if(output.length<32||output.length>MAX_PDF||!/^%PDF-(?:1\.[0-7]|2\.0)(?:\r|\n)/.test(head)||
    !/%%EOF[\x00\t\n\f\r ]*$/.test(tail))
   throw Error('Arquivo não possui assinatura e final de PDF válidos.');
  let checksum=2166136261;
  for(const byte of output)checksum=Math.imul(checksum^byte,16777619)>>>0;
  return {bytes:output,size:output.length,checksum:checksum.toString(16).padStart(8,'0')};
 }
 function receiptTarget(s,id){
  const batch=find(s.paymentBatches||[],id);
  if(batch&&batch.status==='pago'&&Array.isArray(batch.items)&&batch.items.length>=2)
   return {kind:'lote',targetId:id,amountCents:batch.totalCents,
    financeIds:batch.items.map(i=>i.financeId).slice().sort()};
  const title=find(s.finance||[],id);
  if(!title||title.kind!=='pagar'||title.status!=='pago')
   throw Error('Comprovante exige título a pagar já quitado ou fechamento concluído.');
  if((s.paymentBatches||[]).some(b=>b.items?.some(i=>i.financeId===id)))
   throw Error('Este título pertence a um fechamento. Anexe ao lote PAG, não ao título separado.');
  return {kind:'titulo',targetId:id,amountCents:title.amountCents,financeIds:[id]};
 }
 function receiptTargets(s){
  const ids=[...(s.paymentBatches||[]).map(x=>x.id),
   ...s.finance.filter(t=>t.kind==='pagar'&&t.status==='pago').map(t=>t.id)];
  return ids.flatMap(id=>{try{return [receiptTarget(s,id)]}catch(_){return []}});
 }
 function attachReceipt(s,p,ctx){
  if(p.fictitious!==true)throw Error('Confirme que o PDF é exclusivamente fictício.');
  const target=receiptTarget(s,String(p.targetId||''));
  if(!Number.isSafeInteger(target.amountCents)||target.amountCents<=0)
   throw Error('Valor de origem inválido.');
  const name=String(p.fileName||'').trim();
  if(!/^[A-Za-z0-9][A-Za-z0-9 ._-]{0,90}\.pdf$/i.test(name))
   throw Error('Use um nome de PDF fictício simples, sem caminhos ou caracteres especiais.');
  const reason=String(p.reason||'').trim();
  if(!reason||reason.length>95)throw Error('Justificativa obrigatória (até 95 caracteres).');
  const file=decodePdf(p.contentBase64);
  if(!Array.isArray(s.paymentReceipts))s.paymentReceipts=[];
  const rows=s.paymentReceipts,prior=rows.filter(r=>r.targetId===target.targetId).at(-1);
  if(rows.length>=MAX_FILES||rows.reduce((n,x)=>n+x.size,0)+file.size>MAX_TOTAL)
   throw Error('Limite do laboratório: 40 anexos e 2 MiB no total. Não apagar histórico automaticamente.');
  if(rows.some(r=>r.contentBase64===p.contentBase64))
   throw Error('PDF idêntico já registrado. Consulte o comprovante existente.');
  if((p.previousId||null)!==(prior?.id||null))
   throw Error('O comprovante atual mudou. Recarregue antes de anexar ou substituir.');
  const receipt={id:ctx.next(s,'CPV'),...target,fileName:name,
   contentBase64:p.contentBase64,size:file.size,checksum:file.checksum,
   version:(prior?.version||0)+1,previousId:prior?.id||null,
   reason,commandId:ctx.uid,fictitious:true};
  rows.push(receipt);
  return receipt.id+' · '+target.targetId+' · versão '+receipt.version+' · PDF fictício local';
 }
 function inspectReceipts(s){
  const issues=[],ids=new Set(),contents=new Set(),commands=new Set(),latest=new Map();
  const rows=Array.isArray(s.paymentReceipts)?s.paymentReceipts:[];
  let bytes=0;
  for(const r of rows){
   try{
    const target=receiptTarget(s,r.targetId),file=decodePdf(r.contentBase64),
     prev=latest.get(r.targetId);
    if(!r.id||ids.has(r.id)||contents.has(r.contentBase64)||commands.has(r.commandId)||
       !r.reason||r.fictitious!==true||!r.fileName||
       !/^[A-Za-z0-9][A-Za-z0-9 ._-]{0,90}\.pdf$/i.test(r.fileName)||
       target.kind!==r.kind||target.amountCents!==r.amountCents||
       JSON.stringify(target.financeIds)!==JSON.stringify(r.financeIds)||
       r.size!==file.size||r.checksum!==file.checksum||
       r.version!==(prev?.version||0)+1||r.previousId!==(prev?.id||null)||
       !s.log.some(e=>e.commandId===r.commandId&&e.type==='finance.receipt.attach'))
     throw Error('metadados, versão, conteúdo ou vínculo divergente');
    bytes+=file.size;ids.add(r.id);contents.add(r.contentBase64);commands.add(r.commandId);
    latest.set(r.targetId,r);
   }catch(e){issues.push(String(r?.id)+': comprovante inválido — '+String(e.message||e))}
  }
  if(rows.length>MAX_FILES||bytes>MAX_TOTAL)issues.push('Limite de comprovantes fictícios excedido');
  for(const e of s.log.filter(e=>e.type==='finance.receipt.attach'))
   if(!commands.has(e.commandId))issues.push(e.commandId+': evento de comprovante sem anexo válido');
  return issues;
 }
 function receiptMetadata(s){
  const rows=s.paymentReceipts||[],latest=new Map(rows.map(r=>[r.targetId,r.id]));
  return rows.map(({contentBase64,...r})=>({...r,current:latest.get(r.targetId)===r.id}));
 }
 return Object.freeze({version:'1.1.0',validate,preview,execute,
  groups,groupedAccounts,previewFaction,executeFaction,receiptTarget,receiptTargets,
  attachReceipt,inspectReceipts,receiptMetadata,decodePdf,MAX_PDF});
});

;
/* modulos/faccoes-multidestino-v1.js */
/* HLGB Evolução · Distribuição de pedidos em múltiplas facções, apenas LAB fictício.
 * Sem rede ou armazenamento próprio; opera somente no clone validado pelo núcleo.
 * Não substitui comandos legados de facção, seus IDs ou acertos históricos.
 */
(function(root,factory){
 'use strict';
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.HLGBLabFactionRoutingV1=api;
})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 const sum=x=>Object.values(x).reduce((a,b)=>a+b,0);
 const byId=(a,id)=>a.find(x=>x.id===id);
 function ensure(s,next){
  if(!Array.isArray(s.factionAssignments))s.factionAssignments=[];
  for(const order of s.orders){
   if(order.allocated<=0||s.factionAssignments.some(a=>a.orderId===order.id))continue;
   if(!order.factionId||!s.factions.some(x=>x.id===order.factionId)||
      order.returned>order.allocated)
    throw Error('Histórico anterior da facção inconsistente. Não migrar automaticamente.');
   s.factionAssignments.push({
    id:next(s,'ALO'),orderId:order.id,factionId:order.factionId,
    qtySent:order.allocated,qtyReturned:order.returned,
    origin:'legado-local',createdCommandId:'migracao-legado-local'
   });
  }
  return s.factionAssignments;
 }
 function forOrder(s,id){return (s.factionAssignments||[]).filter(a=>a.orderId===id)}
 function allocation(s,p,ctx){
  const assignments=ensure(s,ctx.next);
  const order=byId(s.orders,p.orderId),fac=byId(s.factions,p.factionId);
  if(fac?.serviceRole&&fac.serviceRole!=='costura')throw Error('Selecione facção de costura.');
  if(!order)throw Error('Pedido não localizado.');
  if(!fac)throw Error('Facção não localizada.');
  const qty=ctx.int(p.qty,'Peças a enviar',1,10000);
  if(order.allocated+qty>sum(order.cut))
   throw Error('Envio excede peças cortadas; não distribuir o mesmo corte duas vezes.');
  let row=assignments.find(a=>a.orderId===order.id&&a.factionId===fac.id);
  if(!row){
   row={id:ctx.next(s,'ALO'),orderId:order.id,factionId:fac.id,
    qtySent:0,qtyReturned:0,origin:'distribuicao',createdCommandId:ctx.uid};
   assignments.push(row);
  }
  row.qtySent+=qty;
  order.allocated+=qty;
  if(!order.factionId)order.factionId=fac.id; // facção principal preservada para UI/rotina antiga.
  return row.id+' · '+order.id+' → '+fac.name+' · +'+qty+' peças';
 }
 function transfer(s,p,ctx){
  // Transferência física apenas do saldo AINDA NÃO RETORNADO.
  // Histórico de acertos/baixas anteriores nunca é transferido ao novo destino.
  ensure(s,ctx.next);
  if(!Array.isArray(s.factionPartialTransfers))s.factionPartialTransfers=[];
  const from=byId(s.factionAssignments,p.fromAssignmentId);
  if(!from)throw Error('Envio de origem não encontrado. Confira o pedido e a facção.');
  const order=byId(s.orders,from.orderId);
  const target=byId(s.factions,p.toFactionId);
  if(target?.serviceRole&&target.serviceRole!=='costura')throw Error('Selecione facção de costura.');
  if(!order||!target)throw Error('Pedido ou facção de destino não localizado.');
  if(from.factionId===target.id)throw Error('Selecione uma facção de destino diferente da origem.');
  const qty=ctx.int(p.qty,'Quantidade transferida',1,10000);
  const available=from.qtySent-from.qtyReturned;
  if(qty>available)throw Error('Transferência excede o saldo não retornado da facção de origem.');
  if(from.qtySent-qty<1)
   throw Error('Transferência integral deste envio não disponível neste fluxo parcial; mantenha pelo menos uma peça atribuída ou use a troca simples antes de retornos.');
  const reason=String(p.reason??'').trim();
  if(!reason||reason.length>95)throw Error('Justificativa de transferência obrigatória (até 95 caracteres).');
  let to=s.factionAssignments.find(a=>a.orderId===order.id&&a.factionId===target.id);
  if(!to){
   to={id:ctx.next(s,'ALO'),orderId:order.id,factionId:target.id,
    qtySent:0,qtyReturned:0,origin:'transferencia-parcial',
    createdCommandId:ctx.uid};
   s.factionAssignments.push(to);
  }
  const fromBefore=from.qtySent,toBefore=to.qtySent;
  from.qtySent-=qty;
  to.qtySent+=qty;
  // Não modificar order.allocated, order.returned, acertos ou títulos.
  const move={id:ctx.next(s,'TRP'),orderId:order.id,
   fromAssignmentId:from.id,toAssignmentId:to.id,
   fromFactionId:from.factionId,toFactionId:to.factionId,
   qty,reason,commandId:ctx.uid,
   fromBefore,fromAfter:from.qtySent,toBefore,toAfter:to.qtySent,
   kind:'transferencia_parcial_pendente'};
  s.factionPartialTransfers.push(move);
  return move.id+' · '+order.id+' · '+qty+' peças · '+from.factionId+
   ' → '+to.factionId+' (sem alterar acertos anteriores)';
 }
 // A tarifa negociada pertence ao envio ALO, não ao cadastro geral.
 function resolveRate(row,fac,product,s){
  const agreement=row?.rateAgreementHistory?.at(-1);
  if(agreement?.mode==='negociado'){
   if(agreement.factionId!==fac.id||agreement.productId!==product.id||
      !Number.isSafeInteger(agreement.gross)||!Number.isSafeInteger(agreement.discount)||
      agreement.gross<=agreement.discount||agreement.discount<0)
    throw Error('Tarifa do envio divergente da facção/modelo. Conferir antes do retorno.');
   return {gross:agreement.gross,traveta:agreement.discount,
    unit:agreement.gross-agreement.discount,agreementCommandId:agreement.commandId};
  }
  const gross=fac.productRates?.[product.id]??fac.unitCents;
  if(fac.serviceRole&&fac.serviceRole!=='costura')throw Error('Prestador não classificado para costura.');
  let traveta=fac.traveta?0:Math.min(gross,50);
  if(!fac.traveta&&(fac.serviceRole||product.servicePointsCommandId)){
   const count=product.travetaPoints,tariff=s?.serviceRates?.pointCents;
   if(!Number.isSafeInteger(count)||count<0||count>100||count>0&&(!Number.isSafeInteger(tariff)||tariff<0))throw Error('Cadastre pontos e tarifa de travetada antes do retorno.');
   traveta=count*(tariff||0);
   if(traveta>=gross)throw Error('Desconto de travetada supera o preço de costura.');
  }
  return {gross,traveta,unit:gross-traveta,agreementCommandId:null};
 }
 function setAssignmentRate(s,p,ctx){
  const row=byId(ensure(s,ctx.next),p.assignmentId),
   order=row&&byId(s.orders,row.orderId),
   fac=row&&byId(s.factions,row.factionId),
   product=order&&byId(s.products,order.productId);
  if(!row||!fac||!product||row.qtySent<=row.qtyReturned)
   throw Error('Escolha um envio com peças pendentes de retorno.');
  const gross=ctx.int(p.unitCents,'Valor bruto por peça',1,100000),
   discount=ctx.int(p.travetaCents,'Desconto por peça',0,100000);
  if(discount>=gross)throw Error('Preço líquido por peça precisa ser positivo.');
  const reason=String(p.reason??'').trim();
  if(!reason||reason.length>95)throw Error('Justificativa obrigatória (até 95 caracteres).');
  const before=resolveRate(row,fac,product,s);
  if(!Array.isArray(row.rateAgreementHistory))row.rateAgreementHistory=[];
  row.rateAgreementHistory.push({mode:'negociado',commandId:ctx.uid,
   factionId:fac.id,productId:product.id,gross,discount,reason,
   pendingQty:row.qtySent-row.qtyReturned,beforeGross:before.gross,beforeDiscount:before.traveta});
  return row.id+' · '+fac.name+' · '+before.gross+' → '+gross+
   ' centavos brutos · apenas próximos retornos';
 }
 function inspectAssignmentRates(s){
  const problems=[],seen=new Set(),entries=new Map();
  for(const row of (s.factionAssignments||[])){
   const history=Array.isArray(row.rateAgreementHistory)?row.rateAgreementHistory:[];
   for(const h of history){
    const event=s.log.find(e=>e.commandId===h.commandId);
    if(!h.commandId||seen.has(h.commandId)||!event||
       !['negociado','reset'].includes(h.mode)||!h.reason||
       h.mode==='negociado'&&(event.type!=='faction.assignment.rate.set'||
       !byId(s.factions,h.factionId)||!byId(s.products,h.productId)||
       !Number.isSafeInteger(h.gross)||!Number.isSafeInteger(h.discount)||
       h.gross<=h.discount||h.discount<0||!Number.isSafeInteger(h.pendingQty)||h.pendingQty<1)||
       h.mode==='reset'&&(event.type!=='faction.reassign'||!byId(s.factions,h.factionId)))
     problems.push(row.id+': histórico da tarifa do envio inconsistente');
    seen.add(h.commandId);
    if(h.mode==='negociado')entries.set(h.commandId,{h,row});
   }
   const last=history.at(-1);
   if(last&&last.factionId!==row.factionId)
    problems.push(row.id+': tarifa ativa pertence a outra facção');
  }
  for(const x of s.settlements.filter(x=>x.rateAgreementCommandId)){
   const ref=entries.get(x.rateAgreementCommandId);
   const original=x.rateHistory?.[0]?.before||x;
   if(!ref||ref.row.id!==x.assignmentId||ref.h.factionId!==x.factionId||
      ref.h.productId!==x.productId||ref.h.gross!==(original.listUnitCents??original.unitCents)||
      ref.h.discount!==(original.travetaCents||0))
    problems.push(x.id+': tarifa aplicada no retorno não confere com acordo histórico');
  }
  for(const event of s.log.filter(e=>e.type==='faction.assignment.rate.set'))
   if(!seen.has(event.commandId))problems.push(event.commandId+': acordo de tarifa sem histórico');
  return problems;
 }
 function ret(s,p,ctx){
  ensure(s,ctx.next);
  const a=byId(s.factionAssignments,p.assignmentId);
  if(!a)throw Error('Envio a facção não localizado.');
  const order=byId(s.orders,a.orderId),fac=byId(s.factions,a.factionId);
  if(!order||!fac)throw Error('Pedido/facção desse envio não encontrado.');
  const qty=ctx.int(p.qty,'Peças retornadas',1,10000);
  if(qty>a.qtySent-a.qtyReturned)
   throw Error('Retorno excede o saldo dessa facção, mesmo que outra facção ainda tenha peças.');
  if(order.returned+qty>order.allocated)
   throw Error('Retorno excede o total enviado para o pedido.');
  const product=byId(s.products,order.productId);
  if(!product)throw Error('Produto do pedido não encontrado.');
  const {gross,traveta,unit,agreementCommandId}=resolveRate(a,fac,product,s);
  if(!Number.isSafeInteger(unit)||unit<=0)
   throw Error('Preço líquido por peça não pode ser nulo ou negativo.');
  const amount=qty*unit;
  if(!Number.isSafeInteger(amount)||amount<=0)
   throw Error('Total do retorno inválido.');
  const id=ctx.next(s,'ACE');
  s.settlements.push({id,orderId:order.id,assignmentId:a.id,
   factionId:fac.id,productId:product.id,kind:'retorno',serviceType:'costura',
   qty,listUnitCents:gross,travetaCents:traveta,unitCents:unit,
   adjustmentCents:0,amountCents:amount,description:'Retorno por facção fictício',status:'aberto',
   ...(agreementCommandId?{rateAgreementCommandId:agreementCommandId}:{})});
  s.finance.push({id:ctx.next(s,'FIN'),kind:'pagar',sourceId:id,
   description:'Acerto fictício '+id,amountCents:amount,status:'aberto'});
  a.qtyReturned+=qty;
  order.returned+=qty;
  return id;
 }
 function canLegacyReturn(s,order){
  const rows=forOrder(s,order.id);
  if(rows.length>1)throw Error('Pedido com várias facções: selecione o envio correto em Retorno por facção.');
  return rows[0]||null;
 }
 function recordLegacyAllocation(s,order,fac,qty,ctx){
  const rows=forOrder(s,order.id);
  let row=rows.find(a=>a.factionId===fac.id);
  if(!row){
   if(rows.length)throw Error('Rotina simples não aceita várias facções; use Distribuir por facção.');
   row={id:ctx.next(s,'ALO'),orderId:order.id,factionId:fac.id,
    qtySent:0,qtyReturned:0,origin:'legado-local',createdCommandId:ctx.uid};
   s.factionAssignments.push(row);
  }
  row.qtySent+=qty;
 }
 function recordLegacyReturn(s,order,qty){
  const row=canLegacyReturn(s,order);
  if(!row||qty>row.qtySent-row.qtyReturned)
   throw Error('Saldo dessa facção insuficiente.');
  row.qtyReturned+=qty;
  return row.id;
 }
 function reassignLegacy(s,order,newFactionId,ctx){
  const rows=forOrder(s,order.id);
  if(rows.length!==1)throw Error('Transferência simples bloqueada: pedido já dividido entre facções.');
  if(rows[0].qtyReturned!==0)
   throw Error('Troca de facção bloqueada após qualquer retorno.');
  const row=rows[0];
  if(Array.isArray(row.rateAgreementHistory)&&row.rateAgreementHistory.length){
   if(!ctx?.uid)throw Error('Troca com tarifa negociada requer prova de comando.');
   row.rateAgreementHistory.push({mode:'reset',commandId:ctx.uid,factionId:newFactionId,
    reason:ctx.reason||'Troca de facção — usar tarifa do novo destino'});
  }
  row.factionId=newFactionId;
 }
 function reverseReturn(s,settlement,qty){
  if(!settlement.orderId)return;
  const rows=forOrder(s,settlement.orderId);
  const match=settlement.assignmentId?
   byId(rows,settlement.assignmentId):rows.find(a=>a.factionId===settlement.factionId);
  if(!match||match.qtyReturned<qty)
   throw Error('Devolução não confere com o retorno da facção original.');
  match.qtyReturned-=qty;
 }
 // Corrige um acerto em aberto sem recriar seu título nem mover peças.
 function reviseSettlement(s,p,ctx){
  const x=byId(s.settlements,p.id);
  if(!x||x.status!=='aberto')throw Error('Somente acerto em aberto pode ser corrigido.');
  const titles=s.finance.filter(t=>t.sourceId===x.id);
  const bill=titles[0];
  if(titles.length!==1||bill.kind!=='pagar'||bill.status!=='aberto'||
     bill.amountCents!==x.amountCents||
     (s.paymentBatches||[]).some(b=>b.items?.some(i=>i.financeId===bill.id))||
     (s.settlementCompensations||[]).some(c=>c.settlementId===x.id))
   throw Error('Título divergente ou pagamento anterior encontrado. Não corrigir diretamente.');
  const oldFaction=byId(s.factions,x.factionId);
  const target=byId(s.factions,p.factionId||x.factionId);
  if(!target||!oldFaction)throw Error('Facção ou embaladeira não localizada.');
  if(target.id!==x.factionId&&target.serviceRole&&target.serviceRole!==x.serviceType)throw Error('Prestador incompatível com o serviço.');
  if(x.serviceQuote)throw Error('Acerto por tarifa/pontos: correção de preço exige rotina específica; preserve a base original.');
  if(target.id!==x.factionId&&(x.kind!=='avulso'||x.orderId||x.assignmentId||x.gradeTracked))
   throw Error('Acerto vinculado a retorno físico: use a rotina de transferência, não troque a facção do acerto.');
  const gross=ctx.int(p.unitCents,'Valor bruto por peça',1,100000),
   discount=ctx.int(p.travetaCents,'Desconto por peça',0,100000);
  if(discount>=gross)throw Error('A travetada não pode zerar ou superar a mão de obra.');
  const reason=String(p.reason??'').trim();
  if(!reason||reason.length>95)throw Error('Justificativa obrigatória (até 95 caracteres).');
  const snapshot=()=>({factionId:x.factionId,listUnitCents:x.listUnitCents??x.unitCents,
   travetaCents:x.travetaCents||0,unitCents:x.unitCents,qty:x.qty,
   adjustmentCents:x.adjustmentCents||0,amountCents:x.amountCents});
  const before=snapshot(),after={...before,factionId:target.id,listUnitCents:gross,
   travetaCents:discount,unitCents:gross-discount,
   amountCents:x.qty*(gross-discount)+(x.adjustmentCents||0)};
  if(!Number.isSafeInteger(after.amountCents)||after.amountCents<=0)
   throw Error('O novo total precisa ser positivo e válido.');
  if(before.factionId===after.factionId&&before.listUnitCents===gross&&
     before.travetaCents===discount)throw Error('Nenhuma alteração informada.');
  if(!validRateSnapshot(before))throw Error('Acerto original sem cálculo conciliado; conferir antes de corrigir.');
  x.factionId=after.factionId;x.listUnitCents=gross;x.travetaCents=discount;
  x.unitCents=after.unitCents;x.amountCents=after.amountCents;
  bill.amountCents=after.amountCents;
  if(!Array.isArray(x.rateHistory))x.rateHistory=[];
  x.rateHistory.push({commandId:ctx.uid,financeId:bill.id,reason,
   before,after,fromFactionName:oldFaction.name,toFactionName:target.name});
  return x.id+' · '+oldFaction.name+' → '+target.name+' · '+before.amountCents+
   ' → '+after.amountCents+' centavos · título '+bill.id;
 }
 function validRateSnapshot(x){
  return !!x&&typeof x.factionId==='string'&&
   Number.isSafeInteger(x.qty)&&x.qty>0&&
   Number.isSafeInteger(x.listUnitCents)&&x.listUnitCents>0&&
   Number.isSafeInteger(x.travetaCents)&&x.travetaCents>=0&&
   x.listUnitCents-x.travetaCents===x.unitCents&&x.unitCents>0&&
   Number.isSafeInteger(x.unitCents)&&Number.isSafeInteger(x.adjustmentCents)&&
   Number.isSafeInteger(x.amountCents)&&x.amountCents>0&&
   x.qty*x.unitCents+x.adjustmentCents===x.amountCents;
 }
 function inspectRateHistory(s){
  const problems=[],seen=new Set();
  for(const x of s.settlements){
   const history=Array.isArray(x.rateHistory)?x.rateHistory:[];
   const bill=s.finance.find(t=>t.sourceId===x.id&&t.kind==='pagar');
   let prior=null;
   for(const h of history){
    const b=h.before,a=h.after;
    const event=s.log.find(e=>e.commandId===h.commandId&&e.type==='settlement.revise');
    if(!event||seen.has(h.commandId)||!h.reason||!h.fromFactionName||!h.toFactionName||
       h.financeId!==bill?.id||!validRateSnapshot(b)||!validRateSnapshot(a)||
       !byId(s.factions,b?.factionId)||!byId(s.factions,a?.factionId)||
       b.qty!==a.qty||b.adjustmentCents!==a.adjustmentCents||
       (b.factionId!==a.factionId&&(x.kind!=='avulso'||x.orderId||x.assignmentId))||
       (prior&&(prior.factionId!==b.factionId||prior.listUnitCents!==b.listUnitCents||
         prior.travetaCents!==b.travetaCents)))
     problems.push(x.id+': histórico de correção de facção/mão de obra divergente');
    seen.add(h.commandId);prior=a;
   }
   if(prior&&(prior.factionId!==x.factionId||prior.listUnitCents!==x.listUnitCents||
      prior.travetaCents!==x.travetaCents||prior.unitCents!==x.unitCents||
      x.amountCents!==x.qty*x.unitCents+(x.adjustmentCents||0)))
    problems.push(x.id+': valores atuais sem correspondência com última correção');
  }
  for(const e of s.log.filter(x=>x.type==='settlement.revise'))
   if(!seen.has(e.commandId))problems.push('Correção '+e.commandId+': evento sem histórico de acerto');
  return problems;
 }
 function inspect(s){
  const issues=[],assignments=Array.isArray(s.factionAssignments)?s.factionAssignments:null;
  if(!assignments)return issues; // versão anterior do laboratório é válida sem reset.
  const ids=new Set(),pairs=new Set();
  for(const a of assignments){
   const pair=a.orderId+'|'+a.factionId,order=byId(s.orders,a.orderId);
   if(!a.id||ids.has(a.id)||pairs.has(pair)||!order||!byId(s.factions,a.factionId)||
      !Number.isSafeInteger(a.qtySent)||a.qtySent<1||
      !Number.isSafeInteger(a.qtyReturned)||a.qtyReturned<0||
      a.qtyReturned>a.qtySent)
    issues.push(String(a.id)+': envio por facção duplicado ou inválido');
   ids.add(a.id);pairs.add(pair);
  }
  const transferIds=new Set();
  for(const move of (s.factionPartialTransfers||[])){
   const from=byId(assignments,move.fromAssignmentId);
   const to=byId(assignments,move.toAssignmentId);
   if(!move.id||transferIds.has(move.id)||!from||!to||
      from.id===to.id||from.orderId!==move.orderId||to.orderId!==move.orderId||
      from.factionId!==move.fromFactionId||to.factionId!==move.toFactionId||
      from.factionId===to.factionId||
      !Number.isSafeInteger(move.qty)||move.qty<1||
      !Number.isSafeInteger(move.fromBefore)||!Number.isSafeInteger(move.fromAfter)||
      !Number.isSafeInteger(move.toBefore)||!Number.isSafeInteger(move.toAfter)||
      move.fromBefore-move.fromAfter!==move.qty||
      move.toAfter-move.toBefore!==move.qty||
      move.fromAfter<1||move.toBefore<0||
      !move.reason||!move.commandId||
      !s.log.some(e=>e.commandId===move.commandId&&['faction.multi.transfer','faction.grade.transfer'].includes(e.type)))
    issues.push(String(move.id)+': histórico de transferência parcial sem origem/destino ou saldo válido');
   transferIds.add(move.id);
  }
  for(const order of s.orders){
   const rows=forOrder(s,order.id);
   if(rows.reduce((n,a)=>n+a.qtySent,0)!==order.allocated||
      rows.reduce((n,a)=>n+a.qtyReturned,0)!==order.returned)
    issues.push(order.id+': saldos de facções divergentes do pedido');
   if(rows.length&&!rows.some(a=>a.factionId===order.factionId))
    issues.push(order.id+': facção principal do pedido não existe nos envios');
   for(const settlement of s.settlements.filter(x=>x.orderId===order.id)){
    const assignment=settlement.assignmentId?byId(rows,settlement.assignmentId):
     rows.find(x=>x.factionId===settlement.factionId);
    if(!assignment||assignment.factionId!==settlement.factionId)
     issues.push(settlement.id+': acerto sem envio correspondente à facção');
   }
   for(const row of rows){
    const returned=s.settlements.filter(x=>x.orderId===order.id&&
     x.factionId===row.factionId).reduce((n,x)=>n+x.qty,0);
    if(row.qtyReturned!==returned)
     issues.push(row.id+': retorno não corresponde aos acertos dessa facção');
   }
  }
  return issues;
 }
 return Object.freeze({version:'1.1.0',ensure,forOrder,allocation,transfer,ret,
  canLegacyReturn,recordLegacyAllocation,recordLegacyReturn,
  reassignLegacy,reverseReturn,inspect,reviseSettlement,inspectRateHistory,resolveRate,setAssignmentRate,inspectAssignmentRates});
});

;
/* modulos/grade-faccoes-v1.js */
/* HLGB Evolução — Grade por cor e tamanho nas facções (LAB FICTÍCIO).
 * Transações apenas no clone core.apply; sem rede, IndexedDB próprio ou banco de produção.
 * Grade antiga sem cor continua funcionando; classificação exige opt-in antes do primeiro envio.
 */
(function(root,factory){
 'use strict';
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.HLGBLabFactionGradeV1=api;
})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 const sizes=['P','M','G','GG'],byId=(rows,id)=>rows.find(x=>x.id===id);
 const sum=o=>Object.values(o).reduce((n,v)=>n+v,0);
 const normalize=x=>String(x||'').trim().toLocaleLowerCase('pt-BR');
 const colorName=raw=>{
  const color=String(raw||'').trim().replace(/\s+/g,' ');
  if(color.length<2||color.length>40||!/^[\p{L}\p{N} .-]+$/u.test(color))
   throw Error('Cor inválida: use nome de 2 a 40 caracteres, sem símbolos.');
  return color;
 };
 const validQty=(n,max=10000)=>Number.isSafeInteger(n)&&n>=0&&n<=max;
 const hasGrade=o=>Array.isArray(o.colorGrades)&&o.colorGrades.length>0;
 function colorRow(order,raw){
  return (order.colorGrades||[]).find(x=>normalize(x.color)===normalize(raw));
 }
 function makeSummary(order){
  const remaining=Object.fromEntries(sizes.map(sz=>[sz,order.grade[sz]]));
  for(const row of order.colorGrades||[])for(const sz of sizes)
   remaining[sz]-=row.grade[sz];
  return {configured:hasGrade(order),complete:hasGrade(order)&&
   sizes.every(sz=>remaining[sz]===0),remaining};
 }
 function setColor(s,p,ctx){
  const order=byId(s.orders,p.orderId);
  if(!order)throw Error('Pedido não localizado para cadastrar as cores.');
  if(order.allocated>0||s.settlements.some(x=>x.orderId===order.id))
   throw Error('Grade por cor deve ser cadastrada antes do primeiro envio; saldos antigos protegidos.');
  const color=colorName(p.color);
  const grade={};
  for(const size of sizes){
   const q=Number(p.grade?.[size]);
   if(!validQty(q))throw Error('Quantidade inválida para '+size+'.');
   grade[size]=q;
  }
  if(!Array.isArray(order.colorGrades))order.colorGrades=[];
  const existing=colorRow(order,color);
  const others=order.colorGrades.filter(x=>x!==existing);
  for(const size of sizes){
   const used=others.reduce((n,x)=>n+x.grade[size],0);
   if(used+grade[size]>order.grade[size])
    throw Error('Cores ultrapassam a grade do pedido no tamanho '+size+'.');
  }
  if(existing){
   if(sum(grade)===0)order.colorGrades=others;
   else {existing.color=color;existing.grade=grade}
  }else{
   if(sum(grade)===0)throw Error('Nova cor precisa ter pelo menos uma peça.');
   order.colorGrades.push({color,grade});
  }
  return order.id+' · '+color+' · '+sum(grade)+' peças classificadas';
 }
 function requireReady(order){
  if(!makeSummary(order).complete)
   throw Error('Complete a grade de todas as cores e tamanhos do pedido antes de enviar.');
 }
 function key(row,color,size){return row.color===color&&row.size===size}
 function gradeLine(row,color,size){
  return (row.gradeLines||[]).find(x=>key(x,color,size));
 }
 function need(s,p,ctx,assignment){
  const order=byId(s.orders,assignment.orderId);
  if(!order)throw Error('Pedido do envio não encontrado.');
  requireReady(order);
  const color=colorName(p.color),colorDef=colorRow(order,color),size=String(p.size||'');
  if(!sizes.includes(size)||!colorDef)throw Error('Cor ou tamanho não cadastrado na grade deste pedido.');
  const qty=ctx.int(p.qty,'Quantidade de cor/tamanho',1,10000);
  return {order,color:colorDef.color,size,qty};
 }
 function allocate(s,p,ctx,routing){
  const order=byId(s.orders,p.orderId),fac=byId(s.factions,p.factionId);
  if(!order||!fac)throw Error('Pedido ou facção inválidos.');
  requireReady(order);
  const size=String(p.size||''),def=colorRow(order,colorName(p.color));
  if(!sizes.includes(size)||!def)throw Error('Cor ou tamanho não cadastrado.');
  const qty=ctx.int(p.qty,'Peças do envio por cor/tamanho',1,10000);
  const assignments=(s.factionAssignments||[]).filter(x=>x.orderId===order.id);
  const already=assignments.flatMap(x=>x.gradeLines||[])
   .filter(x=>x.color===def.color&&x.size===size)
   .reduce((n,x)=>n+x.sent,0);
  if(already+qty>def.grade[size])
   throw Error('Envio excede a quantidade prevista desta cor e tamanho.');
  const sentSize=assignments.flatMap(x=>x.gradeLines||[]).filter(x=>x.size===size)
   .reduce((n,x)=>n+x.sent,0);
  if(sentSize+qty>order.cut[size])
   throw Error('Envio por tamanho excede o corte registrado de '+size+'.');
  routing.allocation(s,{orderId:order.id,factionId:fac.id,qty},ctx);
  const row=s.factionAssignments.find(x=>x.orderId===order.id&&x.factionId===fac.id);
  if(!row.gradeLines)row.gradeLines=[];
  let line=gradeLine(row,def.color,size);
  if(!line){line={color:def.color,size,sent:0,returned:0};row.gradeLines.push(line)}
  line.sent+=qty;
  return row.id+' · '+def.color+' '+size+' · '+qty+' peças → '+fac.name;
 }
 function ret(s,p,ctx,routing){
  const row=byId(s.factionAssignments||[],p.assignmentId);
  if(!row)throw Error('Envio específico não localizado.');
  const d=need(s,p,ctx,row),line=gradeLine(row,d.color,d.size);
  if(!line||d.qty>line.sent-line.returned)
   throw Error('Retorno excede o saldo pendente desta cor e tamanho na facção.');
  const id=routing.ret(s,{assignmentId:row.id,qty:d.qty},ctx);
  line.returned+=d.qty;
  const settlement=byId(s.settlements,id);
  settlement.color=d.color;settlement.size=d.size;settlement.gradeTracked=true;
  return id+' · '+d.color+' '+d.size+' · '+d.qty+' peças';
 }
 function transfer(s,p,ctx,routing){
  const from=byId(s.factionAssignments||[],p.fromAssignmentId);
  if(!from)throw Error('Envio de origem não localizado.');
  const d=need(s,p,ctx,from),line=gradeLine(from,d.color,d.size);
  if(!line||d.qty>line.sent-line.returned)
   throw Error('Transferência excede saldo pendente desta cor e tamanho.');
  const moveRef=routing.transfer(s,{fromAssignmentId:from.id,toFactionId:p.toFactionId,
   qty:d.qty,reason:p.reason},ctx);
  const move=s.factionPartialTransfers.at(-1);
  const to=byId(s.factionAssignments,move.toAssignmentId);
  line.sent-=d.qty;
  if(line.sent===0&&line.returned===0)
   from.gradeLines=from.gradeLines.filter(x=>x!==line);
  if(!to.gradeLines)to.gradeLines=[];
  let target=gradeLine(to,d.color,d.size);
  if(!target){target={color:d.color,size:d.size,sent:0,returned:0};to.gradeLines.push(target)}
  target.sent+=d.qty;
  move.color=d.color;move.size=d.size;move.gradeTracked=true;
  return moveRef+' · '+d.color+' '+d.size;
 }
 function reverse(s,p,ctx,routing){
  const settlement=byId(s.settlements,p.id);
  if(!settlement||!settlement.gradeTracked)
   throw Error('Acerto de grade por cor/tamanho não localizado.');
  const order=byId(s.orders,settlement.orderId);
  const row=byId(s.factionAssignments||[],settlement.assignmentId);
  if(!order||!row)throw Error('Pedido ou envio do acerto não localizado.');
  if(settlement.status!=='aberto')throw Error('Não é permitido devolver peças após pagamento.');
  const bill=s.finance.find(x=>x.sourceId===settlement.id&&x.kind==='pagar');
  if(!bill||bill.status!=='aberto')throw Error('Título quitado impede devolução direta.');
  const qty=ctx.int(p.qty,'Peças devolvidas',1,10000);
  if(qty>=settlement.qty)throw Error('Devolução integral exige correção formal.');
  if(order.returned-qty<order.separated)
   throw Error('Devolução ultrapassa peças ainda não separadas.');
  const line=gradeLine(row,settlement.color,settlement.size);
  if(!line||line.returned<qty)throw Error('Grade do retorno não conciliada com a facção.');
  const newQty=settlement.qty-qty,
   newAmount=newQty*settlement.unitCents+settlement.adjustmentCents;
  if(newAmount<=0)throw Error('Devolução deixaria valor inválido.');
  const reason=String(p.reason||'').trim();
  if(!reason||reason.length>95)throw Error('Justificativa da devolução obrigatória.');
  routing.reverseReturn(s,settlement,qty);
  order.returned-=qty;line.returned-=qty;
  const before=settlement.amountCents,old=settlement.qty;
  settlement.qty=newQty;settlement.amountCents=newAmount;
  if(!Array.isArray(settlement.returns))settlement.returns=[];
  settlement.returns.push({commandId:ctx.uid,qty,reason,beforeQty:old,afterQty:newQty,
   beforeCents:before,afterCents:newAmount,color:settlement.color,size:settlement.size});
  bill.amountCents=newAmount;
  return settlement.id+' · '+old+' → '+newQty+' · '+settlement.color+' '+settlement.size;
 }
 function inspect(s){
  const problems=[];
  for(const order of s.orders){
   if(!hasGrade(order))continue;
   const names=new Set(),counts=Object.fromEntries(sizes.map(sz=>[sz,0]));
   for(const row of order.colorGrades){
    if(typeof row.color!=='string'||!row.color.trim()||names.has(normalize(row.color))||
       !row.grade||sizes.some(sz=>!validQty(row.grade[sz])))
     problems.push(order.id+': cor duplicada ou grade inválida');
    names.add(normalize(row.color));
    for(const sz of sizes)counts[sz]+=Number(row.grade?.[sz]||0);
   }
   if(sizes.some(sz=>counts[sz]>order.grade[sz]))
    problems.push(order.id+': quantidade de cores ultrapassa pedido');
   const assignments=(s.factionAssignments||[]).filter(x=>x.orderId===order.id);
   if(order.allocated>0&&sizes.some(sz=>counts[sz]!==order.grade[sz]))
    problems.push(order.id+': grade por cor incompleta com peças enviadas');
   for(const assignment of assignments){
    const lines=assignment.gradeLines;
    if(!Array.isArray(lines)){
     problems.push(assignment.id+': envio sem classificação de cor/tamanho');continue;
    }
    const keys=new Set();
    for(const l of lines){
     const k=normalize(l.color)+'|'+l.size,def=colorRow(order,l.color);
     if(keys.has(k)||!def||!sizes.includes(l.size)||
       !validQty(l.sent)||!validQty(l.returned)||l.sent<l.returned||
       !l.sent||normalize(l.color)!==normalize(def.color))
      problems.push(assignment.id+': linha cor/tamanho duplicada ou inválida');
     keys.add(k);
    }
    if(lines.reduce((n,l)=>n+l.sent,0)!==assignment.qtySent||
       lines.reduce((n,l)=>n+l.returned,0)!==assignment.qtyReturned)
     problems.push(assignment.id+': totais cor/tamanho não conferem com envio/retorno');
   }
   for(const sz of sizes){
    const sent=assignments.flatMap(a=>a.gradeLines||[]).filter(l=>l.size===sz)
     .reduce((n,l)=>n+l.sent,0);
    if(sent>order.cut[sz])problems.push(order.id+': peças alocadas excedem corte do tamanho '+sz);
   }
   for(const row of order.colorGrades)for(const sz of sizes){
    const sent=assignments.flatMap(a=>a.gradeLines||[])
     .filter(l=>l.color===row.color&&l.size===sz).reduce((n,l)=>n+l.sent,0);
    if(sent>row.grade[sz])problems.push(order.id+': enviados excedem '+row.color+' '+sz);
   }
   for(const settlement of s.settlements.filter(x=>x.orderId===order.id)){
    if(!settlement.gradeTracked||!colorRow(order,settlement.color)||
       !sizes.includes(settlement.size))
     problems.push(settlement.id+': acerto sem cor/tamanho rastreável');
   }
   for(const assignment of assignments)for(const line of assignment.gradeLines||[]){
    const count=s.settlements.filter(x=>x.assignmentId===assignment.id&&
     x.color===line.color&&x.size===line.size).reduce((n,x)=>n+x.qty,0);
    if(count!==line.returned)
     problems.push(assignment.id+': retorno por cor/tamanho diverge dos acertos '+line.color+' '+line.size);
   }
   for(const m of (s.factionPartialTransfers||[]).filter(x=>x.orderId===order.id)){
    if(!m.gradeTracked||!colorRow(order,m.color)||!sizes.includes(m.size))
     problems.push(m.id+': transferência sem cor/tamanho identificável');
   }
  }
  return problems;
 }
 return Object.freeze({version:'1.0.0',sizes,hasGrade,makeSummary,setColor,allocate,ret,transfer,reverse,inspect});
});

;
/* modulos/planejamento-materiais-v1.js */
/* HLGB Evolução — paleta e planejamento de materiais V1, somente LAB FICTÍCIO.
 * Sem rede, IndexedDB próprio, baixas de estoque ou geração de contas. Um único
 * escritor transacional continua em operacao-integrada-core.js.
 */
(function(root,factory){
 'use strict';
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.HLGBLabMaterialsPlannerV1=api;
})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 const sizes=['P','M','G','GG'],all='*',baseColors=['Preto','Branco','Rubi'];
 const byId=(list,id)=>list.find(x=>x.id===id);
 const key=x=>String(x??'').trim().toLocaleUpperCase('pt-BR');
 const colorName=value=>{
  const c=String(value??'').trim().replace(/\s+/g,' ');
  if(c.length<2||c.length>40||!/^[\p{L}\p{N} .-]+$/u.test(c))
   throw Error('Nome de cor deve ter 2 a 40 caracteres e não pode conter símbolos.');
  return c;
 };
 const safe=(n,min,max,label)=>{
  if(!Number.isSafeInteger(n)||n<min||n>max)throw Error(label+' inválido; informe inteiro entre '+min+' e '+max+'.');
  return n;
 };
 const reason=value=>{
  const r=String(value??'').trim();
  if(!r||r.length>95)throw Error('Justificativa obrigatória (até 95 caracteres).');
  return r;
 };
 const seed=()=>baseColors.map((name,i)=>({id:'CLR-'+String(i+1).padStart(4,'0'),
  name,origin:'paleta-ficticia',createdCommandId:null}));
 function ensure(s){
  if(!Array.isArray(s.colorCatalog)){
   s.colorCatalog=seed();
   s.ids.CLR=Math.max(s.ids.CLR||0,3);
  }
  s.ids.CLR=Math.max(s.ids.CLR||0,...s.colorCatalog.map(x=>{
   const m=/^CLR-(\d+)$/.exec(x.id||'');
   return m?Number(m[1]):0;
  }));
  if(!Array.isArray(s.materialRecipeRules))s.materialRecipeRules=[];
  if(!Array.isArray(s.materialPlanLines))s.materialPlanLines=[];
 }
 function palette(s){return Array.isArray(s.colorCatalog)?s.colorCatalog:seed()}
 function registerColor(s,p,ctx){
  ensure(s);const name=colorName(p.name);
  if(s.colorCatalog.some(x=>key(x.name)===key(name)))
   throw Error('Cor já cadastrada; selecione o cadastro existente.');
  const item={id:ctx.next(s,'CLR'),name,origin:'cadastro-lab',
   createdCommandId:ctx.uid};
  s.colorCatalog.push(item);
  return item.id+' · '+name;
 }
 function validateVariant(s,p){
  const product=byId(s.products,p.productId);
  if(!product)throw Error('Modelo da ficha técnica não localizado.');
  const material=byId(s.materials,p.materialId);
  if(!material)throw Error('Material da ficha técnica não localizado.');
  const color=String(p.color||all),size=String(p.size||all);
  if(color!==all&&!palette(s).some(x=>key(x.name)===key(color)))
   throw Error('Cor não está na paleta central. Cadastre-a primeiro.');
  if(size!==all&&!sizes.includes(size))throw Error('Tamanho inválido na receita.');
  const canonical=color===all?all:palette(s).find(x=>key(x.name)===key(color)).name;
  return {product,material,color:canonical,size};
 }
 function setRecipe(s,p,ctx){
  ensure(s);const v=validateVariant(s,p),grams=safe(p.gramsPerUnit,1,5000,'Consumo por peça'),
   why=reason(p.reason);
  const old=s.materialRecipeRules.find(x=>x.active&&x.productId===v.product.id&&
   x.materialId===v.material.id&&x.color===v.color&&x.size===v.size);
  // Histórico conservado: inativa a versão anterior, nunca a exclui.
  if(old){old.active=false;old.supersededCommandId=ctx.uid}
  const item={id:ctx.next(s,'RCP'),productId:v.product.id,
   materialId:v.material.id,color:v.color,size:v.size,gramsPerUnit:grams,
   reason:why,active:true,supersedes:old?.id||null,createdCommandId:ctx.uid};
  s.materialRecipeRules.push(item);
  return item.id+' · '+v.product.name+' · '+v.material.name+' · '+
   v.color+' '+v.size+' · '+grams+' g/peça (apenas previsão)';
 }
 function lineAdd(s,p,ctx){
  ensure(s);const product=byId(s.products,p.productId);
  if(!product)throw Error('Modelo para o planejamento não localizado.');
  const color=String(p.color||'');
  const registered=palette(s).find(x=>key(x.name)===key(color));
  if(!registered)throw Error('Selecione uma cor da paleta cadastrada.');
  if(!sizes.includes(p.size))throw Error('Selecione P, M, G ou GG.');
  const qty=safe(p.qty,1,10000,'Quantidade planejada');
  if(s.materialPlanLines.filter(x=>x.active).length>=100)
   throw Error('Limite de 100 linhas ativas; arquive linhas concluídas antes de continuar.');
  if(s.materialPlanLines.some(x=>x.active&&x.productId===product.id&&
   key(x.color)===key(registered.name)&&x.size===p.size))
   throw Error('Modelo/cor/tamanho já existe no planejamento. Arquive a linha para substituí-la.');
  const item={id:ctx.next(s,'PLN'),productId:product.id,color:registered.name,
   size:p.size,qty,active:true,createdCommandId:ctx.uid};
  s.materialPlanLines.push(item);
  return item.id+' · '+product.name+' · '+item.color+' '+item.size+' · '+qty+
   ' peças (sem baixar estoque)';
 }
 function gradeAdd(s,p,ctx){
  ensure(s);
  const product=byId(s.products,p.productId);
  if(!product)throw Error('Modelo para o planejamento não localizado.');
  const entry=palette(s).find(x=>key(x.name)===key(p.color));
  if(!entry)throw Error('Selecione uma cor da paleta cadastrada.');
  if(!p.grade||typeof p.grade!=='object')throw Error('Grade de planejamento ausente.');
  const portions=sizes.map(size=>({size,qty:safe(p.grade[size],0,10000,
   'Quantidade planejada '+size)})).filter(x=>x.qty>0);
  if(!portions.length)throw Error('Informe pelo menos uma peça na grade planejada.');
  if(s.materialPlanLines.filter(x=>x.active).length+portions.length>100)
   throw Error('Limite de 100 linhas ativas; arquive as linhas anteriores.');
  for(const x of portions){
   if(s.materialPlanLines.some(item=>item.active&&item.productId===product.id&&
      key(item.color)===key(entry.name)&&item.size===x.size))
    throw Error('Modelo/cor/tamanho já existe no planejamento: '+product.name+
     ' · '+entry.name+' '+x.size);
  }
  // Validação de TODAS as linhas acontece antes da primeira inclusão no clone.
  const ids=[];
  for(const x of portions){
   const item={id:ctx.next(s,'PLN'),productId:product.id,color:entry.name,
    size:x.size,qty:x.qty,active:true,createdCommandId:ctx.uid};
   s.materialPlanLines.push(item);ids.push(item.id);
  }
  return ids.join(', ')+' · '+product.name+' '+entry.name+' · '+
   portions.reduce((n,x)=>n+x.qty,0)+' peças em '+portions.length+
   ' tamanho(s) · sem movimentar estoque';
 }
 function lineCancel(s,p,ctx){
  ensure(s);const item=byId(s.materialPlanLines,p.id);
  if(!item||!item.active)throw Error('Linha inexistente ou já arquivada.');
  item.active=false;item.cancelReason=reason(p.reason);item.cancelCommandId=ctx.uid;
  return item.id+' · arquivada com histórico, sem excluir a linha';
 }
 function bestRule(rules,productId,materialId,color,size){
  let best=null,score=-1;
  for(const r of rules){
   if(!r.active||r.productId!==productId||r.materialId!==materialId)continue;
   if(r.color!==all&&key(r.color)!==key(color))continue;
   if(r.size!==all&&r.size!==size)continue;
   const rank=(r.color===all?0:2)+(r.size===all?0:1);
   if(rank>score){best=r;score=rank}
  }
  return best;
 }
 function preview(s){
  // Puro: mesmo em documentos anteriores, não executa migração nem cria linhas.
  const rules=(s.materialRecipeRules||[]).filter(x=>x.active),
   lines=(s.materialPlanLines||[]).filter(x=>x.active);
  const detail=[],group=new Map(),byProduct=new Map();
  for(const line of lines){
   const product=byId(s.products,line.productId);
   if(!product||!sizes.includes(line.size)||!Number.isSafeInteger(line.qty)||line.qty<1)
    throw Error('Linha de planejamento inconsistente; confira o ID '+String(line.id));
   const materialIds=new Set([product.materialId,...rules.filter(x=>x.productId===product.id)
    .map(x=>x.materialId)]);
   let lineGrams=0;
   for(const materialId of materialIds){
    const material=byId(s.materials,materialId);
    if(!material)throw Error('Material da receita não encontrado: '+materialId);
    const r=bestRule(rules,product.id,materialId,line.color,line.size);
    const perPiece=r?r.gramsPerUnit:materialId===product.materialId?product.gramsPerUnit:0;
    if(!Number.isSafeInteger(perPiece)||perPiece<0||perPiece>5000)
     throw Error('Consumo da ficha técnica inválido para '+product.id);
    if(!perPiece)continue;
    const grams=line.qty*perPiece;
    if(!Number.isSafeInteger(grams))throw Error('Previsão maior que limite seguro.');
    lineGrams+=grams;
    detail.push({lineId:line.id,productId:product.id,productName:product.name,
     sku:product.sku,color:line.color,size:line.size,qty:line.qty,
     materialId,materialName:material.name,gramsPerUnit:perPiece,
     requiredGrams:grams,ruleId:r?.id||'ficha-basica'});
    group.set(materialId,(group.get(materialId)||0)+grams);
   }
   const g=byProduct.get(product.id)||{productId:product.id,name:product.name,
    sku:product.sku,lines:0,pieces:0,requiredGrams:0};
   g.lines++;g.pieces+=line.qty;g.requiredGrams+=lineGrams;
   byProduct.set(product.id,g);
  }
  const materials=[...group].map(([id,requiredGrams])=>{
   const mat=byId(s.materials,id),availableGrams=mat.stockGrams,
    missingGrams=Math.max(0,requiredGrams-availableGrams),
    costCents=Math.ceil(requiredGrams*mat.priceCentsKg/1000),
    purchaseCents=Math.ceil(missingGrams*mat.priceCentsKg/1000);
   return {materialId:id,name:mat.name,requiredGrams,availableGrams,
    missingGrams,priceCentsKg:mat.priceCentsKg,costCents,purchaseCents,
    action:missingGrams?'compra_sugerida':'estoque_suficiente'};
  }).sort((a,b)=>b.missingGrams-a.missingGrams||a.name.localeCompare(b.name));
  return {schema:'hlgb-lab-planejamento-materiais-v1',version:'1.0.0',
   scope:'producao_nova_hipotetica',stockWritten:false,
   purchaseCreated:false,realData:false,lines:lines.length,
   pieces:lines.reduce((n,x)=>n+x.qty,0),
   requiredGrams:materials.reduce((n,x)=>n+x.requiredGrams,0),
   estimatedCostCents:materials.reduce((n,x)=>n+x.costCents,0),
   missingCostCents:materials.reduce((n,x)=>n+x.purchaseCents,0),
   products:[...byProduct.values()].sort((a,b)=>a.name.localeCompare(b.name)),
   materials,detail};
 }
 function inspect(s){
  const issues=[],catalog=palette(s),colors=new Set(),rules=s.materialRecipeRules||[],
   plans=s.materialPlanLines||[],ruleKeys=new Set(),activeLines=new Set();
  for(const c of catalog){
   const k=key(c.name);
   try{colorName(c.name)}catch{issues.push(String(c.id)+': nome de cor inválido')}
   if(colors.has(k))issues.push(String(c.id)+': cor repetida no catálogo');
   colors.add(k);
  }
  for(const r of rules){
   const k=[r.productId,r.materialId,key(r.color),r.size].join('|');
   if(r.active&&ruleKeys.has(k))issues.push(String(r.id)+': regra ativa duplicada');
   if(r.active)ruleKeys.add(k);
   if(!byId(s.products,r.productId)||!byId(s.materials,r.materialId)||
    r.color!==all&&!catalog.some(x=>key(x.name)===key(r.color))||
    r.size!==all&&!sizes.includes(r.size)||
    !Number.isSafeInteger(r.gramsPerUnit)||r.gramsPerUnit<1||r.gramsPerUnit>5000||
    typeof r.active!=='boolean'||!r.reason||
    !s.log.some(e=>e.commandId===r.createdCommandId&&e.type==='material.recipe.set'))
    issues.push(String(r.id)+': receita sem origem, produto, material ou consumo válido');
  }
  for(const x of plans){
   const k=[x.productId,key(x.color),x.size].join('|');
   if(x.active&&activeLines.has(k))issues.push(String(x.id)+': planejamento duplicado');
   if(x.active)activeLines.add(k);
   if(!byId(s.products,x.productId)||!catalog.some(c=>key(c.name)===key(x.color))||
    !sizes.includes(x.size)||!Number.isSafeInteger(x.qty)||x.qty<1||x.qty>10000||
    typeof x.active!=='boolean'||
    !s.log.some(e=>e.commandId===x.createdCommandId&&['materials.plan.add','materials.plan.grade.add'].includes(e.type))||
    (!x.active&&!s.log.some(e=>e.commandId===x.cancelCommandId&&e.type==='materials.plan.archive')))
    issues.push(String(x.id)+': linha de planejamento sem origem ou valor válido');
  }
  return issues;
 }
 return Object.freeze({version:'1.0.0',seed,ensure,palette,registerColor,setRecipe,lineAdd,gradeAdd,
  lineCancel,preview,inspect});
});

;
/* modulos/corte-bom-v1.js */
/* HLGB Evolução — Corte BOM multimatéria, SÓ LAB FICTÍCIO.
 * Planejar/validar é puro. A execução afeta SOMENTE o clone do core.apply.
 * Não se conecta a produção, não grava no banco e não possui APIs externas.
 */
(function(root,factory){
 'use strict';
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.HLGBLabBomCutV1=api;
})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 const sizes=['P','M','G','GG'],sum=x=>Object.values(x).reduce((a,b)=>a+b,0);
 const byId=(rows,id)=>rows.find(x=>x.id===id);
 const norm=x=>String(x??'').trim().toLocaleUpperCase('pt-BR');
 function title(x,label){
  const t=String(x??'').trim();
  if(!t||t.length>95)throw Error(label+' obrigatório (até 95 caracteres).');
  return t;
 }
 const integer=(x,label,min=0,max=1000000)=>{
  if(!Number.isSafeInteger(x)||x<min||x>max)
   throw Error(label+' deve ser inteiro entre '+min+' e '+max+'.');
  return x;
 };
 function preview(s,p,planner){
  if(!planner||typeof planner.preview!=='function')
   throw Error('Ficha técnica de materiais indisponível; nenhuma baixa autorizada.');
  const order=byId(s.orders,p.orderId);
  if(!order)throw Error('Pedido de corte não encontrado.');
  const product=byId(s.products,order.productId);
  if(!product)throw Error('Modelo do pedido não encontrado.');
  const size=String(p.size||'');
  if(!sizes.includes(size))throw Error('Tamanho inválido para o corte.');
  const color=String(p.color||'').trim();
  const colors=Array.isArray(order.colorGrades)?order.colorGrades:[];
  const variant=colors.find(x=>norm(x.color)===norm(color));
  if(!variant||!color)throw Error('Cadastre a cor na grade do pedido antes de cortar pelo BOM.');
  if(!sizes.every(z=>colors.reduce((n,c)=>n+c.grade[z],0)===order.grade[z]))
   throw Error('Grade de cores incompleta. Complete P/M/G/GG antes de cortar.');
  const qty=integer(p.qty,'Quantidade de peças',1,10000);
  const runs=s.bomCutRuns||[];
  const prior=runs.filter(x=>x.orderId===order.id);
  const bySize=Object.fromEntries(sizes.map(sz=>[
   sz,prior.filter(r=>r.size===sz).reduce((n,r)=>n+r.qty,0)]));
  if(sizes.some(sz=>order.cut[sz]!==bySize[sz]))
   throw Error('Pedido já possui corte na rotina anterior. Não misture dois tipos de baixa.');
  if((s.cutPlans||[]).some(x=>x.orderId===order.id&&x.status==='aberto'))
   throw Error('Existe folha de corte aberta para este pedido. Cancele ou conclua antes de escolher o novo modo.');
  const previously=prior.filter(x=>x.color===variant.color&&x.size===size)
   .reduce((n,x)=>n+x.qty,0);
  if(previously+qty>variant.grade[size])
   throw Error('Corte excede a grade desta cor e tamanho.');
  if(order.cut[size]+qty>order.grade[size])
   throw Error('Corte excede a grade total do pedido.');
  // Calcula um lote temporário sem tocar nas linhas do planejamento semanal.
  const hypothetical={...s,materialPlanLines:[
   {id:'BOM-QUOTE',productId:product.id,color:variant.color,size,qty,active:true}
  ]};
  const quote=planner.preview(hypothetical);
  if(!quote.detail.length)throw Error('Nenhum material definido na ficha técnica desta variação.');
  const scrap=p.scrapByMaterial||{};
  if(!scrap||typeof scrap!=='object'||Array.isArray(scrap))
   throw Error('Desperdício por material inválido.');
  const ids=new Set(quote.detail.map(x=>x.materialId));
  for(const [id,weight] of Object.entries(scrap)){
   integer(weight,'Desperdício de '+id);
   if(weight>0&&!ids.has(id))
    throw Error('Desperdício informado para material que não faz parte desta ficha: '+id);
  }
  const materials=quote.detail.map(d=>{
   const material=byId(s.materials,d.materialId);
   const scrapGrams=integer(scrap[d.materialId]??0,'Desperdício de '+material.name);
   const totalGrams=d.requiredGrams+scrapGrams;
   if(!Number.isSafeInteger(totalGrams)||totalGrams>1000000)
    throw Error('Peso total do material fora do limite permitido.');
   return {
    materialId:material.id,materialName:material.name,ruleId:d.ruleId,
    gramsPerUnit:d.gramsPerUnit,requiredGrams:d.requiredGrams,scrapGrams,
    totalGrams,availableGrams:material.stockGrams,
    afterGrams:material.stockGrams-totalGrams,
    theoreticalCostCents:Math.ceil(totalGrams*material.priceCentsKg/1000),
    priceCentsKg:material.priceCentsKg
   };
  });
  const subtotal=materials.reduce((n,x)=>n+x.totalGrams,0);
  if(!Number.isSafeInteger(subtotal)||subtotal<=0)
   throw Error('Consumo do lote inválido.');
  return {schema:'hlgb-lab-corte-bom-preview-v1',orderId:order.id,
   productId:product.id,productName:product.name,color:variant.color,size,qty,
   materials,materialCount:materials.length,totalGrams:subtotal,
   estimatedCostCents:materials.reduce((n,x)=>n+x.theoreticalCostCents,0),
   canExecute:materials.every(x=>x.afterGrams>=0),
   stockWritten:false,stocksBefore:materials.map(x=>({id:x.materialId,grams:x.availableGrams}))};
 }
 function execute(s,p,ctx,planner){
  const calc=preview(s,p,planner);
  if(!calc.canExecute)
   throw Error('Estoque insuficiente para os materiais: '+
    calc.materials.filter(x=>x.afterGrams<0).map(x=>
     x.materialName+' (faltam '+(-x.afterGrams)+' g)').join(', ')+
    '. Nenhum material foi baixado.');
  if(!['interno','externo'].includes(p.workMode))
   throw Error('Escolha corte interno ou externo.');
  const cutterOne=title(p.cutterOne,'Cortador 1'),cutterTwo=title(p.cutterTwo,'Cortador 2'),
   spreader=title(p.spreader,'Enfestador'),signatureOne=title(p.signatureOne,'Conferência 1'),
   signatureTwo=title(p.signatureTwo,'Conferência 2');
  if(norm(cutterOne)===norm(cutterTwo))
   throw Error('Os dois cortadores devem ser diferentes.');
  if(norm(signatureOne)!==norm(cutterOne)||norm(signatureTwo)!==norm(cutterTwo))
   throw Error('As conferências devem coincidir com os dois cortadores do lote.');
  const reason=title(p.reason,'Justificativa do lote');
  // Nenhuma mutação começa antes de validar TODOS os insumos e as conferências.
  const order=byId(s.orders,calc.orderId);
  const record={id:ctx.next(s,'BOM'),orderId:calc.orderId,productId:calc.productId,
   color:calc.color,size:calc.size,qty:calc.qty,workMode:p.workMode,
   cutterOne,cutterTwo,spreader,signatureOne,signatureTwo,reason,
   commandId:ctx.uid,completed:true,totalGrams:calc.totalGrams,
   estimatedCostCents:calc.estimatedCostCents,
   materials:calc.materials.map(({materialId,ruleId,gramsPerUnit,
    requiredGrams,scrapGrams,totalGrams,priceCentsKg,theoreticalCostCents})=>
    ({materialId,ruleId,gramsPerUnit,requiredGrams,scrapGrams,totalGrams,
     priceCentsKg,theoreticalCostCents}))};
  for(const c of calc.materials){
   const mat=byId(s.materials,c.materialId);
   mat.stockGrams-=c.totalGrams;
   s.stockLedger.push({id:ctx.next(s,'MOV'),materialId:c.materialId,
    deltaGrams:-c.totalGrams,usefulGrams:c.requiredGrams,
    scrapGrams:c.scrapGrams,bomCutId:record.id,sourceId:calc.orderId,
    type:'corte-bom',commandId:ctx.uid});
  }
  order.cut[calc.size]+=calc.qty;
  if(!Array.isArray(s.bomCutRuns))s.bomCutRuns=[];
  s.bomCutRuns.push(record);
  return record.id+' · '+calc.qty+' '+calc.color+' '+calc.size+
   ' · '+calc.materialCount+' materiais · '+calc.totalGrams+
   ' g baixados apenas no laboratório fictício';
 }
 function inspect(s){
  const issues=[],runs=s.bomCutRuns||[],ids=new Set();
  for(const run of runs){
   const order=byId(s.orders,run.orderId),product=byId(s.products,run.productId);
   const variant=(order?.colorGrades||[]).find(x=>x.color===run.color);
   const moves=s.stockLedger.filter(x=>x.bomCutId===run.id);
   const bad=!run.id||ids.has(run.id)||!order||!product||
    order.productId!==product.id||!variant||!sizes.includes(run.size)||
    !Number.isSafeInteger(run.qty)||run.qty<1||
    !Array.isArray(run.materials)||run.materials.length<1||
    !run.commandId||!s.log.some(x=>x.commandId===run.commandId&&x.type==='cut.bom.execute')||
    !run.completed||!run.reason||!run.signatureOne||!run.signatureTwo||
    norm(run.cutterOne)===norm(run.cutterTwo)||
    norm(run.cutterOne)!==norm(run.signatureOne)||
    norm(run.cutterTwo)!==norm(run.signatureTwo)||
    moves.length!==run.materials?.length;
   if(bad)issues.push(String(run.id)+': documento de corte BOM sem origem ou conferência válida');
   ids.add(run.id);
   const matIds=new Set();
   for(const component of run.materials||[]){
    const mov=moves.filter(x=>x.materialId===component.materialId);
    if(matIds.has(component.materialId)||!component.ruleId||!byId(s.materials,component.materialId)||
     !Number.isSafeInteger(component.gramsPerUnit)||component.gramsPerUnit<1||
     !Number.isSafeInteger(component.requiredGrams)||
     component.requiredGrams!==run.qty*component.gramsPerUnit||
     !Number.isSafeInteger(component.scrapGrams)||component.scrapGrams<0||
     component.totalGrams!==component.requiredGrams+component.scrapGrams||
     !Number.isSafeInteger(component.priceCentsKg)||component.priceCentsKg<1||
     component.theoreticalCostCents!==
      Math.ceil(component.totalGrams*component.priceCentsKg/1000)||
     mov.length!==1||mov[0].type!=='corte-bom'||
     mov[0].commandId!==run.commandId||mov[0].sourceId!==run.orderId||
     mov[0].deltaGrams!==-component.totalGrams||
     mov[0].usefulGrams!==component.requiredGrams||
     mov[0].scrapGrams!==component.scrapGrams)
     issues.push(String(run.id)+': material ou movimento repetido/divergente '+String(component.materialId));
    matIds.add(component.materialId);
   }
   if(run.totalGrams!==(run.materials||[]).reduce((n,x)=>n+x.totalGrams,0)||
    run.estimatedCostCents!==(run.materials||[]).reduce((n,x)=>n+x.theoreticalCostCents,0))
    issues.push(String(run.id)+': custo ou consumo total divergente dos componentes');
  }
  for(const order of s.orders){
   const orderRuns=runs.filter(r=>r.orderId===order.id);
   if(!orderRuns.length)continue;
   if(s.cutPlans.some(p=>p.orderId===order.id&&p.status==='concluido'))
    issues.push(order.id+': folha simples e corte BOM misturados no mesmo pedido');
   for(const size of sizes){
    const accounted=orderRuns.filter(r=>r.size===size).reduce((n,r)=>n+r.qty,0);
    if(accounted!==order.cut[size])
     issues.push(order.id+': corte contabilizado diferente das remessas BOM em '+size);
    for(const variant of order.colorGrades||[]){
     const used=orderRuns.filter(r=>r.size===size&&r.color===variant.color)
      .reduce((n,r)=>n+r.qty,0);
     if(used>variant.grade[size])
      issues.push(order.id+': cortes BOM superam limite '+variant.color+' '+size);
    }
   }
  }
  for(const mov of s.stockLedger.filter(x=>x.type==='corte-bom')){
   if(!runs.some(r=>r.id===mov.bomCutId&&r.orderId===mov.sourceId))
    issues.push(String(mov.id)+': movimento de BOM órfão ou não associado ao pedido');
  }
  return issues;
 }
 return Object.freeze({version:'1.0.0',preview,execute,inspect});
});

;
/* modulos/requisicoes-compras-v1.js */
/* HLGB Evolução — Requisições de compra vinculadas ao planejamento, LAB FICTÍCIO.
 * Sem rede, sem armazenamento próprio. Todas as alterações ocorrem no clone
 * transacional do core.apply; nunca aprovar automaticamente ou receber estoque.
 */
(function(root,factory){
 'use strict';
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.HLGBLabPurchaseRequestsV1=api;
})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 const byId=(xs,id)=>xs.find(x=>x.id===id);
 const norm=x=>String(x||'').trim().toLocaleUpperCase('pt-BR');
 const text=(value,label)=>{
  const x=String(value??'').trim();
  if(!x||x.length>95)throw Error(label+' obrigatório (até 95 caracteres).');
  return x;
 };
 const active=new Set(['rascunho','aprovada','emitida']);
 const canCancel=new Set(['rascunho','aprovada']);
 const money=(grams,price)=>Math.ceil(grams*price/1000);
 function ensure(s){
  if(!Array.isArray(s.purchaseRequests))s.purchaseRequests=[];
 }
 function source(s,materialId,planner){
  if(!planner||typeof planner.preview!=='function')
   throw Error('Planejador de materiais indisponível. Nenhuma requisição alterada.');
  const material=byId(s.materials,materialId);
  if(!material)throw Error('Material não cadastrado.');
  const forecast=planner.preview(s);
  const row=forecast.materials.find(x=>x.materialId===material.id);
  if(!row||row.missingGrams<1)
   throw Error('Não há falta calculada para este material no cenário atual.');
  const components=forecast.detail.filter(x=>x.materialId===material.id)
   .map(x=>[x.lineId,x.productId,x.color,x.size,x.qty,x.requiredGrams,x.ruleId])
   .sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b)));
  // Cálculo é amarrado ao consumo efetivo, versão de receita, linha,
  // saldo e custo deste material; mudanças em outro material não invalidam.
  const basis=JSON.stringify({materialId:material.id,components,
   requiredGrams:row.requiredGrams,availableGrams:row.availableGrams,
   missingGrams:row.missingGrams,priceCentsKg:row.priceCentsKg});
  return {row,basis,componentCount:components.length,
   planLineIds:[...new Set(components.map(x=>x[0]))]};
 }
 function preview(s,planner){
  const data=planner.preview(s),requests=s.purchaseRequests||[];
  return {...data,requests:requests.map(x=>({
   id:x.id,materialId:x.materialId,status:x.status,
   qtyGrams:x.qtyGrams,estimatedCents:x.estimatedCents,
   purchaseId:x.purchaseId||null
  })),pendingMaterials:data.materials.filter(x=>
   x.missingGrams>0&&!requests.some(r=>
    r.materialId===x.materialId&&active.has(r.status)))};
 }
 function create(s,p,ctx,planner){
  ensure(s);
  const current=source(s,p.materialId,planner);
  if(s.purchaseRequests.some(r=>r.materialId===p.materialId&&active.has(r.status)))
   throw Error('Já existe requisição ativa deste material. Confira antes de criar outra.');
  if(s.purchaseRequests.length>=200)throw Error('Limite de requisições fictícias atingido.');
  const requester=text(p.requester,'Solicitante fictício'),
   reason=text(p.reason,'Justificativa da necessidade');
  const row=current.row;
  if(!Number.isSafeInteger(row.missingGrams)||row.missingGrams>1000000)
   throw Error('Falta calculada fora do limite seguro de 1.000.000 g.');
  const r={id:ctx.next(s,'REQ'),materialId:row.materialId,
   requiredGrams:row.requiredGrams,availableGrams:row.availableGrams,
   qtyGrams:row.missingGrams,priceCentsKg:row.priceCentsKg,
   estimatedCents:money(row.missingGrams,row.priceCentsKg),
   planLineIds:current.planLineIds,componentCount:current.componentCount,
   basis:current.basis,requester,reason,status:'rascunho',
   createdCommandId:ctx.uid,approvedCommandId:null,issuedCommandId:null,
   receiptCommandId:null,cancelCommandId:null,purchaseId:null};
  s.purchaseRequests.push(r);
  return r.id+' · '+row.name+' · '+r.qtyGrams+' g · somente rascunho';
 }
 function currentBasis(s,r,planner){
  const current=source(s,r.materialId,planner);
  if(current.basis!==r.basis||current.row.missingGrams!==r.qtyGrams)
   throw Error('Planejamento ou estoque mudou. Cancele a requisição e gere uma nova previsão; nenhum valor antigo será aprovado.');
  return current;
 }
 function approve(s,p,ctx,planner){
  ensure(s);
  const r=byId(s.purchaseRequests,p.id);
  if(!r||r.status!=='rascunho')throw Error('Somente requisição em rascunho pode ser aprovada.');
  const approver=text(p.approver,'Aprovador fictício'),
   reason=text(p.reason,'Motivo da aprovação');
  if(norm(approver)===norm(r.requester))
   throw Error('Solicitante e aprovador devem ser pessoas diferentes.');
  currentBasis(s,r,planner);
  r.status='aprovada';r.approver=approver;r.approvalReason=reason;
  r.approvedCommandId=ctx.uid;
  return r.id+' · aprovada por '+approver+' · nenhuma compra emitida';
 }
 function issue(s,p,ctx,planner){
  ensure(s);
  const r=byId(s.purchaseRequests,p.id);
  if(!r||r.status!=='aprovada')throw Error('Apenas requisição aprovada pode emitir compra fictícia.');
  currentBasis(s,r,planner);
  if(s.purchaseOrders.some(x=>x.purchaseRequestId===r.id)||r.purchaseId)
   throw Error('Requisição já possui compra. Evitar duplicidade.');
  const supplier=byId(s.suppliers,p.supplierId);
  if(!supplier)throw Error('Fornecedor de compra não cadastrado.');
  const one=text(p.checkerOne,'Conferente 1'),two=text(p.checkerTwo,'Conferente 2');
  if(norm(one)===norm(two))throw Error('Conferentes 1 e 2 devem ser pessoas diferentes.');
  const note=text(p.reason,'Justificativa de emissão');
  const obj={id:ctx.next(s,'COM'),materialId:r.materialId,
   supplierId:supplier.id,qtyGrams:r.qtyGrams,priceCentsKg:r.priceCentsKg,
   checkerOne:one,checkerTwo:two,received:false,purchaseRequestId:r.id};
  s.purchaseOrders.push(obj);
  r.status='emitida';r.purchaseId=obj.id;r.supplierId=supplier.id;
  r.issuedCommandId=ctx.uid;r.issueReason=note;
  return r.id+' → '+obj.id+' · '+r.qtyGrams+' g · aguardando recebimento';
 }
 function cancel(s,p,ctx){
  ensure(s);
  const r=byId(s.purchaseRequests,p.id);
  if(!r||!canCancel.has(r.status))
   throw Error('Só requisições não emitidas podem ser canceladas; compra existente deve seguir processo próprio.');
  if(s.purchaseOrders.some(x=>x.purchaseRequestId===r.id))
   throw Error('Requisição já vinculada à compra; cancelamento direto bloqueado.');
  r.previousStatus=r.status;r.status='cancelada';
  r.cancelReason=text(p.reason,'Motivo do cancelamento');
  r.cancelCommandId=ctx.uid;
  return r.id+' · cancelada com histórico preservado';
 }
 function cancelIssued(s,p,ctx){
  ensure(s);
  const r=byId(s.purchaseRequests,p.id);
  if(!r||r.status!=='emitida')
   throw Error('Somente requisição emitida e ainda não recebida admite cancelamento formal.');
  const purchases=s.purchaseOrders.filter(x=>x.purchaseRequestId===r.id);
  const po=purchases[0];
  if(purchases.length!==1||!po||po.id!==r.purchaseId||po.cancelled===true)
   throw Error('Compra vinculada não conciliada ou já cancelada; não alterar o histórico.');
  if(po.received||r.receiptCommandId||
    s.stockLedger.some(x=>x.sourceId===po.id)||
    s.finance.some(x=>x.sourceId===po.id))
   throw Error('Compra já possui recebimento, estoque ou título: cancelamento direto bloqueado.');
  const cancelledBy=text(p.cancelledBy,'Responsável pelo cancelamento fictício'),
    reviewedBy=text(p.reviewedBy,'Conferente independente'),
    reference=text(p.reference,'Referência única do cancelamento').toLocaleUpperCase('pt-BR'),
    reason=text(p.reason,'Justificativa formal do cancelamento');
  if(norm(cancelledBy)===norm(reviewedBy)||
     norm(reviewedBy)===norm(r.requester))
   throw Error('Conferência independente deve ser diferente do responsável e do solicitante.');
  if(s.purchaseRequests.some(x=>x.cancelIssueReference&&
     norm(x.cancelIssueReference)===reference))
   throw Error('Referência de cancelamento já registrada. Evite cancelar duas vezes.');
  // Uma única transação sobre o clone: mantém o pedido COM, valor, fornecedor e
  // aprovador anteriores; não remove compras nem escreve estoque/Hub.
  r.status='emissao_cancelada';
  r.cancelIssueCommandId=ctx.uid;r.cancelIssueReference=reference;
  r.cancelIssueReason=reason;r.cancelledBy=cancelledBy;r.cancelReviewedBy=reviewedBy;
  po.cancelled=true;po.cancelCommandId=ctx.uid;po.cancelReference=reference;
  po.cancelReason=reason;po.cancelledBy=cancelledBy;po.cancelReviewedBy=reviewedBy;
  return r.id+' · compra '+po.id+' cancelada na simulação · sem baixa, estorno ou título';
 }
 function receive(s,purchase,ctx){
  ensure(s);
  if(purchase.cancelled===true)
   throw Error('Compra cancelada não pode ser recebida ou reativada.');
  if(!purchase.purchaseRequestId)return;
  const r=byId(s.purchaseRequests,purchase.purchaseRequestId);
  if(!r||r.status!=='emitida'||r.purchaseId!==purchase.id||r.receiptCommandId)
   throw Error('Requisição não conciliada com esta compra. Recebimento bloqueado.');
  if(!purchase.received||!s.stockLedger.some(x=>
   x.sourceId===purchase.id&&x.type==='compra'&&x.commandId===ctx.uid)||
   !s.finance.some(x=>x.sourceId===purchase.id&&x.kind==='pagar'))
   throw Error('Baixa de compra e título não conciliados; não concluir requisição.');
  r.status='recebida';r.receiptCommandId=ctx.uid;
 }
 function inspect(s){
  const problems=[],rs=s.purchaseRequests||[],seen=new Set(),
   pending=new Set(),cancelRefs=new Set();
  for(const r of rs){
   const purchase=s.purchaseOrders.filter(x=>x.purchaseRequestId===r.id);
   const event=type=>s.log.some(x=>x.commandId===r[type+'CommandId']&&
    x.type==='purchase.request.'+({created:'create',approved:'approve',
     issued:'issue',cancel:'cancel',receipt:'receive'}[type]||type));
   const existsCommand=(id,type)=>s.log.some(x=>x.commandId===id&&x.type===type);
   const legal=['rascunho','aprovada','emitida','recebida','cancelada',
    'emissao_cancelada'].includes(r.status);
   if(!r.id||seen.has(r.id)||!legal||!byId(s.materials,r.materialId)||
     !Number.isSafeInteger(r.requiredGrams)||r.requiredGrams<1||
     !Number.isSafeInteger(r.availableGrams)||r.availableGrams<0||
     !Number.isSafeInteger(r.qtyGrams)||r.qtyGrams<1||
     r.qtyGrams!==Math.max(0,r.requiredGrams-r.availableGrams)||
     !Number.isSafeInteger(r.priceCentsKg)||r.priceCentsKg<1||
     r.estimatedCents!==money(r.qtyGrams,r.priceCentsKg)||
     !Array.isArray(r.planLineIds)||r.planLineIds.length<1||
     !Number.isSafeInteger(r.componentCount)||r.componentCount<1||
     typeof r.basis!=='string'||!r.basis||
     !r.requester||!r.reason||
     !existsCommand(r.createdCommandId,'purchase.request.create'))
    problems.push(String(r.id)+': requisição sem origem, quantidade, preço ou estado válido');
   seen.add(r.id);
   if(active.has(r.status)){
    if(pending.has(r.materialId))
     problems.push(String(r.id)+': requisições ativas duplicadas do material');
    pending.add(r.materialId);
   }
   if(['aprovada','emitida','recebida','emissao_cancelada'].includes(r.status)){
    if(!r.approver||norm(r.approver)===norm(r.requester)||!r.approvalReason||
      !existsCommand(r.approvedCommandId,'purchase.request.approve'))
     problems.push(String(r.id)+': aprovação sem conferência separada ou evento');
   }
   if(['emitida','recebida','emissao_cancelada'].includes(r.status)){
    const po=purchase[0];
    if(purchase.length!==1||!po||r.purchaseId!==po.id||
      r.materialId!==po.materialId||r.qtyGrams!==po.qtyGrams||
      r.priceCentsKg!==po.priceCentsKg||r.supplierId!==po.supplierId||
      !r.issueReason||!existsCommand(r.issuedCommandId,'purchase.request.issue')||
      (r.status!=='emissao_cancelada'&&po.cancelled===true))
     problems.push(String(r.id)+': compra emitida divergente da requisição');
   }else if(purchase.length||r.purchaseId)
    problems.push(String(r.id)+': compra vinculada a requisição não emitida');
   if(r.status==='emissao_cancelada'){
    const po=purchase[0],ref=norm(r.cancelIssueReference);
    if(!ref||cancelRefs.has(ref))problems.push(String(r.id)+': referência de cancelamento duplicada');
    cancelRefs.add(ref);
    if(!po||po.cancelled!==true||po.received||
      r.cancelIssueCommandId!==po.cancelCommandId||
      r.cancelIssueReference!==po.cancelReference||
      r.cancelIssueReason!==po.cancelReason||
      r.cancelledBy!==po.cancelledBy||r.cancelReviewedBy!==po.cancelReviewedBy||
      !r.cancelIssueReason||!r.cancelledBy||!r.cancelReviewedBy||
      norm(r.cancelledBy)===norm(r.cancelReviewedBy)||
      norm(r.cancelReviewedBy)===norm(r.requester)||
      !existsCommand(r.cancelIssueCommandId,'purchase.request.cancelIssued')||
      s.stockLedger.some(x=>x.sourceId===r.purchaseId)||
      s.finance.some(x=>x.sourceId===r.purchaseId)||
      r.receiptCommandId)
     problems.push(String(r.id)+': cancelamento de compra sem conferência ou com baixa indevida');
   }
   if(r.status==='emitida'&&
     (purchase[0]?.received||r.receiptCommandId))
    problems.push(String(r.id)+': requisição emitida marcada como recebida indevidamente');
   if(r.status==='recebida'&&
     (!purchase[0]?.received||
      !existsCommand(r.receiptCommandId,'purchase.receive')||
      s.stockLedger.filter(x=>x.type==='compra'&&x.sourceId===r.purchaseId).length!==1||
      s.finance.filter(x=>x.kind==='pagar'&&x.sourceId===r.purchaseId).length!==1))
    problems.push(String(r.id)+': requisição recebida não conciliada com estoque e título');
   if(r.status==='cancelada'&&
     (!canCancel.has(r.previousStatus)||!r.cancelReason||
      !existsCommand(r.cancelCommandId,'purchase.request.cancel')))
    problems.push(String(r.id)+': cancelamento sem motivo ou evento');
  }
  for(const po of s.purchaseOrders){
   const r=rs.find(x=>x.id===po.purchaseRequestId);
   if(po.purchaseRequestId&&!r)
    problems.push(String(po.id)+': compra órfã de requisição');
   if(po.cancelled===true&&(!r||r.status!=='emissao_cancelada'))
    problems.push(String(po.id)+': compra cancelada sem requisição cancelada conciliada');
   if(po.cancelled===true&&(po.received||
     s.stockLedger.some(x=>x.sourceId===po.id)||
     s.finance.some(x=>x.sourceId===po.id)))
    problems.push(String(po.id)+': compra cancelada já possui movimentação ou título');
  }
  return problems;
 }
 return Object.freeze({version:'1.0.0',ensure,source,preview,create,approve,issue,
  cancel,cancelIssued,receive,inspect});
});

;
/* modulos/devolucoes-compras-v1.js */
/* HLGB Evolução | laboratório de devolução integral de compra recebida.
 * Somente dados fictícios: execução no clone transacional do core.apply.
 * Não cancela o documento original, não modifica títulos anteriores e não tem rede.
 */
(function(root,factory){
 'use strict';
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.HLGBLabPurchaseReturnsV1=api;
})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 const id=(xs,x)=>xs.find(r=>r.id===x);
 const norm=x=>String(x||'').trim().toLocaleUpperCase('pt-BR');
 const text=(x,label)=>{
  const v=String(x??'').trim();
  if(!v||v.length>95)throw Error(label+' obrigatório (até 95 caracteres).');
  return v;
 };
 const amount=(qty,price)=>Math.ceil(qty*price/1000);
 function ensure(s){if(!Array.isArray(s.purchaseReturns))s.purchaseReturns=[];}
 function full(s,p,ctx){
  ensure(s);
  const po=id(s.purchaseOrders,p.id);
  if(!po||po.received!==true||po.cancelled===true)
   throw Error('Somente compra efetivamente recebida pode ser devolvida.');
  if(po.returnId||s.purchaseReturns.some(x=>x.purchaseId===po.id))
   throw Error('Esta compra já possui devolução. Não repetir movimento.');
  const source=s.purchaseRequests.find(x=>x.id===po.purchaseRequestId);
  if(!source||source.status!=='recebida'||source.purchaseId!==po.id||!source.receiptCommandId)
   throw Error('Compra sem requisição e recebimento conciliados; devolução bloqueada.');
  const moves=s.stockLedger.filter(m=>m.sourceId===po.id&&m.type==='compra');
  if(moves.length!==1||moves[0].materialId!==po.materialId||
     moves[0].deltaGrams!==po.qtyGrams||moves[0].commandId!==source.receiptCommandId)
   throw Error('Entrada original de estoque não conciliada; nenhuma devolução lançada.');
  const bills=s.finance.filter(f=>f.sourceId===po.id);
  const original=bills[0],expected=amount(po.qtyGrams,po.priceCentsKg);
  if(bills.length!==1||!original||original.kind!=='pagar'||original.amountCents!==expected||
     original.status!=='aberto')
   throw Error('Compra com título pago, duplicado ou divergente; exigir conciliação manual.');
  const material=id(s.materials,po.materialId);
  if(!material||!Number.isSafeInteger(po.qtyGrams)||po.qtyGrams<=0||
     material.stockGrams<po.qtyGrams)
   throw Error('Estoque insuficiente para devolver tudo; não baixar saldo negativo ou consumido.');
  const returnedBy=text(p.returnedBy,'Responsável pela devolução fictícia'),
   reviewedBy=text(p.reviewedBy,'Conferente independente'),
   reason=text(p.reason,'Motivo formal da devolução'),
   reference=norm(text(p.reference,'Referência única da devolução'));
  if(norm(returnedBy)===norm(reviewedBy)||norm(reviewedBy)===norm(source.requester)||
     norm(returnedBy)===norm(source.requester))
   throw Error('Devolução exige responsáveis distintos entre si e do solicitante.');
  if(s.purchaseReturns.some(x=>norm(x.reference)===reference)||
     s.purchaseRequests.some(x=>norm(x.cancelIssueReference)===reference))
   throw Error('Referência já registrada em outra devolução ou cancelamento.');
  const retId=ctx.next(s,'DEV'),movementId=ctx.next(s,'MOV'),
   financeId=ctx.next(s,'FIN');
  const doc={id:retId,purchaseId:po.id,requestId:source.id,supplierId:po.supplierId,
   materialId:po.materialId,qtyGrams:po.qtyGrams,amountCents:expected,
   reference,returnedBy,reviewedBy,reason,originalFinanceId:original.id,
   stockMovementId:movementId,creditFinanceId:financeId,commandId:ctx.uid,
   status:'credito_pendente'};
  s.purchaseReturns.push(doc);
  material.stockGrams-=po.qtyGrams;
  s.stockLedger.push({id:movementId,materialId:po.materialId,deltaGrams:-po.qtyGrams,
   sourceId:retId,originalPurchaseId:po.id,type:'devolucao_compra',commandId:ctx.uid});
  s.finance.push({id:financeId,kind:'receber',sourceId:retId,relatedPurchaseId:po.id,
   description:'Crédito fictício por devolução integral '+po.id,
   amountCents:expected,status:'aberto'});
  // A compra e a requisição originais continuam recebidas e rastreáveis.
  po.returnId=retId;source.returnId=retId;
  return retId+' · compra '+po.id+' devolvida integralmente · crédito '+financeId+
   ' (somente demonstração)';
 }
 function inspect(s){
  const problems=[],returns=s.purchaseReturns||[],ids=new Set(),references=new Set();
  for(const ret of returns){
   const po=id(s.purchaseOrders,ret.purchaseId),
    req=po&&id(s.purchaseRequests,po.purchaseRequestId),
    material=po&&id(s.materials,po.materialId),
    original=id(s.finance,ret.originalFinanceId),
    movements=s.stockLedger.filter(m=>m.sourceId===ret.id),
    linked=s.finance.filter(f=>f.sourceId===ret.id),
    expected=po?amount(po.qtyGrams,po.priceCentsKg):null,
    ref=norm(ret.reference);
   if(!ret.id||ids.has(ret.id)||!ref||references.has(ref)||
      s.purchaseRequests.some(x=>norm(x.cancelIssueReference)===ref))
    problems.push(String(ret.id)+': referência ou identificação de devolução duplicada');
   ids.add(ret.id);references.add(ref);
   if(!po||!req||!material||po.cancelled||!po.received||
      req.status!=='recebida'||req.purchaseId!==po.id||ret.requestId!==req.id||
      ret.purchaseId!==po.id||ret.materialId!==po.materialId||
      ret.supplierId!==po.supplierId||ret.qtyGrams!==po.qtyGrams||
      ret.amountCents!==expected||po.returnId!==ret.id||req.returnId!==ret.id)
    problems.push(String(ret.id)+': origem da devolução alterada ou inconsistente');
   if(!original||original.sourceId!==ret.purchaseId||
      original.kind!=='pagar'||original.amountCents!==ret.amountCents||
      movements.length!==1||movements[0].id!==ret.stockMovementId||
      movements[0].materialId!==ret.materialId||
      movements[0].deltaGrams!==-ret.qtyGrams||
      movements[0].type!=='devolucao_compra'||
      movements[0].originalPurchaseId!==ret.purchaseId||
      movements[0].commandId!==ret.commandId||
      linked.length!==1||linked[0].id!==ret.creditFinanceId||
      linked[0].kind!=='receber'||linked[0].amountCents!==ret.amountCents||
      linked[0].relatedPurchaseId!==ret.purchaseId||
      !['aberto','pago'].includes(linked[0].status)||
      ret.status!==(linked[0].status==='pago'?'credito_recebido':'credito_pendente'))
    problems.push(String(ret.id)+': devolução sem movimento de estoque ou crédito conciliado');
   if(!ret.commandId||!s.log.some(e=>e.commandId===ret.commandId&&
      e.type==='purchase.return.full')||!ret.reason||!ret.returnedBy||
      !ret.reviewedBy||norm(ret.returnedBy)===norm(ret.reviewedBy)||
      norm(ret.returnedBy)===norm(req?.requester)||
      norm(ret.reviewedBy)===norm(req?.requester)||
      !['credito_pendente','credito_recebido'].includes(ret.status))
    problems.push(String(ret.id)+': conferência dupla, status ou evento ausente');
  }
  for(const po of s.purchaseOrders){
   const linked=returns.filter(x=>x.purchaseId===po.id);
   if((po.returnId||linked.length)&&(linked.length!==1||linked[0].id!==po.returnId))
    problems.push(po.id+': compra com devolução órfã ou duplicada');
  }
  for(const m of s.stockLedger.filter(x=>x.type==='devolucao_compra'))
   if(!returns.some(x=>x.id===m.sourceId&&x.stockMovementId===m.id))
    problems.push(m.id+': movimento de devolução órfão');
  for(const f of s.finance.filter(x=>x.relatedPurchaseId))
   if(!returns.some(x=>x.id===f.sourceId&&x.creditFinanceId===f.id))
    problems.push(f.id+': título de devolução sem documento');
  return problems;
 }
 return Object.freeze({version:'1.0.0',ensure,full,inspect});
});

;
/* modulos/pcp-v1.js */
/* PCP local, filas disjuntas e estimativa conservadora, sem rede. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.HLGBLabPCPV1=api;})(typeof window!=='undefined'?window:null,function factory(){
 'use strict';
 const stages=['corte','envio','costura','separacao','expedicao'];
 const labels={corte:'Corte',envio:'Envio para facção',costura:'Retorno de facção',separacao:'Separação',expedicao:'Expedição'};
 const defaults={corte:300,envio:400,costura:250,separacao:400,expedicao:400};
 const valid=v=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&Number.isFinite(Date.parse(v+'T00:00:00Z'))&&new Date(v+'T00:00:00Z').toISOString().slice(0,10)===v;
 const capacityOK=x=>x&&stages.every(k=>Number.isSafeInteger(x[k])&&x[k]>0&&x[k]<=100000);
 const priorityValue={urgente:0,alta:1,normal:2,baixa:3};
 const sum=x=>Object.values(x||{}).reduce((a,b)=>a+b,0);
 function workload(o){
 const q=[sum(o.grade),sum(o.cut),o.allocated,o.returned,o.separated,o.shipped];
 if(q.some(x=>!Number.isSafeInteger(x)||x<0)||q.some((x,i)=>i&&x>q[i-1]))throw Error('Fluxo inconsistente: '+o.id);
 return {ordered:q[0],shipped:q[5],remaining:q[0]-q[5],queue:Object.fromEntries(stages.map((k,i)=>[k,q[i]-q[i+1]])),work:Object.fromEntries(stages.map((k,i)=>[k,q[0]-q[i+1]]))};
 }
 function dateAfter(d,days){const x=new Date(d+'T00:00:00Z');x.setUTCDate(x.getUTCDate()+days);return x.toISOString().slice(0,10);}
 function report(s,{asOf='2026-11-17'}={}){
 if(!valid(asOf))throw Error('Data de planejamento inválida.');
 const cap=s.pcpCapacity||defaults;if(!capacityOK(cap))throw Error('Capacidade inválida.');
 const plans=[...(s.orders||[])].sort((a,b)=>(priorityValue[a.pcp?.priority||'normal']??2)-(priorityValue[b.pcp?.priority||'normal']??2)||(a.pcp?.dueDate||'9999').localeCompare(b.pcp?.dueDate||'9999')||a.id.localeCompare(b.id));
 const queue=Object.fromEntries(stages.map(k=>[k,0])),work={...queue},rows=[];let accumulated=0;
 for(const o of plans){const w=workload(o);for(const k of stages){queue[k]+=w.queue[k];work[k]+=w.work[k];}
 const duration=stages.reduce((n,k)=>n+Math.ceil(w.work[k]/cap[k]),0);
 const due=o.pcp?.dueDate||null;let estimated=null;
 if(w.remaining){accumulated+=duration;estimated=dateAfter(asOf,accumulated-1);}
 const status=!w.remaining?'Expedido':!due?'Sem prazo':due<asOf?'Atrasado':estimated>due?'Risco de atraso':'No prazo estimado';
 rows.push({id:o.id,model:s.products?.find(x=>x.id===o.productId)?.name||o.productId,client:s.clients?.find(x=>x.id===o.clientId)?.name||o.clientId,priority:o.pcp?.priority||'normal',due,estimated,status,days:duration,...w});
 }
 const loads=stages.map(k=>({stage:k,label:labels[k],queue:queue[k],required:work[k],capacity:cap[k],days:Math.ceil(work[k]/cap[k])}));
 const factions=(s.factions||[]).map(f=>{let sent=0,returned=0,orders=new Set();for(const a of s.factionAssignments||[])if(a.factionId===f.id){sent+=a.qtySent;returned+=a.qtyReturned;orders.add(a.orderId);}
 for(const o of s.orders||[])if(o.factionId===f.id&&!(s.factionAssignments||[]).some(a=>a.orderId===o.id)){sent+=o.allocated;returned+=o.returned;orders.add(o.id);}
 return {id:f.id,name:f.name,sent,returned,pending:sent-returned,orders:orders.size,returnPercent:sent?Math.round(returned*100/sent):null};});
 return {asOf,capacity:{...cap},rows,loads,factions,bottleneck:[...loads].sort((a,b)=>b.days-a.days)[0]?.days? [...loads].sort((a,b)=>b.days-a.days)[0].label:null,remaining:rows.reduce((n,r)=>n+r.remaining,0),late:rows.filter(r=>r.status==='Atrasado').length,risk:rows.filter(r=>r.status==='Risco de atraso').length};
 }
 function inspect(s){const problems=[];if(s.pcpCapacity&&!capacityOK(s.pcpCapacity))problems.push('PCP: capacidade inválida');for(const o of s.orders||[])if(o.pcp&&(!valid(o.pcp.dueDate)||!(o.pcp.priority in priorityValue)||!o.pcp.reason))problems.push(o.id+': planejamento inválido');return problems;}
 return {stages,labels,defaults,valid,capacityOK,workload,report,inspect};
});

;
/* modulos/relatorios-gerenciais-v1.js */
/* Central gerencial: histórico registrado, sem inventar datas antigas. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.HLGBLabManagementV1=api;})(typeof window!=='undefined'?window:null,function factory(){
 'use strict';
 const fields=['ordered','cut','allocated','returned','separated','shipped'];
 const sum=o=>Object.values(o||{}).reduce((a,b)=>a+b,0);
 const quantities=o=>o?{ordered:sum(o.grade),cut:sum(o.cut),allocated:o.allocated,returned:o.returned,separated:o.separated,shipped:o.shipped}:Object.fromEntries(fields.map(k=>[k,0]));
 const date=v=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&Number.isFinite(Date.parse(v+'T00:00:00Z'))&&new Date(v+'T00:00:00Z').toISOString().slice(0,10)===v;
 const norm=v=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
 const zero=()=>Object.fromEntries(fields.map(k=>[k,0]));
 const area=t=>({order:'pedidos',cut:'corte',faction:'faccoes',settlement:'acertos',finance:'hub',purchase:'compras',stock:'estoque',material:'estoque',pcp:'producao',payroll:'folha',print:'impressora3d',product:'produtos',error:'central',client:'cadastros',supplier:'cadastros'})[String(t).split('.')[0]]||'nucleo';
 function capture(before,after,recordedAt){
 if(recordedAt!==undefined&&(typeof recordedAt!=='string'||!Number.isFinite(Date.parse(recordedAt))||new Date(recordedAt).toISOString()!==recordedAt))throw Error('Data de registro inválida.');
 const previous=new Map(before.orders.map(o=>[o.id,o])),changes=[];
 for(const o of after.orders){const a=quantities(previous.get(o.id)),b=quantities(o),delta=Object.fromEntries(fields.map(k=>[k,b[k]-a[k]]));if(fields.some(k=>delta[k]!==0))changes.push({orderId:o.id,productId:o.productId,clientId:o.clientId,delta});}
 const oldMoves=new Set(before.stockLedger.map(m=>m.id));
 const moves=after.stockLedger.filter(m=>!oldMoves.has(m.id)).map(m=>({id:m.id,materialId:m.materialId,sourceId:m.sourceId,type:m.type,deltaGrams:m.deltaGrams}));
 return {recordedAt:recordedAt||null,changes,moves};
 }
 function report(s,{from='2026-11-01',to='2026-11-30',module='todos',query='',page=1,limit=50}={}){
 if(!date(from)||!date(to)||from>to)throw Error('Período inválido.');
 const days=new Map(),models=new Map(),materials=new Map(),activity=new Map(),totals=zero(),history=[],seen=new Set();
 let undated=0,withoutMetrics=0,datedEvents=0;
 for(const e of s.log||[]){
 if(seen.has(e.commandId))throw Error('Comando duplicado no histórico: '+e.commandId);seen.add(e.commandId);
 const day=typeof e.recordedAt==='string'?e.recordedAt.slice(0,10):null,has=date(day)&&Number.isFinite(Date.parse(e.recordedAt));
 if(!has)undated++;
 if(!Array.isArray(e.changes)||!Array.isArray(e.moves))withoutMetrics++;
 if(!has||day<from||day>to)continue;
 datedEvents++;const mod=area(e.type);activity.set(mod,(activity.get(mod)||0)+1);
 if(!days.has(day))days.set(day,{date:day,events:0,...zero()});const daily=days.get(day);daily.events++;
 for(const c of e.changes||[]){if(!models.has(c.productId))models.set(c.productId,{productId:c.productId,...zero()});const m=models.get(c.productId);for(const k of fields){const v=c.delta[k];if(!Number.isSafeInteger(v))throw Error('Movimento de peças inválido: '+e.commandId);totals[k]+=v;daily[k]+=v;m[k]+=v;}}
 for(const m of e.moves||[]){if(!Number.isSafeInteger(m.deltaGrams))throw Error('Movimento de estoque inválido: '+e.commandId);if(!materials.has(m.materialId))materials.set(m.materialId,{materialId:m.materialId,inGrams:0,outGrams:0});const row=materials.get(m.materialId);if(m.deltaGrams>0)row.inGrams+=m.deltaGrams;else row.outGrams-=m.deltaGrams;}
 }
 for(const e of s.log||[]){const day=typeof e.recordedAt==='string'?e.recordedAt.slice(0,10):null,has=date(day)&&Number.isFinite(Date.parse(e.recordedAt)),mod=area(e.type);
 if(has&&(day<from||day>to)||module!=='todos'&&module!==mod)continue;
 const h={revision:e.revision,commandId:e.commandId,type:e.type,module:mod,actor:e.actor,description:e.description,date:has?day:null,recordedAt:has?e.recordedAt:null,orderIds:(e.changes||[]).map(x=>x.orderId)};
 if(!norm([h.commandId,h.type,h.module,h.actor,h.description,...h.orderIds].join(' ')).includes(norm(query)))continue;
 history.push(h);}
 history.sort((a,b)=>b.revision-a.revision);limit=Math.min(100,Math.max(1,Math.floor(Number(limit)||50)));const pages=Math.max(1,Math.ceil(history.length/limit));page=Math.min(pages,Math.max(1,Math.floor(Number(page)||1)));
 const product=new Map((s.products||[]).map(x=>[x.id,x])),material=new Map((s.materials||[]).map(x=>[x.id,x]));
 return {from,to,totals,datedEvents,undated,withoutMetrics,days:[...days.values()].sort((a,b)=>a.date.localeCompare(b.date)),models:[...models.values()].map(x=>({...x,name:product.get(x.productId)?.name||x.productId})),materials:[...materials.values()].map(x=>({...x,name:material.get(x.materialId)?.name||x.materialId})),activity:[...activity].map(([module,count])=>({module,count})),history:history.slice((page-1)*limit,page*limit),historyAll:history,pages,page,historyCount:history.length};
 }
 function previousPeriod(from,to){if(!date(from)||!date(to)||from>to)throw Error('Período inválido.');const start=Date.parse(from+'T00:00:00Z'),end=Date.parse(to+'T00:00:00Z'),day=86400000,n=end-start+day;return {from:new Date(start-n).toISOString().slice(0,10),to:new Date(start-day).toISOString().slice(0,10)};}
 return {fields,date,capture,report,previousPeriod};
});
