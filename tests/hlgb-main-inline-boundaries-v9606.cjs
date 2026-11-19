'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const inventory=require('../hlgb-modules/main-inline-boundaries-v9606.cjs');
const sourceFile=path.join(root,'app9240.html');
test('a fonte comercial é exatamente a original de main, sem dados ou funções perdidos',()=>{
 const a=inventory.audit();
 assert.equal(a.gitBlobSha,'db896b5fbf85392be5711ae1c44b3bf245893be4');
 assert.equal(a.gitBlobSha,a.expectedBlobSha);
 assert.equal(a.unchanged,true);
 assert.equal(a.fileBytes,1876542);
 assert.equal(a.inlineScriptBlocks,92,'o programa comercial contém 92 blocos inline');
 assert.ok(a.declaredFunctionsApprox>=1800,'monólito não pode perder centenas de funções');
 assert.ok(a.domIdsApprox>=1000,'monólito não pode perder telas/elementos');
 assert.ok(a.inlineActionNamesApprox>=400,'monólito não pode perder ações HTML');
});
test('92 blocos têm ordem, tamanho, identidade e assinatura preservadas',()=>{
 const a=inventory.audit();
 assert.equal(a.blocks.length,92);
 assert.deepEqual(a.blocks.map(x=>x.ordinal),Array.from({length:92},(_,i)=>i+1));
 assert.ok(a.blocks.every(x=>Number.isInteger(x.startingLine)&&x.startingLine>0));
 assert.ok(a.blocks.every(x=>/^[a-f0-9]{64}$/.test(x.sha256)));
 assert.ok(a.blocks.every(x=>x.sourceChars>0));
 assert.ok(a.blocks.some(x=>x.sourceChars>=750000),'principal código de negócio sumiu');
 assert.ok(a.blocks.some(x=>x.touches.remoteWrite),'contratos de gravação precisam ser inventariados');
 assert.ok(a.blocks.some(x=>x.touches.wal),'contratos de sincronização precisam ser inventariados');
 assert.ok(a.blocks.some(x=>x.windowAssignments.length>0),'APIs públicas dos módulos precisam ser mantidas');
});
test('inventário é somente leitura e não interpreta código de negócio',()=>{
 const current=fs.readFileSync(sourceFile);
 const report=inventory.scan(current.toString('utf8'));
 assert.equal(report.inlineScriptBlocks,92);
 assert.deepEqual(fs.readFileSync(sourceFile),current);
 const lib=fs.readFileSync(path.join(root,'hlgb-modules/main-inline-boundaries-v9606.cjs'),'utf8');
 assert.doesNotMatch(lib,/\b(?:writeFile|appendFile|unlink|rename|eval|exec|fetch|cloudRequest)\s*\(/);
});
test('mudança de uma função não pode passar como código idêntico',()=>{
 const sample='<main><script id="save">function first(){return 1}</script><script>window.helper=()=>1</script></main>';
 const a=inventory.scan(sample),b=inventory.scan(sample.replace('return 1','return 2'));
 assert.equal(a.inlineScriptBlocks,2);
 assert.notEqual(a.blocks[0].sha256,b.blocks[0].sha256,'fingerprint deve sinalizar edição');
 assert.equal(a.blocks[1].sha256,b.blocks[1].sha256,'outros blocos devem ficar estáveis');
});
test('exclusão de script inteiro ou elemento de formulário é detectável',()=>{
 const sample='<form id="separationOrder"><button id="sepBtn" onclick="markSeparation()">Baixar</button></form>'+
  '<script>function markSeparation(){return true}</script><script>function saveRecord(){return true}</script>';
 const a=inventory.scan(sample),b=inventory.scan(sample.replace('<script>function saveRecord(){return true}</script>',''));
 assert.equal(a.inlineScriptBlocks,2);
 assert.equal(b.inlineScriptBlocks,1);
 const original=inventory.audit();
 assert.equal(original.unchanged,true,'proibir alterações de fonte sem atualizar baseline e testes');
});
