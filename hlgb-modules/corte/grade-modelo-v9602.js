/* HLGB Corte — funções puras de grade por modelo (v96.02).
 * Não lê banco, não registra WAL e não mexe na tela.
 * Retém estritamente a semântica usada pela programação de cortadores.
 */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.HLGB_CUTTER_GRADE_9602=api;
})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 const sid=v=>String(v??''),q=v=>Math.max(0,Number(v)||0);
 function modelGrade(order,productId){
  return (Array.isArray(order?.grade)?order.grade:[])
   .filter(line=>sid(line?.productId)===sid(productId)&&q(line?.qty)>0);
 }
 function modelPieces(order,productId){
  return modelGrade(order,productId).reduce((sum,row)=>sum+q(row.qty),0);
 }
 function modelIds(order){
  return [...new Set((Array.isArray(order?.grade)?order.grade:[])
   .map(line=>sid(line?.productId)).filter(Boolean))];
 }
 return Object.freeze({version:'96.02',modelGrade,modelPieces,modelIds});
});
