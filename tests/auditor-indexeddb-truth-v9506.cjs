'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const file=fs.readFileSync('release-internal-auditor.js','utf8');
assert(file.includes('await enrichWalAudit9506(row);'),'real audit must await WAL proof');
assert(file.includes('Fila normalizada vazia; este resultado não verifica o WAL durável'),'empty normalized queue must not be presented as global sync success');
const start=file.indexOf('async function enrichWalAudit9506(row){');
const stop=file.indexOf("\nfunction buildRun(",start);
assert(start>0&&stop>start,'WAL helper must exist before buildRun');
const expr=file.slice(start,stop);
async function simulate(evidence){
 let writes=0,reads=0;
 const sandbox={Promise,Number,String,Array,
  setTimeout(fn){return 1},
  indexedDbWalDiagnostic:async()=>{reads++;return evidence},
  check:(code,category,status,title,detail,severity)=>({code,category,status,title,detail,severity}),
  summarize:checks=>{const pass=checks.filter(x=>x.status==='pass').length,warn=checks.filter(x=>x.status==='warn').length,fail=checks.filter(x=>x.status==='fail').length;return{total:checks.length,pass,warn,fail,result:fail?'Falhou':warn?'Atenção':'Aprovado'}},
  now:()=>new Date().toISOString(),
  indexedDB:{deleteDatabase:()=>{writes++;throw Error('mutation')}},
  localStorage:{removeItem:()=>{writes++;throw Error('mutation')}}
 };
 vm.createContext(sandbox);
 vm.runInContext(expr+';this.enrichWalAudit9506=enrichWalAudit9506;',sandbox);
 const row={checks:[{code:'sync:pending',status:'pass',detail:'Fila normalizada vazia'}],summary:{pass:1,warn:0}};
 await sandbox.enrichWalAudit9506(row);
 assert.equal(reads,1,'exactly one read-only IndexedDB scan');
 assert.equal(writes,0,'no persistent data can be modified');
 assert.equal(row.checks.length,2);
 return row;
}
(async()=>{
 const pending=await simulate({available:true,count:7,entries:[]});
 assert.equal(pending.checks[1].status,'warn');
 assert.equal(pending.walEvidence.count,7);
 assert.equal(pending.summary.warn,1);
 assert(pending.checks[1].detail.includes('7 operação'));
 const empty=await simulate({available:true,count:0,entries:[]});
 assert.equal(empty.checks[1].status,'pass');
 assert.equal(empty.walEvidence.verified,true);
 const error=await simulate({available:true,count:0,entries:[],error:'IndexedDB denied'});
 assert.equal(error.checks[1].status,'warn','failed read must never be treated as empty WAL');
 assert.equal(error.walEvidence.verified,false);
 const unavailable=await simulate({available:false,count:0,entries:[]});
 assert.equal(unavailable.checks[1].status,'warn');
 console.log('PASS Auditor v95.06 IndexedDB: 7 pending, 0 pending, denied and unavailable never misreported, no storage writes');
})().catch(e=>{console.error(e);process.exitCode=1});
