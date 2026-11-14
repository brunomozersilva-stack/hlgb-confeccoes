'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('release-printer3d-module-recovery-v9596.js','utf8');
const loader=fs.readFileSync('app-stable3.html','utf8');
const urls=['release-printer3d-nav-guard-v9516.js','release-printer3d-cloud-hydration-v9517.js'];
function scenario(auth=false){
 const timers=[],scripts=[],writes=[],events={},elements=[];
 const win={__HLGB_AUTH_READY:auth,__HLGB_BOOT_READY_9477:auth,addEventListener(name,fn){events[name]=fn}};
 const doc={
  readyState:'complete',head:{appendChild(script){scripts.push(script);elements.push(script);return script}},
  querySelector(selector){const file=selector.match(/"([^"]+)"/)?.[1];return elements.find(v=>v.attribute===file)||null},
  createElement(){return {setAttribute(k,v){this.attribute=v}}}
 };
 const c={window:win,document:doc,console,Date,JSON,Map,Set,Number,String,
  setTimeout(fn){timers.push(fn);return timers.length},localStorage:{setItem(...args){writes.push(args)}},indexedDB:{open(){throw Error('no WAL access permitted')}}};
 vm.createContext(c);vm.runInContext(source,c);
 return {win,events,timers,scripts,writes,flush(){while(timers.length)timers.shift()()}};
}
test('recoverer is post-auth and retry is once only',()=>{
 const x=scenario(false),api=x.win.hlgbPrinter3dModuleRecovery9596;
 assert.equal(x.scripts.length,0);
 assert.equal(api.check('unauth').skipped,'not-authenticated');
 x.win.__HLGB_AUTH_READY=true;x.win.__HLGB_BOOT_READY_9477=true;
 x.events['hlgb:authenticated']();x.flush();
 assert.equal(x.scripts.length,2);
 assert.equal(x.scripts.every(s=>s.async===true),true);
 assert.equal(x.scripts.every(s=>s.src.includes('hlgb_recovery_9596')),true);
 api.check('again');x.events['hlgb:authenticated']();x.flush();
 assert.equal(x.scripts.length,2);
 assert.equal(x.writes.length,0);
});
test('missing only one 3D API only retries that file',()=>{
 const x=scenario(true);
 x.win.hlgbPrinter3dNavGuard9516={diagnose:()=>({status:'pass'})};
 x.flush();
 assert.equal(x.scripts.length,1);
 assert.ok(x.scripts[0].src.includes('release-printer3d-cloud-hydration-v9517.js'));
 x.win.hlgbPrinter3dCloud9517={status:()=>({status:'pass'})};
 x.scripts[0].onload();
 assert.equal(x.win.hlgbPrinter3dModuleRecovery9596.status().recovered.length,1);
 assert.equal(x.writes.length,0);
});
test('idempotent when both 3D APIs already present',()=>{
 const x=scenario(true);
 x.win.hlgbPrinter3dNavGuard9516={};x.win.hlgbPrinter3dCloud9517={};
 x.flush();assert.equal(x.scripts.length,0);
 x.win.hlgbPrinter3dModuleRecovery9596.check('again');
 assert.equal(x.scripts.length,0);
});
test('loader conditionally avoids a second payroll guard script',()=>{
 const start=loader.indexOf('const payrollGuardInBase=');
 const end=loader.indexOf('const bootCompleted=',start);
 assert(start>0&&end>start,'dedupe must be in canonical HTML router');
 const snippet=loader.slice(start,end);
 const files=['release-payroll-reliable-save-guard-v9344.js','release-printer3d-module-recovery-v9596.js'];
 function evalIt(h){
  const res=vm.runInNewContext('(function(){const ts=1;const files='+JSON.stringify(files)+';const h='+JSON.stringify(h)+';'+snippet+';return {payrollGuardInBase,appendFiles,inj}})()');
  return res;
 }
 const base='<script src="./release-payroll-reliable-save-guard-v9344.js?fresh=old"></script>';
 const duplicate=evalIt(base);
 assert.equal(duplicate.payrollGuardInBase,true);
 assert.equal(duplicate.appendFiles.filter(f=>f===files[0]).length,0);
 assert(!duplicate.inj.includes(files[0]));
 const fresh=evalIt('<div>No payroll script in base</div>');
 assert.equal(fresh.payrollGuardInBase,false);
 assert.equal(fresh.appendFiles.filter(f=>f===files[0]).length,1);
 const mention=evalIt('<script>const name="release-payroll-reliable-save-guard-v9344.js"</script>');
 assert.equal(mention.payrollGuardInBase,false,'textual mention is not evidence of a script tag');
});
test('both optional 3D modules and recoverer are loaded once in canonical boot list',()=>{
 const list=loader.match(/const files=\[(.*?)\];\/\* A base pode trazer/s)?.[1]||'';
 for(const file of [...urls,'release-printer3d-module-recovery-v9596.js'])assert.equal(list.split("'"+file+"'").length-1,1,file);
});
