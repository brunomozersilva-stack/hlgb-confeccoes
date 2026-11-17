'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),
fs=require('node:fs'),path=require('node:path');
const core=require('../operacao-integrada-core.js');
const observer=require('../modulos/observabilidade-v2.js');
const requests=require('../modulos/requisicoes-compras-v1.js');
let n=0;
function exec(s,type,payload={},id=null){
 return core.apply(s,{type,payload,actor:'Homologação de compras canceladas',
  commandId:id||'CANCEL-TEST-'+String(++n).padStart(4,'0'),
  expectedRevision:s.revision}).state;
}
function ready(){
 let s=core.initial();
 s=exec(s,'materials.plan.add',{productId:'PRO-0002',color:'Rubi',
  size:'P',qty:200});
 s=exec(s,'purchase.request.create',{materialId:'MAT-0002',
  requester:'Compradora A',reason:'Falta fictícia de renda'});
 s=exec(s,'purchase.request.approve',{id:'REQ-0001',approver:'Supervisora B',
  reason:'Aprovação do pedido interno'});
 s=exec(s,'purchase.request.issue',{id:'REQ-0001',
  supplierId:'FOR-0001',checkerOne:'Cortadora A',checkerTwo:'Cortador B',
  reason:'Compra fictícia emitida para reposição'});
 assert.equal(core.inspect(s).ok,true);
 return s;
}
const cancel={id:'REQ-0001',reference:'CANCEL-0001',
 cancelledBy:'Auxiliar C',reviewedBy:'Supervisora B',
 reason:'Fornecedor não poderá atender a compra fictícia'};
test('compra emitida pode ser cancelada sem excluir COM nem alterar saldo ou Hub',()=>{
 let s=ready();
 const original=structuredClone(s.purchaseOrders[0]),before=JSON.stringify(s);
 const lastRev=s.revision;
 s=exec(s,'purchase.request.cancelIssued',cancel,'CANCEL-CMD-001');
 assert.equal(s.revision,lastRev+1);
 assert.equal(s.purchaseRequests[0].status,'emissao_cancelada');
 assert.equal(s.purchaseOrders[0].id,'COM-0001');
 assert.equal(s.purchaseOrders[0].cancelled,true);
 assert.equal(s.purchaseOrders[0].received,false);
 for(const field of ['id','supplierId','materialId','qtyGrams','priceCentsKg',
  'checkerOne','checkerTwo','purchaseRequestId'])
  assert.equal(s.purchaseOrders[0][field],original[field],'campo histórico '+field);
 assert.equal(s.purchaseOrders[0].cancelCommandId,'CANCEL-CMD-001');
 assert.equal(s.purchaseRequests[0].cancelIssueReference,'CANCEL-0001');
 assert.equal(s.purchaseRequests[0].cancelReviewedBy,'Supervisora B');
 assert.equal(s.purchaseRequests[0].purchaseId,'COM-0001');
 assert.equal(s.finance.length,0);
 assert.equal(s.stockLedger.length,0);
 assert.equal(s.materials.find(x=>x.id==='MAT-0002').stockGrams,8000);
 assert.equal(core.inspect(s).ok,true);
 assert.equal(observer.analyze(s).findings.length,0);
 assert.equal(observer.analyze(s).summary.cancelledIssuedPurchases,1);
 assert.notEqual(JSON.stringify(s),before);
});
test('cancelamento de compra emitida impede qualquer entrada de estoque e título',()=>{
 let s=exec(ready(),'purchase.request.cancelIssued',cancel);
 const snapshot=JSON.stringify(s);
 for(const [type,payload,re] of [
  ['purchase.receive',{id:'COM-0001'},/formalmente cancelada/],
  ['purchase.request.cancelIssued',cancel,/Somente requisição emitida/],
  ['purchase.request.issue',{id:'REQ-0001',supplierId:'FOR-0002',
   checkerOne:'A',checkerTwo:'B',reason:'Repetir'},/Apenas requisição aprovada/]
 ]){
  assert.throws(()=>exec(s,type,payload),re);
  assert.equal(JSON.stringify(s),snapshot,'falha mantém todo o histórico intacto');
 }
 const newReq=exec(s,'purchase.request.create',{materialId:'MAT-0002',
  requester:'Compradora A',reason:'Nova tentativa de cotação'});
 assert.equal(newReq.purchaseRequests.length,2);
 assert.equal(newReq.purchaseRequests[1].id,'REQ-0002');
 assert.equal(newReq.purchaseOrders.length,1);
 assert.equal(newReq.purchaseOrders[0].cancelled,true);
 assert.equal(core.inspect(newReq).ok,true);
});
test('recebida nunca pode ser cancelada, mesmo que requisição tenha sido emitida',()=>{
 let s=ready();
 s=exec(s,'purchase.receive',{id:'COM-0001'});
 assert.equal(s.purchaseRequests[0].status,'recebida');
 const snapshot=JSON.stringify(s);
 assert.throws(()=>exec(s,'purchase.request.cancelIssued',cancel),/Somente requisição emitida/);
 assert.equal(JSON.stringify(s),snapshot);
 assert.equal(s.finance.length,1);
 assert.equal(s.stockLedger.length,1);
 assert.equal(observer.analyze(s).findings.length,0);
});
test('recusa conferentes iguais ou revisão pelo solicitante antes de modificar a compra',()=>{
 const s=ready(),snapshot=JSON.stringify(s);
 for(const c of [
  {...cancel,reviewedBy:' auxiliar c '},
  {...cancel,reviewedBy:'Compradora A'},
  {...cancel,reference:''},
  {...cancel,reason:''},
  {...cancel,cancelledBy:''}
 ]){
  assert.throws(()=>exec(s,'purchase.request.cancelIssued',c),
   /Conferência independente|obrigatório/);
  assert.equal(JSON.stringify(s),snapshot);
 }
});
test('não cancela compra com movimento ou título inesperado; não apaga evidência',()=>{
 const s=ready();
 for(const mutation of [
  x=>{x.purchaseOrders[0].received=true},
  x=>{x.stockLedger.push({id:'MOV-9001',sourceId:'COM-0001',
   materialId:'MAT-0002',deltaGrams:1000,type:'compra'})},
  x=>{x.finance.push({id:'FIN-9001',sourceId:'COM-0001',
   kind:'pagar',amountCents:4200,status:'aberto'})}
 ]){
  const broken=structuredClone(s);mutation(broken);
  const copy=JSON.stringify(broken);
  assert.throws(()=>exec(broken,'purchase.request.cancelIssued',cancel),
   /já possui recebimento, estoque ou título/);
  assert.equal(JSON.stringify(broken),copy);
 }
});
test('cancelamento duplicado com referência diferente não pode reescrever evento',()=>{
 let s=ready();
 s=exec(s,'purchase.request.cancelIssued',cancel);
 const copy=JSON.stringify(s);
 assert.throws(()=>exec(s,'purchase.request.cancelIssued',
  {...cancel,reference:'CANCEL-0002'}),/Somente requisição emitida/);
 assert.equal(JSON.stringify(s),copy);
});
test('referências de cancelamento únicas em várias requisições e materiais',()=>{
 let s=ready();
 s=exec(s,'purchase.request.cancelIssued',cancel);
 s=exec(s,'materials.plan.add',{productId:'PRO-0001',color:'Preto',
  size:'P',qty:200});
 s=exec(s,'purchase.request.create',{materialId:'MAT-0001',
  requester:'Compradora A',reason:'Outra compra'});
 s=exec(s,'purchase.request.approve',{id:'REQ-0002',approver:'Supervisora B',
  reason:'Autorizado'});
 s=exec(s,'purchase.request.issue',{id:'REQ-0002',supplierId:'FOR-0002',
  checkerOne:'Cortadora A',checkerTwo:'Cortador B',reason:'Nova compra'});
 const before=JSON.stringify(s);
 assert.throws(()=>exec(s,'purchase.request.cancelIssued',
  {...cancel,id:'REQ-0002',reference:' cancel-0001 '}),
 /Referência de cancelamento já registrada/);
 assert.equal(JSON.stringify(s),before);
 s=exec(s,'purchase.request.cancelIssued',
  {...cancel,id:'REQ-0002',reference:'CANCEL-0002'});
 assert.equal(s.purchaseRequests[1].status,'emissao_cancelada');
 assert.equal(s.purchaseOrders.length,2);
 assert.equal(observer.analyze(s).findings.length,0);
});
test('Auditor e núcleo detectam compra cancelada adulterada sem autocorreção',()=>{
 let s=ready();s=exec(s,'purchase.request.cancelIssued',cancel);
 for(const mutation of [
  x=>{x.purchaseOrders[0].cancelled=false},
  x=>{x.purchaseOrders[0].cancelCommandId='CANCEL-CMD-FALSO'},
  x=>{x.purchaseRequests[0].cancelIssueReference='OUTRO'},
  x=>{x.purchaseRequests[0].cancelReviewedBy='Auxiliar C'},
  x=>{x.purchaseOrders[0].received=true},
  x=>{x.finance.push({id:'FIN-9001',sourceId:'COM-0001',
   kind:'pagar',amountCents:4200,status:'aberto'})},
  x=>{x.purchaseRequests[0].status='emitida'}
 ]){
  const broken=structuredClone(s);mutation(broken);
  const previous=JSON.stringify(broken);
  assert.equal(core.inspect(broken).ok,false);
  assert.ok(observer.analyze(broken).findings.some(x=>x.code.startsWith('REQUISICAO_')));
  assert.equal(JSON.stringify(broken),previous);
 }
 assert.equal(observer.analyze(s).findings.length,0);
});
test('compras antigas avulsas e documentos anteriores continuam sem conversão',()=>{
 let s=core.initial();delete s.purchaseRequests;
 s=exec(s,'purchase.add',{materialId:'MAT-0002',supplierId:'FOR-0001',
  qtyGrams:500,checkerOne:'A',checkerTwo:'B'});
 assert.equal(s.purchaseOrders[0].purchaseRequestId,undefined);
 assert.equal(s.purchaseOrders[0].cancelled,undefined);
 s=exec(s,'purchase.receive',{id:'COM-0001'});
 assert.equal(s.materials.find(x=>x.id==='MAT-0002').stockGrams,8500);
 assert.equal(s.stockLedger.length,1);
 assert.equal(s.finance.length,1);
 assert.equal(core.inspect(s).ok,true);
});
test('cancelamento formal não utiliza rede, bancos ou automações externas',()=>{
 const js=fs.readFileSync(path.join(__dirname,'../modulos/requisicoes-compras-v1.js'),'utf8');
 for(const re of [/\bfetch\s*\(/,/\bXMLHttpRequest\b/,/\bWebSocket\b/,
 /https?:\/\//,/\blocalStorage\b/,/\bindexedDB\b/,/\bsupabase\b/i,
 /document\.cookie/,/window\.location/])assert.equal(re.test(js),false,String(re));
});
