/* HLGB v92.83 — guarda de desempenho + organização visual do Hub para Safari. */
(function(){
'use strict';
const V='92.83';
const timers={};
function editing(){return !!window.HLGB_HUB_EDITING||!!document.getElementById('hlgbHubEditor9270')}
function cancelHeavy(){for(const k of Object.keys(timers)){clearTimeout(timers[k]);delete timers[k]}}
function schedule(key,fn,delay){
  clearTimeout(timers[key]);
  delete timers[key];
  if(editing())return false;
  timers[key]=setTimeout(()=>{
    delete timers[key];
    if(editing())return;
    const run=()=>{if(editing())return;try{fn()}catch(e){console.warn('[HLGB Hub Guard '+V+'] '+key,e)}};
    if(typeof requestIdleCallback==='function')requestIdleCallback(run,{timeout:1000});else setTimeout(run,0);
  },Number(delay||300));
  return true;
}
function wrapGlobal(name,key){
  const fn=window[name];
  if(typeof fn!=='function'||fn.__hlgbHubGuard9283)return;
  const w=function(){const that=this,args=arguments;return schedule(key,()=>fn.apply(that,args),300)};
  w.__hlgbHubGuard9283=true;w.__original=fn;window[name]=w;
}
function wrapObject(objName,prop,key){
  const obj=window[objName],fn=obj?.[prop];
  if(!obj||typeof fn!=='function'||fn.__hlgbHubGuard9283)return;
  const w=function(){const that=this,args=arguments;return schedule(key,()=>fn.apply(that,args),300)};
  w.__hlgbHubGuard9283=true;w.__original=fn;obj[prop]=w;
}
function organizeLayout(){
  if(editing())return false;
  const page=document.getElementById('hubFinanceiro');
  const cards=document.getElementById('hubFinanceCards');
  const due=document.getElementById('hubDue9166');
  if(!page||!cards||!due)return false;
  const parent=cards.parentNode||page;
  if(due.parentNode!==parent||cards.nextElementSibling!==due)parent.insertBefore(due,cards.nextSibling);
  let cursor=due;
  const orderedIds=['supplierDebtPanel9250','hlgbHubPeriodSummary','hlgbConfExpense9251','hubSearchPanel9248'];
  for(const id of orderedIds){
    const el=document.getElementById(id);
    if(!el||el===cursor)continue;
    if(el.parentNode!==parent)parent.insertBefore(el,cursor.nextSibling);
    else if(cursor.nextElementSibling!==el)parent.insertBefore(el,cursor.nextSibling);
    cursor=el;
  }
  page.dataset.hlgbHubLayout='v92.83';
  return true;
}
function queueLayout(delay=80){
  clearTimeout(timers.layout);
  timers.layout=setTimeout(()=>{delete timers.layout;if(!editing())organizeLayout()},delay);
}
function wrapRender(){
  const fn=window.renderHubFinance;
  if(typeof fn!=='function'||fn.__hlgbHubLayout9283)return;
  const w=function(){const out=fn.apply(this,arguments);queueLayout(60);return out};
  w.__hlgbHubLayout9283=true;w.__original=fn;window.renderHubFinance=w;
}
function install(){
  wrapGlobal('hlgbRenderHubSearch9248','search');
  wrapObject('hlgbHubPeriodSummary','render','period');
  wrapObject('hlgbFinanceLocations9251','renderConfExpenses','locations');
  wrapObject('hlgbOperationalPolish','renderHubFactionDetail','factions');
  wrapObject('hlgbHubPersonalIntegrity','repairPersonalSummary','personal');
  wrapRender();
  queueLayout(120);
}
document.addEventListener('click',ev=>{
  const b=ev.target?.closest?.('button[data-hub-action="edit"],button[data-hub-search-action="edit"]');
  if(!b)return;
  window.HLGB_HUB_EDITING=true;
  cancelHeavy();
},true);
install();
setTimeout(install,500);
setTimeout(()=>{install();organizeLayout()},1800);
setTimeout(()=>organizeLayout(),3600);
window.addEventListener('pageshow',()=>{install();if(!document.getElementById('hlgbHubEditor9270'))window.HLGB_HUB_EDITING=false;queueLayout(160)});
window.hlgbHubEditor9267={version:V,disabled:true,replacedBy:'release-hub-editor-v9270.js',guardActive:true,editing,cancelHeavy,install,organizeLayout};
window.hlgbHubPerfGuard9280=window.hlgbHubEditor9267;
window.hlgbHubPerfGuard9281=window.hlgbHubEditor9267;
window.hlgbOrganizeHubLayout9283=organizeLayout;
console.info('[HLGB] Hub Guard v'+V+' ativo — vencimentos no topo e dívidas/gráficos organizados abaixo');
})();
