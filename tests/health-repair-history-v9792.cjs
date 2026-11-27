'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('release-health-monitor-panel-v9541.js','utf8'),a=source.indexOf('function classifyFailureEvidence978A('),b=source.indexOf('const failureLabels978A=',a);assert.ok(a>=0&&b>a);
const ctx={sid:x=>String(x??''),REPO:'example/repo'};vm.createContext(ctx);vm.runInContext(source.slice(a,b),ctx);
const plain=x=>JSON.parse(JSON.stringify(x)),records=JSON.parse(fs.readFileSync('hlgb-modules/engenharia/ci-regression-cases-v9671.json','utf8')),verified=require('../hlgb-modules/engenharia/ci-evidence-v9671.cjs').review(records);
assert.equal(verified.rejected.length,0);assert.equal(verified.accepted.length,records.length);
assert.deepEqual(plain(ctx.repairHistory978C()),records.map(x=>({id:x.id,workflow:x.workflow,testPath:x.regressionTest,requiredJobs:x.requiredJobs,category:x.category,observed:x.observed,correction:x.correction,beforeRun:x.before.runId,afterRun:x.after.runId,beforeCommit:x.before.commit,afterCommit:x.after.commit})));
for(const x of records){
 const run={id:1,attempt:1,commit:'f'.repeat(40),name:x.workflow},job={id:2,run_id:1,run_attempt:1,head_sha:run.commit,status:'completed',conclusion:'failure',name:x.requiredJobs[0],steps:[{number:5,name:'Run node '+x.regressionTest,conclusion:'failure'}]};
 const coverage=ctx.moduleCoverage978B(job.steps[0].name,'test-step-failed');
 const before=JSON.stringify({run,job}),result=plain(ctx.classifyFailureEvidence978A(run,{total_count:1,jobs:[job]})),hints=result.jobs[0].failedSteps[0].repairHints;
 assert.equal(hints.length,1);assert.equal(hints[0].id,x.id);assert.equal(hints[0].rootCauseConfirmed,false);assert.equal(hints[0].canRepair,false);assert.equal(JSON.stringify({run,job}),before);
 assert.equal(ctx.repairHints978C({...run,name:'other'},job,coverage).length,0);
 assert.equal(ctx.repairHints978C(run,{...job,name:'other'},coverage).length,0);
 assert.equal(ctx.repairHints978C({...run,commit:x.after.commit},job,coverage).length,0);
 assert.equal(ctx.repairHints978C(run,job,ctx.moduleCoverage978B('Install Playwright','setup-step-failed')).length,0);
 assert.equal(ctx.repairHints978C(run,job,ctx.moduleCoverage978B('Run node tests/unknown.cjs','test-step-failed')).length,0);
}
console.log('PASS historical evidence matching, false match prevention, no automatic repair');
