'use strict';
const evidence=require('./ci-evidence-v9671.cjs');
const unique=a=>[...new Set(a)].sort();
const epoch=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(s)&&Number.isFinite(Date.parse(s))&&new Date(s).toISOString().replace('.000Z','Z')===s?Date.parse(s):null;
function timing(caseRow,capture){
 if(!capture||capture.id!==caseRow.id)return null;
 for(const k of ['before','after']){
  const a=caseRow[k],b=capture[k];if(!b||a.runId!==b.runId||a.commit!==b.commit||a.workflow!==b.workflow||a.status!==b.status||a.conclusion!==b.conclusion||b.attempt!==1||epoch(b.createdAt)===null||epoch(b.updatedAt)===null||epoch(b.createdAt)>epoch(b.updatedAt))return null;
 }
 const before=epoch(capture.before.updatedAt),start=epoch(capture.after.createdAt),end=epoch(capture.after.updatedAt);
 if(start<before)return null;
 return {caseId:caseRow.id,category:caseRow.category,failedRunUpdatedAt:capture.before.updatedAt,successfulRunUpdatedAt:capture.after.updatedAt,elapsedBetweenRunUpdatesSeconds:(end-before)/1000,successfulRunCreatedToUpdatedSeconds:(end-start)/1000,sourceRunIds:[capture.before.runId,capture.after.runId],measure:'github-run-update-proxy',actualHandsOnRepairTimeKnown:false};
}
function analyze({cases,captures,matrix,impact,priority}){
 if(!Array.isArray(cases)||!Array.isArray(captures)||!Array.isArray(impact?.areas)||!Array.isArray(priority?.priority)||!matrix||typeof matrix!=='object')throw Error('invalid-insights-input');
 const counts=new Map();for(const x of cases)counts.set(x?.id,(counts.get(x?.id)||0)+1);
 const accepted=[],rejected=[],related=[],metrics=[],missingTiming=[];
 for(const x of cases){
  const e=evidence.check(x);if(e.state!=='paired-evidence-candidate'||counts.get(x?.id)!==1){rejected.push({id:x?.id||null,reason:counts.get(x?.id)>1?'duplicate-case':e.reason});continue}
  accepted.push(x.id);
  const modules=unique(Object.entries(matrix).filter(([,paths])=>Array.isArray(paths)&&paths.includes(x.regressionTest)).map(([a])=>a)),overlap=modules.filter(a=>impact.areas.includes(a)),exact=priority.priority.includes(x.regressionTest);
  if(exact||overlap.length)related.push({id:x.id,category:x.category,test:x.regressionTest,modules,overlap,reason:exact?'exact-priority-test':'shared-module-coverage',observed:x.observed,historicalCorrection:x.correction,beforeRunId:x.before.runId,afterRunId:x.after.runId,rootCauseConfirmed:false});
  const matches=captures.filter(t=>t?.id===x.id),m=matches.length===1?timing(x,matches[0]):null;if(m)metrics.push(m);else missingTiming.push(x.id);
 }
 related.sort((a,b)=>Number(b.reason==='exact-priority-test')-Number(a.reason==='exact-priority-test')||a.id.localeCompare(b.id));
 return {mode:'historical-evidence-advisory',accepted,rejected,related,metrics,missingTiming,fullSuiteRequired:true,canAutoRepair:false,canAutoMerge:false,limitations:['historical similarity is not a forecast or causal proof','run updated_at is a proxy, not hands-on repair time','sample is not representative of business bugs or pre/post modularization speed']};
}
module.exports={analyze};
