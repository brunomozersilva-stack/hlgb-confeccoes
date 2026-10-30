/* HLGB v94.35 — estabilidade dos botões oficiais do Auditor em WebKit/Safari.
   Não cria outro Auditor nem substitui a autoridade 93.82; apenas impede CSS/DOM
   legado de ocultar os botões canônicos depois que o shell oficial abriu. */
(function(){
'use strict';
const V='94.35';
if(window.HLGB_AUDITOR_BUTTON_STABILITY_9435===V)return;
window.HLGB_AUDITOR_BUTTON_STABILITY_9435=V;
const IDS=['hlgbAuditorIntelligenceBtn9396','hlgbAuditorBusinessBtn9401','hlgbDailyReport9368'];
const state={version:V,heals:0,moves:0,shown:0,createdDaily:0,lastAt:'',lastReason:''};
function visible(el){if(!el)return false;try{const s=getComputedStyle(el),r=el.getBoundingClientRect();return !el.hidden&&s.display!=='none'&&s.visibility!=='hidden'&&r.width>0&&r.height>0}catch(e){return false}}
function auditorRoot(){const s=document.getElementById('hlgbSmartStatus');return s?.closest?.('[role="dialog"],.modal,.modal-content,.modalCard,.modal-card,.dialog')||s?.parentElement?.parentElement||s?.parentElement||null}
function actions(root){return root?.querySelector?.('.hlgb-auditor-actions')||root?.querySelector?.('#hlgbSmartTest')?.parentElement||root?.querySelector?.('#hlgbSmartProblem')?.parentElement||null}
function show(el){if(!el)return false;el.hidden=false;el.classList?.remove?.('hidden');el.removeAttribute?.('aria-hidden');try{el.style.setProperty('display','inline-flex','important');el.style.setProperty('visibility','visible','important');el.style.setProperty('opacity','1','important');el.style.setProperty('pointer-events','auto','important')}catch(e){}state.shown++;return true}
function ensureDaily(root,host){
 let el=document.getElementById('hlgbDailyReport9368');
 if(el||!root||!host)return el;
 if(typeof window.hlgbAuditorDailyReport9368!=='function')return null;
 el=document.createElement('button');el.id='hlgbDailyReport9368';el.className='secondary';el.type='button';el.textContent='📅 Relatório diário';
 el.onclick=()=>{try{window.hlgbAuditorDailyReport9368()}catch(e){console.warn('[HLGB Auditor v94.35] relatório diário',e)}};
 host.appendChild(el);state.createdDaily++;return el;
}
function heal(reason='manual'){
 const root=auditorRoot();if(!root||!visible(document.getElementById('hlgbSmartStatus')))return false;
 const host=actions(root);state.heals++;state.lastAt=new Date().toISOString();state.lastReason=reason;
 try{window.hlgbAuditorIntelligence9396?.install?.()}catch(e){}
 try{window.hlgbAuditorBusiness9401?.ensureButton?.()}catch(e){}
 ensureDaily(root,host);
 for(const id of IDS){
   const el=document.getElementById(id);if(!el)continue;
   if(host&&el.parentElement!==host){host.appendChild(el);state.moves++}
   show(el);
 }
 /* O shell oficial continua sendo a única autoridade. Se ele expõe normalize,
    não o substituímos; só pedimos nova normalização no modal oficial. */
 try{if(window.HLGB_AUDITOR_SHELL_AUTHORITY==='93.82')window.hlgbAuditorShell9382?.normalize?.(root)}catch(e){}
 for(const id of IDS)show(document.getElementById(id));
 return true;
}
function burst(reason){[0,30,90,180,350,650,1100,1800].forEach(ms=>setTimeout(()=>heal(reason+'-'+ms),ms))}
document.addEventListener('click',e=>{if(e.target?.closest?.('#hlgbAuditorNavBtn,#hlgbAuditorOpenBtn'))burst('open-click')},true);
window.addEventListener('hlgb:auditor:open',()=>burst('auditor-open'));
window.addEventListener('hlgb:authenticated',()=>burst('auth'));
window.addEventListener('pageshow',()=>burst('pageshow'));
[700,1600,3200,6500].forEach(ms=>setTimeout(()=>heal('boot-'+ms),ms));
window.hlgbAuditorButtonStability9435={version:V,state,heal,burst,status:()=>({...state,buttons:IDS.map(id=>({id,visible:visible(document.getElementById(id)),inRoot:!!auditorRoot()?.contains?.(document.getElementById(id))}))})};
console.info('[HLGB] v'+V+' botões oficiais do Auditor protegidos contra ocultação no WebKit');
})();
