'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const file=fs.readFileSync(path.join(__dirname,'../folha-homologacao.html'),'utf8');
test('folha: HTML independente com IndexedDB exclusivamente fictício e sem acesso externo',()=>{
 assert.match(file,/<!doctype html>/i);
 assert.match(file,/<html lang="pt-BR">/);
 assert.match(file,/productionApproval:false/);
 assert.match(file,/environment:'browser-only-demo'/);
 assert.match(file,/IndexedDB deste navegador/);
 assert.match(file,/@media\(max-width:490px\)/);
 assert.match(file,/:focus-visible/);
 const scripts=[...file.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)];
 assert.equal(scripts.length,1);
 assert.doesNotThrow(()=>new vm.Script(scripts[0][1],{filename:'folha-homologacao-inline.js'}));
 for(const bad of [/\bfetch\s*\(/,/\bXMLHttpRequest\b/,/\bWebSocket\b/,/\bserviceWorker\b/,
 /https?:\/\//i,/<script[^>]*\bsrc\s*=/i,/<link[^>]*\bhref\s*=/i,
 /\blocalStorage\b/,/\bsessionStorage\b/]){
  assert(!bad.test(file),'API externa proibida: '+bad);
 }
});
test('folha: passagem individual, custos somados e provisões separadas',()=>{
 for(const name of ['salary','passage','extras','discounts','preview-net','preview-passage','preview-cash',
  'metric-passage','metric-cost','metric-net','search','sector-filter','order','employee-rows','employee-cards',
  'employee-form','save','reconcile','review','refresh','reset','export-json','export-csv','revision-label','audit']){
   assert.match(file,new RegExp('id="'+name+'"'),'campo ausente '+name);
 }
 for(const source of ['const cash=e=>net(e)+e.passage','const provision=e=>Math.round(e.salary/12)+Math.round(e.salary/9)',
  "const DB_NAME='HLGB_EVOLUCAO_FOLHA_DEMO_V1'","const KEY='folha_ficticia'",
  'function reconcileSave()','async function doSave(event)','async function review()',
  'async function reset()','function exportData(kind)','getSaved()','function transaction(mutator)']){
  assert(file.includes(source),'regra ausente '+source);
 }
 assert.match(file,/current\.revision!==expected/);
 assert.match(file,/readwrite/);
 assert.match(file,/expectedRevision/);
 assert.match(file,/commandId/);
 assert.match(file,/conflict=true/);
 assert.match(file,/if\(!ev\|\|!real\|\|!same/);
});
test('folha: demonstração somente de funcionários fictícios e não usa dados antigos',()=>{
 for(const name of ['Ana Exemplo','Bianca Teste','Carlos Simulado','Daniela Modelo','Evelyn Exemplo'])
  assert(file.includes(name));
 for(const realName of ['Diego Diniz','Lara Lopes de Paula','Elaine de Oliveira Costa'])
  assert(!file.includes(realName),'nome real indevido na demonstração');
 assert.match(file,/sem conexão com o Supabase/);
 assert.match(file,/não substitui uma folha contábil/);
});
