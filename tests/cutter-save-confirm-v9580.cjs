'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const src=fs.readFileSync('release-cutter-planner.js','utf8');
function setup(sharedRecords){
 const records=sharedRecords||new Map(),calls=[],messages=[],delays=[];
 const db={cuts:[],orders:[{id:123,orderNumber:100,client:'Cliente fictício',status:'Aguardando corte',
  grade:[{productId:55,color:'Preto',size:'P',qty:6},{productId:55,color:'Rubi',size:'M',qty:4}]}],
  products:[{id:55,name:'Camisola Teste'}],cutters:[{id:9,name:'Cortador Fictício',active:true}]};
 const fields={hlgbCutterPlannerDate:{value:'2026-11-18'},hlgbCutterPlannerCutter:{value:'9'},
  hlgbCutterPlannerSelected:{innerHTML:''},hlgbCutterPlannerFeedback:{textContent:'',innerHTML:''},
  hlgbCutterPlannerSearch:{value:''}};
 const document={getElementById:id=>fields[id]||null,querySelector:()=>null};
 const context={db,console,setTimeout:()=>0,document,window:{},
  displayOrderNumber:o=>o.orderNumber,alert:m=>messages.push(m),encodeURIComponent};
 context.window.cloudRequest=async(path,options)=>{
  assert.equal(options.method,'GET');assert.match(path,/module=eq.cuts/);
  const id=decodeURIComponent(path.match(/entity_id=eq.([^&]+)/)[1]),row=records.get(id);
  return row?[{module:'cuts',entity_id:id,data:structuredClone(row),deleted_at:null,revision:1}]:[];
 };
 context.hlgbRecordSaveWithRetry=async(module,id,row,deleted)=>{
  calls.push({module,id,row:structuredClone(row),deleted});
  records.set(id,structuredClone(row));return {applied:true,data:row};
 };
 vm.createContext(context);vm.runInContext(src,context);
 const api=context.window.hlgbCutterPlanner;api.selectModel?.('123|55'); // use selectModel when exposed
 return {context,api,db,fields,records,calls,messages};
}
test('salvar programação exige releitura de grade, data, cortador e modelo',async()=>{
 const f=setup();const id=await f.api.save();
 assert.equal(id,true);
 assert.equal(f.calls.length,1);assert.equal(f.db.cuts.length,1);
 assert.equal(f.records.size,1);
 assert.equal(f.api.diagnostic().confirmed,1);
 assert.equal(f.api.diagnostic().pendingDraftCount,0);
 assert.match(f.fields.hlgbCutterPlannerFeedback.innerHTML,/programado/);
});
test('ACK sem registro remoto não autoriza sucesso e mantém ID estável para recuperar',async()=>{
 const f=setup(),ids=[];
 f.context.hlgbRecordSaveWithRetry=async(module,id,row)=>{ids.push(id);return {applied:true,data:row}};
 await assert.rejects(f.api.save(),/releitura não confirmou/);
 assert.equal(f.db.cuts.length,0);
 assert.equal(f.api.diagnostic().pendingDraftCount,1);
 assert.equal(f.api.diagnostic().uncertain,1);
 assert.match(f.fields.hlgbCutterPlannerFeedback.textContent,/Sem confirmação remota/);
 await assert.rejects(f.api.save(),/releitura não confirmou/);
 assert.deepEqual(ids,[ids[0],ids[0]],'A segunda tentativa deve usar o mesmo ID');
});
test('clique simultâneo é bloqueado e não cria duas gravações',async()=>{
 const f=setup();let release,called=0;
 f.context.hlgbRecordSaveWithRetry=async(module,id,row)=>{
  called++;await new Promise(resolve=>{release=resolve});
  f.records.set(id,structuredClone(row));return {applied:true,data:row};
 };
 const first=f.api.save();
 await new Promise(resolve=>setTimeout(resolve,0));
 await assert.rejects(f.api.save(),/ainda está em andamento/);
 assert.equal(called,1);
 release();assert.equal(await first,true);
 assert.equal(f.db.cuts.length,1);
});
test('ID existente com modelo diferente não pode ser sobrescrito',async()=>{
 const f=setup(),target=f.api.modelRows()[0],id=410000000000000+Number((String(target.orderId)+String(target.productId)).replace(/\D/g,'').slice(-12));
 f.records.set(String(id),{id,orderId:999,productId:77,cutterId:9,plannedCutDate:'2026-11-18',pieces:10});
 await assert.rejects(f.api.save(),/ID de corte já existe/);
 assert.equal(f.calls.length,0);
 assert.equal(f.records.get(String(id)).orderId,999);
});

test('resposta de rede perdida após gravação: segunda tentativa apenas relê o mesmo corte',async()=>{
 const f=setup(),ids=[];let writes=0;
 f.context.hlgbRecordSaveWithRetry=async(module,id,row)=>{
   ids.push(id);writes++;f.records.set(id,structuredClone(row));
   throw new Error('Conexão interrompida após gravação no servidor');
 };
 await assert.rejects(f.api.save(),/Conexão interrompida/);
 assert.equal(f.db.cuts.length,0,'não exibir confirmação local sem releitura');
 assert.equal(f.api.diagnostic().pendingDraftCount,1);
 const second=await f.api.save();
 assert.equal(second,true,'depois de reconectar, reler a gravação existente');
 assert.equal(writes,1,'não repetir escrita remotamente quando a primeira já chegou');
 assert.equal(f.records.size,1,'apenas um registro no servidor simulado');
 assert.equal(f.db.cuts.length,1);
 assert.equal(f.api.diagnostic().pendingDraftCount,0);
});
test('falha antes do envio conserva ID para nova tentativa após reconexão',async()=>{
 const f=setup(),ids=[];let online=false;
 f.context.hlgbRecordSaveWithRetry=async(module,id,row)=>{
   ids.push(id);
   if(!online)throw new Error('Sem conexão');
   f.records.set(id,structuredClone(row));return {applied:true,data:row};
 };
 await assert.rejects(f.api.save(),/Sem conexão/);
 assert.equal(f.db.cuts.length,0);
 assert.equal(f.api.diagnostic().pendingDraftCount,1);
 online=true;
 assert.equal(await f.api.save(),true);
 assert.deepEqual(ids,[ids[0],ids[0]],'ID não muda após falha de rede');
 assert.equal(f.records.size,1);
 assert.equal(f.db.cuts.length,1);
});

test('duas sessões independentes partilham o mesmo servidor sem duplicar o corte',async()=>{
 const server=new Map();
 const first=setup(server),second=setup(server);
 assert.notEqual(first.db,second.db,'cada navegador deve manter seu próprio estado local');
 assert.equal(first.db.cuts.length,0);
 assert.equal(second.db.cuts.length,0);
 assert.equal(await first.api.save(),true);
 assert.equal(first.calls.length,1);
 assert.equal(server.size,1);
 const id=[...server.keys()][0];
 assert.equal(first.db.cuts.length,1);
 assert.equal(second.db.cuts.length,0,'a segunda sessão não deve receber confirmação local imaginária');
 assert.equal(await second.api.save(),true);
 assert.equal(second.calls.length,0,'a segunda sessão relê o registro remoto e não repete a gravação');
 assert.equal(server.size,1,'um modelo, um registro persistido');
 assert.equal(second.db.cuts.length,1);
 assert.equal(String(second.db.cuts[0].id),String(id));
 assert.equal(second.api.diagnostic().pendingDraftCount,0);
});
test('segunda sessão não pode sobrescrever um corte divergente já confirmado',async()=>{
 const server=new Map(),first=setup(server),second=setup(server);
 assert.equal(await first.api.save(),true);
 const before=structuredClone([...server.values()][0]);
 second.fields.hlgbCutterPlannerDate.value='2026-11-25';
 await assert.rejects(second.api.save(),/ID de corte já existe com dados diferentes/);
 assert.equal(second.calls.length,0,'não sobrescrever em caso de conflito');
 assert.equal(server.size,1);
 assert.deepEqual([...server.values()][0],before);
 assert.equal(second.db.cuts.length,0);
});
