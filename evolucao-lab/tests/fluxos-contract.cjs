'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(root,'fluxos-operacionais.html'),'utf8');
const contracts=JSON.parse(fs.readFileSync(path.join(root,'contratos-modulares.json'),'utf8'));
const roadmap=JSON.parse(fs.readFileSync(path.join(root,'roadmap.json'),'utf8'));
const overview=fs.readFileSync(path.join(root,'prototipo.html'),'utf8');

test('contrato: 19 módulos declarados, sem ativação real, com sete portões de homologação',()=>{
 const ids=roadmap.modules.map(x=>x.id).sort();
 assert.deepEqual(contracts.modules.map(x=>x.id).sort(),ids);
 assert.deepEqual(contracts.gates.map(x=>x.id),['G0','G1','G2','G3','G4','G5','G6']);
 assert.equal(contracts.implementation,false);
 assert.equal(contracts.appliesToProduction,false);
 assert.equal(contracts.databaseAccess,false);
 for(const module of contracts.modules){
  assert.equal(module.implementation,'planned');
  assert.equal(module.toggleImplemented,false);
  assert.equal(module.authorityVerified,false);
  assert.equal(module.mobileContract,'touch_first_responsive_accessible');
 }
 for(const critical of ['nucleo','autenticacao']){
  assert.equal(contracts.modules.find(x=>x.id===critical).flagPolicy,'always_on');
 }
 for(const admin of ['bot','auditor']){
  assert.ok(!contracts.modules.find(x=>x.id===admin).operations.some(x=>/commit|save|update|delete|payroll.change/.test(x)));
 }
 assert.equal(contracts.commands.saveRules.replayOnTimeout,'never_without_reconciliation');
 assert.equal(contracts.commands.saveRules.atomic,true);
 assert.equal(contracts.commands.saveRules.auditTrail,true);
});

test('protótipo operacional: sem Supabase, rede, storage, APIs de gravação ou scripts remotos',()=>{
 assert.match(html,/<!doctype html>/i);
 assert.match(html,/<html lang="pt-BR">/);
 assert.match(html,/name="viewport"/);
 const forbidden=[
  /\bfetch\s*\(/,/\bXMLHttpRequest\b/,/\bWebSocket\b/,/\bEventSource\b/,
  /\blocalStorage\s*\./,/\bsessionStorage\s*\./,/\bindexedDB\b/,
  /\bdocument\.cookie\b/,/\bcloudRequest\s*\(/,/\bhlgbRecordSaveWithRetry\b/,
  /\bsupabase\b/i,/<script\b[^>]*\bsrc\s*=/i,/<link\b[^>]*\bhref\s*=/i,
  /https?:\/\/[^"'\s<]+/i,
 ];
 for(const re of forbidden)assert.equal(re.test(html),false,'elemento proibido: '+re);
 const js=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)];
 assert.equal(js.length,1,'deve existir um único script standalone');
 assert.doesNotThrow(()=>new vm.Script(js[0][1],{filename:'fluxos-operacionais.js'}));
 assert.match(html,/disabled>Salvar \(bloqueado\)/);
 assert.match(html,/nenhuma operação é salva/i);
 assert.match(overview,/href="\.\/fluxos-operacionais\.html"/);
});

test('fluxos: busca, acerto e relatório integrados apenas a amostras artificiais',()=>{
 for(const id of ['search','settlement','reports']){
  assert.match(html,new RegExp('data-view="'+id+'"'));
  assert.match(html,new RegExp('data-tab="'+id+'"'));
  assert.match(html,new RegExp('role="tabpanel"'));
 }
 for(const id of ['product-results','search-input','settlement-lines','settlement-gross','settlement-total','report-lines','report-trace','report-qty']){
  assert.match(html,new RegExp('id="'+id+'"'));
 }
 assert.match(html,/Facção Exemplo A/);
 assert.match(html,/Modelo A/);
 assert.match(html,/SIM-C001/);
 assert.match(html,/aria-live="polite"/);
 assert.match(html,/role="status"/);
 assert.match(html,/@media\(max-width:580px\)/);
 assert.match(html,/@media\(max-width:850px\)/);
 assert.match(html,/overflow-x:auto/);
 assert.match(html,/:focus-visible/);
 assert.match(html,/moneyCents/);
});
