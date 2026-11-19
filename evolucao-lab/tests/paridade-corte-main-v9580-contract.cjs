'use strict';
/* Proteção de transição contra a correção de Corte em main@7c66a37e (v95.80):
 * source release-cutter-planner.js e tests/cutter-save-confirm-v9580.cjs.
 * Exige contratos equivalentes na Evolução fictícia; não afirma que a migração
 * dos cortes reais ou os testes físicos Safari/Chrome estão aprovados.
 */
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const core=require('../operacao-integrada-core.js');
const dir=path.resolve(__dirname,'..');
const cutSource=fs.readFileSync(path.join(dir,'modulos/corte-multimodelo-v1.js'),'utf8');
const clientSource=fs.readFileSync(path.join(dir,'banco-integrado/cliente.js'),'utf8');
const uiSource=fs.readFileSync(path.join(dir,'operacao-integrada-ui.js'),'utf8');
function fixture(){
 let s=core.initial(),seq=0;
 const run=(type,payload,cmdId)=>{
  const result=core.apply(s,{type,payload,commandId:cmdId||'SAVE-CUT-LAB-'+(++seq),
   expectedRevision:s.revision,actor:'Supervisor QA fictício'});
  s=result.state;assert.equal(core.inspect(s).ok,true,'integridade depois de '+type);
  return result.result;
 };
 const id=run('order.multi.create',{clientId:'CLI-0001',sizes:['P','M','G2'],items:[
  {productId:'PRO-0001',colors:[{color:'Rubi',grade:{P:60,M:60,G2:0}}]},
  {productId:'PRO-0002',colors:[{color:'Branco',grade:{P:0,M:0,G2:10}}]}
 ]});
 return {run,id,get state(){return s},call:(type,payload,commandId)=>core.apply(s,{
  type,payload,commandId,expectedRevision:s.revision,actor:'Supervisor QA fictício'})};
}
function plan(orderId,itemId,lines,date='2026-11-23'){
 return {orderId,itemId,lines,scheduledDate:date,priority:'normal',
  cutterOne:'Cortador A',cutterTwo:'Cortador B',spreader:'Infestador C'};
}
const ruby=[{color:'Rubi',size:'P',qty:40},{color:'Rubi',size:'M',qty:40}];
test('Main v95.80: cada modelo mantém sua própria programação, data, equipe e grade',()=>{
 const c=fixture();
 const x=c.run('multi.cut.plan',plan(c.id,'ITM-001',ruby));
 const y=c.run('multi.cut.plan',plan(c.id,'ITM-002',[{color:'Branco',size:'G2',qty:10}],'2026-11-24'));
 const a=c.state.multiCutPlans.find(r=>r.id===x),b=c.state.multiCutPlans.find(r=>r.id===y);
 assert.notEqual(a.id,b.id);
 assert.deepEqual([a.orderId,a.itemId,a.qty,a.scheduledDate,a.cutterOne,a.cutterTwo],
  [c.id,'ITM-001',80,'2026-11-23','Cortador A','Cortador B']);
 assert.deepEqual([b.itemId,b.productId,b.qty,b.scheduledDate],
  ['ITM-002','PRO-0002',10,'2026-11-24']);
 assert.deepEqual(c.state.multiOrders[0].items.map(i=>i.qty),[120,10]);
 assert.equal(c.state.finance.length,0,'Programar corte não cria cobrança');
 assert.equal(c.state.stockLedger.length,0,'Programar corte não debita material comercial');
});
test('Main v95.80: mesmo comando de salvamento não cria outro lote; sem novo ID no conflito',()=>{
 const c=fixture(),payload=plan(c.id,'ITM-001',ruby);
 c.run('multi.cut.plan',payload,'V9580-CUT-SAVE-ONE');
 const before=JSON.stringify(c.state);
 assert.throws(()=>c.call('multi.cut.plan',payload,'V9580-CUT-SAVE-ONE'),/já registrado|duplicad/i);
 assert.throws(()=>c.call('multi.cut.plan',payload,'V9580-CUT-SAVE-TWO'),/saldo|excede|disponível|quantidade/i);
 assert.equal(JSON.stringify(c.state),before,'Rejeições não alteram corte nem histórico');
 assert.equal(c.state.multiCutPlans.filter(x=>x.itemId==='ITM-001').length,1);
});
test('Main v95.80: conclusão não repete e peso posterior não reabre ou sobrescreve programação',()=>{
 const c=fixture(),id=c.run('multi.cut.plan',plan(c.id,'ITM-001',ruby));
 c.run('multi.cut.complete',{id,checkerOne:'Fiscal A',checkerTwo:'Fiscal B'});
 const planBefore=JSON.stringify(c.state.multiCutPlans[0].lines);
 const revBefore=c.state.revision;
 assert.throws(()=>c.call('multi.cut.complete',{id,checkerOne:'Fiscal A',checkerTwo:'Fiscal B'},'CUT-DUP-NEW-ID'),/concluído|cancelado|conclu/i);
 assert.equal(c.state.revision,revBefore);
 c.run('multi.cut.weight.record',{id,totalGrams:7000,usedGrams:5900,wasteGrams:1100,
  checker:'Conferente C',reason:'Pesagem pós-corte'});
 assert.equal(c.state.multiCutPlans[0].status,'concluido');
 assert.equal(JSON.stringify(c.state.multiCutPlans[0].lines),planBefore);
 assert.equal(c.state.multiCutPlans[0].weightEvents.length,1);
 assert.equal(c.state.stockLedger.length,0);
 const saved=JSON.stringify(c.state);
 assert.throws(()=>c.call('multi.cut.weight.record',{id,totalGrams:7000,usedGrams:5900,wasteGrams:1100,
  checker:'Conferente C',reason:'Pesagem repetida'},'CUT-WEIGHT-DUP'),/idêntica|duplic/i);
 assert.equal(JSON.stringify(c.state),saved);
});
test('Main v95.80: interface remota só diz SALVO depois de prova com mesmo ID, tipo, ator e revisão',()=>{
 assert.match(clientSource,/async function prove\(entry\)/);
 assert.match(clientSource,/r\.status==='readback_confirmed'/);
 assert.match(clientSource,/r\.revision!==entry\.command\.expectedRevision\+1/);
 assert.match(clientSource,/ev\.type!==entry\.command\.type/);
 assert.match(clientSource,/ev\.actor!==actor/);
 assert.match(clientSource,/ev\.revision!==r\.revision/);
 assert.match(clientSource,/\.commandId===entry\.command\.commandId/);
 assert.match(clientSource,/async function retry\(\)/);
 assert.match(clientSource,/return send\(pending\)/);
 assert.match(clientSource,/pending\.stage!=='not_found'/);
 assert.match(uiSource,/result\.status!=='confirmed'/);
 assert.match(uiSource,/status\('Salvo e confirmado no PostgreSQL/);
 assert.match(uiSource,/status\('Salvo e confirmado por releitura local/);
 assert.match(uiSource,/Não repetir sem conferir/);
 assert.match(cutSource,/Registre peso somente depois de concluir/);
});
test('Aceite corte comercial continua bloqueado até prova em dois computadores reais',()=>{
 const file=fs.readFileSync(path.join(dir,'CONTRATOS-ACEITE-OPERACIONAL-2026-11-18.md'),'utf8');
 assert.match(file,/ACE-002/);
 assert.match(file,/PENDENTE/);
 assert.match(file,/Safari.*Chrome|Safari.*outro computador|dois PCs/i);
});
