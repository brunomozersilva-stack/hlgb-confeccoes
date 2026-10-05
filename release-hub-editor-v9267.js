/* HLGB v92.80 — guarda de desempenho do Hub para Safari.
   O editor antigo continua desativado; este arquivo agora só protege a edição
   contra renderizações pesadas concorrentes dos módulos derivados do Hub. */
(function(){
'use strict';
const V='92.80';
const timers={};
function editing(){return !!window.HLGB_HUB_EDITING||!!document.getElementById('hlgbHubEditor9270')}
function schedule(key,fn,delay){
  clearTimeout(timers[key]);
  timers[key]=setTimeout(function attempt(){
    if(editing()){timers[key]=setTimeout(attempt,700);return}
    const run=()=>{if(editing()){schedule(key,fn,500);return}try{fn()}catch(e){console.warn('[HLGB Hub Guard '+V+'] '+key,e)}};
    if(typeof requestIdleCallback==='function')requestIdleCallback(run,{timeout:1200});else setTimeout(run,0);
  },Number(delay||350));
  return true;
}
function wrapGlobal(name,key){
  const fn=window[name];
  if(typeof fn!=='function'||fn.__hlgbHubGuard9280)return;
  const w=function(){const that=this,args=arguments;return schedule(key,()=>fn.apply(that,args),400)};
  w.__hlgbHubGuard9280=true;w.__original=fn;window[name]=w;
}
function wrapObject(objName,prop,key){
  const obj=window[objName],fn=obj?.[prop];
  if(!obj||typeof fn!=='function'||fn.__hlgbHubGuard9280)return;
  const w=function(){const that=this,args=arguments;return schedule(key,()=>fn.apply(that,args),400)};
  w.__hlgbHubGuard9280=true;w.__original=fn;obj[prop]=w;
}
function install(){
  wrapGlobal('hlgbRenderHubSearch9248','search');
  wrapObject('hlgbHubPeriodSummary','render','period');
  wrapObject('hlgbFinanceLocations9251','renderConfExpenses','locations');
  wrapObject('hlgbOperationalPolish','renderHubFactionDetail','factions');
  wrapObject('hlgbHubPersonalIntegrity','repairPersonalSummary','personal');
}
function cancelHeavy(){for(const k of Object.keys(timers)){clearTimeout(timers[k]);delete timers[k]}}
document.addEventListener('click',ev=>{
  const b=ev.target?.closest?.('button[data-hub-action="edit"],button[data-hub-search-action="edit"]');
  if(!b)return;
  window.HLGB_HUB_EDITING=true;
  cancelHeavy();
  setTimeout(()=>{if(!document.getElementById('hlgbHubEditor9270'))window.HLGB_HUB_EDITING=false},1200);
},true);
install();setTimeout(install,500);setTimeout(install,1800);
window.addEventListener('pageshow',()=>{install();if(!document.getElementById('hlgbHubEditor9270'))window.HLGB_HUB_EDITING=false});
window.hlgbHubEditor9267={version:V,disabled:true,replacedBy:'release-hub-editor-v9270.js',guardActive:true,editing,cancelHeavy,install};
window.hlgbHubPerfGuard9280=window.hlgbHubEditor9267;
console.info('[HLGB] Hub Guard v'+V+' ativo — renderizações pesadas pausadas durante edição');
})();
