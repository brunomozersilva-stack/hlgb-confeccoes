'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),
 fs=require('node:fs'),path=require('node:path'),
 {spawnSync}=require('node:child_process');
const {makeExample,summary}=require('../migracao/conferir-extrato-ficticio-v1.cjs');
const {inspectExtract,compareReads}=require('../migracao/adaptador-extrato-homologacao-v1.cjs');
const command=path.resolve(__dirname,'../migracao/conferir-extrato-ficticio-v1.cjs');
test('exemplo determinístico tem dois pedidos, sete páginas e não acessa banco',()=>{
 const first=makeExample(),second=makeExample();
 assert.deepEqual(first,second);
 const result=inspectExtract(first);
 assert.equal(result.pagesChecked,7);
 assert.equal(result.mappedOrders,2);
 assert.equal(result.sourceCounts.legacyOrders,2);
 assert.equal(result.sourceCounts.finance,2);
 assert.equal(result.batch.totals.documents,10);
 assert.equal(result.batch.totals.sourcePieces,60);
 assert.equal(result.canWrite,false);
 assert.equal(result.importable,false);
 const report=summary(result);
 assert.equal(report.realDatabaseCoverageProven,false);
 assert.equal(report.reconciliação,'BLOQUEADA');
 assert.equal(report.canPay,false);
 assert.deepEqual(compareReads(first,second).sameContents,true);
});
test('CLI --summary só apresenta contagens e bloqueios, sem dados comerciais',()=>{
 const result=spawnSync(process.execPath,[command,'--summary'],{encoding:'utf8',timeout:10000});
 assert.equal(result.status,0,result.stderr);
 const parsed=JSON.parse(result.stdout);
 assert.equal(parsed.mode,'somente_leitura');
 assert.equal(parsed.pairedOrders,2);
 assert.equal(parsed.reconciliação,'BLOQUEADA');
 assert.equal(parsed.canWrite,false);
 assert.doesNotMatch(result.stdout,/pessoa|cpf|senha|telefone/i);
});
test('CLI --json publica apenas massa inventada e reproduz o mesmo checksum',()=>{
 const result=spawnSync(process.execPath,[command,'--json'],{encoding:'utf8',timeout:10000});
 assert.equal(result.status,0,result.stderr);
 const example=JSON.parse(result.stdout);
 assert.equal(example.source.environment,'homologacao-ficticia');
 assert.equal(inspectExtract(example).digest,inspectExtract(makeExample()).digest);
 assert.equal(example.pages.find(p=>p.collection==='legacyOrders').records[0].id,'LEG-TESTE-001');
});
test('CLI recusa argumentos inválidos, URL e arquivo ausente',()=>{
 for(const args of [[],['--check','https://example.com/snapshot.json'],
  ['--check','/arquivo-que-nao-existe/teste.json'],['--compare','a.json']]){
  const result=spawnSync(process.execPath,[command,...args],{encoding:'utf8',timeout:10000});
  assert.notEqual(result.status,0,'deve recusar '+args.join(' '));
  assert.match(result.stderr,/Prévia recusada/);
 }
});
test('nenhuma escrita ao disco, servidor ou banco implementada no utilitário',()=>{
 const source=fs.readFileSync(command,'utf8');
 assert.doesNotMatch(source,/\bfetch\s*\(|\bXMLHttpRequest\b|\bWebSocket\b|\bcreateServer\s*\(|\bwriteFileSync\s*\(|\.insert\s*\(|supabase\.from/);
 assert.match(source,/environment!=='homologacao-ficticia'/);
 assert.match(source,/canWrite:false/);
});
