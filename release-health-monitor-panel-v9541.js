/* HLGB v95.41 — Painel do Monitor Horário no Auditor / Testes.
   Consulta SOMENTE a API pública do GitHub Actions, sem tokens.
   Não toca em Supabase, pedidos, filas WAL, armazenamento nem sincronização.
   O resumo é independente do artefato bruto da execução no GitHub.
*/
(function(){
'use strict';
if(window.hlgbHourlyHealthPanel9541)return;
const V='95.47',REPO='brunomozersilva-stack/hlgb-confeccoes';
const ROOT='https://api.github.com/repos/'+REPO;
const WORKFLOW='HLGB Hourly Health Monitor v95.38';
const MAX_AGE=5*60*1000;
let latest=null,fetchedAt=0,busy=null,error='',accessEvidence=null,retryAfterAt=0;
const ACCESS_BACKOFF=60000;
const sid=x=>String(x==null?'':x);
const date=x=>{try{return x?new Date(x).toLocaleString('pt-BR'):'Não informado'}catch(_){return 'Não informado'}};
const runUrl=x=>Number.isSafeInteger(Number(x?.id))&&Number(x.id)>0?
 'https://github.com/'+REPO+'/actions/runs/'+Number(x.id):'https://github.com/'+REPO+'/actions';
function statusOf(run){
 if(!run)return {label:'Não verificado',className:'warn'};
 if(run.status!=='completed')return {label:'Em execução / na fila',className:'warn'};
 if(run.conclusion==='success')return {label:'Aprovado',className:'ok'};
 if(run.conclusion==='failure')return {label:'Falhou',className:'bad'};
 return {label:'Inconclusivo ('+sid(run.conclusion||run.status)+')',className:'warn'};
}
function accessFailure(response,path){
 const status=Number(response.status),now=Date.now(),header=k=>response.headers?.get?.(k)??null;
 const remaining=header('x-ratelimit-remaining'),reset=header('x-ratelimit-reset'),retry=header('retry-after');
 const retrySeconds=retry!==null&&/^\d+$/.test(retry)?Number(retry):null;
 const retryDate=retry!==null&&retrySeconds===null?Date.parse(retry):NaN;
 const resetAt=reset!==null&&/^\d+$/.test(reset)?Number(reset)*1000:0;
 const rateLimited=status===429||(status===403&&(remaining==='0'||retry!==null));
 const delay=rateLimited?Math.max(ACCESS_BACKOFF,retrySeconds===null?0:retrySeconds*1000,Number.isFinite(retryDate)?retryDate-now:0,remaining==='0'?resetAt-now:0):ACCESS_BACKOFF;
 const evidence={httpStatus:status,classification:rateLimited?'rate-limit':status===403?'access-denied-unclassified':status===401?'authentication-required':status===404?'not-found-or-private':'http-error',endpoint:path.split('?')[0],rateLimitRemaining:remaining!==null&&/^\d+$/.test(remaining)?Number(remaining):null,retryAt:new Date(now+Math.min(delay,86400000)).toISOString()};
 const message=rateLimited?'Limite de consultas do GitHub comprovado (HTTP '+status+').':status===403?'GitHub recusou o acesso (HTTP 403); causa não comprovada.':'GitHub não respondeu à consulta (HTTP '+status+').';
 const e=Error(message);e.accessEvidence=evidence;return e;
}
async function getJSON(path){
 const ctl=typeof AbortController==='function'?new AbortController():null;
 const timer=setTimeout(()=>ctl?.abort(),11000);
 try{
  const response=await fetch(ROOT+path,{
   method:'GET',mode:'cors',credentials:'omit',cache:'no-store',
   headers:{Accept:'application/vnd.github+json'},
   ...(ctl?{signal:ctl.signal}:{})
  });
  if(!response.ok)throw accessFailure(response,path);
  return await response.json();
 }finally{clearTimeout(timer)}
}
// Job-step evidence is not log evidence. Do not infer root cause from a failed run.
function classifyFailureEvidence978A(run,payload){
 const empty=state=>({state,runId:Number(run?.id)||null,classification:'unclassified',jobs:[],rootCauseConfirmed:false,canRepair:false});
 if(!Number.isSafeInteger(Number(run?.id))||Number(run.id)<=0||!Number.isInteger(run.attempt)||run.attempt<1||!Array.isArray(payload?.jobs)||!Number.isSafeInteger(payload.total_count)||payload.total_count!==payload.jobs.length||payload.jobs.length>100)return empty('incomplete-jobs');
 const failed=payload.jobs.filter(j=>j?.conclusion==='failure'),rows=[],ids=new Set();
 for(const j of failed){
  if(Number(j.run_id)!==Number(run.id)||Number(j.run_attempt)!==run.attempt||j.head_sha!==run.commit||!Number.isSafeInteger(j.id)||ids.has(j.id)||j.status!=='completed'||!Array.isArray(j.steps))return empty('identity-unconfirmed');
  ids.add(j.id);
  const steps=j.steps.filter(s=>s?.conclusion==='failure');
  const kinds=steps.map(s=>{
   const name=sid(s.name).trim();
   // Only explicit installation/setup labels, not a generic "Run" step.
   if(/^(set up job|checkout|run actions\/checkout@[\w.-]+|setup node(?:\.js)?|run actions\/setup-node@[\w.-]+|install (?:playwright(?: browsers| dependencies)?|browser dependencies|dependencies|browsers)|run npx playwright install(?:\s+[\w.-]+)*|run npm ci)$/i.test(name))return 'setup-step-failed';
   if(/^(run (?:node (?:tests\/|--test\b)|npm test\b|npx playwright test\b)|(?:run |execute )?(?:browser|webkit|chromium|regression|unit|integration) tests?\b)/i.test(name))return 'test-step-failed';
   return 'unknown-step';
  });
  const classification=kinds.length&&kinds.every(k=>k===kinds[0])?kinds[0]:'unknown-step';
  rows.push({id:j.id,name:sid(j.name).slice(0,120),classification,failedSteps:steps.slice(0,20).map((s,i)=>{const moduleCoverage=moduleCoverage978B(s.name,kinds[i]);return {number:Number(s.number)||null,name:sid(s.name).slice(0,160),moduleCoverage,repairHints:repairHints978C(run,j,moduleCoverage)}}),link:'https://github.com/'+REPO+'/actions/runs/'+Number(run.id)+'/job/'+j.id});
 }
 const kinds=new Set(rows.map(j=>j.classification)),classification=rows.length&&kinds.size===1?[...kinds][0]:rows.length?'mixed-evidence':'unclassified';
 return {...empty(rows.length?'observed-failed-steps':'no-failed-job-observed'),classification,jobs:rows,attempt:run.attempt,commit:run.commit};
}
// Snapshot of hlgb-modules/engenharia/test-matrix-v9638.json; CI rejects drift. Coverage is not root cause.
function moduleMatrix978B(){return {"base-infraestrutura":["tests/audit-canonical-routing-v9316.cjs","tests/audit-app-stable3-restored-render-regression.cjs","tests/hlgb-integration-v9651.cjs","tests/boot-printer3d-recover-payroll-dedupe-v9596.cjs"],"sincronizacao-wal":["tests/audit-wal-idb-only-regression.cjs","tests/audit-wal-equivalent-production-regression.cjs","tests/audit-record-integrity-regression.cjs"],"pedidos-projecao":["tests/audit-projection-delivery-integrity-regression.cjs","tests/audit-projection-missing-behavior-regression.cjs","tests/hlgb-product-history-search-v9652.cjs","tests/hlgb-assistant-integrated-v9670.cjs"],"corte-cortadores":["tests/audit-cutter-planner-regression.cjs","tests/audit-cut-material-usage-regression.cjs","tests/hlgb-live-cut-weight-core-v9623.cjs","tests/hlgb-production-planning-v9661.cjs","tests/hlgb-production-planning-v9661-browser.cjs","tests/hlgb-production-planning-v9661-selection-view.cjs"],"producao-separacao":["tests/audit-production-assignment-behavior-regression.cjs","tests/audit-production-reconcile-regression.cjs","tests/cut-separation-workspace-v9643.cjs","tests/cut-separation-checklist-v9644.cjs"],"faccoes-acertos":["tests/audit-faction-manual-payment-regression.cjs","tests/audit-faction-master-integrity-regression.cjs","tests/hlgb-settlement-history-v9653.cjs","tests/hlgb-settlement-history-view-v9654.cjs","tests/hlgb-operations-history-attendance-v9669.cjs"],"financeiro-hub-notas":["tests/audit-hub-period-detail-regression.cjs","tests/audit-hub-integrity-regression.cjs","tests/audit-note-integrity-regression.cjs","tests/hlgb-hub-intelligence-adapter-v9633.cjs","tests/hlgb-live-finance-integrated-v9657.cjs","tests/hlgb-rh-finance-v9667-browser.cjs"],"folha-pessoal":["tests/audit-payroll-integrity-regression.cjs","tests/hub-payroll-paid-date-v9515.cjs","tests/audit-payroll-provision-sort-total-regression.cjs","tests/hlgb-attendance-transport-v9658.cjs","tests/hlgb-rh-planning-v9636.cjs","tests/hlgb-rh-live-view-v9667.cjs","tests/hlgb-worker-registry-v9659.cjs","tests/hlgb-worker-registry-v9659-browser.cjs","tests/hlgb-operations-history-attendance-v9669.cjs","tests/hlgb-rh-finance-v9667-browser.cjs"],"compras-estoque":["tests/audit-material-tools-regression.cjs","tests/audit-purchase-checkers-regression.cjs","tests/hlgb-production-planning-v9661-selection-view.cjs"],"utilidades-etiquetas":["tests/audit-canonical-routing-v9316.cjs","tests/audit-ui-stability-regression.cjs"],"auditor-monitor":["tests/audit-internal-auditor-regression.cjs","tests/auditor-rapid-learning-v9437-webkit.js","tests/auditor-smart-ready-v9639.cjs","tests/auditor-smart-ready-v9639-browser.cjs","tests/hlgb-health-monitor-coverage-v9670.cjs","tests/hlgb-ci-evidence-v9671.cjs"],"assistente-ia":["tests/audit-assistant-query-regression.cjs","tests/audit-assistant-system-wide-regression.cjs","tests/hlgb-assistant-evidence-v9655.cjs","tests/hlgb-assistant-integrated-v9670.cjs"],"impressora-3d":["tests/boot-printer3d-recover-payroll-dedupe-v9596.cjs"],"interface-mobile":["tests/audit-ui-stability-regression.cjs","tests/mobile-friendly-v9512-browser.js","tests/mobile-real-pages-v9640.cjs","tests/hlgb-mobile-menu-v9670.cjs","tests/hlgb-rh-finance-v9667-browser.cjs"]}}
function moduleCoverage978B(name,kind){
 const empty=state=>({state,testPath:null,modules:[],rootCauseConfirmed:false,canRepair:false});
 if(kind!=='test-step-failed')return empty('not-test-step');
 const match=/^Run node (?:--test )?(tests\/[A-Za-z0-9_.\/-]+\.(?:cjs|js|mjs))$/.exec(sid(name).trim());
 if(!match||match[1].split('/').some(x=>!x||x==='.'||x==='..'))return empty('test-path-unconfirmed');
 const path=match[1],modules=Object.entries(moduleMatrix978B()).filter(([,paths])=>paths.includes(path)).map(([key])=>key).sort();
 return {...empty(modules.length?'mapped-test-coverage':'unmapped-test'),testPath:path,modules};
}
function moduleCoverageLabel978B(e){
 if(e?.state==='mapped-test-coverage')return 'Módulos cobertos pelo teste (não identifica o culpado): '+e.modules.join(', ');
 if(e?.state==='unmapped-test')return 'Teste sem módulo cadastrado na matriz.';
 if(e?.state==='test-path-unconfirmed')return 'Não foi possível identificar um teste individual pela etapa.';
 return '';
}
// Historical reviewed evidence candidates, not a diagnosis of a current failure.
// CI validates the snapshot against the existing engineering evidence contract.
function repairHistory978C(){return [{"id":"cut-remnant-selector-9661","workflow":"HLGB Comercial - Planejamento e dossie de Corte v96.61","testPath":"tests/hlgb-production-planning-v9661-browser.cjs","requiredJobs":["browser (chromium)","browser (webkit)"],"category":"test-locator","observed":"Strict mode: label Modelo de origem resolved to search and select in both engines.","correction":"Specify exact:true on the original select label, without removing any business assertion.","beforeRun":45304497656,"afterRun":45359414421,"beforeCommit":"4fdc40ffb07678a2f12bbddec7590b1f3bbaaf7f","afterCommit":"664a15e1090b8a79d0f782a921639525bd6c0c33"},{"id":"worker-passage-label-9659","workflow":"HLGB Comercial - Cadastro e acerto semanal v96.59","testPath":"tests/hlgb-worker-registry-v9659-browser.cjs","requiredJobs":["browser (chromium)","browser (webkit)"],"category":"test-locator","observed":"Both browser fixtures timed out waiting for the exact Passagem select.","correction":"Explicit aria-label on original select. Both browsers and contracts now pass.","beforeRun":45359414185,"afterRun":45361271637,"beforeCommit":"664a15e1090b8a79d0f782a921639525bd6c0c33","afterCommit":"e3e438d1ab7500df2ad1ddddfcb78fab03f22cb3"}]}
function repairHints978C(run,job,coverage){
 if(coverage?.state!=='mapped-test-coverage'||!run?.name||!job?.name)return [];
 return repairHistory978C().filter(x=>x.workflow===run.name&&x.testPath===coverage.testPath&&x.requiredJobs.includes(job.name)&&x.beforeCommit!==run.commit&&x.afterCommit!==run.commit).map(x=>({...x,state:'historical-similarity-only',beforeLink:'https://github.com/'+REPO+'/actions/runs/'+x.beforeRun,afterLink:'https://github.com/'+REPO+'/actions/runs/'+x.afterRun,rootCauseConfirmed:false,canRepair:false}));
}
function repairHintLabel978C(h){return 'Caso anterior ('+h.id+'), hipótese a conferir nos logs atuais: '+h.observed+' | Correção histórica: '+h.correction+' | Evidências: '+h.beforeLink+' → '+h.afterLink}
const failureLabels978A={'setup-step-failed':'Falha em etapa de preparação/instalação; causa não confirmada','test-step-failed':'Falha durante execução de testes; consultar logs para distinguir código/ambiente','unknown-step':'Etapa sem classificação segura','mixed-evidence':'Etapas de falha diferentes','unclassified':'Sem evidência suficiente'};
let failureProbeBusy978A=false;
async function probeFailures978A(){
 if(failureProbeBusy978A||busy||!latest||error||Date.now()-fetchedAt>=MAX_AGE||Date.now()<retryAfterAt)return;
 const snapshot=latest,rows=[],targets=snapshot.ci.failingWorkflows.slice(0,5);
 failureProbeBusy978A=true;paint();
 try{
  for(const run of targets){
   if(latest!==snapshot||Date.now()-fetchedAt>=MAX_AGE)break;
   try{const payload=await getJSON('/actions/runs/'+run.id+'/attempts/'+run.attempt+'/jobs?per_page=100');rows.push(classifyFailureEvidence978A(run,payload))}
   catch(e){recordFailure(e);break}
  }
  if(latest===snapshot)snapshot.failureEvidence={state:rows.length===snapshot.ci.failed?'observed':'partial',commit:snapshot.currentCommit,generatedAt:new Date().toISOString(),reviewedRuns:rows.length,totalFailed:snapshot.ci.failed,rows,rootCauseConfirmed:false};
 }finally{failureProbeBusy978A=false;paint()}
}
function parse(head,all,scheduled){
 const sha=sid(head?.commit?.sha);
 if(!/^[a-f0-9]{40}$/.test(sha))throw Error('GitHub não informou o commit atual do sistema.');
 const runs=(Array.isArray(all?.workflow_runs)?all.workflow_runs:[])
  .filter(x=>x&&x.head_branch==='main');
 const scheduledRuns=(Array.isArray(scheduled?.workflow_runs)?scheduled.workflow_runs:[])
  .filter(x=>x&&x.head_branch==='main');
 const merged=[...runs,...scheduledRuns];
 const seen=new Set();
 const hourly=merged.filter(x=>x.name===WORKFLOW&&x.id&&(!seen.has(x.id)&&seen.add(x.id)))
  .sort((a,b)=>sid(b.created_at).localeCompare(sid(a.created_at))).slice(0,12);
 const monitor=hourly[0]||null;
 const currentById=new Map();
 for(const x of merged.filter(x=>x.head_sha===sha&&Number.isSafeInteger(Number(x.id))&&Number(x.id)>0)){
  const old=currentById.get(Number(x.id));if(!old||Number(x.run_attempt||1)>Number(old.run_attempt||1)||Number(x.run_attempt||1)===Number(old.run_attempt||1)&&sid(x.updated_at)>sid(old.updated_at))currentById.set(Number(x.id),x)
 }
 const current=[...currentById.values()],completed=current.filter(x=>x.status==='completed'),pending=current.filter(x=>x.status!=='completed');
 const approved=completed.filter(x=>x.conclusion==='success'),failed=completed.filter(x=>x.conclusion==='failure'),inconclusive=completed.filter(x=>!['success','failure'].includes(x.conclusion));
 const failures=failed.map(x=>({id:Number(x.id),name:sid(x.name).slice(0,120),attempt:Number(x.run_attempt||1),commit:sha,url:runUrl(x)}));
 const canceled=inconclusive.filter(x=>x.conclusion==='cancelled').length;
 const other=inconclusive.length-canceled;
 const listCount=Array.isArray(all?.workflow_runs)?all.workflow_runs.length:0,totalCount=Number.isSafeInteger(all?.total_count)?all.total_count:null;
 const deploy=merged.filter(x=>x.name==='pages build and deployment'&&x.conclusion==='success')
  .sort((a,b)=>sid(b.created_at).localeCompare(sid(a.created_at)))[0]||null;
 return {
  kind:'hlgb-hourly-health-dashboard',schemaVersion:1,version:V,
  source:'GitHub Actions (API pública, leitura)',
  repository:REPO,generatedAt:new Date().toISOString(),currentCommit:sha,
  lastHourlyRun:monitor?{
   id:Number(monitor.id),createdAt:sid(monitor.created_at),updatedAt:sid(monitor.updated_at),
   status:sid(monitor.status),conclusion:sid(monitor.conclusion),commit:sid(monitor.head_sha),
   link:runUrl(monitor),currentCommit:monitor.head_sha===sha
  }:null,
  history:hourly.map(x=>({id:Number(x.id),createdAt:sid(x.created_at),
   status:sid(x.status),conclusion:sid(x.conclusion),commit:sid(x.head_sha),link:runUrl(x)})),
  ci:{completed:completed.length,pending:pending.length,failed:failed.length,approved:approved.length,cancelled:canceled,inconclusive:other,observedRuns:current.length,windowTruncated:totalCount===null||totalCount>listCount,allRequiredChecksVerified:false,
   failingWorkflows:failures.slice(0,18),scope:'Somente execuções encontradas para o commit atual; não é prova de todos os checks obrigatórios'},
  publication:{
   checked:!!deploy,commit:sid(deploy?.head_sha),current:!!deploy&&deploy.head_sha===sha,
   link:deploy?runUrl(deploy):null,updatedAt:sid(deploy?.updated_at)
  },
  synchronization:{
   provedAcrossRealTwoSessions:false,
   description:'Os testes automatizados não comprovam que um pedido apareceu em outro navegador autenticado.'
  },
  limits:'Este resumo reúne o estado do GitHub Actions. O relatório bruto do bot é um artifact na execução do GitHub; pode exigir login para baixar.'
 };
}
async function collect(force){
 if(busy)return busy;
 if(Date.now()<retryAfterAt){if(latest)return latest;throw Error(error||'Consulta temporariamente suspensa.');}
 if(!force&&latest&&Date.now()-fetchedAt<MAX_AGE)return latest;
 busy=(async()=>{
  try{
   // Somente duas chamadas de leitura, sob demanda ao abrir Auditor ou atualizar.
   const [head,all]=await Promise.all([
    getJSON('/branches/main'),
    getJSON('/actions/runs?branch=main&per_page=100')
   ]);
   const list=Array.isArray(all?.workflow_runs)?all.workflow_runs:[];
   const monitorExists=list.some(x=>x.name===WORKFLOW);
   // Fallback exclusivamente se muitas CI builds esconderam a execução horária.
   let scheduled=null,partial=null;
   if(!monitorExists){try{scheduled=await getJSON('/actions/runs?branch=main&event=schedule&per_page=40')}catch(e){partial=e}}
   latest=parse(head,all,scheduled);
   latest.monitorLookupIncomplete=!!partial;
   fetchedAt=Date.now();error='';accessEvidence=null;retryAfterAt=0;
   if(partial)recordFailure(partial);
   return latest;
  }catch(e){
   recordFailure(e);
   if(latest)return latest;
   throw e;
  }finally{busy=null;paint()}
 })();
 paint();
 return busy;
}
function recordFailure(e){
 error=sid(e?.message||e).slice(0,180);
 accessEvidence=e?.accessEvidence||{httpStatus:null,classification:'network-or-invalid-response',endpoint:null,rateLimitRemaining:null,retryAt:new Date(Date.now()+ACCESS_BACKOFF).toISOString()};
 retryAfterAt=Date.parse(accessEvidence.retryAt)||Date.now()+ACCESS_BACKOFF;
}
function E(tag,cls,text){
 const el=document.createElement(tag);
 if(cls)el.className=cls;
 if(text!=null)el.textContent=sid(text);
 return el;
}
function divLine(title,value){
 const line=E('div','hlgb-health-row');
 line.append(E('span','',title),E('strong','',value));
 return line;
}
function badge(label,cls){
 const el=E('span','badge '+cls,label);
 return el;
}
function createPanel(){
 const modal=document.getElementById('modalContent');
 if(!modal)return null;
 const actions=modal.querySelector('.hlgb-auditor-actions');
 if(!actions)return null;
 let panel=modal.querySelector('#hlgbHourlyHealthPanel9541');
 if(panel)return panel;
 panel=E('section','panel hlgb-health-panel');
 panel.id='hlgbHourlyHealthPanel9541';
 panel.setAttribute('aria-label','Monitor de Saúde do HLGB');
 const title=E('h3','','📊 Monitor de Saúde — verificações horárias');
 title.style.marginTop='0';
 const intro=E('div','sub','Resultados reais do GitHub Actions. Não executa correções nem altera dados.');
 const summary=E('div','hlgb-health-body');
 summary.id='hlgbHealthSummary9541';summary.setAttribute('aria-live','polite');
 const controls=E('div','hlgb-auditor-actions hlgb-health-download-controls');
 controls.id='hlgbHealthDownloadControls9544';
 const refresh=E('button','secondary','🔄 Atualizar agora');
 refresh.type='button';refresh.id='hlgbHealthRefresh9541';
 refresh.addEventListener('click',()=>refreshNow());
 const download=E('button','primary','⬇️ BAIXAR RELATÓRIO DO BOT (JSON)');
 download.type='button';download.id='hlgbHealthDownload9541';
 download.addEventListener('click',()=>saveJSON());
 const downloadTxt=E('button','secondary','⬇️ Baixar resumo (TXT)');
 downloadTxt.type='button';downloadTxt.id='hlgbHealthDownloadTxt9544';
 downloadTxt.addEventListener('click',()=>saveTXT());
 const copy=E('button','secondary','📋 Copiar resumo');
 copy.type='button';copy.id='hlgbHealthCopy9541';
 copy.addEventListener('click',()=>copySummary());
 controls.append(download,downloadTxt,refresh,copy);
 const note=E('div','sub','Os relatórios em JSON e TXT são baixados diretamente no computador, sem abrir outra página. O JSON reúne a última auditoria horária, testes, alertas, histórico e publicação.');
 panel.append(title,intro,controls,summary,note);
 actions.insertAdjacentElement('afterend',panel);
 return panel;
}

/* Link de download REAL e sempre visível no topo do modal.
 * Diferentemente de botões, <a download> expõe um arquivo diretamente ao
 * Safari e ao Chrome; fica FORA do grupo flex de ações do Auditor.
 */
function ensureVisibleDownloads9545(){
 const root=document.getElementById('modalContent');
 if(!root)return null;
 let box=root.querySelector('#hlgbHealthPinnedDownloads9545');
 if(box)return box;
 box=E('div');
 box.id='hlgbHealthPinnedDownloads9545';
 box.setAttribute('aria-label','Baixar relatórios do Monitor de Saúde');
 box.style.cssText='display:block!important;visibility:visible!important;opacity:1!important;'+
  'position:sticky;top:0;z-index:2000;background:#fff;border:2px solid #5b257d;'+
  'padding:12px;margin:12px 0;border-radius:10px;box-sizing:border-box;width:100%;';
 const intro=E('div','', 'RELATÓRIO DO BOT');
 intro.style.cssText='font-size:15px;font-weight:800;color:#3f155d;display:block!important;margin-bottom:8px;';
 const state=E('div','sub','Consultando os resultados do bot…');
 state.id='hlgbHealthPinnedStatus9547';
 state.style.cssText='font-size:13px;display:block!important;margin-bottom:8px;color:#5b257d';
 state.setAttribute('role','status');
 const link=E('a','', '⌛ CONSULTANDO RESULTADOS…');
 link.id='hlgbHealthPinnedJson9545';
 link.style.cssText='display:block!important;visibility:visible!important;opacity:1!important;'+
  'background:#5b257d!important;color:#fff!important;text-decoration:none!important;'+
  'font-size:15px!important;font-weight:800!important;line-height:1.4!important;'+
  'padding:12px!important;margin:5px 0!important;border-radius:8px!important;'+
  'white-space:normal!important;overflow-wrap:anywhere!important;cursor:pointer!important;';
 const txt=E('a','','⬇️ Baixar resumo em texto (TXT)');
 txt.id='hlgbHealthPinnedTxt9545';
 txt.style.cssText='display:block!important;color:#451a6e!important;text-decoration:underline!important;'+
  'font-size:14px!important;padding:7px 0!important;cursor:pointer!important;';
 box.append(intro,state,link,txt);
 const title=root.querySelector('h2');
 if(title)title.insertAdjacentElement('afterend',box);
 else root.prepend(box);
 return box;
}
function prepareVisibleDownloads9545(){
 const box=ensureVisibleDownloads9545();
 if(!box)return;
 const state=box.querySelector('#hlgbHealthPinnedStatus9547');
 const json=box.querySelector('#hlgbHealthPinnedJson9545');
 const txtLink=box.querySelector('#hlgbHealthPinnedTxt9545');
 const available=!!latest||!!error;
 // Quando a API ainda está em andamento NÃO criar um JSON "not_verified".
 // O link nativo é habilitado somente depois que os resultados chegam ou
 // uma falha de rede real foi confirmada.
 if(!available){
  if(state)state.textContent='Consultando o GitHub Actions… O arquivo ficará disponível após a resposta.';
  for(const link of [json,txtLink]){
   if(!link)continue;
   link.removeAttribute('href');link.removeAttribute('download');
   link.setAttribute('aria-disabled','true');
   link.style.pointerEvents='none';
  }
  if(json)json.textContent='⌛ CONSULTANDO RESULTADOS DO BOT…';
  if(txtLink)txtLink.textContent='Resumo TXT disponível após a consulta';
  box.__hlgbReportKey='loading';
  return;
 }
 const key=(latest?.generatedAt||'error')+'::'+error;
 if(box.__hlgbReportKey===key)return;
 const data=report()||{
  kind:'hlgb-hourly-health-access-diagnostic',version:V,
  generatedAt:new Date().toISOString(),repository:REPO,status:'not_verified',
  error:error||'A consulta ao GitHub falhou; não há resultados confirmados.',accessEvidence,
  note:'Diagnóstico de falha, não um relatório aprovado; nenhuma prova de sincronização foi realizada.'
 };
 if(latest&&error)data.refreshError=error;
 const raw=JSON.stringify(data,null,2)+'\n';
 const summary=latest?humanSummary(latest)+'\n'+(error?'Aviso de atualização: '+error+'\n':''):
  'HLGB — Monitor de Saúde\nConsulta não verificada: '+error+'\n';
 const stamp=new Date().toISOString().replace(/[:.]/g,'-');
 if(state)state.textContent=latest?
  'Resultados consultados em '+date(latest.generatedAt)+'. O download inclui os alertas encontrados.':
  'Falha na consulta: '+error+'. Baixe o diagnóstico para investigar.';
 if(json)json.textContent=latest?'⬇️ CLIQUE AQUI PARA BAIXAR O RELATÓRIO DO BOT (JSON)':
  '⬇️ BAIXAR DIAGNÓSTICO DA FALHA (JSON)';
 if(txtLink)txtLink.textContent=latest?'⬇️ Baixar resumo (TXT)':'⬇️ Baixar erro da consulta (TXT)';
 for(const entry of [
  {link:json,value:raw,mime:'application/json;charset=utf-8',ext:'json'},
  {link:txtLink,value:summary,mime:'text/plain;charset=utf-8',ext:'txt'}
 ]){
  const a=entry.link;
  if(!a)continue;
  const url=URL.createObjectURL(new Blob([entry.value],{type:entry.mime}));
  const old=box['__hlgbOldUrl'+entry.ext];
  box['__hlgbOldUrl'+entry.ext]=url;
  a.href=url;
  a.download='HLGB-MONITOR-SAUDE-'+stamp+'.'+entry.ext;
  a.removeAttribute('aria-disabled');
  a.style.pointerEvents='auto';
  if(old)setTimeout(()=>URL.revokeObjectURL(old),20000);
 }
 box.__hlgbReportKey=key;
}

function paint(){
 prepareVisibleDownloads9545();
 const panel=document.getElementById('hlgbHourlyHealthPanel9541');
 if(!panel)return;
 const result=panel.querySelector('#hlgbHealthSummary9541');
 const d=panel.querySelector('#hlgbHealthDownload9541'),c=panel.querySelector('#hlgbHealthCopy9541');
 const refresh=panel.querySelector('#hlgbHealthRefresh9541');
 if(refresh){refresh.disabled=!!busy;refresh.title=Date.now()<retryAfterAt?'Nova consulta disponível após '+date(new Date(retryAfterAt).toISOString()):'';}
 // O botão permanece disponível até quando a API falha: o usuário pode
 // baixar um diagnóstico da falha e enviá-lo ao suporte.
 if(d)d.disabled=!latest&&!error;
 const t=panel.querySelector('#hlgbHealthDownloadTxt9544');
 const top=document.getElementById('hlgbHealthDownloadTop9544');
 if(t)t.disabled=!latest&&!error;
 if(top)top.disabled=!latest&&!error;
 if(c)c.disabled=!latest;
 if(!result)return;
 result.replaceChildren();
 if(!latest){
  const text=busy?'Consultando os resultados da última hora no GitHub…':
   error?'Não foi possível consultar o GitHub: '+error:'Abra o monitor para consultar os resultados.';
  result.append(E('div','sub',text));return;
 }
 const l=latest.lastHourlyRun,s=statusOf(l);
 const row=E('div','hlgb-health-status');
 row.append(E('strong','','Última verificação horária: '),badge(s.label,s.className));
 if(l)row.append(E('span','sub',' · '+date(l.createdAt)));
 result.append(row);
 if(!l)result.append(E('div','sub',latest.monitorLookupIncomplete?'Consulta complementar do monitor incompleta; não é possível confirmar ausência de execução.':'Nenhuma execução horária localizada na janela consultada.'));
 else if(!l.currentCommit)result.append(E('div','hlgb-health-warn',
  'A última execução do bot verificou um commit anterior; a versão atual ainda não foi auditada por ele.'));
 if(error)result.append(E('div','hlgb-health-warn','GitHub indisponível agora. Exibindo a última consulta: '+error));
 const ci=latest.ci,pub=latest.publication;
 const metrics=E('div','hlgb-health-metrics');
 metrics.append(
  divLine('Testes do commit atual com falha',String(ci.failed)+(ci.pending?' ('+ci.pending+' em andamento)':'')),
  divLine('Aprovados / cancelados / inconclusivos',ci.approved+' / '+ci.cancelled+' / '+ci.inconclusive),
  divLine('Publicação no GitHub Pages',!pub.checked?'Não comprovada':pub.current?'Commit atual publicado':'Commit diferente / publicação pendente'),
  divLine('Sincronização Safari ↔ Chrome','Sem prova em duas sessões reais')
 );
 result.append(metrics);
 if(ci.failed>0){
  const list=E('div','hlgb-health-failures');
  list.append(E('strong','','⚠️ Falhas identificadas nos testes do commit atual:'));
  for(const f of ci.failingWorkflows.slice(0,10)){
   const item=E('div','hlgb-health-failure-item',f.name);
   list.append(item);
  }
  const inspect=E('button','secondary',failureProbeBusy978A?'Consultando etapas…':'Conferir etapas com falha (até 5 execuções)');inspect.type='button';inspect.disabled=failureProbeBusy978A||!!busy||!!error||Date.now()-fetchedAt>=MAX_AGE;inspect.onclick=()=>probeFailures978A();list.append(inspect);
  const ev=latest.failureEvidence;
  if(ev){list.append(E('p','sub','Etapas consultadas: '+ev.reviewedRuns+' de '+ev.totalFailed+' execuções com falha. A causa não foi comprovada.'));for(const row of ev.rows){const item=E('details','');item.append(E('summary','',row.runId+' · '+failureLabels978A[row.classification]));for(const job of row.jobs){const link=E('a','',job.name+' — '+failureLabels978A[job.classification]);link.href=job.link;link.target='_blank';link.rel='noopener noreferrer';item.append(link);for(const step of job.failedSteps){item.append(E('p','sub',step.name));const coverage=moduleCoverageLabel978B(step.moduleCoverage);if(coverage)item.append(E('p','sub',coverage));for(const hint of step.repairHints||[])item.append(E('p','sub',repairHintLabel978C(hint)))}}list.append(item)}}
  result.append(list);
 }else if(ci.completed===0){
  result.append(E('div','sub','Os testes do commit atual ainda não foram concluídos ou não foram encontrados.'));
 }else result.append(E('div','sub','Sem falhas nas execuções consultadas; canceladas, inconclusivas e não localizadas não são aprovações.'));
 if(ci.windowTruncated)result.append(E('div','hlgb-health-warn','A janela consultada pode omitir outras execuções. Confira todos os checks antes de publicar.'));
 if(ci.cancelled||ci.inconclusive||ci.pending)result.append(E('div','hlgb-health-warn','Há execuções sem aprovação. Revisar ou reexecutar no commit correto.'));
 if(latest.history.length){
  const hist=E('details','hlgb-health-history');
  hist.append(E('summary','','Histórico recente do monitor ('+latest.history.length+' execuções)'));
  for(const x of latest.history.slice(0,8)){
   const row=E('div','hlgb-health-history-item',date(x.createdAt)+' · '+statusOf(x).label);
   hist.append(row);
  }
  result.append(hist);
 }
 result.append(E('div','sub','Consulta realizada: '+date(latest.generatedAt)+
  '. O bot não verifica a entrega de pedidos entre dois usuários autenticados.'));
}
function humanSummary(data){
 if(!data)return 'Nenhum relatório carregado.';
 const l=data.lastHourlyRun,ci=data.ci,p=data.publication;
 const lines=['HLGB — MONITOR DE SAÚDE','Fonte: GitHub Actions público',
  'Consulta: '+date(data.generatedAt),'Commit atual: '+data.currentCommit,
  'Bot horário: '+statusOf(l).label+(l?' · '+date(l.createdAt):''),
  l&&!l.currentCommit?'Atenção: o último bot não verificou o commit atual.':'',
  'Testes do commit atual: '+ci.completed+' concluídos, '+ci.failed+' com falha, '+ci.pending+' em andamento',
  'Aprovados: '+ci.approved+'; cancelados: '+ci.cancelled+'; inconclusivos: '+ci.inconclusive,
  'Cobertura de todos os checks obrigatórios: NÃO COMPROVADA'+(ci.windowTruncated?' (janela parcial)':''),
  'Publicação: '+(!p.checked?'não comprovada':p.current?'mesmo commit do main':'não corresponde ao main'),
  'Safari ↔ Chrome reais: NÃO COMPROVADO'];
 for(const f of ci.failingWorkflows)lines.push('FALHA — '+f.name+' — '+f.url);
 if(data.failureEvidence){lines.push('ETAPAS DE FALHA — '+data.failureEvidence.reviewedRuns+' de '+data.failureEvidence.totalFailed+' execuções; causa não confirmada.');for(const r of data.failureEvidence.rows){lines.push('Execução '+r.runId+' · '+failureLabels978A[r.classification]);for(const j of r.jobs)lines.push(j.name+' · '+j.failedSteps.map(s=>[s.name,moduleCoverageLabel978B(s.moduleCoverage),...(s.repairHints||[]).map(repairHintLabel978C)].filter(Boolean).join(' — ')).join(', ')+' · '+j.link)}}
 if(l)lines.push('Execução do monitor: '+l.link);
 return lines.filter(Boolean).join('\n');
}
function report(){return latest?{...JSON.parse(JSON.stringify(latest)),refreshError:error||null,accessEvidence,stale:!!error||Date.now()-fetchedAt>=MAX_AGE}:null}
function downloadLocalFile(filename,content,type){
 // Sempre usa um blob local com atributo download; nunca navega a uma URL do GitHub.
 const blob=new Blob([content],{type});
 const url=URL.createObjectURL(blob),link=E('a');
 link.href=url;link.download=filename;
 document.body.appendChild(link);
 try{link.click()}finally{
  // No Safari o blob precisa sobreviver um pouco à ação de download.
  setTimeout(()=>{URL.revokeObjectURL(url);link.remove()},3000);
 }
 return true;
}
function saveTXT(){
 if(!latest&&!error)return false;
 const text=latest?humanSummary(latest):
 'HLGB — MONITOR DE SAÚDE\nConsulta ainda não verificada.\n'+
 (error?'Erro: '+error+'\n':'')+
 'Nenhuma informação de sincronização entre navegadores foi comprovada.';
 const stamp=new Date().toISOString().replace(/[:.]/g,'-');
 return downloadLocalFile('HLGB-MONITOR-SAUDE-'+stamp+'.txt',text+'\n','text/plain;charset=utf-8');
}
function saveJSON(){
 if(!latest&&!error)return false;
 const data=report()||{
  kind:'hlgb-hourly-health-access-diagnostic',version:V,
  generatedAt:new Date().toISOString(),repository:REPO,
  status:'not_verified',error:error||'O bot ainda não retornou uma verificação nesta sessão.',accessEvidence,
  noOperationalDataChanged:true,
  note:'A ausência de dados não significa que os testes passaram. Consulte o GitHub Actions.'
 };
 const stamp=new Date().toISOString().replace(/[:.]/g,'-');
 return downloadLocalFile('HLGB-MONITOR-SAUDE-'+stamp+'.json',
  JSON.stringify(data,null,2)+'\n','application/json;charset=utf-8');
}
async function copySummary(){
 const summary=humanSummary(latest);
 try{await navigator.clipboard.writeText(summary);return true}
 catch(e){if(typeof window.prompt==='function')window.prompt('Copie o relatório abaixo:',summary);return false}
}
async function refreshNow(){
 try{await collect(true)}catch(e){paint()}
}
function onOpen(){
 const panel=createPanel();
 if(!panel)return false;
 prepareVisibleDownloads9545();
 paint();
 collect(false).catch(()=>paint());
 return true;
}
function addStyle(){
 if(document.getElementById('hlgbHourlyHealthStyle9541'))return;
 const st=E('style');st.id='hlgbHourlyHealthStyle9541';
 st.textContent='.hlgb-health-panel{margin:13px 0;padding:12px;border:1px solid #d9d7dd;border-radius:10px}'+
 '.hlgb-health-body{margin:10px 0;min-height:30px}.hlgb-health-status{display:flex;align-items:center;flex-wrap:wrap;gap:8px;margin:8px 0}'+
 '.hlgb-health-metrics{display:grid;gap:6px;margin:10px 0}.hlgb-health-row{display:flex;justify-content:space-between;gap:16px;'+
 'border-bottom:1px solid #e5e2e7;padding:6px 0}.hlgb-health-row strong{text-align:right}'+
 '.hlgb-health-failures{margin:10px 0}.hlgb-health-failure-item,.hlgb-health-history-item{display:block;padding:5px 0;overflow-wrap:anywhere}'+
 '.hlgb-health-warn{padding:7px 0;color:#9b5c10}.hlgb-health-history{margin:10px 0}'+
 '.hlgb-health-download-controls{border:1px solid #ccb9dd;border-radius:8px;padding:8px;background:#f7f3fb}'+
 '.hlgb-health-download-controls button.primary{font-weight:700;background:#672b91;color:#fff;border:1px solid #672b91;min-height:42px}'+
 '@media(max-width:640px){.hlgb-health-row{flex-direction:column;gap:2px}.hlgb-health-row strong{text-align:left}}';
 document.head.appendChild(st);
}
const initialCreate=createPanel;
createPanel=function(){addStyle();return initialCreate()};
function openStandalone(){
 // O relatório fica acessível com UM clique no menu, sem precisar entrar
 // primeiro no Auditor Reparador e percorrer janelas longas.
 if(typeof window.openModal!=='function'){
  const msg='A janela do Monitor de Saúde não está disponível. Abra Auditor / Testes ou confira os relatórios no GitHub Actions.';
  if(typeof window.alert==='function')window.alert(msg);
  return false;
 }
 window.openModal('📊 Monitor de Saúde do HLGB',
  '<div class="sub">Bot de verificação horária. O relatório abaixo não altera pedidos nem pendências locais.</div>'+
  '<div class="hlgb-auditor-actions" id="hlgbMonitorStandaloneActions9543">'+
  '<button type="button" class="primary" id="hlgbHealthDownloadTop9544" onclick="window.hlgbHourlyHealthPanel9541.download()">⬇️ BAIXAR RELATÓRIO DO BOT (JSON)</button>'+
  '</div>'+
  '<button type="button" class="secondary modalSave">Fechar</button>',
  ()=>window.closeModal?.());
 return onOpen();
}
window.hlgbHourlyHealthPanel9541={
 version:V,onOpen,openStandalone,refresh:refreshNow,collect,report,parse,classifyFailureEvidence978A,moduleCoverage978B,repairHints978C,download:saveJSON,downloadTXT:saveTXT,copySummary,humanSummary,visibleDownloads:prepareVisibleDownloads9545,
 status:()=>({busy:!!busy,lastFetchedAt:fetchedAt,error,accessEvidence,retryAfterAt,latest:report()})
};
})();