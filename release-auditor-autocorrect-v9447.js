/* HLGB v94.47 — Auditor Autocorretor em convergência rápida.
   Separa fila técnica viva, pendências de negócio e histórico antigo antes de reparar.
   Evita rodadas repetitivas quando a fila operacional real está zerada e entrega
   uma triagem compacta do que precisa de código versus decisão humana. */
(function(){
'use strict';
const V='94.47',BASE_V='94.46',BASE_SRC='./release-auditor-autocorrect-v9446.js';
const REPORT_KEY='hlgb_auditor_autocorrect_latest_report_v9447';
const CARD_ID='hlgbAuditorAutoCorrect9447Card';
const RECENT_MS=15*60*1000;
if(window.HLGB_AUDITOR_AUTOCORRECT_9447===V)return;
window.HLGB_AUDITOR_AUTOCORRECT_9447=V;
const state={version:V,running:false,runs:0,fastRuns:0,legacyRuns:0,baseLoads:0,lastAt:'',lastError:'',lastSummary:null,lastReport:null,lastTriage:null};
const sid=v=>String(v??'');
const clone=v=>{try{return structuredClone(v)}catch(e){try{return JSON.parse(JSON.stringify(v))}catch(_){return v}}};
const nowIso=()=>new Date().toISOString();
const ts=v=>{const n=Date.parse(sid(v));return Number.isFinite(n)?n:NaN};
const writeJson=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v));return true}catch(e){return false}};
function authReady(){return window.__HLGB_AUTH_READY===true}
function stamp(){try{if((parseFloat(sid(window.HLGB_RELEASE_VERSION))||0)<94.47)window.HLGB_RELEASE_VERSION=V;const el=document.querySelector?.('#appShell .logo small');if(el&&(parseFloat(sid(el.textContent).replace(/^v/i,''))||0)<94.47)el.textContent='v'+V}catch(e){}}
function baseReady(){return window.HLGB_AUDITOR_AUTOCORRECT_9446===BASE_V&&typeof window.hlgbAuditorAutoCorrect9446?.run==='function'}
function loadBase(){
 if(baseReady())return Promise.resolve(true);if(typeof document==='undefined'||typeof document.createElement!=='function')return Promise.resolve(false);
 let s=document.querySelector('script[data-hlgb-auditor-autocorrect-9446-for-9447]');if(s?.__hlgbPromise)return s.__hlgbPromise;
 if(!s){s=document.createElement('script');s.src=BASE_SRC+'?fresh='+Date.now();s.async=false;s.setAttribute('data-hlgb-auditor-autocorrect-9446-for-9447','1');(document.head||document.documentElement).appendChild(s);state.baseLoads++}
 const p=new Promise(resolve=>{if(baseReady())return resolve(true);let done=false;const finish=()=>{if(done)return;done=true;resolve(baseReady())};s.addEventListener('load',finish,{once:true});s.addEventListener('error',()=>{try{s.remove()}catch(_){}finish()},{once:true});setTimeout(finish,12000)});s.__hlgbPromise=p;return p;
}
async function ensureBase(){return baseReady()?true:loadBase()}
/* v94.68: uma fila durável exclusiva do IndexedDB não aparece em pendingSync:0.
   Inventário SOMENTE leitura; não abre uma store nova nem presume que os dados foram enviados. */
function indexedWalInventory9468(){
 if(typeof indexedDB==='undefined')return Promise.resolve({status:'unsupported',count:null,items:[]});
 return new Promise(resolve=>{
  let req,done=false,db=null;
  const finish=(result)=>{if(done)return;done=true;clearTimeout(timer);try{db?.close?.()}catch(_){}resolve(result)};
  const timer=setTimeout(()=>finish({status:'timeout',count:null,items:[]}),6500);
  try{
   req=indexedDB.open('hlgb_durable_wal');
   req.onupgradeneeded=()=>{try{req.transaction.abort()}catch(_){}finish({status:'no-store',count:0,items:[]})};
   req.onerror=()=>finish({status:'error',count:null,items:[]});
   req.onsuccess=()=>{
    db=req.result;
    if(!db.objectStoreNames.contains('entries'))return finish({status:'no-store',count:0,items:[]});
    try{
     const tx=db.transaction('entries','readonly'),get=tx.objectStore('entries').getAll();
     get.onsuccess=()=>{
      const rows=Array.isArray(get.result)?get.result:[];
      finish({status:'ok',count:rows.length,items:rows.slice(0,30).map(x=>({module:sid(x?.module),id:sid(x?.id),opId:sid(x?.opId),key:sid(x?.key)}))});
     };
     get.onerror=()=>finish({status:'error',count:null,items:[]});
     tx.onabort=()=>finish({status:'error',count:null,items:[]});
    }catch(e){finish({status:'error',count:null,items:[]})}
   };
  }catch(e){finish({status:'error',count:null,items:[]})}
 });
}
function metrics(){try{return clone(window.hlgbAuditorIntelligence9396?.currentMetrics?.()?.metrics||{})}catch(e){return {}}}
function structureEvidence9471(){try{const x=window.hlgbAuditorIntelligence9396?.currentMetrics?.()||{};return {duplicateScripts:(x.duplicateScripts||[]).slice(0,20).map(z=>({file:sid(z.file),dom:+z.dom||0,resource:+z.resource||0})),saveDuplicateResponsibilities:(x.saveChain?.duplicateResponsibilities||[]).slice(0,20).map(z=>({id:sid(z.id),count:+z.count||0,final:+z.final||0,legacy:+z.legacy||0})),saveDepth:+x.saveChain?.depth||0}}catch(e){return {duplicateScripts:[],saveDuplicateResponsibilities:[],saveDepth:0,error:sid(e?.message||e)}}}
function allIssues(){try{const x=window.hlgbDiagnosticsCenter?.getIssues?.();return Array.isArray(x)?x:[]}catch(e){return []}}
function openIssue(x){return !/resolvid|closed|fechad/i.test(sid(x?.status))}
function issueAt(x){return ts(x?.lastSeenAt||x?.lastSeen||x?.updatedAt||x?.updated_at||x?.createdAt||x?.firstSeen)}
function protectedBusinessText(v){return /financeiro sem projeção|finance-projection-orphan|valor financeiro|preço|preco|quantidade|observaç|nota fiscal|associaç|vínculo|vinculo|decisão de negócio|decisao de negocio|business-difference/i.test(sid(v))}
function technicalText(v){return /falha ao salvar|conflito protegido|sincron|\bsync\b|\bwal\b|\back\b|load failed|failed to fetch|network|timeout|fila|pending|duplicad|render|listener|cache|snapshot|tombstone|erro javascript|falha assíncrona|falha assincrona/i.test(sid(v))}
function technicalIssue(x){const t=[x?.title,x?.detail,x?.description,x?.source,x?.sourceType,x?.category,x?.kind,x?.technical].map(sid).join(' ');return !protectedBusinessText(t)&&technicalText(t)}
function recentTechnicalIssues(list=allIssues(),at=Date.now()){return list.filter(x=>openIssue(x)&&technicalIssue(x)&&Number.isFinite(issueAt(x))&&issueAt(x)>=at-RECENT_MS)}
function historicalIssues(list=allIssues(),at=Date.now()){return list.filter(x=>openIssue(x)&&!(Number.isFinite(issueAt(x))&&issueAt(x)>=at-RECENT_MS))}
function operationPending(audit){const p=audit?.operations?.pending||audit?.main?.operational?.pending||{};return {unique:+p.unique||0,records:+p.records||0,wal:+p.wal||0,totalCopies:+p.totalCopies||0}}
function opStatus(audit,key){return sid(audit?.operations?.[key]?.status||'')}
function operationalCoverage9474(audit){
 const fields=['delivery','savingUi','runtime'];
 const checks=Object.fromEntries(fields.map(k=>[k,opStatus(audit,k)||'not-tested']));
 const missing=fields.filter(k=>!['pass','success','ok','warn','fail','error'].includes(checks[k]));
 return {checks,missing,verifiedAll:missing.length===0,liveCrossDeviceProof:false,visualJumpProof:false};
}
function unresolvedChecks(audit){const x=audit?.main?.checks||audit?.audit?.checks||[];return Array.isArray(x)?x.filter(r=>r?.status==='fail'||r?.status==='warn'):[]}
function liveTechnicalChecks(audit){return unresolvedChecks(audit).filter(x=>!['sync:pending','issues:open','data:finance-projection-orphan','finance-projection-orphan'].includes(sid(x?.code))&&!protectedBusinessText([x?.code,x?.title,x?.detail,x?.category].map(sid).join(' '))&&technicalText([x?.code,x?.title,x?.detail,x?.category].map(sid).join(' ')))}
function liveSignal(audit,m=metrics(),issues=allIssues()){
 const p=operationPending(audit),recent=recentTechnicalIssues(issues),checks=liveTechnicalChecks(audit);
 const operationalFail=['delivery','savingUi','runtime'].some(k=>['fail','error'].includes(opStatus(audit,k)));
 const live=(p.unique+p.records+p.wal)>0||(+m.pendingTechnicalRecent||0)>0||(+m.scriptDuplicates||0)>0||(+m.saveDuplicateResponsibilities||0)>0||recent.length>0||checks.length>0||operationalFail;
 return {live,operationalQueue:p,pendingTechnicalRecent:+m.pendingTechnicalRecent||0,pendingTechnicalHistorical:+m.pendingTechnicalHistorical||0,pendingBusiness:+m.pendingBusiness||0,reportedPendingUnique:+m.pendingUnique||0,scriptDuplicates:+m.scriptDuplicates||0,saveDuplicateResponsibilities:+m.saveDuplicateResponsibilities||0,recentTechnicalIssues:recent.map(compactIssue),liveChecks:checks.map(compactFinding),operationalFail};
}
function compactIssue(x){return {id:sid(x?.id),title:sid(x?.title),detail:sid(x?.detail),status:sid(x?.status),lastSeenAt:sid(x?.lastSeenAt||x?.lastSeen)}}
function compactFinding(x){return {code:sid(x?.code),title:sid(x?.title),detail:sid(x?.detail),status:sid(x?.status),refs:clone(x?.refs||[])}}
async function silentAudit(reason='v9447-triage'){
 const api=window.hlgbAuditorAutoCorrect9441;if(typeof api?.silentAudit!=='function')throw new Error('Auditoria silenciosa v94.41 indisponível');return api.silentAudit(reason)
}
async function candidates(){
 const api=window.hlgbProductionReconcile9439;
 if(typeof api?.candidates!=='function')throw new Error('Diagnóstico de Produção indisponível: função candidates ausente');
 try{
  const x=await api.candidates();
  if(!Array.isArray(x))throw new Error('Diagnóstico de Produção devolveu resposta inválida');
  return x;
 }catch(e){state.lastError=sid(e?.message||e);throw new Error('Falha ao consultar candidatos de Produção: '+state.lastError)}
}
function repairEvents(){try{const x=window.hlgbAuditorAutoCorrect9441?.repairEvents?.();return Array.isArray(x)?x:[]}catch(e){return []}}
function latestEventFor(id,events){return events.filter(e=>sid(e?.recipeId)==='production-reconcile'&&sid(e?.recordId)===sid(id)).sort((a,b)=>(ts(b?.at)||0)-(ts(a?.at)||0))[0]||null}
function classifyCandidate(c,event){
 const id=sid(c?.id),reason=sid(c?.reason||c?.error||event?.detail),status=sid(event?.status),text=(reason+' '+status).toLowerCase();
 const base={id,module:'production',action:'production-reconcile',detail:reason||'Pendência de Produção ainda sem classificação',eventStatus:status||'',lastEventAt:sid(event?.at),candidateReason:sid(c?.reason||c?.error)};
 if(/business-difference|diferença de negócio|diferenca de negocio/.test(text))return {...base,classification:'business-blocked',requires:'human-decision'};
 if(/reteste da fila|prova remota incompleta|readback|unverified|sem confirmação|sem confirmacao/.test(text))return {...base,classification:'needs-code',requires:'code'};
 return {...base,classification:'needs-code',requires:'code',detail:reason||'Pendência de Produção sem prova suficiente; requer diagnóstico de código'};
}
async function triage(audit){
 const at=Date.now(),m=metrics(),structure=structureEvidence9471(),issues=allIssues(),signal=liveSignal(audit,m,issues),idbWal=await indexedWalInventory9468(),cs=await candidates(),events=repairEvents(),classified=cs.map(c=>classifyCandidate(c,latestEventFor(c?.id,events)));
 const needsCode=classified.filter(x=>x.classification==='needs-code'),businessBlocked=classified.filter(x=>x.classification==='business-blocked'),historical=historicalIssues(issues,at);
 const coverage=operationalCoverage9474(audit);
 // Métricas estruturais NÃO são candidatas de Produção e não justificam executar quatro receitas genéricas.
 // A triagem preserva o sinal como tarefa de código, sem fingir que uma reconciliação sem alvo o corrigiu.
 if(signal.saveDuplicateResponsibilities>0)needsCode.push({id:'structure:save-responsibilities',module:'runtime',action:'review-save-chain',classification:'needs-code',requires:'code',detail:signal.saveDuplicateResponsibilities+' responsabilidade(s) repetida(s) no grafo de salvamento: '+(structure.saveDuplicateResponsibilities.map(x=>x.id+' ('+x.count+' camadas)').join(', ')||'identidade não capturada')+'. Verificar fases reais antes de retirar proteção.'});
 if((idbWal.count===null||idbWal.count===undefined)&&!['unsupported','no-store'].includes(idbWal.status))needsCode.push({id:'sync:indexeddb-unverified',module:'sync',action:'investigate-indexeddb-inventory',classification:'needs-code',requires:'read-proof',detail:'Não foi possível verificar IndexedDB ('+sid(idbWal.status)+'). Não declarar fila vazia nem limpar pendências.'});
 if(idbWal.count>0)needsCode.push({id:'sync:indexeddb-wal',module:'sync',action:'review-indexeddb-pending',classification:'needs-code',requires:'remote-proof',detail:idbWal.count+' operação(ões) ainda no IndexedDB, mesmo que pendingSync indique 0. Não eliminar sem confirmação remota por opId e conteúdo.'});
 if(signal.scriptDuplicates>0)needsCode.push({id:'structure:duplicate-scripts',module:'runtime',action:'review-script-loader',classification:'needs-code',requires:'code',detail:signal.scriptDuplicates+' script(s) duplicado(s) detectado(s): '+(structure.duplicateScripts.map(x=>x.file+' (DOM '+x.dom+', requests '+x.resource+')').join(', ')||'arquivo não identificado')+'. Revisar origem e inicialização antes de corrigir.'});
 signal.indexedDbWal={status:idbWal.status,count:idbWal.count,items:idbWal.items};
 signal.operationalCoverage=clone(coverage);
 const out={version:V,at:nowIso(),signal,structureEvidence:structure,coverage,needsCode,businessBlocked,historicalBacklog:{count:historical.length,openTotal:issues.filter(openIssue).length,recentTechnicalCount:signal.recentTechnicalIssues.length,detail:historical.length?historical.length+' ocorrência(s) antiga(s) resumida(s); não entram no ciclo de reparo.':'Sem histórico antigo aberto.'},candidateCount:cs.length};state.lastTriage=clone(out);return out;
}
function compactUnknown(items){return (items||[]).filter(x=>!/^Sem verificação específica que comprove resolução$/i.test(sid(x?.detail))).slice(0,40)}
function mergeUnique(items,key){const out=[],seen=new Set();for(const x of items||[]){const k=key(x);if(seen.has(k))continue;seen.add(k);out.push(x)}return out}
function knownGaps9474(t){const c=t?.coverage||{};const gaps=(c.missing||[]).map(k=>'Verificação operacional '+k+' não executada');gaps.push('Entrega A→B/B→A sem refresh não comprovada em duas sessões','Estabilidade visual Chrome/Safari não comprovada em navegador real');return gaps}
function buildFastSummary(audit,t,reason){
 const needs=t.needsCode.map(x=>({id:x.id,action:x.action,detail:x.detail,classification:x.classification}));
 const blocked=t.businessBlocked.map(x=>({id:x.id,action:x.action,detail:x.detail,safetyLevel:'C',classification:x.classification}));
 const idbPending=+(t.signal?.indexedDbWal?.count||0);const stop=idbPending?'Triagem rápida: '+idbPending+' pendência(s) WAL no IndexedDB ainda sem prova de conclusão; não executar receitas sem alvo.':t.needsCode.length?'Triagem rápida: sem fila técnica reparável; '+t.needsCode.length+' item(ns) precisam de código. Reparos repetitivos foram evitados.':'Triagem rápida: sem fila técnica viva; restam apenas pendências de negócio/histórico.';
 return {version:V,runtimeVersion:V,runId:'autocorrect-fast-'+Date.now(),at:nowIso(),silent:true,nonNavigating:true,passes:0,repairSkipped:true,fastConvergence:true,reason,stopReason:stop,fixed:0,corrected:[],stillFailing:needs,unverified:needs,blocked,rounds:[],resolvedDiagnostics:[],cleanTechnical:needs.length===0&&blocked.length===0&&t.coverage?.verifiedAll===true,remainingOpenIssues:t.historicalBacklog.openTotal,needsCode:clone(t.needsCode),businessBlocked:clone(t.businessBlocked),knownGaps:knownGaps9474(t),operationalCoverage:clone(t.coverage),historicalBacklog:clone(t.historicalBacklog),triage:clone(t),ui:{pageBefore:'',pageAfter:'',stable:null,verified:false},result:audit};
}
async function withLiveScope(fn){
 const intel=window.hlgbAuditorIntelligence9396,diag=window.hlgbDiagnosticsCenter,origMetrics=intel?.currentMetrics,origIssues=diag?.getIssues;
 try{
  if(intel&&typeof origMetrics==='function')intel.currentMetrics=function(){const raw=origMetrics.apply(this,arguments),x=clone(raw||{}),m=x?.metrics||{};m.pendingUnique=+m.pendingTechnicalRecent||0;m.pendingBusiness=0;m.pendingTechnicalHistorical=0;if(x&&typeof x==='object')x.metrics=m;return x};
  if(diag&&typeof origIssues==='function')diag.getIssues=function(){const all=origIssues.apply(this,arguments);return recentTechnicalIssues(Array.isArray(all)?all:[])};
  return await fn();
 }finally{if(intel&&typeof origMetrics==='function')intel.currentMetrics=origMetrics;if(diag&&typeof origIssues==='function')diag.getIssues=origIssues}
}
function upgradeLegacy(raw,audit,t){
 const out=clone(raw||{});out.version=V;out.runtimeVersion=V;out.fastConvergence=true;out.repairSkipped=false;out.needsCode=clone(t.needsCode);out.businessBlocked=clone(t.businessBlocked);out.historicalBacklog=clone(t.historicalBacklog);out.triage=clone(t);
 const op=operationPending(out?.result||audit);let still=(out.stillFailing||[]).filter(x=>!(sid(x?.code)==='sync:pending'&&op.unique===0&&op.records===0&&op.wal===0));still.push(...t.needsCode.map(x=>({id:x.id,action:x.action,detail:x.detail,classification:x.classification})));out.stillFailing=mergeUnique(still,x=>sid(x?.id)||sid(x?.code)+'|'+sid(x?.detail));
 out.unverified=mergeUnique([...compactUnknown(out.unverified),...t.needsCode.map(x=>({id:x.id,action:x.action,detail:x.detail,classification:x.classification}))],x=>sid(x?.id)+'|'+sid(x?.action)+'|'+sid(x?.detail));
 out.blocked=mergeUnique([...(out.blocked||[]),...t.businessBlocked.map(x=>({id:x.id,action:x.action,detail:x.detail,safetyLevel:'C',classification:x.classification}))],x=>sid(x?.id)||sid(x?.detail));
 out.remainingOpenIssues=t.historicalBacklog.openTotal;return out;
}
function makeReport(summary,audit,t){
 const report={kind:'hlgb_autocorrect_report',version:V,generatedAt:nowIso(),appVersion:V,browser:sid(navigator?.userAgent||''),operationalCoverage:clone(t.coverage),knownGaps:knownGaps9474(t),run:clone(summary),fastConvergence:{repairSkipped:!!summary.repairSkipped,operationalQueue:clone(t.signal.operationalQueue),pendingBusiness:t.signal.pendingBusiness,pendingTechnicalRecent:t.signal.pendingTechnicalRecent,structureEvidence:clone(t.structureEvidence||{}),needsCode:clone(t.needsCode),businessBlocked:clone(t.businessBlocked),historicalBacklog:clone(t.historicalBacklog)},finalAudit:{summary:audit?.main?.summary||null,checks:unresolvedChecks(audit).map(compactFinding),metrics:metrics(),operations:clone(audit?.operations||{})},rules:{repairTrigger:'Somente sinal técnico vivo',historical:'Resumido, não reparado',business:'Bloqueado para decisão humana',neverInvent:['valores','quantidades','observações','vínculos sem fonte']}};
 writeJson(REPORT_KEY,report);state.lastReport=clone(report);return report;
}
function downloadReport(report){try{const data=report||state.lastReport;if(!data)return false;const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='hlgb-auditor-autocorretor-'+sid(data?.run?.runId||Date.now()).replace(/[^a-z0-9_-]/gi,'_')+'.json';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1200);return true}catch(e){state.lastError=sid(e?.message||e);return false}}
const esc=v=>sid(v).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
function render(summary){
 const host=document.getElementById('hlgbAuditorResult');if(!host||!summary)return false;let c=document.getElementById(CARD_ID);if(!c){c=document.createElement('div');c.id=CARD_ID;c.className='panel';host.prepend(c)}
 c.innerHTML='<b>⚡ Auditor v94.47 · convergência rápida</b><div>'+esc(summary.passes||0)+' rodada(s) de reparo · '+esc(summary.stopReason||'')+'</div><div class="sub">Fila técnica viva: '+esc(summary.triage?.signal?.operationalQueue?.unique||0)+' · Precisa de código: '+esc(summary.needsCode?.length||0)+' · Decisão humana: '+esc(summary.businessBlocked?.length||0)+' · Histórico resumido: '+esc(summary.historicalBacklog?.count||0)+'</div>';return true;
}
async function prepare(reason='auditor-v9447'){
 if(!authReady())return {ok:false,ready:false,reason,error:'Autenticação ainda não está pronta',missing:['auth']};if(!(await ensureBase()))return {ok:false,ready:false,reason,error:'Autocorretor v94.46 indisponível',missing:['autocorrect-9446']};
 try{const p=await window.hlgbAuditorAutoCorrect9446?.prepare?.(reason+'-base');return {ok:p?.ok!==false,ready:p?.ready!==false,reason,baseVersion:BASE_V,basePreparation:clone(p),fastConvergence:true,at:nowIso()}}catch(e){return {ok:false,ready:false,reason,error:sid(e?.message||e),missing:['base-prepare']}}
}
async function run(opts={}){
 if(state.running||!authReady())return false;state.running=true;state.runs++;state.lastAt=nowIso();state.lastError='';stamp();
 try{
  const prep=await prepare(opts.reason||'auditor-run-v9447');if(!prep.ok)throw new Error(prep.error||'Preparação v94.47 incompleta');
  // Apenas prova remota de WAL: poda exige conteúdo igual e mesmo opId.
  // Não tenta reenviar alterações conflitantes ou reescrever registros de negócio.
  const idbBefore=await indexedWalInventory9468();let walProof={attempted:false,removed:0,remaining:idbBefore.count,status:idbBefore.status};
  if(idbBefore.count>0&&typeof window.hlgbWalSingleAuthority9339?.pruneConfirmed==='function'){
   walProof.attempted=true;
   try{const outcome=await window.hlgbWalSingleAuthority9339.pruneConfirmed(true,8);
    walProof={...walProof,removed:Number(outcome?.removed)||0,checked:Number(outcome?.checked)||0,errors:clone(outcome?.errors||[])};
   }catch(e){walProof.error=sid(e?.message||e)}
  }
  const before=await silentAudit('v9447-preflight'),pre=await triage(before);let out,audit=before,t=pre;
  const signal=pre.signal||{},queue=signal.operationalQueue||{},actionable=(+queue.unique||0)+(+queue.records||0)+(+queue.wal||0)+(+signal.pendingTechnicalRecent||0)+((signal.recentTechnicalIssues||[]).length)+((signal.liveChecks||[]).length)+(signal.operationalFail?1:0);
  // Candidatos sem pendência operacional podem exigir classificação humana/código, não reconciliação.
  // Estrutura sem evidência de fila viva não aciona ACK, Produção ou rapid-heal.
  if(!signal.live||!actionable){state.fastRuns++;out=buildFastSummary(before,pre,opts.reason||'v9447-no-repair-target')}
  else{
   state.legacyRuns++;const legacy=window.hlgbAuditorAutoCorrect9446;if(typeof legacy?.run!=='function')throw new Error('Autocorretor v94.46 indisponível');
   const raw=await withLiveScope(()=>legacy.run({...opts,render:false,download:false,reason:(opts.reason||'v9447')+'-live-scope'}));if(raw===false)throw new Error('Autocorretor v94.46 retornou false');audit=await silentAudit('v9447-post-repair');t=await triage(audit);out=upgradeLegacy(raw,audit,t);
  }
  out.version=V;out.runtimeVersion=V;out.fastConvergence=true;out.cleanTechnical=out.cleanTechnical===true&&t.coverage?.verifiedAll===true&&t.needsCode.length===0;out.knownGaps=knownGaps9474(t);out.operationalCoverage=clone(t.coverage);out.dependencyPreparation=clone(prep);out.walProof=clone({...walProof,remaining:t.signal?.indexedDbWal?.count});out.triage=clone(t);const report=makeReport(out,audit,t);out.report=report;state.lastSummary=clone(out);if(opts.render!==false)render(out);if(opts.download===true)downloadReport(report);return out;
 }catch(e){state.lastError=sid(e?.message||e);const out={version:V,runId:'autocorrect-9447-blocked-'+Date.now(),at:nowIso(),silent:true,nonNavigating:true,passes:0,repairSkipped:true,fastConvergence:true,stopReason:'Execução interrompida',fixed:0,corrected:[],stillFailing:[],blocked:[],unverified:[{detail:state.lastError}],rounds:[]};state.lastSummary=clone(out);if(opts.render!==false)render(out);return out}
 finally{state.running=false}
}
async function activate(reason='post-auth'){if(!authReady())return false;stamp();const p=await prepare(reason);return !!p.ok}
window.addEventListener?.('hlgb:authenticated',()=>setTimeout(()=>activate('authenticated-event'),0));
window.hlgbAuditorAutoCorrect9447={version:V,state,run,prepare,triage,liveSignal,ensureBase,render,downloadReport,exportReport:()=>clone(state.lastReport),status:()=>({...state,authReady:authReady(),baseReady:baseReady(),lastTriage:clone(state.lastTriage)})};
stamp();if(authReady())setTimeout(()=>activate('loaded-after-auth'),0);console.info('[HLGB] v'+V+' Auditor pronto · convergência rápida · histórico e negócio fora do ciclo técnico');
})();
