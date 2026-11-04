'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync('release-auditor-autocorrect-v9447.js','utf8');
const sample={key:'routePlans|route-1',module:'routePlans',id:'route-1',opId:'op-abc',
 data:{id:'route-1',driver:'Entregas',stops:[{id:'a'},{id:'b'}],updatedAt:'2026-11-04T10:00:00Z'}};
async function scenario(remote,available=true,idbRows=[sample]){
 const transactionModes=[],requests=[],writes=[],events=[];
 const indexedDB={
  open(name){
   assert.equal(name,'hlgb_durable_wal');
   const req={};
   queueMicrotask(()=>{
    req.result={
     objectStoreNames:{contains:x=>x==='entries'},
     transaction(store,mode){
      assert.equal(store,'entries');transactionModes.push(mode);
      return {objectStore(){return {getAll(){const g={};queueMicrotask(()=>{g.result=structuredClone(idbRows);g.onsuccess?.()});return g}}}}
     },
     close(){}
    };
    req.onsuccess?.();
   });
   return req;
  }
 };
 const audit={main:{checks:[],summary:{total:0,pass:0,warn:0,fail:0}},
 operations:{pending:{unique:0,records:0,wal:0},delivery:{status:'pass'},savingUi:{status:'pass'},runtime:{status:'pass'}}};
 const win={__HLGB_AUTH_READY:true,HLGB_AUDITOR_AUTOCORRECT_9446:'94.46',HLGB_RELEASE_VERSION:'94.82',
  hlgbAuditorAutoCorrect9446:{prepare:async()=>({ok:true,ready:true}),run:async()=>{throw new Error('No unrelated repair recipes')}},
  hlgbAuditorAutoCorrect9441:{silentAudit:async()=>audit,repairEvents:()=>[]},
  hlgbProductionReconcile9439:{candidates:async()=>[]},
  hlgbAuditorIntelligence9396:{currentMetrics:()=>({metrics:{pendingUnique:0,scriptDuplicates:0,saveDuplicateResponsibilities:0}})},
  hlgbDiagnosticsCenter:{getIssues:()=>[]},
  addEventListener:()=>{}
 };
 if(available)win.cloudRequest=async(query,opts)=>{
  requests.push({query,method:opts?.method});
  return remote===null?[]:[{module:'routePlans',entity_id:'route-1',data:structuredClone(remote),deleted_at:null,revision:1}];
 };
 const store={};const context={window:win,indexedDB,document:{querySelector:()=>null,getElementById:()=>null},
  localStorage:{getItem:k=>store[k]||null,setItem:(k,v)=>{writes.push(k);store[k]=v}},
  navigator:{userAgent:'test',onLine:true},console,Date,JSON,Promise,Map,Object,Array,Set,String,Number,encodeURIComponent,
  structuredClone,setTimeout:()=>1,clearTimeout:()=>{},queueMicrotask};
 vm.createContext(context);vm.runInContext(source,context);
 const out=await win.hlgbAuditorAutoCorrect9447.run({render:false,download:false});
 return {out,transactionModes,requests,writes};
}
(async()=>{
 const equal=await scenario({...sample.data,updatedAt:'2026-11-04T11:00:00Z'});
 assert.equal(equal.out.walProof.mode,'read-only');
 assert.equal(equal.out.walProof.status,'all-content-matched');
 assert.equal(equal.out.walProof.attempted,true);
 assert.equal(equal.out.walProof.matched,1);
 assert.equal(equal.out.walProof.removed,0,'matching content is not a deletion ACK');
 assert(equal.out.needsCode.some(x=>x.id==='sync:indexeddb-wal'));
 assert(equal.out.cleanTechnical===false);
 assert(equal.transactionModes.every(x=>x==='readonly'));
 assert.equal(equal.requests.length,1);
 assert.equal(equal.requests[0].method,'GET');
 assert.equal(equal.out.walProof.items[0].opId,'op-abc');
 const different=await scenario({...sample.data,driver:'Different driver'});
 assert.equal(different.out.walProof.status,'not-confirmed');
 assert.equal(different.out.walProof.different,1);
 assert.equal(different.out.walProof.removed,0);
 const missing=await scenario(null);
 assert.equal(missing.out.walProof.missing,1);
 assert.equal(missing.out.walProof.status,'not-confirmed');
 const extraRows=Array.from({length:10},(_,i)=>({
  ...sample,key:'routePlans|route-'+i,id:'route-'+i,opId:'op-'+i,
  data:{...sample.data,id:'route-'+i}
 }));
 // Remote returns only route-1, so this run still tests that records beyond the 8-item limit
 // cannot silently be counted as verified.
 const extra=await scenario(sample.data,true,extraRows);
 assert.equal(extra.out.walProof.checked,8);
 assert.equal(extra.out.walProof.unverified>=2,true);
 assert.equal(extra.out.walProof.status,'partially-unverified');
 const disconnected=await scenario(sample.data,false);
 assert.equal(disconnected.out.walProof.status,'cloud-api-unavailable');
 assert.equal(disconnected.out.walProof.attempted,false);
 assert.equal(disconnected.out.walProof.removed,0);
 assert.equal(disconnected.out.walProof.remaining,1);
 console.log('PASS v94.82: WAL read-only remote proof handles matching, conflict, missing and unavailable API without deleting the operation');
})().catch(err=>{console.error(err);process.exitCode=1});