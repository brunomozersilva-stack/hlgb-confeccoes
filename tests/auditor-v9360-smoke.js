const fs=require('fs'),vm=require('vm');
const source=fs.readFileSync('release-auditor-smart-v9360.js','utf8');
const must=["Testar sistema","Registrar problema","Histórico","HLGB_AUDITOR_SMART_9360"];
for(const s of must){if(!source.includes(s))throw new Error('Falta marcador esperado: '+s)}
for(const bad of [/window\.hlgbRecordSaveWithRetry\s*=/,/window\.cloudRequest\s*=/,/window\.setInterval\s*=/,/window\.setTimeout\s*=/]){
 if(bad.test(source))throw new Error('Auditor não deve sobrescrever função crítica: '+bad);
}
const listeners=[];
const local=new Map();
const dummy={innerHTML:'',style:{},textContent:'',appendChild(){},remove(){},querySelector(){return null},querySelectorAll(){return[]},closest(){return null}};
const document={
 readyState:'complete',body:{...dummy,appendChild(){}},head:{...dummy,appendChild(){}},documentElement:dummy,
 querySelector(){return null},querySelectorAll(){return[]},getElementById(){return null},
 addEventListener(type,fn){listeners.push(['document',type,fn])},createElement(tag){return {...dummy,tagName:tag.toUpperCase(),click(){}}}
};
const window={
 addEventListener(type,fn){listeners.push(['window',type,fn])},document,
 HLGB_RELEASE_VERSION:'93.56',navigator:{onLine:true},location:{href:'https://teste.local/'},
 hlgbRuntimeProfiler9292:{snapshot(){return {activeCount:1,suspect:[]}}},
 hlgbInternalAuditor:{runtimeErrors:[],latest(){return null},redactDiagnostic:x=>x,async buildSyncDiagnostic(){return {summary:{normalizedPending:0,walLocalStorage:0,walIndexedDb:0}}}},
 hlgbAuditorBlackbox9299:{async collect(){return {kind:'blackbox-test'}}},
 hlgbAuditorRunVisualSweep:async()=>({completedAt:new Date().toISOString(),summary:{result:'Aprovado',pass:10,warn:0,fail:0}}),
 setTimeout(fn){return 1},clearTimeout(){},setInterval(){return 1},clearInterval(){},
 MutationObserver:class{observe(){} disconnect(){}},PerformanceObserver:class{constructor(){} observe(){} disconnect(){} static supportedEntryTypes=[]},
 Blob:class{constructor(parts){this.parts=parts}},URL:{createObjectURL(){return 'blob:test'},revokeObjectURL(){}},alert(){},openModal(){},closeModal(){},currentUser(){return {name:'Teste'}}
};
const context={window,document,navigator:window.navigator,location:window.location,localStorage:{getItem:k=>local.get(k)||null,setItem:(k,v)=>local.set(k,String(v)),removeItem:k=>local.delete(k)},MutationObserver:window.MutationObserver,PerformanceObserver:window.PerformanceObserver,Blob:window.Blob,URL:window.URL,alert:window.alert,setTimeout:window.setTimeout,clearTimeout:window.clearTimeout,setInterval:window.setInterval,clearInterval:window.clearInterval,console,Date,JSON,Math,Promise,Map,Set};
vm.createContext(context);vm.runInContext(source,context,{filename:'release-auditor-smart-v9360.js'});
if(!window.HLGB_AUDITOR_SMART_9360)throw new Error('Auditor não inicializou');
if(typeof window.hlgbAuditorSmart?.problem!=='function')throw new Error('Registrar problema indisponível');
if(typeof window.hlgbAuditorSmart?.run!=='function')throw new Error('Teste do sistema indisponível');
(async()=>{const row=await window.hlgbAuditorSmart.run('smoke');if(!row||row.summary?.fail!==0)throw new Error('Auditoria simulada falhou');const p=await window.hlgbAuditorSmart.problem();if(p?.kind!=='hlgb_bug_capture')throw new Error('Pacote de problema não foi criado');console.log('AUDITOR_V9360_SMOKE_OK');})().catch(e=>{console.error(e);process.exit(1)});
