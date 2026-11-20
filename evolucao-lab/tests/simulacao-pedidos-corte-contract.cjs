'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const core=require('../operacao-integrada-core.js'),orders=require('../modulos/pedidos-multimodelo-v1.js');
const ui=fs.readFileSync(path.join(__dirname,'../operacao-integrada-ui.js'),'utf8');
function fixture(){
 let state=core.initial(),seq=0;
 const run=(type,payload)=>{
  const result=core.apply(state,{type,payload,expectedRevision:state.revision,
   commandId:'SIMULACAO-'+(++seq),actor:'QA fictício'});
  state=result.state;assert.equal(core.inspect(state).ok,true,type);return result.result;
 };
 const orderId=run('order.multi.create',{clientId:'CLI-0001',sizes:['P','M','G2'],items:[
  {productId:'PRO-0001',colors:[{color:'Preto',grade:{P:60,M:40,G2:0}}]},
  {productId:'PRO-0002',colors:[{color:'Rubi',grade:{P:20,M:30,G2:0}}]}]});
 const input=()=>({id:orderId,reason:'Revisão fictícia simulada',items:state.multiOrders[0].items.map(x=>({
  id:x.id,productId:x.productId,colors:x.colors.map(row=>({color:row.color,grade:{...row.grade}}))}))});
 return {run,input,orderId,get state(){return state}};
}
test('simula edição sem criar log, mudar revisão ou alterar dados',()=>{
 const f=fixture(),p=f.input(),before=JSON.stringify(f.state);
 p.items[0].colors[0].grade.M=50;
 const preview=orders.previewChange(f.state,'order.multi.revise',p);
 assert.equal(preview.beforePieces,150);assert.equal(preview.afterPieces,160);
 assert.equal(preview.deltaPieces,10);assert.equal(preview.changes.length,1);
 assert.equal(preview.changes[0].afterQty,50);
 assert.equal(preview.changes[0].protectedQty,0);
 assert.equal(preview.baseRevision,f.state.revision);
 assert.equal(JSON.stringify(f.state),before,'prévia é absolutamente somente leitura');
});
test('simula redução respeitando programação e corte',()=>{
 const f=fixture();
 f.run('multi.cut.plan',{orderId:f.orderId,itemId:'ITM-001',
  scheduledDate:'2026-11-28',priority:'normal',cutterOne:'A',cutterTwo:'B',spreader:'C',
  lines:[{color:'Preto',size:'P',qty:40}]});
 const before=JSON.stringify(f.state),bad=f.input();
 bad.items[0].colors[0].grade.P=39;
 assert.throws(()=>orders.previewChange(f.state,'order.multi.revise',bad),/abaixo de 40/);
 assert.equal(JSON.stringify(f.state),before);
 const safe=f.input();safe.items[0].colors[0].grade.P=40;
 const preview=orders.previewChange(f.state,'order.multi.revise',safe);
 assert.equal(preview.beforePieces,150);assert.equal(preview.afterPieces,130);
 assert.equal(preview.changes[0].protectedQty,40);
 assert.equal(preview.changes[0].afterFree,0);
 assert.equal(JSON.stringify(f.state),before);
});
test('simula aditivo: novo modelo preserva ID anterior e preço histórico',()=>{
 const f=fixture(),p=f.input(),before=JSON.stringify(f.state);
 p.items.push({productId:'PRO-0003',colors:[{color:'Azul',grade:{P:10,M:5,G2:0}}]});
 const preview=orders.previewChange(f.state,'order.multi.amend',p);
 assert.equal(preview.beforePieces,150);assert.equal(preview.afterPieces,165);
 assert.equal(preview.changes.filter(x=>x.effect==='nova_variante').length,2);
 assert.ok(preview.changes.every(x=>x.protectedQty===0));
 assert.equal(JSON.stringify(f.state),before);
});
test('simulação rejeita retirada de item referenciado e não altera estado',()=>{
 const f=fixture();
 f.run('multi.cut.plan',{orderId:f.orderId,itemId:'ITM-001',
  scheduledDate:'2026-11-28',priority:'normal',cutterOne:'A',cutterTwo:'B',spreader:'C',
  lines:[{color:'Preto',size:'P',qty:15}]});
 const before=JSON.stringify(f.state),p=f.input();
 p.items.shift();
 assert.throws(()=>orders.previewChange(f.state,'order.multi.amend',p),/corte ou movimentação/);
 assert.equal(JSON.stringify(f.state),before);
});
test('interface exige simulação de impacto antes da confirmação e usa output legível',()=>{
 assert.match(ui,/function simulateOrderChange\(form,type\)/);
 assert.match(ui,/function orderChangePreviewText\(result\)/);
 assert.match(ui,/data-preview-order-change/);
 assert.match(ui,/data-order-preview-output/);
 assert.match(ui,/Simulação bloqueou o salvamento/);
 assert.match(ui,/orderChangePreviewText\(preview\)/);
});
