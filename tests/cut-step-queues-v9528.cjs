'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const planner=fs.readFileSync('release-cutter-planner.js','utf8');
const split=fs.readFileSync('release-cut-model-split.js','utf8');
const stage=fs.readFileSync('release-cut-step-queues-v9528.js','utf8');
const org=fs.readFileSync('release-cut-organization.js','utf8');
const router=fs.readFileSync('app-stable3.html','utf8');
function fixture(){
 const g=(p,qty)=>({productId:p,size:'M',color:'Preto',qty});
 const db={
 orders:[{id:37,orderNumber:37,client:'Click Sophia',grade:[g(11,192),g(12,172),g(15,240)]},
 {id:38,orderNumber:38,client:'Click Sophia',grade:[g(13,260),g(14,280)]}],
 products:[{id:11,name:'Crystal'},{id:12,name:'Melanie'},{id:13,name:'Emerson'},{id:14,name:'Micaela'},{id:15,name:'Leidiane'}],
 cuts:[
  {id:'A',orderId:37,productId:11,modelSplitChildV1:true,status:'Finalizado',pieces:192},
  {id:'B',orderId:37,productId:12,modelSplitChildV1:true,status:'Finalizado',pieces:172},
  {id:'C',orderId:37,productId:15,modelSplitChildV1:true,status:'Planejado',pieces:240},
  {id:'D',orderId:38,productId:13,modelSplitChildV1:true,status:'Finalizado',pieces:260},
  {id:'E',orderId:38,productId:14,modelSplitChildV1:true,status:'Finalizado',pieces:280}],
 production:[
  {id:1,orderId:37,productId:11,cutId:'A',planned:192,stage:'Em produção',factionId:200,assignedAt:'2026-11-10'},
  {id:2,orderId:37,productId:12,cutId:'B',planned:172,stage:'Em produção',productionLocationId:101,assignedAt:'2026-11-10'},
  {id:3,orderId:38,productId:13,cutId:'D',planned:260,stage:'Em produção',factionId:200},
  {id:4,orderId:38,productId:14,cutId:'E',planned:280,stage:'Em produção',factionId:200},
  {id:5,orderId:37,productId:15,cutId:'C',planned:240,stage:'Aguardando produção'},
  {id:6,orderId:38,productId:14,cutId:'E',planned:280,stage:'Aguardando atribuição'},
  {id:7,orderId:37,productId:15,cutId:'C',planned:1,stage:'Em produção',assignedAt:'2026-11-10'}],
 cutters:[],factions:[],serviceTypes:[]};
 const doc={getElementById(){return null}};
 const ctx={db,console:{info(){},warn(){},error(){}},document:doc,setTimeout(){},
   hlgbAfterLogin(){},addEventListener(){},renderCuts(){},renderCutTracking9173(){
    ctx.__cutTrackRows9173=ctx.db.production.map(p=>({p,c:ctx.db.cuts.find(c=>String(c.id)===String(p.cutId))}));
    ctx.filterCutTracking9173();
   },filterCutTracking9173(){ctx.lastVisible=(ctx.__cutTrackRows9173||[]).map(r=>r.p.id)},
   renderCutAssignmentQueue(){ctx.lastUnassigned=ctx.hlgb916UnassignedProduction().map(p=>p.id)},
   __HLGB_AUTH_READY:true};
 ctx.window=ctx;vm.createContext(ctx);
 for(const source of [planner,split,stage])vm.runInContext(source,ctx);
 return {ctx,db};
}
test('router loads stage synchronization once at end; source scripts parse',()=>{
 assert.equal((router.match(/release-cut-step-queues-v9528\.js/g)||[]).length,1);
 assert.doesNotThrow(()=>new vm.Script(planner));
 assert.doesNotThrow(()=>new vm.Script(split));
 assert.doesNotThrow(()=>new vm.Script(stage));
 assert.doesNotThrow(()=>new vm.Script(org));
});
test('Corte: one sibling still pending; completed models absent from planner',()=>{
 const {ctx}=fixture(),models=ctx.hlgbCutterPlanner.modelRows();
 assert.equal(models.length,1);assert.equal(models[0].productName,'Leidiane');
 assert.equal(ctx.hlgbCutterPlanner.modelAlreadyCut(ctx.db.orders[0],'11'),true);
 assert.equal(ctx.hlgbCutterPlanner.modelAlreadyCut(ctx.db.orders[0],'15'),false);
});
test('Atribuição: confirmed facção/local leaves queues, but unassigned remains',()=>{
 const {ctx,db}=fixture();
 const before=JSON.stringify(db);
 const result=ctx.hlgbCutStepQueues9528.pendingProductionRows();
 assert.deepEqual(Array.from(result,x=>x.id),[5,7]); // 7 assignedAt but no location: still needs location
 ctx.renderCutTracking9173();
 assert.deepEqual(Array.from(ctx.lastVisible),[5,7]);
 assert.equal(JSON.stringify(db),before,'Filtragem não pode alterar ou remover dados reais');
});
test('Atribuição parcial não some, duplicidade de modelo integralmente atribuído some',()=>{
 const {ctx,db}=fixture();
 // Pendente duplicado da Micaela deve sair: peça já completamente alocada.
 assert.equal(ctx.hlgbCutStepQueues9528.pendingProductionRows().some(p=>p.id===6),false);
 // Atribuição parcial de outra produção conserva o saldo.
 db.cuts.push({id:'F',orderId:37,productId:15,status:'Finalizado',pieces:240});
 db.production.push({id:80,orderId:37,productId:15,cutId:'F',stage:'Em produção',factionId:200,planned:100});
 db.production.push({id:81,orderId:37,productId:15,cutId:'F',stage:'Aguardando atribuição',planned:140});
 assert.equal(ctx.hlgbCutStepQueues9528.pendingProductionRows().some(p=>p.id===81),true);
});
test('Destino já existente nunca pode ser apagado por rotina de reparação',async()=>{
 const {ctx,db}=fixture();
 const legacy={id:90,stage:'Aguardando produção',productionLocationId:105,assignedAt:''};
 db.production.push(legacy);
 const before=JSON.stringify(db);
 const audit=await ctx.hlgbRepairInheritedProductionDestinations9412();
 assert.equal(audit.repaired,0);
 assert.equal(audit.preserved,1);
 assert.equal(JSON.stringify(db),before);
});
test('Concluídos ficam disponíveis no histórico, sem botão de baixa manual na ficha do corte',()=>{
 assert.match(stage,/Mostrar já atribuídos/);
 assert.doesNotMatch(split,/onclick="hlgbShowWriteoffForSplit/);
 assert.match(split,/showCompletedModels9519=false/);
 assert.match(org,/const completed=/);
});
