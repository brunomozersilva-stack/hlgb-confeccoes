const fs=require('fs');
const vm=require('vm');
const assert=require('assert');
const traceSrc=fs.readFileSync('release-auditor-call-trace-v9380.js','utf8');
const analysisSrc=fs.readFileSync('release-auditor-boot-analysis-v9381.js','utf8');
let now=0;const timers=[];
const app={getClientRects:()=>[]};
const result={prepend:()=>{}};
const sandbox={console,Date,Math,Promise,URL,
 performance:{now:()=>now},
 setTimeout:(fn,ms)=>{timers.push({fn,ms});return timers.length},
 document:{querySelector:(sel)=>sel==='.page.active'?{id:'dashboard'}:null,getElementById:(id)=>id==='appShell'?app:id==='hlgbAuditorResult'?result:null,querySelectorAll:()=>[],createElement:()=>({style:{},dataset:{},removeAttribute(){},appendChild(){}}),addEventListener:()=>{},head:{appendChild:()=>{}},documentElement:{appendChild:()=>{}}},
 getComputedStyle:()=>({display:'none',visibility:'visible',opacity:'1'}),
 location:{href:'https://example.test/app-stable3.html'},
 __HLGB_AUTH_READY:false,
 hlgbBootTimeline9379:{mark:()=>{},snapshot:()=>({session:'s1',startedWall:1,installedWall:10,coverage:{preInstrumentationGapMs:9,preInstrumentationMeasured:false},authReady:false,resourceCount:2})}
};
sandbox.window=sandbox;
let loads=0,renders=0;
sandbox.hlgbRecordLoadBundle=function load(){loads++;now+=25;return Promise.resolve({ok:true})};
sandbox.renderHubFinance=function render(){renders++;now+=5;return 7};
vm.createContext(sandbox);vm.runInContext(traceSrc,sandbox);
const p=sandbox.hlgbRecordLoadBundle({});const r=sandbox.renderHubFinance();
assert.strictEqual(r,7,'wrapper deve preservar retorno síncrono');
assert.strictEqual(loads,1);assert.strictEqual(renders,1);
vm.runInContext(analysisSrc,sandbox);
const report=sandbox.hlgbAuditorBootAnalysis9381.analyze();
assert.strictEqual(report.summary.preAuthLoads,1,'carga antes da auth precisa aparecer');
assert.strictEqual(report.summary.hiddenRenders,1,'render oculto precisa aparecer');
assert.strictEqual(report.status,'fail','carga pré-auth deve falhar');
assert(report.loads.some(x=>x.name==='hlgbRecordLoadBundle'&&x.count===1));
assert(report.renders.some(x=>x.name==='renderHubFinance'&&x.hidden===1));
Promise.resolve(p).then(()=>console.log('auditor boot trace v93.81: OK'));
