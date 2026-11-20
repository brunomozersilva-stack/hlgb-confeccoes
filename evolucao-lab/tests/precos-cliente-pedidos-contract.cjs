'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const core=require('../operacao-integrada-core.js');
const ui=fs.readFileSync(path.join(__dirname,'../operacao-integrada-ui.js'),'utf8');
function setup(){
 let state=core.initial(),seq=0;
 const run=(type,payload)=>{
  const result=core.apply(state,{type,payload,commandId:'PRECO-CLIENTE-'+(++seq),
   actor:'QA preço fictício',expectedRevision:state.revision});
  state=result.state;
  assert.equal(core.inspect(state).ok,true,'integridade após '+type);
  return result.result;
 };
 const orderPayload=clientId=>({clientId,sizes:['P','M'],items:[
  {productId:'PRO-0001',colors:[{color:'Preto',grade:{P:3,M:2}}]}]});
 return {run,orderPayload,get state(){return state}};
}
test('preço específico do cliente é usado no novo pedido, sem alterar o catálogo',()=>{
 const c=setup(),base=c.state.products.find(x=>x.id==='PRO-0001').priceCents;
 c.run('price.customer.set',{clientId:'CLI-0001',productId:'PRO-0001',
  priceCents:3190,reason:'Condição comercial fictícia'});
 c.run('order.multi.create',c.orderPayload('CLI-0001'));
 const a=c.state.multiOrders[0];
 assert.equal(a.items[0].priceCents,3190);
 assert.equal(a.totals.amountCents,15950);
 assert.equal(c.state.products.find(x=>x.id==='PRO-0001').priceCents,base);
 c.run('order.multi.create',c.orderPayload('CLI-0002'));
 assert.equal(c.state.multiOrders[1].items[0].priceCents,base);
 assert.equal(c.state.finance.length,0);
});
test('alterar preço negociado não reprecifica pedido anterior; aditivo só aplica ao item novo',()=>{
 const c=setup();
 c.run('price.customer.set',{clientId:'CLI-0001',productId:'PRO-0001',
  priceCents:3000,reason:'Primeira negociação'});
 c.run('order.multi.create',c.orderPayload('CLI-0001'));
 c.run('price.customer.set',{clientId:'CLI-0001',productId:'PRO-0001',
  priceCents:3500,reason:'Nova negociação'});
 const old=c.state.multiOrders[0];
 assert.equal(old.items[0].priceCents,3000);
 assert.equal(c.state.customerPriceHistory.length,2);
 c.run('order.multi.amend',{id:old.id,reason:'Novo item comercial fictício',
  items:[{id:'ITM-001',productId:'PRO-0001',colors:[{color:'Preto',grade:{P:3,M:2}}]},
   {productId:'PRO-0001',colors:[{color:'Rubi',grade:{P:1,M:1}}]}]});
 assert.equal(c.state.multiOrders[0].items[0].priceCents,3000);
 assert.equal(c.state.multiOrders[0].items[1].priceCents,3500);
 assert.equal(c.state.multiOrders[0].totals.amountCents,22000);
});
test('rejeita preços inválidos, repetições e detecta adulteração de regra',()=>{
 const c=setup(),before=JSON.stringify(c.state);
 assert.throws(()=>c.run('price.customer.set',{clientId:'CLI-0001',productId:'PRO-0001',
  priceCents:0,reason:'Preço inválido'}),/inválido/);
 assert.equal(JSON.stringify(c.state),before);
 c.run('price.customer.set',{clientId:'CLI-0001',productId:'PRO-0001',
  priceCents:2400,reason:'Contrato comercial fictício'});
 assert.throws(()=>c.run('price.customer.set',{clientId:'CLI-0001',productId:'PRO-0001',
  priceCents:2400,reason:'Sem alteração'}),/sem mudança/);
 const tampered=JSON.parse(JSON.stringify(c.state));
 tampered.customerPriceRules[0].priceCents=100;
 assert.equal(core.inspect(tampered).ok,false);
 const tamperedHistory=JSON.parse(JSON.stringify(c.state));
 tamperedHistory.customerPriceHistory[0].reason='Justificativa adulterada';
 assert.equal(core.inspect(tamperedHistory).ok,false);
});
test('painel exige cliente, modelo, valor e justificativa em Pedidos',()=>{
 assert.match(ui,/function customerPricePanel\(s\)/);
 assert.match(ui,/form\('price\.customer\.set'/);
 assert.match(ui,/if\(type==='price\.customer\.set'\)/);
 assert.match(ui,/priceCents:parseCents\(d\.priceCents\)/);
});
