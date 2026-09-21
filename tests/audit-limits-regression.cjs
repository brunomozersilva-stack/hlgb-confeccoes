const fs=require('fs'),vm=require('vm'),assert=require('assert');
const src=fs.readFileSync(require('path').join(__dirname,'..','release-limits.js'),'utf8');
let timers=[],alerts=0,calls=[],modalButton={disabled:false,textContent:'Salvar regra',dataset:{}};
const db={config:{weeklyPurchaseLimit:38000,weeklyPurchaseLimitRules:[{id:'old',value:38000}]},weeklyPurchaseLimits:[]};
const elements={
 financeWeeklyPurchaseLimit:{value:'25000'},financeLimitMode:{value:'indefinite'},
 weeklyPurchaseLimit:{value:'18000'}
};
const document={
 getElementById:id=>elements[id]||null,
 querySelector:q=>q==='button[onclick="saveFinanceWeeklyPurchaseLimit()"]'?modalButton:null,
 createElement:()=>({}),head:{appendChild:()=>{}}
};
const snapshots=new Map();
const window={db,renderFinanceWeeklyLimit(){},renderWeeklyPurchases(){},renderFinance(){},renderPurchases(){},
 hlgbRecordSaveWithRetry:async(module,id,data,deleted)=>{
  calls.push({module,id,data,deleted});
  const out={applied:true,data:{...data},deleted_at:deleted?'2026-09-21T15:00:00Z':null,revision:1,updated_at:'2026-09-21T15:00:00Z'};
  snapshots.set(String(id),{...out});
  return out;
 }
};
const context={
 console,db,window,document,
 hlgbRecordReady:true,hlgbRecordSnapshots:{weeklyPurchaseLimits:snapshots},
 cloudEnsureFreshSession:async()=>true,hlgbEnsureRecordsOnlineAfterLogin:async()=>true,
 localSaveOnly(){},setCloudStatus(){},alert:()=>{alerts++},confirm:()=>true,
 setTimeout:(fn,ms)=>{timers.push({fn,ms});return timers.length},clearTimeout:()=>{},
 hlgbAfterLogin:(fn)=>fn(),isoDate:()=> '2026-09-21'
};
vm.createContext(context);vm.runInContext(src,context);
(async()=>{
 let rules=window.ensureWeeklyPurchaseLimitRules();
 assert.deepEqual(JSON.parse(JSON.stringify(rules)),[],'no normalized active rules must yield empty list');
 assert.equal(db.config.weeklyPurchaseLimit,0,'legacy scalar R$38k must be cleared when normalized module is empty');
 assert.deepEqual(JSON.parse(JSON.stringify(db.config.weeklyPurchaseLimitRules)),[],'legacy cache cannot resurrect deleted rule');

 const saved=await window.saveFinanceWeeklyPurchaseLimit();
 assert.equal(saved,true,'explicit Financeiro rule must be cloud confirmed');
 assert.equal(calls.length,1);assert.equal(calls[0].module,'weeklyPurchaseLimits');assert.equal(calls[0].deleted,false);
 assert.equal(db.weeklyPurchaseLimits.length,1);assert.equal(db.weeklyPurchaseLimits[0].value,25000);
 assert.equal(db.config.weeklyPurchaseLimitRules.length,1);

 const id=db.weeklyPurchaseLimits[0].id;
 const del=await window.deleteFinanceWeeklyLimitRule(id);
 assert.equal(del,true);assert.equal(calls.length,2);assert.equal(calls[1].deleted,true);
 assert.equal(db.weeklyPurchaseLimits.length,0,'confirmed tombstone must remove local rule');
 assert.equal(db.config.weeklyPurchaseLimit,0,'deleting final normalized rule must clear legacy scalar too');

 // Legacy quick input is debounced and writes one normalized quick rule, not config-only.
 window.saveWeeklyPurchaseLimit();
 const quick=timers.filter(x=>x.ms===650).pop();assert(quick,'quick limit must be debounced');
 await quick.fn();
 assert.equal(calls.length,3);assert.equal(calls[2].module,'weeklyPurchaseLimits');
 assert.equal(calls[2].data.value,18000);assert.equal(calls[2].data.quickLegacy,true);
 assert.equal(db.weeklyPurchaseLimits.length,1);

 assert.equal(window.HLGB_LIMITS_MODULE,'normalized-confirmed-v2');

 const app=fs.readFileSync(require('path').join(__dirname,'..','app9240.html'),'utf8');
 const moduleBlock=app.match(/const HLGB_RECORD_MODULES=\[[\s\S]*?\];/)?.[0]||'';
 assert(moduleBlock.includes('weeklyPurchaseLimits'),'weeklyPurchaseLimits must load authoritatively on login/refresh');
 const writeBlock=app.match(/const HLGB_RECORD_WRITE_AREA=\{[\s\S]*?\};/)?.[0]||'';
 assert(writeBlock.includes('weeklyPurchaseLimits:"financeiro"'),'weeklyPurchaseLimits must use Financeiro write permission');
 console.log('PASS limits v2: legacy R$38k cannot resurrect; create/delete/quick changes require normalized cloud confirmation.');
})().catch(e=>{console.error(e);process.exit(1)});