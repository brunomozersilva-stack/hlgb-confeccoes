/* HLGB v94.34 — trava de interação contra redraws enquanto modal/edição está ativa.
   Mantém saves funcionando; adia apenas renderização pesada até a interação terminar. */
(function(){
'use strict';
const V='94.34',QUIET_MS=140;
if(window.HLGB_INTERACTION_LOCK_9434===V)return;

const rendererPages={
 renderAll:null,renderDash:['dashboard'],renderOrders:['pedidos'],renderProduction:['producao'],renderProductionHub:['producao'],
 renderCuts:['corte'],renderCutAssignmentQueue:['corte'],renderProjection:['projecao'],renderCapacityPlanning:['capacidadeProducao'],
 renderClients:['clientes'],renderClientPotentialReport:['clientes'],renderProducts:['produtos'],renderMaterials:['materiais'],renderStock:['estoque'],
 renderFactions:['faccoes','cadFaccoes','cadLocaisProducao','cadMaquinas','cadTiposServico'],renderFactionPayments:['pagamentosFaccoes'],
 renderFactionPaymentPlanner:['pagamentosFaccoes'],renderCutters:['cortadores'],drawCutterChart:['cortadores'],renderCutterProductCosts:['cortadores'],
 renderFinance:['financeiro'],renderHubFinance:['hubFinanceiro'],renderSuppliers:['fornecedores'],renderPurchases:['compras'],renderEmployees:['funcionarios'],
 renderFormerEmployees:['exFuncionarios'],renderPayroll:['folhaPagamento'],renderMissingPieces:['faltas'],renderDefectReturns:['devolucoesDefeitos'],
 renderAssets:['inventarioBens'],renderOrderTrash:['lixeiraPedidos'],renderGoals:['metas'],renderReports:['relatorios'],renderUsers:['usuarios','config'],
 renderCatalogs:['cadastros'],renderAuditLog:['config'],renderFinishedPieces:['pecasProntas'],renderSeparation:['separacao'],renderSeparationList:['separacao'],
 renderOrderNotes:['notas','pedidos'],renderEmployeeAdvances:['folhaPagamento'],renderReady934:['corte'],renderFactionDelivery935:['faccoes'],
 renderTracking9173:['corte','producao'],renderFactionChecklists9176:['faccoes'],renderFactionChecklists9198:['faccoes']
};
const queues=new Map();
let modalObserver=null,lockSnap=null,flushTimer=null,replaying=false;
const state={version:V,blocked:0,flushed:0,installs:0,lastBlocked:'',lastFlushAt:'',lockStartedAt:'',lastUnlockAt:''};

function activePage(){try{return document.querySelector('#appShell .page.active,.page.active')?.id||''}catch(e){return ''}}
function visibleModal(){
 try{
  const m=document.querySelector('#modal.show,.modal.show');
  if(!m)return null;
  const s=getComputedStyle(m);return s.display==='none'||s.visibility==='hidden'?null:m;
 }catch(e){return document.querySelector('#modal.show,.modal.show')}
}
function editing(){
 if(visibleModal())return true;
 try{if(typeof window.cloudUserIsEditing==='function'&&window.cloudUserIsEditing())return true}catch(e){}
 return false;
}
function snap(){
 const root=document.querySelector('#appShell .page.active,.page.active');
 return {page:root?.id||'',x:window.scrollX||0,y:window.scrollY||0,rootTop:root?.scrollTop||0,rootLeft:root?.scrollLeft||0};
}
function restore(s){
 if(!s)return;
 const root=document.querySelector('#appShell .page.active,.page.active');
 if(s.page&&root?.id!==s.page)return;
 try{window.scrollTo(s.x,s.y)}catch(e){}
 try{if(root){root.scrollTop=s.rootTop;root.scrollLeft=s.rootLeft}}catch(e){}
}
function setLock(on){
 const html=document.documentElement;
 if(on){
  if(!lockSnap){lockSnap=snap();state.lockStartedAt=new Date().toISOString()}
  html?.classList?.add('hlgb-interaction-locked');
  restore(lockSnap);requestAnimationFrame(()=>restore(lockSnap));
 }else if(lockSnap){
  const s=lockSnap;lockSnap=null;html?.classList?.remove('hlgb-interaction-locked');
  restore(s);requestAnimationFrame(()=>restore(s));state.lastUnlockAt=new Date().toISOString();scheduleFlush();
 }
}
function ensureStyle(){
 if(document.getElementById('hlgbInteractionLockStyle9434'))return;
 const st=document.createElement('style');st.id='hlgbInteractionLockStyle9434';
 st.textContent='html.hlgb-interaction-locked,html.hlgb-interaction-locked body,html.hlgb-interaction-locked .page.active{overflow-anchor:none!important}';
 (document.head||document.documentElement).appendChild(st);
}
function relevant(name){const p=rendererPages[name];if(!p)return true;const a=activePage();return !a||p.includes(a)}
function queue(name,fn,ctx,args){
 queues.set(name,{name,fn,ctx,args:Array.from(args||[]),at:Date.now()});
 state.blocked++;state.lastBlocked=name;setLock(true);return false;
}
function stableCall(q){
 const s=snap();let out;replaying=true;
 try{out=q.fn.apply(q.ctx,q.args)}finally{replaying=false}
 restore(s);requestAnimationFrame(()=>restore(s));return out;
}
function flush(){
 clearTimeout(flushTimer);flushTimer=null;
 if(editing()){setLock(true);scheduleFlush();return false}
 setLock(false);
 const list=[...queues.values()];queues.clear();
 for(const q of list){if(!relevant(q.name))continue;try{stableCall(q);state.flushed++}catch(e){console.warn('[HLGB '+V+'] redraw adiado',q.name,e)}}
 state.lastFlushAt=new Date().toISOString();return true;
}
function scheduleFlush(){clearTimeout(flushTimer);flushTimer=setTimeout(()=>{if(editing()){setLock(true);scheduleFlush()}else flush()},QUIET_MS)}
function chainHas(fn){
 const seen=new Set();let cur=fn,n=0;
 while(typeof cur==='function'&&!seen.has(cur)&&n++<50){if(cur.__hlgbInteractionLock9434)return true;seen.add(cur);cur=cur.__original||cur.__hlgb9307Original||cur.__hlgb9320Original||cur.__hlgb955Original||cur.__hlgbReliableOriginal}
 return false;
}
function wrap(name){
 const fn=window[name];if(typeof fn!=='function'||chainHas(fn))return false;
 const w=function(){if(replaying)return fn.apply(this,arguments);if(editing())return queue(name,fn,this,arguments);return fn.apply(this,arguments)};
 w.__hlgbInteractionLock9434=true;w.__original=fn;window[name]=w;return true;
}
function wrapIncoming(){
 const name='hlgbRenderIncomingRecord',fn=window[name];if(typeof fn!=='function'||chainHas(fn))return false;
 const w=function(){if(replaying)return fn.apply(this,arguments);if(editing())return queue(name,fn,this,arguments);return fn.apply(this,arguments)};
 w.__hlgbInteractionLock9434=true;w.__original=fn;window[name]=w;return true;
}
function observeModal(){
 const m=document.getElementById('modal')||document.querySelector('.modal');if(!m||m.__hlgbObserved9434)return false;
 m.__hlgbObserved9434=true;
 modalObserver=new MutationObserver(()=>{if(editing())setLock(true);else setLock(false)});
 try{modalObserver.observe(m,{attributes:true,attributeFilter:['class','style','hidden']})}catch(e){}
 return true;
}
function install(){
 ensureStyle();Object.keys(rendererPages).forEach(wrap);wrapIncoming();observeModal();state.installs++;
 if(editing())setLock(true);else if(lockSnap)setLock(false);return true;
}
function stamp(){
 try{const cur=parseFloat(String(window.HLGB_RELEASE_VERSION||'0'))||0;if(cur<94.34){window.HLGB_RELEASE_VERSION=V;const el=document.querySelector('#appShell .logo small');if(el)el.textContent='v'+V}}catch(e){}
}

document.addEventListener('click',()=>setTimeout(()=>{install();if(editing())setLock(true);else setLock(false)},0),true);
document.addEventListener('keydown',()=>{if(editing())setLock(true)},true);
window.addEventListener('pageshow',()=>setTimeout(install,0));
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
[250,900,1800,4000].forEach(ms=>setTimeout(install,ms));
stamp();
window.HLGB_INTERACTION_LOCK_9434=V;
window.hlgbInteractionLock9434={version:V,state,status:()=>({...state,locked:editing(),queued:[...queues.keys()],page:activePage()}),install,flush};
console.info('[HLGB] v'+V+' trava de interação ativa — redraws ficam aguardando enquanto modal/edição estiver aberta');
})();
