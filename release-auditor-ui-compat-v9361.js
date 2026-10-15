/* HLGB v93.64 — compatibilidade visual do Auditor simplificado.
   Não altera save/sync, não adiciona wrappers e não mexe em dados operacionais. */
(function(){
'use strict';
if(window.HLGB_AUDITOR_UI_COMPAT_9361)return;
window.HLGB_AUDITOR_UI_COMPAT_9361='93.64';
function install(){
 let st=document.getElementById('hlgbAuditorUiCompat9361');
 if(!st){st=document.createElement('style');st.id='hlgbAuditorUiCompat9361';(document.head||document.documentElement).appendChild(st)}
 st.textContent=[
  '#hlgbAuditorBlackbox9299,',
  '#hlgbAuditorMaxDebug9292,',
  '#hlgbAuditFull9315,',
  '#hlgbAuditCritical9315,',
  '#hlgbAuditDownloadFull9315,',
  '#hlgbAuditDownloadCritical9315{display:none!important}',
  '.hlgb-auditor-actions button:not([onclick*="hlgbAuditorSmart"]){display:none!important}'
 ].join('');
 return true;
}
install();
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});
window.hlgbAuditorUiCompat9361={version:'93.64',install};
console.info('[HLGB] Auditor UI compat v93.64 ativo');
})();
