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
test('carrega 156 scripts da main com 3 núcleos puros aprovados',()=>{
 assert.equal(files.length,159);assert.equal(groups.length,16);
 assert.equal(manifest.preExtractionScripts.length,156);
 const addons=manifest.approvedNewScripts;
 assert.deepEqual(addons,['hlgb-modules/utilidades/etiquetas-layout-v9602b.js','hlgb-modules/producao/separacao-progresso-v9603b.js','hlgb-modules/producao/corte-alvo-v9605b.js']);
 assert.deepEqual(files.filter(f=>!addons.includes(f)),manifest.preExtractionScripts,'ordem original da main intocada');
 assert.equal(files.indexOf(addons[0])+1,files.indexOf('release-label-destination-v9310.js'),'layout das etiquetas antes da função legada');
 assert.equal(files.indexOf(addons[1])+1,files.indexOf('release-separation-commit-v9319.js'),'cálculo de separação antes do salvamento legado');
 assert.equal(files.indexOf(addons[2])+1,files.indexOf('release-separation-cut-target-v9335.js'),'seleção única do corte antes do handler legado');
 assert.deepEqual(files,manifest.releaseScripts);
 assert.equal(new Set(files).size,files.length);
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

test('10 fontes críticas originais intactas; 3 alterações explícitas com SHA anterior',()=>{
 const crypto=require('node:crypto');
 const critical=manifest.criticalFileBlobs||{},baseline=manifest.baselineCriticalFileBlobs||{};
 assert.equal(Object.keys(critical).length,13);
 assert.equal(Object.keys(baseline).length,13);
 const changed=['release-label-destination-v9310.js','release-separation-commit-v9319.js','release-separation-cut-target-v9335.js'];
 assert.deepEqual(Object.keys(manifest.extractionChanges||{}),changed);
 for(const file of Object.keys(baseline)){
  if(!changed.includes(file))assert.equal(critical[file],baseline[file],'fonte original NÃO autorizada mudou: '+file);
  else{
   assert.equal(manifest.extractionChanges[file].before,baseline[file]);
   assert.equal(manifest.extractionChanges[file].after,critical[file]);
  }
 }
 for(const [file,sha] of Object.entries(critical)){
  const bytes=fs.readFileSync(path.join(root,file));
  const calculated=crypto.createHash('sha1').update(Buffer.from('blob '+bytes.length+'\0')).update(bytes).digest('hex');
  assert.equal(calculated,sha,'Arquivo crítico alterado indevidamente: '+file);
 }
});
