/* HLGB v93.03 — estabilização estrutural: impede reempilhamento tardio de roteadores */
(function(){
'use strict';
if(window.hlgbSystemStability9301){try{window.hlgbSystemStability9301.apply?.()}catch(e){}return;}
const V='93.03';
function markOne(fn){
 if(typeof fn!=='function')return false;
 ['__v9256','__hlgbPage9256','__hlgbStablePageV1','__hlgbStablePageV2','__hlgbStablePageV3'].forEach(k=>{try{fn[k]=true}catch(e){}});
 return true;
}
function pageDepth(){
 let fn=window.page,depth=0;const seen=new Set();
 while(typeof fn==='function'&&!seen.has(fn)&&depth<60){seen.add(fn);fn=fn.__original;depth++}
 return depth;
}
function markPage(){
 let fn=window.page;if(typeof fn!=='function')return false;
 const seen=new Set();let depth=0;
 while(typeof fn==='function'&&!seen.has(fn)&&depth<60){seen.add(fn);markOne(fn);fn=fn.__original;depth++}
 window.HLGB_PAGE_ROUTER_STABLE=V;
 window.HLGB_PAGE_ROUTER_DEPTH_MARKED=depth;
 return true;
}
function assistantDiagnostic(){
 try{return window.hlgbAssistantCanonical9297?.diagnostic?.()||null}catch(e){return null}
}
function stabilizeAssistant(){
 try{
  window.HLGB_ASSISTANT_FINAL_V9250=true;
  const c=window.hlgbAssistantCanonical9297;
  if(c?.install){c.install();window.HLGB_ASSISTANT_ROUTER_STABLE=V;return true}
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
function health(){
 const pd=pageDepth(),ad=assistantDiagnostic();
 return {version:V,pageDepth:pd,pageStable:!!window.HLGB_PAGE_ROUTER_STABLE,assistantStable:ad?ad.routerStable===true:!!window.HLGB_ASSISTANT_ROUTER_STABLE,assistantChainDepth:ad?.routerChainDepth??null,hubLocked:!!window.HLGB_HUB_MASTER_9258};
}
function needsRepair(){
 const p=window.page;
 if(typeof p==='function'&&(!p.__v9256||!p.__hlgbStablePageV3))return true;
 const ad=assistantDiagnostic();
 if(window.hlgbAssistantCanonical9297&&ad?.routerStable===false)return true;
 if(!window.HLGB_HUB_MASTER_9258)return true;
 return false;
}
function apply(){markPage();stabilizeAssistant();lockHub();return health()}
apply();[120,700,1800,4200,9500,12500].forEach(ms=>setTimeout(apply,ms));
const healthTimer=setInterval(()=>{try{if(document.visibilityState==='visible'&&needsRepair())apply()}catch(e){}},15000);
window.addEventListener('pageshow',()=>setTimeout(apply,50));
window.addEventListener('focus',()=>setTimeout(apply,80));
window.hlgbSystemStability9301={version:V,apply,markPage,stabilizeAssistant,lockHub,health,needsRepair,healthTimer};
window.HLGB_SYSTEM_STABILITY_9301=V;
console.info('[HLGB] v'+V+' estabilização estrutural ativa');
})();
