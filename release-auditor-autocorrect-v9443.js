/* HLGB v94.43 — Auditor Autocorretor com reconciliação de Produção aguardável.
   Reutiliza toda a segurança/prova da v94.42 e acrescenta coordenação de concorrência:
   o Auditor não recebe falso `false` quando a Produção já está reconciliando. */
(function(){
'use strict';
const V='94.43',BASE_V='94.42',BASE_SRC='./release-auditor-autocorrect-v9442.js',COORD_SRC='./release-production-reconcile-v9443.js';
const CARD_ID='hlgbAuditorAutoCorrect9443Card';
if(window.HLGB_AUDITOR_AUTOCORRECT_9443===V)return;
window.HLGB_AUDITOR_AUTOCORRECT_9443=V;
const state={version:V,running:false,runs:0,preparations:0,failures:0,baseLoads:0,coordinatorLoads:0,lastAt:'',lastError:'',lastPreparation:null,lastSummary:null};
const sid=v=>String(v??'');
const clone=v=>{try{return structuredClone(v)}catch(e){try{return JSON.parse(JSON.stringify(v))}catch(_){return v}}};
function authReady(){return window.__HLGB_AUTH_READY===true}
function stamp(){try{if((parseFloat(sid(window.HLGB_RELEASE_VERSION))||0)<94.43)window.HLGB_RELEASE_VERSION=V;const el=document.querySelector?.('#appShell .logo small');if(el&&(parseFloat(sid(el.textContent).replace(/^v/i,''))||0)<94.43)el.textContent='v'+V}catch(e){}}
function baseReady(){return window.HLGB_AUDITOR_AUTOCORRECT_9442===BASE_V&&typeof window.hlgbAuditorAutoCorrect9442?.run==='function'}
function coordinatorReady(){return window.HLGB_PRODUCTION_RECONCILE_COORDINATOR_9443===V&&window.hlgbProductionReconcile9439?.concurrencyPatch==='94.43-await-busy'&&typeof window.hlgbProductionReconcile9439?.reconcile==='function'}
function loadScript(src,data,ready,onLoad){
 if(ready())return Promise.resolve(true);
 let s=document.querySelector('script[data-'+data+']');
 if(s?.__hlgbPromise)return s.__hlgbPromise;
 if(!s){s=document.createElement('script');s.src=src+'?fresh='+Date.now();s.async=false;s.setAttribute('data-'+data,'1');(document.head||document.documentElement).appendChild(s);onLoad?.()}
 const p=new Promise(resolve=>{if(ready())return resolve(true);let done=false;const finish=()=>{if(done)return;done=true;resolve(ready())};s.addEventListener('load',finish,{once:true});s.addEventListener('error',()=>{try{s.remove()}catch(_){}finish()},{once:true});setTimeout(finish,10000)});s.__hlgbPromise=p;return p;
}
async function ensureBase(){if(baseReady())return true;return loadScript(BASE_SRC,'hlgb-auditor-autocorrect-9442-for-9443',baseReady,()=>state.baseLoads++)}
async function ensureCoordinator(){
 if(coordinatorReady())return true;
 const gate=window.hlgbLoginConfirmGate9407;
 try{if(typeof gate?.loadProductionCoordinator9443==='function')gate.loadProductionCoordinator9443('auditor-v9443')}catch(e){}
 const ok=await loadScript(COORD_SRC,'hlgb-production-reconcile-9443-for-auditor',coordinatorReady,()=>state.coordinatorLoads++);
 try{window.hlgbProductionReconcileCoordinator9443?.install?.('auditor-v9443-ensure')}catch(e){state.lastError=sid(e?.message||e)}
 return ok&&coordinatorReady();
}
async function prepare(reason='auditor-v9443'){
 state.preparations++;
 if(!authReady()){const out={ok:false,ready:false,reason,error:'Autenticação ainda não está pronta',missing:['auth']};state.lastPreparation=out;state.failures++;return out}
 const gate=window.hlgbLoginConfirmGate9407;
 let repairs=null;
 if(typeof gate?.prepareAuditorRepairs9443==='function'){
  try{repairs=await gate.prepareAuditorRepairs9443(reason,15000)}catch(e){repairs={ok:false,ready:false,reason,error:sid(e?.message||e)}}
 }else if(typeof gate?.prepareAuditorRepairs9442==='function'){
  try{repairs=await gate.prepareAuditorRepairs9442(reason,12000)}catch(e){repairs={ok:false,ready:false,reason,error:sid(e?.message||e)}}
 }
 const coord=await ensureCoordinator();
 const base=await ensureBase();
 const deps=repairs?.dependencies||[];
 const missing=[...(repairs?.missing||[])];if(!coord)missing.push('production-concurrency');if(!base)missing.push('autocorrect-9442-base');
 const out={...(repairs||{}),ok:(repairs?.ok!==false)&&coord&&base&&missing.length===0,ready:(repairs?.ready!==false)&&coord&&base&&missing.length===0,reason,dependencies:deps,productionCoordinator:{ready:coord,version:sid(window.hlgbProductionReconcileCoordinator9443?.version||''),patch:sid(window.hlgbProductionReconcile9439?.concurrencyPatch||''),status:clone(window.hlgbProductionReconcileCoordinator9443?.status?.()||null)},baseAutocorrect:{ready:base,version:sid(window.hlgbAuditorAutoCorrect9442?.version||'')},missing:[...new Set(missing)],at:new Date().toISOString(),authReady:true};
 if(!out.ok){state.failures++;state.lastError=out.error||('Dependências v94.43 indisponíveis: '+out.missing.join(', '))}
 state.lastPreparation=clone(out);return out;
}
function upgrade(out,prep){
 const x=clone(out||{});x.version=V;x.runtimeVersion=V;x.dependencyPreparation=clone(prep);x.productionConcurrency=clone(window.hlgbProductionReconcileCoordinator9443?.status?.()||null);
 if(x.report&&typeof x.report==='object'){x.report.version=V;x.report.generatedWithAppVersion=V;x.report.dependencyPreparation=clone(prep);x.report.productionConcurrency=clone(x.productionConcurrency);if(x.report.run)x.report.run.version=V}
 return x;
}
function failure(prep,detail){return {version:V,runId:'autocorrect-9443-blocked-'+Date.now(),at:new Date().toISOString(),silent:true,nonNavigating:true,passes:0,stopReason:'Execução não iniciada: preparação v94.43 incompleta',fixed:0,corrected:[],stillFailing:[],blocked:[],unverified:[{detail:detail||'Não foi possível preparar o Auditor v94.43.',missing:clone(prep?.missing||[])}],rounds:[],dependencyPreparation:clone(prep||null)}}
const esc=v=>sid(v).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
function render(summary){
 const host=document.getElementById('hlgbAuditorResult');if(!host||!summary)return false;let c=document.getElementById(CARD_ID);if(!c){c=document.createElement('div');c.id=CARD_ID;c.className='panel';host.prepend(c)}
 const pc=summary.productionConcurrency||summary.dependencyPreparation?.productionCoordinator?.status||{};
 c.innerHTML='<b>🧠 Auditor Autocorretor v94.43</b><div>'+esc(summary.passes||0)+' rodada(s) · '+esc(summary.stopReason||'')+'</div><div class="sub">Reparadores reais confirmados · Produção aguardável '+(pc.apiPatched===false?'não confirmada':'ativa')+'.</div><div>Corrigido e validado: '+esc(summary.corrected?.length||0)+' · Ainda com falha: '+esc(summary.stillFailing?.length||0)+' · Decisão humana: '+esc(summary.blocked?.length||0)+' · Não verificado: '+esc(summary.unverified?.length||0)+'</div>';
 return true;
}
async function run(opts={}){
 if(state.running||!authReady())return false;state.running=true;state.runs++;state.lastAt=new Date().toISOString();state.lastError='';stamp();
 try{
  const prep=await prepare(opts.reason||'auditor-run-v9443');
  if(!prep.ok){const out=failure(prep,state.lastError);state.lastSummary=clone(out);if(opts.render!==false)render(out);return out}
  const raw=await window.hlgbAuditorAutoCorrect9442.run({...opts,render:false,download:false,reason:opts.reason||'v9443'});
  if(raw===false){const s=window.hlgbProductionReconcileCoordinator9443?.status?.();throw new Error('Autocorretor base retornou false'+(s?.inFlight?' durante reconciliação em andamento':''))}
  const out=upgrade(raw,prep);state.lastSummary=clone(out);if(opts.render!==false)render(out);
  if(opts.download===true){try{window.hlgbAuditorAutoCorrect9441?.downloadReport?.(out.report)}catch(e){state.lastError=sid(e?.message||e)}}
  return out;
 }catch(e){state.lastError=sid(e?.message||e);const prep=state.lastPreparation||null,out=failure(prep,state.lastError);state.lastSummary=clone(out);if(opts.render!==false)render(out);return out}
 finally{state.running=false}
}
async function activate(reason='post-auth'){if(!authReady())return false;stamp();const p=await prepare(reason);return !!p.ok}
window.addEventListener?.('hlgb:authenticated',()=>setTimeout(()=>activate('authenticated-event'),0));
window.hlgbAuditorAutoCorrect9443={version:V,state,run,prepare,ensureBase,ensureCoordinator,render,activate,status:()=>({...state,authReady:authReady(),baseReady:baseReady(),coordinatorReady:coordinatorReady(),preparation:clone(state.lastPreparation)})};
stamp();if(authReady())setTimeout(()=>activate('loaded-after-auth'),0);console.info('[HLGB] v'+V+' Auditor com Produção aguardável ativo');
})();
