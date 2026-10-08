/* HLGB v93.29 — executor visual local, somente leitura, integrado ao Auditor existente */
(function(){
'use strict';
const V='93.29';
const PROGRESS_KEY='hlgb_visual_test_progress_v9329';
const LAST_REPORT_KEY='hlgb_visual_test_last_report_v9329';
const TARGETS=[
  {id:'dashboard',label:'Dashboard'},
  {id:'pedidos',label:'Pedidos'},
  {id:'separacao',label:'Separação'},
  {id:'corte',label:'Corte'},
  {id:'producao',label:'Produção'},
  {id:'capacidadeProducao',label:'Planejamento de capacidade'},
  {id:'projecao',label:'Projeção semanal'},
  {id:'hubFinanceiro',label:'Hub Financeiro'},
  {id:'folhaPagamento',label:'RH / Folha'}
];
let running=false,cancelRequested=false,currentRun=null,errors=[],hubEvents=[];
let errorHandler=null,rejectionHandler=null,hubHandler=null;
const now=()=>new Date().toISOString();
const sid=v=>String(v??'');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function clone(v){try{return JSON.parse(JSON.stringify(v))}catch(e){return v}}
function safeJsonParse(v,f=null){try{return JSON.parse(v)}catch(e){return f}}
function readProgress(){try{return safeJsonParse(localStorage.getItem(PROGRESS_KEY),null)}catch(e){return null}}
function writeProgress(v){try{localStorage.setItem(PROGRESS_KEY,JSON.stringify(v))}catch(e){}}
function clearProgress(){try{localStorage.removeItem(PROGRESS_KEY)}catch(e){}}
function saveLastReport(v){try{localStorage.setItem(LAST_REPORT_KEY,JSON.stringify(v))}catch(e){}}
function readLastReport(){try{return safeJsonParse(localStorage.getItem(LAST_REPORT_KEY),null)}catch(e){return null}}
function redactText(v){
 let s=sid(v);
 s=s.replace(/Bearer\s+[A-Za-z0-9._~-]+/gi,'Bearer [REMOVIDO]');
 s=s.replace(/eyJ[a-zA-Z0-9_-]{12,}\.[a-zA-Z0-9_-]{12,}\.[a-zA-Z0-9_-]{12,}/g,'[TOKEN REMOVIDO]');
 s=s.replace(/(senha|password|token|authorization)\s*[:=]\s*[^\s,;]+/gi,'$1=[REMOVIDO]');
 return s.slice(0,1800);
}
function appVersion(){try{return sid(window.HLGB_RELEASE_VERSION||document.querySelector('#appShell .logo small')?.textContent||'').replace(/^v/i,'')||'desconhecida'}catch(e){return 'desconhecida'}}
function activePage(){return document.querySelector('#appShell .page.active')?.id||''}
function loggedIn(){const app=document.getElementById('appShell'),login=document.getElementById('loginScreen');return !!app&&((app.style.display==='block')||app.offsetParent!==null)&&(!login||login.style.display==='none'||login.offsetParent===null)}
function scriptsLoaded(){
 const out=[];
 document.querySelectorAll('script[src]').forEach(s=>out.push(s.src));
 try{for(const e of performance.getEntriesByType('resource'))if(/\.js(?:\?|$)/i.test(e.name)&&!out.includes(e.name))out.push(e.name)}catch(e){}
 return [...new Set(out)].slice(0,220);
}
function scriptName(u){try{return new URL(u,location.href).pathname.split('/').pop()||u}catch(e){return u}}
function collectRuntimeCounters(){
 const out={};
 try{if(window.hlgbRuntimeRecovery9326?.state)out.runtimeRecovery=clone(window.hlgbRuntimeRecovery9326.state())}catch(e){}
 try{if(window.hlgbSaveTransport9320?.status)out.saveTransport=clone(window.hlgbSaveTransport9320.status())}catch(e){}
 try{if(window.hlgbSyncRecovery9301?.status)out.syncRecovery=clone(window.hlgbSyncRecovery9301.status())}catch(e){}
 try{if(window.hlgbHubPrimary9323?.state)out.hubPrimary=clone(window.hlgbHubPrimary9323.state())}catch(e){}
 try{if(window.hlgbHubDelivery9324?.state)out.hubDelivery=clone(window.hlgbHubDelivery9324.state())}catch(e){}
 try{if(window.hlgbOperationalAuditor9314?.pending)out.pending=clone(window.hlgbOperationalAuditor9314.pending())}catch(e){}
 return out;
}
function installTemporaryInstrumentation(){
 errors=[];hubEvents=[];
 errorHandler=e=>errors.push({at:now(),type:'error',message:redactText(e?.message||'Erro JavaScript'),stack:redactText(e?.error?.stack||'')});
 rejectionHandler=e=>errors.push({at:now(),type:'unhandledrejection',message:redactText(e?.reason?.message||e?.reason||'Promise rejeitada'),stack:redactText(e?.reason?.stack||'')});
 hubHandler=e=>{const d=e?.detail||{};hubEvents.push({at:now(),type:sid(d.type||''),version:sid(d.version||''),source:sid(d.source||''),durationMs:Number(d.durationMs||0)});if(hubEvents.length>160)hubEvents.shift()};
 window.addEventListener('error',errorHandler,true);
 window.addEventListener('unhandledrejection',rejectionHandler,true);
 window.addEventListener('hlgb:hub-debug',hubHandler,true);
}
function removeTemporaryInstrumentation(){
 if(errorHandler)window.removeEventListener('error',errorHandler,true);
 if(rejectionHandler)window.removeEventListener('unhandledrejection',rejectionHandler,true);
 if(hubHandler)window.removeEventListener('hlgb:hub-debug',hubHandler,true);
 errorHandler=rejectionHandler=hubHandler=null;
}
function rectSnapshot(root){
 const nodes=[...root.querySelectorAll('h1,h2,.panel,.card,table,button,input,select,textarea')].filter(el=>{
  try{const st=getComputedStyle(el),r=el.getBoundingClientRect();return st.display!=='none'&&st.visibility!=='hidden'&&r.width>0&&r.height>0}catch(e){return false}
 }).slice(0,70);
 return nodes.map((el,i)=>{const r=el.getBoundingClientRect();return {k:el.id?('id:'+el.id):(el.getAttribute('name')?('name:'+el.getAttribute('name')):('n:'+i+':'+el.tagName+':'+sid(el.textContent).trim().slice(0,30))),x:+r.x.toFixed(1),y:+r.y.toFixed(1),w:+r.width.toFixed(1),h:+r.height.toFixed(1)}});
}
function compareRects(a,b){const bm=new Map((b||[]).map(x=>[x.k,x])),moves=[];for(const x of a||[]){const y=bm.get(x.k);if(!y)continue;const dx=Math.abs(x.x-y.x),dy=Math.abs(x.y-y.y),dw=Math.abs(x.w-y.w),dh=Math.abs(x.h-y.h),m=Math.max(dx,dy,dw,dh);if(m>2)moves.push({key:x.k,dx:+dx.toFixed(1),dy:+dy.toFixed(1),dw:+dw.toFixed(1),dh:+dh.toFixed(1),max:+m.toFixed(1)})}return moves}
function loadingSignals(root){
 const out=[];
 for(const el of root.querySelectorAll('button,.badge,.sub,[role="status"],.loading,.spinner')){
  const t=sid(el.textContent).replace(/\s+/g,' ').trim();
  if(/carregando|aguarde|salvando|sincronizando|confirmando/i.test(t))out.push({id:el.id||'',text:t.slice(0,120),disabled:!!el.disabled});
  if(out.length>=20)break;
 }
 return out;
}
async function responsivenessProbe(){const start=performance.now();await sleep(120);const elapsed=performance.now()-start,drift=Math.max(0,elapsed-120);return {elapsedMs:+elapsed.toFixed(1),driftMs:+drift.toFixed(1),responsive:drift<650}}
function pageFunction(id){
 try{if(typeof window.page==='function')return ()=>window.page(id)}catch(e){}
 return ()=>{document.querySelectorAll('#appShell .page').forEach(x=>x.classList.remove('active'));document.getElementById(id)?.classList.add('active')}
}
async function openPage(target){
 const el=document.getElementById(target.id);if(!el)return {ok:false,error:'Tela não encontrada no DOM.'};
 try{pageFunction(target.id)()}catch(e){return {ok:false,error:redactText(e?.message||e)}}
 await sleep(180);
 return {ok:activePage()===target.id||el.classList.contains('active')};
}
function pageMetrics(el){const r=el.getBoundingClientRect();return {scrollX:window.scrollX||0,scrollY:window.scrollY||0,pageScrollTop:el.scrollTop||0,height:+r.height.toFixed(1),scrollHeight:el.scrollHeight||0,docHeight:document.documentElement?.scrollHeight||0,anchors:rectSnapshot(el),loading:loadingSignals(el)}}
async function idleMeasure(el){
 const a=pageMetrics(el),resp1=await responsivenessProbe();await sleep(260);const b=pageMetrics(el);await sleep(260);const c=pageMetrics(el),resp2=await responsivenessProbe();
 const moves=[...compareRects(a.anchors,b.anchors),...compareRects(b.anchors,c.anchors)],maxShift=moves.reduce((m,x)=>Math.max(m,x.max||0),0);
 return {start:a,end:c,maxShiftPx:+maxShift.toFixed(1),moves:moves.slice(0,20),scrollJumpPx:Math.max(Math.abs((b.scrollY||0)-(a.scrollY||0)),Math.abs((c.scrollY||0)-(b.scrollY||0))),heightDelta:Math.max(Math.abs((b.height||0)-(a.height||0)),Math.abs((c.height||0)-(b.height||0))),responsive:resp1.responsive&&resp2.responsive,responsiveness:[resp1,resp2],loadingAtEnd:c.loading};
}
function operationalFingerprints(){
 let pending='',wal='';
 try{pending=localStorage.getItem('hlgb_records_pending_v91')||''}catch(e){}
 try{wal=localStorage.getItem('hlgb_durable_wal_v1')||''}catch(e){}
 return {pending,wal};
}
function sameOperationalFingerprints(a,b){return a.pending===b.pending&&a.wal===b.wal}
function findHubEditButton(){
 const root=document.getElementById('hubFinanceiro');if(!root)return null;
 return [...root.querySelectorAll('button')].find(b=>/editar/i.test(sid(b.textContent))&&!b.disabled)||null;
}
function visibleModal(){return [...document.querySelectorAll('.modal,.modalbox,#modal')].find(el=>{try{const s=getComputedStyle(el),r=el.getBoundingClientRect();return s.display!=='none'&&s.visibility!=='hidden'&&r.width>0&&r.height>0}catch(e){return false}})||null}
function safeCloseModal(modal){
 if(!modal)return;
 const cancel=[...modal.querySelectorAll('button')].find(b=>/cancelar|fechar|voltar/i.test(sid(b.textContent))&&!/salvar/i.test(sid(b.textContent)));
 if(cancel){try{cancel.click();return}catch(e){}}
 try{if(typeof window.closeModal==='function')window.closeModal()}catch(e){}
}
async function hubReadOnlyChecks(){
 const result={status:'approved',steps:[],cause:'causa não identificada'};
 const root=document.getElementById('hubFinanceiro');if(!root)return {status:'failed',steps:[],error:'Hub não encontrado.',cause:'causa não identificada'};
 const before=operationalFingerprints();
 const week=document.getElementById('hubFinanceWeek');
 if(week){
   const original=week.value;
   try{
     const fn=sid(window.changeHubFinanceWeek?.toString?.()||'');
     const risky=/hlgbRecordSaveWithRetry|persistDb|cloudRequest\(|rpc\/hlgb_save_record/i.test(fn);
     if(risky)result.steps.push({name:'troca de semana',status:'inconclusive',detail:'Função contém chamada potencial de persistência; teste pulado por segurança.'});
     else{
       const d=new Date((original||new Date().toISOString().slice(0,10))+'T12:00:00');d.setDate(d.getDate()+7);const next=d.toISOString().slice(0,10);
       week.value=next;week.dispatchEvent(new Event('change',{bubbles:true}));await sleep(180);week.value=original;week.dispatchEvent(new Event('change',{bubbles:true}));await sleep(180);
       result.steps.push({name:'troca de semana',status:'approved',detail:'Semana alterada e restaurada sem gravar dados operacionais.'});
     }
   }catch(e){result.steps.push({name:'troca de semana',status:'inconclusive',detail:redactText(e?.message||e)});result.status='inconclusive'}
 }else{result.steps.push({name:'troca de semana',status:'not_executed',detail:'Controle de semana não encontrado.'});result.status='inconclusive'}
 const edit=findHubEditButton();
 if(edit){
   try{edit.click();await sleep(180);const modal=visibleModal();if(modal){safeCloseModal(modal);await sleep(120);result.steps.push({name:'abrir/fechar editar',status:'approved',detail:'Editor abriu e foi fechado sem acionar salvar.'})}else{result.steps.push({name:'abrir/fechar editar',status:'inconclusive',detail:'Clique de edição não abriu modal visível.'});result.status='inconclusive'}}catch(e){result.steps.push({name:'abrir/fechar editar',status:'inconclusive',detail:redactText(e?.message||e)});result.status='inconclusive'}
 }else{result.steps.push({name:'abrir/fechar editar',status:'not_executed',detail:'Nenhum botão Editar visível.'});result.status='inconclusive'}
 try{pageFunction('pedidos')();await sleep(120);pageFunction('hubFinanceiro')();await sleep(160);result.steps.push({name:'sair e voltar',status:activePage()==='hubFinanceiro'?'approved':'failed',detail:activePage()==='hubFinanceiro'?'Retorno ao Hub confirmado.':'Hub não voltou a ficar ativo.'});if(activePage()!=='hubFinanceiro')result.status='failed'}catch(e){result.steps.push({name:'sair e voltar',status:'failed',detail:redactText(e?.message||e)});result.status='failed'}
 const after=operationalFingerprints();
 if(!sameOperationalFingerprints(before,after)){result.status='failed';result.steps.push({name:'proteção de dados',status:'failed',detail:'Fila operacional/WAL mudou durante o teste; nenhuma conclusão de segurança será dada.'})}else result.steps.push({name:'proteção de dados',status:'approved',detail:'Fila normalizada e WAL permaneceram idênticas durante o teste.'});
 return result;
}
function separationReadOnlyChecks(){
 const root=document.getElementById('separacao');if(!root)return {status:'failed',detail:'Tela de Separação não encontrada.'};
 const buttons=[...root.querySelectorAll('button')].filter(b=>{try{const s=getComputedStyle(b),r=b.getBoundingClientRect();return s.display!=='none'&&s.visibility!=='hidden'&&r.width>0&&r.height>0}catch(e){return false}});
 const listLike=root.querySelector('table,tbody,.panel,.cards');
 const dangerous=buttons.filter(b=>/baixar|finalizar|concluir/i.test(sid(b.textContent))).map(b=>({text:sid(b.textContent).trim().slice(0,80),disabled:!!b.disabled}));
 return {status:listLike?'approved':'inconclusive',listPresent:!!listLike,visibleButtons:buttons.length,actionButtons:dangerous.slice(0,20),detail:listLike?'Lista/estrutura presente; nenhuma baixa foi executada.':'Estrutura de lista não identificada; nenhuma ação foi executada.'};
}
function existingAuditorChecks(){try{return clone(window.hlgbInternalAuditor?.auditVisualCurrent?.()||[])}catch(e){return [{status:'warn',title:'Auditor existente falhou',detail:redactText(e?.message||e)}]}}
function classifyPage(target,open,measure,extra,pageErrors){
 if(!open.ok)return 'failed';
 if(!measure.responsive)return 'failed';
 if((pageErrors||[]).length)return 'failed';
 if((measure.loadingAtEnd||[]).length)return 'inconclusive';
 if(measure.maxShiftPx>8||measure.scrollJumpPx>8||measure.heightDelta>24)return 'failed';
 if(extra?.status==='failed')return 'failed';
 if(extra?.status==='inconclusive')return 'inconclusive';
 return 'approved';
}
function checkpoint(run,target,index,status='started'){
 writeProgress({kind:'hlgb_visual_test_progress',version:V,runId:run.id,startedAt:run.startedAt,updatedAt:now(),status,stepIndex:index,stepId:target?.id||'',stepLabel:target?.label||'',total:TARGETS.length,completed:run.pages.length});
}
function overlay(show){
 let el=document.getElementById('hlgbLocalVisualTestOverlay9329');
 if(!show){if(el)el.remove();return}
 if(!el){el=document.createElement('div');el.id='hlgbLocalVisualTestOverlay9329';document.body.appendChild(el)}
 el.style.cssText='position:fixed;inset:0;z-index:2147483600;background:rgba(255,255,255,.985);display:flex;align-items:center;justify-content:center;padding:22px;font-family:Arial,sans-serif;color:#222';
 el.innerHTML='<div style="width:min(680px,95vw);text-align:center"><div style="font-size:42px">👁️</div><h2 style="margin:8px 0">Teste visual — somente leitura</h2><div id="hlgbLocalVisualPct9329" style="font-size:38px;font-weight:900">0%</div><div style="height:18px;background:#eadde4;border-radius:999px;overflow:hidden;margin:12px 0"><div id="hlgbLocalVisualBar9329" style="height:100%;width:0%;background:#6f3f59;transition:width .15s ease"></div></div><div id="hlgbLocalVisualStage9329" style="font-weight:800">Preparando…</div><div id="hlgbLocalVisualDetail9329" style="margin-top:6px">0 de '+TARGETS.length+'</div><button id="hlgbLocalVisualStop9329" type="button" class="secondary" style="margin-top:16px;min-width:170px">Parar</button><div class="sub" style="margin-top:12px">Nenhum pedido, baixa, folha ou lançamento será criado. O progresso mínimo é salvo para detectar interrupção.</div></div>';
 document.getElementById('hlgbLocalVisualStop9329').onclick=()=>{cancelRequested=true;const b=document.getElementById('hlgbLocalVisualStop9329');b.disabled=true;b.textContent='Parando…'};
}
function progress(done,target,phase){const pct=Math.round(done/TARGETS.length*100),p=document.getElementById('hlgbLocalVisualPct9329'),b=document.getElementById('hlgbLocalVisualBar9329'),s=document.getElementById('hlgbLocalVisualStage9329'),d=document.getElementById('hlgbLocalVisualDetail9329');if(p)p.textContent=pct+'%';if(b)b.style.width=pct+'%';if(s)s.textContent=(target?target.label+': ':'')+phase;if(d)d.textContent=done+' de '+TARGETS.length+' concluídas'}
function snapshotUi(){const ids=['hubFinanceWeek','hlgbHubPeriodMode','hlgbHubPeriodWeek','hlgbHubPeriodMonth','hlgbHubPeriodYear'];const values={};ids.forEach(id=>{const el=document.getElementById(id);if(el)values[id]=el.value});return {page:activePage(),scrollX:window.scrollX||0,scrollY:window.scrollY||0,values}}
async function restoreUi(snap){
 try{for(const [id,v] of Object.entries(snap?.values||{})){const el=document.getElementById(id);if(el&&el.value!==v)el.value=v}}catch(e){}
 try{if(snap?.page)pageFunction(snap.page)()}catch(e){}
 await sleep(80);try{window.scrollTo(snap?.scrollX||0,snap?.scrollY||0)}catch(e){}
}
function buildReadableSummary(report){
 const lines=['HLGB — TESTE VISUAL LOCAL','Execução: '+report.id,'Versão: '+report.appVersion,'Endereço: '+report.url,'Início: '+report.startedAt,'Fim: '+(report.completedAt||'-'),'Resultado: '+report.summary.result,''];
 for(const p of report.pages)lines.push((p.status==='approved'?'APROVADO':p.status==='failed'?'FALHOU':p.status==='not_executed'?'NÃO EXECUTADO':'INCONCLUSIVO')+' — '+p.label+' — '+(p.detail||''));
 if(report.interrupted)lines.push('','Execução interrompida durante: '+sid(report.interrupted.stepLabel||report.interrupted.stepId||'-'));
 lines.push('','Este teste valida navegação e estabilidade após login. Não valida login, salvamento, baixa ou sincronização multiusuário.');
 return lines.join('\n');
}
function download(name,text,type){const blob=new Blob([text],{type}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();setTimeout(()=>{try{URL.revokeObjectURL(a.href)}catch(e){}a.remove()},800)}
function exportReport(report=currentRun||readLastReport()){if(!report)return false;const stamp=new Date().toISOString().replace(/[:.]/g,'-');download('HLGB-TESTE-VISUAL-'+stamp+'.json',JSON.stringify(report,null,2),'application/json;charset=utf-8');download('HLGB-TESTE-VISUAL-RESUMO-'+stamp+'.txt',buildReadableSummary(report),'text/plain;charset=utf-8');return true}
async function run(){
 if(running)return alert('Já existe um teste visual em execução.');
 if(!loggedIn())return alert('Entre no sistema primeiro. O teste visual só pode iniciar após o login concluído.');
 running=true;cancelRequested=false;
 const ui=snapshotUi(),beforeErrors=errors.length;
 const run={id:'visual-'+Date.now()+'-'+Math.floor(Math.random()*900000+100000),kind:'hlgb_local_visual_test',version:V,readOnly:true,startedAt:now(),completedAt:null,appVersion:appVersion(),url:location.href,browser:navigator.userAgent,viewport:{width:innerWidth,height:innerHeight,devicePixelRatio:devicePixelRatio||1},scripts:scriptsLoaded().map(src=>({src,name:scriptName(src)})),pages:[],runtimeErrors:[],hubEvents:[],countersBefore:collectRuntimeCounters(),countersAfter:null,cancelled:false,interrupted:null,summary:{approved:0,failed:0,notExecuted:0,inconclusive:0,result:'Inconclusivo'},limitations:['Não valida login.','Não executa salvamento ou baixa.','Não valida sincronização multiusuário.','Um travamento total da página também interrompe este executor; o checkpoint identifica apenas a última etapa iniciada.']};
 currentRun=run;installTemporaryInstrumentation();overlay(true);
 try{
  for(let i=0;i<TARGETS.length;i++){
   const target=TARGETS[i];if(cancelRequested)break;
   checkpoint(run,target,i,'started');progress(run.pages.length,target,'abrindo…');
   const errStart=errors.length,started=performance.now(),open=await openPage(target);
   if(cancelRequested)break;
   if(!open.ok){const row={id:target.id,label:target.label,status:'failed',durationMs:+(performance.now()-started).toFixed(1),detail:open.error||'A tela não ficou ativa.',error:open.error||'',cause:'causa não identificada'};run.pages.push(row);checkpoint(run,target,i,'completed');progress(run.pages.length,target,'falhou');continue}
   progress(run.pages.length,target,'medindo estabilidade…');
   const el=document.getElementById(target.id),measure=await idleMeasure(el);
   let extra=null;
   if(target.id==='hubFinanceiro'){progress(run.pages.length,target,'testando Hub sem salvar…');extra=await hubReadOnlyChecks()}
   else if(target.id==='separacao')extra=separationReadOnlyChecks();
   const pageErrors=errors.slice(errStart).map(clone),auditorChecks=existingAuditorChecks();
   const status=classifyPage(target,open,measure,extra,pageErrors);
   const causes=[];
   if(status!=='approved'){
     if(!measure.responsive)causes.push('event loop sem resposta dentro do limite');
     if(measure.maxShiftPx>8)causes.push('mudança de posição acima de 8px');
     if(measure.scrollJumpPx>8)causes.push('rolagem mudou sem interação');
     if(measure.heightDelta>24)causes.push('altura da tela mudou durante repouso');
     if(measure.loadingAtEnd.length)causes.push('indicador de carregamento permaneceu visível');
     if(pageErrors.length)causes.push('erro JavaScript/rejeição durante a etapa');
   }
   const row={id:target.id,label:target.label,status,durationMs:+(performance.now()-started).toFixed(1),detail:status==='approved'?'Tela abriu e permaneceu estável no período observado.':causes.join('; ')||'Teste inconclusivo.',cause:causes.length?causes.join('; '):'causa não identificada',open,measure:{maxShiftPx:measure.maxShiftPx,scrollJumpPx:measure.scrollJumpPx,heightDelta:measure.heightDelta,responsive:measure.responsive,responsiveness:measure.responsiveness,loadingAtEnd:measure.loadingAtEnd,moves:measure.moves},extra,auditorChecks,pageErrors};
   run.pages.push(row);checkpoint(run,target,i,'completed');progress(run.pages.length,target,status==='approved'?'aprovado':status==='failed'?'falhou':'inconclusivo');await sleep(80);
  }
  if(cancelRequested)run.cancelled=true;
  for(const t of TARGETS)if(!run.pages.some(p=>p.id===t.id))run.pages.push({id:t.id,label:t.label,status:'not_executed',durationMs:0,detail:run.cancelled?'Não executado porque o teste foi interrompido.':'Não executado.',cause:'causa não identificada'});
 }catch(e){run.interrupted={at:now(),step:readProgress(),error:redactText(e?.message||e)};}
 finally{
  removeTemporaryInstrumentation();await restoreUi(ui);overlay(false);run.completedAt=now();run.runtimeErrors=clone(errors.slice(beforeErrors));run.hubEvents=clone(hubEvents);run.countersAfter=collectRuntimeCounters();
  const a=run.pages.filter(x=>x.status==='approved').length,f=run.pages.filter(x=>x.status==='failed').length,n=run.pages.filter(x=>x.status==='not_executed').length,ic=run.pages.filter(x=>x.status==='inconclusive').length;
  run.summary={approved:a,failed:f,notExecuted:n,inconclusive:ic,result:f?'Falhou':(n||ic||a!==TARGETS.length)?'Inconclusivo':'Aprovado'};
  saveLastReport(run);if(!run.interrupted)clearProgress();running=false;currentRun=run;
 }
 showResult(run);return run;
}
function showResult(report){
 const lines=report.pages.map(p=>'<div style="padding:7px 0;border-bottom:1px solid #eee"><b>'+(p.status==='approved'?'✅':p.status==='failed'?'🔴':p.status==='not_executed'?'⚪':'🟡')+' '+p.label+'</b><div class="sub">'+p.status.replace('_',' ')+' · '+sid(p.detail).replace(/[&<>]/g,'')+'</div></div>').join('');
 const box=document.createElement('div');box.style.cssText='position:fixed;inset:0;z-index:2147483601;background:rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center;padding:18px';box.innerHTML='<div class="panel" style="background:#fff;max-width:760px;width:96vw;max-height:88vh;overflow:auto"><h2>Resultado do teste visual: '+report.summary.result+'</h2><div class="cards"><div class="card"><small>Aprovado</small><strong>'+report.summary.approved+'</strong></div><div class="card"><small>Falhou</small><strong>'+report.summary.failed+'</strong></div><div class="card"><small>Inconclusivo</small><strong>'+report.summary.inconclusive+'</strong></div><div class="card"><small>Não executado</small><strong>'+report.summary.notExecuted+'</strong></div></div>'+lines+'<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px"><button type="button" class="primary" data-export>Baixar JSON + resumo</button><button type="button" class="secondary" data-close>Fechar</button></div></div>';document.body.appendChild(box);box.querySelector('[data-export]').onclick=()=>exportReport(report);box.querySelector('[data-close]').onclick=()=>box.remove();
}
function interruptedNotice(){const p=readProgress();if(!p||p.status!=='started')return;const old=document.getElementById('hlgbVisualInterrupted9329');if(old)return;const el=document.createElement('div');el.id='hlgbVisualInterrupted9329';el.className='panel';el.style.cssText='position:fixed;right:16px;bottom:16px;z-index:2147482500;max-width:420px;background:#fff4e5;border:1px solid #f0c36d';el.innerHTML='<b>⚠️ Teste visual anterior foi interrompido</b><div class="sub" style="margin-top:5px">Última etapa iniciada: '+sid(p.stepLabel||p.stepId||'-').replace(/[&<>]/g,'')+'. Isso indica onde a execução parou, não prova a causa.</div><button type="button" class="secondary" style="margin-top:8px">Fechar aviso</button>';document.body.appendChild(el);el.querySelector('button').onclick=()=>el.remove();}
function injectButtons(){
 if(!loggedIn())return false;
 const nav=document.getElementById('nav');if(nav&&!document.getElementById('hlgbLocalVisualRunBtn9329')){const b=document.createElement('button');b.id='hlgbLocalVisualRunBtn9329';b.type='button';b.innerHTML='👁️ Executar teste visual — somente leitura';b.onclick=run;const audit=document.getElementById('hlgbAuditorNavBtn');if(audit)audit.insertAdjacentElement('afterend',b);else nav.appendChild(b)}
 const old=window.hlgbAuditorRunVisualSweep;if(typeof old==='function'&&!old.__hlgbLocalVisual9329){const f=()=>run();f.__hlgbLocalVisual9329=true;f.__legacy=old;window.hlgbAuditorRunVisualSweep=f}
 interruptedNotice();return true;
}
function boot(){injectButtons();try{if(typeof window.hlgbAfterLogin==='function')window.hlgbAfterLogin(()=>setTimeout(injectButtons,300),0)}catch(e){};window.addEventListener('pageshow',()=>setTimeout(injectButtons,150),{once:true})}
window.hlgbLocalVisualTest9329={version:V,run,stop:()=>{cancelRequested=true},exportReport,readLastReport,readProgress,injectButtons,targets:clone(TARGETS)};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
console.info('[HLGB] v'+V+' executor visual local somente leitura integrado ao Auditor');
})();