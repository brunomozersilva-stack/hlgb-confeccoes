'use strict';
// Contract for evidence captured from GitHub Actions. This is an offline consistency
// check, not a signature or substitute for reading the original logs and run metadata.
const sha=x=>typeof x==='string'&&/^[a-f0-9]{40}$/.test(x);
const number=x=>Number.isSafeInteger(x)&&x>0;
const path=x=>typeof x==='string'&&/^tests\/[A-Za-z0-9_./-]+\.(cjs|js|mjs)$/.test(x)&&!x.split('/').some(s=>!s||s==='..'||s==='.');
const text=x=>typeof x==='string'&&x.trim()===x&&x.length>0&&x.length<=160;
function check(entry){
 const reject=reason=>({id:entry?.id||null,state:'not-confirmed',reason,canAutoRepair:false});
 if(!entry||!text(entry.id)||!path(entry.regressionTest)||!text(entry.workflow)||!Array.isArray(entry.requiredJobs)||!entry.requiredJobs.length||entry.requiredJobs.some(x=>!text(x))||new Set(entry.requiredJobs).size!==entry.requiredJobs.length)return reject('invalid-contract');
 const before=entry.before,after=entry.after;
 const validRun=r=>r&&sha(r.commit)&&number(r.runId)&&r.workflow===entry.workflow&&r.status==='completed'&&Array.isArray(r.jobs)&&r.jobs.every(j=>j&&number(j.id)&&text(j.name)&&Array.isArray(j.steps))&&new Set(r.jobs.map(j=>j.id)).size===r.jobs.length&&new Set(r.jobs.map(j=>j.name)).size===r.jobs.length;
 if(!validRun(before)||!validRun(after)||before.commit===after.commit||before.runId===after.runId||before.conclusion!=='failure'||after.conclusion!=='success')return reject('run-not-paired');
 const name='Run node '+entry.regressionTest;
 for(const job of entry.requiredJobs){
  const a=before.jobs.filter(j=>j.name===job),b=after.jobs.filter(j=>j.name===job);
  if(a.length!==1||b.length!==1||a[0].id===b[0].id||a[0].status!=='completed'||b[0].status!=='completed'||a[0].conclusion!=='failure'||b[0].conclusion!=='success')return reject('job-not-paired:'+job);
  const step=(j,conclusion)=>{const s=j.steps.filter(s=>s?.name===name);return s.length===1&&s[0].status==='completed'&&s[0].conclusion===conclusion};
  if(!step(a[0],'failure')||!step(b[0],'success'))return reject('test-step-not-paired:'+job);
 }
 if(entry.logReviewed!==true||!text(entry.observed)||!text(entry.correction)||!['test-locator','runtime','data-integrity','layout','boot','unknown'].includes(entry.category))return reject('review-required');
 return {id:entry.id,state:'paired-evidence-candidate',category:entry.category,regressionTest:entry.regressionTest,beforeCommit:before.commit,afterCommit:after.commit,requiredJobs:[...entry.requiredJobs],canAutoRepair:false,requiresOriginalSourceVerification:true};
}
function review(entries){
 if(!Array.isArray(entries)||entries.length>5000)throw Error('invalid-evidence-list');
 const seen=new Set(),accepted=[],rejected=[];
 for(const e of entries){const x=check(e);if(seen.has(x.id)){rejected.push({id:x.id,state:'not-confirmed',reason:'duplicate-id',canAutoRepair:false});continue}seen.add(x.id);(x.state==='paired-evidence-candidate'?accepted:rejected).push(x)}
 return {accepted,rejected,mode:'offline-evidence-consistency',canAutoRepair:false,canSkipFullSuite:false};
}
module.exports={check,review};
