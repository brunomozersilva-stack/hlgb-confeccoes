'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const panel=fs.readFileSync('release-health-monitor-panel-v9541.js','utf8');
const auditor=fs.readFileSync('release-internal-auditor.js','utf8');
const loader=fs.readFileSync('app-stable3.html','utf8');
test('bot report has a dedicated sidebar entry, diagnostics tab, auditor button',()=>{
 for(const label of ['hlgbBotReportNav9543','hlgbBotReportTab9543','📥 Relatório do Bot','hlgbAuditorOpenBot9543']){
  assert.ok(auditor.includes(label),'Missing visible access: '+label);
 }
 assert.ok(auditor.includes('hlgbHourlyHealthPanel9541'));
 assert.ok(panel.includes('openStandalone,refresh'));
 assert.ok(loader.includes('release-health-monitor-panel-v9541.js'));
});
test('standalone monitor does not need operational data or Supabase writes',()=>{
 assert.ok(panel.includes("openModal('📊 Monitor de Saúde do HLGB'"));
 assert.ok(panel.includes("id=\"hlgbMonitorStandaloneActions9543\""));
 assert.doesNotMatch(panel,/method:\s*['"](?:POST|PATCH|PUT|DELETE)['"]/);
 assert.doesNotMatch(panel,/indexedDB\.deleteDatabase|localStorage\.clear\(|service_role/i);
});
test('when GitHub API is unavailable, download still exports truthful failure diagnostic',()=>{
 assert.match(panel,/hlgb-hourly-health-access-diagnostic/);
 assert.match(panel,/status:'not_verified'/);
 assert.match(panel,/if\(d\)d.disabled=false/);
 assert.doesNotThrow(()=>new vm.Script(panel));
});
