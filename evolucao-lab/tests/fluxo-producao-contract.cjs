'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const html=fs.readFileSync(path.resolve(__dirname,'../fluxo-producao-integrado.html'),'utf8');
test('fluxo isolado sem rede ou persistencia',()=>{
 assert.match(html,/<!doctype html>/i);assert.match(html,/<html lang="pt-BR">/);
 const forbidden=[/<script\b[^>]*src\s*=/i,/<link\b[^>]*href\s*=/i,/\bfetch\s*\(/,/\bWebSocket\b/,
 /\bXMLHttpRequest\b/,/\bindexedDB\b/,/\blocalStorage\b/,/\bsessionStorage\b/,/\bdocument\.cookie\b/,
 /https?:\/\//i,/\bsupabase\b/i,/\bserviceWorker\b/];
 for(const r of forbidden)assert.equal(r.test(html),false,'external reference '+r);
 const scripts=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)];
 assert.equal(scripts.length,1);assert.doesNotThrow(()=>new vm.Script(scripts[0][1]));
});
test('fluxo encadeado e conferencias de integridade por variante',()=>{
 for(const stage of ['orders','cut','send','return','separate','audit'])
  assert.match(html,new RegExp('data-stage="'+stage+'"'));
 for(const id of ['grade-body','grade-mobile','movement-dialog','movement-qty','movement-operator',
 'metric-ordered','metric-cut','metric-sent','metric-returned','metric-separated','audit-list',
 'download-evidence','export-data','reset-data','results-count','search-order','filter-progress'])
  assert.match(html,new RegExp('id="'+id+'"'),'missing '+id);
 for(const feature of ['function validateMove','function validLine','function commitMove','function exportEvidence',
 'operacoesUnicas','linhasSemPerda','gradeConsistente','movimentosEmUnidadesInteiras',
 'line.revision!==pending.lineRevision'])
  assert.ok(html.includes(feature),'missing '+feature);
 assert.match(html,/@media\(max-width:600px\)/);assert.match(html,/aria-live="polite"/);assert.match(html,/:focus-visible/);
});
test('exemplos sinteticos e invariantes do fluxo',()=>{
 assert.match(html,/PD-100/);assert.match(html,/Camisola Melina/);assert.match(html,/Camisola Leidiane/);
 assert.match(html,/Roseli Demo/);assert.match(html,/fictitious:true/);assert.match(html,/productionApproval:false/);
 assert.match(html,/environment:'offline-demo'/);
 assert.match(html,/line.separated<=line.returned&&line.returned<=line.sent&&line.sent<=line.cut&&line.cut<=line.ordered/);
});
