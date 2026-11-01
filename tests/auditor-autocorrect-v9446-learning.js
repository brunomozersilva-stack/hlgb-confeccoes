const fs=require('fs'),vm=require('vm');
const code=fs.readFileSync('release-auditor-autocorrect-v9446.js','utf8');
const store=new Map(),LEARNING='hlgb_auditor_repair_learning_v9441';
const localStorage={getItem:k=>store.has(k)?store.get(k):null,setItem:(k,v)=>store.set(k,String(v)),removeItem:k=>store.delete(k)};
const document={querySelector:()=>null,getElementById:()=>null,head:{appendChild(){}},documentElement:{appendChild(){}}};
const window={__HLGB_AUTH_READY:true,HLGB_RELEASE_VERSION:'94.45',HLGB_AUDITOR_AUTOCORRECT_9444:'94.44',addEventListener(){},hlgbAuditorAutoCorrect9441:{downloadReport(){}},hlgbProductionReconcile9439:{candidates:async()=>[{id:'1793298514267'},{id:'new-record'}]},hlgbAuditorAutoCorrect9444:{version:'94.44',prepare:async reason=>({ok:true,ready:true,reason}),run:null}};
const context={window,document,localStorage,console,setTimeout,clearTimeout,Date,JSON,Math,Promise,structuredClone:global.structuredClone};context.globalThis=context;vm.createContext(context);
localStorage.setItem(LEARNING,JSON.stringify({
 'production-reconcile|general':{recipeId:'production-reconcile',fingerprint:'general',level:'B',attempts:3,failures:1,confidence:0.67},
 'production-reconcile|production|1793298514267':{recipeId:'production-reconcile',fingerprint:'production|1793298514267',level:'B',attempts:0,failures:2,confidence:0.49}
}));
vm.runInContext(code,context,{filename:'release-auditor-autocorrect-v9446.js'});
const api=window.hlgbAuditorAutoCorrect9446;if(!api||api.version!=='94.46')throw new Error('API v94.46 ausente');
(async()=>{
 const isolated=await api.isolateProductionRecordLearning('unit-first'),all1=JSON.parse(localStorage.getItem(LEARNING));
 const general=all1['production-reconcile|general'],old=all1['production-reconcile|production|1793298514267'],fresh=all1['production-reconcile|production|new-record'];
 if(general.recipeId!=='production-reconcile'||general.confidence!==0.67||general.failures!==1)throw new Error('confiança global foi alterada '+JSON.stringify(general));
 if(old.recipeId!=='production-reconcile-record'||old.parentRecipeId!=='production-reconcile'||old.scope!=='record'||old.confidence!==0.49||old.failures!==2)throw new Error('evidência antiga foi apagada ou não isolada '+JSON.stringify(old));
 if(fresh.recipeId!=='production-reconcile-record'||fresh.confidence!==0.85||fresh.seededBy!=='94.46-record-learning-scope')throw new Error('candidato novo não foi pré-classificado '+JSON.stringify(fresh));
 if(!isolated.changed||isolated.changes.length<1||isolated.seeded.length!==1)throw new Error('isolamento não registrou mudanças '+JSON.stringify(isolated));
 window.hlgbAuditorAutoCorrect9444.run=async()=>{
  const all=JSON.parse(localStorage.getItem(LEARNING));all['production-reconcile|production|late-record']={recipeId:'production-reconcile',fingerprint:'production|late-record',level:'B',failures:1,confidence:0.67};localStorage.setItem(LEARNING,JSON.stringify(all));
  return {version:'94.44',runId:'run-v9446-test',passes:3,stopReason:'teste',corrected:[],stillFailing:[],blocked:[],unverified:[],report:{version:'94.44',appVersion:'94.44',run:{version:'94.44',runId:'run-v9446-test'},learning:{}}};
 };
 const out=await api.run({render:false,download:false,reason:'unit-run'}),all2=JSON.parse(localStorage.getItem(LEARNING)),late=all2['production-reconcile|production|late-record'];
 if(out===false||out.version!=='94.46'||out.report?.version!=='94.46'||out.report?.appVersion!=='94.46')throw new Error('wrapper não promoveu relatório v94.46 '+JSON.stringify(out));
 if(late.recipeId!=='production-reconcile-record'||late.confidence!==0.67||late.failures!==1)throw new Error('registro criado durante execução não foi isolado '+JSON.stringify(late));
 if(out.report.learning['production-reconcile|general']?.confidence!==0.67)throw new Error('relatório perdeu confiança global '+JSON.stringify(out.report.learning));
 console.log('AUDITOR_AUTOCORRECT_V9446_LEARNING_OK',JSON.stringify({general:{confidence:general.confidence,failures:general.failures},record:{confidence:old.confidence,failures:old.failures,recipeId:old.recipeId},seeded:fresh.recipeId,late:late.recipeId}));
})().catch(e=>{console.error(e);process.exit(1)});
