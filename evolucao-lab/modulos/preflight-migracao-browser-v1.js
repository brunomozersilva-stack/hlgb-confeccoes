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
 const dossierModule={exports:{}};
 (function(module,require){
'use strict';
/* HLGB Evolução — dossiê OFFLINE de pré-migração.
 * Uma proposta de correspondências PARA CONFERÊNCIA, nunca plano executável.
 * Reutiliza o gate de grade + vínculo. Não lê servidor nem salva nada.
 */
const {review}=require('./preflight-vinculos-operacionais.cjs');
const norm=x=>String(x??'').normalize('NFC').trim().toLocaleLowerCase('pt-BR');
const lex=(a,b)=>String(a).localeCompare(String(b),'pt-BR',{numeric:true});
const STAGES=Object.freeze({
 cuts:'corte',allocations:'faccao',settlements:'acerto',finance:'financeiro'
});
const safeQty=x=>Number.isSafeInteger(x)&&x>=0?x:null;
function buildDossier(legacy,prepared,evidence={}){
 const preflight=review(legacy,prepared,evidence);
 const orderId=preflight.sourceOrderId,preparedOrderId=preflight.grade.target.orderId;
 const oldProducts=new Set((legacy.grade||[]).map(x=>norm(x.productId)));
 const preparedItems=new Map(prepared.items.map(item=>[norm(item.productId),item]));
 const modelMap=[...oldProducts].sort(lex).map(key=>{
  const source=(legacy.grade||[]).filter(row=>norm(row.productId)===key);
  const target=preparedItems.get(key)||null;
  const before=source.reduce((n,x)=>n+x.qty,0);
  return {productId:source[0].productId,sourceQty:before,
   targetItemId:target?.id||null,targetProductId:target?.productId||null,
   targetQty:target?.qty??null,delta:target?target.qty-before:null,
   status:target?(target.qty===before?'quantidade_conferida':'quantidade_divergente'):'modelo_sem_correspondencia',
   isApproved:false};
 });
 // Os documentos de origem permanecem uma árvore; não criar outros IDs para
 // pagá-los/recebê-los. Uma referência identificada não certifica seu conteúdo.
 const cuts=new Map((evidence.cuts||[]).map(x=>[x.id,x]));
 const sends=new Map((evidence.allocations||[]).filter(x=>x.status==='enviado').map(x=>[x.id,x]));
 const returns=new Map((evidence.allocations||[]).filter(x=>x.status==='retornado').map(x=>[x.id,x]));
 const settlements=new Map((evidence.settlements||[]).map(x=>[x.id,x]));
 const byStage={
  cuts:evidence.cuts||[],allocations:evidence.allocations||[],
  settlements:evidence.settlements||[],finance:evidence.finance||[]
 };
 const edges=[],records=[],missing=[];
 const push=(node,parent,source,match)=>{
  const parentId=parent?.id||null,parentModel=parent?.productId||null;
  let link='exige_conferencia';
  if(!node.expectedFrom){
   link='origem_pedido_declarada';
  }else if(!node.parentId){
   missing.push({id:node.id,stage:node.stage,needs:node.expectedFrom,
    reason:'Sem referência explícita ao documento de origem'});
  }else if(!source){
   missing.push({id:node.id,stage:node.stage,needs:node.expectedFrom,
    reason:'Documento de origem não encontrado no extrato apresentado'});
  }else if(!match){
   missing.push({id:node.id,stage:node.stage,needs:node.expectedFrom,
    reason:'Vínculo não corresponde ao modelo, situação ou tipo de documento'});
  }else link='referencia_identificada_sem_aprovacao';
  if(node.parentId){
   edges.push({fromType:node.expectedFrom||'pedido',fromId:node.parentId,
    toType:node.stage,toId:node.id,valid:link==='referencia_identificada_sem_aprovacao',
    reason:link});
  }
  records.push({...node,sourceParent:parentId,sourceModel:parentModel,link,
   preservesOriginalId:true,proposedNewId:null,
   canWrite:false,canPay:false});
 };
 for(const stage of Object.keys(STAGES)){
  for(const doc of byStage[stage]){
   const status=doc.status,qty=safeQty(doc.qty),amountCents=safeQty(doc.amountCents);
   const item=preparedItems.get(norm(doc.productId))||null;
   const node={stage:STAGES[stage],kind:stage,id:doc.id,
    sourceOrderId:doc.orderId||orderId,productId:doc.productId||null,
    targetItemId:item?.id||null,qty,amountCents,status,
    parentId:null,expectedFrom:null};
   let parent=null,match=true;
   if(stage==='cuts'){node.expectedFrom='pedido';node.parentId=orderId;parent=legacy;
    match=doc.orderId===orderId&&oldProducts.has(norm(doc.productId));}
   if(stage==='allocations'&&status==='enviado'){
    node.expectedFrom='corte';node.parentId=doc.cutId||null;
    parent=cuts.get(node.parentId);
    match=!!parent&&parent.status==='concluido'&&norm(parent.productId)===norm(doc.productId);
   }
   if(stage==='allocations'&&status==='retornado'){
    node.expectedFrom='faccao_envio';node.parentId=doc.sourceAllocationId||null;
    parent=sends.get(node.parentId);
    match=!!parent&&norm(parent.productId)===norm(doc.productId);
   }
   if(stage==='allocations'&&status==='cancelado'){
    node.expectedFrom='pedido';node.parentId=orderId;parent=legacy;
    match=doc.orderId===orderId;
   }
   if(stage==='settlements'){
    node.expectedFrom='faccao_retorno';node.parentId=doc.returnId||null;
    parent=returns.get(node.parentId);
    match=!!parent&&norm(parent.productId)===norm(doc.productId);
   }
   if(stage==='finance'){
    if(doc.kind==='pagar'){
     node.expectedFrom='acerto';node.parentId=doc.sourceId||null;
     parent=settlements.get(node.parentId);
     match=!!parent&&parent.amountCents===doc.amountCents&&parent.status===doc.status;
     node.targetItemId=parent?preparedItems.get(norm(parent.productId))?.id||null:null;
     node.productId=parent?.productId||null;
    }else{
     node.expectedFrom='pedido';node.parentId=doc.sourceId||null;
     parent=node.parentId===orderId?legacy:null;
     match=!!parent&&doc.orderId===undefined||!!parent&&doc.orderId===orderId;
     node.productId=null;node.targetItemId=null;
    }
   }
   push(node,parent,doc,match);
  }
 }
 const list=records.sort((a,b)=>
  ['corte','faccao','acerto','financeiro'].indexOf(a.stage)-
  ['corte','faccao','acerto','financeiro'].indexOf(b.stage)||lex(a.id,b.id));
 const counters={total:list.length,identified:list.filter(x=>x.link.startsWith('referencia_identificada')).length,
  missing:missing.length,alreadyPaid:list.filter(x=>x.status==='pago').length,
  withoutTargetItem:list.filter(x=>x.productId&&!x.targetItemId).length};
 const queue=[
  ...preflight.grade.diffs.map(x=>({owner:'Pedidos',code:'GRADE_DIVERGENTE',sourceId:x.productId,
   description:'Conferir '+x.color+' / '+x.size+': '+x.legacyQty+' → '+x.preparedQty})),
  ...missing.map(x=>({owner:x.stage,code:'VINCULO_SEM_PROVA',sourceId:x.id,
   description:x.needs+': '+x.reason})),
  ...preflight.findings.map(x=>({owner:'Conciliação',code:x.code,sourceId:orderId,description:x.detail})),
  {owner:'Administração',code:'COBERTURA_ORIGINAL',sourceId:orderId,
   description:'Comprovar extração integral e referência dos documentos no programa comercial'},
  {owner:'Homologação',code:'VALIDACAO_NO_SERVIDOR',sourceId:preparedOrderId,
   description:'Conferir leituras em dois computadores, backup, reversão e autorização humana'}
 ].sort((a,b)=>lex(a.owner,b.owner)||lex(a.sourceId,b.sourceId)||lex(a.code,b.code));
 return Object.freeze({
  schema:'hlgb-dossie-pre-migracao-v1',sourceOrderId:orderId,targetOrderId:preparedOrderId,
  grade:preflight.grade,coverage:preflight.collections,
  modelMap,records:list,edges,missing,counters,reviewQueue:queue,
  isCommercialMigrationApproved:false,canExecute:false,canWrite:false,canPay:false,
  canChangeStock:false,canCreateTitle:false,preparedChanges:0,
  disclaimer:'Propostas de correspondência sem aprovação; IDs originais preservados',
  engine:'preflight-vinculos-operacionais-v1'
 });
}
module.exports=Object.freeze({buildDossier});

 })(dossierModule,function(p){if(p!=='./preflight-vinculos-operacionais.cjs')throw Error('Dependência de dossiê inválida');return linksModule.exports;});
 if(typeof gradeModule.exports.compare!=='function'||typeof linksModule.exports.review!=='function'||typeof dossierModule.exports.buildDossier!=='function')throw Error('Motor de migração incompleto');
 root.HLGBLabMigrationPreflightV1=Object.freeze({compare:gradeModule.exports.compare,review:linksModule.exports.review,buildDossier:dossierModule.exports.buildDossier});
})(typeof window!=='undefined'?window:null);
