'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const script=fs.readFileSync('release-production-reconcile-v9439.js','utf8');
const original={key:'production|p1',module:'production',id:'p1',opId:'stable-opid',deleted:false,
 data:{id:'p1',planned:8,status:'em produção'}};
async function tryRemove(current,expected=original){
 let entry=structuredClone(current),deleted=0;
 const indexedDB={open(name){
  assert.equal(name,'hlgb_durable_wal');
  const req={};queueMicrotask(()=>{
   req.result={
    objectStoreNames:{contains:name=>name==='entries'},
    transaction(_store,mode){
     assert.equal(mode,'readwrite');
     const tx={objectStore(){
      return {
       get(_key){
        const g={};queueMicrotask(()=>{
         g.result=structuredClone(entry);g.onsuccess?.();
         queueMicrotask(()=>tx.oncomplete?.());
        });return g
       },
       delete(key){assert.equal(key,'production|p1');entry=null;deleted++}
      }
     }};
     return tx
    },close(){}
   };req.onsuccess?.()
  });return req
 }};
 const ctx={window:{__HLGB_AUTH_READY:false,addEventListener:()=>{}},document:{querySelector:()=>null},
  indexedDB,console,setTimeout,clearTimeout,queueMicrotask,navigator:{onLine:true},
  structuredClone,Date,JSON,Object,Map,Set,Math,Number,parseFloat};
 vm.createContext(ctx);vm.runInContext(script,ctx);
 const deletedResult=await ctx.window.hlgbProductionReconcile9439._test.idbDeleteExact('production|p1','stable-opid',expected);
 return {deletedResult,entry,deleted};
}
(async()=>{
 const conflict=await tryRemove({...original,data:{...original.data,planned:9}});
 assert.equal(conflict.deletedResult,false,'same opId with changed content cannot be removed');
 assert.equal(conflict.deleted,0);
 assert.equal(conflict.entry.data.planned,9);
 const opChange=await tryRemove({...original,opId:'new-op'});
 assert.equal(opChange.deletedResult,false);assert.equal(opChange.deleted,0);
 const noMatch=await tryRemove({...original,id:'different-production'});
 assert.equal(noMatch.deletedResult,false);
 const exact=await tryRemove(original);
 assert.equal(exact.deletedResult,true);
 assert.equal(exact.deleted,1);
 assert.equal(exact.entry,null);
 console.log('PASS v94.84: IndexedDB removal is conditional on SAME opId, module, entity, deletion flag and full payload inside readwrite transaction');
})().catch(e=>{console.error(e);process.exitCode=1});
