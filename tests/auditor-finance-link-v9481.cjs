'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync('release-auditor-autocorrect-v9447.js','utf8');
const audit={main:{summary:{total:2,pass:0,fail:2,warn:0,result:'Falhou'},checks:[
 {code:'data:finance-projection-orphan',status:'fail',detail:'Finance A references a missing projection',refs:[{module:'finance',id:'A'}]},
 {code:'data:finance-projection-orphan',status:'fail',detail:'Finance B references a deleted projection',refs:[{module:'finance',id:'B'}]}
]},operations:{pending:{unique:0,records:0,wal:0},delivery:{status:'pass'},savingUi:{status:'pass'},runtime:{status:'pass'}}};
let repairCalls=0,saveCalls=0;
const win={__HLGB_AUTH_READY:true,HLGB_AUDITOR_AUTOCORRECT_9446:'94.46',HLGB_RELEASE_VERSION:'94.81',
 hlgbAuditorAutoCorrect9446:{prepare:async()=>({ok:true,ready:true}),run:async()=>{repairCalls++;return {passes:1}}},
 hlgbAuditorAutoCorrect9441:{silentAudit:async()=>audit,repairEvents:()=>[]},
 hlgbProductionReconcile9439:{candidates:async()=>[]},
 hlgbAuditorIntelligence9396:{currentMetrics:()=>({metrics:{pendingUnique:0,scriptDuplicates:0,saveDuplicateResponsibilities:0}})},
 hlgbDiagnosticsCenter:{getIssues:()=>[]},
 hlgbRecordSaveWithRetry:()=>{saveCalls++;},
 addEventListener:()=>{}};
const store={};const ctx={window:win,document:{querySelector:()=>null,getElementById:()=>null},
 localStorage:{getItem:k=>store[k]||null,setItem:(k,v)=>store[k]=v},
 navigator:{userAgent:'test'},console,Date,JSON,Promise,Map,Object,Array,Set,String,Number,
 structuredClone:v=>JSON.parse(JSON.stringify(v)),setTimeout,clearTimeout};
vm.createContext(ctx);vm.runInContext(source,ctx);
(async()=>{
 const out=await win.hlgbAuditorAutoCorrect9447.run({render:false,download:false});
 assert.equal(repairCalls,0,'financial findings alone must not dispatch repair recipes');
 assert.equal(saveCalls,0,'read-only finance classification must never write data');
 assert.equal(out.repairSkipped,true);
 assert.equal(out.businessBlocked.length,2,'all distinct finance findings must be visible');
 assert.equal(out.cleanTechnical,false,'unresolved finance links cannot pass as clean');
 assert.deepEqual(Array.from(out.businessBlocked,x=>x.id),[
  'business:finance-projection-orphan:A','business:finance-projection-orphan:B']);
 for(const x of out.businessBlocked){assert.equal(x.requires,'human-decision');assert.match(x.detail,/Nenhuma alteração financeira automática/)}
 assert.equal(out.report.finalAudit.summary.fail,2);
 assert.equal(out.report.run.businessBlocked.length,2);
 assert.equal(out.needsCode.length,0);
 assert.equal(out.financeLinkEvidence9720.state,'unavailable');
 const queries=[];
 win.cloudRequest=async(path,opts)=>{
  assert.equal(opts.method,'GET');queries.push(path);
  if(path.includes('module=eq.finance&'))return [
   {module:'finance',entity_id:'A',revision:2,deleted_at:null,data:{id:'A',projectionInvoiceId:'P1',status:'Pago',private:'NEVER_EXPORT'}},
   {module:'finance',entity_id:'B',revision:3,deleted_at:null,data:{id:'B',projectionInvoiceId:'P2',status:'Pago'}}];
  return [{module:'projectionInvoices',entity_id:'P1',revision:8,deleted_at:'2026-10-24T11:44:11Z',data:{id:'P1',private:'NEVER_EXPORT'}}];
 };
 const proof=await win.hlgbAuditorAutoCorrect9447.financeLinkEvidence9720(audit);
 assert.equal(queries.length,2);assert.equal(proof.checked,1);assert.equal(proof.unverified,1);assert.equal(proof.canRepair,false);
 assert.equal(proof.items[0].state,'projection-logically-deleted');assert.equal(proof.items[1].state,'projection-not-returned');
 assert(!JSON.stringify(proof).includes('NEVER_EXPORT'));assert.equal(saveCalls,0);
 win.cloudRequest=async()=>[{module:'finance',entity_id:'WRONG',revision:1,deleted_at:null}];
 assert.equal((await win.hlgbAuditorAutoCorrect9447.financeLinkEvidence9720(audit)).state,'read-failed');
 console.log('PASS v94.81: finance/projection orphans are visible, safely blocked and never auto-repaired');
})().catch(err=>{console.error(err);process.exitCode=1});
