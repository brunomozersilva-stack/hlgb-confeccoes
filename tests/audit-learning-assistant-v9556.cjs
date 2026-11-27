const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const script=fs.readFileSync(path.join(__dirname,'..','release-auditor-learning-assistant-v9556.js'),'utf8');
const loader=fs.readFileSync(path.join(__dirname,'..','release-auditor-autocorrect-v9448.js'),'utf8');
assert.match(loader,/release-auditor-learning-assistant-v9556\.js/);
assert.match(loader,/hlgb:authenticated/);
const storage=new Map(),writes=[];
const localStorage={
 getItem(k){return storage.has(k)?storage.get(k):null},
 setItem(k,v){writes.push(k);storage.set(k,String(v))}
};
let current;
let reportReads=0;const window={__HLGB_AUTH_READY:true,__HLGB_TEST__:true,hlgbAuditorAutoCorrect9448:{exportReport:()=>{reportReads++;return current}}};
const document={hidden:false,getElementById(){return null}};
const context={window,localStorage,document,navigator:{userAgent:'Mozilla/5.0 Safari/605.1'},Date,console,setTimeout(){throw Error('Test mode cannot schedule runtime tasks')},setInterval(){throw Error('Test mode cannot start timers')}};
vm.createContext(context);
vm.runInContext(script,context);
const api=window.hlgbAuditorLearningAssistant9556;
assert.equal(api.version,'95.56');
const base=()=>({
 kind:'hlgb_autocorrect_report',appVersion:'94.51',
 operationalCoverage:{checks:{delivery:'not-tested'},liveCrossDeviceProof:false},
 run:{runId:'run-a',fixed:0,stopReason:'Sem progresso adicional',needsCode:[
  {id:'sync:indexeddb-wal',action:'review-indexeddb-pending',detail:'25 operações no WAL'},
  {id:'structure:duplicate-scripts',action:'review-script-loader',detail:'script duplicado'},
  {id:'1793126491713',action:'production-reconcile',detail:'sem prova remota'}
 ],stillFailing:[
  {id:'issue-123',title:'Falha ao salvar production',detail:'secret customer payment string'},
  {id:'1793126491713',action:'production-reconcile',detail:'sem prova remota'}
 ],blocked:[
  {code:'data:finance-projection-orphan',refs:[{module:'finance',id:'1788606175817'}],detail:'Pago R$ 5379'},
  {id:'business:finance-projection-orphan:1788606175817',refs:[{module:'finance',id:'1788606175817'}],detail:'Pago R$ 5379'}
 ]},
 finalAudit:{checks:[{code:'sync:indexeddb-wal',status:'warn',detail:'25 WAL'},{code:'data:finance-projection-orphan',status:'fail',refs:[{module:'finance',id:'1788606175817'}]}]}
});
current=base();
let result=api.collect();
assert.equal(result.ok,true);
assert.equal(result.findings,4); // WAL, duplicate script, Production, finance
let history=JSON.parse(JSON.stringify(api.history()));
assert.equal(history.length,4);
assert(history.every(x=>x.observedRuns===1&&x.recurrences===0));
result=api.collect();
assert.equal(result.repeatedRun,true);
assert.deepEqual(JSON.parse(JSON.stringify(api.history())),history);
let pack=JSON.parse(JSON.stringify(api.pack()));
assert.equal(pack.readOnly,true);
assert.equal(pack.coverage.liveCrossDeviceProof,false);
assert.equal(pack.diagnoses.length,4);
assert(pack.diagnoses.find(x=>x.kind==='wal').safetyRule.includes('Nunca excluir'));
assert.equal(pack.diagnoses.find(x=>x.kind==='wal').affectedInReport,1,'same WAL alert must not be counted twice');
const actual=base();actual.run.triage={signal:{indexedDbWal:{status:'ok',count:26}}};
assert.equal(api.findings(actual).find(x=>x.kind==='wal').affected,26,'verified inventory is the count of affected operations');
actual.run.triage.signal.indexedDbWal.status='timeout';
assert.equal(api.findings(actual).find(x=>x.kind==='wal').affected,1,'unverified inventory cannot be treated as proved');
assert(pack.diagnoses.find(x=>x.kind==='finance').safetyRule.includes('Não criar'));
assert.equal(JSON.stringify(pack).includes('secret customer payment string'),false);
assert.equal(JSON.stringify(pack).includes('1788606175817'),false);
assert.equal([...storage.values()].join('\n').includes('secret customer payment string'),false);
assert.equal([...storage.values()].join('\n').includes('1788606175817'),false);
current=base();current.run.runId='run-b';
result=api.collect();
assert.equal(result.ok,true);
assert(api.history().every(x=>x.observedRuns===2&&x.recurrences===1));
current=base();assert.equal(api.collect().repeatedRun,true,'nonconsecutive repeated run');
assert(api.history().every(x=>x.observedRuns===2&&x.recurrences===1));
current.run.runId='run-incomplete';current.auditCompleted=false;
assert.equal(api.collect().reason,'incomplete-audit');assert(api.history().every(x=>x.observedRuns===2));
current=base();current.run.runId='run-b';
context.navigator.userAgent='Mozilla/5.0 Chrome/130.0 Safari/537.36';
assert.equal(api.pack().browserFamily,'Chrome','Chrome UA includes Safari token');
assert.equal(api.pack().runSummary.auditCompleted,false,'missing completion is not proof');
current.auditCompleted=true;assert.equal(api.pack().runSummary.auditCompleted,true);
assert.equal(api.pack().localDeduplication.windowLimit,500);
assert.equal(api.disable(),true);
current.run.runId='run-c';
assert.equal(api.collect().reason,'disabled');
assert(api.history().every(x=>x.observedRuns===2));
assert.equal(api.enable(),true);
assert(api.history().every(x=>x.observedRuns===3));
window.__HLGB_AUTH_READY=false;
current.run.runId='run-d';
assert.equal(api.collect().reason,'not-authenticated');
assert.equal(api.download(),false);
assert.equal(api.history().length,0);assert.equal(api.pack().reason,'not-authenticated');assert.equal(api.status().historyCount,0);
assert(writes.every(k=>/^hlgb_auditor_diagnostic_(cases|assistant_disabled)_v9556$/.test(k)),'No business data or WAL keys may be modified');
console.log('PASS Auditor learning assistant: recurring incidents, diagnostic pack, privacy, auth, disable and WAL safety');

// Cheap producer stamp prevents repeated cloning/processing on the same audit.
window.__HLGB_AUTH_READY=true;current=base();current.run.runId='poll-1';current.auditCompleted=true;window.hlgbAuditorAutoCorrect9448.reportStamp=()=>JSON.stringify([current.run.runId,current.auditCompleted]);const reads=reportReads;assert.equal(api.poll(),true);assert.equal(reportReads,reads+1);for(let i=0;i<20;i++)api.poll();assert.equal(reportReads,reads+1);assert.equal(api.status().pollSkippedUnchanged,20);current.run.runId='poll-2';api.poll();assert.equal(reportReads,reads+2);document.hidden=true;current.run.runId='poll-3';assert.equal(api.poll(),false);assert.equal(reportReads,reads+2);document.hidden=false;api.poll();assert.equal(reportReads,reads+3);delete window.hlgbAuditorAutoCorrect9448.reportStamp;api.poll();assert.equal(reportReads,reads+4,'legacy fallback remains');
const missing={run:{runId:'feature-test',needsCode:[{code:'cut:missing-control',detail:'botao imprimir ausente'}]},finalAudit:{checks:[]}};assert.equal(api.findings(missing)[0].kind,'feature');assert.equal(api.collect({...missing,executionFailed:true}).reason,'incomplete-audit');assert.equal(api.findings({run:{needsCode:[{code:'cut:unknown',detail:'missing-control text only'}]}})[0].kind,'general');
console.log('PASS cheap report polling, hidden-tab guard and explicit regression triage');
