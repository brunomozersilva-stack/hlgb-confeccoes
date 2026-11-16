'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),
 fs=require('node:fs'),path=require('node:path');
const core=require('../operacao-integrada-core.js');
const routing=require('../modulos/faccoes-multidestino-v1.js');
const observer=require('../modulos/observabilidade-v2.js');
let n=1;
function cmd(s,type,payload,customId){
 const output=core.apply(s,{type,payload,actor:'Homologação fictícia',
  commandId:customId||'ROTA-CI-'+String(n++).padStart(5,'0'),
  expectedRevision:s.revision});
 assert.equal(output.checks.ok,true,'Integridade após '+type);
 return output;
}
function createOrder(qty=15){
 let s=core.initial();
 s=cmd(s,'order.add',{clientId:'CLI-0001',productId:'PRO-0002',
  grade:{P:qty,M:0,G:0,GG:0}}).state;
 s=cmd(s,'cut.record',{orderId:'PED-0001',size:'P',qty}).state;
 return s;
}
test('duas facções no mesmo pedido, saldos independentes, retornos e acertos próprios',()=>{
 let s=createOrder(20);
 s=cmd(s,'faction.allocate',{orderId:'PED-0001',factionId:'FAC-0001',qty:8}).state;
 assert.equal(s.factionAssignments.length,1,'rota antiga agora tem espelho por envio');
 assert.equal(s.factionAssignments[0].id,'ALO-0001');
 s=cmd(s,'faction.multi.allocate',{orderId:'PED-0001',factionId:'FAC-0002',qty:10}).state;
 assert.equal(s.factionAssignments.length,2);
 assert.equal(s.orders[0].allocated,18);
 assert.equal(s.orders[0].factionId,'FAC-0001','facção principal do fluxo simples preservada');
 assert.equal(routing.forOrder(s,'PED-0001')[0].qtySent,8);
 assert.equal(routing.forOrder(s,'PED-0001')[1].qtySent,10);
 let old=JSON.stringify(s);
 assert.throws(()=>cmd(s,'faction.multi.allocate',{orderId:'PED-0001',factionId:'FAC-0002',qty:3}),
  /excede peças cortadas/);
 assert.equal(JSON.stringify(s),old);
 s=cmd(s,'faction.multi.return',{assignmentId:'ALO-0001',qty:5}).state;
 assert.equal(s.settlements[0].factionId,'FAC-0001');
 assert.equal(s.settlements[0].assignmentId,'ALO-0001');
 assert.equal(s.settlements[0].amountCents,5*550);
 s=cmd(s,'faction.multi.return',{assignmentId:'ALO-0002',qty:6}).state;
 assert.equal(s.settlements[1].factionId,'FAC-0002');
 assert.equal(s.settlements[1].assignmentId,'ALO-0002');
 assert.equal(s.settlements[1].amountCents,6*550,
  'desconto de travetada congelado no retorno da FAC-0002');
 assert.equal(s.orders[0].returned,11);
 assert.equal(s.factionAssignments[0].qtyReturned,5);
 assert.equal(s.factionAssignments[1].qtyReturned,6);
 assert.equal(s.finance.filter(x=>x.kind==='pagar').length,2);
 assert.equal(core.inspect(s).ok,true);
 const report=observer.analyze(s);
 assert.equal(report.summary.distributedOrders,1);
 assert.equal(report.summary.factionDispatches,2);
 assert.equal(report.summary.openFactionPieces,7);
 assert.equal(report.factionDispatches.length,2);
 assert.equal(report.findings.length,0);
 old=JSON.stringify(s);
 assert.throws(()=>cmd(s,'faction.return',{orderId:'PED-0001',qty:1}),/várias facções/);
 assert.equal(JSON.stringify(s),old,'rotina antiga não mistura retornos');
 assert.throws(()=>cmd(s,'faction.reassign',{orderId:'PED-0001',
  factionId:'FAC-0002',reason:'Troca impossível'}),/retorno|dividido/i);
 assert.equal(JSON.stringify(s),old);
});
test('preço e travetada futuros não reescrevem retorno anterior de outra facção',()=>{
 let s=createOrder(10);
 s=cmd(s,'faction.multi.allocate',{orderId:'PED-0001',factionId:'FAC-0001',qty:4}).state;
 s=cmd(s,'faction.multi.allocate',{orderId:'PED-0001',factionId:'FAC-0002',qty:6}).state;
 s=cmd(s,'faction.multi.return',{assignmentId:'ALO-0002',qty:2}).state;
 const before=JSON.stringify(s.settlements[0]);
 s=cmd(s,'faction.rate.set',{factionId:'FAC-0002',productId:'PRO-0002',
  unitCents:300,reason:'Preço novo só para próximos retornos'}).state;
 s=cmd(s,'faction.traveta.set',{factionId:'FAC-0002',traveta:true,
  reason:'Serviço passa a incluir traveta'}).state;
 s=cmd(s,'faction.multi.return',{assignmentId:'ALO-0002',qty:3}).state;
 assert.equal(JSON.stringify(s.settlements[0]),before);
 assert.equal(s.settlements[1].amountCents,900);
 assert.equal(s.settlements[1].unitCents,300);
 assert.equal(s.factionAssignments[1].qtyReturned,5);
 assert.equal(s.factionAssignments[0].qtyReturned,0);
 assert.equal(s.orders[0].returned,5);
 assert.equal(core.inspect(s).ok,true);
});
test('devolução de peças altera somente saldo da facção original e título aberto',()=>{
 let s=createOrder(12);
 s=cmd(s,'faction.multi.allocate',{orderId:'PED-0001',factionId:'FAC-0001',qty:6}).state;
 s=cmd(s,'faction.multi.allocate',{orderId:'PED-0001',factionId:'FAC-0002',qty:6}).state;
 s=cmd(s,'faction.multi.return',{assignmentId:'ALO-0001',qty:5}).state;
 s=cmd(s,'faction.multi.return',{assignmentId:'ALO-0002',qty:4}).state;
 const other=JSON.stringify(s.settlements[0]);
 s=cmd(s,'settlement.pieces.return',{id:'ACE-0002',qty:2,
  reason:'Duas peças da facção B devolvidas antes do pagamento'}).state;
 assert.equal(JSON.stringify(s.settlements[0]),other);
 assert.equal(s.settlements[1].qty,2);
 assert.equal(s.finance.find(x=>x.sourceId==='ACE-0002').amountCents,2*550);
 assert.equal(s.factionAssignments[0].qtyReturned,5);
 assert.equal(s.factionAssignments[1].qtyReturned,2);
 assert.equal(s.orders[0].returned,7);
 assert.equal(core.inspect(s).ok,true);
 const original=JSON.stringify(s);
 const title=s.finance.find(x=>x.sourceId==='ACE-0002').id;
 s=cmd(s,'finance.pay',{id:title}).state;
 const paid=JSON.stringify(s);
 assert.throws(()=>cmd(s,'settlement.pieces.return',{
  id:'ACE-0002',qty:1,reason:'Nova devolução não permitida'}),/após pagamento/);
 assert.equal(JSON.stringify(s),paid,'não altera título ou saldo depois de pagar');
 assert.notEqual(paid,original);
});
test('transferência simples anterior preservada e migração sem perda de documento antigo',()=>{
 let s=createOrder(14);
 s=cmd(s,'faction.allocate',{orderId:'PED-0001',factionId:'FAC-0001',qty:8}).state;
 const previous=JSON.stringify(s);
 s=cmd(s,'faction.reassign',{orderId:'PED-0001',factionId:'FAC-0002',
  reason:'Transferência simples anterior'}).state;
 assert.equal(s.factionAssignments[0].factionId,'FAC-0002');
 assert.equal(s.orders[0].factionId,'FAC-0002');
 assert.equal(s.factionTransfers[0].fromFactionId,'FAC-0001');
 assert.equal(s.factionTransfers[0].toFactionId,'FAC-0002');
 s=cmd(s,'faction.return',{orderId:'PED-0001',qty:6}).state;
 assert.equal(s.settlements[0].factionId,'FAC-0002');
 assert.equal(s.settlements[0].assignmentId,'ALO-0001');
 assert.equal(core.inspect(s).ok,true);
 const older=JSON.parse(previous);delete older.factionAssignments;delete older.ids.ALO;
 const untouched=JSON.stringify(older);
 assert.equal(core.inspect(older).ok,true,'versão anterior ainda é válida sem reset');
 const moved=cmd(older,'faction.multi.allocate',{
  orderId:'PED-0001',factionId:'FAC-0002',qty:3}).state;
 assert.equal(JSON.stringify(older),untouched,'migração só modifica novo snapshot transacional');
 assert.equal(moved.factionAssignments.length,2);
 assert.deepEqual(moved.factionAssignments.map(x=>x.qtySent),[8,3]);
 assert.deepEqual(moved.factionAssignments.map(x=>x.qtyReturned),[0,0]);
 assert.equal(core.inspect(moved).ok,true);
});
test('validação rejeita duplicidade, saldo negativo, erro de retorno e histórico cruzado',()=>{
 let s=createOrder(9);
 s=cmd(s,'faction.multi.allocate',{orderId:'PED-0001',factionId:'FAC-0001',qty:5}).state;
 s=cmd(s,'faction.multi.allocate',{orderId:'PED-0001',factionId:'FAC-0002',qty:4}).state;
 s=cmd(s,'faction.multi.return',{assignmentId:'ALO-0002',qty:3}).state;
 let before=JSON.stringify(s);
 assert.throws(()=>cmd(s,'faction.multi.return',{assignmentId:'ALO-0002',qty:2}),
  /Retorno excede o saldo dessa facção/);
 assert.throws(()=>cmd(s,'faction.multi.return',{assignmentId:'ALO-9999',qty:1}),
  /Envio a facção não localizado/);
 assert.equal(JSON.stringify(s),before);
 for(const corruption of [
  draft=>{draft.factionAssignments[0].qtyReturned=6},
  draft=>{draft.factionAssignments[1].factionId='FAC-0001'},
  draft=>{draft.factionAssignments[1].qtySent=5},
  draft=>{draft.settlements[0].factionId='FAC-0001'}
 ]){
  const bad=structuredClone(s);corruption(bad);
  assert.equal(core.inspect(bad).ok,false);
  assert.ok(observer.analyze(bad).findings.some(x=>x.code.startsWith('FACCAO_')),
   'Auditor deve apontar facção/saldo específico');
 }
 assert.equal(core.inspect(s).ok,true);
});

test('transferência parcial muda custódia pendente sem reescrever pagamento original',()=>{
 let s=createOrder(18);
 s=cmd(s,'faction.multi.allocate',{orderId:'PED-0001',factionId:'FAC-0001',qty:8}).state;
 s=cmd(s,'faction.multi.allocate',{orderId:'PED-0001',factionId:'FAC-0002',qty:8}).state;
 s=cmd(s,'faction.multi.return',{assignmentId:'ALO-0001',qty:3}).state;
 const firstBill=s.finance.find(x=>x.sourceId==='ACE-0001').id;
 s=cmd(s,'finance.pay',{id:firstBill}).state;
 const paidAcerto=JSON.stringify(s.settlements[0]),
  paidTitle=JSON.stringify(s.finance.find(x=>x.id===firstBill));
 const rev=s.revision;
 s=cmd(s,'faction.multi.transfer',{fromAssignmentId:'ALO-0001',
  toFactionId:'FAC-0002',qty:4,
  reason:'Redistribuir apenas peças pendentes da oficina A'},'TRANS-PARCIAL-001').state;
 assert.equal(s.revision,rev+1);
 assert.equal(s.log.at(-1).type,'faction.multi.transfer');
 assert.equal(s.factionPartialTransfers.length,1);
 const m=s.factionPartialTransfers[0];
 assert.deepEqual([m.id,m.fromAssignmentId,m.toAssignmentId,m.qty],
  ['TRP-0001','ALO-0001','ALO-0002',4]);
 assert.deepEqual([m.fromBefore,m.fromAfter,m.toBefore,m.toAfter],[8,4,8,12]);
 assert.equal(m.commandId,'TRANS-PARCIAL-001');
 assert.deepEqual(s.factionAssignments.map(x=>x.qtySent),[4,12]);
 assert.equal(s.orders[0].allocated,16,'transferência não cria novo envio nem duplica corte');
 assert.equal(s.orders[0].returned,3);
 assert.equal(JSON.stringify(s.settlements[0]),paidAcerto);
 assert.equal(JSON.stringify(s.finance.find(x=>x.id===firstBill)),paidTitle);
 s=cmd(s,'faction.multi.return',{assignmentId:'ALO-0002',qty:5}).state;
 assert.equal(s.settlements[1].factionId,'FAC-0002');
 assert.equal(s.settlements[1].qty,5);
 assert.equal(s.settlements[1].unitCents,550);
 assert.equal(s.factionAssignments[0].qtyReturned,3);
 assert.equal(s.factionAssignments[1].qtyReturned,5);
 assert.equal(s.orders[0].returned,8);
 assert.equal(core.inspect(s).ok,true);
 const audit=observer.analyze(s);
 assert.equal(audit.summary.partialFactionTransfers,1);
 assert.equal(audit.summary.piecesTransferred,4);
 assert.equal(audit.factionTransferHistory[0].commandId,'TRANS-PARCIAL-001');
 assert.equal(audit.findings.length,0);
});
test('transferir para nova facção cria apenas um novo destino e mantém total do pedido',()=>{
 let s=createOrder(12);
 s=cmd(s,'faction.multi.allocate',{orderId:'PED-0001',factionId:'FAC-0001',qty:9}).state;
 s=cmd(s,'faction.add',{name:'Facção fictícia C',unitCents:650,traveta:true}).state;
 const previous=JSON.stringify(s);
 s=cmd(s,'faction.multi.transfer',{fromAssignmentId:'ALO-0001',
  toFactionId:'FAC-0003',qty:4,reason:'Transferir saldo para nova oficina'}).state;
 assert.equal(s.factionAssignments.length,2);
 assert.deepEqual(s.factionAssignments.map(x=>x.qtySent),[5,4]);
 assert.equal(s.orders[0].allocated,9);
 assert.equal(s.factionPartialTransfers.length,1);
 s=cmd(s,'faction.multi.return',{assignmentId:'ALO-0002',qty:2}).state;
 assert.equal(s.settlements[0].factionId,'FAC-0003');
 assert.equal(s.settlements[0].amountCents,2*650);
 assert.equal(s.finance.find(x=>x.sourceId==='ACE-0001').amountCents,2*650);
 assert.equal(core.inspect(s).ok,true);
 assert.notEqual(JSON.stringify(s),previous);
});
test('transferência parcial inválida é atômica e não altera títulos/saldos',()=>{
 let s=createOrder(9);
 s=cmd(s,'faction.multi.allocate',{orderId:'PED-0001',factionId:'FAC-0001',qty:6}).state;
 s=cmd(s,'faction.multi.return',{assignmentId:'ALO-0001',qty:4}).state;
 const cases=[
  [{fromAssignmentId:'ALO-0001',toFactionId:'FAC-0002',qty:3,
    reason:'Tentativa excede pendente'},/excede o saldo/],
  [{fromAssignmentId:'ALO-0001',toFactionId:'FAC-0001',qty:1,
    reason:'Mesmo destino'},/diferente da origem/],
  [{fromAssignmentId:'ALO-9999',toFactionId:'FAC-0002',qty:1,
    reason:'Origem desconhecida'},/não encontrado/],
  [{fromAssignmentId:'ALO-0001',toFactionId:'FAC-0002',qty:1,reason:''},
   /Justificativa/],
  [{fromAssignmentId:'ALO-0001',toFactionId:'FAC-0002',qty:0,
    reason:'Zero inválido'},/Quantidade transferida/]
 ];
 const snapshot=JSON.stringify(s);
 for(const [payload,pattern] of cases){
  assert.throws(()=>cmd(s,'faction.multi.transfer',payload),pattern);
  assert.equal(JSON.stringify(s),snapshot);
 }
 const full=createOrder(6);
 const old=cmd(full,'faction.multi.allocate',{orderId:'PED-0001',factionId:'FAC-0001',qty:6}).state;
 const before=JSON.stringify(old);
 assert.throws(()=>cmd(old,'faction.multi.transfer',{fromAssignmentId:'ALO-0001',
  toFactionId:'FAC-0002',qty:6,reason:'Esvaziar a origem'}),/Transferência integral/);
 assert.equal(JSON.stringify(old),before);
});
test('Auditor bloqueia dados de transferência adulterados e comando duplicado',()=>{
 let s=createOrder(10);
 s=cmd(s,'faction.multi.allocate',{orderId:'PED-0001',factionId:'FAC-0001',qty:8}).state;
 s=cmd(s,'faction.multi.transfer',{fromAssignmentId:'ALO-0001',
  toFactionId:'FAC-0002',qty:3,reason:'Transferir sem duplicar'}).state;
 for(const mutate of [
  x=>{x.factionPartialTransfers[0].fromBefore+=1},
  x=>{x.factionPartialTransfers[0].toFactionId='FAC-0001'},
  x=>{x.factionPartialTransfers[0].commandId='COMANDO-AUSENTE'},
  x=>{x.factionPartialTransfers.push({...x.factionPartialTransfers[0]})}
 ]){
  const broken=structuredClone(s);
  mutate(broken);
  const original=JSON.stringify(broken);
  assert.equal(core.inspect(broken).ok,false);
  assert.ok(observer.analyze(broken).findings.some(x=>
   x.code==='FACCAO_TRANSFERENCIA_DIVERGENTE'),'Auditor deve apontar origem precisa');
  assert.equal(JSON.stringify(broken),original,'Auditor é somente leitura');
 }
 assert.equal(observer.analyze(s).findings.length,0);
});
test('módulo multi-facção não tem rede, nem storage, nem escrita fora da transação',()=>{
 const file=fs.readFileSync(path.join(__dirname,'../modulos/faccoes-multidestino-v1.js'),'utf8');
 assert.equal(routing.version,'1.1.0');
 for(const re of [/\bfetch\s*\(/,/\bXMLHttpRequest\b/,/\bWebSocket\b/,
  /\blocalStorage\b/,/\bindexedDB\b/,/\bsupabase\b/i,/https?:\/\//,
  /window\.location/,/\bdocument\.cookie/])
  assert.equal(re.test(file),false,'API externa proibida: '+re);
});
