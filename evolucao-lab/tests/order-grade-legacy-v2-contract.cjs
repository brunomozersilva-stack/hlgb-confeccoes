'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const adapter=require('../modulos/order-grade-legacy-v2.js');
test('pedido legado com 2 modelos, 3 cores, tamanhos dinâmicos e linhas repetidas volta idêntico',()=>{
 const order={
  id:87,orderNumber:1873,client:'Cliente de teste',priority:'Urgente',unusedFutureField:{keep:'metadata'},
  grade:[
   {productId:'p1',color:'Preto',size:'PP',qty:2,lineId:'original-A'},
   {productId:'p1',color:'Preto',size:'M',qty:4},
   {productId:'p1',color:'Rubi',size:'GG',qty:3},
   {productId:'p1',color:'Rubi',size:'M',qty:1},
   {productId:'p2',color:'Branco',size:'XG',qty:5},
   {productId:'p2',color:'Preto',size:'P',qty:6},
   {productId:'p1',color:'Preto',size:'M',qty:2,splitRow:'não agregar na volta'}
  ],
  cuts:[{id:1,status:'Planejado'}],finance:{sourceId:'old87',amountCents:1234}
 };
 const original=JSON.stringify(order),view=adapter.preview(order,['PP','P','M','G','GG']);
 assert.equal(view.migrationApproved,false);
 assert.equal(view.totals.models,2);assert.equal(view.totals.sourceRows,7);
 assert.equal(view.totals.pieces,23);
 assert.deepEqual(view.totals.bySize,{PP:2,P:6,M:7,G:0,GG:3,XG:5});
 assert.deepEqual(view.sizeOrder,['PP','P','M','G','GG','XG']);
 assert.equal(view.items.find(x=>x.productId==='p1').qty,12);
 assert.equal(view.items.find(x=>x.productId==='p2').qty,11);
 assert.deepEqual(view.items.find(x=>x.productId==='p1').colors.find(x=>x.color==='Preto').sourceIndexes,[0,1,6]);
 assert.deepEqual(adapter.restore(view),order,'Sem perder campos não conhecidos, referências e linhas duplicadas');
 assert.equal(JSON.stringify(order),original,'Preview não altera documento original');
 assert.equal(adapter.inspect(view).ok,true);
 view.items[0].qty=9999;assert.throws(()=>adapter.inspect(view),/alterada/);
});
test('pedido histórico com item sem produto preserva a linha, mas mostra bloqueio de conferência',()=>{
 const o={id:'PED-ANTIGO',grade:[{productId:null,color:'Sem cor',size:'G1',qty:7},{size:'GG',qty:2}]};
 const v=adapter.preview(o,['P','M','G','GG']);
 assert.equal(v.totals.pieces,9);assert.ok(v.warnings.some(x=>x.includes('sem produto')));
 assert.deepEqual(adapter.restore(v),o);
});
test('dado inválido bloqueia conversão em vez de descartar a linha',()=>{
 for(const row of [{productId:1,color:'Preto',size:'P',qty:-1},
  {productId:1,color:'Preto',size:'P',qty:1.2},
  {productId:1,color:'Preto',size:'',qty:1},
  {productId:1,color:{name:'Preto'},size:'P',qty:1}]){
  assert.throws(()=>adapter.preview({id:'TEST',grade:[row]},['P']),/inválid|ilegível/);
 }
 assert.throws(()=>adapter.preview({id:1,grade:{P:10}}),/lista de grade/);
});
test('inventário antigo confirma o fluxo que deve ser preservado antes de publicar conversão',()=>{
 const old=fs.readFileSync(path.resolve(__dirname,'../../release-cutter-planner.js'),'utf8');
 const oldSheet=fs.readFileSync(path.resolve(__dirname,'../../release-cutter-sheet-materials-v9523.js'),'utf8');
 assert.match(old,/function modelRows\(/);
 assert.match(oldSheet,/function gradeMatrix\(/);
});
