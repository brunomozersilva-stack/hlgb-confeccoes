'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.join(__dirname,'..');
const source=fs.readFileSync(path.join(root,'release-cut-weight-v9579.js'),'utf8');
const core=fs.readFileSync(path.join(root,'hlgb-modules/corte/peso-core-v9605.js'),'utf8');
const copy=x=>JSON.parse(JSON.stringify(x));
const initial=()=>({id:'cut1',orderId:'pedido1',productId:'produto1',cutterId:'c1',pieces:1000,
 status:'Finalizado',finishedAt:'2026-11-12T15:00:00Z',actualCutGrade:[{productId:'produto1',size:'P',qty:100}],
 originalGrade:[{productId:'produto1',size:'P',qty:1000}],note:'Primeiro corte'});
const payload={totalKg:10,usedKg:7,wasteKg:2,note:'Rolo final'};
function setup(useCore,remoteOverride){
 const data=initial(),db={cuts:[copy(data)]},s={writes:[],reads:0,mode:'ok',pending:false,readFail:false,remote:copy(remoteOverride||data)};
 const window={db,__HLGB_AUTH_READY:true,addEventListener(){},localSaveOnly(){},renderCuts(){},renderCutterHistory9250(){},
  hlgbWalIdbGuard9536:{probe:async()=>true,ids:()=>s.pending?['cuts::cut1']:[],status:()=>({readFailed:false})},
  cloudRequest:async(url,options)=>{
   s.reads++;assert.equal(options.method,'GET');assert.match(url,/module=eq.cuts/);
   return s.readFail?[]:[{entity_id:'cut1',deleted_at:null,data:copy(s.remote)}];
  },
  hlgbRecordSaveWithRetry:async(module,id,record,deleted)=>{
   assert.equal(module,'cuts');assert.equal(id,'cut1');assert.equal(deleted,false);
   s.writes.push(copy(record));
   if(s.mode==='rejected')return {applied:false,reason:'Servidor recusou'};
   s.remote=copy(record);
   if(s.mode==='lost-ack')throw Error('Timeout após commit');
   return {applied:true};
  }};
 const ctx={window,document:{readyState:'loading',addEventListener(){}},setTimeout(){return 1},
  console:{info(){},warn(){}},Date,Math,JSON,Set,Promise,encodeURIComponent};
 vm.createContext(ctx);if(useCore)vm.runInContext(core,ctx);
 vm.runInContext(source,ctx);
 return {api:window.hlgbCutWeight9579,window,db,state:s};
}
test('núcleo isolado valida igual ao código antigo e não tem APIs de persistência',()=>{
 for(const forbidden of ['indexedDB','cloudRequest','hlgbRecordSaveWithRetry','localStorage','document.'])
  assert.equal(core.includes(forbidden),false,'core não deve acessar '+forbidden);
 const old=setup(false).api,modern=setup(true).api;
 for(const input of [
  payload,{totalKg:'1,5',usedKg:'0,5',wasteKg:'0,2',note:'  Lote 2  '},
  {totalKg:'0'},{totalKg:'-1'},{totalKg:'20001'},
  {totalKg:'abc'},{totalKg:10,usedKg:11},{totalKg:10,wasteKg:11},
  {totalKg:10,note:'x'.repeat(301)},{totalKg:10,usedKg:9.999,wasteKg:9.999}
 ]){
  function result(api){try{return {ok:true,value:api.validate(input)}}catch(e){return {ok:false,error:e.message}}}
  assert.equal(JSON.stringify(result(modern)),JSON.stringify(result(old)));
 }
});
for(const useCore of [false,true]){
 const mode=useCore?'módulo novo':'fallback antigo';
 test(mode+': gravação comprovada conserva status, grade e um só evento',async()=>{
  const h=setup(useCore),snapshot=copy(h.db.cuts[0]);
  const out=await h.api.save('cut1',payload);
  assert.equal(out.ok,true);assert.equal(h.state.writes.length,1);
  const row=h.db.cuts[0];
  assert.equal(row.status,snapshot.status);assert.equal(row.finishedAt,snapshot.finishedAt);
  assert.deepEqual(row.actualCutGrade,snapshot.actualCutGrade);
  assert.equal(row.cutWeightEventsV9579.length,1);
  assert.equal(h.api.status().pendingWeightDrafts,0);
 });
 test(mode+': ACK perdido após gravação recupera sem uma segunda escrita',async()=>{
  const h=setup(useCore);h.state.mode='lost-ack';
  await assert.rejects(()=>h.api.save('cut1',payload),/Timeout após commit/);
  assert.equal(h.api.status().pendingWeightDrafts,1);assert.equal(h.db.cuts[0].cutWeightEventsV9579,undefined);
  h.state.mode='ok';
  const out=await h.api.save('cut1',payload);
  assert.equal(out.recovered,true);assert.equal(h.state.writes.length,1);
  assert.equal(h.db.cuts[0].cutWeightEventsV9579.length,1);assert.equal(h.api.status().recovered,1);
 });
 test(mode+': rejeição sem gravação reenvia o mesmo ID sem criar evento novo',async()=>{
  const h=setup(useCore);h.state.mode='rejected';
  await assert.rejects(()=>h.api.save('cut1',payload),/Servidor recusou/);
  h.state.mode='ok';
  await h.api.save('cut1',payload);
  assert.equal(h.state.writes.length,2);
  assert.equal(h.state.writes[0].cutWeightEventsV9579[0].id,h.state.writes[1].cutWeightEventsV9579[0].id);
  assert.equal(h.db.cuts[0].cutWeightEventsV9579.length,1);
 });
 test(mode+': mudança de valores incertos bloqueia nova escrita',async()=>{
  const h=setup(useCore);h.state.mode='lost-ack';
  await assert.rejects(()=>h.api.save('cut1',payload),/Timeout após commit/);
  h.state.mode='ok';
  await assert.rejects(()=>h.api.save('cut1',{...payload,totalKg:11}),/mesmos valores/);
  assert.equal(h.state.writes.length,1);
 });
 test(mode+': divergência remota e recarregamento do navegador bloqueiam sobrescrita',async()=>{
  const other=setup(useCore);other.state.remote.note='Alterado em outro computador';
  await assert.rejects(()=>other.api.save('cut1',payload),/versão do corte mudou/);
  assert.equal(other.state.writes.length,0);
  const h=setup(useCore);h.state.mode='lost-ack';
  await assert.rejects(()=>h.api.save('cut1',payload),/Timeout após commit/);
  const afterReload=setup(useCore,h.state.remote);
  await assert.rejects(()=>afterReload.api.save('cut1',{...payload,totalKg:11}),/versão do corte mudou/);
  assert.equal(afterReload.state.writes.length,0);
 });
 test(mode+': WAL pendente e leitura de nuvem indisponível não escrevem',async()=>{
  const h=setup(useCore);h.state.pending=true;
  await assert.rejects(()=>h.api.save('cut1',payload),/pendente/);
  assert.equal(h.state.writes.length,0);
  h.state.pending=false;h.state.readFail=true;
  await assert.rejects(()=>h.api.save('cut1',payload),/conferir o corte na nuvem/);
  assert.equal(h.state.writes.length,0);
 });
 test(mode+': concorrência de cliques não duplica evento',async()=>{
  const h=setup(useCore);
  const first=h.api.save('cut1',payload);
  await assert.rejects(()=>h.api.save('cut1',payload),/em andamento/);
  assert.equal((await first).ok,true);
  assert.equal(h.state.writes.length,1);
 });
}
