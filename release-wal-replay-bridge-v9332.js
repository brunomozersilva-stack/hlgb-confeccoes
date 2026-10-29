/* HLGB v94.33 — ponte segura para recuperação do WAL durável.
   Não apaga fila, não grava direto e não ignora conflitos.
   Expõe os replay handlers legados e delega a recuperação para a autoridade
   incremental, que envia pendências sem forçar recarga ampla/redraw da tela.
   v94.33: remove o full-sync periódico indireto que podia redesenhar Produtos
   a cada ciclo enquanto existiam pendências. */
(function(){
'use strict';
const V='94.33', RECOVERY_EVERY_MS=30000;
if(window.HLGB_WAL_REPLAY_BRIDGE_9332)return;
window.HLGB_WAL_REPLAY_BRIDGE_9332=V;

const state={installed:false,started:false,lastExposeAt:0,lastRecoverAt:0,recovering:false,timer:null,exposed:{},delegatedIncremental:0,delegatedReplay:0,skippedNoPending:0,lastReason:'',lastResult:null};
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
function localPendingCounts(){
  let records=0,wal=0;
  try{const p=JSON.parse(localStorage.getItem('hlgb_records_pending_v91')||'null');records=Object.values(p?.modules||{}).reduce((n,x)=>n+(Array.isArray(x)?x.length:0),0)}catch(e){}
  try{const w=JSON.parse(localStorage.getItem('hlgb_durable_wal_v1')||'null');wal=w?.entries&&typeof w.entries==='object'?Object.keys(w.entries).length:0}catch(e){}
  return {records,wal,total:records+wal};
}
function pendingCounts(){
  try{
    const p=window.hlgbSyncRecovery9301?.pending?.();
    if(p&&Number.isFinite(+p.records)&&Number.isFinite(+p.wal))return {records:+p.records||0,wal:+p.wal||0,total:(+p.records||0)+(+p.wal||0)};
  }catch(e){}
  return localPendingCounts();
}
async function recover(reason='bridge'){
  if(state.recovering)return false;
  state.recovering=true;state.lastReason=reason;
  try{
    exposeAll();
    state.lastRecoverAt=Date.now();
    const pending=pendingCounts();
    if(pending.total===0){state.skippedNoPending++;state.lastResult={ok:true,reason,kind:'no-pending',pending};return true}

    /* Autoridade preferida: incrementalSync(true). Quando há pendência, o próprio
       sync-recovery entra no caminho flush-only: envia fila normal + WAL e NÃO
       relê o bundle inteiro nem chama redrawCurrent(). */
    const sync=window.hlgbSyncRecovery9301;
    if(sync&&typeof sync.incrementalSync==='function'){
      state.delegatedIncremental++;
      const ok=await sync.incrementalSync(true);
      state.lastResult={ok:ok===true,reason,kind:'incremental-flush',pendingBefore:pending,pendingAfter:pendingCounts()};
      return ok===true;
    }

    /* Fallback seguro: replay confirmado do WAL. Ele usa applied:true como ACK e
       não deve disparar full-sync depois do envio. */
    const replay=window.hlgbWalConfirmedReplay9333;
    if(replay&&typeof replay.run==='function'){
      state.delegatedReplay++;
      const ok=await replay.run('bridge-'+reason,true);
      state.lastResult={ok:ok===true,reason,kind:'confirmed-replay',pendingBefore:pending,pendingAfter:pendingCounts()};
      return ok===true;
    }

    /* Compatibilidade com instalações antigas. Só chega aqui se as autoridades
       novas ainda não estiverem disponíveis no boot. */
    if(window.hlgbSaveTransport9320&&typeof window.hlgbSaveTransport9320.recover==='function'){
      const ok=await window.hlgbSaveTransport9320.recover('wal-bridge-fallback-'+reason);
      state.lastResult={ok:ok===true,reason,kind:'legacy-transport-fallback',pendingBefore:pending,pendingAfter:pendingCounts()};
      return ok===true;
    }
    let ok=true;
    if(typeof window.hlgb955FlushSilent==='function'){
      const out=await window.hlgb955FlushSilent(48);if(out===false)ok=false;
    }
    if(typeof window.hlgb985FlushRecordWal==='function'){
      const out=await window.hlgb985FlushRecordWal(48);if(out===false)ok=false;
    }
    state.lastResult={ok,reason,kind:'legacy-direct-fallback',pendingBefore:pending,pendingAfter:pendingCounts()};
    return ok;
  }catch(e){
    state.lastResult={ok:false,reason,error:String(e?.message||e)};
    console.warn('[HLGB v94.33] recuperação WAL adiada',e);return false;
  }finally{state.recovering=false}
}
function stamp(){
  try{
    const cur=parseFloat(String(window.HLGB_RELEASE_VERSION||'0'))||0;
    if(cur<94.33){window.HLGB_RELEASE_VERSION=V;const el=document.querySelector('#appShell .logo small');if(el)el.textContent='v'+V}
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
  }catch(e){console.warn('[HLGB v94.33] replay confirmado não carregado',e);return false}
}
function start(){
  if(state.started){ensureConfirmedReplay();replayTryBoot();return true}
  state.started=true;
  exposeAll();stamp();ensureConfirmedReplay();
  setTimeout(()=>recover('boot').catch(()=>{}),900);
  let n=0;const warm=setInterval(()=>{n++;exposeAll();ensureConfirmedReplay();replayTryBoot();if((state.installed&&window.HLGB_WAL_CONFIRMED_REPLAY_9333)||n>=20)clearInterval(warm)},500);
  clearInterval(state.timer);state.timer=setInterval(()=>{ensureConfirmedReplay();replayTryBoot();if(pendingCounts().total>0)recover('interval').catch(()=>{})},RECOVERY_EVERY_MS);
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
window.hlgbWalReplayBridge9332={version:V,state,exposeAll,recover,ensureConfirmedReplay,start,tryStart,pending:pendingCounts};
window.addEventListener('online',()=>{tryStart();ensureConfirmedReplay();if(pendingCounts().total>0)recover('online').catch(()=>{})});
window.addEventListener('focus',()=>{tryStart();ensureConfirmedReplay();if(pendingCounts().total>0)recover('focus').catch(()=>{})});
document.addEventListener('visibilitychange',()=>{if(!document.hidden){tryStart();ensureConfirmedReplay();if(pendingCounts().total>0)recover('visible').catch(()=>{})}});
if(typeof window.hlgbAfterLogin==='function')window.hlgbAfterLogin(()=>setTimeout(start,100),0);
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(tryStart,80),{once:true});
[80,350,900,1800,3500].forEach(ms=>setTimeout(tryStart,ms));
console.info('[HLGB] v'+V+' ponte WAL em flush-only, sem full-sync periódico');
})();