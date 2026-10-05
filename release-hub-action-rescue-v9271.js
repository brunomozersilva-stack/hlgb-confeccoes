/* HLGB v92.79 — proteção de desempenho do Hub no Safari: edição prioritária e painéis pesados em idle */
(function(){
'use strict';
const V='92.79';
const timers={};
function editing(){return !!document.getElementById('hlgbHubEditor9270')||!!document.getElementById('hlgbHubEditor9267')||!!document.querySelector('#modal .modalSave')}
function apply(){
 try{
  let s=document.getElementById('hlgbHubSafariPerf9279');if(!s){s=document.createElement('style');s.id='hlgbHubSafariPerf9279';s.textContent='#hlgbHubEditor9270{backdrop-filter:none!important;-webkit-backdrop-filter:none!important;background:rgba(33,20,29,.22)!important}#hlgbHubEditor9270 .card{box-shadow:0 8px 22px rgba(50,24,42,.14)!important;contain:layout paint!important}';document.head.appendChild(s)}
  const root=document.getElementById('hlgbHubEditor9270');if(root){root.style.setProperty('backdrop-filter','none','important');root.style.setProperty('-webkit-backdrop-filter','none','important')}
 }catch(e){console.warn('[HLGB Hub Perf '+V+']',e)}
}
function schedule(key,fn,delay=350){
 clearTimeout(timers[key]);
 timers[key]=setTimeout(function attempt(){
  if(editing()){timers[key]=setTimeout(attempt,650);return}
  const run=()=>{if(editing())return schedule(key,fn,500);try{fn()}catch(e){console.warn('[HLGB Hub Perf '+V+'] '+key,e)}};
  if(typeof requestIdleCallback==='function')requestIdleCallback(run,{timeout:1200});else setTimeout(run,0);
 },delay);
 return true;
}
function wrapGlobal(name,key){const fn=window[name];if(typeof fn!=='function'||fn.__hlgbIdle9279)return;const w=function(){const that=this,args=arguments;return schedule(key,()=>fn.apply(that,args))};w.__hlgbIdle9279=true;w.__original=fn;window[name]=w}
function wrapObject(objName,prop,key){const o=window[objName],fn=o?.[prop];if(!o||typeof fn!=='function'||fn.__hlgbIdle9279)return;const w=function(){const that=this,args=arguments;return schedule(key,()=>fn.apply(that,args))};w.__hlgbIdle9279=true;w.__original=fn;o[prop]=w}
function installDeferred(){
 wrapGlobal('hlgbRenderHubSearch9248','search');
 wrapObject('hlgbHubPeriodSummary','render','period');
 wrapObject('hlgbFinanceLocations9251','renderConfExpenses','locations');
 wrapObject('hlgbOperationalPolish','renderHubFactionDetail','factions');
 wrapObject('hlgbHubPersonalIntegrity','repairPersonalSummary','personal');
}
function cancelHeavy(){for(const k of Object.keys(timers)){clearTimeout(timers[k]);delete timers[k]}}
apply();installDeferred();setTimeout(installDeferred,500);setTimeout(installDeferred,1800);
document.addEventListener('click',function(ev){const b=ev.target?.closest?.('button[data-hub-action="edit"],button[data-hub-search-action="edit"]');if(!b)return;cancelHeavy();apply();requestAnimationFrame(apply)},true);
window.addEventListener('pageshow',()=>{apply();installDeferred()});
window.hlgbHubSafariPerf9279={version:V,apply,installDeferred,cancelHeavy,editing};
window.hlgbHubSafariPerf9276=window.hlgbHubSafariPerf9279;
console.info('[HLGB] Hub Perf v'+V+' ativo — edição prioritária e painéis pesados adiados');
})();
