/* HLGB v94.07 — confirmação explícita de entrada por abertura de página.
   Executa no <head>, antes do fluxo de autenticação. Não altera sessão Supabase. */
(function(){
'use strict';
const V='94.07',CLASS='hlgb-login-confirmed-9407',STYLE='hlgbLoginConfirmGate9407Style';
const root=document.documentElement;
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
function confirm(){window.__HLGB_LOGIN_CONFIRMED_9407=true;root.classList.add(CLASS);return true}
function reset(){window.__HLGB_LOGIN_CONFIRMED_9407=false;root.classList.remove(CLASS);ensureStyle();return true}
function onAction(e){
 if(!loginAction(e))return;
 const restored=restoredAlreadyOpened();confirm();
 /* Se a rotina antiga já restaurou a sessão e tentou abrir o painel antes do gesto,
    não disparamos um segundo login. Apenas liberamos a interface já autenticada. */
 if(restored){try{e.preventDefault()}catch(_){}try{e.stopImmediatePropagation()}catch(_){}const l=document.getElementById('loginScreen'),s=document.getElementById('sessionLoader'),a=document.getElementById('appShell');if(l)l.style.display='none';if(s)s.style.display='none';if(a)a.style.display='block'}
}
ensureStyle();
document.addEventListener('click',onAction,true);document.addEventListener('keydown',onAction,true);
window.hlgbLoginConfirmGate9407={version:V,confirm,reset,status:()=>({version:V,required:true,confirmed:root.classList.contains(CLASS),restoredAlreadyOpened:restoredAlreadyOpened()})};
console.info('[HLGB] v'+V+' confirmação explícita de login ativa');
})();
