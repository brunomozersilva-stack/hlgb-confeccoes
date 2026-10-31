/* HLGB v94.38 — classificação confiável de multiplicidade de scripts.
   Separa segunda requisição de rede de segunda instalação/execução observável.
   Somente diagnóstico: não altera dados de negócio, sincronização ou loaders. */
(function(){
'use strict';
const V='94.38',BASELINE_KEY='hlgb_auditor_intelligence_baseline_v9396';
if(window.HLGB_AUDITOR_SCRIPT_MULTIPLICITY_9438===V){try{window.hlgbAuditorScriptMultiplicity9438?.activate?.()}catch(e){}return}
window.HLGB_AUDITOR_SCRIPT_MULTIPLICITY_9438=V;
const state={version:V,installed:false,intelligencePatched:false,authorityPatched:false,snapshots:0,baselineCorrections:0,lastAt:'',lastError:''};
const sid=v=>String(v??'');
const clone=v=>{try{return structuredClone(v)}catch(e){try{return JSON.parse(JSON.stringify(v))}catch(_){return v}}};
function fileName(src){try{return decodeURIComponent(new URL(src,location.href).pathname.split('/').pop()||'')}catch(e){return sid(src).split(/[/?#]/).pop()||''}}
function auditProbe(src){try{return new URL(src,location.href).searchParams.has('hlgb_audit_fresh')}catch(e){return /(?:[?&])hlgb_audit_fresh=/.test(sid(src))}}
function snapshot(){
 const dom=new Map(),resources=new Map(),rows=[];
 try{document.querySelectorAll('script[src]').forEach((s,index)=>{const file=fileName(s.src);if(!file)return;const x=dom.get(file)||{count:0,src:[],indexes:[]};x.count++;x.src.push(s.src);x.indexes.push(index);dom.set(file,x)})}catch(e){}
 try{performance.getEntriesByType('resource').forEach((r,index)=>{if(auditProbe(r.name))return;const file=fileName(r.name);if(!/\.js$/i.test(file))return;const x=resources.get(file)||{count:0,src:[],indexes:[],durationMs:0};x.count++;x.src.push(r.name);x.indexes.push(index);x.durationMs+=Number(r.duration||0);resources.set(file,x)})}catch(e){}
 const all=new Set([...dom.keys(),...resources.keys()]);
 for(const file of all){const d=dom.get(file)||{count:0,src:[],indexes:[]},r=resources.get(file)||{count:0,src:[],indexes:[],durationMs:0},executionDuplicate=d.count>1,repeatedRequest=r.count>1&&!executionDuplicate;rows.push({file,dom:d.count,resource:r.count,executionDuplicate,repeatedRequest,networkExtra:Math.max(0,r.count-1),resourceDurationMs:+r.durationMs.toFixed(2),evidence:executionDuplicate?'multiple-script-elements':repeatedRequest?'network-request-repeat-only':'single-load'})}
 rows.sort((a,b)=>(b.executionDuplicate-a.executionDuplicate)||(b.repeatedRequest-a.repeatedRequest)||(b.dom+b.resource)-(a.dom+a.resource)||a.file.localeCompare(b.file));
 const out={version:V,at:new Date().toISOString(),executionDuplicates:rows.filter(x=>x.executionDuplicate),repeatedRequests:rows.filter(x=>x.repeatedRequest),rows};state.snapshots++;state.lastAt=out.at;return out;
}
function correctBaseline(report){
 try{
  if(report?.freshness?.status==='stale'||!report?.current?.at||!report?.current?.metrics)return false;
  const base=JSON.parse(localStorage.getItem(BASELINE_KEY)||'null');if(!base||sid(base.at)!==sid(report.current.at))return false;
  base.appVersion=report.current.appVersion||base.appVersion;base.metrics=clone(report.current.metrics);localStorage.setItem(BASELINE_KEY,JSON.stringify(base));state.baselineCorrections++;return true;
 }catch(e){state.lastError=sid(e?.message||e);return false}
}
function cleanDuplicateRecommendation(report,m){
 if(!report||typeof report!=='object')return report;
 report.current=report.current||{};report.current.scriptMultiplicity=m;report.current.duplicateScripts=m.executionDuplicates;report.current.repeatedScriptRequests=m.repeatedRequests;
 report.current.metrics=report.current.metrics||{};report.current.metrics.scriptDuplicates=m.executionDuplicates.length;report.current.metrics.scriptRepeatedRequests=m.repeatedRequests.length;
 if(Array.isArray(report.recommendations)){
  report.recommendations=report.recommendations.filter(x=>sid(x?.code)!=='duplicate-script-load'&&sid(x?.code)!=='repeated-script-request');
  if(m.executionDuplicates.length)report.recommendations.push({priority:'high',code:'duplicate-script-load',detail:m.executionDuplicates.length+' script(s) possuem mais de um elemento <script> ativo nesta sessão; há evidência de multiplicidade de execução/instalação.'});
  if(m.repeatedRequests.length)report.recommendations.push({priority:'low',code:'repeated-script-request',detail:m.repeatedRequests.length+' script(s) tiveram requisição de rede repetida sem prova de segunda instalação. Tratar como custo/performance, não como duplicação funcional.'});
 }
 correctBaseline(report);return report;
}
function patchIntelligence(){
 const api=window.hlgbAuditorIntelligence9396;if(!api)return false;
 if(typeof api.currentMetrics==='function'&&!api.currentMetrics.__hlgbMultiplicity9438){const original=api.currentMetrics;const wrapped=function(){const cur=original.apply(this,arguments)||{},m=snapshot();cur.scriptMultiplicity=m;cur.duplicateScripts=m.executionDuplicates;cur.repeatedScriptRequests=m.repeatedRequests;cur.metrics=cur.metrics||{};cur.metrics.scriptDuplicates=m.executionDuplicates.length;cur.metrics.scriptRepeatedRequests=m.repeatedRequests.length;return cur};wrapped.__hlgbMultiplicity9438=true;wrapped.__original=original;api.currentMetrics=wrapped}
 if(typeof api.collect==='function'&&!api.collect.__hlgbMultiplicity9438){const original=api.collect;const wrapped=async function(){const report=await original.apply(this,arguments);return cleanDuplicateRecommendation(report,snapshot())};wrapped.__hlgbMultiplicity9438=true;wrapped.__original=original;api.collect=wrapped}
 state.intelligencePatched=!!api.currentMetrics?.__hlgbMultiplicity9438&&!!api.collect?.__hlgbMultiplicity9438;return state.intelligencePatched;
}
function patchAuthority(){
 const api=window.hlgbAuditorAuthority9374;if(!api||typeof api.scan!=='function')return false;if(api.scan.__hlgbMultiplicity9438){state.authorityPatched=true;return true}
 const original=api.scan;const wrapped=function(){const out=original.apply(this,arguments);if(!out||typeof out!=='object')return out;const m=snapshot();out.scriptMultiplicity=m;out.scriptInventory=out.scriptInventory||{};out.scriptInventory.executionDuplicates=m.executionDuplicates;out.scriptInventory.repeatedRequests=m.repeatedRequests;out.scriptInventory.duplicates=m.executionDuplicates;return out};wrapped.__hlgbMultiplicity9438=true;wrapped.__original=original;api.scan=wrapped;state.authorityPatched=true;return true;
}
function install(){if(window.__HLGB_AUTH_READY!==true)return false;try{patchIntelligence();patchAuthority();state.installed=state.intelligencePatched||state.authorityPatched;return state.installed}catch(e){state.lastError=sid(e?.message||e);return false}}
function activate(){if(window.__HLGB_AUTH_READY!==true)return false;[0,80,250,700,1500,3000].forEach(ms=>setTimeout(install,ms));return true}
window.hlgbAuditorScriptMultiplicity9438={version:V,state,snapshot,install,activate,status:()=>({...state,current:snapshot()})};
window.addEventListener('hlgb:authenticated',activate);
if(window.__HLGB_AUTH_READY===true)activate();
console.info('[HLGB] v'+V+' multiplicidade de scripts: execução duplicada separada de requisição repetida');
})();
