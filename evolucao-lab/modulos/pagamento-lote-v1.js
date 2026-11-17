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
  return {reference,reason,items,totalCents:total};
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
   paidDate:'2026-11-16',status:'pago',kind:'pagamento_ficticio_lote',
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
  const checked=validate(s,{financeIds:ids,reference:p.reference,reason:p.reason});
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
  const result=execute(s,{financeIds:x.ids,reference:p.reference,reason:p.reason},ctx);
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
    !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(encoded))
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
  groups,previewFaction,executeFaction,receiptTarget,receiptTargets,
  attachReceipt,inspectReceipts,receiptMetadata,decodePdf,MAX_PDF});
});
