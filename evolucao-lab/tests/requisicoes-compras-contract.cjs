'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),
 fs=require('node:fs'),path=require('node:path');
const core=require('../operacao-integrada-core.js'),
 planner=require('../modulos/planejamento-materiais-v1.js'),
 requests=require('../modulos/requisicoes-compras-v1.js'),
 auditor=require('../modulos/observabilidade-v2.js');
let n=1;
function cmd(s,type,payload={},commandId=null){
 const answer=core.apply(s,{type,payload,actor:'Operador fictício de homologação',
  commandId:commandId||'REQ-TEST-'+String(n++).padStart(5,'0'),
  expectedRevision:s.revision});
 assert.equal(core.inspect(answer.state).ok,true,'Integridade após '+type);
 return answer.state;
}
function base(){
 let s=core.initial();
 s=cmd(s,'materials.plan.add',{productId:'PRO-0002',color:'Preto',size:'P',qty:200});
 return s;
}
const create={materialId:'MAT-0002',requester:'Compradora A',
 reason:'Programação da semana de testes'};
const approval={id:'REQ-0001',approver:'Supervisora B',
 reason:'Revisão fictícia de demanda e estoque'};
const issue={id:'REQ-0001',supplierId:'FOR-0001',checkerOne:'Ana Conferente',
 checkerTwo:'Beto Conferente',reason:'Emissão após revisão separada'};
test('previsão de falta e criação de rascunho sem compra, estoque ou Hub',()=>{
 let s=base();const old=JSON.stringify(s);
 const data=requests.preview(s,planner);
 assert.equal(data.pendingMaterials.find(x=>x.materialId==='MAT-0002').missingGrams,1000);
 assert.equal(JSON.stringify(s),old);
 const previousRevision=s.revision;
 s=cmd(s,'purchase.request.create',create,'REQ-CRIADA-001');
 assert.equal(s.revision,previousRevision+1);
 assert.equal(s.purchaseRequests.length,1);
 const r=s.purchaseRequests[0];
 assert.equal(r.id,'REQ-0001');
 assert.equal(r.status,'rascunho');
 assert.equal(r.qtyGrams,1000);
 assert.equal(r.requiredGrams,9000);
 assert.equal(r.availableGrams,8000);
 assert.equal(r.priceCentsKg,4200);
 assert.equal(r.estimatedCents,4200);
 assert.deepEqual(r.planLineIds,['PLN-0001']);
 assert.equal(r.createdCommandId,'REQ-CRIADA-001');
 assert.equal(s.purchaseOrders.length,0);
 assert.equal(s.stockLedger.length,0);
 assert.equal(s.finance.length,0);
 assert.equal(requests.preview(s,planner).pendingMaterials.length,0);
 assert.equal(auditor.analyze(s).findings.length,0);
});
test('aprovação separada, emissão com fornecedor e recebimento único reconciliado',()=>{
 let s=base();
 s=cmd(s,'purchase.request.create',create);
 s=cmd(s,'purchase.request.approve',approval);
 assert.equal(s.purchaseRequests[0].status,'aprovada');
 assert.equal(s.purchaseRequests[0].approver,'Supervisora B');
 assert.equal(s.purchaseOrders.length,0);
 assert.equal(s.finance.length,0);
 s=cmd(s,'purchase.request.issue',issue,'REQ-EMISSAO-001');
 let r=s.purchaseRequests[0];
 assert.equal(r.status,'emitida');
 assert.equal(r.purchaseId,'COM-0001');
 assert.equal(s.purchaseOrders.length,1);
 assert.equal(s.purchaseOrders[0].purchaseRequestId,r.id);
 assert.equal(s.purchaseOrders[0].qtyGrams,1000);
 assert.equal(s.purchaseOrders[0].priceCentsKg,4200);
 assert.equal(s.purchaseOrders[0].received,false);
 assert.equal(s.stockLedger.length,0);
 assert.equal(s.finance.length,0);
 const before=s.revision;
 s=cmd(s,'purchase.receive',{id:'COM-0001'},'REQ-RECEBIMENTO-001');
 r=s.purchaseRequests[0];
 assert.equal(s.revision,before+1);
 assert.equal(r.status,'recebida');
 assert.equal(r.receiptCommandId,'REQ-RECEBIMENTO-001');
 assert.equal(s.materials.find(x=>x.id==='MAT-0002').stockGrams,9000);
 assert.equal(s.stockLedger.length,1);
 assert.deepEqual([s.stockLedger[0].materialId,s.stockLedger[0].deltaGrams,
  s.stockLedger[0].sourceId,s.stockLedger[0].type],
 ['MAT-0002',1000,'COM-0001','compra']);
 assert.equal(s.finance.length,1);
 assert.deepEqual([s.finance[0].sourceId,s.finance[0].kind,s.finance[0].amountCents],
  ['COM-0001','pagar',4200]);
 assert.equal(auditor.analyze(s).summary.receivedPurchaseRequests,1);
 assert.equal(auditor.analyze(s).findings.length,0);
 const snapshot=JSON.stringify(s);
 for(const [type,payload,re] of [
  ['purchase.receive',{id:'COM-0001'},/já recebida/],
  ['purchase.request.issue',issue,/Apenas requisição aprovada/],
  ['purchase.request.cancel',{id:'REQ-0001',reason:'Inadequado'},/não emitidas/],
  ['purchase.request.approve',approval,/rascunho/]
 ]){
  assert.throws(()=>cmd(s,type,payload),re);
  assert.equal(JSON.stringify(s),snapshot);
 }
});
test('bloqueio contra requisição dupla e aprovação pela mesma pessoa, sem mutação',()=>{
 let s=base();
 s=cmd(s,'purchase.request.create',create);
 const snapshot=JSON.stringify(s);
 assert.throws(()=>cmd(s,'purchase.request.create',create),/Já existe requisição ativa/);
 assert.throws(()=>cmd(s,'purchase.request.approve',{...approval,approver:' compradora a '}),
  /pessoas diferentes/);
 assert.throws(()=>cmd(s,'purchase.request.issue',issue),/Apenas requisição aprovada/);
 assert.throws(()=>cmd(s,'purchase.request.approve',{...approval,reason:''}),/Motivo/);
 assert.equal(JSON.stringify(s),snapshot);
});
test('mudanças de planejamento, receita ou estoque bloqueiam aprovar/emitir dado obsoleto',()=>{
 for(const alteration of [
  s=>cmd(s,'materials.plan.archive',{id:'PLN-0001',reason:'Cenário suspenso'}),
  s=>cmd(s,'stock.adjust',{materialId:'MAT-0002',deltaGrams:100,note:'Entrada de teste'}),
  s=>cmd(s,'material.recipe.set',{productId:'PRO-0002',materialId:'MAT-0002',
   color:'Preto',size:'P',gramsPerUnit:50,reason:'Alteração fictícia'})
 ]){
  let s=base();s=cmd(s,'purchase.request.create',create);
  s=alteration(s);
  const snapshot=JSON.stringify(s);
  assert.throws(()=>cmd(s,'purchase.request.approve',approval),
   /Planejamento ou estoque mudou|Não há falta calculada/);
  assert.equal(JSON.stringify(s),snapshot);
  s=cmd(s,'purchase.request.cancel',{id:'REQ-0001',reason:'Base alterada'});
  assert.equal(s.purchaseRequests[0].status,'cancelada');
  assert.equal(s.purchaseOrders.length,0);
 }
 let s=base();
 s=cmd(s,'purchase.request.create',create);
 s=cmd(s,'purchase.request.approve',approval);
 s=cmd(s,'stock.adjust',{materialId:'MAT-0002',deltaGrams:-100,note:'Corte fictício extra'});
 const prev=JSON.stringify(s);
 assert.throws(()=>cmd(s,'purchase.request.issue',issue),/Planejamento ou estoque mudou/);
 assert.equal(JSON.stringify(s),prev);
});
test('cancelamento conserva histórico e permite nova requisição após revisão',()=>{
 let s=base();
 s=cmd(s,'purchase.request.create',create);
 s=cmd(s,'purchase.request.cancel',{id:'REQ-0001',reason:'Reavaliar demanda'});
 assert.equal(s.purchaseRequests[0].status,'cancelada');
 assert.equal(s.purchaseRequests[0].previousStatus,'rascunho');
 assert.equal(s.purchaseOrders.length,0);
 s=cmd(s,'purchase.request.create',create);
 assert.equal(s.purchaseRequests.length,2);
 assert.equal(s.purchaseRequests[0].status,'cancelada');
 assert.equal(s.purchaseRequests[1].status,'rascunho');
 assert.equal(s.purchaseRequests[1].id,'REQ-0002');
 s=cmd(s,'purchase.request.approve',{...approval,id:'REQ-0002'});
 s=cmd(s,'purchase.request.cancel',{id:'REQ-0002',reason:'Aprovação revogada'});
 assert.equal(s.purchaseRequests[1].previousStatus,'aprovada');
 assert.equal(auditor.analyze(s).findings.length,0);
});
test('requisição de diferentes materiais convive sem misturar fornecedores e quantidades',()=>{
 let s=base();
 s=cmd(s,'materials.plan.add',{productId:'PRO-0001',color:'Preto',size:'P',qty:150});
 let p=planner.preview(s);
 assert.deepEqual(p.materials.filter(x=>x.missingGrams>0).map(x=>x.materialId).sort(),
  ['MAT-0001','MAT-0002']);
 s=cmd(s,'purchase.request.create',create);
 s=cmd(s,'purchase.request.create',{materialId:'MAT-0001',
  requester:'Compradora A',reason:'Repor malha para a produção'});
 assert.equal(s.purchaseRequests.length,2);
 assert.equal(s.purchaseRequests[1].qtyGrams,2000);
 assert.equal(s.purchaseRequests[1].estimatedCents,5600);
 s=cmd(s,'purchase.request.approve',{...approval,id:'REQ-0002'});
 s=cmd(s,'purchase.request.issue',{...issue,id:'REQ-0002',supplierId:'FOR-0002'});
 assert.equal(s.purchaseOrders[0].materialId,'MAT-0001');
 assert.equal(s.purchaseOrders[0].supplierId,'FOR-0002');
 assert.equal(s.purchaseRequests[0].status,'rascunho');
 assert.equal(s.purchaseRequests[1].status,'emitida');
 assert.equal(auditor.analyze(s).findings.length,0);
});
test('Auditor detecta compra/estado adulterado e permanece somente leitura',()=>{
 let s=base();
 s=cmd(s,'purchase.request.create',create);
 s=cmd(s,'purchase.request.approve',approval);
 s=cmd(s,'purchase.request.issue',issue);
 for(const mutation of [
  x=>{x.purchaseRequests[0].qtyGrams+=10},
  x=>{x.purchaseRequests[0].approver='Compradora A'},
  x=>{x.purchaseRequests[0].purchaseId='COM-9999'},
  x=>{x.purchaseOrders[0].qtyGrams+=10},
  x=>{x.purchaseRequests.push({...x.purchaseRequests[0],id:'REQ-0999'})},
  x=>{x.purchaseOrders[0].purchaseRequestId='REQ-0002'}
 ]){
  const broken=structuredClone(s);
  mutation(broken);const previous=JSON.stringify(broken);
  assert.equal(core.inspect(broken).ok,false);
  assert.ok(auditor.analyze(broken).findings.some(f=>f.code.startsWith('REQUISICAO_')));
  assert.equal(JSON.stringify(broken),previous);
 }
 assert.equal(auditor.analyze(s).findings.length,0);
});
test('documentos antigos sem requisições continuam íntegros sem mudança no original',()=>{
 const s=core.initial();
 delete s.purchaseRequests;
 const before=JSON.stringify(s);
 assert.equal(requests.inspect(s).length,0);
 assert.equal(core.inspect(s).ok,true);
 let revised=cmd(s,'materials.plan.add',{productId:'PRO-0002',color:'Rubi',size:'M',qty:200});
 revised=cmd(revised,'purchase.request.create',
  {materialId:'MAT-0002',requester:'Compradora A',reason:'Repor cenário legado'});
 assert.equal(JSON.stringify(s),before);
 assert.equal(revised.purchaseRequests[0].id,'REQ-0001');
 assert.equal(core.inspect(revised).ok,true);
});
test('módulo de requisições não acessa rede, banco ou sistema de produção',()=>{
 const js=fs.readFileSync(path.join(__dirname,'../modulos/requisicoes-compras-v1.js'),'utf8');
 assert.equal(requests.version,'1.0.0');
 for(const re of [/\bfetch\s*\(/,/\bXMLHttpRequest\b/,/\bWebSocket\b/,/https?:\/\//,
  /\blocalStorage\b/,/\bindexedDB\b/,/\bsupabase\b/i,/document\.cookie/,/window\.location/])
  assert.equal(re.test(js),false,String(re));
});
