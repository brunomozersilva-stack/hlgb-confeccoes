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
 assert.equal([...ui.matchAll(/case '(?:nucleo|autenticacao|pedidos|produtos|corte|producao|separacao|faccoes|acertos|hub|folha|compras|estoque|relatorios|auditor|bot|central|impressora3d|cadastros)':/g)].length,19);
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

test('grade editável muda conta a receber e protege cortes e reservas preexistentes',()=>{
 const ctx=setup();
 const id=run(ctx,'order.add',{clientId:'CLI-0001',productId:'PRO-0001',grade:graded(10,10)});
 assert.equal(ctx.state.finance[0].amountCents,20*3990);
 run(ctx,'order.grade.update',{orderId:id,grade:{P:12,M:8,G:0,GG:0}});
 assert.deepEqual(ctx.state.orders[0].grade,{P:12,M:8,G:0,GG:0});
 run(ctx,'cut.record',{orderId:id,size:'P',qty:4});
 const sheet=run(ctx,'cut.plan',{orderId:id,grade:{P:3,M:4,G:0,GG:0},
  workMode:'interno',cutterOne:'Ana Exemplo',cutterTwo:'Beto Exemplo',spreader:'Cris Teste'});
 assert.match(sheet,/^COR-/);
 assert.throws(()=>core.apply(ctx.state,{type:'order.grade.update',
  payload:{orderId:id,grade:{P:6,M:8,G:0,GG:0}},
  expectedRevision:ctx.state.revision,commandId:'OP-INVALID-1',actor:'Teste'}),/não pode reduzir/i);
 run(ctx,'order.grade.update',{orderId:id,grade:{P:9,M:8,G:0,GG:0}});
 assert.equal(ctx.state.finance[0].amountCents,17*3990);
 assert.throws(()=>core.apply(ctx.state,{type:'cut.record',payload:{orderId:id,size:'M',qty:5},
  expectedRevision:ctx.state.revision,commandId:'OP-INVALID-2',actor:'Teste'}),/reservadas|disponível/);
 run(ctx,'finance.pay',{id:ctx.state.finance[0].id});
 assert.throws(()=>core.apply(ctx.state,{type:'order.grade.update',
  payload:{orderId:id,grade:{P:10,M:8,G:0,GG:0}},
  expectedRevision:ctx.state.revision,commandId:'OP-INVALID-3',actor:'Teste'}),/título pago/);
 assert.equal(core.inspect(ctx.state).ok,true);
});
test('duas folhas de corte: lotes, edição, dupla conferência, peso útil + lixo, baixa única e impressão auditável',()=>{
 const ctx=setup(),orderId=run(ctx,'order.add',{clientId:'CLI-0001',productId:'PRO-0001',grade:graded(10,10)});
 const first=run(ctx,'cut.plan',{orderId,grade:{P:4,M:4,G:0,GG:0},
  workMode:'interno',cutterOne:'Ana Cortadora',cutterTwo:'Beto Cortador',spreader:'Carla Enfestadora'});
 const second=run(ctx,'cut.plan',{orderId,grade:{P:3,M:3,G:0,GG:0},
  workMode:'externo',cutterOne:'Dina Corte',cutterTwo:'Eva Corte',spreader:'Fabi Enfesto'});
 assert.equal(ctx.state.materials[0].stockGrams,16000,'planejar não baixa estoque');
 assert.equal(ctx.state.orders[0].cut.P,0,'planejar não executa o corte');
 run(ctx,'cut.plan.update',{id:second,grade:{P:5,M:4,G:0,GG:0},
  workMode:'externo',cutterOne:'Dina Corte',cutterTwo:'Eva Corte',spreader:'Fabi Enfesto'});
 assert.equal(ctx.state.cutPlans[1].theoreticalGrams,9*120);
 assert.throws(()=>core.apply(ctx.state,{type:'cut.plan',
  payload:{orderId,grade:{P:2,M:0,G:0,GG:0},
   workMode:'interno',cutterOne:'João',cutterTwo:'José',spreader:'Juca'},
  commandId:'OP-INVALID-4',expectedRevision:ctx.state.revision,actor:'CI'}),/excede/);
 assert.throws(()=>core.apply(ctx.state,{type:'cut.plan.complete',
  payload:{id:first,usefulGrams:960,scrapGrams:200,signatureOne:'Pessoa Incorreta',signatureTwo:'Beto Cortador'},
  commandId:'OP-INVALID-5',expectedRevision:ctx.state.revision,actor:'CI'}),/conferências/);
 run(ctx,'cut.plan.complete',{id:first,usefulGrams:960,scrapGrams:200,
  signatureOne:'Ana Cortadora',signatureTwo:'Beto Cortador'});
 assert.equal(ctx.state.materials[0].stockGrams,14840);
 assert.equal(ctx.state.cutPlans[0].status,'concluido');
 assert.equal(ctx.state.orders[0].cut.P,4);
 assert.equal(ctx.state.orders[0].cut.M,4);
 assert.throws(()=>core.apply(ctx.state,{type:'cut.plan.complete',
  payload:{id:first,usefulGrams:960,scrapGrams:0,signatureOne:'Ana Cortadora',signatureTwo:'Beto Cortador'},
  commandId:'OP-INVALID-6',expectedRevision:ctx.state.revision,actor:'CI'}),/já foi concluída/);
 run(ctx,'cut.plan.complete',{id:second,usefulGrams:1080,scrapGrams:80,
  signatureOne:'Dina Corte',signatureTwo:'Eva Corte'});
 assert.equal(ctx.state.materials[0].stockGrams,13680);
 assert.deepEqual(ctx.state.orders[0].cut,{P:9,M:8,G:0,GG:0});
 assert.equal(ctx.state.stockLedger.filter(x=>x.type==='corte-planejado').length,2);
 assert.equal(ctx.state.stockLedger.reduce((n,x)=>n+x.deltaGrams,0),-2320);
 assert.equal(core.inspect(ctx.state).ok,true);
 const cloneCtx=structuredClone(ctx.state);
 assert.equal(cloneCtx.cutPlans[1].signatureOne,'Dina Corte');
 assert.equal(cloneCtx.cutPlans[1].scrapGrams,80);
});
test('cancelar folha aberta libera reserva sem apagar rastreabilidade ou consumir estoque',()=>{
 const ctx=setup(),orderId=run(ctx,'order.add',{clientId:'CLI-0001',productId:'PRO-0001',grade:graded(4,2)});
 const id=run(ctx,'cut.plan',{orderId,grade:{P:4,M:2,G:0,GG:0},
  workMode:'interno',cutterOne:'Ana',cutterTwo:'Beto',spreader:'Carla'});
 assert.throws(()=>core.apply(ctx.state,{type:'cut.record',
  payload:{orderId,size:'P',qty:1},commandId:'OP-RESERVED',actor:'CI',
  expectedRevision:ctx.state.revision}),/disponível/);
 run(ctx,'cut.plan.cancel',{id});
 assert.equal(ctx.state.cutPlans[0].status,'cancelado');
 assert.equal(ctx.state.materials[0].stockGrams,16000);
 run(ctx,'cut.record',{orderId,size:'P',qty:4});
 assert.equal(ctx.state.orders[0].cut.P,4);
 assert.equal(ctx.state.cutPlans[0].cancelledCommandId.startsWith('OP-DEMO'),true);
 assert.equal(core.inspect(ctx.state).ok,true);
});


test('troca de facção antes do retorno registra origem/destino e impede sobrescrever acerto',()=>{
 const ctx=setup(),orderId=run(ctx,'order.add',{clientId:'CLI-0001',productId:'PRO-0001',grade:graded()});
 run(ctx,'cut.record',{orderId,size:'P',qty:10});
 run(ctx,'faction.allocate',{orderId,factionId:'FAC-0001',qty:8});
 const transfer=run(ctx,'faction.reassign',{orderId,factionId:'FAC-0002',reason:'Entrega redirecionada fictícia'});
 assert.equal(ctx.state.orders[0].factionId,'FAC-0002');
 assert.equal(ctx.state.factionTransfers.length,1);
 assert.equal(ctx.state.factionTransfers[0].id,'TRO-0001');
 assert.equal(ctx.state.factionTransfers[0].fromFactionId,'FAC-0001');
 assert.equal(ctx.state.factionTransfers[0].toFactionId,'FAC-0002');
 assert.match(transfer,/FAC-0001 → FAC-0002/);
 const acerto=run(ctx,'faction.return',{orderId,qty:5});
 assert.equal(ctx.state.settlements.find(x=>x.id===acerto).factionId,'FAC-0002');
 const before=JSON.stringify(ctx.state);
 assert.throws(()=>core.apply(ctx.state,{type:'faction.reassign',
  payload:{orderId,factionId:'FAC-0001',reason:'Tentativa indevida'},
  expectedRevision:ctx.state.revision,commandId:'OP-FAIL-TRANSFER',actor:'Teste'}),/bloqueada após retorno/);
 assert.equal(JSON.stringify(ctx.state),before,'o histórico e a facção não podem desaparecer');
});
test('preço por produto e travetada só alteram retornos futuros, sem recalcular acertos antigos',()=>{
 const ctx=setup(),orderId=run(ctx,'order.add',{clientId:'CLI-0001',productId:'PRO-0001',grade:graded()});
 run(ctx,'cut.record',{orderId,size:'P',qty:10});
 run(ctx,'faction.allocate',{orderId,factionId:'FAC-0002',qty:10});
 run(ctx,'faction.rate.set',{factionId:'FAC-0002',productId:'PRO-0001',unitCents:700,
  reason:'Valor específico do modelo'});
 let id=run(ctx,'faction.return',{orderId,qty:5});
 assert.equal(ctx.state.settlements.find(x=>x.id===id).unitCents,650);
 assert.equal(ctx.state.settlements.find(x=>x.id===id).amountCents,3250);
 run(ctx,'faction.traveta.set',{factionId:'FAC-0002',traveta:true,reason:'Cadastrou travetada'});
 const second=run(ctx,'faction.return',{orderId,qty:3});
 assert.equal(ctx.state.settlements.find(x=>x.id===second).unitCents,700);
 assert.equal(ctx.state.settlements.find(x=>x.id===second).amountCents,2100);
 assert.equal(ctx.state.settlements.find(x=>x.id===id).amountCents,3250,'retorno anterior congelado');
 assert.equal(ctx.state.finance.find(x=>x.sourceId===id).amountCents,3250);
 assert.equal(ctx.state.finance.find(x=>x.sourceId===second).amountCents,2100);
 assert.equal(core.inspect(ctx.state).ok,true);
});
test('embalagem avulsa e desconto por travetada reconciliam acerto-Hub, inclusive após pagamento',()=>{
 const ctx=setup();
 const id=run(ctx,'settlement.add',{factionId:'FAC-0001',productId:'PRO-0002',serviceType:'embalagem',
  qty:100,unitCents:25,travetaCents:5,reason:'Embalagem exemplo com desconto'});
 const acerto=ctx.state.settlements.find(x=>x.id===id);
 const conta=ctx.state.finance.find(x=>x.sourceId===id);
 assert.equal(acerto.kind,'avulso');assert.equal(acerto.serviceType,'embalagem');
 assert.equal(acerto.unitCents,20);assert.equal(acerto.amountCents,2000);
 assert.equal(conta.amountCents,2000);assert.equal(conta.status,'aberto');
 run(ctx,'settlement.adjust',{id,adjustmentCents:100,reason:'Conferência de embalagem'});
 assert.equal(acerto.amountCents,2000,'a referência antiga da transação é imutável');
 const current=ctx.state.settlements.find(x=>x.id===id);
 assert.equal(current.amountCents,2100);
 assert.equal(current.history.length,1);
 assert.equal(current.history[0].beforeCents,2000);
 assert.equal(current.history[0].afterCents,2100);
 assert.equal(ctx.state.finance.find(x=>x.sourceId===id).amountCents,2100);
 run(ctx,'finance.pay',{id:ctx.state.finance.find(x=>x.sourceId===id).id});
 assert.equal(ctx.state.settlements.find(x=>x.id===id).status,'pago');
 assert.equal(ctx.state.finance.find(x=>x.sourceId===id).status,'pago');
 const snapshot=JSON.stringify(ctx.state);
 assert.throws(()=>core.apply(ctx.state,{type:'settlement.adjust',
  payload:{id,adjustmentCents:300,reason:'Após pagar'},commandId:'OP-PAGO-IMPOSSIVEL',
  expectedRevision:ctx.state.revision,actor:'CI'}),/Acerto pago/);
 assert.equal(JSON.stringify(ctx.state),snapshot);
 assert.equal(core.inspect(ctx.state).ok,true);
});
test('validação de avulso e tarifa rejeita erros sem criar pagamentos ou corromper valores',()=>{
 const ctx=setup();
 const base={factionId:'FAC-0001',productId:'PRO-0002',serviceType:'embalagem',
  qty:10,unitCents:25,travetaCents:0,reason:'Serviço de teste'};
 const mistakes=[
  {travetaCents:25},{unitCents:0},{qty:0},{serviceType:'pagamento'},{factionId:'FAC-9999'},
  {reason:''}
 ];
 for(const [i,part] of mistakes.entries()){
  assert.throws(()=>core.apply(ctx.state,{type:'settlement.add',payload:{...base,...part},
   commandId:'OP-INVALIDO-'+i,actor:'CI',expectedRevision:ctx.state.revision}));
  assert.equal(ctx.state.settlements.length,0);
  assert.equal(ctx.state.finance.length,0);
  assert.equal(ctx.state.revision,1);
 }
 assert.equal(core.inspect(ctx.state).ok,true);
});


test('devolução parcial do retorno mantém acerto e baixa no Hub sem violar peças separadas',()=>{
 const ctx=setup(),orderId=run(ctx,'order.add',{clientId:'CLI-0001',productId:'PRO-0001',grade:graded()});
 run(ctx,'cut.record',{orderId,size:'P',qty:10});
 run(ctx,'faction.allocate',{orderId,factionId:'FAC-0002',qty:10});
 const id=run(ctx,'faction.return',{orderId,qty:10});
 run(ctx,'order.separate',{orderId,qty:8});
 const old=JSON.stringify(ctx.state),rev=ctx.state.revision;
 assert.throws(()=>core.apply(ctx.state,{type:'settlement.pieces.return',
  payload:{id,qty:3,reason:'Peças devolvidas'},commandId:'OP-FAIL-RETURN',
  expectedRevision:rev,actor:'CI'}),/saldo não separado/);
 assert.equal(JSON.stringify(ctx.state),old);
 run(ctx,'settlement.pieces.return',{id,qty:2,reason:'Duas peças reenviadas à facção'});
 const x=ctx.state.settlements.find(x=>x.id===id),bill=ctx.state.finance.find(f=>f.sourceId===id);
 assert.equal(ctx.state.orders[0].returned,8);
 assert.equal(ctx.state.orders[0].separated,8);
 assert.equal(x.qty,8);
 assert.equal(x.amountCents,8*550);
 assert.equal(bill.amountCents,x.amountCents);
 assert.equal(x.returns.length,1);
 assert.equal(x.returns[0].beforeQty,10);
 assert.equal(x.returns[0].afterQty,8);
 assert.match(x.returns[0].reason,/reenviadas/);
 assert.equal(core.inspect(ctx.state).ok,true);
 run(ctx,'finance.pay',{id:bill.id});
 assert.throws(()=>core.apply(ctx.state,{type:'settlement.pieces.return',
  payload:{id,qty:1,reason:'Tentativa após pagar'},commandId:'OP-PAGO-RETURN',
  expectedRevision:ctx.state.revision,actor:'CI'}),/após pagamento/);
});
test('devolução parcial em embalagem avulsa não altera a grade dos pedidos',()=>{
 const ctx=setup(),id=run(ctx,'settlement.add',{
  serviceType:'embalagem',factionId:'FAC-0001',productId:'PRO-0002',
  qty:100,unitCents:15,travetaCents:5,reason:'Embaladeira fictícia'});
 run(ctx,'settlement.pieces.return',{id,qty:20,reason:'Devolução de embalagens'});
 const x=ctx.state.settlements[0],bill=ctx.state.finance.find(f=>f.sourceId===id);
 assert.equal(x.qty,80);
 assert.equal(x.amountCents,800);
 assert.equal(bill.amountCents,800);
 assert.equal(ctx.state.orders.length,0);
 assert.equal(x.returns.length,1);
 assert.equal(core.inspect(ctx.state).ok,true);
});


test('compensação pós-pagamento cria novo título sem modificar acerto e pagamento original',()=>{
 const ctx=setup(),id=run(ctx,'settlement.add',{
  serviceType:'embalagem',factionId:'FAC-0001',productId:'PRO-0002',
  qty:100,unitCents:25,travetaCents:5,reason:'Embalagem 100 fictícia'});
 const originalBill=ctx.state.finance.find(x=>x.sourceId===id).id;
 run(ctx,'finance.pay',{id:originalBill});
 const oldAmount=ctx.state.settlements.find(x=>x.id===id).amountCents;
 const oldInvoice=structuredClone(ctx.state.finance.find(x=>x.id===originalBill));
 const credit=run(ctx,'settlement.compensate',{id,deltaCents:-500,
  reference:'AJUSTE-001',reason:'Devolução de pagamento fictícia'});
 const debit=run(ctx,'settlement.compensate',{id,deltaCents:250,
  reference:'AJUSTE-002',reason:'Diferença de costura fictícia'});
 assert.equal(credit,'CMP-0001 · receber · -500 centavos (original preservado)');
 assert.equal(debit,'CMP-0002 · pagar · 250 centavos (original preservado)');
 assert.equal(ctx.state.settlements.find(x=>x.id===id).amountCents,oldAmount);
 assert.deepEqual(ctx.state.finance.find(x=>x.id===originalBill),oldInvoice);
 assert.equal(ctx.state.settlementCompensations.length,2);
 assert.deepEqual(ctx.state.finance.filter(x=>x.sourceId.startsWith('CMP-')).map(x=>[x.sourceId,x.kind,x.amountCents,x.status]),
  [['CMP-0001','receber',500,'aberto'],['CMP-0002','pagar',250,'aberto']]);
 assert.equal(core.totals(ctx.state).compensatedNet,-250);
 assert.equal(core.totals(ctx.state).compensations,2);
 assert.equal(core.totals(ctx.state).compensationsOpen,2);
 assert.equal(core.inspect(ctx.state).ok,true);
 const title=ctx.state.finance.find(x=>x.sourceId==='CMP-0001').id;
 run(ctx,'finance.pay',{id:title});
 assert.equal(ctx.state.settlementCompensations[0].status,'pago');
 assert.equal(ctx.state.settlementCompensations[1].status,'aberto');
 assert.equal(core.totals(ctx.state).compensationsOpen,1);
 assert.deepEqual(ctx.state.finance.find(x=>x.id===originalBill),oldInvoice);
 assert.equal(core.inspect(ctx.state).ok,true);
});
test('referência única e revisão bloqueiam correções duplicadas sem mutação',()=>{
 const ctx=setup();
 const id=run(ctx,'settlement.add',{serviceType:'embalagem',factionId:'FAC-0001',
  productId:'PRO-0002',qty:20,unitCents:25,travetaCents:0,reason:'Embalagem teste'});
 const initial=ctx.state.revision;
 assert.throws(()=>core.apply(ctx.state,{type:'settlement.compensate',
  payload:{id,deltaCents:100,reference:'PRÉ-001',reason:'Antes de pagar'},
  commandId:'OP-INVALID-CMP-1',expectedRevision:initial,actor:'CI'}),/após pagamento/);
 run(ctx,'finance.pay',{id:ctx.state.finance.find(x=>x.sourceId===id).id});
 const cmp=run(ctx,'settlement.compensate',{id,deltaCents:100,reference:' PRÉ-001 ',
  reason:'Diferenca ficticia'});
 assert.equal(cmp.startsWith('CMP-'),true);
 const before=JSON.stringify(ctx.state);
 for(const [i,payload] of [
  {id,deltaCents:100,reference:'pré-001',reason:'Repetir'},
  {id,deltaCents:0,reference:'outro',reason:'Zero'},
  {id,deltaCents:-100,reference:'outro',reason:''},
  {id,deltaCents:10000001,reference:'outro',reason:'Fora do limite'},
  {id:'ACE-9999',deltaCents:100,reference:'outro',reason:'Acerto não existe'}
 ].entries()){
  assert.throws(()=>core.apply(ctx.state,{
   type:'settlement.compensate',payload,expectedRevision:ctx.state.revision,
   commandId:'OP-INVALID-CMP-'+(i+2),actor:'CI'}));
  assert.equal(JSON.stringify(ctx.state),before);
 }
 assert.throws(()=>core.apply(ctx.state,{type:'settlement.compensate',
  payload:{id,deltaCents:100,reference:'PRÉ-002',reason:'Concorrência'},
  commandId:'OP-OLD-REV',expectedRevision:ctx.state.revision-1,actor:'CI'}),/CONFLITO/);
 assert.equal(core.inspect(ctx.state).ok,true);
});
test('documento prévio sem campo de compensações continua funcional e não perde dados',()=>{
 const previous=core.initial();
 delete previous.settlementCompensations;
 assert.equal(core.inspect(previous).ok,true);
 const result=core.apply(previous,{type:'client.add',payload:{name:'Cliente Migrado'},
  commandId:'OP-OLD-DOC',expectedRevision:1,actor:'CI'});
 assert.deepEqual(result.state.settlementCompensations,[]);
 assert.equal(result.state.clients.length,3);
 assert.equal(core.inspect(result.state).ok,true);
});
