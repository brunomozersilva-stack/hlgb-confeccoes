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
 const makeEl=(tag='div')=>({tagName:String(tag).toUpperCase(),style:{},dataset:{},classList:{contains:()=>false,add(){},remove(){}},children:[],appendChild(el){scripts.push(el);return el},remove(){const i=scripts.indexOf(this);if(i>=0)scripts.splice(i,1)},setAttribute(){},removeAttribute(){},addEventListener(){},querySelector(){return null},querySelectorAll(){return[]},closest(){return null},getClientRects(){return[{}]},getBoundingClientRect(){return{width:10,height:10}},hidden:false,textContent:'',innerHTML:''});
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
 // 1) Corte é bloqueado antes da interface autenticada, mas leituras de restauração continuam permitidas.
 {
  const c=base();let core=0,bundle=0,cut=0;
  c.__HLGB_AUTH_READY=false;c.db={cuts:[],orders:[]};
  c.hlgbLoadNormalizedCore=async()=>{core++;return 'core'};
  c.hlgbRecordLoadBundle=async()=>{bundle++;return 'bundle'};
  c.syncFinalizedCutsToProduction=()=>{cut++;return true};
  c.hlgbAfterLogin=cb=>{c.__afterLogin=cb};
  run('release-cut-view.js',c);
  ok(c.hlgbCutViewGuard?.installCutAuthGate(),'cut auth gate was not installed');
  const gated=c.syncFinalizedCutsToProduction;
  ok(gated.__hlgb9306EarlyBoot===true&&gated.__hlgb9306EarlyKind==='cut-sync','cut gate markers missing');
  ok(gated()===false,'pre-auth cut sync was not blocked');
  ok(cut===0&&c.__HLGB_PREAUTH_CUT_BLOCKED_9397===1,'blocked cut sync executed base or counter failed');

  // Sync Guard may load before manual login; it must not block the reads needed to restore/load records.
  run('release-sync-guard-v9306.js',c);
  ok(c.syncFinalizedCutsToProduction===gated,'Sync Guard added a second cut gate over the early Cut guard');
  ok(await c.hlgbLoadNormalizedCore()==='core','session restoration core load was blocked');
  ok(await c.hlgbRecordLoadBundle()==='bundle','session restoration bundle load was blocked');
  ok(core===1&&bundle===1,'restoration loads did not execute exactly once');
  c.__HLGB_AUTH_READY=true;
  ok(c.syncFinalizedCutsToProduction()===true&&cut===1,'cut sync did not delegate after auth');
  ok(source('release-sync-guard-v9306.js').includes('sessionRestoreLoadsAllowed:true'),'Sync Guard does not document allowed restore loads');
 }

 // 2) WAL authority loader remains single-flight while the first script is still loading.
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

 // 3) Reliable guard must not inject a duplicate if the official parser script wins first.
 {
  const c=base();c.db={hubFinanceEntries:[]};c.hlgbRecordSaveWithRetry=async()=>({applied:true});
  run('release-payroll-month-wal-v9334.js',c);
  ok(c.__scripts.filter(x=>x.dataset?.hlgbPayrollReliableGuard==='9344').length===0,'reliable guard was injected synchronously before parser could load official script');
  c.HLGB_PAYROLL_RELIABLE_SAVE_GUARD_9344='93.45';
  c.__timers.filter(x=>x.ms===0).forEach(x=>x.fn());
  ok(c.__scripts.filter(x=>x.dataset?.hlgbPayrollReliableGuard==='9344').length===0,'reliable guard duplicate was injected after official marker appeared');
 }

 // 4) Auditor distinguishes authenticated session restoration from truly unsafe pre-auth work.
 {
  const c=base();
  c.__HLGB_PREAUTH_CUT_BLOCKED_9397=1;
  c.hlgbCutViewGuard={status:()=>({version:'v4',cutGateInstalls:1,blockedPreAuthCutSync:1,guarded:true})};
  c.hlgbBootTimeline9379={snapshot:()=>({session:'s1',startedWall:1,installedWall:1,coverage:{preInstrumentationGapMs:0,preInstrumentationMeasured:true},authReady:true,resourceCount:10})};
  const safeEvents=[
   {seq:1,type:'load:start',name:'hlgbLoadNormalizedCore',monoMs:10,authReady:false,sessionRestoring:true,activePage:'dashboard',appVisible:false,data:{stack:'restore@x.js:1:1'}},
   {seq:2,type:'load:return',name:'hlgbLoadNormalizedCore',monoMs:11,authReady:false,sessionRestoring:true,activePage:'dashboard',appVisible:false,data:{syncDurationMs:1}},
   {seq:3,type:'render:start',name:'syncFinalizedCutsToProduction',monoMs:12,authReady:false,sessionRestoring:true,activePage:'dashboard',appVisible:false,data:{stack:'renderAll@x.js:2:1',blockedByEarlyGate:true}},
   {seq:4,type:'render:return',name:'syncFinalizedCutsToProduction',monoMs:13,authReady:false,sessionRestoring:true,activePage:'dashboard',appVisible:false,data:{syncDurationMs:0,blockedByEarlyGate:true}}
  ];
  c.hlgbAuditorCallTrace9380={snapshot:()=>({wrapped:[],eventCount:safeEvents.length,events:safeEvents})};
  run('release-auditor-boot-analysis-v9381.js',c);
  let r=c.hlgbAuditorBootAnalysis9381.analyze();
  ok(r.status==='pass','authenticated restore or blocked cut incorrectly failed boot analysis');
  ok(r.summary.preAuthLoads===0&&r.summary.sessionRestoreLoads===1,'restore load classification is wrong');
  ok(r.summary.hiddenRenders===0&&r.summary.blockedPreAuthCutSync===1,'blocked hidden cut was counted as executed render');
  ok(r.rawCalls[0].observedAuthReady===false&&r.rawCalls[0].authReady===true,'consumer-normalized auth state missing restore evidence');

  const unsafe=[
   {seq:1,type:'load:start',name:'hlgbLoadNormalizedCore',monoMs:10,authReady:false,sessionRestoring:false,activePage:'dashboard',appVisible:false,data:{stack:'unsafe@x.js:1:1'}},
   {seq:2,type:'load:return',name:'hlgbLoadNormalizedCore',monoMs:11,authReady:false,sessionRestoring:false,activePage:'dashboard',appVisible:false,data:{syncDurationMs:1}}
  ];
  c.hlgbAuditorCallTrace9380={snapshot:()=>({wrapped:[],eventCount:unsafe.length,events:unsafe})};
  r=c.hlgbAuditorBootAnalysis9381.analyze();
  ok(r.status==='fail'&&r.summary.preAuthLoads===1,'truly unsafe pre-auth load was not reported as failure');
 }

 console.log('AUDITOR_BOOT_DEDUPE_V9397_OK',JSON.stringify({cutGate:true,restoreLoadsAllowed:true,walSingleFlight:true,reliableParserDedupe:true,restoreClassification:true}));
})().catch(e=>{console.error(e.stack||e);process.exit(1)});