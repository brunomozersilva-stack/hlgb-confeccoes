/* HLGB v94.38 — confiabilidade do Auditor e memória por problema.
   Pós-login e somente diagnóstico: não grava dados de negócio e não limpa filas.
   Corrige identidade da rodada/app, retry-loop, idade/evidência, comparação muito
   próxima, baseline saudável, memória de problemas e feedback da usuária. */
(function(){
'use strict';
const V='94.38';
const DAILY_LATEST='hlgb_auditor_daily_report_latest_v9429';
const DAILY_PREFIX='hlgb_auditor_daily_report_v9429_';
const PENDING_KEY='hlgb_records_pending_v91';
const WAL_KEY='hlgb_durable_wal_v1';
const PROOF_KEY='hlgb_production_save_proofs_v9438';
const HEALTHY_KEY='hlgb_auditor_healthy_baseline_v9438';
const ROUND_KEY='hlgb_auditor_reliable_rounds_v9438';
const MEMORY_KEY='hlgb_auditor_problem_memory_v9438';
const FEEDBACK_KEY='hlgb_auditor_feedback_v9438';
const MIN_EQUIVALENT_GAP_MS=30000;
const MAX_ROUNDS=40,MAX_MEMORY=120;
if(window.HLGB_AUDITOR_RELIABILITY_9438===V){try{window.hlgbAuditorReliability9438?.install?.()}catch(e){}return}
window.HLGB_AUDITOR_RELIABILITY_9438=V;
const state={version:V,installed:false,runs:0,patchedReports:0,lastRoundId:'',lastAt:'',lastError:'',feedbackCount:0};
const sid=v=>String(v??'');
const clone=v=>{try{return structuredClone(v)}catch(e){try{return JSON.parse(JSON.stringify(v))}catch(_){return v}}};
const esc=v=>sid(v).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
function read(k,f=null){try{const x=JSON.parse(localStorage.getItem(k)||'null');return x??f}catch(e){return f}}
function write(k,v){try{localStorage.setItem(k,JSON.stringify(v));return true}catch(e){return false}}
function localDay(d=new Date()){const p=n=>String(n).padStart(2,'0');return d.getFullYear()+'-'+p(d.getMonth()+1)+'-'+p(d.getDate())}
function browserFamily(){const u=sid(navigator?.userAgent);if(/Edg\//.test(u))return 'Edge';if(/Chrome|Chromium|CriOS/.test(u))return 'Chrome';if(/Safari/.test(u))return 'Safari';if(/Firefox/.test(u))return 'Firefox';return 'Outro'}
function scenario(){return {browser:browserFamily(),page:document.querySelector('#appShell .page.active,.page.active')?.id||'',viewport:(window.innerWidth||0)+'x'+(window.innerHeight||0)}}
function appVersion(){return sid(window.HLGB_RELEASE_VERSION||document.querySelector('#appShell .logo small')?.textContent||'').replace(/^v/i,'')||'desconhecida'}
function roundId(at=new Date().toISOString()){return 'r-'+at.replace(/[^0-9]/g,'').slice(0,17)+'-'+Math.random().toString(36).slice(2,7)}
function ts(v){if(v==null||v==='')return NaN;const n=typeof v==='number'?v:Date.parse(String(v));return Number.isFinite(n)?n:NaN}
function earliest(values){let best=Infinity,raw='';for(const v of values){const n=ts(v);if(Number.isFinite(n)&&n<best){best=n;raw=v}}return raw}
function latest(values){let best=-Infinity,raw='';for(const v of values){const n=ts(v);if(Number.isFinite(n)&&n>best){best=n;raw=v}}return raw}
function proofMap(){const m=new Map();for(const p of (read(PROOF_KEY,[])||[])){if(!p||p.module!=='production'||!p.id)continue;const old=m.get(sid(p.id));if(!old||ts(p.at)>ts(old.at))m.set(sid(p.id),p)}return m}
function queueDetails(){
 const rows=new Map(),proofs=proofMap();
 const ensure=(module,id)=>{const key=sid(module)+'|'+sid(id);if(!rows.has(key))rows.set(key,{key,module:sid(module),id:sid(id),normalizedCopies:0,walLocalCopies:0,attempts:0,created:[],attempted:[],errors:[],states:[],sources:[]});return rows.get(key)};
 try{const p=read(PENDING_KEY,{});for(const [module,ops] of Object.entries(p?.modules||{}))for(const op of (Array.isArray(ops)?ops:[])){const id=op?.id??op?.entity_id;if(id==null)continue;const r=ensure(module,id);r.normalizedCopies++;r.sources.push('normalized');r.created.push(op?.createdAt,op?.__hlgb_pending_at,op?.at);r.attempted.push(op?.lastAttemptAt);if(op?.lastError)r.errors.push(sid(op.lastError));if(op?.state)r.states.push(sid(op.state))}}
 catch(e){}
 try{const w=read(WAL_KEY,{});for(const e of Object.values(w?.entries||{})){const module=e?.module,id=e?.id??e?.entity_id;if(!module||id==null)continue;const r=ensure(module,id);r.walLocalCopies++;r.sources.push('wal-local');r.attempts=Math.max(r.attempts,+e?.attempts||0);r.created.push(e?.createdAt,e?.at);r.attempted.push(e?.lastAttemptAt);if(e?.lastError)r.errors.push(sid(e.lastError));if(e?.state)r.states.push(sid(e.state))}}
 catch(e){}
 const out=[];for(const r of rows.values()){
  const first=earliest(r.created),lastAttempt=latest(r.attempted),age=ts(first),uniqueErrors=[...new Set(r.errors.filter(Boolean))],proof=r.module==='production'?proofs.get(r.id)||null:null;
  const retryLoop=r.attempts>=3 || (r.attempts>=2&&uniqueErrors.length===1&&Number.isFinite(age)&&Date.now()-age>=60000);
  const cloudVerified=!!proof?.confirmed,progress=cloudVerified?'confirmed-cloud':retryLoop?'no-confirmed-progress':r.attempts>0?'attempting':'queued';
  out.push({...r,createdAt:first||null,ageMs:Number.isFinite(age)?Math.max(0,Date.now()-age):null,lastAttemptAt:lastAttempt||null,lastError:uniqueErrors.at(-1)||'',errorKinds:uniqueErrors,retryLoop,progress,cloudVerified,cloudEvidence:proof?{at:proof.at,source:proof.source,serverRevision:proof.serverRevision,serverUpdatedAt:proof.serverUpdatedAt,attemptsAtProof:proof.attempts}:null,nextStep:cloudVerified?'Reconciliar a fila local com a confirmação já comprovada no Supabase.':retryLoop?'Confirmar o registro diretamente no Supabase antes de qualquer novo reenvio.':'Aguardar a confirmação normal; não remover da fila sem prova.'});
 }
 return out.sort((a,b)=>(b.retryLoop-a.retryLoop)||(b.attempts-a.attempts));
}
function countSummary(obj){if(!obj||typeof obj!=='object')return {pass:0,warn:0,fail:0};return {pass:+obj.pass||0,warn:+obj.warn||0,fail:+obj.fail||0}}
function failureBreakdown(last,report,queues){
 const main=countSummary(last?.main?.summary||last?.main?.totals),op=countSummary(last?.main?.operational?.summary||report?.operations?.summary),retry=queues.filter(x=>x.retryLoop&&!x.cloudVerified),pending=queues.filter(x=>!x.cloudVerified),reasons=[];
 if(main.fail)reasons.push({group:'testes',count:main.fail,confidence:'confirmed',detail:main.fail+' verificação(ões) principais falharam.'});
 if(op.fail)reasons.push({group:'operação',count:op.fail,confidence:'confirmed',detail:op.fail+' falha(s) operacional(is) foram medidas.'});
 if(retry.length)reasons.push({group:'sincronização',count:retry.length,confidence:'observed',detail:retry.length+' operação(ões) apresentam repetição de tentativas sem confirmação local.'});
 if(pending.length&&!retry.length)reasons.push({group:'pendências',count:pending.length,confidence:'observed',detail:pending.length+' operação(ões) continuam em fila local.'});
 const status=(main.fail||op.fail)?'fail':(main.warn||op.warn||pending.length)?'warn':'pass';
 return {status,checks:main,operations:op,pendingUnique:queues.length,retryLoops:retry.length,reasons};
}
function runtimeGroups(){
 const arr=Array.isArray(window.hlgbInternalAuditor?.runtimeErrors)?window.hlgbInternalAuditor.runtimeErrors:[],m=new Map();for(const e of arr){const sig=(sid(e?.type)+'|'+sid(e?.message)).slice(0,800),old=m.get(sig)||{type:sid(e?.type),message:sid(e?.message),count:0,firstSeen:e?.at||'',lastSeen:e?.at||''};old.count++;if(ts(e?.at)<ts(old.firstSeen)||!old.firstSeen)old.firstSeen=e?.at||old.firstSeen;if(ts(e?.at)>ts(old.lastSeen))old.lastSeen=e?.at||old.lastSeen;m.set(sig,old)}return [...m.values()].sort((a,b)=>b.count-a.count).slice(0,60)
}
function problemSnapshot(report,queues,breakdown){
 const p=[];const add=(key,severity,title,evidence,confidence='observed')=>p.push({key,severity,title,evidence,confidence});
 for(const q of queues){if(q.cloudVerified)continue;if(q.retryLoop)add('retry:'+q.key,'high','Retry repetido: '+q.module+' '+q.id,{attempts:q.attempts,ageMs:q.ageMs,lastAttemptAt:q.lastAttemptAt,lastError:q.lastError},'observed');else add('pending:'+q.key,'medium','Pendência: '+q.module+' '+q.id,{ageMs:q.ageMs,lastError:q.lastError},'observed')}
 const h=report?.health||{};if(+h.duplicateScripts>0)add('duplicate-scripts','high','Scripts carregados mais de uma vez',{count:+h.duplicateScripts,files:h.duplicateScriptFiles||[]},'observed');if(+report?.intelligence?.metrics?.saveDuplicateResponsibilities>0)add('save-duplicate','high','Responsabilidade de salvamento duplicada',{count:+report.intelligence.metrics.saveDuplicateResponsibilities},'observed');if(+h.projectionOrphansUnresolved>0)add('projection-orphans','medium','Vínculos Financeiro→Projeção sem fonte de recuperação',{count:+h.projectionOrphansUnresolved},'observed');for(const x of breakdown.reasons)if(x.group==='testes'||x.group==='operação')add('failure:'+x.group,'high','Falha em '+x.group,{count:x.count,detail:x.detail},x.confidence);return p
}
function updateProblemMemory(problems,at){
 let mem=read(MEMORY_KEY,[]);if(!Array.isArray(mem))mem=[];const map=new Map(mem.map(x=>[x.key,x]));const active=new Set(problems.map(x=>x.key));
 for(const p of problems){const old=map.get(p.key),wasResolved=old?.status==='resolved';map.set(p.key,{...old,...p,firstSeen:old?.firstSeen||at,lastSeen:at,occurrences:(+old?.occurrences||0)+1,status:wasResolved?'returned':old?'persistent':'new',lastFeedback:old?.lastFeedback||null})}
 for(const [key,x] of map){if(!active.has(key)&&x.status!=='resolved')map.set(key,{...x,status:'resolved',resolvedAt:at})}
 mem=[...map.values()].sort((a,b)=>ts(b.lastSeen)-ts(a.lastSeen)).slice(0,MAX_MEMORY);write(MEMORY_KEY,mem);return mem;
}
function equivalent(a,b){return !!a&&!!b&&a.browser===b.browser&&a.page===b.page&&a.viewport===b.viewport}
function reliableComparison(round){
 const rounds=read(ROUND_KEY,[]);if(!Array.isArray(rounds)||!rounds.length)return {available:false,reason:'no-previous-equivalent'};
 const candidates=rounds.filter(x=>equivalent(x.scenario,round.scenario)&&ts(x.at)<ts(round.at)-MIN_EQUIVALENT_GAP_MS);const prev=candidates.at(-1);if(!prev)return {available:false,reason:'previous-too-close-or-different-scenario',minGapMs:MIN_EQUIVALENT_GAP_MS};
 const gapMs=ts(round.at)-ts(prev.at),before=prev.metrics||{},after=round.metrics||{},items=[];for(const k of new Set([...Object.keys(before),...Object.keys(after)])){const a=Number(before[k]),b=Number(after[k]);if(Number.isFinite(a)&&Number.isFinite(b)&&a!==b)items.push({key:k,before:a,after:b,delta:b-a})}return {available:true,previousRoundId:prev.roundId,previousAt:prev.at,gapMs,scenario:clone(round.scenario),items}
}
function healthyCriteria(report,queues,breakdown){const m=report?.intelligence?.metrics||{},h=report?.health||{};const blockers=[];if(queues.some(x=>!x.cloudVerified))blockers.push('business-pending');if(+h.duplicateScripts>0)blockers.push('duplicate-scripts');if(+m.saveDuplicateResponsibilities>0)blockers.push('duplicate-save');if(+m.preAuthLoads>0)blockers.push('preauth-loads');if(+h.auditorUiConflict>0)blockers.push('auditor-ui-conflict');if(breakdown.status==='fail')blockers.push('audit-failure');return {healthy:blockers.length===0,blockers}}
function patchReport(report,last=null,trigger='run'){
 if(!report||typeof report!=='object')return report;const at=new Date().toISOString(),sc=scenario(),queues=queueDetails(),breakdown=failureBreakdown(last,report,queues),rid=roundId(at);
 report.version=V;report.appVersion=appVersion();report.auditorVersion=sid(window.hlgbAuditorSingleAction9429?.version||report.auditorVersion||'');report.reliabilityVersion=V;report.roundId=rid;report.roundStartedAt=last?.at||report.lastRunAt||at;report.roundCompletedAt=at;report.roundTrigger=trigger;report.scenario=sc;
 report.componentVersions={singleAction:sid(window.hlgbAuditorSingleAction9429?.version||''),singleUi:sid(window.hlgbAuditorSingleUiReclaim9434A?.version||''),intelligence:sid(window.hlgbAuditorIntelligence9396?.version||''),rapidLearning:sid(window.hlgbAuditorRapid9437?.version||''),productionConfirmation:sid(window.hlgbProductionSaveConfirm9438?.version||''),walReplay:sid(window.hlgbWalConfirmedReplay9333?.version||''),syncRecovery:sid(window.hlgbSyncRecovery9301?.version||'')};
 report.resultBreakdown=breakdown;report.pendingEvidence=queues;report.runtimeErrorGroups=runtimeGroups();
 const metrics={pendingUnverified:queues.filter(x=>!x.cloudVerified).length,retryLoops:queues.filter(x=>x.retryLoop&&!x.cloudVerified).length,duplicateScripts:+report?.health?.duplicateScripts||0,saveDuplicateResponsibilities:+report?.intelligence?.metrics?.saveDuplicateResponsibilities||0,projectionOrphansUnresolved:+report?.health?.projectionOrphansUnresolved||0,failChecks:breakdown.checks.fail,failOperations:breakdown.operations.fail};
 const problems=problemSnapshot(report,queues,breakdown),memory=updateProblemMemory(problems,at),round={roundId:rid,at,appVersion:report.appVersion,scenario:sc,metrics,problems:problems.map(x=>x.key)},comparison=reliableComparison(round);round.comparison=comparison;
 let rounds=read(ROUND_KEY,[]);if(!Array.isArray(rounds))rounds=[];rounds.push(round);rounds=rounds.slice(-MAX_ROUNDS);write(ROUND_KEY,rounds);report.reliableComparison=comparison;report.problemMemorySummary={active:problems.length,new:memory.filter(x=>x.status==='new').length,persistent:memory.filter(x=>x.status==='persistent').length,returned:memory.filter(x=>x.status==='returned').length,resolved:memory.filter(x=>x.status==='resolved').length};
 const hc=healthyCriteria(report,queues,breakdown);report.healthyReference={validated:hc.healthy,blockers:hc.blockers,currentHealthyBaseline:read(HEALTHY_KEY,null)?.roundId||null};if(hc.healthy){const baseline={roundId:rid,at,appVersion:report.appVersion,scenario:sc,metrics,validated:true};write(HEALTHY_KEY,baseline);report.healthyReference.currentHealthyBaseline=rid}
 if(report.intelligence){const old=report.intelligence.comparison||{};const oldAt=report?.intelligence?.previous?.at||'';const curAt=report?.intelligence?.current?.at||report.roundCompletedAt;const gap=Math.abs(ts(curAt)-ts(oldAt));if(old.available&&Number.isFinite(gap)&&gap<MIN_EQUIVALENT_GAP_MS)report.intelligence.comparison={...old,available:false,rejected:true,reason:'baseline-too-close',gapMs:gap,minGapMs:MIN_EQUIVALENT_GAP_MS}}
 report.confidence={productionPending:queues.some(x=>x.module==='production'&&x.cloudVerified)?'confirmed':queues.some(x=>x.module==='production')?'observed':'not-tested',scriptDuplicates:(+report?.health?.duplicateScripts||0)>0?'observed':'not-observed',saveDuplicateResponsibilities:(+report?.intelligence?.metrics?.saveDuplicateResponsibilities||0)>0?'observed':'not-observed',visualStability:window.hlgbAuditorRapid9437?'observed':'not-tested',chromeFunctional:browserFamily()==='Chrome'?'observed-this-round':'not-tested-this-round'};
 try{write(DAILY_LATEST,report);write(DAILY_PREFIX+(report.date||localDay()),report)}catch(e){}state.patchedReports++;state.lastRoundId=rid;state.lastAt=at;renderCard(report,memory);return report;
}
function feedback(problemKey,value){
 const allowed=new Set(['continua','resolvido','alerta-incorreto']);if(!allowed.has(value))return false;const at=new Date().toISOString(),row={at,problemKey:sid(problemKey||'geral'),value,roundId:state.lastRoundId,appVersion:appVersion(),scenario:scenario()};let f=read(FEEDBACK_KEY,[]);if(!Array.isArray(f))f=[];f.push(row);write(FEEDBACK_KEY,f.slice(-150));let m=read(MEMORY_KEY,[]);if(Array.isArray(m)){m=m.map(x=>x.key===row.problemKey?{...x,lastFeedback:row,status:value==='resolvido'?'resolved':value==='continua'?(x.status==='resolved'?'returned':'persistent'):x.status}:x);write(MEMORY_KEY,m)}state.feedbackCount++;renderCard(read(DAILY_LATEST,null),m);return true;
}
function renderCard(report,memory){
 const host=document.getElementById('hlgbAuditorResult');if(!host||!report)return false;let el=document.getElementById('hlgbAuditorReliability9438Card');if(!el){el=document.createElement('div');el.id='hlgbAuditorReliability9438Card';el.className='panel';host.prepend(el)}const b=report.resultBreakdown||{},q=report.pendingEvidence||[],retry=q.filter(x=>x.retryLoop&&!x.cloudVerified),confirmed=q.filter(x=>x.cloudVerified),cmp=report.reliableComparison||{},active=(Array.isArray(memory)?memory:read(MEMORY_KEY,[])).filter(x=>['new','persistent','returned'].includes(x.status)).slice(0,5);
 el.style.cssText='margin:10px 0;border:1px solid #bfcbd8;background:#f8fbff';el.innerHTML='<h3 style="margin-top:0">🔎 Auditor confiável · v'+V+'</h3><div class="sub"><b>Rodada:</b> '+esc(report.roundId||'')+' · app '+esc(report.appVersion||'')+' · '+esc(report.scenario?.browser||'')+' · '+esc(report.scenario?.page||'')+'</div><div style="margin-top:7px"><b>Resultado separado:</b> '+(b.checks?.pass||0)+' testes ok · '+(b.checks?.warn||0)+' alertas · '+(b.checks?.fail||0)+' falhas de teste · '+(b.operations?.fail||0)+' falhas operacionais.</div><div class="sub"><b>Filas:</b> '+q.length+' única(s) · retry-loop '+retry.length+' · confirmação no servidor '+confirmed.length+'.</div><div class="sub"><b>Comparação:</b> '+(cmp.available?'rodada equivalente de '+Math.round((cmp.gapMs||0)/1000)+'s antes.':'não usada ('+esc(cmp.reason||'sem referência equivalente')+').')+'</div><div class="sub"><b>Referência saudável:</b> '+(report.healthyReference?.validated?'validada nesta rodada.':'não atualizada · '+esc((report.healthyReference?.blockers||[]).join(', ')||'sem dados')+'.')+'</div>'+active.map(x=>'<div style="border-top:1px solid #e3e8ed;padding-top:6px;margin-top:6px"><b>'+esc(x.title)+'</b><div class="sub">'+esc(x.status)+' · '+esc(x.confidence)+' · ocorrências '+(+x.occurrences||0)+'</div><button type="button" data-hlgb-feedback="continua" data-problem="'+esc(x.key)+'">Continua acontecendo</button> <button type="button" data-hlgb-feedback="resolvido" data-problem="'+esc(x.key)+'">Resolvido</button> <button type="button" data-hlgb-feedback="alerta-incorreto" data-problem="'+esc(x.key)+'">Alerta incorreto</button></div>').join('');
 el.querySelectorAll('[data-hlgb-feedback]').forEach(btn=>btn.addEventListener('click',()=>feedback(btn.dataset.problem,btn.dataset.hlgbFeedback)));return true;
}
function patchLatest(trigger='late-patch'){const r=read(DAILY_LATEST,null);if(!r)return null;if(r.reliabilityVersion===V&&r.roundId)return r;return patchReport(r,window.hlgbAuditorSingleAction9429?.last||null,trigger)}
function install(){
 const api=window.hlgbAuditorSingleAction9429;if(!api||typeof api.run!=='function')return false;if(api.run.__hlgbReliability9438){state.installed=true;return true}const originalRun=api.run;const wrapped=async function(){const started=new Date().toISOString(),out=await originalRun.apply(this,arguments);if(out?.daily){out.at=out.at||started;out.daily=patchReport(out.daily,out,'auditor-run');try{window.HLGB_AUDITOR_SINGLE_ACTION_LAST=out}catch(e){}}else patchLatest('auditor-run-no-output');state.runs++;return out};wrapped.__hlgbReliability9438=true;wrapped.__original=originalRun;api.run=wrapped;
 const originalBuild=api.buildDailyReport;if(typeof originalBuild==='function'&&!originalBuild.__hlgbReliability9438){const wb=function(){const r=originalBuild.apply(this,arguments);return patchReport(r,null,'build-daily')};wb.__hlgbReliability9438=true;wb.__original=originalBuild;api.buildDailyReport=wb}
 state.installed=true;setTimeout(()=>patchLatest('install').catch?.(()=>{}),0);return true;
}
function activate(){[0,120,400,900,1800,3500].forEach(ms=>setTimeout(()=>{try{install()}catch(e){state.lastError=sid(e?.message||e)}},ms));return true}
window.hlgbAuditorReliability9438={version:V,state,install,activate,patchReport,patchLatest,queueDetails,problemMemory:()=>read(MEMORY_KEY,[]),healthyBaseline:()=>read(HEALTHY_KEY,null),rounds:()=>read(ROUND_KEY,[]),feedback,status:()=>({...state,appVersion:appVersion(),scenario:scenario(),healthyBaseline:read(HEALTHY_KEY,null)})};
window.addEventListener('hlgb:authenticated',activate);
document.addEventListener('click',e=>{if(e.target?.closest?.('#hlgbAuditorNavBtn,#hlgbAuditorOpenBtn'))setTimeout(()=>{try{install();patchLatest('auditor-open')}catch(err){}},600)},true);
if(window.__HLGB_AUTH_READY===true)activate();
console.info('[HLGB] v'+V+' confiabilidade do Auditor ativa');
})();
