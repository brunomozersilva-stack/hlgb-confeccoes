'use strict';
const assert=require('node:assert/strict'),test=require('node:test'),fs=require('node:fs'),
 path=require('node:path');
const {review}=require('../migracao/preflight-vinculos-operacionais.cjs');
function sample(){
 const legacy={id:'PED-COMERCIAL-87',clientId:'CLI-01',grade:[
  {productId:'PRO-A',color:'Preto',size:'P',qty:40},
  {productId:'PRO-A',color:'Preto',size:'M',qty:60},
  {productId:'PRO-B',color:'Rubi',size:'P',qty:20},
  {productId:'PRO-B',color:'Rubi',size:'M',qty:30}
 ]};
 const prepared={id:'PDM-HOMOLOGA-01',clientId:'CLI-01',sizes:['P','M'],items:[
  {id:'ITM-001',productId:'PRO-A',qty:100,priceCents:2500,amountCents:250000,
   colors:[{color:'Preto',grade:{P:40,M:60}}]},
  {id:'ITM-002',productId:'PRO-B',qty:50,priceCents:1200,amountCents:60000,
   colors:[{color:'Rubi',grade:{P:20,M:30}}]}
 ],totals:{pieces:150,amountCents:310000}};
 const evidence={orderId:'PED-COMERCIAL-87',
  cuts:[{id:'CUT-1',orderId:legacy.id,productId:'PRO-A',qty:60,status:'concluido'},
   {id:'CUT-2',orderId:legacy.id,productId:'PRO-A',qty:20,status:'planejado'}],
  allocations:[{id:'SEND-1',orderId:legacy.id,productId:'PRO-A',qty:40,status:'enviado',cutId:'CUT-1',factionId:'FAC-1'},
   {id:'RETURN-1',orderId:legacy.id,productId:'PRO-A',qty:20,status:'retornado',sourceAllocationId:'SEND-1',factionId:'FAC-1'}],
  settlements:[{id:'ACE-1',orderId:legacy.id,productId:'PRO-A',qty:20,amountCents:4000,status:'aberto',returnId:'RETURN-1'}],
  finance:[{id:'FIN-1',orderId:legacy.id,sourceId:'ACE-1',kind:'pagar',amountCents:4000,status:'aberto'}]};
 return {legacy,prepared,evidence};
}
test('grade equivalente com histórico de corte e facção não permite migração automática',()=>{
 const {legacy,prepared,evidence}=sample(),snap=JSON.stringify([legacy,prepared,evidence]);
 const r=review(legacy,prepared,evidence);
 assert.equal(r.grade.gradeEquivalent,true);
 assert.equal(r.models[0].ordered,100);
 assert.equal(r.models[0].planned,20);
 assert.equal(r.models[0].cut,60);
 assert.equal(r.models[0].sent,40);
 assert.equal(r.models[0].returned,20);
 assert.equal(r.models[0].settled,20);
 assert.equal(r.collections.finance.records,1);
 assert.equal(r.collections.finance.independentlyVerified,false);
 assert.equal(r.sourceCoverage,'extrato_fornecido_sem_prova_de_completude');
 assert.equal(r.canExecute,false);
 assert.equal(r.canPay,false);assert.equal(r.canChangeStock,false);
 assert.equal(r.readyForCommercialMigration,false);
 assert.ok(r.findings.some(x=>x.code==='HISTORICO_OPERACIONAL_EXISTENTE'));
 assert.equal(JSON.stringify([legacy,prepared,evidence]),snap);
});
test('dados não fornecidos não equivalem a inexistência de acertos ou títulos',()=>{
 const {legacy,prepared}=sample();
 const result=review(legacy,prepared,{});
 assert.equal(result.collections.settlements.verified,false);
 assert.equal(result.collections.finance.verified,false);
 assert.equal(result.collections.cuts.verified,false);
 assert.ok(result.findings.filter(x=>x.code==='COLECAO_NAO_CONFERIDA').length===4);
 assert.equal(result.canPay,false);
});
test('duplicidade de título do mesmo acerto e baixa antiga são bloqueadas',()=>{
 const {legacy,prepared,evidence}=sample();
 evidence.finance.push({id:'FIN-2',orderId:legacy.id,sourceId:'ACE-1',kind:'pagar',
  amountCents:4000,status:'pago'});
 const r=review(legacy,prepared,evidence);
 assert.ok(r.findings.some(x=>x.code==='ACERTO_TITULO_INCONSISTENTE'));
 assert.ok(r.findings.some(x=>x.code==='FINANCEIRO_DIVERGENTE'));
 assert.ok(r.findings.some(x=>x.code==='TITULO_PAGO'));
 assert.equal(r.canPay,false);
});
test('saldo de facção sem corte e retorno maior que envio geram alertas distintos',()=>{
 const {legacy,prepared,evidence}=sample();
 evidence.allocations[0].qty=75;
 evidence.allocations[1].qty=80;
 const r=review(legacy,prepared,evidence);
 assert.ok(r.findings.some(x=>x.code==='ENVIO_EXCEDE_CORTE'));
 assert.ok(r.findings.some(x=>x.code==='RETORNO_EXCEDE_ENVIO'));
});
test('recusar documentos de outro pedido e modelo não identificado no extrato',()=>{
 const {legacy,prepared,evidence}=sample();
 evidence.cuts[0].orderId='PED-OUTRO';
 assert.throws(()=>review(legacy,prepared,evidence),/outro pedido/);
 evidence.cuts[0].orderId=legacy.id;
 evidence.cuts[0].productId='PRO-INEXISTENTE';
 const r=review(legacy,prepared,evidence);
 assert.ok(r.findings.some(x=>x.code==='MODELO_AUSENTE'));
});
test('título a receber do cliente não é confundido com acerto de facção',()=>{
 const {legacy,prepared,evidence}=sample();
 evidence.finance.push({id:'FIN-CLIENTE',sourceId:legacy.id,kind:'receber',
  orderId:legacy.id,amountCents:310000,status:'aberto'});
 const r=review(legacy,prepared,evidence);
 assert.ok(r.findings.some(x=>x.code==='RECEBIMENTO_NAO_CONCILIADO'));
 assert.ok(!r.findings.some(x=>x.code==='TITULO_ORIGEM_NAO_COMPROVADA'));
 assert.equal(r.canPay,false);
});
test('parcelamento precisa de análise separada, e tipo financeiro desconhecido é recusado',()=>{
 const {legacy,prepared,evidence}=sample();
 evidence.finance.push(
  {id:'F-RECEBER-1',sourceId:legacy.id,kind:'receber',amountCents:100000,status:'aberto'},
  {id:'F-RECEBER-2',sourceId:legacy.id,kind:'receber',amountCents:210000,status:'aberto'});
 const r=review(legacy,prepared,evidence);
 assert.ok(r.findings.some(x=>x.code==='RECEBIMENTO_PARCELADO_NAO_CONCILIADO'));
 evidence.finance[0].kind='desconhecido';
 assert.throws(()=>review(legacy,prepared,evidence),/Tipo financeiro desconhecido/);
});
test('toda baixa precisa indicar folha, envio e retorno; vínculo ausente não é inventado',()=>{
 const {legacy,prepared,evidence}=sample();
 delete evidence.allocations[0].cutId;
 delete evidence.allocations[1].sourceAllocationId;
 delete evidence.settlements[0].returnId;
 const r=review(legacy,prepared,evidence),codes=r.findings.map(x=>x.code);
 for(const code of ['ENVIO_SEM_FOLHA_ID','RETORNO_SEM_ENVIO_ID','ACERTO_SEM_RETORNO_ID'])
  assert.ok(codes.includes(code),code);
 assert.equal(r.canExecute,false);
});
test('retornos parciais acima do envio, acerto acima do retorno e facção trocada exigem prova',()=>{
 const {legacy,prepared,evidence}=sample();
 evidence.allocations[1].qty=45;
 evidence.allocations[1].factionId='FAC-2';
 evidence.settlements[0].qty=48;
 const r=review(legacy,prepared,evidence),codes=r.findings.map(x=>x.code);
 for(const code of ['RETORNO_PARCIAL_EXCESSIVO','ACERTO_PARCIAL_EXCESSIVO','FACCAO_TROCADA_SEM_PROVA'])
  assert.ok(codes.includes(code),code);
});
test('vínculo cruzado entre modelos bloqueia liberação mesmo se somatórios agregados não estouram',()=>{
 const {legacy,prepared,evidence}=sample();
 evidence.allocations[0].cutId='CUT-2';
 evidence.cuts[1].productId='PRO-B';
 const r=review(legacy,prepared,evidence);
 assert.ok(r.findings.some(x=>x.code==='ENVIO_CORTE_INVALIDO'));
});
test('duas remessas não podem consumir a mesma folha além da quantidade cortada',()=>{
 const {legacy,prepared,evidence}=sample();
 // Há 100 peças cortadas em duas folhas; total remetido = 80 e portanto
 // o somatório geral parece suficiente. Só a folha CUT-1 tem 60 peças.
 evidence.cuts[1].status='concluido';
 evidence.cuts[1].qty=40;
 evidence.allocations[0].qty=40;
 evidence.allocations.push({id:'SEND-2',orderId:legacy.id,productId:'PRO-A',
  qty:40,status:'enviado',cutId:'CUT-1',factionId:'FAC-2'});
 const r=review(legacy,prepared,evidence);
 assert.equal(r.models[0].cut,100);
 assert.equal(r.models[0].sent,80);
 assert.ok(!r.findings.some(x=>x.code==='ENVIO_EXCEDE_CORTE'));
 assert.ok(r.findings.some(x=>x.code==='FOLHA_CORTE_EXCEDIDA_POR_ENVIOS'));
 assert.equal(r.canPay,false);assert.equal(r.canChangeStock,false);
});
test('remessas distribuídas corretamente entre duas folhas não recebem falso bloqueio por folha',()=>{
 const {legacy,prepared,evidence}=sample();
 evidence.cuts[1].status='concluido';
 evidence.cuts[1].qty=40;
 evidence.allocations.push({id:'SEND-2',orderId:legacy.id,productId:'PRO-A',
  qty:40,status:'enviado',cutId:'CUT-2',factionId:'FAC-2'});
 const r=review(legacy,prepared,evidence);
 assert.equal(r.models[0].sent,80);
 assert.ok(!r.findings.some(x=>x.code==='FOLHA_CORTE_EXCEDIDA_POR_ENVIOS'));
 assert.equal(r.readyForCommercialMigration,false);
});
test('folha cancelada ou planejada não serve de origem para envio concluído',()=>{
 const {legacy,prepared,evidence}=sample();
 evidence.allocations[0].cutId='CUT-2';
 const r=review(legacy,prepared,evidence);
 assert.ok(r.findings.some(x=>x.code==='ENVIO_CORTE_INVALIDO'));
 assert.equal(r.canExecute,false);
});
test('não acessar banco ou APIs, não aceitar tipos financeiros inconsistentes',()=>{
 const src=fs.readFileSync(path.join(__dirname,'../migracao/preflight-vinculos-operacionais.cjs'),'utf8');
 assert.doesNotMatch(src,/\bfetch\s*\(|\bindexedDB\b|\blocalStorage\b|\bXMLHttpRequest\b|\bWebSocket\b|\.apply\s*\(/);
 const {legacy,prepared,evidence}=sample();
 evidence.finance[0].amountCents=-1;
 assert.throws(()=>review(legacy,prepared,evidence),/não negativos/);
});
