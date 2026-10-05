/* HLGB v92.81 — guarda de desempenho do Hub para Safari.
   Durante a edição, renders derivados são simplesmente ignorados.
   Após fechar/salvar, o editor agenda uma atualização única do Hub. */
(function(){
'use strict';
const V='92.81';
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
  if(typeof fn!=='function'||fn.__hlgbHubGuard9281)return;
  const w=function(){const that=this,args=arguments;return schedule(key,()=>fn.apply(that,args),300)};
  w.__hlgbHubGuard9281=true;w.__original=fn;window[name]=w;
}
function wrapObject(objName,prop,key){
  const obj=window[objName],fn=obj?.[prop];
  if(!obj||typeof fn!=='function'||fn.__hlgbHubGuard9281)return;
  const w=function(){const that=this,args=arguments;return schedule(key,()=>fn.apply(that,args),300)};
  w.__hlgbHubGuard9281=true;w.__original=fn;obj[prop]=w;
}
function install(){
  wrapGlobal('hlgbRenderHubSearch9248','search');
  wrapObject('hlgbHubPeriodSummary','render','period');
  wrapObject('hlgbFinanceLocations9251','renderConfExpenses','locations');
  wrapObject('hlgbOperationalPolish','renderHubFactionDetail','factions');
  wrapObject('hlgbHubPersonalIntegrity','repairPersonalSummary','personal');
}
document.addEventListener('click',ev=>{
  const b=ev.target?.closest?.('button[data-hub-action="edit"],button[data-hub-search-action="edit"]');
  if(!b)return;
  window.HLGB_HUB_EDITING=true;
  cancelHeavy();
},true);
install();setTimeout(install,500);setTimeout(install,1800);
window.addEventListener('pageshow',()=>{install();if(!document.getElementById('hlgbHubEditor9270'))window.HLGB_HUB_EDITING=false});
window.hlgbHubEditor9267={version:V,disabled:true,replacedBy:'release-hub-editor-v9270.js',guardActive:true,editing,cancelHeavy,install};
window.hlgbHubPerfGuard9280=window.hlgbHubEditor9267;
window.hlgbHubPerfGuard9281=window.hlgbHubEditor9267;
console.info('[HLGB] Hub Guard v'+V+' ativo — sem timers durante edição');
})();
