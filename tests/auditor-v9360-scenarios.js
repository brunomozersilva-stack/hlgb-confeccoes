const fs=require('fs'),vm=require('vm');
const source=fs.readFileSync('release-auditor-smart-v9360.js','utf8');
function boot(opts={}){
 const local=new Map();const listeners=[];let mutationCb=null;
 const dummy={innerHTML:'',style:{},textContent:'',appendChild(){},remove(){},querySelector(){return null},querySelectorAll(){return[]},closest(){return null},classList:{contains(){return false}},setAttribute(){}};
 const activePage={id:'hubFinanceiro'};
 const document={readyState:'complete',body:{...dummy},head:{...dummy},documentElement:dummy,querySelector(sel){if(sel==='.page.active')return activePage;return null},querySelectorAll(){return[]},getElementById(id){if(id==='appShell')return dummy;return null},addEventListener(type,fn){listeners.push(['document',type,fn])},createElement(tag){return {...dummy,tagName:tag.toUpperCase(),click(){}}}};
 class MO{constructor(cb){mutationCb=cb}observe(){}disconnect(){}}
 class PO{constructor(cb){this.cb=cb}observe(){}disconnect(){}}PO.supportedEntryTypes=['longtask'];
 const profiler=opts.profiler||{activeCount:2,active:[{delayMs:5000,callbackPreview:'tickA',count:1,maxDurationMs:10,fires:2}],suspect:[]};
 const raceStatus=opts.raceStatus||{recordInstalls:1,reliableInstalls:1,saveInstalls:2};
 const runtimeErrors=opts.runtimeErrors||[];
 const sync=opts.sync||{summary:{normalizedPending:0,walLocalStorage:0,walIndexedDb:0}};
 const blackbox=opts.blackbox||{kind:'blackbox',pendingAnalysis:opts.pendingAnalysis||{}};
 const window={addEventListener(type,fn){listeners.push(['window',type,fn])},document,HLGB_RELEASE_VERSION:'93.56',navigator:{onLine:true},location:{href:'https://teste.local/'},
  hlgbRuntimeProfiler9292:{snapshot(){return profiler}},hlgbPayrollWalRace9346:{status(){return raceStatus}},
  hlgbInternalAuditor:{runtimeErrors,latest(){return null},redactDiagnostic:x=>x,async buildSyncDiagnostic(){return sync}},
  hlgbAuditorBlackbox9299:{async collect(){return blackbox}},
  hlgbAuditorRunVisualSweep:async()=>({completedAt:new Date().toISOString(),summary:{result:'Aprovado',pass:10,warn:0,fail:0}}),
  setTimeout(fn){return 1},clearTimeout(){},setInterval(){return 1},clearInterval(){},MutationObserver:MO,PerformanceObserver:PO,
  Blob:class{constructor(parts){this.parts=parts}},URL:{createObjectURL(){return 'blob:test'},revokeObjectURL(){}},alert(){},openModal(){},closeModal(){},currentUser(){return {name:'Teste'}}};
 const context={window,document,navigator:window.navigator,location:window.location,localStorage:{getItem:k=>local.get(k)||null,setItem:(k,v)=>local.set(k,String(v)),removeItem:k=>local.delete(k)},MutationObserver:MO,PerformanceObserver:PO,Blob:window.Blob,URL:window.URL,alert:window.alert,setTimeout:window.setTimeout,clearTimeout:window.clearTimeout,setInterval:window.setInterval,clearInterval:window.clearInterval,queueMicrotask:fn=>fn(),console,Date,JSON,Math,Promise,Map,Set,structuredClone:v=>JSON.parse(JSON.stringify(v))};
 vm.createContext(context);vm.runInContext(source,context);return {window,local,mutation:n=>mutationCb&&mutationCb(Array.from({length:n},()=>({}))) };
}
(async()=>{
 let e=boot();let m=e.window.hlgbAuditorSmart.currentMetrics();if(m.recordInstalls!==1)throw new Error('baseline recordInstalls incorreto');
 e.local.set('hlgb_auditor_baseline_v9360',JSON.stringify({...m,recordInstalls:1,intervalActive:2,intervalDuplicateGroups:0,runtimeErrors:0,longTasks:0,domMaxBurst:0}));
 e.window.hlgbPayrollWalRace9346.status=()=>({recordInstalls:9,reliableInstalls:1,saveInstalls:2});
 let reg=e.window.hlgbAuditorSmart.regression(e.window.hlgbAuditorSmart.currentMetrics());if(!reg.findings.some(x=>x.code==='record-wrapper-growth'))throw new Error('não detectou crescimento de wrappers');
 e=boot({profiler:{activeCount:8,active:[{delayMs:1000,callbackPreview:'loop',maxDurationMs:90,fires:20},{delayMs:1000,callbackPreview:'loop',maxDurationMs:85,fires:18},{delayMs:1000,callbackPreview:'loop',maxDurationMs:80,fires:16}],suspect:[1,2,3]}});m=e.window.hlgbAuditorSmart.currentMetrics();if(m.intervalDuplicateGroups<1||m.intervalSuspect<3)throw new Error('não detectou timer/loop suspeito');
 e=boot();e.mutation(320);m=e.window.hlgbAuditorSmart.currentMetrics();if(m.domMaxBurst<320)throw new Error('não detectou churn de render');
 e=boot({runtimeErrors:[{message:'sync fail'},{message:'x'},{message:'y'},{message:'z'}],sync:{summary:{normalizedPending:2,walLocalStorage:2,walIndexedDb:2}}});e.local.set('hlgb_auditor_baseline_v9360',JSON.stringify({intervalActive:0,intervalDuplicateGroups:0,recordInstalls:0,runtimeErrors:0,longTasks:0,domMaxBurst:0}));reg=e.window.hlgbAuditorSmart.regression(e.window.hlgbAuditorSmart.currentMetrics());if(!reg.findings.some(x=>x.code==='runtime-errors-growth'))throw new Error('não detectou crescimento de erros');let p=await e.window.hlgbAuditorSmart.problem();if(p.sync?.summary?.walLocalStorage!==2)throw new Error('pacote não carregou WAL preso');
 e=boot({blackbox:{kind:'blackbox',logs:['[HLGB v92.07] Cache local cheio; seguindo em modo nuvem','Failed to load resource: the server responded with a status of 500','canceling statement due to statement timeout code 57014','Multiple GoTrueClient instances detected in the same browser context','A nuvem demorou demais para responder ao PATCH']}});p=await e.window.hlgbAuditorSmart.problem();const codes=[...(p.analysis?.observed||[]),...(p.analysis?.probableCauses||[])].map(x=>x.code);for(const expected of ['local-cache-full','supabase-query-timeout','supabase-http-500','multiple-auth-clients','patch-confirmation-timeout','duplicate-supabase-client'])if(!codes.includes(expected))throw new Error('não detectou erro real do Safari: '+expected+'; codes='+codes.join(','));
 console.log('AUDITOR_V9363_SCENARIOS_OK');
})().catch(e=>{console.error(e);process.exit(1)});
