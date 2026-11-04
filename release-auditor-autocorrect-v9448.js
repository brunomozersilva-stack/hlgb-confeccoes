/* HLGB v94.48 — Auditor com prova residual de Produção.
   Antes de chamar um registro de "precisa de código", relê o servidor, limpa cópias
   técnicas já satisfeitas e só então separa prova incompleta de diferença de negócio. */
(function(){
'use strict';
const V='94.48',RESIDUAL_V='94.84',BASE_V='94.47',BASE_SRC='./release-auditor-autocorrect-v9447.js',RESIDUAL_SRC='./release-production-residual-v9448.js';
const REPORT_KEY='hlgb_auditor_autocorrect_latest_report_v9448',CARD_ID='hlgbAuditorAutoCorrect9448Card';
if(window.HLGB_AUDITOR_AUTOCORRECT_9448===V)return;
window.HLGB_AUDITOR_AUTOCORRECT_9448=V;
const state={version:V,running:false,runs:0,preflightReconciles:0,lastAt:'',lastError:'',lastSummary:null,lastReport:null,lastResidual:null};
const sid=v=>String(v??'');
const clone=v=>{try{return structuredClone(v)}catch(e){try{return JSON.parse(JSON.stringify(v))}catch(_){return v}}};
const nowIso=()=>new Date().toISOString();
function authReady(){return window.__HLGB_AUTH_READY===true}
function stamp(){try{if((parseFloat(sid(window.HLGB_RELEASE_VERSION))||0)<94.48)window.HLGB_RELEASE_VERSION=V;const el=document.querySelector?.('#appShell .logo small');if(el&&(parseFloat(sid(el.textContent).replace(/^v/i,''))||0)<94.48)el.textContent='v'+V}catch(e){}}
function baseReady(){return window.HLGB_AUDITOR_AUTOCORRECT_9447===BASE_V&&typeof window.hlgbAuditorAutoCorrect9447?.run==='function'}
function residualReady(){return window.HLGB_PRODUCTION_RESIDUAL_9448===RESIDUAL_V&&typeof window.hlgbProductionResidual9448?.reconcileAndInspect==='function'}
function loadScript(src,attr,readyFn){if(readyFn())return Promise.resolve(true);let s=document.querySelector('script['+attr+']');if(s?.__hlgbPromise)return s.__hlgbPromise;if(!s){s=document.createElement('script');s.src=src+'?fresh='+Date.now();s.async=false;s.setAttribute(attr.split('=')[0].replace(/[\[\]]/g,''),'1');(document.head||document.documentElement).appendChild(s)}const p=new Promise(resolve=>{if(readyFn())return resolve(true);let done=false;const finish=()=>{if(done)return;done=true;resolve(readyFn())};s.addEventListener('load',finish,{once:true});s.addEventListener('error',()=>{try{s.remove()}catch(_){}finish()},{once:true});setTimeout(finish,12000)});s.__hlgbPromise=p;return p}
async function ensureBase(){return baseReady()?true:loadScript(BASE_SRC,'data-hlgb-auditor-autocorrect-9447-for-9448',baseReady)}
async function ensureResidual(){return residualReady()?true:loadScript(RESIDUAL_SRC,'data-hlgb-production-residual-9448',residualReady)}
async function prepare(reason='auditor-v9448'){
 if(!authReady())return {ok:false,ready:false,reason,error:'Autenticação ainda não está pronta',missing:['auth']};
 if(!(await ensureBase()))return {ok:false,ready:false,reason,error:'Autocorretor v94.47 indisponível',missing:['autocorrect-9447']};
 const bp=await window.hlgbAuditorAutoCorrect9447.prepare(reason+'-base');if(bp?.ok===false)return {ok:false,ready:false,reason,error:bp.error||'Preparação v94.47 falhou',missing:bp.missing||['base-prepare'],basePreparation:clone(bp)};
 if(!(await ensureResidual()))return {ok:false,ready:false,reason,error:'Diagnóstico residual v94.50 indisponível',missing:['production-residual-9448'],basePreparation:clone(bp)};
 return {ok:true,ready:true,reason,baseVersion:BASE_V,basePreparation:clone(bp),productionResidual:{ready:true,version:V},at:nowIso()};
}
function reasonFor(item){if(!item)return '';if(item.classification==='business-blocked')return 'business-difference';if(item.safeCopies>0)return 'Prova remota incompleta: cópia técnica satisfeita permaneceu após reconciliação';if(item.classification==='needs-code')return item.detail||'Prova remota incompleta';if(item.classification==='mixed-residual')return 'Prova remota incompleta: resíduo misto permaneceu após reconciliação';return item.detail||''}
async function withResidualCandidateReasons(diag,fn){const prod=window.hlgbProductionReconcile9439,orig=prod?.candidates;if(typeof orig!=='function')return fn();const map=new Map((diag?.after?.items||[]).map(x=>[sid(x.id),x]));prod.candidates=async function(){const rows=await orig.apply(this,arguments);return (Array.isArray(rows)?rows:[]).map(c=>{const item=map.get(sid(c?.id));return item?{...c,reason:reasonFor(item),residual9448:clone(item)}:c})};try{return await fn()}finally{prod.candidates=orig}}
function upgradeReport(raw,out,diag,prep){const src=clone(raw||{})||{};const report={...src,kind:'hlgb_autocorrect_report',version:V,appVersion:sid(window.HLGB_RELEASE_VERSION||V),generatedAt:nowIso(),run:clone(out),productionResidual:clone(diag),dependencyPreparation:clone(prep)};try{localStorage.setItem(REPORT_KEY,JSON.stringify(report))}catch(e){}state.lastReport=clone(report);return report}
function downloadReport(report){try{const data=report||state.lastReport;if(!data)return false;const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='hlgb-auditor-autocorretor-'+sid(data?.run?.runId||Date.now()).replace(/[^a-z0-9_-]/gi,'_')+'.json';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1200);return true}catch(e){state.lastError=sid(e?.message||e);return false}}
const esc=v=>sid(v).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
/* v94.83: diagnósticos observados, nunca declarar testes operacionais executados só
   porque o usuário abriu o Hub; clique, RPC, ACK e releitura são etapas distintas. */
function hubEvidence9483(summary){
 const h=summary?.hubSaveTrace||window.hlgbHubSaveTrace9483?.status?.()||null;
 const escPhase=v=>esc(sid(v||'não executado').slice(0,96));
 if(!h||!(Number(h.attempts)>0))
  return '<details><summary><b>Salvamento do Hub Financeiro</b> — não executado nesta sessão</summary><p>Não foi capturada uma tentativa de salvar. Abertura do Hub não equivale a clique no botão.</p></details>';
 const history=Array.isArray(h.history)?h.history:[],last=history[history.length-1]||{};
 const check=(at,label)=>'<div>'+label+': <b>'+(at?escPhase(at):'não executado')+'</b></div>';
 const result=h.outcome==='confirmed'?'confirmado após releitura':h.outcome==='failed'?'falhou sem confirmação':escPhase(h.outcome);
 return '<details open><summary><b>Salvamento do Hub Financeiro</b> — '+result+'</summary>'+
  '<p>Motor de salvamento: '+escPhase(h.build)+' · Etapa final: '+escPhase(h.phase)+
  (h.errorCode?' · Falha: '+escPhase(h.errorCode):'')+'</p>'+
  '<div>Clique real observado: <b>'+(h.clickObserved===true?'sim':'não')+'</b></div>'+
  check(h.clickAt,'Horário do clique')+check(h.rpcAt,'Envio RPC')+
  check(h.ackAt,'ACK aplicado')+check(h.readbackAt,'Revisão relida')+
  check(h.modelAt,'Modelo local atualizado')+
  '<div>Revisão: '+(Number.isSafeInteger(Number(h.revision))?escPhase(h.revision):'não comprovada')+'</div>'+
  '<div>Atualização visível na outra sessão: não testada</div>'+
  (last.stage?'<div>Etapa onde parou: '+escPhase(last.stage)+'</div>':'')+
  '</details>';
}
function pendingEvidence9479(summary){
 if(summary?.auditCompleted===false||summary?.executionFailed===true)return '';
 const needs=Array.isArray(summary?.needsCode)?summary.needsCode:[];
 const wal=summary?.triage?.signal?.indexedDbWal||{};
 const proof=summary?.walProof||{};
 const candidates=Array.isArray(summary?.productionResidual?.after?.items)?summary.productionResidual.after.items:[];
 const fmt=v=>esc(sid(v).slice(0,450));
 const row=(label,detail)=>'<li><b>'+fmt(label)+'</b> — '+fmt(detail||'Sem detalhe capturado')+'</li>';
 const findings=needs.length?'<p><b>Problemas que exigem código/prova ('+needs.length+')</b></p><ul>'+needs.slice(0,20).map(x=>row(x.id||x.action||'pendência',x.detail||x.requires)).join('')+'</ul>':'';
 const walCount=wal.count!==null&&wal.count!==undefined&&Number.isFinite(Number(wal.count))?Number(wal.count):null;
 const walItems=Array.isArray(wal.items)?wal.items:[];
 const proofDetail=proof.mode==='read-only'?' · conferência remota '+(proof.attempted?'executada (somente leitura)':'indisponível')+' · conteúdo igual: '+fmt(proof.matched||0)+' · diferente/ausente: '+fmt((proof.different||0)+(proof.missing||0))+' · não verificados: '+fmt(proof.unverified||0)+' · situação: '+fmt(proof.status||'desconhecida'):'';
 const proofItems=Array.isArray(proof.items)?proof.items:[];
 const walInfo=walCount!==null?'<p><b>WAL IndexedDB ('+walCount+')</b> · prova remota '+(proof.attempted?'tentada':'não executada — '+fmt(walCount)+' operações pendentes')+' · cópias comprovadas removidas: '+fmt(proof.removed||0)+proofDetail+'</p>'+(walItems.length?'<ul>'+walItems.slice(0,20).map(x=>{const p=proofItems.find(y=>sid(y.module)===sid(x.module)&&sid(y.id)===sid(x.id)&&sid(y.opId)===sid(x.opId));return row([x.module,x.id].filter(Boolean).join(' / ')||x.key||'registro',(x.opId?'Operação '+x.opId:'Sem opId informado')+(p?' · verificação '+sid(p.status):''))}).join('')+'</ul>':''):'';
 const unstable=summary?.productionResidual?.opIdUnstable===true?'<p><b>Alerta: opId de Produção mudou entre leituras — limpeza bloqueada por segurança.</b></p>':'';
  const residual=candidates.length?'<p><b>Resíduos de Produção ('+candidates.length+')</b></p><ul>'+candidates.slice(0,20).map(x=>row(x.id||'registro',x.detail||x.classification||x.requires||'Sem classificação')).join('')+'</ul>':'';
 if(!findings&&!walInfo&&!residual&&!unstable)return '';
 return '<details style="margin-top:8px" open><summary><b>Detalhes das pendências e por que não foram corrigidas</b></summary>' +findings+walInfo+unstable+residual+'<p class="sub">Não exclua WAL ou registros sem prova remota. O relatório JSON contém mais informações.</p></details>';
}
function render(summary){const host=document.getElementById('hlgbAuditorResult');if(!host||!summary)return false;let c=document.getElementById(CARD_ID);if(!c){c=document.createElement('div');c.id=CARD_ID;c.className='panel';host.prepend(c)}const d=summary.productionResidual||{},after=d.after||{},cleared=+d.technicalCopiesCleared||0,failed=summary.auditCompleted===false||summary.executionFailed===true; c.setAttribute('data-audit-completed',failed?'false':'true');c.innerHTML='<b>⚡ Auditor v94.48 · prova residual</b><div>'+esc(summary.passes||0)+' rodada(s) · '+esc(summary.stopReason||'')+'</div>'+(failed?'<div role="alert" style="font-weight:700;color:#ae2537;margin:7px 0">⛔ Auditor NÃO concluiu. A quantidade de bugs é desconhecida. Não é um resultado sem erros.</div><div>Motivo: '+esc(summary.failure?.message||state.lastError||'Falha técnica não identificada')+'</div><div>Etapa: '+esc(summary.failure?.phase||'execução')+'</div>':'<div class="sub">Cópias técnicas limpas: '+esc(cleared)+' · Precisa de código: '+esc(summary.needsCode?.length||0)+' · Decisão humana: '+esc(summary.businessBlocked?.length||0)+' · Resíduos atuais: '+esc(after.candidateCount||0)+'</div>')+(summary.knownGaps?.length?'<div class="sub">Cobertura incompleta: '+summary.knownGaps.map(esc).join(' · ')+'</div>':'')+pendingEvidence9479(summary)+hubEvidence9483(summary);return true}
async function run(opts={}){
 if(state.running||!authReady())return false;state.running=true;state.runs++;state.lastAt=nowIso();state.lastError='';stamp();
 try{
  const prep=await prepare(opts.reason||'auditor-run-v9448');if(!prep.ok)throw new Error(prep.error||'Preparação v94.48 incompleta');
  const diag=await window.hlgbProductionResidual9448.reconcileAndInspect(opts.reason||'manual-button');state.lastResidual=clone(diag);
  // A API residual captura erros e devolve {error,before:null,after:null}; isso NÃO é diagnóstico válido.
  if(!diag||diag.error||diag.before?.ready!==true||diag.after?.ready!==true||!Number.isFinite(Number(diag.after.candidateCount)))throw new Error('Diagnóstico residual de Produção incompleto: '+sid(diag?.error||diag?.before?.error||diag?.after?.error||'não foi possível comprovar leitura antes/depois'));
  if(diag.before.safeCopies>0)state.preflightReconciles++;
  const raw=await withResidualCandidateReasons(diag,()=>window.hlgbAuditorAutoCorrect9447.run({...opts,render:false,download:false,reason:(opts.reason||'v9448')+'-residual-proof'}));if(raw===false)throw new Error('Autocorretor v94.47 retornou false');
  // Uma falha da cadeia v94.47 vinha como objeto e era tratada como sucesso de 0 rodadas.
  if(raw?.executionFailed===true||/^Execução interrompida|^Execução não iniciada/i.test(sid(raw?.stopReason)))throw new Error('Etapa v94.47 falhou: '+sid(raw?.unverified?.[0]?.detail||raw?.failure?.message||window.hlgbAuditorAutoCorrect9447?.state?.lastError||raw?.stopReason));
  const baseReport=clone(raw?.report||window.hlgbAuditorAutoCorrect9447.exportReport?.()||{});const out=clone(raw||{});delete out.report;out.version=V;out.runtimeVersion=V;out.productionResidual=clone(diag);out.dependencyPreparation=clone(prep);out.residualProof=true;out.productionOpIdChanges=clone(diag.opIdChanges||[]);out.hubSaveTrace=clone(window.hlgbHubSaveTrace9483?.status?.()||null);
  if((+diag?.technicalCopiesCleared||0)>0&&!(out.needsCode||[]).length){out.stopReason='Convergência rápida: '+diag.technicalCopiesCleared+' cópia(s) técnica(s) antiga(s) reconciliada(s); restam apenas decisões de negócio/histórico.'}
  const report=upgradeReport(baseReport,out,diag,prep);out.report=report;state.lastSummary=clone(out);if(opts.render!==false)render(out);if(opts.download===true)downloadReport(report);return out;
 }catch(e){state.lastError=sid(e?.message||e);const failure={phase:'preparação, diagnóstico residual ou cadeia de reparo',message:state.lastError||'Erro desconhecido'};const out={version:V,runtimeVersion:V,runId:'autocorrect-9448-blocked-'+Date.now(),at:nowIso(),silent:true,nonNavigating:true,passes:0,repairSkipped:true,residualProof:true,auditCompleted:false,executionFailed:true,stopReason:'EXECUÇÃO INTERROMPIDA — não auditado',failure,fixed:null,corrected:[],stillFailing:null,needsCode:null,businessBlocked:null,blocked:[],unverified:[{code:'auditor:interrupted',status:'fail',title:'Auditor não concluiu',detail:failure.message}],rounds:[],knownGaps:['Sincronização entre computadores não é comprovada por pendingSync: 0','Tela pulando requer medição visual em navegador real']};const report={kind:'hlgb_autocorrect_report',version:V,generatedAt:nowIso(),auditCompleted:false,executionFailed:true,run:clone(out),failure};state.lastReport=clone(report);try{localStorage.setItem(REPORT_KEY,JSON.stringify(report))}catch(_){}state.lastSummary=clone(out);if(opts.render!==false)render(out);return out}
 finally{state.running=false}
}
async function activate(reason='post-auth'){if(!authReady())return false;stamp();const p=await prepare(reason);return !!p.ok}
window.addEventListener?.('hlgb:authenticated',()=>setTimeout(()=>activate('authenticated-event'),0));
window.hlgbAuditorAutoCorrect9448={version:V,state,run,prepare,ensureBase,ensureResidual,render,downloadReport,exportReport:()=>clone(state.lastReport),status:()=>({...state,authReady:authReady(),baseReady:baseReady(),residualReady:residualReady()})};
stamp();if(authReady())setTimeout(()=>activate('loaded-after-auth'),0);console.info('[HLGB] v'+V+' Auditor pronto · prova residual de Produção antes da classificação');
})();