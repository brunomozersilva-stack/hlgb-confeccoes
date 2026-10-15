/* HLGB Auditor v93.67 — entrega de diagnóstico compatível com Safari */
(function(){
'use strict';
if(window.HLGB_AUDITOR_SAFARI_DOWNLOAD_9367)return;
window.HLGB_AUDITOR_SAFARI_DOWNLOAD_9367=true;
let lastData=null,lastUrl='';
function safeData(data){try{return window.hlgbInternalAuditor?.redactDiagnostic?window.hlgbInternalAuditor.redactDiagnostic(data):data}catch(e){return data}}
function clearUrl(){if(lastUrl){try{URL.revokeObjectURL(lastUrl)}catch(e){}lastUrl=''}}
function prepare(data){
 lastData=safeData(data);clearUrl();
 const text=JSON.stringify(lastData,null,2),blob=new Blob([text],{type:'application/json;charset=utf-8'});
 lastUrl=URL.createObjectURL(blob);
 return {url:lastUrl,name:'HLGB-PROBLEMA-'+new Date().toISOString().replace(/[:.]/g,'-')+'.json'};
}
function renderReady(){
 const out=document.getElementById('hlgbAuditorResult');if(!out||!lastData)return;
 const file=prepare(lastData);
 out.innerHTML='<div class="panel"><b>✅ Problema registrado.</b><div class="sub">O diagnóstico está pronto. No Safari, clique no botão abaixo para baixar.</div><div style="margin-top:10px"><a id="hlgbSafariDownload9367" class="primary" role="button" download="'+file.name+'" href="'+file.url+'">⬇️ Baixar diagnóstico</a></div></div>';
}
function install(){
 const smart=window.hlgbAuditorSmart;if(!smart||typeof smart.problem!=='function')return false;
 if(window.__hlgbBaseProblem9367)return true;
 const base=smart.problem.bind(smart);window.__hlgbBaseProblem9367=base;
 async function wrapped(){
  const out=document.getElementById('hlgbAuditorResult');if(out)out.innerHTML='<div class="panel"><b>Preparando diagnóstico…</b><div class="sub">Aguarde alguns segundos.</div></div>';
  try{
   const data=await base();lastData=data;renderReady();return data;
  }catch(e){if(out)out.innerHTML='<div class="panel"><b>Não foi possível preparar o diagnóstico.</b><div class="sub">'+String(e?.message||e)+'</div></div>';throw e}
 }
 window.hlgbAuditorSmartProblem=wrapped;
 window.hlgbAuditorSmart.problem=wrapped;
 window.hlgbAuditorSmart.safariDownload={version:'93.67',getLast:()=>lastData,renderReady};
 return true;
}
let tries=0;const timer=setInterval(()=>{tries++;if(install()||tries>40)clearInterval(timer)},250);
install();
console.info('[HLGB] Entrega Safari do diagnóstico v93.67 ativa');
})();
