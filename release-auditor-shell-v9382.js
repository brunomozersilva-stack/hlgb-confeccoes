/* HLGB Auditor v93.82 — interface oficial única do Auditor. Somente leitura. */
(function(){
'use strict';
if(window.HLGB_AUDITOR_SHELL_9382)return;
const V='93.82';
const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
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
function openCurrent(){
 if(typeof window.openModal!=='function')return;
 window.openModal('🧪 Auditor / Testador HLGB · v'+V,currentBody(),()=>window.closeModal?.());
 try{window.hlgbAuditorAuthority9374?.decorate?.()}catch(e){}
 try{window.hlgbAuditorBootAnalysis9381?.decorate?.()}catch(e){}
}
function install(){
 if(typeof window.hlgbAuditorSmartRun!=='function'||typeof window.hlgbAuditorSmartProblem!=='function')return false;
 window.openHlgbAuditor=openCurrent;
 window.HLGB_AUDITOR_SHELL_AUTHORITY=V;
 const nav=document.getElementById('hlgbAuditorNavBtn');if(nav)nav.onclick=openCurrent;
 const open=document.getElementById('hlgbAuditorOpenBtn');if(open)open.onclick=openCurrent;
 return true;
}
window.hlgbAuditorShell9382={version:V,open:openCurrent,install};
window.HLGB_AUDITOR_SHELL_9382=true;
[0,100,300,700,1500,3000].forEach(ms=>setTimeout(install,ms));
document.addEventListener('click',e=>{if(e.target?.closest?.('#hlgbAuditorNavBtn,#hlgbAuditorOpenBtn'))setTimeout(install,0)},true);
console.info('[HLGB] Auditor shell oficial v'+V+' carregado');
})();
