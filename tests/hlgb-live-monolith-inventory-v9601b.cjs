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

test('158 scripts preservados, na mesma ordem, com um domínio responsável cada',()=>{
 const loader=fs.readFileSync(path.join(root,'app-stable3.html'),'utf8');
 const found=loader.match(/const files=\[([\s\S]*?)\];\/\* A base/);
 assert.ok(found,'é obrigatório localizar a lista do carregador realmente usado');
 const actual=[...found[1].matchAll(/'([^']+\.js)'/g)].map(x=>x[1]);
 const ownership=require('../hlgb-modules/ownership-v9600.json');
 assert.equal(ownership.groupCount,0,'não reativar grupos em lote que causaram falha de abertura');
 assert.equal(actual.length,159);
 assert.equal(ownership.preExtractionScripts.length,158,'o inventário anterior permanece como baseline');
 assert.deepEqual(actual.filter(x=>x!=='hlgb-modules/producao/separacao-progresso-v9617.js'),ownership.preExtractionScripts);
 assert.equal(new Set(actual).size,actual.length,'nenhum script duplicado no carregador');
 assert.deepEqual(actual,ownership.releaseScripts,'ordem do loader não pode mudar inadvertidamente');
 const owners=ownership.ownership;
 assert.equal(Object.keys(owners).length,14,'todas as 14 áreas documentadas');
 const assigned=new Map();
 for(const [area,entries] of Object.entries(owners)){
  assert.ok(Array.isArray(entries)&&entries.length,'área sem scripts: '+area);
  for(const file of entries){
   assert.ok(actual.includes(file),'manifesto referencia script removido: '+file);
   assert.ok(!assigned.has(file),'responsabilidades primárias duplicadas: '+file);
   assigned.set(file,area);
  }
 }
 assert.deepEqual([...assigned.keys()].sort(),[...actual].sort(),'toda função externa precisa de área dona');
 assert.equal(assigned.get('hlgb-modules/autenticacao/rede-segura-v9613.js'),'base-infraestrutura');
 assert.equal(assigned.get('hlgb-modules/utilidades/etiquetas-layout-v9602b.js'),'utilidades-etiquetas');
 assert.equal(assigned.get('hlgb-modules/producao/separacao-progresso-v9617.js'),'producao-separacao');
 assert.equal(ownership.criticalFileBlobs['app9240.html'],audit.readCurrent().sha);
});
test('checkpoint não reescreve monólito, WAL, operações ou módulos existentes',()=>{
 const report=audit.readCurrent();
 assert.equal(report.untouched,true);
 const src=fs.readFileSync(path.join(root,'hlgb-modules/audit-live-monolith-v9601b.cjs'),'utf8');
 for(const forbidden of ['cloudRequest(', 'indexedDB.open(', 'localStorage.clear(', 'writeFileSync(', 'eval(']){
  assert.equal(src.includes(forbidden),false,'inventário não deve interagir com dados reais: '+forbidden);
 }
 assert.ok(report.declarationCount>100,'scanner lê o arquivo original');
 assert.ok(report.domIdCount>50,'inventário mantém visibilidade de ações e telas');
});
