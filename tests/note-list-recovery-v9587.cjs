'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync('release-notes.js','utf8');
const a=source.indexOf('function recoverProjectionNoteList9587()');
const b=source.indexOf('window.hlgbRecoverProjectionNoteList9587=',a);
assert(a>=0&&b>a,'recovery code must exist');
assert(source.includes("ensureProjectionRecovery9587();"),'recovery button must be decorated in projection');
const ids=['projectionClientFilter','projectionProductFilter','projectionOrderFilter','projectionLocationFilter','projectionPriorityFilter','projectionStatusFilter','projectionMinValue','projectionMaxValue'];
const fields=Object.fromEntries(ids.map(id=>[id,{value:'some-filter'}]));
fields.projectionStart={value:'2026-11-13'};fields.projectionEnd={value:'2026-11-13'};
const hint={textContent:'before'};
let clearCalls=0,periodCalls=0,renderCalls=0,timers=[];
const ctx=vm.createContext({
 canRenderProjection:()=>true,
 document:{getElementById:id=>id==='hlgbProjectionRecoveryHint9587'?hint:id==='projectionProductsTable'?{querySelectorAll:()=>[]}:(fields[id]||null)},
 window:{
  clearProjectionDetailFilters:()=>{clearCalls++},
  setProjectionPeriod:mode=>{assert.equal(mode,'all');periodCalls++},
  renderProjection:()=>{renderCalls++},
 },
 setTimeout:fn=>timers.push(fn),console
});
vm.runInContext(source.slice(a,b)+';this.rescue=recoverProjectionNoteList9587;',ctx);
const before=JSON.stringify({orders:[{id:50,qty:630}],noteQueue:[{id:1,qty:5}]});
const result=ctx.rescue();
assert.equal(result.ok,true);assert.equal(result.businessWrites,0);
assert.equal(clearCalls,1);assert.equal(periodCalls,1);assert.equal(renderCalls,1);
for(const id of ids)assert.equal(fields[id].value,'',id);
timers.forEach(fn=>fn());
assert.match(hint.textContent,/Definir datas/);
assert.equal(JSON.stringify({orders:[{id:50,qty:630}],noteQueue:[{id:1,qty:5}]}),before);
ctx.window.setProjectionPeriod=null;
const alternative=ctx.rescue();
assert.equal(alternative.ok,true);
assert.equal(fields.projectionStart.value,'2000-01-01');
assert.equal(fields.projectionEnd.value,'2099-12-31');
assert.equal(renderCalls,2);
console.log('PASS v95.87 recovery: no business writes, filters cleared, full period, help when empty');
