/* HLGB v93.32 — ponte segura para recuperação do WAL durável.
   Não apaga fila, não grava direto e não ignora conflitos.
   Apenas expõe os replay handlers legados quando eles existem no escopo global
   e aciona o transporte central já existente.
   v93.36 boot-fix: inicia também quando a sessão já estava aberta antes deste script. */
(function(){
'use strict';
const V='93.32';
if(window.HLGB_WAL_REPLAY_BRIDGE_9332)return;
window.HLGB_WAL_REPLAY_BRIDGE_9332=V;

const state={installed:false,started:false,lastExposeAt:0,lastRecoverAt:0,recovering:false,timer:null,exposed:{}};
function pick(name){
  try{
    if(typeof window[name]==='function')return window[name];
    const fn=eval('typeof '+name+'==="function" ? '+name+' : null');
    return typeof fn==='function'?fn:null;
  }catch(e){return null}
}
function expose(name){
  try{
    if(typeof window[name]==='function'){state.exposed[name]='already-window';return true}
    const fn=pick(name);if(!fn){state.exposed[name]='missing';return false}
    window[name]=fn;state.exposed[name]='bridged';return true;
  }catch(e){state.exposed[name]='error';return false}
}
function exposeAll(){
  state.lastExposeAt=Date.now();
  ['hlgb955EnsureWal','hlgb955FlushSilent','count955','hlgb985Ensure','hlgb985FlushRecordWal'].forEach(expose);
  state.installed=typeof window.hlgb955FlushSilent==='function'||typeof window.hlgb985FlushRecordWal==='function';
  return state.installed;
}
async function recover(reason='bridge'){
  if(state.recovering)return false;
  state.recovering=true;
  try{
    exposeAll();
    state.lastRecoverAt=Date.now();
    if(window.hlgbSaveTransport9320&&typeof window.hlgbSaveTransport9320.recover==='function'){
      return await window.hlgbSaveTransport9320.recover('wal-bridge-'+reason);
    }
    let ok=true;
    if(typeof window.hlgb955FlushSilent==='function'){
      const out=await window.hlgb955FlushSilent(48);if(out===false)ok=false;
    }
    if(typeof window.hlgb985FlushRecordWal==='function'){
      const out=await window.hlgb985FlushRecordWal(48);if(out===false)ok=false;
    }
    if(typeof window.hlgbNormalizedSyncNow==='function'){
      try{await window.hlgbNormalizedSyncNow(false)}catch(e){ok=false}
    }
    return ok;
  }catch(e){
    console.warn('[HLGB v93.32] recuperação WAL adiada',e);return false;
  }finally{state.recovering=false}
}
function stamp(){
  try{
    const cur=parseFloat(String(window.HLGB_RELEASE_VERSION||'0'))||0;
    if(cur<93.32){window.HLGB_RELEASE_VERSION=V;const el=document.querySelector('#appShell .logo small');if(el)el.textContent='v'+V}
  }catch(e){}
}
function replayTryBoot(){
  try{
    const r=window.hlgbWalConfirmedReplay9333;
    if(r&&typeof r.tryBoot==='function')r.tryBoot();
  }catch(e){}
}
function ensureConfirmedReplay(){
  try{
    if(window.HLGB_WAL_CONFIRMED_REPLAY_9333){replayTryBoot();return true}
    const existing=document.querySelector('script[data-hlgb-wal-confirmed="9333"]');
    if(existing){replayTryBoot();return true}
    const s=document.createElement('script');s.dataset.hlgbWalConfirmed='9333';s.src='./release-wal-confirmed-replay-v9333.js?fresh='+Date.now();
    s.onload=()=>{replayTryBoot();setTimeout(replayTryBoot,250)};
    (document.head||document.documentElement).appendChild(s);return true;
  }catch(e){console.warn('[HLGB v93.32] replay confirmado não carregado',e);return false}
}
function start(){
  if(state.started){ensureConfirmedReplay();replayTryBoot();return true}
  state.started=true;
  exposeAll();stamp();ensureConfirmedReplay();
  setTimeout(()=>recover('boot').catch(()=>{}),900);
  let n=0;const warm=setInterval(()=>{n++;exposeAll();ensureConfirmedReplay();replayTryBoot();if((state.installed&&window.HLGB_WAL_CONFIRMED_REPLAY_9333)||n>=20)clearInterval(warm)},500);
  clearInterval(state.timer);state.timer=setInterval(()=>{ensureConfirmedReplay();replayTryBoot();recover('interval').catch(()=>{})},12000);
  return true
}
function appAlreadyOpen(){
  try{
    const app=document.getElementById('appShell'),login=document.getElementById('loginScreen');
    if(!app)return false;
    if(login&&getComputedStyle(login).display!=='none')return false;
    return getComputedStyle(app).display!=='none';
  }catch(e){return false}
}
function tryStart(){if(state.started)return true;if(appAlreadyOpen())return start();return false}
window.hlgbWalReplayBridge9332={version:V,state,exposeAll,recover,ensureConfirmedReplay,start,tryStart};
window.addEventListener('online',()=>{tryStart();ensureConfirmedReplay();recover('online').catch(()=>{})});
window.addEventListener('focus',()=>{tryStart();ensureConfirmedReplay();recover('focus').catch(()=>{})});
document.addEventListener('visibilitychange',()=>{if(!document.hidden){tryStart();ensureConfirmedReplay();recover('visible').catch(()=>{})}});
if(typeof window.hlgbAfterLogin==='function')window.hlgbAfterLogin(()=>setTimeout(start,100),0);
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(tryStart,80),{once:true});
[80,350,900,1800,3500].forEach(ms=>setTimeout(tryStart,ms));
console.info('[HLGB] v'+V+' ponte de replay WAL ativa');
})();