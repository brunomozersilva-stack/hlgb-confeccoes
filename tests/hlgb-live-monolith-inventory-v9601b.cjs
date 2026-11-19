'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const audit=require('../hlgb-modules/audit-live-monolith-v9601b.cjs');
const root=path.resolve(__dirname,'..');
test('escaneia apenas declarações, sem executar scripts ou escrever arquivos',()=>{
 const sample='<main><script>function renderCuts(x){return x}; const printSheet=(x)=>x; window.hlgbAction=printSheet;</script>'+
  '<script src="./aux.js"></script><script>async function saveOne(){return true;} function renderCuts(){}</script></main>';
 const before=sample,found=audit.inventory(sample);
 const enhanced=audit.inventory(sample.replace('<main>', '<main id="mainPanel" onclick="renderCuts(1)">'));
 assert.equal(enhanced.domIdCount,1);
 assert.deepEqual(enhanced.domIds,['mainPanel']);
 assert.deepEqual(enhanced.inlineEventActionNames,['renderCuts']);
 assert.deepEqual(enhanced.inlineEventTypes,['click']);
 const domain=audit.suggestDomains(['renderCuts','saveCloud','employeePayroll','noiseFunction']);
 assert.ok(domain.candidateDomains['corte-cortadores'].includes('renderCuts'));
 assert.ok(domain.candidateDomains['sincronizacao-wal'].includes('saveCloud'));
 assert.ok(domain.candidateDomains['folha-pessoal'].includes('employeePayroll'));
 assert.deepEqual(domain.unclassified,['noiseFunction']);

 assert.equal(sample,before);
 assert.equal(found.scriptBlocks,2);
 assert.deepEqual(found.declarations,['printSheet','renderCuts','saveOne']);
 assert.deepEqual(found.windowAssignments,['hlgbAction']);
 const src=fs.readFileSync(path.join(root,'hlgb-modules/audit-live-monolith-v9601b.cjs'),'utf8');
 assert.doesNotMatch(src,/\b(?:eval|exec|writeFileSync|unlinkSync|fetch|cloudRequest)\s*\(/);
});
test('SHA do monólito original não pode mudar no trabalho de inventário',()=>{
 const report=audit.readCurrent();
 assert.equal(report.file,'app9240.html');
 assert.ok(report.bytes>1000000,'fonte comercial precisa ser real, não fixture ou placeholder');
 assert.equal(report.untouched,true,'não extrair sem comparar o arquivo anterior byte a byte');
 assert.match(report.sha,/^[a-f0-9]{40}$/);
 assert.ok(report.scriptBlocks>=1,'precisa identificar pelo menos um bloco de JS inline');
});
