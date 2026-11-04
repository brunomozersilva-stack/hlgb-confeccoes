/* HLGB v94.50 — diagnóstico de resíduos de Produção pela prova atual.
   Classifica operações lógicas (não cópias físicas) como satisfeitas no servidor,
   diferença de negócio ou prova incompleta antes de decidir se precisa reconciliar. */
(function(){
'use strict';
const V='94.84',BASE_PATCH='94.42-safe-proof';
if(window.HLGB_PRODUCTION_RESIDUAL_9448===V)return;
window.HLGB_PRODUCTION_RESIDUAL_9448=V;
const state={version:V,runs:0,inspections:0,reconciles:0,lastAt:'',lastError:'',lastResult:null};
const sid=v=>String(v??'');
const clone=v=>{try{return structuredClone(v)}catch(e){try{return JSON.parse(JSON.stringify(v))}catch(_){return v}}};
function api(){return window.hlgbProductionReconcile9439}
function ready(){const a=api();return !!a&&a.patch===BASE_PATCH&&typeof a.candidates==='function'&&typeof a.reconcile==='function'&&typeof a.staleOperationSatisfied==='function'}
async function timed(p,ms,label){let t;try{return await Promise.race([Promise.resolve(p),new Promise((_,rej)=>{t=setTimeout(()=>rej(new Error(label)),ms)})])}finally{clearTimeout(t)}}
async function cloudRow(id){if(typeof window.cloudRequest!=='function')throw new Error('cloudRequest indisponível');const q='hlgb_records?select=module,entity_id,data,deleted_at,revision,updated_at,updated_by&module=eq.production&entity_id=eq.'+encodeURIComponent(sid(id))+'&limit=1';const rows=await timed(window.cloudRequest(q,{method:'GET'}),12000,'Timeout confirmando Produção');return Array.isArray(rows)&&rows.length?rows[0]:null}
function copies(c){const out=[];for(const op of c?.normalized||[])out.push({source:'normalized',op});for(const op of c?.walLocal||[])out.push({source:'wal-local',op});for(const op of c?.walIdb||[])out.push({source:'wal-idb',op});return out}
function logicalProofRows(rows){
 const map=new Map();let anon=0;
 for(const row of rows){const opId=sid(row?.opId),key=opId?('op:'+opId):('anon:'+(++anon));if(!map.has(key)){map.set(key,{...row,sources:[row.source],physicalCopies:1});continue}const cur=map.get(key);cur.physicalCopies++;if(!cur.sources.includes(row.source))cur.sources.push(row.source);if(cur.ok!==true&&row.ok===true){cur.ok=true;cur.reason=row.reason;cur.diff=row.diff||[]}else if(cur.reason==='business-difference'&&row.reason!=='business-difference'&&row.ok!==true){cur.reason=row.reason}if((!cur.diff||!cur.diff.length)&&row.diff?.length)cur.diff=row.diff}
 return [...map.values()];
}
function summarizeProofs(rows){const logical=logicalProofRows(rows),safe=logical.filter(x=>x.ok===true),business=logical.filter(x=>x.ok!==true&&x.reason==='business-difference'),incomplete=logical.filter(x=>x.ok!==true&&x.reason!=='business-difference');let classification='empty',requires='none',detail='Sem cópias pendentes';if(safe.length){classification=(business.length||incomplete.length)?'mixed-residual':'technical-stale-copy';requires='reconcile';detail=business.length||incomplete.length?'Conteúdo de uma operação coincide com o servidor, mas há outras cópias que exigem revisão.':'Conteúdo de uma cópia coincide com o servidor; ainda é necessário provar a identidade estável da operação antes de removê-la.'}else if(business.length&&!incomplete.length){classification='business-blocked';requires='human-decision';detail='business-difference'}else if(incomplete.length){classification='needs-code';requires='code';detail='Prova remota incompleta: '+[...new Set(incomplete.map(x=>x.reason||'sem-prova'))].join(', ')}return {classification,requires,detail,safeCopies:safe.length,businessCopies:business.length,incompleteCopies:incomplete.length,logicalCopies:logical.length,physicalCopies:rows.length,duplicateCopies:Math.max(0,rows.length-logical.length),logicalProofs:logical}}
async function inspectCandidate(c){const id=sid(c?.id),base=api();try{const server=await cloudRow(id),rows=copies(c).map(({source,op})=>{const p=base.staleOperationSatisfied(server,op?.data,op?.baseData,op?.baseUpdatedAt,id,op?.deleted===true)||{ok:false,reason:'sem-prova'};return {source,opId:sid(op?.opId||op?.operationId),ok:p.ok===true,reason:sid(p.reason||'sem-prova'),diff:clone(p.diff||[])}}),s=summarizeProofs(rows);return {id,...s,serverRevision:+server?.revision||0,serverUpdatedAt:sid(server?.updated_at),proofs:rows}}catch(e){return {id,classification:'needs-code',requires:'code',detail:'Prova remota incompleta: '+sid(e?.message||e),safeCopies:0,businessCopies:0,incompleteCopies:1,logicalCopies:0,physicalCopies:0,duplicateCopies:0,serverRevision:0,serverUpdatedAt:'',proofs:[],logicalProofs:[],error:sid(e?.message||e)}}}
async function inspect(reason='manual'){if(!ready())return {version:V,ready:false,reason,error:'Reconciliador seguro de Produção indisponível',items:[],safeCopies:0,businessCopies:0,incompleteCopies:0};state.inspections++;state.lastAt=new Date().toISOString();const cs=await api().candidates(),items=[];for(const c of Array.isArray(cs)?cs:[])items.push(await inspectCandidate(c));return {version:V,ready:true,reason,at:new Date().toISOString(),items,safeCopies:items.reduce((n,x)=>n+x.safeCopies,0),businessCopies:items.reduce((n,x)=>n+x.businessCopies,0),incompleteCopies:items.reduce((n,x)=>n+x.incompleteCopies,0),logicalCopies:items.reduce((n,x)=>n+x.logicalCopies,0),physicalCopies:items.reduce((n,x)=>n+x.physicalCopies,0),duplicateCopies:items.reduce((n,x)=>n+x.duplicateCopies,0),candidateCount:items.length}}
/* Um ID que muda durante a inspeção pode ser replay/scanDirty, não confirmação.
   Nunca usar igualdade de payload como autorização para remover outro opId. */
function opIdsByRecord(inspection){
 const out=new Map();
 for(const item of inspection?.items||[]){
  const ids=(item?.proofs||[]).filter(p=>p.source==='wal-idb').map(p=>sid(p.opId)).filter(Boolean).sort();
  out.set(sid(item?.id),ids);
 }
 return out;
}
function compareOpIdentities(before,after){
 const old=opIdsByRecord(before),next=opIdsByRecord(after),changes=[];
 for(const [id,ids] of old){
  const current=next.get(id);
  // Desaparecimento completo após baixa confirmada não é troca de identidade.
  if(!current?.length||!ids.length)continue;
  if(JSON.stringify(ids)!==JSON.stringify(current))
   changes.push({id,beforeOpIds:ids,afterOpIds:current,reason:'opid-changed-during-proof'});
 }
 return changes;
}
function markUnstable(report,changes){
 if(!changes.length)return report;
 report.opIdUnstable=true;report.opIdChanges=clone(changes);
 const affected=new Set(changes.map(x=>sid(x.id)));
 for(const item of report.items||[]){
  if(!affected.has(sid(item.id)))continue;
  item.classification='needs-code';item.requires='code';
  item.detail='A identidade da operação WAL mudou durante a auditoria. Igualdade de conteúdo não autoriza remoção; nenhuma cópia foi dada como corrigida.';
  item.opIdUnstable=true;
 }
 return report;
}
async function reconcileAndInspect(reason='auditor'){
 state.runs++;state.lastError='';
 try{
  const before=await inspect(reason+'-before');
  let reconcileResult=null,preflight=null,after=null,opIdChanges=[],skippedReason='';
  if(before.safeCopies>0){
   preflight=await inspect(reason+'-opid-preflight');
   const changedBefore=compareOpIdentities(before,preflight);
   if(changedBefore.length){
    skippedReason='opid-unstable-before-reconcile';
    opIdChanges=changedBefore;after=preflight;
    reconcileResult={skipped:true,reason:skippedReason,results:[]};
   }else{
    state.reconciles++;
    reconcileResult=await api().reconcile('auditor-v9484:'+reason);
    after=await inspect(reason+'-after');
    opIdChanges=compareOpIdentities(preflight,after);
    if(opIdChanges.length)skippedReason='opid-changed-during-reconcile';
   }
  }else after=await inspect(reason+'-after');
  if(opIdChanges.length)markUnstable(after,opIdChanges);
  // Não declarar limpeza de cópias quando a operação inspecionada trocou de identidade.
  const cleared=opIdChanges.length?0:Math.max(0,(+before.physicalCopies||0)-(+after.physicalCopies||0));
  const out={version:V,at:new Date().toISOString(),reason,before,after,reconcileResult:clone(reconcileResult),
    preflightOpIds:preflight?Array.from(opIdsByRecord(preflight),([id,opIds])=>({id,opIds})):[],
    opIdUnstable:opIdChanges.length>0,opIdChanges:clone(opIdChanges),skippedReason,
    technicalCopiesCleared:cleared,candidateRecordsBefore:+before.candidateCount||0,
    candidateRecordsAfter:+after.candidateCount||0};
  state.lastResult=clone(out);return out
 }catch(e){
  state.lastError=sid(e?.message||e);
  const out={version:V,at:new Date().toISOString(),reason,error:state.lastError,before:null,after:null,
   reconcileResult:null,technicalCopiesCleared:0,opIdUnstable:false,opIdChanges:[]};
  state.lastResult=clone(out);return out
 }
}

window.hlgbProductionResidual9448={version:V,state,ready,inspect,inspectCandidate,reconcileAndInspect,_test:{logicalProofRows,summarizeProofs},status:()=>({...state,ready:ready()})};
console.info('[HLGB] v'+V+' diagnóstico residual de Produção ativo');
})();
