/* HLGB v93.20 — transporte de gravação abortável contra salvamento travado */
(function(){
'use strict';
const V='93.20';
const REALTIME_SINGLETON_PATCH='93.76';
const REALTIME_STORAGE_KEY='hlgb-realtime-nonpersistent-v9376';
if(window.hlgbSaveTransport9320?.version===V)return;
const DEFAULT_TIMEOUT_MS=18000;
let installs=0,transportTimeouts=0,lastTimeout='',lastError='',lastInstall='';
let realtimeClient=null,realtimeUrl='',realtimeKey='',realtimeClientCreates=0,realtimeClientReuses=0,realtimeSingletonInstalls=0,lastRealtimeSingletonInstall='';
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
function isHlgbRealtimeOptions(opts){
 const a=opts?.auth||{},r=opts?.realtime?.params||{};
 return a.persistSession===false&&a.autoRefreshToken===false&&Number(r.eventsPerSecond)>0;
}
function installRealtimeSingleton(){
 try{
  const api=window.supabase,f=api?.createClient;
  if(typeof f!=='function')return false;
  if(f.__hlgbRealtimeSingleton9376)return true;
  const original=f;
  const wrapped=function(url,key,opts){
   const realtime=isHlgbRealtimeOptions(opts);
   if(realtime&&realtimeClient&&sid(url)===realtimeUrl&&sid(key)===realtimeKey){
    realtimeClientReuses++;
    return realtimeClient;
   }
   let callOpts=opts;
   if(realtime){
    callOpts={...(opts||{}),auth:{...(opts?.auth||{}),storageKey:REALTIME_STORAGE_KEY}};
   }
   const out=original.call(this,url,key,callOpts);
   if(realtime&&!realtimeClient){
    realtimeClient=out;realtimeUrl=sid(url);realtimeKey=sid(key);realtimeClientCreates++;
   }
   return out;
  };
  wrapped.__hlgbRealtimeSingleton9376=true;
  wrapped.__hlgbRealtimeSingleton9374=true;
  wrapped.__original=original;
  api.createClient=wrapped;
  realtimeSingletonInstalls++;lastRealtimeSingletonInstall=new Date().toISOString();
  console.info('[HLGB] v'+REALTIME_SINGLETON_PATCH+' cliente Supabase Realtime único + storage isolado ativo');
  return true;
 }catch(e){lastError=sid(e?.message||e);return false}
}
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
  retryTimer=null;installCloudTransport();installRealtimeSingleton();
  if(navigator.onLine===false||userEditing()||pendingCounts().total===0)return;
  try{
   const r=window.hlgbSyncRecovery9301;
   if(r?.status?.()?.busy)return;
   if(typeof r?.fullSync==='function')await r.fullSync('v9320-'+reason,true);
   else if(typeof window.hlgb955FlushSilent==='function')await window.hlgb955FlushSilent();
  }catch(e){lastError=sid(e?.message||e);console.warn('[HLGB '+V+'] recuperação',reason,e)}
 },Math.max(80,+delay||500));
}
function status(){return {version:V,installed:!!window.cloudRequest?.__hlgb9320,installs,transportTimeouts,lastTimeout,lastError,lastInstall,timeoutMs:configuredTimeout(),pending:pendingCounts(),realtimeSingleton:{patch:REALTIME_SINGLETON_PATCH,installed:!!window.supabase?.createClient?.__hlgbRealtimeSingleton9376,installs:realtimeSingletonInstalls,creates:realtimeClientCreates,reuses:realtimeClientReuses,storageKey:REALTIME_STORAGE_KEY,lastInstall:lastRealtimeSingletonInstall}}}
function boot(){
 installCloudTransport();installRealtimeSingleton();
 // Reinstala somente se algum módulo antigo substituir cloudRequest depois. Também
 // aguarda o carregamento assíncrono do supabase-js antes do primeiro Realtime.
 setInterval(()=>{installCloudTransport();installRealtimeSingleton()},1200);
 window.addEventListener('online',()=>scheduleRecovery('online',250));
 window.addEventListener('focus',()=>scheduleRecovery('focus',350));
 document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')scheduleRecovery('visible',350)});
 if(typeof window.hlgbAfterLogin==='function')window.hlgbAfterLogin(()=>scheduleRecovery('login',700),0);else setTimeout(()=>scheduleRecovery('boot',900),900);
 setTimeout(()=>scheduleRecovery('late-boot',900),2200);
 window.hlgbSaveTransport9320={version:V,status,install:installCloudTransport,installRealtimeSingleton,retry:()=>scheduleRecovery('manual',80)};
 try{const cur=Number(window.HLGB_RELEASE_VERSION)||0;if(cur<93.20){window.HLGB_RELEASE_VERSION=V;const l=document.querySelector('#appShell .logo small');if(l)l.textContent='v'+V}}catch(e){}
}
boot();
})();
