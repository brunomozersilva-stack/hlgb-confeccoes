'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync('release-cutter-sheet-materials-v9523.js','utf8');
function makeFixture(ncolors=3){
 const palette=['Preto','Branco','Rubi','Azul Marinho','Rosa','Vinho','Verde','Azul'];
 const colors=palette.slice(0,ncolors);
 const materials=[
  {name:'Tule',cat:'Tecido',unit:'m',qty:0.8,calcMode:'consumption'},
  {name:'Renda 18 Jacatronica',cat:'Renda',unit:'kg',qty:0.02,calcMode:'consumption'},
  {name:'Malha',cat:'Malha',unit:'kg',qty:0.1,calcMode:'consumption'},
  {name:'Alça Papiro 40 cm',cat:'Aviamento',unit:'un.',qty:1},
  {name:'Alça Papiro 30cm',cat:'Aviamento',unit:'un.',qty:1},
  {name:'gancho prata',cat:'Aviamento',unit:'un.',qty:1},
  {name:'Anis',cat:'Aviamento',unit:'m',qty:1},
  {name:'Alpínia',cat:'Aviamento',unit:'m',qty:1.1},
  {name:'geranio',cat:'Aviamento',unit:'m',qty:0.8}
 ];
 const grade=colors.flatMap(color=>['P','M','G','GG'].map(size=>({
  productId:1,color,size,qty:50
 })));
 const db={products:[{id:1,name:'Camisola Liliane',materials}],materials:[],
  orders:[{id:42,orderNumber:42,client:'Click Sophia',grade}],
  cuts:[{id:100,orderId:42,productId:1,cutterId:9,plannedCutDate:'2026-11-10',originalGrade:grade}],
  cutters:[{id:9,name:'Tule'}]};
 let printed='';
 const ctx={db,document:{getElementById:()=>null},
  window:null,console,setTimeout(){},alert(){},renderCuts(){},printCuttingSheet(){return false},
  open(){return {document:{open(){},write(html){printed=html},close(){}},focus(){}}}};
 ctx.window=ctx;
 vm.createContext(ctx);vm.runInContext(source,ctx);
 const rendered=ctx.hlgbCutterSheetV9523.renderSheet(db.orders[0],db.cuts[0]);
 return {db,html:rendered,api:ctx.hlgbCutterSheetV9523,ctx,get printed(){return printed}};
}
test('A4: full header, two cutters, infester, three signatures and checkboxes',()=>{
 const f=makeFixture(),html=f.html;
 assert.match(html,/@page\{size:A4 portrait;margin:7mm\}/);
 for(const label of ['Cortador 1','Cortador 2','Infestador','Peças previstas',
  'Grade por cor e tamanho','Conferência de matérias-primas',
  'Pesagem e aproveitamento do corte','Aproveitamento de corte e peças extras',
  'Assinatura do Cortador 1','Assinatura do Cortador 2','Assinatura do Infestador',
  'Observações e divergências','Data: ____']){
  assert.ok(html.includes(label),'missing '+label);
 }
 assert.equal((html.match(/box-check/g)||[]).length>=5,true);
});
test('weighing repeats ONLY cuttable materials from each technical sheet',()=>{
 const f=makeFixture(),html=f.html;
 const weigh=html.match(/<table class="weigh-table">[\s\S]*?<\/table>/)?.[0];
 assert.ok(weigh);
 for(const name of ['Tule','Renda 18 Jacatronica','Malha'])assert.ok(weigh.includes(name));
 for(const noncuttable of ['Alça','gancho','Anis','geranio'])assert.ok(!weigh.includes(noncuttable));
 for(const label of ['Peso total (kg)','Peso usado (kg)','Lixo / retalho (kg)','Aproveitamento (%)'])
  assert.ok(weigh.includes(label));
 assert.equal((weigh.match(/<tr/g)||[]).length,5); // header, 3 materials, total
 assert.ok(html.includes('Peso usado no corte'));
});
test('extra-pieces color columns follow grade; blank fields never invent extra 400 pieces',()=>{
 const f=makeFixture(6);
 const extra=f.html.match(/<table class="extras-table">[\s\S]*?<\/table>/)?.[0];
 assert.ok(extra);
 for(const color of ['Preto','Branco','Rubi','Azul Marinho','Rosa','Vinho'])assert.ok(extra.includes(color),color);
 assert.ok(extra.includes('Outras'));
 assert.ok(extra.includes('Camisola Liliane'));
 assert.match(extra,/1200/); // six colors * four sizes * 50
 assert.ok(!extra.includes('400')); // no fabricated extra pieces
 assert.equal((extra.match(/<tr/g)||[]).length,7); // 2 headings + primary + 4 blank rows
});
test('grades and materials are not changed by printing',()=>{
 const f=makeFixture();
 const before=JSON.stringify(f.db);
 assert.equal(f.ctx.printCuttingSheet(42,100),true);
 assert.match(f.printed,/Resumo final do corte/);
 assert.equal(JSON.stringify(f.db),before);
});
