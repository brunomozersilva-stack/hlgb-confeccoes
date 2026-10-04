/* HLGB v92.63 — restaura acesso ao Auditor/Testador se o menu for reconstruído */
(function(){
'use strict';
const V='92.63';
let scheduled=false;
function open(){
  if(typeof window.openHlgbAuditor==='function')return window.openHlgbAuditor();
  alert('O Auditor ainda está carregando. Aguarde um instante e tente novamente.');
}
function ensure(){
  scheduled=false;
  const nav=document.getElementById('nav')||document.querySelector('#appShell nav')||document.querySelector('nav');
  if(nav&&!document.getElementById('hlgbAuditorNavBtn')){
    const b=document.createElement('button');
    b.id='hlgbAuditorNavBtn';b.type='button';b.innerHTML='🧪 Auditor / Testes';b.onclick=open;
    const diag=document.getElementById('hlgbDiagnosticsNav');
    if(diag&&diag.parentElement)diag.insertAdjacentElement('afterend',b);else nav.appendChild(b);
  }
  const center=document.getElementById('hlgbDiagnosticsCenter');
  if(center&&!document.getElementById('hlgbAuditorOpenBtn')){
    const b=document.createElement('button');
    b.id='hlgbAuditorOpenBtn';b.type='button';b.className='secondary';b.textContent='🧪 Auditor interno';b.onclick=open;
    const tabs=center.querySelector('.hlgb-dg-tabs');
    if(tabs)tabs.appendChild(b);
    else center.insertBefore(b,center.firstChild);
  }
}
function queue(){if(scheduled)return;scheduled=true;requestAnimationFrame(()=>setTimeout(ensure,0));}
function boot(){
  ensure();
  const root=document.getElementById('appShell')||document.body;
  if(root&&!root.__hlgbAuditorRestore9263){
    root.__hlgbAuditorRestore9263=true;
    const mo=new MutationObserver(muts=>{
      for(const m of muts){
        if(m.type==='childList'&&(m.addedNodes.length||m.removedNodes.length)){queue();break}
      }
    });
    mo.observe(root,{childList:true,subtree:true});
    window.__hlgbAuditorRestoreObserver9263=mo;
  }
  window.addEventListener('pageshow',queue);
  window.addEventListener('focus',queue);
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')queue()});
  try{const cur=Number(window.HLGB_RELEASE_VERSION)||0;if(cur<=92.63){window.HLGB_RELEASE_VERSION=V;const l=document.querySelector('#appShell .logo small');if(l)l.textContent='v'+V}}catch(e){}
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
try{if(typeof hlgbAfterLogin==='function')hlgbAfterLogin(()=>setTimeout(ensure,250),0)}catch(e){}
window.hlgbAuditorRestore9263={ensure,open};
console.info('[HLGB] restauração do Auditor/Testador v'+V+' ativa');
})();