const fs=require('fs'),vm=require('vm');
const code=fs.readFileSync('release-auditor-autocorrect-v9444.js','utf8');
const store=new Map();
const localStorage={getItem:k=>store.has(k)?store.get(k):null,setItem:(k,v)=>store.set(k,String(v)),removeItem:k=>store.delete(k)};
const LEARNING='hlgb_auditor_repair_learning_v9441',EVENTS='hlgb_auditor_repair_events_v9441';
const document={querySelector:()=>null,getElementById:()=>null,head:{appendChild(){}},documentElement:{appendChild(){}}};
const window={__HLGB_AUTH_READY:true,HLGB_RELEASE_VERSION:'94.43',HLGB_AUDITOR_AUTOCORRECT_9443:'94.43',addEventListener(){},hlgbAuditorAutoCorrect9441:{downloadReport(){}},hlgbAuditorAutoCorrect9443:{version:'94.43',prepare:async reason=>({ok:true,ready:true,reason,productionCoordinator:{ready:true}}),run:null}};
const context={window,document,localStorage,console,setTimeout,clearTimeout,Date,JSON,Math,Promise,structuredClone:global.structuredClone};
context.globalThis=context;vm.createContext(context);
// Migração estrita da assinatura observada em produção: 1 tentativa foi contada como 2 falhas.
localStorage.setItem(LEARNING,JSON.stringify({'production-reconcile|general':{recipeId:'production-reconcile',fingerprint:'general',level:'B',observations:0,attempts:1,verifiedSuccesses:0,failures:2,recurrences:0,confidence:0.49,lastSeenVersion:'94.41',proofType:''}}));
vm.runInContext(code,context,{filename:'release-auditor-autocorrect-v9444.js'});
const api=window.hlgbAuditorAutoCorrect9444;
if(!api||api.version!=='94.44')throw new Error('API v94.44 ausente');
const migration=api.migrateKnownDoublePenalty(),migrated=JSON.parse(localStorage.getItem(LEARNING))['production-reconcile|general'];
if(migration.changed!==true||migrated.failures!==1||migrated.confidence!==0.67)throw new Error('migração histórica incorreta '+JSON.stringify({migration,migrated}));
// Uma falha nova da base v94.41 é registrada duas vezes internamente; v94.44 deve remover só a duplicata.
localStorage.setItem(LEARNING,JSON.stringify({'production-reconcile|general':{recipeId:'production-reconcile',fingerprint:'general',level:'B',observations:0,attempts:0,verifiedSuccesses:0,failures:0,recurrences:0,confidence:0.85,lastSeenVersion:'94.44',proofType:''}}));
localStorage.setItem(EVENTS,'[]');
window.hlgbAuditorAutoCorrect9443.run=async()=>{
 const all=JSON.parse(localStorage.getItem(LEARNING)),r=all['production-reconcile|general'];r.attempts+=1;r.failures+=2;r.confidence=0.49;all['production-reconcile|general']=r;localStorage.setItem(LEARNING,JSON.stringify(all));
 localStorage.setItem(EVENTS,JSON.stringify([{kind:'repair-attempt',runId:'run-v9444-test',recipeId:'production-reconcile',status:'failed'}]));
 return {version:'94.43',runId:'run-v9444-test',passes:1,stopReason:'teste',corrected:[],stillFailing:[],blocked:[],unverified:[],report:{version:'94.43',run:{version:'94.43',runId:'run-v9444-test'},learning:{}}};
};
(async()=>{
 const out=await api.run({render:false,download:false,reason:'unit'}),row=JSON.parse(localStorage.getItem(LEARNING))['production-reconcile|general'];
 if(out===false||out.version!=='94.44'||out.report?.version!=='94.44')throw new Error('wrapper v94.44 não atualizou versão '+JSON.stringify(out));
 if(row.attempts!==1||row.failures!==1||row.confidence!==0.67)throw new Error('falha ainda foi penalizada duas vezes '+JSON.stringify(row));
 if(out.learningFailureAccounting?.changes?.[0]?.duplicatesRemoved!==1)throw new Error('deduplicação não registrada '+JSON.stringify(out.learningFailureAccounting));
 if(out.report?.learning?.['production-reconcile|general']?.confidence!==0.67)throw new Error('relatório não refletiu aprendizado corrigido '+JSON.stringify(out.report?.learning));
 console.log('AUDITOR_AUTOCORRECT_V9444_LEARNING_OK',JSON.stringify({migration:{failures:migrated.failures,confidence:migrated.confidence},newFailure:{failures:row.failures,confidence:row.confidence},dedup:out.learningFailureAccounting}));
})().catch(e=>{console.error(e);process.exit(1)});
