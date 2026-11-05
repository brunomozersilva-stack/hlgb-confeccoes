'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const code=fs.readFileSync('release-payroll-wal-race-v9346.js','utf8');
const local=new Map();
const localStorage={getItem:k=>local.get(k)||null,setItem:(k,v)=>local.set(k,String(v)),removeItem:k=>local.delete(k)};
const data={id:'payroll-month-2026-09',sourceType:'payroll_month',sourceId:'2026-09',
 value:70984.68,category:'Funcionários',date:'2026-09-04',status:'Realizado',
 description:'Folha de pagamento — setembro',updatedAt:'2026-11-02T15:00:00Z'};
let writes=0,reads=0;
async function baseSave(_module,id,payload){writes++;return {applied:true,revision:13,data:payload}}
const server={module:'hubFinanceEntries',entity_id:data.id,revision:12,
 updated_at:'2026-11-02T17:50:00.000Z',deleted_at:null,data:{...data}};
const window={HLGB_RELEASE_VERSION:'94.92',hlgbRecordSaveWithRetry:baseSave,
 cloudRequest:async()=>{reads++;return [{...server,data:{...server.data}}]},
 hlgbRecordSnapshots:{hubFinanceEntries:new Map([[data.id,{...server,data:{...data}}]])},
 addEventListener(){},__HLGB_AUTH_READY:false};
const ctx={window,console,structuredClone,localStorage,indexedDB:undefined,
 navigator:{onLine:true},document:{querySelector:()=>null,addEventListener(){}},
 setTimeout:()=>1,clearTimeout:()=>{},queueMicrotask,Promise,Date,Map,Set,JSON,Number,String,Math,encodeURIComponent};
vm.createContext(ctx);vm.runInContext(code,ctx);
const api=window.hlgbHubFinanceWal9451;
function markerCount(){
 let fn=window.hlgbRecordSaveWithRetry,seen=new Set(),n=0,depth=0;
 while(typeof fn==='function'&&!seen.has(fn)&&depth++<64){
  seen.add(fn);if(fn.__hlgbPayrollWalRace9346)n++;
  fn=fn.__original||null
 }
 return n
}
(async()=>{
 assert.equal(markerCount(),1,'one payroll wrapper installed initially');
 for(let i=0;i<9;i++){
  const previous=window.hlgbRecordSaveWithRetry;
  const outer=async function(){return previous.apply(this,arguments)};
  outer.__hlgb955Wrapped=true;outer.__original=previous;
  window.hlgbRecordSaveWithRetry=outer;
  api.maintain('test-later-outer-'+i);
 }
 assert.equal(markerCount(),1,'a later outer wrapper must not create another payroll guard');
 assert.equal(api.status().recordInstalls,1,'one installation, not 10');
 assert.equal(api.status().recordChainGuard,true);
 const noChange=await window.hlgbRecordSaveWithRetry('hubFinanceEntries',data.id,{...data,updatedAt:'2099-01-01T00:00:00Z'},false);
 assert.equal(noChange.applied,true);assert.equal(noChange.hlgbNoop,true);
 assert.equal(writes,0,'a read-only proof suppresses unnecessary writes');
 assert.equal(reads,1,'only one preflight query even with 9 outer wrappers');
 const change=await window.hlgbRecordSaveWithRetry('hubFinanceEntries',data.id,{...data,value:70984.72},false);
 assert.equal(change.applied,true);assert.equal(writes,1,'changed business value performs exactly one delegate write');
 assert.equal(reads,2,'changed business value invokes only one proof query');
 await window.hlgbRecordSaveWithRetry('employees','person1',{name:'Test'},false);
 assert.equal(writes,2,'other modules still save exactly once');
 assert.equal(markerCount(),1);
 console.log('PASS v94.93: persistent single payroll save guard, one remote proof and one write per changed business payload');
})().catch(e=>{console.error(e);process.exitCode=1});
