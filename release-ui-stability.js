/* HLGB audit — estabilidade visual global: agrupa redraws remotos sem atrasar acoes locais */
(function(){
'use strict';
const V='v1';
const QUIET_MS=420;
const MAX_WAIT_MS=1200;
const REMOTE_WINDOW_MS=1600;
let remoteUntil=0;
let executingBatch=false;
let interactionVersion=0;
const queues=new Map();

const rendererPages={
 renderDash:['dashboard'],
 renderOrders:['pedidos'],
 renderProduction:['producao'],
 renderProductionHub:['producao'],
 renderCuts:['corte'],
 renderCutAssignmentQueue:['corte'],
 renderProjection:['projecao'],
 renderCapacityPlanning:['capacidadeProducao'],
 renderClients:['clientes'],
 renderClientPotentialReport:['clientes'],
 renderProducts:['produtos'],
 renderMaterials:['materiais'],
 renderStock:['estoque'],
 renderFactions:['faccoes','cadFaccoes','cadLocaisProducao','cadMaquinas','cadTiposServico'],
 renderFactionPayments:['pagamentosFaccoes'],
 renderFactionPaymentPlanner:['pagamentosFaccoes'],
 renderCutters:['cortadores'],
 drawCutterChart:['cortadores'],
 renderCutterProductCosts:['cortadores'],
 renderFinance:['financeiro'],
 renderHubFinance:['hubFinanceiro'],
 renderSuppliers:['fornecedores'],
 renderPurchases:['compras'],
 renderEmployees:['funcionarios'],
 renderFormerEmployees:['exFuncionarios'],
 renderPayroll:['folhaPagamento'],
 renderMissingPieces:['faltas'],
 renderDefectReturns:['devolucoesDefeitos'],
 renderAssets:['inventarioBens'],
 renderOrderTrash:['lixeiraPedidos'],
 renderGoals:['metas'],
 renderReports:['relatorios'],
 renderUsers:['usuarios','config'],
 renderCatalogs:['cadastros'],
 renderAuditLog:['config'],
 renderFinishedPieces:['pecasProntas']
};

function activePage(){
  try{return document.querySelector('.page.active')?.id||''}catch(e){return ''}
}
function isEditing(){
  try{return !!document.querySelector('#modal.show')||(typeof cloudUserIsEditing==='function'&&cloudUserIsEditing())}catch(e){return false}
}
function isRemote(){return Date.now()<remoteUntil}
function markRemote(){remoteUntil=Math.max(remoteUntil,Date.now()+REMOTE_WINDOW_MS)}
function relevant(name){
  const pages=rendererPages[name];
  if(!pages)return true;
  const pg=activePage();
  return !pg||pages.includes(pg);
}
function pathOf(root,el){
  const p=[];let n=el;
  while(n&&n!==root){
    const par=n.parentElement;if(!par)return null;
    p.push(Array.prototype.indexOf.call(par.children,n));n=par;
  }
  return n===root?p.reverse():null;
}
function byPath(root,path){
  let n=root;
  for(const i of path||[]){if(!n?.children||!n.children[i])return null;n=n.children[i]}
  return n;
}
function snapshotUi(){
  const root=document.querySelector('.page.active');
  const focus=document.activeElement;
  const snap={page:root?.id||'',x:window.scrollX||0,y:window.scrollY||0,rootTop:root?.scrollTop||0,rootLeft:root?.scrollLeft||0,focusId:'',focusName:'',selectionStart:null,selectionEnd:null,scrolls:[],interaction:interactionVersion};
  if(focus&&['INPUT','TEXTAREA','SELECT'].includes(focus.tagName)){
    snap.focusId=focus.id||'';snap.focusName=focus.getAttribute?.('name')||'';
    if(typeof focus.selectionStart==='number'){snap.selectionStart=focus.selectionStart;snap.selectionEnd=focus.selectionEnd}
  }
  if(root?.querySelectorAll){
    let n=0;
    for(const el of root.querySelectorAll('*')){
      if(n>=24)break;
      if((el.scrollTop||0)>0||(el.scrollLeft||0)>0){
        const path=pathOf(root,el);if(path){snap.scrolls.push({path,top:el.scrollTop||0,left:el.scrollLeft||0});n++}
      }
    }
  }
  return snap;
}
let restoring=false;
function restoreUi(snap){
  if(!snap||snap.interaction!==interactionVersion)return;
  const root=document.querySelector('.page.active');
  if(snap.page&&root?.id!==snap.page)return;
  restoring=true;
  try{
    window.scrollTo(snap.x,snap.y);
    if(root){root.scrollTop=snap.rootTop;root.scrollLeft=snap.rootLeft}
    for(const s of snap.scrolls||[]){const el=byPath(root,s.path);if(el){el.scrollTop=s.top;el.scrollLeft=s.left}}
    let f=snap.focusId?document.getElementById(snap.focusId):null;
    if(!f&&snap.focusName&&root){try{f=root.querySelector('[name="'+String(snap.focusName).replace(/"/g,'\\\"')+'"]')}catch(e){}}
    if(f&&document.contains(f)){
      try{f.focus({preventScroll:true});if(snap.selectionStart!==null&&typeof f.setSelectionRange==='function')f.setSelectionRange(snap.selectionStart,snap.selectionEnd)}catch(e){}
    }
  }finally{restoring=false}
}
function stableCall(fn,ctx,args){
  const snap=snapshotUi();
  let out;
  executingBatch=true;
  try{out=fn.apply(ctx,args||[])}
  finally{executingBatch=false}
  const v=snap.interaction;
  requestAnimationFrame(()=>{if(v===interactionVersion)restoreUi(snap)});
  setTimeout(()=>{if(v===interactionVersion)restoreUi(snap)},90);
  return out;
}
function runQueued(name){
  const q=queues.get(name);if(!q)return;
  if(isEditing()){
    try{cloudRemoteUpdatePending=true}catch(e){}
    q.timer=setTimeout(()=>runQueued(name),QUIET_MS);return;
  }
  queues.delete(name);
  if(!relevant(name))return;
  stableCall(q.fn,q.ctx,q.args);
}
function queueRender(name,fn,ctx,args){
  let q=queues.get(name);
  const now=Date.now();
  if(!q)q={fn,ctx,args,first:now,timer:null};
  q.fn=fn;q.ctx=ctx;q.args=args;
  if(q.timer)clearTimeout(q.timer);
  const elapsed=now-q.first;
  const delay=Math.max(0,Math.min(QUIET_MS,MAX_WAIT_MS-elapsed));
  q.timer=setTimeout(()=>runQueued(name),delay);
  queues.set(name,q);
  return undefined;
}
function wrapRenderer(name){
  const fn=window[name];
  if(typeof fn!=='function'||fn.__hlgbUiStabilityV1)return false;
  const wrapped=function(){
    if(executingBatch||!isRemote())return fn.apply(this,arguments);
    if(!relevant(name))return undefined;
    return queueRender(name,fn,this,Array.from(arguments));
  };
  wrapped.__hlgbUiStabilityV1=true;wrapped.__original=fn;window[name]=wrapped;return true;
}
function installRenderers(){Object.keys(rendererPages).forEach(wrapRenderer)}

function wrapRemoteSource(name){
  const fn=window[name];
  if(typeof fn!=='function'||fn.__hlgbRemoteStabilityV1)return false;
  const wrapped=function(){markRemote();let out;try{out=fn.apply(this,arguments)}catch(e){throw e}
    if(out&&typeof out.then==='function')return out.finally(()=>markRemote());
    markRemote();return out;
  };
  wrapped.__hlgbRemoteStabilityV1=true;wrapped.__original=fn;window[name]=wrapped;return true;
}

const incoming=window.hlgbRenderIncomingRecord;
if(typeof incoming==='function'&&!incoming.__hlgbUiStabilityV1){
  const wrapped=function(){markRemote();installRenderers();return incoming.apply(this,arguments)};
  wrapped.__hlgbUiStabilityV1=true;wrapped.__original=incoming;window.hlgbRenderIncomingRecord=wrapped;
}

['hlgbHandleNormalizedRealtime','hlgbPullNormalizedCoreChanges','cloudPullRemoteIfNewer','hlgb948AuthoritativeRefresh'].forEach(wrapRemoteSource);
installRenderers();

// Reinstala por poucos segundos porque alguns módulos antigos ainda substituem renderizadores no boot.
let tries=0;
const installTimer=setInterval(()=>{
  tries++;installRenderers();
  ['hlgbHandleNormalizedRealtime','hlgbPullNormalizedCoreChanges','cloudPullRemoteIfNewer','hlgb948AuthoritativeRefresh'].forEach(wrapRemoteSource);
  if(tries>=20)clearInterval(installTimer);
},250);

for(const ev of ['pointerdown','keydown','wheel','touchstart']){
  document.addEventListener(ev,()=>{if(!restoring)interactionVersion++},{capture:true,passive:true});
}
window.addEventListener('scroll',()=>{if(!restoring)interactionVersion++},{passive:true});

window.hlgbUiStabilityMarkRemote=markRemote;
window.hlgbUiStabilityPending=()=>[...queues.keys()];
window.HLGB_UI_STABILITY_GUARD=V;
console.info('[HLGB] estabilidade visual global '+V+' ativa — redraw remoto agrupado e posição preservada');
})();