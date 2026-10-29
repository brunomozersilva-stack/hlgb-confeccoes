/* HLGB v94.27 — Auditor único com relatório diário e aprendizado histórico */
(function(){
'use strict';
if(window.HLGB_AUDITOR_SINGLE_ACTION_9427)return;
const V='94.27';
const BUTTON_ID='hlgbAuditorUnifiedRun9427';
const BASELINE_KEY='hlgb_auditor_intelligence_baseline_v9396';
const HISTORY_KEY='hlgb_auditor_learning_history_v9427';
const DAILY_LATEST_KEY='hlgb_auditor_daily_report_latest_v9427';
const DAILY_INDEX_KEY='hlgb_auditor_daily_report_index_v9427';
const DAILY_PREFIX='hlgb_auditor_daily_report_v9427_';
const LEGACY_IDS=[
 'hlgbAuditorUnifiedRun9426','hlgbMultiuserOpen','hlgbSmartTest','hlgbSmartProblem','hlgbSmartHistoryBtn','hlgbAuthorityBtn9374','hlgbBootAnalysisBtn9381',
 'hlgbAuditorIntelligenceBtn9396','hlgbAuditorBusinessBtn9401','hlgbDailyReport9368','hlgbAuditorMaxDebug9292','hlgbAuditorBlackbox9299',
 'hlgbAuditFull9315','hlgbAuditCritical9315','hlgbAuditDownloadFull9315','hlgbAuditDownloadCritical9315','hlgbAuditorHubDeep9315'
];
const TOOL_CONTAINERS=['hlgbBootTools9381'];
let running=false,lastRun=null;
const sid=v=>String(v??'');
const esc=v=>sid(v).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const clone=v=>{try{return structuredClone(v)}catch(e){try{return JSON.parse(JSON.stringify(v))}catch(_){return v}}};
function readJson(k,f=null){try{const x=JSON.parse(localStorage.getItem(k)||'null');return x??f}catch(e){return f}}
function writeJson(k,v){try{localStorage.setItem(k,JSON.stringify(v));return true}catch(e){return false}}
function localDay(d=new Date()){const p=n=>String(n).padStart(2,'0');return d.getFullYear()+'-'+p(d.getMonth()+1)+'-'+p(d.getDate())}
function auditorRoot(){const status=document.getElementById('hlgbSmartStatus');return status?.closest?.('[role="dialog"],.modal,.modal-content,.modalCard,.modal-card,.dialog')||status?.parentElement?.parentElement||document.querySelector('.hlgb-auditor-actions')?.parentElement||null}
function actionHost(){return auditorRoot()?.querySelector?.('.hlgb-auditor-actions')||document.querySelector('.hlgb-auditor-actions')||null}
function visible(el){try{const s=getComputedStyle(el),r=el.getBoundingClientRect();return !el.hidden&&s.display!=='none'&&s.visibility!=='hidden'&&r.width>0&&r.height>0}catch(e){return !el?.hidden}}
function ensureStyle(){
 let st=document.getElementById('hlgbAuditorSingleStyle9427');
 if(!st){st=document.createElement('style');st.id='hlgbAuditorSingleStyle9427';(document.head||document.documentElement).appendChild(st)}
 st.textContent=['.hlgb-auditor-actions>button:not(#'+BUTTON_ID+'){display:none!important;visibility:hidden!important}',...LEGACY_IDS.map(id=>'#'+id+'{display:none!important;visibility:hidden!important}'),...TOOL_CONTAINERS.map(id=>'#'+id+'{display:none!important;visibility:hidden!important}'),'#'+BUTTON_ID+'{display:inline-block!important;visibility:visible!important}'].join('');
}
function retireLegacy(){for(const id of LEGACY_IDS){const el=document.getElementById(id);if(el&&el.id!==BUTTON_ID)el.remove()}for(const id of TOOL_CONTAINERS){document.getElementById(id)?.remove()}try{window.hlgbAuditorHubReliability9315?.stopMaintenance?.()}catch(e){}}
function validate(){
 const host=actionHost(),buttons=host?[...host.querySelectorAll('button')].filter(visible):[],legacyVisible=LEGACY_IDS.filter(id=>{const el=document.getElementById(id);return !!el&&visible(el)});
 const shellLoaded=!!window.hlgbAuditorShell9382, shellAuthority=!shellLoaded||(window.HLGB_AUDITOR_SHELL_AUTHORITY==='93.82'&&window.openHlgbAuditor===window.hlgbAuditorShell9382?.open);
 const result={version:V,ok:!!host&&buttons.length===1&&buttons[0]?.id===BUTTON_ID&&legacyVisible.length===0&&shellAuthority,count:buttons.length,ids:buttons.map(x=>x.id||sid(x.textContent).trim()),legacyVisible,shellAuthority,at:new Date().toISOString()};
 window.HLGB_AUDITOR_SINGLE_ACTION_TEST=result;return result;
}
function statusOf(x){const s=sid(x?.status||x?.summary?.result||x?.result).toLowerCase();if(/fail|falh|error|erro/.test(s))return 'fail';if(/warn|aten|partial|parcial/.test(s))return 'warn';if(/pass|ok|success|certo|aprov/.test(s))return 'pass';return 'info'}
function compact(v,depth=0){
 if(v==null||typeof v==='string'||typeof v==='number'||typeof v==='boolean')return v;
 if(depth>=3)return Array.isArray(v)?'[array '+v.length+']':'[object]';
 if(Array.isArray(v))return v.slice(0,12).map(x=>compact(x,depth+1));
 const out={};for(const [k,x] of Object.entries(v).slice(0,30))out[k]=compact(x,depth+1);return out;
}
function history(){const x=readJson(HISTORY_KEY,[]);return Array.isArray(x)?x:[]}
function learningSummary(report,saved,beforeCount,afterCount){
 const cmp=report?.comparison?.summary||{};
 return {saved:!!saved,baselineAt:report?.current?.at||null,historyBefore:beforeCount,historyAfter:afterCount,comparisonAvailable:!!report?.comparison?.available,improved:+cmp.improved||0,regressed:+cmp.regressed||0,same:+cmp.same||0,info:+cmp.info||0,freshness:report?.freshness?.status||'unknown'};
}
async function collectIntelligenceLearning(){
 const intel=window.hlgbAuditorIntelligence9396;
 if(typeof intel?.collect!=='function')return {report:null,learning:{saved:false,reason:'Inteligência indisponível',historyBefore:history().length,historyAfter:history().length}};
 const beforeBaseline=readJson(BASELINE_KEY,null),beforeHistory=history();
 const report=await intel.collect({saveBaseline:true});
 const afterBaseline=readJson(BASELINE_KEY,null);
 const saved=!!afterBaseline&&afterBaseline.at===report?.current?.at&&afterBaseline.at!==beforeBaseline?.at;
 let rows=beforeHistory;
 if(saved){
  const entry={at:report.current.at,appVersion:report.current.appVersion||'',metrics:clone(report.current.metrics||{}),comparison:clone(report.comparison?.summary||{}),recommendations:(report.recommendations||[]).slice(0,20).map(r=>({priority:r.priority||'',code:r.code||'',detail:r.detail||''}))};
  rows=beforeHistory.filter(x=>x?.at!==entry.at);rows.push(entry);rows=rows.slice(-50);writeJson(HISTORY_KEY,rows);
 }
 return {report,learning:learningSummary(report,saved,beforeHistory.length,rows.length)};
}
async function collectDeep(){
 const out={at:new Date().toISOString(),readOnly:true};
 try{out.authority=window.hlgbAuditorAuthority9374?.scan?.()||null}catch(e){out.authority={status:'error',error:sid(e?.message||e)}}
 try{out.boot=window.hlgbAuditorBootAnalysis9381?.analyze?.()||null}catch(e){out.boot={status:'error',error:sid(e?.message||e)}}
 try{const z=await collectIntelligenceLearning();out.intelligence=z.report;out.learning=z.learning}catch(e){out.intelligence={status:'error',error:sid(e?.message||e)};out.learning={saved:false,reason:sid(e?.message||e),historyBefore:history().length,historyAfter:history().length}}
 try{const business=window.hlgbAuditorBusiness9401;if(typeof business?.collect==='function')out.business=await business.collect({readOnly:true});else if(typeof business?.analyze==='function')out.business=await business.analyze();else out.business=null}catch(e){out.business={status:'error',error:sid(e?.message||e)}}
 return out;
}
function buildDailyReport(main,deep){
 const day=localDay(),now=new Date().toISOString(),old=readJson(DAILY_PREFIX+day,null),intel=deep?.intelligence,current=intel?.current||{},cmp=intel?.comparison?.summary||{};
 const report={
  kind:'hlgb_auditor_daily_report',version:V,date:day,firstRunAt:old?.firstRunAt||now,lastRunAt:now,runCount:(Number(old?.runCount)||0)+1,readOnly:true,
  appVersion:sid(window.HLGB_RELEASE_VERSION||''),
  main:{status:statusOf(main),summary:compact(main?.summary||main?.totals||main?.result?.summary||null)},
  architecture:{status:statusOf(deep?.authority),summary:compact(deep?.authority?.summary||null)},
  boot:{status:statusOf(deep?.boot),summary:compact(deep?.boot?.summary||deep?.boot||null)},
  operations:{status:statusOf(deep?.business),summary:compact(deep?.business?.summary||deep?.business||null)},
  intelligence:{status:statusOf(intel),freshness:intel?.freshness?.status||'unknown',comparison:{available:!!intel?.comparison?.available,improved:+cmp.improved||0,regressed:+cmp.regressed||0,same:+cmp.same||0,info:+cmp.info||0},recommendations:(intel?.recommendations||[]).slice(0,20).map(r=>({priority:r.priority||'',code:r.code||'',detail:r.detail||''})),metrics:compact(current.metrics||{})},
  learning:clone(deep?.learning||{saved:false}),
  health:{pendingUnique:+current?.queues?.unique||0,pendingBusiness:+current?.queues?.businessActive||0,pendingTechnicalRecent:+current?.queues?.technicalRecent||0,pendingTechnicalHistorical:+current?.queues?.technicalHistorical||0,projectionOrphans:+current?.projectionIntegrity?.count||0,projectionOrphansUnresolved:+current?.projectionIntegrity?.unresolved||0,duplicateScripts:Array.isArray(current?.duplicateScripts)?current.duplicateScripts.length:0,auditorUiConflict:!!current?.auditorUi?.conflict}
 };
 writeJson(DAILY_PREFIX+day,report);writeJson(DAILY_LATEST_KEY,report);
 let idx=readJson(DAILY_INDEX_KEY,[]);if(!Array.isArray(idx))idx=[];idx=idx.filter(x=>x!==day);idx.push(day);while(idx.length>31){const d=idx.shift();try{localStorage.removeItem(DAILY_PREFIX+d)}catch(e){}}writeJson(DAILY_INDEX_KEY,idx);
 return report;
}
function downloadDaily(report){try{const data=report||lastRun?.daily||readJson(DAILY_LATEST_KEY,null);if(!data)return false;const b=new Blob([JSON.stringify(data,null,2)],{type:'application/json;charset=utf-8'}),u=URL.createObjectURL(b),a=document.createElement('a');a.href=u;a.download='hlgb-relatorio-diario-'+(data.date||localDay())+'.json';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),1000);return true}catch(e){return false}}
function renderUnifiedMeta(deep,daily){
 const host=document.getElementById('hlgbAuditorResult');if(!host)return;
 document.getElementById('hlgbAuditorUnifiedMeta9427')?.remove();
 const box=document.createElement('div');box.id='hlgbAuditorUnifiedMeta9427';box.className='panel';box.style.cssText='margin:10px 0;border:1px solid #d8d0dc;background:#fbf9fc';
 const items=[['Arquitetura',deep?.authority],['Boot / cargas',deep?.boot],['Inteligência',deep?.intelligence],['Operação',deep?.business]].filter(x=>x[1]);
 const rows=items.map(([name,data])=>{const st=statusOf(data),icon=st==='fail'?'🔴':st==='warn'?'🟡':st==='pass'?'✅':'⚪';return '<div class="sub">'+icon+' <b>'+esc(name)+'</b> · '+esc(st==='info'?'coletado':st)+'</div>'}).join('');
 const l=deep?.learning||{},learnIcon=l.saved?'✅':'🟡',cmp=daily?.intelligence?.comparison||{};
 box.innerHTML='<h3 style="margin-top:0">Auditoria única · v'+V+'</h3><div class="sub">Uma única entrada executa a auditoria principal, arquitetura, boot, operação, inteligência, aprendizado e relatório diário.</div>'+rows+'<div class="sub" style="margin-top:8px">'+learnIcon+' <b>Aprendizado:</b> '+(l.saved?'rodada salva no histórico ('+l.historyAfter+'/50).':'rodada não salva; '+esc(l.reason||('build '+(l.freshness||'não confirmado'))))+'.</div><div class="sub">📅 <b>Relatório diário '+esc(daily?.date||'')+':</b> '+(daily?.runCount||1)+' auditoria(s) hoje · melhorou '+(cmp.improved||0)+' · piorou '+(cmp.regressed||0)+'.</div><div style="margin-top:10px"><button id="hlgbAuditorDailyDownload9427" type="button" class="secondary">⬇️ Baixar relatório diário</button></div>';
 box.querySelector('#hlgbAuditorDailyDownload9427')?.addEventListener('click',()=>downloadDaily(daily));host.prepend(box);
}
async function runUnified(){
 if(running)return false;running=true;const btn=document.getElementById(BUTTON_ID),old=btn?.textContent||'🧪 Auditar sistema';if(btn){btn.disabled=true;btn.textContent='🧪 Auditando…'}
 try{
  let main=null;if(typeof window.hlgbAuditorSmartRun==='function')main=await Promise.resolve(window.hlgbAuditorSmartRun());else if(typeof window.hlgbAuditorRunFull==='function')main=await Promise.resolve(window.hlgbAuditorRunFull());else throw new Error('Rotina principal do Auditor não está disponível.');
  const deep=await collectDeep(),daily=buildDailyReport(main,deep);lastRun={version:V,at:new Date().toISOString(),main,deep,daily,ui:null};window.HLGB_AUDITOR_SINGLE_ACTION_LAST=lastRun;renderUnifiedMeta(deep,daily);lastRun.ui=validate();return lastRun;
 }catch(e){console.error('[HLGB Auditor '+V+'] auditoria única',e);const host=document.getElementById('hlgbAuditorResult');if(host)host.insertAdjacentHTML('afterbegin','<div class="panel bad"><b>Falha ao executar a auditoria única.</b><div class="sub">'+esc(e?.message||e)+'</div></div>');return false}
 finally{running=false;if(btn){btn.disabled=false;btn.textContent=old}scheduleCanonicalize()}
}
function canonicalize(){ensureStyle();retireLegacy();const host=actionHost();if(!host)return false;[...host.querySelectorAll('button')].forEach(b=>{if(b.id!==BUTTON_ID)b.remove()});let btn=document.getElementById(BUTTON_ID);if(!btn){btn=document.createElement('button');btn.id=BUTTON_ID;btn.type='button';btn.className='primary';host.prepend(btn)}btn.textContent=running?'🧪 Auditando…':'🧪 Auditar sistema';btn.disabled=running;btn.onclick=runUnified;btn.hidden=false;btn.style.removeProperty('display');btn.style.removeProperty('visibility');validate();return true}
function scheduleCanonicalize(){[0,80,220,500,1000,2200,4200,8000,14000].forEach(ms=>setTimeout(canonicalize,ms))}
function patchOpenModal(){const f=window.openModal;if(typeof f!=='function'||f.__hlgbAuditorSingle9427)return false;const w=function(title){const r=f.apply(this,arguments);if(/auditor|testador hlgb/i.test(sid(title)))scheduleCanonicalize();return r};w.__hlgbAuditorSingle9427=true;w.__original=f;window.openModal=w;return true}
function stamp(){try{if((Number(window.HLGB_RELEASE_VERSION)||0)<94.27)window.HLGB_RELEASE_VERSION='94.27'}catch(e){}window.HLGB_AUDITOR_RELEASE_VERSION=V}
function install(){ensureStyle();patchOpenModal();retireLegacy();if(actionHost())canonicalize();stamp();return true}
function boot(){install();[120,400,1000,2200,4200,8000,14000].forEach(ms=>setTimeout(()=>{install();if(actionHost())validate()},ms))}
window.HLGB_AUDITOR_SINGLE_ACTION_9427=V;
window.hlgbAuditorSingleAction9427={version:V,install,canonicalize,validate,run:runUnified,collectDeep,buildDailyReport,downloadDaily,history,get last(){return lastRun},get latestDaily(){return readJson(DAILY_LATEST_KEY,null)}};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
try{if(typeof window.hlgbAfterLogin==='function')window.hlgbAfterLogin(()=>setTimeout(boot,200),0)}catch(e){}
window.addEventListener?.('pageshow',()=>setTimeout(install,50));
console.info('[HLGB] Auditor v'+V+' único + relatório diário + aprendizado histórico ativo');
})();
