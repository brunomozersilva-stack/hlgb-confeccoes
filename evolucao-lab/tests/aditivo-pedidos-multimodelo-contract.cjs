'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const core=require('../operacao-integrada-core.js');
const labUi=fs.readFileSync(path.join(__dirname,'../operacao-integrada-ui.js'),'utf8');
const sized=(p,m)=>({PP:0,P:p,M:m,GG:0,G2:0});
function scenario(){
 let s=core.initial(),sequence=0;
 const run=(type,payload)=>{
  const result=core.apply(s,{type,payload,actor:'QA fictício',expectedRevision:s.revision,
   commandId:'ADITIVO-PEDIDOS-'+(++sequence)});
  s=result.state;assert.equal(core.inspect(s).ok,true,type+' deve manter integridade');return result.result;
 };
 const orderId=run('order.multi.create',{clientId:'CLI-0001',sizes:['PP','P','M','GG','G2'],
  items:[{productId:'PRO-0001',colors:[{color:'Preto',grade:sized(60,40)}]},
         {productId:'PRO-0002',colors:[{color:'Rubi',grade:sized(20,30)}]}]});
 const payload=()=>({id:orderId,reason:'Aditivo fictício de grades e modelos',items:s.multiOrders[0].items.map(x=>({
  id:x.id,productId:x.productId,colors:x.colors.map(c=>({color:c.color,grade:{...c.grade}}))}))});
 return {run,orderId,payload,get s(){return s}};
}
test('acrescenta cor e modelo sem renumerar os itens antigos nem lançar valores',()=>{
 const c=scenario(),p=c.payload();
 p.items[0].colors.push({color:'Branco',grade:sized(10,5)});
 p.items.push({productId:'PRO-0003',colors:[{color:'Azul',grade:sized(7,3)}]});
 c.run('order.multi.amend',p);
 const current=c.s.multiOrders[0];
 assert.equal(current.totals.pieces,175);
 assert.deepEqual(current.items.map(i=>i.id),['ITM-001','ITM-002','ITM-003']);
 assert.equal(current.revisions.length,1);
 assert.equal(current.revisions[0].before.totals.pieces,150);
 assert.equal(current.revisions[0].after.totals.pieces,175);
 assert.equal(c.s.finance.length,0);
 assert.equal(c.s.stockLedger.length,0);
});
test('retira modelo sem uso, mas nunca reutiliza seu ID em inclusões futuras',()=>{
 const c=scenario(),p=c.payload();p.items.splice(1,1);
 c.run('order.multi.amend',p);
 assert.deepEqual(c.s.multiOrders[0].items.map(x=>x.id),['ITM-001']);
 const next=c.payload();next.items.push({productId:'PRO-0003',colors:[{color:'Azul',grade:sized(4,5)}]});
 c.run('order.multi.amend',next);
 assert.deepEqual(c.s.multiOrders[0].items.map(x=>x.id),['ITM-001','ITM-003']);
 assert.equal(c.s.multiOrders[0].revisions.length,2);
});
test('impede excluir modelo ou cor que já teve corte, mesmo corte cancelado',()=>{
 const c=scenario();
 const cut=c.run('multi.cut.plan',{orderId:c.orderId,itemId:'ITM-001',
  scheduledDate:'2026-11-28',priority:'normal',cutterOne:'A',cutterTwo:'B',spreader:'C',
  lines:[{color:'Preto',size:'P',qty:40}]});
 const before=JSON.stringify(c.s),p=c.payload();p.items.shift();
 assert.throws(()=>c.run('order.multi.amend',p),/corte ou movimentação/i);
 assert.equal(JSON.stringify(c.s),before);
 const p2=c.payload();p2.items[0].colors=[];
 assert.throws(()=>c.run('order.multi.amend',p2),/Informe de 1 a 30 cores/);
 const p3=c.payload();p3.items[0].colors=[{color:'Branco',grade:sized(5,4)}];
 assert.throws(()=>c.run('order.multi.amend',p3),/retirar a cor/);
 // Cancelado também continua referenciado no histórico da folha.
 c.run('multi.cut.cancel',{id:cut,reason:'Cancelamento fictício de teste'});
 const p4=c.payload();p4.items.splice(0,1);
 assert.throws(()=>c.run('order.multi.amend',p4),/corte ou movimentação/i);
});
test('não permite reduzir quantidade reservada e preserva revisão após erro',()=>{
 const c=scenario();c.run('multi.cut.plan',{orderId:c.orderId,itemId:'ITM-001',
  scheduledDate:'2026-11-28',priority:'normal',cutterOne:'A',cutterTwo:'B',spreader:'C',
  lines:[{color:'Preto',size:'P',qty:40}]});
 const before=JSON.stringify(c.s),p=c.payload();
 p.items[0].colors[0].grade.P=39;
 assert.throws(()=>c.run('order.multi.amend',p),/abaixo de 40/);
 assert.equal(JSON.stringify(c.s),before);
 const valid=c.payload();valid.items[0].colors[0].grade.P=40;
 c.run('order.multi.amend',valid);
 assert.equal(core.inspect(c.s).ok,true);
});
test('detecta alteração de histórico e bloqueia modelo duplicado por ID',()=>{
 const c=scenario(),p=c.payload();p.items.push({...p.items[0]});
 assert.throws(()=>c.run('order.multi.amend',p),/duplicada/i);
 const next=c.payload();next.items[0].colors.push({color:'Branco',grade:sized(7,7)});
 c.run('order.multi.amend',next);
 const invalid=JSON.parse(JSON.stringify(c.s));
 invalid.multiOrders[0].revisions[0].after.items[0].qty++;
 assert.equal(core.inspect(invalid).ok,false);
});
test('tela permite aditivo com seleção explícita e justificativa',()=>{
 assert.match(labUi,/function multiOrderAmendmentPanel\(s\)/);
 assert.match(labUi,/data-command="order\.multi\.amend"/);
 assert.match(labUi,/data-amend-remove-item/);
 assert.match(labUi,/data-amend-remove-color/);
 assert.match(labUi,/data-amend-new-model/);
 assert.match(labUi,/data-amend-new-color/);
 assert.match(labUi,/order\.multi\.amend'&&!confirm/);
});
