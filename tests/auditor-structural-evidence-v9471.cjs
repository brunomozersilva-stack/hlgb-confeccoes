const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
const src=fs.readFileSync('release-auditor-autocorrect-v9447.js','utf8');
const audit={main:{checks:[]},operations:{pending:{unique:0,records:0,wal:0}}};
let legacyRuns=0;
const metrics={metrics:{scriptDuplicates:1,saveDuplicateResponsibilities:1},duplicateScripts:[{file:'release-script.js',dom:1,resource:2}],saveChain:{depth:18,duplicateResponsibilities:[{id:'payroll-save',count:2,final:1,legacy:1}]}};
const window={__HLGB_AUTH_READY:true,HLGB_AUDITOR_AUTOCORRECT_9446:'94.46',
 hlgbAuditorAutoCorrect9446:{prepare:async()=>({ok:true,ready:true}),run:async()=>{legacyRuns++;return {passes:1}}},
 hlgbAuditorAutoCorrect9441:{silentAudit:async()=>audit,repairEvents:()=>[]},
 hlgbProductionReconcile9439:{candidates:async()=>[]},
 hlgbAuditorIntelligence9396:{currentMetrics:()=>metrics},
 hlgbDiagnosticsCenter:{getIssues:()=>[]},
 addEventListener:()=>{}};
const ctx={window,console,document:{querySelector:()=>null},navigator:{userAgent:'test'},
 localStorage:{setItem:()=>{}},Date,JSON,Array,Map,Object,Number,String,setTimeout,clearTimeout,
 structuredClone:x=>JSON.parse(JSON.stringify(x))};
vm.createContext(ctx);vm.runInContext(src,ctx);
(async()=>{
 const result=await window.hlgbAuditorAutoCorrect9447.run({render:false,download:false});
 assert.equal(result.passes,0);
 assert.equal(legacyRuns,0,'structural only must not invoke unrelated recipes');
 assert.equal(result.needsCode.length,2);
 assert(result.needsCode.find(x=>x.id==='structure:duplicate-scripts').detail.includes('release-script.js'));
 assert(result.needsCode.find(x=>x.id==='structure:save-responsibilities').detail.includes('payroll-save (2 camadas)'));
 assert.equal(result.report.fastConvergence.structureEvidence.saveDepth,18);
 assert.equal(result.report.fastConvergence.structureEvidence.duplicateScripts[0].resource,2);
 assert.equal(result.report.fastConvergence.structureEvidence.saveDuplicateResponsibilities[0].id,'payroll-save');
 console.log('PASS Auditor v94.71: report shows exact structural causes without touching business records');
})().catch(e=>{console.error(e);process.exitCode=1});
