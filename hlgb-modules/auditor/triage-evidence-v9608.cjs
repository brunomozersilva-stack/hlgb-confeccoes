'use strict';
/* HLGB comercial v96.08 — triagem de observabilidade SOMENTE LEITURA.
 * Não conecta ao Supabase, não interpreta ausência de monitoramento como perda
 * e não pode iniciar replay, reparos ou exclusões. */
const STATUSES=Object.freeze({
  SUCCESS:'confirmed_success', FAILURE:'confirmed_failure',
  UNKNOWN:'not_observed', INCOMPLETE:'incomplete_evidence'
});
const safeCount=x=>(typeof x==='number'||(typeof x==='string'&&x.trim()!==''))&&Number.isSafeInteger(Number(x))&&Number(x)>=0?Number(x):null;
function classify(row){
  if(!row||typeof row!=='object'||Array.isArray(row))
    return {state:STATUSES.INCOMPLETE,reason:'registro_ausente',mayAutofix:false};
  const diagnosticType=String(row.diagnostic_type||'');
  const rawStatus=String(row.status||'').toLowerCase();
  const payload=row.payload&&typeof row.payload==='object'&&!Array.isArray(row.payload)?row.payload:{};
  const observed=payload.observed===true||payload.observed==='true';
  const nonObserved=payload.observed===false||payload.observed==='false';
  const errors=safeCount(payload.errors),warnings=safeCount(payload.warnings);
  if(rawStatus==='not_observed'||(diagnosticType==='nightly_user_rollup'&&nonObserved))
    return {state:STATUSES.UNKNOWN,reason:'atividade_nao_observada',mayAutofix:false};
  if(['error','failed','failure'].includes(rawStatus))
    return {state:STATUSES.FAILURE,reason:'falha_reportada_sem_causa_confirmada',mayAutofix:false};
  if(['success','ok','passed','completed'].includes(rawStatus)&&observed&&errors===0&&warnings===0)
    return {state:STATUSES.SUCCESS,reason:'evidencia_de_observacao_sem_erro_ou_aviso',mayAutofix:false};
  if(errors!==null&&errors>0&&observed)
    return {state:STATUSES.FAILURE,reason:'erro_observado_requer_investigacao',mayAutofix:false};
  return {state:STATUSES.INCOMPLETE,reason:diagnosticType?'prova_insuficiente':'tipo_ausente',mayAutofix:false};
}
function classifyAuditRun(run){
  if(!run||typeof run!=='object'||Array.isArray(run))
    return {state:STATUSES.INCOMPLETE,reason:'auditoria_ausente',mayAutofix:false};
  const summary=run.summary&&typeof run.summary==='object'?run.summary:{};
  const total=safeCount(summary.total),pass=safeCount(summary.pass),
    fail=safeCount(summary.fail),warn=safeCount(summary.warn);
  if(fail!==null&&fail>0)
    return {state:STATUSES.FAILURE,reason:'auditoria_contém_falhas',mayAutofix:false};
  if([total,pass,fail,warn].some(x=>x===null)||pass+fail+warn!==total)
    return {state:STATUSES.INCOMPLETE,reason:'totais_inconsistentes',mayAutofix:false};
  if(warn>0)
    return {state:STATUSES.INCOMPLETE,reason:'auditoria_com_avisos',mayAutofix:false};
  if(run.readOnly!==true||!Array.isArray(run.checks)||run.checks.length!==total||total===0)
    return {state:STATUSES.INCOMPLETE,reason:'verificações_sem_prova_completa',mayAutofix:false};
  if(run.checks.every(c=>c&&c.status==='pass')&&String(summary.result)==='Aprovado')
    return {state:STATUSES.SUCCESS,reason:'auditoria_integral_aprovada',mayAutofix:false};
  return {state:STATUSES.INCOMPLETE,reason:'resultado_nao_comprovado',mayAutofix:false};
}
function summarize(rows){
  if(!Array.isArray(rows))throw new TypeError('diagnósticos devem ser uma lista');
  const counts=Object.fromEntries(Object.values(STATUSES).map(s=>[s,0]));
  for(const row of rows)counts[classify(row).state]++;
  return {total:rows.length,counts,eligibleForAutomaticRepair:0,requiresHumanReview:rows.length-counts[STATUSES.SUCCESS]};
}
module.exports={STATUSES,classify,classifyAuditRun,summarize};
