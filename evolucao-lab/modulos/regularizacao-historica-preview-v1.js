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
