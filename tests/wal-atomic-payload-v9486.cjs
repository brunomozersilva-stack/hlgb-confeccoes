'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const clone=v=>JSON.parse(JSON.stringify(v));
const route={key:'routePlans|route-1',module:'routePlans',id:'route-1',opId:'original-route-op',deleted:false,
 data:{id:'route-1',stops:['A','B'],updatedAt:'2026-11-03T12:00:00Z'}};
const production={...route,key:'production|prod-1',module:'production',id:'prod-1',opId:'production-op',
 data:{id:'prod-1',planned:8,updatedAt:'2026-11-03T12:00:00Z'}};
function fakeIdb(seed,mutateBeforeDelete=false){
 const store=new Map([[seed.key,clone(seed)]]);
 let didMutate=false,deletes=0;
 const indexedDB={open(){
  const req={};
  queueMicrotask(()=>{
   req.result={objectStoreNames:{contains:n=>n==='entries'},close(){},transaction(_store,mode){
    const tx={oncomplete:null,onerror:null,onabort:null};
    tx.objectStore=()=>({
     getAll(){const g={};queueMicrotask(()=>{g.result=[...store.values()].map(clone);g.onsuccess?.()});return g},
     get(key){const g={};queueMicrotask(()=>{
      if(mode==='readwrite'&&mutateBeforeDelete&&!didMutate){
       didMutate=true;const cur=clone(store.get(key));
       cur.data={...cur.data,planned:99,stops:['C']};
       store.set(key,cur);
      }
      g.result=store.has(key)?clone(store.get(key)):undefined;g.onsuccess?.();
     });return g},
     put(value){store.set(value.key,clone(value))},
     delete(key){deletes++;store.delete(key)}
    });
    queueMicrotask(()=>queueMicrotask(()=>tx.oncomplete?.()));
    return tx
   }};
   req.onsuccess?.()
  });return req
 }};
 return {indexedDB,store,get deletes(){return deletes}};
}
function boot(file,entry,cloudData,opts={}){
 const idb=fakeIdb(entry,opts.race===true);
 const storage=new Map(),calls=[];
 const window={HLGB_RELEASE_VERSION:'94.85',addEventListener(){},
  hlgbRecordSaveWithRetry:async(m,id,data,deleted)=>{calls.push({m,id,data:clone(data),deleted});return {applied:true,revision:2}},
  hlgb955FlushSilent:async()=>true,
  hlgbWalConfirmedReplay9333:{version:'94.85',state:{busy:false},run:async()=>true},
  cloudRequest:async(q)=>{
   if(q.includes('module=eq.')&&q.includes('entity_id=eq.'))return [{module:entry.module,entity_id:entry.id,data:clone(cloudData),revision:1,deleted_at:null,updated_at:'2026-11-03T19:00:00Z'}];
   return []
  }
 };
 const ctx={window,indexedDB:idb.indexedDB,localStorage:{getItem:k=>storage.get(k)||null,
  setItem:(k,v)=>storage.set(k,String(v)),removeItem:k=>storage.delete(k)},
 navigator:{onLine:true},document:{getElementById:id=>id==='appShell'?{}:null,querySelector:()=>null,readyState:'complete',addEventListener(){},activeElement:null},
 getComputedStyle:()=>({display:'block'}),console,structuredClone:clone,queueMicrotask,encodeURIComponent,
 setTimeout:()=>1,clearTimeout:()=>{},setInterval:()=>1,clearInterval:()=>{},Date,Promise,Map,Set,JSON,Object,Array,Math,Number,String,URL};
 vm.createContext(ctx);vm.runInContext(fs.readFileSync(file,'utf8'),ctx);
 return {window,idb,storage,calls};
}
(async()=>{
 const protectedRoute=boot('release-wal-single-authority-v9339.js',route,route.data);
 const out=await protectedRoute.window.hlgbWalSingleAuthority9339.pruneConfirmed(true,8);
 assert.equal(out.removed,0,'equal route content without a server opId receipt is not a completed operation');
 assert.equal(out.unproven?.[0]?.reason,'route-content-match-without-remote-operation-receipt');
 assert.equal(protectedRoute.idb.store.size,1);
 const good=boot('release-wal-single-authority-v9339.js',production,production.data);
 const goodResult=await good.window.hlgbWalSingleAuthority9339.pruneConfirmed(true,8);
 assert.equal(goodResult.removed,1);
 assert.equal(good.idb.store.size,0);
 const raced=boot('release-wal-single-authority-v9339.js',production,production.data,{race:true});
 const racedResult=await raced.window.hlgbWalSingleAuthority9339.pruneConfirmed(true,8);
 assert.equal(racedResult.removed,0,'same opId, newer payload: cannot remove');
 assert.equal(raced.idb.deletes,0);
 assert.equal(raced.idb.store.get(production.key).data.planned,99);
 const replay=boot('release-wal-confirmed-replay-v9333.js',route,route.data,{race:true});
 const attempted=await replay.window.hlgbWalConfirmedReplay9333.run('atomic-race',true);
 assert.equal(attempted,false,'an applied ACK cannot clear a newer local edit');
 assert.equal(replay.calls.length,1,'one RPC was observed');
 assert.equal(replay.idb.deletes,0);
 assert.equal(replay.idb.store.get(route.key).data.stops[0],'C');
 console.log('PASS v94.86: no route deletion without operation receipt, atomic IDB opId+payload guards, replay ACK race preserved');
})().catch(e=>{console.error(e);process.exitCode=1});
