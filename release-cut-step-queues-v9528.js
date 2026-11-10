/* HLGB v95.28 — avanço automático das FILAS por modelo (sem excluir dados).
   Corte finalizado deixa fila de Corte; facção/local confirmado deixa fila Aguardando.
   Histórico permanece consultável em Produção e no botão Mostrar já atribuídos. */
(function(){
'use strict';
if(window.hlgbCutStepQueues9528)return;
const V='95.28',sid=v=>String(v==null?'':v);
const norm=v=>sid(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase();
const arr=k=>{try{return Array.isArray(db&&db[k])?db[k]:[]}catch(_){return []}};
const hasDestination=p=>!!(p&&(p.productionLocationId||p.factionId));
const assigned=p=>!!(p&&(hasDestination(p)||p.assignedAt||p.sentToFactionAt||
  ['em producao','pronto','finalizado','concluido','consolidado'].includes(norm(p.stage))));
const isAwaiting=p=>{
 if(!p||!p.cutId||p.finishedAt||Number(p.planned)<=0||assigned(p))return false;
 return !['cancelado','cancelada'].includes(norm(p.stage));
};
function currentProduction(p){
 if(!p)return null;
 return arr('production').find(x=>sid(x?.id)===sid(p.id))||p;
}
function pendingTrackingRow(r){
 const p=currentProduction(r?.p);
 // Sem produção materializada, permanece visível para investigação do corte.
 return !p||isAwaiting(p);
}
function pendingAssignedByCut(c){
 // Nunca esconder o saldo de uma atribuição parcial. Só suprimir linhas antigas
 // quando a quantidade total cortada já tiver destino em registros confirmados.
 if(!c||!c.cutId||!c.orderId||!c.productId)return false;
 const cut=arr('cuts').find(x=>sid(x.id)===sid(c.cutId));
 if(!cut||norm(cut.status)!=='finalizado')return false;
 const actual=Number(cut.pieces||0);
 if(!(actual>0))return false;
 const sent=arr('production').filter(p=>sid(p.cutId)===sid(c.cutId)&&
  sid(p.productId)===sid(c.productId)&&sid(p.orderId)===sid(c.orderId)&&assigned(p))
  .reduce((sum,p)=>sum+Math.max(0,Number(p.planned)||0),0);
 return sent>=actual;
}
function pendingProductionRows(){
 return arr('production').filter(p=>isAwaiting(p)&&!pendingAssignedByCut(p));
}
let showAlreadyAssigned=false;
const oldPending=window.hlgb916UnassignedProduction;
window.hlgb916UnassignedProduction=pendingProductionRows;
const oldFilter=window.filterCutTracking9173;
if(typeof oldFilter==='function'&&!oldFilter.__hlgbStepQueue9528){
 const wrapped=function(){
  const prior=window.__cutTrackRows9173;
  if(!showAlreadyAssigned&&Array.isArray(prior))
   window.__cutTrackRows9173=prior.filter(pendingTrackingRow);
  try{return oldFilter.apply(this,arguments)}
  finally{window.__cutTrackRows9173=prior}
 };
 wrapped.__hlgbStepQueue9528=true;wrapped.__original=oldFilter;window.filterCutTracking9173=wrapped;
}
function updateTrackingTitle(){
 const panel=document.getElementById('cutTracking9173');if(!panel)return;
 const title=panel.querySelector('h2');if(title)title.textContent=showAlreadyAssigned?'🔎 Cortes finalizados — histórico':'📍 Cortes finalizados aguardando local';
 const caption=panel.querySelector('.toolbar .sub');
 if(caption)caption.textContent=showAlreadyAssigned?
  'Histórico de cortes finalizados, incluindo os que já têm local ou facção.':
  'Somente cortes que ainda precisam de local. Ao salvar o destino, o modelo sai desta lista e segue para Produção.';
 let button=panel.querySelector('#hlgbStepQueueShowAssigned9528');
 if(!button){
  button=document.createElement('button');button.type='button';
  button.className='secondary';button.id='hlgbStepQueueShowAssigned9528';
  const toolbar=panel.querySelector('.toolbar');
  if(toolbar)toolbar.appendChild(button);
  button.onclick=()=>{
   showAlreadyAssigned=!showAlreadyAssigned;
   button.textContent=showAlreadyAssigned?'Ocultar já atribuídos':'Mostrar já atribuídos';
   updateTrackingTitle();
   try{window.filterCutTracking9173?.()}catch(e){console.warn('[HLGB '+V+'] filtro',e)}
  };
 }
 button.textContent=showAlreadyAssigned?'Ocultar já atribuídos':'Mostrar já atribuídos';
}
const oldRender=window.renderCutTracking9173;
if(typeof oldRender==='function'&&!oldRender.__hlgbStepQueue9528){
 const wrapped=function(){
  const out=oldRender.apply(this,arguments);
  updateTrackingTitle();
  // O render original já chama o filtro global que foi protegido acima.
  return out;
 };
 wrapped.__hlgbStepQueue9528=true;wrapped.__original=oldRender;
 window.renderCutTracking9173=wrapped;
}
const oldQueue=window.renderCutAssignmentQueue;
if(typeof oldQueue==='function'&&!oldQueue.__hlgbStepQueue9528){
 const wrapped=function(){
  const out=oldQueue.apply(this,arguments);
  // Atualiza a segunda lista após atribuição salva, sem alterar o estado de produção.
  try{if(document.getElementById('cutTracking9173')&&
    typeof window.renderCutTracking9173==='function')
    window.renderCutTracking9173()}catch(e){console.warn('[HLGB '+V+'] atualizar lista',e)}
  return out;
 };
 wrapped.__hlgbStepQueue9528=true;wrapped.__original=oldQueue;
 window.renderCutAssignmentQueue=wrapped;
}
window.hlgbCutStepQueues9528={version:V,hasDestination,assigned,isAwaiting,
 pendingTrackingRow,pendingAssignedByCut,pendingProductionRows,updateTrackingTitle,
 showAssigned:()=>showAlreadyAssigned,originalPending:oldPending};
try{if(typeof window.hlgbAfterLogin==='function')window.hlgbAfterLogin(()=>{
 try{window.renderCutAssignmentQueue?.();window.renderCutTracking9173?.()}catch(_){}
},0)}catch(_){}
console.info('[HLGB] '+V+' avanço automático das filas ativo (histórico preservado)');
})();