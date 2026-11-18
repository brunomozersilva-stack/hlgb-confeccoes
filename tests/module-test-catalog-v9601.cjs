'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process');
const root=path.resolve(__dirname,'..');
const cat=require('../hlgb-modules/module-test-catalog-v9601.json');
const owner=require('../hlgb-modules/ownership-v9600.json').ownership;
test('Catálogo: oito áreas, 40 provas reais, caminhos restritos a tests/',()=>{
 assert.equal(Object.keys(cat.packs).length,8);
 let count=0;
 for(const [area,files] of Object.entries(cat.packs)){
  assert.ok(Object.hasOwn(owner,area),'área sem responsável: '+area);
  assert.ok(files.length>=3,'área com provas insuficientes: '+area);
  assert.equal(new Set(files).size,files.length,'duplicadas: '+area);
  for(const f of files){
   assert.match(f,/^tests\/[a-z0-9-]+\.cjs$/);
   assert.ok(fs.existsSync(path.join(root,f)),f);
   count++;
  }
 }
 assert.equal(count,40);
});
test('Risco: correção em Cortador implica teste de WAL, monólito obriga regressão total',()=>{
 assert.ok(cat.dependencies['corte-cortadores'].includes('sincronizacao-wal'));
 assert.ok(cat.dependencies['faccoes-acertos'].includes('financeiro-hub-notas'));
 const command=(...args)=>cp.spawnSync(process.execPath,['hlgb-modules/run-module-tests-v9601.cjs',...args],{cwd:root,encoding:'utf8'});
 const a=command('--impact','release-cutter-planner.js');
 assert.equal(a.status,0);assert.deepEqual(JSON.parse(a.stdout),{highRisk:false,packs:['corte-cortadores','sincronizacao-wal']});
 const b=command('--impact','app9240.html');
 assert.equal(b.status,0);assert.equal(JSON.parse(b.stdout).highRisk,true);
 assert.equal(JSON.parse(b.stdout).packs.length,8);
 const c=command('--impact','release-faction-manual-payment-v9566.js');
 assert.equal(c.status,0);
 for(const s of ['faccoes-acertos','financeiro-hub-notas','sincronizacao-wal'])assert.ok(JSON.parse(c.stdout).packs.includes(s));
});
test('Runner rejeita módulo desconhecido, sem executar shell ou rede',()=>{
 const command=cp.spawnSync(process.execPath,['hlgb-modules/run-module-tests-v9601.cjs','falso'],{cwd:root,encoding:'utf8'});
 assert.equal(command.status,2);
 const runner=fs.readFileSync(path.join(root,'hlgb-modules/run-module-tests-v9601.cjs'),'utf8');
 assert.match(runner,/cp\.spawnSync\(process\.execPath/);
 assert.ok(!runner.includes('child_process.exec('));
 assert.ok(!runner.includes('fetch('));
});
