'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const src=fs.readFileSync('release-payroll-wal-race-v9346.js','utf8'),clone=x=>JSON.parse(JSON.stringify(x));
const key='hubFinanceEntries|payroll-month-fixture',wk='hlgb_durable_wal_v1',ak='hlgb_durable_wal_archive_v1',pk='hlgb_hub_finance_reconcile_proofs_v9696';
const data={id:'payroll-month-fixture',sourceType:'payroll_month',sourceId:'2026-11',value:100,status:'Realizado'};
const original={key,module:'hubFinanceEntries',id:data.id,opId:'shared-op',data,baseData:{...data,value:80},baseUpdatedAt:'2026-11-20T12:00:00Z',deleted:false};
async function scenario(mode){
 let idb=clone(original),reads=0,deleted=0,requests=0;const storage=new Map([[wk,JSON.stringify({entries:{[key]:clone(original)}})]]);
 const local=()=>JSON.parse(storage.get(wk)||'{"entries":{}}').entries[key];
 const editLocal=()=>{const w=JSON.parse(storage.get(wk));w.entries[key].data.value=200;storage.set(wk,JSON.stringify(w))};
 if(mode==='divergent')idb.data.value=200;
 const indexedDB={open(){const req={};queueMicrotask(()=>{req.result={objectStoreNames:{contains:()=>true},close(){},transaction(){const tx={};tx.objectStore=()=>({getAll(){const g={};queueMicrotask(()=>{reads++;if(mode==='read-fail'&&reads===2){g.onerror?.();return}g.result=idb?[clone(idb)]:[];g.onsuccess?.()});return g},get(){const g={};queueMicrotask(()=>{if(mode==='idb-race')idb.data.value=200;if(mode==='local-race')editLocal();g.result=idb?clone(idb):null;g.onsuccess?.()});return g},delete(){deleted++;idb=null}});queueMicrotask(()=>queueMicrotask(()=>tx.oncomplete?.()));return tx}};req.onsuccess?.()});return req}};
 const window={HLGB_RELEASE_VERSION:'94.51',addEventListener(){},hlgbRecordSnapshots:{hubFinanceEntries:new Map([[data.id,{revision:9,data:{...data,value:900}}]])},cloudRequest:async(q,o)=>{assert.equal(o.method,'GET');requests++;if(mode==='after-proof')editLocal();return [{module:'hubFinanceEntries',entity_id:data.id,revision:7,updated_at:'2026-11-25T12:00:00Z',deleted_at:null,data:clone(data)}]}};
 const ctx={window,indexedDB,localStorage:{getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,String(v)),removeItem:k=>storage.delete(k)},document:{addEventListener(){},querySelector:()=>null},setTimeout:()=>1,clearTimeout(){},queueMicrotask,console,structuredClone:clone,Date,Map,Set,Promise,JSON,Math,Number,String,encodeURIComponent};
 vm.createContext(ctx);vm.runInContext(src,ctx);const result=await window.hlgbHubFinanceWal9451.reconcile('test');assert.equal(requests,1);assert.equal(window.hlgbRecordSnapshots.hubFinanceEntries.get(data.id).revision,9,'do not downgrade a newer snapshot');assert(!storage.has(ak),'semantic proof must not create legacy ACK marker');
 if(mode==='ok'){assert.equal(deleted,1);assert.equal(local(),undefined);assert.equal(idb,null);assert.equal(result.results[0].ok,true);assert(storage.has(pk))}
 else if(mode==='local-race'){assert.equal(deleted,1);assert.equal(local().data.value,200);assert.equal(result.results[0].ok,false)}
 else{assert.equal(deleted,0);assert(local());assert(idb);assert.equal(result.results[0].ok,false);assert(!storage.has(pk))}
 console.log('PASS hub finance '+mode)
}
(async()=>{for(const mode of ['ok','divergent','after-proof','idb-race','local-race','read-fail'])await scenario(mode)})().catch(e=>{console.error(e);process.exit(1)});
