'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),w={};vm.runInNewContext(fs.readFileSync('release-health-monitor-panel-v9541.js','utf8'),{window:w,Date});
const api=w.hlgbHourlyHealthPanel9541,sha='a'.repeat(40),old='b'.repeat(40),head={commit:{sha}},run=(id,conclusion,extra={})=>({id,head_sha:sha,head_branch:'main',status:'completed',conclusion,name:'Workflow '+id,run_attempt:1,updated_at:'2026-11-24T10:00:00Z',...extra});
const rows=[run(1,'success'),run(2,'cancelled'),run(3,'skipped'),run(4,null,{status:'queued'}),run(5,'failure'),run(6,'failure',{head_sha:old}),run(7,'success',{head_branch:'feature'}),run(8,'failure',{name:'HLGB Hourly Health Monitor v95.38'})];
const x=api.parse(head,{workflow_runs:rows,total_count:300},{workflow_runs:[run(5,'success',{run_attempt:2})]});
assert.equal(x.ci.observedRuns,6);assert.equal(x.ci.approved,2);assert.equal(x.ci.cancelled,1);assert.equal(x.ci.inconclusive,1);assert.equal(x.ci.pending,1);assert.equal(x.ci.failed,1);assert.equal(x.ci.completed,5);assert.equal(x.ci.windowTruncated,true);assert.equal(x.ci.allRequiredChecksVerified,false);assert.equal(x.synchronization.provedAcrossRealTwoSessions,false);assert.ok(api.humanSummary(x).includes('cancelados: 1'));
const many=api.parse(head,{workflow_runs:Array.from({length:25},(_,i)=>run(i+10,'failure')),total_count:25},null);
assert.equal(many.ci.failed,25);assert.equal(many.ci.failingWorkflows.length,18);assert.equal(many.ci.windowTruncated,false);assert.equal(many.ci.allRequiredChecksVerified,false);
console.log('PASS bot coverage, cancellation, attempt dedup, actual count, no synchronization claim');
