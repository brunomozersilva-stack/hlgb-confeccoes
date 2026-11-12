'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const s=fs.readFileSync('release-health-monitor-panel-v9541.js','utf8');
test('pending monitor must not publish a bogus not_verified report',()=>{
 assert.match(s,/const available=!!latest\|\|!!error/);
 assert.match(s,/link\.removeAttribute\('href'\)/);
 assert.match(s,/link\.removeAttribute\('download'\)/);
 assert.match(s,/link\.setAttribute\('aria-disabled','true'\)/);
 assert.match(s,/if\(!latest&&!error\)return false/);
 assert.match(s,/Consultando o GitHub Actions/);
 assert.match(s,/BAIXAR DIAGNÓSTICO DA FALHA/);
 assert.match(s,/data\.refreshError=error/);
 assert.doesNotThrow(()=>new vm.Script(s));
});
test('module still exports no write calls to operational data stores',()=>{
 assert.doesNotMatch(s,/indexedDB\.deleteDatabase|localStorage\.clear\(\)/);
 assert.doesNotMatch(s,/method:\s*['"](?:POST|PUT|PATCH|DELETE)['"]/);
});
