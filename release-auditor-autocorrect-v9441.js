/* HLGB v94.41 — Auditor Autocorretor silencioso com aprendizado verificável.
   Faz auditoria técnica sem navegar, executa somente receitas de reparo confiáveis,
   retesta cada correção, aprende apenas com prova e gera relatório técnico sanitizado. */
(function(){
'use strict';
const V='94.41',MAX_PASSES=3,CARD_ID='hlgbAuditorAutoCorrect9441Card';
const HISTORY_KEY='hlgb_auditor_autocorrect_history_v9441';
const EVENTS_KEY='hlgb_auditor_repair_events_v9441';
const LEARNING_KEY='hlgb_auditor_repair_learning_v9441';
const CONTRACTS_KEY='hlgb_auditor_feature_contracts_v9441';
const REPORT_KEY='hlgb_auditor_autocorrect_latest_report_v9441';
const LOCK_NAME='hlgb-auditor-autocorrect-v9441';
const BACKGROUND_COOLDOWN=10*60*1000;
if(window.HLGB_AUDITOR_AUTOCORRECT_9441===V)return;
window.HLGB_AUDITOR_AUTOCORRECT_9441=V;

const state={version:V,running:false,runs:0,passes:0,repairActions:0,verifiedRepairs:0,diagnosticsResolved:0,blocked:0,lastAt:'',lastBackgroundAt:'',lastError:'',lastSummary:null,lastReport:null};
const sid=v=>String(v??'');
const clone=v=>{try{return structuredClone(v)}catch(e){try{return JSON.parse(JSON.stringify(v))}catch(_){return v}}};
const ts=v=>{const n=Date.parse(sid(v));return Number.isFinite(n)?n:NaN};
const nowIso=()=>new Date().toISOString();
const readJson=(k,f)=>{try{const x=JSON.parse(localStorage.getItem(k)||'null');return x??f}catch(e){return f}};
const writeJson=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v));return true}catch(e){return false}};
function authReady(){return window.__HLGB_AUTH_READY===true}
function stamp(){try{if((parseFloat(sid(window.HLGB_RELEASE_VERSION))||0)<94.41)window.HLGB_RELEASE_VERSION=V;const el=document.querySelector('#appShell .logo small');if(el&&(parseFloat(sid(el.textContent).replace(/^v/i,''))||0)<94.41)el.textContent='v'+V}catch(e){}}
function issues(){try{const a=window.hlgbDiagnosticsCenter?.getIssues?.();return Array.isArray(a)?a:[]}catch(e){return []}}
function openIssue(x){return !/resolvid|closed|fechad/i.test(sid(x?.status))}
function issueAt(x){return ts(x?.lastSeenAt||x?.lastSeen||x?.updatedAt||x?.updated_at||x?.createdAt||x?.firstSeen)}
function protectedBusinessText(v){return /financeiro sem projeção|finance-projection-orphan|valor financeiro|preço|preco|quantidade|observaç|nota fiscal|associaç|vínculo|vinculo|decisão de negócio|decisao de negocio/i.test(sid(v))}
function technicalText(v){return /falha ao salvar|conflito protegido|sincron|\bsync\b|\bwal\b|\back\b|load failed|failed to fetch|network|timeout|fila|pending|duplicad|render|listener|cache|snapshot|tombstone/i.test(sid(v))}
function technicalIssue(x){const t=[x?.title,x?.detail,x?.source,x?.category].map(sid).join(' ');return !protectedBusinessText(t)&&technicalText(t)}
function technicalFinding(x){const t=[x?.code,x?.title,x?.detail,x?.category].map(sid).join(' ');return !protectedBusinessText(t)&&technicalText(t)}
function currentMetrics(){try{return clone(window.hlgbAuditorIntelligence9396?.currentMetrics?.()?.metrics||{})}catch(e){return {}}}
function operationSnapshot(main){
 const op=main?.operational||{},checks=Array.isArray(op?.checks)?op.checks:[];
 const byCode=c=>checks.find(x=>sid(x?.code)===c)||null;
 const pending=op?.pending||byCode('operational:pending')?.pending||{};
 const simple=x=>x?{status:sid(x.status),detail:sid(x.detail)}:null;
 return {pending:{unique:+pending.unique||0,records:+pending.records||0,wal:+pending.wal||0,totalCopies:+pending.totalCopies||0},delivery:simple(byCode('operational:delivery')),savingUi:simple(byCode('operational:saving-ui')),runtime:simple(byCode('operational:runtime-errors'))};
}
function cleanTechnicalState(out){const m=currentMetrics(),op=out?.operations||{};return [m.pendingUnique??op.pending?.unique,m.scriptDuplicates,m.saveDuplicateResponsibilities].every(x=>typeof x==='number'&&x===0)&&(!op.delivery||op.delivery.status==='pass')&&(!op.savingUi||op.savingUi.status==='pass')}
function reportChecks(out){return out?.main?.checks||out?.audit?.checks||[]}
function unresolved(out){return reportChecks(out).filter(x=>x?.status==='fail'||x?.status==='warn')}
function findOrphans(root){const out=[],seen=new Set();function walk(v){if(!v||typeof v!=='object'||seen.has(v))return;seen.add(v);if(v.code==='data:finance-projection-orphan'||v.code==='finance-projection-orphan')out.push({code:v.code,detail:sid(v.detail),refs:clone(v.refs||[]),safetyLevel:'C'});if(Array.isArray(v)){for(const x of v)walk(x)}else for(const x of Object.values(v))walk(x)}walk(root);const uniq=[],keys=new Set();for(const x of out){const k=x.refs.length?JSON.stringify(x.refs):x.detail;if(!keys.has(k)){keys.add(k);uniq.push(x)}}return uniq}
function dedupe(items,keyFn){const out=[],seen=new Set();for(const x of items||[]){const k=keyFn(x);if(seen.has(k))continue;seen.add(k);out.push(x)}return out}
function signature(out){return JSON.stringify({metrics:currentMetrics(),checks:unresolved(out).map(x=>[x.code,x.status,x.refs||[]]),issues:issues().filter(openIssue).map(x=>[x.id,x.lastSeenAt||x.lastSeen,x.occurrences])})}
function hasRepairableWork(out){if(issues().some(x=>openIssue(x)&&technicalIssue(x)))return true;if(unresolved(out).some(technicalFinding))return true;const m=currentMetrics();return (+m.pendingUnique||0)>0||(+m.scriptDuplicates||0)>0||(+m.saveDuplicateResponsibilities||0)>0}

let lastUserNavigationAt=0;
function activePage(){try{return document.querySelector('#appShell .page.active,.page.active')?.id||''}catch(e){return ''}}
function uiSnapshot(){const p=document.querySelector('#appShell .page.active,.page.active'),a=document.activeElement;return {page:p?.id||'',x:window.scrollX||0,y:window.scrollY||0,top:p?.scrollTop||0,left:p?.scrollLeft||0,focus:a&&a!==document.body?a:null}}
function restoreUi(s){if(!s||Date.now()-lastUserNavigationAt<1500)return false;let changed=false;try{if(s.page&&activePage()!==s.page){const target=document.getElementById(s.page);if(target){document.querySelectorAll('#appShell .page.active,.page.active').forEach(x=>x.classList.remove('active'));target.classList.add('active');changed=true}}}catch(e){}try{if(Math.abs((window.scrollY||0)-s.y)>2||Math.abs((window.scrollX||0)-s.x)>2){window.scrollTo(s.x,s.y);changed=true}}catch(e){}try{const p=document.getElementById(s.page);if(p&&(Math.abs((p.scrollTop||0)-s.top)>2||Math.abs((p.scrollLeft||0)-s.left)>2)){p.scrollTop=s.top;p.scrollLeft=s.left;changed=true}}catch(e){}try{if(s.focus?.isConnected&&document.activeElement!==s.focus){s.focus.focus({preventScroll:true});changed=true}}catch(e){}return changed}
function uiStable(s){return !s||!s.page||activePage()===s.page}

async function silentAudit(reason='technical-retest'){
 const internal=window.hlgbInternalAuditor;
 if(typeof internal?.run!=='function')throw new Error('Auditoria técnica silenciosa indisponível');
 const before=uiSnapshot();
 const main=await internal.run('full',false);
 const out={version:V,at:nowIso(),reason,main,audit:main,operations:operationSnapshot(main),metrics:currentMetrics(),background:true,nonNavigating:true};
 const drift=!uiStable(before);if(drift)restoreUi(before);out.ui={pageBefore:before.page,pageAfter:activePage(),drift,restored:drift&&activePage()===before.page};
 return out;
}
async function callSafe(name,fn){try{const r=await fn();return {name,ok:r!==false,result:r}}catch(e){return {name,ok:false,error:sid(e?.message||e)}}}

const recipeDefs={
 'ack-reconcile':{id:'ack-reconcile',level:'A',trusted:true,api:()=>window.hlgbAckReconcile9436,method:'install',description:'Reinstala/reconcilia confirmação técnica de ACK.'},
 'production-reconcile':{id:'production-reconcile',level:'B',trusted:true,api:()=>window.hlgbProductionReconcile9439,method:'reconcile',description:'Reconcilia fila/WAL de produção somente com prova remota e operationId.'},
 'rapid-heal':{id:'rapid-heal',level:'A',trusted:true,api:()=>window.hlgbAuditorRapid9437,method:'heal',description:'Reaplica proteções técnicas idempotentes do Auditor rápido.'},
 'auditor-finalizer':{id:'auditor-finalizer',level:'A',trusted:true,api:()=>window.hlgbAuditorFinalize9439,method:'install',description:'Reinstala finalizador idempotente do Auditor.'}
};
function learningStore(){const x=readJson(LEARNING_KEY,{});return x&&typeof x==='object'&&!Array.isArray(x)?x:{}}
function confidenceDefault(recipe){return recipe?.level==='A'?0.90:recipe?.trusted?0.85:0.25}
function learnKey(recipeId,fingerprint='general'){return recipeId+'|'+sid(fingerprint||'general').slice(0,240)}
function updateLearning(recipeId,fingerprint,outcome){
 const recipe=recipeDefs[recipeId]||{level:'C',trusted:false},all=learningStore(),key=learnKey(recipeId,fingerprint),prev=all[key]||{recipeId,fingerprint,level:recipe.level,observations:0,attempts:0,verifiedSuccesses:0,failures:0,recurrences:0,confidence:confidenceDefault(recipe),firstSeenAt:nowIso(),firstSeenVersion:V};
 const row={...prev,lastSeenAt:nowIso(),lastSeenVersion:V};row.observations=(+row.observations||0)+(+outcome.observed||0);row.attempts=(+row.attempts||0)+(+outcome.attempted||0);row.verifiedSuccesses=(+row.verifiedSuccesses||0)+(+outcome.verified||0);row.failures=(+row.failures||0)+(+outcome.failed||0);row.recurrences=(+row.recurrences||0)+(+outcome.recurrence||0);
 let c=Number(row.confidence);if(!Number.isFinite(c))c=confidenceDefault(recipe);c+=0.08*(+outcome.verified||0);c-=0.18*(+outcome.failed||0);c-=0.12*(+outcome.recurrence||0);row.confidence=Math.max(0.05,Math.min(0.99,+c.toFixed(3)));if(outcome.verified)row.lastVerifiedAt=nowIso();if(outcome.failed)row.lastFailureAt=nowIso();row.proofType=outcome.proofType||row.proofType||'';all[key]=row;writeJson(LEARNING_KEY,all);return clone(row)
}
function findingFingerprint(x){const refs=(x?.refs||x?.recordRefs||[]).map(r=>[sid(r?.module),sid(r?.id)]);const raw=[sid(x?.code),sid(x?.category),sid(x?.title),technicalText(x?.detail)?sid(x?.detail).slice(0,180):'',JSON.stringify(refs)].join('|').toLowerCase().replace(/\b\d{4,}\b/g,'#');let h=2166136261;for(let i=0;i<raw.length;i++){h^=raw.charCodeAt(i);h=Math.imul(h,16777619)}return 'fp-'+(h>>>0).toString(16)}
function observeFindings(out){for(const x of [...unresolved(out),...issues().filter(openIssue)]){if(!technicalFinding(x)&&!technicalIssue(x))continue;const fp=findingFingerprint(x);for(const id of Object.keys(recipeDefs))updateLearning(id,fp,{observed:1})}}
function recipeCanRun(recipe){if(!recipe?.trusted||!['A','B'].includes(recipe.level))return false;const all=learningStore(),matches=Object.values(all).filter(x=>x.recipeId===recipe.id);const min=matches.length?Math.min(...matches.map(x=>+x.confidence||0)):confidenceDefault(recipe);return recipe.level==='A'||min>=0.60}
async function healTechnical(reason='autocorrect'){
 const rows=[];
 for(const recipe of Object.values(recipeDefs)){
  if(!recipeCanRun(recipe)){rows.push({name:recipe.id,ok:false,skipped:true,safetyLevel:recipe.level,error:'Receita sem confiança suficiente'});continue}
  const api=recipe.api(),method=recipe.method;if(typeof api?.[method]!=='function'){rows.push({name:recipe.id,ok:false,skipped:true,safetyLevel:recipe.level,error:'Rotina indisponível'});continue}
  const beforeUi=uiSnapshot(),row=await callSafe(recipe.id,()=>api[method]('auditor-autocorrect-v9441:'+reason));row.safetyLevel=recipe.level;if(!uiStable(beforeUi)&&Date.now()-lastUserNavigationAt>=1500){row.uiDrift=true;row.uiRestored=restoreUi(beforeUi)}rows.push(row);state.repairActions++;updateLearning(recipe.id,'general',{attempted:1,failed:row.ok?0:1});
 }
 return rows;
}

function repairEvents(){const a=readJson(EVENTS_KEY,[]);return Array.isArray(a)?a:[]}
function sanitize(v,key='',depth=0){if(/password|senha|token|secret|authorization|cookie|session|access[_-]?key|refresh[_-]?key/i.test(key))return '[REDACTED]';if(v==null||typeof v==='number'||typeof v==='boolean')return v;if(typeof v==='string')return v.slice(0,1600);if(depth>5)return Array.isArray(v)?'[array]':'[object]';if(Array.isArray(v))return v.slice(0,120).map(x=>sanitize(x,key,depth+1));const out={};for(const [k,x] of Object.entries(v).slice(0,160))out[k]=sanitize(x,k,depth+1);return out}
function recordRepairEvent(row){const clean=sanitize({...row,reportVersion:V});let a=repairEvents();a.push(clean);a=a.slice(-400);writeJson(EVENTS_KEY,a);return clean}
async function validateRepairs(rows,round,runId){
 const verified=[],unknown=[],events=[];
 for(const row of rows){
  const recipe=recipeDefs[row.name];
  if(row.skipped)continue;
  if(!row.ok){const learn=updateLearning(row.name,'general',{failed:1});events.push(recordRepairEvent({kind:'repair-attempt',runId,round,recipeId:row.name,safetyLevel:recipe?.level||row.safetyLevel,status:'failed',detail:row.error||'Rotina não executada',confidenceAfter:learn.confidence,at:nowIso()}));unknown.push({action:row.name,detail:row.error||'Rotina não executada'});continue}
  if(row.name!=='production-reconcile')continue;
  let pending;try{pending=await window.hlgbProductionReconcile9439?.candidates?.()}catch(e){unknown.push({action:row.name,detail:'Não foi possível reler a fila: '+sid(e?.message||e)});continue}
  for(const r of row.result?.results||[]){
   const fp='production|'+sid(r.id);
   if(r.ok!==true){const learn=updateLearning(row.name,fp,{failed:1});events.push(recordRepairEvent({kind:'repair',runId,round,recipeId:row.name,safetyLevel:'B',recordId:sid(r.id),status:'failed',detail:r.error||r.reason||'Sem confirmação',confidenceAfter:learn.confidence,at:nowIso()}));unknown.push({id:r.id,action:row.name,detail:r.error||r.reason||'Sem confirmação'});continue}
   const count=(+r.normalizedRemoved||0)+(+r.walRemoved||0);if(!count)continue;
   const proofOk=Array.isArray(pending)&&!pending.some(x=>sid(x.id)===sid(r.id))&&!!r.proof&&(+r.serverRevision>0)&&Array.isArray(r.operationIds)&&r.operationIds.length>0;
   if(!proofOk){const learn=updateLearning(row.name,fp,{failed:1});events.push(recordRepairEvent({kind:'repair',runId,round,recipeId:row.name,safetyLevel:'B',recordId:sid(r.id),status:'unverified',detail:'Reteste da fila, operação ou prova remota incompleta',confidenceAfter:learn.confidence,at:nowIso()}));unknown.push({id:r.id,action:row.name,detail:'Reteste da fila, operação ou prova remota incompleta'});continue}
   const proof={id:sid(r.id),module:'production',action:row.name,proof:r.proof,serverRevision:+r.serverRevision,operationIds:r.operationIds.map(sid).filter(Boolean),round,verifiedAt:nowIso(),verification:'remote-proof-and-queue-readback'};verified.push(proof);
   const before=learningStore()[learnKey(row.name,fp)]?.confidence??confidenceDefault(recipe),learn=updateLearning(row.name,fp,{verified:1,proofType:proof.verification});events.push(recordRepairEvent({kind:'repair',runId,round,recipeId:row.name,safetyLevel:'B',module:'production',recordId:proof.id,operationIds:proof.operationIds,serverRevision:proof.serverRevision,proof:proof.proof,verification:proof.verification,status:'verified',confidenceBefore:before,confidenceAfter:learn.confidence,at:nowIso()}));
  }
 }
 return {verified,unknown,events};
}

async function remoteDiagnostic(issueId){
 if(typeof window.cloudRequest!=='function')return {ok:false,error:'Leitura remota da Central de ocorrências indisponível'};
 try{const q='hlgb_records?select=entity_id,data,deleted_at,revision,updated_at&module=eq.systemIssues&entity_id=eq.'+encodeURIComponent(sid(issueId))+'&limit=1';const rows=await window.cloudRequest(q,{method:'GET'});if(!Array.isArray(rows)||rows.length!==1||rows[0]?.deleted_at)return {ok:false,error:'Registro remoto da ocorrência não pôde ser confirmado'};const data=clone(rows[0]?.data);if(!data||sid(data.id||data.__hlgbId)!==sid(issueId))return {ok:false,error:'Resposta remota da ocorrência incompleta'};return {ok:true,data,revision:+rows[0].revision||0,updatedAt:sid(rows[0].updated_at)}}catch(e){return {ok:false,error:'Falha na releitura remota: '+sid(e?.message||e)}}
}
function restoreLocalIssue(snapshot){try{const list=window.db?.systemIssues;if(!Array.isArray(list))return;const i=list.findIndex(x=>sid(x?.id)===sid(snapshot?.id));if(i>=0)list[i]=clone(snapshot)}catch(e){}}
async function resolveStaleDiagnostics(startMs,proofs,runId){
 const api=window.hlgbDiagnosticsCenter,resolved=[],unknown=[];if(typeof api?.getIssues!=='function'||typeof api?.resolveVerifiedIssue!=='function'){unknown.push({detail:'Central de ocorrências indisponível para validar encerramentos'});return {resolved,unknown}}
 for(const issue of issues()){
  if(!openIssue(issue)||!technicalIssue(issue)||!(issueAt(issue)<startMs))continue;const refs=issue.recordRefs||[],opId=sid(issue.operationId||issue.opId);if(!opId||refs.length!==1)continue;const proof=proofs.find(p=>p.module===refs[0].module&&p.id===sid(refs[0].id)&&p.operationIds.includes(opId));if(!proof)continue;
  const live=issues().find(x=>sid(x.id)===sid(issue.id)),expectedLastSeen=issue.lastSeenAt||issue.lastSeen;if(!live||!openIssue(live)||(live.lastSeenAt||live.lastSeen)!==expectedLastSeen){unknown.push({id:issue.id,title:sid(issue.title),detail:'Ocorrência mudou durante a validação; mantida aberta'});continue}
  const before=await remoteDiagnostic(issue.id);if(!before.ok||!openIssue(before.data)||(before.data.lastSeenAt||before.data.lastSeen)!==expectedLastSeen){unknown.push({id:issue.id,title:sid(issue.title),detail:before.error||'Estado remoto mudou antes do encerramento; mantida aberta'});continue}
  const evidence={...proof,runId,issueId:issue.id,operationId:opId},result=await callSafe('resolve-diagnostic',()=>api.resolveVerifiedIssue(issue.id,evidence,expectedLastSeen));if(!result.ok||result.result?.status!=='Resolvido'){unknown.push({id:issue.id,title:sid(issue.title),detail:result.error||'Central não confirmou o pedido de encerramento'});restoreLocalIssue(issue);continue}
  const after=await remoteDiagnostic(issue.id),history=Array.isArray(after.data?.repairHistory)?after.data.repairHistory:[],confirmed=after.ok&&after.data?.status==='Resolvido'&&history.some(h=>h?.runId===runId&&h?.issueId===issue.id&&h?.operationId===opId&&h?.verification==='remote-proof-and-queue-readback');if(!confirmed){unknown.push({id:issue.id,title:sid(issue.title),detail:after.error||'Resposta remota incompleta; ocorrência não foi marcada como corrigida'});restoreLocalIssue(issue);try{await api.refresh?.(false)}catch(e){}continue}
  resolved.push({id:issue.id,title:sid(issue.title),evidence:proof});
 }
 return {resolved,unknown};
}

function featureContracts(){const x=readJson(CONTRACTS_KEY,{});return x&&typeof x==='object'&&!Array.isArray(x)?x:{}}
function registerFeatureContract(contract){
 if(!contract||typeof contract!=='object'||typeof contract.featureId!=='string'||!contract.featureId.trim())return false;
 const rejectFns=v=>{if(typeof v==='function')return true;if(Array.isArray(v))return v.some(rejectFns);if(v&&typeof v==='object')return Object.values(v).some(rejectFns);return false};if(rejectFns(contract))return false;
 const ids=[...(contract.repairRecipes||[])].map(sid).filter(id=>recipeDefs[id]);const row=sanitize({featureId:contract.featureId.trim(),version:sid(contract.version||V),healthChecks:(contract.healthChecks||[]).map(sid).slice(0,30),repairRecipes:ids,safetyLevel:['A','B','C'].includes(contract.safetyLevel)?contract.safetyLevel:'C',postconditions:(contract.postconditions||[]).map(sid).slice(0,30),protectedRules:(contract.protectedRules||[]).map(sid).slice(0,30),notes:sid(contract.notes||'').slice(0,1200),registeredAt:nowIso(),registeredBy:'trusted-app-code'});
 const all=featureContracts();all[row.featureId]=row;writeJson(CONTRACTS_KEY,all);return clone(row)
}
registerFeatureContract({featureId:'auditor-autocorrect-core',version:V,healthChecks:['internal-audit-full-readonly','sync-queue-metrics','diagnostics-center','ui-page-stability'],repairRecipes:Object.keys(recipeDefs),safetyLevel:'B',postconditions:['reteste silencioso após cada rodada','prova remota e releitura de fila para limpeza de pendências','nenhuma mudança de tela'],protectedRules:['não inventar valor, quantidade, observação ou vínculo','não reparar Financeiro→Projeção órfão sem fonte histórica'],notes:'Contrato base da v94.41. Novas funções devem registrar seu contrato e referenciar apenas receitas confiáveis existentes no código.'});

function persistSummary(summary){let h=readJson(HISTORY_KEY,[]);if(!Array.isArray(h))h=[];h=h.filter(x=>x.runId!==summary.runId);h.push(sanitize(summary));return writeJson(HISTORY_KEY,h.slice(-40))}
function latestSummary(){const h=readJson(HISTORY_KEY,[]);return Array.isArray(h)&&h.length?clone(h[h.length-1]):null}
function reportBundle(summary,last){const events=repairEvents().filter(x=>x.runId===summary.runId);const bundle=sanitize({kind:'hlgb_autocorrect_report',version:V,generatedAt:nowIso(),appVersion:sid(window.HLGB_RELEASE_VERSION||V),browser:sid(navigator.userAgent||''),run:summary,repairEvents:events,learning:learningStore(),featureContracts:featureContracts(),finalAudit:{summary:last?.main?.summary||null,checks:unresolved(last),metrics:currentMetrics(),operations:last?.operations||{}},rules:{automatic:['A: técnico idempotente','B: técnico com identidade/prova forte'],manual:['C: regra de negócio ou dado ausente'],neverInvent:['valores','quantidades','observações','vínculos sem fonte','órfãos Financeiro→Projeção']}});writeJson(REPORT_KEY,bundle);state.lastReport=clone(bundle);return bundle}
function downloadReport(report){try{const data=report||state.lastReport||readJson(REPORT_KEY,null);if(!data)return false;const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='hlgb-auditor-autocorretor-'+sid(data?.run?.runId||Date.now()).replace(/[^a-z0-9_-]/gi,'_')+'.json';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1200);return true}catch(e){state.lastError=sid(e?.message||e);return false}}
const esc=v=>sid(v).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
function render(summary){const host=document.getElementById('hlgbAuditorResult');if(!host||!summary)return false;let c=document.getElementById(CARD_ID);if(!c){c=document.createElement('div');c.id=CARD_ID;c.className='panel';host.prepend(c)}const groups=[['Corrigido e validado',summary.corrected||[]],['Ainda com falha',summary.stillFailing||[]],['Aguardando decisão humana',summary.blocked||[]],['Não foi possível verificar',summary.unverified||[]]];c.innerHTML='<b>🧠 Auditor Autocorretor v94.41</b><div>'+esc(summary.passes||0)+' rodada(s) silenciosa(s) · '+esc(summary.stopReason||'')+'</div><div class="sub">Nenhuma troca de tela. Cada reparo comprovado alimenta o aprendizado.</div>'+groups.map(([label,items])=>'<details><summary>'+label+': '+items.length+'</summary><ul>'+items.slice(0,30).map(x=>'<li>'+esc(x.title||x.detail||x.id||x.action||x.recipeId)+' '+esc(x.verification||'')+'</li>').join('')+'</ul></details>').join('')+'<div style="margin-top:10px"><button type="button" id="hlgbAutoCorrectDownload9441" class="secondary">⬇️ Baixar relatório completo</button></div>';c.querySelector('#hlgbAutoCorrectDownload9441')?.addEventListener('click',()=>downloadReport());return true}

async function execute(opts={}){
 stamp();state.runs++;state.lastError='';state.lastAt=nowIso();const started=Date.now(),runId='autocorrect-'+started+'-'+state.runs,ui=uiSnapshot();let last=null,passes=0,stopReason='Limite de 3 rodadas',corrected=[],unknown=[],rounds=[],resolved=[];
 try{
  last=await silentAudit('initial');observeFindings(last);
  if(!hasRepairableWork(last)){stopReason=findOrphans(last).length||unresolved(last).some(x=>!technicalFinding(x))?'Somente pendências que exigem decisão humana':'Sistema técnico estável; nenhum reparo necessário'}
  else for(let pass=1;pass<=MAX_PASSES;pass++){
   passes=pass;state.passes++;const before=signature(last),actions=await healTechnical('round-'+pass);last=await silentAudit('retest-'+pass);observeFindings(last);const validation=await validateRepairs(actions,pass,runId);corrected.push(...validation.verified);unknown.push(...validation.unknown);rounds.push({round:pass,actions:sanitize(actions),verification:sanitize(validation),audit:sanitize({summary:last?.main?.summary,ui:last?.ui}),at:nowIso()});
   if(!uiStable(ui)&&Date.now()-lastUserNavigationAt>=1500){unknown.push({detail:'Uma rotina técnica tentou alterar a tela; o Auditor restaurou a tela original'});restoreUi(ui)}
   if(!hasRepairableWork(last)){stopReason='Estabilizado: correções técnicas concluídas';break}
   if(before===signature(last)&&validation.verified.length===0){stopReason='Estabilizado: sem progresso adicional verificável';break}
   if(findOrphans(last).length&&unresolved(last).every(x=>!technicalFinding(x))&&!issues().some(x=>openIssue(x)&&technicalIssue(x))){stopReason='Restaram apenas pendências que exigem decisão humana';break}
  }
  const current=issues().filter(openIssue),failedRefs=unresolved(last).flatMap(x=>x.refs||[]);corrected=corrected.filter(p=>!failedRefs.some(r=>r.module===p.module&&sid(r.id)===p.id)&&!current.some(x=>issueAt(x)>=started&&(x.recordRefs||[]).some(r=>r.module===p.module&&sid(r.id)===p.id)));corrected=dedupe(corrected,p=>p.module+'|'+p.id+'|'+p.action);
  const blocked=findOrphans(last).filter(x=>x.refs.length||x.detail);let stillFailing=unresolved(last).filter(x=>x.code!=='data:finance-projection-orphan'&&x.code!=='finance-projection-orphan');for(const x of current.filter(x=>issueAt(x)>=started))stillFailing.push({id:x.id,title:x.title,detail:'Ocorrência atual; mantida aberta'});stillFailing=dedupe(stillFailing,x=>sid(x.id)||sid(x.code)+'|'+JSON.stringify(x.refs||[])+'|'+sid(x.title));
  const resolution=await resolveStaleDiagnostics(started,corrected,runId);resolved=resolution.resolved;unknown.push(...resolution.unknown);const resolvedIds=new Set(resolved.map(x=>sid(x.id)));let unverified=[...unknown,...issues().filter(openIssue).filter(x=>!resolvedIds.has(sid(x.id))&&!(issueAt(x)>=started)).map(x=>({id:x.id,title:x.title,detail:'Sem verificação específica que comprove resolução'}))];unverified=dedupe(unverified,x=>sid(x.id)+'|'+sid(x.action)+'|'+sid(x.detail)+'|'+sid(x.title));
  const summary={version:V,runId,at:nowIso(),silent:true,nonNavigating:true,passes,stopReason,fixed:corrected.length,corrected,stillFailing,unverified,blocked,rounds,resolvedDiagnostics:resolved,cleanTechnical:cleanTechnicalState(last),remainingOpenIssues:issues().filter(openIssue).length,ui:{pageBefore:ui.page,pageAfter:activePage(),stable:ui.page===activePage()}};state.blocked=blocked.length;state.verifiedRepairs+=corrected.length;state.diagnosticsResolved+=resolved.length;summary.historySaved=persistSummary(summary);const bundle=reportBundle(summary,last);state.lastSummary=clone(summary);if(opts.render!==false)render(summary);if(opts.download===true)downloadReport(bundle);return {...summary,result:last,report:bundle}
 }catch(e){state.lastError=sid(e?.message||e);const summary={version:V,runId,at:nowIso(),silent:true,nonNavigating:true,passes,stopReason:'Execução interrompida',fixed:0,corrected:[],stillFailing:[],blocked:findOrphans(last),unverified:[{detail:state.lastError}],rounds};persistSummary(summary);const bundle=reportBundle(summary,last);state.lastSummary=clone(summary);if(opts.render!==false)render(summary);if(opts.download===true)downloadReport(bundle);return {...summary,report:bundle}}
 finally{if(Date.now()-lastUserNavigationAt>=1500)restoreUi(ui)}
}
async function run(opts={}){if(state.running||!authReady())return false;state.running=true;try{if(navigator.locks?.request)return await navigator.locks.request(LOCK_NAME,{ifAvailable:true},lock=>lock?execute(opts):false);state.lastError='Navegador sem bloqueio de execução entre abas';return {version:V,runId:'blocked-'+Date.now(),passes:0,stopReason:'Execução não iniciada',corrected:[],stillFailing:[],blocked:[],unverified:[{detail:state.lastError}]}}finally{state.running=false}}

function backgroundSignal(){if(!authReady()||document.hidden||navigator.onLine===false||state.running)return false;const m=currentMetrics();return issues().some(x=>openIssue(x)&&technicalIssue(x))||(+m.pendingUnique||0)>0||(+m.scriptDuplicates||0)>0||(+m.saveDuplicateResponsibilities||0)>0}
async function backgroundCheck(reason='background'){if(Date.now()-Date.parse(state.lastBackgroundAt||0)<BACKGROUND_COOLDOWN)return false;if(!backgroundSignal())return false;state.lastBackgroundAt=nowIso();return run({reason,render:false,download:false,background:true})}
let backgroundTimer=null;
function scheduleBackground(){if(window.__HLGB_TEST__)return false;clearTimeout(backgroundTimer);if(!authReady())return false;backgroundTimer=setTimeout(async()=>{try{await backgroundCheck('health-signal')}finally{scheduleBackground()}},120000);return true}
function activate(){if(!authReady())return false;if(!window.__HLGB_TEST__){setTimeout(()=>backgroundCheck('post-auth'),30000);scheduleBackground()}return true}

document.addEventListener?.('click',e=>{if(e.target?.closest?.('[data-page],.nav-item,.nav-group button,#sidebar button,[onclick*="showPage"],[onclick*="navigate"]'))lastUserNavigationAt=Date.now()},true);
window.addEventListener?.('online',()=>{if(authReady()&&!window.__HLGB_TEST__)setTimeout(()=>backgroundCheck('online'),1500)});
window.addEventListener?.('hlgb:authenticated',()=>activate());
state.lastSummary=latestSummary();state.lastReport=readJson(REPORT_KEY,null);
window.hlgbAuditorAutoCorrect9441={version:V,state,run,silentAudit,healTechnical,render,downloadReport,exportReport:()=>clone(state.lastReport||readJson(REPORT_KEY,null)),learning:()=>clone(learningStore()),repairEvents:()=>clone(repairEvents()),featureContracts:()=>clone(featureContracts()),registerFeatureContract,backgroundCheck,status:()=>({...state,authReady:authReady(),openIssues:issues().filter(openIssue).length,learningEntries:Object.keys(learningStore()).length,contracts:Object.keys(featureContracts()).length})};
stamp();if(authReady())activate();console.info('[HLGB] v'+V+' Auditor Autocorretor silencioso pronto · aprendizado por prova · relatório por reparo');
})();