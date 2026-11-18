'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const library=require('../hlgb-modules/corte/grade-modelo-v9602.js');
const plannerSrc=fs.readFileSync(path.join(root,'release-cutter-planner.js'),'utf8');
const loader=fs.readFileSync(path.join(root,'app-stable3.html'),'utf8');
const fixtures=[
 null,{grade:[]},{grade:[{productId:1,color:'Preto',size:'P',qty:4},{productId:'1',color:'Rubi',size:'M',qty:3},{productId:2,color:'Branco',size:'G',qty:9}]},
 {grade:[{productId:1,qty:0},{productId:1,qty:-5},{productId:1,qty:2.5},{productId:'',qty:4}]},
 {grade:[{productId:0,qty:4},{productId:null,qty:2},{productId:44,qty:'8'},{productId:44,qty:'falso'}]},
 {grade:[{productId:1,qty:2},{productId:1,qty:2},{productId:2,qty:4}]}
];
function oldGrade(o,pid){
 const sid=v=>String(v??''),q=v=>Math.max(0,Number(v)||0);
 return (Array.isArray(o?.grade)?o.grade:[]).filter(g=>sid(g?.productId)===sid(pid)&&q(g?.qty)>0);
}
function oldIds(o){
 const sid=v=>String(v??'');
 return [...new Set((Array.isArray(o?.grade)?o.grade:[]).map(g=>sid(g?.productId)).filter(Boolean))];
}
function planner(withHelper){
 const context={window:{},db:{orders:[],cuts:[],products:[],cutters:[]},document:{getElementById:()=>null},
  console:{info(){},warn(){}},setTimeout(){return 0}};
 vm.createContext(context);
 if(withHelper)vm.runInContext(fs.readFileSync(path.join(root,'hlgb-modules/corte/grade-modelo-v9602.js'),'utf8'),context);
 vm.runInContext(plannerSrc,context);
 return context.window.hlgbCutterPlanner;
}
test('O módulo puro mantém exatamente a grade, quantidades e IDs legados',()=>{
 for(const o of fixtures){
  for(const pid of [1,'1',2,0,null,44,'']){
   const expected=oldGrade(o,pid);
   assert.equal(JSON.stringify(library.modelGrade(o,pid)),JSON.stringify(expected));
   assert.equal(library.modelPieces(o,pid),expected.reduce((a,r)=>a+Math.max(0,Number(r.qty)||0),0));
  }
  assert.equal(JSON.stringify(library.modelIds(o)),JSON.stringify(oldIds(o)));
 }
});
test('O Cortador usa a extração e mantém fallback idêntico quando o módulo não carrega',()=>{
 const a=planner(true),b=planner(false);
 for(const o of fixtures){
  for(const pid of [1,2,0,null,44]){
   assert.equal(JSON.stringify(a.modelGrade(o,pid)),JSON.stringify(b.modelGrade(o,pid)));
   assert.equal(a.modelPieces(o,pid),b.modelPieces(o,pid));
  }
  assert.equal(JSON.stringify(a.modelIds(o)),JSON.stringify(b.modelIds(o)));
 }
});
test('O módulo carrega antes da programação e NÃO altera a base de dados',()=>{
 const addon="hlgb-modules/corte/grade-modelo-v9602.js";
 const anchor='const moduleGroups=',start=loader.indexOf(anchor);
 const end=loader.indexOf(';const files=moduleGroups.flatMap(group=>group.files)',start);
 assert.ok(start>0&&end>start,'carregador modular deve expor a ordem no próprio HTML');
 const groups=JSON.parse(loader.slice(start+anchor.length,end));
 const scripts=groups.flatMap(group=>group.files);
 const p=scripts.indexOf(addon),q=scripts.indexOf('release-cutter-planner.js');
 assert.ok(p>=0&&q===p+1,'O módulo de grade deve carregar imediatamente antes do Cortador');
 assert.equal(scripts.filter(x=>x===addon).length,1,'Carregar apenas uma vez');
 const manifest=JSON.parse(fs.readFileSync(path.join(root,'hlgb-modules/ownership-v9600.json'),'utf8'));
 assert.equal(scripts.length,manifest.releaseScripts.length,'A quantidade deve acompanhar exatamente o catálogo modular');
 assert.equal(JSON.stringify(scripts),JSON.stringify(manifest.releaseScripts),'A ordem também deve ser idêntica');
 const code=fs.readFileSync(path.join(root,addon),'utf8');
 for(const prohibited of ['cloudRequest','indexedDB','localStorage','hlgbRecordSaveWithRetry','fetch('])
  assert.equal(code.includes(prohibited),false,'Módulo não executa operações externas: '+prohibited);
});
