/* HLGB Evolucao — impacto hipotetico de alteracoes em pedidos sobre materiais.
 * PURO, somente laboratorio. Nunca grava estoque, compra, financeiro ou programacao.
 * Escopo: custo/consumo marginal de uma alteracao; NAO e disponibilidade global.
 */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 else if(root)root.HLGBLabOrderMaterialImpactV1=api;
})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 const key=x=>String(x??'').trim().toLocaleUpperCase('pt-BR');
 const sum=(a,k)=>a.reduce((n,x)=>n+x[k],0);
 function impact(state,preview){
  if(!state||!Array.isArray(state.products)||!Array.isArray(state.materials)||
     !preview||!Array.isArray(preview.changes)||!Number.isSafeInteger(preview.baseRevision)||
     preview.baseRevision!==state.revision)
   throw Error('Previa desatualizada ou catalogo indisponivel: simule novamente.');
  const order=(state.multiOrders||[]).find(x=>x.id===preview.orderId);
  if(!order)throw Error('Pedido nao encontrado. Nenhuma previsao de materiais.');
  const rules=state.materialRecipeRules||[];
  if(!Array.isArray(rules))throw Error('Receitas de materiais invalidas.');
  const materials=new Map(),missing=[],details=[];
  for(const change of preview.changes){
   if(!Number.isSafeInteger(change.beforeQty)||!Number.isSafeInteger(change.afterQty)||
      change.beforeQty<0||change.afterQty<0||
      change.afterQty-change.beforeQty!==change.deltaQty)
    throw Error('Diferenca de grade invalida. Simule novamente.');
   const item=order.items.find(x=>x.id===change.itemId);
   // Item novo existe somente na previa: resolva pelo mapa do catalogo de modelos
   const product=state.products.find(x=>x.id===(item?.productId||
     preview.newItemProductIds?.[change.itemId]));
   if(!product){missing.push({itemId:change.itemId,color:change.color,size:change.size,reason:'modelo_sem_identificacao'});continue;}
   const materialIds=new Set([product.materialId,...rules.filter(x=>x.active&&x.productId===product.id).map(x=>x.materialId)].filter(Boolean));
   if(!materialIds.size){missing.push({itemId:change.itemId,color:change.color,size:change.size,reason:'sem_ficha_tecnica'});continue;}
   let covered=false;
   for(const materialId of materialIds){
    const material=state.materials.find(x=>x.id===materialId);
    if(!material)throw Error('Material da ficha tecnica nao localizado: '+materialId);
    const eligible=rules.filter(x=>x.active&&x.productId===product.id&&x.materialId===materialId&&
      (x.color==='*'||key(x.color)===key(change.color))&&
      (x.size==='*'||key(x.size)===key(change.size)));
    eligible.sort((a,b)=>((b.color==='*'?0:2)+(b.size==='*'?0:1))-
                         ((a.color==='*'?0:2)+(a.size==='*'?0:1)));
    const rule=eligible[0];
    const grams=rule?rule.gramsPerUnit:materialId===product.materialId?product.gramsPerUnit:null;
    if(!Number.isSafeInteger(grams)||grams<=0||grams>5000){
     missing.push({itemId:change.itemId,materialId,color:change.color,size:change.size,reason:'consumo_nao_definido'});
     continue;
    }
    covered=true;
    const deltaGrams=change.deltaQty*grams;
    if(!Number.isSafeInteger(deltaGrams))throw Error('Consumo excedeu limite seguro.');
    const old=materials.get(materialId)||{materialId,name:material.name,deltaGrams:0,priceCentsKg:material.priceCentsKg,stockSnapshotGrams:material.stockGrams};
    old.deltaGrams+=deltaGrams;materials.set(materialId,old);
    details.push({itemId:change.itemId,model:product.name,color:change.color,size:change.size,
      materialId,gramsPerUnit:grams,deltaQty:change.deltaQty,deltaGrams,ruleId:rule?.id||'ficha_basica'});
   }
   if(!covered&&!missing.some(m=>m.itemId===change.itemId&&m.color===change.color&&m.size===change.size))
    missing.push({itemId:change.itemId,color:change.color,size:change.size,reason:'sem_consumo_valido'});
  }
  const results=[...materials.values()].map(x=>{
   if(!Number.isSafeInteger(x.deltaGrams)||!Number.isSafeInteger(x.stockSnapshotGrams)||
      x.stockSnapshotGrams<0||!Number.isSafeInteger(x.priceCentsKg)||x.priceCentsKg<0)
    throw Error('Estoque ou custo de material inconsistente.');
   return {...x,deltaCostCents:Math.round(x.deltaGrams*x.priceCentsKg/1000),
    // Nao descontar estoque: pedidos existentes, reservas e perdas nao estao reconciliados.
    stockAssessment:'nao_reconciliado'};
  });
  return {schema:'hlgb-lab-order-material-impact-v1',orderId:preview.orderId,
   baseRevision:preview.baseRevision,deltaPieces:preview.deltaPieces,
   deltaGrams:sum(results,'deltaGrams'),deltaCostCents:sum(results,'deltaCostCents'),
   materials:results,details,missingRecipes:missing,complete:missing.length===0,
   scheduleAssessment:'capacidade_nao_cadastrada',
   stockAssessment:'estoque_global_nao_reconciliado',
   stockWritten:false,purchaseCreated:false,financeWritten:false,
   canAuthorizeProduction:false};
 }
 return Object.freeze({version:'1.0.0-lab',impact});
});
