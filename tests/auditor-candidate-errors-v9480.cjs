'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync('release-auditor-autocorrect-v9447.js','utf8');
const audit={main:{checks:[]},operations:{pending:{unique:0,records:0,wal:0},delivery:{status:'pass'},savingUi:{status:'pass'},runtime:{status:'pass'}}};
async function runScenario({rejectCandidates=false,failIDB=false}){
 let recipes=0;
 const win={__HLGB_AUTH_READY:true,HLGB_AUDITOR_AUTOCORRECT_9446:'94.46',HLGB_RELEASE_VERSION:'94.80',
  hlgbAuditorAutoCorrect9446:{prepare:async()=>({ok:true,ready:true}),run:async()=>{recipes++;return {passes:1}}},
  hlgbAuditorAutoCorrect9441:{silentAudit:async()=>audit,repairEvents:()=>[]},
  hlgbProductionReconcile9439:{candidates:async()=>{if(rejectCandidates)throw new Error('403 Supabase SELECT');return []}},
  hlgbAuditorIntelligence9396:{currentMetrics:()=>({metrics:{pendingUnique:0,scriptDuplicates:0,saveDuplicateResponsibilities:0}})},
  hlgbDiagnosticsCenter:{getIssues:()=>[]},addEventListener:()=>{}};
 const store={},ctx={window:win,document:{querySelector:()=>null,getElementById:()=>null},localStorage:{getItem:k=>store[k]||null,setItem:(k,v)=>store[k]=v},
   indexedDB:failIDB?{open(){throw new Error('Blocked by Safari')}}:undefined,
   navigator:{userAgent:'test'},console,Date,JSON,Promise,Map,Object,Array,Set,String,Number,
   structuredClone:v=>JSON.parse(JSON.stringify(v)),setTimeout,clearTimeout};
 vm.createContext(ctx);vm.runInContext(source,ctx);
 const result=await win.hlgbAuditorAutoCorrect9447.run({render:false,download:false});
 return {result,recipes,state:win.hlgbAuditorAutoCorrect9447.state};
}
(async()=>{
 const denied=await runScenario({rejectCandidates:true});
 assert.match(denied.result.stopReason,/Execução interrompida/i);
 assert.match(denied.state.lastError,/403 Supabase SELECT/);
 assert.equal(denied.recipes,0,'failed read must not dispatch repair recipes');
 const blocked=await runScenario({failIDB:true});
 assert.equal(blocked.recipes,0);
 assert.equal(blocked.result.repairSkipped,true);
 assert.equal(blocked.result.cleanTechnical,false);
 assert(blocked.result.needsCode.some(x=>x.id==='sync:indexeddb-unverified'),'blocked IndexedDB must not be treated as zero pending');
 assert.equal(blocked.result.triage.signal.indexedDbWal.status,'error');
 const healthy=await runScenario({});
 assert.equal(healthy.result.stopReason.includes('Execução interrompida'),false);
 assert.equal(healthy.result.needsCode.filter(x=>x.id==='sync:indexeddb-unverified').length,0);
 console.log('PASS v94.80: candidate SELECT errors fail audit, blocked IndexedDB is unverified, healthy path unaffected');
})().catch(err=>{console.error(err);process.exitCode=1});
