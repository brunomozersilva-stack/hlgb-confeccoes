'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const proof=require('../hlgb-modules/verify-main-inline-extraction-v9607.cjs');
const original=fs.readFileSync(path.join(root,proof.fixture),'utf8');
const moduleCode=fs.readFileSync(path.join(root,proof.external),'utf8');
const copy=x=>JSON.parse(JSON.stringify(x));
function scenario(data,code){
 const db=copy(data),calls={save:0,pending:0,queue:0,timers:0,remote:0};
 const mockMath=Object.create(Math);mockMath.random=()=>0.12345;
 const FixedDate=class extends Date {static now(){return 1777000000000}};
 const ctx={db,Math:mockMath,Date:FixedDate,Map,Set,Number,String,Array,Object,JSON,Promise,
  console:{info(){},warn(){},error(){}},
  setTimeout(){calls.timers++;return 1},
  localSaveOnly(){calls.save++},
  hlgbRecordPendingStore(){calls.pending++},
  hlgbQueueNormalizedSync(){calls.queue++},
  cloudRequest(){calls.remote++;throw Error('Unexpected cloud request in parity fixture')},
  isoDate:()=> '2026-11-19'};
 ctx.window=ctx;
 vm.createContext(ctx);vm.runInContext(code,ctx,{timeout:1000});
 assert.equal(typeof ctx.syncFinalizedCutsToProduction,'function');
 assert.equal(ctx.hlgbSyncFinalizedCutsToProductionV9240,ctx.syncFinalizedCutsToProduction);
 const changed=ctx.syncFinalizedCutsToProduction();
 return {changed,db:copy(db),calls};
}
const base={products:[{id:'p1',name:'Conjunto'},{id:'p2',name:'Short Doll'}],
 orders:[{id:'o1',grade:[{productId:'p1',qty:100}]}],
 cuts:[{id:'c1',orderId:'o1',productId:'p1',status:'Finalizado',
  actualCutGrade:[{productId:'p1',qty:80}],originalGrade:[{productId:'p1',qty:100}],pieces:100,finishedAt:'2026-11-19'}],
 production:[]};
const scenarios=[
 {name:'no cuts',data:{...base,cuts:[]}},
 {name:'not finalized',data:{...base,cuts:[{...base.cuts[0],status:'Planejado'}]}},
 {name:'one finished product',data:base},
 {name:'free planned must adjust',data:{...base,production:[{id:'pr1',cutId:'c1',productId:'p1',planned:100,done:0}]}},
 {name:'assigned 30 and free 70',data:{...base,production:[{id:'pr1',cutId:'c1',productId:'p1',planned:30,done:0,productionLocationId:'factory'},{id:'pr2',cutId:'c1',productId:'p1',planned:70,done:0}]}},
 {name:'split products by effective grade',data:{...base,cuts:[{...base.cuts[0],actualCutGrade:[{productId:'p1',qty:25},{productId:'p2',qty:15}]}]}},
 {name:'multi model legacy allocated row protected',data:{...base,cuts:[{...base.cuts[0],actualCutGrade:[{productId:'p1',qty:25},{productId:'p2',qty:15}]}],production:[{id:'old1',cutId:'c1',planned:40,done:10}]}},
 {name:'removed model free row zeroed',data:{...base,production:[{id:'p1',cutId:'c1',productId:'p1',planned:100,done:0},{id:'p2',cutId:'c1',productId:'p2',planned:20,done:0,cutProductKey:'c1:p2'}]}},
 {name:'already assigned fully',data:{...base,production:[{id:'assigned',cutId:'c1',productId:'p1',planned:80,done:20,productionLocationId:'unit'}]}}
];
test('o módulo físico é idêntico byte a byte ao script original de Corte→Produção',()=>{
 assert.equal(original,moduleCode);
 assert.ok(moduleCode.includes("const V='92.40-cut-production-qty'"));
 assert.match(moduleCode,/window\.syncFinalizedCutsToProduction=syncFromEffectiveCut/);
 assert.match(moduleCode,/window\.hlgbSyncFinalizedCutsToProductionV9240=syncFromEffectiveCut/);
});
test('o HTML anterior pode ser reconstruído byte a byte após a extração',()=>{
 const report=proof.audit();assert.equal(report.ok,true,JSON.stringify(report));
 assert.equal(report.physicalInlineScripts,91);
 assert.equal(report.scriptTags,92);
 assert.equal(report.reconstructedGitSha,'db896b5fbf85392be5711ae1c44b3bf245893be4');
 assert.notEqual(report.currentGitSha,report.reconstructedGitSha);
});
test('9 cenários reais simulados preservam resultado e mutações locais exatamente',()=>{
 let verified=0;
 for(const {name,data} of scenarios){
  const unchanged=copy(data);
  const before=scenario(data,original),after=scenario(data,moduleCode);
  assert.deepEqual(after,before,'divergência de resultado: '+name);
  assert.deepEqual(data,unchanged,'nenhuma fixture pode ser alterada: '+name);
  assert.equal(before.calls.remote,0,'nenhuma requisição real ou simulada deve ser enviada');
  verified++;
 }
 assert.equal(verified,9);
});
test('gradação cortada autoritativa e produção atribuída respeitam quantidade corrigida',()=>{
 const one=scenario(scenarios[2].data,moduleCode);
 assert.equal(one.db.production.length,1);assert.equal(one.db.production[0].planned,80);
 const mixed=scenario(scenarios[4].data,moduleCode);
 assert.equal(mixed.db.production.find(p=>p.id==='pr1').planned,30);
 assert.equal(mixed.db.production.find(p=>p.id==='pr2').planned,50);
 const split=scenario(scenarios[5].data,moduleCode);
 assert.equal(split.db.production.length,2);
 assert.deepEqual(split.db.production.map(x=>x.planned),[25,15]);
});
test('prova de alteração acidental falha de forma fechada',()=>{
 const html=fs.readFileSync(path.join(root,'app9240.html'),'utf8');
 const changed=html.replace(proof.marker,'');
 assert.throws(()=>proof.restore(changed,moduleCode),/exactly one/);
 assert.equal(proof.sha(proof.restore(html,moduleCode)),'db896b5fbf85392be5711ae1c44b3bf245893be4');
});
