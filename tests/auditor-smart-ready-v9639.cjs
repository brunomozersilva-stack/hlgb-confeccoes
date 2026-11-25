'use strict';
const assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');const fixture=function fixture(){const listeners={},winListeners={},timers=[],storage=new Map(),logs=[];const add=(target,k,f)=>{(target[k]??=[]).push(f)};const d={readyState:'loading',body:{},querySelector:()=>null,getElementById:()=>null,addEventListener:(k,f)=>add(listeners,k,f)},w={addEventListener:(k,f)=>add(winListeners,k,f)};const globals={window:w,document:d,console:{info(){},warn(){},error(){}},setTimeout:(f,t)=>{timers.push({f,t});return timers.length},clearTimeout(){},queueMicrotask:f=>f(),localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},Date,JSON,URL:{},Blob:class{},hlgbAfterLogin:fn=>logs.push(fn)};return {globals,listeners,winListeners,timers,storage,logs,ready(){d.readyState='interactive';for(const f of listeners.DOMContentLoaded||[])f()}}};const f=fixture(),ctx=vm.createContext(f.globals),names=["release-auditor-smart-v9360.js","release-auditor-safari-download-v9368.js","release-auditor-runtime-fix-v9370.js","release-auditor-render-signal-v9372.js"];for(const file of names)vm.runInContext(fs.readFileSync(file,'utf8'),ctx,{filename:file});const w=f.globals.window,s=w.hlgbAuditorSmart,wrapper=w.hlgbAuditorSmartProblem;assert.ok(s);assert.equal(s.safariDownload.authority,'single-manual-download');assert.equal(s.runtimeFix9370.version,'93.70');assert.equal(s.renderSignal9372.version,'93.72');assert.equal(f.logs.length,0);assert.equal(f.storage.size,0);f.ready();assert.equal(w.hlgbAuditorSmartProblem,wrapper);assert.equal(f.logs.length,1);vm.runInContext(fs.readFileSync(names[0],'utf8'),ctx);assert.equal(f.logs.length,1);assert.equal(f.listeners.click.length,2);assert.equal(f.storage.size,0);console.log('PASS smart readiness and wrapper preservation');

const a=w.hlgbAuditorSmart.classifyProblem({summary:{normalizedPending:3},runtime:{guards:{wrapperChains:{x:{depth:25}}}}},{findings:[{code:'interval-growth',detail:'fixture'}]},{duplicates:[]},{pendingAnalysis:{conflicts:1}});
assert.equal(a.triage.priority,'critical');assert.equal(a.triage.items[0].code,'preserve-wal');assert.ok(a.triage.items.some(x=>x.code==='runtime-review'));assert.equal(a.triage.automaticRepair,false);assert.equal(a.triage.coverage.remoteWriteVerified,false);
const missing=w.hlgbAuditorSmart.classifyProblem(null,{}, {},null);assert.equal(missing.triage.coverage.syncReadable,false);assert.equal(missing.triage.priority,'critical');
const empty=w.hlgbAuditorSmart.classifyProblem({summary:{}},{findings:[]},{duplicates:[]},{});assert.equal(empty.triage.priority,'review');assert.equal(empty.triage.items[0].code,'reproduce');assert.equal(empty.triage.learningRequiresBeforeAfter,true);assert.equal(f.storage.size,0);

// Delayed dependency, duplicate script and bounded permanent failure.
for(const scenario of ['delayed','missing']){
 const q=fixture(),c=vm.createContext(q.globals),w=q.globals.window;
 for(const i of [2,3,2,3])vm.runInContext(fs.readFileSync(names[i],'utf8'),c);
 assert.equal(w.hlgbAuditorReady9370.state,'waiting');assert.equal(w.hlgbAuditorReady9372.state,'waiting');
 assert.equal(q.timers.length,2,'duplicate inclusion does not schedule another retry');
 if(scenario==='delayed'){
  vm.runInContext(fs.readFileSync(names[0],'utf8'),c);
  for(const t of q.timers.splice(0))t.f();
  assert.equal(w.hlgbAuditorReady9370.state,'ready');assert.equal(w.hlgbAuditorReady9372.state,'ready');
  assert.equal(w.hlgbAuditorSmart.runtimeFix9370.listenerCount,4);
  const problem=w.hlgbAuditorSmartProblem;for(const i of [2,3])vm.runInContext(fs.readFileSync(names[i],'utf8'),c);
  assert.equal(w.hlgbAuditorSmartProblem,problem);assert.equal(q.listeners.click.length,1);
 }else{
  for(let i=0;i<45&&q.timers.length;i++){for(const t of q.timers.splice(0))t.f()}
  assert.equal(w.hlgbAuditorReady9370.state,'unavailable');assert.equal(w.hlgbAuditorReady9372.state,'unavailable');
  assert.equal(w.hlgbAuditorReady9370.attempts,40);assert.equal(w.hlgbAuditorReady9372.attempts,40);
  assert.equal(q.timers.length,0);assert.equal(w.HLGB_AUDITOR_RUNTIME_FIX_9370,undefined);assert.equal(w.HLGB_AUDITOR_RENDER_SIGNAL_9372,undefined);
 }
 assert.equal(q.storage.size,0);
}
console.log('PASS bounded auditor dependency readiness, no duplicate retry or false ready');
