'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const core=require('../operacao-integrada-core.js');
const cut=require('../modulos/corte-multimodelo-v1.js');
const root=path.resolve(__dirname,'..');
const ui=fs.readFileSync(path.join(root,'operacao-integrada-ui.js'),'utf8');
const page=fs.readFileSync(path.join(root,'operacao-integrada.html'),'utf8');
const sizes=['PP','P','M','G','GG','XG','G2'];
function grade(entries){return Object.fromEntries(sizes.map(k=>[k,entries[k]||0]));}
function start(){
 let state=core.initial(),n=1;
 const run=(type,payload={},fixedId)=>{const id=fixedId||'MCUT-CI-'+n++;
  const result=core.apply(state,{type,payload,expectedRevision:state.revision,actor:'CI fictício',commandId:id});
  state=result.state;
  assert.ok(core.inspect(state).ok,'Documento íntegro após '+type);
  return result.result;
 };
 const payload={clientId:'CLI-0001',sizes,items:[
  {productId:'PRO-0001',colors:[{color:'Preto',grade:grade({PP:5,M:10})},{color:'Rubi',grade:grade({G2:5})}]},
  {productId:'PRO-0002',colors:[{color:'Branco',grade:grade({XG:8})}]}
 ]};
 const orderId=run('order.multi.create',payload);
 return {run,orderId,get state(){return state}};
}
function planning(orderId,itemId,lines){
 return {orderId,itemId,lines,scheduledDate:'2026-11-20',priority:'normal',
 cutterOne:'Pessoa A',cutterTwo:'Pessoa B',spreader:'Pessoa C'};
}
test('Corte multimodelo reserva por pedido/item/cor/tamanho sem movimentar legado',()=>{
 const ctx=start(),o=ctx.orderId,first='ITM-001',second='ITM-002';
 const a=ctx.run('multi.cut.plan',planning(o,first,[{color:'Preto',size:'PP',qty:3},{color:'Rubi',size:'G2',qty:2}]));
 assert.match(a,/^PCM-\d{4}$/);
 assert.equal(cut.balance(ctx.state,o,first).find(x=>x.color==='Preto'&&x.size==='PP').remaining,2);
 assert.equal(cut.balance(ctx.state,o,first).find(x=>x.color==='Rubi'&&x.size==='G2').remaining,3);
 assert.equal(cut.balance(ctx.state,o,second).find(x=>x.size==='XG').remaining,8);
 const snap=JSON.stringify(ctx.state);
 for(const lines of [[{color:'Preto',size:'PP',qty:3}], [{color:'Branco',size:'XG',qty:1}],
  [{color:'Preto',size:'PP',qty:-1}], [{color:'Rubi',size:'G2',qty:2},{color:'rubi',size:'G2',qty:1}],
  [{color:'Preto',size:'G2',qty:1}]]){
  assert.throws(()=>core.apply(ctx.state,{type:'multi.cut.plan',payload:planning(o,first,lines),
   expectedRevision:ctx.state.revision,commandId:'INVALID-PL-'+lines.length,actor:'CI fictício'}));
  assert.equal(JSON.stringify(ctx.state),snap,'Rejeição não altera nenhum dado');
 }
 const b=ctx.run('multi.cut.plan',planning(o,second,[{color:'Branco',size:'XG',qty:4}]));
 assert.equal(ctx.state.multiCutPlans.length,2);
 assert.equal(ctx.state.orders.length,0);assert.equal(ctx.state.cutPlans.length,0);
 assert.equal(ctx.state.stockLedger.length,0);assert.equal(ctx.state.finance.length,0);
 assert.equal(ctx.state.factionAssignments.length,0);
 assert.ok(b!==a);
});
test('Revisar, concluir e cancelar mantém saldos, revisões e histórico',()=>{
 const ctx=start(),o=ctx.orderId;
 const a=ctx.run('multi.cut.plan',planning(o,'ITM-001',[{color:'Preto',size:'PP',qty:3}]));
 ctx.run('multi.cut.revise',{...planning(o,'ITM-001',[{color:'Preto',size:'PP',qty:2},{color:'Rubi',size:'G2',qty:3}]),
  id:a,scheduledDate:'2026-11-21',priority:'urgente',reason:'Mudança fictícia de prioridade'});
 let plan=ctx.state.multiCutPlans.find(x=>x.id===a);
 assert.equal(plan.qty,5);assert.equal(plan.history.length,2);
 assert.equal(cut.balance(ctx.state,o,'ITM-001').find(x=>x.color==='Preto'&&x.size==='PP').remaining,3);
 ctx.run('multi.cut.complete',{id:a,checkerOne:'Conferente Alfa',checkerTwo:'Conferente Beta'});
 plan=ctx.state.multiCutPlans.find(x=>x.id===a);
 assert.equal(plan.status,'concluido');assert.equal(plan.history.length,3);
 assert.throws(()=>core.apply(ctx.state,{type:'multi.cut.complete',payload:{id:a,checkerOne:'A',checkerTwo:'B'},
 expectedRevision:ctx.state.revision,commandId:'DUPLICATE-COMPLETE',actor:'CI'}),/conclu|cancelado/i);
 assert.throws(()=>core.apply(ctx.state,{type:'multi.cut.revise',payload:{id:a},
 expectedRevision:ctx.state.revision,commandId:'EDIT-COMPLETE',actor:'CI'}),/em aberto/i);
 const b=ctx.run('multi.cut.plan',planning(o,'ITM-002',[{color:'Branco',size:'XG',qty:4}]));
 ctx.run('multi.cut.cancel',{id:b,reason:'Mudança fictícia de data'});
 assert.equal(cut.balance(ctx.state,o,'ITM-002').find(x=>x.size==='XG').remaining,8);
 assert.equal(ctx.state.multiCutPlans.find(x=>x.id===b).status,'cancelado');
 const c=ctx.run('multi.cut.plan',planning(o,'ITM-002',[{color:'Branco',size:'XG',qty:8}]));
 assert.ok(c!==b);
 assert.equal(ctx.state.stockLedger.length,0);assert.equal(ctx.state.finance.length,0);
});
test('Auditor bloqueia adulteração, excesso de saldo e comandos repetidos',()=>{
 const ctx=start(),o=ctx.orderId;
 ctx.run('multi.cut.plan',planning(o,'ITM-001',[{color:'Preto',size:'PP',qty:5}]),'CUT-ONCE');
 assert.throws(()=>core.apply(ctx.state,{type:'multi.cut.plan',payload:planning(o,'ITM-001',[{color:'Rubi',size:'G2',qty:1}]),
 expectedRevision:ctx.state.revision,commandId:'CUT-ONCE',actor:'CI'}),/Comando já registrado/);
 assert.throws(()=>core.apply(ctx.state,{type:'multi.cut.plan',payload:planning(o,'ITM-001',[{color:'Rubi',size:'G2',qty:1}]),
 expectedRevision:ctx.state.revision-1,commandId:'BAD-REV',actor:'CI'}),/CONFLITO/);
 const changed=JSON.parse(JSON.stringify(ctx.state));changed.multiCutPlans[0].lines[0].qty=6;
 assert.equal(core.inspect(changed).ok,false);
 assert.ok(core.inspect(changed).problems.some(x=>x.includes('PCM-')));
 const crossed=JSON.parse(JSON.stringify(ctx.state));crossed.multiCutPlans[0].itemId='ITM-002';
 assert.equal(core.inspect(crossed).ok,false);
});
test('A interface carrega o motor e não mistura com corte antigo ou rede real',()=>{
 assert.doesNotThrow(()=>new vm.Script(ui));
 assert.doesNotThrow(()=>new vm.Script(fs.readFileSync(path.join(root,'modulos/corte-multimodelo-v1.js'),'utf8')));
 assert.match(page,/modulos\/corte-multimodelo-v1\.js/);
 assert.match(ui,/function multiCutPanel\(/);
 assert.match(ui,/multi\.cut\.plan/);
 assert.match(ui,/multi\.cut\.revise/);
 assert.match(ui,/multi\.cut\.complete/);
 assert.match(ui,/multi\.cut\.cancel/);
 assert.match(ui,/return multiCutPanel\(s\)\+cutSplitPanel\(s\)/);
 assert.match(page,/ainda NÃO movimenta estoque/);
});
