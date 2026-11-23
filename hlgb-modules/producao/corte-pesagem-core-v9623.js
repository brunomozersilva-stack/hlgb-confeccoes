/* HLGB Comercial v96.23 — validação pura de pesagem do corte.
 * Origem: release-cut-weight-v9579.js. Sem rede, WAL, browser API ou mutação.
 * Estatísticas são informativas: não inferem baixa de material ou saldo de estoque.
 */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.HLGB_CUT_WEIGHT_CORE_9623=api;
})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 const sid=x=>String(x??''),num=x=>Number(sid(x).replace(',','.'));
 function validate(input){
  const total=num(input?.totalKg),used=num(input?.usedKg||0),waste=num(input?.wasteKg||0),note=sid(input?.note).trim();
  if(!Number.isFinite(total)||total<=0||total>20000)throw Error('Informe o peso total do corte em kg (maior que zero).');
  for(const [name,value] of [['usado',used],['refugo',waste]])if(!Number.isFinite(value)||value<0||value>20000)throw Error('Peso '+name+' inválido.');
  if(used>total+.001||waste>total+.001)throw Error('Peso usado/refugo não pode ser maior que o peso total.');
  if(note.length>300)throw Error('Observação com até 300 caracteres.');
  return {totalKg:+total.toFixed(3),usedKg:+used.toFixed(3),wasteKg:+waste.toFixed(3),note};
 }
 // Indicadores de referência; NÃO somar usado+refugo para deduzir saldo de tecido,
 // pois as categorias podem ter sobreposição conforme preenchimento da operação.
 function stats(payload,pieces){
  const p=validate(payload),qty=Number(pieces),valid=Number.isFinite(qty)&&qty>0;
  return Object.freeze({
   totalKg:p.totalKg,usedKg:p.usedKg,wasteKg:p.wasteKg,
   usedPercent:+(p.usedKg/p.totalKg*100).toFixed(2),
   wastePercent:+(p.wasteKg/p.totalKg*100).toFixed(2),
   piecesPerKg:valid?+(qty/p.totalKg).toFixed(3):null,
   comparableYield:valid
  });
 }
 return Object.freeze({version:'96.23',validate,stats});
});
