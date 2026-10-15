/* HLGB Auditor v93.68 — entrega de diagnóstico compatível com Safari, sem timer/reinstalação */
(function(){
'use strict';
if(window.HLGB_AUDITOR_SAFARI_DOWNLOAD_9368)return;
window.HLGB_AUDITOR_SAFARI_DOWNLOAD_9368=true;
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
function install(){
 const smart=window.hlgbAuditorSmart;
 if(!smart||typeof smart.problem!=='function')throw new Error('Auditor inteligente ainda não está pronto.');
 if(window.__hlgbBaseProblem9368)return true;
 const base=smart.problem.bind(smart);
 window.__hlgbBaseProblem9368=base;
 const wrapped=async function(){
  const out=document.getElementById('hlgbAuditorResult');
  if(out)out.innerHTML='<div class="panel"><b>Preparando diagnóstico…</b><div class="sub">Aguarde alguns segundos.</div></div>';
  try{
   const data=await base();lastData=data;renderReady();return data;
  }catch(e){
   if(out)out.innerHTML='<div class="panel"><b>Não foi possível preparar o diagnóstico.</b><div class="sub">'+String(e?.message||e)+'</div></div>';
   throw e;
  }
 };
 window.hlgbAuditorSmartProblem=wrapped;
 smart.problem=wrapped;
 smart.safariDownload={version:'93.68',getLast:()=>lastData,getName:()=>lastName,renderReady,clear:()=>{lastData=null;lastName='';clearUrl()}};
 return true;
}
window.addEventListener('pagehide',clearUrl,{once:true});
install();
console.info('[HLGB] Entrega Safari do diagnóstico v93.68 ativa, sem timers de reinstalação');
})();