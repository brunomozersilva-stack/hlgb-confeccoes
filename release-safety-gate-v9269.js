/* HLGB v92.87 — versão canônica + Auditor somente leitura + estabilização do Assistente + trava do Hub legado */
(function(){
'use strict';
const V='92.87';
const MANIFEST='./release.json';
let auditDepth=0,assistantStable=false,assistantAttempts=0;
window.HLGB_PAID_AI_DISABLED=true;
function lockHubMaster(){
 try{
  if(window.hlgbHubMaster9258)window.HLGB_HUB_MASTER_9258=window.hlgbHubMaster9258;
  else if(!window.HLGB_HUB_MASTER_9258)window.HLGB_HUB_MASTER_9258={active:true,version:window.HLGB_HUB_MASTER_ACTIVE_9258||'92.84+'};
  return true;
 }catch(e){return false}
}
lockHubMaster();
function stampVersion(v=V){try{window.HLGB_RELEASE_VERSION=String(v);const logo=document.querySelector('#appShell .logo small');if(logo)logo.textContent='v'+v;const login=[...document.querySelectorAll('#loginScreen b,#loginScreen small')].find(x=>/vers[aã]o/i.test(x.textContent||''));if(login)login.textContent='Versão v'+v}catch(e){}}
function canonicalUrl(reason='version'){const u=new URL('./app-stable3.html',location.href);u.searchParams.set('fresh',String(Date.now()));u.searchParams.set('reroute',reason);return u.href}
function isCanonicalPath(){return /\/app-stable3\.html$/i.test(location.pathname)}
async function checkCanonicalVersion(reason='check'){
 try{
  const r=await fetch(MANIFEST+'?fresh='+Date.now(),{cache:'no-store'});if(!r.ok)return;
  const m=await r.json(),wanted=String(m?.version||V);
  if(isCanonicalPath()){stampVersion(wanted);return}
  location.replace(canonicalUrl(reason));
 }catch(e){stampVersion(V)}
}
function skipAuditWrite(module){const m=String(module||'');return !!window.HLGB_AUDIT_READ_ONLY_ACTIVE&&m!=='systemAuditRuns'}
function guardFunction(name){const fn=window[name];if(typeof fn!=='function'||fn.__hlgbAuditGuard9269)return;const wrapped=function(){const args=[...arguments],module=args[0];if(skipAuditWrite(module)){console.info('[HLGB Auditor] gravação bloqueada em modo somente leitura:',name,module);return Promise.resolve({ok:true,skipped:true,readOnlyAudit:true,module})}return fn.apply(this,args)};wrapped.__hlgbAuditGuard9269=true;wrapped.__hlgbOriginal=fn;window[name]=wrapped}
function installWriteGuards(){['hlgbRecordSaveWithRetry','hlgbRecordDeleteWithRetry','hlgbRecordSave','hlgbRecordDelete'].forEach(guardFunction)}
async function auditReadOnly(task){auditDepth++;window.HLGB_AUDIT_READ_ONLY_ACTIVE=true;installWriteGuards();try{return await task()}finally{auditDepth=Math.max(0,auditDepth-1);if(!auditDepth)window.HLGB_AUDIT_READ_ONLY_ACTIVE=false}}
function wrapAuditButton(name){const fn=window[name];if(typeof fn!=='function'||fn.__hlgbAuditReadOnly9269)return;const w=function(){const that=this,args=arguments;return auditReadOnly(()=>fn.apply(that,args))};w.__hlgbAuditReadOnly9269=true;w.__hlgbOriginal=fn;window[name]=w}
function installAuditGuards(){installWriteGuards();['hlgbAuditorRunVisualSweep','hlgbAuditorExportVisual'].forEach(wrapAuditButton)}
function safeVersionCheck(reason){installAuditGuards();bridgeDb();lockHubMaster();return checkCanonicalVersion(reason)}
function bridgeDb(){try{if(typeof db!=='undefined'&&db&&window.db!==db)window.db=db;return !!window.db}catch(e){return false}}
function chainHas(fn,marker){const seen=new Set();while(typeof fn==='function'&&!seen.has(fn)){if(fn[marker])return true;seen.add(fn);fn=fn.__original||fn.__hlgbOriginal}return false}
function stabilizeAssistant(){
 bridgeDb();
 const cur=window.hlgbAssistantAsk;
 if(typeof cur!=='function')return false;
 if(cur.__hlgbCanonical9284){assistantStable=true;return true}
 if(!chainHas(cur,'__v9257')&&assistantAttempts++<8){setTimeout(stabilizeAssistant,350);return false}
 try{window.hlgbAssistantBrain9265?.install?.()}catch(e){console.warn('[HLGB] brain install único',e)}
 try{window.hlgbAssistantPrecisionV2?.install?.()}catch(e){console.warn('[HLGB] precisão install único',e)}
 const base=window.hlgbAssistantAsk;if(typeof base!=='function')return false;
 const stable=function(){return base.apply(this,arguments)};
 stable.__hlgbCanonical9284=true;
 stable.__v9257=true;
 stable.__hlgbBrain9265=true;
 stable.__hlgbPrecisionV2=true;
 stable.__original=base;
 window.hlgbAssistantAsk=stable;
 assistantStable=true;
 window.HLGB_ASSISTANT_ROUTER_STABLE='92.84';
 return true;
}
function loadAssistantLight(){try{if(document.getElementById('hlgbAssistantLight9277Script')||window.hlgbAssistantLight9277)return;const s=document.createElement('script');s.id='hlgbAssistantLight9277Script';s.src='./release-assistant-ui-light-v9277.js?fresh='+Date.now();s.async=true;document.head.appendChild(s)}catch(e){console.warn('[HLGB] falha ao carregar UI leve do Assistente',e)}}
function boot(){
 lockHubMaster();installAuditGuards();bridgeDb();
 loadAssistantLight();setTimeout(loadAssistantLight,700);
 setTimeout(stabilizeAssistant,1800);setTimeout(()=>{if(!assistantStable)stabilizeAssistant()},4200);
 setTimeout(installAuditGuards,500);setTimeout(installAuditGuards,1800);
 window.addEventListener('pageshow',()=>{lockHubMaster();safeVersionCheck('pageshow');setTimeout(stabilizeAssistant,150)});
 window.addEventListener('focus',()=>{lockHubMaster();safeVersionCheck('focus')});
 document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'){lockHubMaster();safeVersionCheck('resume');setTimeout(stabilizeAssistant,150)}});
 setInterval(()=>{lockHubMaster();installAuditGuards();bridgeDb()},15000);
 checkCanonicalVersion('startup')
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
window.hlgbSafetyGate9269={version:V,checkCanonicalVersion,auditReadOnly,installAuditGuards,bridgeDb,stabilizeAssistant,lockHubMaster};
console.info('[HLGB] Safety Gate v'+V+' ativo · Hub legado bloqueado · Assistente estabilizado');
})();