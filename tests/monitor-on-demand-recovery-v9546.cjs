'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('release-internal-auditor.js','utf8');
test('sidebar always has an on-demand monitor reloader and fallback download',()=>{
 for(const code of ['window.hlgbAuditorOpenBot9543=async function()',
  "script.src='./release-health-monitor-panel-v9541.js?hlgb_recovery=95.46&ts='+Date.now()",
  'hlgbBotRecoveryDownload9546','hlgb-hourly-health-fallback-report',
  "status:'not_verified'",'URL.createObjectURL',
  "fetch(repo+path,{method:'GET'"]){
   assert.ok(source.includes(code),code);
 }
 assert.doesNotThrow(()=>new vm.Script(source));
 assert.doesNotMatch(source,/indexedDB\.deleteDatabase\(/);
});
