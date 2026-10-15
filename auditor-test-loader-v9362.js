/* HLGB Auditor v93.62 — loader temporário de teste. Só afeta a aba atual. */
(async function(){
'use strict';
if(window.HLGB_AUDITOR_TEST_LOADER_9362){window.openHlgbAuditor?.();return}
window.HLGB_AUDITOR_TEST_LOADER_9362=true;
const before={recordSave:window.hlgbRecordSaveWithRetry,cloudRequest:window.cloudRequest,setInterval:window.setInterval,setTimeout:window.setTimeout};
const base='https://raw.githubusercontent.com/brunomozersilva-stack/hlgb-confeccoes/feat/auditor-smart-v9360/';
function ready(){return !!window.hlgbInternalAuditor&&!!window.hlgbAuditorBlackbox9299&&!!window.hlgbOperationalAuditor9314}
async function waitReady(){const end=Date.now()+20000;while(!ready()&&Date.now()<end)await new Promise(r=>setTimeout(r,250));if(!ready())throw new Error('Os módulos-base do Auditor ainda não ficaram prontos. Recarregue o HLGB e tente novamente.')}
async function load(file){const r=await fetch(base+file+'?fresh='+Date.now(),{cache:'no-store'});if(!r.ok)throw new Error('Falha ao carregar '+file+' (HTTP '+r.status+')');const src=await r.text();(0,eval)(src)}
try{
 await waitReady();
 await load('release-auditor-smart-v9360.js');
 await load('release-auditor-ui-compat-v9361.js');
 const safety={recordSave:before.recordSave===window.hlgbRecordSaveWithRetry,cloudRequest:before.cloudRequest===window.cloudRequest,setInterval:before.setInterval===window.setInterval,setTimeout:before.setTimeout===window.setTimeout};
 if(Object.values(safety).some(x=>!x))throw new Error('Teste interrompido: uma função crítica mudou durante a injeção.');
 if(window.hlgbAuditorSmart?.version!=='93.62')throw new Error('Auditor de teste não confirmou a versão 93.62.');
 console.info('[HLGB TESTE] Auditor v93.62 ativo. Funções críticas preservadas.',safety);
 window.openHlgbAuditor?.();
}catch(e){window.HLGB_AUDITOR_TEST_LOADER_9362=false;console.error('[HLGB TESTE] Falha',e);alert('Não foi possível ativar o Auditor de teste.\n\n'+String(e?.message||e))}
})();
