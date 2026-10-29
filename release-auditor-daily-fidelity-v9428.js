/* HLGB v94.28 — fidelidade do Relatório Diário do Auditor */
(function(){
'use strict';
if(window.HLGB_AUDITOR_DAILY_FIDELITY_9428)return;
const V='94.28';
const DAILY_LATEST_KEY='hlgb_auditor_daily_report_latest_v9427';
const DAILY_PREFIX='hlgb_auditor_daily_report_v9427_';
const RUN_BUTTON='hlgbAuditorUnifiedRun9427';
const DOWNLOAD_BUTTON='hlgbAuditorDailyDownload9427';
const q=v=>Math.max(0,Number(v)||0);
const sid=v=>String(v??'');
function stamp(){try{if((Number(window.HLGB_RELEASE_VERSION)||0)<94.28)window.HLGB_RELEASE_VERSION=V}catch(e){}window.HLGB_AUDITOR_RELEASE_VERSION=V}
function statusFromSummary(s){if(q(s?.fail)>0)return 'fail';if(q(s?.warn)>0)return 'warn';if(q(s?.pass)>0)return 'pass';return 'info'}
function operational(main){
 const direct=main?.operational?.summary||main?.result?.operational?.summary||main?.supportBlackbox?.operational?.summary||null;
 if(direct)return {pass:q(direct.pass),warn:q(direct.warn),fail:q(direct.fail),result:direct.result||statusFromSummary(direct)};
 const s=main?.summary||main?.totals||main?.result?.summary||null;
 if(s&&(s.operationalPass!=null||s.operationalWarn!=null||s.operationalFail!=null)){
  const out={pass:q(s.operationalPass),warn:q(s.operationalWarn),fail:q(s.operationalFail)};out.result=out.fail?'Falhou':out.warn?'Atenção':out.pass?'Aprovado':'Sem dados';return out;
 }
 return null;
}
function pending(main){
 const op=main?.operational||main?.result?.operational||main?.supportBlackbox?.operational||null;
 let unique=Number(op?.pending?.unique);
 let records=Number(op?.pending?.records),wal=Number(op?.pending?.wal),copies=Number(op?.pending?.totalCopies);
 if(!Number.isFinite(unique)){
  const c=Array.isArray(op?.checks)?op.checks.find(x=>x?.code==='operational:pending'):null;
  unique=Number(c?.pending?.unique);records=Number(c?.pending?.records);wal=Number(c?.pending?.wal);copies=Number(c?.pending?.totalCopies);
 }
 return {unique:Number.isFinite(unique)?Math.max(0,unique):null,records:Number.isFinite(records)?Math.max(0,records):null,wal:Number.isFinite(wal)?Math.max(0,wal):null,totalCopies:Number.isFinite(copies)?Math.max(0,copies):null};
}
function patchCurrent(){
 stamp();
 const last=window.HLGB_AUDITOR_SINGLE_ACTION_LAST||window.hlgbAuditorSingleAction9427?.last;
 const daily=last?.daily;if(!daily)return false;
 const op=operational(last.main),p=pending(last.main);
 daily.version=V;daily.appVersion=V;
 if(op)daily.operations={status:statusFromSummary(op),summary:{pass:op.pass,warn:op.warn,fail:op.fail,result:op.result}};
 daily.health=daily.health||{};
 if(p.unique!=null)daily.health.pendingUnique=p.unique;
 if(p.records!=null)daily.health.pendingRecords=p.records;
 if(p.wal!=null)daily.health.pendingWal=p.wal;
 if(p.totalCopies!=null)daily.health.pendingCopies=p.totalCopies;
 daily.fidelity={version:V,operationalSource:op?'main.operational':'fallback',pendingSource:p.unique!=null?'main.operational':'intelligence',patchedAt:new Date().toISOString()};
 try{localStorage.setItem(DAILY_LATEST_KEY,JSON.stringify(daily));if(daily.date)localStorage.setItem(DAILY_PREFIX+daily.date,JSON.stringify(daily))}catch(e){}
 return daily;
}
function schedulePatch(){[250,1000,5000,15000,30000,45000,60000].forEach(ms=>setTimeout(patchCurrent,ms))}
document.addEventListener('click',e=>{
 const id=e.target?.closest?.('button')?.id||'';
 if(id===RUN_BUTTON)schedulePatch();
 if(id===DOWNLOAD_BUTTON)patchCurrent();
},true);
function install(){stamp();patchCurrent()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
[120,600,1800,5000].forEach(ms=>setTimeout(install,ms));
window.addEventListener?.('pageshow',()=>setTimeout(install,50));
window.HLGB_AUDITOR_DAILY_FIDELITY_9428=V;
window.hlgbAuditorDailyFidelity9428={version:V,install,patchCurrent,operational,pending,statusFromSummary};
console.info('[HLGB] Auditor Daily Fidelity v'+V+' ativo');
})();