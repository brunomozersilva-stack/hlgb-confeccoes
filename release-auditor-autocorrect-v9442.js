/* HLGB v94.42 — preparação confiável dos reparadores reais do Auditor.
   Garante que as quatro autoridades pós-login estejam prontas antes da autocorreção,
   reaproveita o orquestrador verificável v94.41 e nunca declara sucesso quando uma
   dependência real está ausente. */
(function(){
'use strict';
const V='94.42',BASE_V='94.41',BASE_SRC='./release-auditor-autocorrect-v9441.js';
const CARD_ID='hlgbAuditorAutoCorrect9442Card';
const BASE_DATA='hlgb-auditor-autocorrect-9441-base-for-9442';
if(window.HLGB_AUDITOR_AUTOCORRECT_9442===V)return;
window.HLGB_AUDITOR_AUTOCORRECT_9442=V;
const state={version:V,running:false,runs:0,preparations:0,prepareFailures:0,baseLoads:0,lastAt:'',lastError:'',lastPreparation:null,lastSummary:null};
const sid=v=>String(v??'');
const clone=v=>{try{return structuredClone(v)}catch(e){try{return JSON.parse(JSON.stringify(v))}catch(_){return v}}};
function authReady(){return window.__HLGB_AUTH_READY===true}
function stamp(){try{if((parseFloat(sid(window.HLGB_RELEASE_VERSION))||0)<94.42)window.HLGB_RELEASE_VERSION=V;const el=document.querySelector('#appShell .logo small');if(el&&(parseFloat(sid(el.textContent).replace(/^v/i,''))||0)<94.42)el.textContent='v'+V}catch(e){}}
function dependencyRows(){return [
 {id:'ack-reconcile',ready:typeof window.hlgbAckReconcile9436?.install==='function',version:sid(window.hlgbAckReconcile9436?.version||window.HLGB_ACK_RECONCILE_9436)},
 {id:'production-reconcile',ready:typeof window.hlgbProductionReconcile9439?.reconcile==='function'&&typeof window.hlgbProductionReconcile9439?.candidates==='function',version:sid(window.hlgbProductionReconcile9439?.version||window.HLGB_PRODUCTION_RECONCILE_9439),patch:sid(window.hlgbProductionReconcile9439?.patch||'')},
 {id:'rapid-heal',ready:typeof window.hlgbAuditorRapid9437?.heal==='function',version:sid(window.hlgbAuditorRapid9437?.version||window.HLGB_AUDITOR_RAPID_9437)},
 {id:'auditor-finalizer',ready:typeof window.hlgbAuditorFinalize9439?.install==='function',version:sid(window.hlgbAuditorFinalize9439?.version||window.HLGB_AUDITOR_FINALIZE_9439)}
]}
function currentPreparation(){const dependencies=dependencyRows();return {ok:authReady()&&dependencies.every(x=>x.ready),ready:dependencies.every(x=>x.ready),authReady:authReady(),dependencies,missing:dependencies.filter(x=>!x.ready).map(x=>x.id),at:new Date().toISOString()}}
async function prepare(reason='auditor-v9442'){
 state.preparations++;
 if(!authReady()){const out={...currentPreparation(),ok:false,reason,error:'Autenticação ainda não está pronta'};state.lastPreparation=out;state.prepareFailures++;return out}
 const gate=window.hlgbLoginConfirmGate9407;
 let out=null;
 if(typeof gate?.prepareAuditorRepairs9442==='function'){
  try{out=await gate.prepareAuditorRepairs9442(reason,12000)}catch(e){out={ok:false,ready:false,reason,error:sid(e?.message||e),missing:currentPreparation().missing}}
 }
 const now=currentPreparation();out={...(out||{}),...now,reason};
 if(!out.ok){state.prepareFailures++;state.lastError=out.error||('Reparadores indisponíveis: '+out.missing.join(', '))}
 state.lastPreparation=clone(out);return out;
}
function baseReady(){return window.HLGB_AUDITOR_AUTOCORRECT_9441===BASE_V&&typeof window.hlgbAuditorAutoCorrect9441?.run==='function'}
function ensureBase(){
 if(baseReady())return Promise.resolve(true);
 if(!authReady())return Promise.resolve(false);
 let s=document.querySelector('script[data-'+BASE_DATA+']');
 if(s?.__hlgbPromise)return s.__hlgbPromise;
 if(!s){s=document.createElement('script');s.src=BASE_SRC+'?fresh='+Date.now();s.async=false;s.setAttribute('data-'+BASE_DATA,'1');(document.head||document.documentElement).appendChild(s);state.baseLoads++}
 const p=new Promise(resolve=>{if(baseReady())return resolve(true);let done=false;const finish=()=>{if(done)return;done=true;resolve(baseReady())};s.addEventListener('load',finish,{once:true});s.addEventListener('error',()=>{try{s.remove()}catch(_){}finish()},{once:true});setTimeout(finish,10000)});s.__hlgbPromise=p;return p;
}
function upgradeReport(out,prep){
 const x=clone(out||{});x.version=V;x.runtimeVersion=V;x.dependencies=clone(prep?.dependencies||[]);x.dependencyPreparation=clone(prep||null);
 if(x.report&&typeof x.report==='object'){x.report.version=V;x.report.generatedWithAppVersion=V;x.report.dependencyPreparation=clone(prep||null);if(x.report.run)x.report.run.version=V}
 return x;
}
function failureSummary(prep,detail){return {version:V,runId:'autocorrect-9442-blocked-'+Date.now(),at:new Date().toISOString(),silent:true,nonNavigating:true,passes:0,stopReason:'Execução não iniciada: reparadores reais indisponíveis',fixed:0,corrected:[],stillFailing:[],blocked:[],unverified:[{detail:detail||'Não foi possível confirmar os reparadores reais antes da auditoria.',missing:clone(prep?.missing||[])}],rounds:[],dependencyPreparation:clone(prep||null)}}
const esc=v=>sid(v).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
function render(summary){
 const host=document.getElementById('hlgbAuditorResult');if(!host||!summary)return false;let c=document.getElementById(CARD_ID);if(!c){c=document.createElement('div');c.id=CARD_ID;c.className='panel';host.prepend(c)}
 const deps=summary.dependencyPreparation?.dependencies||dependencyRows(),missing=deps.filter(x=>!x.ready);
 c.innerHTML='<b>🧠 Auditor Autocorretor v94.42</b><div>'+esc(summary.passes||0)+' rodada(s) · '+esc(summary.stopReason||'')+'</div><div class="sub">Reparadores reais: '+(missing.length?'indisponíveis: '+esc(missing.map(x=>x.id).join(', ')):'4/4 prontos')+'. Reteste após cada rodada continua obrigatório.</div><div>Corrigido e validado: '+esc(summary.corrected?.length||0)+' · Ainda com falha: '+esc(summary.stillFailing?.length||0)+' · Decisão humana: '+esc(summary.blocked?.length||0)+' · Não verificado: '+esc(summary.unverified?.length||0)+'</div>';
 return true;
}
async function run(opts={}){
 if(state.running||!authReady())return false;state.running=true;state.runs++;state.lastAt=new Date().toISOString();state.lastError='';
 try{
  const prep=await prepare(opts.reason||'auditor-run');
  if(!prep.ok){const out=failureSummary(prep,state.lastError);state.lastSummary=clone(out);if(opts.render!==false)render(out);return out}
  if(!(await ensureBase())){state.lastError='Orquestrador v94.41 não carregou';const out=failureSummary(prep,state.lastError);state.lastSummary=clone(out);if(opts.render!==false)render(out);return out}
  const base=window.hlgbAuditorAutoCorrect9441;
  const raw=await base.run({...opts,render:false,download:false,reason:opts.reason||'v9442'});
  if(raw===false)return false;
  const out=upgradeReport(raw,prep);state.lastSummary=clone(out);
  if(opts.render!==false)render(out);
  if(opts.download===true){try{base.downloadReport?.(out.report)}catch(e){state.lastError=sid(e?.message||e)}}
  return out;
 }catch(e){state.lastError=sid(e?.message||e);const prep=state.lastPreparation||currentPreparation(),out=failureSummary(prep,state.lastError);state.lastSummary=clone(out);if(opts.render!==false)render(out);return out}
 finally{state.running=false}
}
async function activate(reason='post-auth'){
 if(!authReady())return false;stamp();const prep=await prepare(reason);if(!prep.ok)return false;await ensureBase();return true;
}
window.addEventListener?.('hlgb:authenticated',()=>{setTimeout(()=>activate('authenticated-event'),0)});
window.hlgbAuditorAutoCorrect9442={version:V,state,run,prepare,ensureBase,dependencyRows,currentPreparation,render,activate,status:()=>({...state,authReady:authReady(),baseReady:baseReady(),preparation:clone(state.lastPreparation||currentPreparation())})};
stamp();if(authReady())setTimeout(()=>activate('loaded-after-auth'),0);console.info('[HLGB] v'+V+' Auditor preparado para usar somente reparadores reais confirmados');
})();
