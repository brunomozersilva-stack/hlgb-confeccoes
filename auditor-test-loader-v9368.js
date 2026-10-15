/* HLGB Auditor v93.68 — loader temporário isolado. Só afeta a aba atual. */
(async function(){
'use strict';
if(window.HLGB_AUDITOR_TEST_LOADER_9368){console.info('[HLGB TESTE] Auditor v93.68 já está ativo.');return}
window.HLGB_AUDITOR_TEST_LOADER_9368=true;
const before={recordSave:window.hlgbRecordSaveWithRetry,cloudRequest:window.cloudRequest,setInterval:window.setInterval,setTimeout:window.setTimeout};
const AUDITOR_COMMIT='304e48ebe649852866509ccebbd523dd24b017a8';
const base='https://raw.githubusercontent.com/brunomozersilva-stack/hlgb-confeccoes/'+AUDITOR_COMMIT+'/';
function ready(){return !!window.hlgbInternalAuditor&&!!window.hlgbAuditorBlackbox9299&&!!window.hlgbOperationalAuditor9314}
async function waitReady(){const end=Date.now()+20000;while(!ready()&&Date.now()<end)await new Promise(r=>setTimeout(r,250));if(!ready())throw new Error('Os módulos-base do Auditor ainda não ficaram prontos.')}
async function load(file){const r=await fetch(base+file+'?fresh='+Date.now(),{cache:'no-store'});if(!r.ok)throw new Error('Falha ao carregar '+file+' (HTTP '+r.status+')');(0,eval)(await r.text())}
function installLegacyHideCss(){
 let st=document.getElementById('hlgbAuditorLegacyHide9368');
 if(!st){st=document.createElement('style');st.id='hlgbAuditorLegacyHide9368';(document.head||document.documentElement).appendChild(st)}
 st.textContent=[
  '#hlgbAuditorMaxDebug9292',
  '#hlgbAuditorBlackbox9299',
  '#hlgbAuditFull9315',
  '#hlgbAuditCritical9315',
  '#hlgbAuditDownloadFull9315',
  '#hlgbAuditDownloadCritical9315',
  '#hlgbAuditorHubDeep9315',
  '.hlgb-auditor-actions:has(#hlgbSmartTest) button:not(#hlgbSmartTest):not(#hlgbSmartProblem):not(#hlgbSmartHistoryBtn)'
 ].join(',')+'{display:none!important}';
}
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
 installLegacyHideCss();
 installSingleEntry();
 const safety={recordSave:before.recordSave===window.hlgbRecordSaveWithRetry,cloudRequest:before.cloudRequest===window.cloudRequest,setInterval:before.setInterval===window.setInterval,setTimeout:before.setTimeout===window.setTimeout};
 if(Object.values(safety).some(x=>!x))throw new Error('Teste interrompido: uma função crítica mudou durante a injeção.');
 if(window.hlgbAuditorSmart?.version!=='93.63')throw new Error('Auditor inteligente não confirmou a versão esperada.');
 if(window.hlgbAuditorSmart?.safariDownload?.version!=='93.68')throw new Error('Entrega Safari v93.68 não ficou ativa.');
 if(window.hlgbAuditorSmart?.safariDownload?.authority!=='single-manual-download')throw new Error('Autoridade única de captura/download não ficou ativa.');
 console.info('[HLGB TESTE] Auditor v93.68 ativo sem timers e com captura/download em autoridade única.',safety);
 alert('Auditor de teste v93.68 ativado. Ao recarregar a página, o teste desaparece.');
}catch(e){window.HLGB_AUDITOR_TEST_LOADER_9368=false;console.error('[HLGB TESTE] Falha',e);alert('Não foi possível ativar o Auditor de teste.\n\n'+String(e?.message||e))}
})();