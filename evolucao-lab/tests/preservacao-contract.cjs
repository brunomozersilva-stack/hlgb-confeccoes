'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const appRoot=path.resolve(root,'..');
const manifest=JSON.parse(fs.readFileSync(path.join(root,'paridade-funcional.json'),'utf8'));
const page=fs.readFileSync(path.join(root,'preservacao.html'),'utf8');
const overview=fs.readFileSync(path.join(root,'prototipo.html'),'utf8');
const roadmap=JSON.parse(fs.readFileSync(path.join(root,'roadmap.json'),'utf8'));

test('76 funções, 19 módulos, preservação sem remoções aprovadas',()=>{
 assert.equal(manifest.cases.length,76);
 assert.equal(manifest.baseline.sha,'2440621468d8c4d8260effe32ea47eef478077c4');
 assert.equal(manifest.requiresExplicitApprovalForRemoval,true);
 const ids=new Set(roadmap.modules.map(m=>m.id));
 const unique=new Set();
 for(const c of manifest.cases){
  assert.ok(ids.has(c.moduleId),c.id+' sem módulo');
  assert.ok(!unique.has(c.id),'id duplicado: '+c.id);unique.add(c.id);
  assert.equal(c.parity,'nao_verificada');
  assert.equal(c.mobile,'nao_homologado');
  assert.equal(c.approvedForRemoval,false);
  assert.equal(c.decision,'preservar_e_melhorar');
  assert.equal(c.evidenceLevel,'codigo_referenciado_nao_homologado');
  assert.ok(fs.existsSync(path.join(appRoot,c.source)),'source ausente '+c.id+' '+c.source);
  if(c.existingTest)assert.ok(fs.existsSync(path.join(appRoot,c.existingTest)),'teste ausente '+c.id+' '+c.existingTest);
 }
 assert.equal(new Set(manifest.cases.map(c=>c.moduleId)).size,19);
 assert.equal(manifest.testGates.length,8);
});

test('interface de preservação fica isolada, sem rede nem armazenamento persistente',()=>{
 for(const re of [/\bfetch\s*\(/,/\bXMLHttpRequest\b/,/\bWebSocket\b/,/\bEventSource\b/,/\bindexedDB\b/,/\blocalStorage\b/,/\bsessionStorage\b/,/\bcloudRequest\b/,/\bsupabase\b/i,/<script\b[^>]*\bsrc\s*=/i,/<link\b[^>]*\bhref\s*=/i,/\bwindow\s*\.\s*open\s*\(/])
  assert.equal(re.test(page),false,'acesso proibido no protótipo: '+re);
 const js=[...page.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)];
 assert.equal(js.length,1);
 assert.doesNotThrow(()=>new vm.Script(js[0][1],{filename:'preservacao.js'}));
 assert.match(page,/<html lang="pt-BR">/);
 assert.match(page,/@media\(max-width:680px\)/);
 assert.match(page,/@media\(max-width:360px\)/);
 assert.match(page,/:focus-visible/);
 assert.match(page,/aria-live="polite"/);
 assert.match(page,/Nenhuma informação é salva ou enviada/);
 assert.match(page,/Sem homologação/);
 assert.match(overview,/href="\.\/preservacao\.html"/);
});

test('página embute os mesmos casos que o inventário da branch',()=>{
 const match=page.match(/const records=(\[[\s\S]*?\]);\nconst modules=/);
 assert.ok(match,'dados embutidos não encontrados');
 const cases=JSON.parse(match[1]);
 assert.equal(cases.length,manifest.cases.length);
 for(let i=0;i<cases.length;i++){
  const x=cases[i],m=manifest.cases[i];
  for(const key of ['id','moduleId','name','priority','source','existingTest'])
   assert.deepEqual(x[key],m[key],m.id+' diverge em '+key);
 }
});
