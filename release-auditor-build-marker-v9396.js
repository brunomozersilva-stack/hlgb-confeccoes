/* HLGB Auditor v93.99 — marcador imutável do build carregado nesta sessão. */
(function(){
'use strict';
window.HLGB_RUNTIME_BUILD_ID='2026-10-24-post-hotfix-auditor-3';
window.HLGB_RUNTIME_BUILD_AT='2026-10-24T14:10:00Z';
const LEGACY_HIDE=['#hlgbAuditorMaxDebug9292','#hlgbAuditorBlackbox9299','#hlgbAuditFull9315','#hlgbAuditCritical9315','#hlgbAuditDownloadFull9315','#hlgbAuditDownloadCritical9315','#hlgbAuditorHubDeep9315'];
const LEGACY_ACTION_FILTER='.hlgb-auditor-actions:has(#hlgbSmartTest) button:not(#hlgbMultiuserOpen):not(#hlgbSmartTest):not(#hlgbSmartProblem):not(#hlgbSmartHistoryBtn):not(#hlgbAuthorityBtn9374):not(#hlgbBootAnalysisBtn9381):not(#hlgbAuditorIntelligenceBtn9396)';
let st=document.getElementById('hlgbAuditorLegacyHide9368');
if(!st){st=document.createElement('style');st.id='hlgbAuditorLegacyHide9368';(document.head||document.documentElement).appendChild(st)}
st.textContent=LEGACY_HIDE.concat([LEGACY_ACTION_FILTER]).join(',')+'{display:none!important}';
if(!window.HLGB_AUDITOR_HARDENING_9399&&!document.querySelector('script[data-hlgb-auditor-hardening="9399"]')){
 const s=document.createElement('script');s.src='./release-auditor-hardening-v9399.js?fresh='+Date.now();s.async=false;s.dataset.hlgbAuditorHardening='9399';s.onerror=()=>console.warn('[HLGB] hardening do Auditor v93.99 não carregou');(document.head||document.documentElement).appendChild(s);
}
})();
