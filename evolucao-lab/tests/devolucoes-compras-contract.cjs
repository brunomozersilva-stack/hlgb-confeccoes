'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),
 fs=require('node:fs'),path=require('node:path');
const core=require('../operacao-integrada-core.js'),
 purchases=require('../modulos/devolucoes-compras-v1.js');
let count=0;
const command=(state,type,payload={})=>core.apply(state,{
 type,payload,actor:'Laboratório de devoluções',
 commandId:'RET-TEST-'+String(++count).padStart(5,'0'),
 expectedRevision:state.revision
}).state;
function prepared(){
 let s=core.initial();
 s=command(s,'materials.plan.add',{productId:'PRO-0002',color:'Rubi',size:'P',qty:200});
 s=command(s,'purchase.request.create',{materialId:'MAT-0002',
  requester:'Compradora A',reason:'Renda para produção semanal fictícia'});
 s=command(s,'purchase.request.approve',{id:'REQ-0001',
  approver:'Supervisora B',reason:'Conferida previsão'});
 s=command(s,'purchase.request.issue',{id:'REQ-0001',supplierId:'FOR-0001',
  checkerOne:'Cortadora A',checkerTwo:'Cortador B',reason:'Compra aprovada fictícia'});
 s=command(s,'purchase.receive',{id:'COM-0001'});
 assert.equal(core.inspect(s).ok,true);
 return s;
}
const protocol={id:'COM-0001',reference:'DEV-EXEMPLO-001',
 returnedBy:'Almoxarife C',reviewedBy:'Supervisora B',
 reason:'Material recebido com falha na inspeção fictícia'};
const returned=()=>command(prepared(),'purchase.return.full',protocol);

test('devolução integral preserva documento, título, requisição e entrada originais',()=>{
 const initial=prepared(),before=structuredClone(initial),s=command(initial,'purchase.return.full',protocol);
 assert.equal(core.inspect(s).ok,true);
 assert.equal(initial.purchaseReturns.length,0,'estado anterior não mutado');
 assert.equal(s.purchaseOrders[0].received,true);
 assert.equal(s.purchaseOrders[0].cancelled,undefined);
 assert.equal(s.purchaseOrders[0].qtyGrams,before.purchaseOrders[0].qtyGrams);
 assert.equal(s.purchaseOrders[0].priceCentsKg,before.purchaseOrders[0].priceCentsKg);
 assert.equal(s.purchaseRequests[0].status,'recebida');
 assert.equal(s.purchaseOrders[0].returnId,'DEV-0001');
 assert.equal(s.purchaseRequests[0].returnId,'DEV-0001');
 assert.deepEqual(s.finance[0],before.finance[0],'título anterior imutável');
 assert.deepEqual(s.stockLedger[0],before.stockLedger[0],'movimento original imutável');
 assert.equal(s.materials.find(x=>x.id==='MAT-0002').stockGrams,8000);
 assert.equal(s.purchaseReturns.length,1);
 assert.equal(s.purchaseReturns[0].qtyGrams,1000);
 assert.equal(s.purchaseReturns[0].amountCents,4200);
 assert.equal(s.purchaseReturns[0].stockMovementId,s.stockLedger[1].id);
 assert.equal(s.stockLedger[1].deltaGrams,-1000);
 assert.equal(s.stockLedger[1].type,'devolucao_compra');
 assert.equal(s.finance.length,2);
 assert.equal(s.finance[1].kind,'receber');
 assert.equal(s.finance[1].status,'aberto');
 assert.equal(s.finance[1].amountCents,4200);
 assert.equal(s.finance[1].sourceId,s.purchaseReturns[0].id);
 assert.equal(s.log.at(-1).type,'purchase.return.full');
});

test('devolução duplicada ou repetição de comando não alteram o livro',()=>{
 const s=returned(),before=JSON.stringify(s);
 assert.throws(()=>command(s,'purchase.return.full',{...protocol,reference:'DEV-OUTRO'}),/já possui devolução/);
 assert.throws(()=>core.apply(s,{type:'purchase.return.full',payload:protocol,
  commandId:s.log.at(-1).commandId,actor:'Teste',expectedRevision:s.revision}),/Comando já registrado/);
 assert.equal(JSON.stringify(s),before);
});

test('validação de responsável, conferente e solicitante independente',()=>{
 const s=prepared(),before=JSON.stringify(s);
 for(const p of [{...protocol,reviewedBy:'almoxarife c'},
  {...protocol,reviewedBy:'Compradora A'},
  {...protocol,returnedBy:'Compradora A'},
  {...protocol,reason:''},{...protocol,reference:''}]){
  assert.throws(()=>command(s,'purchase.return.full',p));
  assert.equal(JSON.stringify(s),before);
 }
});

test('estoque insuficiente bloqueia operação e não emite crédito fictício',()=>{
 let s=prepared();
 s=command(s,'stock.adjust',{materialId:'MAT-0002',deltaGrams:-8500,
  note:'Material já consumido no cenário'});
 const before=JSON.stringify(s);
 assert.throws(()=>command(s,'purchase.return.full',protocol),/Estoque insuficiente/);
 assert.equal(JSON.stringify(s),before);
 assert.equal(s.finance.length,1);
});

test('compra já paga exige conciliação formal e preserva histórico',()=>{
 let s=prepared();
 s=command(s,'finance.pay',{id:s.finance[0].id});
 const before=JSON.stringify(s);
 assert.throws(()=>command(s,'purchase.return.full',protocol),/título pago/);
 assert.equal(JSON.stringify(s),before);
});

test('compra cancelada ou sem requisição nunca vira devolução',()=>{
 let s=core.initial();
 s=command(s,'purchase.add',{supplierId:'FOR-0001',materialId:'MAT-0002',
  qtyGrams:1000,checkerOne:'Ana',checkerTwo:'Beto'});
 s=command(s,'purchase.receive',{id:'COM-0001'});
 assert.throws(()=>command(s,'purchase.return.full',protocol),/sem requisição/);
 assert.equal(s.finance.length,1);
 let a=core.initial();
 a=command(a,'materials.plan.add',{productId:'PRO-0002',color:'Rubi',size:'P',qty:200});
 a=command(a,'purchase.request.create',{materialId:'MAT-0002',
  requester:'Compradora A',reason:'Reposição'});
 a=command(a,'purchase.request.approve',{id:'REQ-0001',approver:'Supervisora B',reason:'OK'});
 a=command(a,'purchase.request.issue',{id:'REQ-0001',supplierId:'FOR-0001',
  checkerOne:'Ana',checkerTwo:'Beto',reason:'Emissão'});
 a=command(a,'purchase.request.cancelIssued',{id:'REQ-0001',reference:'CANCEL-001',
  cancelledBy:'Almoxarife C',reviewedBy:'Supervisora B',reason:'Fornecedor atrasou'});
 assert.throws(()=>command(a,'purchase.return.full',protocol),/Somente compra efetivamente recebida/);
});

test('não retira dinheiro, notas ou registros anteriores ao crédito',()=>{
 const s=returned();
 assert.equal(s.log.filter(e=>e.type==='purchase.receive').length,1);
 assert.equal(s.log.filter(e=>e.type==='purchase.return.full').length,1);
 assert.equal(s.stockLedger.filter(e=>e.type==='compra').length,1);
 assert.equal(s.stockLedger.filter(e=>e.type==='devolucao_compra').length,1);
 assert.equal(s.finance.filter(f=>f.kind==='pagar').length,1);
 assert.equal(s.finance.filter(f=>f.kind==='receber').length,1);
});

test('crédito recebido fictício atualiza somente seu status e pode ser auditado',()=>{
 const s=returned(),credit=s.purchaseReturns[0].creditFinanceId,base=structuredClone(s.finance[0]);
 const end=command(s,'finance.pay',{id:credit});
 assert.equal(end.purchaseReturns[0].status,'credito_recebido');
 assert.equal(end.finance[1].status,'pago');
 assert.deepEqual(end.finance[0],base);
 assert.equal(core.inspect(end).ok,true);
});

test('Auditor do core detecta movimentos faltantes e duplicados sem repará-los',()=>{
 const good=returned();
 for(const mutate of [
  x=>x.stockLedger.pop(),
  x=>x.stockLedger.push(structuredClone(x.stockLedger[1])),
  x=>x.finance.splice(1,1),
  x=>{x.purchaseReturns[0].qtyGrams=999},
  x=>{x.purchaseRequests[0].returnId='DEV-FAKE'},
  x=>{x.purchaseOrders[0].returnId='DEV-FAKE'},
  x=>{x.purchaseReturns[0].reviewedBy=x.purchaseReturns[0].returnedBy},
  x=>{x.finance[1].amountCents+=5},
  x=>{x.purchaseReturns[0].reference=''},
  x=>{x.purchaseReturns[0].status='credito_recebido'}
 ]){
  const bad=structuredClone(good),before=JSON.stringify(good);
  mutate(bad);
  assert.equal(core.inspect(bad).ok,false,String(mutate).slice(0,80));
  assert.equal(JSON.stringify(good),before,'não modificar documento bom');
 }
});

test('concorrência por revisão e idempotência preservam dados',()=>{
 const s=prepared(),snapshot=JSON.stringify(s);
 assert.throws(()=>core.apply(s,{type:'purchase.return.full',payload:protocol,
  commandId:'DEV-STALE',actor:'Teste',expectedRevision:s.revision-1}),/CONFLITO/);
 assert.equal(JSON.stringify(s),snapshot);
});

test('módulo da prévia não possui rede, Supabase nem código operacional',()=>{
 const dir=path.resolve(__dirname,'..');
 const html=fs.readFileSync(path.join(dir,'operacao-integrada.html'),'utf8');
 const coreJs=fs.readFileSync(path.join(dir,'operacao-integrada-core.js'),'utf8');
 const ui=fs.readFileSync(path.join(dir,'operacao-integrada-ui.js'),'utf8');
 const mod=fs.readFileSync(path.join(dir,'modulos/devolucoes-compras-v1.js'),'utf8');
 assert.match(html,/<script src="\.\/modulos\/devolucoes-compras-v1\.js"><\/script>/);
 assert.match(coreJs,/purchase\.return\.full/);
 assert.match(ui,/Devolução integral após recebimento/);
 assert.match(ui,/Devoluções formais de compras recebidas/);
 assert.match(ui,/\['Devolução integral'/);
 for(const bad of [/\bfetch\s*\(/,/\bXMLHttpRequest\b/,/\bWebSocket\b/,
  /https?:\/\//,/\bsupabase\.co\b/i])
  assert.equal(bad.test(mod),false,'API proibida '+bad);
 assert.equal(purchases.version,'1.0.0');
});
