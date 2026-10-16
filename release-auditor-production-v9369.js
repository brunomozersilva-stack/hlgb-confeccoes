/* HLGB Auditor v93.69 — ativação de produção da versão aprovada no Safari */
(async function(){
'use strict';
if(window.HLGB_AUDITOR_PRODUCTION_9369||window.HLGB_AUDITOR_PRODUCTION_9369_LOADING)return;
window.HLGB_AUDITOR_PRODUCTION_9369_LOADING=true;
const before={recordSave:window.hlgbRecordSaveWithRetry,cloudRequest:window.cloudRequest,setInterval:window.setInterval,setTimeout:window.setTimeout};
function ready(){return !!window.hlgbInternalAuditor&&!!window.hlgbAuditorBlackbox9299&&!!window.hlgbOperationalAuditor9314}
async function waitReady(){
 const end=Date.now()+20000;
 while(!ready()&&Date.now()<end)await new Promise(r=>setTimeout(r,250));
 if(!ready())throw new Error('Módulos-base do Auditor ainda não ficaram prontos.');
}
function load(file){
 return new Promise((resolve,reject)=>{
  const s=document.createElement('script');
  s.src='./'+file+'?fresh='+Date.now();s.async=false;
  s.onload=()=>resolve();s.onerror=()=>reject(new Error('Falha ao carregar '+file));
  (document.head||document.documentElement).appendChild(s);
 });
}
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
 cleanSmartModal();queueMicrotask(cleanSmartModal);
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
 if(!window.HLGB_AUDITOR_SMART_9360)await load('release-auditor-smart-v9360.js');
 if(!window.HLGB_AUDITOR_SAFARI_DOWNLOAD_9368)await load('release-auditor-safari-download-v9368.js');
 installLegacyHideCss();installSingleEntry();
 const safety={recordSave:before.recordSave===window.hlgbRecordSaveWithRetry,cloudRequest:before.cloudRequest===window.cloudRequest,setInterval:before.setInterval===window.setInterval,setTimeout:before.setTimeout===window.setTimeout};
 if(Object.values(safety).some(x=>!x))throw new Error('Ativação interrompida: função crítica mudou.');
 if(window.hlgbAuditorSmart?.version!=='93.63')throw new Error('Versão inesperada do Auditor inteligente.');
 if(window.hlgbAuditorSmart?.safariDownload?.authority!=='single-manual-download')throw new Error('Entrega manual Safari não ficou ativa.');
 window.HLGB_AUDITOR_PRODUCTION_9369=true;
 window.hlgbAuditorProduction9369={version:'93.69',active:true,safety};
 console.info('[HLGB] Auditor de produção v93.69 ativo',safety);
}catch(e){
 window.HLGB_AUDITOR_PRODUCTION_9369=false;
 window.hlgbAuditorProduction9369={version:'93.69',active:false,error:String(e?.message||e)};
 console.error('[HLGB] Auditor de produção v93.69 não ativado',e);
}finally{
 window.HLGB_AUDITOR_PRODUCTION_9369_LOADING=false;
}
})();
