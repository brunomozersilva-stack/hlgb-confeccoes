'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {STATUSES,classify,classifyAuditRun,summarize}=require('../hlgb-modules/auditor/triage-evidence-v9608.cjs');
test('observação ausente nunca vira aprovação nem autoriza reparo',()=>{
 const row={diagnostic_type:'nightly_user_rollup',status:'not_observed',severity:'warning',
 payload:{observed:false,errors:0,warnings:0,lastSeen:null,windowHours:24}};
 assert.deepEqual(classify(row),{state:STATUSES.UNKNOWN,reason:'atividade_nao_observada',mayAutofix:false});
 assert.equal(classify({...row,status:'success'}).state,STATUSES.UNKNOWN);
});
test('sucesso só é aceito com evidência explícita',()=>{
 assert.equal(classify({status:'success'}).state,STATUSES.INCOMPLETE);
 assert.equal(classify({status:'success',payload:{observed:true,errors:0}}).state,STATUSES.SUCCESS);
 assert.equal(classify({status:'success',payload:{observed:false,errors:0}}).state,STATUSES.INCOMPLETE);
 assert.equal(classify({status:'success',payload:{observed:true,errors:2}}).state,STATUSES.FAILURE);
});
test('falha relatada requer revisão, não auto-correção',()=>{
 for(const status of ['failure','failed','error']){
  const result=classify({status});
  assert.equal(result.state,STATUSES.FAILURE);
  assert.equal(result.mayAutofix,false);
 }
});
test('diagnósticos antigos sem tipo não são erros falsos nem sucesso',()=>{
 assert.equal(classify({}).state,STATUSES.INCOMPLETE);
 assert.equal(classify(null).state,STATUSES.INCOMPLETE);
 assert.equal(classify([]).state,STATUSES.INCOMPLETE);
});
test('resumo de triagem é determinístico e não modifica entrada',()=>{
 const data=[
 {diagnostic_type:'nightly_user_rollup',status:'not_observed',payload:{observed:false,errors:0}},
 {diagnostic_type:'legacy',status:null,payload:{}},
 {diagnostic_type:'health',status:'success',payload:{observed:true,errors:0}},
 {diagnostic_type:'health',status:'failed',payload:{observed:true,errors:1}}
 ];
 const snapshot=JSON.stringify(data),summary=summarize(data);
 assert.deepEqual(summary,{total:4,counts:{confirmed_success:1,confirmed_failure:1,not_observed:1,incomplete_evidence:1},eligibleForAutomaticRepair:0,requiresHumanReview:3});
 assert.equal(JSON.stringify(data),snapshot);
 assert.throws(()=>summarize({}),TypeError);
});
test('nenhum estado permite alteração automática',()=>{
 for(const row of [{status:'success',payload:{observed:true,errors:0}},{status:'failed'}, {status:'not_observed'},{}])
  assert.equal(classify(row).mayAutofix,false);
});

test('auditoria de 37 aprovações com 5 falhas permanece reprovada',()=>{
 const row={readOnly:true,summary:{pass:37,fail:5,warn:2,total:44,result:'Falhou'},checks:[]};
 assert.equal(classifyAuditRun(row).state,STATUSES.FAILURE);
 assert.equal(classifyAuditRun(row).mayAutofix,false);
});
test('auditoria com avisos não é aprovação integral',()=>{
 const row={readOnly:true,summary:{pass:39,fail:0,warn:1,total:40,result:'Atenção'},checks:[]};
 assert.equal(classifyAuditRun(row).state,STATUSES.INCOMPLETE);
});
test('aprovação completa exige todos os checks e totais coerentes',()=>{
 const checks=[{status:'pass'},{status:'pass'}];
 const good={readOnly:true,summary:{pass:2,fail:0,warn:0,total:2,result:'Aprovado'},checks};
 assert.equal(classifyAuditRun(good).state,STATUSES.SUCCESS);
 assert.equal(classifyAuditRun({...good,checks:[checks[0]]}).state,STATUSES.INCOMPLETE);
 assert.equal(classifyAuditRun({...good,readOnly:false}).state,STATUSES.INCOMPLETE);
 assert.equal(classifyAuditRun({...good,summary:{...good.summary,total:3}}).state,STATUSES.INCOMPLETE);
 assert.equal(classifyAuditRun({...good,summary:{...good.summary,result:'Falhou'}}).state,STATUSES.INCOMPLETE);
});

test('campos vazios ou nulos não contam como prova zero',()=>{
 const checks=[{status:'pass'}];
 const summary={pass:1,fail:null,warn:null,total:1,result:'Aprovado'};
 assert.equal(classifyAuditRun({readOnly:true,summary,checks}).state,STATUSES.INCOMPLETE);
 assert.equal(classifyAuditRun({readOnly:true,summary:{...summary,fail:0,warn:0},checks}).state,STATUSES.SUCCESS);
});
