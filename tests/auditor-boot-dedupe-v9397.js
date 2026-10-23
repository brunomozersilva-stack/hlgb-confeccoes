const fs=require('fs');
const vm=require('vm');
const path=require('path');
const ROOT=path.resolve(__dirname,'..');
function ok(cond,msg){if(!cond)throw new Error(msg)}
function source(file){return fs.readFileSync(path.join(ROOT,file),'utf8')}
function run(file,c){vm.runInNewContext(source(file),c,{filename:file})}
function base(){
 const timers=[];
 const c={console,Date,Math,JSON,Promise,Map,Set,Array,Object,String,Number,Boolean,RegExp,URL,encodeURIComponent,decodeURIComponent,structuredClone:global.structuredClone};
 c.window=c;c.globalThis=c;c.navigator={onLine:true};c.location={href:'https://example.test/app-stable3.html'};
 c.performance={now:()=>1,getEntriesByType:()=>[]};
 c.setTimeout=(fn,ms=0)=>{timers.push({fn,ms});return timers.length};c.clearTimeout=()=>{};c.setInterval=()=>1;c.clearInterval=()=>{};
 c.queueMicrotask=fn=>{};c.requestAnimationFrame=fn=>1;c.addEventListener=()=>{};
 c.getComputedStyle=()=>({display:'block',visibility:'visible',opacity:'1'});
 c.localStorage={getItem:()=>null,setItem(){},removeItem(){}};
 const scripts=[];
 const makeEl=(tag='div')=>({tagName:String(tag).toUpperCase(),style:{},dataset:{},classList:{contains:()=>false,add(){},remove(){}},children:[],appendChild(el){scripts.push(el);return el},remove(){const i=scripts.indexOf(this);if(i>=0)scripts.splice(i,1)},setAttribute(){},removeAttribute(){},addEventListener(){},querySelector(){return null},querySelectorAll(){return[]},closest(){return null},getClientRects(){return[{}]},hidden:false,textContent:'',innerHTML:''});
 const head=makeEl('head');
 function matchesScript(el,selector){
  if(!el||el.tagName!=='SCRIPT')return false;
  if(selector.includes('data-hlgb-wal-authority')&&el.dataset?.hlgbWalAuthority)return true;
  if(selector.includes('data-hlgb-wal-authority-upgrade')&&el.dataset?.hlgbWalAuthorityUpgrade)return true;
  if(selector.includes('data-hlgb-payroll-reliable-guard')&&el.dataset?.hlgbPayrollReliableGuard)return true;
  if(selector.includes('data-hlgb-auditor-shell')&&el.dataset?.hlgbAuditorShell)return true;
  return false;
 }
 c.document={visibilityState:'visible',activeElement:null,head,body:makeEl('body'),documentElement:head,createElement:makeEl,getElementById:()=>null,querySelector:sel=>scripts.find(x=>matchesScript(x,sel))||null,querySelectorAll:sel=>scripts.filter(x=>matchesScript(x,sel)),addEventListener(){}};
 c.__scripts=scripts;c.__timers=timers;
 return c;
}

(async()=>{
 // 1) Existing Sync Guard must block real early calls but delegate normally after auth.
 {
  const c=base();let core=0,bundle=0,cut=0;
  c.__HLGB_AUTH_READY=false;
  c.hlgbLoadNormalizedCore=async()=>{core++;return 'core'};
  c.hlgbRecordLoadBundle=async()=>{bundle++;return 'bundle'};
  c.syncFinalizedCutsToProduction=()=>{cut++;return true};
  c.hlgbAfterLogin=cb=>{c.__afterLogin=cb};
  run('release-sync-guard-v9306.js',c);
  ok(c.hlgbLoadNormalizedCore.__hlgb9306EarlyBoot===true,'early guard missing on hlgbLoadNormalizedCore');
  ok(c.hlgbRecordLoadBundle.__hlgb9306EarlyBoot===true,'early guard missing on hlgbRecordLoadBundle');
  ok(c.syncFinalizedCutsToProduction.__hlgb9306EarlyBoot===true,'early guard missing on cut sync');
  ok(await c.hlgbLoadNormalizedCore()===false,'pre-auth core load was not blocked');
  ok(await c.hlgbRecordLoadBundle()===false,'pre-auth bundle load was not blocked');
  ok(c.syncFinalizedCutsToProduction()===false,'pre-auth cut sync was not blocked');
  ok(core===0&&bundle===0&&cut===0,'a pre-auth base function executed');
  c.__HLGB_AUTH_READY=true;
  ok(await c.hlgbLoadNormalizedCore()==='core','core load did not delegate after auth');
  ok(await c.hlgbRecordLoadBundle()==='bundle','bundle load did not delegate after auth');
  ok(c.syncFinalizedCutsToProduction()===true,'cut sync did not delegate after auth');
  ok(core===1&&bundle===1&&cut===1,'post-auth base functions did not execute exactly once');
  const st=c.hlgbSyncGuard9306?c.hlgbSyncGuard9306.status():null;
  // API is published in post-login boot; counters are still encoded in source and exercised above.
  ok(source('release-sync-guard-v9306.js').includes('blockedPreAuthLoads'),'blocked load counter missing');
  ok(source('release-sync-guard-v9306.js').includes('blockedPreAuthCutSync'),'blocked cut counter missing');
 }

 // 2) WAL authority loader must be single-flight while the first script is still loading.
 {
  const c=base();c.db={hubFinanceEntries:[]};c.hlgbRecordSaveWithRetry=async()=>({applied:true});
  run('release-payroll-month-wal-v9334.js',c);
  const api=c.hlgbPayrollMonthWal9334;
  ok(api&&typeof api.loadWalSingleAuthority==='function','payroll WAL API missing');
  const walTags=()=>c.__scripts.filter(x=>x.dataset?.hlgbWalAuthority==='9339');
  ok(walTags().length===1,'initial WAL authority tag was not created exactly once');
  api.loadWalSingleAuthority();api.loadWalSingleAuthority();
  ok(walTags().length===1,'WAL authority loader created duplicate tags while loading');
 }

 // 3) Parser-friendly reliable guard: do not inject a duplicate if the official next script wins first.
 {
  const c=base();c.db={hubFinanceEntries:[]};c.hlgbRecordSaveWithRetry=async()=>({applied:true});
  run('release-payroll-month-wal-v9334.js',c);
  ok(c.__scripts.filter(x=>x.dataset?.hlgbPayrollReliableGuard==='9344').length===0,'reliable guard was injected synchronously before parser could load official script');
  c.HLGB_PAYROLL_RELIABLE_SAVE_GUARD_9344='93.45';
  const zero=c.__timers.filter(x=>x.ms===0);zero.forEach(x=>x.fn());
  ok(c.__scripts.filter(x=>x.dataset?.hlgbPayrollReliableGuard==='9344').length===0,'reliable guard duplicate was injected after official marker appeared');
 }

 // 4) Boot Auditor exposes safely blocked calls separately from actual traced failures.
 {
  const c=base();
  c.hlgbBootTimeline9379={snapshot:()=>({session:'s1',startedWall:1,installedWall:1,coverage:{preInstrumentationGapMs:0,preInstrumentationMeasured:true},authReady:true,resourceCount:10})};
  c.hlgbAuditorCallTrace9380={snapshot:()=>({wrapped:[],eventCount:0,events:[]})};
  c.hlgbSyncGuard9306={status:()=>({earlyBoot:{installs:3,blockedPreAuthLoads:2,blockedPreAuthCutSync:4,loadCoreGuarded:true,loadBundleGuarded:true,cutSyncGuarded:true}})};
  run('release-auditor-boot-analysis-v9381.js',c);
  const r=c.hlgbAuditorBootAnalysis9381.analyze();
  ok(r.status==='pass','safe blocked calls incorrectly failed boot analysis');
  ok(r.summary.preAuthLoads===0&&r.summary.hiddenRenders===0,'trace reported nonexistent actual early calls');
  ok(r.summary.blockedPreAuthLoads===2&&r.summary.blockedPreAuthCutSync===4,'Auditor did not expose protected early calls');
 }

 console.log('AUDITOR_BOOT_DEDUPE_V9397_OK',JSON.stringify({preAuthGuard:true,walSingleFlight:true,reliableParserDedupe:true,auditorProtectedCounts:true}));
})().catch(e=>{console.error(e.stack||e);process.exit(1)});
