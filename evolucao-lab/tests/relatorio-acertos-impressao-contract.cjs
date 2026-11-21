'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const printer=require('../modulos/relatorio-acertos-impressao-v1.js');
const filters=require('../modulos/historico-acertos-filtros-v2.js');
const state=()=>({
 clients:[{id:'C1',name:'Cliente <A>'}],
 factions:[{id:'F1',name:'Facção & "B"'}],
 products:[{id:'P1',name:'Camisola'}],
 orders:[{id:'O1',clientId:'C1',productId:'P1'}],
 settlements:[{id:'ACE-1',orderId:'O1',factionId:'F1',productId:'P1',
  qty:10,amountCents:2000,status:'pago',
  history:[{commandId:'AUD-1',reason:'Corrigir <valor>',beforeCents:1500,afterCents:2000}]}],
 finance:[{id:'FIN-1',kind:'pagar',sourceId:'ACE-1',amountCents:2000,
  status:'pago',paidDate:'2026-11-20'},
 {id:'FIN-CMP-1',kind:'receber',sourceId:'CMP-1',amountCents:100,status:'aberto'}],
 settlementCompensations:[{id:'CMP-1',settlementId:'ACE-1',deltaCents:-100,
  status:'aberto',reference:'REF-1',reason:'Ajuste & revisão'}],
 paymentBatches:[{id:'LOTE-1',reference:'PG-1',items:[{financeId:'FIN-1'}]}]
});
test('resumo A4 separa total e compensacoes, escapa nomes de cliente',()=>{
 const doc=state(),snapshot=JSON.stringify(doc),r=filters.query(doc);
 const html=printer.render(r,{detail:'resumo'});
 assert.match(html,/HISTORICO DE ACERTOS/);assert.match(html,/R\$ 20,00/);
 assert.match(html,/R\$ -?1,00|-R\$ 1,00/);
 assert.match(html,/Cliente &lt;A&gt;/);assert.match(html,/Facção &amp; &quot;B&quot;/);
 assert.doesNotMatch(html,/Cliente <A>/);assert.equal(JSON.stringify(doc),snapshot);
 assert.doesNotMatch(html,/Acertos individuais/);
});
test('impressao separada lista o acerto e deixa comprovante independente',()=>{
 const r=filters.query(state(),{view:'separado'});
 const html=printer.render(r,{detail:'separado'});
 assert.match(html,/ACE-1/);assert.match(html,/2026-11-20/);
 assert.match(html,/DOCUMENTO FICTICIO DE TESTE/);
 assert.doesNotMatch(html,/Corrigir &lt;valor&gt;/);
});
test('detalhado mostra historico e compensacao com escape',()=>{
 const r=filters.query(state(),{view:'detalhado'});
 const html=printer.render(r,{detail:'detalhado'});
 assert.match(html,/Corrigir &lt;valor&gt;/);
 assert.match(html,/Ajuste &amp; revisão/);
 assert.match(html,/FIN-1/);assert.match(html,/CMP-1/);
});
test('documento de impressao rejeita dados mal formados',()=>{
 assert.throws(()=>printer.render({entries:[],groups:[],totals:{totalCents:0}},{detail:'outro'}),/invalido/);
 assert.throws(()=>printer.render({entries:[],groups:[]}),/Totais/);
});
test('UI carrega filtros e impressao na mesma versao modular',()=>{
 const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
 const base=path.resolve(__dirname,'..');
 const ui=fs.readFileSync(path.join(base,'operacao-integrada-ui.js'),'utf8');
 const html=fs.readFileSync(path.join(base,'operacao-integrada.html'),'utf8');
 assert.doesNotThrow(()=>new vm.Script(ui));
 assert.match(ui,/function settlementHistoryFiltersPanel\(s\)/);
 assert.match(ui,/function settlementHistorySelection\(\)/);
 assert.match(ui,/data-sett-hist-print/);
 assert.match(ui,/sett-hist-export-filtered/);
 assert.match(ui,/ACERTOS-SELECIONADOS-FICTICIOS/);
 assert.match(ui,/window\.print\(\)/);
 assert.match(html,/historico-acertos-filtros-v2\.js/);
 assert.match(html,/relatorio-acertos-impressao-v1\.js/);
});
