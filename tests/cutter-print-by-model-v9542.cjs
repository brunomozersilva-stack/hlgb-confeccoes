'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync('release-cutter-sheet-materials-v9523.js','utf8');
function setup(){
 const fio=1788444804759;
 const names=['Calcinha Cereja','Fio Duplo Penelope','Cinta Helen','Calcinha Tammy Plus'];
 const ids=[1788444764180,fio,1788444723936,1788444840172];
 const colors=['Preto','Branco','Rubi','Frozen','Fantastico','Teos'];
 const products=ids.map((id,i)=>({id,name:names[i],materials:i===1?
  [{name:'Tule',unit:'m',cat:'Tecido',qty:0.7,calcMode:'consumption'}]:[]}));
 const grade=[];
 // Reproduz estrutura real do pedido com varios produtos e Fio Penelope em seis cores.
 ids.forEach((id,i)=>colors.slice(0,i===1?6:i===2?2:3).forEach(color=>
  ['P','M','G','GG'].forEach(size=>grade.push({productId:id,color,size,qty:i===1?25:10}))));
 const order={id:1788445172349,orderNumber:27,client:'Click Sophia',grade};
 const cuts=[
  // Corte antigo fragmentado por tamanho: nao pode substituir a grade inteira.
  {id:119,orderId:order.id,productId:fio,status:'Planejado',
    originalGrade:[{productId:fio,color:'Preto',size:'P',qty:25}],
    cutterId:8,plannedCutDate:'2026-11-10'},
 ];
 const db={orders:[order],products,cuts,materials:[],cutters:[{id:8,name:'Cortador Penelope'}]};
 let printed='',legacy=0,writes=0;
 const ctx={db,document:{getElementById:()=>null},window:null,
  console,setTimeout(){return 0},renderCuts(){},alert(){},
  printCuttingSheet(){legacy++;return 'legacy'},
  open(){return {document:{open(){},write(x){printed=x},close(){}},focus(){}}}};
 ctx.window=ctx;
 vm.createContext(ctx);vm.runInContext(source,ctx,{filename:'release-cutter-sheet-materials-v9523.js'});
 return {db,ctx,get printed(){return printed},get legacy(){return legacy},get writes(){return writes},ids,colors,order};
}
test('order-only print uses four new forms, one per product, not old cut sheet',()=>{
 const f=setup(),before=JSON.stringify(f.db);
 assert.equal(f.ctx.printCuttingSheet(f.order.id),true);
 assert.equal(f.legacy,0);
 assert.equal((f.printed.match(/<main class="sheet[^"]*">/g)||[]).length,4);
 assert.equal((f.printed.match(/FOLHA DE GRADE DO CORTADOR/g)||[]).length,4);
 assert.ok(f.printed.includes('break-before:page'));
 for(const name of ['Calcinha Cereja','Fio Duplo Penelope','Cinta Helen','Calcinha Tammy Plus'])
  assert.ok(f.printed.includes(name),name);
 assert.equal(JSON.stringify(f.db),before,'print cannot change orders/cuts');
});
test('Fio Duplo Penelope must have full 6-color grade (not the first cut fragment)',()=>{
 const f=setup();
 const sheets=f.ctx.hlgbCutterSheetV9523.sheetsForOrder(f.order);
 const p=sheets.find(x=>String(x.productId)===String(f.ids[1]));
 assert.ok(p,'Penelope group missing');
 assert.equal(p.grade.length,24,'6 colors x 4 sizes');
 assert.equal(p.grade.reduce((sum,x)=>sum+x.qty,0),600);
 const html=f.ctx.hlgbCutterSheetV9523.renderSheet(f.order,p.cut);
 for(const color of f.colors)assert.ok(html.includes(color),'color '+color+' missing');
 assert.ok(html.includes('Tule'));
 assert.ok(html.includes('600'));
 assert.doesNotMatch(html,/Grade do pedido<\/h2>/,'old sheet was selected');
});
test('single cut with id still produces new sheet for a specific model',()=>{
 const f=setup();
 assert.equal(f.ctx.printCuttingSheet(f.order.id,119),true);
 assert.match(f.printed,/Fio Duplo Penelope/);
 assert.match(f.printed,/FOLHA DE GRADE DO CORTADOR/);
 assert.equal(f.legacy,0);
});
test('one-model order without cutId gets same new format',()=>{
 const f=setup(),g=f.order.grade.filter(x=>String(x.productId)===String(f.ids[1]));
 const one={id:7,orderNumber:7,client:'Cliente',grade:g};
 f.db.orders.push(one);
 assert.equal(f.ctx.printCuttingSheet(7),true);
 assert.equal((f.printed.match(/<main class="sheet[^"]*">/g)||[]).length,1);
 assert.ok(f.printed.includes('Fio Duplo Penelope'));
 assert.equal(f.legacy,0);
});
