/* HLGB v92.76 — correção leve de desempenho do editor do Hub no Safari */
(function(){
'use strict';
const V='92.76';
function apply(){
  try{
    let s=document.getElementById('hlgbHubSafariPerf9276');
    if(!s){
      s=document.createElement('style');
      s.id='hlgbHubSafariPerf9276';
      s.textContent='#hlgbHubEditor9270{backdrop-filter:none!important;-webkit-backdrop-filter:none!important;background:rgba(33,20,29,.28)!important}#hlgbHubEditor9270 .card{box-shadow:0 10px 28px rgba(50,24,42,.18)!important}';
      document.head.appendChild(s);
    }
    const root=document.getElementById('hlgbHubEditor9270');
    if(root){
      root.style.setProperty('backdrop-filter','none','important');
      root.style.setProperty('-webkit-backdrop-filter','none','important');
    }
  }catch(e){console.warn('[HLGB Hub Safari '+V+']',e)}
}
apply();
document.addEventListener('click',function(ev){
  const b=ev.target?.closest?.('button[data-hub-action="edit"]');
  if(!b)return;
  requestAnimationFrame(apply);
  setTimeout(apply,0);
},true);
window.hlgbHubSafariPerf9276={version:V,apply};
console.info('[HLGB] Hub Safari Perf v'+V+' ativo — editor sem blur de tela inteira');
})();