'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const loader=fs.readFileSync('app-stable3.html','utf8');
const manifest=require('../hlgb-modules/ownership-v9600.json');
const start=loader.indexOf('const payrollGuardInBase='),end=loader.indexOf('/* P0: protecao inline',start);
assert.ok(start>=0&&end>start,'o teste deve usar o filtro real do loader comercial');
const logic=loader.slice(start,end);
const apply=(h,files)=>new Function('h','files',logic+'\nreturn {appendFiles,printer3dPersistenceInBase,payrollGuardInBase};')(h,files);
const threeD='release-printer3d-persistence-v9431.js',payroll='release-payroll-reliable-save-guard-v9344.js';
test('manter os 158 scripts originais e o arquivo 3D na ordem do manifesto',()=>{
 assert.equal(manifest.preExtractionScripts.length,158);
 const files=manifest.releaseScripts;
 assert.deepEqual(files.filter(x=>!manifest.approvedNewScripts.includes(x)),manifest.preExtractionScripts);
 assert.equal(files.filter(x=>x===threeD).length,1);
 assert.equal(new Set(files).size,files.length);
 assert.doesNotMatch(logic,/removeChild|\.remove\(|indexedDB|localStorage|cloudRequest|hlgbRecordSaveWithRetry/);
});
test('se base já carrega persistência 3D, não inserir segunda tag',()=>{
 const h='<html><head><script defer src="./release-printer3d-persistence-v9431.js?fresh=22"></script></head></html>';
 const files=manifest.releaseScripts;
 const r=apply(h,files);
 assert.equal(r.printer3dPersistenceInBase,true);
 assert.equal(r.appendFiles.includes(threeD),false);
 assert.equal(r.appendFiles.length,files.length-1);
 assert.deepEqual(r.appendFiles,files.filter(x=>x!==threeD));
});
test('quando a base não carrega 3D, o loader continua carregando uma vez',()=>{
 const files=manifest.releaseScripts,h='<html><head><script src="release-other.js"></script></head></html>';
 const r=apply(h,files);
 assert.equal(r.printer3dPersistenceInBase,false);
 assert.deepEqual(r.appendFiles,files);
 assert.equal(r.appendFiles.filter(x=>x===threeD).length,1);
});
test('menção a nome de arquivo fora de script não impede o carregamento',()=>{
 const r=apply('<p>Erro: release-printer3d-persistence-v9431.js</p>',[threeD]);
 assert.deepEqual(r.appendFiles,[threeD]);
});
test('guarda de folha original e guarda 3D funcionam juntas',()=>{
 const h='<script src="/app/release-payroll-reliable-save-guard-v9344.js"></script>'+
  "<script type='text/javascript' src='./release-printer3d-persistence-v9431.js?fresh=9'></script>";
 const r=apply(h,manifest.releaseScripts);
 assert.equal(r.payrollGuardInBase,true);
 assert.equal(r.printer3dPersistenceInBase,true);
 assert.equal(r.appendFiles.includes(threeD),false);
 assert.equal(r.appendFiles.includes(payroll),false);
 assert.deepEqual(r.appendFiles,manifest.releaseScripts.filter(x=>x!==threeD&&x!==payroll));
});
test('três variantes de URL e atributos preservam dedupe sem remover scripts',()=>{
 for(const h of [
  '<script SRC="https://hlgb.example/release-printer3d-persistence-v9431.js?fresh=9"></script>',
  '<script data-loader="app" src="/a/release-printer3d-persistence-v9431.js"></script>',
  "<SCRIPT async SRC='./release-printer3d-persistence-v9431.js?x=1'>"
 ]){
  const r=apply(h,[threeD,'release-printer3d-cloud-hydration-v9517.js']);
  assert.deepEqual(r.appendFiles,['release-printer3d-cloud-hydration-v9517.js']);
 }
});
