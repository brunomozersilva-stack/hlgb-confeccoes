/* HLGB v94.39 — finalizador de relatórios do Auditor.
   Não altera dados de negócio. Garante versão real no arquivo baixado, rejeita
   baseline da mesma rodada e exclui referências futuras do aprendizado. */
(function(){
'use strict';
const V='94.39',MIN_GAP_MS=30000,FUTURE_TOLERANCE_MS=5*60*1000;
const DAILY_LATEST='hlgb_auditor_daily_report_latest_v9429',DAILY_PREFIX='hlgb_auditor_daily_report_v9429_',ROUNDS='hlgb_auditor_reliable_rounds_v9438',HISTORY='hlgb_auditor_learning_history_v9429',HEALTHY='hlgb_auditor_healthy_baseline_v9438';
if(window.HLGB_AUDITOR_FINALIZE_9439===V){try{window.hlgbAuditorFinalize9439?.activate?.()}catch(e){}return}
window.HLGB_AUDITOR_FINALIZE_9439=V;
const state={version:V,installed:false,runs:0,dailyFinalized:0,rejectedBaselines:0,rejectedFutureAudits:0,historyPruned:0,lastAt:'',lastError:''};
const sid=v=>String(v??'');
const clone=v=>{try{return structuredClone(v)}catch(e){try{return JSON.parse(JSON.stringify(v))}catch(_){return v}}};
function read(k,f=null){try{const x=JSON.parse(localStorage.getItem(k)||'null');return x??f}catch(e){return f}}
function write(k,v){try{localStorage.setItem(k,JSON.stringify(v));return true}catch(e){return false}}
function ts(v){if(v==null||v==='')return NaN;if(typeof v==='number')return v;const n=Date.parse(String(v));return Number.isFinite(n)?n:NaN}
function appVersion(){const n=parseFloat(String(window.HLGB_RELEASE_VERSION||'0'))||0;return (n>=94.39?String(window.HLGB_RELEASE_VERSION):V).replace(/^v/i,'')}
function future(v){const n=ts(v);return Number.isFinite(n)&&n>Date.now()+FUTURE_TOLERANCE_MS}
function localDay(d=new Date()){const p=n=>String(n).padStart(2,'0');return d.getFullYear()+'-'+p(d.getMonth()+1)+'-'+p(d.getDate())}
function rejectRegression(obj,rootAt){
 if(!obj||typeof obj!=='object')return;
 const r=obj.regression;if(r&&typeof r==='object'&&r.baseline){const b=r.baseline,ba=ts(b.at),ca=ts(obj?.metrics?.at||obj?.current?.at||obj?.createdAt||obj?.at||rootAt),gap=Number.isFinite(ba)&&Number.isFinite(ca)?Math.abs(ca-ba):NaN;let reason='';if(future(b.at))reason='baseline-future';else if(Number.isFinite(gap)&&gap<MIN_GAP_MS)reason='baseline-same-round';if(reason){r.rejectedBaseline={...clone(b),rejectionReason:reason,rejectedAt:new Date().toISOString(),gapMs:Number.isFinite(gap)?gap:null};r.baseline=null;r.rejected=true;r.available=false;r.reason=reason;r.findings=[];state.rejectedBaselines++}}
 const cmp=obj?.intelligence?.comparison;if(cmp&&typeof cmp==='object'){const pa=cmp.previousAt||cmp?.previous?.at,ca=cmp.currentAt||cmp?.current?.at||rootAt,pt=ts(pa),ct=ts(ca),gap=Number.isFinite(pt)&&Number.isFinite(ct)?Math.abs(ct-pt):NaN;if(future(pa)||(Number.isFinite(gap)&&gap<MIN_GAP_MS)){obj.intelligence.comparison={...cmp,available:false,rejected:true,reason:future(pa)?'previous-future':'baseline-same-round',gapMs:Number.isFinite(gap)?gap:null,minGapMs:MIN_GAP_MS}}}
}
function sanitizeTree(root){
 if(!root||typeof root!=='object')return root;const rootAt=root.createdAt||root.at||root.roundCompletedAt||new Date().toISOString(),seen=new Set();
 function walk(obj){if(!obj||typeof obj!=='object'||seen.has(obj))return;seen.add(obj);rejectRegression(obj,rootAt);for(const k of Object.keys(obj)){const v=obj[k];if(k==='latestAudit'&&v&&typeof v==='object'&&(future(v.startedAt)||future(v.completedAt)||future(v.at))){obj.latestAuditRejected={...clone(v),rejectionReason:'future-dated-audit',rejectedAt:new Date().toISOString()};obj.latestAudit=null;state.rejectedFutureAudits++;continue}if(v&&typeof v==='object')walk(v)}}walk(root);return root;
}
function finalizeDaily(report){if(!report||typeof report!=='object')return report;report.appVersion=appVersion();report.version=V;report.reportFinalizerVersion=V;report.generatedWithAppVersion=appVersion();sanitizeTree(report);state.dailyFinalized++;state.lastAt=new Date().toISOString();return report}
function finalizeAny(out){if(!out||typeof out!=='object')return out;sanitizeTree(out);if(out.daily)out.daily=finalizeDaily(out.daily);if(out.appVersion)out.appVersion=appVersion();return out}
function pruneFutureHistory(){let total=0;for(const key of [ROUNDS,HISTORY]){let a=read(key,[]);if(!Array.isArray(a))continue;const before=a.length;a=a.filter(x=>!future(x?.at)&&!future(x?.createdAt)&&!future(x?.startedAt));if(a.length!==before){write(key,a);total+=before-a.length}}
 const h=read(HEALTHY,null);if(h&&future(h.at)){localStorage.removeItem(HEALTHY);total++}state.historyPruned+=total;return total}
function patchStored(){pruneFutureHistory();const r=read(DAILY_LATEST,null);if(!r)return null;const fixed=finalizeDaily(r);write(DAILY_LATEST,fixed);write(DAILY_PREFIX+(fixed.date||localDay()),fixed);return fixed}
function install(){
 const api=window.hlgbAuditorSingleAction9429;if(!api||typeof api.run!=='function')return false;
 if(!api.run.__hlgbFinalize9439){const orig=api.run;const w=async function(){const out=finalizeAny(await orig.apply(this,arguments));state.runs++;try{window.HLGB_AUDITOR_SINGLE_ACTION_LAST=out}catch(e){}return out};w.__hlgbFinalize9439=true;w.__original=orig;api.run=w}
 if(typeof api.buildDailyReport==='function'&&!api.buildDailyReport.__hlgbFinalize9439){const orig=api.buildDailyReport;const w=function(){return finalizeDaily(orig.apply(this,arguments))};w.__hlgbFinalize9439=true;w.__original=orig;api.buildDailyReport=w}
 if(typeof api.downloadDaily==='function'&&!api.downloadDaily.__hlgbFinalize9439){const orig=api.downloadDaily;const w=function(report){const fixed=finalizeDaily(clone(report||read(DAILY_LATEST,null)));if(fixed){write(DAILY_LATEST,fixed);write(DAILY_PREFIX+(fixed.date||localDay()),fixed)}return orig.call(this,fixed)};w.__hlgbFinalize9439=true;w.__original=orig;api.downloadDaily=w}
 state.installed=true;patchStored();return true;
}
function stamp(){try{const cur=parseFloat(String(window.HLGB_RELEASE_VERSION||'0'))||0;if(cur<94.39){window.HLGB_RELEASE_VERSION=V;const el=document.querySelector('#appShell .logo small');if(el)el.textContent='v'+V}}catch(e){}}
function activate(){stamp();pruneFutureHistory();[0,120,450,1000,2200,4200].forEach(ms=>setTimeout(()=>{try{install()}catch(e){state.lastError=sid(e?.message||e)}},ms));return true}
window.hlgbAuditorFinalize9439={version:V,state,activate,install,finalizeDaily,finalizeAny,patchStored,pruneFutureHistory,status:()=>({...state,appVersion:appVersion()})};
window.addEventListener('hlgb:authenticated',activate);
window.addEventListener('focus',()=>{if(window.__HLGB_AUTH_READY===true){try{install();patchStored()}catch(e){}}});
document.addEventListener('click',e=>{if(e.target?.closest?.('#hlgbAuditorUnifiedRun9434A,#hlgbAuditorNavBtn,#hlgbAuditorOpenBtn,#hlgbDaily18Download9437,#hlgbDaily18CardDownload9437'))[0,300,1000].forEach(ms=>setTimeout(()=>{try{install();patchStored()}catch(_){}},ms))},true);
if(window.__HLGB_AUTH_READY===true)activate();
console.info('[HLGB] v'+V+' finalizador de relatórios do Auditor ativo');
})();
