const fs=require('fs'),vm=require('vm'),path=require('path');
const ROOT=path.resolve(__dirname,'..');
function ok(cond,msg){if(!cond)throw new Error(msg)}
function source(file){return fs.readFileSync(path.join(ROOT,file),'utf8')}
function run(file,c){vm.runInNewContext(source(file),c,{filename:file})}
function base(){
 const timers=[],intervals=[],scripts=[];
 const c={console,Date,Math,JSON,Promise,Map,Set,Array,Object,String,Number,Boolean,RegExp,URL,encodeURIComponent,decodeURIComponent,structuredClone:global.structuredClone};
 c.window=c;c.globalThis=c;c.navigator={onLine:true};c.location={href:'https://example.test/app-stable3.html'};
 c.performance={now:()=>1,getEntriesByType:()=>[]};
 c.setTimeout=(fn,ms=0)=>{timers.push({fn,ms});return timers.length};c.clearTimeout=()=>{};
 c.setInterval=(fn,ms=0)=>{intervals.push({fn,ms});return intervals.length};c.clearInterval=()=>{};
 c.queueMicrotask=()=>{};c.requestAnimationFrame=()=>1;c.addEventListener=()=>{};
 c.getComputedStyle=()=>({display:'block',visibility:'visible',opacity:'1'});
 c.localStorage={getItem:()=>null,setItem(){},removeItem(){}};
 const makeEl=(tag='div')=>({tagName:String(tag).toUpperCase(),style:{},dataset:{},classList:{contains:()=>false,add(){},remove(){}},children:[],appendChild(el){scripts.push(el);return el},remove(){const i=scripts.indexOf(this);if(i>=0)scripts.splice(i,1)},setAttribute(){},removeAttribute(){},addEventListener(){},querySelector(){return null},querySelectorAll(){return[]},closest(){return null},getClientRects(){return[{}]},getBoundingClientRect(){return{width:10,height:10}},hidden:false,textContent:'',innerHTML:''});
 const head=makeEl('head');
 function matchesScript(el,selector){
  if(!el||el.tagName!=='SCRIPT')return false;
  if(selector.includes('data-hlgb-wal-authority')&&el.dataset?.hlgbWalAuthority)return true;
  if(selector.includes('data-hlgb-wal-authority-upgrade')&&el.dataset?.hlgbWalAuthorityUpgrade)return true;
  if(selector.includes('data-hlgb-payroll-reliable-guard')&&el.dataset?.hlgbPayrollReliableGuard)return true;
  return false;
 }
 c.document={visibilityState:'visible',activeElement:null,head,body:makeEl('body'),documentElement:head,createElement:makeEl,getElementById:()=>null,querySelector:sel=>scripts.find(x=>matchesScript(x,sel))||null,querySelectorAll:sel=>scripts.filter(x=>matchesScript(x,sel)),addEventListener(){}};
 c.__scripts=scripts;c.__timers=timers;c.__intervals=intervals;
 return c;
}
(async()=>{
 {
  const c=base();let core=0,bundle=0,cut=0,replacementCut=0;
  c.__HLGB_AUTH_READY=false;c.db={cuts:[],orders:[],production:[]};
  c.hlgbLoadNormalizedCore=async()=>{core++;return 'core'};
  c.hlgbRecordLoadBundle=async()=>{bundle++;return 'bundle'};
  c.syncFinalizedCutsToProduction=()=>{cut++;return true};
  c.hlgbAfterLogin=cb=>{c.__afterLogin=cb};
  run('release-sync-guard-v9306.js',c);
  const firstGate=c.syncFinalizedCutsToProduction;
  ok(firstGate.__hlgb9306EarlyBoot===true&&firstGate.__hlgb9306EarlyKind==='cut-sync','Sync Guard não instalou gate inicial de corte');
  ok(firstGate()===false&&cut===0,'corte pré-login executou');
  ok(await c.hlgbLoadNormalizedCore()==='core'&&await c.hlgbRecordLoadBundle()==='bundle','leituras necessárias à restauração foram bloqueadas');
  ok(core===1&&bundle===1,'leituras de restauração não executaram exatamente uma vez');
  c.syncFinalizedCutsToProduction=()=>{replacementCut++;return true};
  const watch=c.__intervals.find(x=>x.ms===250);
  ok(!!watch,'watch persistente do gate não foi iniciado');
  watch.fn();
  ok(c.syncFinalizedCutsToProduction.__hlgb9306EarlyBoot===true,'gate não foi reaplicado após substituição da função');
  ok(c.syncFinalizedCutsToProduction()===false&&replacementCut===0,'função substituída escapou do gate pré-login');
  c.__HLGB_AUTH_READY=true;
  ok(c.syncFinalizedCutsToProduction()===true&&replacementCut===1,'gate não delegou após autenticação');
  ok(source('release-sync-guard-v9306.js').includes('sessionRestoreLoadsAllowed:true'),'Sync Guard não documenta restauração permitida');
 }
 {
  const c=base();c.db={cuts:[],orders:[]};let renders=0,cuts=0;
  const render=()=>{renders++;return true},cut=()=>{cuts++;return true};
  c.renderAll=render;c.syncFinalizedCutsToProduction=cut;c.hlgbAfterLogin=()=>{};
  run('release-cut-view.js',c);
  ok(c.HLGB_CUT_VIEW_GUARD==='v3','Cut View deveria estar no modo estável v3');
  ok(c.renderAll===render,'Cut View voltou a envolver renderAll');
  ok(c.syncFinalizedCutsToProduction===cut,'Cut View voltou a disputar autoridade do gate de corte');
 }
 {
  const c=base();c.db={hubFinanceEntries:[]};c.hlgbRecordSaveWithRetry=async()=>({applied:true});
  run('release-payroll-month-wal-v9334.js',c);
  const api=c.hlgbPayrollMonthWal9334;
  ok(api&&typeof api.loadWalSingleAuthority==='function','payroll WAL API ausente');
  const walTags=()=>c.__scripts.filter(x=>x.dataset?.hlgbWalAuthority==='9339'||x.dataset?.hlgbWalAuthorityUpgrade==='9348');
  ok(walTags().length===0,'payroll WAL voltou a injetar autoridade v9339 dinamicamente');
  let maintained=0;c.HLGB_WAL_SINGLE_AUTHORITY_9339='93.48';c.hlgbWalSingleAuthority9339={version:'93.48',maintain:()=>{maintained++}};
  ok(api.loadWalSingleAuthority()===true,'payroll WAL não reutilizou autoridade oficial já carregada');
  api.loadWalSingleAuthority();
  ok(maintained===2,'autoridade oficial não recebeu manutenção esperada');
  ok(walTags().length===0,'reuso da autoridade oficial criou tag dinâmica');
 }
 {
  const c=base();c.db={hubFinanceEntries:[]};c.hlgbRecordSaveWithRetry=async()=>({applied:true});
  run('release-payroll-month-wal-v9334.js',c);
  ok(c.__scripts.filter(x=>x.dataset?.hlgbPayrollReliableGuard==='9344').length===0,'reliable guard injetou antes do parser');
  c.HLGB_PAYROLL_RELIABLE_SAVE_GUARD_9344='93.45';
  c.__timers.filter(x=>x.ms===0).forEach(x=>x.fn());
  ok(c.__scripts.filter(x=>x.dataset?.hlgbPayrollReliableGuard==='9344').length===0,'reliable guard duplicou após marcador oficial');
 }
 {
  const c=base();c.__HLGB_PREAUTH_CUT_BLOCKED_9397=1;
  c.hlgbSyncGuard9306={status:()=>({earlyBoot:{blockedPreAuthCutSync:1,cutSyncGuarded:true,sessionRestoreLoadsAllowed:true}})};
  c.hlgbBootTimeline9379={snapshot:()=>({session:'s1',startedWall:1,installedWall:1,coverage:{preInstrumentationGapMs:0,preInstrumentationMeasured:true},authReady:true,resourceCount:10})};
  const safeEvents=[
   {seq:1,type:'load:start',name:'hlgbLoadNormalizedCore',monoMs:10,authReady:false,sessionRestoring:true,activePage:'dashboard',appVisible:false,data:{stack:'restore@x.js:1:1'}},
   {seq:2,type:'load:return',name:'hlgbLoadNormalizedCore',monoMs:11,authReady:false,sessionRestoring:true,activePage:'dashboard',appVisible:false,data:{syncDurationMs:1}},
   {seq:3,type:'render:start',name:'syncFinalizedCutsToProduction',monoMs:12,authReady:false,sessionRestoring:true,activePage:'dashboard',appVisible:false,data:{stack:'gate@x.js:2:1',blockedByEarlyGate:true}},
   {seq:4,type:'render:return',name:'syncFinalizedCutsToProduction',monoMs:13,authReady:false,sessionRestoring:true,activePage:'dashboard',appVisible:false,data:{syncDurationMs:0,blockedByEarlyGate:true}}
  ];
  c.hlgbAuditorCallTrace9380={snapshot:()=>({wrapped:[],eventCount:safeEvents.length,events:safeEvents})};
  run('release-auditor-boot-analysis-v9381.js',c);
  let r=c.hlgbAuditorBootAnalysis9381.analyze();
  ok(r.status==='pass','restauração autenticada ou corte bloqueado falhou no Boot Analysis');
  ok(r.summary.preAuthLoads===0&&r.summary.sessionRestoreLoads===1,'classificação de restore incorreta');
  ok(r.summary.hiddenRenders===0&&r.summary.blockedPreAuthCutSync>=1,'tentativa bloqueada foi contada como render executado');
  const unsafe=[
   {seq:1,type:'load:start',name:'hlgbLoadNormalizedCore',monoMs:10,authReady:false,sessionRestoring:false,activePage:'dashboard',appVisible:false,data:{stack:'unsafe@x.js:1:1'}},
   {seq:2,type:'load:return',name:'hlgbLoadNormalizedCore',monoMs:11,authReady:false,sessionRestoring:false,activePage:'dashboard',appVisible:false,data:{syncDurationMs:1}}
  ];
  c.hlgbAuditorCallTrace9380={snapshot:()=>({wrapped:[],eventCount:unsafe.length,events:unsafe})};
  r=c.hlgbAuditorBootAnalysis9381.analyze();
  ok(r.status==='fail'&&r.summary.preAuthLoads===1,'carga realmente insegura não foi reportada');
 }
 {
  const router=source('app-stable3.html');
  const explicit=['release-auditor-production-v9369.js','release-payroll-month-wal-v9334.js','release-payroll-reliable-save-guard-v9344.js','release-wal-replay-bridge-v9332.js'];
  for(const file of explicit){const count=router.split("'"+file+"'").length-1;ok(count===1,'script explícito deve aparecer uma vez no roteador: '+file+' count='+count)}
  ok(router.includes("'release-wal-confirmed-replay-v9333.js'"),'replay confirmado ausente');
  ok(router.includes("'release-payroll-wal-race-v9346.js'"),'autoridade final da folha ausente');
  const payroll=source('release-payroll-month-wal-v9334.js'),safari=source('release-safari-resume-v9266.js');
  ok(!payroll.includes("s.src='./release-wal-single-authority-v9339.js"),'Folha voltou a reinjetar v9339');
  ok(!safari.includes("s.src='./release-wal-single-authority-v9339.js"),'Safari voltou a reinjetar v9339');
 }
 {
  const c=base(),normal='https://example.test/release-auditor-build-marker-v9396.js?fresh=1',probe='https://example.test/release-auditor-build-marker-v9396.js?hlgb_audit_fresh=2';
  c.document.querySelectorAll=sel=>sel==='script[src]'?[{src:normal}]:[];
  c.performance.getEntriesByType=type=>type==='resource'?[{name:normal,startTime:1,duration:1},{name:probe,startTime:2,duration:1}]:[];
  run('release-auditor-authority-map-v9374.js',c);
  ok(c.hlgbAuditorAuthority9374.loadedScriptInventory().duplicates.length===0,'Authority Map contou freshness probe como duplicado');
  run('release-auditor-intelligence-v9396.js',c);
  ok(c.hlgbAuditorIntelligence9396.duplicateScripts().length===0,'Inteligência contou freshness probe como duplicado');
  const cmp=c.hlgbAuditorIntelligence9396.compareMetrics({metrics:{loads:5,renders:9,hiddenRenders:0,preAuthLoads:0}},{metrics:{loads:10,renders:5,hiddenRenders:1,preAuthLoads:0}});
  ok(cmp.items.find(x=>x.key==='renders')?.state==='info','renders brutos deveriam ser informativos');
  ok(cmp.items.find(x=>x.key==='loads')?.state==='info','loads brutos deveriam ser informativos');
  ok(cmp.items.find(x=>x.key==='hiddenRenders')?.state==='improved','melhoria de render oculto foi perdida');
  ok(cmp.summary.regressed===0,'contagem informativa criou regressão falsa');
 }
 console.log('AUDITOR_BOOT_DEDUPE_V9398_OK',JSON.stringify({syncGuardAuthority:true,persistentCutGate:true,restoreLoadsAllowed:true,cutViewNoAuthAuthority:true,walSingleAuthorityNoReinject:true,reliableParserDedupe:true,restoreClassification:true,explicitHotfixScriptsSingle:true,auditorFalsePositiveFilter:true}));
})().catch(e=>{console.error(e.stack||e);process.exit(1)});
