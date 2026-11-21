'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const history=require('../modulos/historico-acertos-v1.js');
const fixture=()=>({
 orders:[{id:'PED-1',clientId:'CLI-1',productId:'PRO-1'},
         {id:'PED-2',clientId:'CLI-2',productId:'PRO-1'}],
 clients:[{id:'CLI-1',name:'Cliente Um'},{id:'CLI-2',name:'Cliente Dois'}],
 factions:[{id:'FAC-1',name:'Facção A'},{id:'FAC-2',name:'Facção B'}],
 products:[{id:'PRO-1',name:'Modelo 1'}],
 settlements:[
 {id:'ACE-1',orderId:'PED-1',factionId:'FAC-1',productId:'PRO-1',qty:10,amountCents:1000,status:'pago',history:[{reason:'Ajuste',commandId:'C1',beforeCents:900,afterCents:1000}]},
 {id:'ACE-2',orderId:'PED-2',factionId:'FAC-1',productId:'PRO-1',qty:20,amountCents:2000,status:'aberto'},
 {id:'ACE-3',orderId:null,factionId:'FAC-2',productId:'PRO-1',qty:5,amountCents:500,status:'aberto'}],
 finance:[
 {id:'FIN-1',sourceId:'ACE-1',kind:'pagar',amountCents:1000,status:'pago',paidDate:'2026-11-20'},
 {id:'FIN-2',sourceId:'ACE-2',kind:'pagar',amountCents:2000,status:'aberto'},
 {id:'FIN-3',sourceId:'ACE-3',kind:'pagar',amountCents:500,status:'aberto'},
 {id:'FIN-4',sourceId:'COMP-1',kind:'receber',amountCents:100,status:'aberto'}],
 settlementCompensations:[{id:'COMP-1',settlementId:'ACE-1',deltaCents:-100,status:'aberto',reason:'Diferença',reference:'AJ-1'}],
 paymentBatches:[{id:'LOT-1',reference:'PAG-1',items:[{financeId:'FIN-1',sourceId:'ACE-1'}]}]
});
test('resumo por faccao soma peças e valores sem duplicar lote ou compensação',()=>{
 const s=fixture(),before=JSON.stringify(s),r=history.report(s);
 assert.equal(r.totals.count,3);assert.equal(r.totals.pieces,35);
 assert.equal(r.totals.totalCents,3500);assert.equal(r.totals.paidCents,1000);
 assert.equal(r.totals.openCents,2500);assert.equal(r.totals.compensationNetCents,-100);
 assert.equal(r.groups.find(x=>x.id==='FAC-1').count,2);
 assert.equal(r.entries[0].batchId,'LOT-1');
 assert.equal(r.entries[0].history.length,1);
 assert.equal(JSON.stringify(s),before);assert.equal(r.readOnly,true);
});
test('visão cliente distingue pedidos e avulso sem cliente',()=>{
 const s=fixture(),r=history.report(s,{groupBy:'cliente'});
 assert.equal(r.groups.length,3);
 assert.equal(r.groups.find(x=>x.id==='CLI-1').totalCents,1000);
 assert.equal(r.groups.find(x=>x.id==='sem-cliente').totalCents,500);
 const filtered=history.report(s,{groupBy:'cliente',partyId:'CLI-2',view:'separado'});
 assert.deepEqual(filtered.entries.map(x=>x.id),['ACE-2']);
});
test('pago, aberto, compensação e pagamento em lote permanecem distinguíveis',()=>{
 const r=history.report(fixture(),{groupBy:'faccao',view:'detalhado'});
 assert.equal(r.entries[0].paidCents,1000);assert.equal(r.entries[0].openCents,0);
 assert.equal(r.entries[0].compensations[0].id,'COMP-1');
 assert.equal(r.entries[1].openCents,2000);
});
test('recusa título ausente e financeiro divergente em vez de omitir acerto',()=>{
 const s=fixture();s.finance[0].amountCents=999;
 assert.throws(()=>history.report(s),/divergente/);
 s.finance[0].amountCents=1000;s.finance.splice(1,1);
 assert.throws(()=>history.report(s),/divergente/);
});
test('interface modular apresenta as duas visões e histórico individual',()=>{
 const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
 const root=path.resolve(__dirname,'..');
 const ui=fs.readFileSync(path.join(root,'operacao-integrada-ui.js'),'utf8');
 const html=fs.readFileSync(path.join(root,'operacao-integrada.html'),'utf8');
 assert.doesNotThrow(()=>new vm.Script(ui));
 assert.match(ui,/function settlementHistoryPanel\(s\)/);
 assert.match(ui,/Resumo por facção/);
 assert.match(ui,/Resumo por cliente/);
 assert.match(ui,/Detalhamento por acerto/);
 assert.match(ui,/settlement-history-export/);
 assert.match(html,/modulos\/historico-acertos-v1\.js/);
});

test('volume maior: 1500 acertos, clientes e pagamentos sem duplicacao',()=>{
 const s=fixture();
 s.settlements=[];s.finance=[];s.settlementCompensations=[];s.paymentBatches=[];
 for(let i=0;i<1500;i++){
  const id='VOL-'+i,paid=i%2===0;
  s.settlements.push({id,orderId:i%3===0?'PED-1':'PED-2',
   factionId:i%5===0?'FAC-2':'FAC-1',productId:'PRO-1',
   qty:2,amountCents:200,status:paid?'pago':'aberto'});
  s.finance.push({id:'FINVOL-'+i,sourceId:id,kind:'pagar',
   amountCents:200,status:paid?'pago':'aberto'});
 }
 const original=JSON.stringify(s),r=history.report(s);
 assert.equal(r.entries.length,1500);assert.equal(r.totals.pieces,3000);
 assert.equal(r.totals.totalCents,300000);assert.equal(r.totals.paidCents,150000);
 assert.equal(r.totals.openCents,150000);assert.equal(JSON.stringify(s),original);
});
test('bloqueia um titulo vinculado a dois lotes de pagamento',()=>{
 const s=fixture();
 s.paymentBatches.push({id:'LOT-2',items:[{financeId:'FIN-1',sourceId:'ACE-1'}]});
 assert.throws(()=>history.report(s),/mais de um lote/);
});
