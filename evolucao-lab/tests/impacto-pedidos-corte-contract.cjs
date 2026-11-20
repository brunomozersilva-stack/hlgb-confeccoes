'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const core=require('../operacao-integrada-core.js'),orders=require('../modulos/pedidos-multimodelo-v1.js');
const ui=fs.readFileSync(path.join(__dirname,'../operacao-integrada-ui.js'),'utf8');
function fixture(){
 let s=core.initial(),seq=0;
 const run=(type,payload)=>{
  const x=core.apply(s,{type,payload,expectedRevision:s.revision,
   commandId:'IMPACTO-CORTE-'+(++seq),actor:'QA fictício'});
  s=x.state;assert.equal(core.inspect(s).ok,true,type+' mantém integridade');return x.result;
 };
 const id=run('order.multi.create',{clientId:'CLI-0001',sizes:['P','M','G2'],items:[
  {productId:'PRO-0001',colors:[{color:'Preto',grade:{P:60,M:40,G2:0}}]},
  {productId:'PRO-0002',colors:[{color:'Rubi',grade:{P:20,M:30,G2:0}}]}]});
 return {run,id,get s(){return s}};
}
function cut(c,itemId='ITM-001',lines=[{color:'Preto',size:'P',qty:40}]){
 return c.run('multi.cut.plan',{orderId:c.id,itemId,lines,
  scheduledDate:'2026-11-28',priority:'normal',cutterOne:'A',cutterTwo:'B',spreader:'C'});
}
test('prévia inicial é somente leitura e expõe todos os saldos por variação',()=>{
 const c=fixture(),before=JSON.stringify(c.s),rows=orders.cutImpact(c.s,c.id);
 const p=rows.find(r=>r.itemId==='ITM-001'&&r.color==='Preto'&&r.size==='P');
 assert.equal(p.ordered,60);assert.equal(p.planned,0);assert.equal(p.cut,0);
 assert.equal(p.freeToReduce,60);assert.equal(p.status,'livre');
 assert.equal(rows.filter(r=>r.itemId==='ITM-002').reduce((n,r)=>n+r.ordered,0),50);
 assert.equal(JSON.stringify(c.s),before,'consulta não altera registro');
});
test('programação e corte consumem saldo livre sem confundir cancelamento',()=>{
 const c=fixture(),a=cut(c);
 let p=orders.cutImpact(c.s,c.id).find(r=>r.itemId==='ITM-001'&&r.size==='P');
 assert.equal(p.planned,40);assert.equal(p.cut,0);assert.equal(p.freeToReduce,20);
 c.run('multi.cut.cancel',{id:a,reason:'Cancelamento fictício'});
 p=orders.cutImpact(c.s,c.id).find(r=>r.itemId==='ITM-001'&&r.size==='P');
 assert.equal(p.planned,0);assert.equal(p.cancelledHistory,40);
 assert.equal(p.freeToReduce,60,'corte cancelado não reserva quantidade');
 const b=cut(c);
 c.run('multi.cut.complete',{id:b,checkerOne:'Assinatura A',checkerTwo:'Assinatura B'});
 p=orders.cutImpact(c.s,c.id).find(r=>r.itemId==='ITM-001'&&r.size==='P');
 assert.equal(p.planned,0);assert.equal(p.cut,40);assert.equal(p.protectedQty,40);
 assert.equal(p.cancelledHistory,40);
 assert.equal(p.pendingCut,20);
});
test('ponta a ponta não mistura facção, retorno, separação e expedição',()=>{
 const c=fixture(),id=cut(c);
 c.run('multi.cut.complete',{id,checkerOne:'Assinatura A',checkerTwo:'Assinatura B'});
 const lot=c.run('multi.flow.allocate',{cutId:id,factionId:'FAC-0001',unitCents:550,
  lines:[{color:'Preto',size:'P',qty:40}],reason:'Enviar para facção fictícia'}).split(' · ')[0];
 c.run('multi.flow.return',{id:lot,lines:[{color:'Preto',size:'P',qty:30}],reason:'Retorno parcial fictício'});
 c.run('multi.flow.separate',{orderId:c.id,itemId:'ITM-001',
  lines:[{color:'Preto',size:'P',qty:20}],reason:'Separação fictícia parcial'});
 c.run('multi.flow.ship',{orderId:c.id,itemId:'ITM-001',
  lines:[{color:'Preto',size:'P',qty:10}],reason:'Expedição fictícia parcial'});
 const p=orders.cutImpact(c.s,c.id).find(r=>r.itemId==='ITM-001'&&r.size==='P');
 assert.equal(p.cut,40);assert.equal(p.sent,40);assert.equal(p.returned,30);
 assert.equal(p.separated,20);assert.equal(p.shipped,10);
 assert.equal(p.inFaction,10);assert.equal(p.availableToSeparate,10);
 assert.equal(p.availableToShip,10);assert.equal(p.freeToReduce,20);
 assert.equal(c.s.finance.length,0,'prévia não cria título financeiro');
});
test('conflito ou corrupção no fluxo impede a prévia de parecer válida',()=>{
 const c=fixture(),a=cut(c);
 const before=JSON.stringify(c.s);
 const bad=JSON.parse(before);
 bad.multiCutPlans[0].lines[0].qty=70;
 assert.throws(()=>orders.cutImpact(bad,c.id),/inconsistente/i);
 assert.equal(JSON.stringify(c.s),before);
});
test('painel de impacto faz parte da tela Pedidos e mostra restrições',()=>{
 assert.match(ui,/function multiOrderCutImpactPanel\(s\)/);
 assert.match(ui,/multiOrderCutImpactPanel\(s\)\+multiOrderRevisionPanel/);
 assert.match(ui,/data-order-cut-impact=/);
 assert.match(ui,/Livres para ajustar/);
 assert.match(ui,/Hist. cancelado/);
});
