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


test('older waiting cut remains visible even with more than 60 already attributed',()=>{
 const {ctx,db}=fixture();
 for(let i=0;i<80;i++){
  const id=1000+i;
  db.cuts.push({id,orderId:37,productId:11,modelSplitChildV1:true,
   status:'Finalizado',pieces:1,finishedAtTime:'2026-11-10T14:50:00.000Z'});
  db.production.push({id:1000+i,orderId:37,productId:11,cutId:id,planned:1,
   stage:'Em produção',productionLocationId:101});
 }
 ctx.renderCutTracking9173();
 assert.ok(ctx.lastVisible.includes(5),'older pending row should not be displaced by history');
 assert.ok(ctx.lastVisible.includes(7),'incomplete destination should remain in queue');
 assert.equal(ctx.lastVisible.includes(1001),false,'assigned row not shown in waiting queue');
});

test('a canceled destination or duplicated identity cannot suppress genuine pending quantity',()=>{
 const {ctx,db}=fixture();const api=ctx.hlgbCutStepQueues9528;
 db.cuts.push({id:'Z',orderId:37,productId:15,status:'Finalizado',pieces:240});
 const pending={id:201,cutId:'Z',orderId:37,productId:15,planned:240,stage:'Aguardando atribuição'};
 db.production.push(pending,{id:202,cutId:'Z',orderId:37,productId:15,planned:240,stage:'Cancelado',factionId:200});
 assert.equal(api.pendingAssignedByCut(pending),false);assert(api.pendingProductionRows().some(p=>p.id===201));
 db.production.push({id:203,cutId:'Z',orderId:37,productId:15,planned:120,stage:'Em produção',factionId:200},{id:203,cutId:'Z',orderId:37,productId:15,planned:120,stage:'Em produção',factionId:200});
 assert.equal(api.pendingAssignedByCut(pending),false);assert(api.pendingProductionRows().some(p=>p.id===201));
});
test('filter interaction recomputes current queue after destination and includes older rows beyond 120',()=>{
 const {ctx,db}=fixture();ctx.renderCutTracking9173();
 db.production.find(p=>p.id===5).factionId=200;
 for(let i=0;i<130;i++)db.production.push({id:2000+i,cutId:'C',orderId:37,productId:15,planned:1,stage:'Aguardando produção'});
 const before=JSON.stringify(db);ctx.filterCutTracking9173();
 assert(!ctx.lastVisible.includes(5));assert(ctx.lastVisible.includes(2129));assert(ctx.lastVisible.includes(7));
 assert.equal(ctx.hlgbCutStepQueues9528.status().remoteConfirmed,false);assert.equal(JSON.stringify(db),before);
});

test('assignment modal refreshes loaded catalogs without writing or selecting a destination by assumption',()=>{
 const {ctx,db}=fixture(),api=ctx.hlgbCutStepQueues9528;
 function element(tag){return {tag,value:'',children:[],dataset:{},textContent:'',appendChild(x){this.children.push(x)},replaceChildren(...x){this.children=x;this.value=''},setAttribute(){},addEventListener(event,fn){this[event]=fn}}}
 const host=element('div'),service=element('select'),dest=element('select'),id=element('input');id.value='5';service.value='Costura';dest.parentElement=host;
 const modal={classList:{contains:x=>x==='show'},contains:x=>[service,dest,id].includes(x),querySelector:()=>host.children.find(x=>x.dataset.hlgbDestinationStatus9713==='1')||null};
 const nodes={modal,assignService:service,assignDestination:dest,assignProductionId:id};
 ctx.document.getElementById=x=>nodes[x]||null;ctx.document.createElement=element;
 ctx.hlgb916EligibleDestinations=s=>s==='Costura'?db.factionMasters.map(x=>({type:'F',id:x.id,name:x.name})):db.productionLocations.map(x=>({type:'L',id:x.id,name:x.name}));
 db.productionLocations=[{id:101,name:'Interno'}];db.factionMasters=[];db.serviceTypes=[{name:'Costura'}];
 assert(api.decorateSelector9713());assert.equal(api.selectorStatus9713().classification,'no-compatible');
 const button=host.children.find(x=>x.tag==='button');db.factionMasters.push({id:200,name:'Cris'});
 const before=JSON.stringify(db);button.onclick();assert.equal(api.selectorStatus9713().compatible,1);assert.equal(dest.value,'');
 dest.value='F:200';const firstOption=dest.children[1];button.onclick();assert.equal(dest.value,'F:200');assert.equal(dest.children[1],firstOption,'unchanged options keep DOM identity');assert.equal(JSON.stringify(db),before);
 db.factionMasters=[];api.refreshOpenDestination9846();assert.equal(dest.value,'');assert.equal(api.selectorStatus9713().classification,'no-compatible');
 service.value='';button.onclick();assert.equal(api.selectorStatus9713().compatible,1,'unrestricted internal option remains');
 assert.equal(dest.children[1].value,'L:101');assert.equal(dest.value,'');
 dest.value='L:101';db.production.find(p=>p.id===5).factionId=200;api.refreshOpenDestination9846();assert.equal(api.selectorStatus9713().classification,'stale-production');assert.equal(dest.value,'');assert.equal(dest.children.length,1);
 ctx.__HLGB_AUTH_READY=false;assert.equal(api.decorateSelector9713(),false);
});

test('history mode and title survive direct legacy filter and refresh; no duplicate render',()=>{
 const {ctx,db}=fixture();const api=ctx.hlgbCutStepQueues9528;
 const title={textContent:''},caption={textContent:''},toolbar={appendChild(x){button=x}},box={};let button=null;
 const panel={querySelector(s){return s==='h2'?title:s==='.toolbar .sub'?caption:s==='#hlgbStepQueueShowAssigned9528'?button:s==='.toolbar'?toolbar:null}};
 ctx.document.getElementById=id=>id==='cutTracking9173'?panel:null;ctx.document.createElement=()=>({setAttribute(k,v){this[k]=v}});
 ctx.filterCutTracking9173();assert.match(title.textContent,/aguardando destino/);assert.match(caption.textContent,/2 registro/);const originalButton=button;
 button.onclick();assert.equal(api.showAssigned(),true);assert.match(title.textContent,/histórico/);assert.equal(button['aria-pressed'],'true');assert(ctx.lastVisible.includes(1));assert.equal(button,originalButton);
 // The legacy renderer has rebuilt the toolbar, then calls its global filter directly.
 button=null;title.textContent='Onde estão os cortes finalizados';ctx.filterCutTracking9173();assert.match(title.textContent,/histórico/);assert.equal(button['aria-pressed'],'true');
 const before=JSON.stringify(db);button.onclick();assert.equal(api.showAssigned(),false);assert.deepEqual(Array.from(ctx.lastVisible),[5,7]);assert.equal(JSON.stringify(db),before);
 db.cuts.push({id:'hidden-parent',orderId:37,status:'Finalizado',pieces:50,hiddenByModelSplitV1:true});assert(!api.trackingSources().some(r=>r.c.id==='hidden-parent'));
});
