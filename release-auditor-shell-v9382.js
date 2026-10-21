/* HLGB Auditor v93.82 — interface oficial única do Auditor. Somente leitura. */
(function(){
'use strict';
if(window.HLGB_AUDITOR_SHELL_9382)return;
const V='93.82';
const KEEP=new Set(['hlgbSmartTest','hlgbSmartProblem','hlgbSmartHistoryBtn','hlgbAuthorityBtn9374','hlgbBootAnalysisBtn9381','hlgbBootDownload9381','hlgbAuthorityDownload9374','hlgbSafariDownload9368']);
const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
let installed=false;
function ensureStyle(){
 let st=document.getElementById('hlgbAuditorShellStyle9382');
 if(!st){st=document.createElement('style');st.id='hlgbAuditorShellStyle9382';(document.head||document.documentElement).appendChild(st)}
 st.textContent=['#hlgbSmartTest','#hlgbSmartProblem','#hlgbSmartHistoryBtn','#hlgbAuthorityBtn9374','#hlgbBootAnalysisBtn9381','#hlgbBootDownload9381','#hlgbAuthorityDownload9374','#hlgbSafariDownload9368'].map(x=>x+'{display:inline-block!important;visibility:visible!important}').join('');
}
function smartStatus(){
 try{
  const rows=window.hlgbAuditorSmart?.hist?.()||[];
  const h=rows.find(x=>x?.type==='audit');
  if(!h)return '<b>Status:</b> ainda sem teste nesta versão.';
  const fail=Number(h.fail||0),warn=Number(h.warn||0),label=fail?'Falha':warn?'Atenção':'Tudo certo';
  return '<b>Status do sistema: '+esc(label)+'</b><div class="sub">Último teste: '+esc(String(h.at||'').replace('T',' ').slice(0,16))+' · '+Number(h.pass||0)+' aprovados · '+warn+' atenções · '+fail+' falhas</div>';
 }catch(e){return '<b>Status:</b> diagnóstico disponível após executar o teste.'}
}
function currentBody(){
 return '<div class="sub">Auditoria automática e somente de leitura. A interface atual usa um único ponto de entrada e mantém os diagnósticos profundos por trás.</div>'+
 '<div class="panel" id="hlgbSmartStatus" style="margin-top:12px"><div style="display:flex;justify-content:space-between;gap:8px;align-items:center;flex-wrap:wrap"><div>'+smartStatus()+'</div><span class="badge ok">Auditor '+V+'</span></div></div>'+
 '<div class="hlgb-auditor-actions" style="display:flex;gap:8px;flex-wrap:wrap;margin:12px 0">'+
 '<button id="hlgbSmartTest" class="primary" type="button" onclick="hlgbAuditorSmartRun()">🧪 Testar sistema</button>'+
 '<button id="hlgbSmartProblem" class="secondary" type="button" onclick="hlgbAuditorSmartProblem()">🛠️ Registrar problema</button>'+
 '<button id="hlgbSmartHistoryBtn" class="secondary" type="button" onclick="hlgbAuditorSmartHistory()">🕘 Histórico</button>'+
 '<button id="hlgbAuthorityBtn9374" class="secondary" type="button" onclick="hlgbAuditorAuthorityScan9374()">🧭 Arquitetura / versões</button>'+
 '<button id="hlgbBootAnalysisBtn9381" class="secondary" type="button" onclick="hlgbAuditorBootAnalysis9381.last=hlgbAuditorBootAnalysis9381.render()">🚦 Boot / cargas</button>'+
 '</div><div id="hlgbAuditorResult"></div><div id="hlgbSmartHistory" style="display:none"></div><button type="button" class="secondary modalSave">Fechar</button>';
}
function root(){const s=document.getElementById('hlgbSmartStatus');return s?.closest?.('[role="dialog"],.modal,.modal-content,.modalCard,.modal-card,.dialog')||s?.parentElement?.parentElement||s?.parentElement||null}
function normalize(){
 ensureStyle();
 const r=root();if(!r)return false;
 for(const el of r.querySelectorAll('button,a,[role="button"]')){
  const txt=String(el.textContent||'').trim(),code=String(el.getAttribute?.('onclick')||'');
  const close=el.classList?.contains('modalSave')||/fechar|close/i.test(txt)||/closeModal/.test(code);
  const keep=KEEP.has(el.id)||close;
  el.hidden=!keep;
  if(keep){el.removeAttribute?.('data-hlgb-auditor-hidden');el.style.setProperty?.('display','inline-block','important');el.style.setProperty?.('visibility','visible','important')}else el.setAttribute?.('data-hlgb-auditor-hidden','1');
 }
 return true;
}
function openCurrent(){
 if(typeof window.openModal!=='function')return;
 ensureStyle();
 window.openModal('🧪 Auditor / Testador HLGB · v'+V,currentBody(),()=>window.closeModal?.());
 try{window.hlgbAuditorAuthority9374?.decorate?.()}catch(e){}
 try{window.hlgbAuditorBootAnalysis9381?.decorate?.()}catch(e){}
 [0,30,120,350,700].forEach(ms=>setTimeout(normalize,ms));
}
function install(){
 ensureStyle();
 if(typeof window.hlgbAuditorSmartRun!=='function'||typeof window.hlgbAuditorSmartProblem!=='function')return false;
 window.openHlgbAuditor=openCurrent;
 window.HLGB_AUDITOR_SHELL_AUTHORITY=V;
 const nav=document.getElementById('hlgbAuditorNavBtn');if(nav)nav.onclick=openCurrent;
 const open=document.getElementById('hlgbAuditorOpenBtn');if(open)open.onclick=openCurrent;
 installed=true;
 return true;
}
function scheduleInstall(){
 [0,100,300,700,1500,3000,6000,10000,15000,20000,30000].forEach(ms=>setTimeout(()=>{if(!installed)install()},ms));
}
window.hlgbAuditorShell9382={version:V,open:openCurrent,install,normalize,get installed(){return installed}};
window.HLGB_AUDITOR_SHELL_9382=true;
scheduleInstall();
try{if(typeof window.hlgbAfterLogin==='function')window.hlgbAfterLogin(()=>{install();[100,500,1500].forEach(ms=>setTimeout(install,ms))},0)}catch(e){}
window.addEventListener?.('hlgb:authenticated',()=>{install();[100,500,1500].forEach(ms=>setTimeout(install,ms))});
window.addEventListener?.('pageshow',()=>install());
document.addEventListener('click',e=>{if(e.target?.closest?.('#hlgbAuditorNavBtn,#hlgbAuditorOpenBtn')){install();setTimeout(install,0)}},true);
console.info('[HLGB] Auditor shell oficial v'+V+' carregado');
})();
