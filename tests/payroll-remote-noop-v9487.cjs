'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const src=fs.readFileSync('release-payroll-wal-race-v9346.js','utf8');
const base={id:'payroll-month-2026-09',sourceType:'payroll_month',sourceId:'2026-09',
 date:'2026-09-04',status:'Realizado',category:'Funcionários',value:70984.68,
 description:'Folha de pagamento — setembro',updatedAt:'2026-11-04T12:00:00Z'};
const server={module:'hubFinanceEntries',entity_id:'payroll-month-2026-09',
 data:{...base},revision:514,updated_at:'2026-11-05T09:19:51.927Z',
 deleted_at:null,updated_by:null};
function make(){
 let physical=0,reads=0,forceFailure=false,actual=null;
 const mem=new Map();
 async function oldInner(){physical++;return {applied:true,revision:515}}
 oldInner.__hlgbPayrollWalRace9346=true;
 async function outer955(){return oldInner.apply(this,arguments)}
 outer955.__hlgb955Wrapped=true;outer955.__original=oldInner;
 const window={HLGB_RELEASE_VERSION:'94.51',hlgbRecordSnapshots:{hubFinanceEntries:new Map()},
  hlgbRecordSaveWithRetry:outer955,
  cloudRequest:async()=>{reads++;if(forceFailure)throw Error('offline');return actual||[server]},
  addEventListener(){}};
 const document={querySelector:()=>null,addEventListener(){}};
 const ctx={window,document,console,structuredClone,localStorage:{
  getItem:k=>mem.get(k)||null,setItem:(k,v)=>mem.set(k,String(v)),removeItem:k=>mem.delete(k)},
 indexedDB:undefined, navigator:{onLine:true},setTimeout:()=>1,clearTimeout:()=>{},
 queueMicrotask,Promise,Date,Map,Set,JSON,Object,Array,Math,Number,String,encodeURIComponent};
 vm.createContext(ctx);vm.runInContext(src,ctx);
 return {window,counts:()=>({physical,reads}),changeServer:v=>{actual=v},fail:v=>{forceFailure=v}};
}
(async()=>{
 const x=make(),submit=(data,m='hubFinanceEntries',id=base.id)=>
  x.window.hlgbRecordSaveWithRetry(m,id,data,false);
 let a=await submit({...base,updatedAt:'2026-11-05T09:19:51.100Z'});
 assert.equal(a.hlgbNoop,true,'stale local snapshot may still be proven by live server data');
 assert.equal(a.remoteVerified,true);
 assert.equal(a.hlgbReadOnlyProof,true);
 assert.equal(a.revision,514);
 assert.equal(x.counts().physical,0,'no RPC for updatedAt-only payroll change');
 assert.equal(x.counts().reads,1);
 assert.equal(x.window.hlgbHubFinanceWal9451.status().remoteNoops,1);
 a=await submit({...base,value:70984.69});
 assert.equal(x.counts().physical,1,'real financial value change must delegate to underlying save');
 assert.equal(a.applied,true);
 a=await submit({...base,description:'changed actual note'});
 assert.equal(x.counts().physical,2,'real payroll description change must not be ignored');
 a=await submit({id:'order1',value:22},'finance','order1');
 assert.equal(x.counts().physical,3,'other modules pass without remote proof');
 x.fail(true);
 await assert.rejects(()=>submit({...base,updatedAt:'2026-11-05T10:00:00Z'}),/Não foi possível confirmar a folha/);
 assert.equal(x.counts().physical,3,'failed remote read must neither fabricate ACK nor call underlying save');
 assert.equal(x.window.hlgbHubFinanceWal9451.status().remoteProofFailures,1);
 console.log('PASS v94.87: verified payroll read-only no-op; business differences/other modules/offline delegate exactly once');
})().catch(e=>{console.error(e);process.exitCode=1});
