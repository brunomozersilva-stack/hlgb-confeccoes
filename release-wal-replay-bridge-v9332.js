/* HLGB v93.32 — ponte segura para recuperação do WAL durável.
   Não apaga fila, não grava direto e não ignora conflitos.
   Apenas expõe os replay handlers legados quando eles existem no escopo global
   e aciona o transporte central já existente. */
(function(){
'use strict';
const V='93.32';
if(window.HLGB_WAL_REPLAY_BRIDGE_9332)return;
window.HLGB_WAL_REPLAY_BRIDGE_9332=V;

const state={installed:false,lastExposeAt:0,lastRecoverAt:0,recovering:false,timer:null,exposed:{}};
function pick(name){
  try{
    if(typeof window[name]==='function')return window[name];
    // Acesso por identificador global lexical. eval indireto não enxerga lexical;
    // eval direto neste script enxerga bindings globais existentes sem executar dados.
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
function start(){
  exposeAll();stamp();
  setTimeout(()=>recover('boot').catch(()=>{}),900);
  let n=0;const warm=setInterval(()=>{n++;exposeAll();if(state.installed||n>=20)clearInterval(warm)},500);
  clearInterval(state.timer);state.timer=setInterval(()=>recover('interval').catch(()=>{}),12000);
}
window.hlgbWalReplayBridge9332={version:V,state,exposeAll,recover};
window.addEventListener('online',()=>recover('online').catch(()=>{}));
window.addEventListener('focus',()=>recover('focus').catch(()=>{}));
document.addEventListener('visibilitychange',()=>{if(!document.hidden)recover('visible').catch(()=>{})});
if(typeof window.hlgbAfterLogin==='function')window.hlgbAfterLogin(()=>setTimeout(start,100),0);
else if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
else start();
console.info('[HLGB] v'+V+' ponte de replay WAL ativa');
})();