'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const vm=require('node:vm'),fs=require('node:fs');
const source=fs.readFileSync('release-cutter-sheet-materials-v9523.js','utf8');
function setup(){
 const scheduled=[],grade=[{productId:1,color:'Preto',size:'P',qty:20}];
 const db={products:[{id:1,name:'Modelo A',materials:[]}],materials:[],
  orders:[{id:7,orderNumber:77,client:'Teste',grade}],cuts:[{id:8,orderId:7,productId:1,cutterId:9,originalGrade:grade}],cutters:[{id:9,name:'Operador'}]};
 let html='',legacyCalled=0;
 const ctx={db,console,alert(){},setTimeout(fn,ms){scheduled.push({fn,ms});return 1;},
  document:{getElementById(){return null;},body:null},renderCuts(){},
  printCuttingSheet(){legacyCalled++;return false;},
  open(){return {document:{open(){},write(h){html=h},close(){}},focus(){}}}};
 ctx.window=ctx;
 vm.createContext(ctx);vm.runInContext(source,ctx);
 return {ctx,scheduled,get html(){return html},get legacyCalled(){return legacyCalled}};
}
test('chamada tradicional imprime folha nova completa, sem alterar registros',()=>{
 const x=setup(),before=JSON.stringify(x.ctx.db);
 assert.equal(x.ctx.printCuttingSheet(7,8),true);
 assert.match(x.html,/FOLHA DE GRADE DO CORTADOR/);
 assert.match(x.html,/Assinatura do Cortador 1/);
 assert.match(x.html,/Infestador/);
 assert.match(x.html,/Peso total \(kg\)/);
 assert.equal(x.legacyCalled,0);
 assert.equal(JSON.stringify(x.ctx.db),before);
});
test('substituição tardia pelo legado é reparada sem repetir impressões',()=>{
 const x=setup(),api=x.ctx.hlgbCutterSheetV9523;
 const modern=x.ctx.printCuttingSheet;
 x.ctx.printCuttingSheet=function antigo(){throw Error('A rota antiga não deveria executar');};
 assert.equal(api.ensurePrintRoute9523(),true);
 assert.equal(x.ctx.printCuttingSheet,modern);
 assert.equal(x.ctx.printCuttingSheet(7,8),true);
 assert.match(x.html,/Grade por cor e tamanho/);
});
test('guarda não sobrescreve implementação completa já instalada',()=>{
 const x=setup(),api=x.ctx.hlgbCutterSheetV9523;
 const replacement=function folhaNovaTerceiro(){return 'ok'};
 replacement.__hlgbCutterSheetV9523=true;
 x.ctx.printCuttingSheet=replacement;
 assert.equal(api.ensurePrintRoute9523(),true);
 assert.equal(x.ctx.printCuttingSheet,replacement);
});
test('não cria função de impressão se rota estiver ausente',()=>{
 const x=setup(),api=x.ctx.hlgbCutterSheetV9523;
 x.ctx.printCuttingSheet=null;
 assert.equal(api.ensurePrintRoute9523(),false);
 assert.equal(x.ctx.printCuttingSheet,null);
});
test('revisão agendada acontece após carregamento e login',()=>{
 const x=setup();const ms=x.scheduled.map(x=>x.ms);
 assert.ok(ms.includes(2500));assert.ok(ms.includes(6500));
 x.ctx.printCuttingSheet=function antigo(){return false;};
 x.scheduled.find(x=>x.ms===2500).fn();
 assert.equal(x.ctx.printCuttingSheet.__hlgbCutterSheetV9523,true);
});
