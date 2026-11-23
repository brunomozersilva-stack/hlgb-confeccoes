'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const src=fs.readFileSync('release-production-reconcile-v9439.js','utf8');
const content={id:'p1',cutId:'cut1',orderId:'order1',productId:'prod1',cutProductKey:'cut1:prod1',planned:8,status:'Aguardando atribuição'};
const copy=x=>JSON.parse(JSON.stringify(x));
const makeOp=(opId,key='production|p1')=>({key,id:'p1',module:'production',opId,deleted:false,
 data:copy(content),baseData:copy(content),baseUpdatedAt:'2026-11-22T12:00:00Z'});
function fixture(){
 const dataStore={},w={__HLGB_AUTH_READY:false,addEventListener(){}};
 let reads=0;
 w.cloudRequest=async()=>{reads++;return [{module:'production',entity_id:'p1',
  revision:7,updated_at:'2026-11-23T12:00:00Z',deleted_at:null,data:copy(content)}]};
 const localStorage={
  getItem:key=>dataStore[key]||null,
  setItem:(key,value)=>{dataStore[key]=String(value)},
  removeItem:key=>{delete dataStore[key]}
 };
 const ctx={window:w,localStorage,db:{production:[]},navigator:{onLine:true},
  document:{readyState:'loading',addEventListener(){},querySelector(){return null}},
  console:{info(){},warn(){}},setTimeout(){return 1},clearTimeout(){},structuredClone,
  Date,Math,JSON,Set,Map,Promise,encodeURIComponent};
 vm.createContext(ctx);vm.runInContext(src,ctx);
 const api=w.hlgbProductionReconcile9439;
 const setOps=ops=>{dataStore.hlgb_durable_wal_v1=JSON.stringify({entries:Object.fromEntries(ops.map(x=>[x.key,x]))})};
 const candidate=ops=>({id:'p1',normalized:[],walLocal:ops,walIdb:[]});
 return {w,api,dataStore,setOps,candidate,reads:()=>reads};
}
test('opIds distintos para um registro preservam ambas as operações sem consultar ou limpar',async()=>{
 const f=fixture(),a=makeOp('op-A','production|p1'),b=makeOp('op-B','production|p1-2');
 f.setOps([a,b]);const before=f.dataStore.hlgb_durable_wal_v1;
 const res=await f.api._test.reconcileOne(f.candidate([a,b]),'safe-test');
 assert.equal(res.ok,false);assert.equal(res.reason,'multiple-operation-ids');
 assert.equal(res.requiresManualReview,true);
 assert.equal(f.dataStore.hlgb_durable_wal_v1,before);
 assert.equal(f.reads(),0);
 assert.equal(f.api.state.prunedWal,0);
});
test('nova edição com opId diferente não é limpa após prova de operação anterior',async()=>{
 const f=fixture(),a=makeOp('962332de-dc23-471f-b348-45d9dacf50f2');
 f.setOps([a]);
 const first=await f.api._test.reconcileOne(f.candidate([a]),'round-1');
 assert.equal(first.ok,true);assert.equal(first.proof,'server-semantic-match');
 assert.equal(first.walRemoved,1);assert.equal(f.api.state.prunedWal,1);
 const b=makeOp('86064533-5c1b-4030-af02-0a2f0f1ce1ba');
 f.setOps([b]);const before=f.dataStore.hlgb_durable_wal_v1;
 const second=await f.api._test.reconcileOne(f.candidate([b]),'round-2');
 assert.equal(second.ok,false);assert.equal(second.reason,'new-operation-after-confirmation');
 assert.equal(second.requiresManualReview,true);
 assert.equal(second.previousOperationId,'962332de-dc23-471f-b348-45d9dacf50f2');
 assert.equal(f.dataStore.hlgb_durable_wal_v1,before);
 assert.equal(f.reads(),1,'a segunda operação nem deve pedir remoção com prova semântica');
 assert.equal(f.api.state.prunedWal,1);
});
test('a mesma operação com cópias WAL compatíveis preserva comportamento antigo',async()=>{
 const f=fixture(),a=makeOp('op-A');
 f.setOps([a]);
 const out=await f.api._test.reconcileOne(f.candidate([a]),'same-operation');
 assert.equal(out.ok,true);assert.equal(out.walRemoved,1);assert.equal(f.api.state.opIdChangeBlocks,0);
});
test('registro diferente não herda bloqueio do opId de outra produção',async()=>{
 const f=fixture(),a=makeOp('op-A');f.setOps([a]);
 await f.api._test.reconcileOne(f.candidate([a]),'first-record');
 assert.equal(f.api.state.opIdChangeBlocks,0);
 const b=makeOp('op-B');b.id='p2';b.key='production|p2';
 const check={id:'p2',normalized:[],walLocal:[b],walIdb:[]};
 // Prova remota inadequada para p2: deve falhar por identidade, não por mudança de opId de p1.
 const out=await f.api._test.reconcileOne(check,'another-record');
 assert.equal(out.ok,false);assert.equal(out.reason,'server-identity-mismatch');
 assert.equal(f.api.state.opIdChangeBlocks,0);
});
test('fonte mantém as regras de releitura, comparação de payload e exclusão exata',()=>{
 assert.match(src,/function idbDeleteExact\(/);
 assert.match(src,/sameJson\(cur\.data,expected\?\.data\)/);
 assert.match(src,/function staleOperationSatisfied\(/);
 assert.match(src,/function normalizeLocal\(/);
 assert.match(src,/function updateSnapshot\(/);
 assert.match(src,/const confirmedOpIdByRecord=new Map\(\)/);
});
