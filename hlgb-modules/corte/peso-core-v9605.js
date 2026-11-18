/* HLGB Corte v96.05 — validação pura do peso e equivalência conservadora.
 * Não usa banco, rede, IndexedDB, DOM ou relógio.
 */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.HLGB_CUT_WEIGHT_CORE_9605=api;
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

 function canonical(value,root){
  if(Array.isArray(value))return value.map(x=>canonical(x,false));
  if(value&&typeof value==='object'){
   const out={};
   for(const key of Object.keys(value).sort()){
    if(root&&(key==='updatedAt'||key==='updated_at'))continue;
    out[key]=canonical(value[key],false);
   }
   return out;
  }
  return value;
 }
 function sameCut(a,b){
  return !!(a&&b&&JSON.stringify(canonical(a,true))===JSON.stringify(canonical(b,true)));
 }
 return Object.freeze({version:'96.05',validate,sameCut});
});
