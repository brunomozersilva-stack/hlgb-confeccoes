'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const moduleSrc=fs.readFileSync('hlgb-modules/producao/cortadores-grade-core-v9622.js','utf8');
const plannerSrc=fs.readFileSync('release-cutter-planner.js','utf8');
const loader=fs.readFileSync('app-stable3.html','utf8');
function fixture(){
 return {cuts:[{id:'parent',orderId:'a',productId:null,status:'Planejado',pieces:13}],
  orders:[{id:'a',client:'Lojista',status:'Pendente',grade:[{productId:'p',color:'Preto',size:'P',qty:5},{productId:'p',color:'Rubi',size:'M',qty:3},{productId:'q',color:'Preto',size:'G',qty:5}]},
   {id:'b',client:'Cliente',status:'Pendente',grade:[{productId:'r',color:'Branco',size:'GG',qty:10}]}],
  products:[{id:'p',name:'Camisola'},{id:'q',name:'Calcinha'},{id:'r',name:'Robe'}],cutters:[{id:'c',name:'Cortador'}]};
}
function run(mode,db=fixture()){
 const ctx={console:{warn(){},info(){},log(){}},db,document:{getElementById:()=>null},setTimeout:()=>0,
  window:{renderCutters(){}},displayOrderNumber:o=>o.orderNumber||o.id};
 vm.createContext(ctx);
 if(mode==='core')vm.runInContext(moduleSrc,ctx);
 if(mode==='broken')ctx.window.HLGB_CUTTER_PLANNER_CORE_9622={
  modelGrade(){throw Error('module missing')},modelPieces(){throw Error('module missing')},
  modelIds(){throw Error('module missing')},modelAlreadyCut(){throw Error('module missing')}};
 vm.runInContext(plannerSrc,ctx);
 return ctx.window.hlgbCutterPlanner;
}
const normalize=xs=>JSON.parse(JSON.stringify(xs.map(x=>({key:x.key,productId:x.productId,pieces:x.pieces,
 grade:x.grade,cutId:x.cut?.id||null,date:x.date}))));
test('loader liga módulo antes do planner exatamente uma vez',()=>{
 const a=loader.indexOf("'hlgb-modules/producao/cortadores-grade-core-v9622.js'");
 const b=loader.indexOf("'release-cutter-planner.js'");
 assert.ok(a>=0&&b>a);assert.equal(loader.split('cortadores-grade-core-v9622.js').length-1,1);
 assert.doesNotThrow(()=>new vm.Script(moduleSrc));assert.doesNotThrow(()=>new vm.Script(plannerSrc));
});
test('módulo puro: modelos, cores, quantidades e finalização por produto',()=>{
 const c={window:{}};vm.createContext(c);vm.runInContext(moduleSrc,c);
 const api=c.window.HLGB_CUTTER_PLANNER_CORE_9622,db=fixture(),order=db.orders[0];
 assert.equal(api.modelIds(order).join(','),'p,q');
 assert.equal(api.modelGrade(order,'p').length,2);
 assert.equal(api.modelPieces(order,'p'),8);
 assert.equal(api.modelPieces(order,'q'),5);
 assert.equal(api.modelAlreadyCut(order,'p',db.cuts),false);
 assert.equal(api.modelAlreadyCut(order,'p',[{orderId:'a',productId:'p',status:'Finalizado'}]),true);
 assert.equal(api.modelAlreadyCut(order,'p',[{orderId:'a',status:'Finalizado'}]),false,'multi-model aggregate must not close both');
 assert.equal(api.modelAlreadyCut(db.orders[1],'r',[{orderId:'b',status:'Finalizado'}]),true,'legacy single-model');
});
test('planner completo é igual com módulo, sem módulo e com módulo defeituoso',()=>{
 const base=normalize(run('absent').modelRows());
 assert.equal(base.length,3);
 assert.deepEqual(normalize(run('core').modelRows()),base);
 assert.deepEqual(normalize(run('broken').modelRows()),base);
});
test('corte finalizado de um modelo mantém segundo modelo disponível',()=>{
 const db=fixture();db.cuts.push({id:'cutp',orderId:'a',productId:'p',status:'Finalizado'});
 const rows=normalize(run('core',db).modelRows());
 assert.deepEqual(rows.filter(x=>x.key.startsWith('a|')).map(x=>x.productId),['q']);
});
test('filtros e pesquisa por cliente preservados',()=>{
 const base=run('absent'),active=run('core');
 assert.equal(active.matches('lojista').length,base.matches('lojista').length);
 assert.equal(active.matches('camisola').length,base.matches('camisola').length);
 assert.equal(active.orderSearchRows('cliente').length,base.orderSearchRows('cliente').length);
});
test('núcleo de grade não modifica pedido, corte ou produto',()=>{
 const db=fixture(),before=JSON.stringify(db);const planner=run('core',db);
 planner.modelRows();planner.matches('rubi');planner.orderSearchRows('lojista');
 assert.equal(JSON.stringify(db),before);
});
test('núcleo não toca nuvem, IndexedDB nem WAL',()=>{
 assert.doesNotMatch(moduleSrc,/\b(?:fetch|cloudRequest|indexedDB|localStorage|persistDb|saveRecord|hlgbRecordSaveWithRetry)\b/);
});
