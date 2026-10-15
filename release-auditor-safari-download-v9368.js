/* HLGB Auditor v93.68 — captura e entrega Safari em autoridade única, sem timer/reinstalação */
(function(){
'use strict';
if(window.HLGB_AUDITOR_SAFARI_DOWNLOAD_9368)return;
window.HLGB_AUDITOR_SAFARI_DOWNLOAD_9368=true;
const HISTORY='hlgb_auditor_smart_history_v9360';
let lastData=null,lastUrl='',lastName='';
function safeData(data){try{return window.hlgbInternalAuditor?.redactDiagnostic?window.hlgbInternalAuditor.redactDiagnostic(data):data}catch(e){return data}}
function clearUrl(){if(lastUrl){try{URL.revokeObjectURL(lastUrl)}catch(e){}lastUrl=''}}
function prepare(data){
 lastData=safeData(data);clearUrl();
 const text=JSON.stringify(lastData,null,2),blob=new Blob([text],{type:'application/json;charset=utf-8'});
 lastUrl=URL.createObjectURL(blob);
 lastName='HLGB-PROBLEMA-'+new Date().toISOString().replace(/[:.]/g,'-')+'.json';
 return {url:lastUrl,name:lastName};
}
function renderReady(){
 const out=document.getElementById('hlgbAuditorResult');if(!out||!lastData)return false;
 const file=prepare(lastData);
 out.innerHTML='<div class="panel"><b>✅ Problema registrado.</b><div class="sub">O diagnóstico está pronto. Clique abaixo para salvar o arquivo.</div><div style="margin-top:10px"><a id="hlgbSafariDownload9368" class="primary" role="button" download="'+file.name+'" href="'+file.url+'">⬇️ Baixar diagnóstico</a></div></div>';
 return true;
}
function runtimeSnapshot(){
 const out={};
 const sources={payrollRace:window.hlgbPayrollWalRace9346,payrollReliable:window.hlgbPayrollReliableSaveGuard9344,walAuthority:window.hlgbWalSingleAuthority9339,replay:window.hlgbConfirmedReplay9333,syncGuard:window.hlgbSyncGuard9306};
 for(const [k,v] of Object.entries(sources)){try{out[k]=typeof v?.status==='function'?v.status():{version:v?.version||v?.VERSION||''}}catch(e){out[k]={error:String(e?.message||e)}}}
 return out;
}
function pageName(){return document.querySelector('.page.active')?.id||''}
function saveHistory(row){
 try{const a=JSON.parse(localStorage.getItem(HISTORY)||'[]');const list=Array.isArray(a)?a:[];list.unshift(row);localStorage.setItem(HISTORY,JSON.stringify(list.slice(0,60)))}catch(e){}
}
async function collectSupport(){try{return typeof window.hlgbAuditorBlackbox9299?.collect==='function'?await window.hlgbAuditorBlackbox9299.collect():null}catch(e){return {error:String(e?.message||e)}}}
async function buildProblem(){
 const smart=window.hlgbAuditorSmart;if(!smart)throw new Error('Auditor inteligente ainda não está pronto.');
 smart.push?.('problem-capture',{delivery:'manual-download'});
 let sync=null;try{sync=await window.hlgbInternalAuditor?.buildSyncDiagnostic?.()}catch(e){sync={error:String(e?.message||e)}}
 const metrics=smart.currentMetrics?.()||{},reg=smart.regression?.(metrics)||{findings:[]},ip=smart.intervalProfile?.()||{},support=await collectSupport();
 const analysis=smart.classifyProblem?.(sync,reg,ip,support)||{observed:[],probableCauses:[]};
 const data={kind:'hlgb_bug_capture',captureVersion:'93.68',createdAt:new Date().toISOString(),appVersion:String(window.HLGB_RELEASE_VERSION||''),page:pageName(),online:navigator.onLine,analysis,events:[],runtimeErrors:[...(window.hlgbInternalAuditor?.runtimeErrors||[])].slice(-40),runtime:runtimeSnapshot(),intervalProfile:ip,passivePerformance:{dom:smart.domStats||{},longTasks:[...(smart.longTasks||[])]},regression:reg,latestAudit:window.hlgbInternalAuditor?.latest?.()||null,sync,supportBlackbox:support};
 saveHistory({type:'problem',at:data.createdAt,page:data.page,result:'Problema registrado',regressions:(reg.findings||[]).length});
 return data;
}
function install(){
 const smart=window.hlgbAuditorSmart;
 if(!smart)throw new Error('Auditor inteligente ainda não está pronto.');
 if(window.__hlgbSingleProblem9368)return true;
 const wrapped=async function(){
  const out=document.getElementById('hlgbAuditorResult');
  if(out)out.innerHTML='<div class="panel"><b>Preparando diagnóstico…</b><div class="sub">Aguarde alguns segundos.</div></div>';
  try{const data=await buildProblem();lastData=data;renderReady();return data}
  catch(e){if(out)out.innerHTML='<div class="panel"><b>Não foi possível preparar o diagnóstico.</b><div class="sub">'+String(e?.message||e)+'</div></div>';throw e}
 };
 window.__hlgbSingleProblem9368=true;
 window.hlgbAuditorSmartProblem=wrapped;
 smart.problem=wrapped;
 smart.safariDownload={version:'93.68',authority:'single-manual-download',getLast:()=>lastData,getName:()=>lastName,renderReady,clear:()=>{lastData=null;lastName='';clearUrl()}};
 return true;
}
window.addEventListener('pagehide',clearUrl,{once:true});
install();
console.info('[HLGB] Captura/entrega Safari v93.68 ativa em autoridade única, sem download automático');
})();