/* HLGB Auditor v93.65 — loader temporário de teste. Só afeta a aba atual. */
(async function(){
'use strict';
if(window.HLGB_AUDITOR_TEST_LOADER_9365){console.info('[HLGB TESTE] Auditor v93.65 já está ativo.');return}
window.HLGB_AUDITOR_TEST_LOADER_9365=true;
const before={recordSave:window.hlgbRecordSaveWithRetry,cloudRequest:window.cloudRequest,setInterval:window.setInterval,setTimeout:window.setTimeout};
const AUDITOR_COMMIT='2d9d27b073eece4772b37fc50e77b8319ee7e0ce';
const base='https://raw.githubusercontent.com/brunomozersilva-stack/hlgb-confeccoes/'+AUDITOR_COMMIT+'/';
function ready(){return !!window.hlgbInternalAuditor&&!!window.hlgbAuditorBlackbox9299&&!!window.hlgbOperationalAuditor9314}
async function waitReady(){const end=Date.now()+20000;while(!ready()&&Date.now()<end)await new Promise(r=>setTimeout(r,250));if(!ready())throw new Error('Os módulos-base do Auditor ainda não ficaram prontos. Recarregue o HLGB e tente novamente.')}
async function load(file){const r=await fetch(base+file+'?fresh='+Date.now(),{cache:'no-store'});if(!r.ok)throw new Error('Falha ao carregar '+file+' (HTTP '+r.status+')');(0,eval)(await r.text())}
function enforce(){
 const actions=document.querySelector('#hlgbSmartStatus')?.parentElement?.querySelector('.hlgb-auditor-actions')||document.querySelector('.hlgb-auditor-actions');
 if(!actions)return;
 const keep=new Set(['hlgbSmartTest','hlgbSmartProblem','hlgbSmartHistoryBtn']);
 for(const el of actions.querySelectorAll('button,a,[role="button"]')){
  if(keep.has(el.id)){
   el.hidden=false;el.removeAttribute('hidden');el.removeAttribute('data-hlgb-auditor-hidden');
   try{el.style.removeProperty('display');el.style.removeProperty('visibility');el.style.removeProperty('opacity')}catch(e){}
  }else{
   el.hidden=true;el.setAttribute('data-hlgb-auditor-hidden','1');
  }
 }
}
function installGuard(){
 enforce();
 if(window.__hlgbAuditorUiGuard9365)return;
 const root=document.getElementById('appShell')||document.body;
 const mo=new MutationObserver(()=>{if(document.getElementById('hlgbSmartStatus'))enforce()});
 mo.observe(root,{subtree:true,childList:true,attributes:true,attributeFilter:['hidden','style','class']});
 window.__hlgbAuditorUiGuard9365=mo;
 document.addEventListener('click',e=>{const b=e.target?.closest?.('button');if(b&&(b.id==='hlgbAuditorNavBtn'||b.id==='hlgbAuditorOpenBtn'||/Auditor/i.test(String(b.textContent||'')))){setTimeout(enforce,30);setTimeout(enforce,250);setTimeout(enforce,900)}},true);
}
try{
 await waitReady();
 await load('release-auditor-smart-v9360.js');
 installGuard();
 const safety={recordSave:before.recordSave===window.hlgbRecordSaveWithRetry,cloudRequest:before.cloudRequest===window.cloudRequest,setInterval:before.setInterval===window.setInterval,setTimeout:before.setTimeout===window.setTimeout};
 if(Object.values(safety).some(x=>!x))throw new Error('Teste interrompido: uma função crítica mudou durante a injeção.');
 if(window.hlgbAuditorSmart?.version!=='93.63')throw new Error('Auditor de teste não confirmou a versão 93.63.');
 console.info('[HLGB TESTE] Auditor v93.65 ativo. Guard visual preserva somente as 3 ações oficiais.',safety);
 alert('Auditor de teste v93.65 ativado.\n\nAbra o Auditor pelo botão normal do HLGB.\n\nAo recarregar a página, este teste desaparece.');
}catch(e){window.HLGB_AUDITOR_TEST_LOADER_9365=false;console.error('[HLGB TESTE] Falha',e);alert('Não foi possível ativar o Auditor de teste.\n\n'+String(e?.message||e))}
})();
