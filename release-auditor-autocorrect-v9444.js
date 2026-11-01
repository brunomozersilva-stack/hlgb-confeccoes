/* HLGB v94.44 — Auditor Autocorretor com aprendizado de falha contabilizado uma vez.
   Preserva a v94.43 (Produção aguardável) e corrige a penalização duplicada da v94.41:
   uma mesma falha de receita não pode reduzir a confiança duas vezes. */
(function(){
'use strict';
const V='94.44',BASE_V='94.43',BASE_SRC='./release-auditor-autocorrect-v9443.js';
const CARD_ID='hlgbAuditorAutoCorrect9444Card';
const LEARNING_KEY='hlgb_auditor_repair_learning_v9441';
const EVENTS_KEY='hlgb_auditor_repair_events_v9441';
if(window.HLGB_AUDITOR_AUTOCORRECT_9444===V)return;
window.HLGB_AUDITOR_AUTOCORRECT_9444=V;
const state={version:V,running:false,runs:0,preparations:0,baseLoads:0,migrations:0,dedupedFailures:0,lastAt:'',lastError:'',lastPreparation:null,lastMigration:null,lastDedup:null,lastSummary:null};
const sid=v=>String(v??'');
const clone=v=>{try{return structuredClone(v)}catch(e){try{return JSON.parse(JSON.stringify(v))}catch(_){return v}}};
const readJson=(k,f)=>{try{const x=JSON.parse(localStorage.getItem(k)||'null');return x??f}catch(e){return f}};
const writeJson=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v));return true}catch(e){return false}};
function authReady(){return window.__HLGB_AUTH_READY===true}
function stamp(){try{if((parseFloat(sid(window.HLGB_RELEASE_VERSION))||0)<94.44)window.HLGB_RELEASE_VERSION=V;const el=document.querySelector?.('#appShell .logo small');if(el&&(parseFloat(sid(el.textContent).replace(/^v/i,''))||0)<94.44)el.textContent='v'+V}catch(e){}}
function baseReady(){return window.HLGB_AUDITOR_AUTOCORRECT_9443===BASE_V&&typeof window.hlgbAuditorAutoCorrect9443?.run==='function'}
function loadScript(){
 if(baseReady())return Promise.resolve(true);
 let s=document.querySelector('script[data-hlgb-auditor-autocorrect-9443-for-9444]');
 if(s?.__hlgbPromise)return s.__hlgbPromise;
 if(!s){s=document.createElement('script');s.src=BASE_SRC+'?fresh='+Date.now();s.async=false;s.setAttribute('data-hlgb-auditor-autocorrect-9443-for-9444','1');(document.head||document.documentElement).appendChild(s);state.baseLoads++}
 const p=new Promise(resolve=>{if(baseReady())return resolve(true);let done=false;const finish=()=>{if(done)return;done=true;resolve(baseReady())};s.addEventListener('load',finish,{once:true});s.addEventListener('error',()=>{try{s.remove()}catch(_){}finish()},{once:true});setTimeout(finish,12000)});s.__hlgbPromise=p;return p;
}
async function ensureBase(){return baseReady()?true:loadScript()}
function learningStore(){const x=readJson(LEARNING_KEY,{});return x&&typeof x==='object'&&!Array.isArray(x)?x:{}}
function repairEvents(){const x=readJson(EVENTS_KEY,[]);return Array.isArray(x)?x:[]}
function migrateKnownDoublePenalty(){
 const all=learningStore(),key='production-reconcile|general',row=all[key];
 const before=row?clone(row):null;
 const exact=!!row&&sid(row.recipeId)==='production-reconcile'&&sid(row.fingerprint)==='general'&&sid(row.level)==='B'&&(+row.attempts||0)===1&&(+row.failures||0)===2&&(+row.verifiedSuccesses||0)===0&&(+row.recurrences||0)===0&&Number(row.confidence)<=0.50&&sid(row.lastSeenVersion)==='94.41'&&!sid(row.proofType);
 if(!exact){const out={changed:false,key,reason:row?'assinatura histórica não corresponde à dupla penalização conhecida':'linha histórica ausente',before};state.lastMigration=clone(out);return out}
 row.failures=1;row.confidence=0.67;row.migratedBy='94.44-double-failure-dedup';row.migratedAt=new Date().toISOString();all[key]=row;const saved=writeJson(LEARNING_KEY,all);
 const out={changed:saved,key,reason:saved?'dupla penalização histórica corrigida':'não foi possível persistir a migração',before,after:clone(row)};if(saved)state.migrations++;state.lastMigration=clone(out);return out;
}
function generalSnapshot(){const all=learningStore(),out={};for(const [k,row] of Object.entries(all)){if(!k.endsWith('|general'))continue;out[k]={recipeId:sid(row?.recipeId),attempts:+row?.attempts||0,failures:+row?.failures||0,confidence:Number(row?.confidence)||0}}return out}
function dedupeRunFailureAccounting(runId,before={}){
 const events=repairEvents().filter(e=>sid(e?.runId)===sid(runId)&&sid(e?.kind)==='repair-attempt'&&sid(e?.status)==='failed'),counts={};for(const e of events){const id=sid(e?.recipeId);if(id)counts[id]=(counts[id]||0)+1}
 const all=learningStore(),changes=[];
 for(const [recipeId,eventCount] of Object.entries(counts)){
  const key=recipeId+'|general',row=all[key],prev=before[key]||{failures:0,confidence:Number(row?.confidence)||0};if(!row)continue;
  const deltaFailures=(+row.failures||0)-(+prev.failures||0),duplicate=Math.min(eventCount,Math.max(0,deltaFailures-eventCount));if(!duplicate)continue;
  const old={failures:+row.failures||0,confidence:Number(row.confidence)||0};row.failures=Math.max(0,(+row.failures||0)-duplicate);row.confidence=Math.max(0.05,Math.min(0.99,+((Number(row.confidence)||0)+0.18*duplicate).toFixed(3)));row.lastDedupedBy='94.44';row.lastDedupedAt=new Date().toISOString();all[key]=row;changes.push({recipeId,key,duplicatesRemoved:duplicate,before:old,after:{failures:row.failures,confidence:row.confidence}})
 }
 const saved=changes.length?writeJson(LEARNING_KEY,all):true;if(saved)state.dedupedFailures+=changes.reduce((n,x)=>n+x.duplicatesRemoved,0);const out={runId:sid(runId),changed:saved&&changes.length>0,saved,changes};state.lastDedup=clone(out);return out;
}
async function prepare(reason='auditor-v9444'){
 state.preparations++;if(!authReady()){const out={ok:false,ready:false,reason,error:'Autenticação ainda não está pronta',missing:['auth']};state.lastPreparation=out;return out}
 const base=await ensureBase();if(!base){const out={ok:false,ready:false,reason,error:'Autocorretor v94.43 indisponível',missing:['autocorrect-9443']};state.lastPreparation=out;return out}
 const migration=migrateKnownDoublePenalty();let basePrep=null;try{basePrep=await window.hlgbAuditorAutoCorrect9443.prepare(reason)}catch(e){basePrep={ok:false,ready:false,error:sid(e?.message||e)}}
 const out={...(basePrep||{}),ok:basePrep?.ok!==false,ready:basePrep?.ready!==false,reason,baseAutocorrect:{ready:true,version:BASE_V},learningMigration:clone(migration),at:new Date().toISOString(),authReady:true};state.lastPreparation=clone(out);return out;
}
function upgrade(raw,prep,migration,dedup){
 const x=clone(raw||{});x.version=V;x.runtimeVersion=V;x.dependencyPreparation=clone(prep);x.learningMigration=clone(migration);x.learningFailureAccounting=clone(dedup);
 if(x.report&&typeof x.report==='object'){x.report.version=V;x.report.generatedWithAppVersion=V;x.report.dependencyPreparation=clone(prep);x.report.learningMigration=clone(migration);x.report.learningFailureAccounting=clone(dedup);x.report.learning=clone(learningStore());if(x.report.run){x.report.run.version=V;x.report.run.learningMigration=clone(migration);x.report.run.learningFailureAccounting=clone(dedup)}}
 return x;
}
function failure(prep,detail){return {version:V,runId:'autocorrect-9444-blocked-'+Date.now(),at:new Date().toISOString(),silent:true,nonNavigating:true,passes:0,stopReason:'Execução não iniciada: preparação v94.44 incompleta',fixed:0,corrected:[],stillFailing:[],blocked:[],unverified:[{detail:detail||'Não foi possível preparar o Auditor v94.44.'}],rounds:[],dependencyPreparation:clone(prep||null)}}
const esc=v=>sid(v).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
function render(summary){
 const host=document.getElementById('hlgbAuditorResult');if(!host||!summary)return false;let c=document.getElementById(CARD_ID);if(!c){c=document.createElement('div');c.id=CARD_ID;c.className='panel';host.prepend(c)}
 const mig=summary.learningMigration||summary.dependencyPreparation?.learningMigration||{};
 c.innerHTML='<b>🧠 Auditor Autocorretor v94.44</b><div>'+esc(summary.passes||0)+' rodada(s) · '+esc(summary.stopReason||'')+'</div><div class="sub">Produção aguardável ativa · aprendizado sem dupla penalização'+(mig.changed?' · histórico corrigido':'')+'.</div><div>Corrigido e validado: '+esc(summary.corrected?.length||0)+' · Ainda com falha: '+esc(summary.stillFailing?.length||0)+' · Decisão humana: '+esc(summary.blocked?.length||0)+' · Não verificado: '+esc(summary.unverified?.length||0)+'</div>';return true;
}
async function run(opts={}){
 if(state.running||!authReady())return false;state.running=true;state.runs++;state.lastAt=new Date().toISOString();state.lastError='';stamp();
 try{
  const prep=await prepare(opts.reason||'auditor-run-v9444');if(!prep.ok){const out=failure(prep,prep.error);state.lastSummary=clone(out);if(opts.render!==false)render(out);return out}
  const migration=clone(prep.learningMigration||state.lastMigration||{changed:false}),before=generalSnapshot();
  const raw=await window.hlgbAuditorAutoCorrect9443.run({...opts,render:false,download:false,reason:opts.reason||'v9444'});if(raw===false)throw new Error('Autocorretor v94.43 retornou false');
  const runId=raw?.runId||raw?.report?.run?.runId||'',dedup=dedupeRunFailureAccounting(runId,before),out=upgrade(raw,prep,migration,dedup);state.lastSummary=clone(out);if(opts.render!==false)render(out);if(opts.download===true){try{window.hlgbAuditorAutoCorrect9441?.downloadReport?.(out.report)}catch(e){state.lastError=sid(e?.message||e)}}return out;
 }catch(e){state.lastError=sid(e?.message||e);const out=failure(state.lastPreparation,state.lastError);state.lastSummary=clone(out);if(opts.render!==false)render(out);return out}
 finally{state.running=false}
}
async function activate(reason='post-auth'){if(!authReady())return false;stamp();const p=await prepare(reason);return !!p.ok}
window.addEventListener?.('hlgb:authenticated',()=>setTimeout(()=>activate('authenticated-event'),0));
window.hlgbAuditorAutoCorrect9444={version:V,state,run,prepare,ensureBase,migrateKnownDoublePenalty,dedupeRunFailureAccounting,learning:()=>clone(learningStore()),render,activate,status:()=>({...state,authReady:authReady(),baseReady:baseReady(),preparation:clone(state.lastPreparation)})};
stamp();if(authReady())setTimeout(()=>activate('loaded-after-auth'),0);console.info('[HLGB] v'+V+' Auditor ativo · aprendizado sem dupla penalização');
})();
