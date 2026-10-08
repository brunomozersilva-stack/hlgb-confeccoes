/* HLGB v93.20 — transporte de gravação abortável contra salvamento travado */
(function(){
'use strict';
const V='93.20';
if(window.hlgbSaveTransport9320?.version===V)return;
const DEFAULT_TIMEOUT_MS=18000;
let installs=0,transportTimeouts=0,lastTimeout='',lastError='',lastInstall='';
const sid=v=>String(v??'');
function configuredTimeout(){
 const n=Number(window.HLGB_SAVE_TRANSPORT_TIMEOUT_MS);
 return Number.isFinite(n)&&n>=25?Math.min(60000,n):DEFAULT_TIMEOUT_MS;
}
function timeoutError(path,method,ms){
 const e=new Error('A nuvem demorou demais para responder ao '+method+'. A alteração continua protegida e será reenviada.');
 e.code='HLGB_CLOUD_TIMEOUT';e.path=sid(path);e.method=method;e.timeoutMs=ms;return e;
}
function markTimeout(path,method,ms){transportTimeouts++;lastTimeout=new Date().toISOString();lastError='timeout '+method+' '+sid(path)+' após '+ms+'ms'}
function installCloudTransport(){
 const f=window.cloudRequest;
 if(typeof f!=='function'||f.__hlgb9320)return false;
 const wrapped=async function(path,options={}){
  const opts=(options&&typeof options==='object')?options:{};
  // Respeita um AbortSignal explícito do chamador. O watchdog só cobre chamadas
  // antigas que antes podiam ficar penduradas para sempre no Safari.
  if(opts.signal)return f.call(this,path,opts);
  const method=sid(opts.method||'GET').toUpperCase(),ms=configuredTimeout();
  const AC=window.AbortController||(typeof AbortController!=='undefined'?AbortController:null);
  if(typeof AC!=='function'){
   let timer;
   try{
    return await Promise.race([
     Promise.resolve(f.call(this,path,opts)),
     new Promise((_,reject)=>{timer=setTimeout(()=>{markTimeout(path,method,ms);reject(timeoutError(path,method,ms))},ms)})
    ]);
   }finally{clearTimeout(timer)}
  }
  const controller=new AC();let timer;
  try{
   timer=setTimeout(()=>{try{controller.abort()}catch(e){}},ms);
   return await f.call(this,path,{...opts,signal:controller.signal});
  }catch(e){
   if(controller.signal?.aborted||e?.name==='AbortError'){
    markTimeout(path,method,ms);
    const err=timeoutError(path,method,ms);err.cause=e;throw err;
   }
   lastError=sid(e?.message||e);throw e;
  }finally{clearTimeout(timer)}
 };
 wrapped.__hlgb9320=true;wrapped.__hlgb9320Original=f;
 window.cloudRequest=wrapped;installs++;lastInstall=new Date().toISOString();
 console.info('[HLGB] v'+V+' transporte de nuvem com timeout abortável instalado');
 return true;
}
function pendingCounts(){
 let records=0,wal=0;
 try{const p=JSON.parse(localStorage.getItem('hlgb_records_pending_v91')||'null');records=Object.values(p?.modules||{}).reduce((n,x)=>n+(Array.isArray(x)?x.length:0),0)}catch(e){}
 try{const w=JSON.parse(localStorage.getItem('hlgb_durable_wal_v1')||'null');wal=w?.entries&&typeof w.entries==='object'?Object.keys(w.entries).length:0}catch(e){}
 return {records,wal,total:records+wal};
}
function userEditing(){
 try{if(document.querySelector('#modal.show'))return true;const a=document.activeElement;return !!(a&&/^(INPUT|TEXTAREA|SELECT)$/i.test(a.tagName)&&a.closest?.('#appShell'))}catch(e){return false}
}
let retryTimer=null;
function scheduleRecovery(reason='transport',delay=500){
 clearTimeout(retryTimer);retryTimer=setTimeout(async()=>{
  retryTimer=null;installCloudTransport();
  if(navigator.onLine===false||userEditing()||pendingCounts().total===0)return;
  try{
   const r=window.hlgbSyncRecovery9301;
   if(r?.status?.()?.busy)return;
   if(typeof r?.fullSync==='function')await r.fullSync('v9320-'+reason,true);
   else if(typeof window.hlgb955FlushSilent==='function')await window.hlgb955FlushSilent();
  }catch(e){lastError=sid(e?.message||e);console.warn('[HLGB '+V+'] recuperação',reason,e)}
 },Math.max(80,+delay||500));
}
function status(){return {version:V,installed:!!window.cloudRequest?.__hlgb9320,installs,transportTimeouts,lastTimeout,lastError,lastInstall,timeoutMs:configuredTimeout(),pending:pendingCounts()}}
function boot(){
 installCloudTransport();
 // Reinstala somente se algum módulo antigo substituir cloudRequest depois.
 setInterval(installCloudTransport,1200);
 window.addEventListener('online',()=>scheduleRecovery('online',250));
 window.addEventListener('focus',()=>scheduleRecovery('focus',350));
 document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')scheduleRecovery('visible',350)});
 if(typeof window.hlgbAfterLogin==='function')window.hlgbAfterLogin(()=>scheduleRecovery('login',700),0);else setTimeout(()=>scheduleRecovery('boot',900),900);
 setTimeout(()=>scheduleRecovery('late-boot',900),2200);
 window.hlgbSaveTransport9320={version:V,status,install:installCloudTransport,retry:()=>scheduleRecovery('manual',80)};
 try{const cur=Number(window.HLGB_RELEASE_VERSION)||0;if(cur<93.20){window.HLGB_RELEASE_VERSION=V;const l=document.querySelector('#appShell .logo small');if(l)l.textContent='v'+V}}catch(e){}
}
boot();
})();
