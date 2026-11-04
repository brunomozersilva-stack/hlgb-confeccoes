'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const loader=fs.readFileSync('app-stable3.html','utf8'),tick=String.fromCharCode(96);
const start=loader.indexOf('const walEnqueueNew='+tick);
const end=loader.indexOf(tick+';',start+21);
assert(start>=0&&end>start,'router must have WAL enqueue patch');
const fn=loader.slice(start+('const walEnqueueNew='+tick).length,end);
assert(fn.startsWith('async function enqueue955')&&fn.includes('production'),'must patch real enqueue');
async function scenario(module,original,newData,revisionData){
 let idseq=0,idb=[structuredClone(original)],stored={},saved=[],idbWrites=[];
 const ctx={
  console,Date,Math,String,Promise,JSON,
  crypto:{randomUUID:()=>('new-op-'+(++idseq))},
  VER955:'91.55',window:{hlgbProductionReconcile9439:{
   productionEquivalent:(a,b)=>{
    const simplify=x=>{const v=structuredClone(x);delete v.updatedAt;return v};
    return JSON.stringify(simplify(a))===JSON.stringify(simplify(b))
   }
  }},
  idbAll955:async()=>structuredClone(idb),
  idbPut955:async x=>{idbWrites.push(structuredClone(x));idb=[structuredClone(x)];return true},
  read955:()=>({entries:structuredClone(stored)}),
  write955:w=>{stored=structuredClone(w.entries);saved.push(structuredClone(w));return true},
  snap955:()=>({data:revisionData||null,updated_at:'2026-11-03T00:00:00Z'}),
  key955:(m,id)=>m+'|'+id,
  C955:x=>structuredClone(x),
  now955:()=>new Date().toISOString(),
  update955:()=>{}
 };
 vm.createContext(ctx);
 vm.runInContext(fn+'\nthis.enqueueFromRouter=enqueue955;',ctx);
 const op=await ctx.enqueueFromRouter(module,'record-1',newData,false);
 return {op,idb,saved,idbWrites};
}
(async()=>{
 const base={key:'production|record-1',module:'production',id:'record-1',opId:'original-immutable-op',
  deleted:false,data:{id:'record-1',cutId:'c1',orderId:'o1',productId:'p1',cutProductKey:'c1:p1',planned:8,updatedAt:'2026-11-02T00:00:00Z'},baseData:null};
 const same={...base.data,updatedAt:'2026-11-04T00:00:00Z'};
 const a=await scenario('production',base,same);
 assert.equal(a.op.opId,'original-immutable-op','IDB opId must remain when Production intent is identical');
 assert.equal(a.idb[0].opId,'original-immutable-op');
 assert.equal(a.saved.length,1);
 const b=await scenario('production',base,{...same,planned:9});
 assert.match(b.op.opId,/new-op-1/,'new business edit must not inherit old IDB opId');
 const c=await scenario('routePlans',{...base,key:'routePlans|record-1',module:'routePlans'},same);
 assert.match(c.op.opId,/new-op-1/,'other modules remain untouched');
 const d=await scenario('production',{...base,deleted:true},same);
 assert.match(d.op.opId,/new-op-1/,'new create/update cannot reuse deleted WAL intent');
 console.log('PASS v94.84: identical IDB-only Production WAL keeps opId, real edits use new opId, deleted/other modules unaffected');
})().catch(err=>{console.error(err);process.exitCode=1});
