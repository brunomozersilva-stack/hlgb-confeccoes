'use strict';
const fs=require('fs');
const vm=require('vm');
const assert=require('assert');

const src=fs.readFileSync('release-wal-single-authority-v9339.js','utf8');
new vm.Script(src,{filename:'release-wal-single-authority-v9339.js'});

const store=new Map();
const localStorage={getItem:k=>store.has(k)?store.get(k):null,setItem:(k,v)=>store.set(k,String(v)),removeItem:k=>store.delete(k)};
const pending={id:1793032272043,cutId:1793031962977,orderId:1793031962976,productId:1788434159326,op:'PED-1793031962976',product:'Conjunto Gigi',client:'Dell',color:'',size:'',planned:372,done:0,stage:'Aguardando atribuição',productionLocationId:null,factionId:null,date:'2026-10-26',assignmentSource:true,cutProductKey:'1793031962977:1788434159326',cutEffectiveQtyV9240:true};
const remote={...pending,id:1793032752538,cutEffectiveQtyV9246:true,cutQuantityLinkedV9246:true};

const window={HLGB_RELEASE_VERSION:'93.48',addEventListener(){},hlgb955FlushSilent:async()=>true,hlgbWalConfirmedReplay9333:{version:'93.38',state:{busy:false},run:async()=>true},cloudRequest:async q=>{
  if(q.includes('entity_id=eq.1793032272043'))return [];
  if(q.includes('data->>cutProductKey=eq.'))return [{module:'production',entity_id:'1793032752538',data:remote,deleted_at:null,revision:5,updated_at:'2026-10-26T16:26:22Z'}];
  return [];
}};
const context={window,localStorage,navigator:{onLine:true},document:{getElementById:id=>id==='appShell'?{}:null,querySelector:()=>null},getComputedStyle:()=>({display:'block'}),console,structuredClone:global.structuredClone,URL,Promise,Date,JSON,Object,Array,String,Number,Math,encodeURIComponent,setTimeout:()=>1,clearTimeout(){},setInterval:()=>1,clearInterval(){}};
vm.createContext(context);
vm.runInContext(src,context,{filename:'release-wal-single-authority-v9339.js'});

const api=window.hlgbWalSingleAuthority9339;
assert(api,'Autoridade WAL não exposta');
assert.strictEqual(api.sameProductionReplacement(remote,pending),true,'Versão canônica equivalente deveria ser reconhecida');
assert.strictEqual(api.sameProductionReplacement({...remote,done:1},pending),false,'Mudança em quantidade feita deve preservar WAL');
assert.strictEqual(api.sameProductionReplacement({...remote,stage:'Em produção'},pending),false,'Mudança de etapa deve preservar WAL');
assert.strictEqual(api.sameProductionReplacement({...remote,cutProductKey:'outro'},pending),false,'Identidade diferente deve preservar WAL');

store.set('hlgb_durable_wal_v1',JSON.stringify({version:1,entries:{'production|1793032272043':{key:'production|1793032272043',opId:'op-1',module:'production',id:'1793032272043',deleted:false,data:pending}}}));
(async()=>{
  const result=await api.pruneConfirmed(true,8);
  assert.strictEqual(result.removed,1,'WAL equivalente confirmado deveria ser podado');
  assert.strictEqual(result.equivalent.length,1,'Poda deve registrar substituição equivalente');
  assert.strictEqual(store.has('hlgb_durable_wal_v1'),false,'WAL local deve ficar vazio após confirmação equivalente');
  window.__HLGB_AUTH_READY=true;
  const payment={id:'p1',status:'Pendente',value:155},entry=(id,data)=>({key:'factionPayments|'+id,opId:'op-'+id,module:'factionPayments',id,data,deleted:false});
  const a=entry('p1',payment),b=entry('p2',{id:'p2',status:'Pendente',value:10}),other=entry('p3',{id:'p3',value:9});
  store.set('hlgb_durable_wal_v1',JSON.stringify({entries:{[a.key]:a,[b.key]:b,[other.key]:other}}));
  let queries=0;window.cloudRequest=async(q,o)=>{queries++;assert.equal(o.method,'GET');const id=q.includes('entity_id=eq.p1')?'p1':'p2';return [{module:'factionPayments',entity_id:id,deleted_at:null,data:id==='p1'?payment:{...b.data,value:99}}]};
  const target=await api.pruneConfirmedFor([{module:'factionPayments',id:'p1'},{module:'factionPayments',id:'p2'}]);
  assert.equal(target.removed,1);assert.equal(queries,2);assert.deepEqual(Object.keys(JSON.parse(store.get('hlgb_durable_wal_v1')).entries).sort(),[b.key,other.key].sort());
  window.__HLGB_AUTH_READY=false;assert.equal((await api.pruneConfirmedFor([{module:'factionPayments',id:'p2'}])).skipped,true);assert.equal(queries,2);
  console.log('OK wal equivalent production and targeted payment proof regression');
})().catch(err=>{console.error(err);process.exitCode=1});
