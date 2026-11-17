'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),
 fs=require('node:fs'),path=require('node:path');
const core=require('../operacao-integrada-core.js');
const grade=require('../modulos/grade-faccoes-v1.js');
const observer=require('../modulos/observabilidade-v2.js');
let serial=1;
function cmd(s,type,payload={},id=null){
 return core.apply(s,{type,payload,actor:'Teste de cor fictícia',
  commandId:id||'COR-TEST-'+String(serial++).padStart(5,'0'),
  expectedRevision:s.revision}).state;
}
function make(){
 let s=core.initial();
 s=cmd(s,'order.add',{clientId:'CLI-0001',productId:'PRO-0002',
  grade:{P:6,M:5,G:3,GG:0}});
 s=cmd(s,'cut.record',{orderId:'PED-0001',size:'P',qty:6});
 s=cmd(s,'cut.record',{orderId:'PED-0001',size:'M',qty:5});
 s=cmd(s,'cut.record',{orderId:'PED-0001',size:'G',qty:3});
 return s;
}
function configured(){
 let s=make();
 s=cmd(s,'order.color.grade.set',{orderId:'PED-0001',color:'Preto',
  grade:{P:4,M:3,G:2,GG:0}});
 s=cmd(s,'order.color.grade.set',{orderId:'PED-0001',color:'Rubi',
  grade:{P:2,M:2,G:1,GG:0}});
 return s;
}
test('cadastrar cores P/M/G/GG sem apagar pedido, corte ou conta a receber',()=>{
 let s=make(),previous=JSON.stringify(s);
 s=cmd(s,'order.color.grade.set',{orderId:'PED-0001',color:'Preto',
  grade:{P:4,M:3,G:2,GG:0}});
 assert.equal(grade.makeSummary(s.orders[0]).complete,false);
 assert.deepEqual(grade.makeSummary(s.orders[0]).remaining,{P:2,M:2,G:1,GG:0});
 assert.equal(core.inspect(s).ok,true);
 const paused=JSON.stringify(s);
 assert.throws(()=>cmd(s,'faction.grade.allocate',{orderId:'PED-0001',factionId:'FAC-0001',
  color:'Preto',size:'P',qty:1}),/Complete a grade/);
 assert.equal(JSON.stringify(s),paused);
 s=cmd(s,'order.color.grade.set',{orderId:'PED-0001',color:'Rubi',
  grade:{P:2,M:2,G:1,GG:0}});
 assert.equal(grade.makeSummary(s.orders[0]).complete,true);
 assert.deepEqual(s.orders[0].grade,{P:6,M:5,G:3,GG:0});
 assert.deepEqual(s.orders[0].cut,{P:6,M:5,G:3,GG:0});
 assert.equal(s.finance.find(x=>x.sourceId==='PED-0001').amountCents,
  JSON.parse(previous).finance.find(x=>x.sourceId==='PED-0001').amountCents);
 assert.equal(core.inspect(s).ok,true);
});
test('alocar por cor+tamanho respeita corte por tamanho e total de cada cor',()=>{
 let s=configured();
 s=cmd(s,'faction.grade.allocate',{orderId:'PED-0001',factionId:'FAC-0001',
  color:'preto',size:'P',qty:3});
 s=cmd(s,'faction.grade.allocate',{orderId:'PED-0001',factionId:'FAC-0002',
  color:'Rubi',size:'P',qty:2});
 s=cmd(s,'faction.grade.allocate',{orderId:'PED-0001',factionId:'FAC-0001',
  color:'Preto',size:'M',qty:2});
 assert.equal(s.orders[0].allocated,7);
 assert.equal(s.factionAssignments.length,2);
 assert.deepEqual(s.factionAssignments[0].gradeLines.map(x=>[x.color,x.size,x.sent]),
  [['Preto','P',3],['Preto','M',2]]);
 assert.equal(core.inspect(s).ok,true);
 const old=JSON.stringify(s);
 for(const [payload,msg] of [
  [{color:'Preto',size:'P',qty:2},/quantidade prevista/],
  [{color:'Rubi',size:'P',qty:1},/quantidade prevista/],
  [{color:'Preto',size:'M',qty:2},/quantidade prevista/]
 ]){
  assert.throws(()=>cmd(s,'faction.grade.allocate',{orderId:'PED-0001',
   factionId:'FAC-0001',...payload}),msg);
  assert.equal(JSON.stringify(s),old,'nenhum envio parcial após falha');
 }
 assert.throws(()=>cmd(s,'faction.multi.allocate',{orderId:'PED-0001',
  factionId:'FAC-0001',qty:1}),/cor\/tamanho/);
 assert.throws(()=>cmd(s,'faction.allocate',{orderId:'PED-0001',
  factionId:'FAC-0001',qty:1}),/cor\/tamanho/);
 assert.equal(JSON.stringify(s),old);
});
test('retorno por cor+tamanho cria acerto e título sem misturar oficinas',()=>{
 let s=configured();
 s=cmd(s,'faction.grade.allocate',{orderId:'PED-0001',factionId:'FAC-0001',
  color:'Preto',size:'P',qty:3});
 s=cmd(s,'faction.grade.allocate',{orderId:'PED-0001',factionId:'FAC-0002',
  color:'Rubi',size:'P',qty:2});
 s=cmd(s,'faction.grade.return',{assignmentId:'ALO-0001',color:'Preto',size:'P',qty:2});
 s=cmd(s,'faction.grade.return',{assignmentId:'ALO-0002',color:'Rubi',size:'P',qty:1});
 assert.equal(s.orders[0].returned,3);
 assert.deepEqual(s.settlements.map(x=>[x.factionId,x.color,x.size,x.qty,x.gradeTracked]),
  [['FAC-0001','Preto','P',2,true],['FAC-0002','Rubi','P',1,true]]);
 assert.deepEqual(s.finance.filter(x=>x.kind==='pagar').map(x=>x.amountCents),[1100,550]);
 assert.equal(core.inspect(s).ok,true);
 let snapshot=JSON.stringify(s);
 assert.throws(()=>cmd(s,'faction.grade.return',{assignmentId:'ALO-0002',color:'Rubi',
  size:'P',qty:2}),/excede o saldo pendente/);
 assert.throws(()=>cmd(s,'faction.multi.return',{assignmentId:'ALO-0001',qty:1}),
  /cor\/tamanho/);
 assert.equal(JSON.stringify(s),snapshot);
});
test('transferir uma cor/tamanho específico mantém acerto original e saldo correto',()=>{
 let s=configured();
 s=cmd(s,'faction.grade.allocate',{orderId:'PED-0001',factionId:'FAC-0001',
  color:'Preto',size:'P',qty:4});
 s=cmd(s,'faction.grade.allocate',{orderId:'PED-0001',factionId:'FAC-0002',
  color:'Rubi',size:'P',qty:2});
 s=cmd(s,'faction.grade.return',{assignmentId:'ALO-0001',color:'Preto',size:'P',qty:1});
 const bill=s.finance.find(x=>x.sourceId==='ACE-0001').id;
 s=cmd(s,'finance.pay',{id:bill});
 const paid=JSON.stringify(s.settlements[0]),billPaid=JSON.stringify(s.finance.find(x=>x.id===bill));
 const qtyBefore=s.orders[0].allocated;
 s=cmd(s,'faction.grade.transfer',{fromAssignmentId:'ALO-0001',toFactionId:'FAC-0002',
  color:'Preto',size:'P',qty:2,reason:'Rota fictícia por cor'});
 assert.equal(s.factionPartialTransfers.length,1);
 assert.deepEqual([s.factionPartialTransfers[0].color,s.factionPartialTransfers[0].size],['Preto','P']);
 assert.deepEqual(s.factionAssignments.map(x=>x.qtySent),[2,4]);
 assert.equal(s.orders[0].allocated,qtyBefore);
 assert.equal(JSON.stringify(s.settlements[0]),paid);
 assert.equal(JSON.stringify(s.finance.find(x=>x.id===bill)),billPaid);
 assert.equal(core.inspect(s).ok,true);
 s=cmd(s,'faction.grade.return',{assignmentId:'ALO-0002',color:'Preto',size:'P',qty:2});
 assert.equal(s.settlements[1].factionId,'FAC-0002');
 assert.equal(s.settlements[1].amountCents,1100);
 assert.equal(core.inspect(s).ok,true);
 assert.equal(observer.analyze(s).findings.length,0);
});
test('devolução anterior a pagamento reduz apenas cor/tamanho, título e saldo correspondente',()=>{
 let s=configured();
 s=cmd(s,'faction.grade.allocate',{orderId:'PED-0001',factionId:'FAC-0001',
  color:'Preto',size:'P',qty:3});
 s=cmd(s,'faction.grade.return',{assignmentId:'ALO-0001',color:'Preto',size:'P',qty:3});
 const snap=JSON.stringify(s);
 assert.throws(()=>cmd(s,'settlement.pieces.return',{id:'ACE-0001',qty:1,
  reason:'Sem grade'}),/Devolução detalhada/);
 assert.equal(JSON.stringify(s),snap);
 s=cmd(s,'settlement.grade.pieces.return',{id:'ACE-0001',qty:1,
  reason:'Uma peça preta P devolvida'});
 assert.equal(s.settlements[0].qty,2);
 assert.equal(s.settlements[0].returns[0].color,'Preto');
 assert.equal(s.finance.find(x=>x.sourceId==='ACE-0001').amountCents,1100);
 assert.equal(s.orders[0].returned,2);
 assert.equal(s.factionAssignments[0].gradeLines[0].returned,2);
 assert.equal(core.inspect(s).ok,true);
 const bill=s.finance.find(x=>x.sourceId==='ACE-0001').id;
 s=cmd(s,'finance.pay',{id:bill});
 const paid=JSON.stringify(s);
 assert.throws(()=>cmd(s,'settlement.grade.pieces.return',{id:'ACE-0001',qty:1,
  reason:'Pagou'}),/após pagamento/);
 assert.equal(JSON.stringify(s),paid);
});
test('não misturar quantidade geral e classificada; manter compatibilidade com pedidos antigos',()=>{
 let s=make();
 s=cmd(s,'faction.allocate',{orderId:'PED-0001',factionId:'FAC-0001',qty:3});
 const snap=JSON.stringify(s);
 assert.throws(()=>cmd(s,'order.color.grade.set',{orderId:'PED-0001',color:'Preto',
  grade:{P:3,M:0,G:0,GG:0}}),/antes do primeiro envio/);
 assert.equal(JSON.stringify(s),snap);
 let prior=core.initial();delete prior.orders[0]?.colorGrades;
 assert.equal(core.inspect(prior).ok,true);
 assert.equal(grade.inspect(prior).length,0);
});
test('Auditor e núcleo detectam alteração de cor e excedente sem modificar documento',()=>{
 let s=configured();
 s=cmd(s,'faction.grade.allocate',{orderId:'PED-0001',factionId:'FAC-0001',
  color:'Preto',size:'P',qty:3});
 const original=JSON.stringify(s);
 for(const change of [
  x=>{x.factionAssignments[0].gradeLines[0].sent=20},
  x=>{x.factionAssignments[0].gradeLines[0].size='XX'},
  x=>{x.orders[0].colorGrades[0].grade.P=100},
  x=>{x.factionAssignments[0].gradeLines[0].color='Azul'}
 ]){
  const broken=structuredClone(s);change(broken);
  assert.equal(core.inspect(broken).ok,false);
  assert.equal(JSON.stringify(broken),JSON.stringify(broken));
 }
 assert.equal(JSON.stringify(s),original);
});
test('módulo isolado sem rede nem armazenamento produtivo',()=>{
 const js=fs.readFileSync(path.join(__dirname,'../modulos/grade-faccoes-v1.js'),'utf8');
 assert.equal(grade.version,'1.0.0');
 for(const re of [/\bfetch\s*\(/,/\bXMLHttpRequest\b/,/\bWebSocket\b/,
  /\blocalStorage\b/,/\bindexedDB\b/,/\bsupabase\b/i,/https?:\/\//,
  /\bdocument\.cookie/,/\bwindow\.location/])
  assert.equal(re.test(js),false,String(re));
});
