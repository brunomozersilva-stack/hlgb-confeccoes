/* HLGB v94.07 — confirmação explícita de entrada por abertura de página.
   Executa no <head>, antes do fluxo de autenticação. Não altera sessão Supabase. */
(function(){
'use strict';
const V='94.07',CLASS='hlgb-login-confirmed-9407',STYLE='hlgbLoginConfirmGate9407Style';
const root=document.documentElement;
let authenticatedObserved=false,lastReleaseReason='';
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
function confirm(){window.__HLGB_LOGIN_CONFIRMED_9407=true;root.classList.add(CLASS);return true}
function reset(){window.__HLGB_LOGIN_CONFIRMED_9407=false;authenticatedObserved=false;lastReleaseReason='';root.classList.remove(CLASS);ensureStyle();return true}
function settleRestored(reason){
 const apply=()=>{
  if(!window.__HLGB_LOGIN_CONFIRMED_9407||!restoredSessionReady())return;
  const l=document.getElementById('loginScreen'),s=document.getElementById('sessionLoader'),a=document.getElementById('appShell');
  if(l)l.style.display='none';if(s)s.style.display='none';if(a)a.style.display='block';lastReleaseReason=reason||restoredSessionReady();
 };
 try{if(window.__HLGB_RESTORED_SESSION_READY===true&&typeof window.__HLGB_RESTORED_SESSION_ENTER==='function')window.__HLGB_RESTORED_SESSION_ENTER()}catch(e){console.warn('[HLGB '+V+'] restorer',e)}
 apply();setTimeout(apply,0);setTimeout(apply,60);setTimeout(apply,180);
}
function onAction(e){
 if(!loginAction(e))return;
 const reason=restoredSessionReady();confirm();
 /* Uma sessão já autenticada foi restaurada por baixo do gate. O gesto explícito
    libera essa mesma sessão e bloqueia um segundo login desnecessário. Sem sinal
    real de autenticação, o evento original segue normalmente e valida credenciais. */
 if(reason){try{e.preventDefault()}catch(_){}try{e.stopImmediatePropagation()}catch(_){}settleRestored(reason)}
}
ensureStyle();
window.addEventListener('hlgb:authenticated',()=>{authenticatedObserved=true},true);
document.addEventListener('click',onAction,true);document.addEventListener('keydown',onAction,true);
window.hlgbLoginConfirmGate9407={version:V,confirm,reset,restoredSessionReady,status:()=>({version:V,required:true,confirmed:root.classList.contains(CLASS),authenticatedObserved,authReady:window.__HLGB_AUTH_READY===true,restoredReady:window.__HLGB_RESTORED_SESSION_READY===true,restoredAlreadyOpened:restoredAlreadyOpened(),releaseReason:lastReleaseReason})};
console.info('[HLGB] v'+V+' confirmação explícita de login ativa');
})();
