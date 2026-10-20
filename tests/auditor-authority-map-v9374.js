const fs=require('fs');
const vm=require('vm');
const assert=require('assert');
const src=fs.readFileSync('release-auditor-authority-map-v9374.js','utf8');
assert(!src.includes('setInterval('),'mapa de autoridades não pode criar intervalos');
assert(!src.includes('MutationObserver'),'mapa de autoridades não pode criar MutationObserver');
const scripts=[
 'release-hub-master-v9258.js','release-hub-primary-v9323.js','release-hub-delivery-v9324.js',
 'release-production-operations-v9378-preview.js','release-production-operations-v9380-preview-patch.js','release-production-writeoff-integrity-v9391.js',
 'release-save-transport-v9320.js','release-wal-confirmed-replay-v9333.js','release-sync-guard-v9306.js'
];
const save=function saveRecord(){}; save.__original=save;
const cloud=function cloudRequest(){};
const open=function openAuditor(){};
const full=async()=>({id:'x'});
const original={save,cloud,open,full};
const sandbox={
 console,URL,setTimeout:(fn)=>{fn();return 1},location:{href:'https://example.test/app-stable3.html'},
 performance:{getEntriesByType:()=>scripts.map(name=>({name:'https://example.test/'+name}))},
 document:{
  querySelectorAll:(sel)=>sel==='script[src]'?scripts.map(name=>({src:'https://example.test/'+name})):[],
  querySelector:()=>null,getElementById:()=>null,addEventListener:()=>{},createElement:()=>({style:{},appendChild:()=>{}})
 },
 hlgbRecordSaveWithRetry:save,cloudRequest:cloud,openHlgbAuditor:open,hlgbAuditorRunFull:full,
 HLGB_RELEASE_VERSION:'93.72'
};
sandbox.window=sandbox;
vm.createContext(sandbox);vm.runInContext(src,sandbox);
assert.strictEqual(sandbox.hlgbRecordSaveWithRetry,original.save,'Auditor não pode trocar save');
assert.strictEqual(sandbox.cloudRequest,original.cloud,'Auditor não pode trocar cloudRequest');
assert.strictEqual(sandbox.openHlgbAuditor,original.open,'Auditor não pode trocar abertura');
assert.strictEqual(sandbox.hlgbAuditorRunFull,original.full,'Auditor não pode envolver execução base');
const report=sandbox.hlgbAuditorAuthority9374.scan();
assert.strictEqual(report.kind,'hlgb_authority_map');
const prod=report.families.find(x=>x.id==='production');
assert(prod.versions.includes('93.78')&&prod.versions.includes('93.80')&&prod.versions.includes('93.91'),'versões de produção não mapeadas');
assert.strictEqual(prod.status,'warn','coexistência de três gerações deve gerar atenção');
const sync=report.families.find(x=>x.id==='sync');
assert.strictEqual(sync.status,'fail','ciclo de wrapper precisa gerar falha');
assert(report.retirementPlan.some(x=>x.family==='hub'),'plano de consolidação do Hub ausente');
assert.strictEqual(sandbox.hlgbAuditorAuthority9374.version,'93.74');
console.log('auditor authority map v93.74: OK');
