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
const document={querySelectorAll:sel=>sel==='script[src]'?scripts:[],querySelector:()=>null,getElementById:()=>null,addEventListener:()=>{},createElement:()=>({style:{},addEventListener(){},remove(){}}),body:{appendChild(){}},documentElement:{appendChild(){}},head:{appendChild(){}}};
const ctx={console,Date,JSON,Math,Promise,Map,Set,URL,Blob:function(){},location:{href:'https://example.test/app-stable3.html'},performance:{getEntriesByType:t=>t==='resource'?resources:[]},document,setTimeout:()=>0,clearTimeout:()=>{}};
ctx.window=ctx;
function cloudBase(){}
function cloudTransport(){return cloudBase.apply(this,arguments)} cloudTransport.__hlgb9320=true;cloudTransport.__hlgb9320Original=cloudBase;
function recordBase(){}
function recordProduction(){return recordBase.apply(this,arguments)} recordProduction.__hlgb9306=true;recordProduction.__original=recordBase;
function recordPayroll(){return recordProduction.apply(this,arguments)} recordPayroll.__hlgbPayrollWalRace9346=true;recordPayroll.__original=recordProduction;
function reliableBase(){}
function reliableProduction(){return reliableBase.apply(this,arguments)} reliableProduction.__hlgb9306=true;reliableProduction.__original=reliableBase;
function reliablePayroll(){return reliableProduction.apply(this,arguments)} reliablePayroll.__hlgbPayrollWalRace9346=true;reliablePayroll.__original=reliableProduction;
ctx.cloudRequest=cloudTransport;ctx.hlgbRecordSaveWithRetry=recordPayroll;ctx.hlgb955ReliableSave=reliablePayroll;
ctx.HLGB_SYNC_GUARD_9306='93.06';ctx.HLGB_PAYROLL_WAL_RACE_9346='93.56';
vm.createContext(ctx);vm.runInContext(src,ctx,{filename:'release-auditor-authority-map-v9374.js'});
const api=ctx.hlgbAuditorAuthority9374;assert(api,'API Authority ausente');
const inv=api.loadedScriptInventory();
assert.strictEqual(inv.duplicates.length,0,'freshness probe ou DOM+resource foi contado como duplicidade de execução');
const transport=api.responsibilityState('record-transport',inv),production=api.responsibilityState('production-save-guard',inv),payroll=api.responsibilityState('payroll-save',inv);
assert.strictEqual(transport.authorityConfirmed,true,'transporte base não reconhecido no cloudRequest realmente instalado');
assert.strictEqual(transport.conflict,false,'transporte base criou conflito falso');
assert.strictEqual(production.authorityConfirmed,true,'Sync Guard não reconhecido nos dois saves');
assert.strictEqual(production.conflict,false,'Sync Guard criou conflito falso');
assert.strictEqual(payroll.authorityConfirmed,true,'v93.56 não reconhecida nos dois saves');
assert.strictEqual(payroll.conflict,false,'arquivos delegados da folha criaram conflito falso');
assert.deepStrictEqual(Array.from(payroll.supersededPresent).sort(),['release-payroll-month-wal-v9334.js','release-payroll-reliable-save-guard-v9344.js','release-payroll-snapshot-watch-v9354.js'].sort(),'camadas delegadas da folha não foram identificadas');
let report=api.scan();const sync=report.families.find(x=>x.id==='sync');assert(sync,'família sync ausente');assert.strictEqual(sync.status,'pass','família sync deveria passar com autoridades finais confirmadas');
// Marker global sem wrapper real não basta.
ctx.hlgb955ReliableSave=reliableProduction;
const payrollWrapperMissing=api.responsibilityState('payroll-save',inv);
assert.strictEqual(payrollWrapperMissing.authorityConfirmed,false,'marker global mascarou wrapper payroll ausente');
assert.strictEqual(payrollWrapperMissing.conflict,true,'wrapper payroll ausente não gerou conflito');
ctx.hlgb955ReliableSave=reliablePayroll;
delete ctx.HLGB_PAYROLL_WAL_RACE_9346;
const payrollMarkerMissing=api.responsibilityState('payroll-save',inv);
assert.strictEqual(payrollMarkerMissing.authorityConfirmed,false,'folha permaneceu confirmada sem marker runtime');
assert.strictEqual(payrollMarkerMissing.conflict,true,'ausência do marker final não gerou conflito');
report=api.scan();assert.strictEqual(report.families.find(x=>x.id==='sync').status,'warn','família sync não alertou quando autoridade final sumiu');
console.log('AUDITOR_AUTHORITY_RESPONSIBILITY_V9398_OK',JSON.stringify({transport:transport.status,production:production.status,payroll:payroll.status,wrapperMissing:payrollWrapperMissing.status,markerMissing:payrollMarkerMissing.status}));
