/* HLGB v93.02 — estabilização estrutural: impede reempilhamento de roteadores */
(function(){
'use strict';
if(window.hlgbSystemStability9301){try{window.hlgbSystemStability9301.apply?.()}catch(e){}return;}
const V='93.02';
function markOne(fn){
 if(typeof fn!=='function')return false;
 ['__v9256','__hlgbPage9256','__hlgbStablePageV1','__hlgbStablePageV2','__hlgbStablePageV3'].forEach(k=>{try{fn[k]=true}catch(e){}});
 return true;
}
function markPage(){
 let fn=window.page;if(typeof fn!=='function')return false;
 // Marque a cadeia inteira. Os dois módulos legados rechecavam somente a camada externa
 // e alternavam wrappers; se algum deles restaurar uma camada interna, ela também fica idempotente.
 const seen=new Set();let depth=0;
 while(typeof fn==='function'&&!seen.has(fn)&&depth<40){seen.add(fn);markOne(fn);fn=fn.__original;depth++}
 window.HLGB_PAGE_ROUTER_STABLE=V;
 window.HLGB_PAGE_ROUTER_DEPTH_MARKED=depth;
 return true;
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
