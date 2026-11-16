'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const core=require('../operacao-integrada-core.js');
const dir=path.resolve(__dirname,'..');
const page=fs.readFileSync(path.join(dir,'operacao-integrada.html'),'utf8');
const ui=fs.readFileSync(path.join(dir,'operacao-integrada-ui.js'),'utf8');
const domain=fs.readFileSync(path.join(dir,'operacao-integrada-core.js'),'utf8');
function run(ctx,type,payload={},id){
 const commandId=id||'OP-DEMO-000'+String(ctx.counter++);
 const answer=core.apply(ctx.state,{type,payload,actor:'Teste CI fictício',commandId,expectedRevision:ctx.state.revision});
 ctx.state=answer.state;
 assert.equal(core.inspect(ctx.state).ok,true,'integridade após '+type);
 return answer.result;
}
function setup(){return {state:core.initial(),counter:1}}
function graded(p=10,m=10){return {P:p,M:m,G:0,GG:0}}
function pipeline(ctx){
 const orderId=run(ctx,'order.add',{clientId:'CLI-0001',productId:'PRO-0001',grade:graded()});
 run(ctx,'cut.record',{orderId,size:'P',qty:10});
 run(ctx,'cut.record',{orderId,size:'M',qty:8});
 run(ctx,'faction.allocate',{orderId,factionId:'FAC-0002',qty:15});
 const settlement=run(ctx,'faction.return',{orderId,qty:12});
 run(ctx,'order.separate',{orderId,qty:10});
 run(ctx,'order.ship',{orderId,qty:7});
 return {orderId,settlement};
}
test('19 navegações integradas, scripts locais e isolamento dos dados',()=>{
 assert.equal(core.inspect(core.initial()).ok,true);
 assert.equal(core.initial().schema,'hlgb-evolucao-operacao-ficticia-v1');
 const paths=[...page.matchAll(/<script\s+src="([^"]+)"/g)].map(m=>m[1]);
 assert.deepEqual(paths,['./operacao-integrada-core.js','./operacao-integrada-ui.js']);
 assert.match(page,/19 áreas para explorar/);
 assert.match(page,/não executam pagamentos/);
 assert.match(page,/não sincronizam entre computadores/);
 for(const source of [domain,ui])assert.doesNotThrow(()=>new vm.Script(source));
 assert.equal([...ui.matchAll(/case '(?:[^']+)':return panel/g)].length>=15,true);
 for(const bad of [/\bfetch\s*\(/,/\bXMLHttpRequest\b/,/\bWebSocket\b/,
 /https?:\/\//,/\bsupabase\.co\b/i,/\blocalStorage\b/,/\bsessionStorage\b/]){
  assert.equal(bad.test(page+ui+domain),false,'API externa proibida: '+bad);
 }
});
test('pedido -> corte por grade -> facção -> retorno -> acerto -> separação -> expedição com totais reconciliados',()=>{
 const ctx=setup(),{orderId,settlement}=pipeline(ctx),s=ctx.state;
 const order=s.orders.find(x=>x.id===orderId);
 assert.deepEqual(core.quantities(order),{ordered:20,cut:18,allocated:15,returned:12,separated:10,shipped:7});
 assert.equal(s.materials.find(x=>x.id==='MAT-0001').stockGrams,16000-18*120);
 assert.equal(s.stockLedger.length,2);
 assert.equal(s.settlements.length,1);
 assert.equal(s.settlements[0].id,settlement);
 assert.equal(s.settlements[0].unitCents,550,'desconto demonstrativo travetada');
 assert.equal(s.settlements[0].amountCents,6600);
 assert.equal(s.finance.length,2);
 assert.equal(s.finance.find(x=>x.sourceId===orderId).amountCents,20*3990);
 assert.equal(s.finance.find(x=>x.sourceId===settlement).amountCents,6600);
 assert.equal(core.totals(s).shipped,7);
 assert.equal(core.inspect(s).ok,true);
});
test('regras impedem excedentes, estoque negativo e operações financeiras duplicadas',()=>{
 const ctx=setup(),{orderId,settlement}=pipeline(ctx);
 const before=JSON.stringify(ctx.state),rev=ctx.state.revision;
 for(const [type,payload] of [
 ['cut.record',{orderId,size:'M',qty:3}],
 ['faction.allocate',{orderId,factionId:'FAC-0002',qty:4}],
 ['faction.return',{orderId,qty:4}],
 ['order.separate',{orderId,qty:3}],
 ['order.ship',{orderId,qty:4}],
 ['stock.adjust',{materialId:'MAT-0001',deltaGrams:-99999,note:'Teste'}],
 ['faction.allocate',{orderId,factionId:'FAC-0001',qty:1}],
 ['settlement.adjust',{id:settlement,adjustmentCents:-1000000}]
 ])assert.throws(()=>core.apply(ctx.state,{type,payload,commandId:'OP-DEMO-BLOQUEADO',
  expectedRevision:ctx.state.revision,actor:'Teste CI'}),/excede|negativo|facção|zerado|negativa|simulação/);
 assert.equal(ctx.state.revision,rev);assert.equal(JSON.stringify(ctx.state),before);
 const title=ctx.state.finance.find(x=>x.sourceId===settlement).id;
 run(ctx,'finance.pay',{id:title});
 assert.throws(()=>core.apply(ctx.state,{type:'finance.pay',payload:{id:title},actor:'CI',commandId:'OP-DEMO-DUPLICATE',
  expectedRevision:ctx.state.revision}),/já conferido/);
 assert.equal(ctx.state.finance.find(x=>x.id===title).status,'pago');
});
test('compra com 2 conferentes repõe o estoque uma vez e gera título de fornecedor',()=>{
 const ctx=setup();const purchase=run(ctx,'purchase.add',{
  supplierId:'FOR-0001',materialId:'MAT-0002',qtyGrams:2000,checkerOne:'Conferente A',checkerTwo:'Conferente B'});
 assert.throws(()=>core.apply(ctx.state,{type:'purchase.add',payload:{
  supplierId:'FOR-0001',materialId:'MAT-0002',qtyGrams:2000,checkerOne:'Mesmo',checkerTwo:'mesmo'},
  commandId:'OP-DEMO-INVALID',expectedRevision:ctx.state.revision,actor:'CI'}),/duas pessoas/);
 run(ctx,'purchase.receive',{id:purchase});
 assert.equal(ctx.state.materials.find(x=>x.id==='MAT-0002').stockGrams,10000);
 assert.equal(ctx.state.stockLedger.filter(x=>x.sourceId===purchase).length,1);
 assert.equal(ctx.state.finance.find(x=>x.sourceId===purchase).amountCents,8400);
 assert.throws(()=>core.apply(ctx.state,{type:'purchase.receive',payload:{id:purchase},actor:'CI',
  commandId:'OP-DEMO-RECEBER2',expectedRevision:ctx.state.revision}),/já recebida/);
});
test('cadastros e ficha técnica novos recebem IDs exclusivos; folha soma passagem e auditoria',()=>{
 const ctx=setup();
 const client=run(ctx,'client.add',{name:'Varejo Fictício Norte'});
 const supplier=run(ctx,'supplier.add',{name:'Fornecedor Inventado'});
 const material=run(ctx,'material.add',{name:'Elástico de demonstração',priceCentsKg:2700});
 const product=run(ctx,'product.add',{name:'Modelo Integrado',sku:'TESTE-MODELO-001',
  materialId:material,gramsPerUnit:50,priceCents:1990});
 const faction=run(ctx,'faction.add',{name:'Oficina Teste C',unitCents:500,traveta:true});
 const print=run(ctx,'print.add',{name:'Chaveiro Fictício',grams:23,priceCents:490,stock:4});
 assert.equal(new Set([client,supplier,material,product,faction,print]).size,6);
 assert.equal(ctx.state.products.find(x=>x.id===product).sku,'TESTE-MODELO-001');
 const salary=core.totals(ctx.state).salaryCash;
 run(ctx,'payroll.update',{id:'FUN-0001',salaryCents:200000,passageCents:22000,extrasCents:0,discountCents:0});
 assert.equal(core.totals(ctx.state).salaryCash,salary+10000);
 assert.equal(core.totals(ctx.state).passage,30000);
 const err=run(ctx,'error.add',{message:'Exemplo de falha fictícia'});
 run(ctx,'error.resolve',{id:err});
 assert.equal(ctx.state.errors.find(x=>x.id===err).status,'resolvido');
 const j=run(ctx,'finance.add',{kind:'pagar',description:'Teste de transporte',amountCents:2500});
 assert.match(j,/^FIN-/);
 assert.equal(core.inspect(ctx.state).ok,true);
 assert.equal(ctx.state.log.length,10);
});
test('revisões e command IDs impedem replay; resultado não muta o estado anterior',()=>{
 const ctx=setup(),saved=ctx.state;
 const r=core.apply(saved,{type:'finance.add',payload:{kind:'pagar',description:'Nota fictícia',amountCents:5500},
  commandId:'OP-DEMO-IDEMPOTENT',expectedRevision:1,actor:'Teste'});
 assert.equal(saved.revision,1);assert.equal(saved.finance.length,0);
 assert.equal(r.state.revision,2);
 assert.throws(()=>core.apply(r.state,{type:'finance.add',
  payload:{kind:'pagar',description:'Duplicar',amountCents:5500},
  commandId:'OP-DEMO-IDEMPOTENT',expectedRevision:2,actor:'Teste'}),/já registrado/);
 assert.throws(()=>core.apply(r.state,{type:'finance.add',
  payload:{kind:'pagar',description:'Outro',amountCents:5500},
  commandId:'OP-DEMO-OUTRO',expectedRevision:1,actor:'Teste'}),/CONFLITO/);
 assert.deepEqual(core.inspect(r.state).problems,[]);
});
