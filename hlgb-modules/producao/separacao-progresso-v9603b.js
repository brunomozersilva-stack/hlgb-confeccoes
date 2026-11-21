/* HLGB comercial v96.03b — somente cálculos puros do progresso de Separação.
 * Origem: release-separation-commit-v9319.js da main comercial.
 * Nenhuma mutação, IO, WAL, DOM, cloud ou reordenação de scripts antigos.
 */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.HLGB_SEPARATION_PROGRESS_9603B=api;
})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 const sid=v=>String(v??''),num=v=>Math.max(0,Number(v)||0);
 function progress(s,pid){const p=s?.modelProgress||{},id=sid(pid);if(Object.prototype.hasOwnProperty.call(p,id))return num(p[id]?.qty);for(const [k,v] of Object.entries(p))if(sid(k).split(':').pop()===id)return num(v?.qty);return 0}

 function totalsForItems(items,s){let total=0,done=0;for(const it of items){const q=num(it?.qty),d=Math.min(q,progress(s,it?.productId||it?.key));total+=q;done+=d}return {total,done,remaining:Math.max(0,total-done),complete:items.length>0&&done>=total}}
 return Object.freeze({version:'96.03b',progress,totalsForItems});
});
