'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'../..');
const manifest=JSON.parse(fs.readFileSync(path.join(root,'evolucao-lab/arquivos-legados-baseline.json'),'utf8'));
const parity=JSON.parse(fs.readFileSync(path.join(root,'evolucao-lab/paridade-funcional.json'),'utf8'));
function blobSha(data){
 return crypto.createHash('sha1').update('blob '+data.length+'\0').update(data).digest('hex');
}
test('congelamento de referência: arquivos legados permanecem idênticos ao commit auditado',()=>{
 assert.equal(manifest.sha,'2440621468d8c4d8260effe32ea47eef478077c4');
 assert.equal(manifest.files.length,229);
 assert.equal(manifest.files.filter(f=>/^release-.*\.js$/.test(f.path)).length,225);
 const unique=new Set();
 for(const file of manifest.files){
  assert.ok(!unique.has(file.path),'Arquivo duplicado '+file.path);unique.add(file.path);
  assert.match(file.blobSha,/^[a-f0-9]{40}$/);
  const bytes=fs.readFileSync(path.join(root,file.path));
  assert.equal(bytes.length,file.size,'Tamanho mudou: '+file.path);
  assert.equal(blobSha(bytes),file.blobSha,'Arquivo legado alterado sem revisão: '+file.path);
 }
});
test('todas as 76 funções têm fonte conhecida e nenhum arquivo legado é removido',()=>{
 const frozen=new Set(manifest.files.map(x=>x.path));
 assert.equal(parity.cases.length,76);
 for(const c of parity.cases){
  assert.ok(fs.existsSync(path.join(root,c.source)),'fonte ausente '+c.id);
  assert.equal(c.approvedForRemoval,false);
  if(c.source.startsWith('release-')||['app9240.html','app-stable3.html','index.html','hlgb-canonical-sw.js'].includes(c.source))
   assert.ok(frozen.has(c.source),'fonte não rastreada: '+c.id);
 }
});
