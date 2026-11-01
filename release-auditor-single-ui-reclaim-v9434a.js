/* HLGB v94.34a — restaura a interface de ação única do Auditor sem alterar sincronização. */
(function(){
'use strict';
const V='94.34a',APP_BASE='94.41';
if(window.HLGB_AUDITOR_SINGLE_UI_RECLAIM_9434A===V)return;
window.HLGB_AUDITOR_SINGLE_UI_RECLAIM_9434A=V;
const BUTTON_ID='hlgbAuditorUnifiedRun9434A';
const STYLE_ID='hlgbAuditorSingleUiReclaim9434A';
const REPAIR_SRC='./release-auditor-autocorrect-v9441.js';
const LEGACY_REPAIR_SRC='./release-auditor-repair-v9440.js';
const LEGACY_IDS=[
 'hlgbAuditorUnifiedRun9426','hlgbAuditorUnifiedRun9427','hlgbAuditorUnifiedRun9429','hlgbMultiuserOpen','hlgbSmartTest','hlgbSmartProblem','hlgbSmartHistoryBtn',
 'hlgbAuthorityBtn9374','hlgbBootAnalysisBtn9381','hlgbAuditorIntelligenceBtn9396','hlgbAuditorBusinessBtn9401','hlgbDailyReport9368',
 'hlgbAuditorMaxDebug9292','hlgbAuditorBlackbox9299','hlgbAuditFull9315','hlgbAuditCritical9315','hlgbAuditDownloadFull9315',
 'hlgbAuditDownloadCritical9315','hlgbAuditorHubDeep9315'
];
const TOOL_IDS=['hlgbBootTools9381'];
const state={version:V,appBase:APP_BASE,heals:0,created:0,runs:0,errors:0,running:false,repairLoads:0,observerBinds:0,lastAt:'',lastReason:'',lastError:''};
let actionObserver=null,actionObserverHost=null,observerQueued=false;
const sid=v=>String(v??'');
function stamp(){
 try{if((parseFloat(sid(window.HLGB_RELEASE_VERSION))||0)<94.41)window.HLGB_RELEASE_VERSION=APP_BASE}catch(e){}
 try{const el=document.querySelector('#appShell .logo small');if(el&&((parseFloat(sid(el.textContent).replace(/^v/i,''))||0)<94.41))el.textContent='v'+APP_BASE}catch(e){}
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
function setImportant(el,name,value){
 try{if(el.style.getPropertyValue(name)!==value||el.style.getPropertyPriority(name)!=='important')el.style.setProperty(name,value,'important')}catch(e){}
}
function hideElement(el){
 if(!el||el.id===BUTTON_ID)return;
 try{if(!el.hidden)el.hidden=true;if(el.getAttribute('aria-hidden')!=='true')el.setAttribute('aria-hidden','true');setImportant(el,'display','none');setImportant(el,'visibility','hidden');setImportant(el,'opacity','0');setImportant(el,'pointer-events','none')}catch(e){}
}
function showButton(btn){
 if(!btn)return;
 try{if(btn.hidden)btn.hidden=false;if(btn.hasAttribute('aria-hidden'))btn.removeAttribute('aria-hidden');setImportant(btn,'display','inline-flex');setImportant(btn,'visibility','visible');setImportant(btn,'opacity','1');setImportant(btn,'pointer-events','auto');setImportant(btn,'align-items','center')}catch(e){}
}
function hideLegacy(){
 document.querySelectorAll('.hlgb-auditor-actions > button').forEach(hideElement);
 for(const id of LEGACY_IDS)hideElement(document.getElementById(id));
 for(const id of TOOL_IDS){const el=document.getElementById(id);if(el){try{if(!el.hidden)el.hidden=true;if(el.getAttribute('aria-hidden')!=='true')el.setAttribute('aria-hidden','true');setImportant(el,'display','none');setImportant(el,'visibility','hidden')}catch(e){}}}
}
function enforceActions(h=host()){
 if(!h)return false;
 try{h.querySelectorAll(':scope > button').forEach(el=>el.id===BUTTON_ID?showButton(el):hideElement(el))}catch(e){document.querySelectorAll('.hlgb-auditor-actions > button').forEach(el=>el.id===BUTTON_ID?showButton(el):hideElement(el))}
 return true;
}
function ensureActionObserver(){
 const h=host();
 if(!h||typeof MutationObserver!=='function')return false;
 if(actionObserver&&actionObserverHost===h){enforceActions(h);return true}
 try{actionObserver?.disconnect?.()}catch(e){}
 actionObserverHost=h;
 actionObserver=new MutationObserver(mutations=>{
  const relevant=mutations.some(m=>m.type==='childList'||(m.type==='attributes'&&m.target?.tagName==='BUTTON'));
  if(!relevant||observerQueued)return;
  observerQueued=true;
  const run=()=>{observerQueued=false;if(actionObserverHost?.isConnected!==false)enforceActions(actionObserverHost)};
  if(typeof queueMicrotask==='function')queueMicrotask(run);else setTimeout(run,0);
 });
 try{actionObserver.observe(h,{childList:true,subtree:true,attributes:true,attributeFilter:['style','hidden','class','aria-hidden']});state.observerBinds++;enforceActions(h);return true}catch(e){actionObserver=null;actionObserverHost=null;return false}
}
function ensureRepair(){
 if(window.HLGB_AUDITOR_AUTOCORRECT_9441==='94.41'&&typeof window.hlgbAuditorAutoCorrect9441?.run==='function')return Promise.resolve(true);
 if(window.__HLGB_AUTH_READY!==true)return Promise.resolve(false);
 const existing=document.querySelector('script[data-hlgb-auditor-autocorrect-9441]');
 if(existing?.__hlgbPromise)return existing.__hlgbPromise;
 const s=existing||document.createElement('script');
 if(!existing){s.src=REPAIR_SRC+'?fresh='+Date.now();s.async=false;s.setAttribute('data-hlgb-auditor-autocorrect-9441','1');(document.head||document.documentElement).appendChild(s);state.repairLoads++}
 const p=new Promise(resolve=>{if(window.HLGB_AUDITOR_AUTOCORRECT_9441==='94.41')return resolve(true);const done=()=>resolve(window.HLGB_AUDITOR_AUTOCORRECT_9441==='94.41');s.addEventListener('load',done,{once:true});s.addEventListener('error',()=>{s.remove();resolve(false)},{once:true});setTimeout(done,8000)});s.__hlgbPromise=p;return p;
}
function ensureButton(){
 const api=window.hlgbAuditorSingleAction9429,h=host();
 if(typeof api?.run!=='function'||!h)return false;
 let btn=document.getElementById(BUTTON_ID);
 if(!btn){btn=document.createElement('button');btn.id=BUTTON_ID;btn.type='button';btn.className='primary';state.created++}
 if(btn.parentElement!==h)h.prepend(btn);
 btn.textContent=state.running?'🧠 Auditando e autocorrigindo…':'🧪 Auditar e corrigir';
 btn.disabled=state.running;
 showButton(btn);
 btn.onclick=async()=>{
  if(state.running||window.__HLGB_AUTH_READY!==true)return;
  state.running=true;state.runs++;ensureButton();hideLegacy();ensureActionObserver();
  try{
   const loaded=await ensureRepair();
   if(loaded&&typeof window.hlgbAuditorAutoCorrect9441?.run==='function')await window.hlgbAuditorAutoCorrect9441.run({reason:'manual-button',download:true,render:true});
   else throw new Error('Não foi possível carregar o autocorretor. Tente novamente.');
  }
  catch(e){state.errors++;state.lastError=sid(e?.message||e);console.error('[HLGB Auditor '+V+'] ação única autocorretora',e)}
  finally{state.running=false;setTimeout(()=>heal('after-run'),0)}
 };
 hideLegacy();showButton(btn);ensureActionObserver();enforceActions(h);
 return true;
}
function heal(reason='manual'){
 stamp();ensureStyle();hideLegacy();const ok=ensureButton();hideLegacy();ensureActionObserver();enforceActions();showButton(document.getElementById(BUTTON_ID));
 if(window.hlgbAuditorAutoCorrect9441?.state?.lastSummary)window.hlgbAuditorAutoCorrect9441.render?.(window.hlgbAuditorAutoCorrect9441.state.lastSummary);
 state.heals++;state.lastAt=new Date().toISOString();state.lastReason=reason;
 return ok;
}
function burst(reason){[0,40,120,300,700,1400,3000,7000,15000].forEach(ms=>setTimeout(()=>heal(reason+'-'+ms),ms))}
document.addEventListener('click',e=>{if(e.target?.closest?.('#hlgbAuditorNavBtn,#hlgbAuditorOpenBtn'))burst('open-click')},true);
window.addEventListener?.('hlgb:auditor:open',()=>burst('auditor-open'));
window.addEventListener?.('hlgb:authenticated',()=>burst('auth'));
window.addEventListener?.('pageshow',()=>burst('pageshow'));
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>burst('dom-ready'),{once:true});else burst('boot');
window.hlgbAuditorSingleUiReclaim9434A={version:V,state,heal,burst,ensureRepair,enforceActions,status:()=>({...state,buttonPresent:!!document.getElementById(BUTTON_ID),apiReady:typeof window.hlgbAuditorSingleAction9429?.run==='function',repairReady:window.HLGB_AUDITOR_AUTOCORRECT_9441==='94.41',observerActive:!!actionObserver,appVersion:sid(window.HLGB_RELEASE_VERSION),legacyRepairSrc:LEGACY_REPAIR_SRC})};
console.info('[HLGB] Auditor '+V+' interface de ação única restaurada · v94.41 autocorreção silenciosa');
})();