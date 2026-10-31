/* HLGB v94.07 — confirmação explícita de entrada por abertura de página.
   Executa no <head>, antes do fluxo de autenticação. Não altera sessão Supabase. */
(function(){
'use strict';
const V='94.07',CLASS='hlgb-login-confirmed-9407',STYLE='hlgbLoginConfirmGate9407Style';
const root=document.documentElement;
let authenticatedObserved=false,lastReleaseReason='',ackLoading9436=false,rapidLoading9437=false,productionLoading9438=false,reliabilityLoading9438=false;
window.__HLGB_LOGIN_CONFIRM_REQUIRED_9407=true;
window.__HLGB_LOGIN_CONFIRMED_9407=false;
function ensureStyle(){
 let st=document.getElementById(STYLE);if(st)return st;
 st=document.createElement('style');st.id=STYLE;
 st.textContent='html:not(.'+CLASS+') #appShell{display:none!important}html:not(.'+CLASS+') #loginScreen{display:flex!important}html:not(.'+CLASS+') #sessionLoader{display:none!important}';
 (document.head||root).appendChild(st);return st;
}
function loginAction(e){
 const login=document.getElementById('loginScreen'),t=e?.target;if(!login||!t||!login.contains(t))return false;
 if(e.type==='keydown')return e.key==='Enter';
 const b=t.closest?.('button,[role="button"],input[type="submit"]');if(!b)return false;
 const text=String(b.textContent||b.value||'').trim().toLowerCase(),oc=String(b.getAttribute?.('onclick')||'').toLowerCase();
 return text.includes('entrar')||oc.includes('dologin')||oc.includes('cloudlogin');
}
function restoredAlreadyOpened(){const app=document.getElementById('appShell'),login=document.getElementById('loginScreen');return !!(app&&login&&app.style.display==='block'&&login.style.display==='none')}
function restoredSessionReady(){
 if(window.__HLGB_RESTORED_SESSION_READY===true)return 'restored-ready';
 if(window.__HLGB_AUTH_READY===true)return 'auth-ready';
 if(authenticatedObserved)return 'authenticated-event';
 if(restoredAlreadyOpened())return 'legacy-opened';
 return '';
}
function loadAckReconcile9436(reason){
 if(window.__HLGB_AUTH_READY!==true)return false;
 if(window.HLGB_ACK_RECONCILE_9436==='94.36'){try{window.hlgbAckReconcile9436?.activate?.(reason||'already-loaded')}catch(e){}return true}
 if(document.querySelector('script[data-hlgb-ack-reconcile-9436]'))return true;
 if(ackLoading9436)return false;ackLoading9436=true;
 try{const s=document.createElement('script');s.src='./release-ack-reconcile-v9436.js?fresh='+Date.now();s.async=false;s.setAttribute('data-hlgb-ack-reconcile-9436','1');s.onload=()=>{ackLoading9436=false;try{window.hlgbAckReconcile9436?.activate?.(reason||'authenticated-load')}catch(e){}};s.onerror=()=>{ackLoading9436=false;try{s.remove()}catch(e){}console.warn('[HLGB 94.36] não foi possível carregar reconciliação pós-login')};(document.head||root).appendChild(s);return true}catch(e){ackLoading9436=false;console.warn('[HLGB 94.36] loader pós-login',e);return false}
}
function armAckReconcile9436(reason){[0,60,180,500,1200].forEach(ms=>setTimeout(()=>loadAckReconcile9436(reason),ms))}
function loadRapid9437(reason){
 if(window.__HLGB_AUTH_READY!==true)return false;
 if(window.HLGB_AUDITOR_RAPID_9437==='94.37'){try{window.hlgbAuditorRapid9437?.activate?.(reason||'already-loaded')}catch(e){}return true}
 if(document.querySelector('script[data-hlgb-auditor-rapid-9437]'))return true;
 if(rapidLoading9437)return false;rapidLoading9437=true;
 try{const s=document.createElement('script');s.src='./release-auditor-rapid-learning-v9437.js?fresh='+Date.now();s.async=false;s.setAttribute('data-hlgb-auditor-rapid-9437','1');s.onload=()=>{rapidLoading9437=false;try{window.hlgbAuditorRapid9437?.activate?.(reason||'authenticated-load')}catch(e){}};s.onerror=()=>{rapidLoading9437=false;try{s.remove()}catch(e){}console.warn('[HLGB 94.37] não foi possível carregar aprendizado rápido pós-login')};(document.head||root).appendChild(s);return true}catch(e){rapidLoading9437=false;console.warn('[HLGB 94.37] loader pós-login',e);return false}
}
function armRapid9437(reason){[250,700,1500].forEach(ms=>setTimeout(()=>loadRapid9437(reason),ms))}
function loadProductionConfirm9438(reason){
 if(window.__HLGB_AUTH_READY!==true)return false;
 if(window.HLGB_PRODUCTION_SAVE_CONFIRM_9438==='94.38'){try{window.hlgbProductionSaveConfirm9438?.activate?.(reason||'already-loaded')}catch(e){}return true}
 if(document.querySelector('script[data-hlgb-production-confirm-9438]'))return true;
 if(productionLoading9438)return false;productionLoading9438=true;
 try{const s=document.createElement('script');s.src='./release-production-save-confirm-v9438.js?fresh='+Date.now();s.async=false;s.setAttribute('data-hlgb-production-confirm-9438','1');s.onload=()=>{productionLoading9438=false;try{window.hlgbProductionSaveConfirm9438?.activate?.(reason||'authenticated-load')}catch(e){}};s.onerror=()=>{productionLoading9438=false;try{s.remove()}catch(e){}console.warn('[HLGB 94.38] não foi possível carregar confirmação forte de Produção')};(document.head||root).appendChild(s);return true}catch(e){productionLoading9438=false;console.warn('[HLGB 94.38] loader Produção pós-login',e);return false}
}
function armProduction9438(reason){[180,550,1300].forEach(ms=>setTimeout(()=>loadProductionConfirm9438(reason),ms))}
function loadReliability9438(reason){
 if(window.__HLGB_AUTH_READY!==true)return false;
 if(window.HLGB_AUDITOR_RELIABILITY_9438==='94.38'){try{window.hlgbAuditorReliability9438?.activate?.(reason||'already-loaded')}catch(e){}return true}
 if(document.querySelector('script[data-hlgb-auditor-reliability-9438]'))return true;
 if(reliabilityLoading9438)return false;reliabilityLoading9438=true;
 try{const s=document.createElement('script');s.src='./release-auditor-reliability-v9438.js?fresh='+Date.now();s.async=false;s.setAttribute('data-hlgb-auditor-reliability-9438','1');s.onload=()=>{reliabilityLoading9438=false;try{window.hlgbAuditorReliability9438?.activate?.(reason||'authenticated-load')}catch(e){}};s.onerror=()=>{reliabilityLoading9438=false;try{s.remove()}catch(e){}console.warn('[HLGB 94.38] não foi possível carregar confiabilidade do Auditor')};(document.head||root).appendChild(s);return true}catch(e){reliabilityLoading9438=false;console.warn('[HLGB 94.38] loader Auditor pós-login',e);return false}
}
function armReliability9438(reason){[650,1200,2200].forEach(ms=>setTimeout(()=>loadReliability9438(reason),ms))}
function confirm(){window.__HLGB_LOGIN_CONFIRMED_9407=true;root.classList.add(CLASS);return true}
function reset(){window.__HLGB_LOGIN_CONFIRMED_9407=false;authenticatedObserved=false;lastReleaseReason='';root.classList.remove(CLASS);ensureStyle();return true}
function settleRestored(reason){
 const apply=()=>{if(!window.__HLGB_LOGIN_CONFIRMED_9407||!restoredSessionReady())return;const l=document.getElementById('loginScreen'),s=document.getElementById('sessionLoader'),a=document.getElementById('appShell');if(l)l.style.display='none';if(s)s.style.display='none';if(a)a.style.display='block';lastReleaseReason=reason||restoredSessionReady()};
 try{if(window.__HLGB_RESTORED_SESSION_READY===true&&typeof window.__HLGB_RESTORED_SESSION_ENTER==='function')window.__HLGB_RESTORED_SESSION_ENTER()}catch(e){console.warn('[HLGB '+V+'] restorer',e)}apply();setTimeout(apply,0);setTimeout(apply,60);setTimeout(apply,180);
}
function onAction(e){if(!loginAction(e))return;const reason=restoredSessionReady();confirm();if(reason){try{e.preventDefault()}catch(_){}try{e.stopImmediatePropagation()}catch(_){}settleRestored(reason)}}
function armPostAuth(reason){armAckReconcile9436(reason);armProduction9438(reason);armRapid9437(reason);armReliability9438(reason)}
ensureStyle();
window.addEventListener('hlgb:authenticated',()=>{authenticatedObserved=true;armPostAuth('authenticated-event')},true);
document.addEventListener('click',onAction,true);document.addEventListener('keydown',onAction,true);
if(window.__HLGB_AUTH_READY===true)armPostAuth('already-authenticated');
window.hlgbLoginConfirmGate9407={version:V,confirm,reset,restoredSessionReady,loadAckReconcile9436,loadRapid9437,loadProductionConfirm9438,loadReliability9438,status:()=>({version:V,required:true,confirmed:root.classList.contains(CLASS),authenticatedObserved,authReady:window.__HLGB_AUTH_READY===true,restoredReady:window.__HLGB_RESTORED_SESSION_READY===true,restoredAlreadyOpened:restoredAlreadyOpened(),releaseReason:lastReleaseReason,ackReconcileLoaded:window.HLGB_ACK_RECONCILE_9436==='94.36',rapidLearningLoaded:window.HLGB_AUDITOR_RAPID_9437==='94.37',productionConfirmLoaded:window.HLGB_PRODUCTION_SAVE_CONFIRM_9438==='94.38',auditorReliabilityLoaded:window.HLGB_AUDITOR_RELIABILITY_9438==='94.38'})};
console.info('[HLGB] v'+V+' confirmação explícita de login ativa');
})();
