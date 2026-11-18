'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const source=fs.readFileSync(path.join(root,'app-stable3.html'),'utf8');
const manifest=JSON.parse(fs.readFileSync(path.join(root,'hlgb-modules/ownership-v9600.json'),'utf8'));
function extract(){
 const anchor='const moduleGroups=',start=source.indexOf(anchor);
 const end=source.indexOf(';const files=moduleGroups.flatMap(group=>group.files)',start);
 assert.ok(start>=0&&end>start,'manifesto deve continuar inline no carregador, sem nova requisição de rede');
 return JSON.parse(source.slice(start+anchor.length,end));
}
const groups=extract(),files=groups.flatMap(x=>x.files);
test('156 scripts comerciais e 2 cores puros aprovados preservam ordem exata',()=>{
 const addons=['hlgb-modules/corte/grade-modelo-v9602.js','hlgb-modules/corte/folha-grade-materiais-v9604.js'];
 assert.equal(files.length,158);assert.equal(groups.length,16);
 assert.equal(manifest.preExtractionScripts.length,156,'156 scripts anteriores preservados');
 assert.deepEqual(manifest.approvedNewScripts,addons,'somente dois scripts novos explicitamente autorizados');
 const legacy=files.filter(x=>!addons.includes(x));
 assert.deepEqual(legacy,manifest.preExtractionScripts,'ordem original e todos os 156 arquivos preservados');
 for(const a of addons)assert.equal(files.filter(x=>x===a).length,1,'sem duplicação: '+a);
 assert.equal(files.indexOf(addons[0])+1,files.indexOf('release-cutter-planner.js'));
 assert.equal(files.indexOf(addons[1])+1,files.indexOf('release-cutter-sheet-materials-v9523.js'));
 assert.deepEqual(files,manifest.releaseScripts,'carregamento corresponde exatamente ao catálogo');
 assert.equal(new Set(files).size,files.length,'sem duplicados');
 assert.deepEqual(groups.map(x=>x.id),[...new Set(groups.map(x=>x.id))]);
 for(const group of groups)assert.ok(group.id&&group.files.length>=1);
});
test('responsabilidades explícitas e exclusivas sem eliminar arquivos antigos',()=>{
 const expected=manifest.releaseScripts,owners=manifest.ownership;
 const names=Object.keys(owners),all=Object.values(owners).flat();
 assert.equal(names.length,14,'categorias aprovadas nesta etapa');
 assert.deepEqual(new Set(all),new Set(expected),'100% dos scripts têm responsável');
 assert.equal(all.length,expected.length,'nenhum script pertence a dois grupos primários');
 for(const file of expected)assert.ok(fs.existsSync(path.join(root,file)),'arquivo desapareceu: '+file);
 for(const name of names)assert.ok(Array.isArray(owners[name]));
});
test('rota, login e WAL mantêm mecanismo anterior, sem baixar manifesto nem inventar novo login',()=>{
 assert.match(source,/const appendFiles=files\.filter\(f=>f!==/);
 assert.match(source,/appendFiles\.map\(f=>'<script src="\.\/'\+f\+'\?fresh='\+ts\+'"><\\\/script>'\)/);
 assert.match(source,/const payrollGuardInBase=/);
 assert.match(source,/const earlyGuard=/);
 assert.match(source,/fetchBase9518\(attempt\)/);
 assert.match(source,/window\.HLGB_MODULE_GROUPS_9600=moduleGroups\.map/);
 assert.ok(!source.includes('fetch("./hlgb-modules/'),'Não fazer outro fetch para iniciar o programa');
});
test('módulos críticos permanecem ordenados para evitar alterações de autoridade',()=>{
 const idx=x=>files.indexOf(x);
 assert.ok(idx('release-save-transport-v9320.js')<idx('release-record-integrity.js'));
 assert.ok(idx('release-record-integrity.js')<idx('release-sync-recovery-v9301.js'));
 assert.ok(idx('release-cutter-planner.js')>idx('release-cut-model-split.js'));
 assert.ok(idx('release-wal-confirmed-replay-v9333.js')>idx('release-wal-replay-bridge-v9332.js'));
 assert.ok(idx('release-faction-feature-guard-v9598.js')===files.length-1);
});

test('11 fontes críticas: duas mudanças documentadas, todas as demais idênticas',()=>{
 const crypto=require('node:crypto');
 const critical=manifest.criticalFileBlobs||{};
 assert.equal(Object.keys(critical).length,11);
 const changes=manifest.extractionChanges||{},baseline=manifest.baselineCriticalFileBlobs||{};
 const changed=['release-cutter-planner.js','release-cutter-sheet-materials-v9523.js'];
 assert.deepEqual(Object.keys(changes).sort(),changed.sort());
 assert.deepEqual(Object.keys(baseline).sort(),Object.keys(critical).sort());
 for(const file of changed){
  assert.equal(changes[file].before,baseline[file],'SHA anterior deve ser mantido: '+file);
  assert.equal(changes[file].after,critical[file],'SHA aprovado deve ser atual: '+file);
 }
 for(const file of Object.keys(baseline)){
  if(!changed.includes(file))assert.equal(critical[file],baseline[file],'arquivo crítico não autorizado mudou: '+file);
 }
 for(const [file,sha] of Object.entries(critical)){
  const bytes=fs.readFileSync(path.join(root,file));
  const calculated=crypto.createHash('sha1').update(Buffer.from('blob '+bytes.length+'\0')).update(bytes).digest('hex');
  assert.equal(calculated,sha,'Arquivo alterado durante modularização sem aprovação: '+file);
 }
});
