'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..'),html=fs.readFileSync(path.join(root,'homologacao-modulos.html'),'utf8');
const previous=JSON.parse(fs.readFileSync(path.join(root,'paridade-funcional.json'),'utf8'));
const detailed=JSON.parse(fs.readFileSync(path.join(root,'paridade-critica-detalhada.json'),'utf8'));
const master=JSON.parse(fs.readFileSync(path.join(root,'roadmap.json'),'utf8'));
const re=/const catalog=(\{[\s\S]*?\});\n\(function\(\)/;
const match=html.match(re);if(!match)throw Error('catálogo HTML não identificado');
const catalog=JSON.parse(match[1]);
test('central de homologação cobre 76 funções, 19 módulos, 43 critérios e 266 do plano',()=>{
 assert.equal(catalog.cases.length,76);assert.equal(catalog.modules.length,19);
 assert.equal(catalog.scenarios.length,43);
 assert.equal(catalog.roadmap.reduce((sum,x)=>sum+x.items,0),266);
 const expected=previous.cases.map(x=>x.id);
 assert.deepEqual(catalog.cases.map(x=>x.id),expected);
 assert.deepEqual(catalog.modules.map(x=>x.id),master.modules.map(x=>x.id));
 assert.deepEqual(catalog.scenarios.map(x=>x.id),detailed.scenarios.map(x=>x.id));
 assert.ok(catalog.cases.every(x=>x.source&&x.priority&&x.moduleId&&!x.status));
 assert.ok(catalog.scenarios.every(x=>expected.includes(x.caseId)));
 assert.equal(catalog.inventoryBaseline,master.baseline);
});
test('demonstrações são explicitamente parciais e referências existem localmente',()=>{
 const available=catalog.cases.filter(x=>x.demo);
 assert.equal(available.length,41);
 assert.ok(available.every(x=>master.modules.some(m=>m.id===x.moduleId)));
 for(const x of catalog.cases){
  assert.ok(fs.existsSync(path.resolve(root,'../'+x.source)),'legado sem fonte '+x.source);
  if(x.existingTest)assert.ok(fs.existsSync(path.resolve(root,'../'+x.existingTest)),'teste de referência ausente '+x.existingTest);
  if(x.demo){
   assert.match(x.demo.scope,/sem |não |simula|fictíci|ilustrativ|local|parcial/i,x.id);
   assert.ok(x.demo.steps.length>=3,x.id);
   assert.ok(x.demo.expected.length>35,x.id);
   assert.ok(/^[\w-]+\.html$/.test(x.demo.path),x.id);
   assert.ok(fs.existsSync(path.join(root,x.demo.path)),x.id);
  }
 }
});
test('nenhum fluxo de homologação utiliza banco, storage, HTTP ou dados operacionais',()=>{
 assert.match(html,/<!doctype html>/);
 assert.match(html,/<html lang="pt-BR">/);
 assert.match(html,/@media\(max-width:390px\)/);
 assert.match(html,/aria-live="polite"/);
 assert.match(html,/rel='noopener noreferrer'/);
 assert.match(html,/productionApproval:false/);
 const scripts=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)];
 assert.equal(scripts.length,1);
 assert.doesNotThrow(()=>new vm.Script(scripts[0][1]));
 for(const re of [/\bfetch\s*\(/,/\bXMLHttpRequest\b/,/\bWebSocket\b/,/\bindexedDB\b/,
 /\blocalStorage\b/,/\bsessionStorage\b/,/\bsupabase\b/i,/\bserviceWorker\b/,
 /<script\b[^>]*\bsrc=/i,/<link\b[^>]*\bhref=/i,/\bauth\.uid\(/,
 /https?:\/\//i]){
  assert.equal(re.test(html),false,'API externa na prévia '+re);
 }
});
test('a revisão pode ser exportada e importada com validação de 76 identificadores',()=>{
 for(const marker of ['hlgb-homologacao-relatorio-v1','Object.hasOwn(labels,item.status)',
 'ids.has(item.caseId)','catalog.cases.length','item.status===\'passed\'&&!byId.get(item.caseId).demo',
 'URL.createObjectURL(blob)','reader.readAsText(file)','productionApproval:false']){
  assert.ok(html.includes(marker),'mecanismo ausente: '+marker);
 }
});
