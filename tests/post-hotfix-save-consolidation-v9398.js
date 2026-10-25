const fs=require('fs'),vm=require('vm'),assert=require('assert');
const files={
 month:'release-payroll-month-wal-v9334.js',
 snapshot:'release-payroll-snapshot-watch-v9354.js',
 reliable:'release-payroll-reliable-save-guard-v9344.js',
 race:'release-payroll-wal-race-v9346.js',
 sync:'release-sync-guard-v9306.js'
};
const src=Object.fromEntries(Object.entries(files).map(([k,f])=>[k,fs.readFileSync(f,'utf8')]));
assert(!src.month.includes('window.hlgbRecordSaveWithRetry=wrapped'),'v93.44 ainda envolve record save');
assert(src.month.includes('recordSaveDelegated:true'),'v93.44 não declara delegação');
assert(!src.snapshot.includes('window.hlgbRecordSaveWithRetry=wrapped'),'v93.54 ainda envolve record save');
assert(src.snapshot.includes('recordSaveDelegated:true'),'v93.54 não declara delegação');
assert(!src.reliable.includes('window.hlgb955ReliableSave=wrapped'),'v93.45 ainda envolve reliable save');
assert(src.reliable.includes('reliableSaveDelegated:true'),'v93.45 não declara delegação');
assert(src.race.includes('window.hlgbRecordSaveWithRetry=wrapped'),'v93.56 não é autoridade final de record save');
assert(src.race.includes('window.hlgb955ReliableSave=wrapped'),'v93.56 não é autoridade final de reliable save');
assert(src.sync.includes('startEarlyBootGuardWatch'),'Sync Guard não mantém a trava pré-login');
assert(src.sync.includes('sessionRestoreLoadsAllowed:true'),'Sync Guard não documenta restauração permitida');
assert(!src.sync.includes("installEarlyGuard('hlgbLoadNormalizedCore'"),'Sync Guard voltou a bloquear core load');
assert(!src.sync.includes("installEarlyGuard('hlgbRecordLoadBundle'"),'Sync Guard voltou a bloquear bundle load');

const timers=[],intervals=[];
const local={};
const ctx={
 console,Date,JSON,Math,Promise,Map,Set,Array,Object,String,Number,Boolean,RegExp,structuredClone:global.structuredClone,
 navigator:{onLine:true},
 localStorage:{getItem:k=>local[k]??null,setItem:(k,v)=>{local[k]=String(v)},removeItem:k=>{delete local[k]}},
 setTimeout:(fn,ms=0)=>{timers.push({fn,ms});return timers.length},
 clearTimeout:()=>{},
 setInterval:(fn,ms=0)=>{intervals.push({fn,ms});return intervals.length},
 clearInterval:()=>{},
 queueMicrotask:()=>{},
 addEventListener:()=>{},
 document:{
  visibilityState:'visible',
  querySelector:()=>null,
  querySelectorAll:()=>[],
  createElement:()=>({dataset:{},remove(){}}),
  head:{appendChild(){}},
  documentElement:{appendChild(){}}
 },
 db:{hubFinanceEntries:[]},
 hlgbRecordSnapshots:{hubFinanceEntries:new Map()},
 hlgbRecordSaveWithRetry:async()=>({applied:true}),
 hlgb955ReliableSave:async()=>({applied:true}),
 enqueue955:async()=>({state:'queued'}),
 save:()=>true,
 localSaveOnly:()=>true
};
ctx.window=ctx;ctx.globalThis=ctx;
vm.createContext(ctx);
vm.runInContext(src.race,ctx,{filename:files.race});
const afterRaceRecord=ctx.hlgbRecordSaveWithRetry,afterRaceReliable=ctx.hlgb955ReliableSave;
const st1=ctx.hlgbPayrollWalRace9346.status();
assert.strictEqual(st1.recordInstalls,1,'v93.56 instalou record guard número inesperado');
assert.strictEqual(st1.reliableInstalls,1,'v93.56 instalou reliable guard número inesperado');
ctx.hlgbPayrollWalRace9346.install();
assert.strictEqual(ctx.hlgbRecordSaveWithRetry,afterRaceRecord,'v93.56 reempacotou record save');
assert.strictEqual(ctx.hlgb955ReliableSave,afterRaceReliable,'v93.56 reempacotou reliable save');

vm.runInContext(src.month,ctx,{filename:files.month});
vm.runInContext(src.snapshot,ctx,{filename:files.snapshot});
vm.runInContext(src.reliable,ctx,{filename:files.reliable});
assert.strictEqual(ctx.hlgbRecordSaveWithRetry,afterRaceRecord,'módulo legado voltou a envolver record save');
assert.strictEqual(ctx.hlgb955ReliableSave,afterRaceReliable,'módulo legado voltou a envolver reliable save');
assert.strictEqual(ctx.hlgbPayrollMonthWal9334.status().recordSaveDelegated,true,'v93.44 status não confirma delegação');
assert.strictEqual(ctx.hlgbPayrollSnapshotWatch9354.status().recordSaveDelegated,true,'v93.54 status não confirma delegação');
assert.strictEqual(ctx.hlgbPayrollReliableSaveGuard9344.status().reliableSaveDelegated,true,'v93.45 status não confirma delegação');

console.log('POST_HOTFIX_SAVE_CONSOLIDATION_V9398_OK',JSON.stringify({
 recordInstalls:ctx.hlgbPayrollWalRace9346.status().recordInstalls,
 reliableInstalls:ctx.hlgbPayrollWalRace9346.status().reliableInstalls,
 monthDelegated:true,snapshotDelegated:true,reliableDelegated:true
}));
