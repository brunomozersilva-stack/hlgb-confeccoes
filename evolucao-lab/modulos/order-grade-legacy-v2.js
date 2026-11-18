/* HLGB Evolução: adaptador SOMENTE LEITURA para grade legada de múltiplos modelos.
 * Não grava em banco, não substitui o pedido original, não altera cores ou referências.
 * Proteção para fase futura de migração, somente em testes de dados fictícios.
 */
(function(root,factory){
 const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;
 else if(root)root.HLGBLegacyOrderMatrixV2=api;
})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 const clone=v=>JSON.parse(JSON.stringify(v));
 const scalar=v=>typeof v==='string'||typeof v==='number'&&Number.isFinite(v);
 const validSize=v=>typeof v==='string'&&v.trim()&&v.length<=24;
 function preview(order,sizeCatalog=[]){
  if(!order||typeof order!=='object'||Array.isArray(order)||!Array.isArray(order.grade))
   throw Error('Pedido legado precisa conter uma lista de grade por modelo/cor/tamanho.');
  if(!Array.isArray(sizeCatalog)||sizeCatalog.some(x=>!validSize(x)))
   throw Error('Catálogo de tamanhos inválido. Nenhuma conversão efetuada.');
  if(order.grade.length>30000)throw Error('Grade excede o limite de conferência segura.');
  const orderCopy=clone(order),sizeOrder=[],seenSizes=new Set(),products=new Map(),warnings=[];
  const registerSize=size=>{if(!seenSizes.has(size)){seenSizes.add(size);sizeOrder.push(size);}};
  for(const size of sizeCatalog)registerSize(size);
  for(const [index,row] of order.grade.entries()){
   if(!row||typeof row!=='object'||Array.isArray(row))
    throw Error('Linha '+(index+1)+' de grade ilegível; pedido não pode ser migrado.');
   if(!validSize(row.size)||!Number.isSafeInteger(row.qty)||row.qty<0)
    throw Error('Tamanho ou quantidade inválidos na linha '+(index+1)+'; não corrigir silenciosamente.');
   if(row.productId!==null&&row.productId!==undefined&&!scalar(row.productId))
    throw Error('Referência de produto inválida na linha '+(index+1)+'.');
   if(row.color!==null&&row.color!==undefined&&typeof row.color!=='string')
    throw Error('Cor inválida na linha '+(index+1)+'.');
   if(row.productId===undefined||row.productId===null||row.productId==='')
    warnings.push('Linha '+(index+1)+' sem produto explícito: exige identificação antes da migração.');
   if(!sizeCatalog.includes(row.size))warnings.push('Tamanho '+row.size+' fora do catálogo original; preservado sem alteração.');
   registerSize(row.size);
   const productKey=JSON.stringify([typeof row.productId,row.productId??null]);
   if(!products.has(productKey))products.set(productKey,{productId:row.productId??null,colors:new Map(),qty:0,lineIndexes:[]});
   const product=products.get(productKey),colorKey=JSON.stringify([row.color??null]);
   if(!product.colors.has(colorKey))product.colors.set(colorKey,{color:row.color??null,qty:0,bySize:{},sourceIndexes:[]});
   const c=product.colors.get(colorKey);
   c.bySize[row.size]=(c.bySize[row.size]||0)+row.qty;c.qty+=row.qty;c.sourceIndexes.push(index);
   product.qty+=row.qty;product.lineIndexes.push(index);
  }
  const items=[...products.values()].map(item=>({
   productId:item.productId,qty:item.qty,lineIndexes:[...item.lineIndexes],
   colors:[...item.colors.values()].map(c=>({
    color:c.color,qty:c.qty,bySize:Object.fromEntries(sizeOrder.map(size=>[size,c.bySize[size]||0])),
    sourceIndexes:[...c.sourceIndexes]
   }))
  }));
  const bySize=Object.fromEntries(sizeOrder.map(size=>[size,order.grade.filter(x=>x.size===size).reduce((n,x)=>n+x.qty,0)]));
  const total=order.grade.reduce((n,row)=>n+row.qty,0);
  if(!Number.isSafeInteger(total)||total>1000000000)throw Error('Total de peças fora do limite seguro de conferência.');
  if(items.reduce((n,item)=>n+item.qty,0)!==total)throw Error('Divergência por modelo; migração bloqueada.');
  return {
   schema:'hlgb-legacy-order-matrix-preview-v2',migrationApproved:false,
   sourceOrderId:order.id??null,original:orderCopy,sizeOrder,items,
   totals:{pieces:total,bySize,models:items.length,sourceRows:order.grade.length},
   warnings:[...new Set(warnings)]
  };
 }
 function restore(view){
  if(!view||view.schema!=='hlgb-legacy-order-matrix-preview-v2'||!view.original)
   throw Error('Prévia de grade não reconhecida.');
  return clone(view.original);
 }
 function inspect(view){
  const legacy=restore(view),recomputed=preview(legacy,view.sizeOrder);
  if(JSON.stringify(recomputed.items)!==JSON.stringify(view.items)||
     JSON.stringify(recomputed.totals)!==JSON.stringify(view.totals)||
     JSON.stringify(recomputed.original)!==JSON.stringify(view.original))
   throw Error('Prévia foi alterada; nenhuma migração pode prosseguir.');
  return {ok:true,migrationApproved:false,models:view.items.length,rows:legacy.grade.length,
   exactRoundtrip:JSON.stringify(legacy)===JSON.stringify(view.original),warnings:[...view.warnings]};
 }
 return Object.freeze({preview,restore,inspect});
});
