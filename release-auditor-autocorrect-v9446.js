/* HLGB v94.46 — Auditor Autocorretor com confiança global separada da evidência por registro.
   Preserva toda a cadeia v94.44 e mantém a trava B >= 0,60 para a receita.
   Divergências específicas de um registro continuam registradas, mas não derrubam
   a confiança da receita inteira nem impedem a terceira rodada de outros registros. */
(function(){
'use strict';
const V='94.46',BASE_V='94.44',BASE_SRC='./release-auditor-autocorrect-v9444.js';
const CARD_ID='hlgbAuditorAutoCorrect9446Card';
const LEARNING_KEY='hlgb_auditor_repair_learning_v9441';
if(window.HLGB_AUDITOR_AUTOCORRECT_9446===V)return;
window.HLGB_AUDITOR_AUTOCORRECT_9446=V;
const state={version:V,running:false,runs:0,preparations:0,baseLoads:0,isolations:0,seeded:0,lastAt:'',lastError:'',lastPreparation:null,lastIsolation:null,lastSummary:null};
const sid=v=>String(v??'');
const clone=v=>{try{return structuredClone(v)}catch(e){try{return JSON.parse(JSON.stringify(v))}catch(_){return v}}};
const readJson=(k,f)=>{try{const x=JSON.parse(localStorage.getItem(k)||'null');return x??f}catch(e){return f}};
const writeJson=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v));return true}catch(e){return false}};
const nowIso=()=>new Date().toISOString();
function authReady(){return window.__HLGB_AUTH_READY===true}
function stamp(){try{if((parseFloat(sid(window.HLGB_RELEASE_VERSION))||0)<94.46)window.HLGB_RELEASE_VERSION=V;const el=document.querySelector?.('#appShell .logo small');if(el&&(parseFloat(sid(el.textContent).replace(/^v/i,''))||0)<94.46)el.textContent='v'+V}catch(e){}}
function learningStore(){const x=readJson(LEARNING_KEY,{});return x&&typeof x==='object'&&!Array.isArray(x)?x:{}}
function baseReady(){return window.HLGB_AUDITOR_AUTOCORRECT_9444===BASE_V&&typeof window.hlgbAuditorAutoCorrect9444?.run==='function'}
function loadScript(){
 if(baseReady())return Promise.resolve(true);
 let s=document.querySelector('script[data-hlgb-auditor-autocorrect-9444-for-9446]');
 if(s?.__hlgbPromise)return s.__hlgbPromise;
 if(!s){s=document.createElement('script');s.src=BASE_SRC+'?fresh='+Date.now();s.async=false;s.setAttribute('data-hlgb-auditor-autocorrect-9444-for-9446','1');(document.head||document.documentElement).appendChild(s);state.baseLoads++}
 const p=new Promise(resolve=>{if(baseReady())return resolve(true);let done=false;const finish=()=>{if(done)return;done=true;resolve(baseReady())};s.addEventListener('load',finish,{once:true});s.addEventListener('error',()=>{try{s.remove()}catch(_){}finish()},{once:true});setTimeout(finish,12000)});s.__hlgbPromise=p;return p;
}
async function ensureBase(){return baseReady()?true:loadScript()}
function recordKey(id){return 'production-reconcile|production|'+sid(id)}
function isProductionRecordRow(key,row){return key.startsWith('production-reconcile|production|')||sid(row?.fingerprint).startsWith('production|')}
async function isolateProductionRecordLearning(reason='v9446'){
 const all=learningStore(),changes=[],seeded=[];let dirty=false;
 for(const [key,raw] of Object.entries(all)){
  if(!raw||typeof raw!=='object'||!isProductionRecordRow(key,raw))continue;
  if(sid(raw.recipeId)==='production-reconcile-record'&&sid(raw.parentRecipeId)==='production-reconcile'&&sid(raw.scope)==='record')continue;
  const row={...raw,recipeId:'production-reconcile-record',parentRecipeId:'production-reconcile',scope:'record',isolatedBy:'94.46-record-learning-scope',isolatedAt:nowIso()};
  all[key]=row;dirty=true;changes.push({key,confidence:Number(raw.confidence)||0,failures:+raw.failures||0,fromRecipeId:sid(raw.recipeId),toRecipeId:row.recipeId});
 }
 let candidates=[];
 try{const x=await window.hlgbProductionReconcile9439?.candidates?.();if(Array.isArray(x))candidates=x}catch(e){state.lastError=sid(e?.message||e)}
 for(const c of candidates){
  const id=sid(c?.id);if(!id)continue;const key=recordKey(id),existing=all[key];
  if(existing){
   if(sid(existing.recipeId)!=='production-reconcile-record'||sid(existing.scope)!=='record'){
    all[key]={...existing,recipeId:'production-reconcile-record',parentRecipeId:'production-reconcile',scope:'record',isolatedBy:'94.46-record-learning-scope',isolatedAt:nowIso()};dirty=true;changes.push({key,confidence:Number(existing.confidence)||0,failures:+existing.failures||0,fromRecipeId:sid(existing.recipeId),toRecipeId:'production-reconcile-record'});
   }
   continue;
  }
  const at=nowIso();all[key]={recipeId:'production-reconcile-record',parentRecipeId:'production-reconcile',fingerprint:'production|'+id,scope:'record',level:'B',observations:0,attempts:0,verifiedSuccesses:0,failures:0,recurrences:0,confidence:0.85,firstSeenAt:at,firstSeenVersion:V,lastSeenAt:at,lastSeenVersion:V,proofType:'',seededBy:'94.46-record-learning-scope'};dirty=true;seeded.push({key,id,confidence:0.85});
 }
 const saved=dirty?writeJson(LEARNING_KEY,all):true;
 if(saved){state.isolations+=changes.length;state.seeded+=seeded.length}
 const general=all['production-reconcile|general'];
 const out={version:V,reason,changed:saved&&dirty,saved,changes,seeded,general:general?{recipeId:sid(general.recipeId),confidence:Number(general.confidence)||0,failures:+general.failures||0,attempts:+general.attempts||0}:null,recordRows:Object.entries(all).filter(([k,r])=>isProductionRecordRow(k,r)).length,at:nowIso()};state.lastIsolation=clone(out);return out;
}
async function prepare(reason='auditor-v9446'){
 state.preparations++;
 if(!authReady()){const out={ok:false,ready:false,reason,error:'Autenticação ainda não está pronta',missing:['auth']};state.lastPreparation=out;return out}
 if(!(await ensureBase())){const out={ok:false,ready:false,reason,error:'Autocorretor v94.44 indisponível',missing:['autocorrect-9444']};state.lastPreparation=out;return out}
 let basePrep=null;try{basePrep=await window.hlgbAuditorAutoCorrect9444.prepare(reason)}catch(e){basePrep={ok:false,ready:false,error:sid(e?.message||e)}}
 const isolation=await isolateProductionRecordLearning(reason+'-prepare');
 const out={...(basePrep||{}),ok:basePrep?.ok!==false&&isolation.saved!==false,ready:basePrep?.ready!==false&&isolation.saved!==false,reason,baseAutocorrect:{ready:true,version:BASE_V},recordLearningIsolation:clone(isolation),at:nowIso(),authReady:true};state.lastPreparation=clone(out);return out;
}
function upgrade(raw,prep,preIsolation,postIsolation){
 const x=clone(raw||{});x.version=V;x.runtimeVersion=V;x.dependencyPreparation=clone(prep);x.recordLearningIsolation={beforeRun:clone(preIsolation),afterRun:clone(postIsolation)};
 if(x.report&&typeof x.report==='object'){
  x.report.version=V;x.report.generatedWithAppVersion=V;x.report.appVersion=V;x.report.dependencyPreparation=clone(prep);x.report.recordLearningIsolation=clone(x.recordLearningIsolation);x.report.learning=clone(learningStore());
  if(x.report.run){x.report.run.version=V;x.report.run.recordLearningIsolation=clone(x.recordLearningIsolation)}
 }
 return x;
}
function failure(prep,detail){return {version:V,runId:'autocorrect-9446-blocked-'+Date.now(),at:nowIso(),silent:true,nonNavigating:true,passes:0,stopReason:'Execução não iniciada: preparação v94.46 incompleta',fixed:0,corrected:[],stillFailing:[],blocked:[],unverified:[{detail:detail||'Não foi possível preparar o Auditor v94.46.'}],rounds:[],dependencyPreparation:clone(prep||null)}}
const esc=v=>sid(v).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
function render(summary){
 const host=document.getElementById('hlgbAuditorResult');if(!host||!summary)return false;let c=document.getElementById(CARD_ID);if(!c){c=document.createElement('div');c.id=CARD_ID;c.className='panel';host.prepend(c)}
 const iso=summary.recordLearningIsolation?.afterRun||summary.recordLearningIsolation||summary.dependencyPreparation?.recordLearningIsolation||{};
 c.innerHTML='<b>🧠 Auditor Autocorretor v94.46</b><div>'+esc(summary.passes||0)+' rodada(s) · '+esc(summary.stopReason||'')+'</div><div class="sub">Confiança global da receita separada da evidência por registro · '+esc(iso.recordRows||0)+' registro(s) isolado(s).</div><div>Corrigido e validado: '+esc(summary.corrected?.length||0)+' · Ainda com falha: '+esc(summary.stillFailing?.length||0)+' · Decisão humana: '+esc(summary.blocked?.length||0)+' · Não verificado: '+esc(summary.unverified?.length||0)+'</div>';return true;
}
async function run(opts={}){
 if(state.running||!authReady())return false;state.running=true;state.runs++;state.lastAt=nowIso();state.lastError='';stamp();
 try{
  const prep=await prepare(opts.reason||'auditor-run-v9446');if(!prep.ok){const out=failure(prep,prep.error);state.lastSummary=clone(out);if(opts.render!==false)render(out);return out}
  const preIsolation=await isolateProductionRecordLearning((opts.reason||'v9446')+'-before-run');
  const raw=await window.hlgbAuditorAutoCorrect9444.run({...opts,render:false,download:false,reason:opts.reason||'v9446'});if(raw===false)throw new Error('Autocorretor v94.44 retornou false');
  const postIsolation=await isolateProductionRecordLearning((opts.reason||'v9446')+'-after-run');
  const out=upgrade(raw,prep,preIsolation,postIsolation);state.lastSummary=clone(out);if(opts.render!==false)render(out);if(opts.download===true){try{window.hlgbAuditorAutoCorrect9441?.downloadReport?.(out.report)}catch(e){state.lastError=sid(e?.message||e)}}return out;
 }catch(e){state.lastError=sid(e?.message||e);const out=failure(state.lastPreparation,state.lastError);state.lastSummary=clone(out);if(opts.render!==false)render(out);return out}
 finally{state.running=false}
}
async function activate(reason='post-auth'){if(!authReady())return false;stamp();const p=await prepare(reason);return !!p.ok}
window.addEventListener?.('hlgb:authenticated',()=>setTimeout(()=>activate('authenticated-event'),0));
window.hlgbAuditorAutoCorrect9446={version:V,state,run,prepare,ensureBase,isolateProductionRecordLearning,learning:()=>clone(learningStore()),render,activate,status:()=>({...state,authReady:authReady(),baseReady:baseReady(),preparation:clone(state.lastPreparation),isolation:clone(state.lastIsolation)})};
stamp();if(authReady())setTimeout(()=>activate('loaded-after-auth'),0);console.info('[HLGB] v'+V+' Auditor ativo · confiança global separada da evidência por registro');
})();
