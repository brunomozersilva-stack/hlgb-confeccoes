/* HLGB v93.61 — compatibilidade visual do Auditor simplificado.
   Não altera save/sync, não adiciona wrappers e não mexe em dados operacionais. */
(function(){
'use strict';
if(window.HLGB_AUDITOR_UI_COMPAT_9361)return;
window.HLGB_AUDITOR_UI_COMPAT_9361='93.61';
function install(){
 if(document.getElementById('hlgbAuditorUiCompat9361'))return true;
 const st=document.createElement('style');
 st.id='hlgbAuditorUiCompat9361';
 st.textContent=[
  '#hlgbAuditorBlackbox9299,',
  '#hlgbAuditFull9315,',
  '#hlgbAuditCritical9315,',
  '#hlgbAuditDownloadFull9315,',
  '#hlgbAuditDownloadCritical9315{display:none!important}',
  '.hlgb-auditor-actions [onclick*="hlgbAuditorRunVisual"],',
  '.hlgb-auditor-actions [onclick*="hlgbAuditorExportVisual"],',
  '.hlgb-auditor-actions [onclick*="hlgbAuditorCopyLatest"],',
  '.hlgb-auditor-actions [onclick*="hlgbAuditorExportSync"],',
  '.hlgb-auditor-actions [onclick*="hlgbAuditorCleanDerivedSync"]{display:none!important}'
 ].join('');
 (document.head||document.documentElement).appendChild(st);
 return true;
}
install();
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});
window.hlgbAuditorUiCompat9361={version:'93.61',install};
console.info('[HLGB] Auditor UI compat v93.61 ativo');
})();
