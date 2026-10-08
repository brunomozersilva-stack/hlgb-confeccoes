/* HLGB v93.28 — transporte abortável de nuvem + autenticação sem espera infinita */
(function(){
'use strict';
const V='93.28';
if(window.hlgbSaveTransport9320?.version===V)return;
const DEFAULT_TIMEOUT_MS=18000;
const AUTH_TIMEOUT_MS=18000;
let installs=0,authInstalls=0,transportTimeouts=0,authTimeouts=0,lastTimeout='',lastError='',lastInstall='',lastAuthInstall='';
const sid=v=>String(v??'');
function configuredTimeout(){
 const n=Number(window.HLGB_SAVE_TRANSPORT_TIMEOUT_MS);
 return Number.isFinite(n)&&n>=25?Math.min(60000,n):DEFAULT_TIMEOUT_MS;
}
function timeoutError(path,method,ms){
 const e=new Error('A nuvem demorou demais para responder ao '+method+'. A alteração continua protegida e será reenviada.');
 e.code='HLGB_CLOUD_TIMEOUT';e.path=sid(path);e.method=method;e.timeoutMs=ms;return e;
}
function authTimeoutError(ms){
 const e=new Error('A autenticação demorou demais para responder. Tente entrar novamente.');
 e.code='HLGB_AUTH_TIMEOUT';e.timeoutMs=ms;return e;
}
function markTimeout(path,method,ms){transportTimeouts++;lastTimeout=new Date().toISOString();lastError='timeout '+method+' '+sid(path)+' após '+ms+'ms'}
function installCloudTransport(){
 const f=window.cloudRequest;
 if(typeof f!=='function'||f.__hlgb9320)return false;
 const wrapped=async function(path,options={}){
  const opts=(options&&typeof options==='object')?options:{};
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
function installAuthTransport(){
 const current=window.cloudSignIn;
 if(typeof current!=='function'||current.__hlgb9328Auth)return false;
 const authSignIn=async function(email,password){
  const AC=window.AbortController||(typeof AbortController!=='undefined'?AbortController:null);
  const base=typeof HLGB_SUPABASE_URL!=='undefined'?HLGB_SUPABASE_URL:window.HLGB_SUPABASE_URL;
  const key=typeof HLGB_SUPABASE_KEY!=='undefined'?HLGB_SUPABASE_KEY:window.HLGB_SUPABASE_KEY;
  const apply=typeof cloudApplyAuth==='function'?cloudApplyAuth:window.cloudApplyAuth;
  if(!base||!key||typeof apply!=='function')return current.call(this,email,password);
  let timer=null,controller=null;
  try{
   if(typeof AC==='function')controller=new AC();
   const opts={method:'POST',headers:{'apikey':key,'Content-Type':'application/json'},body:JSON.stringify({email,password})};
   if(controller)opts.signal=controller.signal;
   if(controller)timer=setTimeout(()=>{try{controller.abort()}catch(e){}},AUTH_TIMEOUT_MS);
   let response;
   if(controller)response=await fetch(base+'/auth/v1/token?grant_type=password',opts);
   else response=await Promise.race([
    fetch(base+'/auth/v1/token?grant_type=password',opts),
    new Promise((_,reject)=>{timer=setTimeout(()=>reject(authTimeoutError(AUTH_TIMEOUT_MS)),AUTH_TIMEOUT_MS)})
   ]);
   const data=await response.json().catch(()=>({}));
   if(!response.ok||!data.access_token)throw new Error(data.error_description||data.msg||data.message||'Não foi possível entrar.');
   apply(data);lastError='';return data;
  }catch(e){
   if(controller?.signal?.aborted||e?.name==='AbortError'||e?.code==='HLGB_AUTH_TIMEOUT'){
    authTimeouts++;lastTimeout=new Date().toISOString();lastError='timeout autenticação após '+AUTH_TIMEOUT_MS+'ms';
    const err=authTimeoutError(AUTH_TIMEOUT_MS);err.cause=e;throw err;
   }
   lastError=sid(e?.message||e);throw e;
  }finally{clearTimeout(timer)}
 };
 authSignIn.__hlgb9328Auth=true;authSignIn.__hlgb9328Original=current;
 window.cloudSignIn=authSignIn;
 try{cloudSignIn=authSignIn}catch(e){}
 authInstalls++;lastAuthInstall=new Date().toISOString();
 console.info('[HLGB] v'+V+' autenticação com timeout abortável instalada');
 return true;
}
function installTransports(){const a=installCloudTransport(),b=installAuthTransport();return a||b}
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
  retryTimer=null;installTransports();
  if(navigator.onLine===false||userEditing()||pendingCounts().total===0)return;
  try{
   const r=window.hlgbSyncRecovery9301;
   if(r?.status?.()?.busy)return;
   if(typeof r?.fullSync==='function')await r.fullSync('v9328-'+reason,true);
   else if(typeof window.hlgb955FlushSilent==='function')await window.hlgb955FlushSilent();
  }catch(e){lastError=sid(e?.message||e);console.warn('[HLGB '+V+'] recuperação',reason,e)}
 },Math.max(80,+delay||500));
}
function status(){return {version:V,installed:!!window.cloudRequest?.__hlgb9320,authInstalled:!!window.cloudSignIn?.__hlgb9328Auth,installs,authInstalls,transportTimeouts,authTimeouts,lastTimeout,lastError,lastInstall,lastAuthInstall,timeoutMs:configuredTimeout(),authTimeoutMs:AUTH_TIMEOUT_MS,pending:pendingCounts()}}
function boot(){
 installTransports();
 // Usa o mesmo verificador que já existia: não cria uma segunda rotina periódica.
 setInterval(installTransports,1200);
 window.addEventListener('online',()=>scheduleRecovery('online',250));
 window.addEventListener('focus',()=>scheduleRecovery('focus',350));
 document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')scheduleRecovery('visible',350)});
 if(typeof window.hlgbAfterLogin==='function')window.hlgbAfterLogin(()=>scheduleRecovery('login',700),0);else setTimeout(()=>scheduleRecovery('boot',900),900);
 setTimeout(()=>scheduleRecovery('late-boot',900),2200);
 window.hlgbSaveTransport9320={version:V,status,install:installTransports,retry:()=>scheduleRecovery('manual',80)};
 try{const cur=Number(window.HLGB_RELEASE_VERSION)||0;if(cur<93.28){window.HLGB_RELEASE_VERSION=V;const l=document.querySelector('#appShell .logo small');if(l)l.textContent='v'+V}}catch(e){}
}
boot();
})();
