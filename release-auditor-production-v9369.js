/* HLGB Auditor v93.72 — produção Safari + linha do tempo + correções runtime */
(async function(){
'use strict';
if(window.HLGB_AUDITOR_PRODUCTION_9369||window.HLGB_AUDITOR_PRODUCTION_9369_LOADING)return;
window.HLGB_AUDITOR_PRODUCTION_9369_LOADING=true;
let before={recordSave:window.hlgbRecordSaveWithRetry,cloudRequest:window.cloudRequest,setInterval:window.setInterval,setTimeout:window.setTimeout};
function ready(){return !!window.hlgbInternalAuditor&&!!window.hlgbAuditorBlackbox9299&&!!window.hlgbOperationalAuditor9314}
async function waitReady(){const end=Date.now()+20000;while(!ready()&&Date.now()<end)await new Promise(r=>setTimeout(r,250));if(!ready())throw new Error('Módulos-base do Auditor ainda não ficaram prontos.');}
function load(file){return new Promise((resolve,reject)=>{const s=document.createElement('script');s.src='./'+file+'?fresh='+Date.now();s.async=false;s.onload=()=>resolve();s.onerror=()=>reject(new Error('Falha ao carregar '+file));(document.head||document.documentElement).appendChild(s);});}
function installLegacyHideCss(){let st=document.getElementById('hlgbAuditorLegacyHide9368');if(!st){st=document.createElement('style');st.id='hlgbAuditorLegacyHide9368';(document.head||document.documentElement).appendChild(st)}st.textContent=['#hlgbAuditorMaxDebug9292','#hlgbAuditorBlackbox9299','#hlgbAuditFull9315','#hlgbAuditCritical9315','#hlgbAuditDownloadFull9315','#hlgbAuditDownloadCritical9315','#hlgbAuditorHubDeep9315','.hlgb-auditor-actions:has(#hlgbSmartTest) button:not(#hlgbSmartTest):not(#hlgbSmartProblem):not(#hlgbSmartHistoryBtn)'].join(',')+'{display:none!important}';}
function cleanSmartModal(){const status=document.getElementById('hlgbSmartStatus');if(!status)return;const root=status.closest('[role="dialog"],.modal,.modal-content,.modalCard,.modal-card,.dialog')||status.parentElement?.parentElement||status.parentElement;if(!root)return;const keep=new Set(['hlgbSmartTest','hlgbSmartProblem','hlgbSmartHistoryBtn','hlgbSafariDownload9368']);for(const el of root.querySelectorAll('button,a,[role="button"]')){const txt=String(el.textContent||'').trim();const close=el.classList?.contains('modalSave')||/fechar|close/i.test(txt)||/closeModal/.test(String(el.getAttribute('onclick')||''));if(keep.has(el.id)||close){el.hidden=false;continue}el.hidden=true;el.setAttribute('data-hlgb-auditor-hidden','1');}}
function postOpenCleanup(){cleanSmartModal();queueMicrotask(cleanSmartModal);requestAnimationFrame(()=>{cleanSmartModal();requestAnimationFrame(cleanSmartModal)});}
function installSingleEntry(){if(window.__hlgbAuditorEntryCapture9368)return;const handler=e=>{const b=e.target?.closest?.('#hlgbAuditorNavBtn,#hlgbAuditorOpenBtn');if(!b)return;e.preventDefault();e.stopImmediatePropagation();if(typeof window.openHlgbAuditor==='function'){window.openHlgbAuditor();postOpenCleanup()}};document.addEventListener('click',handler,true);window.__hlgbAuditorEntryCapture9368=handler;}
function cloudRequestIsSafe(previous,current){
 if(previous===current)return true;
 if(typeof current!=='function')return false;
 if(current.__hlgb9320===true){
  if(previous==null)return typeof current.__hlgb9320Original==='function';
  return current.__hlgb9320Original===previous;
 }
 return false;
}
try{
 if(!window.HLGB_BOOT_READ_COALESCE_9393)await load('release-boot-read-coalesce-v9393.js');
 await waitReady();
 before={recordSave:window.hlgbRecordSaveWithRetry,cloudRequest:window.cloudRequest,setInterval:window.setInterval,setTimeout:window.setTimeout};
 if(!window.HLGB_RUNTIME_PERFORMANCE_9371)await load('release-runtime-performance-v9371.js');
 if(!window.HLGB_AUDITOR_SMART_9360)await load('release-auditor-smart-v9360.js');
 window.hlgbRuntimePerformance9371?.installClassifier?.();
 if(!window.HLGB_AUDITOR_SAFARI_DOWNLOAD_9368)await load('release-auditor-safari-download-v9368.js');
 if(!window.HLGB_AUDITOR_RUNTIME_FIX_9370)await load('release-auditor-runtime-fix-v9370.js');
 if(!window.HLGB_AUDITOR_RENDER_SIGNAL_9372)await load('release-auditor-render-signal-v9372.js');
 installLegacyHideCss();installSingleEntry();
 const safety={recordSave:before.recordSave===window.hlgbRecordSaveWithRetry,cloudRequest:cloudRequestIsSafe(before.cloudRequest,window.cloudRequest),setInterval:before.setInterval===window.setInterval,setTimeout:before.setTimeout===window.setTimeout};
 const changed=Object.entries(safety).filter(([,ok])=>!ok).map(([key])=>key);
 if(changed.length)throw new Error('Ativação interrompida: função crítica mudou ('+changed.join(', ')+').');
 if(window.hlgbAuditorSmart?.version!=='93.63')throw new Error('Versão inesperada do Auditor inteligente.');
 if(window.hlgbAuditorSmart?.safariDownload?.authority!=='single-manual-download')throw new Error('Entrega manual Safari não ficou ativa.');
 if(typeof window.hlgbAuditorSmart?.eventsSnapshot!=='function')throw new Error('Linha do tempo v93.70 não ficou ativa.');
 if(window.hlgbRuntimePerformance9371?.version!=='93.71')throw new Error('Correções runtime v93.71 não ficaram ativas.');
 if(window.hlgbAuditorSmart?.renderSignal9372?.version!=='93.72')throw new Error('Sinal de render v93.72 não ficou ativo.');
 window.HLGB_AUDITOR_PRODUCTION_9369=true;
 window.hlgbAuditorProduction9369={version:'93.72',active:true,safety,timeline:true,runtimeFix:true,renderSignal:true,bootReadCoalesce:window.HLGB_BOOT_READ_COALESCE_9393?.version||'',bootReadPatch:'2026-10-20-boot-read-coalesce',patch:'2026-10-15-known-cloud-wrapper'};
 console.info('[HLGB] Auditor de produção v93.72 ativo',safety);
}catch(e){window.HLGB_AUDITOR_PRODUCTION_9369=false;window.hlgbAuditorProduction9369={version:'93.72',active:false,error:String(e?.message||e),bootReadPatch:'2026-10-20-boot-read-coalesce',patch:'2026-10-15-known-cloud-wrapper'};console.error('[HLGB] Auditor de produção v93.72 não ativado',e);}finally{window.HLGB_AUDITOR_PRODUCTION_9369_LOADING=false;}
})();
