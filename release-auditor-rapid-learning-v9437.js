/* HLGB v94.37 — aprendizado rápido pós-login + relatório diário das 18h + estabilização adaptativa de renders.
   Não participa do boot/login. Não grava dados de negócio. Mantém um único botão principal no Auditor.
   v94.39: a rodada automática das 18h monta o relatório sem executar varreduras que navegam pelas telas. */
(function(){
'use strict';
const V='94.37';
if(window.HLGB_AUDITOR_RAPID_9437===V){try{window.hlgbAuditorRapid9437?.activate?.('reload')}catch(e){}return}
window.HLGB_AUDITOR_RAPID_9437=V;

const RAPID_KEY='hlgb_auditor_rapid_history_v9437';
const DAILY_STATE_KEY='hlgb_auditor_daily_18_v9437';
const DAILY_LATEST_KEY='hlgb_auditor_daily_report_latest_v9429';
const DAILY_PREFIX='hlgb_auditor_daily_report_v9429_';
const OFFICIAL_HISTORY_KEY='hlgb_auditor_learning_history_v9429';
const BANNER_ID='hlgbDaily18Ready9437';
const CARD_ID='hlgbDaily18Card9437';
const SAMPLE_MS=120000;
const FULL_LEARN_MS=600000;
const RENDER_JUMP_PX=90;
const USER_INTENT_MS=900;

const renderers=[
 'renderAll','renderDash','renderOrders','renderProduction','renderProductionHub','renderCuts','renderCutAssignmentQueue',
 'renderProjection','renderCapacityPlanning','renderClients','renderClientPotentialReport','renderProducts','renderMaterials',
 'renderStock','renderFactions','renderFactionPayments','renderFactionPaymentPlanner','renderCutters','drawCutterChart',
 'renderCutterProductCosts','renderFinance','renderHubFinance','renderSuppliers','renderPurchases','renderEmployees',
 'renderFormerEmployees','renderPayroll','renderMissingPieces','renderDefectReturns','renderAssets','renderOrderTrash',
 'renderGoals','renderReports','renderUsers','renderCatalogs','renderAuditLog','renderFinishedPieces','renderSeparation',
 'renderSeparationList','renderOrderNotes','renderEmployeeAdvances','renderReady934','renderFactionDelivery935',
 'renderTracking9173','renderFactionChecklists9176','renderFactionChecklists9198','hlgbRenderIncomingRecord'
];

const state={
 version:V,authRequired:true,activated:false,activationReason:'',samples:0,fullLearningRuns:0,highSignals:0,
 renderGuards:0,jumpRepairs:0,jumpByRenderer:{},lastSampleAt:'',lastFullLearnAt:'',lastSignal:'',lastError:'',
 daily18:{date:'',status:'pending',generatedAt:'',trigger:'',lastError:''}
};
let sampleTimer=null,dailyTimer=null,lastSample=null,lastFullLearnMs=0,renderDepth=0,lastUserIntent=0,lastNavigationIntent=0,restoringUntil=0;

const sid=v=>String(v??'');
const clone=v=>{try{return structuredClone(v)}catch(e){try{return JSON.parse(JSON.stringify(v))}catch(_){return v}}};
function now(){return Date.now()}
function iso(){return new Date().toISOString()}
function p2(n){return String(n).padStart(2,'0')}
function localDay(d=new Date()){return d.getFullYear()+'-'+p2(d.getMonth()+1)+'-'+p2(d.getDate())}
function readJson(k,f=null){try{const x=JSON.parse(localStorage.getItem(k)||'null');return x??f}catch(e){return f}}
function writeJson(k,v){try{localStorage.setItem(k,JSON.stringify(v));return true}catch(e){return false}}
function authReady(){return window.__HLGB_AUTH_READY===true}
function activePage(){try{return document.querySelector('#appShell .page.active,.page.active')?.id||''}catch(e){return ''}}
function visibleApp(){try{const a=document.getElementById('appShell');if(!a)return false;const s=getComputedStyle(a);return s.display!=='none'&&s.visibility!=='hidden'}catch(e){return true}}
function interactionLocked(){try{return !!window.hlgbInteractionLock9434?.status?.().locked}catch(e){return false}}
function persist(){try{localStorage.setItem('hlgb_auditor_rapid_state_v9437',JSON.stringify({...state,authReady:authReady(),at:iso()}))}catch(e){}}

function snap(){
 const root=document.querySelector('#appShell .page.active,.page.active');
 const ae=document.activeElement;
 return {page:root?.id||'',x:window.scrollX||0,y:window.scrollY||0,rootTop:root?.scrollTop||0,rootLeft:root?.scrollLeft||0,focus:ae&&ae!==document.body?ae:null,at:now()};
}
function markUserIntent(e){
 if(e?.type==='keydown'&&!['ArrowUp','ArrowDown','PageUp','PageDown','Home','End',' ','Spacebar'].includes(e.key))return;
 lastUserIntent=now();
}
function markNavigation(e){
 const t=e?.target?.closest?.('[data-page],.nav-item,.nav-group button,#sidebar button,[onclick*="showPage"],[onclick*="navigate"]');
 if(t)lastNavigationIntent=now();
}
function canRestore(before){
 if(!before||!authReady()||interactionLocked())return false;
 if(now()-lastUserIntent<USER_INTENT_MS||now()-lastNavigationIntent<1200||now()<restoringUntil)return false;
 const page=activePage();return !before.page||!page||page===before.page;
}
function restore(before,name){
 if(!canRestore(before))return false;
 const root=document.querySelector('#appShell .page.active,.page.active');
 const dy=Math.abs((window.scrollY||0)-before.y),dr=Math.abs((root?.scrollTop||0)-before.rootTop);
 if(dy<RENDER_JUMP_PX&&dr<RENDER_JUMP_PX)return false;
 restoringUntil=now()+350;
 try{window.scrollTo(before.x,before.y)}catch(e){}
 try{if(root){root.scrollTop=before.rootTop;root.scrollLeft=before.rootLeft}}catch(e){}
 try{if(before.focus?.isConnected&&document.activeElement!==before.focus)before.focus.focus({preventScroll:true})}catch(e){}
 state.jumpRepairs++;state.jumpByRenderer[name]=(state.jumpByRenderer[name]||0)+1;state.lastSignal='render-jump:'+name;
 recordRapid({kind:'render-jump',severity:'high',reason:'render-jump',renderer:name,page:before.page,fromY:before.y,toY:window.scrollY||0,deltaWindow:dy,deltaPage:dr,at:iso()});
 persist();
 return true;
}
function chainHas(fn){
 const seen=new Set();let cur=fn,n=0;
 while(typeof cur==='function'&&!seen.has(cur)&&n++<70){if(cur.__hlgbRapidRender9437)return true;seen.add(cur);cur=cur.__original||cur.__hlgb9307Original||cur.__hlgb9320Original||cur.__hlgb955Original||cur.__hlgbReliableOriginal}
 return false;
}
function wrapRenderer(name){
 const fn=window[name];if(typeof fn!=='function'||chainHas(fn))return false;
 const w=function(){
  if(!authReady()||renderDepth>0||interactionLocked())return fn.apply(this,arguments);
  const before=snap();renderDepth++;let out;
  try{out=fn.apply(this,arguments)}finally{renderDepth--}
  restore(before,name);
  try{requestAnimationFrame(()=>restore(before,name))}catch(e){}
  return out;
 };
 w.__hlgbRapidRender9437=true;w.__original=fn;window[name]=w;state.renderGuards++;return true;
}
function installRenderGuards(){if(!authReady())return false;for(const n of renderers)wrapRenderer(n);persist();return true}

function rapidRows(){const x=readJson(RAPID_KEY,[]);return Array.isArray(x)?x:[]}
function recordRapid(entry){
 let rows=rapidRows();rows.push(entry);rows=rows.slice(-120);writeJson(RAPID_KEY,rows);return rows;
}
function compactMetrics(cur){
 const m=cur?.metrics||{},boot=window.hlgbAuditorBootAnalysis9381?.analyze?.()||null;
 return {at:cur?.at||iso(),appVersion:sid(cur?.appVersion||window.HLGB_RELEASE_VERSION||''),metrics:clone(m),topRenders:(boot?.renders||[]).slice(0,6).map(x=>({name:x.name,count:+x.count||0,totalSyncMs:+x.totalSyncMs||0,maxSyncMs:+x.maxSyncMs||0,caller:x.callers?.[0]||''})),jumpRepairs:state.jumpRepairs,jumpByRenderer:clone(state.jumpByRenderer)};
}
function severityFor(sample,prev){
 const m=sample.metrics||{},pm=prev?.metrics||{},dt=Math.max(1,(Date.parse(sample.at)-Date.parse(prev?.at||sample.at))/1000),renderDelta=Math.max(0,(+m.renders||0)-(+pm.renders||0));
 const jumpDelta=Math.max(0,(+sample.jumpRepairs||0)-(+prev?.jumpRepairs||0));
 let severity='info',reasons=[];
 if(jumpDelta>0){severity='high';reasons.push(jumpDelta+' salto(s) de tela corrigido(s)')}
 if(renderDelta>=30&&dt<=240){severity='high';reasons.push(renderDelta+' renders em '+Math.round(dt)+'s')}
 else if(renderDelta>=18&&dt<=240&&severity!=='high'){severity='medium';reasons.push(renderDelta+' renders em '+Math.round(dt)+'s')}
 if((+m.pendingUnique||0)>0){severity='high';reasons.push('pendências '+(+m.pendingUnique||0))}
 if((+m.saveDuplicateResponsibilities||0)>0){severity='high';reasons.push('save duplicado')}
 if((+m.projectionOrphansUnresolved||0)>0){severity=severity==='info'?'medium':severity;reasons.push('órfãos de projeção '+(+m.projectionOrphansUnresolved||0))}
 if((+m.scriptDuplicates||0)>0&&severity==='info'){severity='medium';reasons.push('scripts duplicados '+(+m.scriptDuplicates||0))}
 return {severity,reasons,renderDelta,dtSec:Math.round(dt),jumpDelta};
}
async function fullLearn(reason){
 if(!authReady()||document.hidden)return false;
 const t=now();if(t-lastFullLearnMs<FULL_LEARN_MS&&reason!=='manual')return false;
 const intel=window.hlgbAuditorIntelligence9396;if(typeof intel?.collect!=='function')return false;
 try{
  const report=await intel.collect({saveBaseline:true});lastFullLearnMs=t;state.fullLearningRuns++;state.lastFullLearnAt=iso();
  if(report?.current?.at){
   let h=readJson(OFFICIAL_HISTORY_KEY,[]);if(!Array.isArray(h))h=[];
   const entry={at:report.current.at,appVersion:report.current.appVersion||sid(window.HLGB_RELEASE_VERSION||''),source:'rapid-9437:'+reason,metrics:clone(report.current.metrics||{}),comparison:clone(report.comparison?.summary||{}),recommendations:(report.recommendations||[]).slice(0,20).map(r=>({priority:r.priority||'',code:r.code||'',detail:r.detail||''}))};
   h=h.filter(x=>x?.at!==entry.at);h.push(entry);writeJson(OFFICIAL_HISTORY_KEY,h.slice(-50));
  }
  persist();return report;
 }catch(e){state.lastError=sid(e?.message||e);persist();return false}
}
async function sample(reason='timer'){
 if(!authReady()||document.hidden||!visibleApp())return false;
 const intel=window.hlgbAuditorIntelligence9396;if(typeof intel?.currentMetrics!=='function')return false;
 try{
  const cur=compactMetrics(intel.currentMetrics()),signal=severityFor(cur,lastSample),entry={kind:'rapid-sample',reason,severity:signal.severity,reasons:signal.reasons,renderDelta:signal.renderDelta,dtSec:signal.dtSec,jumpDelta:signal.jumpDelta,...cur};
  recordRapid(entry);lastSample=cur;state.samples++;state.lastSampleAt=cur.at;if(signal.severity==='high'){state.highSignals++;state.lastSignal=signal.reasons.join(' · ');fullLearn('high-signal')}
  persist();renderReportStatus();return entry;
 }catch(e){state.lastError=sid(e?.message||e);persist();return false}
}
function scheduleSamples(){
 clearTimeout(sampleTimer);if(!authReady())return;
 sampleTimer=setTimeout(async()=>{await sample('timer');scheduleSamples()},SAMPLE_MS);
}

function local18(d=new Date()){const x=new Date(d);x.setHours(18,0,0,0);return x}
function after18(){return now()>=local18().getTime()}
function scheduledToday(){const s=readJson(DAILY_STATE_KEY,null);return !!(s&&s.date===localDay()&&s.status==='ready')}
function rapidSummary(){
 const rows=rapidRows(),today=localDay(),todayRows=rows.filter(x=>sid(x?.at).slice(0,10)===today||(()=>{try{return localDay(new Date(x?.at))===today}catch(e){return false}})());
 return {version:V,samplesToday:todayRows.filter(x=>x.kind==='rapid-sample').length,highSignalsToday:todayRows.filter(x=>x.severity==='high').length,jumpRepairs:state.jumpRepairs,jumpByRenderer:clone(state.jumpByRenderer),lastSampleAt:state.lastSampleAt,lastSignal:state.lastSignal};
}
function enrichDaily(report,trigger){
 if(!report||typeof report!=='object')return report;
 report.scheduled18={version:V,scheduledLocal:'18:00',generatedAt:iso(),trigger,automatic:true};report.rapidLearning=rapidSummary();
 writeJson(DAILY_LATEST_KEY,report);writeJson(DAILY_PREFIX+localDay(),report);return report;
}
function showReady(report){
 let b=document.getElementById(BANNER_ID);if(!b){b=document.createElement('div');b.id=BANNER_ID;document.body.appendChild(b)}
 b.style.cssText='position:fixed;right:18px;bottom:18px;z-index:2147483000;max-width:360px;background:#fff;border:1px solid #cfc4d3;border-radius:12px;padding:12px 14px;box-shadow:0 8px 28px rgba(0,0,0,.18);font-family:Arial,sans-serif';
 b.innerHTML='<div style="font-weight:700;margin-bottom:4px">📅 Relatório diário das 18h pronto</div><div style="font-size:12px;opacity:.75;margin-bottom:8px">'+localDay()+' · inclui aprendizado rápido e correções de salto de tela.</div><button type="button" id="hlgbDaily18Download9437">⬇️ Baixar relatório</button><button type="button" id="hlgbDaily18Close9437" style="margin-left:8px">Fechar</button>';
 b.querySelector('#hlgbDaily18Download9437')?.addEventListener('click',()=>window.hlgbAuditorSingleAction9429?.downloadDaily?.(report));
 b.querySelector('#hlgbDaily18Close9437')?.addEventListener('click',()=>b.remove());return true;
}
function renderReportStatus(){
 const host=document.getElementById('hlgbAuditorResult');if(!host)return false;
 let c=document.getElementById(CARD_ID);if(!c){c=document.createElement('div');c.id=CARD_ID;c.className='panel';host.prepend(c)}
 const s=readJson(DAILY_STATE_KEY,null),ready=s?.date===localDay()&&s?.status==='ready',next=local18(),label=ready?'✅ Relatório das 18h pronto':after18()?'🟡 Gerando relatório das 18h':'🕕 Relatório automático programado para 18:00';
 c.style.cssText='margin:8px 0;border:1px solid #d8d0dc;background:#fffdf8';
 c.innerHTML='<b>'+label+'</b><div class="sub">O aprendizado rápido coleta sinais durante o uso; não depende só de clicar no Auditor.</div>'+(ready?'<div style="margin-top:8px"><button id="hlgbDaily18CardDownload9437" type="button" class="secondary">⬇️ Baixar relatório das 18h</button></div>':'<div class="sub">Próxima referência: '+p2(next.getHours())+':'+p2(next.getMinutes())+'.</div>');
 c.querySelector('#hlgbDaily18CardDownload9437')?.addEventListener('click',()=>window.hlgbAuditorSingleAction9429?.downloadDaily?.(readJson(DAILY_LATEST_KEY,null)));return true;
}
async function runDailyNonNavigating(api){
 let main=null;
 if(typeof window.hlgbInternalAuditor?.run==='function')main=await window.hlgbInternalAuditor.run('full',true);
 else if(typeof window.hlgbAuditorRunFull==='function')main=await window.hlgbAuditorRunFull();
 else throw new Error('Auditoria automática não navegante indisponível.');
 const deep=typeof api?.collectDeep==='function'?await api.collectDeep():{};
 const daily=typeof api?.buildDailyReport==='function'?api.buildDailyReport(main,deep):api?.latestDaily;
 return {version:V,at:iso(),main,deep,daily,background:true,nonNavigating:true};
}
async function runDaily18(trigger='timer',force=false){
 if(!authReady())return false;if(!force&&!after18())return false;if(!force&&scheduledToday()){showReady(readJson(DAILY_LATEST_KEY,null));renderReportStatus();return true}
 const api=window.hlgbAuditorSingleAction9429;if(!api||typeof api?.buildDailyReport!=='function')return false;
 state.daily18={date:localDay(),status:'running',generatedAt:'',trigger,lastError:''};writeJson(DAILY_STATE_KEY,state.daily18);persist();renderReportStatus();
 try{
  const out=await runDailyNonNavigating(api),report=enrichDaily(out?.daily||api.latestDaily||readJson(DAILY_LATEST_KEY,null),trigger);if(!report)throw new Error('Auditor não gerou relatório diário.');
  state.daily18={date:localDay(),status:'ready',generatedAt:iso(),trigger,lastError:''};writeJson(DAILY_STATE_KEY,state.daily18);persist();showReady(report);renderReportStatus();return report;
 }catch(e){state.daily18={date:localDay(),status:'error',generatedAt:'',trigger,lastError:sid(e?.message||e)};writeJson(DAILY_STATE_KEY,state.daily18);state.lastError=state.daily18.lastError;persist();return false}
}
function scheduleDaily(){
 clearTimeout(dailyTimer);if(!authReady())return;
 if(after18()){setTimeout(()=>runDaily18('login-or-focus-after-18'),250);return}
 const ms=Math.max(500,local18().getTime()-now());dailyTimer=setTimeout(()=>runDaily18('18:00-timer'),ms);
}
function heal(){if(!authReady())return false;installRenderGuards();scheduleSamples();scheduleDaily();renderReportStatus();return true}
function activate(reason='authenticated'){
 if(!authReady())return false;state.activated=true;state.activationReason=reason;persist();
 [0,250,900,2200].forEach(ms=>setTimeout(()=>{installRenderGuards();renderReportStatus()},ms));
 setTimeout(()=>sample('post-auth'),15000);setTimeout(()=>fullLearn('post-auth'),45000);scheduleSamples();scheduleDaily();return true;
}

document.addEventListener('wheel',markUserIntent,{capture:true,passive:true});
document.addEventListener('touchstart',markUserIntent,{capture:true,passive:true});
document.addEventListener('keydown',markUserIntent,true);document.addEventListener('click',markNavigation,true);
document.addEventListener('click',e=>{if(e.target?.closest?.('#hlgbAuditorUnifiedRun9434A,#hlgbAuditorNavBtn,#hlgbAuditorOpenBtn'))[100,900,2500].forEach(ms=>setTimeout(renderReportStatus,ms))},true);
window.addEventListener('focus',()=>{if(authReady()){sample('focus');scheduleDaily();renderReportStatus()}});
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&authReady()){sample('visible');scheduleDaily();renderReportStatus()}});
window.addEventListener('hlgb:auditor:open',()=>setTimeout(renderReportStatus,50));
window.addEventListener('hlgb:authenticated',()=>activate('authenticated-event'));
window.hlgbAuditorRapid9437={version:V,state,activate,heal,sample,captureNow:sample,fullLearn,runDaily18,runDailyNonNavigating,showReportStatus:renderReportStatus,installRenderGuards,rapidHistory:rapidRows,status:()=>({...state,authReady:authReady(),rapidHistoryCount:rapidRows().length,dailyStored:readJson(DAILY_STATE_KEY,null),after18:after18()})};
if(authReady())activate('loaded-after-auth');else persist();
console.info('[HLGB] v'+V+' aprendizado rápido pós-login ativo · relatório diário às 18h · proteção adaptativa contra saltos de tela');
})();
