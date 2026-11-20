'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const core=require('../operacao-integrada-core.js');
const ui=fs.readFileSync(path.join(__dirname,'../operacao-integrada-ui.js'),'utf8');
const lines=(color,size,qty)=>[{color,size,qty}];
function scenario(){
 let s=core.initial(),i=0;
 const run=(type,payload)=>{
  const x=core.apply(s,{type,payload,expectedRevision:s.revision,
   actor:'QA fictício',commandId:'EDICAO-GRADE-'+(++i)});
  s=x.state;assert.equal(core.inspect(s).ok,true,type);return x.result;
 };
 const id=run('order.multi.create',{clientId:'CLI-0001',sizes:['PP','P','M','GG','G2'],
  items:[{productId:'PRO-0001',colors:[{color:'Preto',grade:{PP:0,P:50,M:50,GG:0,G2:0}}]},
         {productId:'PRO-0002',colors:[{color:'Rubi',grade:{PP:0,P:20,M:30,GG:0,G2:0}}]}]});
 const payload=()=>({id,reason:'Revisão controlada do pedido fictício',items:s.multiOrders[0].items.map(item=>({
  id:item.id,productId:item.productId,colors:item.colors.map(c=>({color:c.color,grade:{...c.grade}}))}))});
 return {run,payload,id,get s(){return s}};
}
test('edita quantidade e preço histórico sem alterar IDs, nem gerar financeiro',()=>{
 const c=scenario(),p=c.payload(),before=c.s.multiOrders[0],revision=c.s.revision;
 p.items[0].colors[0].grade.M=65;
 c.run('order.multi.revise',p);
 const order=c.s.multiOrders[0];
 assert.equal(order.totals.pieces,165);
 assert.equal(order.items[0].id,before.items[0].id);
 assert.equal(order.items[1].id,before.items[1].id);
 assert.equal(order.items[0].priceCents,before.items[0].priceCents);
 assert.equal(order.revisions.length,1);
 assert.equal(order.revisions[0].revision,revision+1);
 assert.equal(order.revisions[0].before.totals.pieces,150);
 assert.equal(order.revisions[0].after.totals.pieces,165);
 assert.equal(c.s.finance.length,0);assert.equal(c.s.stockLedger.length,0);
});
test('não reduz abaixo do corte programado e preserva estado após rejeição',()=>{
 const c=scenario();
 c.run('multi.cut.plan',{orderId:c.id,itemId:'ITM-001',lines:lines('Preto','P',40),
  scheduledDate:'2026-11-24',priority:'normal',cutterOne:'A',cutterTwo:'B',spreader:'C'});
 const snapshot=JSON.stringify(c.s),rev=c.s.revision;
 const low=c.payload();low.items[0].colors[0].grade.P=39;
 assert.throws(()=>c.run('order.multi.revise',low),/abaixo de 40/);
 assert.equal(JSON.stringify(c.s),snapshot);assert.equal(c.s.revision,rev);
 const valid=c.payload();valid.items[0].colors[0].grade.P=40;
 c.run('order.multi.revise',valid);
 assert.equal(c.s.multiOrders[0].items[0].colors[0].grade.P,40);
 assert.equal(core.inspect(c.s).ok,true);
});
test('histórico de revisões denuncia alteração fora de comando e preços alterados',()=>{
 const c=scenario(),p=c.payload();p.items[0].colors[0].grade.M=70;
 c.run('order.multi.revise',p);
 const changed=JSON.parse(JSON.stringify(c.s));
 changed.multiOrders[0].items[0].colors[0].grade.M=71;
 assert.equal(core.inspect(changed).ok,false);
 const hist=JSON.parse(JSON.stringify(c.s));
 hist.multiOrders[0].revisions[0].reason='Mudança não autorizada';
 assert.equal(core.inspect(hist).ok,false);
 const chained=c.payload();chained.items[1].colors[0].grade.M=40;
 c.run('order.multi.revise',chained);
 assert.equal(c.s.multiOrders[0].revisions.length,2);
 assert.equal(core.inspect(c.s).ok,true);
});
test('edição preserva cor, modelo, tamanho e justificativa',()=>{
 const c=scenario(),p=c.payload();
 p.items[1].productId='PRO-0001';
 assert.throws(()=>c.run('order.multi.revise',p),/Modelo\/cor/);
 const p2=c.payload();p2.items[0].colors[0].color='Branco';
 assert.throws(()=>c.run('order.multi.revise',p2),/identidade das cores/);
 const p3=c.payload();p3.items[0].colors[0].grade.M=60;p3.reason='';
 assert.throws(()=>c.run('order.multi.revise',p3),/Justificativa/);
});
test('interface expõe edição por grade com mínimo reservado e confirmação',()=>{
 assert.match(ui,/function multiOrderRevisionPanel\(s\)/);
 assert.match(ui,/data-command="order\.multi\.revise"/);
 assert.match(ui,/data-revise-qty/);
 assert.match(ui,/reservado/);
 assert.match(ui,/order\.multi\.revise'&&!confirm/);
});
