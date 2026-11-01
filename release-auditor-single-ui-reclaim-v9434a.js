/* HLGB v94.34a — restaura a interface de ação única do Auditor sem alterar sincronização. */
(function(){
'use strict';
const V='94.34a',APP_BASE='94.40';
if(window.HLGB_AUDITOR_SINGLE_UI_RECLAIM_9434A===V)return;
window.HLGB_AUDITOR_SINGLE_UI_RECLAIM_9434A=V;
const BUTTON_ID='hlgbAuditorUnifiedRun9434A';
const STYLE_ID='hlgbAuditorSingleUiReclaim9434A';
const REPAIR_SRC='./release-auditor-repair-v9440.js';
const LEGACY_IDS=[
 'hlgbAuditorUnifiedRun9426','hlgbAuditorUnifiedRun9427','hlgbAuditorUnifiedRun9429','hlgbMultiuserOpen','hlgbSmartTest','hlgbSmartProblem','hlgbSmartHistoryBtn',
 'hlgbAuthorityBtn9374','hlgbBootAnalysisBtn9381','hlgbAuditorIntelligenceBtn9396','hlgbAuditorBusinessBtn9401','hlgbDailyReport9368',
 'hlgbAuditorMaxDebug9292','hlgbAuditorBlackbox9299','hlgbAuditFull9315','hlgbAuditCritical9315','hlgbAuditDownloadFull9315',
 'hlgbAuditDownloadCritical9315','hlgbAuditorHubDeep9315'
];
const TOOL_IDS=['hlgbBootTools9381'];
const state={version:V,appBase:APP_BASE,heals:0,created:0,runs:0,errors:0,running:false,repairLoads:0,lastAt:'',lastReason:'',lastError:''};
const sid=v=>String(v??'');
function stamp(){
 try{if((parseFloat(sid(window.HLGB_RELEASE_VERSION))||0)<94.40)window.HLGB_RELEASE_VERSION=APP_BASE}catch(e){}
 try{const el=document.querySelector('#appShell .logo small');if(el&&((parseFloat(sid(el.textContent).replace(/^v/i,''))||0)<94.40))el.textContent='v'+APP_BASE}catch(e){}
}
function root(){
 const s=document.getElementById('hlgbSmartStatus');
 return s?.closest?.('[role="dialog"],.modal,.modal-content,.modalCard,.modal-card,.dialog')||s?.parentElement?.parentElement||document.querySelector('.hlgb-auditor-actions')?.parentElement||null;
}
function host(){
 const r=root();
 return r?.querySelector?.('.hlgb-auditor-actions')||document.querySelector('.hlgb-auditor-actions')||document.getElementById('hlgbSmartTest')?.parentElement||document.getElementById('hlgbSmartProblem')?.parentElement||null;
}
function ensureStyle(){
 let st=document.getElementById(STYLE_ID);
 if(!st){st=document.createElement('style');st.id=STYLE_ID;(document.head||document.documentElement).appendChild(st)}
 st.textContent=[
  '.hlgb-auditor-actions>button:not(#'+BUTTON_ID+'){display:none!important;visibility:hidden!important;opacity:0!important;pointer-events:none!important}',
  ...LEGACY_IDS.map(id=>'#'+id+'{display:none!important;visibility:hidden!important;opacity:0!important;pointer-events:none!important}'),
  ...TOOL_IDS.map(id=>'#'+id+'{display:none!important;visibility:hidden!important}'),
  '#'+BUTTON_ID+'{display:inline-flex!important;visibility:visible!important;opacity:1!important;pointer-events:auto!important;align-items:center!important}'
 ].join('');
 return st;
}
function hideLegacy(){
 for(const id of LEGACY_IDS){
  const el=document.getElementById(id);if(!el)continue;
  try{el.style.setProperty('display','none','important');el.style.setProperty('visibility','hidden','important');el.style.setProperty('opacity','0','important');el.style.setProperty('pointer-events','none','important')}catch(e){}
 }
 for(const id of TOOL_IDS){const el=document.getElementById(id);if(el){try{el.style.setProperty('display','none','important');el.style.setProperty('visibility','hidden','important')}catch(e){}}}
}
function ensureRepair(){
 if(window.HLGB_AUDITOR_REPAIR_9440==='94.40'&&typeof window.hlgbAuditorRepair9440?.run==='function')return Promise.resolve(true);
 if(window.__HLGB_AUTH_READY!==true)return Promise.resolve(false);
 const existing=document.querySelector('script[data-hlgb-auditor-repair-9440]');
 if(existing?.__hlgbPromise)return existing.__hlgbPromise;
 const s=existing||document.createElement('script');
 if(!existing){s.src=REPAIR_SRC+'?fresh='+Date.now();s.async=false;s.setAttribute('data-hlgb-auditor-repair-9440','1');(document.head||document.documentElement).appendChild(s);state.repairLoads++}
 const p=new Promise(resolve=>{if(window.HLGB_AUDITOR_REPAIR_9440==='94.40')return resolve(true);const done=()=>resolve(window.HLGB_AUDITOR_REPAIR_9440==='94.40');s.addEventListener('load',done,{once:true});s.addEventListener('error',()=>{s.remove();resolve(false)},{once:true});setTimeout(done,8000)});s.__hlgbPromise=p;return p;
}
function ensureButton(){
 const api=window.hlgbAuditorSingleAction9429,h=host();
 if(typeof api?.run!=='function'||!h)return false;
 let btn=document.getElementById(BUTTON_ID);
 if(!btn){btn=document.createElement('button');btn.id=BUTTON_ID;btn.type='button';btn.className='primary';state.created++}
 if(btn.parentElement!==h)h.prepend(btn);
 btn.textContent=state.running?'🧪 Auditando e corrigindo…':'🧪 Auditar e corrigir';
 btn.disabled=state.running;
 btn.hidden=false;
 try{btn.style.setProperty('display','inline-flex','important');btn.style.setProperty('visibility','visible','important');btn.style.setProperty('opacity','1','important');btn.style.setProperty('pointer-events','auto','important')}catch(e){}
 btn.onclick=async()=>{
  if(state.running||window.__HLGB_AUTH_READY!==true)return;
  state.running=true;state.runs++;ensureButton();
  try{
   const loaded=await ensureRepair();
   if(loaded&&typeof window.hlgbAuditorRepair9440?.run==='function')await window.hlgbAuditorRepair9440.run();
   else throw new Error('Não foi possível carregar o reparador. Tente novamente.');
  }
  catch(e){state.errors++;state.lastError=sid(e?.message||e);console.error('[HLGB Auditor '+V+'] ação única reparadora',e)}
  finally{state.running=false;setTimeout(()=>heal('after-run'),0)}
 };
 return true;
}
function heal(reason='manual'){
 stamp();ensureStyle();hideLegacy();const ok=ensureButton();
 if(window.hlgbAuditorRepair9440?.state?.lastSummary)window.hlgbAuditorRepair9440.render(window.hlgbAuditorRepair9440.state.lastSummary);
 state.heals++;state.lastAt=new Date().toISOString();state.lastReason=reason;
 return ok;
}
function burst(reason){[0,40,120,300,700,1400,3000,7000,15000].forEach(ms=>setTimeout(()=>heal(reason+'-'+ms),ms))}
document.addEventListener('click',e=>{if(e.target?.closest?.('#hlgbAuditorNavBtn,#hlgbAuditorOpenBtn'))burst('open-click')},true);
window.addEventListener?.('hlgb:auditor:open',()=>burst('auditor-open'));
window.addEventListener?.('hlgb:authenticated',()=>burst('auth'));
window.addEventListener?.('pageshow',()=>burst('pageshow'));
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>burst('dom-ready'),{once:true});else burst('boot');
window.hlgbAuditorSingleUiReclaim9434A={version:V,state,heal,burst,ensureRepair,status:()=>({...state,buttonPresent:!!document.getElementById(BUTTON_ID),apiReady:typeof window.hlgbAuditorSingleAction9429?.run==='function',repairReady:window.HLGB_AUDITOR_REPAIR_9440==='94.40',appVersion:sid(window.HLGB_RELEASE_VERSION)})};
console.info('[HLGB] Auditor '+V+' interface de ação única restaurada · v94.40 auditar e corrigir');
})();
