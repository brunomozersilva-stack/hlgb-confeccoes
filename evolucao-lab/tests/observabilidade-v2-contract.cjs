'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),
 fs=require('node:fs'),path=require('node:path');
const core=require('../operacao-integrada-core.js');
const registry=require('../modulos/registro-v1.js');
const observer=require('../modulos/observabilidade-v2.js');
const before=state=>JSON.stringify(state);
const apply=(state,type,payload,commandId)=>{
 const result=core.apply(state,{type,payload,actor:'Teste de laboratório',commandId,
  expectedRevision:state.revision});
 return result.state;
};
test('contrato plugável: desativação reversível, falha isolada e nenhum impacto no documento',()=>{
 const state=core.initial(),copy=before(state);
 assert.equal(registry.register(observer),'observabilidade');
 assert.equal(registry.list().length,1);
 assert.equal(registry.call('observabilidade','analyze',state).ok,true);
 assert.equal(registry.setEnabled('observabilidade',false),false);
 assert.deepEqual(registry.call('observabilidade','analyze',state).reason,'disabled');
 assert.equal(registry.setEnabled('observabilidade',true),true);
 assert.equal(registry.call('observabilidade','analyze',state).ok,true);
 registry.register({id:'plugue-com-falha',version:'1.0',analyze:()=>{throw Error('Falha simulada')}});
 assert.deepEqual(registry.call('plugue-com-falha','analyze',state).reason,'error');
 assert.equal(registry.list().find(x=>x.id==='plugue-com-falha').failures,1);
 assert.equal(registry.call('observabilidade','analyze',state).ok,true,'outro módulo continua funcionando');
 assert.equal(registry.call('desconhecido','analyze',state).reason,'missing');
 assert.equal(registry.call('observabilidade','delete',state).reason,'unsupported');
 assert.throws(()=>registry.register(observer),/duplicado/);
 assert.equal(before(state),copy,'consultar e alternar módulos não grava no ERP fictício');
});
test('observador lê histórico e liga pedido, corte, compra, acerto e compensação sem regravar pagamento',()=>{
 let s=core.initial();
 s=apply(s,'purchase.add',{materialId:'MAT-0001',supplierId:'FOR-0001',qtyGrams:2000,
  checkerOne:'Conferente 1',checkerTwo:'Conferente 2'},'P-001');
 s=apply(s,'purchase.receive',{id:'COM-0001'},'P-002');
 s=apply(s,'order.add',{clientId:'CLI-0001',productId:'PRO-0001',
  grade:{P:5,M:0,G:0,GG:0}},'P-003');
 s=apply(s,'cut.record',{orderId:'PED-0001',size:'P',qty:5},'P-004');
 s=apply(s,'faction.allocate',{orderId:'PED-0001',factionId:'FAC-0001',qty:5},'P-005');
 s=apply(s,'faction.return',{orderId:'PED-0001',qty:5},'P-006');
 const original=JSON.stringify(s.settlements[0]);
 s=apply(s,'finance.pay',{id:s.finance.find(x=>x.sourceId==='ACE-0001').id},'P-007');
 s=apply(s,'settlement.compensate',{id:'ACE-0001',deltaCents:-100,
  reference:'AJ-EXEMPLO',reason:'Ajuste independente'},'P-008');
 const originalPaid=JSON.stringify(s.settlements[0]),previous=before(s);
 const audit=observer.analyze(s);
 assert.equal(audit.summary.events,8);
 assert.equal(audit.summary.compensations,1);
 assert.equal(audit.summary.stockMovements,2);
 assert.equal(audit.summary.bySeverity.critica,0);
 assert.equal(audit.findings.length,0);
 assert.equal(audit.history[0].type,'settlement.compensate');
 assert.equal(audit.history[0].revision,s.revision);
 assert.equal(audit.moduleActivity.some(x=>x.module==='hub'),true);
 assert.equal(audit.productionApproval,false);
 const model=audit.modelSummary.find(x=>x.productId==='PRO-0001');
 assert.equal(model.orders,1);
 assert.equal(model.ordered,5);
 assert.equal(model.cut,5);
 assert.equal(model.returned,5);
 assert.equal(model.plannedReceivablesCents,5*3990);
 const faction=audit.factionSummary.find(x=>x.factionId==='FAC-0001');
 assert.equal(faction.totalSettlementsCents,5*550);
 assert.equal(faction.paidSettlementsCents,5*550);
 assert.equal(faction.compensationNetCents,-100);
 assert.equal(audit.settlementHistory.length,1);
 assert.equal(audit.settlementHistory[0].event,'compensacao_separada');
 assert.equal(audit.settlementHistory[0].beforeCents,audit.settlementHistory[0].afterCents,
  'original pago não pode ser reescrito para registrar compensação');
 assert.equal(audit.summary.coverage.includes('nenhuma garantia'),true);
 assert.equal(before(s),previous,'o Auditor não modifica os dados');
 assert.equal(JSON.stringify(s.settlements[0]),originalPaid);
 assert.notEqual(originalPaid,original,'quitação legítima ocorreu antes da auditoria');
});
test('Auditor detecta divergências financeiras sem autocorreção e identifica a origem exata',()=>{
 let s=core.initial();
 s=apply(s,'order.add',{clientId:'CLI-0001',productId:'PRO-0001',
  grade:{P:3,M:0,G:0,GG:0}},'T-001');
 s=apply(s,'cut.record',{orderId:'PED-0001',size:'P',qty:3},'T-002');
 s=apply(s,'faction.allocate',{orderId:'PED-0001',factionId:'FAC-0001',qty:3},'T-003');
 s=apply(s,'faction.return',{orderId:'PED-0001',qty:3},'T-004');
 s=apply(s,'finance.pay',{id:s.finance.find(x=>x.sourceId==='ACE-0001').id},'T-005');
 s=apply(s,'settlement.compensate',{id:'ACE-0001',deltaCents:100,
  reference:'TESTE-COMP',reason:'Diferença fictícia'},'T-006');
 const bad=JSON.parse(JSON.stringify(s));
 bad.finance.find(x=>x.sourceId==='ACE-0001').amountCents++;
 bad.finance.find(x=>x.sourceId==='CMP-0001').status='pago';
 bad.finance.push({id:'FIN-9999',kind:'pagar',sourceId:'ACE-INEXISTENTE',
  description:'Título órfão',amountCents:100,status:'aberto'});
 bad.log.push({...bad.log[0]});
 const evidence=before(bad);
 const report=observer.analyze(bad),codes=report.findings.map(x=>x.code);
 for(const id of ['ACERTO_FINANCEIRO','COMP_ORIGINAL','COMP_TITULO','TITULO_ORFAO',
  'EVENTO_DUPLICADO','REVISAO_HISTORICO']){
  assert.ok(codes.includes(id),id);
 }
 assert.equal(report.status,'investigar_critico');
 assert.ok(report.recommendations.every(x=>x.mode==='orientacao_sem_execucao'));
 assert.ok(report.findings.some(x=>x.recordId==='ACE-0001'));
 assert.equal(before(bad),evidence,'falhas são detectadas e NÃO corrigidas automaticamente');
});
test('compra recebida com entrada ausente ou conta incorreta gera alertas separados',()=>{
 let s=core.initial();
 s=apply(s,'purchase.add',{materialId:'MAT-0002',supplierId:'FOR-0001',
  qtyGrams:500,checkerOne:'Joana',checkerTwo:'Beatriz'},'C-001');
 s=apply(s,'purchase.receive',{id:'COM-0001'},'C-002');
 const broken=JSON.parse(JSON.stringify(s));
 broken.stockLedger=[];
 broken.finance.find(x=>x.sourceId==='COM-0001').amountCents=7;
 const codes=observer.analyze(broken).findings.map(x=>x.code);
 assert.ok(codes.includes('COMPRA_ESTOQUE'));
 assert.ok(codes.includes('COMPRA_FINANCEIRO'));
});
test('Bot 2.0 agrupa falhas recorrentes, explica motivos e oferece link lógico de conferência',()=>{
 let s=core.initial();
 s=apply(s,'error.add',{message:'Falha no pagamento fictício'},'E-001');
 s=apply(s,'error.add',{message:'  FALHA NO PAGAMENTO FICTÍCIO  '},'E-002');
 const report=observer.analyze(s);
 assert.equal(report.summary.openIncidents,2);
 assert.equal(report.findings.filter(x=>x.code==='OCORRENCIA_ABERTA').length,2);
 assert.ok(report.findings.filter(x=>x.code==='OCORRENCIA_ABERTA').every(x=>x.severity==='alta'));
 assert.equal(report.recommendations.filter(x=>x.code==='OCORRENCIA_ABERTA').length,1);
 assert.equal(report.recommendations.find(x=>x.code==='OCORRENCIA_ABERTA').module,'central');
 assert.equal(report.moduleActivity.find(x=>x.module==='central').count,2);
 assert.equal(report.repeatedOperations.find(x=>x.type==='error.add').count,2);
});
test('retrocompatibilidade: documentos locais antigos não exigem reset nem novos campos',()=>{
 let s=core.initial();
 delete s.settlementCompensations;
 delete s.cutPlans;
 const copy=before(s);
 const audit=observer.analyze(s);
 assert.equal(audit.findings.length,0);
 assert.equal(audit.summary.compensations,0);
 assert.equal(audit.modelSummary.length,3);
 assert.equal(audit.factionSummary.length,2);
 assert.equal(audit.settlementHistory.length,0);
 assert.equal(before(s),copy);
 assert.throws(()=>observer.analyze({schema:'producao'}),/não compatível/);
});
test('eficiência: auditoria de 2.000 pedidos e 5.000 eventos com índices, sem perder histórico',()=>{
 const s=core.initial();
 for(let i=1;i<=2000;i++){
  const id='PED-V-'+String(i).padStart(5,'0');
  s.orders.push({id,clientId:'CLI-0001',productId:'PRO-0001',
   grade:{P:2,M:0,G:0,GG:0},cut:{P:0,M:0,G:0,GG:0},
   allocated:0,returned:0,separated:0,shipped:0,factionId:null,
   priceCents:3990,issued:false});
  s.finance.push({id:'FIN-V-'+String(i).padStart(5,'0'),sourceId:id,
   kind:'receber',amountCents:7980,status:'aberto'});
 }
 for(let i=1;i<=5000;i++)s.log.push({
  commandId:'VOLUME-'+i,revision:i+1,actor:'Teste volumétrico',
  type:'order.add',description:'Operação simulada '+i
 });
 s.revision=5001;
 const snapshot=JSON.stringify(s);
 const start=performance.now();
 const result=observer.analyze(s),elapsed=performance.now()-start;
 assert.ok(elapsed<3500,'observação local demorou '+elapsed.toFixed(0)+' ms');
 assert.equal(result.summary.orders,2000);
 assert.equal(result.summary.events,5000);
 assert.equal(result.history.length,5000);
 assert.equal(result.modelSummary.find(x=>x.productId==='PRO-0001').ordered,4000);
 assert.equal(result.findings.length,0);
 assert.equal(JSON.stringify(s),snapshot,'o relatório volumétrico preserva o snapshot');
});
test('módulos são independentes, sem APIs externas ou exclusão de dados',()=>{
 const scripts=['../modulos/registro-v1.js','../modulos/observabilidade-v2.js']
  .map(p=>fs.readFileSync(path.join(__dirname,p),'utf8'));
 for(const src of scripts){
  for(const bad of [/\bfetch\s*\(/,/\bXMLHttpRequest\b/,/\bWebSocket\b/,
   /\blocalStorage\b/,/\bindexedDB\b/,/\bsupabase\b/i,/https?:\/\//i,
   /(?:delete|drop|truncate)\s+from\s+hlgb/i])
   assert.equal(bad.test(src),false,'Módulo não pode conter '+bad);
 }
});
