/* HLGB Comercial v96.22 — regras puras de grade/estado para programação por modelo.
 * Extraídas de release-cutter-planner.js. Sem DOM, gravação, nuvem, WAL ou mutação.
 */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.HLGB_CUTTER_PLANNER_CORE_9622=api;
})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 const sid=v=>String(v??''),q=v=>Math.max(0,Number(v)||0);
 const norm=v=>sid(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
 function modelGrade(o,pid){return (Array.isArray(o?.grade)?o.grade:[]).filter(g=>sid(g?.productId)===sid(pid)&&q(g?.qty)>0)}
 function modelPieces(o,pid){return modelGrade(o,pid).reduce((s,g)=>s+q(g.qty),0)}
 function modelIds(o){return [...new Set((Array.isArray(o?.grade)?o.grade:[]).map(g=>sid(g?.productId)).filter(Boolean))]}
 function modelAlreadyCut(o,pid,cuts){
  const ids=modelIds(o);
  return (Array.isArray(cuts)?cuts:[]).some(c=>c&&sid(c.orderId)===sid(o.id)&&norm(c.status)==='finalizado'&&
   (sid(c.productId)===sid(pid)||(!c.productId&&ids.length===1)));
 }
 return Object.freeze({version:'96.22',modelGrade,modelPieces,modelIds,modelAlreadyCut});
});
