/* HLGB COMERCIAL v96.05b: seleção pura e SOMENTE LEITURA do corte após Separação.
 * A fonte da main permanece com fallback e detém TODA a escrita Supabase/WAL.
 */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.HLGB_SEPARATION_CUT_TARGET_CORE_9605B=api;
})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 const sid=v=>String(v??'');
 function activeSeparationOrderId(status){
  try{
   const a=Array.isArray(status?.busy)?status.busy:[];
   for(const raw of a){
    const s=sid(raw);
    if(!s)continue;
    if(s.startsWith('finish|'))return s.slice(7);
    const p=s.indexOf('|');
    if(p>0)return s.slice(0,p);
   }
  }catch(e){}
  return '';
 }
 function uniqueProductId(order,projectionRows){
  const ids=new Set();
  try{
   if(Array.isArray(projectionRows))for(const r of projectionRows){
    const id=sid(r?.productId||r?.key).trim();
    if(id)ids.add(id);
   }
  }catch(e){}
  if(!ids.size){
   for(const g of (Array.isArray(order?.grade)?order.grade:[])){
    const id=sid(g?.productId).trim();
    if(id)ids.add(id);
   }
  }
  return ids.size===1?[...ids][0]:'';
 }
 return Object.freeze({version:'96.05b',activeSeparationOrderId,uniqueProductId});
});
