'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('release-health-monitor-panel-v9541.js','utf8');
test('native visible report links do not depend on Auditor button containers',()=>{
 assert.match(source,/hlgbHealthPinnedDownloads9545/);
 assert.match(source,/hlgbHealthPinnedJson9545/);
 assert.match(source,/hlgbHealthPinnedTxt9545/);
 assert.match(source,/RELATÓRIO DO BOT — BAIXE AQUI/);
 assert.match(source,/display:block!important/);
 assert.match(source,/const title=root\.querySelector\('h2'\)/);
 assert.match(source,/title\.insertAdjacentElement\('afterend',box\)/);
 assert.match(source,/URL\.createObjectURL\(new Blob/);
 assert.match(source,/a\.download='HLGB-MONITOR-SAUDE-'/);
 assert.doesNotMatch(source,/method:\s*['"](?:POST|PUT|PATCH|DELETE)['"]/);
 assert.doesNotThrow(()=>new vm.Script(source));
});
