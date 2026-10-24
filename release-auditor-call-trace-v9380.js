/* HLGB Auditor v93.80 — rastreamento passivo e limitado de cargas/renders do boot. */
(function(){
'use strict';
if(window.HLGB_AUDITOR_CALL_TRACE_9380)return;
const V='93.80',BUILD='2026.10.23-trace-v4',MAX=420,events=[],wrapped=new Map(),startWall=Date.now();let seq=0;
const now=()=>{try{return performance.now()}catch(e){return Date.now()-startWall}};
const wall=()=>new Date().toISOString();
const sid=v=>String(v??'');
function stack(){try{return sid(new Error().stack).split('\n').slice(2,9).join('\n').slice(0,2200)}catch(e){return ''}}
function activePage(){try{return document.querySelector('.page.active')?.id||''}catch(e){return ''}}
function appVisible(){try{const a=document.getElementById('appShell');if(!a)return false;const s=getComputedStyle(a);return s.display!=='none'&&s.visibility!=='hidden'&&s.opacity!=='0'&&a.getClientRects().length>0}catch(e){return false}}
function sessionRestoring(){
 try{
  const boot=typeof cloudBootstrapping!=='undefined'?cloudBootstrapping:window.cloudBootstrapping;
  const token=typeof cloudAccessToken!=='undefined'?cloudAccessToken:window.cloudAccessToken;
  const user=typeof cloudUser!=='undefined'?cloudUser:window.cloudUser;
  return window.__HLGB_AUTH_READY!==true&&boot===true&&!!token&&!!(user&&(user.id||user.email));
 }catch(e){return false}
}
function mark(type,name,data={}){const row={seq:++seq,type,name,monoMs:+now().toFixed(2),wallAt:wall(),authReady:window.__HLGB_AUTH_READY===true,sessionRestoring:sessionRestoring(),activePage:activePage(),appVisible:appVisible(),data};events.push(row);if(events.length>MAX)events.splice(0,events.length-MAX);try{window.hlgbBootTimeline9379?.mark?.('trace:'+type,{name,...data,traceSeq:row.seq,authReady:row.authReady,sessionRestoring:row.sessionRestoring,activePage:row.activePage,appVisible:row.appVisible})}catch(e){}return row}
const TARGETS={
 hlgbRecordLoadBundle:'load',hlgbLoadNormalizedCore:'load',hlgbEnsureRecordsOnlineAfterLogin:'load',hlgb942FullCloudRefresh:'load',fullSync:'load',hlgb942Boot:'boot',boot9199:'boot',
 renderAll:'render',renderHubFinance:'render',organizeHub:'render',renderProduction:'render',renderProductionList:'render',renderProductionBoard:'render',renderProjection:'render',renderDashboard:'render',syncFinalizedCutsToProduction:'render'
};
function chainHasMarker(fn,marker){
 const seen=new Set(),pointers=['__original','__hlgb9307Original','__hlgb9320Original','__hlgb955Original','__hlgbReliableOriginal'];
 let cur=fn,depth=0;
 while(typeof cur==='function'&&!seen.has(cur)&&depth++<48){
  if(cur[marker])return true;
  seen.add(cur);
  let next=null;
  for(const key of pointers){try{if(typeof cur[key]==='function'){next=cur[key];break}}catch(e){}}
  cur=next;
 }
 return false;
}
function wrapName(name,kind){
 const cur=window[name];if(typeof cur!=='function')return false;
 if(chainHasMarker(cur,'__hlgbCallTrace9380')){wrapped.set(name,cur);return true;}
 const w=function(){
  const st=stack(),t0=now();
  const blockedByEarlyGate=window.__HLGB_AUTH_READY!==true&&name==='syncFinalizedCutsToProduction'&&chainHasMarker(cur,'__hlgb9306EarlyBoot');
  mark(kind+':start',name,{stack:st,argsCount:arguments.length,blockedByEarlyGate});
  let out;
  try{out=cur.apply(this,arguments)}catch(err){mark(kind+':throw',name,{durationMs:+(now()-t0).toFixed(2),error:sid(err?.message||err),blockedByEarlyGate});throw err}
  const sync=+(now()-t0).toFixed(2);mark(kind+':return',name,{syncDurationMs:sync,promise:!!out&&typeof out.then==='function',blockedByEarlyGate});
  if(out&&typeof out.then==='function'){
   Promise.resolve(out).then(()=>mark(kind+':resolve',name,{totalDurationMs:+(now()-t0).toFixed(2),blockedByEarlyGate}),err=>mark(kind+':reject',name,{totalDurationMs:+(now()-t0).toFixed(2),error:sid(err?.message||err),blockedByEarlyGate}));
  }
  return out;
 };
 try{Object.defineProperty(w,'name',{value:cur.name||name,configurable:true})}catch(e){}
 w.__hlgbCallTrace9380=true;w.__original=cur;w.__hlgbTraceKind=kind;
 window[name]=w;wrapped.set(name,w);mark('install',name,{kind,originalName:cur.name||''});return true;
}
function install(){for(const [name,kind] of Object.entries(TARGETS))wrapName(name,kind);return wrapped.size}
function snapshot(){return {kind:'hlgb_call_trace',version:V,build:BUILD,generatedAt:wall(),eventCount:events.length,wrapped:[...wrapped.keys()],events:events.slice(),coverage:{startedWall:startWall,authReady:window.__HLGB_AUTH_READY===true}}}
function loadScriptOnce(src,key,dataKey,onload){
 try{
  if(key&&window[key]){onload?.();return false}
  if(dataKey&&document.querySelector('script[data-'+dataKey+']'))return false;
  const s=document.createElement('script');s.src=src+'?fresh='+Date.now();s.async=false;if(dataKey)s.setAttribute('data-'+dataKey,'1');if(onload)s.onload=onload;s.onerror=()=>console.warn('[HLGB diag] não carregou '+src);(document.head||document.documentElement).appendChild(s);return true;
 }catch(e){console.warn('[HLGB diag] load '+src,e);return false}
}
function loadIntelligence(){
 const loadBrain=()=>loadScriptOnce('./release-auditor-intelligence-v9396.js','HLGB_AUDITOR_INTELLIGENCE_9396','hlgb-auditor-intelligence-9396');
 if(window.HLGB_RUNTIME_BUILD_ID)loadBrain();else loadScriptOnce('./release-auditor-build-marker-v9396.js','HLGB_RUNTIME_BUILD_ID','hlgb-build-marker-9396',loadBrain);
}
window.HLGB_AUDITOR_CALL_TRACE_9380=V;
window.HLGB_AUDITOR_CALL_TRACE_BUILD=BUILD;
window.hlgbAuditorCallTrace9380={version:V,build:BUILD,install,snapshot,events,targets:TARGETS};
install();[25,75,150,300,600,1000,1800,3000,5000].forEach(ms=>setTimeout(install,ms));
mark('trace-ready','release-auditor-call-trace-v9380.js',{targets:Object.keys(TARGETS).length,build:BUILD});
/* v93.96: Boot Analysis já é carregado pela lista oficial do app-stable3.
   Não o carregamos novamente aqui; isso eliminava uma medição duplicada do próprio Auditor. */
loadIntelligence();
console.info('[HLGB] rastreamento passivo de cargas/renders v'+V+' ativo · build '+BUILD);
})();