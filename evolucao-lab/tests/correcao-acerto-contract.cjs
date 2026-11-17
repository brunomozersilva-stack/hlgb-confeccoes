'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const core=require('../operacao-integrada-core.js'),obs=require('../modulos/observabilidade-v2.js');
let n=0;
const run=(s,type,payload={})=>core.apply(s,{type,payload,actor:'Teste de correção',
 expectedRevision:s.revision,commandId:'COR-TESTE-'+(++n)}).state;
const add=(s,factionId='FAC-0001',qty=10)=>run(s,'settlement.add',{
 serviceType:'costura',factionId,productId:'PRO-0001',qty,unitCents:300,
 travetaCents:50,reason:'Serviço fictício'});
const seed=()=>add(core.initial());
const revise=(s,p={})=>run(s,'settlement.revise',{id:'ACE-0001',
 factionId:'FAC-0002',unitCents:400,travetaCents:50,
 reason:'Correção conferida',...p});
test('avulso troca pessoa e mão de obra com mesmo ACE/FIN e histórico',()=>{
 const s=seed(),snap=JSON.stringify(s),x=revise(s);
 assert.equal(x.settlements.length,1);assert.equal(x.finance.length,1);
 assert.equal(x.settlements[0].id,'ACE-0001');assert.equal(x.finance[0].id,'FIN-0001');
 assert.equal(x.settlements[0].qty,10);assert.equal(x.settlements[0].factionId,'FAC-0002');
 assert.equal(x.settlements[0].amountCents,3500);assert.equal(x.finance[0].amountCents,3500);
 assert.equal(x.finance[0].status,'aberto');
 assert.equal(x.revision,s.revision+1);assert.equal(x.log.at(-1).type,'settlement.revise');
 const h=x.settlements[0].rateHistory[0];
 assert.equal(h.financeId,'FIN-0001');assert.equal(h.before.factionId,'FAC-0001');
 assert.equal(h.before.amountCents,2500);assert.equal(h.after.amountCents,3500);
 assert.equal(h.before.listUnitCents,300);assert.equal(h.after.listUnitCents,400);
 assert.equal(core.inspect(x).ok,true);assert.deepEqual(obs.analyze(x).findings,[]);
 assert.equal(JSON.stringify(s),snap);
});
test('reajuste mantém o abatimento anterior, e a segunda correção conserva a primeira',()=>{
 let s=seed();
 s=run(s,'settlement.adjust',{id:'ACE-0001',adjustmentCents:-100,reason:'Ajuste'});
 s=revise(s,{factionId:'FAC-0001',unitCents:500,travetaCents:25});
 assert.equal(s.settlements[0].amountCents,4650);
 const first=structuredClone(s.settlements[0].rateHistory[0]);
 s=revise(s,{factionId:'FAC-0002',unitCents:600,travetaCents:0});
 assert.equal(s.settlements[0].amountCents,5900);
 assert.deepEqual(s.settlements[0].rateHistory[0],first);
 assert.equal(s.settlements[0].rateHistory.length,2);
 assert.equal(core.inspect(s).ok,true);
 s=run(s,'settlement.adjust',{id:'ACE-0001',adjustmentCents:100,reason:'Revisão do ajuste'});
 assert.equal(core.inspect(s).ok,true);
 s=run(s,'settlement.pieces.return',{id:'ACE-0001',qty:1,reason:'Peça devolvida'});
 assert.equal(core.inspect(s).ok,true);assert.equal(s.settlements[0].amountCents,5500);
 assert.deepEqual(obs.analyze(s).findings,[]);
});
test('retorno vinculado pode corrigir o preço mas não mudar a facção física',()=>{
 let s=core.initial();s=run(s,'order.add',{clientId:'CLI-0001',productId:'PRO-0001',grade:{P:10,M:0,G:0,GG:0}});
 s=run(s,'cut.record',{orderId:'PED-0001',size:'P',qty:10});
 s=run(s,'faction.allocate',{orderId:'PED-0001',factionId:'FAC-0001',qty:10});
 s=run(s,'faction.return',{orderId:'PED-0001',qty:6});
 const snap=JSON.stringify(s);
 assert.throws(()=>revise(s),/retorno físico/);assert.equal(JSON.stringify(s),snap);
 const beforeOrder=structuredClone(s.orders),beforeAssignments=structuredClone(s.factionAssignments);
 s=revise(s,{factionId:'FAC-0001',unitCents:600,travetaCents:0});
 assert.equal(s.settlements[0].amountCents,3600);
 assert.deepEqual(s.orders,beforeOrder);assert.deepEqual(s.factionAssignments,beforeAssignments);
 assert.equal(core.inspect(s).ok,true);
});
test('registros pagos não são editáveis, nem por alteração de destinatário',()=>{
 let s=seed();s=run(s,'finance.pay',{id:'FIN-0001'});
 const snap=JSON.stringify(s);
 assert.throws(()=>revise(s),/em aberto/);
 assert.equal(JSON.stringify(s),snap);
 s=run(s,'settlement.compensate',{id:'ACE-0001',deltaCents:300,reference:'COR-PAGO',reason:'Diferença'});
 assert.equal(s.settlements[0].factionId,'FAC-0001');assert.equal(s.settlements[0].amountCents,2500);
 assert.equal(s.finance.length,2);assert.equal(core.inspect(s).ok,true);
});
test('preço inválido, justificativa ausente, facção inexistente e nenhuma mudança não gravam',()=>{
 const s=seed(),snap=JSON.stringify(s);
 for(const p of [{unitCents:50,travetaCents:50},{unitCents:0},{unitCents:1.5},
  {reason:''},{factionId:'FAC-9999'}, {factionId:'FAC-0001',unitCents:300,travetaCents:50}]){
  assert.throws(()=>revise(s,p));assert.equal(JSON.stringify(s),snap);
 }
});
test('título divergente ou já pago impede correção e mantém o estado intacto',()=>{
 const s=seed();
 for(const mutate of [x=>x.finance[0].amountCents+=1,x=>x.finance[0].status='pago',
  x=>x.finance.push({...x.finance[0],id:'FIN-9999'}),x=>x.finance.pop()]){
  const x=structuredClone(s);mutate(x);const snap=JSON.stringify(x);
  assert.throws(()=>revise(x),/Título divergente/);assert.equal(JSON.stringify(x),snap);
 }
});
test('Auditor distingue histórico alterado, excluído e preço atual adulterado',()=>{
 const s=revise(seed());
 for(const mutate of [x=>x.settlements[0].rateHistory[0].before.amountCents+=1,
  x=>{x.settlements[0].rateHistory=[]},x=>x.settlements[0].unitCents+=1,
  x=>{x.settlements[0].rateHistory[0].financeId='FIN-9999'}]){
  const x=structuredClone(s);mutate(x);
  assert.equal(core.inspect(x).ok,false);
  assert.ok(obs.analyze(x).findings.some(f=>f.code.startsWith('ACERTO_REVISAO_')));
 }
 assert.ok(obs.analyze(s).settlementHistory.some(x=>x.event==='correcao_faccao_mao_obra'));
});
test('fechamento por facção reconhece a nova pessoa e o valor corrigido',()=>{
 let s=seed();s=revise(s);s=add(s,'FAC-0002',2);
 const batch=require('../modulos/pagamento-lote-v1.js'),g=batch.groups(s)[0];
 assert.equal(g.factionId,'FAC-0002');assert.equal(g.totalCents,4000);
 s=run(s,'finance.faction.close',{factionId:g.factionId,financeIds:g.financeIds,
  reference:'COR-FECHA-01',reason:'Conferido'});
 assert.equal(s.paymentBatches[0].totalCents,4000);
 assert.equal(s.settlements[0].rateHistory.length,1);assert.equal(core.inspect(s).ok,true);
 assert.deepEqual(obs.analyze(s).findings,[]);
});
test('revisão antiga e comando repetido não podem duplicar correção',()=>{
 const s=seed(),x=revise(s),snap=JSON.stringify(x);
 assert.throws(()=>core.apply(x,{type:'settlement.revise',payload:{},
  commandId:'CONFLITO-COR',actor:'Teste',expectedRevision:s.revision}),/CONFLITO/);
 assert.throws(()=>core.apply(x,{type:'settlement.revise',payload:{},
  commandId:x.log.at(-1).commandId,actor:'Teste',expectedRevision:x.revision}),/já registrado/);
 assert.equal(JSON.stringify(x),snap);
});

function allocated(grade=false,multi=false){
 let s=core.initial();s=run(s,'order.add',{clientId:'CLI-0001',productId:'PRO-0001',grade:{P:10,M:0,G:0,GG:0}});
 s=run(s,'cut.record',{orderId:'PED-0001',size:'P',qty:10});
 if(grade)s=run(s,'order.color.grade.set',{orderId:'PED-0001',color:'Preto',grade:{P:10,M:0,G:0,GG:0}});
 return run(s,grade?'faction.grade.allocate':multi?'faction.multi.allocate':'faction.allocate',{
  orderId:'PED-0001',factionId:'FAC-0001',qty:10,color:'Preto',size:'P'});
}
const setRate=(s,p={})=>run(s,'faction.assignment.rate.set',{assignmentId:'ALO-0001',
 unitCents:700,travetaCents:100,reason:'Preço negociado para o saldo',...p});
test('negociação de envio após retorno parcial preserva pagamento anterior e cadastro',()=>{
 let s=allocated();s=run(s,'faction.return',{orderId:'PED-0001',qty:4});
 const old=structuredClone(s.settlements[0]),fac=structuredClone(s.factions);
 s=setRate(s);
 assert.deepEqual(s.factions,fac);assert.deepEqual(s.settlements[0],old);
 assert.equal(s.factionAssignments[0].rateAgreementHistory[0].pendingQty,6);
 s=run(s,'faction.return',{orderId:'PED-0001',qty:6});
 assert.equal(s.settlements[1].amountCents,3600);
 assert.equal(s.settlements[1].rateAgreementCommandId,s.factionAssignments[0].rateAgreementHistory[0].commandId);
 assert.deepEqual(s.settlements[0],old);
 assert.equal(core.inspect(s).ok,true);
 assert.throws(()=>setRate(s),/pendentes/);
});
test('retorno multidestino respeita tarifa do próprio envio e mantém correção posterior auditável',()=>{
 let s=setRate(allocated(false,true));
 s=run(s,'faction.multi.return',{assignmentId:'ALO-0001',qty:3});
 assert.equal(s.settlements[0].amountCents,1800);
 s=revise(s,{factionId:'FAC-0001',unitCents:800,travetaCents:100});
 assert.equal(s.settlements[0].amountCents,2100);
 assert.equal(core.inspect(s).ok,true);
 const bad=structuredClone(s);bad.factionAssignments[0].rateAgreementHistory[0].gross+=1;
 assert.equal(core.inspect(bad).ok,false);
});
test('preço negociado é aplicado no retorno por cor e tamanho',()=>{
 let s=setRate(allocated(true));
 s=run(s,'faction.grade.return',{assignmentId:'ALO-0001',color:'Preto',size:'P',qty:3});
 assert.equal(s.settlements[0].amountCents,1800);assert.equal(s.settlements[0].color,'Preto');
 assert.equal(core.inspect(s).ok,true);
});
test('troca integral para outra facção encerra o acordo antigo sem apagar o histórico',()=>{
 let s=setRate(allocated());
 s=run(s,'faction.reassign',{orderId:'PED-0001',factionId:'FAC-0002',reason:'Troca antes do retorno'});
 assert.equal(s.factionAssignments[0].rateAgreementHistory.length,2);
 assert.equal(s.factionAssignments[0].rateAgreementHistory[1].mode,'reset');
 s=run(s,'faction.return',{orderId:'PED-0001',qty:10});
 assert.equal(s.settlements[0].amountCents,5500);assert.equal(s.settlements[0].factionId,'FAC-0002');
 assert.equal(s.settlements[0].rateAgreementCommandId,undefined);
 assert.equal(core.inspect(s).ok,true);
});
test('tarifa de envio não migra automaticamente para outra facção no saldo transferido',()=>{
 let s=setRate(allocated(false,true));
 s=run(s,'faction.multi.transfer',{fromAssignmentId:'ALO-0001',toFactionId:'FAC-0002',qty:5,reason:'Redistribuição'});
 s=run(s,'faction.multi.return',{assignmentId:'ALO-0002',qty:5});
 s=run(s,'faction.multi.return',{assignmentId:'ALO-0001',qty:5});
 assert.equal(s.settlements[0].amountCents,2750);assert.equal(s.settlements[1].amountCents,3000);
 assert.equal(core.inspect(s).ok,true);
});
