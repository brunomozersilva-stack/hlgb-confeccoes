/* HLGB v92.66 — versão canônica + Auditor somente leitura */
(function(){
'use strict';
const V='92.66';
const MANIFEST='./release.json';
let auditDepth=0;
function stampVersion(v=V){
  try{
    window.HLGB_RELEASE_VERSION=String(v);
    const logo=document.querySelector('#appShell .logo small');if(logo)logo.textContent='v'+v;
    const login=[...document.querySelectorAll('#loginScreen b,#loginScreen small')].find(x=>/vers[aã]o/i.test(x.textContent||''));
    if(login)login.textContent='Versão v'+v;
  }catch(e){}
}
function canonicalUrl(reason='version'){
  const u=new URL('./app-stable3.html',location.href);
  u.searchParams.set('fresh',String(Date.now()));u.searchParams.set('reroute',reason);return u.href;
}
function isCanonicalPath(){return /\/app-stable3\.html$/i.test(location.pathname)}
async function checkCanonicalVersion(reason='check'){
  try{
    const r=await fetch(MANIFEST+'?fresh='+Date.now(),{cache:'no-store'});if(!r.ok)return;
    const m=await r.json(),current=String(window.HLGB_RELEASE_VERSION||'0'),wanted=String(m?.version||V),min=String(m?.minimum_version||wanted);
    const n=x=>Number(String(x).replace(/[^0-9.]/g,''))||0;
    if(!isCanonicalPath()||n(current)<n(min)){location.replace(canonicalUrl(reason));return}
    stampVersion(wanted);
  }catch(e){stampVersion(V)}
}
function skipAuditWrite(module){const m=String(module||'');return !!window.HLGB_AUDIT_READ_ONLY_ACTIVE&&m!=='systemAuditRuns'}
function guardFunction(name){
  const fn=window[name];if(typeof fn!=='function'||fn.__hlgbAuditGuard9266)return;
  const wrapped=function(){const args=[...arguments],module=args[0];if(skipAuditWrite(module)){console.info('[HLGB Auditor] gravação bloqueada em modo somente leitura:',name,module);return Promise.resolve({ok:true,skipped:true,readOnlyAudit:true,module})}return fn.apply(this,args)};
  wrapped.__hlgbAuditGuard9266=true;wrapped.__hlgbOriginal=fn;window[name]=wrapped;
}
function installWriteGuards(){['hlgbRecordSaveWithRetry','hlgbRecordDeleteWithRetry','hlgbRecordSave','hlgbRecordDelete'].forEach(guardFunction)}
async function auditReadOnly(task){auditDepth++;window.HLGB_AUDIT_READ_ONLY_ACTIVE=true;installWriteGuards();try{return await task()}finally{auditDepth=Math.max(0,auditDepth-1);if(!auditDepth)window.HLGB_AUDIT_READ_ONLY_ACTIVE=false}}
function wrapAuditButton(name){const fn=window[name];if(typeof fn!=='function'||fn.__hlgbAuditReadOnly9266)return;const w=function(){const that=this,args=arguments;return auditReadOnly(()=>fn.apply(that,args))};w.__hlgbAuditReadOnly9266=true;w.__hlgbOriginal=fn;window[name]=w}
function installAuditGuards(){installWriteGuards();['hlgbAuditorRunVisualSweep','hlgbAuditorExportVisual'].forEach(wrapAuditButton)}
function boot(){
  stampVersion(V);installAuditGuards();setTimeout(installAuditGuards,500);setTimeout(installAuditGuards,1800);
  window.addEventListener('pageshow',()=>{stampVersion(V);installAuditGuards();checkCanonicalVersion('pageshow')});
  window.addEventListener('focus',()=>checkCanonicalVersion('focus'));
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')checkCanonicalVersion('resume')});
  setInterval(()=>{stampVersion(V);installAuditGuards()},15000);checkCanonicalVersion('startup');
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
window.hlgbSafetyGate9266={version:V,checkCanonicalVersion,auditReadOnly,installAuditGuards};
console.info('[HLGB] Safety Gate v'+V+' ativo');
})();
