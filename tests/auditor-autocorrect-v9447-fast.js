const fs=require('fs'),vm=require('vm');
function ok(v,m){if(!v)throw new Error(m)}
const code=fs.readFileSync('release-auditor-autocorrect-v9447.js','utf8');
ok(code.includes("const V='94.47'"),'versão v94.47 ausente');
ok(code.includes('pendingTechnicalRecent')&&code.includes('pendingBusiness'),'triagem precisa separar pendência técnica de negócio');
ok(code.includes('operationPending')&&code.includes("['sync:pending','issues:open'"),'fila operacional/avisos guarda-chuva precisam ser tratados separadamente');
ok(code.includes('historicalBacklog')&&code.includes('needsCode')&&code.includes('businessBlocked'),'resultado compacto de triagem ausente');
ok(code.includes('repairSkipped:true')&&code.includes('passes:0'),'fast path precisa evitar rodada inútil');
ok(!/hlgbRecordSaveWithRetry\s*\(/.test(code)&&!/persistDb\s*\(/.test(code),'v94.47 não pode escrever dado de negócio');
ok(!/removeItem\s*\(\s*['"]hlgb_(records_pending|durable_wal)/.test(code),'v94.47 não pode apagar fila diretamente');

const storage={};
const now=Date.now(),old=new Date(now-2*60*60*1000).toISOString();
const oldIssues=Array.from({length:116},(_,i)=>({id:'old-'+i,status:'Aberto',title:'Falha ao salvar production',detail:'Falha ao salvar production',lastSeenAt:old}));
const audit={main:{summary:{total:31,pass:29,warn:2,fail:0,result:'Atenção'},checks:[{code:'sync:pending',status:'warn',title:'Pendências locais de sincronização',detail:'21 registro(s) aguardando sincronização.'},{code:'issues:open',status:'warn',title:'Erros abertos na Central',detail:'124 aberto(s); 124 de alta prioridade.'}]},operations:{pending:{unique:0,records:0,wal:0,totalCopies:0},delivery:{status:'pass'},savingUi:{status:'pass'},runtime:{status:'pass'}}};
const candidates=[{id:'a'},{id:'b'},{id:'c'},{id:'d'}];
const events=[
 {recipeId:'production-reconcile',recordId:'a',status:'unverified',detail:'Reteste da fila, operação ou prova remota incompleta',at:new Date(now-1000).toISOString()},
 {recipeId:'production-reconcile',recordId:'b',status:'unverified',detail:'Reteste da fila, operação ou prova remota incompleta',at:new Date(now-900).toISOString()},
 {recipeId:'production-reconcile',recordId:'c',status:'failed',detail:'business-difference',at:new Date(now-800).toISOString()},
 {recipeId:'production-reconcile',recordId:'d',status:'failed',detail:'business-difference',at:new Date(now-700).toISOString()}
];
let legacyRuns=0;
const window={
 __HLGB_AUTH_READY:true,HLGB_RELEASE_VERSION:'94.46',HLGB_AUDITOR_AUTOCORRECT_9446:'94.46',
 hlgbAuditorAutoCorrect9446:{run:async()=>{legacyRuns++;return {version:'94.46'}},prepare:async()=>({ok:true,ready:true})},
 hlgbAuditorAutoCorrect9441:{silentAudit:async()=>audit,repairEvents:()=>events},
 hlgbAuditorIntelligence9396:{currentMetrics:()=>({metrics:{pendingUnique:21,pendingBusiness:21,pendingTechnicalRecent:0,pendingTechnicalHistorical:0,scriptDuplicates:0,saveDuplicateResponsibilities:0}})},
 hlgbDiagnosticsCenter:{getIssues:()=>oldIssues},
 hlgbProductionReconcile9439:{candidates:async()=>candidates},
 addEventListener:()=>{}
};
const ctx={window,localStorage:{getItem:k=>storage[k]??null,setItem:(k,v)=>{storage[k]=String(v)}},navigator:{userAgent:'test'},console,setTimeout,clearTimeout,Date,JSON,Blob:class{},URL:{createObjectURL:()=>'',revokeObjectURL:()=>{}},structuredClone:v=>JSON.parse(JSON.stringify(v))};
vm.createContext(ctx);vm.runInContext(code,ctx);
(async()=>{
 const out=await window.hlgbAuditorAutoCorrect9447.run({reason:'test-fast',render:false,download:false});
 ok(out?.version==='94.47','resultado não foi promovido para v94.47');
 ok(out.repairSkipped===true&&out.passes===0,'não deveria executar reparo com fila operacional zerada');
 ok(legacyRuns===0,'motor legado foi chamado apesar de não existir trabalho técnico vivo');
 ok(out.needsCode?.length===2,'dois casos de prova incompleta deveriam virar tarefa de código');
 ok(out.businessBlocked?.length===2,'dois business-difference deveriam ficar fora do ciclo técnico');
 ok(out.unverified?.length===2,'histórico antigo não pode inflar não verificados');
 ok(out.historicalBacklog?.count===116,'histórico antigo deveria ser resumido, não reprocessado');
 ok(out.triage?.signal?.operationalQueue?.unique===0&&out.triage?.signal?.reportedPendingUnique===21&&out.triage?.signal?.pendingBusiness===21,'mismatch fila real x negócio não foi preservado na triagem');
 console.log('AUDITOR_AUTOCORRECT_V9447_FAST_OK',JSON.stringify({passes:out.passes,needsCode:out.needsCode.length,businessBlocked:out.businessBlocked.length,historical:out.historicalBacklog.count,legacyRuns}));
})().catch(e=>{console.error(e);process.exit(1)});
