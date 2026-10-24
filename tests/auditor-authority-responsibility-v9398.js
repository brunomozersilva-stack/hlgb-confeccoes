const fs=require('fs'),vm=require('vm'),assert=require('assert');
const src=fs.readFileSync('release-auditor-authority-map-v9374.js','utf8');
assert(src.includes("HLGB-AUDITOR-AUTHORITY-93.98"),'build Authority v93.98 ausente');
const files=[
 'release-save-transport-v9320.js',
 'release-sync-guard-v9306.js',
 'release-payroll-month-wal-v9334.js',
 'release-payroll-snapshot-watch-v9354.js',
 'release-payroll-reliable-save-guard-v9344.js',
 'release-payroll-wal-race-v9346.js'
];
const scripts=files.map((f,i)=>({src:'https://example.test/'+f+'?fresh='+i}));
const resources=[...scripts.map((s,i)=>({name:s.src,startTime:i+1,duration:1})),{name:'https://example.test/release-auditor-build-marker-v9396.js?hlgb_audit_fresh=123',startTime:99,duration:1}];
const document={
 querySelectorAll:sel=>sel==='script[src]'?scripts:[],
 querySelector:()=>null,
 getElementById:()=>null,
 addEventListener:()=>{},
 createElement:()=>({style:{},addEventListener(){},remove(){}}),
 body:{appendChild(){}},documentElement:{appendChild(){}},head:{appendChild(){}}
};
const ctx={console,Date,JSON,Math,Promise,Map,Set,URL,Blob:function(){},location:{href:'https://example.test/app-stable3.html'},performance:{getEntriesByType:t=>t==='resource'?resources:[]},document,setTimeout:()=>0,clearTimeout:()=>{}};
ctx.window=ctx;
ctx.HLGB_SYNC_GUARD_9306='93.06';
ctx.HLGB_PAYROLL_WAL_RACE_9346='93.56';
vm.createContext(ctx);vm.runInContext(src,ctx,{filename:'release-auditor-authority-map-v9374.js'});
const api=ctx.hlgbAuditorAuthority9374;assert(api,'API Authority ausente');
const inv=api.loadedScriptInventory();
assert.strictEqual(inv.duplicates.length,0,'freshness probe ou DOM+resource foi contado como duplicidade de execução');
const transport=api.responsibilityState('record-transport',inv);
const production=api.responsibilityState('production-save-guard',inv);
const payroll=api.responsibilityState('payroll-save',inv);
assert.strictEqual(transport.authorityConfirmed,true,'transporte base não reconhecido como autoridade');
assert.strictEqual(transport.conflict,false,'transporte base criou conflito falso');
assert.strictEqual(production.authorityConfirmed,true,'Sync Guard não reconhecido como autoridade de Produção');
assert.strictEqual(production.conflict,false,'Sync Guard criou conflito falso');
assert.strictEqual(payroll.authorityConfirmed,true,'v93.56 não reconhecida como autoridade final da folha');
assert.strictEqual(payroll.conflict,false,'arquivos delegados da folha criaram conflito falso');
assert.deepStrictEqual(Array.from(payroll.supersededPresent).sort(),[
 'release-payroll-month-wal-v9334.js',
 'release-payroll-reliable-save-guard-v9344.js',
 'release-payroll-snapshot-watch-v9354.js'
].sort(),'camadas delegadas da folha não foram identificadas');
let report=api.scan();
const sync=report.families.find(x=>x.id==='sync');
assert(sync,'família sync ausente');
assert.strictEqual(sync.status,'pass','família sync deveria passar com autoridades finais confirmadas');
delete ctx.HLGB_PAYROLL_WAL_RACE_9346;
const payrollBroken=api.responsibilityState('payroll-save',inv);
assert.strictEqual(payrollBroken.authorityConfirmed,false,'folha permaneceu confirmada sem marker runtime');
assert.strictEqual(payrollBroken.conflict,true,'ausência da autoridade final não gerou conflito');
report=api.scan();
assert.strictEqual(report.families.find(x=>x.id==='sync').status,'warn','família sync não alertou quando autoridade final sumiu');
console.log('AUDITOR_AUTHORITY_RESPONSIBILITY_V9398_OK',JSON.stringify({transport:transport.status,production:production.status,payroll:payroll.status,broken:payrollBroken.status}));
