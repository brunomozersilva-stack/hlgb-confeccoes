/* GERADO DE migracao/*.cjs; NÃO EDITAR: node evolucao-lab/migracao/build-preflight-browser.cjs --write */
(function(root){
 'use strict';
 const gradeModule={exports:{}};
 (function(module){
'use strict';
/* Comparação offline, read-only, entre um pedido comercial exportado e um
 * pedido multimodelo já preparado no laboratório. NÃO importa, converte,
 * atualiza, publica ou reconcilia financeiro. Não aceitar produção real
 * sem autenticação, backup, validação de preço e vínculo de documentos. */
const norm=x=>String(x??'').normalize('NFC').trim().toLocaleLowerCase('pt-BR');
const text=(x,label,max=160)=>{
 if(typeof x!=='string'||!x.trim()||x.length>max)throw Error(label+' ausente/inválido');
 return x.trim();
};
const qty=(x,context)=>{
 if(!Number.isSafeInteger(x)||x<0||x>1000000)
  throw Error('Quantidade inválida em '+context);
 return x;
};
const cell=(productId,color,size)=>[norm(productId),norm(color),norm(size)].join('\u0000');
function rowsFromLegacy(legacy){
 if(!legacy||!Array.isArray(legacy.grade))throw Error('Grade comercial ilegível');
 if(legacy.grade.length>10000)throw Error('Grade comercial acima do limite de revisão');
 const rows=new Map(),seen=new Set();
 for(const [index,g] of legacy.grade.entries()){
  const productId=text(g?.productId,'Modelo legado '+index),
   color=text(g?.color,'Cor legado '+index),size=text(g?.size,'Tamanho legado '+index,40);
  const value=qty(g?.qty,productId+' / '+color+' / '+size);
  const key=cell(productId,color,size);
  if(seen.has(key))throw Error('Grade comercial contém linha duplicada: '+productId+' / '+color+' / '+size);
  seen.add(key);
  if(value>0)rows.set(key,{productId,color,size,qty:value,key});
 }
 return rows;
}
function rowsFromPrepared(prepared){
 if(!prepared||!Array.isArray(prepared.items)||!prepared.items.length||
  prepared.items.length>100||!Array.isArray(prepared.sizes))
  throw Error('Pedido multimodelo preparado ilegível');
 if(prepared.sizes.length<1||prepared.sizes.length>16||
  new Set(prepared.sizes.map((x,i)=>norm(text(x,'Tamanho do pedido '+i,40)))).size!==prepared.sizes.length)
  throw Error('Lista de tamanhos do pedido inválida ou duplicada');
 const rows=new Map(),ids=new Set(),products=new Set(),seenCells=new Set();
 let grandPieces=0,grandAmount=0;
 for(const item of prepared.items){
  let itemPieces=0;
  const itemId=text(item?.id,'ID do item'),pid=text(item?.productId,'Modelo preparado');
  if(ids.has(itemId))throw Error('ID de item duplicado: '+itemId);
  ids.add(itemId);
  if(products.has(norm(pid)))throw Error('Mesmo produto em dois itens: requer conciliação explícita '+pid);
  products.add(norm(pid));
  if(!Array.isArray(item.colors)||item.colors.length>1000)throw Error('Cores do modelo ilegíveis');
  for(const colorGrade of item.colors){
   const color=text(colorGrade?.color,'Cor preparada');
   if(!colorGrade.grade||Array.isArray(colorGrade.grade)||typeof colorGrade.grade!=='object')
    throw Error('Grade preparada ilegível: '+pid+' / '+color);
   if(Object.keys(colorGrade.grade).length!==prepared.sizes.length||
    prepared.sizes.some(size=>!Object.hasOwn(colorGrade.grade,size)))
    throw Error('Grade preparada incompleta: '+pid+' / '+color);
   for(const [size,raw] of Object.entries(colorGrade.grade)){
    text(size,'Tamanho preparado',40);
    if(!prepared.sizes.includes(size))throw Error('Tamanho fora da grade do pedido: '+size);
    const value=qty(raw,pid+' / '+color+' / '+size),key=cell(pid,color,size);
    if(seenCells.has(key))throw Error('Linha preparada duplicada: '+pid+' / '+color+' / '+size);
    seenCells.add(key);
    itemPieces+=value;
    if(value>0)rows.set(key,{itemId,productId:pid,color,size,qty:value,key});
   }
  }
  if(item.qty!==itemPieces)throw Error('Total do modelo não confere: '+pid);
  if(!Number.isSafeInteger(item.priceCents)||item.priceCents<0||
   !Number.isSafeInteger(item.amountCents)||item.amountCents!==itemPieces*item.priceCents)
   throw Error('Subtotal e preço históricos inválidos do modelo: '+pid);
  grandPieces+=itemPieces;grandAmount+=item.amountCents;
 }
 if(!Number.isSafeInteger(grandAmount)||prepared.totals?.pieces!==grandPieces||
  prepared.totals?.amountCents!==grandAmount)
  throw Error('Totais preparados não conferem com itens e suas grades');
 if(rows.size>10000)throw Error('Grade preparada acima do limite de revisão');
 return rows;
}
function compare(legacy,prepared){
 // Ids diferentes não significam equivalência automática de documentos.
 const legacyId=text(legacy?.id,'ID do pedido comercial');
 const preparedId=text(prepared?.id,'ID do pedido preparado');
 const old=rowsFromLegacy(legacy),current=rowsFromPrepared(prepared);
 const diff=[];
 const keys=new Set([...old.keys(),...current.keys()]);
 let legacyTotal=0,preparedTotal=0;
 for(const row of old.values())legacyTotal+=row.qty;
 for(const row of current.values())preparedTotal+=row.qty;
 if(!Number.isSafeInteger(legacyTotal)||!Number.isSafeInteger(preparedTotal))
  throw Error('Total de pedido fora do limite numérico');
 for(const key of keys){
  const l=old.get(key),n=current.get(key),v=l||n;
  if(l?.qty===n?.qty)continue;
  diff.push({productId:v.productId,color:v.color,size:v.size,
   itemId:n?.itemId||null,legacyQty:l?.qty||0,preparedQty:n?.qty||0,
   delta:(n?.qty||0)-(l?.qty||0),
   reason:!l?'incluido_no_preparo':!n?'ausente_no_preparo':'quantidade_divergente'});
 }
 diff.sort((a,b)=>a.productId.localeCompare(b.productId,'pt-BR')||
  a.color.localeCompare(b.color,'pt-BR')||a.size.localeCompare(b.size,'pt-BR'));
 const oldClient=typeof legacy.clientId==='string'&&legacy.clientId.trim()?legacy.clientId.trim():null;
 const newClient=typeof prepared.clientId==='string'&&prepared.clientId.trim()?prepared.clientId.trim():null;
 const clientComparable=!!(oldClient&&newClient);
 const sameClient=clientComparable&&norm(oldClient)===norm(newClient);
 const gradeEquivalent=diff.length===0&&legacyTotal===preparedTotal;
 const warnings=[
  'Preço de venda, condição por cliente e títulos financeiros não conciliados',
  'Estoque, cortes executados, reservas, envios e acertos não conciliados',
  'Documentos e permissões comerciais não migrados nem validados em servidor'
 ];
 if(!clientComparable)warnings.unshift('Cliente sem identidade consistente nos dois formatos');
 else if(!sameClient)warnings.unshift('Cliente diferente entre origem e preparo');
 return Object.freeze({
  schema:'hlgb-grade-legada-comparacao-v1',
  source:{orderId:legacyId,lines:old.size,pieces:legacyTotal},
  target:{orderId:preparedId,lines:current.size,pieces:preparedTotal},
  clientComparable,sameClient,gradeEquivalent,
  reviewRequired:!gradeEquivalent||!sameClient,
  readyForCommercialMigration:false,
  canWrite:false,canCreateFinancialTitle:false,canCreateStockMovement:false,
  diffs:diff,warnings
 });
}
module.exports=Object.freeze({compare});

 })(gradeModule);
 const linksModule={exports:{}};
 (function(module,require){
'use strict';
/* Inspecao OFFLINE de um extrato NORMALIZADO e anonimizado de dependencias
 * comerciais. Nao ler main, servidor, cookies, banco, arquivos de clientes;
 * NUNCA aplicar, reconciliar ou criar acertos automaticamente. */
const {compare}=require('./comparador-grade-legada.cjs');
const norm=x=>String(x??'').trim().toLocaleLowerCase('pt-BR');
const validId=(x,where)=>{if(typeof x!=='string'||!x.trim()||x.length>128)
 throw Error(where+' precisa de identificador explícito');return x.trim();};
const count=(x,label)=>{if(!Number.isSafeInteger(x)||x<0||x>1000000)
 throw Error(label+' exige quantidade inteira não negativa');return x;};
const cents=(x,label)=>{if(!Number.isSafeInteger(x)||x<0||x>1e12)
 throw Error(label+' exige centavos inteiros não negativos');return x;};
const TYPES=Object.freeze({
 cuts:['planejado','concluido','cancelado'],
 allocations:['enviado','retornado','cancelado'],
 settlements:['aberto','pago','cancelado'],
 finance:['aberto','pago','cancelado']
});
function review(legacy,prepared,evidence={}){
 const grade=compare(legacy,prepared),orderId=grade.source.orderId;
 if(!evidence||typeof evidence!=='object'||Array.isArray(evidence))throw Error('Extrato de dependências ilegível');
 if(evidence.orderId!==undefined&&evidence.orderId!==orderId)
  throw Error('Extrato de outro pedido: não misture documentos de origens diferentes');
 const findings=[],sources={},ids=new Set(),models=new Map();
 const note=(code,level,detail)=>findings.push({code,level,detail});
 const knownProducts=new Set((legacy.grade||[]).map(x=>norm(x.productId)));
 for(const key of Object.keys(TYPES)){
  if(!Array.isArray(evidence[key])){
   sources[key]={verified:false,records:0,independentlyVerified:false};
   note('COLECAO_NAO_CONFERIDA','bloqueio','Faltam dados conferidos de '+key+'; ausência de arquivo não comprova saldo zero');
   continue;
  }
  if(evidence[key].length>10000)throw Error('Extrato excede o limite em '+key);
  sources[key]={verified:true,records:evidence[key].length,independentlyVerified:false};
  for(const doc of evidence[key]){
   const id=validId(doc?.id,key+' / id');
   if(ids.has(key+':'+id))throw Error('Documento repetido em '+key+': '+id);
   ids.add(key+':'+id);
   const status=doc?.status;
   if(!TYPES[key].includes(status))throw Error('Situação não reconhecida de '+key+' / '+id);
   if(key==='finance')continue;
   if(doc.orderId!==orderId)throw Error('Documento de outro pedido em '+key+' / '+id);
   const productId=validId(doc.productId,key+' / productId');
   if(!knownProducts.has(norm(productId)))
    note('MODELO_AUSENTE','bloqueio',key+' / '+id+' referencia modelo ausente da grade legada: '+productId);
   const quantity=count(doc.qty,key+' / '+id);
   const bucket=models.get(norm(productId))||{productId,planned:0,cut:0,sent:0,returned:0,settled:0};
   if(key==='cuts'&&status==='planejado')bucket.planned+=quantity;
   if(key==='cuts'&&status==='concluido')bucket.cut+=quantity;
   if(key==='allocations'&&status==='enviado')bucket.sent+=quantity;
   if(key==='allocations'&&status==='retornado')bucket.returned+=quantity;
   if(key==='settlements'&&status!=='cancelado')bucket.settled+=quantity;
   models.set(norm(productId),bucket);
   if(key==='settlements')cents(doc.amountCents,key+' / '+id+' / valor');
  }
 }
 const ordered=new Map();
 for(const entry of legacy.grade||[]){
  const pid=norm(entry.productId);ordered.set(pid,(ordered.get(pid)||0)+entry.qty);
 }
 for(const [pid,b] of models){
  b.ordered=ordered.get(pid)||0;
  if(b.planned+b.cut>b.ordered)
   note('CORTE_EXCEDE_PEDIDO','bloqueio',b.productId+': reservas '+b.planned+' e concluídas '+b.cut+' excedem '+b.ordered+' pedidas');
  if(sources.cuts.verified&&sources.allocations.verified&&b.sent>b.cut)
   note('ENVIO_EXCEDE_CORTE','bloqueio',b.productId+': '+b.sent+' enviadas, apenas '+b.cut+' com corte identificado neste extrato');
  if(sources.allocations.verified&&b.returned>b.sent)
   note('RETORNO_EXCEDE_ENVIO','bloqueio',b.productId+': '+b.returned+' retornadas e '+b.sent+' enviadas');
  if(sources.settlements.verified&&sources.allocations.verified&&b.settled>b.returned)
   note('ACERTO_SEM_RETORNO','bloqueio',b.productId+': '+b.settled+' peças em acerto e '+b.returned+' retornadas');
 }
 // O saldo agregado não substitui o vínculo físico entre documentos.
 // A rotina antiga pode não ter esses IDs; nesse caso exigir conferência
 // humana e nunca inventar a qual folha/facção pertence cada quantidade.
 const byCut=new Map((evidence.cuts||[]).map(x=>[x.id,x]));
 const bySend=new Map((evidence.allocations||[]).filter(x=>x.status==='enviado').map(x=>[x.id,x]));
 const byReturn=new Map((evidence.allocations||[]).filter(x=>x.status==='retornado').map(x=>[x.id,x]));
 const bySendReturned=new Map(),byReturnSettled=new Map();
 for(const a of evidence.allocations||[]){
  if(a.status==='cancelado')continue;
  if(a.status==='enviado'){
   if(!a.cutId)note('ENVIO_SEM_FOLHA_ID','bloqueio',a.id+' não identifica folha de corte; não inferir origem');
   else {
    const source=byCut.get(a.cutId);
    if(!source||source.status!=='concluido'||norm(source.productId)!==norm(a.productId))
     note('ENVIO_CORTE_INVALIDO','bloqueio',a.id+' aponta para corte indisponível ou de outro modelo: '+a.cutId);
   }
  }
  if(a.status==='retornado'){
   if(!a.sourceAllocationId)
    note('RETORNO_SEM_ENVIO_ID','bloqueio',a.id+' não informa envio original; conferir trilha de facção');
   else {
    const src=bySend.get(a.sourceAllocationId);
    if(!src||norm(src.productId)!==norm(a.productId))
     note('RETORNO_ORIGEM_DIVERGENTE','bloqueio',a.id+' não pertence ao envio '+a.sourceAllocationId);
    else {
     bySendReturned.set(src.id,(bySendReturned.get(src.id)||0)+a.qty);
     if(src.factionId&&a.factionId&&src.factionId!==a.factionId)
      note('FACCAO_TROCADA_SEM_PROVA','bloqueio',a.id+' retornou por outra facção; exigir registro de transferência');
    }
   }
  }
 }
 for(const [sendId,returned] of bySendReturned){
  const sent=bySend.get(sendId)?.qty||0;
  if(returned>sent)
   note('RETORNO_PARCIAL_EXCESSIVO','bloqueio',sendId+': soma dos retornos '+returned+' excede '+sent+' enviados');
 }
 for(const a of evidence.settlements||[]){
  if(a.status==='cancelado')continue;
  if(!a.returnId)
   note('ACERTO_SEM_RETORNO_ID','bloqueio',a.id+' não identifica o retorno físico que gerou serviço');
  else {
   const source=byReturn.get(a.returnId);
   if(!source||norm(source.productId)!==norm(a.productId))
    note('ACERTO_RETORNO_INVALIDO','bloqueio',a.id+' não corresponde ao retorno '+a.returnId);
   else byReturnSettled.set(source.id,(byReturnSettled.get(source.id)||0)+a.qty);
  }
 }
 for(const [returnId,settled] of byReturnSettled){
  const returned=byReturn.get(returnId)?.qty||0;
  if(settled>returned)
   note('ACERTO_PARCIAL_EXCESSIVO','bloqueio',returnId+': soma dos acertos '+settled+' excede '+returned+' retornadas');
 }
 const settlements=new Map((evidence.settlements||[]).map(x=>[x.id,x]));
 const linked=new Map();
 const clientTitles=[];
 for(const item of evidence.finance||[]){
  const id=validId(item.id,'finance / id');
  const sourceId=validId(item.sourceId,'finance / sourceId');
  cents(item.amountCents,'finance / '+id+' / valor');
  if(item.orderId!==undefined&&item.orderId!==orderId)
   throw Error('Título financeiro pertence a outro pedido: '+id);
  if(item.kind==='pagar'){
   const source=settlements.get(sourceId);
   if(source){
    linked.set(sourceId,(linked.get(sourceId)||0)+1);
    if(source.amountCents!==item.amountCents||source.status!==item.status)
     note('FINANCEIRO_DIVERGENTE','bloqueio',sourceId+' e título '+id+' diferem no valor ou na situação');
   }else note('TITULO_ORIGEM_NAO_COMPROVADA','bloqueio','Título a pagar '+id+' tem origem '+sourceId+' não identificada');
  }else if(item.kind==='receber'){
   clientTitles.push(item);
   if(sourceId!==orderId)
    note('TITULO_CLIENTE_ORIGEM_DIVERGENTE','bloqueio','Título a receber '+id+' não aponta para o pedido conferido');
  }else throw Error('Tipo financeiro desconhecido em '+id+'; exige pagar ou receber');
  if(item.status==='pago')
   note('TITULO_PAGO','bloqueio','Título '+id+' já consta como pago; bloquear repetição de baixa');
 }
 if(clientTitles.length>1)
  note('RECEBIMENTO_PARCELADO_NAO_CONCILIADO','bloqueio','Vários títulos a receber: conferir condições e parcelas antes de migrar');
 if(clientTitles.length)
  note('RECEBIMENTO_NAO_CONCILIADO','bloqueio','Valores e datas dos títulos do cliente exigem confronto independente com o pedido original');
 for(const x of evidence.settlements||[]){
  if(x.status==='cancelado')continue;
  const n=linked.get(x.id)||0;
  if(n!==1)note('ACERTO_TITULO_INCONSISTENTE','bloqueio',x.id+' aparece em '+n+' títulos, esperado exatamente 1');
  if(x.status==='pago')note('ACERTO_PAGO','bloqueio',x.id+' já consta como pago no extrato');
 }
 if(grade.diffs.length||!grade.sameClient)
  note('GRADE_OU_CLIENTE_DIVERGENTE','bloqueio','Grade ou cliente não conferem; revisar '+grade.diffs.length+' células');
 const hasMovement=Object.values(sources).some(x=>x.records>0);
 if(hasMovement)
  note('HISTORICO_OPERACIONAL_EXISTENTE','bloqueio','Pedido possui documentos relacionados. Exigir migração de vínculos com aceitação explícita');
 note('ADAPTADOR_REAL_NAO_VALIDADO','bloqueio','Extrato normalizado não comprova que todos os módulos do programa comercial foram lidos');
 return Object.freeze({
  schema:'hlgb-preflight-dependencias-v1',sourceOrderId:orderId,
  grade,collections:sources,models:[...models.values()].sort((a,b)=>a.productId.localeCompare(b.productId,'pt-BR')),
  findings,needsReview:findings.length>0,
  readyForCommercialMigration:false,canExecute:false,canPay:false,canChangeStock:false,
  noWrites:true,sourceCoverage:'extrato_fornecido_sem_prova_de_completude'
 });
}
module.exports=Object.freeze({review});

 })(linksModule,function(p){if(p!=='./comparador-grade-legada.cjs')throw Error('Dependência de preflight inválida');return gradeModule.exports;});
 if(typeof gradeModule.exports.compare!=='function'||typeof linksModule.exports.review!=='function')throw Error('Motor de migração incompleto');
 root.HLGBLabMigrationPreflightV1=Object.freeze({compare:gradeModule.exports.compare,review:linksModule.exports.review});
})(typeof window!=='undefined'?window:null);
