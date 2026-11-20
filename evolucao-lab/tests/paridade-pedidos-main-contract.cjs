'use strict';
// Contrato de preservação: compara a divisão real de modelos do HLGB comercial
// com a interpretação do pedido multimodelo do laboratório, SEM rede ou dados reais.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const mainSource=fs.readFileSync(path.resolve(__dirname,'../../release-cutter-planner.js'),'utf8');
const laboratory=require('../modulos/pedidos-multimodelo-v1.js');
const core=require('../operacao-integrada-core.js');
function legacyPlanner(){
 const order={id:'LEG-TESTE-87',orderNumber:87,client:'Cliente Fictício',priority:'Urgente',
  status:'Aguardando corte',grade:[
   {productId:'PRO-0001',color:'Preto',size:'P',qty:40},
   {productId:'PRO-0001',color:'Preto',size:'M',qty:60},
   {productId:'PRO-0002',color:'Rubi',size:'P',qty:20},
   {productId:'PRO-0002',color:'Rubi',size:'M',qty:30}
  ]};
 const ctx={console,setTimeout(){return 0},db:{cuts:[],orders:[order],
  products:[{id:'PRO-0001',name:'Modelo A'},{id:'PRO-0002',name:'Modelo B'}],cutters:[]},
  window:{renderCutters(){}},document:{getElementById(){return null}},
  displayOrderNumber:o=>o.orderNumber};
 vm.createContext(ctx);vm.runInContext(mainSource,ctx);
 return ctx.window.hlgbCutterPlanner;
}
function payload(){return {clientId:'CLI-0001',sizes:['PP','P','M','GG','G2'],items:[
 {productId:'PRO-0001',colors:[{color:'Preto',grade:{PP:0,P:40,M:60,GG:0,G2:0}}]},
 {productId:'PRO-0002',colors:[{color:'Rubi',grade:{PP:0,P:20,M:30,GG:0,G2:0}}]}
]};}
test('HLGB original e Evolução mantêm dois modelos distintos e as mesmas 150 peças',()=>{
 const legacy=legacyPlanner();
 const rows=legacy.modelRows();
 assert.equal(rows.length,2,'o original divide um pedido em duas linhas de modelo');
 assert.deepEqual(rows.map(r=>r.pieces).sort((a,b)=>a-b),[50,100]);
 assert.equal(legacy.matches('cliente fictício').length,2);
 assert.equal(legacy.orderSearchRows('87').length,1);
 const state=core.initial(),preview=laboratory.prepare(state,payload());
 assert.equal(preview.items.length,rows.length);
 assert.equal(preview.totals.pieces,150);
 assert.equal(preview.items[0].qty,100);
 assert.equal(preview.items[1].qty,50);
 assert.deepEqual(preview.totals.bySize,{PP:0,P:60,M:90,GG:0,G2:0});
 assert.equal(preview.items[0].colors[0].grade.P,40);
 assert.equal(preview.items[1].colors[0].grade.M,30);
 assert.equal(preview.items[0].id,'ITM-001');
 assert.equal(preview.items[1].id,'ITM-002');
});
test('Pedido multimodelo salva preços históricos, grade dinâmica e não cria cobrança',()=>{
 const state=core.initial();
 const created=core.apply(state,{type:'order.multi.create',payload:payload(),actor:'Teste fictício',
  commandId:'PARIDADE-PEDIDO-001',expectedRevision:state.revision});
 const order=created.state.multiOrders[0];
 assert.equal(order.totals.pieces,150);
 assert.equal(order.totals.amountCents,order.items.reduce((s,i)=>s+i.priceCents*i.qty,0));
 assert.equal(created.state.finance.length,0,'prévia não gera título do comercial');
 assert.equal(created.state.stockLedger.length,0,'prévia não consome estoque');
 assert.equal(core.inspect(created.state).ok,true);
 const repriced=JSON.parse(JSON.stringify(created.state));
 repriced.products.find(p=>p.id==='PRO-0001').priceCents+=999;
 assert.equal(core.inspect(repriced).ok,true,'preço do pedido permanece snapshot histórico');
 const tampered=JSON.parse(JSON.stringify(created.state));
 tampered.multiOrders[0].items[0].priceCents++;
 assert.equal(core.inspect(tampered).ok,false,'alteração silenciosa do preço histórico deve ser detectada');
});
test('Protege variação, duplicidade e grade sem alterar nenhum registro',()=>{
 const state=core.initial(),input=payload(),before=JSON.stringify(state);
 assert.throws(()=>laboratory.prepare(state,{...input,sizes:['P','p']}),/duplicado/i);
 const repeated=payload();repeated.items[0].colors.push({...repeated.items[0].colors[0]});
 assert.throws(()=>laboratory.prepare(state,repeated),/repetida/i);
 const wrong=payload();wrong.items[1].colors[0].grade.M=-1;
 assert.throws(()=>laboratory.prepare(state,wrong),/Quantidade inválida/i);
 assert.equal(JSON.stringify(state),before,'prévia não pode modificar o estado');
});
