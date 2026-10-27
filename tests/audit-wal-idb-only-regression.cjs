'use strict';
const fs=require('fs'),vm=require('vm'),assert=require('assert');
const clone=v=>JSON.parse(JSON.stringify(v));
function fakeIdb(entries){
  const store=new Map(entries.map(e=>[String(e.key),clone(e)]));
  const indexedDB={open(){
    const req={};
    queueMicrotask(()=>{
      const db={objectStoreNames:{contains:n=>n==='entries'},close(){},transaction(){
        const tx={oncomplete:null,onerror:null,onabort:null};
        const os={
          getAll(){const q={};queueMicrotask(()=>{q.result=[...store.values()].map(clone);q.onsuccess&&q.onsuccess()});return q},
          get(key){const q={};queueMicrotask(()=>{q.result=store.has(String(key))?clone(store.get(String(key))):undefined;q.onsuccess&&q.onsuccess()});return q},
          put(v){store.set(String(v.key),clone(v))},
          delete(key){store.delete(String(key))}
        };
        tx.objectStore=()=>os;
        queueMicrotask(()=>queueMicrotask(()=>tx.oncomplete&&tx.oncomplete()));
        return tx
      }};
      req.result=db;req.onsuccess&&req.onsuccess()
    });
    return req
  }};
  return {indexedDB,store}
}
function baseContext(indexedDB,window,localStorage){
  return {window,localStorage,indexedDB,navigator:{onLine:true},document:{getElementById:id=>id==='appShell'?{}:id==='loginScreen'?{style:{display:'none'}}:null,querySelector:()=>null,readyState:'complete',addEventListener(){}},getComputedStyle:el=>({display:el?.style?.display||'block'}),console,structuredClone:global.structuredClone,URL,Promise,Date,JSON,Object,Array,String,Number,Math,encodeURIComponent,queueMicrotask,setTimeout:()=>1,clearTimeout(){},setInterval:()=>1,clearInterval(){}}
}
const pending={id:1793032272043,cutId:1793031962977,orderId:1793031962976,productId:1788434159326,op:'PED-1793031962976',product:'Conjunto Gigi',client:'Dell',color:'',size:'',planned:372,done:0,stage:'Aguardando atribuição',productionLocationId:null,factionId:null,date:'2026-10-26',assignmentSource:true,cutProductKey:'1793031962977:1788434159326',cutEffectiveQtyV9240:true};
const entry={key:'production|1793032272043',opId:'op-idb-only',module:'production',id:'1793032272043',deleted:false,data:pending,createdAt:'2026-10-26T19:36:49.218Z',updatedAt:'2026-10-26T19:36:49.264Z',attempts:1,state:'pending'};
(async()=>{
  {
    const src=fs.readFileSync('release-wal-single-authority-v9339.js','utf8'),mem=new Map();
    const localStorage={getItem:k=>mem.has(k)?mem.get(k):null,setItem:(k,v)=>mem.set(k,String(v)),removeItem:k=>mem.delete(k)};
    const idb=fakeIdb([entry]);
    const remote={...pending,id:1793032752538,cutEffectiveQtyV9246:true,cutQuantityLinkedV9246:true};
    const window={HLGB_RELEASE_VERSION:'93.50',addEventListener(){},hlgb955FlushSilent:async()=>true,hlgbWalConfirmedReplay9333:{version:'93.50',state:{busy:false},run:async()=>true},cloudRequest:async q=>q.includes('entity_id=eq.1793032272043')?[]:q.includes('data->>cutProductKey=eq.')?[{module:'production',entity_id:'1793032752538',data:remote,deleted_at:null}]:[]};
    const ctx=baseContext(idb.indexedDB,window,localStorage);vm.createContext(ctx);vm.runInContext(src,ctx);
    const out=await window.hlgbWalSingleAuthority9339.pruneConfirmed(true,8);
    assert.strictEqual(out.removed,1,'equivalente IDB-only deveria ser podado');
    assert.strictEqual(out.equivalent.length,1,'poda deve registrar substituição equivalente');
    assert.strictEqual(idb.store.size,0,'equivalente IDB-only deve sair do IndexedDB');
  }
  {
    const src=fs.readFileSync('release-wal-confirmed-replay-v9333.js','utf8'),mem=new Map(),calls=[];
    const localStorage={getItem:k=>mem.has(k)?mem.get(k):null,setItem:(k,v)=>mem.set(k,String(v)),removeItem:k=>mem.delete(k)};
    const genuine={...entry,key:'finance|idb-real',opId:'op-real',module:'finance',id:'idb-real',data:{id:'idb-real',value:99}};
    const idb=fakeIdb([genuine]);
    const window={HLGB_RELEASE_VERSION:'93.50',addEventListener(){},hlgbRecordSaveWithRetry:async(...args)=>{calls.push(args);return {applied:true}}};
    const ctx=baseContext(idb.indexedDB,window,localStorage);vm.createContext(ctx);vm.runInContext(src,ctx);
    const ok=await window.hlgbWalConfirmedReplay9333.run('idb-only-test',true);
    assert.strictEqual(ok,true,'replay IDB-only deveria concluir');
    assert.strictEqual(calls.length,1,'operação IDB-only real deve ser reenviada');
    assert.strictEqual(idb.store.size,0,'WAL IDB-only só sai após confirmação applied:true');
  }
  console.log('OK WAL IDB-only: poda equivalente + replay real confirmados.');
})().catch(e=>{console.error(e);process.exitCode=1});
