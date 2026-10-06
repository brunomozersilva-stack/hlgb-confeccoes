/* HLGB v93.01 — estabilização estrutural: impede reempilhamento de roteadores */
(function(){
'use strict';
if(window.hlgbSystemStability9301)return;
const V='93.01';
function markPage(){
 const fn=window.page;if(typeof fn!=='function')return false;
 // Os dois módulos legados verificam somente a função externa. Marcar a camada atual
 // impede que os timers de 1,5s/250ms voltem a embrulhar page indefinidamente.
 ['__v9256','__hlgbPage9256','__hlgbStablePageV1','__hlgbStablePageV2','__hlgbStablePageV3'].forEach(k=>{try{fn[k]=true}catch(e){}});
 window.HLGB_PAGE_ROUTER_STABLE=V;return true;
}
function stabilizeAssistant(){
 try{
  window.HLGB_ASSISTANT_FINAL_V9250=true;
  if(window.hlgbAssistantCanonical9297?.install){window.hlgbAssistantCanonical9297.install();window.HLGB_ASSISTANT_ROUTER_STABLE=V;return true}
 }catch(e){console.warn('[HLGB '+V+'] Assistente canônico',e)}
 return false;
}
function lockHub(){
 try{
  if(window.hlgbHubMaster9258)window.HLGB_HUB_MASTER_9258=window.hlgbHubMaster9258;
  else if(!window.HLGB_HUB_MASTER_9258)window.HLGB_HUB_MASTER_9258={active:true,version:'92.84+'};
  return true;
 }catch(e){return false}
}
function apply(){markPage();stabilizeAssistant();lockHub()}
apply();setTimeout(apply,120);setTimeout(apply,700);setTimeout(apply,1800);setTimeout(apply,4200);
window.addEventListener('pageshow',()=>setTimeout(apply,50));
window.addEventListener('focus',()=>setTimeout(apply,80));
window.hlgbSystemStability9301={version:V,apply,markPage,stabilizeAssistant,lockHub};
console.info('[HLGB] v'+V+' estabilização estrutural ativa');
})();
