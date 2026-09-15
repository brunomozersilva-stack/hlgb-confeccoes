/* HLGB v92.44 — refresh sem piscar login quando a sessão ainda é válida */
(function(){
'use strict';
const V='92.44';
function stamp(){
  try{document.title='HLGB Confecções — Sistema de Gestão v'+V+' Multiusuário'}catch(e){}
  try{const e=document.querySelector('#appShell .logo small');if(e)e.textContent='v'+V}catch(e){}
  try{const loginVersion=document.querySelector('#loginScreen b');if(loginVersion&&/Versão/i.test(loginVersion.textContent||''))loginVersion.textContent='Versão v'+V}catch(e){}
}
function normalizeAuthView(){
  const loader=document.getElementById('sessionLoader'),login=document.getElementById('loginScreen'),app=document.getElementById('appShell');
  if(!loader||!login||!app)return;
  if(app.style.display==='block'){
    loader.style.display='none';
    login.style.display='none';
  }
}
try{if(typeof hlgbAfterLogin==='function')hlgbAfterLogin(()=>{stamp();normalizeAuthView()},0)}catch(e){}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{stamp();normalizeAuthView()},{once:true});else{stamp();normalizeAuthView()}
setTimeout(()=>{stamp();normalizeAuthView()},500);
setTimeout(()=>{stamp();normalizeAuthView()},1800);
console.info('[HLGB] hotfix v'+V+' ativo — sessão visualmente estável no refresh');
})();