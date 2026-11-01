/* HLGB v94.40 — Auditor Reparador: audita, corrige somente falhas técnicas comprovadamente seguras e retesta.
   Carregado sob demanda após autenticação. Não grava dados de negócio, não apaga WAL/pendências sem prova e não repara órfãos de negócio por suposição. */
(function(){
'use strict';
const V='94.40',MAX_PASSES=3,CARD_ID='hlgbAuditorRepair9440Card';
if(window.HLGB_AUDITOR_REPAIR_9440===V)return;
window.HLGB_AUDITOR_REPAIR_9440=V;
const state={version:V,running:false,runs:0,passes:0,repairActions:0,repairImpact:0,diagnosticsResolved:0,blocked:0,lastAt:'',lastError:'',lastSummary:null};
const sid=v=>String(v??'');
const clone=v=>{try{return structuredClone(v)}catch(e){try{return JSON.parse(JSON.stringify(v))}catch(_){return v}}};
const ts=v=>{const n=Date.parse(String(v||''));return Number.isFinite(n)?n:NaN};
function authReady(){return window.__HLGB_AUTH_READY===true}
function stamp(){try{if((parseFloat(sid(window.HLGB_RELEASE_VERSION))||0)<94.40)window.HLGB_RELEASE_VERSION=V;const el=document.querySelector('#appShell .logo small');if(el&&(parseFloat(sid(el.textContent).replace(/^v/i,''))||0)<94.40)el.textContent='v'+V}catch(e){}}
function issues(){try{const a=window.hlgbDiagnosticsCenter?.getIssues?.();return Array.isArray(a)?a:[]}catch(e){return []}}
function openIssue(x){return !/resolvid|closed|fechad/i.test(sid(x?.status))}
function issueAt(x){return ts(x?.lastSeenAt||x?.lastSeen||x?.updatedAt||x?.updated_at||x?.createdAt||x?.firstSeen)}
function technicalIssue(x){const t=[x?.title,x?.detail,x?.source,x?.category].map(sid).join(' ');if(/erro javascript em runtime|financeiro sem projeção|finance-projection-orphan/i.test(t))return false;return /falha ao salvar|conflito protegido|sincron|\bsync\b|\bwal\b|\back\b|load failed|failed to fetch|network|timeout/i.test(t)}
function currentMetrics(out){try{const m=window.hlgbAuditorIntelligence9396?.currentMetrics?.()?.metrics;if(m)return m}catch(e){}return out?.daily?.intelligence?.metrics||out?.deep?.current?.metrics||out?.intelligence?.metrics||{}}
function cleanTechnicalState(out){
 if(!out||typeof out!=='object')return false;
 const m=currentMetrics(out),op=out?.daily?.operations||out?.operations||{};
 return [m.pendingUnique??op.pending?.unique,m.scriptDuplicates,m.saveDuplicateResponsibilities].every(x=>typeof x==='number'&&x===0)&&op.delivery?.status==='pass'&&op.savingUi?.status==='pass';
}
function findOrphans(root){const out=[],seen=new Set();function walk(v){if(!v||typeof v!=='object'||seen.has(v))return;seen.add(v);if(v.code==='data:finance-projection-orphan'||v.code==='finance-projection-orphan')out.push({code:v.code,detail:sid(v.detail),refs:clone(v.refs||[])});if(Array.isArray(v)){for(const x of v)walk(x)}else for(const x of Object.values(v))walk(x)}walk(root);const uniq=[],keys=new Set();for(const x of out){const k=x.refs.length?JSON.stringify(x.refs):x.detail;if(!keys.has(k)){keys.add(k);uniq.push(x)}}return uniq}
function uiSnapshot(){const p=document.querySelector('#appShell .page.active,.page.active'),a=document.activeElement;return {page:p?.id||'',x:window.scrollX||0,y:window.scrollY||0,top:p?.scrollTop||0,left:p?.scrollLeft||0,focus:a&&a!==document.body?a:null}}
function restoreUi(s){if(!s)return;try{if(s.page){const target=document.getElementById(s.page);if(target){document.querySelectorAll('#appShell .page.active,.page.active').forEach(x=>x.classList.remove('active'));target.classList.add('active')}}}catch(e){}try{window.scrollTo(s.x,s.y)}catch(e){}try{const p=document.getElementById(s.page);if(p){p.scrollTop=s.top;p.scrollLeft=s.left}}catch(e){}try{if(s.focus?.isConnected)s.focus.focus({preventScroll:true})}catch(e){}}
async function callSafe(name,fn){try{const r=await fn();return {name,ok:r!==false,result:r}}catch(e){return {name,ok:false,error:sid(e?.message||e)}}}
async function healTechnical(){
 const rows=[];
 for(const [name,api,method] of [
  ['ack-reconcile',window.hlgbAckReconcile9436,'install'],
  ['production-reconcile',window.hlgbProductionReconcile9439,'reconcile'],
  ['rapid-heal',window.hlgbAuditorRapid9437,'heal'],
  ['auditor-finalizer',window.hlgbAuditorFinalize9439,'install']
 ]){
  if(typeof api?.[method]!=='function'){rows.push({name,ok:false,error:'Rotina indisponível'});continue}
  rows.push(await callSafe(name,()=>api[method]('auditor-repair-v9440')));
 }
 return rows;
}
function currentTechnicalReproduced(startMs){return issues().some(x=>openIssue(x)&&technicalIssue(x)&&Number.isFinite(issueAt(x))&&issueAt(x)>=startMs)}
function reportChecks(out){return out?.main?.checks||out?.audit?.checks||[]}
function unresolved(out){return reportChecks(out).filter(x=>x.status==='fail'||x.status==='warn')}
function signature(out){return JSON.stringify({metrics:currentMetrics(out),checks:unresolved(out).map(x=>[x.code,x.status,x.refs||[]]),issues:issues().filter(openIssue).map(x=>[x.id,x.lastSeenAt||x.lastSeen,x.occurrences])})}
function dedupe(items,keyFn){const out=[],seen=new Set();for(const x of items||[]){const k=keyFn(x);if(seen.has(k))continue;seen.add(k);out.push(x)}return out}
async function validateRepairs(rows,round){
 const verified=[],unknown=[];
 for(const row of rows){
  if(!row.ok){unknown.push({action:row.name,detail:row.error||'Rotina não executada'});continue}
  if(row.name!=='production-reconcile')continue; // Installing a guard is not proof of a repaired problem.
  let pending;
  try{pending=await window.hlgbProductionReconcile9439?.candidates?.()}catch(e){unknown.push({action:row.name,detail:'Não foi possível reler a fila: '+sid(e?.message||e)});continue}
  for(const r of row.result?.results||[]){
   if(r.ok!==true){unknown.push({id:r.id,action:row.name,detail:r.error||r.reason||'Sem confirmação'});continue}
   const count=(+r.normalizedRemoved||0)+(+r.walRemoved||0);
   if(!count)continue;
   if(!Array.isArray(pending)||pending.some(x=>sid(x.id)===sid(r.id))||!r.proof||!(r.serverRevision>0)||!Array.isArray(r.operationIds)||!r.operationIds.length){
    unknown.push({id:r.id,action:row.name,detail:'Reteste da fila, operação ou prova remota incompleta'});continue;
   }
   verified.push({id:sid(r.id),module:'production',action:row.name,proof:r.proof,serverRevision:r.serverRevision,operationIds:r.operationIds.map(sid).filter(Boolean),round,verifiedAt:new Date().toISOString(),verification:'remote-proof-and-queue-readback'});
  }
 }
 return {verified,unknown};
}
async function resolveStaleDiagnostics(startMs,proofs,runId){
 const api=window.hlgbDiagnosticsCenter,resolved=[],unknown=[];
 if(typeof api?.getIssues!=='function'){unknown.push({detail:'Central de ocorrências indisponível para validar encerramentos'});return {resolved,unknown}}
 if(typeof window.hlgbRecordSaveWithRetry!=='function'){unknown.push({detail:'Gravação remota indisponível para validar encerramentos'});return {resolved,unknown}}
 for(const issue of issues()){
  if(!openIssue(issue)||!technicalIssue(issue)||!(issueAt(issue)<startMs))continue;
  const refs=issue.recordRefs||[],opId=sid(issue.operationId||issue.opId);
  // Legacy aggregate issues cannot be closed from a clean global snapshot.
  if(!opId||refs.length!==1)continue;
  const proof=proofs.find(p=>p.module===refs[0].module&&p.id===sid(refs[0].id)&&p.operationIds.includes(opId));
  if(!proof)continue;
  const live=issues().find(x=>sid(x.id)===sid(issue.id));
  const expectedLastSeen=issue.lastSeenAt||issue.lastSeen;
  if(!live||!openIssue(live)||(live.lastSeenAt||live.lastSeen)!==expectedLastSeen){unknown.push({id:issue.id,title:sid(issue.title),detail:'Ocorrência mudou durante a validação; mantida aberta'});continue}
  const history=Array.isArray(live.repairHistory)?live.repairHistory:[];
  const evidence={...proof,runId,issueId:issue.id,operationId:opId};
  const next={...clone(live),status:'Resolvido',resolvedAt:new Date().toISOString(),updatedAt:new Date().toISOString(),repairHistory:[...history,clone(evidence)]};
  let out;
  try{out=await window.hlgbRecordSaveWithRetry('systemIssues',sid(issue.id),clone(next),false)}catch(e){unknown.push({id:issue.id,title:sid(issue.title),detail:'Falha ao confirmar encerramento remoto: '+sid(e?.message||e)});continue}
  // Automatic closure is stricter than normal diagnostic edits: applied:true alone is not enough.
  const echoed=out?.data,echoId=sid(echoed?.id||echoed?.__hlgbId),echoHistory=Array.isArray(echoed?.repairHistory)?echoed.repairHistory:[];
  const confirmed=out?.applied===true&&echoed&&echoId===sid(issue.id)&&echoed.status==='Resolvido'&&echoHistory.some(h=>h?.runId===runId&&h?.issueId===issue.id&&h?.verification==='remote-proof-and-queue-readback');
  if(!confirmed){unknown.push({id:issue.id,title:sid(issue.title),detail:'Resposta remota incompleta; ocorrência não foi marcada como corrigida'});continue}
  try{if(Array.isArray(window.db?.systemIssues)){const i=window.db.systemIssues.findIndex(x=>sid(x?.id)===sid(issue.id));if(i>=0)window.db.systemIssues[i]=clone(echoed);try{window.localSaveOnly?.()}catch(_){}}}catch(e){}
  resolved.push({id:issue.id,title:sid(issue.title),evidence:proof});
 }
 return {resolved,unknown};
}
const HISTORY_KEY='hlgb_auditor_repair_history_v9440';
function persistSummary(summary){
 try{let h=JSON.parse(localStorage.getItem(HISTORY_KEY)||'[]');if(!Array.isArray(h))h=[];h=h.filter(x=>x.runId!==summary.runId);h.push(summary);localStorage.setItem(HISTORY_KEY,JSON.stringify(h.slice(-30)));return true}catch(e){return false}
}
function latestSummary(){try{const h=JSON.parse(localStorage.getItem(HISTORY_KEY)||'[]');return Array.isArray(h)&&h.length&&h[h.length-1]?.version===V?clone(h[h.length-1]):null}catch(e){return null}}
const esc=v=>sid(v).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
function render(summary){
 const host=document.getElementById('hlgbAuditorResult');if(!host||!summary)return false;
 let c=document.getElementById(CARD_ID);if(!c){c=document.createElement('div');c.id=CARD_ID;c.className='panel';host.prepend(c)}
 const groups=[['Corrigido e validado',summary.corrected||[]],['Ainda com falha',summary.stillFailing||[]],['Aguardando decisão humana',summary.blocked||[]],['Não foi possível verificar',summary.unverified||[]]];
 c.innerHTML='<b>🛠️ Auditor Reparador v94.40</b><div>'+(+summary.passes||0)+' rodada(s) · '+esc(summary.stopReason||'')+'</div>'+groups.map(([label,items])=>'<details><summary>'+label+': '+items.length+'</summary><ul>'+items.map(x=>'<li>'+esc(x.title||x.detail||x.id||x.action)+' '+esc(x.verification||'')+'</li>').join('')+'</ul></details>').join('');
 return true;
}
async function execute(){
 const api=window.hlgbAuditorSingleAction9429;
 if(typeof api?.run!=='function')throw new Error('Auditor principal indisponível');
 stamp();state.runs++;state.lastError='';state.lastAt=new Date().toISOString();
 const ui=uiSnapshot(),started=Date.now(),runId='repair-'+started+'-'+state.runs;
 let last=null,passes=0,stopReason='Limite de 3 rodadas',resolved=[],corrected=[],unknown=[],rounds=[];
 try{
  last=await api.run();
  if(!last||typeof last!=='object')throw new Error('Auditoria inicial não concluída');
  for(let pass=1;pass<=MAX_PASSES;pass++){
   passes=pass;state.passes++;
   const before=signature(last),actions=await healTechnical();
   // Every repair round has a subsequent audit, including round three.
   last=await api.run();
   if(!last||typeof last!=='object')throw new Error('Reteste não concluído na rodada '+pass);
   const validation=await validateRepairs(actions,pass);
   corrected.push(...validation.verified);unknown.push(...validation.unknown);
   rounds.push({round:pass,actions,verification:validation,at:new Date().toISOString()});
   state.repairActions+=actions.filter(x=>x.ok).length;
   if(before===signature(last)&&validation.verified.length===0){stopReason='Estabilizado: sem progresso adicional verificável';break}
  }
  // A later recurrence invalidates the earlier repair outcome.
  const current=issues().filter(openIssue),failedRefs=unresolved(last).flatMap(x=>x.refs||[]);
  corrected=corrected.filter(p=>!failedRefs.some(r=>r.module===p.module&&sid(r.id)===p.id)&&!current.some(x=>issueAt(x)>=started&&(x.recordRefs||[]).some(r=>r.module===p.module&&sid(r.id)===p.id)));
  corrected=dedupe(corrected,p=>p.module+'|'+p.id);
  const blocked=findOrphans(last).filter(x=>x.refs.length);
  let stillFailing=unresolved(last).filter(x=>x.code!=='data:finance-projection-orphan'&&x.code!=='finance-projection-orphan');
  for(const x of current.filter(x=>issueAt(x)>=started))stillFailing.push({id:x.id,title:x.title,detail:'Ocorrência atual; mantida aberta'});
  stillFailing=dedupe(stillFailing,x=>sid(x.id)||sid(x.code)+'|'+JSON.stringify(x.refs||[])+'|'+sid(x.title));
  const resolution=await resolveStaleDiagnostics(started,corrected,runId);resolved=resolution.resolved;unknown.push(...resolution.unknown);
  const resolvedIds=new Set(resolved.map(x=>sid(x.id)));
  let unverified=[...unknown,...current.filter(x=>!resolvedIds.has(sid(x.id))&&!(issueAt(x)>=started)).map(x=>({id:x.id,title:x.title,detail:'Sem verificação específica que comprove resolução'}))];
  if(typeof window.hlgbDiagnosticsCenter?.getIssues!=='function')unverified.push({detail:'Central de ocorrências indisponível'});
  unverified=dedupe(unverified,x=>sid(x.id)+'|'+sid(x.action)+'|'+sid(x.detail)+'|'+sid(x.title));
  const summary={version:V,readOnly:false,runId,at:new Date().toISOString(),passes,stopReason,fixed:corrected.length,corrected,stillFailing,unverified,blocked,rounds,resolvedDiagnostics:resolved,cleanTechnical:cleanTechnicalState(last),currentTechnicalReproduced:currentTechnicalReproduced(started),remainingOpenIssues:issues().filter(openIssue).length};
  state.blocked=blocked.length;state.repairImpact+=corrected.length;state.diagnosticsResolved+=resolved.length;
  summary.historySaved=persistSummary(summary);if(!summary.historySaved)summary.unverified.push({detail:'Não foi possível salvar o histórico desta execução'});
  state.lastSummary=clone(summary);render(summary);return {...summary,result:last};
 }catch(e){state.lastError=sid(e?.message||e);const summary={version:V,readOnly:false,runId,passes,stopReason:'Execução interrompida',corrected:[],fixed:0,stillFailing:[],blocked:findOrphans(last),unverified:[{detail:state.lastError}],rounds,at:new Date().toISOString()};summary.historySaved=persistSummary(summary);state.lastSummary=clone(summary);render(summary);return summary}finally{restoreUi(ui)}
}
async function run(){
 if(state.running||!authReady())return false;
 state.running=true;
 try{
  // Web Locks also prevent two tabs from repairing the same local queues concurrently.
  if(navigator.locks?.request)return await navigator.locks.request('hlgb-auditor-repair-v9440',{ifAvailable:true},lock=>lock?execute():false);
  state.lastError='Navegador sem bloqueio de execução entre abas';
  const summary={version:V,readOnly:false,runId:'blocked-'+Date.now(),passes:0,stopReason:'Execução não iniciada',corrected:[],fixed:0,stillFailing:[],blocked:[],unverified:[{detail:state.lastError}],rounds:[],at:new Date().toISOString()};summary.historySaved=persistSummary(summary);state.lastSummary=clone(summary);render(summary);return summary;
 }finally{state.running=false}
}
state.lastSummary=latestSummary();
window.hlgbAuditorRepair9440={version:V,state,run,healTechnical,cleanTechnicalState,findOrphans,currentTechnicalReproduced,render,status:()=>({...state,authReady:authReady(),openIssues:issues().filter(openIssue).length})};
stamp();console.info('[HLGB] v'+V+' Auditor Reparador pronto: auditar → reparar seguro → retestar');
})();
