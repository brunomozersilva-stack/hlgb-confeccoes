/* HLGB Auditor v93.80 — rastreamento passivo e limitado de cargas/renders do boot. */
(function(){
'use strict';
if(window.HLGB_AUDITOR_CALL_TRACE_9380)return;
const V='93.80',MAX=420,events=[],wrapped=new Map(),startWall=Date.now();let seq=0;
const now=()=>{try{return performance.now()}catch(e){return Date.now()-startWall}};
const wall=()=>new Date().toISOString();
const sid=v=>String(v??'');
function stack(){try{return sid(new Error().stack).split('\n').slice(2,9).join('\n').slice(0,2200)}catch(e){return ''}}
function activePage(){try{return document.querySelector('.page.active')?.id||''}catch(e){return ''}}
function appVisible(){try{const a=document.getElementById('appShell');if(!a)return false;const s=getComputedStyle(a);return s.display!=='none'&&s.visibility!=='hidden'&&s.opacity!=='0'&&a.getClientRects().length>0}catch(e){return false}}
function mark(type,name,data={}){const row={seq:++seq,type,name,monoMs:+now().toFixed(2),wallAt:wall(),authReady:window.__HLGB_AUTH_READY===true,activePage:activePage(),appVisible:appVisible(),data};events.push(row);if(events.length>MAX)events.splice(0,events.length-MAX);try{window.hlgbBootTimeline9379?.mark?.('trace:'+type,{name,...data,traceSeq:row.seq,authReady:row.authReady,activePage:row.activePage,appVisible:row.appVisible})}catch(e){}return row}
const TARGETS={
 hlgbRecordLoadBundle:'load',hlgbLoadNormalizedCore:'load',hlgbEnsureRecordsOnlineAfterLogin:'load',hlgb942FullCloudRefresh:'load',fullSync:'load',hlgb942Boot:'boot',boot9199:'boot',
 renderAll:'render',renderHubFinance:'render',organizeHub:'render',renderProduction:'render',renderProductionList:'render',renderProductionBoard:'render',renderProjection:'render',renderDashboard:'render',syncFinalizedCutsToProduction:'render'
};
function wrapName(name,kind){
 const cur=window[name];if(typeof cur!=='function')return false;
 if(cur.__hlgbCallTrace9380)return true;
 const w=function(){
  const st=stack(),t0=now();mark(kind+':start',name,{stack:st,argsCount:arguments.length});
  let out;
  try{out=cur.apply(this,arguments)}catch(err){mark(kind+':throw',name,{durationMs:+(now()-t0).toFixed(2),error:sid(err?.message||err)});throw err}
  const sync=+(now()-t0).toFixed(2);mark(kind+':return',name,{syncDurationMs:sync,promise:!!out&&typeof out.then==='function'});
  if(out&&typeof out.then==='function'){
   Promise.resolve(out).then(()=>mark(kind+':resolve',name,{totalDurationMs:+(now()-t0).toFixed(2)}),err=>mark(kind+':reject',name,{totalDurationMs:+(now()-t0).toFixed(2),error:sid(err?.message||err)}));
  }
  return out;
 };
 try{Object.defineProperty(w,'name',{value:cur.name||name,configurable:true})}catch(e){}
 w.__hlgbCallTrace9380=true;w.__original=cur;w.__hlgbTraceKind=kind;
 window[name]=w;wrapped.set(name,w);mark('install',name,{kind,originalName:cur.name||''});return true;
}
function install(){for(const [name,kind] of Object.entries(TARGETS))wrapName(name,kind);return wrapped.size}
function snapshot(){return {kind:'hlgb_call_trace',version:V,generatedAt:wall(),eventCount:events.length,wrapped:[...wrapped.keys()],events:events.slice(),coverage:{startedWall:startWall,authReady:window.__HLGB_AUTH_READY===true}}}
window.HLGB_AUDITOR_CALL_TRACE_9380=V;
window.hlgbAuditorCallTrace9380={version:V,install,snapshot,events,targets:TARGETS};
install();[25,75,150,300,600,1000,1800,3000,5000].forEach(ms=>setTimeout(install,ms));
mark('trace-ready','release-auditor-call-trace-v9380.js',{targets:Object.keys(TARGETS).length});
try{if(!window.HLGB_AUDITOR_BOOT_ANALYSIS_9381&&!document.querySelector('script[data-hlgb-diag="release-auditor-boot-analysis-v9381.js"]')){const s=document.createElement('script');s.src='./release-auditor-boot-analysis-v9381.js?fresh='+Date.now();s.async=false;s.dataset.hlgbDiag='release-auditor-boot-analysis-v9381.js';(document.head||document.documentElement).appendChild(s)}}catch(e){console.warn('[HLGB diag] boot analysis',e)}
console.info('[HLGB] rastreamento passivo de cargas/renders v'+V+' ativo');
})();
