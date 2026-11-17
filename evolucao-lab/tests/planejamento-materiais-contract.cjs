'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const core=require('../operacao-integrada-core.js');
const planner=require('../modulos/planejamento-materiais-v1.js');
let n=1;
const apply=(s,type,payload={},id)=>core.apply(s,{type,payload,
 actor:'Testes fictícios',commandId:id||'MAT-TEST-'+String(n++).padStart(5,'0'),
 expectedRevision:s.revision}).state;
function configure(){
 let s=core.initial();
 s=apply(s,'material.recipe.set',{productId:'PRO-0001',materialId:'MAT-0001',
  color:'Preto',size:'P',gramsPerUnit:125,reason:'Recorte P fictício'});
 s=apply(s,'material.recipe.set',{productId:'PRO-0001',materialId:'MAT-0002',
  color:'*',size:'*',gramsPerUnit:15,reason:'Renda complementar fictícia'});
 s=apply(s,'material.recipe.set',{productId:'PRO-0001',materialId:'MAT-0002',
  color:'Rubi',size:'M',gramsPerUnit:22,reason:'Renda maior rubi M'});
 s=apply(s,'materials.plan.add',{productId:'PRO-0001',color:'Preto',size:'P',qty:100});
 s=apply(s,'materials.plan.add',{productId:'PRO-0001',color:'Rubi',size:'M',qty:100});
 s=apply(s,'materials.plan.add',{productId:'PRO-0002',color:'Preto',size:'P',qty:200});
 return s;
}
test('paleta central sem duplicidade, nomes preservados e identificadores únicos',()=>{
 let s=core.initial();
 assert.deepEqual(planner.palette(s).map(x=>x.name),['Preto','Branco','Rubi']);
 s=apply(s,'color.catalog.add',{name:'Azul-marinho'});
 assert.equal(s.colorCatalog.at(-1).id,'CLR-0004');
 assert.equal(s.colorCatalog.at(-1).name,'Azul-marinho');
 assert.equal(core.inspect(s).ok,true);
 let snapshot=JSON.stringify(s);
 for(const name of [' azul-MARINHO  ','x','!!']){
  assert.throws(()=>apply(s,'color.catalog.add',{name}),/já cadastrada|Nome de cor/);
  assert.equal(JSON.stringify(s),snapshot);
 }
 s=apply(s,'order.add',{clientId:'CLI-0001',productId:'PRO-0001',
  grade:{P:3,M:0,G:0,GG:0}});
 s=apply(s,'order.color.grade.set',{orderId:'PED-0001',color:'Azul-marinho',
  grade:{P:3,M:0,G:0,GG:0}});
 assert.equal(s.orders[0].colorGrades[0].color,'Azul-marinho');
 assert.equal(core.inspect(s).ok,true);
});
test('receita por cor/tamanho substitui base e soma aviamento sem alterar corte ou estoque',()=>{
 const s=configure(),before=JSON.stringify(s),p=planner.preview(s);
 assert.equal(p.schema,'hlgb-lab-planejamento-materiais-v1');
 assert.equal(p.scope,'producao_nova_hipotetica');
 assert.equal(p.stockWritten,false);
 assert.equal(p.purchaseCreated,false);
 assert.equal(p.lines,3);
 assert.equal(p.pieces,400);
 assert.equal(p.requiredGrams,37200);
 assert.equal(p.estimatedCostCents,121940);
 assert.equal(p.missingCostCents,43540);
 assert.deepEqual(p.products.map(x=>[x.productId,x.pieces,x.requiredGrams]),
  [['PRO-0002',200,9000],['PRO-0001',200,28200]],'lista em ordem alfabética de modelo');
 const m=p.materials.find(x=>x.materialId==='MAT-0001'),
  r=p.materials.find(x=>x.materialId==='MAT-0002');
 assert.deepEqual([m.requiredGrams,m.availableGrams,m.missingGrams,m.costCents,m.purchaseCents],
  [24500,16000,8500,68600,23800]);
 assert.deepEqual([r.requiredGrams,r.availableGrams,r.missingGrams,r.costCents,r.purchaseCents],
  [12700,8000,4700,53340,19740]);
 assert.equal(p.detail.find(x=>x.productId==='PRO-0001'&&x.color==='Preto'&&
  x.materialId==='MAT-0001').ruleId,'RCP-0001');
 assert.equal(p.detail.find(x=>x.productId==='PRO-0001'&&x.color==='Rubi'&&
  x.materialId==='MAT-0002').ruleId,'RCP-0003');
 assert.equal(s.stockLedger.length,0);
 assert.equal(s.purchaseOrders.length,0);
 assert.equal(s.finance.length,0);
 assert.equal(JSON.stringify(s),before,'previsão não escreve no documento');
 assert.equal(core.inspect(s).ok,true);
});
test('versões de receita e arquivamento mantêm histórico e recalculam faltas',()=>{
 let s=configure(),old=JSON.stringify(s),refBefore=planner.preview(s);
 assert.equal(refBefore.materials.length,2);
 s=apply(s,'material.recipe.set',{productId:'PRO-0001',materialId:'MAT-0002',
  color:'Rubi',size:'M',gramsPerUnit:25,reason:'Nova versão fictícia'});
 assert.equal(s.materialRecipeRules[2].active,false);
 assert.equal(s.materialRecipeRules[2].gramsPerUnit,22);
 assert.equal(s.materialRecipeRules[3].supersedes,'RCP-0003');
 assert.equal(s.materialRecipeRules[3].active,true);
 assert.equal(planner.preview(s).detail.find(x=>x.productId==='PRO-0001'&&
  x.color==='Rubi'&&x.materialId==='MAT-0002').gramsPerUnit,25);
 s=apply(s,'materials.plan.archive',{id:'PLN-0003',reason:'Remover este lote da previsão'});
 assert.equal(s.materialPlanLines[2].active,false);
 assert.equal(s.materialPlanLines[2].qty,200);
 assert.equal(s.materialPlanLines[2].cancelReason,'Remover este lote da previsão');
 const now=planner.preview(s);
 assert.equal(now.pieces,200);
 assert.equal(now.materials.find(x=>x.materialId==='MAT-0002').missingGrams,0);
 assert.equal(now.materials.find(x=>x.materialId==='MAT-0001').missingGrams,8500);
 assert.equal(now.missingCostCents,23800);
 assert.equal(core.inspect(s).ok,true);
 assert.notEqual(JSON.stringify(s),old);
 assert.throws(()=>apply(s,'materials.plan.archive',{id:'PLN-0003',reason:'Repetir'}),/já arquivada/);
});
test('nenhum item errado entra no cenário nem altera a revisão ou documentos anteriores',()=>{
 const s=configure(),old=JSON.stringify(s);
 const attempts=[
  ['materials.plan.add',{productId:'PRO-0001',color:'Preto',size:'P',qty:1},/já existe/],
  ['materials.plan.add',{productId:'PRO-0001',color:'Azul',size:'P',qty:1},/paleta/],
  ['materials.plan.add',{productId:'PRO-0001',color:'Preto',size:'Z',qty:1},/P, M, G ou GG/],
  ['materials.plan.add',{productId:'PRO-0001',color:'Preto',size:'GG',qty:0},/Quantidade/],
  ['material.recipe.set',{productId:'PRO-0001',materialId:'MAT-9999',
   color:'*',size:'*',gramsPerUnit:12,reason:'Erro'},/Material/],
  ['material.recipe.set',{productId:'PRO-0001',materialId:'MAT-0003',
   color:'Azul',size:'*',gramsPerUnit:12,reason:'Erro'},/paleta/],
  ['material.recipe.set',{productId:'PRO-0001',materialId:'MAT-0003',
   color:'*',size:'M',gramsPerUnit:0,reason:'Erro'},/Consumo/],
  ['material.recipe.set',{productId:'PRO-0001',materialId:'MAT-0003',
   color:'*',size:'M',gramsPerUnit:12,reason:''},/Justificativa/]
 ];
 for(const [type,payload,re] of attempts){
  assert.throws(()=>apply(s,type,payload),re);
  assert.equal(JSON.stringify(s),old);
 }
 assert.equal(core.inspect(s).ok,true);
});
test('previsão agrupa dois materiais por produto, aplica limite de estoque sem criar compra',()=>{
 let s=configure();
 s=apply(s,'materials.plan.archive',{id:'PLN-0003',reason:'Cenário sem Tammy'});
 let p=planner.preview(s);
 assert.equal(p.pieces,200);
 assert.deepEqual(p.materials.map(x=>x.materialId),['MAT-0001','MAT-0002']);
 s=apply(s,'stock.adjust',{materialId:'MAT-0001',deltaGrams:10000,
  note:'Ajuste somente de teste'});
 p=planner.preview(s);
 assert.equal(p.materials.find(x=>x.materialId==='MAT-0001').missingGrams,0);
 assert.equal(p.missingCostCents,0);
 assert.equal(s.stockLedger.length,1,'somente comando explícito de estoque cria movimento');
 assert.equal(s.purchaseOrders.length,0);
 assert.equal(core.inspect(s).ok,true);
});
test('documento anterior sem paleta migra no clone sem reutilizar CLR-0001 e sem apagar dados',()=>{
 let s=core.initial();delete s.colorCatalog;delete s.materialRecipeRules;delete s.materialPlanLines;
 delete s.ids.CLR;
 const old=JSON.stringify(s);
 assert.equal(core.inspect(s).ok,true);
 assert.equal(planner.preview(s).lines,0);
 const added=apply(s,'color.catalog.add',{name:'Verde militar'});
 assert.equal(JSON.stringify(s),old,'base anterior imutável');
 assert.equal(added.colorCatalog.length,4);
 assert.equal(added.colorCatalog.at(-1).id,'CLR-0004');
 assert.equal(added.materialPlanLines.length,0);
 assert.equal(core.inspect(added).ok,true);
});
test('Auditor detecta alteração de consumo e linhas duplicadas sem destruir documento',()=>{
 const s=configure(),original=JSON.stringify(s);
 for(const mutate of [
  x=>{x.colorCatalog[1].name='preto'},
  x=>{x.materialRecipeRules[0].gramsPerUnit=0},
  x=>{x.materialRecipeRules[0].materialId='MAT-9999'},
  x=>{x.materialPlanLines[1].qty=0},
  x=>{x.materialPlanLines[1].productId='PRO-9999'},
  x=>{x.materialPlanLines.push({...x.materialPlanLines[0],id:'PLN-9900'})}
 ]){
  const invalid=structuredClone(s);mutate(invalid);
  const copy=JSON.stringify(invalid);
  assert.equal(core.inspect(invalid).ok,false);
  assert.equal(JSON.stringify(invalid),copy);
 }
 assert.equal(JSON.stringify(s),original);
});
test('módulo puro sem rede, navegador ou armazenamento próprio',()=>{
 const src=fs.readFileSync(path.join(__dirname,'../modulos/planejamento-materiais-v1.js'),'utf8');
 assert.equal(planner.version,'1.0.0');
 for(const re of [/\bfetch\s*\(/,/\bXMLHttpRequest\b/,/\bWebSocket\b/,
  /\blocalStorage\b/,/\bindexedDB\b/,/\bsupabase\b/i,/https?:\/\//,
  /\bdocument\.cookie/,/\bwindow\.location/])
  assert.equal(re.test(src),false,String(re));
});
