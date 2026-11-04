const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
const src=fs.readFileSync('release-auditor-autocorrect-v9447.js','utf8');
async function auditCase(operations){
 let legacy=0;
 const audit={main:{checks:[],summary:{pass:30,warn:0,fail:0}},operations};
 const win={__HLGB_AUTH_READY:true,HLGB_RELEASE_VERSION:'94.73',HLGB_AUDITOR_AUTOCORRECT_9446:'94.46',
  hlgbAuditorAutoCorrect9446:{prepare:async()=>({ok:true,ready:true}),run:async()=>{legacy++;return {passes:1}}},
  hlgbAuditorAutoCorrect9441:{silentAudit:async()=>audit,repairEvents:()=>[]},
  hlgbAuditorIntelligence9396:{currentMetrics:()=>({metrics:{pendingUnique:0,scriptDuplicates:0,saveDuplicateResponsibilities:0}})},
  hlgbProductionReconcile9439:{candidates:async()=>[]},hlgbDiagnosticsCenter:{getIssues:()=>[]},
  addEventListener:()=>{}};
 const storage={};const ctx={window:win,document:{querySelector:()=>null,getElementById:()=>null},
  localStorage:{getItem:k=>storage[k]||null,setItem:(k,v)=>storage[k]=v},
  navigator:{userAgent:'test'},console,setTimeout,clearTimeout,Date,JSON,Promise,Blob:class{},URL:{createObjectURL:()=>'',revokeObjectURL:()=>{}},
  structuredClone:v=>JSON.parse(JSON.stringify(v)),Object,Array,Map,Set,String,Number};
 vm.createContext(ctx);vm.runInContext(src,ctx);
 const out=await win.hlgbAuditorAutoCorrect9447.run({reason:'coverage-test',render:false,download:false});
 assert.equal(legacy,0);
 assert.equal(out.repairSkipped,true);
 return out;
}
(async()=>{
 const missing=await auditCase({pending:{unique:0,records:0,wal:0}});
 assert.equal(missing.cleanTechnical,false,'missing checks are NOT equivalent to passing');
 assert.deepEqual(Array.from(missing.operationalCoverage.missing),['delivery','savingUi','runtime']);
 assert(missing.knownGaps.some(g=>g.includes('A→B/B→A')));
 assert.equal(missing.ui.stable,null,'no UI measurement must not state stable');
 assert.equal(missing.report.operationalCoverage.verifiedAll,false);
 const measured=await auditCase({pending:{unique:0,records:0,wal:0},delivery:{status:'pass'},savingUi:{status:'pass'},runtime:{status:'pass'}});
 assert.equal(measured.operationalCoverage.verifiedAll,true);
 assert.equal(measured.cleanTechnical,true,'measured clean scope can be marked technically clean');
 assert(measured.knownGaps.some(g=>g.includes('Estabilidade visual')),'other unproven scopes still disclosed');
 console.log('PASS v94.74: untested operational checks are not green; measured checks explicit; real A/B and visual gaps visible');
})().catch(e=>{console.error(e);process.exitCode=1});
