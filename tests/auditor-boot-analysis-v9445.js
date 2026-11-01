const fs=require('fs'),vm=require('vm'),path=require('path');
const ROOT=path.resolve(__dirname,'..');
function ok(cond,msg){if(!cond)throw new Error(msg)}
function source(file){return fs.readFileSync(path.join(ROOT,file),'utf8')}
function base(){
 const scripts=[],timers=[];
 const makeEl=(tag='div')=>({tagName:String(tag).toUpperCase(),style:{},dataset:{},hidden:false,children:[],appendChild(el){scripts.push(el);return el},remove(){},setAttribute(){},removeAttribute(){},addEventListener(){},querySelector(){return null},querySelectorAll(){return[]},closest(){return null},insertAdjacentElement(){},prepend(){},click(){},textContent:'',innerHTML:''});
 const head=makeEl('head'),body=makeEl('body');
 const c={console,Date,Math,JSON,Promise,Map,Set,Array,Object,String,Number,Boolean,RegExp,URL,Blob:global.Blob};
 c.window=c;c.globalThis=c;c.location={href:'https://example.test/app-stable3.html'};c.navigator={onLine:true};
 c.setTimeout=(fn,ms=0)=>{timers.push({fn,ms});return timers.length};c.clearTimeout=()=>{};c.addEventListener=()=>{};
 c.document={head,body,documentElement:head,createElement:makeEl,getElementById:()=>null,querySelector:()=>null,querySelectorAll:()=>[],addEventListener(){}};
 c.hlgbBootTimeline9379={snapshot:()=>({session:'boot-v9445',startedWall:1,installedWall:1,coverage:{preInstrumentationGapMs:0,preInstrumentationMeasured:true},authReady:true,resourceCount:20})};
 c.hlgbSyncGuard9306={status:()=>({earlyBoot:{blockedPreAuthLoads:0,blockedPreAuthCutSync:0,sessionRestoreLoadsAllowed:true}})};
 c.hlgbCutViewGuard={status:()=>({})};
 c.__timers=timers;return c;
}
function pair(seq,name,kind,{authReady=true,sessionRestoring=false,appVisible=true,stack='',duration=1,blocked=false}={}){
 return [
  {seq,type:kind+':start',name,monoMs:seq*10,authReady,sessionRestoring,activePage:'dashboard',appVisible,data:{stack,blockedByEarlyGate:blocked}},
  {seq:seq+1,type:kind+':return',name,monoMs:seq*10+duration,authReady,sessionRestoring,activePage:'dashboard',appVisible,data:{syncDurationMs:duration,blockedByEarlyGate:blocked}}
 ];
}
const stack=caller=>'Error\n    at traced (https://example.test/release-auditor-call-trace-v9380.js:20:10)\n    at wrapped (https://example.test/release-record-integrity.js:378:38)\n    at '+caller;
(async()=>{
 const c=base();let events=[];c.hlgbAuditorCallTrace9380={snapshot:()=>({wrapped:['hlgbRecordLoadBundle','renderAll'],eventCount:events.length,events})};
 vm.runInNewContext(source('release-auditor-boot-analysis-v9381.js'),c,{filename:'release-auditor-boot-analysis-v9381.js'});
 const api=c.hlgbAuditorBootAnalysis9381;ok(api?.version==='94.45','analisador v94.45 ausente');
 // 1) Cinco leituras de restauração são necessárias e não podem virar alerta de duplicidade.
 events=[];for(let i=0;i<5;i++)events.push(...pair(i*2+1,'hlgbRecordLoadBundle','load',{authReady:false,sessionRestoring:true,appVisible:false,stack:stack('restoreSession (https://example.test/app-stable3.html:20:5)')}));
 let r=api.analyze();
 ok(r.status==='pass','restauração necessária virou warning: '+JSON.stringify(r.reasons));
 ok(r.summary.sessionRestoreLoads===5&&r.summary.duplicateLoadGroups===0,'restore/duplicidade classificados errado '+JSON.stringify(r.summary));
 ok(r.duplicateGroups.length===0,'restore apareceu em duplicateGroups');
 // 2) Mesma função chamada uma vez por três origens diferentes não é duplicidade do chamador.
 events=[
  ...pair(1,'hlgbRecordLoadBundle','load',{stack:stack('callerA (https://example.test/a.js:1:1)')}),
  ...pair(3,'hlgbRecordLoadBundle','load',{stack:stack('callerB (https://example.test/b.js:1:1)')}),
  ...pair(5,'hlgbRecordLoadBundle','load',{stack:stack('callerC (https://example.test/c.js:1:1)')})
 ];
 r=api.analyze();
 ok(r.status==='pass'&&r.summary.duplicateLoadGroups===0,'origens distintas criaram falso positivo '+JSON.stringify(r));
 ok(r.loads[0].callers.length===3,'origens reais não foram separadas '+JSON.stringify(r.loads[0]));
 ok(r.loads[0].callers.every(x=>!x.includes('release-record-integrity')),'wrapper interno apareceu como origem '+JSON.stringify(r.loads[0].callers));
 // 3) Mesma função, mesmo chamador pós-login, repetida: deve alertar e apontar o chamador externo real.
 const realCaller='loadDashboardData (https://example.test/app-stable3.html:777:9)';
 events=[...pair(1,'hlgbRecordLoadBundle','load',{stack:stack(realCaller)}),...pair(3,'hlgbRecordLoadBundle','load',{stack:stack(realCaller)})];
 r=api.analyze();
 ok(r.status==='warn'&&r.summary.duplicateLoadGroups===1,'duplicidade real não gerou warning '+JSON.stringify(r));
 ok(r.duplicateGroups[0].count===2&&r.duplicateGroups[0].caller.includes('loadDashboardData'),'chamador real não identificado '+JSON.stringify(r.duplicateGroups[0]));
 ok(!r.duplicateGroups[0].caller.includes('release-record-integrity'),'wrapper interno mascarou chamador '+r.duplicateGroups[0].caller);
 ok(r.reasons.some(x=>x.includes('mesma função pelo mesmo chamador')),'motivo de duplicidade não ficou explícito '+JSON.stringify(r.reasons));
 // 4) Chamada lenta continua sendo warning independente da nova regra de duplicidade.
 events=[...pair(1,'renderAll','render',{stack:stack('bootRender (https://example.test/app-stable3.html:888:3)'),duration:116,appVisible:true})];
 r=api.analyze();
 ok(r.status==='warn'&&r.summary.slowSyncCalls===1,'render lento deixou de ser alertado '+JSON.stringify(r));
 ok(r.summary.duplicateLoadGroups===0,'render lento criou duplicidade de carga');
 console.log('AUDITOR_BOOT_ANALYSIS_V9445_OK',JSON.stringify({restoreIgnored:true,distinctCallersSafe:true,sameCallerDetected:true,realCaller:true,slowStillWarns:true}));
})().catch(e=>{console.error(e.stack||e);process.exit(1)});
