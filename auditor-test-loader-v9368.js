/* HLGB Auditor v93.68 — loader temporário isolado. Só afeta a aba atual. */
(async function(){
'use strict';
if(window.HLGB_AUDITOR_TEST_LOADER_9368){console.info('[HLGB TESTE] Auditor v93.68 já está ativo.');return}
window.HLGB_AUDITOR_TEST_LOADER_9368=true;
const before={recordSave:window.hlgbRecordSaveWithRetry,cloudRequest:window.cloudRequest,setInterval:window.setInterval,setTimeout:window.setTimeout};
const AUDITOR_COMMIT='921d87c2367c30c896f56dc091c2aed50f9fe13b';
const base='https://raw.githubusercontent.com/brunomozersilva-stack/hlgb-confeccoes/'+AUDITOR_COMMIT+'/';
function ready(){return !!window.hlgbInternalAuditor&&!!window.hlgbAuditorBlackbox9299&&!!window.hlgbOperationalAuditor9314}
async function waitReady(){const end=Date.now()+20000;while(!ready()&&Date.now()<end)await new Promise(r=>setTimeout(r,250));if(!ready())throw new Error('Os módulos-base do Auditor ainda não ficaram prontos.')}
async function load(file){const r=await fetch(base+file+'?fresh='+Date.now(),{cache:'no-store'});if(!r.ok)throw new Error('Falha ao carregar '+file+' (HTTP '+r.status+')');(0,eval)(await r.text())}
function cleanSmartModal(){
 const status=document.getElementById('hlgbSmartStatus');if(!status)return;
 const root=status.closest('[role="dialog"],.modal,.modal-content,.modalCard,.modal-card,.dialog')||status.parentElement?.parentElement||status.parentElement;
 if(!root)return;
 const keep=new Set(['hlgbSmartTest','hlgbSmartProblem','hlgbSmartHistoryBtn','hlgbSafariDownload9368']);
 for(const el of root.querySelectorAll('button,a,[role="button"]')){
  const txt=String(el.textContent||'').trim();
  const close=el.classList?.contains('modalSave')||/fechar|close/i.test(txt)||/closeModal/.test(String(el.getAttribute('onclick')||''));
  if(keep.has(el.id)||close){el.hidden=false;continue}
  el.hidden=true;el.setAttribute('data-hlgb-auditor-hidden','1');
 }
}
function postOpenCleanup(){
 cleanSmartModal();
 queueMicrotask(cleanSmartModal);
 requestAnimationFrame(()=>{cleanSmartModal();requestAnimationFrame(cleanSmartModal)});
}
function installSingleEntry(){
 if(window.__hlgbAuditorEntryCapture9368)return;
 const handler=e=>{
  const b=e.target?.closest?.('#hlgbAuditorNavBtn,#hlgbAuditorOpenBtn');
  if(!b)return;
  e.preventDefault();e.stopImmediatePropagation();
  if(typeof window.openHlgbAuditor==='function'){window.openHlgbAuditor();postOpenCleanup()}
 };
 document.addEventListener('click',handler,true);
 window.__hlgbAuditorEntryCapture9368=handler;
}
try{
 await waitReady();
 await load('release-auditor-smart-v9360.js');
 await load('release-auditor-safari-download-v9368.js');
 installSingleEntry();
 const safety={recordSave:before.recordSave===window.hlgbRecordSaveWithRetry,cloudRequest:before.cloudRequest===window.cloudRequest,setInterval:before.setInterval===window.setInterval,setTimeout:before.setTimeout===window.setTimeout};
 if(Object.values(safety).some(x=>!x))throw new Error('Teste interrompido: uma função crítica mudou durante a injeção.');
 if(window.hlgbAuditorSmart?.version!=='93.63')throw new Error('Auditor inteligente não confirmou a versão esperada.');
 if(window.hlgbAuditorSmart?.safariDownload?.version!=='93.68')throw new Error('Entrega Safari v93.68 não ficou ativa.');
 console.info('[HLGB TESTE] Auditor v93.68 ativo sem timers de reinstalação.',safety);
 alert('Auditor de teste v93.68 ativado. Ao recarregar a página, o teste desaparece.');
}catch(e){window.HLGB_AUDITOR_TEST_LOADER_9368=false;console.error('[HLGB TESTE] Falha',e);alert('Não foi possível ativar o Auditor de teste.\n\n'+String(e?.message||e))}
})();