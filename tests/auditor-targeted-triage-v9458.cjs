const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
const script=fs.readFileSync('release-auditor-autocorrect-v9447.js','utf8');
const old=new Date(Date.now()-3600000).toISOString();
const issues=Array.from({length:125},(_,i)=>({id:'issue-'+i,status:'Aberto',title:'Falha ao salvar production',description:'Problema histórico',lastSeenAt:old}));
const report={main:{checks:[{code:'issues:open',status:'warn',title:'Erros abertos na Central',detail:'125 aberto(s)'}]},operations:{pending:{unique:0,records:0,wal:0},delivery:{status:'pass'},savingUi:{status:'pass'},runtime:{status:'pass'}}};
let legacy=0,candidates=0;
const win={__HLGB_AUTH_READY:true,HLGB_RELEASE_VERSION:'94.47',HLGB_AUDITOR_AUTOCORRECT_9446:'94.46',
 hlgbAuditorAutoCorrect9446:{prepare:async()=>({ok:true,ready:true}),run:async()=>{legacy++;return {passes:1}}},
 hlgbAuditorAutoCorrect9441:{silentAudit:async()=>report,repairEvents:()=>[]},
 hlgbAuditorIntelligence9396:{currentMetrics:()=>({metrics:{pendingUnique:0,pendingBusiness:0,pendingTechnicalRecent:0,pendingTechnicalHistorical:0,scriptDuplicates:0,saveDuplicateResponsibilities:1}})},
 hlgbDiagnosticsCenter:{getIssues:()=>issues},
 hlgbProductionReconcile9439:{candidates:async()=>{candidates++;return []}},
 addEventListener:()=>{}};
const store={};const ctx={window:win,localStorage:{getItem:k=>store[k]??null,setItem:(k,v)=>{store[k]=v}},navigator:{userAgent:'test'},console,setTimeout,clearTimeout,Date,JSON,Blob:class{},URL:{createObjectURL:()=>'',revokeObjectURL:()=>{}},structuredClone:v=>JSON.parse(JSON.stringify(v))};
vm.createContext(ctx);vm.runInContext(script,ctx);
(async()=>{
 const out=await win.hlgbAuditorAutoCorrect9447.run({reason:'structural-only',render:false,download:false});
 assert.equal(out.passes,0);assert.equal(out.repairSkipped,true);
 assert.equal(legacy,0,'structural-only signal must NOT execute unrelated repair recipes');
 assert.equal(out.fixed,0);assert.equal(out.cleanTechnical,false);
 assert(out.needsCode.some(x=>x.id==='structure:save-responsibilities'));
 assert.equal(out.historicalBacklog.count,125);
 assert.equal(out.triage.signal.saveDuplicateResponsibilities,1);
 assert.equal(candidates,1);
 assert.equal(out.businessBlocked.length,0);
 console.log('PASS Auditor v94.58: structural-only signal needs code; zero irrelevant recipes; 125 historical preserved');
})().catch(e=>{console.error(e);process.exitCode=1});
