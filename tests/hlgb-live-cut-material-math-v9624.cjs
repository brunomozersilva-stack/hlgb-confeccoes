'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('release-cut-material-usage.js','utf8');
const core=fs.readFileSync('hlgb-modules/producao/corte-consumo-core-v9624.js','utf8');
const loader=fs.readFileSync('app-stable3.html','utf8');
const clone=x=>JSON.parse(JSON.stringify(x));
const FIXED='2026-11-23T15:00:00.000Z';
class FixedDate extends Date{
 constructor(...args){super(...(args.length?args:[FIXED]))}
 static now(){return Date.parse(FIXED)}
}
function fixture(){
 return {
  materials:[{id:'m1',name:'Renda',unit:'kg',price:100},{id:'m2',name:'Tule',unit:'g',price:0.15}],
  products:[{id:'p1',name:'Camisola',materials:[]},{id:'p2',name:'Calcinha',materials:[]}],
  cuts:[
   {id:'cut1',productId:'p1',pieces:100,status:'Finalizado',finishedAt:'2026-11-01',materialUsage:[
    {materialId:'m1',name:'Renda',weight:2,unit:'kg'},
    {materialId:'m2',name:'Tule',weight:500,unit:'g'}],
    cutExtraYield:{description:'Aproveitamento',qty:8,saleUnitPrice:3.5,costUnitPrice:1.1}},
   {id:'cut2',productId:'p1',pieces:50,status:'Finalizado',finishedAt:'2026-11-15',materialUsage:[
    {materialId:'m1',name:'Renda',weight:500,unit:'g'}]},
   {id:'cut3',productId:'p2',pieces:20,status:'Planejado',materialUsage:[
    {materialId:'m1',name:'Renda',weight:1,unit:'kg'}]}
  ]};
}
function setup(mode,db=fixture()){
 const w={renderCuts(){},renderProducts(){},renderDailyCuts(){}};
 const ctx={db,window:w,Date:FixedDate,console:{info(){},warn(){}},setTimeout(){},document:{getElementById:()=>null}};
 vm.createContext(ctx);
 if(mode==='core')vm.runInContext(core,ctx);
 if(mode==='broken')w.HLGB_CUT_MATERIAL_MATH_CORE_9624={
  grams(){throw Error('failed')},kg(){throw Error('failed')},usageStats(){throw Error('failed')},extraProfit(){throw Error('failed')}
 };
 vm.runInContext(source,ctx);
 return {api:w.hlgbCutMaterialUsage,w,db};
}
test('script novo tem ordem anterior ao controlador comercial e não se repete',()=>{
 const name="'hlgb-modules/producao/corte-consumo-core-v9624.js'";
 assert.equal(loader.split(name).length,2);
 assert.equal(loader.indexOf(name)+name.length+1,loader.indexOf("'release-cut-material-usage.js'"));
 assert.doesNotThrow(()=>new vm.Script(source));assert.doesNotThrow(()=>new vm.Script(core));
});
test('cálculos de material: equivalência em quilos, gramas e unidades antigas',()=>{
 const base=setup('legacy').api,active=setup('core').api,broken=setup('broken').api;
 let count=0;
 for(const unit of ['kg','KG','g','grama','gramas','gramás','KG  ','lb','',null,'KG ','GrAmAs']){
  for(const weight of [-2,0,0.0002,1.5,17,230,'10,25','7.5','0',null,undefined]){
   for(const p of [0,1,100,'12',-7]){
    const u={materialId:'m1',weight,unit};const e=clone(base.usageStats(p,u));
    assert.deepEqual(clone(active.usageStats(p,u)),e);
    assert.deepEqual(clone(broken.usageStats(p,u)),e);
    assert.equal(active.grams(weight,unit),base.grams(weight,unit));
    assert.equal(broken.kg(weight,unit),base.kg(weight,unit));
    count++;
   }
  }
 }
 assert.equal(count,660);
});
test('preços de cadastro e preços manuais: preservar precedência e valores zero',()=>{
 const legacy=setup('legacy').api,active=setup('core').api,broken=setup('broken').api;
 for(const data of [
  {materialId:'m1',weight:2,unit:'kg'},
  {materialId:'m1',weight:2,unit:'kg',price:75},
  {materialId:'m1',weight:2,unit:'kg',price:0},
  {materialId:'m2',weight:600,unit:'g'},
  {materialId:'inexistente',weight:3,unit:'kg',price:0},
  {weight:2,unit:'gramas',price:9}
 ]){
  assert.deepEqual(clone(active.usageStats(100,data)),clone(legacy.usageStats(100,data)));
  assert.deepEqual(clone(broken.usageStats(100,data)),clone(legacy.usageStats(100,data)));
 }
});
test('cálculo de rendimento adicional preserva centavos, valores negativos e zero',()=>{
 const legacy=setup('legacy').api,active=setup('core').api,broken=setup('broken').api;
 for(const e of [
  {},null,{qty:1000,saleUnitPrice:3.5,costUnitPrice:1.1},
  {qty:10,saleUnitPrice:1.05,costUnitPrice:1.09},
  {qty:0,saleUnitPrice:0,costUnitPrice:0},
  {qty:-10,saleUnitPrice:5,costUnitPrice:2},
  {qty:'20',saleUnitPrice:'3.99',costUnitPrice:'1.28'}]){
  assert.deepEqual(clone(active.extraProfit(e)),clone(legacy.extraProfit(e)));
  assert.deepEqual(clone(broken.extraProfit(e)),clone(legacy.extraProfit(e)));
 }
});
test('média medida, ficha técnica e histórico de sobras são os mesmos',()=>{
 const a=setup('legacy'),b=setup('core'),c=setup('broken');
 for(const [productId] of [['p1'],['p2'],['desconhecido']]){
  assert.deepEqual(clone(b.api.avgForProduct(productId)),clone(a.api.avgForProduct(productId)));
  assert.deepEqual(clone(c.api.avgForProduct(productId)),clone(a.api.avgForProduct(productId)));
  assert.deepEqual(clone(b.api.extraHistory(productId)),clone(a.api.extraHistory(productId)));
 }
 const results=[a,b,c].map(x=>{
  x.api.syncProductMeasuredSheet('p1');
  const p=x.db.products.find(p=>p.id==='p1');
  x.api.syncMissingMaterialsIntoProduct(p,{pieces:100,materialUsage:[{materialId:'m1',name:'Renda',weight:2,unit:'kg'}]});
  return clone({sheet:p.cutTechnicalSheet,materials:p.materials});
 });
 assert.deepEqual(results[1],results[0]);
 assert.deepEqual(results[2],results[0]);
});
test('diagnóstico de consumo inválido é somente leitura e não promete encaixe',()=>{
 const ctx={window:{}};vm.createContext(ctx);vm.runInContext(core,ctx);
 const api=ctx.window.HLGB_CUT_MATERIAL_MATH_CORE_9624;
 const invalid=api.review(100,{materialId:'m1',weight:2,unit:'metros'},100);
 assert.equal(invalid.validUnit,false);
 assert.equal(invalid.stats.piecesPerKg,0);
 const valid=api.review(100,{materialId:'m1',weight:2,unit:'kg'},100);
 assert.equal(valid.validUnit,true);assert.equal(valid.stats.piecesPerKg,50);
 assert.equal(Object.isFrozen(valid),true);
 assert.doesNotMatch(core,/\b(?:document|indexedDB|localStorage|cloudRequest|hlgbRecordSaveWithRetry|persistDb|fetch)\b/);
});
test('consultas matemáticas não alteram banco de cortes, produtos ou materiais',()=>{
 const x=setup('core'),before=JSON.stringify(x.db);
 x.api.grams(2,'kg');
 x.api.usageStats(100,{materialId:'m1',weight:2,unit:'kg'});
 x.api.avgForProduct('p1');x.api.extraProfit({qty:40,saleUnitPrice:4,costUnitPrice:2});
 assert.equal(JSON.stringify(x.db),before);
});
