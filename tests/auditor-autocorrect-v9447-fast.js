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
 window.db={materialChecklists:[{id:'check-1',productId:'model-1',destinationType:'F',materials:[]},{id:'check-2',productId:'model-2',destinationType:'F',materials:[]},{id:'check-3',productId:'model-1',destinationType:'F',materials:[{qty:1}]},{id:'check-4',productId:'model-1',destinationType:'I',materials:[]}],products:[{id:'model-1',materials:[{qty:1}]}],materials:[]};
 window.hlgbFactionMaterialRefresh9522={analyze:c=>({status:'stale',materials:[{qty:1}],locked:c.id==='check-1'})};
 const before=JSON.stringify(window.db);
 const out=await window.hlgbAuditorAutoCorrect9447.run({reason:'test-fast',render:false,download:false});
 const proof=out.report.factionChecklistEvidence9729;
 ok(proof.observed===true&&proof.checked===3&&proof.emptyWithSheet===1&&proof.missingOrInvalid===1&&proof.locked===1,'empty checklist evidence with missing identity separated');
 ok(proof.items[0].checklistId==='check-1'&&proof.items[0].expected===1&&proof.items[0].requiresManual===true,'trace and locked flag');
 ok(proof.remoteConfirmed===false&&proof.canRepair===false&&JSON.stringify(window.db)===before,'read-only local evidence');
 ok(out?.version==='94.47','resultado não foi promovido para v94.47');
 ok(out.auditCompleted===true&&out.report.auditCompleted===true,'auditoria concluída deve ter prova explícita no relatório');
 ok(out.repairSkipped===true&&out.passes===0,'não deveria executar reparo com fila operacional zerada');
 ok(legacyRuns===0,'motor legado foi chamado apesar de não existir trabalho técnico vivo');
 ok(out.needsCode?.length===2,'dois casos de prova incompleta deveriam virar tarefa de código');
 ok(out.businessBlocked?.length===2,'dois business-difference deveriam ficar fora do ciclo técnico');
 ok(out.unverified?.length===2,'histórico antigo não pode inflar não verificados');
 ok(out.historicalBacklog?.count===116,'histórico antigo deveria ser resumido, não reprocessado');
 ok(out.triage?.signal?.operationalQueue?.unique===0&&out.triage?.signal?.reportedPendingUnique===21&&out.triage?.signal?.pendingBusiness===21,'mismatch fila real x negócio não foi preservado na triagem');
 const compact=require('./auditor-triage-inventory-assert.cjs');compact(out);
 for(const [status,count,id] of [['error',null,'sync:indexeddb-unverified'],['timeout',null,'sync:indexeddb-unverified'],['ok',1,'sync:indexeddb-wal']]){
  const extra={id,classification:'needs-code'};
  const candidate={...out,triage:{...out.triage,signal:{...out.triage.signal,indexedDbWal:{status,count}}},needsCode:[...out.needsCode,extra],unverified:[...out.unverified,extra]};
  ok(compact(candidate).needs===3,'valid independent WAL finding');
  let rejects=false;try{compact({...candidate,needsCode:out.needsCode})}catch(_){rejects=true}ok(rejects,'WAL evidence must not disappear');
 }
 let rejects=false;try{compact({...out,needsCode:[...out.needsCode,{id:'arbitrary'}]})}catch(_){rejects=true}ok(rejects,'arbitrary task rejected');
 // A report with no valid audit cannot be published as completed.
 const savedAudit=window.hlgbAuditorAutoCorrect9441.silentAudit;
 window.hlgbAuditorAutoCorrect9441.silentAudit=async()=>({...audit,main:{...audit.main,summary:{total:31,pass:29,warn:2,fail:1,result:'Falhou'}}});
 const invalid=await window.hlgbAuditorAutoCorrect9447.run({reason:'invalid-summary',render:false,download:false});
 ok(invalid.auditCompleted!==true&&/interrompida/i.test(invalid.stopReason),'resumo inválido não pode virar auditoria concluída');
 window.hlgbAuditorAutoCorrect9441.silentAudit=savedAudit;
 // A falha de dependência deve expor o reparador que realmente faltou.
 window.hlgbAuditorAutoCorrect9446.prepare=async()=>({ok:false,ready:false,
  recordLearningIsolation:{saved:false},
  basePreparation:{ok:false,ready:false,error:'Timeout aguardando reparadores reais: rapid-heal',missing:['rapid-heal']}});
 const failedPrep=await window.hlgbAuditorAutoCorrect9447.prepare('test-failed-preparation');
 ok(failedPrep.ok===false&&failedPrep.ready===false,'falha antiga não pode virar preparação aprovada');
 ok(failedPrep.error.includes('rapid-heal'),'erro original deve chegar à v94.47');
 ok(failedPrep.missing.includes('rapid-heal')&&failedPrep.missing.includes('record-learning-storage'),'listar tanto a dependência quanto o armazenamento de aprendizagem');
 console.log('AUDITOR_AUTOCORRECT_V9447_FAST_OK',JSON.stringify({passes:out.passes,needsCode:out.needsCode.length,businessBlocked:out.businessBlocked.length,historical:out.historicalBacklog.count,legacyRuns}));
})().catch(e=>{console.error(e);process.exit(1)});
