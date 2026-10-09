/* HLGB v93.38 — guarda de timeout por registro no replay WAL confirmado.
   Evita que uma única gravação pendurada bloqueie toda a fila. */
(function(){
'use strict';
const V='93.38', WAIT_MS=22000;
if(window.HLGB_WAL_REPLAY_TIMEOUT_9338)return;
window.HLGB_WAL_REPLAY_TIMEOUT_9338=V;
function timeout(ms,label){return new Promise((_,reject)=>setTimeout(()=>reject(new Error(label||'Tempo limite de confirmação excedido')),ms))}
function install(){
 const api=window.hlgbWalConfirmedReplay9333;
 if(!api||typeof api.run!=='function'||typeof window.hlgbRecordSaveWithRetry!=='function')return false;
 if(window.hlgbRecordSaveWithRetry.__hlgb9338)return true;
 const base=window.hlgbRecordSaveWithRetry;
 const wrapped=async function(module,id,data,deleted){return await Promise.race([Promise.resolve(base.apply(this,arguments)),timeout(WAIT_MS,'Timeout v93.38 aguardando confirmação de '+String(module)+'|'+String(id))])};
 wrapped.__hlgb9338=true;wrapped.__hlgb9338Original=base;window.hlgbRecordSaveWithRetry=wrapped;return true;
}
function stamp(){try{const cur=parseFloat(String(window.HLGB_RELEASE_VERSION||'0'))||0;if(cur<93.38)window.HLGB_RELEASE_VERSION=V}catch(e){}}
function boot(){install();stamp();let n=0;const t=setInterval(()=>{n++;install();stamp();if(n>=40)clearInterval(t)},250)}
if(typeof window.hlgbAfterLogin==='function')window.hlgbAfterLogin(()=>setTimeout(boot,120),0);
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(boot,200),{once:true});else setTimeout(boot,200);
[700,1800,4000].forEach(ms=>setTimeout(boot,ms));
window.hlgbWalReplayTimeout9338={version:V,install,timeoutMs:WAIT_MS};
console.info('[HLGB] v'+V+' timeout por registro do replay WAL ativo');
})();
