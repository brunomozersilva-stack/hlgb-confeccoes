'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const core=fs.readFileSync('hlgb-modules/producao/corte-pesagem-core-v9623.js','utf8');
const legacy=fs.readFileSync('release-cut-weight-v9579.js','utf8');
const loader=fs.readFileSync('app-stable3.html','utf8');
const clone=x=>JSON.parse(JSON.stringify(x));
function setup(mode='baseline'){
 const db={cuts:[{id:'c1',orderId:'o1',productId:'p1',status:'Finalizado',finishedAt:'2026-11-20T12:00:00Z',pieces:500,originalGrade:[{size:'P',qty:200}]}]};
 const calls=[],remote=new Map(),window={db,__HLGB_AUTH_READY:true,addEventListener(){},
  hlgbWalIdbGuard9536:{probe:async()=>true,ids:()=>[],status:()=>({readFailed:false})},
  hlgbRecordPendingIdentitySet9535:()=>[],
  cloudRequest:async path=>{
   const m=path.match(/entity_id=eq.([^&]+)/);const id=m?decodeURIComponent(m[1]):'';
   return remote.has(id)?[{entity_id:id,data:clone(remote.get(id)),deleted_at:null}]:[];
  },
  hlgbRecordSaveWithRetry:async (module,id,row,deleted)=>{
   calls.push({module,id,deleted,row:clone(row)});
   remote.set(id,clone(row));return {applied:true,data:clone(row)};
  },
  localSaveOnly(){},renderCuts(){},renderCutterHistory9250(){}
 };
 const context={window,console:{log(){},info(){},warn(){}},document:{readyState:'loading',addEventListener(){}},
  Date,Math,JSON,Set,Promise,setTimeout(){},encodeURIComponent};
 vm.createContext(context);
 if(mode==='core')vm.runInContext(core,context);
 if(mode==='broken')window.HLGB_CUT_WEIGHT_CORE_9623={validate(){throw Error('module failed')}};
 vm.runInContext(legacy,context);
 return {api:window.hlgbCutWeight9579,window,db,calls,remote};
}
function outcome(api,p){
 try{return {ok:true,payload:clone(api.validate(p))}}catch(e){return {ok:false,error:String(e.message)}}
}
test('loader possui 162 scripts, core imediatamente antes do módulo de pesagem',()=>{
 const a="'hlgb-modules/producao/corte-pesagem-core-v9623.js'",b="'release-cut-weight-v9579.js'";
 assert.equal(loader.split(a).length,2);
 assert.ok(loader.indexOf(a)<loader.indexOf(b));
 assert.doesNotThrow(()=>new vm.Script(core));
 assert.doesNotThrow(()=>new vm.Script(legacy));
});
test('validação com core é idêntica a fallback para centenas de entradas válidas',()=>{
 const base=setup('baseline').api,active=setup('core').api,broken=setup('broken').api;
 let count=0;
 for(let i=1;i<=180;i++){
  const total=(i/3+1).toFixed(3),used=(i/4).toFixed(3),waste=(i/9).toFixed(3);
  for(const input of [
   {totalKg:total,usedKg:used,wasteKg:waste,note:'Rolo '+i},
   {totalKg:total.replace('.',','),usedKg:used.replace('.',','),wasteKg:waste.replace('.',','),note:'  Friburgo  '},
   {totalKg:Number(total),usedKg:Number(used),wasteKg:Number(waste),note:''}
  ]){
   const expected=outcome(base,input);
   assert.deepEqual(outcome(active,input),expected);
   assert.deepEqual(outcome(broken,input),expected);
   count++;
  }
 }
 assert.equal(count,540);
});
test('erros, campos vazios, kg inválidos e limite de observação mantêm mensagens',()=>{
 const base=setup('baseline').api,active=setup('core').api,broken=setup('broken').api;
 const scenarios=[undefined,null,{}, {totalKg:''},{totalKg:0},{totalKg:-1},{totalKg:20001},
  {totalKg:1,usedKg:-0.1},{totalKg:1,wasteKg:-0.1},{totalKg:1,usedKg:2},
  {totalKg:1,wasteKg:2},{totalKg:1,note:'X'.repeat(301)},
  {totalKg:'1,125',usedKg:'0,5',wasteKg:'0,125'},
  {totalKg:'abc'},{totalKg:1,usedKg:'N/A'},{totalKg:1,wasteKg:'N/A'}];
 for(const input of scenarios){
  const expected=outcome(base,input);
  assert.deepEqual(outcome(active,input),expected,'core divergiu: '+JSON.stringify(input));
  assert.deepEqual(outcome(broken,input),expected,'fallback divergiu: '+JSON.stringify(input));
 }
});
test('métricas read-only informam rendimento sem estimar baixa de estoque',()=>{
 const c={window:{}};vm.createContext(c);vm.runInContext(core,c);
 const api=c.window.HLGB_CUT_WEIGHT_CORE_9623,stats=api.stats({totalKg:5,usedKg:4,wasteKg:0.5},100);
 assert.equal(stats.usedPercent,80);assert.equal(stats.wastePercent,10);
 assert.equal(stats.piecesPerKg,20);assert.equal(stats.comparableYield,true);
 assert.equal(api.stats({totalKg:5},null).piecesPerKg,null);
 assert.ok(Object.isFrozen(stats));
});
test('validação não grava, não modifica dados nem chama sincronização',()=>{
 const x=setup('core'),old=JSON.stringify(x.db);const input=Object.freeze({totalKg:10,usedKg:6,wasteKg:1,note:'Peso'});
 assert.equal(x.api.validate(input).totalKg,10);
 assert.equal(JSON.stringify(x.db),old);assert.equal(x.calls.length,0);
 assert.doesNotMatch(core,/\b(?:document|indexedDB|localStorage|cloudRequest|hlgbRecordSaveWithRetry|persistDb|fetch)\b/);
});
test('módulo ativo mantém gravação, histórico, ACK e status do corte',async()=>{
 const x=setup('core'),before=clone(x.db.cuts[0]);
 const result=await x.api.save('c1',{totalKg:8,usedKg:6,wasteKg:1,note:'Final'});
 assert.equal(result.ok,true);assert.equal(x.calls.length,1);
 assert.equal(x.calls[0].module,'cuts');assert.equal(x.calls[0].deleted,false);
 assert.equal(x.db.cuts[0].status,before.status);
 assert.equal(x.db.cuts[0].finishedAt,before.finishedAt);
 assert.deepEqual(x.db.cuts[0].originalGrade,before.originalGrade);
 assert.equal(x.db.cuts[0].cutWeightEventsV9579.length,1);
 assert.equal(x.api.status().confirmed,1);
});
test('pendência WAL bloqueia gravação mesmo com validador novo',async()=>{
 const x=setup('core'),before=JSON.stringify(x.db);
 x.window.hlgbWalIdbGuard9536.ids=()=>['cuts::c1'];
 await assert.rejects(()=>x.api.save('c1',{totalKg:8}),/pendente/);
 assert.equal(x.calls.length,0);assert.equal(JSON.stringify(x.db),before);
});
