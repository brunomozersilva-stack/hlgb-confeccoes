/* HLGB v94.43 — coordenação aguardável da reconciliação de Produção.
   Não altera prova, normalização ou poda da v94.39/v94.42.
   Se já houver uma reconciliação em andamento, reutiliza o resultado dela em vez de
   devolver false; chamadas concorrentes pela API compartilham a mesma Promise. */
(function(){
'use strict';
const V='94.43',PATCH='94.43-await-busy',BASE_PATCH='94.42-safe-proof';
if(window.HLGB_PRODUCTION_RECONCILE_COORDINATOR_9443===V&&window.hlgbProductionReconcile9439?.concurrencyPatch===PATCH)return;
window.HLGB_PRODUCTION_RECONCILE_COORDINATOR_9443=V;
const state={version:V,patch:PATCH,installed:false,installs:0,calls:0,started:0,shared:0,joinedExisting:0,waits:0,timeouts:0,staleRejected:0,lastAt:'',lastReason:'',lastError:'',lastJoinResult:null};
let sharedPromise=null;
const sid=v=>String(v??'');
const clone=v=>{try{return structuredClone(v)}catch(e){try{return JSON.parse(JSON.stringify(v))}catch(_){return v}}};
const ms=v=>{const n=Date.parse(sid(v));return Number.isFinite(n)?n:NaN};
function authReady(){return window.__HLGB_AUTH_READY===true}
function api(){return window.hlgbProductionReconcile9439||null}
function status(a=api()){try{return a?.status?.()||{...(a?.state||{})}}catch(e){return {...(a?.state||{})}}}
function stamp(){try{const cur=parseFloat(sid(window.HLGB_RELEASE_VERSION||'0'))||0;if(cur<94.43)window.HLGB_RELEASE_VERSION=V;const el=document.querySelector?.('#appShell .logo small');if(el&&(parseFloat(sid(el.textContent).replace(/^v/i,''))||0)<94.43)el.textContent='v'+V}catch(e){}}
function waitForExisting(a,reason='join-existing',timeoutMs=15000){
 state.waits++;const started=Date.now(),initial=status(a),runAtStart=+initial.runs||0,runStartedAt=ms(initial.lastAt);
 return new Promise((resolve,reject)=>{
  const tick=()=>{
   const s=status(a);
   if(!s.busy){
    const out=s.lastResult,outAt=ms(out?.at);
    const fresh=!!out&&((Number.isFinite(runStartedAt)&&Number.isFinite(outAt)&&outAt>=runStartedAt)||((+s.runs||0)>runAtStart));
    if(fresh){state.joinedExisting++;state.lastJoinResult=clone(out);return resolve(out)}
    state.staleRejected++;state.lastError='Reconciliação em andamento terminou sem resultado novo verificável';return reject(new Error(state.lastError));
   }
   if(Date.now()-started>=Math.max(1000,+timeoutMs||15000)){state.timeouts++;state.lastError='Timeout aguardando reconciliação de Produção em andamento';return reject(new Error(state.lastError+' · run '+runAtStart))}
   setTimeout(tick,25);
  };
  tick();
 })
}
function install(reason='manual-install'){
 const a=api();
 if(!a||typeof a.reconcile!=='function'||typeof a.candidates!=='function')return false;
 if(a.patch!==BASE_PATCH&&sid(a.patch)!=='94.42-safe-proof'){state.lastError='Patch seguro da Produção v94.42 não confirmado';return false}
 if(a.concurrencyPatch===PATCH&&a.__hlgbBaseReconcile9443){state.installed=true;return true}
 const base=a.reconcile.bind(a);
 function coordinatedReconcile(reason2='manual'){
  state.calls++;state.lastAt=new Date().toISOString();state.lastReason=sid(reason2);
  if(sharedPromise){state.shared++;return sharedPromise}
  const s=status(a);
  if(s.busy){
   sharedPromise=waitForExisting(a,reason2).catch(e=>{state.lastError=sid(e?.message||e);throw e}).finally(()=>{sharedPromise=null});
   return sharedPromise;
  }
  state.started++;
  let p;
  try{
   p=Promise.resolve(base(reason2)).then(result=>{
    if(result!==false)return result;
    const after=status(a);
    if(after.busy)return waitForExisting(a,reason2);
    return result;
   });
  }catch(e){p=Promise.reject(e)}
  sharedPromise=p.catch(e=>{state.lastError=sid(e?.message||e);throw e}).finally(()=>{sharedPromise=null});
  return sharedPromise;
 }
 a.__hlgbBaseReconcile9443=base;
 a.reconcile=coordinatedReconcile;
 a.concurrencyPatch=PATCH;
 a.concurrencyVersion=V;
 a.concurrentStatus=()=>({...state,base:status(a),inFlight:!!sharedPromise});
 state.installed=true;state.installs++;stamp();
 console.info('[HLGB] v'+V+' coordenação aguardável da Produção ativa · '+reason);
 return true;
}
function activate(reason='post-auth'){
 if(!authReady())return false;
 if(install(reason))return true;
 [40,120,300,700,1500,3000].forEach(msDelay=>setTimeout(()=>install(reason+'-'+msDelay),msDelay));return false;
}
window.addEventListener?.('hlgb:authenticated',()=>setTimeout(()=>activate('authenticated-event'),0));
window.hlgbProductionReconcileCoordinator9443={version:V,patch:PATCH,state,install,activate,waitForExisting,status:()=>({...state,authReady:authReady(),baseReady:!!api(),basePatch:sid(api()?.patch||''),apiPatched:api()?.concurrencyPatch===PATCH,inFlight:!!sharedPromise})};
if(authReady())activate('loaded-after-auth');
})();
