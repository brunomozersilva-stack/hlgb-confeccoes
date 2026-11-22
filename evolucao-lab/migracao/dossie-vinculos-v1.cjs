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
