/* HLGB v95.28 — avanço automático das FILAS por modelo (sem excluir dados).
   Corte finalizado deixa fila de Corte; facção/local confirmado deixa fila Aguardando.
   Histórico permanece consultável em Produção e no botão Mostrar já atribuídos. */
(function(){
'use strict';
if(window.hlgbCutStepQueues9528)return;
const V='95.28',sid=v=>String(v==null?'':v);
const norm=v=>sid(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase();
const arr=k=>{try{return Array.isArray(db&&db[k])?db[k]:[]}catch(_){return []}};
const hasDestination=p=>!!(p&&(sid(p.productionLocationId).trim()||sid(p.factionId).trim()));
const activeRow9709=p=>!!p&&!p.deleted_at&&!p.deletedAt&&p.deleted!==true&&p._deleted!==true&&!['cancelado','cancelada','consolidado'].includes(norm(p.stage||p.status));
// A etapa só foi concluída para esta lista se há destino concreto gravado.
// Stage/assignedAt isolados sem local apontam inconsistência, não podem esconder pendência.
const assigned=p=>hasDestination(p);
const isAwaiting=p=>{
 if(!activeRow9709(p)||!p.cutId||p.finishedAt||!Number.isFinite(Number(p.planned))||Number(p.planned)<=0||assigned(p))return false;
 return !['cancelado','cancelada','pronto','finalizado','concluido','consolidado'].includes(norm(p.stage));
};
function currentProduction(p){
 if(!p)return null;
 const rows=arr('production').filter(x=>sid(x?.id)===sid(p.id));return rows.length===1?rows[0]:null;
}
function pendingTrackingRow(r){
 const p=currentProduction(r?.p);
 // Sem produção materializada, permanece visível para investigação do corte.
 return !r?.p||(!!p&&isAwaiting(p)&&!pendingAssignedByCut(p));
}
function trackingSources(){
 const orders=arr('orders'),prod=arr('production'),rows=[];
 for(const c of arr('cuts')){
  if(!activeRow9709(c)||norm(c.status)!=='finalizado')continue;
  const o=orders.find(x=>sid(x.id)===sid(c.orderId))||null;
  const ps=prod.filter(p=>activeRow9709(p)&&sid(p.cutId)===sid(c.id)&&Number(p.planned)>0);
  if(ps.length)ps.forEach(p=>rows.push({c,o,p}));
  else rows.push({c,o,p:null});
 }
 return rows.sort((a,b)=>sid(b.c.finishedAtTime||b.c.finishedAt||b.c.date)
   .localeCompare(sid(a.c.finishedAtTime||a.c.finishedAt||a.c.date)));
}
function pendingAssignedByCut(c){
 // Nunca esconder o saldo de uma atribuição parcial. Só suprimir linhas antigas
 // quando a quantidade total cortada já tiver destino em registros confirmados.
 if(!c||!c.cutId||!c.orderId||!c.productId)return false;
 const cutRows=arr('cuts').filter(x=>sid(x.id)===sid(c.cutId));const cut=cutRows.length===1?cutRows[0]:null;
 if(!activeRow9709(cut)||norm(cut.status)!=='finalizado'||(cut.productId&&sid(cut.productId)!==sid(c.productId)))return false;
 const actual=Number(cut.pieces||0);
 if(!(actual>0))return false;
 const rows=arr('production').filter(p=>activeRow9709(p)&&sid(p.cutId)===sid(c.cutId)&&
  sid(p.productId)===sid(c.productId)&&sid(p.orderId)===sid(c.orderId)&&assigned(p));
 const ids=new Set();let sent=0;for(const p of rows){const id=sid(p.id),qty=Number(p.planned);if(!id||ids.has(id)||!Number.isSafeInteger(qty)||qty<=0)return false;ids.add(id);sent+=qty;}
 return sent===actual; // over-allocation is inconsistent, not proof of completion
}
function pendingProductionRows(){
 return arr('production').filter(p=>isAwaiting(p)&&!pendingAssignedByCut(p));
}
// Read-only: build waiting UI from genuine unassigned production, not the
// finalized-cut history. Preserves old pending items even when history grows.
let queueEvidence9709={observed:false,waiting:null,missingProduction:null,source:'local-observation',remoteConfirmed:false};
function waitingTrackingRows(){
 const cuts=arr('cuts'),orders=arr('orders');
 const pending=pendingProductionRows().map(p=>{
  const c=cuts.find(x=>sid(x?.id)===sid(p.cutId))||
   {id:p.cutId,orderId:p.orderId,productId:p.productId,pieces:p.planned,status:'Planejado'};
  const o=orders.find(x=>sid(x?.id)===sid(p.orderId))||null;
  return {c,o,p};
 });
 const empty=trackingSources().filter(r=>!r.p);
 queueEvidence9709={observed:true,waiting:pending.length,missingProduction:empty.length,source:'local-observation',remoteConfirmed:false,at:new Date().toISOString()};
 return [...pending,...empty];
}
let showAlreadyAssigned=false;
const oldPending=window.hlgb916UnassignedProduction;
window.hlgb916UnassignedProduction=pendingProductionRows;
const oldFilter=window.filterCutTracking9173;
if(typeof oldFilter==='function'&&!oldFilter.__hlgbStepQueue9528){
 const wrapped=function(){
  // A fresh local projection on each interaction avoids restoring an obsolete queue.
  window.__cutTrackRows9173=showAlreadyAssigned?trackingSources():waitingTrackingRows();
  return oldFilter.apply(this,arguments);
 };
 wrapped.__hlgbStepQueue9528=true;wrapped.__original=oldFilter;window.filterCutTracking9173=wrapped;
}
function updateTrackingTitle(){
 const panel=document.getElementById('cutTracking9173');if(!panel)return;
 const title=panel.querySelector('h2');if(title)title.textContent=showAlreadyAssigned?'🔎 Cortes finalizados — histórico':'📍 Produção aguardando destino';
 const caption=panel.querySelector('.toolbar .sub');
 if(caption)caption.textContent=showAlreadyAssigned?
  'Histórico de cortes finalizados, incluindo os que já têm local ou facção.':
  'Itens com produção ainda sem local ou facção, mesmo quando há corte pendente. A confirmação do destino retira o item desta lista.';
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
   try{window.renderCutTracking9173?.()}catch(e){console.warn('[HLGB '+V+'] filtro',e)}
  };
 }
 button.textContent=showAlreadyAssigned?'Ocultar já atribuídos':'Mostrar já atribuídos';
}
const oldRender=window.renderCutTracking9173;
if(typeof oldRender==='function'&&!oldRender.__hlgbStepQueue9528){
 const wrapped=function(){
  const out=oldRender.apply(this,arguments);
  // A rotina antiga limitava a 60 ANTES de filtrar atribuídos, fazendo
  // pendências antigas sumirem. Filtrar primeiro e limitar depois.
  const complete=trackingSources();
  window.__cutTrackRows9173=showAlreadyAssigned?complete:waitingTrackingRows();
  try{window.filterCutTracking9173?.()}catch(e){console.warn('[HLGB '+V+'] atualizar cortes',e)}
  updateTrackingTitle();
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
 pendingTrackingRow,trackingSources,waitingTrackingRows,pendingAssignedByCut,pendingProductionRows,updateTrackingTitle,
 status:()=>({...queueEvidence9709}),
 showAssigned:()=>showAlreadyAssigned,originalPending:oldPending};
try{if(typeof window.hlgbAfterLogin==='function')window.hlgbAfterLogin(()=>{
 try{window.renderCutAssignmentQueue?.();window.renderCutTracking9173?.()}catch(_){}
},0)}catch(_){}
window.addEventListener?.('hlgb:logout',()=>{queueEvidence9709={observed:false,waiting:null,missingProduction:null,source:'local-observation',remoteConfirmed:false};showAlreadyAssigned=false});
console.info('[HLGB] '+V+' avanço automático das filas ativo (histórico preservado)');
})();