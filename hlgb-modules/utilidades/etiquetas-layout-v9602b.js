/* HLGB COMERCIAL v96.02b: apresentação pura de etiquetas A4.
 * Sem acesso a banco, DOM, gravações, rede, popup ou impressora.
 * Contrato de saída derivado literalmente de release-label-destination-v9310.js em main.
 */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.HLGB_LABEL_LAYOUT_9602B=api;
})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
 function labelSize(mode){
  return mode==='large'?{w:92,h:52,cols:2,rows:5,font:18,line:1.42,gap:.8,title:19}
       : mode==='medium'?{w:62,h:40,cols:3,rows:6,font:14,line:1.30,gap:.45,title:15}
       : {w:62,h:34,cols:3,rows:7,font:12,line:1.22,gap:.25,title:13};
}
function labelBody(x,tag='span'){
  const line=(t,v)=>'<'+tag+'>'+t+': '+esc(v||'-')+'</'+tag+'>';
  let h=(x.name?'<b>'+esc(x.name)+'</b>':'')+line('MODELO',x.model)+line('TAMANHO',x.size)+line('QUANTIDADE',x.pieceQty)+line('VOLUME',x.volume)+line('DESTINO',x.destination);
  if(x.includeDate&&x.date)h+=line('DATA',x.date);
  return h;
}

 return Object.freeze({version:'96.02b',labelSize,labelBody});
});
