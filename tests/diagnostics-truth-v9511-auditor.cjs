'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const script=fs.readFileSync('release-internal-auditor.js','utf8');
const start=script.indexOf('function auditRuntimeErrors(){'),end=script.indexOf('\nfunction summarize(checks){',start);
assert(start>=0&&end>start,'auditor issue classification function missing');
let issues=[],reference=Date.now();
const env={
 arr:()=>issues,Date,Number,String,
 window:{hlgbDiagnosticsCenter:{sessionStartedAt9511:reference,
  isIssueRecent9511:x=>Date.parse(x.lastSeenAt)>=reference-30000}},
 check:(code,category,status,title,detail,severity,meta)=>({code,category,status,title,detail,severity,...meta})
};
const fn=vm.runInNewContext(script.slice(start,end)+'\nauditRuntimeErrors;',env);
issues=Array.from({length:127},(_,i)=>({id:i,status:'Aberto',priority:'Alta',lastSeenAt:'2026-09-02T10:00:00Z'}));
let a=fn()[0];
assert.equal(a.status,'pass','historical high priority must not trigger live alert');
assert.equal(a.recentIssues,0);
assert.equal(a.historicalIssues,127);
assert.match(a.detail,/Histórico não significa falha atual/);
issues.push({id:'new',status:'Aberto',priority:'Crítica',lastSeenAt:new Date(reference).toISOString()});
a=fn()[0];
assert.equal(a.status,'warn');
assert.equal(a.recentIssues,1);
assert.equal(a.historicalIssues,127);
assert.equal(a.recentHighPriority,1);
console.log('PASS v95.11: Auditor counts recent alerts separately, preserves 127 historical diagnostics');