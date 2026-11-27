/* HLGB v93.71 — correções de churn visual e classificação de timeout */
(function(){
'use strict';
if(window.HLGB_RUNTIME_PERFORMANCE_9371)return;
window.HLGB_RUNTIME_PERFORMANCE_9371=true;
const V='93.71';
const stopped=[];
function stopIntervalByPreview(match){
 try{
  const p=window.hlgbRuntimeProfiler9292?.snapshot?.();
  for(const row of (p?.active||[])){
   if(!match.test(String(row.callbackPreview||'')))continue;
   const id=Number(row.id);if(!Number.isFinite(id))continue;
   clearInterval(id);stopped.push({id:String(row.id),delayMs:row.delayMs,preview:String(row.callbackPreview||'').slice(0,180)});
  }
 }catch(e){console.warn('[HLGB '+V+'] profiler',e)}
}
// A v92.52 redesenhava relatórios/cortadores ocultos a cada 4s. O conteúdo já possui
// renderizadores próprios e deve atualizar quando a tela é usada, não em loop global.
stopIntervalByPreview(/refreshAll9252/);
function activePage(){return document.querySelector('.page.active')?.id||''}
const refreshStats={scheduled:0,coalesced:0,skipped:0,executed:0};let refreshPending=false;
function refreshVisibleLegacy(){
 try{
  if(document.hidden||window.__HLGB_AUTH_READY===false){refreshStats.skipped++;return false}
  const p=activePage(),api=window.hlgbImprovements9252;
  if(!api)return;
  if(p==='relatorios'&&typeof api.ensureReports9252==='function'){api.ensureReports9252();refreshStats.executed++}
  else if(p==='cortadores'&&typeof api.ensureCutterGroups==='function'){api.ensureCutterGroups();refreshStats.executed++}
  else refreshStats.skipped++;
 }catch(e){console.warn('[HLGB '+V+'] refresh visível',e)}
}
function scheduleVisibleRefresh(){
 if(document.hidden||window.__HLGB_AUTH_READY===false){refreshStats.skipped++;return false}
 if(refreshPending){refreshStats.coalesced++;return false}
 refreshPending=true;refreshStats.scheduled++;setTimeout(()=>{refreshPending=false;refreshVisibleLegacy()},80);return true;
}
document.addEventListener('click',e=>{
 const nav=e.target?.closest?.('[data-page],button,a,[role="button"]');if(!nav)return;
 scheduleVisibleRefresh();
},true);
window.addEventListener('pageshow',scheduleVisibleRefresh);
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')scheduleVisibleRefresh()});

function installClassifier(){
 const smart=window.hlgbAuditorSmart;
 if(!smart||typeof smart.classifyProblem!=='function')return false;
 if(smart.classifyProblem.__hlgb9371)return true;
 const base=smart.classifyProblem;
 const evidenceText=(sync,support)=>{
  const safe=v=>{try{return JSON.stringify(v||{})}catch(e){return ''}};
  const timeline=support?.timeline||support?.forensics?.timeline||support?.hub?.timeline||[];
  const errors=support?.errors||[];
  const runtime=(window.hlgbInternalAuditor?.runtimeErrors||[]).slice(-40);
  const guards=sync?.runtime?.guards||{};
  return [safe(timeline),safe(errors),safe(runtime),safe({
   payrollReliable:guards.payrollReliable?.lastError,
   payrollRace:guards.payrollRace?.lastError,
   replay:guards.replay?.lastError,
   walAuthority:guards.walAuthority?.lastError
  })].join(' ').toLowerCase();
 };
 const wrapped=function(sync,reg,ip,support){
  const out=base.apply(this,arguments)||{observed:[],probableCauses:[]};
  const txt=evidenceText(sync,support);
  const realTimeout=/(hlgb_cloud_timeout|patch[^]{0,160}(timeout|demorou demais)|nuvem demorou demais[^]{0,160}patch|record-save-error[^]{0,220}timeout)/i.test(txt);
  if(!realTimeout){
   out.observed=(out.observed||[]).filter(x=>x?.code!=='patch-confirmation-timeout');
   out.probableCauses=(out.probableCauses||[]).filter(x=>x?.code!=='cloud-save-timeout');
  }
  return out;
 };
 wrapped.__hlgb9371=true;wrapped.__original=base;smart.classifyProblem=wrapped;return true;
}
if(!installClassifier()){
 let tries=0;const wait=()=>{tries++;if(installClassifier()||tries>=80)return;setTimeout(wait,125)};setTimeout(wait,0);
}
window.hlgbRuntimePerformance9371={version:V,stoppedIntervals:stopped,refreshVisibleLegacy,installClassifier,refreshStats:()=>({...refreshStats,pending:refreshPending})};
console.info('[HLGB] runtime performance v'+V+' ativo',stopped);
})();
