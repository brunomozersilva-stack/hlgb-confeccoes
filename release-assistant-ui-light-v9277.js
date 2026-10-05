/* HLGB v92.77 — Assistente compacto e leve para Safari */
(function(){
'use strict';
const V='92.77';
function ensureCss(){
 if(document.getElementById('hlgbAssistantLight9277Css'))return;
 const s=document.createElement('style');s.id='hlgbAssistantLight9277Css';s.textContent=`
 .modalbox.hlgb-assistant-modal{width:min(980px,92vw)!important;max-width:980px!important;max-height:84vh!important;padding:10px!important;border-radius:16px!important;overflow:auto!important;background:#f7f3f6!important;box-shadow:0 10px 28px rgba(62,28,49,.16)!important;backdrop-filter:none!important;-webkit-backdrop-filter:none!important}
 .hlgb-assistant-box{grid-template-columns:200px minmax(0,1fr)!important;gap:10px!important;align-items:start!important;max-height:none!important;overflow:visible!important}
 .hlgb-assistant-box>.hlgb-studio-main9269{grid-column:2!important;min-width:0!important}
 .hlgb-assistant-box>#hlgbAiSidebar9269{grid-column:1!important;grid-row:1/span 30!important;position:sticky!important;top:0!important}
 #hlgbAiSidebar9269{height:auto!important;max-height:calc(84vh - 34px)!important;min-height:0!important;padding:10px!important;border-radius:14px!important;gap:8px!important;box-shadow:none!important}
 .hlgb-ai-sidebrand9269{padding:2px 2px 4px!important}.hlgb-ai-sidebrand9269 strong{font-size:14px!important}.hlgb-ai-new9269{padding:8px 9px!important}.hlgb-ai-history-list9269{max-height:280px!important}.hlgb-ai-history-item9269{padding:6px 7px!important}.hlgb-ai-sidefooter9269{padding-top:7px!important;gap:5px!important}.hlgb-ai-sidefooter9269 button{padding:6px 7px!important}
 .hlgb-ai-hero9269{padding:11px 13px!important;border-radius:14px!important;box-shadow:none!important}.hlgb-ai-logo9269{width:36px!important;height:36px!important;border-radius:10px!important;font-size:18px!important}.hlgb-ai-hero9269 h2{font-size:19px!important;margin-top:0!important}.hlgb-ai-hero9269 p{font-size:11px!important;line-height:1.3!important;margin-top:3px!important}.hlgb-ai-status9269{padding:5px 8px!important;font-size:10px!important}.hlgb-ai-cap9269{gap:4px!important;margin-top:8px!important}.hlgb-ai-cap9269 span{padding:4px 6px!important;font-size:9px!important}
 .hlgb-assistant-input{padding:7px!important;border-radius:11px!important;box-shadow:none!important}.hlgb-assistant-input input{min-height:38px!important;font-size:13px!important}.hlgb-assistant-input .primary{min-width:90px!important;padding:8px 11px!important}
 #hlgbQuick9269{gap:5px!important}#hlgbQuick9269 button{min-height:42px!important;border-radius:9px!important;padding:5px!important;font-size:10px!important}#hlgbQuick9269 b{font-size:14px!important;margin-bottom:1px!important}
 #hlgbVoiceBox9255{padding:9px!important;border-radius:11px!important;box-shadow:none!important}#hlgbVoiceBox9255 textarea{min-height:72px!important;max-height:130px!important}
 #hlgbAssistantAnswer{min-height:86px!important;padding:12px!important;border-radius:5px 11px 11px 11px!important;box-shadow:none!important;line-height:1.4!important}.hlgb-ai-userbubble9269{padding:8px 10px!important;border-radius:12px 12px 4px 12px!important;box-shadow:none!important;font-size:12px!important}.hlgb-ai-footer9269{padding-top:6px!important}
 @media(max-width:900px){.modalbox.hlgb-assistant-modal{width:min(94vw,760px)!important;max-height:88vh!important}.hlgb-assistant-box{grid-template-columns:1fr!important}.hlgb-assistant-box>#hlgbAiSidebar9269{grid-column:1!important;grid-row:auto!important;position:static!important;max-height:150px!important;overflow:auto!important}.hlgb-assistant-box>.hlgb-studio-main9269{grid-column:1!important}.hlgb-ai-history-list9269{max-height:70px!important}#hlgbQuick9269{grid-template-columns:repeat(3,minmax(0,1fr))!important}}
 `;document.head.appendChild(s)
}
function compact(){
 ensureCss();
 try{
  const modal=document.querySelector('.modalbox.hlgb-assistant-modal');
  if(!modal)return false;
  modal.style.setProperty('backdrop-filter','none','important');
  modal.style.setProperty('-webkit-backdrop-filter','none','important');
  const parent=modal.parentElement;
  if(parent){parent.style.setProperty('backdrop-filter','none','important');parent.style.setProperty('-webkit-backdrop-filter','none','important')}
  return true;
 }catch(e){console.warn('[HLGB Assistente leve '+V+']',e);return false}
}
ensureCss();compact();
document.addEventListener('click',e=>{if(e.target?.closest?.('#hlgbAssistantFloatingBtn,[onclick*="openHlgbAssistant"]')){setTimeout(compact,120);setTimeout(compact,300)}},true);
window.hlgbAssistantLight9277={version:V,compact};
console.info('[HLGB] Assistente leve v'+V+' ativo — janela compacta para Safari');
})();