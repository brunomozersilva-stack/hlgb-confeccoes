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
function trackingSources(index=queueIndex9713()){
 const rows=[];
 for(const c of arr('cuts')){
  if(!activeRow9709(c)||norm(c.status)!=='finalizado')continue;
  const o=index.orders.get(sid(c.orderId))||null;
  const ps=(index.prodByCut.get(sid(c.id))||[]).filter(p=>activeRow9709(p)&&Number(p.planned)>0);
  if(ps.length)ps.forEach(p=>rows.push({c,o,p}));
  else rows.push({c,o,p:null});
 }
 return rows.sort((a,b)=>sid(b.c.finishedAtTime||b.c.finishedAt||b.c.date)
   .localeCompare(sid(a.c.finishedAtTime||a.c.finishedAt||a.c.date)));
}
function queueIndex9713(){
 const cuts=new Map(),prodByCut=new Map(),orders=new Map();
 for(const c of arr('cuts')){const id=sid(c?.id);if(id)cuts.set(id,cuts.has(id)?null:c)}
 for(const o of arr('orders')){const id=sid(o?.id);if(id)orders.set(id,orders.has(id)?null:o)}
 for(const p of arr('production')){const id=sid(p?.cutId);if(!id)continue;if(!prodByCut.has(id))prodByCut.set(id,[]);prodByCut.get(id).push(p)}
 return {cuts,orders,prodByCut};
}
function pendingAssignedByCut(c,index=queueIndex9713()){
 // Nunca esconder o saldo de uma atribuição parcial. Só suprimir linhas antigas
 // quando a quantidade total cortada já tiver destino em registros confirmados.
 if(!c||!c.cutId||!c.orderId||!c.productId)return false;
 const cut=index.cuts.get(sid(c.cutId));
 if(!activeRow9709(cut)||norm(cut.status)!=='finalizado'||(cut.productId&&sid(cut.productId)!==sid(c.productId)))return false;
 const actual=Number(cut.pieces||0);
 if(!(actual>0))return false;
 const rows=(index.prodByCut.get(sid(c.cutId))||[]).filter(p=>activeRow9709(p)&&
  sid(p.productId)===sid(c.productId)&&sid(p.orderId)===sid(c.orderId)&&assigned(p));
 const ids=new Set();let sent=0;for(const p of rows){const id=sid(p.id),qty=Number(p.planned);if(!id||ids.has(id)||!Number.isSafeInteger(qty)||qty<=0)return false;ids.add(id);sent+=qty;}
 return sent===actual; // over-allocation is inconsistent, not proof of completion
}
function pendingProductionRows(index=queueIndex9713()){
 return arr('production').filter(p=>isAwaiting(p)&&!pendingAssignedByCut(p,index));
}
// Read-only: build waiting UI from genuine unassigned production, not the
// finalized-cut history. Preserves old pending items even when history grows.
let queueEvidence9709={observed:false,waiting:null,missingProduction:null,source:'local-observation',remoteConfirmed:false};
function waitingTrackingRows(){
 const index=queueIndex9713();
 const pending=pendingProductionRows(index).map(p=>{
  const c=index.cuts.get(sid(p.cutId))||
   {id:p.cutId,orderId:p.orderId,productId:p.productId,pieces:p.planned,status:'Planejado'};
  const o=index.orders.get(sid(p.orderId))||null;
  return {c,o,p};
 });
 const empty=trackingSources(index).filter(r=>!r.p);
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
  // The filter wrapper builds the current projection once.
  if(!window.filterCutTracking9173?.__hlgbStepQueue9528)window.__cutTrackRows9173=showAlreadyAssigned?trackingSources():waitingTrackingRows();
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
/* v97.13: refresh choices in the already-open assignment modal, no new write path.
 * Never silently select a service or destination. Current authority decides compatibility.
 */
let selectorEvidence9713={observed:false,compatible:null,services:null,classification:'not-observed'};
function assignmentModal9713(){
 if(window.__HLGB_AUTH_READY!==true)return null;
 const modal=document.getElementById('modal'),id=document.getElementById('assignProductionId'),service=document.getElementById('assignService'),dest=document.getElementById('assignDestination');
 if(!modal?.classList?.contains('show')||!id||!service||!dest||![id,service,dest].every(x=>modal.contains(x)))return null;
 return {modal,id,service,dest};
}
function refreshSelector9713(ctx){
 const current=assignmentModal9713();
 if(!ctx||!current||current.id!==ctx.id||current.dest!==ctx.dest)return false;
 const {id,service,dest,modal}=current;
 const rows=arr('production').filter(p=>sid(p?.id)===sid(id.value));
 const status=modal.querySelector('[data-hlgb-destination-status9713]');
 const report=(classification,compatible=null,services=null)=>{selectorEvidence9713={observed:true,classification,compatible,services,source:'local-observation',remoteConfirmed:false,at:new Date().toISOString()};if(status)status.textContent=classification==='compatible'?(compatible+' destino(s) compatível(is) na consulta local.'):classification==='no-compatible'?'Nenhum destino compatível no cadastro carregado. Confira o tipo de serviço e os cadastros.':classification==='service-required'?'Selecione o tipo de serviço. As opções não serão preenchidas por suposição.':classification==='stale-production'?'Produção mudou ou não está mais disponível. Confira a fila antes de confirmar.':'Não foi possível verificar os cadastros nesta sessão.';return classification==='compatible'};
 if(rows.length!==1||!isAwaiting(rows[0]))return report('stale-production');
 if(!['serviceTypes','productionLocations','factionMasters'].every(k=>Array.isArray(db?.[k]))||typeof window.hlgb916EligibleDestinations!=='function')return report('catalog-unavailable');
 const names=[...new Set(arr('serviceTypes').map(x=>sid(x?.name).trim()).filter(Boolean))],chosen=service.value,oldDest=dest.value;
 const known=names.some(n=>norm(n)===norm(chosen));
 // Preserve chosen service; if absent from refreshed catalogue do not substitute another.
 const option=(value,label)=>{const e=document.createElement('option');e.value=value;e.textContent=label;return e};
 service.replaceChildren(option('','Selecione'),...names.map(n=>option(n,n)));
 service.value=names.includes(chosen)?chosen:known?names.find(n=>norm(n)===norm(chosen)):'';
 // Unrestricted internal locations are valid even if the service is not yet selected.
 if(chosen&&!known){dest.replaceChildren(option('','Selecione'));return report('service-required',0,names.length)}
 let eligible;try{eligible=window.hlgb916EligibleDestinations(service.value)}catch(_){return report('catalog-unavailable',null,names.length)}
 if(!Array.isArray(eligible))return report('catalog-unavailable',null,names.length);
 const keyed=new Map();for(const d of eligible){if(!d||!['F','L'].includes(d.type)||!sid(d.id)||!Number.isSafeInteger(Number(d.id))||Number(d.id)<=0)continue;const k=d.type+':'+d.id;keyed.set(k,keyed.has(k)?null:d)}
 const options=[...keyed].filter(([,d])=>d);
 dest.replaceChildren(option('','Selecione'),...options.map(([k,d])=>option(k,(d.type==='F'?'Facção':'Local')+' — '+sid(d.name))));
 dest.value=options.some(([k])=>k===oldDest)?oldDest:'';
 try{window.updateCutAssignmentPreview?.()}catch(_){}
 return report(options.length?'compatible':service.value?'no-compatible':'service-required',options.length,names.length);
}
function decorateSelector9713(){
 const ctx=assignmentModal9713();if(!ctx)return false;
 if(ctx.modal.querySelector('[data-hlgb-destination-status9713]'))return true;
 const host=ctx.dest.parentElement;if(!host)return false;
 const status=document.createElement('div');status.className='sub';status.dataset.hlgbDestinationStatus9713='1';status.setAttribute('role','status');
 const retry=document.createElement('button');retry.type='button';retry.className='secondary';retry.textContent='Atualizar opções de destino';retry.onclick=()=>refreshSelector9713(ctx);
 host.appendChild(retry);host.appendChild(status);
 ctx.service.addEventListener('change',()=>refreshSelector9713(ctx));
 refreshSelector9713(ctx);return true;
}
const oldOpen9713=window.openCutAssignment;
if(typeof oldOpen9713==='function'&&!oldOpen9713.__hlgbDestination9713){
 const wrapped=function(){const out=oldOpen9713.apply(this,arguments);decorateSelector9713();return out};
 wrapped.__hlgbDestination9713=true;wrapped.__original=oldOpen9713;window.openCutAssignment=wrapped;
}
window.hlgbCutStepQueues9528={version:V,hasDestination,assigned,isAwaiting,
 pendingTrackingRow,trackingSources,waitingTrackingRows,pendingAssignedByCut,pendingProductionRows,updateTrackingTitle,
 status:()=>({...queueEvidence9709}),selectorStatus9713:()=>({...selectorEvidence9713}),decorateSelector9713,
 showAssigned:()=>showAlreadyAssigned,originalPending:oldPending};
try{if(typeof window.hlgbAfterLogin==='function')window.hlgbAfterLogin(()=>{
 try{window.renderCutAssignmentQueue?.();window.renderCutTracking9173?.()}catch(_){}
},0)}catch(_){}
window.addEventListener?.('hlgb:logout',()=>{queueEvidence9709={observed:false,waiting:null,missingProduction:null,source:'local-observation',remoteConfirmed:false};showAlreadyAssigned=false;selectorEvidence9713={observed:false,compatible:null,services:null,classification:'not-observed'}});
console.info('[HLGB] '+V+' avanço automático das filas ativo (histórico preservado)');
})();