'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),
 fs=require('node:fs'),path=require('node:path');
const core=require('../operacao-integrada-core.js'),
 planner=require('../modulos/planejamento-materiais-v1.js'),
 bom=require('../modulos/corte-bom-v1.js'),
 auditor=require('../modulos/observabilidade-v2.js');
let counter=1;
function cmd(state,type,payload={},id){
 const response=core.apply(state,{type,payload,actor:'Corte BOM de homologação',
  commandId:id||'BOM-TEST-'+String(counter++).padStart(5,'0'),
  expectedRevision:state.revision});
 assert.equal(core.inspect(response.state).ok,true,'integridade após '+type);
 return response.state;
}
function base(){
 let s=core.initial();
 s=cmd(s,'order.add',{clientId:'CLI-0001',productId:'PRO-0001',
  grade:{P:5,M:3,G:0,GG:0}});
 s=cmd(s,'order.color.grade.set',{orderId:'PED-0001',color:'Preto',
  grade:{P:4,M:2,G:0,GG:0}});
 s=cmd(s,'order.color.grade.set',{orderId:'PED-0001',color:'Rubi',
  grade:{P:1,M:1,G:0,GG:0}});
 s=cmd(s,'material.recipe.set',{productId:'PRO-0001',materialId:'MAT-0002',
  color:'*',size:'*',gramsPerUnit:20,reason:'Renda adicional do laboratório'});
 return s;
}
const p=(overrides={})=>({orderId:'PED-0001',color:'Preto',size:'P',
 qty:2,workMode:'interno',cutterOne:'Ana Cortadora',cutterTwo:'Beto Cortador',
 spreader:'Carla Enfestadora',signatureOne:'Ana Cortadora',
 signatureTwo:'Beto Cortador',reason:'Lote de teste fictício',
 scrapByMaterial:{'MAT-0001':40,'MAT-0002':10},...overrides});
test('prévia multi-material calcula receita com lixo sem escrever em pedido/estoque',()=>{
 const s=base(),old=JSON.stringify(s),a=bom.preview(s,p(),planner);
 assert.equal(a.schema,'hlgb-lab-corte-bom-preview-v1');
 assert.deepEqual(a.materials.map(x=>[x.materialId,x.requiredGrams,x.scrapGrams,x.totalGrams]),
  [['MAT-0001',240,40,280],['MAT-0002',40,10,50]]);
 assert.equal(a.canExecute,true);
 assert.equal(a.totalGrams,330);
 assert.equal(a.stockWritten,false);
 assert.equal(a.estimatedCostCents,994);
 assert.equal(JSON.stringify(s),old);
 assert.equal(s.stockLedger.length,0);
 assert.equal(s.orders[0].cut.P,0);
});
test('uma execução cria exatamente um evento, uma ficha e uma baixa por componente',()=>{
 let s=base(),old=JSON.stringify(s),rev=s.revision;
 s=cmd(s,'cut.bom.execute',p(),'BOM-DUAS-BAIXAS');
 assert.equal(s.revision,rev+1);
 assert.equal(s.log.at(-1).type,'cut.bom.execute');
 assert.equal(s.bomCutRuns.length,1);
 const lot=s.bomCutRuns[0];
 assert.equal(lot.id,'BOM-0001');
 assert.equal(lot.commandId,'BOM-DUAS-BAIXAS');
 assert.equal(lot.materials.length,2);
 assert.equal(lot.materials[0].ruleId,'ficha-basica');
 assert.equal(lot.materials[1].ruleId,'RCP-0001');
 assert.equal(s.orders[0].cut.P,2);
 assert.deepEqual(s.stockLedger.map(x=>[x.materialId,x.deltaGrams,x.type,x.bomCutId]),
  [['MAT-0001',-280,'corte-bom','BOM-0001'],['MAT-0002',-50,'corte-bom','BOM-0001']]);
 assert.equal(s.materials[0].stockGrams,16000-280);
 assert.equal(s.materials[1].stockGrams,8000-50);
 assert.equal(s.purchaseOrders.length,0,'corte não cria compra fantasma');
 assert.equal(s.finance.length,1,'conta do pedido original preservada');
 assert.equal(core.inspect(s).ok,true);
 assert.equal(auditor.analyze(s).findings.length,0);
 assert.notEqual(JSON.stringify(s),old);
});
test('bloqueio de segunda baixa do mesmo lote e incompatibilidade com Corte legado',()=>{
 let s=base();
 s=cmd(s,'cut.bom.execute',p({qty:4,scrapByMaterial:{}}));
 const snap=JSON.stringify(s);
 for(const [type,payload,re] of [
  ['cut.bom.execute',p({qty:1}),/excede a grade desta cor/],
  ['cut.record',{orderId:'PED-0001',size:'M',qty:1},/não repita corte/],
  ['cut.plan',{orderId:'PED-0001',grade:{P:0,M:1,G:0,GG:0},
   workMode:'interno',cutterOne:'Ana',cutterTwo:'Beto',spreader:'Carla'},/não misture/]
 ]){
  assert.throws(()=>cmd(s,type,payload),re);
  assert.equal(JSON.stringify(s),snap,'falha não escreve baixa ou revisão');
 }
 s=cmd(s,'cut.bom.execute',p({color:'Rubi',qty:1,scrapByMaterial:{}}));
 assert.equal(s.bomCutRuns.length,2);
 assert.equal(s.orders[0].cut.P,5);
 assert.equal(core.inspect(s).ok,true);
});
test('falta de renda reprova lote inteiro e mantém malha intacta',()=>{
 let s=base();
 s=cmd(s,'stock.adjust',{materialId:'MAT-0002',deltaGrams:-7990,
  note:'Deixar só 10g fictícios'});
 const preview=bom.preview(s,p(),planner);
 assert.equal(preview.canExecute,false);
 assert.equal(preview.materials.find(x=>x.materialId==='MAT-0002').afterGrams,-40);
 const old=JSON.stringify(s);
 assert.throws(()=>cmd(s,'cut.bom.execute',p()),/Estoque insuficiente/);
 assert.equal(JSON.stringify(s),old);
 assert.equal(s.bomCutRuns.length,0);
 assert.equal(s.stockLedger.filter(x=>x.type==='corte-bom').length,0);
 assert.equal(core.inspect(s).ok,true);
});
test('receita futura não modifica snapshot nem pagamento/corte do lote anterior',()=>{
 let s=base();
 s=cmd(s,'cut.bom.execute',p({qty:1,scrapByMaterial:{'MAT-0001':10}}));
 const past=JSON.stringify(s.bomCutRuns[0]),paidTitle=JSON.stringify(s.finance[0]);
 s=cmd(s,'material.recipe.set',{productId:'PRO-0001',materialId:'MAT-0002',
  color:'Preto',size:'P',gramsPerUnit:50,reason:'Nova renda por cor/tamanho'});
 s=cmd(s,'cut.bom.execute',p({qty:2,scrapByMaterial:{}}));
 assert.equal(JSON.stringify(s.bomCutRuns[0]),past,'primeiro lote congelado');
 assert.equal(s.bomCutRuns[1].materials.find(x=>x.materialId==='MAT-0002').requiredGrams,100);
 assert.equal(JSON.stringify(s.finance[0]),paidTitle);
 assert.equal(core.inspect(s).ok,true);
 assert.equal(auditor.analyze(s).findings.length,0);
});
test('histórico de corte tradicional impede misturar e repetir insumo',()=>{
 let s=base();
 s=cmd(s,'cut.record',{orderId:'PED-0001',size:'P',qty:1});
 const before=JSON.stringify(s);
 assert.throws(()=>cmd(s,'cut.bom.execute',p()),/rotina anterior/);
 assert.equal(JSON.stringify(s),before);
 assert.equal(s.stockLedger.length,1);
 let t=base();
 t=cmd(t,'cut.plan',{orderId:'PED-0001',grade:{P:1,M:0,G:0,GG:0},
  workMode:'externo',cutterOne:'Ana',cutterTwo:'Beto',spreader:'Carla'});
 const past=JSON.stringify(t);
 assert.throws(()=>cmd(t,'cut.bom.execute',p()),/folha de corte aberta/);
 assert.equal(JSON.stringify(t),past);
});
test('cortadores e desperdício inválidos não criam qualquer baixa',()=>{
 const s=base(),original=JSON.stringify(s);
 for(const [payload,re] of [
  [p({signatureOne:'Outra pessoa'}),/conferências/],
  [p({cutterTwo:'Ana Cortadora'}),/diferentes/],
  [p({scrapByMaterial:{'MAT-0003':5}}),/não faz parte desta ficha/],
  [p({scrapByMaterial:{'MAT-0001':-1}}),/inteiro/],
  [p({qty:0}),/Quantidade de peças/],
  [p({color:'Azul'}),/Cadastre a cor/],
  [p({reason:''}),/Justificativa/]
 ]){
  assert.throws(()=>cmd(s,'cut.bom.execute',payload),re);
  assert.equal(JSON.stringify(s),original);
 }
});
test('Auditor encontra movimento órfão e alteração no peso sem autocorreção',()=>{
 let s=base();s=cmd(s,'cut.bom.execute',p());
 for(const mutate of [
  x=>{x.stockLedger[0].deltaGrams-=1},
  x=>{x.bomCutRuns[0].materials[1].requiredGrams+=1},
  x=>{x.bomCutRuns[0].materials[0].ruleId=null},
  x=>{x.bomCutRuns[0].signatureTwo='Assinatura falsa'},
  x=>{x.stockLedger.push({...x.stockLedger[0],id:'MOV-9000'})},
  x=>{x.bomCutRuns[0].color='Azul'}
 ]){
  const broken=structuredClone(s);mutate(broken);const source=JSON.stringify(broken);
  assert.equal(core.inspect(broken).ok,false,'núcleo detecta corrupção');
  assert.ok(auditor.analyze(broken).findings.some(x=>x.code.startsWith('CORTE_BOM_')),
   'Auditor deve indicar origem do corte BOM');
  assert.equal(JSON.stringify(broken),source);
 }
});
test('módulo de Corte BOM isolado sem rede nem persistência própria',()=>{
 const js=fs.readFileSync(path.join(__dirname,'../modulos/corte-bom-v1.js'),'utf8');
 assert.equal(bom.version,'1.0.0');
 for(const re of [/\bfetch\s*\(/,/\bXMLHttpRequest\b/,/\bWebSocket\b/,/https?:\/\//,
 /\blocalStorage\b/,/\bindexedDB\b/,/\bsupabase\b/i,/window\.location/,/\bdocument\.cookie/])
  assert.equal(re.test(js),false,String(re));
});
