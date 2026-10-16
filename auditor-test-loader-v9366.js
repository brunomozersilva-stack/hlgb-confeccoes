/* HLGB Auditor v93.66 — loader temporário de teste. Só afeta a aba atual. */
(async function(){
'use strict';
if(window.HLGB_AUDITOR_TEST_LOADER_9366){console.info('[HLGB TESTE] Auditor v93.66 já está ativo.');return}
window.HLGB_AUDITOR_TEST_LOADER_9366=true;
const before={recordSave:window.hlgbRecordSaveWithRetry,cloudRequest:window.cloudRequest,setInterval:window.setInterval,setTimeout:window.setTimeout};
const AUDITOR_COMMIT='68aca1cbf6f8914ff21df3053f2aa97a24cffaec';
const base='https://raw.githubusercontent.com/brunomozersilva-stack/hlgb-confeccoes/'+AUDITOR_COMMIT+'/';
function ready(){return !!window.hlgbInternalAuditor&&!!window.hlgbAuditorBlackbox9299&&!!window.hlgbOperationalAuditor9314}
async function waitReady(){const end=Date.now()+20000;while(!ready()&&Date.now()<end)await new Promise(r=>setTimeout(r,250));if(!ready())throw new Error('Os módulos-base do Auditor ainda não ficaram prontos. Recarregue o HLGB e tente novamente.')}
async function load(file){const r=await fetch(base+file+'?fresh='+Date.now(),{cache:'no-store'});if(!r.ok)throw new Error('Falha ao carregar '+file+' (HTTP '+r.status+')');(0,eval)(await r.text())}
function bindEntryButtons(){
 const open=()=>{if(typeof window.openHlgbAuditor==='function')return window.openHlgbAuditor();alert('Auditor novo ainda não ficou pronto.');};
 for(const id of ['hlgbAuditorNavBtn','hlgbAuditorOpenBtn']){
  const b=document.getElementById(id);if(!b)continue;
  if(b.__hlgbSmartEntry9366)continue;
  b.onclick=open;b.__hlgbSmartEntry9366=true;b.setAttribute('data-hlgb-smart-entry','93.66');
 }
}
function enforce(){
 const status=document.getElementById('hlgbSmartStatus');if(!status)return;
 const root=status.closest('[role="dialog"],.modal,.modal-content,.modalCard,.modal-card,.dialog')||status.parentElement?.parentElement||status.parentElement;
 if(!root)return;
 const keep=new Set(['hlgbSmartTest','hlgbSmartProblem','hlgbSmartHistoryBtn']);
 for(const el of root.querySelectorAll('button,a,[role="button"]')){
  const close=el.classList?.contains('modalSave')||/fechar|close/i.test(String(el.textContent||''));
  if(keep.has(el.id)||close){el.hidden=false;el.removeAttribute('hidden');try{el.style.removeProperty('display');el.style.removeProperty('visibility');el.style.removeProperty('opacity')}catch(e){};continue}
  if(el.closest('.hlgb-auditor-actions')||/auditor|diagn[oó]st|black.?box|sincron|varredura|visual|exportar|baixar|copiar|cr[ií]tico|limpar/i.test(String(el.textContent||''))){el.hidden=true;el.setAttribute('data-hlgb-auditor-hidden','1')}
 }
}
function installGuard(){
 bindEntryButtons();enforce();
 if(window.__hlgbAuditorUiGuard9366)return;
 const root=document.getElementById('appShell')||document.body;
 const mo=new MutationObserver(()=>{bindEntryButtons();if(document.getElementById('hlgbSmartStatus'))enforce()});
 mo.observe(root,{subtree:true,childList:true,attributes:true,attributeFilter:['hidden','style','class']});
 window.__hlgbAuditorUiGuard9366=mo;
 window.addEventListener('focus',bindEntryButtons);
 document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')bindEntryButtons()});
}
try{
 await waitReady();
 await load('release-auditor-smart-v9360.js');
 installGuard();
 const safety={recordSave:before.recordSave===window.hlgbRecordSaveWithRetry,cloudRequest:before.cloudRequest===window.cloudRequest,setInterval:before.setInterval===window.setInterval,setTimeout:before.setTimeout===window.setTimeout};
 if(Object.values(safety).some(x=>!x))throw new Error('Teste interrompido: uma função crítica mudou durante a injeção.');
 if(window.hlgbAuditorSmart?.version!=='93.63')throw new Error('Auditor de teste não confirmou a versão 93.63.');
 if(!document.querySelector('[data-hlgb-smart-entry="93.66"]'))console.warn('[HLGB TESTE] Botão do Auditor ainda não existe; será ligado quando o menu for criado.');
 console.info('[HLGB TESTE] Auditor v93.66 ativo. Entrada real do menu ligada ao Auditor novo.',safety);
 alert('Auditor de teste v93.66 ativado.\n\nAgora abra o Auditor pelo botão normal do HLGB.\n\nAo recarregar a página, este teste desaparece.');
}catch(e){window.HLGB_AUDITOR_TEST_LOADER_9366=false;console.error('[HLGB TESTE] Falha',e);alert('Não foi possível ativar o Auditor de teste.\n\n'+String(e?.message||e))}
})();
