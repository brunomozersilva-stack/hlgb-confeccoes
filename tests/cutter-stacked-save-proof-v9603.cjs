'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');

const root=path.resolve(__dirname,'..');
const core=fs.readFileSync(path.join(root,'hlgb-modules/corte/grade-modelo-v9602.js'),'utf8');
const planner=fs.readFileSync(path.join(root,'release-cutter-planner.js'),'utf8');

function harness(useCore){
 const remote=new Map(),writes=[],fields={
  hlgbCutterPlannerDate:{value:'2026-11-18'},
  hlgbCutterPlannerCutter:{value:'9'},
  hlgbCutterPlannerSelected:{innerHTML:''},
  hlgbCutterPlannerFeedback:{innerHTML:'',textContent:''},
  hlgbCutterPlannerSearch:{value:''}
 };
 const db={
  orders:[{id:123,orderNumber:100,status:'Aguardando corte',client:'Cliente fictício',
   grade:[{productId:55,color:'Preto',size:'P',qty:4},{productId:55,color:'Rubi',size:'M',qty:6},
          {productId:66,color:'Branco',size:'G',qty:3}]}],
  products:[{id:55,name:'Camisola Teste'},{id:66,name:'Short Teste'}],
  cutters:[{id:9,name:'Cortador Teste',active:true}],
  cuts:[]
 };
 const context={
  db,window:{},document:{getElementById:id=>fields[id]||null,querySelector:()=>null},
  console:{info(){},warn(){}},setTimeout:()=>0,encodeURIComponent,
  displayOrderNumber:o=>o.orderNumber,alert:()=>{}
 };
 context.window.cloudRequest=async(url,opts)=>{
  assert.equal(opts.method,'GET');
  assert.match(url,/module=eq.cuts/);
  const entityId=decodeURIComponent(url.match(/entity_id=eq.([^&]+)/)[1]);
  const row=remote.get(entityId);
  return row?[{module:'cuts',entity_id:entityId,data:JSON.parse(JSON.stringify(row)),deleted_at:null,revision:1}]:[];
 };
 context.hlgbRecordSaveWithRetry=async(module,id,row,deleted)=>{
  assert.equal(module,'cuts');assert.equal(deleted,false);
  writes.push(id);
  remote.set(id,JSON.parse(JSON.stringify(row)));
  return {applied:true};
 };
 vm.createContext(context);
 if(useCore)vm.runInContext(core,context);
 vm.runInContext(planner,context);
 const api=context.window.hlgbCutterPlanner;
 assert.ok(api,'Cortador deve expor API anterior');
 api.selectModel('123|55');
 return {api,context,db,remote,writes,fields};
}

for(const useCore of [false,true]){
 const mode=useCore?'módulo novo':'fallback legado';
 test(mode+': gravação confirmada preserva outros modelos do mesmo pedido',async()=>{
  const h=harness(useCore);
  assert.equal(h.api.modelRows().length,2);
  assert.equal(h.api.modelPieces(h.db.orders[0],55),10);
  assert.equal(await h.api.save(),true);
  assert.equal(h.writes.length,1);
  assert.equal(h.db.cuts.length,1);
  assert.equal(h.api.diagnostic().pendingDraftCount,0);
  const rows=h.api.modelRows();
  assert.equal(rows.length,2,'modelo programado continua visível até a finalização');
  const other=rows.find(x=>x.productId==='66');
  assert.ok(other,'outro modelo continua programável');
  assert.equal(other.pieces,3);
  assert.equal(other.cut,null,'programar um modelo não movimenta o corte do outro');
  assert.equal(h.remote.size,1);
 });
 test(mode+': perda de ACK após persistência não pode duplicar o corte',async()=>{
  const h=harness(useCore);
  let sends=0;
  h.context.hlgbRecordSaveWithRetry=async(module,id,row)=>{
   sends++;
   h.remote.set(id,JSON.parse(JSON.stringify(row)));
   throw new Error('Conexão caiu após a gravação');
  };
  await assert.rejects(h.api.save(),/Conexão caiu/);
  assert.equal(h.api.diagnostic().pendingDraftCount,1);
  assert.equal(h.db.cuts.length,0,'não confirmar localmente antes da releitura');
  assert.equal(sends,1);
  assert.equal(await h.api.save(),true,'deve recuperar a gravação remota existente');
  assert.equal(sends,1,'não enviar uma segunda escrita');
  assert.equal(h.remote.size,1);
  assert.equal(h.db.cuts.length,1);
  assert.equal(h.api.diagnostic().pendingDraftCount,0);
 });
 test(mode+': ACK positivo sem registro remoto não autoriza sucesso',async()=>{
  const h=harness(useCore);
  const attempted=[];
  h.context.hlgbRecordSaveWithRetry=async(module,id)=>{attempted.push(id);return {applied:true}};
  await assert.rejects(h.api.save(),/releitura não confirmou/);
  assert.equal(h.db.cuts.length,0);
  assert.equal(h.api.diagnostic().pendingDraftCount,1);
  await assert.rejects(h.api.save(),/releitura não confirmou/);
  assert.equal(attempted.length,2);
  assert.equal(attempted[0],attempted[1],'identidade incerta deve permanecer estável');
 });
 test(mode+': divergência no servidor bloqueia sobrescrita',async()=>{
  const h=harness(useCore);
  let attemptId='';
  h.context.hlgbRecordSaveWithRetry=async(module,id)=>{attemptId=id;return {applied:true}};
  await assert.rejects(h.api.save(),/releitura não confirmou/);
  const foreign={id:attemptId,orderId:999,productId:77,plannedCutDate:'2026-11-18',cutterId:9,pieces:999};
  h.remote.set(attemptId,foreign);
  await assert.rejects(h.api.save(),/ID de corte já existe/);
  assert.deepEqual(h.remote.get(attemptId),foreign,'registro remoto divergente intacto');
  assert.equal(h.db.cuts.length,0);
 });
}
