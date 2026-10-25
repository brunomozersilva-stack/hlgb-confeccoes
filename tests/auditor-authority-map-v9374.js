const fs=require('fs');
const vm=require('vm');
const assert=require('assert');
const src=fs.readFileSync('release-auditor-authority-map-v9374.js','utf8');
assert(!src.includes('setInterval('),'mapa de autoridades não pode criar intervalos');
assert(!src.includes('MutationObserver'),'mapa de autoridades não pode criar MutationObserver');
assert(!src.includes('slice(0,-1)'),'não pode inferir aposentadoria pela ordem de versões');
const scripts=[
 'release-hub-master-v9258.js','release-hub-primary-v9323.js','release-hub-delivery-v9324.js','release-hub-delivery-v9324.js',
 'release-save-actions-v9322.js',
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
 performance:{getEntriesByType:()=>scripts.map((name,i)=>({name:'https://example.test/'+name,startTime:i,duration:1}))},
 document:{
  querySelectorAll:(sel)=>sel==='script[src]'?scripts.map(name=>({src:'https://example.test/'+name})):[],
  querySelector:()=>null,getElementById:()=>null,addEventListener:()=>{},createElement:()=>({style:{},appendChild:()=>{},removeAttribute:()=>{}})
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
assert(report.scriptInventory.duplicates.some(x=>x.file==='release-hub-delivery-v9324.js'),'multiplicidade de script precisa ser preservada');
const prod=report.families.find(x=>x.id==='production');
assert(prod.filenameVersionHints.includes('93.78')&&prod.filenameVersionHints.includes('93.80')&&prod.filenameVersionHints.includes('93.91'),'pistas de nome devem continuar visíveis');
assert.strictEqual(report.retirementPlan.length,0,'não pode haver aposentadoria inferida por versão');
assert(report.consolidationPlan.some(x=>x.id==='hub-save'&&x.conflict),'conflito declarado de autoridade do Hub deve ser apontado');
const sync=report.families.find(x=>x.id==='sync');
assert.strictEqual(sync.status,'fail','ciclo de wrapper precisa gerar falha');
const authorityVersion=String(sandbox.hlgbAuditorAuthority9374.version||'');
assert(/^\d+\.\d+$/.test(authorityVersion),'mapa de autoridades precisa expor uma versão numérica');
assert(Number(authorityVersion)>=93.74,'mapa de autoridades não pode regredir abaixo da versão-base 93.74');
console.log('auditor authority map evidence-based: OK · versão '+authorityVersion);
