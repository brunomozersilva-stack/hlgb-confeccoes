'use strict';
/* Lote OFFLINE de pré-migração: nunca persiste, reserva, baixa ou aprova.
 * Garante que pedidos e documentos de diferentes origens não sejam usados
 * duas vezes durante uma eventual reconciliação futura.
 */
const {buildDossier}=require('./dossie-vinculos-v1.cjs');
const key=x=>String(x??'').normalize('NFC').trim().toLocaleLowerCase('pt-BR');
const natural=(a,b)=>String(a).localeCompare(String(b),'pt-BR',{numeric:true});
function buildBatch(candidates){
 if(!Array.isArray(candidates)||candidates.length<1||candidates.length>100)
  throw Error('Informe de 1 a 100 pedidos fictícios completos; nenhuma operação executada.');
 const sourceIds=new Set(),targetIds=new Set(),documentKeys=new Map();
 const orders=[],conflicts=[],totals={orders:0,sourcePieces:0,targetPieces:0,
  documents:0,identifiedReferences:0,missingReferences:0,paidDocuments:0,
  gradeDivergences:0};
 for(const [index,entry] of candidates.entries()){
  if(!entry||typeof entry!=='object'||Array.isArray(entry)||
   !entry.legacy||!entry.prepared||!entry.evidence)
   throw Error('Pedido fictício incompleto na posição '+(index+1));
  const dossier=buildDossier(entry.legacy,entry.prepared,entry.evidence);
  const sourceId=dossier.sourceOrderId,targetId=dossier.targetOrderId;
  const s=key(sourceId),t=key(targetId);
  if(sourceIds.has(s))throw Error('Pedido de origem usado duas vezes no lote: '+sourceId);
  if(targetIds.has(t))throw Error('Pedido de destino usado duas vezes no lote: '+targetId);
  sourceIds.add(s);targetIds.add(t);
  for(const rec of dossier.records){
   const identity=rec.stage+':'+key(rec.id);
   const first=documentKeys.get(identity);
   if(first){
    conflicts.push({kind:'DOCUMENTO_EM_DOIS_PEDIDOS',documentId:rec.id,stage:rec.stage,
     firstOrderId:first,secondOrderId:sourceId,
     needsManualReview:true,canMerge:false});
   }else documentKeys.set(identity,sourceId);
  }
  totals.orders++;totals.sourcePieces+=dossier.grade.source.pieces;
  totals.targetPieces+=dossier.grade.target.pieces;
  totals.documents+=dossier.counters.total;
  totals.identifiedReferences+=dossier.counters.identified;
  totals.missingReferences+=dossier.counters.missing;
  totals.paidDocuments+=dossier.counters.alreadyPaid;
  totals.gradeDivergences+=dossier.grade.diffs.length;
  orders.push({sourceOrderId:sourceId,targetOrderId:targetId,
   gradeEquivalent:dossier.grade.gradeEquivalent&&dossier.grade.sameClient,
   sourcePieces:dossier.grade.source.pieces,targetPieces:dossier.grade.target.pieces,
   documents:dossier.counters.total,missingReferences:dossier.counters.missing,
   paidDocuments:dossier.counters.alreadyPaid,
   unresolved:dossier.reviewQueue.length,
   documentIds:dossier.records.map(x=>({stage:x.stage,id:x.id})),
   migrationApproved:false,canWrite:false});
 }
 if(!Number.isSafeInteger(totals.sourcePieces)||!Number.isSafeInteger(totals.targetPieces))
  throw Error('Soma dos pedidos fora do limite numérico.');
 orders.sort((a,b)=>natural(a.sourceOrderId,b.sourceOrderId));
 conflicts.sort((a,b)=>natural(a.stage,b.stage)||natural(a.documentId,b.documentId)||
  natural(a.secondOrderId,b.secondOrderId));
 const queue=[
  ...conflicts.map(x=>({code:x.kind,sourceOrderId:x.secondOrderId,
   documentId:x.documentId,reason:'Identidade reutilizada em '+x.firstOrderId})),
  ...orders.filter(x=>!x.gradeEquivalent).map(x=>({code:'GRADE_DIVERGENTE',
   sourceOrderId:x.sourceOrderId,documentId:x.sourceOrderId,reason:'Grade ou cliente diferentes'})),
  ...orders.filter(x=>x.missingReferences>0).map(x=>({code:'VINCULOS_INCOMPLETOS',
   sourceOrderId:x.sourceOrderId,documentId:x.sourceOrderId,
   reason:x.missingReferences+' referências não comprovadas'})),
  {code:'EXTRACAO_NAO_AUDITADA',sourceOrderId:'TODOS',documentId:'TODOS',
   reason:'Não foi comprovada a integralidade de pedidos, documentos ou pagamentos do programa comercial'}
 ].sort((a,b)=>natural(a.code,b.code)||natural(a.sourceOrderId,b.sourceOrderId));
 return Object.freeze({schema:'hlgb-lote-preflight-v1',
  orders,totals,conflicts,reviewQueue:queue,
  duplicateOrderIdsRejected:true,crossOrderLinksAudited:false,
  importable:false,approvedForProduction:false,canWrite:false,
  canPay:false,canChangeStock:false,preparedChanges:0,
  note:'Nenhum registro é importado; IDs originais e vínculos exigem conferência humana e validação em servidor.'
 });
}
module.exports=Object.freeze({buildBatch});
