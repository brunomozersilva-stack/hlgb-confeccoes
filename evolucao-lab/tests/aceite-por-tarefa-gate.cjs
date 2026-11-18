'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),manifest=JSON.parse(fs.readFileSync(path.join(root,'aceite-por-tarefa-v1.json'),'utf8'));
const everyProof=(row)=>manifest.requiredEvidence.every(field=>
 typeof row.evidence?.[field]==='string'&&row.evidence[field].trim().length>=12);
const team=(row)=>row.operatorApproval&&typeof row.operatorApproval.role==='string'&&row.operatorApproval.role.trim()&&
 typeof row.operatorApproval.at==='string'&&/^\d{4}-\d\d-\d\d/.test(row.operatorApproval.at)&&row.approvedAt;
function canApprove(row){
 return everyProof(row)&&team(row)&&['preservada','melhorada'].includes(row.status)&&
  (row.status!=='melhorada'||(row.improvementConfirmed===true&&
   typeof row.improvementEvidence==='string'&&row.improvementEvidence.length>=12));
}
test('Regra: sem preservar cada tarefa nem demonstrar ganho, não marcar módulo aprovado',()=>{
 assert.equal(manifest.schema,'hlgb-evolucao-aceite-por-tarefa-v1');
 assert.deepEqual(manifest.statusValues,['pendente','preservada','melhorada']);
 assert.ok(manifest.tasks.length>=17);
 assert.equal(new Set(manifest.tasks.map(x=>x.id)).size,manifest.tasks.length);
 for(const row of manifest.tasks){
  assert.match(row.id,/^ACE-\d{3}$/);
  assert.ok(row.module&&row.title&&row.expectedImprovement);
  assert.ok(manifest.statusValues.includes(row.status),row.id);
  assert.ok(row.evidence&&manifest.requiredEvidence.every(k=>k in row.evidence),row.id);
  if(row.status!=='pendente')assert.ok(canApprove(row),row.id+' sem provas');
  if(row.status==='melhorada')assert.equal(row.improvementConfirmed,true,row.id);
 }
 const areas=[...new Set(manifest.tasks.map(x=>x.module))];
 const modulesApproved=areas.every(module=>{
  const tasks=manifest.tasks.filter(x=>x.module===module);
  return tasks.every(canApprove)&&tasks.some(x=>x.status==='melhorada');
 });
 const entireReady=manifest.allLegacyTasksInventoried===true&&manifest.serverMigrationApproved===true&&
  manifest.rollbackTestApproved===true&&manifest.ownerExplicitApproval===true&&modulesApproved;
 assert.equal(manifest.approvedForProduction,entireReady,'Bloquear produção até aceite total e aprovação explícita');
});
test('O laboratório não pode transformar simulação em aprovação operacional',()=>{
 const pending=manifest.tasks.filter(x=>x.status==='pendente');
 assert.ok(pending.length>=17,'A lista atual ainda não foi conferida pela equipe');
 assert.equal(manifest.approvedForProduction,false);
 assert.equal(manifest.allLegacyTasksInventoried,false);
 assert.equal(manifest.serverMigrationApproved,false);
 assert.equal(manifest.rollbackTestApproved,false);
 for(const row of pending){
  assert.equal(canApprove(row),false);
  assert.equal(row.improvementConfirmed,false);
 }
 for(const id of ['ACE-001','ACE-002','ACE-004','ACE-006','ACE-008','ACE-009','ACE-010','ACE-011','ACE-017']){
  assert.ok(pending.some(x=>x.id===id),'Critério essencial ausente: '+id);
 }
});
test('Checklist humano acompanha bloqueio sem apagar referência ao sistema atual',()=>{
 const docs=fs.readFileSync(path.join(root,'CONTRATOS-ACEITE-OPERACIONAL-2026-11-18.md'),'utf8');
 for(const t of manifest.tasks)assert.ok(docs.includes(t.id),t.id+' deve estar descrito no procedimento');
 assert.match(docs,/PRESERVADA/);assert.match(docs,/MELHORADA/);assert.match(docs,/PENDENTE/);
 assert.match(docs,/Safari/);assert.match(docs,/Chrome/);
 assert.match(docs,/rollback/);
});
