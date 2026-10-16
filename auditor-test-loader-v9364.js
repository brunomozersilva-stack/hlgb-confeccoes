/* HLGB Auditor v93.63 + UI v93.64 — loader temporário de teste. Só afeta a aba atual. */
(async function(){
'use strict';
if(window.HLGB_AUDITOR_TEST_LOADER_9364){console.info('[HLGB TESTE] Auditor v93.64 já está ativo.');return}
window.HLGB_AUDITOR_TEST_LOADER_9364=true;
const before={recordSave:window.hlgbRecordSaveWithRetry,cloudRequest:window.cloudRequest,setInterval:window.setInterval,setTimeout:window.setTimeout};
const AUDITOR_COMMIT='942a062749b04520c21b4d34a5b6cc4f036badcf';
const base='https://raw.githubusercontent.com/brunomozersilva-stack/hlgb-confeccoes/'+AUDITOR_COMMIT+'/';
function ready(){return !!window.hlgbInternalAuditor&&!!window.hlgbAuditorBlackbox9299&&!!window.hlgbOperationalAuditor9314}
async function waitReady(){const end=Date.now()+20000;while(!ready()&&Date.now()<end)await new Promise(r=>setTimeout(r,250));if(!ready())throw new Error('Os módulos-base do Auditor ainda não ficaram prontos. Recarregue o HLGB e tente novamente.')}
async function load(file){const r=await fetch(base+file+'?fresh='+Date.now(),{cache:'no-store'});if(!r.ok)throw new Error('Falha ao carregar '+file+' (HTTP '+r.status+')');const src=await r.text();(0,eval)(src)}
function installUiCompat(){
 let st=document.getElementById('hlgbAuditorUiCompat9361');
 if(!st){st=document.createElement('style');st.id='hlgbAuditorUiCompat9361';(document.head||document.documentElement).appendChild(st)}
 st.textContent=[
  '#hlgbAuditorBlackbox9299,','#hlgbAuditorMaxDebug9292,','#hlgbAuditFull9315,','#hlgbAuditCritical9315,','#hlgbAuditDownloadFull9315,','#hlgbAuditDownloadCritical9315{display:none!important}',
  '.hlgb-auditor-actions button:not([onclick*="hlgbAuditorSmart"]){display:none!important}'
 ].join('');
 window.HLGB_AUDITOR_UI_COMPAT_9361='93.64-test-loader';
 window.hlgbAuditorUiCompat9361={version:'93.64-test-loader',install:installUiCompat};
}
try{
 await waitReady();
 await load('release-auditor-smart-v9360.js');
 installUiCompat();
 const safety={recordSave:before.recordSave===window.hlgbRecordSaveWithRetry,cloudRequest:before.cloudRequest===window.cloudRequest,setInterval:before.setInterval===window.setInterval,setTimeout:before.setTimeout===window.setTimeout};
 if(Object.values(safety).some(x=>!x))throw new Error('Teste interrompido: uma função crítica mudou durante a injeção.');
 if(window.hlgbAuditorSmart?.version!=='93.63')throw new Error('Auditor de teste não confirmou a versão 93.63.');
 console.info('[HLGB TESTE] Auditor v93.63 + UI v93.64 ativos.',safety);
 alert('Auditor de teste v93.64 ativado.\n\nAgora abra o Auditor pelo botão normal do HLGB.\n\nAo recarregar a página, este teste desaparece.');
}catch(e){window.HLGB_AUDITOR_TEST_LOADER_9364=false;console.error('[HLGB TESTE] Falha',e);alert('Não foi possível ativar o Auditor de teste.\n\n'+String(e?.message||e))}
})();
