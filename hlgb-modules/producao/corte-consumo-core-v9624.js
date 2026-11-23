/* HLGB Comercial v96.24 — cálculos puros de consumo por corte e sobras.
 * Extraídos de release-cut-material-usage.js, sem DOM, rede, banco ou mutação.
 * Não calcula encaixe geométrico, não baixa estoque e não confirma economia Audaces.
 */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.HLGB_CUT_MATERIAL_MATH_CORE_9624=api;
})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 const sid=v=>String(v??''),q=v=>Math.max(0,Number(v)||0);
 const norm=v=>sid(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
 function grams(weight,unit){
  const w=q(weight),u=norm(unit);
  return u==='kg'?w*1000:u==='g'||u==='grama'||u==='gramas'?w:0;
 }
 function kg(weight,unit){return grams(weight,unit)/1000}
 function usageStats(pieces,u,materialPrice){
  const pcs=q(pieces),k=kg(u?.weight,u?.unit),price=q(u?.price||materialPrice);
  const piecesPerKg=k>0?pcs/k:0,gramsPerPiece=pcs>0?(k*1000)/pcs:0,totalCost=k*price,costPerPiece=pcs>0?totalCost/pcs:0;
  return {piecesPerKg,gramsPerPiece,totalCost,costPerPiece,pricePerKg:price};
 }
 function extraProfit(e){
  const qty=q(e?.qty),sale=q(e?.saleUnitPrice),cost=q(e?.costUnitPrice);
  return {qty,revenue:qty*sale,cost:qty*cost,profit:qty*(sale-cost),marginPerPiece:sale-cost};
 }
 // Diagnóstico de unidade inválida e preço ausente, sem inventar quantidades.
 function review(pieces,u,materialPrice){
  const unit=norm(u?.unit),validUnit=['kg','g','grama','gramas'].includes(unit);
  const stats=usageStats(pieces,u,materialPrice);
  return Object.freeze({validUnit,unit:unit||null,hasWeight:q(u?.weight)>0,
   hasPositivePrice:stats.pricePerKg>0,hasPieces:q(pieces)>0,stats});
 }
 return Object.freeze({version:'96.24',grams,kg,usageStats,extraProfit,review});
});
