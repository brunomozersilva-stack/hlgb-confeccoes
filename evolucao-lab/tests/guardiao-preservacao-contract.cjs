'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'../..'),html=fs.readFileSync(path.join(root,'evolucao-lab/guardiao-preservacao.html'),'utf8');
const parity=JSON.parse(fs.readFileSync(path.join(root,'evolucao-lab/paridade-funcional.json'),'utf8'));
const detailed=JSON.parse(fs.readFileSync(path.join(root,'evolucao-lab/paridade-critica-detalhada.json'),'utf8'));
const roadmap=JSON.parse(fs.readFileSync(path.join(root,'evolucao-lab/roadmap.json'),'utf8'));
const hom=fs.readFileSync(path.join(root,'evolucao-lab/homologacao-modulos.html'),'utf8');
const catalog=JSON.parse(hom.match(/const catalog=(\{[\s\S]*?\});\n\(function\(\)/)[1]);
const embedded=html.match(/const inventory=(\{[\s\S]*?\});\n\(function\(\)/);
if(!embedded)throw Error('Inventario estatico no guardiao nao encontrado.');
const inventory=JSON.parse(embedded[1]);
const byId=new Map(inventory.cases.map(x=>[x.id,x]));
test('guardião congela fonte de todos os 76 itens e 43 critérios sem alegar homologação',()=>{
 assert.equal(inventory.schema,'hlgb-evolucao-release-guard-inventory-v1');
 assert.deepEqual(inventory.baseline,parity.baseline);
 assert.equal(inventory.approvedForRelease,false);
 assert.equal(inventory.cases.length,76);assert.equal(inventory.scenarios.length,43);assert.equal(inventory.modules.length,19);
 assert.equal(inventory.roadmap.itemCount,266);assert.equal(inventory.roadmap.completed,0);
 assert.deepEqual(inventory.testGates,parity.testGates);
 assert.deepEqual(inventory.cases.map(x=>x.id),parity.cases.map(x=>x.id));
 assert.deepEqual(inventory.scenarios.map(x=>x.id),detailed.scenarios.map(x=>x.id));
 assert.deepEqual(inventory.modules.map(x=>x.id),roadmap.modules.map(x=>x.id));
 assert.equal(new Set(inventory.cases.map(x=>x.id)).size,76);
 assert.equal(inventory.cases.filter(x=>x.priority==='P0').length,30);
 assert.equal(inventory.scenarios.filter(x=>x.risk==='P0').length,27);
 for(const c of inventory.cases){
  const old=parity.cases.find(p=>p.id===c.id),newDemo=catalog.cases.find(p=>p.id===c.id)?.demo||null;
  assert.deepEqual({name:c.name,moduleId:c.moduleId,priority:c.priority,source:c.source,existingTest:c.existingTest},
  {name:old.name,moduleId:old.moduleId,priority:old.priority,source:old.source,existingTest:old.existingTest||null});
  assert.equal(c.demo?.path||null,newDemo?.path||null,c.id);
  assert.ok(fs.existsSync(path.join(root,c.source)),c.id+' fonte ausente '+c.source);
  if(c.existingTest)assert.ok(fs.existsSync(path.join(root,c.existingTest)),c.id+' teste antigo ausente '+c.existingTest);
  if(c.demo)assert.ok(fs.existsSync(path.join(root,'evolucao-lab',c.demo.path)),c.id+' demo ausente');
 }
 for(const sc of inventory.scenarios){
  const old=detailed.scenarios.find(x=>x.id===sc.id);
  assert.ok(byId.has(sc.caseId),'critério orfão '+sc.id);
  assert.deepEqual({name:sc.name,caseId:sc.caseId,risk:sc.risk,acceptance:sc.acceptance,mobileAcceptance:sc.mobileAcceptance},
  {name:old.name,caseId:old.parityCaseId,risk:old.risk,acceptance:old.acceptance,mobileAcceptance:old.mobileAcceptance});
 }
 assert.equal(inventory.cases.filter(x=>x.demo).length,12);
});
test('bloqueio nao depende de sucesso em demo nem de importar relatório não assinado',()=>{
 for(const phrase of ["publicationBlocked:true","releaseApproved:false","authorizedByUser:false",
  "fullParityApproved:0","'0/76'","inventory.roadmap.completed","new Set(inventory.cases.map",
  "input.productionApproval!==false","item.status==='passed'&&!byId.get(item.caseId).demo"]){
  assert.ok(html.includes(phrase),'ausente: '+phrase);
 }
 assert.match(html,/Publicação da versão nova: BLOQUEADA/);
 assert.match(html,/NÃO comprova preservação/);
 assert.match(html,/publicação/i);
 assert.match(html,/@media\(max-width:600px\)/);
 assert.match(html,/<html lang="pt-BR">/);
 assert.match(html,/role="status" aria-live="polite"/);
});
test('página isolada, sem rede, sem dados reais e JS compilável',()=>{
 const scripts=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)];
 assert.equal(scripts.length,1);assert.doesNotThrow(()=>new vm.Script(scripts[0][1],{filename:'guardiao-inline.js'}));
 for(const bad of [/\bfetch\s*\(/,/\bXMLHttpRequest\b/,/\bWebSocket\b/,/\bindexedDB\b/,
 /\blocalStorage\b/,/\bsessionStorage\b/,/\bsupabase\b/i,/\bserviceWorker\b/,
 /<script\b[^>]*\bsrc=/i,/<link\b[^>]*\bhref=/i,
 /https?:\/\//i]){
  assert.equal(bad.test(html),false,'chamada externa proibida: '+bad);
 }
});
