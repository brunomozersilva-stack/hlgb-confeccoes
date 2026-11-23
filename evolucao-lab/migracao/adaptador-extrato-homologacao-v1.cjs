'use strict';
/* Adaptador de EXTRATO PAGINADO OFFLINE: recebe objetos já fornecidos.
 * NÃO conecta ao banco, ao main, ao Supabase, à rede ou ao navegador.
 * Nenhuma saída é instrução para criar/baixar estoque ou financeiro.
 */
const {createHash}=require('node:crypto');
const {buildBatch}=require('./dossie-lote-v1.cjs');
const COLLECTIONS=Object.freeze([
 'legacyOrders','preparedOrders','cuts','allocations','settlements','finance'
]);
const KEY=x=>String(x??'').normalize('NFC').trim().toLocaleLowerCase('pt-BR');
const validId=(s,label)=>{
 if(typeof s!=='string'||!s.trim()||s.length>128)
  throw Error(label+': ID explícito obrigatório (até 128 caracteres)');
 return s.trim();
};
const int=(n,label,min,max)=>{
 if(!Number.isSafeInteger(n)||n<min||n>max)throw Error(label+' fora do limite '+min+'–'+max);
 return n;
};
function canonical(value){
 if(value===null||typeof value==='boolean'||typeof value==='string')return JSON.stringify(value);
 if(typeof value==='number'){
  if(!Number.isFinite(value)||!Number.isSafeInteger(value))throw Error('Número inválido no extrato');
  return JSON.stringify(value);
 }
 if(Array.isArray(value))return '['+value.map(canonical).join(',')+']';
 if(value&&typeof value==='object'){
  if(Object.getPrototypeOf(value)!==Object.prototype&&Object.getPrototypeOf(value)!==null)
   throw Error('Objeto do extrato com tipo não permitido');
  const keys=Object.keys(value).sort();
  if(keys.some(x=>['__proto__','constructor','prototype'].includes(x)))
   throw Error('Chave reservada no extrato');
  return '{'+keys.map(x=>JSON.stringify(x)+':'+canonical(value[x])).join(',')+'}';
 }
 throw Error('Tipo de dado não permitido no extrato');
}
const sha256=value=>createHash('sha256').update(canonical(value),'utf8').digest('hex');
// Nunca transformar tombstones legados em itens ativos por conveniência.
const isTombstone=(doc,label)=>{
 const deletedFlags=['deleted','isDeleted'];
 const dates=['deletedAt','deleted_at'];
 for(const key of deletedFlags){
  if(doc[key]!==undefined&&doc[key]!==null&&typeof doc[key]!=='boolean')
   throw Error(label+' / '+key+': marcador de exclusão inválido');
 }
 for(const key of dates){
  if(doc[key]!==undefined&&doc[key]!==null&&typeof doc[key]!=='string')
   throw Error(label+' / '+key+': data de exclusão inválida');
 }
 return deletedFlags.some(key=>doc[key]===true)||
  dates.some(key=>typeof doc[key]==='string'&&doc[key].trim()!=='');
};
const emptyReport={importable:false,approvedForProduction:false,canWrite:false,
 canPay:false,canChangeStock:false,preparedChanges:0};
function inspectExtract(payload){
 if(!payload||typeof payload!=='object'||Array.isArray(payload))
  throw Error('Extrato de homologação ausente');
 if(payload.schema!=='hlgb-extrato-homologacao-v1')
  throw Error('Versão de extrato desconhecida: interromper a leitura');
 const {source,manifest,pages}=payload;
 if(!source||!manifest||!Array.isArray(pages))throw Error('Envelope de extrato incompleto');
 if(source.environment!=='homologacao-ficticia'||source.readOnly!==true)
  throw Error('Só é permitido extrato de homologação fictícia e somente leitura');
 const snapshotId=validId(source.snapshotId,'snapshotId'),
  revision=validId(source.revision,'revision');
 if(typeof source.capturedAt!=='string'||!Number.isFinite(Date.parse(source.capturedAt))||
  !/^\d{4}-\d{2}-\d{2}T/.test(source.capturedAt))
  throw Error('Data da leitura não é ISO 8601 válida');
 if(pages.length<6||pages.length>500)throw Error('Total de páginas fora do limite');
 const entries={};for(const name of COLLECTIONS)entries[name]=[];
 const receipts=[],pageKeys=new Set(),uniqueByCollection=new Map(),checks={};
 for(const name of COLLECTIONS){
  const spec=manifest[name];
  if(!spec||typeof spec!=='object'||Array.isArray(spec))
   throw Error('Coleção sem manifesto: '+name);
  checks[name]={pages:int(spec.pages,name+' / páginas',1,100),
   records:int(spec.records,name+' / registros',0,20000),read:0};
  uniqueByCollection.set(name,new Set());
 }
 for(const page of pages){
  if(!page||!COLLECTIONS.includes(page.collection))throw Error('Página de coleção desconhecida');
  const c=page.collection,spec=checks[c];
  if(page.snapshotId!==snapshotId||page.revision!==revision)
   throw Error('Mistura de snapshots ou revisões na coleção '+c);
  const number=int(page.page,c+' / número da página',1,spec.pages);
  const id=c+'#'+number;
  if(pageKeys.has(id))throw Error('Página duplicada: '+id);
  pageKeys.add(id);
  if(!Array.isArray(page.records)||page.records.length>2000)
   throw Error('Página com registros ilegíveis ou excedente: '+id);
  const digest=sha256(page.records);
  if(page.checksum!=='sha256:'+digest)throw Error('Checksum não confere em '+id+
   '; não usar páginas alteradas');
  for(const record of page.records){
   if(!record||typeof record!=='object'||Array.isArray(record))
    throw Error('Registro inválido em '+id);
   const recordId=validId(record.id,c+' / registro');
   const identity=KEY(recordId),ids=uniqueByCollection.get(c);
   if(ids.has(identity))throw Error('Registro duplicado dentro de '+c+': '+recordId);
   ids.add(identity);
   entries[c].push(record);
  }
  spec.read+=page.records.length;
  receipts.push({collection:c,page:number,records:page.records.length,checksum:page.checksum});
 }
 for(const c of COLLECTIONS){
  const spec=checks[c];
  if(spec.read!==spec.records)throw Error(c+': contagem de registros não confere ('+
   spec.read+' versus '+spec.records+')');
  for(let i=1;i<=spec.pages;i++)if(!pageKeys.has(c+'#'+i))
   throw Error(c+': página '+i+' ausente; leitura incompleta');
 }
 if(entries.legacyOrders.length>100||entries.preparedOrders.length>100)
  throw Error('Máximo 100 pedidos de cada tipo por lote de revisão');
 // A extração ainda contém os documentos excluídos para auditoria, porém
 // a prévia jamais os transforma em registros operacionais ativos.
 const tombstones=[],active={};
 for(const name of COLLECTIONS){
  active[name]=entries[name].filter(doc=>{
   if(!isTombstone(doc,name+' / '+doc.id))return true;
   tombstones.push({collection:name,recordId:doc.id,
    sourceOrderId:typeof doc.sourceOrderId==='string'?doc.sourceOrderId:null,
    orderId:typeof doc.orderId==='string'?doc.orderId:null,
    restoredAsActive:false,needsManualReview:true});
   return false;
  });
 }
 const legacyIds=new Map(active.legacyOrders.map(o=>[KEY(o.id),o]));
 const prepared=new Map(),unmapped=[],findings=[],candidates=[];
 for(const o of active.preparedOrders){
  const id=validId(o.sourceOrderId,'preparedOrders.sourceOrderId'),
   k=KEY(id);
  if(prepared.has(k))throw Error('Dois pedidos preparados apontam para '+id);
  prepared.set(k,o);
  if(!legacyIds.has(k))
   unmapped.push({kind:'PREPARADO_SEM_ORIGEM',recordId:o.id,sourceOrderId:id});
 }
 const evidenceTypes=['cuts','allocations','settlements','finance'];
 const byOrder=new Map([...legacyIds.keys()].map(id=>[id,{
  cuts:[],allocations:[],settlements:[],finance:[]
 }]));
 const unattached=[];
 for(const kind of evidenceTypes){
  for(const record of active[kind]){
   if(typeof record.orderId!=='string'||!record.orderId.trim()){
    unattached.push({kind,recordId:record.id,reason:'DOCUMENTO_SEM_PEDIDO_EXPLICITO'});
    continue;
   }
   const id=KEY(record.orderId),target=byOrder.get(id);
   if(!target){unattached.push({kind,recordId:record.id,
    reason:'PEDIDO_DE_ORIGEM_NAO_LOCALIZADO'});continue;}
   target[kind].push(record);
  }
 }
 for(const old of active.legacyOrders){
  const k=KEY(old.id),next=prepared.get(k);
  if(!next){
   unmapped.push({kind:'PEDIDO_SEM_PREPARO',recordId:old.id,sourceOrderId:old.id});
   continue;
  }
  // Uma revisão de pedido completo herda EXATAMENTE documentos do mesmo ID.
  candidates.push({legacy:old,prepared:next,evidence:{orderId:old.id,...byOrder.get(k)}});
 }
 let batch=null;
 if(candidates.length){
  try{batch=buildBatch(candidates);}
  catch(err){
   findings.push({code:'PREVIEW_RECUSED',detail:String(err?.message||'Falha de conciliação')});
  }
 }
 if(tombstones.length)findings.push({code:'TOMBSTONES_PRESERVADOS_SEM_REATIVACAO',
  detail:tombstones.length+' registros excluídos retidos apenas para conferência histórica'});
 if(unattached.length)findings.push({code:'DOCUMENTOS_SEM_REFERENCIA_COMPROVADA',
  detail:unattached.length+' documentos sem pedido de origem comprovado'});
 if(unmapped.length)findings.push({code:'PEDIDOS_SEM_PAR_EXPLICITO',
  detail:unmapped.length+' pedidos sem correspondência exata por sourceOrderId'});
 if(batch?.conflicts.length)findings.push({code:'MESMO_DOCUMENTO_EM_VARIOS_PEDIDOS',
  detail:batch.conflicts.length+' documentos repetidos entre pedidos'});
 findings.push({code:'ORIGEM_NAO_VERIFICADA_EM_SERVIDOR',
  detail:'Checksums confirmam o conteúdo recebido, não que a extração incluiu o banco inteiro'});
 receipts.sort((a,b)=>COLLECTIONS.indexOf(a.collection)-COLLECTIONS.indexOf(b.collection)||a.page-b.page);
 const digest=sha256({snapshotId,revision,manifest,receipts});
 return Object.freeze({
  schema:'hlgb-extrato-preflight-resultado-v1',
  source:{snapshotId,revision,capturedAt:source.capturedAt,environment:source.environment},
  manifest:checks,documentCollections:COLLECTIONS.slice(),
  digest,completeAgainstDeclaredManifest:true,
  pagesChecked:receipts.length,sourceCounts:{...Object.fromEntries(
   COLLECTIONS.map(c=>[c,entries[c].length]))},
  mappedOrders:candidates.length,unmapped,unattached,tombstones,
  historicalRecordsReactivated:0,findings,
  batch,
  checksumsVerified:true,independentlyVerified:false,realDatabaseCoverageProven:false,
  ...emptyReport
 });
}
function compareReads(first,second){
 const a=inspectExtract(first),b=inspectExtract(second);
 const sameRevision=a.source.revision===b.source.revision&&
  a.source.snapshotId===b.source.snapshotId;
 const sameContents=a.digest===b.digest;
 return Object.freeze({schema:'hlgb-duas-leituras-v1',sameRevision,
  sameContents,firstDigest:a.digest,secondDigest:b.digest,
  firstPages:a.pagesChecked,secondPages:b.pagesChecked,
  confirmedByIndependentDatabase:false,
  safeToUseAsMigrationApproval:false,...emptyReport});
}
module.exports=Object.freeze({inspectExtract,compareReads,sha256,canonical});
