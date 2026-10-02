/* HLGB audit — estabilidade visual global: agrupa redraws remotos sem atrasar acoes locais */
(function(){
'use strict';
const V='v6-screen-stability-20261002';
const QUIET_MS=420;
const MAX_WAIT_MS=1200;
const REMOTE_WINDOW_MS=1600;
let remoteUntil=0;
let executingBatch=false;
let interactionVersion=0;
let lastInteractionAt=0;
const USER_ACTION_WINDOW_MS=180;
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
 renderFinishedPieces:['pecasProntas'],
 renderSeparation:['separacao'],
 renderSeparationList:['separacao'],
 renderOrderNotes:['notas','pedidos'],
 renderEmployeeAdvances:['folhaPagamento'],
 renderReady934:['corte'],
 renderFactionDelivery935:['faccoes'],
 renderTracking9173:['corte','producao'],
 renderFactionChecklists9176:['faccoes'],
 renderFactionChecklists9198:['faccoes']
};

function activePage(){
  try{return document.querySelector('.page.active')?.id||''}catch(e){return ''}
}
function isEditing(){
  try{return !!document.querySelector('#modal.show')||(typeof cloudUserIsEditing==='function'&&cloudUserIsEditing())}catch(e){return false}
}
function isRemote(){return Date.now()<remoteUntil}
function isUserDriven(){return lastInteractionAt>0&&(Date.now()-lastInteractionAt)<USER_ACTION_WINDOW_MS}
function markRemote(){remoteUntil=Math.max(remoteUntil,Date.now()+REMOTE_WINDOW_MS)}
function noteInteraction(){interactionVersion++;lastInteractionAt=Date.now()}
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
  // Restaura imediatamente depois do redraw para evitar o salto visual.
  if(v===interactionVersion)restoreUi(snap);
  // Um único ajuste no próximo frame cobre mudanças tardias de layout sem criar efeito vai-e-volta.
  requestAnimationFrame(()=>{if(v===interactionVersion)restoreUi(snap)});
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
  if(typeof fn!=='function'||fn.__hlgbUiStabilityV2)return false;
  const wrapped=function(){
    if(executingBatch)return fn.apply(this,arguments);
    // Somente atualizações realmente remotas entram na fila anti-pulo.
    // Ações locais e renders normais não devem reaparecer 420 ms depois do clique.
    const background=isRemote();
    if(!background){renderStamp.set(name,Date.now());return fn.apply(this,arguments)}
    if(!relevant(name))return undefined;
    if(isEditing())return queueRender(name,fn,this,Array.from(arguments));
    if(!allowGovernedRender(name))return undefined;
    return queueRender(name,fn,this,Array.from(arguments));
  };
  wrapped.__hlgbUiStabilityV2=true;wrapped.__original=fn;window[name]=wrapped;return true;
}
function installRenderers(){Object.keys(rendererPages).forEach(wrapRenderer)}

const RENDER_COOLDOWN_MS=5000;
const renderStamp=new Map();
function allowGovernedRender(name){
  const now=Date.now(),last=renderStamp.get(name)||0;
  if(isUserDriven()){renderStamp.set(name,now);return true}
  if(last>0&&now-last<RENDER_COOLDOWN_MS)return false;
  renderStamp.set(name,now);return true;
}


function wrapRemoteSource(name){
  const fn=window[name];
  if(typeof fn!=='function'||fn.__hlgbRemoteStabilityV2)return false;
  const wrapped=function(){markRemote();let out;try{out=fn.apply(this,arguments)}catch(e){throw e}
    if(out&&typeof out.then==='function')return out.finally(()=>markRemote());
    markRemote();return out;
  };
  wrapped.__hlgbRemoteStabilityV2=true;wrapped.__original=fn;window[name]=wrapped;return true;
}

const incoming=window.hlgbRenderIncomingRecord;
if(typeof incoming==='function'&&!incoming.__hlgbUiStabilityV2){
  const wrapped=function(){markRemote();installRenderers();return incoming.apply(this,arguments)};
  wrapped.__hlgbUiStabilityV2=true;wrapped.__original=incoming;window.hlgbRenderIncomingRecord=wrapped;
}

['hlgbHandleNormalizedRealtime','hlgbPullNormalizedCoreChanges','cloudPullRemoteIfNewer','hlgb948AuthoritativeRefresh'].forEach(wrapRemoteSource);
installRenderers();

// Reinstala por poucos segundos porque alguns módulos antigos ainda substituem renderizadores no boot.
let tries=0;
const installTimer=setInterval(()=>{
  tries++;installRenderers();
  ['hlgbHandleNormalizedRealtime','hlgbPullNormalizedCoreChanges','cloudPullRemoteIfNewer','hlgb948AuthoritativeRefresh'].forEach(wrapRemoteSource);
  if(tries>=40)clearInterval(installTimer);
},250);

for(const ev of ['pointerdown','keydown','wheel','touchstart']){
  document.addEventListener(ev,()=>{if(!restoring)noteInteraction()},{capture:true,passive:true});
}
window.addEventListener('scroll',()=>{if(!restoring)noteInteraction()},{passive:true});


/* Navegação estável: telas pesadas só aparecem depois que os adornos atrasados terminam. */
const HEAVY_PAGES=new Set(['pedidos','corte','producao','projecao','capacidadeProducao','clientes','produtos','estoque','faccoes','pagamentosFaccoes','financeiro','hubFinanceiro','notas']);
let settleToken=0,settleObserver=null,settleTimer=null,settleMaxTimer=null;
function ensureSettleStyle(){
  if(document.getElementById('hlgbPageSettleStyle'))return;
  const s=document.createElement('style');s.id='hlgbPageSettleStyle';
  s.textContent='.page.hlgb-page-settling{visibility:hidden!important;overflow-anchor:none!important}.hlgb-page-settle-overlay{position:fixed;left:50%;top:110px;transform:translateX(-50%);z-index:99998;background:#fff;border:1px solid #ead6df;border-radius:12px;padding:10px 16px;box-shadow:0 8px 26px rgba(0,0,0,.12);font-weight:700;color:#6b4256}.hlgb-page-settle-overlay[hidden]{display:none!important}';
  document.head.appendChild(s);
}
function settleOverlay(show){
  let el=document.getElementById('hlgbPageSettleOverlay');
  if(!el){el=document.createElement('div');el.id='hlgbPageSettleOverlay';el.className='hlgb-page-settle-overlay';el.textContent='Carregando tela…';el.hidden=true;document.body.appendChild(el)}
  el.hidden=!show;
}
function finishPageSettle(token,target){
  if(token!==settleToken)return;
  if(settleObserver){try{settleObserver.disconnect()}catch(e){}settleObserver=null}
  if(settleTimer){clearTimeout(settleTimer);settleTimer=null}
  if(settleMaxTimer){clearTimeout(settleMaxTimer);settleMaxTimer=null}
  target?.classList?.remove('hlgb-page-settling');settleOverlay(false);
}
function beginPageSettle(id){
  ensureSettleStyle();
  const target=document.getElementById(id);if(!target||!HEAVY_PAGES.has(id)){settleOverlay(false);return}
  const token=++settleToken,started=Date.now(),MIN_MS=260,QUIET_MS=140,MAX_MS=700;
  if(settleObserver){try{settleObserver.disconnect()}catch(e){}}
  if(settleTimer)clearTimeout(settleTimer);if(settleMaxTimer)clearTimeout(settleMaxTimer);
  target.classList.add('hlgb-page-settling');settleOverlay(true);
  try{window.scrollTo(0,0);target.scrollTop=0}catch(e){}
  const schedule=()=>{
    if(token!==settleToken)return;
    if(settleTimer)clearTimeout(settleTimer);
    const elapsed=Date.now()-started,delay=Math.max(QUIET_MS,MIN_MS-elapsed);
    settleTimer=setTimeout(()=>finishPageSettle(token,target),delay);
  };
  settleObserver=new MutationObserver(records=>{
    if(token!==settleToken)return;
    if(records?.some(m=>m.type==='childList'||m.type==='attributes'))schedule();
  });
  try{settleObserver.observe(target,{childList:true,subtree:true,attributes:true,attributeFilter:['class','style','hidden']})}catch(e){}
  schedule();
  settleMaxTimer=setTimeout(()=>finishPageSettle(token,target),MAX_MS);
}
function installStablePageRouter(){
  const fn=window.page;if(typeof fn!=='function'||fn.__hlgbStablePageV3)return false;
  const wrapped=function(id,btn){
    const target=document.getElementById(id),heavy=HEAVY_PAGES.has(id);
    if(heavy&&target){ensureSettleStyle();target.classList.add('hlgb-page-settling');settleOverlay(true)}
    let out;
    try{
      out=fn.apply(this,arguments);
      const now=Date.now();
      for(const [name,pages] of Object.entries(rendererPages))if(pages.includes(id))renderStamp.set(name,now);
    }finally{
      if(heavy)setTimeout(()=>beginPageSettle(id),0);
    }
    return out;
  };
  wrapped.__hlgbStablePageV3=true;wrapped.__original=fn;window.page=wrapped;return true;
}
installStablePageRouter();
let pageWrapTries=0;const pageWrapTimer=setInterval(()=>{pageWrapTries++;installStablePageRouter();if(pageWrapTries>=20)clearInterval(pageWrapTimer)},250);
window.hlgbUiStabilityMarkRemote=markRemote;
window.hlgbUiStabilityNoteInteraction=noteInteraction;
window.hlgbUiStabilityPending=()=>[...queues.keys()];
window.hlgbUiStabilityBeginPageSettle=beginPageSettle;
window.hlgbUiStabilityRenderAllowed=allowGovernedRender;
window.hlgbUiStabilityRenderCooldown=RENDER_COOLDOWN_MS;
window.HLGB_WORK_STABILITY_MODE=true;
window.hlgbManualRefreshCurrentPage=function(){
  const pg=activePage(),now=Date.now();
  noteInteraction();
  for(const [name,pages] of Object.entries(rendererPages)){
    if(!pages.includes(pg))continue;
    renderStamp.delete(name);
    const fn=window[name];
    if(typeof fn==='function'){try{fn()}catch(e){console.warn('[HLGB manual refresh]',name,e)}}
  }
  lastInteractionAt=now;
};
window.HLGB_UI_STABILITY_GUARD=V;
console.info('[HLGB] estabilidade visual global '+V+' ativa — redraw remoto agrupado e posição preservada');
})();