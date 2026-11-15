'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const file=fs.readFileSync(path.resolve(__dirname,'../central-operacional-2.html'),'utf8');
test('central operacional é independente, sem API, storage ou dados reais',()=>{
 assert.match(file,/<!doctype html>/i);
 assert.match(file,/<html lang="pt-BR">/);
 assert.match(file,/name="viewport"/);
 assert.match(file,/Dados fictícios|dados simulados/i);
 const banned=[/\bfetch\s*\(/,/\bXMLHttpRequest\b/,/\bWebSocket\b/,
  /\bindexedDB\b/,/\blocalStorage\b/,/\bsessionStorage\b/,/\bsupabase\b/i,
  /<script\b[^>]*\bsrc\s*=/i,/<link\b[^>]*\bhref\s*=/i,
  /\bauth\.uid\s*\(/,/\bindexedDB\.open\s*\(/,/\bwindow\.open\s*\(/,
  /https?:\/\//i];
 for(const pattern of banned)assert.equal(pattern.test(file),false,'Acesso proibido: '+pattern);
 const scripts=[...file.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)];
 assert.equal(scripts.length,1,'sem scripts externos');
 assert.doesNotThrow(()=>new vm.Script(scripts[0][1]));
});
test('as quatro áreas têm UI, busca e ações realmente ligadas a eventos',()=>{
 for(const name of ['overview','acertos','faccoes','hub']){
  assert.match(file,new RegExp('data-section="'+name+'"'));
  assert.match(file,new RegExp('data-view="'+name+'"'));
 }
 for(const id of ['acerto-search','acerto-status','acerto-order','acertos-body',
  'acertos-mobile','bulk-pay','edit-qty','edit-price','edit-discount',
  'edit-extra','edit-faction','edit-reason','hub-body','hub-mobile',
  'hub-search','hub-export','hub-evidence','route-list','record-dialog','pay-dialog']){
  assert.ok(file.includes('id="'+id+'"'),'Campo ausente: '+id);
 }
 assert.match(file,/addEventListener\('submit',saveRecord\)/);
 assert.match(file,/addEventListener\('click',confirmPay\)/);
 assert.match(file,/addEventListener\('click',exportCsv\)/);
 assert.match(file,/addEventListener\('click',exportEvidence\)/);
 assert.match(file,/schema:'hlgb-evolucao-teste-operacional-v1'/);
 assert.match(file,/productionApproval:false/);
 assert.match(file,/\.status!=='Pendente'/);
 assert.match(file,/used\.has\(x\.source\)/);
});
test('versão mobile, navegação acessível e cálculos monetários controlados',()=>{
 assert.match(file,/@media\(max-width:670px\)/);
 assert.match(file,/@media\(max-width:350px\)/);
 assert.match(file,/aria-live="polite"/);
 assert.match(file,/<dialog id="record-dialog"/);
 assert.match(file,/<dialog id="pay-dialog"/);
 assert.match(file,/:focus-visible/);
 assert.match(file,/Number\.isSafeInteger\(total\)/);
 assert.match(file,/discount>price/);
 assert.match(file,/qty\*\(price-discount\)\+extra/);
});
