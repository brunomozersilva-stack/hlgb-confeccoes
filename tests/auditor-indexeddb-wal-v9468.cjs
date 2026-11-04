const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
const src=fs.readFileSync('release-auditor-autocorrect-v9447.js','utf8');
let entries=[{key:'routePlans|route-a',module:'routePlans',id:'route-a',opId:'op1',data:{id:'route-a',stops:[{name:'Roseli'}]}}],legacyRuns=0,pruneCalls=0,remoteMatches=false;
const indexedDB={open(){
 const req={};queueMicrotask(()=>{
  req.result={
   objectStoreNames:{contains:k=>k==='entries'},
   transaction(){return {objectStore(){return {getAll(){
    const g={};queueMicrotask(()=>{g.result=entries.slice();g.onsuccess?.()});return g;
   }}}}},
   close(){}
  };req.onsuccess?.();
 });return req;
}};
const audit={main:{checks:[]},operations:{pending:{unique:0,records:0,wal:0},delivery:{status:'pass'},savingUi:{status:'pass'},runtime:{status:'pass'}}};
const win={__HLGB_AUTH_READY:true,HLGB_AUDITOR_AUTOCORRECT_9446:'94.46',HLGB_RELEASE_VERSION:'94.67',
 hlgbAuditorAutoCorrect9446:{prepare:async()=>({ok:true,ready:true}),run:async()=>{legacyRuns++;return {passes:1}}},
 hlgbAuditorAutoCorrect9441:{silentAudit:async()=>audit,repairEvents:()=>[]},
 hlgbProductionReconcile9439:{candidates:async()=>[]},
 hlgbAuditorIntelligence9396:{currentMetrics:()=>({metrics:{pendingUnique:0,scriptDuplicates:0,saveDuplicateResponsibilities:0}})},
 hlgbDiagnosticsCenter:{getIssues:()=>[]},
 hlgbWalSingleAuthority9339:{pruneConfirmed:async()=>{pruneCalls++;if(remoteMatches){entries=[];return {removed:1,checked:1,errors:[]}}return {removed:0,checked:1,kept:['routePlans|route-a'],errors:[]}}},
 addEventListener:()=>{}};
const store={};
const ctx={window:win,indexedDB,localStorage:{getItem:k=>store[k]||null,setItem:(k,v)=>{store[k]=v}},console,queueMicrotask,
 document:{querySelector:()=>null,createElement:()=>({}),getElementById:()=>null},
 navigator:{userAgent:'test'},setTimeout,clearTimeout,Date,JSON,Promise,Map,Object,Array,String,Number,
 structuredClone:v=>JSON.parse(JSON.stringify(v))};
vm.createContext(ctx);vm.runInContext(src,ctx);
(async()=>{
 let out=await win.hlgbAuditorAutoCorrect9447.run({render:false,download:false});
 assert.equal(out.repairSkipped,true);
 assert.equal(out.walProof.removed,0);
 assert.equal(out.walProof.remaining,1);
 assert.equal(out.cleanTechnical,false);
 assert.equal(out.needsCode.some(x=>x.id==='sync:indexeddb-wal'),true);
 assert.equal(out.triage.signal.indexedDbWal.count,1);
 assert.equal(legacyRuns,0,'idb-only issue must not trigger unrelated 4 recipes');
 assert.equal(entries.length,1,'unconfirmed WAL must remain');
 remoteMatches=true;
 out=await win.hlgbAuditorAutoCorrect9447.run({render:false,download:false});
 assert.equal(out.walProof.attempted,true);
 assert.equal(out.walProof.removed,1);
 assert.equal(out.walProof.remaining,0);
 assert.equal(out.needsCode.some(x=>x.id==='sync:indexeddb-wal'),false);
 assert.equal(entries.length,0);
 assert.equal(legacyRuns,0);
 console.log('PASS v94.68: IDB-only pending is visible, no unrelated recipes, safe proof prunes only remotely confirmed copy');
})().catch(e=>{console.error(e);process.exitCode=1});
