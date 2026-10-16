const fs=require('fs'),vm=require('vm'),assert=require('assert');
global.window=global;
window.hlgbAuditorSmart={
 regression:()=>({baseline:{},findings:[{code:'dom-churn-growth',detail:'pico'},{code:'interval-growth',detail:'timer'}]}),
 classifyProblem:()=>({observed:[],probableCauses:[{code:'render-loop',detail:'pico antigo'}]})
};
vm.runInThisContext(fs.readFileSync('release-auditor-render-signal-v9372.js','utf8'));
assert.equal(window.hlgbAuditorSmart.renderSignal9372.version,'93.72');
const reg=window.hlgbAuditorSmart.regression({});
assert(!reg.findings.some(x=>x.code==='dom-churn-growth'));
assert(reg.findings.some(x=>x.code==='interval-growth'));
const stable=window.hlgbAuditorSmart.classifyProblem(null,reg,null,{soak:{available:true,maxBurst:3,lagMaxMs:28,mutationRecords:5}});
assert(!stable.probableCauses.some(x=>x.code==='render-loop'));
const unstable=window.hlgbAuditorSmart.classifyProblem(null,reg,null,{soak:{available:true,maxBurst:170,lagMaxMs:600,mutationRecords:80}});
assert(unstable.probableCauses.some(x=>x.code==='render-loop'));
console.log('auditor v93.72 render signal ok');
