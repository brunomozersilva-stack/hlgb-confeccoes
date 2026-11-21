/* HLGB v96.13 — recuperação opcional do erro Safari "Load failed".
   Não contorna credenciais/RLS, não toca IndexedDB/WAL e nunca repete gravações. */
(function(){
'use strict';
const VERSION='96.13';
if(window.hlgbAuthNetwork9613?.version===VERSION)return;
const state={version:VERSION,installs:0,authRetries:0,readRetries:0,authConfirmed:false,lastFailure:null};
const online=()=>typeof navigator==='undefined'||navigator.onLine!==false;
const msg=e=>String(e?.message||'').trim().toLowerCase();
const loadFailed=e=>e?.name==='TypeError'&&msg(e)==='load failed';
const transient=e=>e?.name==='TypeError'&&/^(load failed|failed to fetch|fetch failed|network error|network request failed|networkerror when attempting to fetch resource\.?)$/.test(msg(e));
const delay=ms=>new Promise(r=>setTimeout(r,ms));
function record(stage,e){
 const report={at:new Date().toISOString(),stage,kind:loadFailed(e)?'safari-load-failed':transient(e)?'network-typeerror':'other',
  errorType:String(e?.name||'').slice(0,32),online:online(),authenticatedBeforeFailure:state.authConfirmed};
 state.lastFailure=report;
 try{sessionStorage.setItem('hlgb_auth_network_failure_v9613',JSON.stringify(report))}catch(_){}
}
function install(){
 const signIn=window.cloudSignIn;
 if(typeof signIn==='function'&&!signIn.__hlgbAuthNetwork9613){
  const wrapped=async function(){
   try{const v=await signIn.apply(this,arguments);state.authConfirmed=true;return v}
   catch(e){
    if(loadFailed(e)&&online()){
     state.authRetries++;await delay(650);
     try{const v=await signIn.apply(this,arguments);state.authConfirmed=true;return v}
     catch(next){record('authentication',next);throw next}
    }
    record('authentication',e);throw e
   }
  };
  wrapped.__original=signIn;wrapped.__hlgbAuthNetwork9613=true;
  window.cloudSignIn=wrapped;state.installs++;
 }
 const request=window.cloudRequest;
 if(typeof request==='function'&&!request.__hlgbAuthNetwork9613){
  const wrapped=async function(path,options){
   const method=String(options?.method||'GET').toUpperCase();
   try{return await request.apply(this,arguments)}
   catch(e){
    if(method==='GET'&&!options?.signal?.aborted&&transient(e)&&online()){
     state.readRetries++;await delay(650);
     try{return await request.apply(this,arguments)}
     catch(next){record('authenticated-read',next);throw next}
    }
    if(method==='GET')record('authenticated-read',e);
    throw e;
   }
  };
  wrapped.__original=request;wrapped.__hlgbAuthNetwork9613=true;
  window.cloudRequest=wrapped;state.installs++;
 }
 return state.installs;
}
window.hlgbAuthNetwork9613={version:VERSION,install,status:()=>({
 version:VERSION,installed:!!window.cloudSignIn?.__hlgbAuthNetwork9613&&!!window.cloudRequest?.__hlgbAuthNetwork9613,
 authRetries:state.authRetries,readRetries:state.readRetries,authConfirmed:state.authConfirmed,lastFailure:state.lastFailure
})};
install();
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});
[150,700,2200].forEach(ms=>setTimeout(install,ms));
})();