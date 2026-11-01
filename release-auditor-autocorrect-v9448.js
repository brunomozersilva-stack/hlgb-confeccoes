/* HLGB v94.48 — Auditor com prova residual de Produção.
   Antes de chamar um registro de "precisa de código", relê o servidor, limpa cópias
   técnicas já satisfeitas e só então separa prova incompleta de diferença de negócio. */
(function(){
'use strict';
const V='94.48',BASE_V='94.47',BASE_SRC='./release-auditor-autocorrect-v9447.js',RESIDUAL_SRC='./release-production-residual-v9448.js';
const REPORT_KEY='hlgb_auditor_autocorrect_latest_report_v9448',CARD_ID='hlgbAuditorAutoCorrect9448Card';
if(window.HLGB_AUDITOR_AUTOCORRECT_9448===V)return;
window.HLGB_AUDITOR_AUTOCORRECT_9448=V;
const state={version:V,running:false,runs:0,preflightReconciles:0,lastAt:'',lastError:'',lastSummary:null,lastReport:null,lastResidual:null};
const sid=v=>String(v??'');
const clone=v=>{try{return structuredClone(v)}catch(e){try{return JSON.parse(JSON.stringify(v))}catch(_){return v}}};
const nowIso=()=>new Date().toISOString();
function authReady(){return window.__HLGB_AUTH_READY===true}
function stamp(){try{if((parseFloat(sid(window.HLGB_RELEASE_VERSION))||0)<94.48)window.HLGB_RELEASE_VERSION=V;const el=document.querySelector?.('#appShell .logo small');if(el&&(parseFloat(sid(el.textContent).replace(/^v/i,''))||0)<94.48)el.textContent='v'+V}catch(e){}}
function baseReady(){return window.HLGB_AUDITOR_AUTOCORRECT_9447===BASE_V&&typeof window.hlgbAuditorAutoCorrect9447?.run==='function'}
function residualReady(){return window.HLGB_PRODUCTION_RESIDUAL_9448===V&&typeof window.hlgbProductionResidual9448?.reconcileAndInspect==='function'}
function loadScript(src,attr,readyFn){if(readyFn())return Promise.resolve(true);let s=document.querySelector('script['+attr+']');if(s?.__hlgbPromise)return s.__hlgbPromise;if(!s){s=document.createElement('script');s.src=src+'?fresh='+Date.now();s.async=false;s.setAttribute(attr.split('=')[0].replace(/[\[\]]/g,''),'1');(document.head||document.documentElement).appendChild(s)}const p=new Promise(resolve=>{if(readyFn())return resolve(true);let done=false;const finish=()=>{if(done)return;done=true;resolve(readyFn())};s.addEventListener('load',finish,{once:true});s.addEventListener('error',()=>{try{s.remove()}catch(_){}finish()},{once:true});setTimeout(finish,12000)});s.__hlgbPromise=p;return p}
async function ensureBase(){return baseReady()?true:loadScript(BASE_SRC,'data-hlgb-auditor-autocorrect-9447-for-9448',baseReady)}
async function ensureResidual(){return residualReady()?true:loadScript(RESIDUAL_SRC,'data-hlgb-production-residual-9448',residualReady)}
async function prepare(reason='auditor-v9448'){
 if(!authReady())return {ok:false,ready:false,reason,error:'Autenticação ainda não está pronta',missing:['auth']};
 if(!(await ensureBase()))return {ok:false,ready:false,reason,error:'Autocorretor v94.47 indisponível',missing:['autocorrect-9447']};
 const bp=await window.hlgbAuditorAutoCorrect9447.prepare(reason+'-base');if(bp?.ok===false)return {ok:false,ready:false,reason,error:bp.error||'Preparação v94.47 falhou',missing:bp.missing||['base-prepare'],basePreparation:clone(bp)};
 if(!(await ensureResidual()))return {ok:false,ready:false,reason,error:'Diagnóstico residual v94.48 indisponível',missing:['production-residual-9448'],basePreparation:clone(bp)};
 return {ok:true,ready:true,reason,baseVersion:BASE_V,basePreparation:clone(bp),productionResidual:{ready:true,version:V},at:nowIso()};
}
function reasonFor(item){if(!item)return '';if(item.classification==='business-blocked')return 'business-difference';if(item.safeCopies>0)return 'Prova remota incompleta: cópia técnica satisfeita permaneceu após reconciliação';if(item.classification==='needs-code')return item.detail||'Prova remota incompleta';if(item.classification==='mixed-residual')return 'Prova remota incompleta: resíduo misto permaneceu após reconciliação';return item.detail||''}
async function withResidualCandidateReasons(diag,fn){const prod=window.hlgbProductionReconcile9439,orig=prod?.candidates;if(typeof orig!=='function')return fn();const map=new Map((diag?.after?.items||[]).map(x=>[sid(x.id),x]));prod.candidates=async function(){const rows=await orig.apply(this,arguments);return (Array.isArray(rows)?rows:[]).map(c=>{const item=map.get(sid(c?.id));return item?{...c,reason:reasonFor(item),residual9448:clone(item)}:c})};try{return await fn()}finally{prod.candidates=orig}}
function upgradeReport(raw,out,diag,prep){const src=clone(raw||{})||{};const report={...src,kind:'hlgb_autocorrect_report',version:V,appVersion:V,generatedAt:nowIso(),run:clone(out),productionResidual:clone(diag),dependencyPreparation:clone(prep)};try{localStorage.setItem(REPORT_KEY,JSON.stringify(report))}catch(e){}state.lastReport=clone(report);return report}
function downloadReport(report){try{const data=report||state.lastReport;if(!data)return false;const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='hlgb-auditor-autocorretor-'+sid(data?.run?.runId||Date.now()).replace(/[^a-z0-9_-]/gi,'_')+'.json';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1200);return true}catch(e){state.lastError=sid(e?.message||e);return false}}
const esc=v=>sid(v).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
function render(summary){const host=document.getElementById('hlgbAuditorResult');if(!host||!summary)return false;let c=document.getElementById(CARD_ID);if(!c){c=document.createElement('div');c.id=CARD_ID;c.className='panel';host.prepend(c)}const d=summary.productionResidual||{},after=d.after||{},cleared=+d.technicalCopiesCleared||0;c.innerHTML='<b>⚡ Auditor v94.48 · prova residual</b><div>'+esc(summary.passes||0)+' rodada(s) · '+esc(summary.stopReason||'')+'</div><div class="sub">Cópias técnicas limpas: '+esc(cleared)+' · Precisa de código: '+esc(summary.needsCode?.length||0)+' · Decisão humana: '+esc(summary.businessBlocked?.length||0)+' · Resíduos atuais: '+esc(after.candidateCount||0)+'</div>';return true}
async function run(opts={}){
 if(state.running||!authReady())return false;state.running=true;state.runs++;state.lastAt=nowIso();state.lastError='';stamp();
 try{
  const prep=await prepare(opts.reason||'auditor-run-v9448');if(!prep.ok)throw new Error(prep.error||'Preparação v94.48 incompleta');
  const diag=await window.hlgbProductionResidual9448.reconcileAndInspect(opts.reason||'manual-button');state.lastResidual=clone(diag);if(diag?.before?.safeCopies>0)state.preflightReconciles++;
  const raw=await withResidualCandidateReasons(diag,()=>window.hlgbAuditorAutoCorrect9447.run({...opts,render:false,download:false,reason:(opts.reason||'v9448')+'-residual-proof'}));if(raw===false)throw new Error('Autocorretor v94.47 retornou false');
  const baseReport=clone(raw?.report||window.hlgbAuditorAutoCorrect9447.exportReport?.()||{});const out=clone(raw||{});delete out.report;out.version=V;out.runtimeVersion=V;out.productionResidual=clone(diag);out.dependencyPreparation=clone(prep);out.residualProof=true;
  if((+diag?.technicalCopiesCleared||0)>0&&!(out.needsCode||[]).length){out.stopReason='Convergência rápida: '+diag.technicalCopiesCleared+' cópia(s) técnica(s) antiga(s) reconciliada(s); restam apenas decisões de negócio/histórico.'}
  const report=upgradeReport(baseReport,out,diag,prep);out.report=report;state.lastSummary=clone(out);if(opts.render!==false)render(out);if(opts.download===true)downloadReport(report);return out;
 }catch(e){state.lastError=sid(e?.message||e);const out={version:V,runtimeVersion:V,runId:'autocorrect-9448-blocked-'+Date.now(),at:nowIso(),silent:true,nonNavigating:true,passes:0,repairSkipped:true,residualProof:true,stopReason:'Execução interrompida',fixed:0,corrected:[],stillFailing:[],blocked:[],unverified:[{detail:state.lastError}],rounds:[]};state.lastSummary=clone(out);if(opts.render!==false)render(out);return out}
 finally{state.running=false}
}
async function activate(reason='post-auth'){if(!authReady())return false;stamp();const p=await prepare(reason);return !!p.ok}
window.addEventListener?.('hlgb:authenticated',()=>setTimeout(()=>activate('authenticated-event'),0));
window.hlgbAuditorAutoCorrect9448={version:V,state,run,prepare,ensureBase,ensureResidual,render,downloadReport,exportReport:()=>clone(state.lastReport),status:()=>({...state,authReady:authReady(),baseReady:baseReady(),residualReady:residualReady()})};
stamp();if(authReady())setTimeout(()=>activate('loaded-after-auth'),0);console.info('[HLGB] v'+V+' Auditor pronto · prova residual de Produção antes da classificação');
})();