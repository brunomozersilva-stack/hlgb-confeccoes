'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),matrix=JSON.parse(fs.readFileSync(path.join(root,'paridade-critica-detalhada.json'),'utf8')),index=JSON.parse(fs.readFileSync(path.join(root,'paridade-critica-evidencias-v1.json'),'utf8'));
test('cobertura crítica é rastreável sem marcar aprovação humana',()=>{
 assert.equal(matrix.scenarios.length,43);assert.equal(index.scenarios.length,43);
 assert.deepEqual(index.scenarios.map(x=>x.id),matrix.scenarios.map(x=>x.id));
 assert.equal(index.approval,false);
 const proof=fs.readFileSync(path.join(root,'tests/criticos-jornadas-v1.cjs'),'utf8');
 for(const item of index.scenarios){
  const original=matrix.scenarios.find(x=>x.id===item.id);assert.equal(item.risk,original.risk);assert.equal(item.acceptance,original.acceptance);
  assert.equal(item.humanApproval,'pendente');
  assert.ok(['prova_automatizada_parcial','sem_prova_nova_nesta_rodada'].includes(item.automation));
  for(const ev of item.evidence){assert.equal(ev.file,'evolucao-lab/tests/criticos-jornadas-v1.cjs');assert.ok(proof.includes(ev.test));assert.ok(proof.includes(item.id));}
  if(!item.evidence.length)assert.equal(item.automation,'sem_prova_nova_nesta_rodada');
 }
});
