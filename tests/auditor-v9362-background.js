const fs=require('fs'),vm=require('vm');
const source=fs.readFileSync('release-auditor-smart-v9360.js','utf8');
let visualCalls=0,fullCalls=0;
const local=new Map(),listeners=[];
const dummy={innerHTML:'',style:{},textContent:'',appendChild(){},remove(){},querySelector(){return null},querySelectorAll(){return[]},closest(){return null}};
const activePage={id:'dashboard'};
const document={readyState:'complete',body:{...dummy},head:{...dummy},documentElement:dummy,querySelector(sel){return sel==='.page.active'?activePage:null},querySelectorAll(){return[]},getElementById(id){return id==='appShell'?dummy:null},addEventListener(type,fn){listeners.push(['document',type,fn])},createElement(tag){return {...dummy,tagName:tag.toUpperCase(),click(){}}}};
class MO{constructor(cb){this.cb=cb}observe(){} disconnect(){}}
class PO{constructor(cb){this.cb=cb}observe(){} disconnect(){}} PO.supportedEntryTypes=[];
const window={document,HLGB_RELEASE_VERSION:'93.56',navigator:{onLine:true},location:{href:'https://teste.local/'},addEventListener(type,fn){listeners.push(['window',type,fn])},
 hlgbRuntimeProfiler9292:{snapshot(){return {activeCount:1,active:[],suspect:[]}}},hlgbPayrollWalRace9346:{status(){return {recordInstalls:1,reliableInstalls:1,saveInstalls:2}}},
 hlgbInternalAuditor:{runtimeErrors:[],latest(){return null},redactDiagnostic:x=>x,async run(mode,save){fullCalls++;if(mode!=='full'||save!==false)throw new Error('modo diario incorreto');return {completedAt:new Date().toISOString(),summary:{result:'Aprovado',pass:20,warn:0,fail:0}}},async buildSyncDiagnostic(){return {summary:{normalizedPending:0,walLocalStorage:0,walIndexedDb:0},runtime:{guards:{wrapperChains:{recordSave:{depth:16}}}}}}},
 hlgbOperationalAuditor9314:{run(){return {summary:{pass:5,warn:0,fail:0}}}},hlgbAuditorRunVisualSweep:async()=>{visualCalls++;return {completedAt:new Date().toISOString(),summary:{result:'Aprovado',pass:10,warn:0,fail:0}}},
 hlgbAuditorBlackbox9299:{async collect(){return {pendingAnalysis:{retryLoops:0,conflicts:0}}}},setTimeout(fn){return 1},clearTimeout(){},setInterval(){return 1},clearInterval(){},MutationObserver:MO,PerformanceObserver:PO,
 Blob:class{constructor(parts){this.parts=parts}},URL:{createObjectURL(){return 'blob:test'},revokeObjectURL(){}},alert(){},openModal(){},closeModal(){},currentUser(){return {name:'Teste'}}};
const context={window,document,navigator:window.navigator,location:window.location,localStorage:{getItem:k=>local.get(k)||null,setItem:(k,v)=>local.set(k,String(v)),removeItem:k=>local.delete(k)},MutationObserver:MO,PerformanceObserver:PO,Blob:window.Blob,URL:window.URL,alert:window.alert,setTimeout:window.setTimeout,clearTimeout:window.clearTimeout,setInterval:window.setInterval,clearInterval:window.clearInterval,console,Date,JSON,Math,Promise,Map,Set,structuredClone:v=>JSON.parse(JSON.stringify(v))};
vm.createContext(context);vm.runInContext(source,context,{filename:'release-auditor-smart-v9360.js'});
(async()=>{
 const row=await window.hlgbAuditorSmart.run('first-access-daily');
 if(!row||fullCalls!==1)throw new Error('auditoria diaria nao usou caminho full silencioso');
 if(visualCalls!==0)throw new Error('auditoria diaria chamou varredura visual');
 const hist=window.hlgbAuditorSmart.hist();if(!hist.length||hist[0].background!==true)throw new Error('historico nao marcou auditoria em segundo plano');
 const analysis=window.hlgbAuditorSmart.classifyProblem(
  {summary:{normalizedPending:1,walLocalStorage:1,walIndexedDb:1},runtime:{guards:{wrapperChains:{recordSave:{depth:30}}}}},
  {findings:[{code:'record-wrapper-growth',detail:'wrappers cresceram'}]},
  {duplicates:[{},{}]},
  {pendingAnalysis:{retryLoops:2,conflicts:1}}
 );
 if(!analysis.observed.some(x=>x.code==='sync-pending'))throw new Error('nao classificou sintoma de sincronizacao');
 if(!analysis.probableCauses.some(x=>x.code==='wrapper-chain-deep'))throw new Error('nao classificou cadeia profunda');
 if(!analysis.probableCauses.some(x=>x.code==='retry-loop'))throw new Error('nao classificou loop de retry');
 console.log('AUDITOR_V9362_BACKGROUND_OK');
})().catch(e=>{console.error(e);process.exit(1)});
