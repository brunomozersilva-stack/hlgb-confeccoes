'use strict';
// Prova integrada do Corte comercial com dados fictícios e servidor em memória.
// Sem rede, sem IndexedDB/WAL real, sem acesso ao Supabase comercial.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const cutterSource=fs.readFileSync('release-cutter-planner.js','utf8');
const productionSource=fs.readFileSync('hlgb-modules/producao/corte-producao-quantidade-v9607.js','utf8');
const clone=x=>JSON.parse(JSON.stringify(x));
function makeSession(server){
 const db={
  orders:[{id:100,orderNumber:100,client:'Cliente fictício',status:'Aguardando corte',
   grade:[{productId:55,color:'Preto',size:'P',qty:60},{productId:55,color:'Preto',size:'M',qty:40}]}],
  products:[{id:55,name:'Modelo fictício'}],cuts:[],production:[],
  cutters:[{id:9,name:'Cortador fictício',active:true}]
 };
 const fields={
  hlgbCutterPlannerDate:{value:'2026-11-20'},hlgbCutterPlannerCutter:{value:'9'},
  hlgbCutterPlannerSelected:{innerHTML:''},hlgbCutterPlannerFeedback:{textContent:'',innerHTML:''},
  hlgbCutterPlannerSearch:{value:''}
 };
 const metrics={writes:0,localSaves:0,pending:0,queued:0,remoteReads:0};
 const ctx={db,window:null,document:{getElementById:id=>fields[id]||null,querySelector:()=>null},
  Date,Math,Map,Set,Number,String,JSON,Array,Promise,encodeURIComponent,
  console:{info(){},warn(){},error(){}},setTimeout:()=>0,
  displayOrderNumber:o=>o.orderNumber,alert(){},isoDate:()=> '2026-11-20',
  localSaveOnly(){metrics.localSaves++},
  hlgbRecordPendingStore(){metrics.pending++},
  hlgbQueueNormalizedSync(){metrics.queued++}
 };
 ctx.window=ctx;
 ctx.cloudRequest=async (url,options)=>{
  assert.equal(options.method,'GET');
  const match=String(url).match(/entity_id=eq\.([^&]+)/);
  assert.ok(match,'a releitura exige ID do corte');
  metrics.remoteReads++;
  const id=decodeURIComponent(match[1]),row=server.cuts.get(id);
  return row?[{module:'cuts',entity_id:id,data:clone(row),deleted_at:null,revision:1}]:[];
 };
 ctx.hlgbRecordSaveWithRetry=async (module,id,row,deleted)=>{
  assert.equal(module,'cuts');assert.equal(deleted,false);
  metrics.writes++;server.cuts.set(String(id),clone(row));
  return {applied:true,data:row};
 };
 vm.createContext(ctx);
 vm.runInContext(cutterSource,ctx,{timeout:2000});
 vm.runInContext(productionSource,ctx,{timeout:2000});
 ctx.hlgbCutterPlanner.selectModel('100|55');
 return {ctx,db,fields,metrics};
}
test('programar 100, finalizar 80, sincronizar Produção e consultar segunda sessão sem duplicar',async()=>{
 const server={cuts:new Map(),production:new Map()};
 const first=makeSession(server);
 assert.equal(await first.ctx.hlgbCutterPlanner.save(),true);
 assert.equal(first.metrics.writes,1);
 assert.equal(server.cuts.size,1);
 assert.equal(first.db.cuts.length,1);
 const cut=first.db.cuts[0];
 assert.equal(cut.pieces,100);
 cut.status='Finalizado';
 cut.actualCutGrade=[
  {productId:55,color:'Preto',size:'P',qty:48},
  {productId:55,color:'Preto',size:'M',qty:32}
 ];
 // Mocka a persistência do corte finalizado por ação de finalização do usuário.
 server.cuts.set(String(cut.id),clone(cut));
 assert.equal(first.ctx.syncFinalizedCutsToProduction(),true);
 assert.equal(first.ctx.syncFinalizedCutsToProduction(),false,'repetir não duplica');
 assert.equal(first.db.production.length,1);
 assert.equal(first.db.production[0].planned,80,'somente a grade efetiva segue à Produção');
 assert.equal(first.metrics.localSaves,1);
 assert.equal(first.metrics.pending,1);
 assert.equal(first.metrics.queued,1);
 server.production.set(String(first.db.production[0].id),clone(first.db.production[0]));
 const second=makeSession(server);
 second.db.cuts=[...server.cuts.values()].map(clone);
 second.db.production=[...server.production.values()].map(clone);
 assert.equal(second.db.cuts.length,1);
 assert.equal(second.db.cuts[0].status,'Finalizado');
 assert.equal(second.db.production.length,1);
 assert.equal(second.db.production[0].planned,80);
 assert.equal(second.ctx.syncFinalizedCutsToProduction(),false,'segunda sessão não recria produção');
 assert.equal(second.db.production.length,1);
 assert.equal(server.production.size,1);
 assert.equal(server.cuts.size,1);
 assert.equal(second.metrics.writes,0);
});
