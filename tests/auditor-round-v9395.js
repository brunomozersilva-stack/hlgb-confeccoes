const fs=require('fs');
const vm=require('vm');
const path=require('path');
const ROOT=path.resolve(__dirname,'..');
function ok(cond,msg){if(!cond)throw new Error(msg)}
function countMarker(fn,marker){let n=0,seen=new Set(),cur=fn;while(typeof cur==='function'&&!seen.has(cur)&&seen.size<60){seen.add(cur);if(cur[marker])n++;cur=cur.__original||cur.__hlgb9307Original||cur.__hlgb9320Original||cur.__hlgb955Original||cur.__hlgbReliableOriginal||null}return n}
function baseContext(){
 const c={console,Date,Math,JSON,Promise,Map,Set,Array,Object,String,Number,Boolean,RegExp,URL,encodeURIComponent,decodeURIComponent,structuredClone:global.structuredClone};
 c.window=c;c.globalThis=c;c.navigator={onLine:true};c.location={href:'https://example.test/app-stable3.html'};
 c.performance={now:()=>1,getEntriesByType:()=>[]};
 c.setTimeout=(fn)=>{if(typeof fn==='function')fn();return 1};c.clearTimeout=()=>{};
 c.setInterval=()=>1;c.clearInterval=()=>{};c.requestAnimationFrame=fn=>{if(fn)fn();return 1};
 c.getComputedStyle=el=>({display:el?.__display??'block',visibility:'visible',opacity:'1'});
 c.MutationObserver=class{observe(){} disconnect(){}};
 const makeEl=(tag='div')=>({tagName:String(tag).toUpperCase(),style:{},dataset:{},classList:{contains:()=>false,add(){},remove(){}},children:[],appendChild(){},remove(){},setAttribute(){},removeAttribute(){},addEventListener(){},querySelector(){return null},querySelectorAll(){return[]},closest(){return null},getClientRects(){return[{}]},offsetParent:null,hidden:false,textContent:'',innerHTML:''});
 c.document={visibilityState:'visible',activeElement:null,head:makeEl('head'),body:makeEl('body'),documentElement:makeEl('html'),createElement:makeEl,getElementById:()=>null,querySelector:()=>null,querySelectorAll:()=>[],addEventListener(){}};
 c.addEventListener=()=>{};c.scrollTo=()=>{};c.alert=()=>{};
 return c;
}
function run(file,ctx,part){let src=fs.readFileSync(path.join(ROOT,file),'utf8');if(part)src=part(src);vm.runInNewContext(src,ctx,{filename:file});}

(async()=>{
 // Cut -> production: no pre-auth/hidden execution and no repeated no-op execution.
 {
  const c=baseContext();let baseCalls=0;
  const app={__display:'block',getClientRects:()=>[{}]},login={__display:'none',getClientRects:()=>[{}]};
  c.document.getElementById=id=>id==='appShell'?app:id==='loginScreen'?login:null;
  c.document.visibilityState='hidden';c.__HLGB_AUTH_READY=false;
  c.db={cuts:[{id:1,status:'Finalizado',productId:9}],production:[],orders:[]};
  c.syncFinalizedCutsToProduction=function(){baseCalls++;const cut=c.db.cuts[0];if(!c.db.production.some(x=>String(x.cutId)===String(cut.id)))c.db.production.push({cutId:cut.id,productId:cut.productId});return true};
  c.hlgbSyncGuard9306={repair:async()=>true,refreshAuthority:async()=>true,status:()=>({})};
  c.hlgbAfterLogin=cb=>{c.__afterLogin=cb};
  run('release-production-cut-reconcile-v9307.js',c,src=>src.split('/* HLGB v93.13')[0]);
  c.__afterLogin();
  ok(c.syncFinalizedCutsToProduction()===false,'cut sync must be blocked while hidden/pre-auth');
  ok(baseCalls===0,'base cut sync executed before app ready');
  c.__HLGB_AUTH_READY=true;c.document.visibilityState='visible';
  ok(c.hlgbProductionCutReconcile9307.needsCutSync()===true,'missing finalized cut was not detected');
  c.syncFinalizedCutsToProduction();
  ok(baseCalls===1,'real missing cut should execute exactly once');
  ok(c.db.production.length===1,'production row was not created');
  c.syncFinalizedCutsToProduction();
  ok(baseCalls===1,'no-op render called base cut sync again');
 }

 // Auditor trace: outer wrappers must not cause a second trace wrapper.
 {
  const c=baseContext();c.renderProjection=function baseProjection(){};
  run('release-auditor-call-trace-v9380.js',c);
  ok(countMarker(c.renderProjection,'__hlgbCallTrace9380')===1,'initial call-trace wrapper missing');
  const prev=c.renderProjection;function external(){return prev.apply(this,arguments)}external.__original=prev;c.renderProjection=external;
  c.hlgbAuditorCallTrace9380.install();
  ok(countMarker(c.renderProjection,'__hlgbCallTrace9380')===1,'call-trace self-nested after external wrapper');
 }

 // UI stability: same chain-aware behavior.
 {
  const c=baseContext();c.renderProjection=function baseProjection(){};
  run('release-ui-stability.js',c);
  ok(countMarker(c.renderProjection,'__hlgbUiStabilityV2')===1,'initial UI stability wrapper missing');
  const prev=c.renderProjection;function external(){return prev.apply(this,arguments)}external.__original=prev;c.renderProjection=external;
  const src=fs.readFileSync(path.join(ROOT,'release-ui-stability.js'),'utf8');
  ok(src.includes("chainHasMarker(fn,'__hlgbUiStabilityV2')"),'UI stability is not chain-aware');
  ok(countMarker(c.renderProjection,'__hlgbUiStabilityV2')===1,'external wrapper changed existing UI marker count');
 }

 // v93.88 visibility must not replace canonical v93.91 writeoff and must not self-nest projection wrapper.
 {
  const c=baseContext();const canonical=async()=>true;
  c.HLGB_OPERATIONAL_WRITEOFF_AUTHORITY='93.91';c.hlgbWriteoffIntegrity9391={version:'93.91'};c.hlgbWriteoffSelected9385=canonical;c.hlgbWriteoffSelected9384=canonical;c.hlgbWriteoffSelected9378=canonical;
  c.db={products:[],orders:[],cuts:[],production:[],operationalWriteoffs:[],clients:[],factions:[]};
  c.renderProjection=function baseProjection(){};
  run('release-production-operations-v9386-finalize.js',c);
  ok(c.hlgbWriteoffSelected9385===canonical,'v93.88 replaced canonical v93.91 writeoff');
  ok(c.hlgbOperationalVisibility9386.canonicalWriteoffActive()===true,'canonical writeoff marker not recognized');
  ok(countMarker(c.renderProjection,'__hlgb9388')===1,'initial 93.88 projection wrapper missing');
  const prev=c.renderProjection;function external(){return prev.apply(this,arguments)}external.__original=prev;c.renderProjection=external;
  c.hlgbOperationalVisibility9386.refresh();
  ok(countMarker(c.renderProjection,'__hlgb9388')===1,'93.88 self-nested after refresh');
 }

 // Hub live refresh: one hook only in save chain.
 {
  const c=baseContext();c.db={hubFinanceEntries:[]};c.hlgbRecordSaveWithRetry=async()=>({applied:true});
  run('release-hub-live-refresh-v9289.js',c);
  ok(countMarker(c.hlgbRecordSaveWithRetry,'__hlgbHubLive9291')===1,'initial Hub live save hook missing');
  const prev=c.hlgbRecordSaveWithRetry;async function external(){return prev.apply(this,arguments)}external.__original=prev;c.hlgbRecordSaveWithRetry=external;
  c.hlgbHubLiveRefresh9289.installRecordHook();
  ok(countMarker(c.hlgbRecordSaveWithRetry,'__hlgbHubLive9291')===1,'Hub live save hook self-nested');
 }

 // Hub 93.24 must remain final authority even if 93.22 tries to reinstall later.
 {
  const c=baseContext();c.db={hubFinanceEntries:[]};c.localSaveOnly=()=>{};c.setCloudStatus=()=>{};c.hlgbHubQueuePending=()=>true;c.hlgbRecordSaveWithRetry=async()=>({applied:true,data:{}});
  c.document.querySelector=()=>null;c.document.head.appendChild=()=>{};
  run('release-save-actions-v9322.js',c);
  run('release-hub-delivery-v9324.js',c);
  ok(c.HLGB_HUB_SAVE_AUTHORITY==='93.24','Hub final authority marker missing');
  ok(c.hlgbHubSaveConfirmed===c.hlgbHubDelivery9324.save,'Hub 93.24 did not take authority');
  c.hlgbSaveActions9322.install();
  ok(c.hlgbHubSaveConfirmed===c.hlgbHubDelivery9324.save,'Hub 93.22 stole authority after 93.24 install');
  ok(c.hlgbSaveActions9322.state().finalAuthorityActive===true,'93.22 did not recognize final Hub authority');
 }

 // Support package freshness: export runs a fresh audit for the current state.
 {
  const daily=fs.readFileSync(path.join(ROOT,'release-daily-safety.js'),'utf8');
  ok(daily.includes("hlgbInternalAuditor.run('full',true)"), 'daily package does not run a fresh current audit');
 }

 // Auditor authority map must confirm declared authorities only with runtime evidence.
 {
  const c=baseContext();
  const files=['release-save-actions-v9322.js','release-hub-delivery-v9324.js','release-production-operations-v9378-preview.js','release-production-operations-v9380-preview-patch.js','release-production-operations-v9386-finalize.js','release-production-writeoff-integrity-v9391.js','release-save-transport-v9320.js','release-sync-guard-v9306.js','release-payroll-reliable-save-guard-v9344.js'];
  c.document.querySelectorAll=sel=>sel==='script[src]'?files.map((f,i)=>({src:'https://example.test/'+f,index:i})):[];
  c.HLGB_HUB_SAVE_AUTHORITY='93.24';c.HLGB_OPERATIONAL_WRITEOFF_AUTHORITY='93.91';
  run('release-auditor-authority-map-v9374.js',c);
  const r=c.hlgbAuditorAuthority9374.scan(),by=Object.fromEntries(r.consolidationPlan.map(x=>[x.id,x]));
  ok(by['hub-save'].authorityConfirmed===true&&!by['hub-save'].conflict,'Auditor did not confirm Hub authority');
  ok(by.writeoff.authorityConfirmed===true&&!by.writeoff.conflict,'Auditor did not confirm writeoff authority');
  ok(by['record-save'].conflict===true,'Auditor incorrectly hid unresolved record-save conflict');
 }

 console.log('AUDITOR_ROUND_V9395_OK',JSON.stringify({cutGuard:true,chainAware:true,hubAuthority:'93.24',writeoffAuthority:'93.91',recordSaveStillWarns:true}));
})().catch(e=>{console.error(e.stack||e);process.exit(1)});
