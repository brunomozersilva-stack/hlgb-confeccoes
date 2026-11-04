'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync('release-auditor-autocorrect-v9447.js','utf8');
const nodes=Array.from({length:5},(_,i)=>({name:i===0?'wrapped':'legacy-wrapped',depth:i+2,markers:['__hlgbPayrollWalRace9346']}));
let repairs=0;
const window={__HLGB_AUTH_READY:true,HLGB_AUDITOR_AUTOCORRECT_9446:'94.46',
 hlgbAuditorAutoCorrect9446:{prepare:async()=>({ok:true,ready:true}),run:async()=>{repairs++;return {passes:1}}},
 hlgbAuditorAutoCorrect9441:{silentAudit:async()=>({main:{checks:[]},operations:{pending:{unique:0,records:0,wal:0}}}),repairEvents:()=>[]},
 hlgbProductionReconcile9439:{candidates:async()=>[]},
 hlgbAuditorIntelligence9396:{currentMetrics:()=>({metrics:{saveDuplicateResponsibilities:1,scriptDuplicates:0,pendingUnique:0},
 saveChain:{depth:18,cycle:false,duplicateResponsibilities:[{id:'payroll-save',count:5,final:5,legacy:0}],
 responsibilities:{payrollFinal:{count:5,nodes}}}})},
 hlgbDiagnosticsCenter:{getIssues:()=>[]},addEventListener:()=>{}};
const ctx={window,document:{querySelector:()=>null,getElementById:()=>null},localStorage:{getItem:()=>null,setItem:()=>{}},
 navigator:{userAgent:'test'},console,Date,JSON,Promise,Map,Set,Object,Array,String,Number,structuredClone,
 setTimeout:()=>1,clearTimeout:()=>{}};
vm.createContext(ctx);vm.runInContext(source,ctx);
(async()=>{
 const out=await window.hlgbAuditorAutoCorrect9447.run({render:false,download:false});
 assert.equal(repairs,0,'wrapper evidence alone cannot trigger data repair');
 const ev=out.report.fastConvergence.structureEvidence;
 assert.equal(ev.payrollMarkedNodes.length,5);
 assert.equal(ev.saveDepth,18);
 assert.equal(ev.saveCycle,false);
 assert.equal(ev.payrollMarkedNodes[0].name,'wrapped');
 assert.equal(out.needsCode.length,1);
 assert.match(out.needsCode[0].detail,/Camadas marcadas não comprovam múltiplas gravações/);
 assert.equal(out.cleanTechnical,false,'without real writes there is no pass');
 console.log('PASS v94.82: five payroll guard markers are traced, not assumed to be five data writes');
})().catch(e=>{console.error(e);process.exitCode=1});