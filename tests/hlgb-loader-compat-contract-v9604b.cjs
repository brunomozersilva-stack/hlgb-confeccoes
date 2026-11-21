'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const loader=require('./hlgb-loader-compat-view-v9604b.cjs');
const quote=require('./hlgb-loader-test-view-v9600.cjs');
const catalog=require('../hlgb-modules/ownership-v9600.json');
const original=fs.readFileSync(path.join(root,'app-stable3.html'),'utf8');
function mutateGroups(transform){
 const anchor='const moduleGroups=',i=original.indexOf(anchor);
 const j=original.indexOf(';const files=moduleGroups.flatMap(group=>group.files)',i);
 assert.ok(i>=0&&j>i);
 const groups=JSON.parse(original.slice(i+anchor.length,j));
 transform(groups);
 return original.slice(0,i+anchor.length)+JSON.stringify(groups)+original.slice(j);
}
test('vista histórica é derivada do loader REAL sem encobrir autenticação ou scripts',()=>{
 const view=loader(original);
 assert.ok(view.startsWith(original),'todo o HTML original deve ficar intacto');
 assert.equal(view.slice(original.length).trim(),('/* TEST-ONLY: derived legacy quoted script view */\n'+quote(original)).trim());
 assert.deepEqual(quote.scripts(original),catalog.releaseScripts);
 for(const file of catalog.preExtractionScripts||catalog.releaseScripts){
  assert.ok(view.includes("'"+file+"'"),'não perder script comercial original: '+file);
 }
 assert.equal(view.includes("'release-assistant-server-v9266.js'"),false,'não inventar módulo pago desabilitado');
 assert.ok(view.includes('window.HLGB_HUB_MASTER_9258=true'),'preserva HTML bruto para testes de segurança');
});
test('rejeita script comercial ausente, duplicado ou em outra ordem (falha fechada)',()=>{
 const removed=mutateGroups(groups=>groups[0].files.shift());
 assert.throws(()=>loader(removed),'ausência deve falhar');
 const dup=mutateGroups(groups=>groups[0].files.push(groups[0].files[0]));
 assert.throws(()=>loader(dup),'duplicidade deve falhar');
 const swapped=mutateGroups(groups=>{const a=groups[0].files;[a[0],a[1]]=[a[1],a[0]]});
 assert.throws(()=>loader(swapped),'reordenação deve falhar');
});
test('código de teste não modifica carregador em disco nem importa dados de negócio',()=>{
 const before=fs.readFileSync(path.join(root,'app-stable3.html'));
 const view=loader(before.toString('utf8'));
 assert.ok(view.length>before.length);
 assert.deepEqual(fs.readFileSync(path.join(root,'app-stable3.html')),before);
 const code=fs.readFileSync(path.join(root,'tests/hlgb-loader-compat-view-v9604b.cjs'),'utf8');
 assert.doesNotMatch(code,/\b(?:writeFile|unlink|cloudRequest|indexedDB|fetch)\s*\(/);
});
