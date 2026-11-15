'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'../planejador-materiais.html'),'utf8');
test('planejador: HTML independente, offline e sem gravacao em produção',()=>{
 assert.match(html,/<!doctype html>/i);assert.match(html,/<html lang="pt-BR">/);
 const forbidden=[/<script\b[^>]*\bsrc\s*=/i,/<link\b[^>]*\bhref\s*=/i,/\bfetch\s*\(/,
 /\bWebSocket\b/,/\bXMLHttpRequest\b/,/\blocalStorage\b/,/\bsessionStorage\b/,/\bindexedDB\b/,
 /\bdocument\.cookie\b/,/\bsupabase\b/i,/\bserviceWorker\b/,/https?:\/\//i];
 for(const re of forbidden)assert.equal(re.test(html),false,'recurso externo proibido: '+re);
 const scripts=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)];
 assert.equal(scripts.length,1);assert.doesNotThrow(()=>new vm.Script(scripts[0][1],{filename:'planejador-inline.js'}));
});
test('planejador: montagem, fichas, materiais, estoque e exportacoes',()=>{
 for(const tab of ['plan','models','bom','materials'])assert.match(html,new RegExp('data-tab="'+tab+'"'));
 for(const id of ['plan-form','plan-model','plan-size','plan-qty','plan-rows','plan-cards',
 'purchase-rows','purchase-cards','purchase-summary','model-breakdown','bom-form','bom-overview',
 'bom-model','bom-size','bom-material','bom-qty','material-id','material-price','material-stock',
 'material-waste','material-pack','materials-form','download-json','download-csv','reset-demo']){
  assert.match(html,new RegExp('id="'+id+'"'),'falta campo '+id);
 }
 for(const fn of ['function compute()','function addPlan(','function changeQty(','function updateBom(',
  'function updateMaterial(','function exportCsv(','function exportJson(','function report(','function ceilDiv('])
 assert.ok(html.includes(fn),'falta regra '+fn);
 assert.match(html,/@media\(max-width:590px\)/);assert.match(html,/:focus-visible/);
});
test('planejador: arredondamento, rateio e limites de seguranca declarados',()=>{
 for(const phrase of ['ceilDiv(m.shortage,m.pack)','modelCostsMatchConsolidated','materialCostsMatchModels',
 'purchasesCoverShortages','totalNeededMatchesModels','initialPlan','defaultBom','baseMaterials',
 'savedToDatabase:false','productionApproval:false','fictitious:true','environment:\x27offline-demo\x27']){
 assert.ok(html.includes(phrase),'sem validacao '+phrase);
 }
 assert.match(html,/new Set\(plan\.map/);
 assert.match(html,/textContent/);
 assert.match(html,/100000/);
});
