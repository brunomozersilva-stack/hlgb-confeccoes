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
   sources[key]={verified:false,records:0};
   note('COLECAO_NAO_CONFERIDA','bloqueio','Faltam dados conferidos de '+key+'; ausência de arquivo não comprova saldo zero');
   continue;
  }
  if(evidence[key].length>10000)throw Error('Extrato excede o limite em '+key);
  sources[key]={verified:true,records:evidence[key].length};
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
 const settlements=new Map((evidence.settlements||[]).map(x=>[x.id,x]));
 const linked=new Map();
 for(const item of evidence.finance||[]){
  const id=validId(item.id,'finance / id');
  const sourceId=validId(item.sourceId,'finance / sourceId');
  cents(item.amountCents,'finance / '+id+' / valor');
  if(item.orderId!==undefined&&item.orderId!==orderId)
   throw Error('Título financeiro pertence a outro pedido: '+id);
  const source=settlements.get(sourceId);
  if(source){
   linked.set(sourceId,(linked.get(sourceId)||0)+1);
   if(source.amountCents!==item.amountCents||source.status!==item.status)
    note('FINANCEIRO_DIVERGENTE','bloqueio',sourceId+' e título '+id+' diferem no valor ou na situação');
  }else{
   note('TITULO_ORIGEM_NAO_COMPROVADA','bloqueio','Título '+id+' tem origem '+sourceId+' não identificada nos acertos deste extrato');
  }
  if(item.status==='pago')
   note('TITULO_PAGO','bloqueio','Título '+id+' já consta como pago; bloquear repetição de baixa');
 }
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
  noWrites:true
 });
}
module.exports=Object.freeze({review});
