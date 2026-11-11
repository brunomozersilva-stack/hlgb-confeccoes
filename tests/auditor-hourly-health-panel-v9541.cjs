'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const src=fs.readFileSync('release-health-monitor-panel-v9541.js','utf8');
const aud=fs.readFileSync('release-internal-auditor.js','utf8');
const app=fs.readFileSync('app-stable3.html','utf8');
const SHA='a'.repeat(40),OLD='b'.repeat(40);
const monitor={name:'HLGB Hourly Health Monitor v95.38',id:123,head_branch:'main',head_sha:OLD,
 status:'completed',conclusion:'success',created_at:'2026-11-11T12:00:00Z'};
const failed={name:'HLGB Audit Regression',id:234,head_branch:'main',head_sha:SHA,
 status:'completed',conclusion:'failure',created_at:'2026-11-11T12:30:00Z'};
const passed={name:'HLGB Cutter Sheet A4 Complete v95.40',id:235,head_branch:'main',
 head_sha:SHA,status:'completed',conclusion:'success',created_at:'2026-11-11T12:31:00Z'};
const pages={name:'pages build and deployment',id:236,head_branch:'main',head_sha:SHA,
 status:'completed',conclusion:'success',created_at:'2026-11-11T12:33:00Z'};
function harness(options={}){
 const calls=[],window={};
 const fake={getElementById(){return null}};
 const ctx={window,document:fake,Date,AbortController,JSON,Promise,Set,Array,Number,String,Error,
  navigator:{},console,setTimeout,clearTimeout,
  fetch:async(url,init)=>{
   calls.push({url,init});
   const urlString=String(url);
   if(options.fail)throw Error('Network unavailable');
   if(urlString.endsWith('/branches/main'))return {ok:true,json:async()=>({commit:{sha:SHA}})};
   if(urlString.includes('event=schedule'))return {ok:true,json:async()=>({
    workflow_runs:options.noHourly?[]:[monitor]})};
   if(urlString.includes('/actions/runs?'))return {ok:true,json:async()=>({
    workflow_runs:options.noHourly?[failed,passed,pages]:[failed,monitor,passed,pages]})};
   throw Error('unexpected URL: '+urlString);
  }};
 vm.createContext(ctx);vm.runInContext(src,ctx,{filename:'release-health-monitor-panel-v9541.js'});
 return {window,calls};
}
test('the panel loads from app, in existing Auditor modal, only once',()=>{
 assert.equal((app.match(/release-health-monitor-panel-v9541\.js/g)||[]).length,1);
 assert.match(aud,/hlgbHourlyHealthPanel9541\?\.onOpen\?\.\(\)/);
 assert.equal((aud.match(/hlgbHourlyHealthPanel9541\?\.onOpen/g)||[]).length,1);
 assert.ok(app.indexOf('release-health-monitor-panel-v9541.js')>
  app.indexOf('release-internal-auditor.js'));
 assert.doesNotThrow(()=>new vm.Script(src));
});
test('public API data: latest bot, real CI failures and deployment on main',async()=>{
 const {window,calls}=harness();
 const data=await window.hlgbHourlyHealthPanel9541.collect(true);
 assert.equal(data.kind,'hlgb-hourly-health-dashboard');
 assert.equal(data.currentCommit,SHA);
 assert.equal(data.lastHourlyRun.id,123);
 assert.equal(data.lastHourlyRun.currentCommit,false,'old monitor cannot certify new commit');
 assert.equal(data.ci.failed,1);
 assert.match(data.ci.failingWorkflows[0].name,/Audit Regression/);
 assert.equal(data.publication.current,true);
 assert.equal(data.synchronization.provedAcrossRealTwoSessions,false);
 assert.equal(calls.length,2);
 for(const c of calls){
  assert.equal(c.init.method,'GET');
  assert.equal(c.init.credentials,'omit');
  assert.ok(!c.init.headers.Authorization);
 }
 const report=window.hlgbHourlyHealthPanel9541.report();
 assert.equal(report.ci.failed,1);
 assert.match(window.hlgbHourlyHealthPanel9541.humanSummary(report),/NÃO COMPROVADO/);
});
test('cached reports avoid repeated API calls, forced check refreshes',async()=>{
 const {window,calls}=harness();
 await window.hlgbHourlyHealthPanel9541.collect(true);
 await window.hlgbHourlyHealthPanel9541.collect(false);
 assert.equal(calls.length,2);
 await window.hlgbHourlyHealthPanel9541.collect(true);
 assert.equal(calls.length,4);
});
test('lack of recent monitor does not declare all clear or hide CI failures',async()=>{
 const {window,calls}=harness({noHourly:true});
 const report=await window.hlgbHourlyHealthPanel9541.collect(true);
 assert.equal(report.lastHourlyRun,null);
 assert.equal(report.history.length,0);
 assert.equal(report.ci.failed,1);
 assert.equal(calls.length,3,'fallback uses scheduled action only if missing');
});
test('no operational write or browser-stored credentials are ever used',()=>{
 assert.doesNotMatch(src,/localStorage\.(?:setItem|removeItem)|indexedDB\.deleteDatabase|method:\s*['"](?:POST|PATCH|PUT|DELETE)['"]/);
 assert.doesNotMatch(src,/Bearer |service_role|SUPABASE_KEY|rpc\/hlgb_save_record/);
});
