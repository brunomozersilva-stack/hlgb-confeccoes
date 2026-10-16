/* HLGB v93.63 — Auditor simplificado, passivo e orientado a bugs */
(function(){
'use strict';
if(window.HLGB_AUDITOR_SMART_9360)return;
window.HLGB_AUDITOR_SMART_9360=true;
const V='93.63',HISTORY='hlgb_auditor_smart_history_v9360',DAILY='hlgb_auditor_daily_v9360:',BASELINE='hlgb_auditor_baseline_v9360';
let busy=false,events=[],domObserver=null,longTaskObserver=null;
const domStats={total:0,byPage:{},maxBurst:0,burst:0,burstStarted:0};
const longTasks=[];
const now=()=>new Date().toISOString();
const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'}[m]));
const clone=v=>{try{return structuredClone(v)}catch(e){try{return JSON.parse(JSON.stringify(v))}catch(_){return v}}};
function page(){return document.querySelector('.page.active')?.id||''}
function user(){try{const u=typeof currentUser==='function'?currentUser():null;return String(u?.name||u?.login||u?.id||'usuario')}catch(e){return 'usuario'}}
function today(){const d=new Date(),p=n=>String(n).padStart(2,'0');return d.getFullYear()+'-'+p(d.getMonth()+1)+'-'+p(d.getDate())}
function push(type,data={}){events.push({at:now(),ts:Date.now(),type,page:page(),...data});events=events.filter(x=>Date.now()-x.ts<=120000).slice(-240)}
function hist(){try{const x=JSON.parse(localStorage.getItem(HISTORY)||'[]');return Array.isArray(x)?x:[]}catch(e){return []}}
function saveHist(x){try{const a=hist();a.unshift(x);localStorage.setItem(HISTORY,JSON.stringify(a.slice(0,60)))}catch(e){}}
function readBaseline(){try{return JSON.parse(localStorage.getItem(BASELINE)||'null')}catch(e){return null}}
function writeBaseline(v){try{localStorage.setItem(BASELINE,JSON.stringify(v))}catch(e){}}
function status(){const h=hist().find(x=>x.type==='audit');if(!h)return '<b>Status:</b> ainda sem teste nesta versão.';const f=+h.fail||0,w=+h.warn||0,s=f?'Falha':w?'Atenção':'Tudo certo';return '<b>Status do sistema: '+esc(s)+'</b><div class="sub">Último teste: '+esc(String(h.at||'').replace('T',' ').slice(0,16))+' · '+(+h.pass||0)+' aprovados · '+w+' atenções · '+f+' falhas</div>'}
function runtime(){
 const o={};
 for(const [k,v] of Object.entries({payrollRace:window.hlgbPayrollWalRace9346,payrollReliable:window.hlgbPayrollReliableSaveGuard9344,walAuthority:window.hlgbWalSingleAuthority9339,replay:window.hlgbConfirmedReplay9333,syncGuard:window.hlgbSyncGuard9306})){
  try{o[k]=typeof v?.status==='function'?v.status():{version:v?.version||v?.VERSION||''}}catch(e){o[k]={error:String(e?.message||e)}}
 }
 return o;
}
function intervalProfile(){
 try{
  const p=window.hlgbRuntimeProfiler9292?.snapshot?.();if(!p)return {available:false};
  const groups=new Map();
  for(const x of (p.active||[])){
   const key=String(x.delayMs)+'|'+String(x.callbackPreview||'').slice(0,180);
   const g=groups.get(key)||{delayMs:x.delayMs,callbackPreview:x.callbackPreview||'',count:0,maxDurationMs:0,totalFires:0};
   g.count++;g.maxDurationMs=Math.max(g.maxDurationMs,+x.maxDurationMs||0);g.totalFires+=+x.fires||0;groups.set(key,g);
  }
  const duplicates=[...groups.values()].filter(x=>x.count>1).sort((a,b)=>b.count-a.count).slice(0,30);
  return {available:true,activeCount:+p.activeCount||0,suspectCount:(p.suspect||[]).length,duplicates,suspect:(p.suspect||[]).slice(0,30)};
 }catch(e){return {available:false,error:String(e?.message||e)}}
}
function currentMetrics(){
 const rt=runtime(),ip=intervalProfile(),errs=(window.hlgbInternalAuditor?.runtimeErrors||[]).length;
 return {at:now(),version:String(window.HLGB_RELEASE_VERSION||''),page:page(),intervalActive:ip.activeCount||0,intervalSuspect:ip.suspectCount||0,intervalDuplicateGroups:(ip.duplicates||[]).length,domMutations:domStats.total,domMaxBurst:domStats.maxBurst,longTasks:longTasks.length,runtimeErrors:errs,recordInstalls:+(rt.payrollRace?.recordInstalls??rt.payrollReliable?.finalGuard?.recordInstalls??0)||0,reliableInstalls:+(rt.payrollRace?.reliableInstalls??rt.payrollReliable?.finalGuard?.reliableInstalls??0)||0,saveInstalls:+(rt.payrollRace?.saveInstalls??rt.payrollReliable?.finalGuard?.saveInstalls??0)||0};
}
function regression(metrics){
 const prev=readBaseline(),findings=[];if(!prev)return {baseline:null,findings};
 const add=(severity,code,detail)=>findings.push({severity,code,detail});
 if(metrics.intervalActive>=prev.intervalActive+4&&metrics.intervalActive>prev.intervalActive*1.35)add('warn','interval-growth','Intervalos ativos cresceram de '+prev.intervalActive+' para '+metrics.intervalActive+'.');
 if(metrics.intervalDuplicateGroups>=prev.intervalDuplicateGroups+2)add('warn','interval-duplicates','Grupos de intervalos repetidos cresceram de '+prev.intervalDuplicateGroups+' para '+metrics.intervalDuplicateGroups+'.');
 if(metrics.recordInstalls>=prev.recordInstalls+3)add('error','record-wrapper-growth','recordInstalls cresceu de '+prev.recordInstalls+' para '+metrics.recordInstalls+'.');
 if(metrics.runtimeErrors>=prev.runtimeErrors+3)add('warn','runtime-errors-growth','Erros de runtime cresceram de '+prev.runtimeErrors+' para '+metrics.runtimeErrors+'.');
 if(metrics.longTasks>=Math.max(3,prev.longTasks+2))add('warn','long-task-growth','Foram observadas '+metrics.longTasks+' tarefas longas nesta sessão.');
 if(metrics.domMaxBurst>=Math.max(250,(prev.domMaxBurst||0)*2))add('warn','dom-churn-growth','Pico de alterações visuais subiu para '+metrics.domMaxBurst+' mutações em curto intervalo.');
 return {baseline:prev,findings};
}
function findAuditorRoot(){
 const s=document.getElementById('hlgbSmartStatus');if(!s)return null;
 return s.closest('[role="dialog"],.modal,.modal-content,.modalCard,.modal-card,.dialog')||s.parentElement?.parentElement||s.parentElement;
}
function enforceSimpleUi(){
 const root=findAuditorRoot();if(!root)return;
 const allowed=/hlgbAuditorSmartRun|hlgbAuditorSmartProblem|hlgbAuditorSmartHistory|closeModal/;
 for(const b of root.querySelectorAll('button,a,[role="button"]')){
  if(b.id==='hlgbSmartTest'||b.id==='hlgbSmartProblem'||b.id==='hlgbSmartHistoryBtn'||b.id==='hlgbSafariDownload9368')continue;
  const code=String(b.getAttribute('onclick')||'');
  const txt=String(b.textContent||'').trim().toLowerCase();
  const close=b.classList?.contains('modalSave')||/fechar|close/.test(txt)||/closeModal/.test(code);
  const legacy=/auditor|diagn[oó]st|black.?box|sincron|varredura|visual|exportar|copiar|critical|cr[ií]tico|limpar/.test(txt+' '+code);
  if(!close&&!allowed.test(code)&&legacy&&!b.hidden){b.hidden=true;b.setAttribute('data-hlgb-auditor-hidden','1')}
 }
}
function installPassiveObservers(){
 if(!domObserver&&typeof MutationObserver==='function'){
  try{domObserver=new MutationObserver(list=>{const n=list.length,t=Date.now(),p=page()||'sem-pagina';domStats.total+=n;domStats.byPage[p]=(domStats.byPage[p]||0)+n;if(!domStats.burstStarted||t-domStats.burstStarted>1000){domStats.burstStarted=t;domStats.burst=n}else domStats.burst+=n;domStats.maxBurst=Math.max(domStats.maxBurst,domStats.burst);if(document.getElementById('hlgbSmartStatus'))enforceSimpleUi()});domObserver.observe(document.getElementById('appShell')||document.body,{subtree:true,childList:true,attributes:true})}catch(e){push('observer-error',{kind:'dom',message:String(e?.message||e)})}
 }
 if(!longTaskObserver&&typeof PerformanceObserver==='function'){
  try{if(PerformanceObserver.supportedEntryTypes?.includes?.('longtask')){longTaskObserver=new PerformanceObserver(list=>{for(const x of list.getEntries()){longTasks.push({at:now(),durationMs:+x.duration.toFixed(1),name:x.name||'longtask',page:page()});if(longTasks.length>50)longTasks.shift()}});longTaskObserver.observe({entryTypes:['longtask']})}}catch(e){push('observer-error',{kind:'performance',message:String(e?.message||e)})}
 }
}
async function collectSupportBundle(){try{if(typeof window.hlgbAuditorBlackbox9299?.collect==='function')return await window.hlgbAuditorBlackbox9299.collect()}catch(e){push('blackbox-error',{message:String(e?.message||e)})}return null}
async function runBackgroundAudit(){
 let row=null;
 if(typeof window.hlgbInternalAuditor?.run==='function')row=await window.hlgbInternalAuditor.run('full',false);
 else if(typeof window.hlgbInternalAuditor?.buildRun==='function')row=window.hlgbInternalAuditor.buildRun('full');
 else throw new Error('Auditor interno não carregado.');
 try{row.operational=window.hlgbOperationalAuditor9314?.run?.()||null}catch(e){row.operational={error:String(e?.message||e)}}
 try{row.syncReadOnly=await window.hlgbInternalAuditor?.buildSyncDiagnostic?.()}catch(e){row.syncReadOnly={error:String(e?.message||e)}}
 return row;
}
async function run(source='manual'){
 if(busy)return null;busy=true;push('audit-start',{source});
 try{
  let row;
  if(source==='first-access-daily')row=await runBackgroundAudit();
  else if(typeof window.hlgbAuditorRunVisualSweep==='function')row=await window.hlgbAuditorRunVisualSweep();
  else if(typeof window.hlgbInternalAuditor?.runVisualSweep==='function')row=await window.hlgbInternalAuditor.runVisualSweep(true);
  else row=await runBackgroundAudit();
  const metrics=currentMetrics(),reg=regression(metrics),op=row?.operational?.summary||null;
  const basePass=+row?.summary?.pass||0,baseWarn=+row?.summary?.warn||0,baseFail=+row?.summary?.fail||0;
  const h={type:'audit',source,at:row?.completedAt||now(),result:(baseFail+(+op?.fail||0))?'Falhou':(baseWarn+(+op?.warn||0))?'Atenção':row?.summary?.result||'Concluído',pass:basePass+(+op?.pass||0),warn:baseWarn+(+op?.warn||0),fail:baseFail+(+op?.fail||0),version:String(window.HLGB_RELEASE_VERSION||''),metrics,regressions:reg.findings.length,background:source==='first-access-daily'};
  saveHist(h);writeBaseline(metrics);push('audit-finish',h);return row;
 }catch(e){push('audit-error',{source,message:String(e?.message||e)});throw e}finally{busy=false}
}
function downloadJson(data,prefix){const safe=window.hlgbInternalAuditor?.redactDiagnostic?window.hlgbInternalAuditor.redactDiagnostic(data):data;const blob=new Blob([JSON.stringify(safe,null,2)],{type:'application/json;charset=utf-8'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=prefix+'-'+new Date().toISOString().replace(/[:.]/g,'-')+'.json';document.body.appendChild(a);a.click();setTimeout(()=>{try{URL.revokeObjectURL(a.href)}catch(e){}a.remove()},900)}
function wrapperDepthFromSync(sync){
 const chains=sync?.runtime?.guards?.wrapperChains||{};let max=0,name='';
 for(const [k,v] of Object.entries(chains)){const d=+v?.depth||0;if(d>max){max=d;name=k}}
 return {max,name};
}
function diagnosticText(sync,support){
 const parts=[];
 try{parts.push(JSON.stringify(sync||{}))}catch(e){}
 try{parts.push(JSON.stringify(support||{}))}catch(e){}
 try{parts.push(JSON.stringify((window.hlgbInternalAuditor?.runtimeErrors||[]).slice(-80)))}catch(e){}
 try{parts.push(JSON.stringify(events.slice(-120)))}catch(e){}
 return parts.join(' ').toLowerCase();
}
function classifyProblem(sync,reg,ip,support){
 const observed=[],probableCauses=[];const add=(arr,code,detail)=>{if(!arr.some(x=>x.code===code))arr.push({code,detail})};
 const s=sync?.summary||{},pending=(+s.normalizedPending||0)+(+s.walLocalStorage||0)+(+s.walIndexedDb||0),txt=diagnosticText(sync,support);
 if(pending>0)add(observed,'sync-pending',pending+' item(ns) aparecem nas filas de sincronização/WAL.');
 const pendingAnalysis=support?.pendingAnalysis||{};
 if(+pendingAnalysis.retryLoops>0)add(probableCauses,'retry-loop',pendingAnalysis.retryLoops+' operação(ões) estão repetindo tentativas.');
 if(+pendingAnalysis.conflicts>0)add(probableCauses,'sync-conflict',pendingAnalysis.conflicts+' conflito(s) de sincronização foram identificados.');
 const wd=wrapperDepthFromSync(sync);if(wd.max>=24)add(probableCauses,'wrapper-chain-deep','Cadeia '+wd.name+' chegou a profundidade '+wd.max+'.');
 for(const f of (reg?.findings||[])){
  if(f.code==='record-wrapper-growth')add(probableCauses,'wrapper-growth',f.detail);
  else if(f.code==='interval-growth'||f.code==='interval-duplicates')add(probableCauses,'timer-loop',f.detail);
  else if(f.code==='dom-churn-growth')add(probableCauses,'render-loop',f.detail);
  else if(f.code==='runtime-errors-growth')add(observed,'runtime-errors',f.detail);
  else if(f.code==='long-task-growth')add(observed,'performance',f.detail);
 }
 if((ip?.duplicates||[]).length>=2)add(probableCauses,'duplicate-timers',(ip.duplicates||[]).length+' grupos de timers duplicados estão ativos.');
 if((window.hlgbInternalAuditor?.runtimeErrors||[]).length)add(observed,'javascript-errors',(window.hlgbInternalAuditor.runtimeErrors||[]).length+' erro(s) de runtime foram capturados nesta sessão.');
 if(/cache local cheio|local cache.*full|quotaexceeded/.test(txt)){add(observed,'local-cache-full','O armazenamento local atingiu o limite ou entrou em modo nuvem.');add(probableCauses,'storage-pressure','Pressão no armazenamento local pode impedir cache/persistência local normal.')}
 if(/canceling statement due to statement timeout|statement timeout|57014/.test(txt)){add(observed,'supabase-query-timeout','Uma consulta ao Supabase foi cancelada por timeout.');add(probableCauses,'slow-database-query','Há indício de consulta pesada/lenta no banco ou paginação insuficiente.')}
 if(/status of 500|http 500|status.?500|server responded with a status of 500/.test(txt))add(observed,'supabase-http-500','Foi detectada resposta HTTP 500 em chamada ao Supabase.');
 if(/multiple gotrueclient instances|multiple gotrueclient/.test(txt)){add(observed,'multiple-auth-clients','Foram detectadas múltiplas instâncias do cliente de autenticação Supabase.');add(probableCauses,'duplicate-supabase-client','Mais de um cliente GoTrue/Supabase pode estar sendo criado no mesmo contexto do navegador.')}
 if(/nuvem demorou demais.*patch|patch.*demorou demais|patch.*timeout|timeout.*patch/.test(txt)){add(observed,'patch-confirmation-timeout','Uma gravação PATCH demorou demais para confirmar.');add(probableCauses,'cloud-save-timeout','A alteração pode ter ficado aguardando confirmação/reenvio na sincronização.')}
 if(!observed.length)add(observed,'no-obvious-symptom','Nenhum sintoma técnico forte foi identificado no instante da captura.');
 if(!probableCauses.length)add(probableCauses,'cause-undetermined','A causa técnica ainda não pôde ser determinada automaticamente.');
 return {observed,probableCauses};
}
async function problem(){
 push('problem-capture');let sync=null;try{sync=await window.hlgbInternalAuditor?.buildSyncDiagnostic?.()}catch(e){sync={error:String(e?.message||e)}}
 const metrics=currentMetrics(),reg=regression(metrics),support=await collectSupportBundle(),ip=intervalProfile(),analysis=classifyProblem(sync,reg,ip,support);
 const data={kind:'hlgb_bug_capture',captureVersion:V,createdAt:now(),appVersion:String(window.HLGB_RELEASE_VERSION||''),page:page(),online:navigator.onLine,analysis,events:[...events],runtimeErrors:[...(window.hlgbInternalAuditor?.runtimeErrors||[])].slice(-40),runtime:runtime(),intervalProfile:ip,passivePerformance:{dom:clone(domStats),longTasks:[...longTasks]},regression:reg,latestAudit:window.hlgbInternalAuditor?.latest?.()||null,sync,supportBlackbox:support};
 try{downloadJson(data,'HLGB-PROBLEMA')}catch(e){}
 saveHist({type:'problem',at:now(),page:page(),result:'Problema registrado',regressions:reg.findings.length});alert('Problema registrado. O pacote técnico foi preparado para análise.');return data;
}
function historyHtml(){const a=hist().slice(0,20);if(!a.length)return '<div class="empty">Nenhum registro ainda.</div>';return a.map(x=>{const title=x.type==='problem'?'Problema registrado':'Auditoria completa',when=esc(String(x.at||'').replace('T',' ').slice(0,16)),detail=x.type==='audit'?' · '+esc(x.result||'')+' · '+(+x.warn||0)+' atenções · '+(+x.fail||0)+' falhas':' · '+esc(x.page||''),reg=x.regressions?' · '+x.regressions+' regressões':'';return '<div class="panel" style="margin:7px 0"><b>'+esc(title)+'</b><div class="sub">'+when+detail+reg+'</div></div>'}).join('')}
function toggleHistory(){const b=document.getElementById('hlgbSmartHistory');if(!b)return;b.style.display=b.style.display==='none'?'block':'none';b.innerHTML=historyHtml();enforceSimpleUi()}
function openSmart(){const body='<div class="sub">Auditoria automática e somente de leitura. Menos botões, mais diagnóstico por trás.</div><div class="panel" id="hlgbSmartStatus" style="margin-top:12px">'+status()+'</div><div class="hlgb-auditor-actions" style="display:flex;gap:8px;flex-wrap:wrap;margin:12px 0"><button id="hlgbSmartTest" class="primary" type="button" onclick="hlgbAuditorSmartRun()">🧪 Testar sistema</button><button id="hlgbSmartProblem" class="secondary" type="button" onclick="hlgbAuditorSmartProblem()">🛠️ Registrar problema</button><button id="hlgbSmartHistoryBtn" class="secondary" type="button" onclick="hlgbAuditorSmartHistory()">🕘 Histórico</button></div><div id="hlgbAuditorResult"></div><div id="hlgbSmartHistory" style="display:none"></div><button type="button" class="secondary modalSave">Fechar</button>';if(typeof openModal==='function'){openModal('Auditor HLGB',body,()=>closeModal());enforceSimpleUi();queueMicrotask(enforceSimpleUi);setTimeout(enforceSimpleUi,50);setTimeout(enforceSimpleUi,300)}}
async function daily(){try{const k=DAILY+user().toLowerCase(),d=today();if(localStorage.getItem(k)===d)return;push('daily-scheduled');await new Promise(r=>setTimeout(r,1800));const row=await run('first-access-daily');if(row)localStorage.setItem(k,d)}catch(e){push('daily-error',{message:String(e?.message||e)})}}
function boot(){
 installPassiveObservers();
 window.addEventListener('error',e=>push('js-error',{message:e?.message||'Erro JavaScript'}),true);
 window.addEventListener('unhandledrejection',e=>push('promise-error',{message:e?.reason?.message||String(e?.reason||'Promise rejeitada')}),true);
 document.addEventListener('click',e=>{const t=e.target?.closest?.('button,a,[role="button"]');if(t)push('ui-action',{text:String(t.textContent||'').trim().replace(/\s+/g,' ').slice(0,100),id:t.id||''})},true);
 window.openHlgbAuditor=openSmart;
 window.hlgbAuditorSmartRun=async()=>{const out=document.getElementById('hlgbAuditorResult');if(out)out.innerHTML='<div class="panel"><b>Executando auditoria completa…</b><div class="sub">Nenhum dado operacional será alterado.</div></div>';try{const row=await run('manual');if(out)out.innerHTML='<div class="panel">'+status()+'</div>';const s=document.getElementById('hlgbSmartStatus');if(s)s.innerHTML=status();enforceSimpleUi();return row}catch(e){if(out)out.innerHTML='<div class="panel"><b>Falha no teste.</b><div class="sub">'+esc(e?.message||e)+'</div></div>'}};
 window.hlgbAuditorSmartProblem=problem;window.hlgbAuditorSmartHistory=toggleHistory;
 window.hlgbAuditorSmart={version:V,run,runBackgroundAudit,problem,hist,push,currentMetrics,regression,intervalProfile,classifyProblem,enforceSimpleUi,domStats,longTasks};
 try{if(typeof hlgbAfterLogin==='function')hlgbAfterLogin(()=>setTimeout(()=>{installPassiveObservers();daily()},1400),0);else setTimeout(daily,3000)}catch(e){setTimeout(daily,3000)}
 console.info('[HLGB] Auditor simplificado v'+V+' ativo');
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
