'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const core=require('../operacao-integrada-core.js'),service=require('../modulos/regularizacao-historica-preview-v1.js');
const dir=path.resolve(__dirname,'..');
const header='cliente;modelo;quantidade;data;referencia;status';
test('Prévia de histórico concilia cliente/modelo por ID ou nome exato sem mutar estoque',()=>{
 const s=core.initial(),before=JSON.stringify(s);
 const report=service.preview(s,header+'\n'+
  'CLI-0001;PRO-0001;120;2026-11-15;HIST-001;Entregue\n'+
  'Loja Exemplo Centro;Camisola Melina;70;2026-11-16;HIST-002;Parcial');
 assert.equal(report.lines,2);assert.equal(report.ready,2);
 assert.equal(report.blocked,0);assert.equal(report.readyPieces,190);
 assert.equal(report.rows[0].clientId,'CLI-0001');
 assert.equal(report.rows[1].productId,'PRO-0001');
 assert.equal(report.previewOnly,true);assert.equal(report.canCommit,false);
 assert.equal(report.importedCount,0);
 assert.equal(report.stockWritten,false);assert.equal(report.financeWritten,false);
 assert.equal(JSON.stringify(s),before,'Prévia não deve escrever no documento');
});
test('Nunca deduzir cliente pelo nome parecido nem aceitar duplicatas de importações anteriores',()=>{
 const s=core.initial();
 s.orderImports=[{items:[{reference:'JÁ-EXISTE'}]}];
 s.orders.push({id:'PED-0001'});
 const data=header+'\n'+
  'CLI-0001;PRO-0001;30;2026-11-15;HIST-001;Parcial\n'+
  'CLI-0001;PRO-0001;20;2026-11-15;HIST-001;Parcial\n'+
  'Loja Exemplo;PRO-0001;60;2026-11-16;HIST-003;Parcial\n'+
  'CLI-0001;PRO-0001;20;2026-02-30;HIST-004;Parcial\n'+
  'CLI-0001;PRO-0001;20;2026-11-16;JÁ-EXISTE;Parcial\n'+
  'CLI-0001;PRO-0001;20;2026-11-16;PED-0001;Parcial\n'+
  'CLI-0001;PRO-0001;0;2026-11-16;HIST-007;Parcial';
 const p=service.preview(s,data);
 assert.equal(p.lines,7);assert.equal(p.ready,1);assert.equal(p.blocked,6);
 assert.equal(p.readyPieces,30);
 assert.ok(p.rows.filter(x=>x.status==='bloqueado').every(x=>x.issues.length>=1));
 assert.ok(p.rows[2].issues.join('').includes('Cliente sem correspondência'));
 assert.ok(p.rows[4].issues.join('').includes('duplicada'));
 assert.equal(p.importedCount,0);
});
test('Quantidades irreais, datas impossíveis, colunas erradas e tamanho do lote são recusados',()=>{
 const s=core.initial();
 for(const raw of [
  '',header,
  'cliente;produto;qtd;data;numero;status\nA;B;1;2026-11-18;X;A',
  header+'\nCLI-0001;PRO-0001;12.5;2026-11-18;REF;Pendente',
  header+'\nCLI-0001;PRO-0001;100001;2026-11-18;REF;Pendente',
  header+'\nCLI-0001;PRO-0001;4;2026-11-18;REF;Pendente;Coluna extra'
 ]) {
  if(raw.includes('12.5')||raw.includes('100001')||raw.includes('Coluna extra')){
   const p=service.preview(s,raw);
   assert.equal(p.blocked,1);assert.equal(p.ready,0);
  }else assert.throws(()=>service.preview(s,raw));
 }
 assert.throws(()=>service.preview(s,header+'\n'+Array(251).fill('CLI-0001;PRO-0001;1;2026-11-18;X;P').join('\n')),/250/);
});
test('Tela e scripts só conferem e exportam, sem botão de importar e sem rede',()=>{
 const ui=fs.readFileSync(path.join(dir,'operacao-integrada-ui.js'),'utf8');
 const html=fs.readFileSync(path.join(dir,'operacao-integrada.html'),'utf8');
 const moduleSrc=fs.readFileSync(path.join(dir,'modulos/regularizacao-historica-preview-v1.js'),'utf8');
 assert.doesNotThrow(()=>new vm.Script(ui));assert.doesNotThrow(()=>new vm.Script(moduleSrc));
 assert.match(html,/regularizacao-historica-preview-v1\.js/);
 assert.match(ui,/function historicalReviewPanel\(/);
 assert.match(ui,/historical-preview/);assert.match(ui,/historical-export/);
 assert.match(ui,/Importação BLOQUEADA/);
 assert.doesNotMatch(moduleSrc,/\bfetch\s*\(|\bXMLHttpRequest\b|\bWebSocket\b/);
 assert.doesNotMatch(moduleSrc,/\bapply\s*\(|\bsaveRow\s*\(/);
});
