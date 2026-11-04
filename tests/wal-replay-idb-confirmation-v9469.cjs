'use strict';
const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
const src=fs.readFileSync('release-wal-confirmed-replay-v9333.js','utf8');
const clone=x=>JSON.parse(JSON.stringify(x));
const key='routePlans|route-1';
function fakeIdb(rows){
 const store=new Map(rows.map(x=>[x.key,clone(x)]));
 const indexedDB={open(){
  const req={};queueMicrotask(()=>{
   const db={objectStoreNames:{contains:n=>n==='entries'},close(){},
    transaction(){
     const tx={oncomplete:null,onerror:null,onabort:null};
     tx.objectStore=()=>({
      getAll(){const g={};queueMicrotask(()=>{g.result=[...store.values()].map(clone);g.onsuccess?.()});return g},
      get(k){const g={};queueMicrotask(()=>{g.result=store.get(k);g.onsuccess?.()});return g},
      put(x){store.set(x.key,clone(x))},delete(k){store.delete(k)}
     });
     queueMicrotask(()=>queueMicrotask(()=>tx.oncomplete?.()));
     return tx;
    }};
   req.result=db;req.onsuccess?.();
  });return req;
 }};
 return {store,indexedDB};
}
async function scenario(saveResponse){
 const ent={key,opId:'route-op',module:'routePlans',id:'route-1',deleted:false,
 data:{id:'route-1',stops:[{name:'Roseli'}]},updatedAt:'2026-11-04T12:00:00Z'};
 const idb=fakeIdb([ent]),storage={};
 const window={addEventListener(){},hlgbRecordSaveWithRetry:async()=>saveResponse};
 const ctx={window,indexedDB:idb.indexedDB,localStorage:{getItem:k=>storage[k]||null,setItem:(k,v)=>storage[k]=v,removeItem:k=>delete storage[k]},
 navigator:{onLine:true},document:{querySelector:()=>null,getElementById:id=>id==='appShell'?{}:id==='loginScreen'?{style:{display:'none'}}:null,readyState:'complete',addEventListener(){}},
 getComputedStyle:e=>({display:e?.style?.display||'block'}),console,structuredClone:clone,
 queueMicrotask,setTimeout:()=>1,clearTimeout:()=>{},setInterval:()=>1,clearInterval:()=>{},Date,Promise,Array,Object,JSON,Number,String};
 vm.createContext(ctx);vm.runInContext(src,ctx);
 const succeeded=await window.hlgbWalConfirmedReplay9333.run('test',true);
 return {succeeded,store:idb.store,result:window.hlgbWalConfirmedReplay9333.state.lastResult};
}
(async()=>{
 const no=await scenario({applied:false,reason:'revision conflict'});
 assert.equal(no.succeeded,false,'IDB-only unconfirmed entry cannot return success');
 assert.equal(no.store.size,1,'unconfirmed WAL is preserved');
 assert.equal(no.result.remaining,1);
 assert.equal(no.result.remainingKeys[0],key);
 const yes=await scenario({applied:true});
 assert.equal(yes.succeeded,true,'confirmed WAL must succeed');
 assert.equal(yes.store.size,0);
 assert.equal(yes.result.remaining,0);
 console.log('PASS WAL replay IDB-only: server rejection preserves pending and returns false; confirmed save clears both stores');
})().catch(e=>{console.error(e);process.exitCode=1});
