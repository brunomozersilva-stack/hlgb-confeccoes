/* HLGB Corte v96.04 — cálculos puros da folha do cortador.
 * Sem acesso a banco, IndexedDB, WAL, DOM, login, impressão ou rede.
 * A chamada de materiais recebe um resolvedor SOMENTE de leitura.
 */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.HLGB_CUTTER_SHEET_CORE_9604=api;
})(typeof window!=='undefined'?window:null,function(){
 'use strict';
const sid=v=>String(v==null?'':v);
const qty=v=>{const n=Number(v);return Number.isFinite(n)&&n>0?n:0};
const fmt=v=>Number(qty(v).toFixed(4)).toLocaleString('pt-BR',{maximumFractionDigits:4});
function gradeOf(o,c){
 const pid=sid(c.productId);
 const chosen=Array.isArray(c.actualCutGrade)&&c.actualCutGrade.length&&
   sid(c.status).toLowerCase()==='finalizado'?c.actualCutGrade:
   Array.isArray(c.originalGrade)&&c.originalGrade.length?c.originalGrade:
   Array.isArray(c.actualCutGrade)&&c.actualCutGrade.length?c.actualCutGrade:o.grade||[];
 return chosen.filter(g=>g&&(!pid||!g.productId||sid(g.productId)===pid)&&qty(g.qty)>0);
}
function planMaterials(p,pieces,lookupMaterial){
 if(!p||!Array.isArray(p.materials)||!p.materials.length)return [];
 return p.materials.map(m=>{
   const catalog=typeof lookupMaterial==='function'?lookupMaterial(m.materialId):null;
   const per=qty(m.qty),loss=qty(m.loss),mode=sid(m.calcMode||'consumption');
   const valid=per>0&&(mode==='yield'||mode==='consumption');
   const predicted=valid?(mode==='yield'?pieces/per:pieces*per)*(1+loss/100):null;
   const unit=sid(m.unit||catalog&&catalog.unit||'');
   return {name:sid(m.name||catalog&&catalog.name||''),unit,
     calculated:Number.isFinite(predicted)?predicted:null,
     rule:valid?(mode==='yield'?'Rend. '+fmt(per)+' pç/'+unit:'Cons. '+fmt(per)+' '+unit+'/pç')+(loss?' · perda '+fmt(loss)+'%':''):'',
     warning:!valid};
 });
}
return Object.freeze({version:'96.04',gradeOf,planMaterials});
});
